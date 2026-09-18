import test from 'node:test';
import assert from 'node:assert/strict';
import {
  TARGET_JOB_SCENARIOS,
  SYNTHETIC_CANDIDATE_PROFILES,
  buildChosenSample,
  buildChosenOutreachSample,
  buildRejectedSample,
  estimateTokens,
  generateLoRADataset,
  exportLoRADatasetJSONL,
  CHOSEN_SKELETONS
} from './lora_cover_letter_dataset.js';
import { FORBIDDEN_AI_CLICHES } from './cover_letter_style_engine.js';
import { EXEMPLAR_RESUMES } from './exemplar_tech_resumes.js';
import { SEED_STAR_STORIES as STAR_STORIES } from './star_story_bank.js';

test('TARGET_JOB_SCENARIOS & SYNTHETIC_CANDIDATE_PROFILES: comprehensive coverage', () => {
  assert.ok(TARGET_JOB_SCENARIOS.length >= 25, `Should have at least 25 job scenarios (found ${TARGET_JOB_SCENARIOS.length})`);
  assert.ok(SYNTHETIC_CANDIDATE_PROFILES.length >= 6, `Should have at least 6 candidate profiles (found ${SYNTHETIC_CANDIDATE_PROFILES.length})`);

  const categories = new Set(TARGET_JOB_SCENARIOS.map(s => s.category));
  assert.ok(categories.size >= 7, 'Should span at least 7 distinct engineering categories');
});

test('buildChosenSample: generates human, metric-driven text without AI cliches', () => {
  const scenario = TARGET_JOB_SCENARIOS[0];
  const exemplar = EXEMPLAR_RESUMES[0];
  const starStory = STAR_STORIES[0];

  const chosen = buildChosenSample(scenario, exemplar, starStory);

  assert.ok(chosen.length > 200, 'Chosen sample should have adequate length');
  assert.ok(chosen.includes(scenario.company), 'Should mention target company');
  assert.ok(chosen.includes(exemplar.name), 'Should sign with candidate name');

  // Verify chosen does NOT have rigid paragraph headers
  assert.equal(/Paragraph \d+:/i.test(chosen), false, 'Should not contain paragraph header labels');

  // Verify chosen does NOT contain forbidden cliches
  const lowerChosen = chosen.toLowerCase();
  for (const buzzword of FORBIDDEN_AI_CLICHES) {
    assert.equal(
      lowerChosen.includes(buzzword.toLowerCase()),
      false,
      `Chosen sample should not contain banned cliché: "${buzzword}"`
    );
  }
});

test('buildChosenOutreachSample: generates punchy, peer-to-peer cold pitch', () => {
  const scenario = TARGET_JOB_SCENARIOS[0];
  const candidate = SYNTHETIC_CANDIDATE_PROFILES[0];
  const starStory = STAR_STORIES[0];

  const pitch = buildChosenOutreachSample(scenario, candidate, starStory);

  assert.ok(pitch.includes(scenario.company), 'Should mention target company');
  assert.ok(pitch.includes(candidate.name), 'Should include candidate sign-off');
  assert.ok(pitch.length > 50 && pitch.length < 750, 'Outreach pitch should be concise');
  assert.ok(pitch.split(/\s+/).length < 120, 'Outreach pitch should be under 120 words');

  const lowerPitch = pitch.toLowerCase();
  for (const buzzword of FORBIDDEN_AI_CLICHES) {
    assert.equal(
      lowerPitch.includes(buzzword.toLowerCase()),
      false,
      `Outreach pitch should not contain banned cliché: "${buzzword}"`
    );
  }
});

test('buildRejectedSample: deliberately contains formulaic labels and AI cliches for DPO contrast', () => {
  const scenario = TARGET_JOB_SCENARIOS[0];
  const exemplar = EXEMPLAR_RESUMES[0];

  const rejected = buildRejectedSample(scenario, exemplar);

  assert.ok(/Paragraph \d+/i.test(rejected), 'Rejected sample should contain rigid paragraph markers');
  assert.ok(rejected.includes('passionate'), 'Rejected sample should contain cliché "passionate"');
  assert.ok(rejected.includes('synergy') || rejected.includes('synergies'), 'Rejected sample should contain cliché "synergy"');
  assert.ok(rejected.includes('thrilled'), 'Rejected sample should contain cliché "thrilled"');
});

