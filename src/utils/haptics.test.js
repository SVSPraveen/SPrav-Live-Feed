import test from 'node:test';
import assert from 'node:assert/strict';
import { haptics } from './haptics.js';

test('haptics: safely degrades to false when navigator.vibrate is unsupported', () => {
  const originalDesc = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
  try {
    Object.defineProperty(globalThis, 'navigator', {
      value: {},
      configurable: true,
      writable: true
    });

    assert.equal(haptics.isSupported(), false);
    assert.equal(haptics.selection(), false);
    assert.equal(haptics.light(), false);
    assert.equal(haptics.medium(), false);
    assert.equal(haptics.success(), false);
    assert.equal(haptics.warning(), false);
    assert.equal(haptics.error(), false);
  } finally {
    if (originalDesc) {
      Object.defineProperty(globalThis, 'navigator', originalDesc);
    }
  }
});

test('haptics: triggers correct vibration patterns when supported', () => {
  const originalDesc = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
  const vibrationCalls = [];

  try {
    Object.defineProperty(globalThis, 'navigator', {
      value: {
        vibrate: (pattern) => {
          vibrationCalls.push(pattern);
          return true;
        }
      },
      configurable: true,
      writable: true
    });

    haptics.setEnabled(true);
    assert.equal(haptics.isSupported(), true);
    assert.equal(haptics.isEnabled(), true);

    assert.equal(haptics.selection(), true);
    assert.equal(vibrationCalls[0], 8);

    assert.equal(haptics.light(), true);
    assert.equal(vibrationCalls[1], 12);

    assert.equal(haptics.medium(), true);
    assert.equal(vibrationCalls[2], 25);

    assert.equal(haptics.success(), true);
    assert.deepEqual(vibrationCalls[3], [15, 50, 20]);

    assert.equal(haptics.warning(), true);
    assert.deepEqual(vibrationCalls[4], [30, 40, 30]);

    assert.equal(haptics.error(), true);
    assert.deepEqual(vibrationCalls[5], [40, 60, 40]);

    assert.equal(haptics.custom(100), true);
    assert.equal(vibrationCalls[6], 100);

    // Test disable
    haptics.setEnabled(false);
    assert.equal(haptics.isEnabled(), false);
    assert.equal(haptics.selection(), false);
    assert.equal(vibrationCalls.length, 7, 'No vibration called when disabled');

    // Re-enable
    haptics.setEnabled(true);
    assert.equal(haptics.selection(), true);
    assert.equal(vibrationCalls.length, 8);
  } finally {
    if (originalDesc) {
      Object.defineProperty(globalThis, 'navigator', originalDesc);
    }
  }
});
