import { Pool } from "pg";
import { randomUUID } from "crypto";

interface MetricEvent {
  endpoint: string;
  method: string;
  statusCode: number;
  responseTimeMs: number;
  errorMessage?: string;
}

// Queue for batch inserts to reduce database overhead
let metricsQueue: MetricEvent[] = [];
const BATCH_SIZE = 10;
const BATCH_TIMEOUT = 5000; // 5 seconds
let batchTimer: NodeJS.Timeout | null = null;

/**
 * Record an API metric asynchronously
 * Batches inserts to reduce database overhead
 */
export async function recordMetric(
  pool: Pool,
  event: MetricEvent,
): Promise<void> {
  metricsQueue.push(event);

  // Flush immediately if batch is full
  if (metricsQueue.length >= BATCH_SIZE) {
    await flushMetrics(pool);
    return;
  }

  // Schedule flush if not already scheduled
  if (!batchTimer) {
    batchTimer = setTimeout(() => {
      flushMetrics(pool).catch((error) => {
        console.error("Failed to flush metrics:", error);
      });
    }, BATCH_TIMEOUT);
  }
}

/**
 * Flush queued metrics to database
 * Runs asynchronously without blocking response
 */
async function flushMetrics(pool: Pool): Promise<void> {
  if (metricsQueue.length === 0) {
    if (batchTimer) {
      clearTimeout(batchTimer);
      batchTimer = null;
    }
    return;
  }

  const batch = metricsQueue.splice(0, BATCH_SIZE);
  if (batchTimer) {
    clearTimeout(batchTimer);
    batchTimer = null;
  }

  // Fire and forget - don't wait for completion
  (async () => {
    const client = await pool.connect();
    try {
      for (const event of batch) {
        await client.query(
          `INSERT INTO api_metrics (id, endpoint, method, status_code, response_time_ms, error_message, recorded_at)
           VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
          [
            randomUUID(),
            event.endpoint,
            event.method,
            event.statusCode,
            event.responseTimeMs,
            event.errorMessage || null,
          ],
        );
      }
    } catch (error) {
      console.error("Failed to insert metrics batch:", error);
    } finally {
      client.release();
    }
  })();
}

/**
 * Middleware wrapper to measure response time
 * Usage: wrap your handler function
 * Example: export const handler = withMetrics(pool, myHandler, "/listings", "GET");
 */
export function withMetrics(
  pool: Pool,
  handler: (event: any) => Promise<any>,
  endpoint: string,
  method: string,
) {
  return async (event: any): Promise<any> => {
    const startTime = Date.now();

    try {
      const response = await handler(event);
      const statusCode = parseInt(response.statusCode || "200");
      const responseTimeMs = Date.now() - startTime;

      // Only track key endpoints to keep overhead light
      recordMetric(pool, {
        endpoint,
        method,
        statusCode,
        responseTimeMs,
      }).catch((error) => {
        console.debug("Metric recording failed:", error);
      });

      return response;
    } catch (error) {
      const responseTimeMs = Date.now() - startTime;
      recordMetric(pool, {
        endpoint,
        method,
        statusCode: 500,
        responseTimeMs,
        errorMessage:
          error instanceof Error ? error.message : "Unknown error",
      }).catch((error) => {
        console.debug("Metric recording failed:", error);
      });

      throw error;
    }
  };
}
