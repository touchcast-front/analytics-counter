import {
  EventProperties,
  Traits,
  Emitter,
  CoreAnalytics,
  CoreContext,
  CorePlugin,
  EventFactory,
  EventQueue,
  dispatchAndEmit,
  CoreOptions,
  Callback,
  CoreSegmentEvent,
  bindAll,
  PriorityQueue,
} from '@segment/analytics-core'
import { AnalyticsNodeSettings, validateSettings } from './settings'
import { analyticsNode, AnalyticsNodePluginSettings } from './plugin'

import { version } from '../../package.json'
import { EmittedError } from './errors'

// create a derived class since we may want to add node specific things to Context later
export class NodeContext extends CoreContext {}

/**
 * An ID associated with the user. Note: at least one of userId or anonymousId must be included.
 **/
type IdentityOptions =
  | { userId: string; anonymousId?: string }
  | { userId?: string; anonymousId: string }

/** Events from CoreOptions */
export interface NodeSegmentEventOptions {
  context?: NodeContext
  timestamp?: CoreOptions['timestamp']
}

/**
 * Map of emitter event names to method args.
 */
type NodeEmitterEvents = {
  error: [error: EmittedError]
  initialize: [AnalyticsNodeSettings]
  alias: [ctx: NodeContext]
  track: [ctx: NodeContext]
  identify: [ctx: NodeContext]
  page: [ctx: NodeContext]
  screen: NodeEmitterEvents['page']
  group: [ctx: NodeContext]
  register: [pluginNames: string[]]
  deregister: [pluginNames: string[]]
}

class NodePriorityQueue extends PriorityQueue<NodeContext> {
  constructor(maxAttempts: number) {
    super(maxAttempts, [])
  }
  // do not use an internal "seen" map
  getAttempts(ctx: NodeContext): number {
    return ctx.attempts ?? 0
  }
  updateAttempts(ctx: NodeContext): number {
    ctx.attempts = this.getAttempts(ctx) + 1
    return this.getAttempts(ctx)
  }
}

type NodeSegmentEventType = 'track' | 'page' | 'identify' | 'alias' | 'screen'

export interface NodeSegmentEvent extends CoreSegmentEvent {
  type: NodeSegmentEventType
  options?: NodeSegmentEventOptions
}

