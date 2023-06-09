import { createWrapper } from '../create-wrapper'
import {
  CreateWrapperOptions,
  AnyAnalytics,
  Settings,
  InitOptions,
} from '../../types'

const GET_CATEGORIES_RESPONSE = { Advertising: true }

const DEFAULT_LOAD_SETTINGS = {
  writeKey: 'foo',
  cdnSettings: { integrations: {} },
}
/**
 * Create consent settings for integrations
 */
const createConsentSettings = (categories: string[] = []) => ({
  consentSettings: {
    categories,
  },
})

const mockGetCategories = jest
  .fn()
  .mockImplementation(() => GET_CATEGORIES_RESPONSE)

const analyticsLoadSpy = jest.fn()
const addSourceMiddlewareSpy = jest.fn()

const getAnalyticsLoadLastCall = () => {
  const [arg1, arg2] = analyticsLoadSpy.mock.lastCall
  return {
    args: analyticsLoadSpy.mock.lastCall,
    cdnSettings: arg1.cdnSettings,
    updateCDNSettings: arg2.updateCDNSettings,
  }
}
const getLoadSpyIntegrations = (cdnSettings: any) =>
  getAnalyticsLoadLastCall().updateCDNSettings(cdnSettings).integrations as any

class MockAnalytics implements AnyAnalytics {
  load = analyticsLoadSpy
  addSourceMiddleware = addSourceMiddlewareSpy
}

let analytics: AnyAnalytics
beforeEach(() => {
  analytics = new MockAnalytics()
})

const wrapTestAnalytics = (overrides: Partial<CreateWrapperOptions> = {}) =>
  createWrapper({
    getCategories: mockGetCategories,
    ...overrides,
  })(analytics)

