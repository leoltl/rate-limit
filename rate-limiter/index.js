const makeTokenBucket = require("./user/token-bucket");
const makeLeakyBucket = require("./application/leaky-bucket");

function makeDynamicMiddlewares() {
  const limiters = {
    tokenBucketLimiter: makeTokenBucket(),
    leakyBucketLimiter: makeLeakyBucket()
  }
  
  let limiter = [limiters.tokenBucketLimiter]
  
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
  makeDynamicMiddlewares
};