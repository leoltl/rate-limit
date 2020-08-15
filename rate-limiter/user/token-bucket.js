const { TOO_MANY_REQUESTS } = require("http-status-codes");
const Limiter = require("../Limiter")
const DEFAULT_INTERVAL = 5;

class Bucket extends Limiter {
  
  constructor(options={}) {
    super(options)
    this.interval = options.intervalInMS || DEFAULT_INTERVAL * 1000;
    this.userLimit = options.userLimitStorage || new Map();
  }

  nextAvailableTime(user) {
    return new Date(this.userLimit.get(user.id)[1] + this.interval);
  }

  reset(userKey) {
    this.userLimit.set(userKey, [this.initialRate, Date.now()])
  }

  resetIfExpired(userKey) {
    const [_, lastInterval] = this.userLimit.get(userKey)
    const hasExpired = Date.now() - lastInterval > this.interval
    if (hasExpired) {
      this.reset(userKey)
    }
  }

  checkReset(userKey) {
    if (!this.userLimit.has(userKey)) {
      return this.reset(userKey)
    }
    this.resetIfExpired(userKey)
  }

  accessAllowed(user=null) {
    if (user.id) {
      this.checkReset(user.id);
      const [rateRemain, lastInterval] = this.userLimit.get(user.id);
      if (rateRemain == 0) return false;
      this.userLimit.set(user.id, [rateRemain - 1, lastInterval]);
    }
    return true;
  }

}

module.exports = function makeLimiterMiddleware(limiterOptions) {
  const bucketSingleton = new Bucket(limiterOptions)
  return function tokenlimiter(req, res, next) {
    console.log("Using token bucket strategy");
    if (bucketSingleton.accessAllowed(req.locals.user)) {
      next()
    } else {
      res.status(TOO_MANY_REQUESTS).send(`Rate limit reached. Service will resume at ${bucketSingleton.nextAvailableTime(req.locals.user)}`)
    }
  }
}
