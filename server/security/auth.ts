import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { randomUUID } from "crypto";

import type { RefreshTokenRecord, UserRecord } from "../data/store";
import { store } from "../data/store";

const ACCESS_TOKEN_TTL = "15m";
const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const JWT_SECRET = process.env.JWT_SECRET ?? "development-secret-change-me";
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET ?? "development-refresh-secret";

export interface AccessTokenPayload {
  sub: string;
  role: UserRecord["role"];
  baseId: string;
  scope?: string[];
}

export interface RefreshTokenPayload {
  sub: string;
  jti: string;
}

export interface SessionTokens {
  accessToken: string;
  refreshToken: string;
  refreshTokenRecord: RefreshTokenRecord;
}

export const verifyPassword = async (password: string, passwordHash: string) => {
  return bcrypt.compare(password, passwordHash);
};

export const hashPassword = async (password: string) => {
  const rounds = Number(process.env.BCRYPT_ROUNDS ?? 10);
  return bcrypt.hash(password, rounds);
};

export const createAccessToken = (payload: AccessTokenPayload) => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: ACCESS_TOKEN_TTL });
};

export const createRefreshToken = async (userId: string, deviceId: string, userAgent?: string) => {
  const jti = randomUUID();
  const rawToken = jwt.sign({ sub: userId, jti } satisfies RefreshTokenPayload, JWT_REFRESH_SECRET, {
    expiresIn: Math.floor(REFRESH_TOKEN_TTL_MS / 1000),
  });

  const tokenHash = await bcrypt.hash(rawToken, 10);
  const refreshTokenRecord = store.createRefreshToken(userId, deviceId, tokenHash, userAgent);

  return { rawToken, refreshTokenRecord };
};

export const verifyAccessToken = (token: string): AccessTokenPayload | null => {
  try {
    return jwt.verify(token, JWT_SECRET) as AccessTokenPayload;
  } catch (error) {
    return null;
  }
};

export const verifyRefreshToken = async (token: string) => {
  try {
    const payload = jwt.verify(token, JWT_REFRESH_SECRET) as RefreshTokenPayload;
    const stored = store.getRefreshTokenByHash(asyncHashComparisonToken(token));
    if (!stored || stored.userId !== payload.sub) {
      return null;
    }
    return { payload, stored };
  } catch (error) {
    return null;
  }
};

const asyncHashComparisonToken = (token: string) => token;

export const compareRefreshToken = async (token: string, record: RefreshTokenRecord) => {
  return bcrypt.compare(token, record.tokenHash);
};

export const revokeRefreshToken = (tokenId: string) => {
  return store.revokeRefreshToken(tokenId);
};
