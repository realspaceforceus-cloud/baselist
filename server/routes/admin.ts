import { Router } from "express";
import { z } from "zod";

import { store } from "../data/store";
import type { AuthenticatedRequest } from "../middleware/authenticate";
import { authenticate, requireAdmin } from "../middleware/authenticate";
import { sendTransactionalEmail } from "../services/email";

const updateUserSchema = z.object({
  status: z.enum(["active", "suspended", "banned"]).optional(),
  role: z.enum(["member", "moderator", "admin"]).optional(),
  verify: z.boolean().optional(),
  reason: z.string().trim().max(240).optional(),
});

const hideListingSchema = z.object({
  reason: z.string().trim().min(3).max(240),
});

const reportResolutionValues = ["resolved", "dismissed"] as const;
const resolveReportSchema = z.object({
  status: z.enum(reportResolutionValues),
  notes: z.string().trim().min(3).max(280),
});

const verificationDecisionValues = ["approved", "denied"] as const;
const adjudicateVerificationSchema = z.object({
  status: z.enum(verificationDecisionValues),
  notes: z.string().trim().max(280).optional(),
});

const createBaseSchema = z.object({
  id: z.string().trim().min(3),
  name: z.string().trim().min(3),
  abbreviation: z.string().trim().min(2).max(8),
  region: z.string().trim().min(3),
  timezone: z.string().trim().min(2).max(6),
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
});

const updateBaseSchema = z
  .object({
    name: z.string().trim().min(3).optional(),
    abbreviation: z.string().trim().min(2).max(8).optional(),
    region: z.string().trim().min(3).optional(),
    timezone: z.string().trim().min(2).max(6).optional(),
    latitude: z.coerce.number().min(-90).max(90).optional(),
    longitude: z.coerce.number().min(-180).max(180).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field is required",
  });

const router = Router();

router.use(authenticate);
router.use(requireAdmin);

router.get("/dashboard", (_req, res) => {
  const snapshot = store.getDashboardSnapshot();
  res.json(snapshot);
});

router.get("/users", (_req, res) => {
  const users = store.getUsers().map((user) => ({
    id: user.id,
    username: user.username,
    email: user.email,
    role: user.role,
    status: user.status,
    baseId: user.baseId,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    dodVerifiedAt: user.dodVerifiedAt,
    lastLoginAt: user.lastLoginAt,
    rememberDeviceUntil: user.rememberDeviceUntil,
    avatarUrl: user.avatarUrl,
  }));
  res.json({ users });
});

router.patch("/users/:id", (req: AuthenticatedRequest, res) => {
  const parse = updateUserSchema.safeParse(req.body);
  if (!parse.success) {
    return res.status(400).json({ error: "Invalid update payload" });
  }
  const updates = parse.data;

  const userId = req.params.id;
  const user = store.getUser(userId);
  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }

  const metadata: Record<string, unknown> = {};

  if (typeof updates.verify === "boolean") {
    metadata.verify = updates.verify;
  }
  if (updates.reason) {
    metadata.reason = updates.reason;
  }

  const updated = store.updateUserStatus(req.user!.id, userId, {
    status: updates.status ?? user.status,
    role: updates.role ?? user.role,
    dodVerifiedAt: updates.verify ? new Date().toISOString() : user.dodVerifiedAt,
  }, metadata);

  if (!updated) {
    return res.status(500).json({ error: "Unable to update user" });
  }

  res.json({
    user: {
      id: updated.id,
      username: updated.username,
      role: updated.role,
      status: updated.status,
      dodVerifiedAt: updated.dodVerifiedAt,
    },
  });
});

router.post("/listings/:id/hide", (req: AuthenticatedRequest, res) => {
  const parse = hideListingSchema.safeParse(req.body);
  if (!parse.success) {
    return res.status(400).json({ error: "Reason is required" });
  }
  const listing = store.hideListing(req.user!.id, req.params.id, parse.data.reason);
  if (!listing) {
    return res.status(404).json({ error: "Listing not found" });
  }
  res.json({ listingId: listing.id, status: listing.status });
});

router.post("/listings/:id/restore", (req: AuthenticatedRequest, res) => {
  const listing = store.restoreListing(req.user!.id, req.params.id);
  if (!listing) {
    return res.status(404).json({ error: "Listing not found" });
  }
  res.json({ listingId: listing.id, status: listing.status });
});

router.get("/listings", (_req, res) => {
  const listings = store.getListings();
  res.json({ listings });
});

router.get("/reports", (_req, res) => {
  const reports = store.getReports();
  res.json({ reports });
});

router.post("/reports/:id/resolve", (req: AuthenticatedRequest, res) => {
  const parse = resolveReportSchema.safeParse(req.body);
  if (!parse.success) {
    return res.status(400).json({ error: "Resolution notes are required" });
  }

  const report = store.resolveReport(req.user!.id, req.params.id, parse.data.notes, parse.data.status);
  if (!report) {
    return res.status(404).json({ error: "Report not found" });
  }

  res.json({ report });
});

router.get("/verifications", (_req, res) => {
  const verifications = store.getVerifications();
  res.json({ verifications });
});

router.post("/verifications/:id", (req: AuthenticatedRequest, res) => {
  const parse = adjudicateVerificationSchema.safeParse(req.body);
  if (!parse.success) {
    return res.status(400).json({ error: "Invalid adjudication payload" });
  }

  const verification = store.adjudicateVerification(
    req.user!.id,
    req.params.id,
    parse.data.status,
    parse.data.notes ? { notes: parse.data.notes } : {},
  );

  if (!verification) {
    return res.status(404).json({ error: "Verification not found" });
  }

  res.json({ verification });
});

router.get("/bases", (_req, res) => {
  res.json({ bases: store.getBases() });
});

router.post("/bases", (req: AuthenticatedRequest, res) => {
  const parse = createBaseSchema.safeParse(req.body);
  if (!parse.success) {
    return res.status(400).json({ error: "Invalid base payload" });
  }

  if (store.getBases().some((base) => base.id === parse.data.id)) {
    return res.status(409).json({ error: "Base already exists" });
  }

  const base = store.addBase(req.user!.id, {
    id: parse.data.id,
    name: parse.data.name,
    abbreviation: parse.data.abbreviation,
    region: parse.data.region,
    timezone: parse.data.timezone,
    latitude: parse.data.latitude,
    longitude: parse.data.longitude,
  });
  res.status(201).json({ base });
});

router.patch("/bases/:id", (req: AuthenticatedRequest, res) => {
  const parse = updateBaseSchema.safeParse(req.body);
  if (!parse.success) {
    return res.status(400).json({ error: parse.error.issues[0]?.message ?? "Invalid base payload" });
  }
  const base = store.updateBase(req.user!.id, req.params.id, parse.data);
  if (!base) {
    return res.status(404).json({ error: "Base not found" });
  }
  res.json({ base });
});

router.get("/audit", (_req, res) => {
  res.json({ audit: store.getAuditLog(200) });
});

router.get("/threads/flagged", (_req, res) => {
  const threads = store
    .getThreads()
    .filter((thread) => thread.status === "active")
    .slice(0, 10);
  res.json({ threads });
});

export const adminRouter = router;
