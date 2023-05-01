import { pick } from '../../lib/pick'
import { SegmentEvent } from '../events'
import { PageContext, createPageContext } from './get-page-context'

export function addPageContext(
  event: SegmentEvent,
  pageCtx: PageContext | undefined
): void {
  event.context = event.context || {}
  const defaultPageContext = createPageContext()
  event.context.page = {
    ...defaultPageContext,
    ...pageCtx,
    ...event.context.page,
  }

  if (event.type === 'page') {
    // if user does "analytics.page('category', 'name', { url: "foo" })"... use the properties as source of truth
    const pageContextFromEventProps = pick(
      event.properties,
      Object.keys(defaultPageContext) as any
    )

    event.context.page = {
      ...event.context.page,
      ...pageContextFromEventProps,
    }

    event.properties = {
      ...event.context.page,
      ...event.properties,
      ...(event.name ? { name: event.name } : {}),
    }
  }
}
