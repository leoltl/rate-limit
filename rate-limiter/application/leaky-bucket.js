const { TOO_MANY_REQUESTS } = require("http-status-codes");
const Limiter = require("../Limiter");

class Bucket extends Limiter {
  constructor(options={}) {
    super(options)
    this.queue = []
  }

  nextAvailableTime() {
    return new Date();
  }

  accessAllowed(req) {
    if (this.queue.length < this.initialRate) {
      this.enqueue(req);
      return true;
    }
    return false;
  }

  enqueue(req) {
    this.queue.push(req)
  }

  dequeue(req) {
    const idx = this.queue.indexOf(req);
    if (idx == -1) {
      console.error("Request not found")
    }
    this.queue.splice(idx, 1);
  }
}

module.exports = function makeLimiterMiddleware(limiterOptions) {
  const bucketSingleton = new Bucket(limiterOptions)
  return function leakylimiter(req, res, next) {
    console.log("Using leaky bucket strategy");
    if (bucketSingleton.accessAllowed(req)) {
      req.on('close', () => { 
        bucketSingleton.dequeue(req)
      })
      next();
    } else {
      res.status(TOO_MANY_REQUESTS).send(`Concurrent requests limit reached. Service will resume at ${bucketSingleton.nextAvailableTime()}.`)
    }
  }
}
