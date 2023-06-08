import { createWrapper } from '../create-wrapper'
import { CreateWrapperOptions } from '../../types'
import { waitFor } from '@testing-library/dom'
import type { Analytics } from '../../types'

const fixtures = {
  GET_CATEGORIES_RESPONSE: { Advertising: true },
  WRITEKEY: 'FOO',
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
  .mockImplementation(() => fixtures.GET_CATEGORIES_RESPONSE)

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

const DEFAULT_LOAD_OPTS = {
  writeKey: 'foo',
  cdnSettings: { integrations: {} },
}

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

    analytics.load(DEFAULT_LOAD_OPTS)
    expect(analyticsLoadSpy).not.toHaveBeenCalled()
    expect(shouldLoadMock).toBeCalled()
    await waitFor(() => expect(analyticsLoadSpy).toBeCalled())
  })

  describe('Fetching initial categories', () => {
    describe('getCategories() should not be called if categories are provided', () => {
      test('promise-wrapped', async () => {
        wrapTestAnalytics({
          shouldLoad: () => Promise.resolve(fixtures.GET_CATEGORIES_RESPONSE),
        })
        analytics.load(DEFAULT_LOAD_OPTS)
        await waitFor(() => expect(analyticsLoadSpy).toBeCalled())
        expect(mockGetCategories).not.toBeCalled()
      })

      test('non-promise wrapped', async () => {
        wrapTestAnalytics({
          shouldLoad: () => fixtures.GET_CATEGORIES_RESPONSE,
        })
        analytics.load(DEFAULT_LOAD_OPTS)
        await waitFor(() => expect(analyticsLoadSpy).toBeCalled())
        expect(mockGetCategories).not.toBeCalled()
      })
    })

    it('should call getCategories() if shouldLoad() option returns nil', async () => {
      wrapTestAnalytics({ shouldLoad: () => undefined })
      analytics.load(DEFAULT_LOAD_OPTS)
      await waitFor(() => expect(analyticsLoadSpy).toBeCalled())
      expect(mockGetCategories).toBeCalled()
    })

    it('should call getCategories() if shouldLoad() option returns empty promise', async () => {
      wrapTestAnalytics({ shouldLoad: () => Promise.resolve(undefined) })
      analytics.load(DEFAULT_LOAD_OPTS)
      await waitFor(() => expect(analyticsLoadSpy).toBeCalled())
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
            categories: fixtures.GET_CATEGORIES_RESPONSE,
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

    analytics.load({
      ...DEFAULT_LOAD_OPTS,
      cdnSettings: mockCdnSettings,
    })

    await waitFor(() => expect(analyticsLoadSpy).toBeCalled())
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
    analytics.load({
      ...DEFAULT_LOAD_OPTS,
      cdnSettings: mockCdnSettings,
    })
    await waitFor(() => expect(analyticsLoadSpy).toBeCalled())
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
    analytics.load({
      ...DEFAULT_LOAD_OPTS,
      cdnSettings: mockCdnSettings,
    })
    await waitFor(() => expect(analyticsLoadSpy).toBeCalled())
    const integrations = analyticsLoadSpy.mock.lastCall[0].cdnSettings
      ?.integrations as any
    expect(integrations.justForFun).toBeTruthy()
    expect(integrations.mockIntegration).toBeTruthy()
  })

  describe('disableAll', () => {
    it('should load analytics if disableAll returns false', async () => {
      wrapTestAnalytics({
        disableAll: () => false,
      })
      analytics.load(DEFAULT_LOAD_OPTS)
      await waitFor(() => expect(analyticsLoadSpy).toBeCalled())
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
