'use sanity'

const topics = {}
const filteredTopics = {}
const subscribe = (topic, subtopic, subscriber) => {
  if (subscriber) {
    if (!filteredTopics[topic]) {
      filteredTopics[topic] = {}
    }
    if (!filteredTopics[topic][subtopic]) {
      filteredTopics[topic][subtopic] = []
    }
    filteredTopics[topic][subtopic].push(subscriber)
  } else {
    subscriber = subtopic
    if (!topics[topic]) {
      topics[topic] = []
    }
    topics[topic].push(subscriber)
  }
}

const publish = (topic, data) => {
  const getKey = (list, key) =>
    Object.keys(list).filter(k => k.toUpperCase() === `${key}`.toUpperCase())[0]
  const results = []
  const subscribers = topics[topic] || []
  const filterKey = getKey(filteredTopics, topic)
  if (filterKey) {
    const subkey = getKey(filteredTopics[filterKey], data)
    for (const sub of (filteredTopics[filterKey][subkey] || [])) {
      subscribers.push(sub)
    }
  }
  if (subscribers.length) {
    for (const subscriber of subscribers) {
      results.push(subscriber(data, topic))
    }
  } else {
    console.warn(`PUBSUB: topic ${topic} published without subscribers`, data)
  }
  return results
}

let deferred = []
const cycleTime = 100

const defer = (fn, ms) => {
  deferred.push({
    fn,
    delay: Math.ceil(ms / cycleTime)
  })
}
setInterval(() => {
  deferred.filter(o => o.delay <= 1).forEach(o => o.fn())
  deferred = deferred.filter(o => o.delay > 1)
  deferred.forEach(o => {
    o.delay -= 1
  })
}, cycleTime)

module.exports = {
  subscribe,
  publish,
  defer
}
