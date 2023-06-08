import {
  Categories,
  CreateWrapper,
  IntegrationCategoryMappings,
  Analytics,
  Settings,
  CDNSettings,
  Integrations,
} from '../types'
import { validateCategories, validateGetCategories } from './validation'
import { loadLegacySettings } from '@segment/analytics-next'
import { createConsentStampingMiddleware } from './consent-stamping'

// ./__tests__/create-wrapper.test.ts
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

    // eslint-disable-next-line @typescript-eslint/require-await
    const loadWithConsent: Analytics['load'] = async (
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

      // register listener to stamp all events with latest consent information
      analytics.addSourceMiddleware(
        createConsentStampingMiddleware(getCategories)
      )

      const normalizedSettings: Settings =
        typeof settings === 'string' ? { writeKey: settings } : settings

      // use these categories to disable the appropriate device mode plugins
      const initialCategories =
        (await shouldLoad?.()) || (await getCategories())

      validateCategories(initialCategories)

      const cdnSettings: CDNSettings = normalizedSettings.cdnSettings
        ? normalizedSettings.cdnSettings
        : await loadLegacySettings(
            normalizedSettings.writeKey,
            normalizedSettings.cdnURL
          )

      const integrations = buildIntegrations(
        cdnSettings.integrations,
        initialCategories,
        integrationCategoryMappings
      )

      return ogLoad.call(
        analytics,
        {
          ...normalizedSettings,
          cdnSettings: {
            // TODO: This will not work in the snippet
            ...cdnSettings,
            integrations,
          },
        },
        options
      )
    }
    analytics.load = loadWithConsent
  }
}

/**
 * Get list of categories for integration JSON object
 * @example
 * returns ["Analytics", "Advertising"]
 */
const getConsentCategories = (integration: unknown): string[] | undefined => {
  if (
    integration &&
    typeof integration === 'object' &&
    'consentSettings' in integration &&
    typeof integration.consentSettings === 'object' &&
    integration.consentSettings &&
    'categories' in integration.consentSettings &&
    Array.isArray(integration.consentSettings.categories)
  ) {
    return (integration.consentSettings.categories as string[]) || undefined
  }
  return undefined
}

const buildIntegrations = (
  integrations: Integrations,
  consentedCategories: Categories,
  intgCategoryMappings?: IntegrationCategoryMappings
): Integrations =>
  Object.keys(integrations).reduce<Integrations>((acc, intgName) => {
    const categories = intgCategoryMappings
      ? intgCategoryMappings[intgName]
      : getConsentCategories(integrations[intgName])

    const isMissingCategories = !categories || !categories.length

    // If an integration contains no consent categories data (most likely because consent has not been configured), we keep that integration enabled.
    const isConsented =
      isMissingCategories || categories.some((c) => consentedCategories[c])

    return {
      ...acc,
      [intgName]: isConsented ? integrations[intgName] : false,
    }
  }, {})
