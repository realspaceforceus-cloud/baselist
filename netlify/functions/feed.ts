import { Handler } from "@netlify/functions";
import { pool } from "./db";
import { randomUUID } from "crypto";
import { getUserIdFromAuth } from "./auth";
import { createNotification } from "./notification-helpers";
import {
  extractMentions,
  getMentionedUserIds,
  trackInteraction,
} from "./tag-parser";
import { recordMetric } from "./lib/metrics";

const transformFeedPost = (row: any) => {
  let pollOptions = undefined;
  let eventData = undefined;

  if (row.poll_options) {
    try {
      pollOptions =
        typeof row.poll_options === "string"
          ? JSON.parse(row.poll_options)
          : row.poll_options;
    } catch (e) {
      console.error("[FEED] Error parsing poll_options:", e);
      pollOptions = undefined;
    }
  }

  if (row.event_data) {
    try {
      eventData =
        typeof row.event_data === "string"
          ? JSON.parse(row.event_data)
          : row.event_data;
    } catch (e) {
      console.error("[FEED] Error parsing event_data:", e);
      eventData = undefined;
    }
  }

  const likes = parseInt(row.likes?.toString() || "0", 10) || 0;
  const comments = parseInt(row.comments?.toString() || "0", 10) || 0;

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
    likes,
    comments,
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
  const startTime = Date.now();

  try {
    // POST /feed/admin/announcements (admin only)
    if (method === "POST" && path === "/admin/announcements") {
      const userId = await getUserIdFromAuth(event);
      if (!userId) {
        return {
          statusCode: 401,
          headers: { "Content-Type": "application/json" },
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
            headers: { "Content-Type": "application/json" },
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
            headers: { "Content-Type": "application/json" },
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
      console.log("[FEED] GET /posts - Starting request");
      const userId = await getUserIdFromAuth(event);
      const params = new URLSearchParams(event.rawQuery || "");
      const baseId = params.get("baseId");
      const limit = Math.min(parseInt(params.get("limit") || "20"), 100);
      const offset = parseInt(params.get("offset") || "0");

      console.log("[FEED] GET /posts - Params:", {
        baseId,
        limit,
        offset,
        userId,
      });

      if (!baseId) {
        return {
          statusCode: 400,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ error: "baseId is required" }),
        };
      }

      const client = await pool.connect();
      try {
        console.log("[FEED] GET /posts - Connected to database");

        const result = await client.query(
          `SELECT
            fp.id,
            fp.user_id,
            fp.base_id,
            fp.post_type,
            fp.content,
            fp.image_urls,
            fp.poll_options,
            fp.poll_votes,
            fp.event_data,
            fp.created_at,
            fp.updated_at,
            (SELECT COUNT(*) FROM feed_engagement WHERE post_id = fp.id AND engagement_type = 'like' AND deleted_at IS NULL) as likes,
            (SELECT COUNT(*) FROM feed_engagement WHERE post_id = fp.id AND engagement_type = 'comment' AND deleted_at IS NULL) as comments
           FROM feed_posts fp
           WHERE fp.base_id = $1 AND fp.deleted_at IS NULL
           ORDER BY fp.created_at DESC
           LIMIT $2 OFFSET $3`,
          [baseId, limit, offset],
        );

        console.log(
          "[FEED] GET /posts - Query returned",
          result.rows.length,
          "rows",
        );

        const posts = result.rows.map((row) => {
          try {
            return transformFeedPost(row);
          } catch (e) {
            console.error(
              "[FEED] GET /posts - Error transforming row:",
              e,
              row,
            );
            throw e;
          }
        });

        console.log("[FEED] GET /posts - Transformed", posts.length, "posts");

        // Fetch author info for all posts in one batch query
        const userIds = [...new Set(posts.map((p) => p.userId))];
        console.log(
          "[FEED] GET /posts - Fetching authors for",
          userIds.length,
          "users",
        );

        const usersMap = new Map();
        if (userIds.length > 0) {
          const placeholders = userIds.map((_, i) => `$${i + 1}`).join(",");
          const usersResult = await client.query(
            `SELECT id, username, name, avatar_url as "avatarUrl", dow_verified_at as "verified" FROM users WHERE id IN (${placeholders})`,
            userIds,
          );

          console.log(
            "[FEED] GET /posts - Fetched",
            usersResult.rows.length,
            "authors",
          );

          usersResult.rows.forEach((user) => {
            usersMap.set(user.id, {
              id: user.id,
              username: user.username,
              name: user.name || user.username,
              verified: !!user.verified,
              memberSince: new Date().toISOString(),
              avatarUrl: user.avatarUrl || "",
            });
          });

          for (const post of posts) {
            if (usersMap.has(post.userId)) {
              post.author = usersMap.get(post.userId);
            }
          }
        }

        // Fetch comments for all posts (including nested replies)
        console.log("[FEED] GET /posts - Fetching comments");
        const commentsResult = await client.query(
          `SELECT
            id, post_id, user_id, content, created_at, parent_id
           FROM feed_engagement
           WHERE post_id = ANY($1) AND engagement_type = 'comment' AND deleted_at IS NULL
           ORDER BY created_at ASC`,
          [posts.map((p) => p.id)],
        );

        console.log(
          "[FEED] GET /posts - Fetched",
          commentsResult.rows.length,
          "comments",
        );

        const commenterIds = [
          ...new Set(commentsResult.rows.map((c) => c.user_id)),
        ];

        const commenterMap = new Map();
        if (commenterIds.length > 0) {
          const placeholders = commenterIds
            .map((_, i) => `$${i + 1}`)
            .join(",");
          const commentersResult = await client.query(
            `SELECT id, username as name, avatar_url as "avatarUrl", dow_verified_at as "verified" FROM users WHERE id IN (${placeholders})`,
            commenterIds,
          );

          commentersResult.rows.forEach((user) => {
            commenterMap.set(user.id, {
              id: user.id,
              name: user.name,
              verified: !!user.verified,
              memberSince: new Date().toISOString(),
              avatarUrl: user.avatarUrl || "",
            });
          });
        }

        // Build nested comment structure
        const commentsByPost: Record<string, any[]> = {};
        const commentMap = new Map();

        for (const post of posts) {
          commentsByPost[post.id] = [];
        }

        // First pass: create comment objects and index by ID
        for (const comment of commentsResult.rows) {
          const author = commenterMap.get(comment.user_id);
          const commentObj = {
            id: comment.id,
            postId: comment.post_id,
            userId: comment.user_id,
            content: comment.content,
            createdAt: comment.created_at,
            parentCommentId: comment.parent_id,
            author,
            replies: [],
            likes: 0,
            userLiked: false,
          };
          commentMap.set(comment.id, commentObj);
        }

        // Second pass: build parent-child relationships and organize by post
        for (const comment of commentsResult.rows) {
          const commentObj = commentMap.get(comment.id);
          if (comment.parent_id) {
            // This is a reply - add to parent's replies
            const parent = commentMap.get(comment.parent_id);
            if (parent) {
              parent.replies.push(commentObj);
            }
          } else {
            // This is a top-level comment
            commentsByPost[comment.post_id].push(commentObj);
          }
        }

        // Attach comments to posts
        for (const post of posts) {
          post.userComments = commentsByPost[post.id];
        }

        console.log(
          "[FEED] GET /posts - Success, returning",
          posts.length,
          "posts",
        );

        recordMetric(pool, {
          endpoint: "/feed/posts",
          method: "GET",
          statusCode: 200,
          responseTimeMs: Date.now() - startTime,
        }).catch(() => {});

        return {
          statusCode: 200,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(posts),
        };
      } catch (e) {
        console.error("[FEED] GET /posts - Error:", e);
        const errorMsg =
          e instanceof Error ? e.message : "Internal server error";

        recordMetric(pool, {
          endpoint: "/feed/posts",
          method: "GET",
          statusCode: 500,
          responseTimeMs: Date.now() - startTime,
          errorMessage: errorMsg,
        }).catch(() => {});

        throw e;
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
        recordMetric(pool, {
          endpoint: "/feed/posts",
          method: "POST",
          statusCode: 401,
          responseTimeMs: Date.now() - startTime,
          errorMessage: "Unauthorized",
        }).catch(() => {});

        return {
          statusCode: 401,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ error: "Unauthorized" }),
        };
      }

      const { baseId, postType, content, imageUrls, pollOptions, eventData } =
        JSON.parse(event.body || "{}");

      if (!baseId || !postType || !content) {
        recordMetric(pool, {
          endpoint: "/feed/posts",
          method: "POST",
          statusCode: 400,
          responseTimeMs: Date.now() - startTime,
          errorMessage: "Missing required fields",
        }).catch(() => {});

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

          if (!userResult.rows.length) {
            client.release();
            return {
              statusCode: 403,
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                error: "User not found",
              }),
            };
          }

          const role = userResult.rows[0].role;

          if (!["admin", "moderator"].includes(role)) {
            client.release();
            return {
              statusCode: 403,
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                error: "Only moderators and admins can post PSAs",
              }),
            };
          }

          // For moderators, verify they are assigned to this base
          if (role === "moderator") {
            const assignmentResult = await client.query(
              "SELECT id FROM moderator_bases WHERE moderator_id = $1 AND base_id = $2",
              [userId, baseId],
            );

            if (assignmentResult.rows.length === 0) {
              client.release();
              return {
                statusCode: 403,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  error: "You are not assigned to this base",
                }),
              };
            }
          }
          // Admins can post in any base (no additional check needed)
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

        // Handle tag mentions in post
        try {
          const mentions = extractMentions(content);
          if (mentions.length > 0) {
            const mentionedUsers = await getMentionedUserIds(mentions);

            // Fetch post author name for notification
            const authorResult = await client.query(
              "SELECT username as name FROM users WHERE id = $1",
              [userId],
            );
            const authorName = authorResult.rows[0]?.name || "Someone";

            for (const mentionedUser of mentionedUsers) {
              // Don't notify the poster about their own tag
              if (mentionedUser.id === userId) continue;

              try {
                await createNotification({
                  userId: mentionedUser.id,
                  type: "tagged_in_post",
                  title: `${authorName} tagged you in a post`,
                  description: content.substring(0, 100),
                  actorId: userId,
                  targetId: postId,
                  targetType: "post",
                });
              } catch (err) {
                console.error(
                  `[FEED] Error creating tag notification for ${mentionedUser.username}:`,
                  err,
                );
              }
            }
          }
        } catch (err) {
          console.error("[FEED] Error processing post mentions:", err);
        }

        recordMetric(pool, {
          endpoint: "/feed/posts",
          method: "POST",
          statusCode: 201,
          responseTimeMs: Date.now() - startTime,
        }).catch(() => {});

        return {
          statusCode: 201,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(transformFeedPost(result.rows[0])),
        };
      } catch (e) {
        console.error("[FEED] POST /posts - Error:", e);
        const errorMsg =
          e instanceof Error ? e.message : "Internal server error";

        recordMetric(pool, {
          endpoint: "/feed/posts",
          method: "POST",
          statusCode: 500,
          responseTimeMs: Date.now() - startTime,
          errorMessage: errorMsg,
        }).catch(() => {});

        throw e;
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
      const { content, parentCommentId } = JSON.parse(event.body || "{}");

      if (!content) {
        return {
          statusCode: 400,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ error: "Comment content is required" }),
        };
      }

      const client = await pool.connect();
      try {
        // If replying to a comment, verify the parent comment exists and belongs to this post
        let parentAuthorId: string | null = null;
        if (parentCommentId) {
          const parentResult = await client.query(
            "SELECT user_id FROM feed_engagement WHERE id = $1 AND post_id = $2 AND engagement_type = 'comment'",
            [parentCommentId, postId],
          );

          if (parentResult.rows.length === 0) {
            return {
              statusCode: 400,
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ error: "Parent comment not found" }),
            };
          }

          parentAuthorId = parentResult.rows[0].user_id;
        }

        // Get post info first
        const postResult = await client.query(
          "SELECT user_id FROM feed_posts WHERE id = $1",
          [postId],
        );

        const engagementId = randomUUID();
        const result = await client.query(
          `INSERT INTO feed_engagement (id, post_id, user_id, engagement_type, content, parent_id, created_at)
           VALUES ($1, $2, $3, 'comment', $4, $5, NOW())
           RETURNING id, user_id as "userId", content, created_at as "createdAt"`,
          [engagementId, postId, userId, content, parentCommentId || null],
        );

        const comment = result.rows[0];

        // Fetch author info
        const authorResult = await client.query(
          `SELECT id, username as name, avatar_url as "avatarUrl", dow_verified_at as "verified" FROM users WHERE id = $1`,
          [userId],
        );

        const author = authorResult.rows[0]
          ? {
              id: authorResult.rows[0].id,
              name: authorResult.rows[0].name,
              verified: !!authorResult.rows[0].verified,
              memberSince: new Date().toISOString(),
              avatarUrl: authorResult.rows[0].avatarUrl || "",
            }
          : undefined;

        const commenterName = author?.name || "Someone";

        // Notify: either parent comment author (if reply) or post author (if top-level comment)
        if (parentCommentId && parentAuthorId && parentAuthorId !== userId) {
          // This is a reply - notify the parent comment author
          console.log("[FEED] Creating comment_reply notification", {
            parentAuthorId,
            replierId: userId,
            replierName: commenterName,
            parentCommentId,
            postId,
          });
          try {
            await createNotification({
              userId: parentAuthorId,
              type: "comment_replied",
              title: `${commenterName} replied to your comment`,
              description: content.substring(0, 100),
              actorId: userId,
              targetId: postId,
              targetType: "post",
              data: { commentId: engagementId, parentCommentId },
            });
            console.log("[FEED] Reply notification created successfully");
          } catch (err) {
            console.error("[FEED] Error creating reply notification:", err);
          }
        } else if (
          !parentCommentId &&
          postResult.rows[0] &&
          postResult.rows[0].user_id !== userId
        ) {
          // This is a top-level comment - notify the post author
          console.log("[FEED] Creating post_commented notification", {
            postAuthorId: postResult.rows[0].user_id,
            commenterId: userId,
            commenterName,
            postId,
          });
          try {
            await createNotification({
              userId: postResult.rows[0].user_id,
              type: "post_commented",
              title: `${commenterName} commented on your post`,
              description: content.substring(0, 100),
              actorId: userId,
              targetId: postId,
              targetType: "post",
              data: { commentId: engagementId },
            });
            console.log("[FEED] Notification created successfully");
          } catch (err) {
            console.error("[FEED] Error creating notification:", err);
          }
        } else {
          console.log(
            "[FEED] Skipping notification - self-comment or no parent",
            {
              isReply: !!parentCommentId,
              isSameUser:
                parentAuthorId === userId ||
                postResult.rows[0]?.user_id === userId,
            },
          );
        }

        // Handle tag mentions in comment
        try {
          const mentions = extractMentions(content);
          if (mentions.length > 0) {
            const mentionedUsers = await getMentionedUserIds(mentions);

            for (const mentionedUser of mentionedUsers) {
              // Don't notify the commenter about their own tag
              if (mentionedUser.id === userId) continue;

              const notificationType = parentCommentId
                ? "tagged_in_comment"
                : "tagged_in_comment";

              try {
                await createNotification({
                  userId: mentionedUser.id,
                  type: notificationType,
                  title: `${commenterName} tagged you in a comment`,
                  description: content.substring(0, 100),
                  actorId: userId,
                  targetId: postId,
                  targetType: "post",
                  data: { commentId: engagementId },
                });
              } catch (err) {
                console.error(
                  `[FEED] Error creating tag notification for ${mentionedUser.username}:`,
                  err,
                );
              }
            }
          }
        } catch (err) {
          console.error("[FEED] Error processing mentions:", err);
        }

        return {
          statusCode: 201,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...comment,
            postId,
            author,
            likes: 0,
            userLiked: false,
          }),
        };
      } finally {
        client.release();
      }
    }

    // POST /feed/posts/:postId/vote
    if (method === "POST" && path.match(/^\/posts\/[^/]+\/vote$/)) {
      const userId = await getUserIdFromAuth(event);
      if (!userId) {
        return {
          statusCode: 401,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ error: "Unauthorized" }),
        };
      }

      const postId = path.split("/")[2];
      const { optionId } = JSON.parse(event.body || "{}");

      if (!optionId) {
        return {
          statusCode: 400,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ error: "optionId is required" }),
        };
      }

      const client = await pool.connect();
      try {
        // Get the post to access poll_options
        const postResult = await client.query(
          "SELECT poll_options FROM feed_posts WHERE id = $1",
          [postId],
        );

        if (postResult.rows.length === 0) {
          return {
            statusCode: 404,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ error: "Post not found" }),
          };
        }

        let pollOptions = postResult.rows[0].poll_options;
        if (typeof pollOptions === "string") {
          pollOptions = JSON.parse(pollOptions);
        }

        if (!Array.isArray(pollOptions)) {
          return {
            statusCode: 400,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ error: "Post is not a poll" }),
          };
        }

        // Remove user's previous vote from all options
        pollOptions = pollOptions.map((option: any) => ({
          ...option,
          votes: Array.isArray(option.votes) ? option.votes : [],
        }));

        pollOptions.forEach((option: any) => {
          if (Array.isArray(option.votes)) {
            option.votes = option.votes.filter((v: string) => v !== userId);
          }
        });

        // Add vote to selected option
        const selectedOption = pollOptions.find(
          (opt: any) => opt.id === optionId,
        );
        if (selectedOption) {
          if (!Array.isArray(selectedOption.votes)) {
            selectedOption.votes = [];
          }
          selectedOption.votes.push(userId);
        }

        // Update the post
        await client.query(
          "UPDATE feed_posts SET poll_options = $1, updated_at = NOW() WHERE id = $2",
          [JSON.stringify(pollOptions), postId],
        );

        return {
          statusCode: 200,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ success: true, pollOptions }),
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

    // DELETE /feed/posts/:postId
    if (method === "DELETE" && path.match(/^\/posts\/[^/]+$/)) {
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
        const postResult = await client.query(
          "SELECT user_id, base_id FROM feed_posts WHERE id = $1",
          [postId],
        );

        if (postResult.rows.length === 0) {
          return {
            statusCode: 404,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ error: "Post not found" }),
          };
        }

        const post = postResult.rows[0];
        const isAuthor = userId === post.user_id;

        const userResult = await client.query(
          "SELECT role FROM users WHERE id = $1",
          [userId],
        );

        const isAdmin =
          userResult.rows.length > 0 &&
          ["admin", "moderator"].includes(userResult.rows[0].role);

        if (!isAuthor && !isAdmin) {
          return {
            statusCode: 403,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              error: "You can only delete your own posts",
            }),
          };
        }

        await client.query(
          "UPDATE feed_posts SET deleted_at = NOW() WHERE id = $1",
          [postId],
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

    // POST /feed/posts/:postId/report
    if (method === "POST" && path.match(/^\/posts\/[^/]+\/report$/)) {
      const userId = await getUserIdFromAuth(event);
      if (!userId) {
        return {
          statusCode: 401,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ error: "Unauthorized" }),
        };
      }

      const postId = path.split("/")[2];
      const { reason } = JSON.parse(event.body || "{}");

      if (!reason) {
        return {
          statusCode: 400,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ error: "Report reason is required" }),
        };
      }

      const client = await pool.connect();

      try {
        const reportId = randomUUID();
        await client.query(
          `INSERT INTO feed_reports (id, post_id, user_id, reason, created_at)
           VALUES ($1, $2, $3, $4, NOW())`,
          [reportId, postId, userId, reason],
        );

        return {
          statusCode: 201,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ success: true }),
        };
      } catch (e) {
        console.error("[FEED] Error creating report:", e);
        return {
          statusCode: 200,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ success: true }),
        };
      } finally {
        client.release();
      }
    }

    // DELETE /feed/posts/:postId/comments/:commentId
    if (
      method === "DELETE" &&
      path.match(/^\/posts\/[^/]+\/comments\/[^/]+$/)
    ) {
      const userId = await getUserIdFromAuth(event);
      if (!userId) {
        return {
          statusCode: 401,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ error: "Unauthorized" }),
        };
      }

      const pathParts = path.split("/");
      const postId = pathParts[2];
      const commentId = pathParts[4];

      const client = await pool.connect();

      try {
        const commentResult = await client.query(
          "SELECT user_id FROM feed_engagement WHERE id = $1 AND engagement_type = 'comment'",
          [commentId],
        );

        if (commentResult.rows.length === 0) {
          return {
            statusCode: 404,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ error: "Comment not found" }),
          };
        }

        const comment = commentResult.rows[0];
        const isAuthor = userId === comment.user_id;

        const userResult = await client.query(
          "SELECT role FROM users WHERE id = $1",
          [userId],
        );

        const isAdmin =
          userResult.rows.length > 0 &&
          ["admin", "moderator"].includes(userResult.rows[0].role);

        if (!isAuthor && !isAdmin) {
          return {
            statusCode: 403,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              error: "You can only delete your own comments",
            }),
          };
        }

        await client.query(
          "UPDATE feed_engagement SET deleted_at = NOW() WHERE id = $1",
          [commentId],
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

    // POST /feed/posts/:postId/comments/:commentId/like
    if (
      method === "POST" &&
      path.match(/^\/posts\/[^/]+\/comments\/[^/]+\/like$/)
    ) {
      const userId = await getUserIdFromAuth(event);
      if (!userId) {
        return {
          statusCode: 401,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ error: "Unauthorized" }),
        };
      }

      const pathParts = path.split("/");
      const commentId = pathParts[4];

      const client = await pool.connect();

      try {
        const existing = await client.query(
          `SELECT id FROM feed_comment_likes WHERE comment_id = $1 AND user_id = $2`,
          [commentId, userId],
        );

        if (existing.rows.length > 0) {
          await client.query(
            "DELETE FROM feed_comment_likes WHERE comment_id = $1 AND user_id = $2",
            [commentId, userId],
          );
        } else {
          const likeId = randomUUID();
          await client.query(
            `INSERT INTO feed_comment_likes (id, comment_id, user_id, created_at)
             VALUES ($1, $2, $3, NOW())`,
            [likeId, commentId, userId],
          );

          // Notify comment author
          const commentResult = await client.query(
            "SELECT user_id, post_id FROM feed_engagement WHERE id = $1 AND engagement_type = 'comment'",
            [commentId],
          );

          if (
            commentResult.rows[0] &&
            commentResult.rows[0].user_id !== userId
          ) {
            const liker = await client.query(
              "SELECT username FROM users WHERE id = $1",
              [userId],
            );
            const likerName = liker.rows[0]?.username || "Someone";
            const postId = commentResult.rows[0].post_id;

            try {
              await createNotification({
                userId: commentResult.rows[0].user_id,
                type: "comment_liked",
                title: `${likerName} liked your comment`,
                description: "Your comment received a like",
                actorId: userId,
                targetId: postId,
                targetType: "post",
                data: { commentId },
              });
            } catch (err) {
              console.error("[FEED] Error creating like notification:", err);
            }
          }
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

    return {
      statusCode: 404,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Not found" }),
    };
  } catch (err) {
    const errorMsg =
      err instanceof Error ? err.message : "Internal server error";
    const errorStack =
      err instanceof Error ? err.stack : "No stack trace available";
    console.error("[FEED ERROR]", errorMsg, errorStack);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        error: errorMsg,
        stack: process.env.NODE_ENV === "development" ? errorStack : undefined,
      }),
    };
  }
};
