/**
 * Universal Mobile Haptics Engine
 * ===============================
 * Tactile micro-feedback utility powered by the W3C Vibration API.
 * Provides native-app feel on mobile devices with zero external dependencies
 * and silent graceful degradation on unsupported platforms (e.g. iOS Safari).
 * 
 * Calibrated Vibration Profiles:
 * - selection: 8ms subtle tick for tab navigation, filter pills, segment switches
 * - light:     12ms crisp impact for touch drag thresholds, drawer nudges
 * - medium:    25ms firm impact for bottom sheet dismissals, pull-to-refresh
 * - success:   [15, 50, 20] multi-pulse for job saved, application queued, sync complete
 * - warning:   [30, 40, 30] alert pulse for network drop, quota warning
 * - error:     [40, 60, 40] rejection pulse for blocked action
 */

let hapticsEnabled = true;

function isVibrationSupported() {
  const nav = typeof navigator !== 'undefined' ? navigator : (typeof window !== 'undefined' ? window.navigator : null);
  return Boolean(nav && typeof nav.vibrate === 'function');
}

function triggerVibration(pattern) {
  if (!hapticsEnabled || !isVibrationSupported()) return false;
  try {
    return navigator.vibrate(pattern);
  } catch {
    return false;
  }
}

export const haptics = {
  /**
   * Ultra-light 8ms tick for bottom navigation tabs, chips, and segmented controls.
   */
  selection() {
    return triggerVibration(8);
  },

  /**
   * Light 12ms impact for gesture drag thresholds and minor interactions.
   */
  light() {
    return triggerVibration(12);
  },

  /**
   * Medium 25ms impact for sheet dismissals, pull-to-refresh snaps, and toggle switches.
   */
  medium() {
    return triggerVibration(25);
  },

  /**
   * Satisfying multi-pulse pattern for saving a job, applying, or completing a sync.
   */
  success() {
    return triggerVibration([15, 50, 20]);
  },

  /**
   * Two-pulse warning pattern for offline mode alerts or soft blockers.
   */
  warning() {
    return triggerVibration([30, 40, 30]);
  },

  /**
   * Triple-pulse error pattern for failed validations or blocked actions.
   */
  error() {
    return triggerVibration([40, 60, 40]);
  },

  /**
   * Custom duration or pattern.
   * @param {number|number[]} pattern - Duration in ms or [vibrate, pause, vibrate]
   */
  custom(pattern) {
    return triggerVibration(pattern);
  },

  /**
   * Check if vibration is available on the current hardware/browser.
   */
  isSupported() {
    return isVibrationSupported();
  },

  /**
   * Check if haptic feedback is user-enabled.
   */
  isEnabled() {
    return hapticsEnabled;
  },

  /**
   * Globally toggle tactile haptic feedback.
   */
  setEnabled(enabled) {
    hapticsEnabled = Boolean(enabled);
  }
};

export default haptics;
