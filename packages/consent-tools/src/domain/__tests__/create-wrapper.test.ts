import { createWrapper } from '../create-wrapper'
import { CreateWrapperOptions, AnyAnalytics } from '../../types'

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

let mockGetCategories: jest.MockedFn<CreateWrapperOptions['getCategories']> =
  jest.fn().mockImplementation(() => GET_CATEGORIES_RESPONSE)

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
  describe('shouldLoad / getCategories', () => {
    it('should first call shouldLoad(), then wait for it to resolve/return before calling analytics.load()', async () => {
      const fnCalls: string[] = []
      analyticsLoadSpy.mockImplementationOnce(() => {
        fnCalls.push('analytics.load')
      })

      const shouldLoadMock: jest.Mock<undefined> = jest
        .fn()
        .mockImplementationOnce(async () => {
          fnCalls.push('shouldLoad')
        })

      wrapTestAnalytics({
        shouldLoad: shouldLoadMock,
      })

      await analytics.load(DEFAULT_LOAD_SETTINGS)
      expect(fnCalls).toEqual(['shouldLoad', 'analytics.load'])
    })

    test.each([
      {
        shouldLoad: () => undefined,
        description: 'undefined',
      },
      {
        shouldLoad: () => Promise.resolve(undefined),
        description: 'Promise<undefined>',
      },
    ])(
      'if shouldLoad() returns $description, intial categories will come from getCategories()',
      async ({ shouldLoad }) => {
        const mockCdnSettings = {
          integrations: {
            mockIntegration: {
              // multiple consent categories
              foo: 123,
              ...createConsentSettings(['Advertising']),
            },
          },
        }

        wrapTestAnalytics({
          shouldLoad: shouldLoad,
        })
        await analytics.load({
          ...DEFAULT_LOAD_SETTINGS,
          cdnSettings: mockCdnSettings,
        })

        expect(analyticsLoadSpy).toBeCalled()
        expect(mockGetCategories).toBeCalled()
        expect(
          getAnalyticsLoadLastCall().updateCDNSettings(mockCdnSettings)
        ).toBeTruthy()
      }
    )

    test.each([
      {
        getCategories: () => ({ Advertising: true }),
        description: 'Categories (sync)',
      },
      {
        getCategories: () => Promise.resolve({ Advertising: true }),
        description: 'Promise<Categories>',
      },
    ])('getCategories() can return $description', async ({ getCategories }) => {
      const mockCdnSettings = {
        integrations: {
          mockIntegration: {
            // multiple consent categories
            foo: 123,
            ...createConsentSettings(['Advertising']),
          },
        },
      }

      mockGetCategories =
        mockGetCategories.mockImplementationOnce(getCategories)

      wrapTestAnalytics({
        getCategories: mockGetCategories,
        shouldLoad: () => undefined,
      })
      await analytics.load({
        ...DEFAULT_LOAD_SETTINGS,
        cdnSettings: mockCdnSettings,
      })
      expect(analyticsLoadSpy).toBeCalled()
      expect(mockGetCategories).toBeCalled()
      expect(
        getAnalyticsLoadLastCall().updateCDNSettings(mockCdnSettings)
      ).toBeTruthy()
    })
  })

  describe('Validation', () => {
    it('should throw an error if categories are in the wrong format', async () => {
      wrapTestAnalytics({
        shouldLoad: () => Promise.resolve('sup' as any),
      })
      await expect(() => analytics.load(DEFAULT_LOAD_SETTINGS)).rejects.toThrow(
        /validation/i
      )
    })

    it('should throw an error if categories are undefined', async () => {
      wrapTestAnalytics({
        getCategories: () => undefined as any,
        shouldLoad: () => undefined,
      })
      await expect(() => analytics.load(DEFAULT_LOAD_SETTINGS)).rejects.toThrow(
        /validation/i
      )
    })
  })

  describe('Disabling/Enabling integrations before analytics initialization (device mode gating)', () => {
    it('should omit integration if user explicitly does not consent to category', async () => {
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
    describe('if true on wrapper initialization', () => {
      it('should load analytics as usual', async () => {
        wrapTestAnalytics({
          disableConsentRequirement: () => true,
        })
        await analytics.load(DEFAULT_LOAD_SETTINGS)
        expect(analyticsLoadSpy).toBeCalled()
      })

      it('should not call shouldLoad if called on first', async () => {
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
  })

  describe('disableSegmentInitialization', () => {
    it('should load analytics if disableAll returns false', async () => {
      wrapTestAnalytics({
        disableSegmentInitialization: () => false,
      })
      await analytics.load(DEFAULT_LOAD_SETTINGS)
      expect(analyticsLoadSpy).toBeCalled()
    })

    it('should not load analytics if disableAll returns true', async () => {
      wrapTestAnalytics({
        disableSegmentInitialization: () => true,
      })
      await analytics.load(DEFAULT_LOAD_SETTINGS)
      expect(mockGetCategories).not.toBeCalled()
      expect(addSourceMiddlewareSpy).not.toBeCalled()
      expect(analyticsLoadSpy).not.toBeCalled()
    })
  })
})
