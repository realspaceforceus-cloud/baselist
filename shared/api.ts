import type {
  AuditEntry,
  BaseRecord,
  ListingRecord,
  MessageThreadRecord,
  ReportRecord,
  UserRecord,
  VerificationRecord,
} from "./admin";

/**
 * Shared code between client and server
 * Useful to share types between client and server
 * and/or small pure JS functions that can be used on both client and server
 */

/**
 * Example response type for /api/demo
 */
export interface DemoResponse {
  message: string;
}

export type AdminUserDTO = Omit<UserRecord, "passwordHash">;

export interface AdminDashboardResponse {
  verifiedMembers: number;
  totalListings: number;
  soldListings: number;
  openReports: number;
  manualVerificationBacklog: number;
}

export interface AdminMetricsResponse {
  snapshot: AdminDashboardResponse;
  totals: {
    transactions: number;
    ratings: number;
  };
}

export interface AdminUsersResponse {
  users: AdminUserDTO[];
}

export interface AdminUserUpdateResponse {
  user: Pick<AdminUserDTO, "id" | "username" | "role" | "status" | "dodVerifiedAt">;
}

export interface AdminListingsResponse {
  listings: ListingRecord[];
}

export interface AdminListingMutationResponse {
  listingId: string;
  status: ListingRecord["status"];
}

export interface AdminReportsResponse {
  reports: ReportRecord[];
}

export interface AdminReportMutationResponse {
  report: ReportRecord;
}

export interface AdminVerificationsResponse {
  verifications: VerificationRecord[];
}

export interface AdminVerificationMutationResponse {
  verification: VerificationRecord;
}

export interface AdminBasesResponse {
  bases: BaseRecord[];
}

export interface AdminBaseMutationResponse {
  base: BaseRecord;
}

export interface AdminAuditResponse {
  audit: AuditEntry[];
}

export interface AdminThreadsResponse {
  threads: MessageThreadRecord[];
}
