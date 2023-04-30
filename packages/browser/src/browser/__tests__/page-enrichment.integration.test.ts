import { Analytics } from '../../core/analytics'
import { pick } from '../../lib/pick'
import { PageContext } from '../../core/page'

let ajs: Analytics

const helpers = {
  get pageProps(): PageContext {
    return {
      url: 'http://foo.com/bar?foo=hello_world',
      path: '/bar',
      search: '?foo=hello_world',
      referrer: 'http://google.com',
      title: 'Hello World',
    }
  },
}

describe('Page Enrichment', () => {
  beforeEach(async () => {
    ajs = new Analytics({
      writeKey: 'abc_123',
    })
  })

  test('enriches page calls', async () => {
    const ctx = await ajs.page('Checkout', {})

    expect(ctx.event.properties).toMatchInlineSnapshot(`
      Object {
        "__type": "page_ctx",
        "name": "Checkout",
        "path": "/",
        "referrer": "",
        "search": "",
        "title": "",
        "url": "http://localhost/",
      }
    `)
  })

  test('enriches track events with the page context', async () => {
    const ctx = await ajs.track('My event', {
      banana: 'phone',
    })

    expect(ctx.event.context?.page).toMatchInlineSnapshot(`
      Object {
        "__type": "page_ctx",
        "path": "/",
        "referrer": "",
        "search": "",
        "title": "",
        "url": "http://localhost/",
      }
    `)
  })

  describe('event.properties override behavior', () => {
    test('for page events, only page properties in event.properties (url, referrer, etc) should be copied to context.page', async () => {
      const eventProps = {
        ...helpers.pageProps,
        hello: 'fail_if_in_context',
      }
      const { event } = await ajs.page('category', 'name', eventProps)
      expect('hello' in event.context!.page!).toBeFalsy() // no non-page properties should be in context.
      expect(event.properties!.category).toBe('category')
      expect(event.properties!.name).toBe('name')
      expect(event.properties).toEqual(expect.objectContaining(eventProps))
    })

    test('for non-page events, special page properties in event.properties should be ignored', async () => {
      const properties = {
        url: 'http://hello-world.com',
      }
      const { event } = await ajs.track('foo', properties)
      expect(event.properties).toEqual(properties)
      expect(event.context?.page).toMatchInlineSnapshot(`
        Object {
          "__type": "page_ctx",
          "path": "/",
          "referrer": "",
          "search": "",
          "title": "",
          "url": "http://localhost/",
        }
      `)
    })

    test('page properties should have defaults, even if only a few properties are set', async () => {
      const eventProps = pick(helpers.pageProps, ['path', 'referrer'])
      const ctx = await ajs.page(undefined, undefined, eventProps)
      const page = ctx.event.context!.page
      expect(page).toMatchInlineSnapshot(`
        Object {
          "__type": "page_ctx",
          "path": "/bar",
          "referrer": "http://google.com",
          "search": "",
          "title": "",
          "url": "http://localhost/",
        }
      `)
    })

    test('undefined / null / empty string properties on event get overridden as usual', async () => {
      const eventProps = { ...helpers.pageProps }
      eventProps.referrer = ''
      eventProps.path = undefined as any
      eventProps.title = null as any
      const ctx = await ajs.page(undefined, undefined, eventProps)
      const page = ctx.event.context!.page
      expect(page).toEqual(
        expect.objectContaining({ referrer: '', path: undefined, title: null })
      )
    })
  })

  test('enriches page events with the page context', async () => {
    const ctx = await ajs.page(
      'My event',
      { banana: 'phone' },
      { page: { url: 'not-localhost' } }
    )

    expect(ctx.event.context?.page).toMatchInlineSnapshot(`
      Object {
        "__type": "page_ctx",
        "path": "/",
        "referrer": "",
        "search": "",
        "title": "",
        "url": "not-localhost",
      }
    `)
  })
  test('enriches page events using properties', async () => {
    const ctx = await ajs.page('My event', { banana: 'phone', referrer: 'foo' })

    expect(ctx.event.context?.page).toMatchInlineSnapshot(`
      Object {
        "__type": "page_ctx",
        "path": "/",
        "referrer": "foo",
        "search": "",
        "title": "",
        "url": "http://localhost/",
      }
    `)
  })

  test('in page events, event.name overrides event.properties.name', async () => {
    const ctx = await ajs.page('My Event', undefined, undefined, {
      name: 'some propery name',
    })
    expect(ctx.event.properties!.name).toBe('My Event')
  })

  test('in non-page events, event.name does not override event.properties.name', async () => {
    const ctx = await ajs.track('My Event', {
      name: 'some propery name',
    })
    expect(ctx.event.properties!.name).toBe('some propery name')
  })

  test('enriches identify events with the page context', async () => {
    const ctx = await ajs.identify('Netto', {
      banana: 'phone',
    })

    expect(ctx.event.context?.page).toMatchInlineSnapshot(`
      Object {
        "__type": "page_ctx",
        "path": "/",
        "referrer": "",
        "search": "",
        "title": "",
        "url": "http://localhost/",
      }
    `)
  })

  test('runs before any other plugin', async () => {
    let called = false

    await ajs.addSourceMiddleware(({ payload, next }) => {
      called = true
      expect(payload.obj?.context?.page).not.toBeFalsy()
      next(payload)
    })

    await ajs.track('My event', {
      banana: 'phone',
    })

    expect(called).toBe(true)
  })
})
