/**
 * resume_diff_engine.js
 * =====================
 * Pure Client-Side Semantic Resume Diffing Engine
 *
 * Compares two resume snapshots (or a snapshot against current active studio state)
 * with zero remote network calls and $0 API cost.
 *
 * Computes:
 * 1. Template & Typography Styling Tokens Diff
 * 2. Professional Summary Sentence-Level Diff
 * 3. Categorical Skills Delta (+added, -removed, common)
 * 4. Work Experience & STAR Bullet Point Refinements
 * 5. Project Portfolios & Education Deltas
 */

/**
 * Creates a normalized snapshot object from the active studio state.
 */
export function createStudioSnapshotObject({
  name = 'Current Active Resume',
  templateId = 'ivy_classic',
  fontId = 'merriweather',
  colorId = 'charcoal',
  densityId = 'standard',
  kb = {},
  bulletOverrides = {},
  selectedJob = null,
  selectedJobId = 'master',
  candidatePhoto = null
} = {}) {
  return {
    id: 'current_active_studio',
    name,
    targetJobTitle: selectedJob ? `${selectedJob.title || 'Target Role'} @ ${selectedJob.company || 'Company'}` : 'Master Profile',
    templateId,
    fontId,
    colorId,
    densityId,
    data: {
      kb: JSON.parse(JSON.stringify(kb || {})),
      bulletOverrides: JSON.parse(JSON.stringify(bulletOverrides || {})),
      selectedJobId,
      candidatePhoto
    },
    created_at: new Date().toISOString()
  };
}

/**
 * Flatten all skills from Knowledge Base whether structured as object, array, or comma string.
 *
 * @param {object} kb - Knowledge base object
 * @returns {string[]} Normalized unique list of skill strings
 */
export function extractAllSkillsFlat(kb) {
  if (!kb) return [];
  const rawSkills = kb.skills;
  if (!rawSkills) return [];

  const resultSet = new Set();

  if (Array.isArray(rawSkills)) {
    rawSkills.forEach(s => {
      if (typeof s === 'string' && s.trim()) resultSet.add(s.trim());
      else if (s && s.name) resultSet.add(String(s.name).trim());
    });
  } else if (typeof rawSkills === 'object') {
    Object.values(rawSkills).forEach(category => {
      if (Array.isArray(category)) {
        category.forEach(item => {
          if (typeof item === 'string' && item.trim()) resultSet.add(item.trim());
          else if (item && item.name) resultSet.add(String(item.name).trim());
        });
      } else if (typeof category === 'string') {
        category.split(',').forEach(s => {
          if (s.trim()) resultSet.add(s.trim());
        });
      }
    });
  }

  return Array.from(resultSet);
}

/**
 * Resolves effective bullet text applying any active bullet overrides.
 */
export function resolveEffectiveBullets(role, roleIndex, bulletOverrides = {}) {
  if (!role || !Array.isArray(role.bullets)) return [];
  return role.bullets.map((origBullet, bIdx) => {
    // Check nested format { [roleIdx]: { [bIdx]: string } } or flat key `${roleIdx}-${bIdx}`
    if (bulletOverrides[roleIndex] && bulletOverrides[roleIndex][bIdx]) {
      return bulletOverrides[roleIndex][bIdx];
    }
    const flatKey = `${roleIndex}-${bIdx}`;
    if (bulletOverrides[flatKey]) {
      return bulletOverrides[flatKey];
    }
    return origBullet;
  });
}

/**
 * Token-based Jaccard similarity between two strings.
 */
