import { randomUUID } from "crypto";

import { Router } from "express";
import { z } from "zod";

import { store } from "../data/store";
import { authenticate } from "../middleware/authenticate";
import {
  createAccessToken,
  createRefreshToken,
  revokeRefreshToken,
  verifyPassword,
  verifyRefreshToken,
} from "../security/auth";
import { loginLimiter } from "../security/rateLimits";

const loginSchema = z.object({
  identifier: z.string().trim().min(3),
  password: z.string().min(1),
  rememberDevice: z.boolean().optional(),
  deviceId: z
    .string()
    .trim()
    .min(6)
    .default(() => randomUUID()),
});

const passwordResetSchema = z.object({
  email: z.string().email().trim(),
});

const completeResetSchema = z.object({
  token: z.string(),
  newPassword: z.string().min(8),
});

const refreshSchema = z.object({
  deviceId: z.string().trim().optional(),
});

const createAuthRouter = () => {
  const router = Router();

  router.post("/login", loginLimiter, async (req, res) => {
    const parse = loginSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({ error: "Invalid credentials payload" });
    }

    const { identifier, password, rememberDevice, deviceId } = parse.data;
    const identifierLower = identifier.toLowerCase();

    const user = store.getUsers().find((candidate) => {
      return (
        candidate.email.toLowerCase() === identifierLower ||
        candidate.username.toLowerCase() === identifierLower
      );
    });

    if (!user) {
      return res.status(401).json({ error: "Invalid username or password" });
    }

    if (user.status === "banned") {
      return res.status(403).json({ error: "Account is banned" });
    }

    const passwordValid = await verifyPassword(password, user.passwordHash);
    if (!passwordValid) {
      return res.status(401).json({ error: "Invalid username or password" });
    }

    const accessToken = createAccessToken({
      sub: user.id,
      role: user.role,
      baseId: user.baseId,
      scope: ["read:admin", "write:admin"],
    });

    const { rawToken: refreshToken, refreshTokenRecord } =
      await createRefreshToken(
        user.id,
        deviceId,
        req.get("user-agent") ?? "unknown",
      );

    const rememberUntil = rememberDevice
      ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      : null;

    store.touchUserLogin(user.id, rememberUntil);

    res
      .cookie("access_token", accessToken, {
        httpOnly: true,
        secure: true,
        sameSite: "strict",
        path: "/",
        maxAge: 15 * 60 * 1000,
      })
      .cookie("refresh_token", refreshToken, {
        httpOnly: true,
        secure: true,
        sameSite: "strict",
        path: "/",
        maxAge: 30 * 24 * 60 * 60 * 1000,
      })
      .status(200)
      .json({
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
          status: user.status,
          baseId: user.baseId,
          dowVerifiedAt: user.dowVerifiedAt,
          avatarUrl: user.avatarUrl,
        },
        deviceId,
        refreshTokenId: refreshTokenRecord.id,
      });
  });

  router.post("/refresh", async (req, res) => {
    const parse = refreshSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({ error: "Invalid refresh payload" });
    }

    const refreshToken = req.cookies?.refresh_token;
    if (typeof refreshToken !== "string" || refreshToken.length === 0) {
      return res.status(401).json({ error: "Refresh token missing" });
    }

    const verification = await verifyRefreshToken(refreshToken);
    if (!verification) {
      return res.status(401).json({ error: "Refresh token invalid" });
    }

    const { stored } = verification;

    if (parse.data.deviceId && stored.deviceId !== parse.data.deviceId) {
      revokeRefreshToken(stored.id);
      return res.status(401).json({ error: "Refresh token invalid" });
    }

    const user = store.getUser(stored.userId);
    if (!user || user.status === "banned") {
      revokeRefreshToken(stored.id);
      return res.status(401).json({ error: "User not authorized" });
    }

    const accessToken = createAccessToken({
      sub: user.id,
      role: user.role,
      baseId: user.baseId,
      scope: ["read:admin", "write:admin"],
    });

    res
      .cookie("access_token", accessToken, {
        httpOnly: true,
        secure: true,
        sameSite: "strict",
        path: "/",
        maxAge: 15 * 60 * 1000,
      })
      .status(200)
      .json({ ok: true });
  });

  router.post("/logout", authenticate, async (req, res) => {
    const refreshToken = req.cookies?.refresh_token;
    if (typeof refreshToken === "string" && refreshToken.length > 0) {
      const verification = await verifyRefreshToken(refreshToken);
      if (verification?.stored) {
        revokeRefreshToken(verification.stored.id);
      }
    }

    res
      .clearCookie("access_token", { path: "/" })
      .clearCookie("refresh_token", { path: "/" })
      .status(200)
      .json({ ok: true });
  });

  router.post("/reset-password/request", async (req, res) => {
    const parse = passwordResetSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({ error: "Invalid email" });
    }

    const { email } = parse.data;
    const emailLower = email.toLowerCase();

    const user = store
      .getUsers()
      .find((u) => u.email.toLowerCase() === emailLower);
    if (!user) {
      return res
        .status(404)
        .json({ error: "We couldn't find an account with that email." });
    }

    const token = `reset-${randomUUID()}`;
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    // Store reset token in a map (in production, use database)
    (store as any).passwordResets = (store as any).passwordResets || new Map();
    (store as any).passwordResets.set(token, {
      userId: user.id,
      email: user.email,
      expiresAt,
      used: false,
    });

    res.json({
      success: true,
      token,
      expiresAt,
      message: "Password reset link sent. Check your email.",
    });
  });

  router.post("/reset-password/complete", async (req, res) => {
    const parse = completeResetSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({ error: "Invalid request" });
    }

    const { token, newPassword } = parse.data;

    const resetMap = (store as any).passwordResets as Map<string, any>;
    const resetData = resetMap?.get(token);

    if (!resetData) {
      return res.status(400).json({ error: "Invalid or expired reset token" });
    }

    if (new Date(resetData.expiresAt) < new Date()) {
      resetMap?.delete(token);
      return res
        .status(400)
        .json({ error: "Reset link has expired. Request a new one." });
    }

    if (resetData.used) {
      return res
        .status(400)
        .json({ error: "Reset link has already been used." });
    }

    const user = store.getUser(resetData.userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Update password (using the internal map since store doesn't have a method for this)
    const usersMap = (store as any).users as Map<string, any>;
    const hashedPassword = await import("bcryptjs").then((bcrypt) =>
      bcrypt.hash(newPassword, 10),
    );

    usersMap.set(user.id, {
      ...user,
      passwordHash: hashedPassword,
    });

    // Mark token as used
    resetData.used = true;

    res.json({
      success: true,
      message:
        "Password reset successfully. Please sign in with your new password.",
    });
  });

  return router;
};

export const authRouter = createAuthRouter();
