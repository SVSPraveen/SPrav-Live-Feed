import test, { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  COPILOT_FAQ_CATALOG,
  SENIOR_RESEARCH_DOMAINS,
  findCopilotAnswer,
  getSuggestedQueriesForTab,
  searchFaq
} from './copilot_knowledge_engine.js';

describe('Copilot Knowledge Engine - Senior Research Domain Catalog', () => {
  it('contains at least 100 comprehensive query entries (110 queries curated)', () => {
    assert.ok(COPILOT_FAQ_CATALOG.length >= 100, `Expected at least 100 queries, got ${COPILOT_FAQ_CATALOG.length}`);
    assert.equal(COPILOT_FAQ_CATALOG.length, 110);
  });

  it('covers all 22 specialized senior research domains', () => {
    assert.equal(SENIOR_RESEARCH_DOMAINS.length, 22);

    const categoriesInCatalog = new Set(COPILOT_FAQ_CATALOG.map(item => item.category));
    assert.equal(categoriesInCatalog.size, 22);
  });

  it('guarantees unique IDs across all entries', () => {
    const ids = COPILOT_FAQ_CATALOG.map(item => item.id);
    const uniqueIds = new Set(ids);
    assert.equal(uniqueIds.size, ids.length);
  });

  it('ensures every FAQ item has rich content, valid patterns, and related queries', () => {
    for (const item of COPILOT_FAQ_CATALOG) {
      assert.ok(item.id, 'Entry must have an id');
      assert.ok(item.category, 'Entry must have a category');
      assert.ok(item.title, 'Entry must have a title');
      assert.ok(Array.isArray(item.patterns), 'Entry must have patterns array');
      assert.ok(item.patterns.length > 0, 'Entry must have at least 1 pattern');
      assert.equal(typeof item.answer, 'string');
      assert.ok(item.answer.length > 40, 'Answer must be substantive (>40 chars)');
      assert.ok(Array.isArray(item.relatedQueries), 'Entry must have relatedQueries array');
      assert.ok(item.contextTab, 'Entry must have a contextTab');
    }
  });

  it('includes exactly 5 queries for each of the 22 domains', () => {
    const domainCounts = {};
    for (const item of COPILOT_FAQ_CATALOG) {
      domainCounts[item.category] = (domainCounts[item.category] || 0) + 1;
    }

    const categories = Object.keys(domainCounts);
    assert.equal(categories.length, 22);
    for (const cat of categories) {
      assert.equal(domainCounts[cat], 5, `Expected 5 entries for category ${cat}`);
    }
  });
});

describe('Copilot Knowledge Engine - Query Matching Engine', () => {
  it('identifies platform creator and mission with exact backward-compatible phrasing', () => {
    const result = findCopilotAnswer('Who created SPrav Job AI?');
    assert.ok(result, 'Expected answer for creator query');
    assert.equal(result.id, 'faq_creator_svs_praveen');
    assert.match(result.answer, /designed, architected, and engineered by \*\*SVS Praveen\*\*/i);
    assert.ok(result.relatedQueries.length > 0);
  });

  it('matches ghost job heuristics inquiry', () => {
    const result = findCopilotAnswer('How does SPrav detect ghost jobs?');
    assert.ok(result);
    assert.equal(result.category, 'ghost_job_detection');
    assert.match(result.answer, /ghost job/i);
  });

  it('matches Chris Voss salary negotiation queries', () => {
    const result = findCopilotAnswer('tell me about chris voss negotiation');
    assert.ok(result);
    assert.equal(result.category, 'salary_negotiation');
    assert.match(result.answer, /chris voss/i);
    assert.match(result.answer, /calibrated/i);
  });

  it('matches Ollama local setup questions', () => {
    const result = findCopilotAnswer('How to connect Ollama locally?');
    assert.ok(result);
    assert.equal(result.category, 'ollama_local_daemon');
    assert.match(result.answer, /OLLAMA_ORIGINS/i);
  });

  it('matches BYOK Groq setup inquiries', () => {
    const result = findCopilotAnswer('How do I get a free Groq API key?');
    assert.ok(result);
    assert.equal(result.category, 'byok_orchestration');
    assert.match(result.answer, /console\.groq\.com/i);
  });

  it('matches FAANG company blueprint queries (Google, Amazon, Meta)', () => {
    const googleRes = findCopilotAnswer("What is Google's engineering interview rubric?");
    assert.ok(googleRes);
    assert.match(googleRes.answer, /Googleyness/i);

    const amazonRes = findCopilotAnswer("Tell me about Amazon's Bar Raiser and 16 leadership principles");
    assert.ok(amazonRes);
    assert.match(amazonRes.answer, /Customer Obsession/i);

    const metaRes = findCopilotAnswer('How is the Meta interview structured?');
    assert.ok(metaRes);
    assert.match(metaRes.answer, /Meta Engineering Interview/i);
  });

  it('interpolates candidate context variables cleanly', () => {
    const candidateContext = {
      candidateName: 'Aditi Sharma',
      candidateTitle: 'Staff Backend Architect',
      topSkills: ['Go', 'Kubernetes', 'gRPC', 'PostgreSQL'],
      targetRoles: ['Staff Engineer', 'Systems Architect'],
      totalJobs: 42,
      pendingCount: 7
    };

    const result = findCopilotAnswer('Who created SPrav Job AI?', candidateContext);
    assert.ok(result);
    assert.match(result.answer, /SVS Praveen/);
  });

  it('returns null for open-ended candidate resume code queries to allow LLM execution', () => {
    const result = findCopilotAnswer('How should I describe my Kafka streaming experience?');
    assert.equal(result, null);
  });

  it('handles null, undefined, or empty queries gracefully', () => {
    assert.equal(findCopilotAnswer(null), null);
    assert.equal(findCopilotAnswer(undefined), null);
    assert.equal(findCopilotAnswer(''), null);
    assert.equal(findCopilotAnswer('   '), null);
    assert.equal(findCopilotAnswer('a'), null);
  });
});

describe('Copilot Knowledge Engine - Tab Contextual Suggestions', () => {
  it('returns appropriate suggested prompt pills for jobs tab', () => {
    const suggestions = getSuggestedQueriesForTab('jobs', 4);
    assert.equal(suggestions.length, 4);
    assert.match(suggestions[0], /ghost jobs/i);
  });

  it('returns appropriate suggested prompt pills for negotiation tab', () => {
    const suggestions = getSuggestedQueriesForTab('negotiation', 4);
    assert.equal(suggestions.length, 4);
    assert.ok(suggestions.some(s => s.includes('Chris Voss')));
  });

  it('returns default suggestions for unknown tab', () => {
    const suggestions = getSuggestedQueriesForTab('unknown_tab_xyz', 4);
    assert.equal(suggestions.length, 4);
    assert.ok(suggestions.some(s => s.includes('SVS Praveen') || s.includes('Anti-SaaS')));
  });

  it('respects the limit argument', () => {
    const suggestions = getSuggestedQueriesForTab('tracker', 2);
    assert.equal(suggestions.length, 2);
  });
});

describe('Copilot Knowledge Engine - Full-Text Search', () => {
  it('finds multiple relevant entries for tech queries', () => {
    const results = searchFaq('Ollama', 5);
    assert.ok(results.length >= 1);
    assert.match(results[0].title, /Ollama/i);
  });

  it('returns empty array on empty or whitespace search', () => {
    assert.deepEqual(searchFaq(''), []);
    assert.deepEqual(searchFaq('   '), []);
    assert.deepEqual(searchFaq(null), []);
  });
});
