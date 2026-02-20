'use sanity'

export type SubscriberFunction = (recievedData: unknown, actualTopic?: string) => Promise<void>

export type VoidMethod = () => void

interface DeferredMethod {
  method: VoidMethod
  delayCycles: number
}

interface IntervalMethod {
  intervalCycles: number
}

export const PubSub = {
  subscribers: ((): Record<string, SubscriberFunction[]> => ({}))(),
  deferred: ((): DeferredMethod[] => [])(),
  intervals: ((): Record<string, DeferredMethod & IntervalMethod> => ({}))(),
  timer: ((): NodeJS.Timeout | string | number | undefined => undefined)(),
  cycleTime: 10,
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
    if (matchingTopics.length === 0) {
      window.console.warn(`PUBSUB: topic ${topic} published without subscribers`, data)
    } else {
      for (const key of matchingTopics) {
        const subscribers = PubSub.subscribers[key]
        if (subscribers === undefined || subscribers.length < 1) {
          window.console.warn(`PUBSUB: topic ${key} registered without subscribers!`)
        } else {
          const errorHandler = (err: unknown): void => {
            window.console.error(`Subscriber for ${searchTopic} rejected with error:`, err)
          }
          await Promise.all(
            subscribers.map(async (subscriber) => {
              try {
                await subscriber(data, searchTopic).catch(errorHandler)
              } catch (e: unknown) {
                errorHandler(e)
              }
            }),
          )
        }
      }
    }
  },
  Defer: (method: VoidMethod, delayMs: number): void => {
    PubSub.deferred.push({
      method,
      delayCycles: Math.max(Math.ceil(delayMs / PubSub.cycleTime), 1),
    })
  },
  AddInterval: (name: string, method: VoidMethod, delayMs: number): void => {
    PubSub.intervals[name] = {
      method,
      intervalCycles: Math.max(Math.ceil(delayMs / PubSub.cycleTime), 1),
      delayCycles: 0,
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
      .filter((delay) => delay.delayCycles <= 0)
      .forEach((delay) => {
        try {
          delay.method()
        } catch {}
      })
    for (const delay of Object.values(PubSub.intervals)) {
      if (delay.delayCycles <= 0) {
        delay.delayCycles = delay.intervalCycles
        try {
          delay.method()
        } catch {}
      } else {
        delay.delayCycles -= 1
      }
    }
    const newDeferred = []
    for (const method of PubSub.deferred) {
      if (method.delayCycles <= 0) continue
      method.delayCycles -= 1
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
