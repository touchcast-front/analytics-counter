import { Emitter } from '@segment/analytics-core'
import { AnyAnalytics, Categories } from '../types'

export type CreateWrapperEventEmitterContract = {
  real_analytics_load_called: [
    { analytics: AnyAnalytics; initialCategories: Categories }
  ]
}

/**
 * This emitter allows users to listen in on
 */
export class CreateWrapperEventEmitter extends Emitter<CreateWrapperEventEmitterContract> {}
