/**
 * kb_ai_assistant.js
 * ==================
 * Natural-language Knowledge Base update engine for SPrav Job AI.
 *
 * The user types anything — "I got hired at Google", "I built a RAG pipeline,
 * here is the README:", "remove my internship at Infosys", "I passed the Google
 * Cloud Professional ML Engineer cert" — and this module:
 *
 *  1. Builds a structured extraction prompt with the current KB as context
 *  2. Dispatches it through hybridLLM.generateChat() (WebGPU → Ollama → Cloud)
 *  3. Parses the JSON response into a typed KB patch
 *  4. Returns a human-readable summary of proposed changes + the raw patch
 *
 * The caller (KbAiAssistant.jsx) shows a confirmation UI before applying.
 */

import { hybridLLM } from './hybrid_llm_client.js';

// ─── SYSTEM PROMPT ───────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `You are a career data extraction assistant for a professional resume and job-search platform.

Your job: read what the user tells you about their career — a new job, a project, a skill, a certification, a promotion, something to remove — and return a precise JSON object describing ONLY the changes to make to their Knowledge Base.

IMPORTANT rules:
- Return ONLY valid JSON, no markdown, no commentary, no code fences.
- Respond with ONLY the requested JSON. Do not add explanation text before or after the JSON.
- Never fabricate information the user did not provide. If a field is missing, omit it entirely from the patch.
- If the user says "remove" or "delete" something, set "action": "remove" for that item.
- Dates should be in the format "MM/YYYY" or "YYYY" when only a year is given.
- Skills should be individual technology/tool names, not full sentences.
- For project READMEs or long text, extract: project name, tech stack, and 2-3 bullet points describing what it does and its impact.

ADDITIONAL RULE: If the user pastes a GitHub README or long text, extract:
1. Project name (usually the H1 or first line)
2. Tech stack (look for "Built with", "Technologies", or code blocks)
3. 3 impact bullets: what it does, scale/metrics if present, novel technical aspect
Do NOT include installation instructions or setup steps as bullets.

ANTI-VAGUE RULE: If the user's message is under 5 words and contains no concrete career facts (e.g. "I got a job", "Update my skills", "Add a role"), return:
{"intent_summary": "Insufficient information", "clarification_needed": true, "clarification_prompt": "Please specify company, title, dates, or skills to add (e.g. 'I joined Stripe as Senior Frontend Engineer in March 2025')."}

Return a JSON object with this exact schema. Omit any top-level keys you have no data for:

{
  "intent_summary": "Brief one-line English description of what the user asked to change",
  "personal": {
    "action": "update",
    "fields": { "name": "...", "title": "...", "email": "...", "phone": "...", "location": "...", "linkedin": "...", "github": "...", "portfolio": "...", "summary": "..." }
  },
  "work_history": [
    {
      "action": "add" | "remove" | "update",
      "match_company": "used only for remove/update to find existing entry",
      "match_role": "used only for remove/update to find existing entry",
      "company": "...",
      "role": "...",
      "location": "...",
      "start_date": "MM/YYYY",
      "end_date": "MM/YYYY or Present",
      "current": true | false,
      "bullets": ["bullet 1", "bullet 2"]
    }
  ],
  "projects": [
    {
      "action": "add" | "remove" | "update",
      "match_name": "used only for remove/update",
      "name": "...",
      "tech_stack": "comma-separated tech",
      "github_url": "...",
      "live_url": "...",
      "bullets": ["bullet 1", "bullet 2"]
    }
  ],
  "skills": {
    "add": ["skill1", "skill2"],
    "remove": ["skill3"]
  },
  "education": [
    {
      "action": "add" | "remove",
      "institution": "...",
      "degree": "...",
      "field_of_study": "...",
      "graduation_year": "YYYY",
      "gpa": "..."
    }
  ],
  "certifications": [
    {
      "action": "add" | "remove",
      "name": "...",
      "issuer": "...",
      "year": "YYYY"
    }
  ],
  "star_stories": [
    {
      "action": "add" | "remove",
      "match_title": "used for remove",
      "title": "...",
      "competency": "leadership|conflict|scalability|failure|tradeoffs|collaboration|culture",
      "situation": "...",
      "task": "...",
      "action": "...",
      "result": "...",
      "tags": ["tag1", "tag2"]
    }
  ]
}`;

// ─── PROMPT BUILDER ──────────────────────────────────────────────────────────
function buildExtractionPrompt(userMessage, currentKb) {
  const kbSummary = JSON.stringify({
    personal: currentKb.personal || {},
    work_history: (currentKb.work_history || []).map(j => ({
      company: j.company, role: j.role, start_date: j.start_date, end_date: j.end_date
    })),
    projects: (currentKb.projects || []).map(p => ({ name: p.name, tech_stack: p.tech_stack })),
    education: (currentKb.education || []).map(e => ({ institution: e.institution, degree: e.degree })),
    certifications: (currentKb.certifications || []).map(c => typeof c === 'string' ? c : c.name),
    skill_count: Object.values(currentKb.skills || {}).reduce((a, arr) => a + (Array.isArray(arr) ? arr.length : 0), 0)
  }, null, 2);

  // Cap input length to stay strictly under 1500 tokens for Qwen 7B
  const safeMsg = typeof userMessage === 'string'
    ? (userMessage.length > 3500 ? userMessage.slice(0, 3500) + '... [truncated for token budget]' : userMessage)
    : String(userMessage || '');

  return `Current Knowledge Base (summary):