export function calculateTokenSimilarity(str1 = '', str2 = '') {
  const s1 = String(str1).toLowerCase().replace(/[^a-z0-9\s]/g, '');
  const s2 = String(str2).toLowerCase().replace(/[^a-z0-9\s]/g, '');
  const tokens1 = new Set(s1.split(/\s+/).filter(Boolean));
  const tokens2 = new Set(s2.split(/\s+/).filter(Boolean));

  if (tokens1.size === 0 && tokens2.size === 0) return 1.0;
  if (tokens1.size === 0 || tokens2.size === 0) return 0.0;

  let intersection = 0;
  for (const t of tokens1) {
    if (tokens2.has(t)) intersection++;
  }

  const union = tokens1.size + tokens2.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

/**
 * Computes sentence-level diff between two text paragraphs.
 */
export function diffSentences(textA = '', textB = '') {
  const normA = String(textA || '').trim();
  const normB = String(textB || '').trim();

  if (normA === normB) {
    return {
      hasChanges: false,
      diffs: normA ? [{ type: 'unchanged', text: normA }] : []
    };
  }

  const splitSentences = (t) => t.split(/(?<=[.?!])\s+/).filter(Boolean);
  const sA = splitSentences(normA);
  const sB = splitSentences(normB);

  const diffs = [];
  const setA = new Set(sA);
  const setB = new Set(sB);

  sA.forEach(sent => {
    if (!setB.has(sent)) {
      diffs.push({ type: 'removed', text: sent });
    }
  });

  sB.forEach(sent => {
    if (!setA.has(sent)) {
      diffs.push({ type: 'added', text: sent });
    } else {
      diffs.push({ type: 'unchanged', text: sent });
    }
  });

  return {
    hasChanges: true,
    diffs
  };
}

/**
 * Main Diffing Function: Compares two resume snapshots.
 *
 * @param {object} snapA - Baseline / previous snapshot
 * @param {object} snapB - Target / newer snapshot
 * @returns {object} Comprehensive diff report
 */
export function diffResumeSnapshots(snapA, snapB) {
  const a = snapA || {};
  const b = snapB || {};

  const kbA = a.data?.kb || a.kb || (a.skills || a.personal || a.work_history ? a : {});
  const kbB = b.data?.kb || b.kb || (b.skills || b.personal || b.work_history ? b : {});
  const overridesA = a.data?.bulletOverrides || a.bulletOverrides || {};
  const overridesB = b.data?.bulletOverrides || b.bulletOverrides || {};

  // ── 1. Styling & Archetype Diff ───────────────────────────────────────────
  const stylingDiff = {
    template: { from: a.templateId || 'ivy_classic', to: b.templateId || 'ivy_classic', changed: (a.templateId || 'ivy_classic') !== (b.templateId || 'ivy_classic') },
    font: { from: a.fontId || 'merriweather', to: b.fontId || 'merriweather', changed: (a.fontId || 'merriweather') !== (b.fontId || 'merriweather') },
    color: { from: a.colorId || 'charcoal', to: b.colorId || 'charcoal', changed: (a.colorId || 'charcoal') !== (b.colorId || 'charcoal') },
    density: { from: a.densityId || 'standard', to: b.densityId || 'standard', changed: (a.densityId || 'standard') !== (b.densityId || 'standard') },
  };
  stylingDiff.hasStylingChanges = stylingDiff.template.changed || stylingDiff.font.changed || stylingDiff.color.changed || stylingDiff.density.changed;

  // ── 2. Professional Summary Diff ──────────────────────────────────────────
  const summaryA = kbA.summary || '';
  const summaryB = kbB.summary || '';
  const summaryDiff = diffSentences(summaryA, summaryB);

  // ── 3. Skills Delta ───────────────────────────────────────────────────────
  const skillsA = extractAllSkillsFlat(kbA);
  const skillsB = extractAllSkillsFlat(kbB);

  const lowerSetA = new Set(skillsA.map(s => s.toLowerCase()));
  const lowerSetB = new Set(skillsB.map(s => s.toLowerCase()));

  const addedSkills = skillsB.filter(s => !lowerSetA.has(s.toLowerCase()));
  const removedSkills = skillsA.filter(s => !lowerSetB.has(s.toLowerCase()));
  const retainedSkills = skillsB.filter(s => lowerSetA.has(s.toLowerCase()));

  const skillsDiff = {
    added: addedSkills,
    removed: removedSkills,
    retained: retainedSkills,
    hasChanges: addedSkills.length > 0 || removedSkills.length > 0
  };

  // ── 4. Work History & Bullet Refinements ───────────────────────────────────
  const rolesA = Array.isArray(kbA.work_history) ? kbA.work_history : [];
  const rolesB = Array.isArray(kbB.work_history) ? kbB.work_history : [];

  const workHistoryDiff = [];
  let totalBulletsAdded = 0;
  let totalBulletsRemoved = 0;
  let totalBulletsModified = 0;

  // Track roles from A matched to roles in B
  const matchedRoleIdxsA = new Set();

  rolesB.forEach((roleB, bIdx) => {
    // Attempt match with role in A by company
    const bCompanyNorm = String(roleB.company || '').toLowerCase().trim();
    const bTitleNorm = String(roleB.title || '').toLowerCase().trim();

    let matchAIdx = rolesA.findIndex((rA, aIdx) => {
      if (matchedRoleIdxsA.has(aIdx)) return false;
      const aComp = String(rA.company || '').toLowerCase().trim();
      const aTitle = String(rA.title || '').toLowerCase().trim();
      const compMatch = aComp === bCompanyNorm || (aComp && bCompanyNorm && (aComp.includes(bCompanyNorm) || bCompanyNorm.includes(aComp)));
      const titleMatch = aTitle === bTitleNorm || (aTitle && bTitleNorm && (aTitle.includes(bTitleNorm) || bTitleNorm.includes(aTitle)));
      return compMatch && titleMatch;
    });

    if (matchAIdx === -1) {
      matchAIdx = rolesA.findIndex((rA, aIdx) => {
        if (matchedRoleIdxsA.has(aIdx)) return false;
        const aComp = String(rA.company || '').toLowerCase().trim();
        return aComp === bCompanyNorm || (aComp && bCompanyNorm && (aComp.includes(bCompanyNorm) || bCompanyNorm.includes(aComp)));
      });
    }

    const bulletsB = resolveEffectiveBullets(roleB, bIdx, overridesB);

    if (matchAIdx === -1) {
      // Entirely new role added in B
      totalBulletsAdded += bulletsB.length;
      workHistoryDiff.push({
        type: 'added_role',
        company: roleB.company || 'New Company',
        title: roleB.title || 'Position',
        period: roleB.period || '',
        bullets: bulletsB.map(text => ({ type: 'added', text }))
      });
    } else {
      matchedRoleIdxsA.add(matchAIdx);
      const roleA = rolesA[matchAIdx];
      const bulletsA = resolveEffectiveBullets(roleA, matchAIdx, overridesA);

      const bulletDiffs = [];
      const matchedBIdxs = new Set();

      bulletsA.forEach((bTextA) => {
        // Find best match in bulletsB
        let bestScore = 0;
        let bestBIdx = -1;

        bulletsB.forEach((bTextB, candidateBIdx) => {
          if (matchedBIdxs.has(candidateBIdx)) return;
          const score = calculateTokenSimilarity(bTextA, bTextB);
          if (score > bestScore) {
            bestScore = score;
            bestBIdx = candidateBIdx;
          }
        });

        if (bestScore === 1.0) {
          matchedBIdxs.add(bestBIdx);
          bulletDiffs.push({ type: 'unchanged', text: bTextA });
        } else if (bestScore >= 0.35) {
          matchedBIdxs.add(bestBIdx);
          totalBulletsModified++;
          bulletDiffs.push({
            type: 'modified',
            originalText: bTextA,
            refinedText: bulletsB[bestBIdx],
            similarity: Math.round(bestScore * 100)
          });
        } else {
          totalBulletsRemoved++;
          bulletDiffs.push({ type: 'removed', text: bTextA });
        }
      });

      // Bullets in B that were not matched are newly added
      bulletsB.forEach((bTextB, candidateBIdx) => {
        if (!matchedBIdxs.has(candidateBIdx)) {
          totalBulletsAdded++;
          bulletDiffs.push({ type: 'added', text: bTextB });
        }
      });

      workHistoryDiff.push({
        type: 'matched_role',
        company: roleB.company || roleA.company,
        title: roleB.title || roleA.title,
        period: roleB.period || roleA.period,
        hasChanges: bulletDiffs.some(b => b.type !== 'unchanged'),
        bullets: bulletDiffs
      });
    }
  });

  // Roles in A that were removed in B
  rolesA.forEach((roleA, aIdx) => {
    if (!matchedRoleIdxsA.has(aIdx)) {
      const bulletsA = resolveEffectiveBullets(roleA, aIdx, overridesA);
      totalBulletsRemoved += bulletsA.length;
      workHistoryDiff.push({
        type: 'removed_role',
        company: roleA.company || 'Previous Company',
        title: roleA.title || 'Position',
        period: roleA.period || '',
        bullets: bulletsA.map(text => ({ type: 'removed', text }))
      });
    }
  });

  // ── 5. Technical Projects Diff ────────────────────────────────────────────
  const projectsA = Array.isArray(kbA.projects) ? kbA.projects : [];
  const projectsB = Array.isArray(kbB.projects) ? kbB.projects : [];

  const projNamesA = new Set(projectsA.map(p => String(p.name || '').toLowerCase().trim()));
  const projNamesB = new Set(projectsB.map(p => String(p.name || '').toLowerCase().trim()));

  const addedProjects = projectsB.filter(p => !projNamesA.has(String(p.name || '').toLowerCase().trim()));
  const removedProjects = projectsA.filter(p => !projNamesB.has(String(p.name || '').toLowerCase().trim()));

  const projectsDiff = {
    added: addedProjects,
    removed: removedProjects,
    hasChanges: addedProjects.length > 0 || removedProjects.length > 0
  };

  // ── 6. Summary Quick Stats ────────────────────────────────────────────────
  const addedCount = addedSkills.length + totalBulletsAdded + addedProjects.length;
  const removedCount = removedSkills.length + totalBulletsRemoved + removedProjects.length;
  const modifiedCount = (stylingDiff.hasStylingChanges ? 1 : 0) + (summaryDiff.hasChanges ? 1 : 0) + totalBulletsModified;

  const isIdentical = !stylingDiff.hasStylingChanges &&
    !summaryDiff.hasChanges &&
    !skillsDiff.hasChanges &&
    !projectsDiff.hasChanges &&
    totalBulletsAdded === 0 &&
    totalBulletsRemoved === 0 &&
    totalBulletsModified === 0;

  return {
    versionA: { id: a.id, name: a.name || 'Version A', target: a.targetJobTitle },
    versionB: { id: b.id, name: b.name || 'Version B', target: b.targetJobTitle },
    isIdentical,
    quickStats: {
      addedCount,
      removedCount,
      modifiedCount,
      skillsDelta: addedSkills.length - removedSkills.length
    },
    stylingDiff,
    summaryDiff,
    skillsDiff,
    addedSkills: skillsDiff.added,
    removedSkills: skillsDiff.removed,
    workHistoryDiff,
    projectsDiff
  };
}
