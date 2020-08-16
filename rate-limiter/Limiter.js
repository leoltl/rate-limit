const DEFAULT_RATE = process.env.DEFAULT_RATE || 2;

class Limiter {
  constructor(options) {
    this.initialRate = options.rate || DEFAULT_RATE;
  }

  accessAllowed() {
    // TODO implement accessAllowed in sub classes
    return 
  }

  nextAvailableTime() {
    // TODO implement nextAvailableTime in sub classes
    return
  }
}

module.exports = Limiter