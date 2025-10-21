import { Handler } from "@netlify/functions";
import { pool } from "./db";
import { randomUUID } from "crypto";
import { getUserIdFromAuth } from "./auth";

const transformFeedPost = (row: any) => {
  let pollOptions = undefined;
  let eventData = undefined;

  if (row.poll_options) {
    pollOptions = typeof row.poll_options === 'string'
      ? JSON.parse(row.poll_options)
      : row.poll_options;
  }

  if (row.event_data) {
    eventData = typeof row.event_data === 'string'
      ? JSON.parse(row.event_data)
      : row.event_data;
  }

  return {
    id: row.id,
    userId: row.user_id,
    baseId: row.base_id,
    postType: row.post_type,
    content: row.content,
    imageUrls: Array.isArray(row.image_urls) ? row.image_urls : [],
    pollOptions: pollOptions,
    pollVotes: row.poll_votes || undefined,
    eventData: eventData,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    likes: row.likes || 0,
    comments: row.comments || 0,
  };
};

const transformAnnouncement = (row: any) => ({
  id: row.id,
  baseId: row.base_id,
  title: row.title,
  content: row.content,
  imageUrl: row.image_url || undefined,
  isSticky: row.is_sticky,
  isDismissible: row.is_dismissible,
  dismissedBy: Array.isArray(row.dismissed_by) ? row.dismissed_by : [],
  createdBy: row.created_by,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export const handler: Handler = async (event) => {
  const method = event.httpMethod;
  const path = event.path.replace("/.netlify/functions/feed", "");

  try {
    // POST /feed/admin/announcements (admin only)
    if (method === "POST" && path === "/admin/announcements") {
      const userId = await getUserIdFromAuth(event);
      if (!userId) {
        return {
          statusCode: 401,
          body: JSON.stringify({ error: "Unauthorized" }),
        };
      }

      const client = await pool.connect();
      try {
        // Check if user is admin
        const userResult = await client.query(
          "SELECT role FROM users WHERE id = $1",
          [userId],
        );

        if (
          !userResult.rows.length ||
          !["admin", "moderator"].includes(userResult.rows[0].role)
        ) {
          return {
            statusCode: 403,
            body: JSON.stringify({
              error: "Only admins can create announcements",
            }),
          };
        }

        const { baseId, title, content, imageUrl, isSticky, isDismissible } =
          JSON.parse(event.body || "{}");

        if (!baseId || !title || !content) {
          return {
            statusCode: 400,
            body: JSON.stringify({ error: "Missing required fields" }),
          };
        }

        const announcementId = randomUUID();
        const result = await client.query(
          `INSERT INTO feed_announcements (id, base_id, title, content, image_url, is_sticky, is_dismissible, created_by, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
           RETURNING *`,
          [
            announcementId,
            baseId,
            title,
            content,
            imageUrl || null,
            isSticky || false,
            isDismissible !== false,
            userId,
          ],
        );

        return {
          statusCode: 201,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(transformAnnouncement(result.rows[0])),
        };
      } finally {
        client.release();
      }
    }

    // GET /feed/posts?baseId=xxx&limit=20&offset=0
    if (method === "GET" && path === "/posts") {
      const userId = await getUserIdFromAuth(event);
      const params = new URLSearchParams(event.rawQuery || "");
      const baseId = params.get("baseId");
      const limit = Math.min(parseInt(params.get("limit") || "20"), 100);
      const offset = parseInt(params.get("offset") || "0");

      if (!baseId) {
        return {
          statusCode: 400,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ error: "baseId is required" }),
        };
      }

      const client = await pool.connect();
      try {
        const result = await client.query(
          `SELECT fp.*,
            (SELECT COUNT(*) FROM feed_engagement WHERE post_id = fp.id AND engagement_type = 'like' AND deleted_at IS NULL) as likes,
            (SELECT COUNT(*) FROM feed_engagement WHERE post_id = fp.id AND engagement_type = 'comment' AND deleted_at IS NULL) as comments
           FROM feed_posts fp
           WHERE fp.base_id = $1 AND fp.deleted_at IS NULL
           ORDER BY fp.created_at DESC
           LIMIT $2 OFFSET $3`,
          [baseId, limit, offset],
        );

        const posts = result.rows.map(transformFeedPost);

        // Fetch author info for each post
        for (const post of posts) {
          const userResult = await client.query(
            `SELECT id, username as name, avatar_url as "avatarUrl", dow_verified_at as "verified" FROM users WHERE id = $1`,
            [post.userId],
          );
          if (userResult.rows.length > 0) {
            const user = userResult.rows[0];
            post.author = {
              id: user.id,
              name: user.name,
              verified: !!user.verified,
              memberSince: new Date().toISOString(),
              avatarUrl: user.avatarUrl || "",
            };
          }
        }

        return {
          statusCode: 200,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(posts),
        };
      } finally {
        client.release();
      }
    }

    // GET /feed/announcements?baseId=xxx
    if (method === "GET" && path === "/announcements") {
      const userId = await getUserIdFromAuth(event);
      const params = new URLSearchParams(event.rawQuery || "");
      const baseId = params.get("baseId");

      if (!baseId) {
        return {
          statusCode: 400,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ error: "baseId is required" }),
        };
      }

      const client = await pool.connect();
      try {
        const result = await client.query(
          `SELECT * FROM feed_announcements
           WHERE base_id = $1 AND deleted_at IS NULL
           ORDER BY is_sticky DESC, created_at DESC`,
          [baseId],
        );

        const announcements = result.rows.map((row: any) => {
          const ann = transformAnnouncement(row);
          ann.isDismissed = userId && ann.dismissedBy.includes(userId);
          return ann;
        });

        return {
          statusCode: 200,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(announcements),
        };
      } finally {
        client.release();
      }
    }

    // POST /feed/posts
    if (method === "POST" && path === "/posts") {
      const userId = await getUserIdFromAuth(event);
      if (!userId) {
        return {
          statusCode: 401,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ error: "Unauthorized" }),
        };
      }

      const { baseId, postType, content, imageUrls, pollOptions, eventData } =
        JSON.parse(event.body || "{}");

      if (!baseId || !postType || !content) {
        return {
          statusCode: 400,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ error: "Missing required fields" }),
        };
      }

      const client = await pool.connect();
      try {
        const postId = randomUUID();

        // Check if user is admin/moderator for PSA posts
        if (postType === "psa") {
          const userResult = await client.query(
            "SELECT role FROM users WHERE id = $1",
            [userId],
          );
          if (
            !userResult.rows.length ||
            !["admin", "moderator"].includes(userResult.rows[0].role)
          ) {
            return {
              statusCode: 403,
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                error: "Only moderators and admins can post PSAs",
              }),
            };
          }
        }

        const result = await client.query(
          `INSERT INTO feed_posts (id, user_id, base_id, post_type, content, image_urls, poll_options, event_data, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
           RETURNING *`,
          [
            postId,
            userId,
            baseId,
            postType,
            content,
            imageUrls || [],
            pollOptions ? JSON.stringify(pollOptions) : null,
            eventData ? JSON.stringify(eventData) : null,
          ],
        );

        return {
          statusCode: 201,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(transformFeedPost(result.rows[0])),
        };
      } finally {
        client.release();
      }
    }

    // POST /feed/posts/:postId/like
    if (method === "POST" && path.match(/^\/posts\/[^/]+\/like$/)) {
      const userId = await getUserIdFromAuth(event);
      if (!userId) {
        return {
          statusCode: 401,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ error: "Unauthorized" }),
        };
      }

      const postId = path.split("/")[2];
      const client = await pool.connect();

      try {
        // Check if already liked
        const existing = await client.query(
          `SELECT id FROM feed_engagement WHERE post_id = $1 AND user_id = $2 AND engagement_type = 'like'`,
          [postId, userId],
        );

        if (existing.rows.length > 0) {
          // Already liked, unlike it
          await client.query(
            `UPDATE feed_engagement SET deleted_at = NOW() WHERE post_id = $1 AND user_id = $2 AND engagement_type = 'like'`,
            [postId, userId],
          );
        } else {
          // Add like
          const engagementId = randomUUID();
          await client.query(
            `INSERT INTO feed_engagement (id, post_id, user_id, engagement_type, created_at)
             VALUES ($1, $2, $3, 'like', NOW())`,
            [engagementId, postId, userId],
          );
        }

        return {
          statusCode: 200,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ success: true }),
        };
      } finally {
        client.release();
      }
    }

    // POST /feed/posts/:postId/comment
    if (method === "POST" && path.match(/^\/posts\/[^/]+\/comment$/)) {
      const userId = await getUserIdFromAuth(event);
      if (!userId) {
        return {
          statusCode: 401,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ error: "Unauthorized" }),
        };
      }

      const postId = path.split("/")[2];
      const { content } = JSON.parse(event.body || "{}");

      if (!content) {
        return {
          statusCode: 400,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ error: "Comment content is required" }),
        };
      }

      const client = await pool.connect();
      try {
        const engagementId = randomUUID();
        const result = await client.query(
          `INSERT INTO feed_engagement (id, post_id, user_id, engagement_type, content, created_at)
           VALUES ($1, $2, $3, 'comment', $4, NOW())
           RETURNING id, user_id as "userId", content, created_at as "createdAt"`,
          [engagementId, postId, userId, content],
        );

        return {
          statusCode: 201,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(result.rows[0]),
        };
      } finally {
        client.release();
      }
    }

    // POST /feed/announcements/:announcementId/dismiss
    if (method === "POST" && path.match(/^\/announcements\/[^/]+\/dismiss$/)) {
      const userId = await getUserIdFromAuth(event);
      if (!userId) {
        return {
          statusCode: 401,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ error: "Unauthorized" }),
        };
      }

      const announcementId = path.split("/")[2];
      const client = await pool.connect();

      try {
        await client.query(
          `UPDATE feed_announcements SET dismissed_by = array_append(dismissed_by, $1) WHERE id = $2`,
          [userId, announcementId],
        );

        return {
          statusCode: 200,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ success: true }),
        };
      } finally {
        client.release();
      }
    }

    return {
      statusCode: 404,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Not found" }),
    };
  } catch (err) {
    const errorMsg =
      err instanceof Error ? err.message : "Internal server error";
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: errorMsg }),
    };
  }
};
