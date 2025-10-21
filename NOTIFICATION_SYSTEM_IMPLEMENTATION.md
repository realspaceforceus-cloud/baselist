# Notification System Implementation Summary

## Overview

A complete, functional notification system has been implemented to replace the mock notification data in the application. The system provides real-time notifications for various user interactions and admin actions.

## Database Schema

### Notifications Table

```sql
CREATE TABLE notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  type TEXT NOT NULL (message, item_sold, item_favorited, listing_removed, verification_needed, offer_received, offer_accepted, offer_declined, transaction_complete),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  actor_id TEXT REFERENCES users(id),
  target_id TEXT,
  target_type TEXT (listing, thread, user),
  data JSONB DEFAULT '{}',
  read BOOLEAN DEFAULT FALSE,
  dismissed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  read_at TIMESTAMP,
  dismissed_at TIMESTAMP
);
```

Indexes:

- `idx_notifications_user_id` - for filtering by user
- `idx_notifications_user_id_read` - for unread counts
- `idx_notifications_user_id_created_at` - for sorting by time
- `idx_notifications_created_at` - for overall sorting

## API Endpoints

### `/api/notifications` (GET)

Fetches notifications for the current user.

**Query Parameters:**

- `limit` (optional, default 50) - number of notifications to fetch
- `offset` (optional, default 0) - pagination offset
- `unread` (optional) - if "true", returns only unread notifications

**Response:**

```json
{
  "notifications": [...],
  "unreadCount": 5,
  "total": 50
}
```

### `/api/notifications/count` (GET)

Gets the unread notification count for the current user.

**Response:**

```json
{
  "unreadCount": 5
}
```

### `/api/notifications/:id/read` (PATCH)

Marks a specific notification as read.

### `/api/notifications/:id/dismiss` (PATCH)

Dismisses a notification (hides it from the list).

### `/api/notifications/read-all` (PATCH)

Marks all unread notifications as read.

### `/api/create-notification` (POST) - Internal

Internal endpoint for creating notifications from other services.

## Notification Types

### 1. **Message** (`message`)

- **Triggered:** When a user receives a message
- **Recipients:** Recipient of the message
- **Icon:** MessageSquare (Blue)
- **Example:** "New message from John Smith about 'PS5 Console'"
- **Action:** Click to navigate to the message thread

### 2. **Item Favorited** (`item_favorited`)

- **Triggered:** When someone saves/favorites an item
- **Recipients:** Seller of the item
- **Icon:** Heart (Rose)
- **Example:** "Jane Doe favorited 'Used Motorcycle'"
- **Action:** Click to view the listing

### 3. **Listing Removed** (`listing_removed`)

- **Triggered:** When an admin removes a listing
- **Recipients:** Seller of the listing
- **Icon:** AlertTriangle (Amber)
- **Example:** "Your listing 'Gaming PC' was removed. Reason: Listing violates community guidelines"
- **Action:** View the notification for details

### 4. **Item Sold** (`item_sold`)

- **Triggered:** When a listing status changes to sold
- **Recipients:** Seller of the item
- **Icon:** Check (Green)
- **Example:** "Your 'Furniture Set' has been sold!"

### 5. **Verification Needed** (`verification_needed`)

- **Triggered:** When a user needs to complete verification
- **Recipients:** User
- **Icon:** AlertTriangle (Amber)
- **Example:** "Complete your DoD verification to continue selling"

### 6. **Offer Received** (`offer_received`)

- **Triggered:** When someone makes an offer on an item
- **Recipients:** Seller
- **Icon:** MessageSquare (Blue)
- **Example:** "John Smith made an offer on 'Furniture Set'"

### 7. **Offer Accepted/Declined** (`offer_accepted`, `offer_declined`)

- **Triggered:** When an offer is accepted or declined
- **Recipients:** Offer maker
- **Icon:** Check (Green) / AlertTriangle (Amber)

### 8. **Transaction Complete** (`transaction_complete`)

- **Triggered:** When a transaction is completed
- **Recipients:** Both buyer and seller
- **Icon:** Check (Green)
- **Example:** "Your transaction for 'Gaming Laptop' is complete!"

## Frontend Components

### NotificationItem Component

**File:** `client/components/layout/NotificationItem.tsx`

Displays individual notifications with:

- Dynamic icon and color based on notification type
- Title and description
- Timestamp (relative, e.g., "2 hours ago")
- Dismiss button (X)
- Click handler for navigation
- Automatic marking as read on click

**Props:**

```typescript
interface NotificationItemProps {
  notification: Notification;
  onDismiss: (notificationId: string) => void;
}
```

### Header Component Updates

**File:** `client/components/layout/Header.tsx`

Enhanced with:

- Real notification loading via API
- Dynamic notification badge count
- Notification sidebar showing real notifications
- "Mark all as read" button
- Empty state when no notifications
- Loading state while fetching

**Features:**

- Auto-refresh notification count every 30 seconds
- Lazy-load notifications when sidebar opens
- Navigate to related content on notification click
- Dismiss individual notifications

## Helper Functions

### createNotification

**File:** `netlify/functions/notification-helpers.ts`

