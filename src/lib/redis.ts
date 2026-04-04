/**
 * Redis Client for Rate Limiting
 * 
 * Uses Upstash Redis for serverless-friendly Redis.
 * Falls back to database-backed rate limiting if Redis is not configured.
 * 
 * Setup:
 * 1. Create a Redis database at https://upstash.com
 * 2. Add UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN to your .env
 * 3. Rate limiting will automatically use Redis
 */

// Check if Redis is configured
const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN

export const isRedisConfigured = !!(REDIS_URL && REDIS_TOKEN)

// Redis commands using REST API (serverless-friendly)
interface RedisResponse {
  result: string | number | null
  error?: string
}

async function redisCommand(command: string[]): Promise<RedisResponse> {
  if (!REDIS_URL || !REDIS_TOKEN) {
    throw new Error('Redis not configured')
  }

  const response = await fetch(`${REDIS_URL}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${REDIS_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(command),
  })

  if (!response.ok) {
    throw new Error(`Redis error: ${response.status}`)
  }

  return response.json()
}

/**
 * Redis-based rate limiter
 * 
 * Uses sliding window algorithm for accurate rate limiting
 */
export const redisRateLimiter = {
  /**
   * Check if an identifier is rate limited
   */
  async isRateLimited(
    key: string,
    maxRequests: number,
    windowSeconds: number
  ): Promise<{ limited: boolean; remaining: number; resetIn: number }> {
    if (!isRedisConfigured) {
      // Return not limited if Redis not configured (fallback to database)
      return { limited: false, remaining: maxRequests, resetIn: windowSeconds }
    }

    try {
      const now = Date.now()
      const windowStart = now - (windowSeconds * 1000)
      
      // Remove old entries and count current
      const commands = [
        ['ZREMRANGEBYSCORE', key, '0', windowStart.toString()],
        ['ZCARD', key],
        ['ZADD', key, now.toString(), `${now}-${Math.random()}`],
        ['EXPIRE', key, windowSeconds.toString()],
      ]

      // Execute commands
      for (const cmd of commands.slice(0, 2)) {
        await redisCommand(cmd)
      }

      const countResponse = await redisCommand(commands[1])
      const count = (countResponse.result as number) || 0

      // Add current request
      await redisCommand(commands[2])
      await redisCommand(commands[3])

      const remaining = Math.max(0, maxRequests - count - 1)
      const limited = count >= maxRequests
      const resetIn = windowSeconds

      return { limited, remaining, resetIn }
    } catch (error) {
      console.error('Redis rate limit error:', error)
      // Fail open - don't rate limit on Redis errors
      return { limited: false, remaining: maxRequests, resetIn: windowSeconds }
    }
  },

  /**
   * Record a failed attempt and check if blocked
   */
  async recordFailedAttempt(
    key: string,
    maxAttempts: number,
    blockSeconds: number
  ): Promise<{ blocked: boolean; attempts: number; resetIn: number }> {
    if (!isRedisConfigured) {
      return { blocked: false, attempts: 1, resetIn: blockSeconds }
    }

    try {
      const attemptsKey = `attempts:${key}`
      const blockedKey = `blocked:${key}`

      // Check if already blocked
      const blockedResponse = await redisCommand(['GET', blockedKey])
      if (blockedResponse.result) {
        const ttlResponse = await redisCommand(['TTL', blockedKey])
        return { 
          blocked: true, 
          attempts: maxAttempts, 
          resetIn: (ttlResponse.result as number) || blockSeconds 
        }
      }

      // Increment attempts
      const incrResponse = await redisCommand(['INCR', attemptsKey])
      const attempts = (incrResponse.result as number) || 1

      // Set expiry on first attempt
      if (attempts === 1) {
        await redisCommand(['EXPIRE', attemptsKey, '900']) // 15 minutes
      }

      // Block if max attempts reached
      if (attempts >= maxAttempts) {
        await redisCommand(['SET', blockedKey, '1', 'EX', blockSeconds.toString()])
        return { blocked: true, attempts, resetIn: blockSeconds }
      }

      const ttlResponse = await redisCommand(['TTL', attemptsKey])
      return { 
        blocked: false, 
        attempts, 
        resetIn: (ttlResponse.result as number) || 900 
      }
    } catch (error) {
      console.error('Redis record attempt error:', error)
      return { blocked: false, attempts: 1, resetIn: blockSeconds }
    }
  },

  /**
   * Clear failed attempts after successful login
   */
  async clearAttempts(key: string): Promise<void> {
    if (!isRedisConfigured) return

    try {
      await redisCommand(['DEL', `attempts:${key}`])
      await redisCommand(['DEL', `blocked:${key}`])
    } catch (error) {
      console.error('Redis clear attempts error:', error)
    }
  },

  /**
   * Check if an identifier is blocked
   */
  async isBlocked(key: string): Promise<{ blocked: boolean; remainingTime: number }> {
    if (!isRedisConfigured) {
      return { blocked: false, remainingTime: 0 }
    }

    try {
      const blockedKey = `blocked:${key}`
      const response = await redisCommand(['GET', blockedKey])
      
      if (response.result) {
        const ttlResponse = await redisCommand(['TTL', blockedKey])
        return { 
          blocked: true, 
          remainingTime: (ttlResponse.result as number) || 0 
        }
      }

      return { blocked: false, remainingTime: 0 }
    } catch (error) {
      console.error('Redis check blocked error:', error)
      return { blocked: false, remainingTime: 0 }
    }
  },
}

export default redisRateLimiter
