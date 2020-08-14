const { TOO_MANY_REQUESTS } = require("http-status-codes");
const DEFAULT_RATE = 5;

class Bucket {
  constructor(options={}) {
    this.rate = options.rate || DEFAULT_RATE;
  }

  accessAllowed() {
    if ( this.rate > 0) {
      this.enqueue();
      return true;
    }
    return false;
  }

  enqueue() {
    this.rate--;
  }

  dequeue() {
    this.rate++;
  }
}

module.exports = function makeLimiterMiddleware(limiterOptions) {
  const bucketSingleton = new Bucket(limiterOptions)
  return function leakylimiter(req, res, next) {
    console.log("Using leaky bucket strategy");
    if (bucketSingleton.accessAllowed()) {
      req.on('close', () => { 
        bucketSingleton.dequeue()
      })
      next();
    } else {
      res.status(TOO_MANY_REQUESTS).send(`Rate limit reached. Please try again shortly.`)
    }
  }
}