describe(createWrapper, () => {
  describe('shouldLoad() / fetching initial categories', () => {
    it('should wait for shouldLoad() to resolve/return before calling analytics.load()', async () => {
      const shouldLoadMock: jest.Mock<undefined> = jest
        .fn()
        .mockImplementation(() => undefined)

      wrapTestAnalytics({
        shouldLoad: shouldLoadMock,
      })

      const loaded = analytics.load(DEFAULT_LOAD_SETTINGS)
      expect(analyticsLoadSpy).not.toHaveBeenCalled()
      expect(shouldLoadMock).toBeCalled()
      await loaded
      expect(analyticsLoadSpy).toBeCalled()
    })
    describe('getCategories() should not be called if categories are provided', () => {
      test('promise-wrapped', async () => {
        wrapTestAnalytics({
          shouldLoad: () => Promise.resolve(GET_CATEGORIES_RESPONSE),
        })
        await analytics.load(DEFAULT_LOAD_SETTINGS)
        expect(analyticsLoadSpy).toBeCalled()
        expect(mockGetCategories).not.toBeCalled()
      })

      test('non-promise wrapped', async () => {
        wrapTestAnalytics({
          shouldLoad: () => GET_CATEGORIES_RESPONSE,
        })
        await analytics.load(DEFAULT_LOAD_SETTINGS)
        expect(analyticsLoadSpy).toBeCalled()
        expect(mockGetCategories).not.toBeCalled()
      })
    })

    it('should call getCategories() if shouldLoad() option returns nil', async () => {
      wrapTestAnalytics({ shouldLoad: () => undefined })
      await analytics.load(DEFAULT_LOAD_SETTINGS)
      expect(analyticsLoadSpy).toBeCalled()
      expect(mockGetCategories).toBeCalled()
    })

    it('should call getCategories() if shouldLoad() option returns empty promise', async () => {
      wrapTestAnalytics({ shouldLoad: () => Promise.resolve(undefined) })
      await analytics.load(DEFAULT_LOAD_SETTINGS)
      expect(analyticsLoadSpy).toBeCalled()
      expect(mockGetCategories).toBeCalled()
    })
  })

  describe('Config Validation', () => {
    it('should throw an error if categories are in the wrong format', async () => {
      wrapTestAnalytics({
        shouldLoad: () => Promise.resolve('sup' as any),
      })
      try {
        await analytics.load(DEFAULT_LOAD_SETTINGS)
        throw Error('Test fail')
      } catch (err: any) {
        expect(err.message).toMatch(/validation/i)
      }
    })
  })

  describe('Disabling/Enabling integrations before analytics initialization (device mode gating)', () => {
    it('should disable integration if user explicitly does not consent to category', async () => {
      wrapTestAnalytics()

      const mockCdnSettings = {
        integrations: {
          MockIntegrationWithNoConsentSettings: {
            foo: 123,
          },
          MockIntegrationWhereUserHasNotConsented: {
            foo: 123,
            consentSettings: {
              categories: ['SOME_UNCONSENTED_CATEGORY'],
            },
          },
        },
      }

      await analytics.load({
        ...DEFAULT_LOAD_SETTINGS,
        cdnSettings: mockCdnSettings,
      })

      expect(analyticsLoadSpy).toBeCalled()
      const integrations = analyticsLoadSpy.mock.lastCall[1].updateCDNSettings(
        mockCdnSettings
      ).integrations as any
      const cdnIntegrations = mockCdnSettings.integrations
      expect(integrations).toEqual({
        MockIntegrationWithNoConsentSettings:
          cdnIntegrations.MockIntegrationWithNoConsentSettings,
        MockIntegrationWhereUserHasNotConsented: false,
      })
    })

    it('should allow integration in cases where consent settings are unavailable', async () => {
      wrapTestAnalytics({
        getCategories: () => GET_CATEGORIES_RESPONSE,
      })

      const mockCdnSettings = {
        integrations: {
          MockIntegrationWithNoConsentSettings: {
            foo: 123,
          },
          MockIntegrationWithEmptyUserCategories: {
            consentSettings: {
              categories: [],
            },
          },
          MockIntegrationWithEmptyConsentSettingsObject: {
            foo: 123,
            consentSettings: {},
          },
        },
      }

      await analytics.load({
        ...DEFAULT_LOAD_SETTINGS,
        cdnSettings: mockCdnSettings,
      })

      expect(analyticsLoadSpy).toBeCalled()
      const integrations = getLoadSpyIntegrations(mockCdnSettings)
      expect(integrations).toEqual(mockCdnSettings.integrations)
    })

    it('should allow integration if the integration has a category that is consented to', async () => {
      const mockCdnSettings = {
        integrations: {
          nope: {
            foo: 123,
            ...createConsentSettings(['not.a.category']),
          },
          mockIntegration: {
            foo: 123,
            ...createConsentSettings(Object.keys(GET_CATEGORIES_RESPONSE)),
          },
        },
      }

      wrapTestAnalytics({
        getCategories: () => GET_CATEGORIES_RESPONSE,
      })
      await analytics.load({
        ...DEFAULT_LOAD_SETTINGS,
        cdnSettings: mockCdnSettings,
      })
      expect(analyticsLoadSpy).toBeCalled()
      const integrations = getLoadSpyIntegrations(mockCdnSettings)
      expect(integrations.mockIntegration).toBeTruthy()
      expect(integrations.nope).toBeFalsy()
    })

    it('should allow integration if an integration has multiple categories, and user has multiple categories, but only consents to one', async () => {
      const mockCdnSettings = {
        integrations: {
          nope: {
            bar: 456,
            ...createConsentSettings(['Nope', 'Never']),
          },
          mockIntegration: {
            foo: 123,
            ...createConsentSettings(['Bar', 'Something else']),
          },
        },
      }

      wrapTestAnalytics({
        shouldLoad: () => ({ Foo: true, Bar: true }),
      })
      await analytics.load({
        ...DEFAULT_LOAD_SETTINGS,
        cdnSettings: mockCdnSettings,
      })
      expect(analyticsLoadSpy).toBeCalled()
      const integrations = getLoadSpyIntegrations(mockCdnSettings)
      expect(integrations.nope).toBeFalsy()
      expect(integrations.mockIntegration).toBeTruthy()
    })

    it('should allow integration if it has multiple consent categories but user has only consented to one category', async () => {
      const mockCdnSettings = {
        integrations: {
          mockIntegration: {
            // multiple consent categories
            foo: 123,
            ...createConsentSettings(['Foo', 'Bar']),
          },
        },
      }

      wrapTestAnalytics({
        shouldLoad: () => ({ Foo: true }),
      })
      await analytics.load({
        ...DEFAULT_LOAD_SETTINGS,
        cdnSettings: mockCdnSettings,
      })

      expect(analyticsLoadSpy).toBeCalled()
      const integrations = getLoadSpyIntegrations(mockCdnSettings)
      expect(integrations.mockIntegration).toBeTruthy()
    })
  })

  it('should invoke addSourceMiddleware in order to stamp the event', async () => {
    wrapTestAnalytics()
    await analytics.load(DEFAULT_LOAD_SETTINGS)
    expect(addSourceMiddlewareSpy).toBeCalledWith(expect.any(Function))
  })

  describe('disableConsentRequirement', () => {
    it('should load analytics as usual', async () => {
      wrapTestAnalytics({
        disableConsentRequirement: () => true,
      })
      await analytics.load(DEFAULT_LOAD_SETTINGS)
      expect(analyticsLoadSpy).toBeCalled()
    })

    it('should not call shouldLoad', async () => {
      const shouldLoad = jest.fn()
      wrapTestAnalytics({
        disableConsentRequirement: () => true,
        shouldLoad,
      })
      await analytics.load(DEFAULT_LOAD_SETTINGS)
      expect(shouldLoad).not.toBeCalled()
    })

    it('should pass all arguments directly to the actual analytics.load instance', async () => {
      const mockCdnSettings = {
        integrations: {
          mockIntegration: {
            ...createConsentSettings(['Foo']),
          },
        },
      }
      wrapTestAnalytics({
        disableConsentRequirement: () => true,
        getCategories: () => ({ Foo: false }),
      })

      const loadArgs: [any, any] = [
        {
          ...DEFAULT_LOAD_SETTINGS,
          cdnSettings: mockCdnSettings,
        },
        {
          retryQueue: false,
        },
      ]
      await analytics.load(...loadArgs)
      expect(analyticsLoadSpy).toBeCalled()
      expect(getAnalyticsLoadLastCall().args).toEqual(loadArgs)
    })

    it('should not stamp the event with consent info', async () => {
      wrapTestAnalytics({
        disableConsentRequirement: () => true,
      })
      await analytics.load(DEFAULT_LOAD_SETTINGS)
      expect(addSourceMiddlewareSpy).not.toBeCalled()
    })
  })

  describe('disableAll', () => {
    it('should load analytics if disableAll returns false', async () => {
      wrapTestAnalytics({
        disableAll: () => false,
      })
      await analytics.load(DEFAULT_LOAD_SETTINGS)
      expect(analyticsLoadSpy).toBeCalled()
    })

    it('should not load analytics if disableAll returns true', async () => {
      wrapTestAnalytics({
        disableAll: () => true,
      })
      await analytics.load(DEFAULT_LOAD_SETTINGS)
      expect(analyticsLoadSpy).not.toBeCalled()
    })
  })
})
