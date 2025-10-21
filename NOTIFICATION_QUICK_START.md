# Notification System - Quick Start Guide

## What Was Built

A fully functional, real-time notification system that replaces mock data with actual database-backed notifications. Users now see:

- **Real notifications** when they receive messages
- **Seller notifications** when someone favorites their item
- **Admin notifications** when listings are removed
- **Status updates** for their account and transactions

## How to Use

### For End Users

1. **Open the notification bell** (top right of the header)
2. **See real notifications** from your interactions:
   - New messages from other users
   - Someone favorited your item
   - Your listing was removed
   - And more...
3. **Click any notification** to navigate to the related content
4. **Dismiss notifications** by clicking the X button
5. **Mark all as read** using the button in the notification header

### For Developers

#### Create a Notification Programmatically

```typescript
import { createNotification } from "./notification-helpers";

await createNotification({
  userId: "user-123",
  type: "message",
  title: "New message from John Smith",
  description: "John sent you a message about 'PS5 Console'",
  actorId: "john-456",
  targetId: "thread-789",
  targetType: "thread",
  data: {
    listingId: "listing-123",
    messagePreview: "Are you still selling this?",
  },
});
```

#### Fetch User's Notifications

```typescript
import { notifications } from "@/lib/api";

const response = await notifications.getNotifications(50, 0);
console.log(response.notifications); // Array of notifications
console.log(response.unreadCount); // Number of unread
```

#### Mark Notification as Read

```typescript
await notifications.markAsRead("notification-id");
```

#### Get Unread Count

```typescript
const count = await notifications.getUnreadCount();
console.log(count.unreadCount); // e.g., 5
```

## Available Notification Types

| Type                   | Icon | Color | Triggered When             | Goes To        |
| ---------------------- | ---- | ----- | -------------------------- | -------------- |
| `message`              | 💬   | Blue  | New message received       | Message thread |
| `item_favorited`       | ❤️   | Rose  | Someone saves your item    | Listing detail |
| `item_sold`            | ✓    | Green | Your item is sold          | Listing detail |
| `listing_removed`      | ⚠️   | Amber | Admin removes listing      | -              |
| `verification_needed`  | ⚠️   | Amber | Account needs verification | Settings       |
| `offer_received`       | 💬   | Blue  | Someone makes offer        | Message thread |
| `offer_accepted`       | ✓    | Green | Your offer was accepted    | Transaction    |
| `offer_declined`       | ⚠️   | Amber | Your offer was declined    | Listing        |
| `transaction_complete` | ✓    | Green | Transaction completed      | Ratings        |

## Integration Points

### Messages Endpoint

When a message is sent, the **recipient automatically receives** a notification.

```typescript
// netlify/functions/messages.ts
// Automatically creates notification when message is posted
```

### Saved Listings Endpoint

When an item is favorited, the **seller automatically receives** a notification.

```typescript
// netlify/functions/saved-listings.ts
// Automatically creates notification when item is saved
```

### Listings Endpoint

When a listing is deleted, the **seller automatically receives** a notification.

```typescript
// netlify/functions/listings.ts
// Automatically creates notification when listing is deleted
```

## Database Structure

### Notifications Table

- **id**: Unique identifier (UUID)
- **user_id**: Who receives the notification
- **type**: Type of notification (message, item_favorited, etc.)
- **title**: Short notification title
- **description**: Longer description
- **actor_id**: Who triggered the notification (optional)
- **target_id**: Related listing/thread/user ID (optional)
- **target_type**: Type of target (listing/thread/user)
- **data**: Additional context as JSON
- **read**: Whether user has read it
- **dismissed**: Whether user dismissed it
- **created_at**: When it was created
- **read_at**: When it was marked as read
- **dismissed_at**: When it was dismissed

## Key Features

✨ **Smart Styling**

- Each notification type has its own color and icon
- Dark mode support built-in
- Responsive design

📱 **User-Friendly**

- Click to navigate to related content
- Dismiss individual notifications
- Mark all as read at once
- Empty state message when no notifications

⚡ **Performance**

- Efficient database queries with proper indexes
- Lazy loading when sidebar opens
- Auto-refresh every 30 seconds
- Only fetch unread count periodically

🔒 **Secure**

- All notifications are user-specific
- Authentication required
- No data leakage between users

