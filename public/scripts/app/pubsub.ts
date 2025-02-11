'use sanity'

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO: Refector to make this explicitly typesafe without resorting to `any`
export type SubscriberFunction = (recievedData: any, actualTopic?: string) => void

export type VoidMethod = () => void

interface DeferredMethod {
  method: VoidMethod
  delayCycles: number
}

interface IntervalMethod {
  intervalCycles: number
}

export class PubSub {
  protected static subscribers: { [key: string]: SubscriberFunction[] } = {}
  protected static deferred: DeferredMethod[] = []
  protected static intervals: { [key: string]: (DeferredMethod & IntervalMethod) } = {}
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- This is a timer, and the definition is different between the browser and node...
  protected static timer: any // it's NodeJS.Timer or number depending on browser or tests
  protected static cycleTime = 10
  static Subscribe (topic: string, subscriber: SubscriberFunction): void {
    topic = topic.toUpperCase()
    const subs = this.subscribers[topic]
    if (subs == null) {
      this.subscribers[topic] = [subscriber]
    } else {
      subs.push(subscriber)
    }
  }
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO: Refector to make this explicitly typesafe without resorting to `any`
  static Publish (topic: string, data?: any): void {
    const searchTopic = topic.toUpperCase()
    const matchingTopics = Object.keys(this.subscribers)
      .sort()
      .filter(key => key === searchTopic ||
        searchTopic.startsWith(`${key}:`))
    if (matchingTopics.length === 0) {
      window.console.warn(`PUBSUB: topic ${topic} published without subscribers`, data)
    } else {
      for (const key of matchingTopics) {
        const subscribers = this.subscribers[key]
        if (subscribers == null || subscribers.length < 1) {
          window.console.warn(`PUBSUB: topic ${key} registered without subscribers!`)
        } else {
          subscribers.forEach(subscriber => { subscriber(data, searchTopic) })
        }
      }
    }
  }

  static Defer (method: VoidMethod, delayMs: number): void {
    this.deferred.push({
      method,
      delayCycles: Math.max(Math.ceil(delayMs / this.cycleTime), 1)
    })
  }

  static AddInterval (name: string, method: VoidMethod, delayMs: number): void {
    this.intervals[name] = {
      method,
      intervalCycles: Math.max(Math.ceil(delayMs / this.cycleTime), 1),
      delayCycles: 0
    }
  }

  static RemoveInterval (name: string): void {
    // eslint-disable-next-line @typescript-eslint/no-dynamic-delete -- Allow removing intervals
    delete this.intervals[name]
  }

  static ExecuteInterval (): void {
    this.deferred
      .filter(delay => delay.delayCycles <= 0)
      .forEach(delay => { delay.method() })
    Object.values(this.intervals)
      .forEach(delay => {
        if (delay.delayCycles <= 0) {
          delay.delayCycles = delay.intervalCycles
          delay.method()
        } else {
          delay.delayCycles--
        }
      })
    this.deferred = this.deferred
      .filter(method => method.delayCycles > 0).map(method => {
        method.delayCycles--
        return method
      })
  }

  static StartDeferred (): void {
    this.timer = setInterval((): void => { this.ExecuteInterval() }, this.cycleTime)
  }

  static StopDeferred (): void {
    if (this.timer != null) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- This is a timer, and the definition is different between the browser and node...
      clearInterval(this.timer as number)
      this.timer = undefined
    }
  }
}

export const Subscribe = PubSub.Subscribe.bind(PubSub)
export const Publish = PubSub.Publish.bind(PubSub)
export const Defer = PubSub.Defer.bind(PubSub)
export const AddInterval = PubSub.AddInterval.bind(PubSub)
export const RemoveInterval = PubSub.RemoveInterval.bind(PubSub)