test('generateLoRADataset: builds 300+ sample fine-tuning dataset with strict 1024-token bounds', () => {
  const dataset = generateLoRADataset();

  assert.ok(dataset.length >= 300, `Dataset must contain 300+ curated samples (actual: ${dataset.length})`);

  // Verify every single sample is under 1024 tokens for 8GB VRAM safety
  for (const item of dataset) {
    const rawText = JSON.stringify(item.messages);
    const tokens = estimateTokens(rawText);
    assert.ok(
      tokens <= 1024,
      `Sample ${item.id} exceeds 1024 tokens (${tokens} tokens). Violates 8GB VRAM ceiling.`
    );
    assert.ok(item.instruction);
    assert.ok(item.input);
    assert.ok(item.output);
    assert.ok(item.chosen);
    assert.ok(item.rejected);
    assert.equal(item.messages.length, 3);
  }

  // Verify distribution of types
  const coverLetters = dataset.filter(d => d.type === 'cover_letter');
  const outreach = dataset.filter(d => d.type === 'outreach_pitch');
  assert.ok(coverLetters.length >= 150, 'Should have at least 150 cover letter samples');
  assert.ok(outreach.length >= 150, 'Should have at least 150 outreach samples');
});

test('exportLoRADatasetJSONL: formats JSONL for ChatML, Alpaca, DPO, and Unsloth Prompt', () => {
  const dataset = generateLoRADataset().slice(0, 4);

  // 1. ChatML
  const chatmlLines = exportLoRADatasetJSONL('chatml', dataset).split('\n');
  assert.equal(chatmlLines.length, 4);
  for (const line of chatmlLines) {
    const parsed = JSON.parse(line);
    assert.ok(Array.isArray(parsed.messages));
    assert.equal(parsed.messages.length, 3);
  }

  // 2. Alpaca
  const alpacaLines = exportLoRADatasetJSONL('alpaca', dataset).split('\n');
  assert.equal(alpacaLines.length, 4);
  for (const line of alpacaLines) {
    const parsed = JSON.parse(line);
    assert.ok(parsed.instruction);
    assert.ok(parsed.input);
    assert.ok(parsed.output);
  }

  // 3. DPO
  const dpoLines = exportLoRADatasetJSONL('dpo', dataset).split('\n');
  assert.equal(dpoLines.length, 4);
  for (const line of dpoLines) {
    const parsed = JSON.parse(line);
    assert.ok(parsed.prompt);
    assert.ok(parsed.chosen);
    assert.ok(parsed.rejected);
    assert.notEqual(parsed.chosen, parsed.rejected);
  }

  // 4. Unsloth Prompt
  const unslothLines = exportLoRADatasetJSONL('unsloth_prompt', dataset).split('\n');
  assert.equal(unslothLines.length, 4);
  for (const line of unslothLines) {
    const parsed = JSON.parse(line);
    assert.ok(parsed.text);
    assert.ok(parsed.text.includes('<|begin_of_text|>'));
    assert.ok(parsed.text.includes('<|start_header_id|>system<|end_header_id|>'));
    assert.ok(parsed.text.includes('<|start_header_id|>assistant<|end_header_id|>'));
  }
});

test('CHOSEN_SKELETONS: generates structurally diverse cover letter architectures', () => {
  const scenario = TARGET_JOB_SCENARIOS[0];
  const candidate = SYNTHETIC_CANDIDATE_PROFILES[0];
  const starStory = STAR_STORIES[0];

  assert.equal(CHOSEN_SKELETONS.length, 5, 'Must have exactly 5 distinct structural skeletons');

  const generatedSamples = CHOSEN_SKELETONS.map((skeletonFn, idx) => {
    return buildChosenSample(scenario, candidate, starStory, idx);
  });

  // Verify all 5 samples are mutually distinct strings
  const uniqueSamples = new Set(generatedSamples);
  assert.equal(uniqueSamples.size, 5, 'All 5 skeleton outputs must be distinct');

  // Verify paragraph counts vary across skeletons
  const paragraphCounts = new Set(generatedSamples.map(s => s.split('\n\n').filter(Boolean).length));
  assert.ok(paragraphCounts.size >= 3, `Paragraph counts must vary across skeletons (found ${[...paragraphCounts].join(', ')})`);
  assert.ok(paragraphCounts.has(2), 'Should have a 2-paragraph concise skeleton');
  assert.ok(paragraphCounts.has(3), 'Should have a 3-paragraph skeleton');
  assert.ok(paragraphCounts.has(4) || paragraphCounts.has(5), 'Should have a multi-beat detailed skeleton');

  // Verify different opening styles across skeletons
  const openings = generatedSamples.map(s => s.trim().slice(0, 30));
  const uniqueOpenings = new Set(openings);
  assert.equal(uniqueOpenings.size, 5, 'All 5 skeletons must have different openings');

  // Verify all 5 mention the company and candidate with zero buzzwords
  for (const sample of generatedSamples) {
    assert.ok(sample.includes(scenario.company));
    assert.ok(sample.includes(candidate.name));
    for (const buzzword of FORBIDDEN_AI_CLICHES) {
      assert.equal(sample.toLowerCase().includes(buzzword.toLowerCase()), false);
    }
  }
});