${kbSummary}

User message:
"${safeMsg}"

Extract the changes from the user's message and return a JSON patch following the schema. Do not include unchanged data.`;
}

// ─── JSON PARSER ─────────────────────────────────────────────────────────────
function safeParseKbPatch(raw) {
  if (!raw) return null;
  // Strip markdown code fences if present
  let cleaned = raw.trim();
  cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '');
  try {
    return JSON.parse(cleaned);
  } catch {
    // Try to find the first {...} block
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch {
        return null;
      }
    }
    return null;
  }
}

// ─── HUMAN-READABLE DIFF SUMMARY ─────────────────────────────────────────────
export function buildDiffSummary(patch) {
  if (!patch) return [];
  const lines = [];

  if (patch.personal?.fields) {
    const fields = Object.entries(patch.personal.fields).filter(([, v]) => v);
    if (fields.length > 0) {
      lines.push({
        type: 'update',
        section: 'Personal Info',
        label: fields.map(([k, v]) => `${k}: "${v}"`).join(', ')
      });
    }
  }

  for (const job of patch.work_history || []) {
    lines.push({
      type: job.action,
      section: 'Work Experience',
      label: job.action === 'remove'
        ? `Remove: ${job.match_role || ''} @ ${job.match_company || ''}`
        : `${job.role || 'New Role'} at ${job.company || 'Company'}${job.start_date ? ` (${job.start_date} – ${job.end_date || 'Present'})` : ''}`,
      detail: Array.isArray(job.bullets) ? job.bullets : []
    });
  }

  for (const proj of patch.projects || []) {
    lines.push({
      type: proj.action,
      section: 'Projects',
      label: proj.action === 'remove'
        ? `Remove project: ${proj.match_name || proj.name}`
        : `${proj.name || 'New Project'}${proj.tech_stack ? ` [${proj.tech_stack}]` : ''}`,
      detail: Array.isArray(proj.bullets) ? proj.bullets : []
    });
  }

  if (patch.skills?.add?.length > 0) {
    lines.push({
      type: 'add',
      section: 'Skills',
      label: `Add ${patch.skills.add.length} skill(s): ${patch.skills.add.join(', ')}`
    });
  }
  if (patch.skills?.remove?.length > 0) {
    lines.push({
      type: 'remove',
      section: 'Skills',
      label: `Remove: ${patch.skills.remove.join(', ')}`
    });
  }

  for (const edu of patch.education || []) {
    lines.push({
      type: edu.action,
      section: 'Education',
      label: `${edu.action === 'remove' ? 'Remove' : 'Add'}: ${edu.degree || ''} ${edu.field_of_study ? `in ${edu.field_of_study}` : ''} @ ${edu.institution || ''}${edu.graduation_year ? ` (${edu.graduation_year})` : ''}`
    });
  }

  for (const cert of patch.certifications || []) {
    lines.push({
      type: cert.action,
      section: 'Certifications',
      label: `${cert.action === 'remove' ? 'Remove' : 'Add'}: ${cert.name || ''}${cert.issuer ? ` — ${cert.issuer}` : ''}${cert.year ? ` (${cert.year})` : ''}`
    });
  }

  return lines;
}

