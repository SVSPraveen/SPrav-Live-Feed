/**
 * SPrav Job AI — Knowledge Base Skill Deduplication Engine
 * Detects duplicate skills case-insensitively within the same category
 * and across the entire Knowledge Base, generating clear user-facing warnings.
 */

/**
 * Normalizes skill string for strict deduplication matching.
 * E.g., '  Python  ' -> 'python', 'Node.JS' -> 'node.js'
 */
export function normalizeSkill(skill) {
  if (!skill || typeof skill !== 'string') return '';
  return skill
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

/**
 * Formats a category key into a human-readable title fallback.
 * E.g., 'full_stack_backend' -> 'Full Stack & Backend'
 */
export function formatCategoryFallbackTitle(key) {
  if (!key) return 'General Skills';
  return key
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Checks if a skill already exists anywhere in the KB.
 * @param {string} skill - The skill candidate name.
 * @param {Object} allSkills - Object with category keys mapping to string arrays of skills.
 * @param {Object} [categoryMeta] - Optional metadata object mapping category keys to { title }.
 * @returns {{ found: boolean, categoryKey: string | null, categoryTitle: string | null, exactName: string | null }}
 */
export function findSkillDuplicate(skill, allSkills = {}, categoryMeta = {}) {
  const normalized = normalizeSkill(skill);
  if (!normalized) {
    return { found: false, categoryKey: null, categoryTitle: null, exactName: null };
  }

  for (const [catKey, skillsList] of Object.entries(allSkills)) {
    if (!Array.isArray(skillsList)) continue;
    for (const existing of skillsList) {
      if (typeof existing === 'string' && normalizeSkill(existing) === normalized) {
        const title = categoryMeta[catKey]?.title || formatCategoryFallbackTitle(catKey);
        return {
          found: true,
          categoryKey: catKey,
          categoryTitle: title,
          exactName: existing
        };
      }
    }
  }

  return { found: false, categoryKey: null, categoryTitle: null, exactName: null };
}

/**
 * Formats a clean, user-facing warning message explaining duplicate skills.
 */
export function formatDuplicateWarning(duplicates = [], validSkills = []) {
  if (!duplicates || duplicates.length === 0) return null;

  if (duplicates.length === 1) {
    const dup = duplicates[0];
    let msg = '';
    if (dup.isSameCategory) {
      msg = `"${dup.existingSkill || dup.skill}" is already present in this category (${dup.categoryTitle}).`;
    } else {
      msg = `"${dup.existingSkill || dup.skill}" already exists in "${dup.categoryTitle}". Duplicate not added.`;
    }
    if (validSkills && validSkills.length > 0) {
      msg += ` Added: ${validSkills.join(', ')}.`;
    }
    return msg;
  }

  // Multiple duplicates
  const dupSummaries = duplicates.map(d => {
    return `"${d.existingSkill || d.skill}" (${d.categoryTitle})`;
  });
  let msg = `Duplicate skills detected: ${dupSummaries.join(', ')}. Already in your Skills Arsenal.`;
  if (validSkills && validSkills.length > 0) {
    msg += ` Added unique skills: ${validSkills.join(', ')}.`;
  }
  return msg;
}

/**
 * Detects duplicates when adding one or more skills to a target category.
 * Handles comma-separated strings or string arrays.
 * 
 * @param {string|string[]} input - Skill or skills to add.
 * @param {string} targetCategoryKey - The target category key.
 * @param {Object} allSkills - Existing KB skills object { [cat]: [skills] }.
 * @param {Object} [categoryMeta] - Optional category metadata { [cat]: { title: '...' } }.
 * @returns {{
 *   validSkills: string[],
 *   duplicates: Array<{ skill: string, existingSkill: string, categoryKey: string, categoryTitle: string, isSameCategory: boolean }>,
 *   hasDuplicates: boolean,
 *   warningMessage: string | null
 * }}
 */
export function detectSkillDuplicates(input, targetCategoryKey, allSkills = {}, categoryMeta = {}) {
  let skillCandidates = [];
  if (Array.isArray(input)) {
    skillCandidates = input.map(s => String(s || '').trim()).filter(Boolean);
  } else if (typeof input === 'string') {
    skillCandidates = input
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);
  }

  if (skillCandidates.length === 0) {
    return {
      validSkills: [],
      duplicates: [],
      hasDuplicates: false,
      warningMessage: null
    };
  }

  const validSkills = [];
  const duplicates = [];
  const seenInBatch = new Set();

  for (const rawCandidate of skillCandidates) {
    const normCandidate = normalizeSkill(rawCandidate);
    if (!normCandidate) continue;

    // Check if duplicate within this batch itself
    if (seenInBatch.has(normCandidate)) {
      duplicates.push({
        skill: rawCandidate,
        existingSkill: rawCandidate,
        categoryKey: targetCategoryKey,
        categoryTitle: categoryMeta[targetCategoryKey]?.title || formatCategoryFallbackTitle(targetCategoryKey),
        isSameCategory: true
      });
      continue;
    }
    seenInBatch.add(normCandidate);

    // Check across existing KB skills
    const existingMatch = findSkillDuplicate(rawCandidate, allSkills, categoryMeta);
    if (existingMatch.found) {
      duplicates.push({
        skill: rawCandidate,
        existingSkill: existingMatch.exactName,
        categoryKey: existingMatch.categoryKey,
        categoryTitle: existingMatch.categoryTitle,
        isSameCategory: existingMatch.categoryKey === targetCategoryKey
      });
    } else {
      validSkills.push(rawCandidate);
    }
  }

  const hasDuplicates = duplicates.length > 0;
  const warningMessage = hasDuplicates
    ? formatDuplicateWarning(duplicates, validSkills)
    : null;

  return {
    validSkills,
    duplicates,
    hasDuplicates,
    warningMessage
  };
}
