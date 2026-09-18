import test from 'node:test';
import assert from 'node:assert/strict';
import { BYOK_PROVIDERS, getProviderGuide, getAllProviderGuides } from './byok_providers_catalog.js';

test('byok_providers_catalog: contains all primary BYOK providers with valid URLs', () => {
  const providers = ['groq', 'gemini', 'anthropic', 'openrouter', 'deepseek', 'mistral', 'openai'];
  providers.forEach(p => {
    const guide = BYOK_PROVIDERS[p];
    assert.ok(guide, `Missing provider ${p}`);
    assert.ok(guide.name);
    assert.ok(guide.keyUrl.startsWith('https://'));
    assert.ok(Array.isArray(guide.steps));
    assert.ok(guide.steps.length >= 3);
  });
});

test('byok_providers_catalog: groq is configured as hero free provider', () => {
  const groq = getProviderGuide('groq');
  assert.equal(groq.isHeroFree, true);
  assert.equal(groq.keyUrl, 'https://console.groq.com/keys');
  assert.ok(groq.heroBadge.includes('No CC Required'));
  assert.equal(groq.setupTimeMinutes, 2);
});

test('byok_providers_catalog: getProviderGuide handles fallback and case insensitivity', () => {
  assert.equal(getProviderGuide('GROQ').id, 'groq');
  assert.equal(getProviderGuide('gemini').id, 'gemini');
  assert.equal(getProviderGuide('unknown_provider'), null);
  assert.equal(getProviderGuide('').id, 'groq');
});

test('byok_providers_catalog: getAllProviderGuides returns non-empty array', () => {
  const all = getAllProviderGuides();
  assert.ok(all.length >= 6);
  assert.ok(all.some(p => p.id === 'groq'));
  assert.ok(all.some(p => p.id === 'gemini'));
});