## Files Modified/Created

### New Files

- `supabase/migrations/011_add_notifications.sql` - Database schema
- `netlify/functions/notifications.ts` - API endpoints
- `netlify/functions/notification-helpers.ts` - Helper functions
- `netlify/functions/create-notification.ts` - Internal creation endpoint
- `client/components/layout/NotificationItem.tsx` - Notification display component
- `NOTIFICATION_SYSTEM_IMPLEMENTATION.md` - Full documentation
- `NOTIFICATION_QUICK_START.md` - This file

### Modified Files

- `client/components/layout/Header.tsx` - Integrated real notifications
- `client/types.ts` - Added Notification types
- `client/lib/api.ts` - Added notification API methods
- `netlify/functions/messages.ts` - Auto-create message notifications
- `netlify/functions/saved-listings.ts` - Auto-create favorite notifications
- `netlify/functions/listings.ts` - Auto-create removal notifications

## Testing Scenarios

### Test 1: Send a Message

1. Log in as User A
2. Create a message thread with User B
3. Send a message
4. Log in as User B
5. Check notifications bell
6. **Expected:** See "New message from User A" notification
7. **Click it:** Should navigate to the message thread

### Test 2: Favorite an Item

1. Log in as User A (seller with a listing)
2. Log in as User B (buyer, different browser/session)
3. Navigate to User A's listing
4. Click the heart icon to favorite
5. Log back in as User A
6. Check notifications bell
7. **Expected:** See "User B favorited your item" notification
8. **Click it:** Should navigate to the listing detail

### Test 3: Listing Removal

1. Log in as Admin
2. Go to admin panel
3. Remove a listing for violating guidelines
4. Log in as the seller
5. Check notifications bell
6. **Expected:** See "Your listing was removed" notification with reason

### Test 4: Mark All as Read

1. Have multiple unread notifications
2. Click "Mark all as read" in notification header
3. **Expected:** All notifications marked as read, count badge removed

### Test 5: Dismiss Notification

1. Have an open notification
2. Click the X button
3. **Expected:** Notification disappears from list

## API Endpoints Reference

```
GET  /api/notifications?limit=50&offset=0&unread=true
GET  /api/notifications/count
PATCH /api/notifications/:id/read
PATCH /api/notifications/:id/dismiss
PATCH /api/notifications/read-all
POST  /api/create-notification (internal)
```

## Environment & Dependencies

No new npm packages required. Uses existing dependencies:

- `date-fns` - Already in project (for time formatting)
- `lucide-react` - Already in project (for icons)
- `react` & `react-router-dom` - Core dependencies
- `tailwindcss` - For styling

## Troubleshooting

### Notifications not appearing?

1. Check browser console for errors
2. Verify notifications table exists in database
3. Check that user is authenticated (userId in cookies)
4. Ensure notification API endpoints are accessible

### Wrong notification count?

1. Clear browser cache
2. Refresh the page
3. Check that dismissed notifications are not being counted

### Notifications not auto-updating?

1. The system refreshes every 30 seconds
2. Or when you open the notification sidebar
3. For real-time, WebSocket integration can be added

### Performance issues?

1. Check database indexes are created
2. Verify pagination is working (limit/offset)
3. Consider archiving old notifications if DB grows large

## Future Enhancements

1. **WebSocket Integration** - Real-time push notifications
2. **Email Notifications** - Send important notifications via email
3. **Push Notifications** - Browser/mobile push support
4. **Notification Preferences** - Let users customize which they receive
5. **Notification Archive** - Archive instead of delete
6. **Quick Actions** - Add buttons to notifications (Reply, Accept, etc.)
7. **Notification Templates** - Customizable notification text
8. **Notification Batching** - Group similar notifications

## Support

For questions or issues:

1. Check the full documentation: `NOTIFICATION_SYSTEM_IMPLEMENTATION.md`
2. Review the code in the files listed above
3. Check the database migration for schema details
4. Verify all endpoints are properly registered in Netlify

## Summary

The notification system is now:

- ✅ **Fully functional** with real data
- ✅ **User-friendly** with beautiful UI
- ✅ **Performance-optimized** with proper indexing
- ✅ **Extensible** for future notification types
- ✅ **Production-ready** with error handling
- ✅ **Well-documented** for developers
