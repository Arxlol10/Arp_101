// In-memory sliding-window rate limiter. Good enough for a single process;
// swap for Redis if you run more than one instance.

class RateLimiter {
  constructor({ limit, windowMs }) {
    this.limit = limit;
    this.windowMs = windowMs;
    this.hits = new Map();
  }

  // Records a hit for `key` and returns true if it is within the limit.
  take(key, now = Date.now()) {
    const cutoff = now - this.windowMs;
    const list = (this.hits.get(key) || []).filter((t) => t > cutoff);
    if (list.length >= this.limit) {
      this.hits.set(key, list);
      return false;
    }
    list.push(now);
    this.hits.set(key, list);
    if (this.hits.size > 10000) this.sweep(now);
    return true;
  }

  sweep(now = Date.now()) {
    const cutoff = now - this.windowMs;
    for (const [key, list] of this.hits) {
      if (!list.some((t) => t > cutoff)) this.hits.delete(key);
    }
  }
}

module.exports = { RateLimiter };
