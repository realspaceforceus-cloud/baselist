import {
  type AdminAuditResponse,
  type AdminBaseMutationResponse,
  type AdminBasesResponse,
  type AdminDashboardResponse,
  type AdminListingsResponse,
  type AdminListingMutationResponse,
  type AdminMetricsResponse,
  type AdminReportMutationResponse,
  type AdminReportsResponse,
  type AdminThreadsResponse,
  type AdminUserDTO,
  type AdminUserUpdateResponse,
  type AdminUsersResponse,
  type AdminVerificationMutationResponse,
  type AdminVerificationsResponse,
} from "@shared/api";

import { apiRequest } from "./apiClient";

const ADMIN_BASE = "/api/admin";

export type UpdateUserPayload = {
  status?: "active" | "suspended" | "banned";
  role?: "member" | "moderator" | "admin";
  verify?: boolean;
  reason?: string;
};

export type ResolveReportPayload = {
  status: "resolved" | "dismissed";
  notes: string;
};

export type AdjudicateVerificationPayload = {
  status: "approved" | "denied";
  notes?: string;
};

export type HideListingPayload = {
  reason: string;
};

export type CreateBasePayload = {
  id: string;
  name: string;
  abbreviation: string;
  region: string;
  timezone: string;
  latitude: number;
  longitude: number;
};

export type UpdateBasePayload = Partial<Omit<CreateBasePayload, "id" | "latitude" | "longitude">> & {
  latitude?: number;
  longitude?: number;
};

export const adminApi = {
  async getDashboard(): Promise<AdminDashboardResponse> {
    return apiRequest<AdminDashboardResponse>(`${ADMIN_BASE}/dashboard`);
  },
  async getMetrics(): Promise<AdminMetricsResponse> {
    return apiRequest<AdminMetricsResponse>(`${ADMIN_BASE}/metrics`);
  },
  async getUsers(): Promise<AdminUserDTO[]> {
    const { users } = await apiRequest<AdminUsersResponse>(`${ADMIN_BASE}/users`);
    return users;
  },
  async updateUser(userId: string, payload: UpdateUserPayload): Promise<AdminUserUpdateResponse["user"]> {
    const { user } = await apiRequest<AdminUserUpdateResponse>(`${ADMIN_BASE}/users/${userId}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
    return user;
  },
  async getListings() {
    return apiRequest<AdminListingsResponse>(`${ADMIN_BASE}/listings`);
  },
  async hideListing(listingId: string, payload: HideListingPayload) {
    return apiRequest<AdminListingMutationResponse>(`${ADMIN_BASE}/listings/${listingId}/hide`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
  async restoreListing(listingId: string) {
    return apiRequest<AdminListingMutationResponse>(`${ADMIN_BASE}/listings/${listingId}/restore`, {
      method: "POST",
    });
  },
  async getReports() {
    return apiRequest<AdminReportsResponse>(`${ADMIN_BASE}/reports`);
  },
  async resolveReport(reportId: string, payload: ResolveReportPayload) {
    return apiRequest<AdminReportMutationResponse>(`${ADMIN_BASE}/reports/${reportId}/resolve`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
  async getVerifications() {
    return apiRequest<AdminVerificationsResponse>(`${ADMIN_BASE}/verifications`);
  },
  async adjudicateVerification(verificationId: string, payload: AdjudicateVerificationPayload) {
    return apiRequest<AdminVerificationMutationResponse>(`${ADMIN_BASE}/verifications/${verificationId}`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
  async getBases() {
    return apiRequest<AdminBasesResponse>(`${ADMIN_BASE}/bases`);
  },
  async createBase(payload: CreateBasePayload) {
    return apiRequest<AdminBaseMutationResponse>(`${ADMIN_BASE}/bases`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
  async updateBase(baseId: string, payload: UpdateBasePayload) {
    return apiRequest<AdminBaseMutationResponse>(`${ADMIN_BASE}/bases/${baseId}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  },
  async getAudit(limit = 200) {
    const { audit } = await apiRequest<AdminAuditResponse>(`${ADMIN_BASE}/audit`);
    return limit ? audit.slice(0, limit) : audit;
  },
  async getThreads() {
    return apiRequest<AdminThreadsResponse>(`${ADMIN_BASE}/threads`);
  },
  async getFlaggedThreads() {
    return apiRequest<AdminThreadsResponse>(`${ADMIN_BASE}/threads/flagged`);
  },
};
