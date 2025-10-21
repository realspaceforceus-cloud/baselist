import { pool } from "./db";

/**
 * Extract mentions from content (e.g., @username)
 * Returns array of unique usernames mentioned
 */
export function extractMentions(content: string): string[] {
  const mentionRegex = /@([\w\.\-]+)/g;
  const mentions = new Set<string>();
  let match;

  while ((match = mentionRegex.exec(content)) !== null) {
    mentions.add(match[1].toLowerCase());
  }

  return Array.from(mentions);
}

/**
 * Get user IDs for mentioned usernames
 * Only returns users who allow tagging
 */
export async function getMentionedUserIds(
  usernames: string[],
): Promise<{ id: string; username: string }[]> {
  if (usernames.length === 0) return [];

  const client = await pool.connect();
  try {
    const placeholders = usernames
      .map((_, i) => `$${i + 1}`)
      .join(",");
    const result = await client.query(
      `SELECT id, username FROM users 
       WHERE LOWER(username) IN (${placeholders}) AND allow_tagging = true`,
      usernames.map((u) => u.toLowerCase()),
    );

    return result.rows.map((row) => ({
      id: row.id,
      username: row.username,
    }));
  } finally {
    client.release();
  }
}

/**
 * Track user interaction (for smart mention filtering)
 */
export async function trackInteraction(
  userId: string,
  interactedWithId: string,
  interactionType: "commented" | "replied" | "liked",
): Promise<void> {
  if (userId === interactedWithId) return; // Don't track self-interactions

  const client = await pool.connect();
  try {
    // Insert or update interaction record
    await client.query(
      `INSERT INTO user_interactions (id, user_id, interacted_with_id, interaction_type, created_at)
       VALUES ($1, $2, $3, $4, NOW())
       ON CONFLICT (user_id, interacted_with_id) DO UPDATE SET created_at = NOW()`,
      [
        `${userId}_${interactedWithId}_${interactionType}`,
        userId,
        interactedWithId,
        interactionType,
      ],
    );
  } catch (err) {
    // Ignore conflicts, this is optional tracking
    console.log("[TAG_PARSER] Tracking error (non-fatal):", err);
  } finally {
    client.release();
  }
}