export class AnalyticsNode
  extends Emitter<NodeEmitterEvents>
  implements CoreAnalytics
{
  private _eventFactory: EventFactory

  queue: EventQueue

  ready: Promise<void>

  constructor(settings: AnalyticsNodeSettings) {
    validateSettings(settings)
    super()
    this._eventFactory = new EventFactory()
    this.queue = new EventQueue(new NodePriorityQueue(3))

    const nodeSettings: AnalyticsNodePluginSettings = {
      name: 'analytics-node-next',
      type: 'after',
      version: 'latest',
      writeKey: settings.writeKey,
    }

    this.ready = this.register(analyticsNode(nodeSettings, this))
      .then(() => undefined)
      .catch((err) => {
        console.error(err)
      })

    this.emit('initialize', settings)

    bindAll(this)
  }

  get VERSION() {
    return version
  }

  private _dispatch(segmentEvent: CoreSegmentEvent, callback?: Callback) {
    dispatchAndEmit(segmentEvent, this.queue, this, {
      callback: callback,
    }).catch((err) => err) // we ignore errors, since we have an event emitter
  }
  /**
   * Combines two unassociated user identities.
   * @link https://segment.com/docs/connections/sources/catalog/libraries/server/node/#alias
   */
  alias({
    userId,
    previousId,
    options,
    callback,
  }: {
    /* The new user id you want to associate with the user. */
    userId: string
    /* The previous id that the user was recognized by (this can be either a userId or an anonymousId). */
    previousId: string
    options?: NodeSegmentEventOptions
    callback?: Callback
  }): void {
    const segmentEvent = this._eventFactory.alias(userId, previousId, options)
    this._dispatch(segmentEvent, callback)
  }

  /**
   * Associates an identified user with a collective.
   *  @link https://segment.com/docs/connections/sources/catalog/libraries/server/node/#group
   */
  group({
    groupId,
    userId,
    anonymousId,
    traits = {},
    options = {},
    callback,
  }: IdentityOptions & {
    groupId: string
    traits?: Traits
    options?: NodeSegmentEventOptions
    callback?: Callback
  }): void {
    const segmentEvent = this._eventFactory.group(groupId, traits, {
      ...options,
      anonymousId,
      userId,
    })

    this._dispatch(segmentEvent, callback)
  }

  /**
   * Includes a unique userId and (maybe anonymousId) and any optional traits you know about them.
   * @link https://segment.com/docs/connections/sources/catalog/libraries/server/node/#identify
   */
  identify({
    userId,
    anonymousId,
    traits = {},
    options,
    callback,
  }: IdentityOptions & {
    traits?: Traits
    options?: NodeSegmentEventOptions
    callback?: Callback
  }): void {
    const segmentEvent = this._eventFactory.identify(userId, traits, {
      ...options,
      anonymousId,
      userId,
    })
    this._dispatch(segmentEvent, callback)
  }

  /**
   * The page method lets you record page views on your website, along with optional extra information about the page being viewed.
   * @link https://segment.com/docs/connections/sources/catalog/libraries/server/node/#page
   */
  page({
    userId,
    anonymousId,
    category,
    name,
    properties,
    options,
    timestamp,
    callback,
  }: IdentityOptions & {
    /*  The category of the page. Useful for cases like ecommerce where many pages might live under a single category. */
    category?: string
    /* The name of the page.*/
    name?: string
    /* A dictionary of properties of the page. */
    properties?: EventProperties
    callback?: Callback
    timestamp?: string | Date
    options?: NodeSegmentEventOptions
  }): void {
    const segmentEvent = this._eventFactory.page(
      category ?? null,
      name ?? null,
      properties,
      { ...options, anonymousId, userId, timestamp }
    )
    this._dispatch(segmentEvent, callback)
  }

  /**
   * Records screen views on your app, along with optional extra information
   * about the screen viewed by the user.
   *
   * TODO: This is not documented on the segment docs ATM (for node).
   */
  screen({
    userId,
    anonymousId,
    category,
    name,
    properties,
    options,
    callback,
    timestamp,
  }: Parameters<AnalyticsNode['page']>[0]): void {
    const segmentEvent = this._eventFactory.screen(
      category ?? null,
      name ?? null,
      properties,
      { ...options, anonymousId, userId, timestamp }
    )

    this._dispatch(segmentEvent, callback)
  }

  /**
   * Records actions your users perform.
   * @link https://segment.com/docs/connections/sources/catalog/libraries/server/node/#track
   */
  track({
    userId,
    anonymousId,
    event,
    properties,
    options,
    callback,
  }: IdentityOptions & {
    event: string
    properties?: EventProperties
    options?: NodeSegmentEventOptions
    callback?: Callback
  }): void {
    const segmentEvent = this._eventFactory.track(event, properties, {
      ...options,
      userId,
      anonymousId,
    })

    this._dispatch(segmentEvent, callback)
  }

  /**
   * Registers one or more plugins to augment Analytics functionality.
   * @param plugins
   */
  async register(...plugins: CorePlugin<any, any>[]): Promise<void> {
    return this.queue.criticalTasks.run(async () => {
      const ctx = NodeContext.system()

      const registrations = plugins.map((xt) =>
        this.queue.register(ctx, xt, this)
      )
      await Promise.all(registrations)
      this.emit(
        'register',
        plugins.map((el) => el.name)
      )
    })
  }

  /**
   * Deregisters one or more plugins based on their names.
   * @param pluginNames - The names of one or more plugins to deregister.
   */
  async deregister(...pluginNames: string[]): Promise<void> {
    const ctx = NodeContext.system()

    const deregistrations = pluginNames.map(async (pl) => {
      const plugin = this.queue.plugins.find((p) => p.name === pl)
      if (plugin) {
        return this.queue.deregister(ctx, plugin, this)
      } else {
        ctx.log('warn', `plugin ${pl} not found`)
      }
    })

    await Promise.all(deregistrations)
    this.emit('deregister', pluginNames)
  }
}