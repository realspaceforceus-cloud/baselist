import { Router } from "express";
import { z } from "zod";

import { store } from "../data/store";
import { authenticate, requireAuth } from "../middleware/authenticate";
import {
  compareRefreshToken,
  createAccessToken,
  createRefreshToken,
  revokeRefreshToken,
  verifyPassword,
  verifyRefreshToken,
} from "../security/auth";
import { loginLimiter } from "../security/rateLimits";

const loginSchema = z.object({
  identifier: z.string().trim().min(3),
  password: z.string().min(8),
  rememberDevice: z.boolean().optional(),
  deviceId: z.string().trim().min(6).default(() => crypto.randomUUID()),
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

    const { rawToken: refreshToken, refreshTokenRecord } = await createRefreshToken(
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
        maxAge: 15 * 60 * 1000,
      })
      .cookie("refresh_token", refreshToken, {
        httpOnly: true,
        secure: true,
        sameSite: "strict",
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
          dodVerifiedAt: user.dodVerifiedAt,
          avatarUrl: user.avatarUrl,
        },
        deviceId,
        refreshTokenId: refreshTokenRecord.id,
      });
  });

  router.post("/refresh", authenticate, requireAuth, async (req, res) => {
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
    const isMatch = await compareRefreshToken(refreshToken, stored);
    if (!isMatch) {
      return res.status(401).json({ error: "Refresh token invalid" });
    }

    const user = store.getUser(stored.userId);
    if (!user) {
      revokeRefreshToken(stored.id);
      return res.status(401).json({ error: "User not found" });
    }

    const accessToken = createAccessToken({
      sub: user.id,
      role: user.role,
      baseId: user.baseId,
      scope: req.user?.scope ?? ["read:admin", "write:admin"],
    });

    res
      .cookie("access_token", accessToken, {
        httpOnly: true,
        secure: true,
        sameSite: "strict",
        maxAge: 15 * 60 * 1000,
      })
      .status(200)
      .json({ ok: true });
  });

  router.post("/logout", authenticate, requireAuth, async (req, res) => {
    const refreshToken = req.cookies?.refresh_token;
    if (typeof refreshToken === "string" && refreshToken.length > 0) {
      const verification = await verifyRefreshToken(refreshToken);
      if (verification?.stored) {
        revokeRefreshToken(verification.stored.id);
      }
    }

    res
      .clearCookie("access_token")
      .clearCookie("refresh_token")
      .status(200)
      .json({ ok: true });
  });

  return router;
};

export const authRouter = createAuthRouter();
