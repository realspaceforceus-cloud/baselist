import "dotenv/config";
import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import helmet from "helmet";

import { authRouter } from "./routes/auth";
import { adminRouter } from "./routes/admin";
import { userRouter } from "./routes/user";
import { settingsRouter } from "./routes/settings";
import { emailRouter } from "./routes/email";
import { handleDemo } from "./routes/demo";
import { checkSetupComplete } from "./middleware/setupCheck";

export function createServer() {
  const app = express();

  app.set("trust proxy", 1);

  // Middleware
  app.use(
    helmet({
      crossOriginEmbedderPolicy: false,
      crossOriginResourcePolicy: { policy: "cross-origin" },
    }),
  );
  app.use(
    helmet.hsts({
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    }),
  );
  app.use(
    cors({
      origin: process.env.CORS_ORIGIN?.split(",") ?? ["http://localhost:5173"],
      credentials: true,
    }),
  );
  app.use(cookieParser());
  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ extended: true }));

  // Setup middleware
  app.use(checkSetupComplete);

  // Example API routes
  app.get("/api/ping", (_req, res) => {
    const ping = process.env.PING_MESSAGE ?? "ping";
    res.json({ message: ping });
  });

  app.get("/api/demo", handleDemo);
  app.use("/api/settings", settingsRouter);
  app.use("/api/auth", authRouter);
  app.use("/api/admin", adminRouter);
  app.use("/api/user", userRouter);
  app.use("/api/email", emailRouter);

  return app;
}
