import bcrypt from "bcryptjs";
import { Router } from "express";
import { authenticate } from "../middleware/authenticate";
import { store } from "../data/store";

export const userRouter = Router();

const USERNAME_PATTERN = /^[A-Za-z0-9_]{3,20}$/;

function updateUser(userId: string, updater: (u: any) => any) {
  const user = store.getUser(userId);
  if (!user) return null;
  const updated = { ...user, ...updater(user) };
  store["users"]?.set?.(userId, updated);
  return updated;
}

userRouter.post("/profile/update", authenticate, (req, res) => {
  const userId = req.user?.id;
  const { name } = req.body;

  if (!userId) return res.status(401).json({ message: "Unauthorized" });
  if (!name || typeof name !== "string" || name.trim().length === 0) {
    return res.status(400).json({ message: "Invalid username" });
  }

  const trimmedName = name.trim();

  if (!USERNAME_PATTERN.test(trimmedName)) {
    return res.status(400).json({
      message: "Username must be 3-20 characters long and contain only letters, numbers, and underscores",
    });
  }

  const user = store.getUser(userId);
  if (!user) return res.status(404).json({ message: "User not found" });

  if (trimmedName !== user.name) {
    const usernameExists = store
      .getUsers()
      .some((u) => u.id !== userId && u.name.toLowerCase() === trimmedName.toLowerCase());

    if (usernameExists) {
      return res.status(400).json({ message: "Username is already taken" });
    }
  }

  const updated = updateUser(userId, (u) => ({ ...u, name: trimmedName }));
  return res.json({
    success: true,
    message: "Profile updated",
    name: updated?.name,
  });
});

userRouter.post("/profile/avatar", authenticate, async (req, res) => {
  const userId = req.user?.id;

  if (!userId) return res.status(401).json({ message: "Unauthorized" });

  const user = store.getUser(userId);
  if (!user) return res.status(404).json({ message: "User not found" });

  try {
    const { avatarUrl } = req.body;
    if (!avatarUrl || typeof avatarUrl !== "string") {
      return res.status(400).json({ message: "Invalid avatar URL" });
    }

    const updated = updateUser(userId, (u) => ({ ...u, avatarUrl }));
    return res.json({
      success: true,
      message: "Avatar updated",
      avatarUrl: updated?.avatarUrl,
    });
  } catch (error) {
    return res.status(500).json({
      message: error instanceof Error ? error.message : "Failed to upload avatar",
    });
  }
});

userRouter.post("/email/request-change", authenticate, (req, res) => {
  const userId = req.user?.id;
  const { newEmail } = req.body;

  if (!userId) return res.status(401).json({ message: "Unauthorized" });
  if (!newEmail || typeof newEmail !== "string") {
    return res.status(400).json({ message: "Invalid email address" });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(newEmail)) {
    return res.status(400).json({ message: "Invalid email format" });
  }

  const user = store.getUser(userId);
  if (!user) return res.status(404).json({ message: "User not found" });

  if (newEmail === user.email) {
    return res
      .status(400)
      .json({ message: "New email must be different from current email" });
  }

  const emailExists = store
    .getUsers()
    .some(
      (u) =>
        u.email === newEmail || (u.pendingEmail && u.pendingEmail === newEmail),
    );
  if (emailExists) {
    return res.status(400).json({ message: "Email already in use" });
  }

  updateUser(userId, (u) => ({ ...u, pendingEmail: newEmail }));
  const verificationToken = Buffer.from(
    `${userId}:${newEmail}:${Date.now()}`,
  ).toString("base64");
  console.log(
    `[DEV] Email verification link: /verify-email?token=${verificationToken}`,
  );

  return res.json({
    success: true,
    message: `Verification link sent to ${newEmail}`,
  });
});

userRouter.post("/email/verify", (req, res) => {
  const { token } = req.body;

  if (!token) {
    return res
      .status(400)
      .json({ message: "Invalid or missing verification token" });
  }

  try {
    const decoded = Buffer.from(token, "base64").toString("utf-8");
    const [userId, newEmail] = decoded.split(":");

    const user = store.getUser(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (user.pendingEmail !== newEmail) {
      return res.status(400).json({ message: "Invalid verification token" });
    }

    updateUser(userId, (u) => {
      const { pendingEmail, ...rest } = u;
      return { ...rest, email: newEmail, pendingEmail: undefined };
    });

    return res.json({ success: true, message: "Email verified successfully" });
  } catch {
    return res.status(400).json({ message: "Invalid verification token" });
  }
});

userRouter.post("/password/change", authenticate, async (req, res) => {
  const userId = req.user?.id;
  const { currentPassword, newPassword } = req.body;

  if (!userId) return res.status(401).json({ message: "Unauthorized" });
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ message: "Missing required fields" });
  }
  if (newPassword.length < 8) {
    return res
      .status(400)
      .json({ message: "Password must be at least 8 characters" });
  }

  const user = store.getUser(userId);
  if (!user) return res.status(404).json({ message: "User not found" });

  const ok = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!ok)
    return res.status(401).json({ message: "Current password is incorrect" });

  const newHash = await bcrypt.hash(newPassword, 10);
  updateUser(userId, (u) => ({ ...u, passwordHash: newHash }));

  return res.json({ success: true, message: "Password changed successfully" });
});

userRouter.post("/notifications/toggle", authenticate, (req, res) => {
  const userId = req.user?.id;
  const { enabled } = req.body;

  if (!userId) return res.status(401).json({ message: "Unauthorized" });
  if (typeof enabled !== "boolean") {
    return res.status(400).json({ message: "Invalid enabled value" });
  }

  const user = store.getUser(userId);
  if (!user) return res.status(404).json({ message: "User not found" });

  const updated = updateUser(userId, (u) => ({
    ...u,
    notificationsEnabled: enabled,
  }));
  return res.json({
    success: true,
    message: `Notifications ${enabled ? "enabled" : "disabled"}`,
    enabled: updated?.notificationsEnabled === true,
  });
});

userRouter.post("/account/delete", authenticate, (req, res) => {
  const userId = req.user?.id;

  if (!userId) return res.status(401).json({ message: "Unauthorized" });

  const user = store.getUser(userId);
  if (!user) return res.status(404).json({ message: "User not found" });

  // Delete user from store (accessing private Map via reflection)
  const usersMap = (store as any).users as Map<string, any>;
  usersMap.delete(userId);

  // Delete listings owned by user
  const listingsMap = (store as any).listings as Map<string, any>;
  for (const [id, listing] of listingsMap) {
    if (listing.sellerId === userId) listingsMap.delete(id);
  }

  // Remove user from threads; delete empty threads
  const threadsMap = (store as any).threads as Map<string, any>;
  for (const [id, thread] of threadsMap) {
    const participants = thread.participants.filter(
      (p: string) => p !== userId,
    );
    if (participants.length === 0) {
      threadsMap.delete(id);
    } else if (participants.length !== thread.participants.length) {
      threadsMap.set(id, { ...thread, participants });
    }
  }

  // Revoke refresh tokens for this user
  const tokensMap = (store as any).refreshTokens as Map<string, any>;
  for (const [id, token] of tokensMap) {
    if (token.userId === userId) tokensMap.delete(id);
  }

  return res.json({ success: true, message: "Account deleted successfully" });
});
