import test from 'node:test';
import assert from 'node:assert/strict';
import {
  hashText,
  cosineSimilarity,
  reciprocalRankFusion,
  getEmbeddingEngineStatus,
  hybridSemanticKbSearch,
  calibrateCosineToPercentage,
  buildCandidateEmbeddingProfile,
  buildJobEmbeddingRepresentation,
  extractKbChunks,
  computeKbFingerprint,
  precomputeKbVectors,
  BGE_QUERY_PREFIX
} from './semantic_vector_engine.js';

test('BGE_QUERY_PREFIX: adheres to BAAI asymmetric query instruction format', () => {
  assert.equal(BGE_QUERY_PREFIX, 'Represent this sentence for searching relevant passages: ');
  const rawQuery = 'React frontend performance';
  const queryHash = hashText(`${BGE_QUERY_PREFIX}${rawQuery}`);
  const passageHash = hashText(rawQuery);
  assert.notEqual(queryHash, passageHash, 'Query vector cache must be distinct from passage cache');
});

test('hashText: produces deterministic 32-bit hex hash with normalization', () => {
  const h1 = hashText('FastAPI Microservices');
  const h2 = hashText('  fastapi microservices  ');
  const h3 = hashText('Different Text');

  assert.ok(h1);
  assert.equal(h1, h2, 'Hash must be case and whitespace insensitive');
  assert.notEqual(h1, h3, 'Different strings must produce different hashes');
});

test('cosineSimilarity: calculates exact geometric vector similarity', () => {
  // 1. Identical vectors -> 1.0
  const v1 = [1, 2, 3];
  const v2 = [1, 2, 3];
  assert.ok(Math.abs(cosineSimilarity(v1, v2) - 1.0) < 1e-5);

  // 2. Collinear vectors with different magnitude -> 1.0
  const v3 = [2, 4, 6];
  assert.ok(Math.abs(cosineSimilarity(v1, v3) - 1.0) < 1e-5);

  // 3. Orthogonal vectors -> 0.0
  const ortho1 = [1, 0];
  const ortho2 = [0, 1];
  assert.equal(cosineSimilarity(ortho1, ortho2), 0);

  // 4. Opposite vectors -> -1.0
  const opp1 = [1, 1];
  const opp2 = [-1, -1];
  assert.ok(Math.abs(cosineSimilarity(opp1, opp2) - (-1.0)) < 1e-5);

  // 5. Dimension mismatch & empty guards
  assert.equal(cosineSimilarity([1, 2], [1, 2, 3]), 0);
  assert.equal(cosineSimilarity([], []), 0);
  assert.equal(cosineSimilarity(null, [1, 2]), 0);
});

test('reciprocalRankFusion: blends sparse lexical and dense semantic rankings', () => {
  // Document A: Rank 1 in lexical, Rank 2 in semantic
  // Document B: Rank 2 in lexical, Rank 1 in semantic
  // Document C: Rank 3 in lexical, absent in semantic
  // Document D: Absent in lexical, Rank 3 in semantic
  const lexical = [{ id: 'docA' }, { id: 'docB' }, { id: 'docC' }];
  const semantic = [{ id: 'docB' }, { id: 'docA' }, { id: 'docD' }];

  const fused = reciprocalRankFusion(lexical, semantic, 60);

  assert.equal(fused.length, 4);
  // Both docA and docB have (1/61 + 1/62) = ~0.0325
  assert.ok(fused[0].id === 'docA' || fused[0].id === 'docB');
  assert.ok(fused[1].id === 'docA' || fused[1].id === 'docB');
  assert.ok(fused[0].rrfScore > fused[2].rrfScore);

  // docC and docD only have 1/63 = ~0.0158
  assert.ok(fused[2].id === 'docC' || fused[2].id === 'docD');
});

test('getEmbeddingEngineStatus: reports 0 VRAM and CPU SIMD architecture', () => {
  const status = getEmbeddingEngineStatus();
  assert.equal(status.model, 'bge-small-en-v1.5');
  assert.equal(status.dimensions, 384);
  assert.ok(status.backend.includes('0 VRAM'));
});

