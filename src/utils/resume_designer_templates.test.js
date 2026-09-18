import test from 'node:test';
import assert from 'node:assert/strict';
import { 
  RESUME_TEMPLATES, 
  RESUME_FONTS, 
  RESUME_COLORS, 
  RESUME_DENSITIES, 
  getTemplateTokens 
} from './resume_designer_templates.js';

test('resume_designer_templates: exports valid template archetypes', () => {
  assert.equal(RESUME_TEMPLATES.length, 7);
  const ids = RESUME_TEMPLATES.map(t => t.id);
  assert.ok(ids.includes('jakes_resume'));
  assert.ok(ids.includes('ivy_classic'));
  assert.ok(ids.includes('modern_tech'));
  assert.ok(ids.includes('high_density'));
  assert.ok(ids.includes('overleaf_latex'));
  assert.ok(ids.includes('creative_sidebar'));
  assert.ok(ids.includes('executive_minimal'));

  for (const t of RESUME_TEMPLATES) {
    assert.ok(t.name);
    assert.ok(t.tagline);
    assert.ok(t.description);
    assert.ok(Array.isArray(t.features) && t.features.length > 0);
    assert.equal(typeof t.atsSafe, 'boolean');
  }
});

test('resume_designer_templates: exports curated fonts and color palettes', () => {
  assert.ok(RESUME_FONTS.length >= 4);
  assert.ok(RESUME_COLORS.length >= 5);
  assert.ok(RESUME_DENSITIES.length >= 3);

  const fontFamilies = RESUME_FONTS.map(f => f.family);
  assert.ok(fontFamilies.some(fam => fam.includes('Merriweather')));
  assert.ok(fontFamilies.some(fam => fam.includes('Inter')));

  for (const c of RESUME_COLORS) {
    assert.ok(c.primary.startsWith('#'));
    assert.ok(Array.isArray(c.pdfRgb) && c.pdfRgb.length === 3);
  }
});

test('resume_designer_templates: getTemplateTokens produces valid tokens for defaults and fallbacks', () => {
  const defaultTokens = getTemplateTokens();
  assert.equal(defaultTokens.template.id, 'ivy_classic');
  assert.equal(defaultTokens.font.id, 'merriweather');
  assert.equal(defaultTokens.color.id, 'charcoal');
  assert.equal(defaultTokens.density.id, 'standard');
  assert.equal(defaultTokens.styles.header.textAlign, 'center');
  assert.ok(defaultTokens.styles.container.padding);

  const modernTokens = getTemplateTokens({
    templateId: 'modern_tech',
    fontId: 'inter',
    colorId: 'navy',
    densityId: 'compact'
  });
  assert.equal(modernTokens.template.id, 'modern_tech');
  assert.equal(modernTokens.font.id, 'inter');
  assert.equal(modernTokens.color.id, 'navy');
  assert.equal(modernTokens.density.id, 'compact');
  assert.equal(modernTokens.styles.header.textAlign, 'left');
  assert.equal(modernTokens.styles.skillPill.borderRadius, '12px');

  // Fallback on invalid IDs
  const fallbackTokens = getTemplateTokens({
    templateId: 'unknown_fake',
    fontId: 'unknown_font',
    colorId: 'unknown_color',
    densityId: 'unknown_density'
  });
  assert.equal(fallbackTokens.template.id, 'ivy_classic');
  assert.equal(fallbackTokens.font.id, 'merriweather');
  assert.equal(fallbackTokens.color.id, 'charcoal');
  assert.equal(fallbackTokens.density.id, 'standard');
});

test('resume_designer_templates: creative_sidebar produces valid two-column layout tokens and photo styles', () => {
  const creativeTokens = getTemplateTokens({
    templateId: 'creative_sidebar',
    fontId: 'inter',
    colorId: 'navy',
    densityId: 'standard'
  });

  assert.equal(creativeTokens.template.id, 'creative_sidebar');
  assert.equal(creativeTokens.isCreative, true);
  assert.equal(creativeTokens.isTwoColumn, true);
  assert.ok(creativeTokens.styles.twoColumnGrid);
  assert.ok(creativeTokens.styles.sidebar);
  assert.ok(creativeTokens.styles.mainCol);
  assert.ok(creativeTokens.styles.avatarContainer);
  assert.ok(creativeTokens.styles.avatarImg);
});

test('resume_designer_templates: overleaf_latex produces mathematical LaTeX layout tokens', () => {
  const latexTokens = getTemplateTokens({
    templateId: 'overleaf_latex',
    fontId: 'computer_modern',
    colorId: 'charcoal',
    densityId: 'standard'
  });

  assert.equal(latexTokens.template.id, 'overleaf_latex');
  assert.equal(latexTokens.isLatex, true);
  assert.equal(latexTokens.font.id, 'computer_modern');
  assert.equal(latexTokens.styles.header.textAlign, 'center');
});
