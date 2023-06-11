import {
  Categories,
  CreateWrapper,
  IntegrationCategoryMappings,
  AnyAnalytics,
  CDNSettingsIntegrations,
  InitOptions,
} from '../types'
import { validateCategories, validateGetCategories } from './validation'
import { createConsentStampingMiddleware } from './consent-stamping'
import { pipe } from '../utils'

export const createWrapper: CreateWrapper = (createWrapperOptions) => {
  const {
    disableSegmentInitialization,
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
      if (await disableSegmentInitialization?.()) {
        return
      }

      // ignore consent -- just call analytics.load as usual
      const consentRequirementDisabled = await disableConsentRequirement?.()
      if (consentRequirementDisabled) {
        return ogLoad.call(analytics, settings, options)
      }

      // use these categories to disable the appropriate device mode plugins
      const initialCategories =
        (await shouldLoad?.()) || (await getCategories())

      validateCategories(initialCategories)

      // register listener to stamp all events with latest consent information
      analytics.addSourceMiddleware(
        createConsentStampingMiddleware(getCategories)
      )

      const updateCDNSettings: InitOptions['updateCDNSettings'] = (
        cdnSettings
      ) => {
        const integrations = omitDisabledIntegrations(
          cdnSettings.integrations,
          initialCategories,
          integrationCategoryMappings
        )
        return { ...cdnSettings, integrations }
      }

      return ogLoad.call(analytics, settings, {
        ...options,
        updateCDNSettings: pipe(
          updateCDNSettings,
          options?.updateCDNSettings ? options.updateCDNSettings : (f) => f
        ),
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
const omitDisabledIntegrations = (
  integrations: CDNSettingsIntegrations,
  consentedCategories: Categories,
  intgCategoryMappings?: IntegrationCategoryMappings
): CDNSettingsIntegrations =>
  Object.keys(integrations).reduce<CDNSettingsIntegrations>((acc, intgName) => {
    const categories = intgCategoryMappings
      ? intgCategoryMappings[intgName]
      : parseConsentCategories(integrations[intgName])

    const isMissingCategories = !categories || !categories.length

    // If an integration contains no consent categories data (most likely because consent has not been configured), we keep that integration enabled.
    const isConsented =
      isMissingCategories || categories.some((c) => consentedCategories[c])

    if (!isConsented) {
      return acc
    } else {
      return {
        ...acc,
        [intgName]: integrations[intgName],
      }
    }
  }, {})
