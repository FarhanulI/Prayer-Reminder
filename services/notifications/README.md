# Prayer Notification System

## Architecture Overview

The prayer notification system follows a clean architecture with clear separation of concerns:

```
AppBootstrap
     │
     ├─ usePrayerNotifications(prayerData)     [React Hook Layer]
     │       │
     │       ▼
     ├─ NotificationSchedulerService           [Business Logic Layer]
     │       │
     │       ▼
     ├─ expo-notifications                     [Infrastructure Layer]
     │
     └─ notification.storage                   [Persistence Layer]
```

## Components

### 1. **NotificationSchedulerService** (`services/notifications/NotificationSchedulerService.ts`)
- **Core Service** - Pure TypeScript class, completely independent from React
- **Responsibilities:**
  - Request and check notification permissions
  - Schedule notifications for today's prayers
  - Cancel previous prayer notifications
  - Prevent duplicate scheduling (idempotent)
  - Persist and restore notification IDs
  - Handle timezone and date changes

**Main API:**
```typescript
// Initialize on app startup
await NotificationSchedulerService.initialize();

// Schedule today's prayers (idempotent)
const result = await NotificationSchedulerService.scheduleTodaysPrayers(prayerData);

// Cancel all prayer notifications
await NotificationSchedulerService.cancelAllPrayerNotifications();
```

### 2. **usePrayerNotifications** (`bootstrap/hooks/usePrayerNotifications.ts`)
- **React Hook** - Integrates with AppBootstrap lifecycle
- **Responsibilities:**
  - Fetch today's prayer data via `useDashboardData`
  - Watch for changes in prayer data (Firestore real-time)
  - Delegate scheduling to `NotificationSchedulerService`
  - Automatically reschedule when data changes
  - Expose loading and error states

**Usage:**
```typescript
const { isLoading, error, retry } = usePrayerNotifications();
```

### 3. **Storage Layer** (`services/notifications/notification.storage.ts`)
- **AsyncStorage Persistence** - Stores notification metadata
- **Responsibilities:**
  - Save scheduled notification IDs
  - Retrieve notification metadata
  - Clean up expired notification data
  - Detect changes via data hashing

**Main API:**
```typescript
await saveNotificationIds(date, ids, hash);
const data = await getStoredNotificationData();
const isValid = await isStoredDataValid();
const changed = await hasDataChanged(newHash);
```

### 4. **Utility Functions** (`services/notifications/notification.utils.ts`)
- **Helper Functions** - Pure functions for data transformation
- **Responsibilities:**
  - Parse prayer times into notification objects
  - Validate prayer data
  - Calculate trigger times
  - Generate data hashes for change detection
  - Filter expired prayers

### 5. **Types & Constants** (`services/notifications/`)
- `notification.types.ts` - TypeScript type definitions
- `notification.constants.ts` - Configuration constants

---

## Integration with AppBootstrap

The notification system integrates seamlessly into the existing bootstrap flow:

```typescript
// bootstrap/hooks/useAppInitialization.ts
export const useAppInitialization = (): AppInitializationState => {
  const prayerLog = usePrayerLogBootstrap();
  const prayerLock = usePrayerLockBootstrap();
  const prayerNotifications = usePrayerNotifications(); // ✅ Integrated here
  const remoteConfig = useRemoteConfigBootstrap();
  const subscriptionSync = useSubscriptionBootstrap();

  // ... combines all tasks
};
```

**Execution Order:**
1. User authenticates
2. Today's prayer log is created (`usePrayerLogBootstrap`)
3. Prayer data is fetched (`useDashboardData` inside `usePrayerNotifications`)
4. Notifications are scheduled (`NotificationSchedulerService.scheduleTodaysPrayers`)

---

## Key Features

### ✅ **Idempotent Scheduling**
- Can call `scheduleTodaysPrayers` multiple times safely
- Uses data hashing to detect changes
- Skips scheduling if already scheduled and data unchanged

### ✅ **Automatic Rescheduling**
- Watches prayer data via Firestore real-time listener
- Automatically reschedules when prayer times change
- Handles date transitions (midnight crossover)

### ✅ **Smart Filtering**
- Only schedules future prayers
- Skips prayers that have already passed
- Cleans up expired data

### ✅ **Proper Persistence**
- Stores notification IDs in AsyncStorage
- Survives app restarts
- Cleans up stale data automatically

