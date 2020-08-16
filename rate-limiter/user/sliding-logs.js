const { TOO_MANY_REQUESTS } = require("http-status-codes");
const Limiter = require("../Limiter")
const DEFAULT_INTERVAL = 5;

class SlidingLogs extends Limiter {
  constructor(options={}) {
    super(options);
    this.interval = options.intervalInMS || (DEFAULT_INTERVAL * 1000);
    this.userLimit = options.userLimitStorage || new Map();
  }

  nextAvailableTime(user) {
    let earliestAccess = new Date(this._getOrCreateUserUsage(user.id)[0]).valueOf()
    return new Date(earliestAccess + this.interval)
  }

  _getOrCreateUserUsage(userKey) {
    if (!this.userLimit.has(userKey)) {
      this.userLimit.set(userKey, [])
    }
    return this.userLimit.get(userKey)
  }

  _getUserUsage(userKey, afterThan) {
    return this._getOrCreateUserUsage(userKey).filter(
      use => use >= afterThan
    )
  }

  cleanUp(userKey, afterThan) {
    const pastRemoved = this._getOrCreateUserUsage(userKey).filter(
      use => use >= afterThan
    );
    this.userLimit.set(userKey, pastRemoved);
  }
  
  recordUsage(userKey, currentTime) {
    this._getOrCreateUserUsage(userKey).push(currentTime);
  }

  hasQuotaRemains(userKey, afterThan) {
    const userUsage = this._getUserUsage(userKey, afterThan).length;
    return (userUsage <= this.initialRate - 1)
  }

  accessAllowed(user=null) {
    let allowed = true;
    const currentTime = new Date();
    const afterThan = new Date(currentTime - this.interval);
    if (user.id) {
      if (!this.hasQuotaRemains(user.id, afterThan)) {
        allowed = false
      }
      this.cleanUp(user.id, afterThan)
      this.recordUsage(user.id, currentTime)
    }
    return allowed
  }
}

module.exports = function makeLimiterMiddleware(limiterOptions) {
  const slidingLogsSingleton = new SlidingLogs(limiterOptions);
  return function tokenlimiter(req, res, next) {
    console.log("Using sliding logs strategy");
    if (slidingLogsSingleton.accessAllowed(req.locals.user)) {
      next()
    } else {
      res.status(TOO_MANY_REQUESTS).send(
        `Rate limit reached. Service will resume at ${slidingLogsSingleton.nextAvailableTime(req.locals.user)}`);
    }
  }
}
