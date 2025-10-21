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

export type UpdateBasePayload = Partial<
  Omit<CreateBasePayload, "id" | "latitude" | "longitude">
> & {
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
  async getUsers(
    page = 1,
    search = "",
  ): Promise<{
    users: AdminUserDTO[];
    pagination: { page: number; limit: number; total: number; pages: number };
  }> {
    const params = new URLSearchParams();
    if (page) params.set("page", page.toString());
    if (search) params.set("search", search);
    const url = `${ADMIN_BASE}/users?${params}`;
    const result = await apiRequest<{ users: AdminUserDTO[]; pagination: any }>(
      url,
    );
    return result;
  },
  async updateUser(
    userId: string,
    payload: UpdateUserPayload,
  ): Promise<AdminUserUpdateResponse["user"]> {
    const { user } = await apiRequest<AdminUserUpdateResponse>(
      `${ADMIN_BASE}/users/${userId}`,
      {
        method: "PATCH",
        body: JSON.stringify(payload),
      },
    );
    return user;
  },
  async getInvitationCodes(baseId?: string): Promise<any[]> {
    const params = baseId ? `?baseId=${baseId}` : "";
    const { codes } = await apiRequest<{ codes: any[] }>(
      `${ADMIN_BASE}/invitation-codes${params}`,
    );
    return codes;
  },
  async createInvitationCode(
    code: string,
    baseId: string,
    maxUses?: number,
    expiresAt?: string,
    description?: string,
  ): Promise<any> {
    const { code: newCode } = await apiRequest<{ code: any }>(
      `${ADMIN_BASE}/invitation-codes`,
      {
        method: "POST",
        body: JSON.stringify({ code, baseId, maxUses, expiresAt, description }),
      },
    );
    return newCode;
  },
  async deleteInvitationCode(codeId: string): Promise<void> {
    await apiRequest<void>(`${ADMIN_BASE}/invitation-codes/${codeId}`, {
      method: "DELETE",
    });
  },
  async getAccountNotes(userId: string): Promise<any[]> {
    const { notes } = await apiRequest<{ notes: any[] }>(
      `${ADMIN_BASE}/account-notes/${userId}`,
    );
    return notes;
  },
  async addAccountNote(
    userId: string,
    noteType: string,
    description: string,
    strikeReason?: string,
    severity?: string,
  ): Promise<any> {
    const { note } = await apiRequest<{ note: any }>(
      `${ADMIN_BASE}/account-notes/${userId}`,
      {
        method: "POST",
        body: JSON.stringify({ noteType, strikeReason, description, severity }),
      },
    );
    return note;
  },
  async getFailedLogins(limit = 100): Promise<any[]> {
    const { attempts } = await apiRequest<{ attempts: any[] }>(
      `${ADMIN_BASE}/failed-logins?limit=${limit}`,
    );
    return attempts;
  },
  async getIPBlacklist(): Promise<any[]> {
    const { blacklist } = await apiRequest<{ blacklist: any[] }>(
      `${ADMIN_BASE}/ip-blacklist`,
    );
    return blacklist;
  },
  async addIPToBlacklist(
    ipAddress: string,
    reason: string,
    notes?: string,
  ): Promise<any> {
    const { entry } = await apiRequest<{ entry: any }>(
      `${ADMIN_BASE}/ip-blacklist`,
      {
        method: "POST",
        body: JSON.stringify({ ipAddress, reason, notes }),
      },
    );
    return entry;
  },
  async removeIPFromBlacklist(entryId: string): Promise<void> {
    await apiRequest<void>(`${ADMIN_BASE}/ip-blacklist/${entryId}`, {
      method: "DELETE",
    });
  },
  async getListings() {
    return apiRequest<AdminListingsResponse>(`${ADMIN_BASE}/listings`);
  },
  async hideListing(listingId: string, payload: HideListingPayload) {
    return apiRequest<AdminListingMutationResponse>(
      `${ADMIN_BASE}/listings/${listingId}/hide`,
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
    );
  },
  async restoreListing(listingId: string) {
    return apiRequest<AdminListingMutationResponse>(
      `${ADMIN_BASE}/listings/${listingId}/restore`,
      {
        method: "POST",
      },
    );
  },
  async getReports() {
    return apiRequest<AdminReportsResponse>(`${ADMIN_BASE}/reports`);
  },
  async resolveReport(reportId: string, payload: ResolveReportPayload) {
    return apiRequest<AdminReportMutationResponse>(
      `${ADMIN_BASE}/reports/${reportId}/resolve`,
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
    );
  },
  async getVerifications() {
    return apiRequest<AdminVerificationsResponse>(
      `${ADMIN_BASE}/verifications`,
    );
  },
  async adjudicateVerification(
    verificationId: string,
    payload: AdjudicateVerificationPayload,
  ) {
    return apiRequest<AdminVerificationMutationResponse>(
      `${ADMIN_BASE}/verifications/${verificationId}`,
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
    );
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
    return apiRequest<AdminBaseMutationResponse>(
      `${ADMIN_BASE}/bases/${baseId}`,
      {
        method: "PATCH",
        body: JSON.stringify(payload),
      },
    );
  },
  async getAudit(limit = 200) {
    const { audit } = await apiRequest<AdminAuditResponse>(
      `${ADMIN_BASE}/audit`,
    );
    return limit ? audit.slice(0, limit) : audit;
  },
  async getThreads() {
    return apiRequest<AdminThreadsResponse>(`${ADMIN_BASE}/threads`);
  },
  async getFlaggedThreads() {
    return apiRequest<AdminThreadsResponse>(`${ADMIN_BASE}/threads/flagged`);
  },
  async getUserDetail(userId: string) {
    return apiRequest<any>(`${ADMIN_BASE}/users/${userId}/detail`);
  },
  async resetUserPassword(
    userId: string,
    options: { generateTemp?: boolean; sendEmail?: boolean },
  ) {
    return apiRequest<any>(`${ADMIN_BASE}/users/${userId}/password-reset`, {
      method: "POST",
      body: JSON.stringify(options),
    });
  },
  async removeStrike(userId: string, strikeId: string): Promise<void> {
    await apiRequest<void>(
      `${ADMIN_BASE}/users/${userId}/strikes/${strikeId}`,
      {
        method: "DELETE",
      },
    );
  },
  async addStrike(
    userId: string,
    strikeType: string,
    description: string,
    severity?: string,
  ): Promise<any> {
    const { note } = await apiRequest<{ note: any }>(
      `${ADMIN_BASE}/account-notes/${userId}`,
      {
        method: "POST",
        body: JSON.stringify({
          noteType: "strike",
          strikeReason: strikeType,
          description,
          severity: severity || "warning",
        }),
      },
    );
    return note;
  },
};