### ✅ **Error Handling**
- Comprehensive try-catch blocks
- Graceful degradation if permissions denied
- Detailed logging for debugging

### ✅ **Separation of Concerns**
- Business logic in service (testable, reusable)
- React integration in hook (lifecycle management)
- No notification logic in UI components

---

## Configuration

All configuration is centralized in `notification.constants.ts`:

```typescript
export const NOTIFICATION_CONFIG = {
  ADVANCE_MINUTES: 0,          // Minutes before prayer time
  VIBRATE: true,               // Enable vibration
  PLAY_SOUND: true,            // Enable sound
  CHANNEL_ID: "prayer-times",  // Android channel ID
  PRIORITY: "high",            // iOS priority
};
```

---

## Data Flow

### **Scheduling Flow:**
1. `usePrayerNotifications` fetches prayer data
2. Hook detects data is available
3. Hook calls `NotificationSchedulerService.scheduleTodaysPrayers(prayerData)`
4. Service validates prayer data
5. Service checks if rescheduling is needed (idempotency)
6. Service requests permissions if needed
7. Service cancels old notifications
8. Service parses prayer times and filters future prayers
9. Service schedules notifications via expo-notifications
10. Service persists notification IDs to AsyncStorage

### **Change Detection Flow:**
1. Firestore listener detects prayer data change
2. `useDashboardData` updates React Query cache
3. `usePrayerNotifications` query key changes
4. React Query triggers refetch
5. Service compares new data hash with stored hash
6. If different, service reschedules all notifications

---

## Testing

The architecture is designed for easy testing:

### **Unit Testing the Service:**
```typescript
// Mock expo-notifications
jest.mock('expo-notifications');

describe('NotificationSchedulerService', () => {
  it('should schedule notifications for future prayers', async () => {
    const mockPrayerData = { /* ... */ };
    const result = await NotificationSchedulerService.scheduleTodaysPrayers(mockPrayerData);
    expect(result.success).toBe(true);
  });
});
```

### **Unit Testing Utilities:**
```typescript
describe('notification.utils', () => {
  it('should filter out past prayers', () => {
    const notifications = parsePrayerNotifications(mockData);
    expect(notifications).toHaveLength(3); // Only future prayers
  });
});
```

---

## Troubleshooting

### **Notifications not appearing?**
1. Check permission status: `await NotificationSchedulerService.checkPermissions()`
2. Verify prayer data is valid: `validatePrayerData(prayerData)`
3. Check scheduled notifications: `await NotificationSchedulerService.getScheduledNotifications()`
4. Review logs for error messages

### **Duplicate notifications?**
- Should not happen due to idempotency
- Service checks stored data hash before rescheduling
- If occurring, check AsyncStorage for corruption

### **Notifications for past prayers?**
- Service filters out past prayers automatically
- Check `isFuturePrayer()` function in utils

---

## Migration Notes

### **What was removed:**
- ✅ `features/prayerNotificationService.ts` - Old immediate notification logic
- ✅ `sendPrayerNotificationIfNeeded()` - Module-level state, immediate notifications
- ✅ Notification trigger from `UpcomingPrayerCard` - Violated separation of concerns

### **What was changed:**
- ✅ `bootstrap/hooks/usePrayerNotifications.ts` - Complete implementation
- ✅ `screens/Dashboard/Components/UpcomingPrayerCard/UpcomingPrayerCard.tsx` - Removed notification logic

### **What was added:**
- ✅ Complete notification service layer
- ✅ AsyncStorage persistence
- ✅ Utility functions and types
- ✅ Proper error handling and logging

---

## Future Enhancements

Potential improvements:
- [ ] Add notification channels for different prayer categories
- [ ] Support custom notification sounds per prayer
- [ ] Add notification preview/testing UI
- [ ] Implement notification action buttons (Mark as Prayed, Snooze)
- [ ] Add analytics for notification delivery/interaction
- [ ] Support multiple notification reminders per prayer
- [ ] Add notification history/log

---

## References

- [Expo Notifications Documentation](https://docs.expo.dev/versions/latest/sdk/notifications/)
- [AsyncStorage Documentation](https://react-native-async-storage.github.io/async-storage/)
- [TanStack Query Documentation](https://tanstack.com/query/latest)
