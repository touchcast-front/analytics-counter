/**
 * first argument to AnalyticsBrowser.load
 */
export interface Settings {
  writeKey: string
  cdnURL?: string
  cdnSettings?: CDNSettings
}

/**
 * 2nd arg to AnalyticsBrowser.load / analytics
 */
export interface InitOptions {
  updateCDNSettings(cdnSettings: CDNSettings): CDNSettings
}

/**
 * This interface is a stub of the actual Segment analytics instance.
 * This can be either:
 * - window.analytics (i.e `AnalyticsSnippet`)
 * - the instance returned by `AnalyticsBrowser.load({...})`
 * - the instance created by `new AnalyticsBrowser(...)`
 */
export interface AnyAnalytics {
  addSourceMiddleware: (...args: any[]) => any
  /**
   * Either window.analytics.load(...) OR AnalyticsBrowser.load(...)
   */
  load(
    writeKeyOrSettings: any,
    /** See analytics-next function signature for more information. */
    options?: InitOptions
  ): any
}

/**
 * This function returns a "wrapped" version of analytics.
 */
export interface Wrapper {
  // Returns void rather than analytics to emphasize that this function replaces the .load function of the underlying instance.
  (analytics: AnyAnalytics): void
}

/**
 * This function returns a function which returns a "wrapped" version of analytics
 */
export interface CreateWrapper {
  (options: CreateWrapperOptions): Wrapper
}

export interface Categories {
  [category: string]: boolean
}

export interface IntegrationCategoryMappings {
  [integrationName: string]: string[]
}

export interface CreateWrapperOptions {
  /**
   * Wait until this function resolves/returns before loading analytics.
   * This function should return a list of initial categories.
   * If this function returns `undefined`, `getCategories()` function will be called to get initial categories.
   **/
  shouldLoad?: () => Categories | undefined | Promise<Categories | undefined>

  /**
   * Fetch the categories which stamp every event. Called each time a new Segment event is dispatched.
   **/
  getCategories: () => Categories | Promise<Categories>

  /**
   * This permanently disables any consent requirement (i.e device mode gating, event pref stamping).
   * Called on wrapper initialization.
   **/
  disableConsentRequirement?: () => boolean | Promise<boolean>

  /**
   * Disable the Segment analytics SDK completely. analytics.load() will have no effect.
   * .track / .identify etc calls should not throw any errors, but analytics settings will never be fetched and no events will be sent to Segment.
   * Called on wrapper initialization. This can be useful in dev environments (e.g. 'devMode').
   **/
  disableSegmentInitialization?: () => boolean | Promise<boolean>

  /**
   * A callback that should be passed to onConsentChanged. This is neccessary for sending automatic "consent changed" events to segment (Future behavior)
   **/
  registerConsentChanged?: (callback: (categories: Categories) => void) => void

  /**
   * Object that maps `integrationName -> categories`. Typically, this is not needed, as this data comes from the CDN and is attached to each integration.
   * However, it may be desirable to hardcode these mappings (e.g, for testing).
   * @example
   * {"Braze Web Mode (Actions)": ["Advertising", "Analytics"]
   */
  integrationCategoryMappings?: IntegrationCategoryMappings
}

export interface CDNSettings {
  integrations: CDNSettingsIntegrations
  remotePlugins?: CDNSettingsRemotePlugin[]
}

/**
 *CDN Settings Integrations object.
 * @example
 * { "Fullstory": {...}, "Braze Web Mode (Actions)": {...}}
 */
export interface CDNSettingsIntegrations {
  [integrationName: string]: { [key: string]: any }
}

export interface CDNSettingsRemotePlugin {
  /** The name of the remote plugin */
  name: string
  /** The creation name of the remote plugin */
  creationName: string
  /** The url of the javascript file to load */
  url: string
  /** The UMD/global name the plugin uses. Plugins are expected to exist here with the `PluginFactory` method signature */
  libraryName: string
  /** The settings related to this plugin. */
  settings: any
}
