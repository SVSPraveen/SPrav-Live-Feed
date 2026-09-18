/**
 * browser_notification_service.js
 * =================================
 * In-Browser Push Notification & Audio Reminder Service for SPrav Job AI.
 * 
 * Guarantees:
 * - 100% Client-side local execution ($0 cloud cost, zero backend required).
 * - Utilizes standard W3C Web Notification API.
 * - Synthesizes pleasant dual-tone chime alerts via Web Audio API (zero audio files needed).
 * - Automated deduplication prevents repeat notifications for the same event on the same calendar day.
 * - Scans applications and recruiter contacts for:
 *   1. Follow-ups due today or overdue.
 *   2. Scheduled interviews and screening calls within lead-time window.
 *   3. Expiring offer decision deadlines.
 */

export const NOTIFICATION_STORAGE_KEY = 'sprav_notification_settings_v1';
export const NOTIFICATION_SENT_LOG_KEY = 'sprav_notifications_sent_log';

export const DEFAULT_NOTIFICATION_SETTINGS = {
  enabled: true,
  sound: true,
  leadTimeHours: 24, // alert within 24h of scheduled interview
  notifyFollowups: true,
  notifyInterviews: true,
  notifyDeadlines: true,
  quietHoursEnabled: false,
  quietHoursStart: 22, // 10 PM
  quietHoursEnd: 8     // 8 AM
};

/**
 * Checks if the browser supports the Web Notification API.
 * @returns {boolean}
 */
export function isNotificationSupported() {
  return typeof window !== 'undefined' && 'Notification' in window;
}

/**
 * Returns current permission status: 'granted' | 'denied' | 'default' | 'unsupported'.
 * @returns {NotificationPermission | 'unsupported'}
 */
export function getNotificationPermission() {
  if (!isNotificationSupported()) return 'unsupported';
  return Notification.permission;
}

/**
 * Requests browser permission to display desktop push notifications.
 * @returns {Promise<NotificationPermission | 'unsupported'>}
 */
export async function requestNotificationPermission() {
  if (!isNotificationSupported()) return 'unsupported';
  try {
    const permission = await Notification.requestPermission();
    return permission;
  } catch (err) {
    console.warn('[NotificationService] Permission request failed:', err);
    return Notification.permission || 'denied';
  }
}

/**
 * Retrieves saved notification preferences.
 * @returns {typeof DEFAULT_NOTIFICATION_SETTINGS}
 */
export function getNotificationSettings() {
  if (typeof localStorage === 'undefined') return { ...DEFAULT_NOTIFICATION_SETTINGS };
  try {
    const raw = localStorage.getItem(NOTIFICATION_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_NOTIFICATION_SETTINGS };
    return { ...DEFAULT_NOTIFICATION_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_NOTIFICATION_SETTINGS };
  }
}

/**
 * Saves notification preferences.
 * @param {Partial<typeof DEFAULT_NOTIFICATION_SETTINGS>} updates
 */
export function saveNotificationSettings(updates) {
  if (typeof localStorage === 'undefined') return;
  try {
    const current = getNotificationSettings();
    const updated = { ...current, ...updates };
    localStorage.setItem(NOTIFICATION_STORAGE_KEY, JSON.stringify(updated));
    return updated;
  } catch (err) {
    console.warn('[NotificationService] Could not save settings:', err);
  }
}

/**
 * Synthesizes a subtle, pleasant notification chime via Web Audio API.
 * Uses two harmonious sine wave tones (D5: 587Hz -> A5: 880Hz).
 */
export function playNotificationChime() {
  if (typeof window === 'undefined') return;
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    
    // Resume context if suspended by browser autoplay policy
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    const now = ctx.currentTime;

    // Harmonic pitch sequence: D5 -> A5
    osc.frequency.setValueAtTime(587.33, now);
    osc.frequency.setValueAtTime(880.00, now + 0.09);

    // Smooth exponential gain decay
    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.36);

    // Clean up context after sound completes
    setTimeout(() => {
      try { ctx.close(); } catch {}
    }, 500);
  } catch (_err) {
    // Audio context may be blocked by autoplay or user gesture rules
    console.debug('Dual-tone chime suppressed by browser audio policy:', _err?.message);
  }
}

