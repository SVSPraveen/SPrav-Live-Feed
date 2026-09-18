import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  CORE_COMPETENCIES,
  createStarStory,
  validateStarStory,
  auditStarCompleteness,
  findRelevantStarStories,
  formatStarStoryForPrompt,
  SEED_STAR_STORIES
} from './star_story_bank.js';

describe('star_story_bank utility', () => {
  it('CORE_COMPETENCIES contains 7 canonical behavioral competencies with styling', () => {
    const keys = Object.keys(CORE_COMPETENCIES);
    assert.strictEqual(keys.length, 7);
    assert.ok(CORE_COMPETENCIES.leadership);
    assert.ok(CORE_COMPETENCIES.conflict);
    assert.ok(CORE_COMPETENCIES.scalability);
    assert.ok(CORE_COMPETENCIES.failure);
    assert.ok(CORE_COMPETENCIES.tradeoffs);
    assert.ok(CORE_COMPETENCIES.collaboration);
    assert.ok(CORE_COMPETENCIES.culture);

    for (const key of keys) {
      const meta = CORE_COMPETENCIES[key];
      assert.ok(meta.id);
      assert.ok(meta.label);
      assert.ok(meta.color);
      assert.ok(Array.isArray(meta.keywords));
    }
  });

  it('createStarStory creates normalized story with timestamps and tags', () => {
    const story = createStarStory({
      title: 'Incident Recovery',
      competency: 'failure',
      situation: 'System crashed during flash sale.',
      task: 'Restore database cluster.',
      action: 'I failed over to replica and patched memory leak.',
      result: 'Restored service in 4 mins with zero data loss.',
      tags: 'Redis, Failover, High Availability'
    });

    assert.ok(story.id.startsWith('star_'));
    assert.strictEqual(story.title, 'Incident Recovery');
    assert.strictEqual(story.competency, 'failure');
    assert.strictEqual(story.tags.length, 3);
    assert.deepStrictEqual(story.tags, ['Redis', 'Failover', 'High Availability']);
    assert.ok(story.created_at);
    assert.ok(story.updated_at);
  });

  it('validateStarStory validates complete vs incomplete stories', () => {
    assert.strictEqual(validateStarStory(null), false);
    assert.strictEqual(validateStarStory({}), false);
    assert.strictEqual(validateStarStory({ title: 'Test', situation: 'S' }), false);

    const valid = {
      title: 'Outage',
      situation: 'Production was down.',
      task: 'Fix the bug.',
      action: 'I wrote a patch.',
      result: 'Uptime restored.'
    };
    assert.strictEqual(validateStarStory(valid), true);
  });

  it('auditStarCompleteness evaluates high-quality STAR story vs weak story', () => {
    const strongStory = {
      title: 'Kafka Streaming Migration',
      competency: 'scalability',
      situation: 'During peak black friday traffic, legacy ingestion queue backed up with 1.4M events.',
      task: 'My task was to architect a distributed streaming system with zero message loss.',
      action: 'I architected an Apache Kafka cluster, implemented consumer groups in Go, and deployed an automated rebalance policy.',
      result: 'Reduced tail p99 latency by 65ms, handled 450k req/sec, and achieved 99.99% availability.'
    };

    const audit = auditStarCompleteness(strongStory);
    assert.ok(audit.score >= 80, `Expected score >= 80, got ${audit.score}`);
    assert.strictEqual(audit.isComplete, true);
    assert.strictEqual(audit.breakdown.situation, 25);
    assert.strictEqual(audit.breakdown.task, 25);
    assert.strictEqual(audit.breakdown.action, 25);
    assert.strictEqual(audit.breakdown.result, 25);
  });

  it('auditStarCompleteness detects weak passive verbs and unquantified results', () => {
    const weakStory = {
      title: 'Helped Team',
      situation: 'Short',
      task: 'Short',
      action: 'I helped with the database and worked on testing.',
      result: 'Things got better.'
    };

    const audit = auditStarCompleteness(weakStory);
    assert.ok(audit.score < 60, `Expected score < 60, got ${audit.score}`);
    assert.strictEqual(audit.isComplete, false);
    assert.ok(audit.feedback.some(f => f.includes('passive')));
    assert.ok(audit.feedback.some(f => f.includes('quantified')));
  });

  it('findRelevantStarStories ranks stories based on prompt keywords and competencies', () => {
    const stories = [
      createStarStory({
        title: 'Resolving Production Outage',
        competency: 'failure',
        situation: 'Database crashed under heavy load.',
        task: 'Mitigate outage.',
        action: 'I failed over nodes.',
        result: 'Restored service in 5m.'
      }),
      createStarStory({
        title: 'Architectural Disagreement on Tech Stack',
        competency: 'conflict',
        situation: 'Product lead wanted MongoDB while engineering required Postgres.',
        task: 'Build consensus on data store.',
        action: 'I ran latency benchmarks and presented trade-offs.',
        result: 'Agreed on PostgreSQL, saving 3 months of migration.'
      })
    ];

    // Outage question should rank failure story first
    const outageResults = findRelevantStarStories('Tell me about a time you led a production incident outage', stories);
    assert.ok(outageResults.length > 0);
    assert.strictEqual(outageResults[0].story.title, 'Resolving Production Outage');
    assert.strictEqual(outageResults[0].matchedCompetency, 'failure');

    // Conflict question should rank conflict story first
    const conflictResults = findRelevantStarStories('Describe a disagreement you had with a team lead', stories);
    assert.ok(conflictResults.length > 0);
    assert.strictEqual(conflictResults[0].story.title, 'Architectural Disagreement on Tech Stack');
    assert.strictEqual(conflictResults[0].matchedCompetency, 'conflict');
  });

  it('formatStarStoryForPrompt outputs structured Markdown outline', () => {
    const story = createStarStory({
      title: 'Scaling Ingestion',
      competency: 'scalability',
      situation: 'High traffic surge.',
      task: 'Prevent data loss.',
      action: 'Added Kafka partitions.',
      result: 'Processed 500k req/s.'
    });

    const markdown = formatStarStoryForPrompt(story);
    assert.ok(markdown.includes('### STAR Story: Scaling Ingestion'));
    assert.ok(markdown.includes('System Scalability & Performance'));
    assert.ok(markdown.includes('**Situation:** High traffic surge.'));
    assert.ok(markdown.includes('**Task:** Prevent data loss.'));
    assert.ok(markdown.includes('**Action:** Added Kafka partitions.'));
    assert.ok(markdown.includes('**Result:** Processed 500k req/s.'));
  });

  it('SEED_STAR_STORIES contains production-grade starter stories that pass validation', () => {
    assert.ok(SEED_STAR_STORIES.length >= 7);
    for (const seed of SEED_STAR_STORIES) {
      assert.ok(validateStarStory(seed));
      const audit = auditStarCompleteness(seed);
      assert.ok(audit.isComplete, `Seed story ${seed.title} should be complete, score was ${audit.score}`);
      assert.ok(audit.score >= 80);
    }
  });

  it('SEED_STAR_STORIES includes junior and fresher relevant profiles (0-2 YOE)', () => {
    const juniorStories = SEED_STAR_STORIES.filter(s => 
      Array.isArray(s.tags) && s.tags.includes('Fresher / Junior')
    );
    assert.strictEqual(juniorStories.length, 3, 'Must contain at least 3 junior/fresher seed stories');
    for (const story of juniorStories) {
      const audit = auditStarCompleteness(story);
      assert.strictEqual(audit.score, 100, `Junior story "${story.title}" must achieve 100 score on STAR completeness`);
    }
  });
});
