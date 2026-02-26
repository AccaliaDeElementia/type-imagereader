'use sanity'

import { HasValues } from '../../../utils/helpers'

export type SubscriberFunction = (recievedData: unknown, actualTopic?: string) => Promise<void>

export type VoidMethod = () => void

interface DeferredMethod {
  method: VoidMethod
  delayCycles: number
}

interface IntervalMethod {
  intervalCycles: number
}

const PUBLISH_CYCLE_TIME = 10 // ms
const MINIMUM_CYCLE_COUNT = 1
const CYCLES_DUE_AT = 0
const INCREMENT_CYCLES = 1
export const PubSub = {
  subscribers: ((): Record<string, SubscriberFunction[]> => ({}))(),
  deferred: ((): DeferredMethod[] => [])(),
  intervals: ((): Record<string, DeferredMethod & IntervalMethod> => ({}))(),
  timer: ((): NodeJS.Timeout | string | number | undefined => undefined)(),
  cycleTime: PUBLISH_CYCLE_TIME,
  Subscribe: (topic: string, subscriber: SubscriberFunction): void => {
    const target = topic.toUpperCase()
    const subs = PubSub.subscribers[target]
    if (subs === undefined) {
      PubSub.subscribers[target] = [subscriber]
    } else {
      subs.push(subscriber)
    }
  },
  Publish: (topic: string, data?: unknown): void => {
    void PubSub.PublishAsync(topic, data)
  },
  PublishAsync: async (topic: string, data?: unknown): Promise<void> => {
    const searchTopic = topic.toUpperCase()
    const matchingTopics = Object.keys(PubSub.subscribers)
      .sort()
      .filter((key) => key === searchTopic || searchTopic.startsWith(`${key}:`))
    if (HasValues(matchingTopics)) {
      const allSubscribers = []
      for (const key of matchingTopics) {
        const subscribers = PubSub.subscribers[key]
        if (HasValues(subscribers)) {
          const errorHandler = (err: unknown): void => {
            window.console.error(`Subscriber for ${searchTopic} rejected with error:`, err)
          }
          allSubscribers.push(
            subscribers.map(async (subscriber) => {
              try {
                await subscriber(data, searchTopic).catch(errorHandler)
              } catch (e: unknown) {
                errorHandler(e)
              }
            }),
          )
        } else {
          window.console.warn(`PUBSUB: topic ${key} registered without subscribers!`)
        }
      }
      if (HasValues(allSubscribers)) {
        await Promise.all(allSubscribers.flat())
      }
    } else {
      window.console.warn(`PUBSUB: topic ${topic} published without subscribers`, data)
    }
  },
  Defer: (method: VoidMethod, delayMs: number): void => {
    PubSub.deferred.push({
      method,
      delayCycles: Math.max(Math.ceil(delayMs / PubSub.cycleTime), MINIMUM_CYCLE_COUNT),
    })
  },
  AddInterval: (name: string, method: VoidMethod, delayMs: number): void => {
    PubSub.intervals[name] = {
      method,
      intervalCycles: Math.max(Math.ceil(delayMs / PubSub.cycleTime), MINIMUM_CYCLE_COUNT),
      delayCycles: CYCLES_DUE_AT,
    }
  },
  RemoveInterval: (name: string): void => {
    const ivals: Record<string, DeferredMethod & IntervalMethod> = {}
    for (const [k, v] of Object.entries(PubSub.intervals)) {
      if (k === name) continue
      ivals[k] = v
    }
    PubSub.intervals = ivals
  },
  ExecuteInterval: (): void => {
    PubSub.deferred
      .filter((delay) => delay.delayCycles <= CYCLES_DUE_AT)
      .forEach((delay) => {
        try {
          delay.method()
        } catch {}
      })
    for (const delay of Object.values(PubSub.intervals)) {
      if (delay.delayCycles <= CYCLES_DUE_AT) {
        delay.delayCycles = delay.intervalCycles
        try {
          delay.method()
        } catch {}
      } else {
        delay.delayCycles -= INCREMENT_CYCLES
      }
    }
    const newDeferred = []
    for (const method of PubSub.deferred) {
      if (method.delayCycles <= CYCLES_DUE_AT) continue
      method.delayCycles -= INCREMENT_CYCLES
      newDeferred.push(method)
    }
    PubSub.deferred = newDeferred
  },
  StartDeferred: (): void => {
    PubSub.timer = window.setInterval((): void => {
      PubSub.ExecuteInterval()
    }, PubSub.cycleTime)
  },
  StopDeferred: (): void => {
    if (PubSub.timer !== undefined) {
      window.clearInterval(PubSub.timer)
      PubSub.timer = undefined
    }
  },
}

export const Subscribe = PubSub.Subscribe.bind(PubSub)
export const Publish = PubSub.Publish.bind(PubSub)
export const Defer = PubSub.Defer.bind(PubSub)
export const AddInterval = PubSub.AddInterval.bind(PubSub)
export const RemoveInterval = PubSub.RemoveInterval.bind(PubSub)