// ─── KB PATCH APPLIER ────────────────────────────────────────────────────────
/**
 * Merges a KB patch (from the AI) into the existing kbData state.
 * Returns the new merged kbData object (does not mutate the original).
 */
export function applyKbPatch(currentKb, patch) {
  if (!patch) return currentKb;

  let next = JSON.parse(JSON.stringify(currentKb)); // deep clone

  // 1. Personal info update
  if (patch.personal?.fields) {
    next.personal = { ...(next.personal || {}), ...patch.personal.fields };
  }

  // 2. Work history
  for (const job of patch.work_history || []) {
    if (job.action === 'add') {
      const newJob = {
        id: `work_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        company: job.company || '',
        role: job.role || '',
        location: job.location || '',
        start_date: job.start_date || '',
        end_date: job.end_date || '',
        current: !!job.current,
        bullets: []
      };
      // Store bullets back into resume_bullets with parent_id reference
      if (Array.isArray(job.bullets) && job.bullets.length > 0) {
        const bulletEntries = job.bullets.map((text, i) => ({
          id: `bullet_${Date.now()}_${i}`,
          parent_id: newJob.id,
          text,
          metric_verified: 'ai_extracted',
          ats_keywords: [],
          themes: []
        }));
        next.resume_bullets = [...(next.resume_bullets || []), ...bulletEntries];
      }
      next.work_history = [...(next.work_history || []), newJob];
    } else if (job.action === 'remove') {
      next.work_history = (next.work_history || []).filter(j => {
        const companyMatch = job.match_company ? j.company?.toLowerCase().includes(job.match_company.toLowerCase()) : false;
        const roleMatch = job.match_role ? j.role?.toLowerCase().includes(job.match_role.toLowerCase()) : false;
        return !(companyMatch || roleMatch);
      });
    } else if (job.action === 'update') {
      next.work_history = (next.work_history || []).map(j => {
        const companyMatch = job.match_company ? j.company?.toLowerCase().includes(job.match_company.toLowerCase()) : false;
        const roleMatch = job.match_role ? j.role?.toLowerCase().includes(job.match_role.toLowerCase()) : false;
        if (companyMatch || roleMatch) {
          return {
            ...j,
            ...(job.role ? { role: job.role } : {}),
            ...(job.location ? { location: job.location } : {}),
            ...(job.end_date ? { end_date: job.end_date } : {}),
            ...(job.current !== undefined ? { current: job.current } : {})
          };
        }
        return j;
      });
    }
  }

  // 3. Projects
  for (const proj of patch.projects || []) {
    if (proj.action === 'add') {
      const newProj = {
        id: `proj_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        name: proj.name || '',
        tech_stack: proj.tech_stack || '',
        github_url: proj.github_url || '',
        live_url: proj.live_url || '',
        bullets: Array.isArray(proj.bullets) ? proj.bullets : []
      };
      next.projects = [...(next.projects || []), newProj];
    } else if (proj.action === 'remove') {
      next.projects = (next.projects || []).filter(p =>
        !p.name?.toLowerCase().includes((proj.match_name || proj.name || '').toLowerCase())
      );
    } else if (proj.action === 'update') {
      next.projects = (next.projects || []).map(p => {
        if (p.name?.toLowerCase().includes((proj.match_name || proj.name || '').toLowerCase())) {
          return {
            ...p,
            ...(proj.tech_stack ? { tech_stack: proj.tech_stack } : {}),
            ...(proj.github_url ? { github_url: proj.github_url } : {}),
            ...(proj.live_url ? { live_url: proj.live_url } : {}),
            ...(proj.bullets?.length ? { bullets: proj.bullets } : {})
          };
        }
        return p;
      });
    }
  }

  // 4. Skills — categorized into best-fit bucket
  const SKILL_CATEGORY_MAP = {
    ai_agentic_systems: ['langchain', 'langgraph', 'agent', 'rag', 'prompt', 'crewai', 'autogen', 'llm', 'gpt', 'gemini', 'claude', 'multi-agent'],
    retrieval_search: ['qdrant', 'chroma', 'pinecone', 'elasticsearch', 'bm25', 'semantic', 'embedding', 'rerank', 'vector'],
    llms_vector_databases: ['ollama', 'vllm', 'groq', 'huggingface', 'fine-tun', 'lora', 'qlora', 'mlc', 'webgpu'],
    ml_evaluation: ['pytorch', 'tensorflow', 'scikit', 'pandas', 'numpy', 'ragas', 'mlflow', 'jupyter', 'matplotlib', 'seaborn'],
    full_stack_backend: ['python', 'fastapi', 'django', 'flask', 'react', 'next', 'typescript', 'javascript', 'node', 'express', 'postgres', 'mysql', 'redis', 'graphql', 'rest', 'sql'],
    cloud_security: ['docker', 'kubernetes', 'aws', 'gcp', 'azure', 'terraform', 'ci/cd', 'github actions', 'linux', 'bash', 'jwt', 'oauth'],
    data_engineering: ['spark', 'kafka', 'dbt', 'snowflake', 'bigquery', 'redshift', 'databricks', 'airflow', 'etl', 'elt', 'pyspark', 'iceberg', 'delta lake', 'flink'],
    cybersecurity_infosec: ['soc 2', 'owasp', 'penetration', 'zero trust', 'iam', 'siem', 'splunk', 'cryptography', 'sast', 'dast', 'vulnerability', 'firewall'],
    mobile_engineering: ['swift', 'swiftui', 'kotlin', 'android', 'react native', 'flutter', 'ios', 'xcode', 'mobile'],
    embedded_robotics: ['embedded', 'rtos', 'freertos', 'arm', 'cortex', 'microcontroller', 'firmware', 'uart', 'spi', 'i2c', 'can bus', 'ros', 'ros2', 'iot'],
    qa_sdet: ['selenium', 'playwright', 'cypress', 'sdet', 'pytest', 'vitest', 'jest', 'load testing', 'k6', 'test automation', 'e2e'],
    design_product: ['figma', 'tailwind', 'css', 'html', 'ui', 'ux', 'agile', 'scrum', 'jira']
  };

  function categorizeSingleSkill(skill) {
    const lower = skill.toLowerCase();
    for (const [cat, keywords] of Object.entries(SKILL_CATEGORY_MAP)) {
      if (keywords.some(kw => lower.includes(kw))) return cat;
    }
    return 'full_stack_backend'; // default bucket
  }

  if (patch.skills?.add?.length > 0) {
    for (const skill of patch.skills.add) {
      const cat = categorizeSingleSkill(skill);
      if (!next.skills) next.skills = {};
      if (!next.skills[cat]) next.skills[cat] = [];
      if (!next.skills[cat].includes(skill)) {
        next.skills[cat] = [...next.skills[cat], skill];
      }
    }
  }

  if (patch.skills?.remove?.length > 0) {
    if (next.skills) {
      for (const cat of Object.keys(next.skills)) {
        next.skills[cat] = (next.skills[cat] || []).filter(s =>
          !patch.skills.remove.some(r => s.toLowerCase() === r.toLowerCase())
        );
      }
    }
  }

  // 5. Education
  for (const edu of patch.education || []) {
    if (edu.action === 'add') {
      const newEdu = {
        id: `edu_${Date.now()}`,
        institution: edu.institution || '',
        degree: edu.degree || '',
        field_of_study: edu.field_of_study || '',
        graduation_year: edu.graduation_year || '',
        gpa: edu.gpa || ''
      };
      next.education = [...(next.education || []), newEdu];
    } else if (edu.action === 'remove') {
      next.education = (next.education || []).filter(e =>
        !e.institution?.toLowerCase().includes((edu.institution || '').toLowerCase())
      );
    }
  }

  // 6. Certifications
  for (const cert of patch.certifications || []) {
    if (cert.action === 'add') {
      const certObj = { id: `cert_${Date.now()}`, name: cert.name || '', issuer: cert.issuer || '', year: cert.year || '' };
      next.certifications = [...(next.certifications || []), certObj];
    } else if (cert.action === 'remove') {
      next.certifications = (next.certifications || []).filter(c => {
        const name = typeof c === 'string' ? c : c.name || '';
        return !name.toLowerCase().includes((cert.name || '').toLowerCase());
      });
    }
  }

  // 7. STAR Stories
  for (const story of patch.star_stories || []) {
    if (story.action === 'add') {
      const storyObj = {
        id: `star_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        title: story.title || 'Behavioral Story',
        competency: story.competency || 'leadership',
        situation: story.situation || '',
        task: story.task || '',
        action: story.action || '',
        result: story.result || '',
        tags: Array.isArray(story.tags) ? story.tags : [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      next.star_stories = [...(next.star_stories || []), storyObj];
    } else if (story.action === 'remove') {
      const target = (story.match_title || story.title || '').toLowerCase();
      next.star_stories = (next.star_stories || []).filter(s =>
        !s.title?.toLowerCase().includes(target)
      );
    }
  }

  return next;
}

// ─── MAIN EXTRACTION FUNCTION ────────────────────────────────────────────────
// ─── RULE-BASED EXTRACTION FALLBACK ──────────────────────────────────────────
export function extractRuleBasedPatch(userMessage, currentKb = {}) {
  const text = userMessage.trim();
  const lower = text.toLowerCase();
  const patch = {
    intent_summary: '',
    projects: [],
    work_history: [],
    skills: { add: [], remove: [] },
    education: [],
    certifications: []
  };

  const intents = [];

  // 1. Remove project: e.g. "remove project RespiRAG", "remove project 'RespiRAG'", "remove project called RespiRAG"
  const removeProjRegex = /(?:remove|delete|drop)\s+(?:the\s+)?(?:project\s+|project\s+called\s+|project\s+named\s+)?["']?([^"',.;\n]+?)["']?(?=\s+and|\s*,|\s*\.|\s*$)/gi;
  let match;
  while ((match = removeProjRegex.exec(text)) !== null) {
    const rawTarget = match[1].trim();
    if (rawTarget && !['a', 'an', 'the', 'my', 'one', 'new', 'project'].includes(rawTarget.toLowerCase())) {
      const matchedExisting = (currentKb?.projects || []).find(p => p.name?.toLowerCase() === rawTarget.toLowerCase());
      const isProjectContext = lower.includes('project') || Boolean(matchedExisting);
      if (isProjectContext) {
        const projName = matchedExisting ? matchedExisting.name : rawTarget;
        patch.projects.push({
          action: 'remove',
          match_name: projName,
          name: projName
        });
        intents.push(`Remove project "${projName}"`);
      }
    }
  }

  // 2. Add project: e.g. "add project 'Agentic Job Search Orchestrator' with tech stack 'FastAPI, LangGraph, Qdrant' and bullets '...'"
  const addProjPattern = /(?:add|create|built|added)\s+(?:a\s+|one\s+|one\s+more\s+|new\s+)?(?:project\s+|project\s+called\s+|project\s+named\s+)?["']?([^"',;\n]+?)["']?\s+(?:(?:built\s+with|with\s+tech\s+stack|tech\s+stack|using|with)\s+["']?([^"';\n]+?)["']?)?(?:\s+(?:and\s+)?(?:with\s+)?bullets?\s+(.+))?$/i;
  const addMatch = text.match(addProjPattern);
  if (addMatch && (lower.includes('add') || lower.includes('built'))) {
    let name = addMatch[1]?.trim();
    let tech = addMatch[2]?.trim() || '';
    let bulletsRaw = addMatch[3]?.trim() || '';

    if (name && !['and', 'one', 'project'].includes(name.toLowerCase())) {
      const bullets = [];
      if (bulletsRaw) {
        const bulletQuoteMatches = bulletsRaw.match(/["']([^"']+)["']/g);
        if (bulletQuoteMatches && bulletQuoteMatches.length > 0) {
          for (const b of bulletQuoteMatches) {
            bullets.push(b.replace(/^["']|["']$/g, '').trim());
          }
        } else {
          bullets.push(...bulletsRaw.split(/(?:,|\band\b|\*|\n)/).map(b => b.trim()).filter(b => b.length > 5));
        }
      }

      patch.projects.push({
        action: 'add',
        name,
        tech_stack: tech.replace(/^["']|["']$/g, '').trim(),
        bullets
      });
      intents.push(`Add project "${name}"`);
    }
  }

  // 3. Remove job / work history
  const removeJobMatch = text.match(/(?:remove|delete)\s+(?:my\s+)?(?:job|internship|role|experience)\s+(?:at\s+)?["']?([^"',.;\n]+?)["']?/i);
  if (removeJobMatch) {
    const comp = removeJobMatch[1].trim();
    patch.work_history.push({
      action: 'remove',
      match_company: comp,
      match_role: ''
    });
    intents.push(`Remove work experience at ${comp}`);
  }

  // 4. Add skills
  const addSkillsMatch = text.match(/(?:add|learned|know)\s+(?:skills?|technologies?)(?:\s*:|\s+to\s+skills)?\s+(.+)$/i);
  if (addSkillsMatch) {
    const list = addSkillsMatch[1].split(/[,;]/).map(s => s.trim().replace(/^["']|["']$/g, '')).filter(Boolean);
    if (list.length > 0) {
      patch.skills.add = list;
      intents.push(`Add skills: ${list.join(', ')}`);
    }
  }

  // 5. Remove skills
  const removeSkillsMatch = text.match(/(?:remove|delete)\s+(?:skills?)(?:\s*:|\s+from\s+skills)?\s+(.+)$/i);
  if (removeSkillsMatch) {
    const list = removeSkillsMatch[1].split(/[,;]/).map(s => s.trim().replace(/^["']|["']$/g, '')).filter(Boolean);
    if (list.length > 0) {
      patch.skills.remove = list;
      intents.push(`Remove skills: ${list.join(', ')}`);
    }
  }

  // 6. Certifications
  const certMatch = text.match(/(?:passed|earned|completed|received)\s+(?:the\s+)?(?:certification|cert\s+)?["']?([^"',.;\n]+?(?:cert|certification|exam|credential)?)["']?/i);
  if (certMatch && !lower.includes('project') && !lower.includes('job')) {
    const certName = certMatch[1].trim();
    patch.certifications.push({
      action: 'add',
      name: certName
    });
    intents.push(`Add certification "${certName}"`);
  }

  const hasAnyChanges = Boolean(
    patch.projects.length > 0 ||
    patch.work_history.length > 0 ||
    patch.skills.add.length > 0 ||
    patch.skills.remove.length > 0 ||
    patch.certifications.length > 0 ||
    patch.education.length > 0
  );

  if (!hasAnyChanges) return null;

  patch.intent_summary = intents.join(', ') || 'Career Knowledge Base updates';
  return patch;
}

// ─── MAIN EXTRACTION FUNCTION ────────────────────────────────────────────────
/**
 * Sends the user's natural-language message to the AI and returns
 * a structured KB patch + human-readable summary.
 *
 * @param {string} userMessage
 * @param {object} currentKb
 * @returns {{ patch: object|null, diffLines: array, intentSummary: string, source: string, error: string|null }}
 */
export async function processKbUpdate(userMessage, currentKb) {
  if (!userMessage?.trim()) {
    return { patch: null, diffLines: [], intentSummary: '', source: '', error: 'No message provided.' };
  }

  const prompt = buildExtractionPrompt(userMessage, currentKb);

  let rawResponse = null;
  let source = 'Unknown';

  try {
    rawResponse = await hybridLLM.generateChat(
      [{ role: 'user', content: prompt }],
      SYSTEM_PROMPT
    );
    if (rawResponse) {
      source = 'AI Engine';
    }
  } catch (err) {
    console.warn('[KbAI] generateChat failed or unavailable, checking heuristic rules:', err);
  }

  let patch = rawResponse ? safeParseKbPatch(rawResponse) : null;

  // Self-Correction Loop: If initial AI generation was malformed or failed parsing, attempt 1 reflection pass
  if (!patch && rawResponse && rawResponse.length > 10) {
    try {
      const correctionPrompt = `Your previous output could not be parsed as valid JSON:
${rawResponse.slice(0, 500)}

Please correct it and output ONLY a valid JSON object matching the required schema. No markdown code fences.`;
      const retryResponse = await hybridLLM.generateChat(
        [
          { role: 'user', content: prompt },
          { role: 'assistant', content: rawResponse },
          { role: 'user', content: correctionPrompt }
        ],
        SYSTEM_PROMPT
      );
      if (retryResponse) {
        patch = safeParseKbPatch(retryResponse);
        if (patch) {
          source = 'AI Engine (Self-Corrected)';
        }
      }
    } catch (selfCorrectionErr) {
      console.warn('[KbAI] Self-correction turn failed:', selfCorrectionErr);
    }
  }

  // If LLM returned no valid JSON or wasn't reachable, try rule-based extraction fallback
  if (!patch) {
    const heuristicPatch = extractRuleBasedPatch(userMessage, currentKb);
    if (heuristicPatch) {
      patch = heuristicPatch;
      source = 'Local Intelligent Parser';
    }
  }

  if (!patch) {
    return {
      patch: null,
      diffLines: [],
      intentSummary: rawResponse ? rawResponse.slice(0, 200) : '',
      source: 'None',
      error: 'Could not extract career changes from your message. Try being specific, for example: "Remove project RespiRAG and add project Agentic Job Search Orchestrator with tech stack FastAPI, LangGraph".'
    };
  }

  // Anti-vague clarification guard: user provided insufficient career information
  if (patch.clarification_needed || patch.intent_summary === 'Insufficient information') {
    return {
      patch: null,
      diffLines: [],
      intentSummary: 'Clarification needed',
      source,
      error: patch.clarification_prompt || 'Please specify details such as company, title, dates, or skills (e.g. "I joined Stripe as Senior Engineer in March 2025" or "Add skills: Rust, Kafka").'
    };
  }

  const diffLines = buildDiffSummary(patch);

  // Guard: AI returned valid JSON but with zero actionable change lines.
  // This happens when the user sends a vague/short message like "hi" or "ok"
  // and the model echoes back an empty object that passes JSON parsing.
  if (diffLines.length === 0) {
    return {
      patch: null,
      diffLines: [],
      intentSummary: '',
      source: 'None',
      error: 'I couldn\'t find any career details to extract from your message. Please share something specific — for example: "I joined Stripe as a Staff Engineer in July 2025" or "Add skills: LangGraph, Qdrant, RAGAS".'
    };
  }

  return {
    patch,
    diffLines,
    intentSummary: patch.intent_summary || 'Changes detected',
    source,
    error: null
  };
}

// Suggestion chips shown in the UI
export const KB_SUGGESTION_PROMPTS = [
  "I joined {Company} as {Role} starting {Month} {Year}",
  "I left my job at {Company} — mark it as ended",
  "I built a project: {paste your README here}",
  "Remove my project called {Project Name}",
  "I earned the Google Cloud Professional ML Engineer certification",
  "Add these skills: FastAPI, LangGraph, Qdrant, RAGAS",
  "I got promoted to Senior Engineer at {Company}",
  "I'm currently doing my B.Tech CSE at {University}, graduating {Year}",
];