test('hybridSemanticKbSearch: retrieves relevant chunks and falls back gracefully', async () => {
  const sampleKb = {
    work_history: [
      {
        company: 'Stripe',
        role: 'Senior Backend Engineer',
        bullets: [
          'Architected Kubernetes zero-downtime rolling updates with multi-region failover handling 15M daily requests.',
          'Optimized PostgreSQL query latency by 45% using composite indexing.'
        ]
      }
    ],
    projects: [
      {
        name: 'Agentic Workflow',
        tech_stack: 'LangGraph, FastAPI, Qdrant',
        bullets: [
          'Built multi-agent autonomous decision loop with tool calling and vector embeddings.'
        ]
      }
    ]
  };

  // 1. Query for Kubernetes failovers
  const res1 = await hybridSemanticKbSearch('Kubernetes failovers', sampleKb, { topK: 2 });
  assert.ok(res1);
  assert.ok(res1.chunks.length > 0);
  assert.ok(res1.text.includes('Kubernetes'));

  // 2. Query for LangGraph
  const res2 = await hybridSemanticKbSearch('LangGraph agent', sampleKb, { topK: 2 });
  assert.ok(res2);
  assert.ok(res2.text.includes('LangGraph') || res2.text.includes('autonomous'));

  // 3. Null KB
  const emptyRes = await hybridSemanticKbSearch('anything', null);
  assert.equal(emptyRes.chunks.length, 0);
  assert.equal(emptyRes.mode, 'none');
});

test('calibrateCosineToPercentage: maps raw cosine similarities to authentic 25-99% scale', () => {
  assert.equal(calibrateCosineToPercentage(0.1), 25, 'Out-of-domain should floor at 25');
  assert.equal(calibrateCosineToPercentage(0.25), 25, 'Baseline should map to 25');
  assert.ok(calibrateCosineToPercentage(0.50) >= 55 && calibrateCosineToPercentage(0.50) <= 65, 'Mid cosine should be ~60%');
  assert.ok(calibrateCosineToPercentage(0.70) >= 80 && calibrateCosineToPercentage(0.70) <= 90, 'High cosine should be ~85%');
  assert.equal(calibrateCosineToPercentage(0.85), 99, 'Very high cosine should cap at 99');
  assert.equal(calibrateCosineToPercentage(null), 50, 'Fallback on invalid');
});

test('buildCandidateEmbeddingProfile & buildJobEmbeddingRepresentation: formats clean dense text', () => {
  const candidate = {
    personal: { title: 'Staff Platform Engineer' },
    skills: ['Kubernetes', 'Go', 'Terraform'],
    work_history: [{ company: 'Cloud Corp', role: 'Architect', bullets: ['Built multi-region cluster'] }]
  };
  const candText = buildCandidateEmbeddingProfile(candidate);
  assert.ok(candText.includes('Staff Platform Engineer'));
  assert.ok(candText.includes('Kubernetes'));
  assert.ok(candText.includes('Cloud Corp'));

  const job = {
    title: 'Senior Kubernetes SRE',
    company: 'Fintech Inc',
    location: 'Remote',
    description: 'Looking for a Kubernetes specialist with Go and Terraform experience.'
  };
  const jobText = buildJobEmbeddingRepresentation(job);
  assert.ok(jobText.includes('Senior Kubernetes SRE'));
  assert.ok(jobText.includes('Fintech Inc'));
  assert.ok(jobText.includes('Kubernetes specialist'));
});

test('extractKbChunks: parses work history, projects, and star stories into uniform chunks', () => {
  const kb = {
    work_history: [
      { company: 'Meta', role: 'Staff SRE', bullets: ['Engineered auto-remediation service.'] }
    ],
    projects: [
      { name: 'Raft Cluster', tech_stack: 'Go, gRPC', bullets: ['Leader election engine.'] }
    ],
    star_stories: [
      { title: 'Outage Response', competency: 'Incident Management', situation: 'Site down', task: 'Restore', action: 'Failover DNS', result: '99.99% SLA' }
    ]
  };

  const chunks = extractKbChunks(kb);
  assert.equal(chunks.length, 3);
  assert.equal(chunks[0].type, 'experience');
  assert.ok(chunks[0].text.includes('Meta'));
  assert.equal(chunks[1].type, 'project');
  assert.ok(chunks[1].text.includes('Raft Cluster'));
  assert.equal(chunks[2].type, 'star_story');
  assert.ok(chunks[2].text.includes('Outage Response'));
});

test('computeKbFingerprint: generates deterministic hash that updates on KB changes', () => {
  const kb1 = {
    work_history: [{ company: 'Google', role: 'SWE', bullets: ['Built search pipeline'] }],
    skills: ['Go', 'C++']
  };
  const kb2 = {
    work_history: [{ company: 'Google', role: 'SWE', bullets: ['Built search pipeline'] }],
    skills: ['Go', 'C++']
  };
  const kb3 = {
    work_history: [{ company: 'Google', role: 'SWE', bullets: ['Built search pipeline with vector search'] }],
    skills: ['Go', 'C++']
  };

  const fp1 = computeKbFingerprint(kb1);
  const fp2 = computeKbFingerprint(kb2);
  const fp3 = computeKbFingerprint(kb3);

  assert.ok(fp1);
  assert.equal(fp1, fp2, 'Identical KB content must yield identical fingerprint');
  assert.notEqual(fp1, fp3, 'Modified KB content must invalidate fingerprint');
});