/**
 * Checks if current time is within configured quiet hours.
 * @param {typeof DEFAULT_NOTIFICATION_SETTINGS} settings
 * @returns {boolean}
 */
export function isQuietHours(settings) {
  if (!settings?.quietHoursEnabled) return false;
  const hour = new Date().getHours();
  const start = settings.quietHoursStart ?? 22;
  const end = settings.quietHoursEnd ?? 8;
  if (start > end) {
    // Over midnight (e.g. 22 to 8)
    return hour >= start || hour < end;
  }
  return hour >= start && hour < end;
}

/**
 * Check if a notification tag was already sent today to prevent repeat spam.
 * @param {string} tag
 * @returns {boolean}
 */
function wasNotificationSentToday(tag) {
  if (typeof localStorage === 'undefined') return false;
  try {
    const raw = localStorage.getItem(NOTIFICATION_SENT_LOG_KEY);
    const log = raw ? JSON.parse(raw) : {};
    const todayStr = new Date().toISOString().split('T')[0];
    return log[tag] === todayStr;
  } catch {
    return false;
  }
}

/**
 * Marks a notification tag as sent today.
 * @param {string} tag
 */
function markNotificationSentToday(tag) {
  if (typeof localStorage === 'undefined') return;
  try {
    const raw = localStorage.getItem(NOTIFICATION_SENT_LOG_KEY);
    const log = raw ? JSON.parse(raw) : {};
    const todayStr = new Date().toISOString().split('T')[0];
    
    // Prune entries older than 7 days
    const pruned = {};
    const nowMs = Date.now();
    for (const [k, dateVal] of Object.entries(log)) {
      const entryTime = new Date(dateVal).getTime();
      if (!isNaN(entryTime) && (nowMs - entryTime) < 7 * 24 * 60 * 60 * 1000) {
        pruned[k] = dateVal;
      }
    }
    pruned[tag] = todayStr;
    localStorage.setItem(NOTIFICATION_SENT_LOG_KEY, JSON.stringify(pruned));
  } catch {}
}

/**
 * Dispatches a native browser desktop push notification.
 * @param {string} title
 * @param {{ body?: string, tag?: string, url?: string, icon?: string, silent?: boolean, playSound?: boolean }} options
 * @returns {Notification | null}
 */
