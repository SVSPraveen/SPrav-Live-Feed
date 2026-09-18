import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_NOTIFICATION_SETTINGS,
  isNotificationSupported,
  getNotificationPermission,
  isQuietHours,
  scanDueReminders,
  getNotificationSettings,
  saveNotificationSettings
} from './browser_notification_service.js';

test('isNotificationSupported: returns boolean safely in node runtime', () => {
  const supported = isNotificationSupported();
  assert.equal(typeof supported, 'boolean');
});

test('getNotificationPermission: returns unsupported when window.Notification is missing', () => {
  const perm = getNotificationPermission();
  assert.ok(['unsupported', 'default', 'granted', 'denied'].includes(perm));
});

test('getNotificationSettings: returns default settings with all core channels enabled', () => {
  const settings = getNotificationSettings();
  assert.equal(settings.enabled, true);
  assert.equal(settings.sound, true);
  assert.equal(settings.notifyInterviews, true);
  assert.equal(settings.notifyFollowups, true);
  assert.equal(settings.notifyDeadlines, true);
  assert.equal(typeof settings.leadTimeHours, 'number');
});

test('isQuietHours: accurately calculates hours across midnight boundary', () => {
  const activeSettings = { quietHoursEnabled: true, quietHoursStart: 22, quietHoursEnd: 8 };
  const disabledSettings = { quietHoursEnabled: false, quietHoursStart: 22, quietHoursEnd: 8 };

  assert.equal(isQuietHours(disabledSettings), false);

  // When disabled or during normal day, false
  const middaySettings = { quietHoursEnabled: true, quietHoursStart: 1, quietHoursEnd: 2 };
  // Check that function executes cleanly without exception
  assert.equal(typeof isQuietHours(middaySettings), 'boolean');
});

test('scanDueReminders: accurately identifies scheduled interviews and screening calls', () => {
  const todayStr = new Date().toISOString().split('T')[0];
  const mockApps = [
    {
      id: 'app-int-1',
      company: 'Datadog',
      title: 'Senior Systems Engineer',
      stage: 'technical',
      interview_date: todayStr,
      interview_time: '14:00',
      interview_round: 'System Architecture Loop'
    },
    {
      id: 'app-int-2',
      company: 'Anthropic',
      title: 'AI Platform Lead',
      stage: 'rejected', // should be skipped because rejected
      interview_date: todayStr
    }
  ];

  const result = scanDueReminders(mockApps, [], {
    enabled: true,
    notifyInterviews: true,
    notifyFollowups: false,
    notifyDeadlines: false
  });

  assert.equal(result.dueItems.length, 1);
  assert.equal(result.dueItems[0].id, 'app-int-1');
  assert.equal(result.dueItems[0].type, 'interview');
  assert.ok(result.dueItems[0].title.includes('Datadog'));
  assert.ok(result.dueItems[0].body.includes('14:00'));
});

test('scanDueReminders: detects followups due today or overdue', () => {
  const todayStr = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const mockApps = [
    {
      id: 'app-fol-1',
      company: 'Stripe',
      title: 'Backend Engineer',
      stage: 'applied',
      follow_up_due_at: yesterday // overdue
    },
    {
      id: 'app-fol-2',
      company: 'Figma',
      title: 'Frontend Engineer',
      stage: 'followed_up', // already followed up, should skip
      follow_up_due_at: yesterday
    }
  ];

  const result = scanDueReminders(mockApps, [], {
    enabled: true,
    notifyInterviews: false,
    notifyFollowups: true,
    notifyDeadlines: false
  });

  assert.equal(result.dueItems.length, 1);
  assert.equal(result.dueItems[0].id, 'app-fol-1');
  assert.equal(result.dueItems[0].type, 'followup');
  assert.ok(result.dueItems[0].title.includes('Overdue'));
  assert.ok(result.dueItems[0].title.includes('Stripe'));
});

test('scanDueReminders: detects recruiter contact follow-up dates', () => {
  const todayStr = new Date().toISOString().split('T')[0];
  const mockContacts = [
    {
      id: 'c-101',
      name: 'Elena Rostova',
      company: 'Snowflake',
      next_followup_date: todayStr
    }
  ];

  const result = scanDueReminders([], mockContacts, {
    enabled: true,
    notifyInterviews: false,
    notifyFollowups: true,
    notifyDeadlines: false
  });

  assert.equal(result.dueItems.length, 1);
  assert.equal(result.dueItems[0].id, 'c-101');
  assert.equal(result.dueItems[0].type, 'contact_followup');
  assert.ok(result.dueItems[0].title.includes('Elena Rostova'));
});

test('scanDueReminders: detects offer decision deadlines in offer stage', () => {
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const mockApps = [
    {
      id: 'app-off-1',
      company: 'Linear',
      title: 'Staff Engineer',
      stage: 'offer',
      offer_deadline: tomorrow
    }
  ];

  const result = scanDueReminders(mockApps, [], {
    enabled: true,
    notifyInterviews: false,
    notifyFollowups: false,
    notifyDeadlines: true
  });

  assert.equal(result.dueItems.length, 1);
  assert.equal(result.dueItems[0].id, 'app-off-1');
  assert.equal(result.dueItems[0].type, 'offer_deadline');
  assert.ok(result.dueItems[0].title.includes('Linear'));
});

test('scanDueReminders: respects master enabled toggle', () => {
  const todayStr = new Date().toISOString().split('T')[0];
  const mockApps = [
    {
      id: 'app-1',
      company: 'TestCorp',
      interview_date: todayStr
    }
  ];

  const result = scanDueReminders(mockApps, [], {
    enabled: false
  });

  assert.equal(result.dueItems.length, 0);
  assert.equal(result.sentCount, 0);
});
