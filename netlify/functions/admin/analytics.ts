import { Handler } from "@netlify/functions";
import { pool } from "../db";
import { getUserIdFromAuth } from "../auth";

async function isAdmin(client: any, userId: string): Promise<boolean> {
  const result = await client.query("SELECT role FROM users WHERE id = $1", [
    userId,
  ]);
  return result.rows.length > 0 && result.rows[0].role === "admin";
}

export const handler: Handler = async (event) => {
  const method = event.httpMethod;
  const userId = await getUserIdFromAuth(event);

  if (!userId) {
    return {
      statusCode: 401,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Unauthorized" }),
    };
  }

  let path = event.path;
  if (path.startsWith("/api/admin")) {
    path = path.replace("/api/admin", "");
  } else if (path.startsWith("/.netlify/functions/admin/analytics")) {
    path = path.replace("/.netlify/functions/admin/analytics", "");
  }
  path = path || "/";

  const client = await pool.connect();

  try {
    // GET /api/admin/analytics/system-health
    if (method === "GET" && path === "/system-health") {
      if (!(await isAdmin(client, auth.userId))) {
        return {
          statusCode: 403,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ error: "Forbidden" }),
        };
      }

      const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

      // Total API requests
      const totalRequestsResult = await client.query(
        `SELECT COUNT(*) as count FROM api_metrics WHERE recorded_at >= $1`,
        [last24h],
      );

      // Failed requests
      const failedRequestsResult = await client.query(
        `SELECT COUNT(*) as count FROM api_metrics WHERE recorded_at >= $1 AND status_code >= 400`,
        [last24h],
      );

      // Average response time
      const avgResponseTimeResult = await client.query(
        `SELECT AVG(response_time_ms) as avg_time FROM api_metrics WHERE recorded_at >= $1 AND response_time_ms IS NOT NULL`,
        [last24h],
      );

      // Failed transactions
      const failedTransactionsResult = await client.query(
        `SELECT COUNT(*) as count FROM transactions WHERE status = 'cancelled' AND created_at >= $1`,
        [last24h],
      );

      const totalRequests = parseInt(totalRequestsResult.rows[0]?.count ?? 0);
      const failedRequests = parseInt(failedRequestsResult.rows[0]?.count ?? 0);
      const errorRate =
        totalRequests > 0
          ? ((failedRequests / totalRequests) * 100).toFixed(2)
          : "0.00";
      const avgResponseTime = Math.round(
        parseFloat(avgResponseTimeResult.rows[0]?.avg_time ?? 0),
      );
      const failedTransactions = parseInt(
        failedTransactionsResult.rows[0]?.count ?? 0,
      );

      // Uptime: assume 99.9% if no data
      const uptime =
        totalRequests > 0
          ? (100 - parseFloat(errorRate as string)).toFixed(2)
          : "99.90";

      return {
        statusCode: 200,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          uptime: parseFloat(uptime),
          errorRate: parseFloat(errorRate as string),
          avgResponseTime,
          failedTransactions,
        }),
      };
    }

    // GET /api/admin/analytics/live-users
    if (method === "GET" && path === "/live-users") {
      if (!(await isAdmin(client, auth.userId))) {
        return {
          statusCode: 403,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ error: "Forbidden" }),
        };
      }

      // Sessions active in last 5 minutes
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      const result = await client.query(
        `SELECT COUNT(*) as count FROM user_sessions WHERE is_active = true AND last_activity >= $1`,
        [fiveMinutesAgo],
      );

      return {
        statusCode: 200,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          activeUsers: parseInt(result.rows[0]?.count ?? 0),
        }),
      };
    }

    // GET /api/admin/analytics/bases-by-users?period=24h|7d|30d|90d|all
    if (method === "GET" && path === "/bases-by-users") {
      if (!(await isAdmin(client, auth.userId))) {
        return {
          statusCode: 403,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ error: "Forbidden" }),
        };
      }

      const period =
        new URLSearchParams(event.rawQueryString).get("period") || "7d";
      let dateFilter = "1=1";

      if (period === "24h") {
        dateFilter = `last_activity >= NOW() - INTERVAL '24 hours'`;
      } else if (period === "7d") {
        dateFilter = `last_activity >= NOW() - INTERVAL '7 days'`;
      } else if (period === "30d") {
        dateFilter = `last_activity >= NOW() - INTERVAL '30 days'`;
      } else if (period === "90d") {
        dateFilter = `last_activity >= NOW() - INTERVAL '90 days'`;
      }

      const result = await client.query(
        `SELECT b.name, COUNT(DISTINCT us.user_id) as count
         FROM user_sessions us
         JOIN bases b ON us.base_id = b.id
         WHERE us.is_active = true AND ${dateFilter}
         GROUP BY b.name, b.id
         ORDER BY count DESC
         LIMIT 5`,
      );

      return {
        statusCode: 200,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bases: result.rows.map((row: any) => ({
            name: row.name,
            count: parseInt(row.count),
          })),
        }),
      };
    }

    // GET /api/admin/analytics/bases-by-listings?period=24h|7d|30d|90d|all
    if (method === "GET" && path === "/bases-by-listings") {
      if (!(await isAdmin(client, auth.userId))) {
        return {
          statusCode: 403,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ error: "Forbidden" }),
        };
      }

      const period =
        new URLSearchParams(event.rawQueryString).get("period") || "7d";
      let dateFilter = "1=1";

      if (period === "24h") {
        dateFilter = `l.created_at >= NOW() - INTERVAL '24 hours'`;
      } else if (period === "7d") {
        dateFilter = `l.created_at >= NOW() - INTERVAL '7 days'`;
      } else if (period === "30d") {
        dateFilter = `l.created_at >= NOW() - INTERVAL '30 days'`;
      } else if (period === "90d") {
        dateFilter = `l.created_at >= NOW() - INTERVAL '90 days'`;
      }

      const result = await client.query(
        `SELECT b.name, COUNT(l.id) as count
         FROM listings l
         JOIN bases b ON l.base_id = b.id
         WHERE l.status = 'active' AND ${dateFilter}
         GROUP BY b.name, b.id
         ORDER BY count DESC
         LIMIT 5`,
      );

      return {
        statusCode: 200,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bases: result.rows.map((row: any) => ({
            name: row.name,
            count: parseInt(row.count),
          })),
        }),
      };
    }

    // GET /api/admin/analytics/bases-by-signups?period=24h|7d|30d|90d|all
    if (method === "GET" && path === "/bases-by-signups") {
      if (!(await isAdmin(client, auth.userId))) {
        return {
          statusCode: 403,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ error: "Forbidden" }),
        };
      }

      const period =
        new URLSearchParams(event.rawQueryString).get("period") || "7d";
      let dateFilter = "1=1";

      if (period === "24h") {
        dateFilter = `u.created_at >= NOW() - INTERVAL '24 hours'`;
      } else if (period === "7d") {
        dateFilter = `u.created_at >= NOW() - INTERVAL '7 days'`;
      } else if (period === "30d") {
        dateFilter = `u.created_at >= NOW() - INTERVAL '30 days'`;
      } else if (period === "90d") {
        dateFilter = `u.created_at >= NOW() - INTERVAL '90 days'`;
      }

      const result = await client.query(
        `SELECT b.name, COUNT(u.id) as count
         FROM users u
         JOIN bases b ON u.base_id = b.id
         WHERE ${dateFilter}
         GROUP BY b.name, b.id
         ORDER BY count DESC
         LIMIT 5`,
      );

      return {
        statusCode: 200,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bases: result.rows.map((row: any) => ({
            name: row.name,
            count: parseInt(row.count),
          })),
        }),
      };
    }

    // GET /api/admin/analytics/moderation
    if (method === "GET" && path === "/moderation") {
      if (!(await isAdmin(client, auth.userId))) {
        return {
          statusCode: 403,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ error: "Forbidden" }),
        };
      }

      const openReportsResult = await client.query(
        `SELECT COUNT(*) as count FROM reports WHERE status = 'open'`,
      );

      const flaggedThreadsResult = await client.query(
        `SELECT COUNT(*) as count FROM audit_logs WHERE action LIKE '%flagged%'`,
      );

      const pendingVerificationsResult = await client.query(
        `SELECT COUNT(*) as count FROM verifications WHERE status = 'pending'`,
      );

      return {
        statusCode: 200,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          openReports: parseInt(openReportsResult.rows[0]?.count ?? 0),
          flaggedContent: parseInt(flaggedThreadsResult.rows[0]?.count ?? 0),
          pendingVerifications: parseInt(
            pendingVerificationsResult.rows[0]?.count ?? 0,
          ),
        }),
      };
    }

    // GET /api/admin/analytics/revenue?period=24h|7d|30d|90d|all
    if (method === "GET" && path === "/revenue") {
      if (!(await isAdmin(client, auth.userId))) {
        return {
          statusCode: 403,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ error: "Forbidden" }),
        };
      }

      const period =
        new URLSearchParams(event.rawQueryString).get("period") || "24h";
      let dateFilter = "1=1";

      if (period === "24h") {
        dateFilter = `tm.created_at >= NOW() - INTERVAL '24 hours'`;
      } else if (period === "7d") {
        dateFilter = `tm.created_at >= NOW() - INTERVAL '7 days'`;
      } else if (period === "30d") {
        dateFilter = `tm.created_at >= NOW() - INTERVAL '30 days'`;
      } else if (period === "90d") {
        dateFilter = `tm.created_at >= NOW() - INTERVAL '90 days'`;
      }

      const totalResult = await client.query(
        `SELECT COALESCE(SUM(amount), 0) as total FROM transaction_metrics WHERE ${dateFilter}`,
      );

      const completedCount = await client.query(
        `SELECT COUNT(*) as count FROM transactions WHERE status = 'completed' AND completed_at >= NOW() - INTERVAL '24 hours'`,
      );

      return {
        statusCode: 200,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          totalRevenue: parseFloat(totalResult.rows[0]?.total ?? 0),
          completedTransactions: parseInt(completedCount.rows[0]?.count ?? 0),
        }),
      };
    }

    // GET /api/admin/analytics/peak-activity
    if (method === "GET" && path === "/peak-activity") {
      if (!(await isAdmin(client, auth.userId))) {
        return {
          statusCode: 403,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ error: "Forbidden" }),
        };
      }

      const peakHourResult = await client.query(
        `SELECT EXTRACT(HOUR FROM last_activity)::int as hour, COUNT(*) as count
         FROM user_sessions
         WHERE last_activity >= NOW() - INTERVAL '24 hours'
         GROUP BY hour
         ORDER BY count DESC
         LIMIT 1`,
      );

      const peakDayResult = await client.query(
        `SELECT TO_CHAR(last_activity, 'Day') as day, COUNT(*) as count
         FROM user_sessions
         WHERE last_activity >= NOW() - INTERVAL '7 days'
         GROUP BY TO_CHAR(last_activity, 'Day')
         ORDER BY count DESC
         LIMIT 1`,
      );

      return {
        statusCode: 200,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          peakHour: peakHourResult.rows[0]?.hour ?? null,
          peakDay: peakDayResult.rows[0]?.day ?? null,
        }),
      };
    }

    // GET /api/admin/analytics/retention
    if (method === "GET" && path === "/retention") {
      if (!(await isAdmin(client, auth.userId))) {
        return {
          statusCode: 403,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ error: "Forbidden" }),
        };
      }

      const thirtyDaysAgo = new Date(
        Date.now() - 30 * 24 * 60 * 60 * 1000,
      ).toISOString();

      // Users created 30+ days ago
      const totalUsersOldResult = await client.query(
        `SELECT COUNT(*) as count FROM users WHERE created_at < $1`,
        [thirtyDaysAgo],
      );

      // Users created 30+ days ago who had activity in last 7 days
      const activeOldUsersResult = await client.query(
        `SELECT COUNT(DISTINCT u.id) as count
         FROM users u
         JOIN user_sessions us ON u.id = us.user_id
         WHERE u.created_at < $1 AND us.last_activity >= NOW() - INTERVAL '7 days'`,
        [thirtyDaysAgo],
      );

      const totalOld = parseInt(totalUsersOldResult.rows[0]?.count ?? 0);
      const activeOld = parseInt(activeOldUsersResult.rows[0]?.count ?? 0);
      const retention =
        totalOld > 0 ? ((activeOld / totalOld) * 100).toFixed(2) : "0.00";

      return {
        statusCode: 200,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          retentionRate: parseFloat(retention),
          retainingUsers: activeOld,
          totalEligible: totalOld,
        }),
      };
    }

    return {
      statusCode: 404,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Endpoint not found" }),
    };
  } catch (error) {
    console.error("Analytics endpoint error:", error);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Internal server error" }),
    };
  } finally {
    client.release();
  }
};
