export interface Analytics {
  addSourceMiddleware: (...args: any[]) => any
  load: (settingsOrWritekey: string | Settings, options: any) => any
}

export interface Integrations {
  [key: string]: any
}

export interface CDNSettings {
  integrations: Integrations
}

export interface Settings {
  writeKey: string
  cdnURL?: string
  cdnSettings?: CDNSettings
}

export interface Wrapper {
  (analytics: Analytics): void
}

export interface CreateWrapper {
  (options: CreateWrapperOptions): Wrapper
}

export interface Categories {
  [category: string]: boolean
}

export type RegisterConsentChanged = (
  callback: (categories: Categories) => void
) => void

export interface IntegrationCategoryMappings {
  [integrationCreationName: string]: string[]
}

export interface CreateWrapperOptions {
  /**
   * Wait until this function resolves/returns before fetching categories or loading segment. Optionally, returns initial categories. If undefined, init immediately.
   **/
  shouldLoad?: () => Promise<Categories | undefined> | Categories | undefined

  /**
   * Fetch the categories which stamp every event. Called each time a new Segment event is dispatched.
   **/
  getCategories: () => Promise<Categories> | Categories

  /**
   * Dynamically disable consent requirement (Segment analytics will still load if .load is called, but it will be as if the wrapper does not exist. No event stamping will occur.)
   **/
  disableConsentRequirement?: () => boolean

  /**
   * Disable all wrapper functionality including segment analytics e.g devMode – the entire wrapper becomes a noop. Useful in a testing environment. analytics.load() will have no effect.
   **/
  disableAll?: () => boolean

  /**
   * A callback that should be passed to onConsentChanged. This is neccessary for sending automatic "consent changed" events to segment (Future behavior)
   **/
  registerConsentChanged?: RegisterConsentChanged

  /**
   * Object that maps `integrationName -> categories`. Typically, this is not needed, as this data comes from the CDN and is attached to each integration.
   * However, it may be desirable to hardcode these mappings (e.g, for testing).
   * @example
   * {"Braze Web Mode (Actions)": ["Advertising", "Analytics"]
   */
  integrationCategoryMappings?: IntegrationCategoryMappings
}
