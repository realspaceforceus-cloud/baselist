import rateLimit from "express-rate-limit";

const windowMs = 60 * 1000;

export const loginLimiter = rateLimit({
  windowMs,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "Too many login attempts. Try again in a minute.",
  },
});

export const messagingLimiter = rateLimit({
  windowMs,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "Slow down. Messages are limited to protect the community.",
  },
});

export const postingLimiter = rateLimit({
  windowMs,
  max: 6,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "You are posting too quickly. Please wait a moment.",
  },
});