export function sendPushNotification(title, options = {}) {
  if (!isNotificationSupported()) return null;
  if (Notification.permission !== 'granted') return null;

  const settings = getNotificationSettings();
  if (!settings.enabled) return null;
  if (isQuietHours(settings)) return null;

  // Check tag deduplication if tag provided
  if (options.tag && wasNotificationSentToday(options.tag)) {
    return null;
  }

  // Play audio chime if enabled
  if (settings.sound && options.playSound !== false) {
    playNotificationChime();
  }

  const notification = new Notification(title, {
    body: options.body || 'SPrav Career Operating System Reminder',
    icon: options.icon || '/favicon.ico',
    badge: '/favicon.ico',
    tag: options.tag || undefined,
    silent: true // handle sound via Web Audio synth for consistent cross-browser chime
  });

  notification.onclick = (event) => {
    event.preventDefault();
    if (typeof window !== 'undefined') {
      window.focus();
      if (options.url) {
        window.location.hash = options.url.replace(/^#/, '');
      }
    }
    notification.close();
  };

  if (options.tag) {
    markNotificationSentToday(options.tag);
  }

  return notification;
}

/**
 * Sends a test notification to verify OS push permissions and audio chime.
 * @returns {Promise<boolean>}
 */
export async function sendTestNotification() {
  const perm = await requestNotificationPermission();
  if (perm !== 'granted') {
    return false;
  }

  const notif = sendPushNotification('🔔 SPrav Job AI Notifications Active', {
    body: 'Browser push alerts are enabled! You will receive timely reminders for scheduled interviews, screenings, and follow-ups.',
    url: '#history',
    playSound: true
  });

  return !!notif;
}

/**
 * Scans applications and contacts to detect and trigger due reminders.
 * @param {Array} applications
 * @param {Array} contacts
 * @param {object} [customSettings]
 * @returns {{ sentCount: number, dueItems: Array }}
 */
export function scanDueReminders(applications = [], contacts = [], customSettings = null) {
  const settings = customSettings || getNotificationSettings();
  if (!settings.enabled) return { sentCount: 0, dueItems: [] };

  const dueItems = [];
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  const leadMs = (settings.leadTimeHours || 24) * 60 * 60 * 1000;

  // 1. Scan Applications for Scheduled Interviews / Screenings
  if (settings.notifyInterviews) {
    for (const app of applications) {
      if (!app) continue;
      const stage = (app.stage || app.status || '').toLowerCase();
      if (['rejected', 'archived'].includes(stage)) continue;

      const interviewDate = app.interview_date || app.round_date || app.scheduled_at;
      if (interviewDate) {
        const interviewTime = new Date(interviewDate).getTime();
        if (!isNaN(interviewTime)) {
          const diffMs = interviewTime - now.getTime();
          // Alert if interview is happening today or within leadTime window (e.g. next 24h)
          const isToday = interviewDate.startsWith(todayStr);
          const isUpcomingWithinLead = diffMs > 0 && diffMs <= leadMs;

          if (isToday || isUpcomingWithinLead) {
            const timeStr = app.interview_time ? ` at ${app.interview_time}` : '';
            const roundTitle = app.interview_round || (stage === 'screening' ? 'Screening Call' : 'Interview Round');
            const item = {
              type: 'interview',
              id: app.id,
              title: `🗓️ ${roundTitle}: ${app.company || 'Company'}`,
              body: `${app.title || 'Role'} scheduled for ${interviewDate}${timeStr}. Review company prep tips!`,
              url: '#history',
              tag: `interview-${app.id}-${interviewDate}`
            };
            dueItems.push(item);
          }
        }
      }
    }
  }

  // 2. Scan Applications for Follow-up Deadlines
  if (settings.notifyFollowups) {
    for (const app of applications) {
      if (!app) continue;
      const stage = (app.stage || app.status || '').toLowerCase();
      // Only notify for applied / follow_up_due stages where follow-up is not completed
      if (['followed_up', 'screening', 'technical', 'interview', 'offer', 'rejected', 'archived'].includes(stage)) {
        continue;
      }
      if (app.followed_up_at || app.follow_up_status === 'followed_up') {
        continue;
      }

      // Check due date
      const dueDate = app.follow_up_due_at;
      let isDue = false;
      let isOverdue = false;

      if (dueDate) {
        if (dueDate <= todayStr) {
          isDue = true;
          isOverdue = dueDate < todayStr;
        }
      } else if (app.applied_at) {
        // Default 5 business days fallback
        const appliedTime = new Date(app.applied_at).getTime();
        if (!isNaN(appliedTime)) {
          const daysElapsed = (now.getTime() - appliedTime) / (1000 * 60 * 60 * 24);
          if (daysElapsed >= 5) {
            isDue = true;
            isOverdue = daysElapsed > 7;
          }
        }
      }

      if (isDue) {
        const item = {
          type: 'followup',
          id: app.id,
          title: isOverdue ? `⚠️ Overdue Follow-up: ${app.company || 'Application'}` : `⏰ Follow-up Due Today: ${app.company || 'Application'}`,
          body: `5 days elapsed since applying to ${app.company || 'this role'}. Dispatch outreach pitch to maintain hiring momentum.`,
          url: '#followups',
          tag: `followup-${app.id}-${todayStr}`
        };
        dueItems.push(item);
      }
    }
  }

  // 3. Scan Recruiter Contacts for Scheduled Follow-up Dates
  if (settings.notifyFollowups && Array.isArray(contacts)) {
    for (const contact of contacts) {
      if (!contact || !contact.next_followup_date) continue;
      if (contact.next_followup_date <= todayStr) {
        const item = {
          type: 'contact_followup',
          id: contact.id,
          title: `👤 Recruiter Follow-up Due: ${contact.name}`,
          body: `Follow-up planned with ${contact.name} (${contact.company || 'Recruiter'}). View notes & details.`,
          url: '#history',
          tag: `contact-${contact.id}-${todayStr}`
        };
        dueItems.push(item);
      }
    }
  }

  // 4. Scan Offer Decision Deadlines
  if (settings.notifyDeadlines) {
    for (const app of applications) {
      if (!app) continue;
      const stage = (app.stage || app.status || '').toLowerCase();
      if (stage !== 'offer') continue;

      const deadline = app.offer_deadline || app.decision_deadline;
      if (deadline) {
        const deadlineTime = new Date(deadline).getTime();
        if (!isNaN(deadlineTime)) {
          const diffDays = Math.ceil((deadlineTime - now.getTime()) / (1000 * 60 * 60 * 24));
          if (diffDays >= 0 && diffDays <= 2) {
            const item = {
              type: 'offer_deadline',
              id: app.id,
              title: `🏆 Offer Decision Window: ${app.company || 'Offer'}`,
              body: diffDays === 0 ? `Offer response deadline is TODAY for ${app.company}!` : `Offer response deadline in ${diffDays} day(s) for ${app.company}. Finalize negotiation.`,
              url: '#history',
              tag: `offer-${app.id}-${deadline}`
            };
            dueItems.push(item);
          }
        }
      }
    }
  }

  // Dispatch push notifications for all discovered due items
  let sentCount = 0;
  if (getNotificationPermission() === 'granted') {
    for (const item of dueItems) {
      const notif = sendPushNotification(item.title, {
        body: item.body,
        url: item.url,
        tag: item.tag,
        playSound: sentCount === 0 // only chime once per batch
      });
      if (notif) sentCount++;
    }
  }

  return { sentCount, dueItems };
}

/**
 * Starts an in-browser interval scanner to check due reminders while the application is open.
 * Also scans on tab visibility change (e.g. when candidate returns to the window).
 * @param {() => Promise<Array>} getApplications
 * @param {() => Promise<Array>} getContacts
 * @param {number} [intervalMinutes=15]
 * @returns {() => void} unsubscribe / cleanup function
 */
export function startReminderPoller(getApplications, getContacts, intervalMinutes = 15) {
  if (typeof window === 'undefined') return () => {};

  let isRunning = false;

  const runScan = async () => {
    if (isRunning) return;
    isRunning = true;
    try {
      const [apps, contacts] = await Promise.all([
        getApplications?.().catch(() => []) || [],
        getContacts?.().catch(() => []) || []
      ]);
      scanDueReminders(apps, contacts);
    } catch (e) {
      console.warn('[NotificationService] Error running reminder scan:', e);
    } finally {
      isRunning = false;
    }
  };

  // Run initial scan after 3 seconds of idle time
  const initTimeout = setTimeout(runScan, 3000);

  // Set recurring interval
  const intervalId = setInterval(runScan, intervalMinutes * 60 * 1000);

  // Re-scan when tab gains focus
  const handleVisibilityChange = () => {
    if (document.visibilityState === 'visible') {
      runScan();
    }
  };

  document.addEventListener('visibilitychange', handleVisibilityChange);

  return () => {
    clearTimeout(initTimeout);
    clearInterval(intervalId);
    document.removeEventListener('visibilitychange', handleVisibilityChange);
  };
}
