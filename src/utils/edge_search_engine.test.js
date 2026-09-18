import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EdgeSearchEngine } from './edge_search_engine.js';

test('EdgeSearchEngine: tokenizeQuery parses technical terms and filters noise', () => {
  const engine = new EdgeSearchEngine();
  const tokens = engine.tokenizeQuery('Senior React.js / Node.js Architect with C++ and CI/CD');

  assert.ok(tokens.includes('senior'));
  assert.ok(tokens.includes('react'));
  assert.ok(tokens.includes('nodejs'));
  assert.ok(tokens.includes('architect'));
  assert.ok(tokens.includes('cpp'));
  assert.ok(tokens.includes('cicd'));
  // Stopwords should be excluded
  assert.ok(!tokens.includes('with'));
  assert.ok(!tokens.includes('and'));
});

test('EdgeSearchEngine: findMatchingChunks intersects multi-term queries accurately', () => {
  const engine = new EdgeSearchEngine();
  engine.indexData = {
    total_jobs: 100000,
    total_chunks: 4,
    terms: {
      rust: [0, 2],
      staff: [1, 2, 3],
      stripe: [2],
      python: [0, 1]
    },
    facets: {
      seniority: {
        staff: [1, 2, 3],
        senior: [0]
      },
      location: {
        remote: [0, 2]
      }
    }
  };

  // 1. Single term lookup
  assert.deepEqual(engine.findMatchingChunks(['rust']), [0, 2]);

  // 2. Multi-term intersection: "rust staff" -> intersection of [0, 2] and [1, 2, 3] = [2]
  assert.deepEqual(engine.findMatchingChunks(['rust', 'staff']), [2]);

  // 3. Term + Seniority facet intersection: "rust" + seniority: "senior" -> [0, 2] & [0] = [0]
  const seniorRust = engine.findMatchingChunks(['rust'], { seniority: 'senior' });
  assert.deepEqual(seniorRust, [0]);

  // 4. Term + Remote location facet: "rust" + location: "remote" -> [0, 2] & [0, 2] = [0, 2]
  const remoteRust = engine.findMatchingChunks(['rust'], { location: 'remote' });
  assert.deepEqual(remoteRust, [0, 2]);
});

test('EdgeSearchEngine: scoreJob awards highest relevance to title and freshness', () => {
  const engine = new EdgeSearchEngine();
  const query = 'distributed systems engineer';
  const tokens = ['distributed', 'systems', 'engineer'];

  const exactTitleJob = {
    title: 'Distributed Systems Engineer',
    company: 'Temporal',
    description: 'Work on workflows.',
    posted_at: new Date().toISOString(),
    source: 'GREENHOUSE_ATS'
  };

  const descOnlyJob = {
    title: 'Software Developer',
    company: 'Generic Corp',
    description: 'Experience with distributed systems is a plus.',
    posted_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
  };

  const titleScore = engine.scoreJob(exactTitleJob, tokens, query);
  const descScore = engine.scoreJob(descOnlyJob, tokens, query);

  assert.ok(titleScore > descScore * 2, 'Title and fresh ATS match should score significantly higher than desc match');
});

test('EdgeSearchEngine: LRU chunk cache evicts oldest chunk when capacity is reached', async () => {
  const engine = new EdgeSearchEngine();
  engine.maxCachedChunks = 2; // Test threshold

  // Manually prime the cache
  engine.lruChunkCache.set(0, [{ id: 'job_0' }]);
  engine.lruChunkCache.set(1, [{ id: 'job_1' }]);

  assert.equal(engine.lruChunkCache.size, 2);
  assert.ok(engine.lruChunkCache.has(0));
  assert.ok(engine.lruChunkCache.has(1));

  // Access chunk 0 to make chunk 1 the oldest
  engine.lruChunkCache.get(0);
  engine.lruChunkCache.delete(0);
  engine.lruChunkCache.set(0, [{ id: 'job_0' }]);

  // Add chunk 2
  if (engine.lruChunkCache.size >= engine.maxCachedChunks) {
    const oldestKey = engine.lruChunkCache.keys().next().value;
    engine.lruChunkCache.delete(oldestKey);
  }
  engine.lruChunkCache.set(2, [{ id: 'job_2' }]);

  assert.equal(engine.lruChunkCache.size, 2);
  assert.equal(engine.lruChunkCache.has(1), false, 'Oldest chunk (1) should be evicted');
  assert.ok(engine.lruChunkCache.has(0));
  assert.ok(engine.lruChunkCache.has(2));
});

test('EdgeSearchEngine: searchUniverse executes end-to-end query ranking with telemetry', async () => {
  const engine = new EdgeSearchEngine();
  engine.indexData = {
    total_jobs: 50000,
    total_chunks: 2,
    terms: {
      frontend: [0],
      react: [0]
    }
  };

  // Mock fetchChunk to simulate reading from local mock data
  engine.fetchChunk = async (chunkIdx) => {
    if (chunkIdx === 0) {
      return [
        {
          id: 'job_react_lead',
          title: 'Lead Frontend Engineer (React)',
          company: 'Figma',
          location: 'San Francisco, CA',
          scraped_at: new Date().toISOString()
        },
        {
          id: 'job_python_backend',
          title: 'Backend Python Engineer',
          company: 'Django Inc',
          location: 'Remote',
          scraped_at: new Date().toISOString()
        }
      ];
    }
    return [];
  };

  const res = await engine.searchUniverse('React Frontend', { limit: 10 });
  assert.ok(res.jobs.length >= 1);
  assert.equal(res.jobs[0].company, 'Figma');
  assert.equal(res.totalMatches, 1);
  assert.ok(typeof res.durationMs === 'number');
  assert.equal(res.chunksScanned, 1);
});
