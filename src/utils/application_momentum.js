/**
 * Application Momentum Score & Habit Tracking Engine — Dashboard Widget Logic
 * Purely computed from local vault data and browser storage.
 */

export const LONGEST_STREAK_STORAGE_KEY = 'sprav_longest_streak';

/**
 * Formats a Date object to local YYYY-MM-DD string.
 * @param {Date} dateObj
 * @returns {string}
 */
export function formatLocalDateString(dateObj) {
  if (!dateObj || !(dateObj instanceof Date) || Number.isNaN(dateObj.getTime())) {
    return '';
  }
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Computes daily application streaks, longest streaks, and 7-day habit matrices.
 * @param {Array} applications - Applications array with applied_at timestamps
 * @param {Date|number} [referenceDate] - Optional anchor date (defaults to now)
 * @returns {Object} Streak metadata and habit history
 */
export function calculateStreakData(applications = [], referenceDate = null) {
  const refDate = referenceDate ? new Date(referenceDate) : new Date();
  const validApps = Array.isArray(applications) ? [...applications] : [];

  // Group applications by local date string YYYY-MM-DD
  const appsByDate = new Map();
  for (const app of validApps) {
    if (app && app.applied_at) {
      const d = new Date(app.applied_at);
      if (!Number.isNaN(d.getTime())) {
        const dateStr = formatLocalDateString(d);
        appsByDate.set(dateStr, (appsByDate.get(dateStr) || 0) + 1);
      }
    }
  }

  const todayStr = formatLocalDateString(refDate);
  const yesterday = new Date(refDate);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = formatLocalDateString(yesterday);

  const appliedToday = appsByDate.has(todayStr);
  const appliedYesterday = appsByDate.has(yesterdayStr);

  let currentStreak = 0;
  if (appliedToday) {
    currentStreak = 1;
    const checkDate = new Date(refDate);
    while (true) {
      checkDate.setDate(checkDate.getDate() - 1);
      const dStr = formatLocalDateString(checkDate);
      if (appsByDate.has(dStr)) {
        currentStreak++;
      } else {
        break;
      }
    }
  } else if (appliedYesterday) {
    // User hasn't dispatched yet today, but applied yesterday: streak is alive waiting for today's application
    currentStreak = 1;
    const checkDate = new Date(yesterday);
    while (true) {
      checkDate.setDate(checkDate.getDate() - 1);
      const dStr = formatLocalDateString(checkDate);
      if (appsByDate.has(dStr)) {
        currentStreak++;
      } else {
        break;
      }
    }
  } else {
    currentStreak = 0;
  }

  // Rolling 7-day habit matrix
  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const habit7Days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(refDate);
    d.setDate(d.getDate() - i);
    const dStr = formatLocalDateString(d);
    const count = appsByDate.get(dStr) || 0;

    habit7Days.push({
      date: dStr,
      dayName: daysOfWeek[d.getDay()],
      dayNum: d.getDate(),
      hasApplied: count > 0,
      count,
      isToday: i === 0
    });
  }

  // Persistent Longest Streak Tracking (localStorage fallback)
  let storedLongest = 0;
  try {
    if (typeof localStorage !== 'undefined') {
      const saved = localStorage.getItem(LONGEST_STREAK_STORAGE_KEY);
      storedLongest = saved ? parseInt(saved, 10) : 0;
    }
  } catch {}

  const longestStreak = Math.max(storedLongest, currentStreak);
  if (longestStreak > storedLongest) {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(LONGEST_STREAK_STORAGE_KEY, String(longestStreak));
      }
    } catch {}
  }

  const streakActiveToday = appliedToday;
  let streakBadge = 'Start a streak ⚡';
  let streakStatusText = 'Dispatch 1 application today to start your streak!';

  if (currentStreak > 0) {
    streakBadge = `${currentStreak}-day streak 🔥`;
    streakStatusText = appliedToday
      ? 'Streak active today! Great momentum.'
      : `Dispatch 1 role today to keep your ${currentStreak}-day streak alive!`;
  }

  return {
    currentStreak,
    longestStreak,
    appliedToday,
    streakActiveToday,
    streakBadge,
    streakStatusText,
    habit7Days
  };
}

/**
 * Computes comprehensive velocity, trend, and streak metrics for the dashboard widget.
 */
export function computeMomentumScore(jobs = [], applications = [], targetPerWeek = 5, referenceDate = null) {
  const refDate = referenceDate ? new Date(referenceDate) : new Date();
  const now = refDate.getTime();
  const oneWeek = 7 * 24 * 3600000;
  
  // Sort descending by applied_at so applications[0] is the most recent
  const sortedApps = Array.isArray(applications)
    ? [...applications].sort((a, b) => new Date(b.applied_at || 0) - new Date(a.applied_at || 0))
    : [];

  const thisWeek = sortedApps.filter(a => {
    if (!a?.applied_at) return false;
    const t = new Date(a.applied_at).getTime();
    return !Number.isNaN(t) && (now - t) < oneWeek && (now - t) >= 0;
  }).length;

  const lastWeek = sortedApps.filter(a => {
    if (!a?.applied_at) return false;
    const t = new Date(a.applied_at).getTime();
    if (Number.isNaN(t)) return false;
    const age = now - t;
    return age >= oneWeek && age < 2 * oneWeek;
  }).length;
  
  const velocity = thisWeek;
  const trend = thisWeek > lastWeek ? 'up' : thisWeek < lastWeek ? 'down' : 'flat';
  const daysSinceLastApp = sortedApps.length > 0 && sortedApps[0]?.applied_at
    ? Math.max(0, Math.floor((now - new Date(sortedApps[0].applied_at).getTime()) / 86400000))
    : null;

  const target = typeof targetPerWeek === 'number' && targetPerWeek > 0 ? targetPerWeek : 5;
  const progressPct = Math.min(100, Math.round((velocity / target) * 100));
  const appsNeeded = Math.max(0, target - velocity);
  const statusMessage = appsNeeded === 0
    ? `Weekly target reached (${velocity}/${target} applications)! 🎯`
    : `${appsNeeded} more application${appsNeeded === 1 ? '' : 's'} needed to hit your weekly target of ${target}.`;
  
  const streak = calculateStreakData(applications, refDate);

  return { 
    velocity, 
    trend, 
    daysSinceLastApp, 
    stalled: daysSinceLastApp > 3,
    target,
    progressPct,
    appsNeeded,
    statusMessage,
    currentStreak: streak.currentStreak,
    longestStreak: streak.longestStreak,
    appliedToday: streak.appliedToday,
    streakActiveToday: streak.streakActiveToday,
    streakBadge: streak.streakBadge,
    streakStatusText: streak.streakStatusText,
    habit7Days: streak.habit7Days
  };
}
