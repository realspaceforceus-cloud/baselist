import express from "express";
import { authenticate } from "../middleware/authenticate";
import { store } from "../data/store";

export const userRouter = express.Router();

userRouter.post("/profile/update", authenticate, (req, res) => {
  const userId = req.userId as string;
  const { name } = req.body;

  if (!name || typeof name !== "string" || name.trim().length === 0) {
    return res.status(400).json({ message: "Invalid username" });
  }

  const user = store.users.find((u) => u.id === userId);
  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  user.name = name.trim();
  return res.json({ success: true, message: "Profile updated" });
});

userRouter.post("/email/request-change", authenticate, (req, res) => {
  const userId = req.userId as string;
  const { newEmail } = req.body;

  if (!newEmail || typeof newEmail !== "string") {
    return res.status(400).json({ message: "Invalid email address" });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(newEmail)) {
    return res.status(400).json({ message: "Invalid email format" });
  }

  const user = store.users.find((u) => u.id === userId);
  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  if (newEmail === user.email) {
    return res.status(400).json({ message: "New email must be different from current email" });
  }

  const emailExists = store.users.some(
    (u) => u.email === newEmail || u.pendingEmail === newEmail,
  );
  if (emailExists) {
    return res.status(400).json({ message: "Email already in use" });
  }

  // Store pending email and generate verification token
  user.pendingEmail = newEmail;
  user.verified = false;

  // In a real implementation, send email with verification link
  const verificationToken = Buffer.from(`${userId}:${newEmail}:${Date.now()}`).toString(
    "base64",
  );
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
    return res.status(400).json({ message: "Invalid or missing verification token" });
  }

  try {
    const decoded = Buffer.from(token, "base64").toString("utf-8");
    const [userId, newEmail] = decoded.split(":");

    const user = store.users.find((u) => u.id === userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.pendingEmail !== newEmail) {
      return res.status(400).json({ message: "Invalid verification token" });
    }

    user.email = newEmail;
    user.pendingEmail = undefined;
    user.verified = true;

    return res.json({
      success: true,
      message: "Email verified successfully",
    });
  } catch (error) {
    return res.status(400).json({ message: "Invalid verification token" });
  }
});

userRouter.post("/password/change", authenticate, (req, res) => {
  const userId = req.userId as string;
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ message: "Missing required fields" });
  }

  if (newPassword.length < 8) {
    return res.status(400).json({ message: "Password must be at least 8 characters" });
  }

  const user = store.users.find((u) => u.id === userId);
  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  // In a real implementation, compare hashed passwords
  // For demo purposes, we'll do a simple check
  if (currentPassword !== (user as any).password) {
    return res.status(401).json({ message: "Current password is incorrect" });
  }

  (user as any).password = newPassword;

  return res.json({
    success: true,
    message: "Password changed successfully",
  });
});

userRouter.post("/notifications/toggle", authenticate, (req, res) => {
  const userId = req.userId as string;
  const { enabled } = req.body;

  if (typeof enabled !== "boolean") {
    return res.status(400).json({ message: "Invalid enabled value" });
  }

  const user = store.users.find((u) => u.id === userId);
  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  user.notificationsEnabled = enabled;

  return res.json({
    success: true,
    message: `Notifications ${enabled ? "enabled" : "disabled"}`,
  });
});

userRouter.post("/account/delete", authenticate, (req, res) => {
  const userId = req.userId as string;

  const userIndex = store.users.findIndex((u) => u.id === userId);
  if (userIndex === -1) {
    return res.status(404).json({ message: "User not found" });
  }

  // Remove user from store
  store.users.splice(userIndex, 1);

  // Clear user's listings
  store.listings = store.listings.filter((listing) => listing.sellerId !== userId);

  // Clear user's messages
  store.messageThreads = store.messageThreads.filter((thread) => {
    const participants = thread.participants.filter((p) => p !== userId);
    return participants.length > 0;
  });

  return res.json({
    success: true,
    message: "Account deleted successfully",
  });
});
