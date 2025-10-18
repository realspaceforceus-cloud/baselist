import fs from "fs";
import path from "path";
import { Request, Response, NextFunction } from "express";

/**
 * Check if setup is complete
 * If not complete, return 503 Service Unavailable with redirect to /setup
 */
export function checkSetupComplete(
  _req: Request,
  res: Response,
  next: NextFunction
) {
  const setupCompleteFile = path.join(process.cwd(), ".setup-complete");
  const isSetupComplete = fs.existsSync(setupCompleteFile);

  // If setup is not complete, we'll let the app know
  // The frontend will redirect to /setup if needed
  res.locals.isSetupComplete = isSetupComplete;
  next();
}

/**
 * Require setup to be complete
 * If not, respond with error
 */
export function requireSetupComplete(
  _req: Request,
  res: Response,
  next: NextFunction
) {
  const setupCompleteFile = path.join(process.cwd(), ".setup-complete");
  const isSetupComplete = fs.existsSync(setupCompleteFile);

  if (!isSetupComplete) {
    return res.status(503).json({
      error: "Setup not completed",
      message:
        "Please complete the setup wizard at /setup before using the application",
      redirect: "/setup",
    });
  }

  next();
}

/**
 * Allow access only if setup is NOT complete
 * Used for setup page itself
 */
export function requireSetupIncomplete(
  _req: Request,
  res: Response,
  next: NextFunction
) {
  const setupCompleteFile = path.join(process.cwd(), ".setup-complete");
  const isSetupComplete = fs.existsSync(setupCompleteFile);

  if (isSetupComplete) {
    return res.status(403).json({
      error: "Setup already completed",
      message: "The application has already been set up. Setup wizard is disabled.",
      redirect: "/",
    });
  }

  next();
}
