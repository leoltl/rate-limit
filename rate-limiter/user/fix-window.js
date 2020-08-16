const { TOO_MANY_REQUESTS } = require("http-status-codes");
const Limiter =  require("../Limiter");
const DEFAULT_INTERVAL = 5;

class FixWindow extends Limiter {

  constructor(options={}) {
    super(options);
    this.interval = options.intervalInMS || DEFAULT_INTERVAL * 1000;
    this.userLimit = options.userLimitStorage || new Map();
  }

  cleanUp(userKey, currentInterval) {
    const userUsage = this.userLimit.get(userKey);
    userUsage.forEach((_, key, map) => {
      if (key != currentInterval) {
        map.delete(key);
      }
    })
  }

  _getOrCreateUserUsage(userUsage, currentInterval) {
    if (!userUsage.has(currentInterval)) {
      userUsage.set(currentInterval, [])
    }
    return userUsage.get(currentInterval);
  }

  _getOrCreateUser(userKey) {
    if (!this.userLimit.has(userKey)) {
      this.userLimit.set(userKey, new Map())
    }
    return this.userLimit.get(userKey);
  }

  _getUserUsage(userKey, currentInterval) {
    const user = this._getOrCreateUser(userKey)
    return this._getOrCreateUserUsage(user, currentInterval)
  }

  recordUsage(userKey, currentInterval) {
    const userUsage = this._getUserUsage(userKey, currentInterval)
    userUsage.push(new Date())
  }

  hasQuotaRemains(userKey, currentInterval) {
    if ((this._getUserUsage(userKey, currentInterval).length) > this.initialRate - 1) {
      this.recordUsage(userKey, currentInterval)
      return false
    }
    return true
  }

  nextAvailableTime(user) {
    const latestInterval = this._getOrCreateUser(user.id).keys().next().value
    console.log('request Time', new Date().toLocaleString())
    console.log('current Interval', new Date(latestInterval * this.interval).toLocaleString())
    return new Date(latestInterval * this.interval + this.interval)  
  }

  _getCurrentInterval() {
    return parseInt((new Date() / this.interval), 10)
  }

  accessAllowed(user=null) {
    if (user.id) {
      const currentInterval = this._getCurrentInterval()
      if (!this.hasQuotaRemains(user.id, currentInterval)) {
        this.cleanUp(user.id, currentInterval)
        return false
      }
      this.recordUsage(user.id, currentInterval)
      this.cleanUp(user.id, currentInterval)
    }
    return true
  }

}

module.exports = function makeLimiterMiddleware(limiterOptions) {
  const fixWindowSingleton = new FixWindow(limiterOptions)
  return function tokenlimiter(req, res, next) {
    console.log("Using fixed window strategy");
    if (fixWindowSingleton.accessAllowed(req.locals.user)) {
      next()
    } else {
      res.status(TOO_MANY_REQUESTS).send(`Rate limit reached. Service will resume at ${fixWindowSingleton.nextAvailableTime(req.locals.user)}`)
    }
  }
}