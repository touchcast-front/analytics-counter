import { createWrapper } from '../create-wrapper'
import { CreateWrapperOptions, Analytics } from '../../types'

const GET_CATEGORIES_RESPONSE = { Advertising: true }

const DEFAULT_LOAD_OPTS = {
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

class MockAnalytics implements Analytics {
  load = analyticsLoadSpy
  addSourceMiddleware = addSourceMiddlewareSpy
}

let analytics: Analytics
beforeEach(() => {
  analytics = new MockAnalytics()
})

const wrapTestAnalytics = (overrides: Partial<CreateWrapperOptions> = {}) =>
  createWrapper({
    getCategories: mockGetCategories,
    ...overrides,
  })(analytics)

describe(createWrapper, () => {
  it('should wait for shouldLoad() to resolve/return before calling analytics.load()', async () => {
    const shouldLoadMock: jest.Mock<undefined> = jest
      .fn()
      .mockImplementation(() => undefined)

    wrapTestAnalytics({
      shouldLoad: shouldLoadMock,
    })

    const loaded = analytics.load(DEFAULT_LOAD_OPTS)
    expect(analyticsLoadSpy).not.toHaveBeenCalled()
    expect(shouldLoadMock).toBeCalled()
    await loaded
    expect(analyticsLoadSpy).toBeCalled()
  })

  describe('Fetching initial categories', () => {
    describe('getCategories() should not be called if categories are provided', () => {
      test('promise-wrapped', async () => {
        wrapTestAnalytics({
          shouldLoad: () => Promise.resolve(GET_CATEGORIES_RESPONSE),
        })
        await analytics.load(DEFAULT_LOAD_OPTS)
        expect(analyticsLoadSpy).toBeCalled()
        expect(mockGetCategories).not.toBeCalled()
      })

      test('non-promise wrapped', async () => {
        wrapTestAnalytics({
          shouldLoad: () => GET_CATEGORIES_RESPONSE,
        })
        await analytics.load(DEFAULT_LOAD_OPTS)
        expect(analyticsLoadSpy).toBeCalled()
        expect(mockGetCategories).not.toBeCalled()
      })
    })

    it('should call getCategories() if shouldLoad() option returns nil', async () => {
      wrapTestAnalytics({ shouldLoad: () => undefined })
      await analytics.load(DEFAULT_LOAD_OPTS)
      expect(analyticsLoadSpy).toBeCalled()
      expect(mockGetCategories).toBeCalled()
    })

    it('should call getCategories() if shouldLoad() option returns empty promise', async () => {
      wrapTestAnalytics({ shouldLoad: () => Promise.resolve(undefined) })
      await analytics.load(DEFAULT_LOAD_OPTS)
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
        await analytics.load(DEFAULT_LOAD_OPTS)
        throw Error('Test fail')
      } catch (err: any) {
        expect(err.message).toMatch(/validation/i)
      }
    })
  })

  it('should ignore consent info (and load as usual) if integration consent info is not available', async () => {
    // user only consents to 'advertising' in these tests.
    wrapTestAnalytics()

    const mockCdnSettings = {
      integrations: {
        MockIntegrationWithNoConsentSettings: {
          foo: 123,
        },
        MockIntegrationWithConsentSettings: {
          foo: 123,
          consentSettings: {
            categories: GET_CATEGORIES_RESPONSE,
          },
        },
        MockIntegrationWhereUserHasNotConsented: {
          foo: 123,
          consentSettings: {
            categories: ['SOME_UNCONSENTED_CATEGORY'],
          },
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
      ...DEFAULT_LOAD_OPTS,
      cdnSettings: mockCdnSettings,
    })

    expect(analyticsLoadSpy).toBeCalled()
    const integrations = analyticsLoadSpy.mock.lastCall[0].cdnSettings
      ?.integrations as any
    expect(integrations.MockIntegrationWithNoConsentSettings).toEqual(
      mockCdnSettings.integrations.MockIntegrationWithNoConsentSettings
    )
    expect(integrations.MockIntegrationWithConsentSettings).toEqual(
      mockCdnSettings.integrations.MockIntegrationWithConsentSettings
    )

    expect(integrations.MockIntegrationWhereUserHasNotConsented).toBeFalsy()
    expect(integrations.MockIntegrationWithEmptyUserCategories).toEqual(
      mockCdnSettings.integrations.MockIntegrationWithEmptyUserCategories
    )
    expect(integrations.MockIntegrationWithEmptyConsentSettingsObject).toEqual(
      mockCdnSettings.integrations.MockIntegrationWithEmptyConsentSettingsObject
    )
  })

  it('should work if user has consented to multiple categories', async () => {
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
      ...DEFAULT_LOAD_OPTS,
      cdnSettings: mockCdnSettings,
    })
    expect(analyticsLoadSpy).toBeCalled()
    const integrations = analyticsLoadSpy.mock.lastCall[0].cdnSettings
      ?.integrations as any
    expect(integrations.nope).toBeFalsy()
    expect(integrations.mockIntegration).toBeTruthy()
  })

  it('should work if integration has multiple consent categories and user has consented to one', async () => {
    const mockCdnSettings = {
      integrations: {
        justForFun: {
          bar: 456,
        },
        mockIntegration: {
          foo: 123,
          ...createConsentSettings(['Foo', 'Bar']),
        },
      },
    }

    wrapTestAnalytics({
      shouldLoad: () => ({ Foo: true }),
    })
    await analytics.load({
      ...DEFAULT_LOAD_OPTS,
      cdnSettings: mockCdnSettings,
    })

    expect(analyticsLoadSpy).toBeCalled()
    const integrations = analyticsLoadSpy.mock.lastCall[0].cdnSettings
      ?.integrations as any
    expect(integrations.justForFun).toBeTruthy()
    expect(integrations.mockIntegration).toBeTruthy()
  })

  it('should invoke addSourceMiddleware in order to stamp the event', async () => {
    wrapTestAnalytics()
    await analytics.load(DEFAULT_LOAD_OPTS)
    expect(addSourceMiddlewareSpy).toBeCalledWith(expect.any(Function))
  })

  describe('disableConsentRequirement', () => {
    it('should load analytics as usual if disableConsentRequirement ', async () => {
      wrapTestAnalytics({
        disableConsentRequirement: () => true,
      })
      await analytics.load(DEFAULT_LOAD_OPTS)
      expect(analyticsLoadSpy).toBeCalled()
    })

    it('should not call shouldLoad', async () => {
      const shouldLoad = jest.fn()
      wrapTestAnalytics({
        disableConsentRequirement: () => true,
        shouldLoad,
      })
      await analytics.load(DEFAULT_LOAD_OPTS)
      expect(shouldLoad).not.toBeCalled()
    })

    it('should not set cdn settings', async () => {
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
      await analytics.load({
        ...DEFAULT_LOAD_OPTS,
        cdnSettings: mockCdnSettings,
      })
      const integrations = analyticsLoadSpy.mock.lastCall[0].cdnSettings
        ?.integrations as any
      // should not alter cdn settings
      expect(integrations.mockIntegration).toEqual(
        mockCdnSettings.integrations.mockIntegration
      )
    })

    it('should not stamp the event with consent info', async () => {
      wrapTestAnalytics({
        disableConsentRequirement: () => true,
      })
      await analytics.load(DEFAULT_LOAD_OPTS)
      expect(addSourceMiddlewareSpy).not.toBeCalled()
    })
  })

  describe('disableAll', () => {
    it('should load analytics if disableAll returns false', async () => {
      wrapTestAnalytics({
        disableAll: () => false,
      })
      await analytics.load(DEFAULT_LOAD_OPTS)
      expect(analyticsLoadSpy).toBeCalled()
    })

    it('should not load analytics if disableAll returns true', async () => {
      wrapTestAnalytics({
        disableAll: () => true,
      })
      await analytics.load(DEFAULT_LOAD_OPTS)
      expect(analyticsLoadSpy).not.toBeCalled()
    })
  })
})
