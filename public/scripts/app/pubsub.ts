'use sanity'

export interface SubscriberFunction {
  (recievedData: any): void;
}

const topics: {[key: string]: SubscriberFunction[]} = {}

export const Subscribe = (topic: string, subscriber: SubscriberFunction): void => {
  topics[topic] = topics[topic] || []
  topics[topic]?.push(subscriber)
}

export const Publish = (topic: string, data?: any): void => {
  const subscribers = Object.keys(topics)
    .filter(key => key.toUpperCase() === topic.toUpperCase() ||
      topic.toUpperCase().indexOf(`${key.toUpperCase()}:`) === 0)
    .flatMap(key => topics[key])
     // FIXME: Why must typehint here? `undefined` can't survive the filter.
    .filter(fn => !!fn) as SubscriberFunction[]
  if (subscribers.length) {
    for (const subscriber of subscribers) {
      subscriber(data)
    }
  } else {
    console.warn(`PUBSUB: topic ${topic} published without subscribers`, data)
  }
}

interface VoidMethod {
  (): void
}

interface DeferredMethod {
  call: VoidMethod,
  delayCycles: number
}

const cycletime = 100
let deferred: DeferredMethod[] = []

export const Defer = (method: VoidMethod, delayMs: number): void => {
  deferred.push({
    call: method,
    delayCycles: Math.ceil(delayMs / cycletime)
  })
  console.log(deferred)
}
setInterval((): void => {
  deferred.filter(method => method.delayCycles <= 0).forEach(method => method.call())
  deferred = deferred.filter(method => method.delayCycles > 0).map(method => {
    method.delayCycles--
    return method
  })
}, cycletime)