Creates a notification in the database.

```typescript
await createNotification({
  userId: "user-id",
  type: "message",
  title: "New message from John",
  description: "John sent you a message about 'PS5'",
  actorId: "john-id",
  targetId: "thread-id",
  targetType: "thread",
  data: { listingId: "listing-id" },
});
```

### getActorName

Fetches the username of the actor for notification display.

### getListingTitle

Fetches the title of a listing for notification context.

## Implementation in Existing Endpoints

### 1. Messages (`netlify/functions/messages.ts`)

When a message is sent, a notification is created for the recipient.

```typescript
await createNotification({
  userId: recipientId,
  type: "message",
  title: `New message from ${senderName}`,
  description: `${senderName} sent you a message about "${listingTitle}"`,
  actorId: authorId,
  targetId: threadId,
  targetType: "thread",
  data: { listingId, messagePreview: body.substring(0, 100) },
});
```

### 2. Saved Listings (`netlify/functions/saved-listings.ts`)

When an item is favorited, a notification is created for the seller.

```typescript
await createNotification({
  userId: seller_id,
  type: "item_favorited",
  title: `${userName} favorited "${title}"`,
  description: `Someone is interested in your listing. Reach out to them!`,
  actorId: userId,
  targetId: listingId,
  targetType: "listing",
  data: { listingTitle: title, buyerName: userName },
});
```

### 3. Listings (`netlify/functions/listings.ts`)

When a listing is deleted, a notification is created for the seller.

```typescript
await createNotification({
  userId: seller_id,
  type: "listing_removed",
  title: `Your listing was removed`,
  description: `Your listing "${title}" has been removed. Reason: ${reason}`,
  targetId: id,
  targetType: "listing",
  data: { listingTitle: title, reason },
});
```

## Type Definitions

**File:** `client/types.ts`

```typescript
export type NotificationType =
  | "message"
  | "item_sold"
  | "item_favorited"
  | "listing_removed"
  | "verification_needed"
  | "offer_received"
  | "offer_accepted"
  | "offer_declined"
  | "transaction_complete";

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  description: string;
  actorId?: string;
  targetId?: string;
  targetType?: "listing" | "thread" | "user";
  data?: Record<string, any>;
  read: boolean;
  dismissed: boolean;
  createdAt: string;
  readAt?: string;
  dismissedAt?: string;
}
```

## API Client Methods

**File:** `client/lib/api.ts`

```typescript
export const notifications = {
  getNotifications: async (limit = 50, offset = 0, unreadOnly = false),
  getUnreadCount: async (),
  markAsRead: async (notificationId: string),
  dismiss: async (notificationId: string),
  markAllAsRead: async (),
};
```

## Database Migration

**File:** `supabase/migrations/011_add_notifications.sql`

Creates the notifications table with proper indexes for efficient querying.

## Features

✅ **Real-time notifications** - Replace mock data with actual database records
✅ **Multiple notification types** - Message, favorites, removals, verifications, etc.
✅ **Read/unread status** - Track which notifications users have seen
✅ **Dismissal** - Users can dismiss notifications individually or all at once
✅ **Navigation** - Click notifications to navigate to related content
✅ **Auto-refresh** - Notification count refreshes every 30 seconds
✅ **Dynamic styling** - Each notification type has its own color and icon
✅ **Empty state** - Friendly message when no notifications exist
✅ **Loading states** - Shows loading indicator while fetching

## User Actions

When a user interacts with notifications:

1. **Click notification** - Marks as read and navigates to related content
2. **Dismiss notification** - Removes from the notification list
3. **Mark all as read** - Marks all unread notifications as read
4. **Open notification sidebar** - Loads up to 50 notifications

## Future Enhancements

1. **Real-time updates** - WebSocket support for instant notifications
2. **Push notifications** - Browser/mobile push notification support
3. **Email notifications** - Send notifications via email
4. **Notification preferences** - Let users customize notification settings
5. **Batch notifications** - Group similar notifications together
6. **Notification actions** - Add quick-action buttons to notifications
7. **Archive functionality** - Archive notifications instead of just dismissing

## Testing

To test the notification system:

1. **Send a message** - Recipient should see a "New message" notification
2. **Favorite an item** - Seller should see an "Item favorited" notification
3. **Remove a listing** - Seller should see a "Listing removed" notification
4. **Check notification count** - Bell icon should show the correct count
5. **Mark as read** - Clicking a notification should mark it as read
6. **Dismiss** - Clicking the X button should dismiss the notification
7. **Navigation** - Clicking a message notification should navigate to the thread

## Migration Steps

To apply the database migration:

```bash
# The migration file is at: supabase/migrations/011_add_notifications.sql
# Apply it to your Supabase database using the CLI or dashboard
```

## Notes

- Notifications are user-specific (stored in database with user_id)
- All notification operations are authenticated (require userId in cookies)
- Dismissed notifications are hidden but not deleted (can be recovered if needed)
- Notification data is stored as JSONB for flexibility in storing additional context
- The system is extensible - new notification types can be added easily
- Error handling is in place to ensure notification creation failures don't break user workflows
