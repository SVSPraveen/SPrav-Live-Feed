import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_2026_RATES,
  FX_ENDPOINTS,
  parsePrimaryFxResponse,
  parseSecondaryFxResponse,
  getCachedFxRates,
  getFxTelemetry,
  getActiveExchangeRates,
  subscribeToFxUpdates
} from './live_fx_service.js';

test('live_fx_service: exports valid 2026 baseline rates and open CORS endpoints', () => {
  assert.ok(DEFAULT_2026_RATES.INR >= 90, 'INR rate is calibrated for 2026 (>90)');
  assert.equal(DEFAULT_2026_RATES.USD, 1.0);
  assert.ok(DEFAULT_2026_RATES.EUR > 0 && DEFAULT_2026_RATES.EUR < 1.0);
  assert.ok(DEFAULT_2026_RATES.GBP > 0 && DEFAULT_2026_RATES.GBP < 1.0);
  assert.ok(FX_ENDPOINTS.primary.includes('open.er-api.com'));
  assert.ok(FX_ENDPOINTS.secondary.includes('frankfurter.dev'));
});

test('parsePrimaryFxResponse: parses open.er-api.com JSON response correctly', () => {
  const mockApiJson = {
    result: 'success',
    time_last_update_utc: 'Fri, 11 Sep 2026 00:02:30 +0000',
    rates: {
      USD: 1.0,
      INR: 95.5142,
      EUR: 0.8612,
      GBP: 0.7421,
      CAD: 1.3811,
      AUD: 1.3915,
      SGD: 1.2704
    }
  };

  const parsed = parsePrimaryFxResponse(mockApiJson);
  assert.equal(parsed.rates.USD, 1.0);
  assert.equal(parsed.rates.INR, 95.51);
  assert.equal(parsed.rates.EUR, 0.8612);
  assert.equal(parsed.rates.GBP, 0.7421);
  assert.match(parsed.dateStr, /2026/);
  assert.match(parsed.source, /open\.er-api\.com/);
});

test('parsePrimaryFxResponse: throws on invalid API response structure', () => {
  assert.throws(() => parsePrimaryFxResponse(null), /Invalid primary FX response structure/);
  assert.throws(() => parsePrimaryFxResponse({ result: 'error' }), /Invalid primary FX response structure/);
  assert.throws(() => parsePrimaryFxResponse({ result: 'success' }), /Invalid primary FX response structure/);
});

test('parseSecondaryFxResponse: parses frankfurter.dev European Central Bank feed', () => {
  const mockFrankfurterJson = {
    amount: 1.0,
    base: 'USD',
    date: '2026-09-11',
    rates: {
      INR: 95.50,
      EUR: 0.86,
      GBP: 0.74,
      CAD: 1.38
    }
  };

  const parsed = parseSecondaryFxResponse(mockFrankfurterJson);
  assert.equal(parsed.rates.USD, 1.0);
  assert.equal(parsed.rates.INR, 95.5);
  assert.equal(parsed.rates.EUR, 0.86);
  assert.equal(parsed.dateStr, '2026-09-11');
  assert.match(parsed.source, /European Central Bank/);
});

test('subscribeToFxUpdates: receives immediate notification and handles unsubscription', () => {
  let receivedState = null;
  const unsubscribe = subscribeToFxUpdates((state) => {
    receivedState = state;
  });

  assert.ok(receivedState, 'Listener called immediately with active FX state');
  assert.ok(receivedState.rates.INR);
  assert.ok(typeof unsubscribe === 'function');
  unsubscribe();
});

test('getFxTelemetry: generates structured telemetry and human-friendly badge text', () => {
  const inrTelemetry = getFxTelemetry('INR');
  assert.equal(inrTelemetry.code, 'INR');
  assert.equal(inrTelemetry.symbol, '₹');
  assert.ok(inrTelemetry.rate >= 90);
  assert.ok(inrTelemetry.badgeText.includes('₹'));
  assert.ok(inrTelemetry.disclaimer.includes('Exchange rate'));

  const eurTelemetry = getFxTelemetry('EUR');
  assert.equal(eurTelemetry.code, 'EUR');
  assert.equal(eurTelemetry.symbol, '€');
});

test('getCachedFxRates & getActiveExchangeRates: returns valid active rates', () => {
  const cached = getCachedFxRates();
  assert.ok(cached === null || typeof cached === 'object');
  const active = getActiveExchangeRates();
  assert.ok(active && typeof active === 'object');
  assert.equal(active.rates.USD, 1.0);
  assert.ok(active.rates.INR >= 90);
});
