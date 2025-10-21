import { apiRequest } from "./apiClient";

// Auth endpoints
export const auth = {
  register: async (
    email: string,
    password: string,
    username: string,
    baseId: string,
  ) => {
    return apiRequest<{ success: boolean; userId: string }>(
      "/api/auth/register",
      {
        method: "POST",
        body: JSON.stringify({ email, password, username, baseId }),
      },
    );
  },

  login: async (email: string, password: string) => {
    return apiRequest<{
      success: boolean;
      user: {
        id: string;
        email: string;
        username: string;
        role: string;
        baseId: string;
      };
    }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
  },
};

// Setup endpoints
export const setup = {
  checkStatus: async () => {
    return apiRequest<{ isSetupComplete: boolean }>("/api/setup/status", {
      method: "GET",
    });
  },

  initialize: async (
    adminEmail: string,
    adminPassword: string,
    adminUsername: string,
    baseId: string,
    includeSampleData?: boolean,
  ) => {
    return apiRequest<{
      success: boolean;
      message: string;
      adminId: string;
    }>("/api/setup/initialize", {
      method: "POST",
      body: JSON.stringify({
        adminEmail,
        adminPassword,
        adminUsername,
        baseId,
        includeSampleData,
      }),
    });
  },
};

// Listings endpoints
export const listings = {
  getAll: async () => {
    return apiRequest<any[]>("/api/listings", {
      method: "GET",
    });
  },

  getById: async (id: string) => {
    return apiRequest<any>(`/api/listings/${id}`, {
      method: "GET",
    });
  },

  create: async (data: {
    title: string;
    price: number;
    isFree: boolean;
    category: string;
    description?: string;
    imageUrls?: string[];
    baseId: string;
    sellerId: string;
  }) => {
    return apiRequest<any>("/api/listings", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  update: async (id: string, updates: Partial<any>) => {
    return apiRequest<any>(`/api/listings/${id}`, {
      method: "PUT",
      body: JSON.stringify(updates),
    });
  },

  delete: async (id: string) => {
    return apiRequest<{ success: boolean }>(`/api/listings/${id}`, {
      method: "DELETE",
    });
  },
};

// User endpoints
export const users = {
  getProfile: async (id: string) => {
    return apiRequest<any>(`/api/users/${id}`, {
      method: "GET",
    });
  },

  updateProfile: async (name: string) => {
    return apiRequest<{ success: boolean; message: string; name: string }>(
      "/api/users/profile/update",
      {
        method: "POST",
        body: JSON.stringify({ name }),
      },
    );
  },

  requestEmailChange: async (newEmail: string) => {
    return apiRequest<{ success: boolean; message: string }>(
      "/api/users/email/request-change",
      {
        method: "POST",
        body: JSON.stringify({ newEmail }),
      },
    );
  },

  changePassword: async (currentPassword: string, newPassword: string) => {
    return apiRequest<{ success: boolean; message: string }>(
      "/api/users/password/change",
      {
        method: "POST",
        body: JSON.stringify({ currentPassword, newPassword }),
      },
    );
  },

  deleteAccount: async () => {
    return apiRequest<{ success: boolean; message: string }>(
      "/api/users/account/delete",
      {
        method: "POST",
      },
    );
  },
};

// Messages endpoints
export const messages = {
  getThread: async (threadId: string) => {
    return apiRequest<any[]>(`/api/messages/thread/${threadId}`, {
      method: "GET",
    });
  },

  sendMessage: async (threadId: string, authorId: string, body: string) => {
    return apiRequest<any>("/api/messages", {
      method: "POST",
      body: JSON.stringify({ threadId, authorId, body }),
    });
  },

  getThreads: async (userId: string) => {
    return apiRequest<any[]>(`/api/messages/threads/${userId}`, {
      method: "GET",
    });
  },

  createThread: async (listingId: string, participants: string[]) => {
    return apiRequest<any>("/api/messages/thread", {
      method: "POST",
      body: JSON.stringify({ listingId, participants }),
    });
  },
};

// Notifications endpoints
export const notifications = {
  getNotifications: async (limit = 50, offset = 0, unreadOnly = false) => {
    const params = new URLSearchParams();
    params.append("limit", limit.toString());
    params.append("offset", offset.toString());
    if (unreadOnly) params.append("unread", "true");
    return apiRequest<{
      notifications: any[];
      unreadCount: number;
      total: number;
    }>(`/api/notifications?${params.toString()}`, {
      method: "GET",
    });
  },

  getUnreadCount: async () => {
    return apiRequest<{ unreadCount: number }>("/api/notifications/count", {
      method: "GET",
    });
  },

  markAsRead: async (notificationId: string) => {
    return apiRequest<any>(`/api/notifications/${notificationId}/read`, {
      method: "PATCH",
    });
  },

  dismiss: async (notificationId: string) => {
    return apiRequest<any>(`/api/notifications/${notificationId}/dismiss`, {
      method: "PATCH",
    });
  },

  markAllAsRead: async () => {
    return apiRequest<{ success: boolean }>("/api/notifications/read-all", {
      method: "PATCH",
    });
  },
};
