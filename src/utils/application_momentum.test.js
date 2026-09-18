import test from 'node:test';
import assert from 'node:assert/strict';
import {
  formatLocalDateString,
  calculateStreakData,
  computeMomentumScore,
  LONGEST_STREAK_STORAGE_KEY
} from './application_momentum.js';

test('formatLocalDateString: correctly formats valid dates to local YYYY-MM-DD', () => {
  const d = new Date(2026, 8, 11); // Sept 11, 2026
  assert.equal(formatLocalDateString(d), '2026-09-11');
  assert.equal(formatLocalDateString(null), '');
  assert.equal(formatLocalDateString(new Date('invalid')), '');
});

test('calculateStreakData: calculates active streak when applied today', () => {
  const refDate = new Date(2026, 8, 11, 14, 0, 0); // Friday, Sept 11, 2026
  const dayMs = 86400000;

  // Applied today, yesterday, and 2 days ago = 3-day streak
  const apps = [
    { id: 1, applied_at: new Date(refDate.getTime() - 1000).toISOString() }, // Today
    { id: 2, applied_at: new Date(refDate.getTime() - 1 * dayMs).toISOString() }, // Yesterday
    { id: 3, applied_at: new Date(refDate.getTime() - 2 * dayMs).toISOString() }, // 2 days ago
    { id: 4, applied_at: new Date(refDate.getTime() - 5 * dayMs).toISOString() }  // 5 days ago (gap breaks earlier streak)
  ];

  const streak = calculateStreakData(apps, refDate);
  assert.equal(streak.currentStreak, 3);
  assert.equal(streak.appliedToday, true);
  assert.equal(streak.streakActiveToday, true);
  assert.equal(streak.streakBadge, '3-day streak 🔥');
  assert.match(streak.streakStatusText, /Streak active today/);
  assert.equal(streak.habit7Days.length, 7);
  assert.equal(streak.habit7Days[6].isToday, true);
  assert.equal(streak.habit7Days[6].hasApplied, true);
  assert.equal(streak.habit7Days[5].hasApplied, true);
  assert.equal(streak.habit7Days[4].hasApplied, true);
  assert.equal(streak.habit7Days[3].hasApplied, false);
});

test('calculateStreakData: preserves streak pending today dispatch when applied yesterday', () => {
  const refDate = new Date(2026, 8, 11, 10, 0, 0); // Sept 11, 2026
  const dayMs = 86400000;

  // Applied yesterday and 2 days ago, but not yet today
  const apps = [
    { id: 1, applied_at: new Date(refDate.getTime() - 1 * dayMs).toISOString() },
    { id: 2, applied_at: new Date(refDate.getTime() - 2 * dayMs).toISOString() }
  ];

  const streak = calculateStreakData(apps, refDate);
  assert.equal(streak.currentStreak, 2);
  assert.equal(streak.appliedToday, false);
  assert.equal(streak.streakActiveToday, false);
  assert.equal(streak.streakBadge, '2-day streak 🔥');
  assert.match(streak.streakStatusText, /keep your 2-day streak alive/i);
});

test('calculateStreakData: resets streak to 0 when last application was 2+ days ago', () => {
  const refDate = new Date(2026, 8, 11, 10, 0, 0);
  const dayMs = 86400000;

  const apps = [
    { id: 1, applied_at: new Date(refDate.getTime() - 3 * dayMs).toISOString() }
  ];

  const streak = calculateStreakData(apps, refDate);
  assert.equal(streak.currentStreak, 0);
  assert.equal(streak.appliedToday, false);
  assert.equal(streak.streakBadge, 'Start a streak ⚡');
});

test('calculateStreakData: handles empty applications list gracefully', () => {
  const refDate = new Date(2026, 8, 11);
  const streak = calculateStreakData([], refDate);
  assert.equal(streak.currentStreak, 0);
  assert.equal(streak.longestStreak, 0);
  assert.equal(streak.appliedToday, false);
  assert.equal(streak.streakBadge, 'Start a streak ⚡');
  assert.equal(streak.habit7Days.length, 7);
});

test('computeMomentumScore: blends momentum score with streak data seamlessly', () => {
  const refDate = new Date(2026, 8, 11, 12, 0, 0);
  const dayMs = 86400000;

  const apps = [
    { id: 1, applied_at: new Date(refDate.getTime() - 5000).toISOString() },
    { id: 2, applied_at: new Date(refDate.getTime() - 1 * dayMs).toISOString() },
    { id: 3, applied_at: new Date(refDate.getTime() - 2 * dayMs).toISOString() }
  ];

  const result = computeMomentumScore([], apps, 5, refDate);
  assert.equal(result.velocity, 3);
  assert.equal(result.currentStreak, 3);
  assert.equal(result.streakBadge, '3-day streak 🔥');
  assert.equal(result.stalled, false);
  assert.equal(result.target, 5);
  assert.equal(result.progressPct, 60);
  assert.equal(result.appsNeeded, 2);
  assert.equal(Array.isArray(result.habit7Days), true);
  assert.equal(result.habit7Days.length, 7);
});
