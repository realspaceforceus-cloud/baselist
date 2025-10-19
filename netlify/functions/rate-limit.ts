import { pool } from "./db";

export interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Max requests per window
  key: string; // Unique key for this limit
}

// In-memory store for rate limiting (for development/single-instance)
// In production, use a database or Redis
const rateLimitStore = new Map<
  string,
  {
    count: number;
    resetTime: number;
  }
>();

/**
 * Check if a request should be rate limited
 */
export const checkRateLimit = async (
  config: RateLimitConfig,
  identifier: string,
): Promise<{
  allowed: boolean;
  remaining: number;
  resetTime: number;
}> => {
  const fullKey = `${config.key}:${identifier}`;
  const now = Date.now();

  let record = rateLimitStore.get(fullKey);

  // Initialize or reset if window has expired
  if (!record || now >= record.resetTime) {
    record = {
      count: 0,
      resetTime: now + config.windowMs,
    };
    rateLimitStore.set(fullKey, record);
  }

  const allowed = record.count < config.maxRequests;
  const remaining = Math.max(0, config.maxRequests - record.count - 1);

  // Increment count
  record.count++;

  return {
    allowed,
    remaining,
    resetTime: record.resetTime,
  };
};

/**
 * Log potential abuse activity
 */
export const logAbuseEvent = async (
  eventType: string,
  identifier: string, // IP address, email, user ID, etc.
  details: Record<string, unknown>,
): Promise<void> => {
  const client = await pool.connect();

  try {
    await client.query(
      `INSERT INTO abuse_log (event_type, identifier, details, created_at)
       VALUES ($1, $2, $3, now())`,
      [eventType, identifier, JSON.stringify(details)],
    );
  } catch (error) {
    console.error("Failed to log abuse event:", error);
  } finally {
    client.release();
  }
};

/**
 * Check if an identifier has exceeded abuse thresholds
 */
export const checkAbuseStatus = async (
  identifier: string,
  timeWindowMs: number = 3600000, // 1 hour
): Promise<{
  abused: boolean;
  eventCount: number;
  events: Array<{ eventType: string; count: number }>;
}> => {
  const client = await pool.connect();

  try {
    const result = await client.query(
      `SELECT event_type, COUNT(*) as count
       FROM abuse_log
       WHERE identifier = $1 AND created_at > now() - interval '1 hour'
       GROUP BY event_type
       ORDER BY count DESC`,
      [identifier],
    );

    const events = result.rows.map((row) => ({
      eventType: row.event_type,
      count: parseInt(row.count, 10),
    }));

    const totalEvents = events.reduce((sum, e) => sum + e.count, 0);

    // Consider abused if more than 50 events in the window
    const abused = totalEvents > 50;

    return {
      abused,
      eventCount: totalEvents,
      events,
    };
  } catch (error) {
    console.error("Failed to check abuse status:", error);
    return {
      abused: false,
      eventCount: 0,
      events: [],
    };
  } finally {
    client.release();
  }
};

/**
 * Clean up rate limit store (call periodically)
 */
export const cleanupRateLimitStore = (): void => {
  const now = Date.now();
  let cleaned = 0;

  for (const [key, record] of rateLimitStore.entries()) {
    if (now >= record.resetTime) {
      rateLimitStore.delete(key);
      cleaned++;
    }
  }

  if (cleaned > 0) {
    console.log(`[RATE LIMIT] Cleaned up ${cleaned} expired records`);
  }
};

// Run cleanup every 5 minutes
if (typeof global !== "undefined") {
  setInterval(() => {
    cleanupRateLimitStore();
  }, 5 * 60 * 1000);
}
