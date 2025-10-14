import type { NextFunction, Request, Response } from "express";

import { store } from "../data/store";
import { verifyAccessToken } from "../security/auth";

export interface AuthenticatedUser {
  id: string;
  role: "member" | "moderator" | "admin";
  baseId: string;
  scope?: string[];
}

export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
}

const extractBearerToken = (req: Request) => {
  const header = req.headers.authorization;
  if (typeof header === "string" && header.startsWith("Bearer ")) {
    return header.slice("Bearer ".length).trim();
  }
  const cookieToken = req.cookies?.access_token;
  if (typeof cookieToken === "string" && cookieToken.length > 0) {
    return cookieToken;
  }
  return null;
};

export const authenticate = (req: AuthenticatedRequest, _res: Response, next: NextFunction) => {
  const token = extractBearerToken(req);
  if (!token) {
    return next();
  }
  const payload = verifyAccessToken(token);
  if (!payload) {
    return next();
  }

  const user = store.getUser(payload.sub);
  if (!user) {
    return next();
  }

  req.user = {
    id: user.id,
    role: user.role,
    baseId: user.baseId,
    scope: payload.scope,
  };

  return next();
};

export const requireAuth = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  return next();
};

export const requireAdmin = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  if (req.user.role !== "admin" && req.user.role !== "moderator") {
    return res.status(403).json({ error: "Admin access required" });
  }
  return next();
};
