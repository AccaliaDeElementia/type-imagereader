'use sanity'

export interface SubscriberFunction {
  (recievedData: any, actualTopic?: string): void;
}

export interface VoidMethod {
  (): void
}

interface DeferredMethod {
  method: VoidMethod,
  delayCycles: number
}

export class PubSub {
  protected static subscribers: {[key: string]: SubscriberFunction[]} = {}
  protected static deferred: DeferredMethod[] = []
  protected static timer: any // it's NodeJS.Timer or number depending on browser or tests
  protected static cycleTime: number = 100
  static Subscribe (topic: string, subscriber: SubscriberFunction): void {
    topic = topic.toUpperCase()
    const subs = this.subscribers[topic]
    if (!subs) {
      this.subscribers[topic] = [subscriber]
    } else {
      subs.push(subscriber)
    }
  }

  static Publish (topic:string, data?: any): void {
    const searchTopic = topic.toUpperCase()
    const matchingTopics = Object.keys(this.subscribers)
      .sort()
      .filter(key => key === searchTopic ||
        searchTopic.indexOf(`${key}:`) === 0)
    if (!matchingTopics.length) {
      window.console.warn(`PUBSUB: topic ${topic} published without subscribers`, data)
    } else {
      for (const key of matchingTopics) {
        const subscribers = this.subscribers[key]
        if (!subscribers?.length) {
          window.console.warn(`PUBSUB: topic ${key} registered without subscribers!`)
        } else {
          subscribers.forEach(subscriber => subscriber(data, searchTopic))
        }
      }
    }
  }

  static Defer (method: VoidMethod, delayMs: number) :void {
    this.deferred.push({
      method,
      delayCycles: Math.max(Math.ceil(delayMs / this.cycleTime), 1)
    })
  }

  static StartDeferred (): void {
    this.timer = setInterval((): void => {
      this.deferred
        .filter(delay => delay.delayCycles <= 0)
        .forEach(delay => delay.method())
      this.deferred = this.deferred
        .filter(method => method.delayCycles > 0).map(method => {
          method.delayCycles--
          return method
        })
    }, this.cycleTime)
  }

  static StopDeferred (): void {
    if (this.timer) {
      clearInterval(this.timer)
      this.timer = undefined
    }
  }
}

export const Subscribe = PubSub.Subscribe.bind(PubSub)
export const Publish = PubSub.Publish.bind(PubSub)
export const Defer = PubSub.Defer.bind(PubSub)
