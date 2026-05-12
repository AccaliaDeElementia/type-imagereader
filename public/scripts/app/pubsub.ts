'use sanity'

import { hasValues } from '#utils/helpers.js'

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
const CYCLES_DUE_THRESHOLD = 0
const INCREMENT_CYCLES = 1

export const PubSub = {
  subscribers: ((): Record<string, SubscriberFunction[]> => ({}))(),
  deferred: [] as DeferredMethod[],
  intervals: ((): Record<string, DeferredMethod & IntervalMethod> => ({}))(),
  timer: undefined as NodeJS.Timeout | string | number | undefined,
  cycleTime: PUBLISH_CYCLE_TIME,
  guardCallback: undefined as ((op: string) => void) | undefined,
}

export function subscribe(topic: string, subscriber: SubscriberFunction): void {
  PubSub.guardCallback?.(`subscribe to '${topic}'`)
  const target = topic.toUpperCase()
  const subs = PubSub.subscribers[target]
  if (subs === undefined) {
    PubSub.subscribers[target] = [subscriber]
  } else {
    subs.push(subscriber)
  }
}

export function publish(topic: string, data?: unknown): void {
  PubSub.guardCallback?.(`publish '${topic}'`)
  void Internals.publishAsync(topic, data)
}

export function forward(fromTopic: string, toTopic: string): void {
  PubSub.guardCallback?.(`forward '${fromTopic}' -> '${toTopic}'`)
  subscribe(fromTopic, async () => {
    publish(toTopic)
    await Promise.resolve()
  })
}

async function publishAsync(topic: string, data?: unknown): Promise<void> {
  const searchTopic = topic.toUpperCase()
  const matchingTopics = Object.keys(PubSub.subscribers)
    .sort()
    .filter((key) => key === searchTopic || searchTopic.startsWith(`${key}:`))
  if (hasValues(matchingTopics)) {
    const allSubscribers = []
    for (const key of matchingTopics) {
      const subscribers = PubSub.subscribers[key]
      if (hasValues(subscribers)) {
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
    if (hasValues(allSubscribers)) {
      await Promise.all(allSubscribers.flat())
    }
  } else {
    window.console.warn(`PUBSUB: topic ${topic} published without subscribers`, data)
  }
}

export function defer(method: VoidMethod, delayMs: number): void {
  PubSub.guardCallback?.('defer')
  PubSub.deferred.push({
    method,
    delayCycles: Math.max(Math.ceil(delayMs / PubSub.cycleTime), MINIMUM_CYCLE_COUNT),
  })
}

export function addInterval(name: string, method: VoidMethod, delayMs: number): void {
  PubSub.guardCallback?.(`addInterval '${name}'`)
  PubSub.intervals[name] = {
    method,
    intervalCycles: Math.max(Math.ceil(delayMs / PubSub.cycleTime), MINIMUM_CYCLE_COUNT),
    delayCycles: CYCLES_DUE_THRESHOLD,
  }
}

export function removeInterval(name: string): void {
  PubSub.guardCallback?.(`removeInterval '${name}'`)
  const ivals: Record<string, DeferredMethod & IntervalMethod> = {}
  for (const [k, v] of Object.entries(PubSub.intervals)) {
    if (k === name) continue
    ivals[k] = v
  }
  PubSub.intervals = ivals
}

function executeInterval(): void {
  PubSub.deferred
    .filter((delay) => delay.delayCycles <= CYCLES_DUE_THRESHOLD)
    .forEach((delay) => {
      try {
        delay.method()
      } catch {}
    })
  for (const delay of Object.values(PubSub.intervals)) {
    if (delay.delayCycles <= CYCLES_DUE_THRESHOLD) {
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
    if (method.delayCycles <= CYCLES_DUE_THRESHOLD) continue
    method.delayCycles -= INCREMENT_CYCLES
    newDeferred.push(method)
  }
  PubSub.deferred = newDeferred
}

export function startDeferred(): void {
  PubSub.timer = window.setInterval((): void => {
    Internals.executeInterval()
  }, PubSub.cycleTime)
}

export function stopDeferred(): void {
  if (PubSub.timer !== undefined) {
    window.clearInterval(PubSub.timer)
    PubSub.timer = undefined
  }
}

export const Internals = {
  publishAsync,
  executeInterval,
}
