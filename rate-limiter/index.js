const makeTokenBucket = require("./user/token-bucket");
const makeLeakyBucket = require("./application/leaky-bucket");
const makeFixWindow = require("./user/fix-window");

function makeDynamicLimiter() {
  const limiters = {
    tokenBucketLimiter: makeTokenBucket(),
    leakyBucketLimiter: makeLeakyBucket(),
    fixWindowLimiter: makeFixWindow({
      intervalInMS: 30000
    }),
  }
  
  let limiter = [limiters.fixWindowLimiter]
  
  function changeMiddleware(middlewareName) {
    limiter.splice(0, 1 ,limiters[middlewareName])
  }

  function dynamiceMiddlewares(req, res, next) {
    limiter.forEach(handler => handler(req, res, next));
  }
  return [dynamiceMiddlewares, changeMiddleware]
}

module.exports = {
  makeTokenBucket,
  makeLeakyBucket,
  makeDynamicLimiter
};