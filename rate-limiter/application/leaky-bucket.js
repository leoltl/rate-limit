const { TOO_MANY_REQUESTS } = require("http-status-codes");
const DEFAULT_RATE = 2;

class Bucket {
  constructor(options={}) {
    this.rate = options.rate || DEFAULT_RATE;
    this.queue = []
  }

  accessAllowed(req) {
    if (this.queue.length < this.rate) {
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
    this.queue.splice(idx, 1);
  }
}

module.exports = function makeLimiterMiddleware(limiterOptions) {
  const bucketSingleton = new Bucket(limiterOptions)
  return function leakylimiter(req, res, next) {
    console.log("Using leaky bucket strategy");
    if (bucketSingleton.accessAllowed(req)) {
      req.on('close', () => { 
        bucketSingleton.dequeue()
      })
      next();
    } else {
      res.status(TOO_MANY_REQUESTS).send(`Concurrent request limit reached. Please try again shortly.`)
    }
  }
}
