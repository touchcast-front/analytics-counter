import { LegacySettings } from '../../browser'
import { Context } from '../../core/context'
import { isServer } from '../../core/environment'
import { loadScript } from '../../lib/load-script'
import { MiddlewareFunction } from '../middleware'

const path = process.env.LEGACY_INTEGRATIONS_PATH ?? 'https://cdn.segment.build/next-integrations'

export async function remoteMiddlewares(ctx: Context, settings: LegacySettings): Promise<MiddlewareFunction[]> {
  if (isServer()) {
    return []
  }

  const remoteMiddleware = settings.enabledMiddleware ?? {}
  const names = Object.keys(remoteMiddleware)

  const scripts = names.map(async (name) => {
    const nonNamespaced = name.replace('@segment/', '')
    const fullPath = `${path}/middleware/${nonNamespaced}/latest/${nonNamespaced}.js.gz`

    try {
      await loadScript(fullPath)
      // @ts-ignore
      return window[`${nonNamespaced}Middleware`] as MiddlewareFunction
    } catch (error) {
      ctx.log('error', error)
      ctx.stats.increment('failed_remote_middleware')
    }
  })

  let middleware = await Promise.all(scripts)
  middleware = middleware.filter(Boolean)

  return middleware as MiddlewareFunction[]
}