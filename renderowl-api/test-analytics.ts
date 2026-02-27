// ============================================================================
// Analytics & Notifications Test Script
// ============================================================================
// Run with: npx tsx test-analytics.ts

import { AnalyticsService } from './routes/analytics.js';
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Test configuration
const TEST_DB_PATH = path.join(__dirname, 'data', 'test-analytics.db');
const TEST_USER_ID = 'user_test_123';
const TEST_PROJECT_ID = 'proj_test_456';

console.log('🧪 Testing Analytics & Notifications System\n');

// Initialize service
const service = new AnalyticsService(TEST_DB_PATH);

// Test 1: Event Tracking
console.log('📊 Test 1: Event Tracking');
const event = service.trackEvent({
  userId: TEST_USER_ID,
  projectId: TEST_PROJECT_ID,
  eventType: 'render.completed',
  eventData: { renderId: 'rnd_123', duration: 45.2, frames: 1800 },
});
console.log('✅ Event tracked:', event.id);

// Test 2: Daily Stats Update
console.log('\n📈 Test 2: Daily Stats Update');
const today = new Date().toISOString().split('T')[0];
service.updateDailyStats({
  userId: TEST_USER_ID,
  date: today,
  rendersCompleted: 5,
  creditsUsed: 125,
  framesRendered: 9000,
  durationSeconds: 250,
});
console.log('✅ Daily stats updated for', today);

// Test 3: Create Notifications
console.log('\n🔔 Test 3: Create Notifications');
const notif1 = service.createNotification({
  userId: TEST_USER_ID,
  type: 'render_complete',
  title: 'Render Complete',
  message: 'Your video "Summer Promo" has finished rendering.',
  data: { renderId: 'rnd_789', outputUrl: 'https://cdn.example.com/video.mp4' },
});
console.log('✅ Notification 1 created:', notif1.id);

const notif2 = service.createNotification({
  userId: TEST_USER_ID,
  type: 'credit_low',
  title: 'Low Credits Warning',
  message: 'You have less than 50 credits remaining.',
  data: { creditsRemaining: 42 },
});
console.log('✅ Notification 2 created:', notif2.id);

const notif3 = service.createNotification({
  userId: TEST_USER_ID,
  type: 'batch_complete',
  title: 'Batch Processing Complete',
  message: '5 of 5 renders completed successfully.',
  data: { batchId: 'batch_123', totalJobs: 5, completedJobs: 5, failedJobs: 0 },
});
console.log('✅ Notification 3 created:', notif3.id);

// Test 4: Get Notifications
console.log('\n📬 Test 4: Get Notifications');
const notifications = service.getNotifications(TEST_USER_ID);
console.log('✅ Total notifications:', notifications.length);

const unreadNotifications = service.getNotifications(TEST_USER_ID, { unreadOnly: true });
console.log('✅ Unread notifications:', unreadNotifications.length);

// Test 5: Unread Count
console.log('\n🔢 Test 5: Unread Count');
const unreadCount = service.getUnreadCount(TEST_USER_ID);
console.log('✅ Unread count:', unreadCount);

// Test 6: Mark as Read
console.log('\n👁️ Test 6: Mark as Read');
const markResult = service.markAsRead(notif1.id, TEST_USER_ID);
console.log('✅ Mark as read result:', markResult);

const newUnreadCount = service.getUnreadCount(TEST_USER_ID);
console.log('✅ New unread count:', newUnreadCount);

// Test 7: Mark All as Read
console.log('\n📖 Test 7: Mark All as Read');
const markedCount = service.markAllAsRead(TEST_USER_ID);
console.log('✅ Marked as read:', markedCount, 'notifications');

const finalUnreadCount = service.getUnreadCount(TEST_USER_ID);
console.log('✅ Final unread count:', finalUnreadCount);

// Test 8: Batch Progress Tracking
console.log('\n📦 Test 8: Batch Progress Tracking');
service.trackBatchProgress('batch_test_123', TEST_USER_ID, 10, 10, 0);
console.log('✅ Batch progress tracked');

// Test 9: Get Daily Stats
console.log('\n📅 Test 9: Get Daily Stats');
const dailyStats = service.getDailyStats(TEST_USER_ID, 7);
console.log('✅ Daily stats entries:', dailyStats.length);
if (dailyStats.length > 0) {
  console.log('   Latest:', JSON.stringify(dailyStats[0], null, 2));
}

// Cleanup
console.log('\n🧹 Cleanup');
try {
  const db = new Database(TEST_DB_PATH);
  db.exec(`
    DROP TABLE IF EXISTS analytics_events;
    DROP TABLE IF EXISTS analytics_daily;
    DROP TABLE IF EXISTS notifications;
  `);
  db.close();
  console.log('✅ Test tables dropped');
} catch (e) {
  console.log('⚠️  Cleanup error:', e);
}

console.log('\n✨ All tests completed successfully!');
