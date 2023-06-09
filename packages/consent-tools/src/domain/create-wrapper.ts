import {
  Categories,
  CreateWrapper,
  type,
  AnyAnalytics,
  CDNSettingsIntegrations,
} from '../types'
import { validateCategories, validateGetCategories } from './validation'
import { createConsentStampingMiddleware } from './consent-stamping'

export const createWrapper: CreateWrapper = (createWrapperOptions) => {
  const {
    disableAll,
    disableConsentRequirement,
    getCategories,
    shouldLoad,
    integrationCategoryMappings,
  } = createWrapperOptions
  return (analytics) => {
    validateGetCategories(getCategories)

    const ogLoad = analytics.load

    const loadWithConsent: AnyAnalytics['load'] = async (
      settings,
      options
    ): Promise<void> => {
      // do not load anything -- segment included
      if (disableAll?.()) {
        return
      }

      // ignore consent -- just call analytics.load as usual
      const consentRequirementDisabled = disableConsentRequirement?.()
      if (consentRequirementDisabled) {
        return ogLoad.call(analytics, settings, options)
      }

      // use these categories to disable the appropriate device mode plugins
      // if shouldLoad throws an error, abort any analytics modification
      const initialCategories =
        (await shouldLoad?.()) || (await getCategories())

      validateCategories(initialCategories)

      // register listener to stamp all events with latest consent information
      analytics.addSourceMiddleware(
        createConsentStampingMiddleware(getCategories)
      )

      return ogLoad.call(analytics, settings, {
        updateCDNSettings: (cdnSettings) => {
          const integrations = buildIntegrationsWithDisabled(
            cdnSettings.integrations,
            initialCategories,
            integrationCategoryMappings
          )
          const settingsWithOverrides = { ...cdnSettings, integrations }
          return settingsWithOverrides
        },
      })
    }
    analytics.load = loadWithConsent
  }
}

/**
 * Parse list of categories from `cdnSettings.integrations` object
 * @example
 * returns ["Analytics", "Advertising"]
 */
const parseConsentCategories = (
  integrations: unknown
): string[] | undefined => {
  if (
    integrations &&
    typeof integrations === 'object' &&
    'consentSettings' in integrations &&
    typeof integrations.consentSettings === 'object' &&
    integrations.consentSettings &&
    'categories' in integrations.consentSettings &&
    Array.isArray(integrations.consentSettings.categories)
  ) {
    return (integrations.consentSettings.categories as string[]) || undefined
  }

  return undefined
}

/**
 * Build integrations object, setting some integrations to false
 */
const buildIntegrationsWithDisabled = (
  integrations: CDNSettingsIntegrations,
  consentedCategories: Categories,
  intgCategoryMappings?: type
): CDNSettingsIntegrations =>
  Object.keys(integrations).reduce<CDNSettingsIntegrations>((acc, intgName) => {
    const categories = intgCategoryMappings
      ? intgCategoryMappings[intgName]
      : parseConsentCategories(integrations[intgName])

    const isMissingCategories = !categories || !categories.length

    // If an integration contains no consent categories data (most likely because consent has not been configured), we keep that integration enabled.
    const isConsented =
      isMissingCategories || categories.some((c) => consentedCategories[c])

    return {
      ...acc,
      [intgName]: isConsented ? integrations[intgName] : false,
    }
  }, {})
