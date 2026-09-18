/**
 * client_resume_extractor.js
 * ===========================
 * In-Browser Authentic Resume Fact Extractor.
 * Strictly extracts authentic facts from user-uploaded resumes (PDF, TXT, MD, JSON).
 * 
 * Guarantees:
 * - ZERO fabrication, extrapolation, or hallucinated claims.
 * - Extracts personal details, work history, verified skills tree, education, and certifications.
 * - Categorizes skills into the 10 Knowledge Base taxonomy buckets.
 * - Works 100% offline with zero server requirements.
 */

// Polyfill Promise.try for older browser engines and runtimes where pdfjs-dist invokes Promise.try(...)
if (typeof Promise.try !== 'function') {
  Promise.try = function (fn, ...args) {
    return new Promise((resolve) => resolve(fn(...args)));
  };
}

// Known skill catalog mapped to Knowledge Base taxonomy buckets
const SKILL_TAXONOMY = {
  ai_agentic_systems: [
    'langgraph', 'langchain', 'multi-agent', 'agentic rag', 'self-rag', 'crag',
    'crewai', 'autogen', 'prompt engineering', 'agent tool calling', 'function calling',
    'semantic kernel', 'llamaindex', 'agentic workflow', 'autonomous agent'
  ],
  retrieval_search: [
    'hybrid search', 'bm25', 'semantic caching', 'sentence-transformers',
    'cross-encoder', 'huggingface', 'elasticsearch', 'opensearch', 'kafka', 'spark',
    'information retrieval', 'reranking', 'vector embeddings', 'faiss', 'annoy'
  ],
  llms_vector_databases: [
    'qdrant', 'chromadb', 'pinecone', 'vllm', 'ollama', 'groq', 'lora', 'fine-tuning',
    'openai api', 'gemini api', 'weaviate', 'pgvector', 'milvus', 'transformers',
    'llama', 'mistral', 'qwen', 'claude', 'anthropic', 'deepseek', 'gpt-4'
  ],
  ml_evaluation: [
    'pytorch', 'tensorflow', 'scikit-learn', 'mlflow', 'ragas', 'pytest',
    'cosine similarity', 'benchmarking', 'pandas', 'numpy', 'scipy', 'wandb',
    'data analysis', 'regression', 'classification', 'nlp', 'computer vision'
  ],
  full_stack_backend: [
    'python', 'fastapi', 'flask', 'django', 'react', 'react 18', 'react 19',
    'typescript', 'javascript', 'sqlalchemy', 'alembic', 'pydantic', 'postgresql',
    'postgres', 'mysql', 'sqlite', 'mongodb', 'redis', 'rest api', 'rest apis',
    'graphql', 'node.js', 'nodejs', 'express', 'next.js', 'vue', 'html', 'css', 'tailwind'
  ],
  cloud_security: [
    'docker', 'kubernetes', 'k8s', 'aws', 'amazon web services', 'gcp', 'google cloud',
    'azure', 'jwt', 'oauth', 'oauth2', 'linux', 'bash', 'shell', 'ci/cd', 'github actions',
    'gitlab ci', 'terraform', 'ansible', 'helm', 'nginx', 'ssl/tls', 'iam'
  ],
  design_product: [
    'figma', 'adobe xd', 'sketch', 'photoshop', 'canva', 'blender', 'agile',
    'scrum', 'jira', 'confluence', 'product roadmapping', 'wireframing', 'prototyping',
    'ui/ux', 'user research', 'system design'
  ],
  data_engineering: [
    'spark', 'apache spark', 'pyspark', 'hadoop', 'kafka', 'flink', 'airflow',
    'dbt', 'snowflake', 'bigquery', 'redshift', 'databricks', 'etl', 'elt',
    'data pipelines', 'iceberg', 'delta lake', 'presto', 'trino', 'clickhouse'
  ],
  cybersecurity_infosec: [
    'soc 2', 'owasp', 'penetration testing', 'zero trust', 'iam', 'siem', 'splunk',
    'edr', 'cryptography', 'pci-dss', 'iso 27001', 'sast', 'dast', 'threat modeling',
    'vulnerability management', 'network security', 'firewall', 'burp suite'
  ],
  mobile_engineering: [
    'swift', 'swiftui', 'objective-c', 'kotlin', 'android sdk', 'jetpack compose',
    'react native', 'flutter', 'xcode', 'android studio', 'ios development', 'mobile app', 'fastlane'
  ],
  embedded_robotics: [
    'embedded c', 'rtos', 'freertos', 'arm', 'cortex-m', 'microcontroller',
    'firmware', 'uart', 'spi', 'i2c', 'can bus', 'ros', 'ros2', 'pcb', 'fpga', 'iot', 'embedded systems'
  ],
  qa_sdet: [
    'selenium', 'playwright', 'cypress', 'jest', 'vitest', 'pytest', 'junit',
    'test automation', 'sdet', 'load testing', 'k6', 'jmeter', 'e2e testing',
    'end-to-end testing', 'api testing', 'postman', 'appium'
  ]
};


// ── Ligature & Unicode normalization map (matches Python's clean_pdf_text) ───
const LIGATURE_MAP = {
  '\uFB00': 'ff',  // ﬀ
  '\uFB01': 'fi',  // ﬁ
  '\uFB02': 'fl',  // ﬂ
  '\uFB03': 'ffi', // ﬃ
  '\uFB04': 'ffl', // ﬄ
  '\uFB05': 'st',  // ﬅ
  '\uFB06': 'st',  // ﬆ
  '\u2022': '*',   // bullet •
  '\u25CF': '*',   // filled circle ●
  '\u25AA': '*',   // small filled square ▪
  '\u2013': '-',   // en-dash –
  '\u2014': '-',   // em-dash —
  '\u2018': "'",   // left single quote '
  '\u2019': "'",   // right single quote '
  '\u201C': '"',   // left double quote "
  '\u201D': '"',   // right double quote "
  '\u00A0': ' ',   // non-breaking space
  '\u00AD': '',    // soft hyphen (remove)
};

/**
 * Applies Unicode normalization and ligature repair.
 * Equivalent to Python's clean_pdf_text().
 * @param {string} text
 * @returns {string}
 */
function normalizePdfText(text) {
  if (!text) return '';
  let out = text;
  for (const [char, replacement] of Object.entries(LIGATURE_MAP)) {
    out = out.split(char).join(replacement);
  }
  // Remove control characters (0x00–0x08, 0x0B, 0x0C, 0x0E–0x1F) but keep tab/LF/CR
  out = out.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, ' ');
  // Collapse 3+ consecutive spaces to 2 (preserve indentation intent)
  out = out.replace(/ {3,}/g, '  ');
  // Collapse 3+ consecutive newlines to 2
  out = out.replace(/\n{3,}/g, '\n\n');
  return out.trim();
}

/**
 * Scores extracted text quality: higher = more readable.
 * Used to choose the best engine output automatically.
 * Immediately rejects any text containing internal PDF syntax tokens (endobj, FlateDecode, etc.).
 * @param {string} text
 * @returns {number}
 */
export function scoreTextQuality(text) {
  if (!text || typeof text !== 'string' || text.trim().length < 20) return 0;

  // ── ANTI-BINARY & PDF SYNTAX GUARDRAIL ──────────────────────────────────────
  // If text contains raw PDF syntax tokens, it is corrupted binary container leakage.
  if (
    /\b(?:endobj|endstream|startxref|xref|FlateDecode)\b/i.test(text) ||
    /\/Type\s*\/(?:Catalog|Pages|Font|ObjStm)/i.test(text) ||
    /<<\s*\/Filter/i.test(text) ||
    /^\s*\d+\s+0\s+obj\b/m.test(text)
  ) {
    return 0;
  }

  const words = text.split(/\s+/).filter(w => w.length > 0);
  if (words.length < 5) return 0;

  // Ratio of "real" words (contain at least one vowel, not all special chars)
  const realWords = words.filter(w => /[aeiouAEIOU]/.test(w) && /[a-zA-Z]{2,}/.test(w));
  const readabilityRatio = realWords.length / words.length;

  // Bonus: presence of common resume anchors
  const resumeAnchors = [
    /\b(experience|education|skills|projects|summary|objective|work|employment)\b/i,
    /\b\d{4}\b/,            // years
    /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i, // email
    /\+?\d[\d\s\-().]{7,}/, // phone
    /https?:\/\/|\.vercel\.app|\.github\.io|\.dev\b|\.io\b/, // URLs
  ];
  const anchorScore = resumeAnchors.filter(rx => rx.test(text)).length * 5;

  return Math.round(readabilityRatio * 100) + anchorScore + Math.min(words.length, 300);
}

/**
 * ENGINE 1: pdfjs-dist with column-aware text reconstruction.
 * Sorts text items by page Y (descending) then X (ascending) to correctly
 * handle two-column resume layouts that pdfjs renders in render order.
 * @param {ArrayBuffer} arrayBuffer
 * @returns {Promise<string>}
 */
async function extractWithPdfJs(arrayBuffer) {
  const pdfjsLib = await import('pdfjs-dist/build/pdf.mjs');
  if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
    try {
      if (typeof window !== 'undefined') {
        // In browser: Use static public worker copy with CDN fallback
        const localWorker = `${window.location?.origin || ''}/pdf.worker.min.mjs`;
        pdfjsLib.GlobalWorkerOptions.workerSrc = localWorker;
      } else {
        // Node / test environment fallback
        const { pathToFileURL } = await import('node:url');
        const { resolve } = await import('node:path');
        pdfjsLib.GlobalWorkerOptions.workerSrc = pathToFileURL(resolve(process.cwd(), 'node_modules/pdfjs-dist/build/pdf.worker.mjs')).href;
      }
    } catch (_) {
      pdfjsLib.GlobalWorkerOptions.workerSrc = '';
    }
  }

  const loadingTask = pdfjsLib.getDocument({
    data: new Uint8Array(arrayBuffer),
    useWorkerFetch: false,
    isEvalSupported: false,
    useSystemFonts: true,
    disableFontFace: true,
  });

  const pdf = await loadingTask.promise;
  const pageTexts = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent({ includeMarkedContent: false });

    if (!textContent.items.length) {
      pageTexts.push('');
      continue;
    }

    // ── Column-aware reconstruction ───────────────────────────────
    // Group items into "lines" by similar Y coordinate (within 3pt tolerance).
    const Y_TOLERANCE = 3;
    const lines = [];

    for (const item of textContent.items) {
      if (!('str' in item) || !item.str) continue;
      const x = item.transform[4];
      const y = item.transform[5];
      const str = item.str;
      const width = item.width || 0;
      const hasEOL = item.hasEOL || false;

      let matched = false;
      for (const line of lines) {
        if (Math.abs(line.y - y) <= Y_TOLERANCE) {
          line.items.push({ x, str, width, hasEOL });
          matched = true;
          break;
        }
      }
      if (!matched) {
        lines.push({ y, items: [{ x, str, width, hasEOL }] });
      }
    }

    // Sort lines top-to-bottom (descending Y in PDF coords)
    lines.sort((a, b) => b.y - a.y);

    const reconstructed = [];
    for (const line of lines) {
      // Sort items left-to-right within each line
      line.items.sort((a, b) => a.x - b.x);

      let lineStr = '';
      for (let j = 0; j < line.items.length; j++) {
        const item = line.items[j];
        const next = line.items[j + 1];

        lineStr += item.str;

        if (next) {
          const gap = next.x - (item.x + item.width);
          if (gap > (item.width / line.items.length) * 0.33 || item.str.slice(-1) !== ' ') {
            if (!lineStr.endsWith(' ') && !next.str.startsWith(' ')) {
              lineStr += ' ';
            }
          }
        }

        if (item.hasEOL) lineStr += '\n';
      }
      reconstructed.push(lineStr.trim());
    }

    pageTexts.push(reconstructed.filter(Boolean).join('\n'));
  }

  return pageTexts.join('\n\n');
}

/**
 * ENGINE 2: PDF stream operator parser.
 * Extracts text directly from raw PDF content streams by parsing BT/ET blocks
 * and Tj/TJ/Td/TD/Tm operators.
 * Never scrapes raw ASCII runs from binary to prevent leaking PDF structural tokens like 'endobj'.
 * @param {ArrayBuffer} arrayBuffer
 * @returns {string}
 */
function extractWithStreamParser(arrayBuffer) {
  const bytes = new Uint8Array(arrayBuffer);
  const decoder = new TextDecoder('latin1');
  const raw = decoder.decode(bytes);

  const lines = [];

  // Find all BT...ET blocks (text objects in PDF spec)
  const btEtRx = /BT([\s\S]*?)ET/g;
  let match;

  while ((match = btEtRx.exec(raw)) !== null) {
    const block = match[1];
    let blockText = '';

    // Tj operator: (text string) Tj
    const tjRx = /\(([^)]*)\)\s*Tj/g;
    let tjMatch;
    while ((tjMatch = tjRx.exec(block)) !== null) {
      blockText += tjMatch[1];
    }

    // TJ operator: [(text)(more)] TJ
    const tjArrRx = /\[([\s\S]*?)\]\s*TJ/g;
    let tjArrMatch;
    while ((tjArrMatch = tjArrRx.exec(block)) !== null) {
      const arrContent = tjArrMatch[1];
      const strRx = /\(([^)]*)\)/g;
      let strMatch;
      while ((strMatch = strRx.exec(arrContent)) !== null) {
        const kern = parseFloat(arrContent.substring(0, strMatch.index).trim());
        if (!isNaN(kern) && kern < -100) blockText += ' ';
        blockText += strMatch[1];
      }
    }

    // Td/TD operator marks line breaks
    const tdRx = /(-?\d+\.?\d*)\s+(-?\d+\.?\d*)\s+T[dD]/g;
    let tdMatch;
    let lastY = null;
    while ((tdMatch = tdRx.exec(block)) !== null) {
      const dy = parseFloat(tdMatch[2]);
      if (lastY !== null && Math.abs(dy) > 2) blockText += '\n';
      lastY = dy;
    }

    if (blockText.trim()) lines.push(blockText.trim());
  }

  // NOTE: Naive ASCII byte scraping fallback is removed to prevent leaking 'endobj'.
  return lines.join('\n');
}

/**
 * Multi-engine PDF text extractor with automatic confidence-based selection.
 * Guarantees zero binary leakage or 'endobj' tokens.
 * @param {ArrayBuffer} arrayBuffer
 * @returns {Promise<string>}
 */
export async function extractTextFromPdf(arrayBuffer) {
  if (!arrayBuffer || arrayBuffer.byteLength === 0) return '';
  const candidates = [];

  // Engine 1: pdfjs column-aware
  try {
    const text1 = await extractWithPdfJs(arrayBuffer.slice(0));
    if (text1 && text1.trim().length > 20) {
      const score = scoreTextQuality(text1);
      if (score > 0) {
        candidates.push({ engine: 'pdfjs', text: normalizePdfText(text1), score });
      }
    }
  } catch (err) {
    console.warn('[ResumeExtractor] Engine 1 (pdfjs) failed:', err.message);
  }

  // Engine 2: PDF stream parser
  try {
    const text2 = extractWithStreamParser(arrayBuffer.slice(0));
    if (text2 && text2.trim().length > 20) {
      const score = scoreTextQuality(text2);
      if (score > 0) {
        candidates.push({ engine: 'stream-parser', text: normalizePdfText(text2), score });
      }
    }
  } catch (err) {
    console.warn('[ResumeExtractor] Engine 2 (stream-parser) failed:', err.message);
  }

  if (!candidates.length) {
    console.warn('[ResumeExtractor] All PDF text extraction engines returned no valid text.');
    return '';
  }

  // Sort and pick highest scoring candidate
  candidates.sort((a, b) => b.score - a.score);
  const best = candidates[0];
  console.info(`[ResumeExtractor] Selected engine "${best.engine}" (score: ${best.score})`);
  return best.text;
}

/**
 * Extracts text from a File object (PDF, TXT, MD, JSON).
 */
export async function extractTextFromFile(file) {
  if (!file) throw new Error('No file provided.');

  const name = (file.name || '').toLowerCase();
  if (name.endsWith('.pdf') || file.type === 'application/pdf') {
    const buffer = await file.arrayBuffer();
    return extractTextFromPdf(buffer);
  }

  // Text, markdown, JSON, or other text formats read directly
  if (typeof file.text === 'function') {
    return await file.text();
  }
  return '';
}


/**
 * Deterministic parser for personal contact information.
 * Guarantees zero leakage of PDF internal syntax tokens.
 */
export function extractPersonalDetails(text) {
  const details = {
    name: '',
    email: '',
    phone: '',
    location: '',
    linkedin: '',
    github: '',
    portfolio: ''
  };

  if (!text) return details;

  // Email regex
  const emailMatch = text.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/);
  if (emailMatch) details.email = emailMatch[0];

  // Phone regex
  const phoneMatch = text.match(/(?:\+?\d{1,3}[-.\s]?)?\(?\d{2,4}\)?[-.\s]?\d{3,4}[-.\s]?\d{4}/);
  if (phoneMatch) details.phone = phoneMatch[0].trim();

  // LinkedIn
  const linkedinMatch = text.match(/(?:https?:\/\/)?(?:www\.)?linkedin\.com\/in\/[A-Za-z0-9_-]+/i);
  if (linkedinMatch) details.linkedin = linkedinMatch[0];

  // GitHub
  const githubMatch = text.match(/(?:https?:\/\/)?(?:www\.)?github\.com\/[A-Za-z0-9_-]+/i);
  if (githubMatch) details.github = githubMatch[0];

  // Portfolio: modern developer domains (.vercel.app, .github.io, .dev, .me, .tech, .site, .app, .ai)
  const portfolioMatches = text.matchAll(/(?:https?:\/\/)?([a-zA-Z0-9_-]+\.(?:vercel\.app|github\.io|dev|me|tech|site|ai|app)(?:\/[^\s,)]*)?)/gi);
  for (const m of portfolioMatches) {
    const raw = m[1].toLowerCase();
    if (details.email && details.email.toLowerCase().includes(raw)) continue;
    if (raw.includes('gmail') || raw.includes('yahoo') || raw.includes('outlook') || raw.includes('hotmail') || raw.includes('linkedin') || raw.includes('github')) continue;
    details.portfolio = m[0].startsWith('http') ? m[0] : `https://${m[0]}`;
    break;
  }

  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

  // Candidate Name: First non-empty line of resume often contains name
  for (const line of lines.slice(0, 5)) {
    if (
      line.length > 2 &&
      line.length < 55 &&
      !line.includes('@') &&
      !line.includes('http') &&
      !line.includes('/') &&
      !line.includes('\\') &&
      !/\b(?:curriculum|resume|c\.v\.|summary|obj|endobj)\b/i.test(line) &&
      !/\d/.test(line)
    ) {
      details.name = line.replace(/^[#*•\s]+|[#*•\s]+$/g, '').trim();
      break;
    }
  }

  // Location: Search contact segments across header lines without newline bleed
  for (const line of lines.slice(0, 8)) {
    const segments = line.split(/[|•*·]/).map(s => s.trim()).filter(Boolean);
    for (const seg of segments) {
      if (
        seg.length >= 3 &&
        seg.length <= 45 &&
        !seg.includes('@') &&
        !seg.includes('http') &&
        !seg.includes('github') &&
        !seg.includes('linkedin') &&
        !/\b(?:engineer|developer|architect|designer|scientist|consultant|manager|intern|specialist|summary|experience|projects|education|skills)\b/i.test(seg) &&
        !/^\+?\d[\d\s\-()]{7,}/.test(seg)
      ) {
        const locMatch = seg.match(/\b([A-Z][a-zA-Z.\s]{1,30},\s*(?:[A-Z]{2}|[A-Z][a-zA-Z\s]{2,25}))\b/);
        if (locMatch) {
          details.location = locMatch[1].trim();
          break;
        }
      }
    }
    if (details.location) break;
  }

  return details;
}

/**
 * Extracts verified skills and maps them into the 10 Knowledge Base taxonomy buckets.
 * STRICTLY authentic: only includes skills explicitly present in resume text.
 */
export function extractVerifiedSkills(text) {
  const result = {
    ai_agentic_systems: [],
    retrieval_search: [],
    llms_vector_databases: [],
    ml_evaluation: [],
    full_stack_backend: [],
    cloud_security: [],
    design_product: [],
    data_engineering: [],
    cybersecurity_infosec: [],
    mobile_engineering: [],
    embedded_robotics: [],
    qa_sdet: [],
    // Legacy backward-compat keys
    business_operations: [],
    marketing_sales: [],
    domain_expertise: []
  };

  if (!text) return result;

  const lower = text.toLowerCase();

  for (const [category, skillList] of Object.entries(SKILL_TAXONOMY)) {
    const matched = new Set();
    for (const skill of skillList) {
      // Word boundary regex or clean inclusion
      const regex = new RegExp(`(?:\\b|[^a-z0-9])${skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:\\b|[^a-z0-9])`, 'i');
      if (regex.test(lower)) {
        // Capitalize nicely for display
        const displaySkill = skill
          .split(' ')
          .map(w => w.charAt(0).toUpperCase() + w.slice(1))
          .join(' ');
        matched.add(displaySkill);
      }
    }
    result[category] = Array.from(matched);
  }

  return result;
}

/**
 * Extracts work experience entries with genuine bullet points.
 * Uses robust multi-word section anchors to cleanly terminate work experience.
 */
export function extractWorkHistory(text) {
  const history = [];
  if (!text) return history;

  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  
  let inExperienceSection = false;
  let currentCompany = null;

  // Section break anchor: terminates work experience cleanly
  const SECTION_BREAK_REGEX = /^(?:education|academic|key\s+technical\s+projects|technical\s+projects|personal\s+projects|featured\s+projects|relevant\s+projects|notable\s+projects|selected\s+projects|projects|skills|technical\s+skills|core\s+competencies|certifications|awards|publications)\b/i;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (/^(?:work\s+experience|professional\s+experience|experience|employment\s+history|career\s+history)\b/i.test(line)) {
      inExperienceSection = true;
      continue;
    }

    if (inExperienceSection && SECTION_BREAK_REGEX.test(line)) {
      if (currentCompany) history.push(currentCompany);
      currentCompany = null;
      inExperienceSection = false;
      break;
    }

    if (inExperienceSection) {
      const isBullet = line.startsWith('•') || line.startsWith('-') || line.startsWith('*') || /^\d+\.\s/.test(line);

      if (isBullet && currentCompany) {
        const cleanBullet = line.replace(/^[•\-*]\s*|\d+\.\s*/, '').trim();
        if (cleanBullet.length > 3) {
          currentCompany.bullets.push(cleanBullet);
        }
      } else if (!isBullet && line.length > 1) {
        const dateMatch = line.match(/(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|20\d\d|19\d\d)[^,\n]*(?:-|–|—|to)\s*(?:Present|Current|20\d\d|19\d\d|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[^,\n]*/i);

        // Check if this line is a continuation of the previous bullet point
        const lastBullet = currentCompany?.bullets?.[currentCompany.bullets.length - 1];
        const lastBulletIncomplete = lastBullet && !/[.;!]$/.test(lastBullet.trim());
        const isLikelyContinuation =
          currentCompany &&
          currentCompany.bullets.length > 0 &&
          !dateMatch &&
          (
            lastBulletIncomplete ||
            lastBullet?.endsWith('-') ||
            /^[a-z0-9,;/&–—\-)]/.test(line) ||
            /^(?:and|or|but|nor|for|yet|so|with|that|which|who|whom|whose|where|when|while|as|in|on|at|by|from|to|into|through|during|including|plus)\b/i.test(line)
          ) &&
          !/^[A-Z\s]{4,}$/.test(line);

        if (isLikelyContinuation) {
          if (lastBullet?.endsWith('-')) {
            currentCompany.bullets[currentCompany.bullets.length - 1] = lastBullet.slice(0, -1) + line;
          } else {
            currentCompany.bullets[currentCompany.bullets.length - 1] += ' ' + line;
          }
          continue;
        }

        if (dateMatch) {
          if (currentCompany && (currentCompany.bullets.length > 0 || currentCompany.company)) {
            history.push(currentCompany);
          }

          const rawHeader = line.replace(dateMatch[0], '').replace(/^[|\-•\s]+|[|\-•\s]+$/g, '').trim();
          let title = '';
          let company = rawHeader;
          let location = '';

          const GENERIC_ROLE_REGEX = /\b(?:engineer|developer|architect|designer|scientist|researcher|technologist|consultant|analyst|associate|intern|specialist|manager|director|lead|head|vp|president|officer|founder|co-founder|administrator|coordinator|fellow|instructor|professor|assistant)\b/i;

          const parts = rawHeader.split(/\s*[-–—|]\s*/).map(p => p.trim()).filter(Boolean);
          if (parts.length >= 2) {
            if (GENERIC_ROLE_REGEX.test(parts[0]) && !GENERIC_ROLE_REGEX.test(parts[1])) {
              title = parts[0];
              company = parts.slice(1).join(' - ');
            } else if (GENERIC_ROLE_REGEX.test(parts[1])) {
              company = parts[0];
              title = parts.slice(1).join(' - ');
            } else {
              title = parts[0];
              company = parts.slice(1).join(' - ');
            }
          } else {
            const roleMatch = rawHeader.match(GENERIC_ROLE_REGEX);
            if (roleMatch) {
              const rolePhraseMatch = rawHeader.match(new RegExp(`(?:[A-Za-z/]+\\s+)?${roleMatch[0]}(?:\\s+Intern)?`, 'i'));
              if (rolePhraseMatch) {
                title = rolePhraseMatch[0].trim();
                company = rawHeader.replace(rolePhraseMatch[0], '').replace(/^[\s,·\-|]+|[\s,·\-|]+$/g, '').trim();
              }
            }
          }

          // Clean duration annotations like "(3 years 6 months)" from company header
          if (company) {
            company = company.replace(/\(\s*\d+\s*(?:years?|yrs?|months?|mos?)[^)]*\)/gi, '').trim();
          }

          // In multi-line layouts (such as LinkedIn PDF exports), company and title
          // are on the lines immediately preceding the date line.
          if (!company || company.length < 2) {
            if (i >= 2) {
              const prev1 = lines[i - 1];
              const prev2 = lines[i - 2];
              if (prev1 && prev2 && !prev1.startsWith('•') && !prev1.startsWith('-') && !prev1.startsWith('*') &&
                  !prev2.startsWith('•') && !prev2.startsWith('-') && !prev2.startsWith('*') &&
                  !/^(?:experience|work\s+experience|employment\s+history)\b/i.test(prev2)) {
                if (GENERIC_ROLE_REGEX.test(prev1)) {
                  title = prev1.trim();
                  company = prev2.trim();
                } else if (GENERIC_ROLE_REGEX.test(prev2)) {
                  title = prev2.trim();
                  company = prev1.trim();
                } else {
                  company = prev2.trim();
                  title = prev1.trim();
                }
              } else if (prev1 && !prev1.startsWith('•') && !prev1.startsWith('-') && !/^(?:experience|work\s+experience)\b/i.test(prev1)) {
                company = prev1.trim();
              }
            } else if (i >= 1) {
              const prev1 = lines[i - 1];
              if (prev1 && !prev1.startsWith('•') && !/^(?:experience|work\s+experience)\b/i.test(prev1)) {
                company = prev1.trim();
              }
            }
          }

          if (company.includes(',')) {
            const compParts = company.split(/\s*,\s*/);
            company = compParts[0].trim();
            location = compParts.slice(1).join(', ').trim();
          }

          // Check if next line is a location line (common in LinkedIn PDF)
          if (!location && i + 1 < lines.length) {
            const nextL = lines[i + 1];
            if (!nextL.startsWith('•') && !nextL.startsWith('-') && !nextL.startsWith('*') &&
                (nextL.includes(',') || /\b(?:Remote|Onsite|Hybrid|United States|India|Germany|UK|Canada|San Francisco|New York|London|Bengaluru|Berlin)\b/i.test(nextL))) {
              location = nextL.trim();
            }
          }

          const dateParts = dateMatch[0].split(/\s*(?:-|–|—|to)\s*/i).map(d => d.trim());

          currentCompany = {
            company: company || 'Experience',
            title: title || '',
            role: title || '',
            location: location || '',
            dates: dateMatch[0].trim(),
            start_date: dateParts[0] || '',
            end_date: dateParts[1] || '',
            bullets: []
          };
        } else if (currentCompany && !currentCompany.title && line.length < 50 && !line.includes('.')) {
          currentCompany.title = line.trim();
          currentCompany.role = line.trim();
        }
      }
    }
  }

  if (currentCompany && (currentCompany.bullets.length > 0 || currentCompany.company)) {
    history.push(currentCompany);
  }

  return history;
}

/**
 * Extracts education entries.
 */
export function extractEducation(text) {
  const education = [];
  if (!text) return education;

  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  let inEdu = false;
  let pendingInstitution = '';
  let pendingDegree = '';

  const SECTION_BREAK_REGEX = /^(?:work\s+experience|professional\s+experience|experience|employment\s+history|skills|technical\s+skills|key\s+technical\s+projects|technical\s+projects|projects|certifications|awards|publications)\b/i;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/^education\b/i.test(line)) {
      inEdu = true;
      continue;
    }
    if (inEdu && SECTION_BREAK_REGEX.test(line)) {
      break;
    }
    if (inEdu) {
      const yearMatch = line.match(/\b(19\d\d|20\d\d)\b/);
      const year = yearMatch ? yearMatch[1] : '';
      const lineWithoutYear = line.replace(/\(?\b(19\d\d|20\d\d)\b\)?/g, '').replace(/^[•\-*]\s*/, '').trim();

      const DEGREE_REGEX = /\b(?:bachelor|master|ph\.?d\.?|doctorate|b\.?s\.?|m\.?s\.?|b\.?a\.?|b\.?tech|m\.?tech|b\.?e\.?|m\.?e\.?|associate|degree|diploma|computer\s+science|engineering)\b/i;
      const hasDegree = DEGREE_REGEX.test(line);
      const hasInstitutionWord = /\b(?:university|college|institute|school|academy|polytechnic|faculty|conservatory|seminary|campus|universit[yäe]|institut[eo]|ecole)\b/i.test(line);

      // If this line is ONLY an institution (no degree, no year) and next line might have degree
      if (hasInstitutionWord && !hasDegree && !year && lines[i + 1] && DEGREE_REGEX.test(lines[i + 1])) {
        pendingInstitution = lineWithoutYear;
        continue;
      }

      // If this line is ONLY a degree (no institution, no year) and next line might have institution
      if (hasDegree && !hasInstitutionWord && !year && lines[i + 1] && /\b(?:university|college|institute|school|academy|polytechnic|faculty|conservatory|seminary|campus|universit[yäe]|institut[eo]|ecole)\b/i.test(lines[i + 1])) {
        pendingDegree = lineWithoutYear;
        continue;
      }

      if (hasDegree || hasInstitutionWord || pendingInstitution || pendingDegree) {
        let degree = pendingDegree;
        let institution = pendingInstitution;
        pendingDegree = '';
        pendingInstitution = '';

        if (lineWithoutYear.includes(' - ') || lineWithoutYear.includes(' – ') || lineWithoutYear.includes(' — ')) {
          const dashParts = lineWithoutYear.split(/\s+[-–—]\s+/).map(p => p.trim()).filter(Boolean);
          if (dashParts.length >= 2) {
            if (DEGREE_REGEX.test(dashParts[0])) {
              degree = dashParts[0];
              institution = dashParts[1];
            } else {
              institution = dashParts[0];
              degree = dashParts[1];
            }
          }
        } else if (lineWithoutYear.includes('|')) {
          const parts = lineWithoutYear.split(/\s*\|\s*/).map(p => p.trim()).filter(Boolean);
          if (parts.length >= 2) {
            if (DEGREE_REGEX.test(parts[0])) {
              degree = parts[0];
              institution = parts[1];
            } else {
              institution = parts[0];
              degree = parts[1];
            }
          }
        } else if (/\s+(?:at|from)\s+/i.test(lineWithoutYear)) {
          const atMatch = lineWithoutYear.match(/^(.*?)\s+(?:at|from)\s+(.*)$/i);
          if (atMatch) {
            degree = atMatch[1].trim();
            institution = atMatch[2].trim();
          }
        } else if (lineWithoutYear.includes(',')) {
          const commaParts = lineWithoutYear.split(/\s*,\s*/).map(p => p.trim()).filter(Boolean);
          if (commaParts.length >= 2) {
            if (DEGREE_REGEX.test(commaParts[0])) {
              degree = institution ? lineWithoutYear : commaParts[0];
              if (!institution) {
                institution = commaParts.slice(1).join(', ');
              }
            } else if (DEGREE_REGEX.test(commaParts[1])) {
              if (!institution) {
                institution = commaParts[0];
              }
              degree = commaParts.slice(1).join(', ');
            }
          }
        }

        if (!degree && hasDegree) degree = lineWithoutYear;
        if (!institution && hasInstitutionWord && !hasDegree) institution = lineWithoutYear;

        degree = (degree || lineWithoutYear).replace(/^[|,\-\s]+|[|,\-\s]+$/g, '').trim();
        institution = (institution || '').replace(/^[|,\-\s]+|[|,\-\s]+$/g, '').trim();

        let finalYear = year;
        if (!finalYear && i + 1 < lines.length) {
          const nextYearMatch = lines[i + 1].match(/\b(19\d\d|20\d\d)\b/);
          if (nextYearMatch) {
            finalYear = nextYearMatch[1];
          }
        }

        if (degree || institution) {
          education.push({
            degree,
            institution,
            year: finalYear,
            graduation_year: finalYear
          });
        }
      }
    }
  }

  return education;
}

/**
 * Extracts projects entries from resume text.
 * Accurately associates technology stacks and prevents fragmenting multi-line headers.
 */
export function extractProjects(text) {
  const projects = [];
  if (!text) return projects;

  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  let inProjects = false;
  let currentProject = null;

  const SECTION_BREAK_REGEX = /^(?:work\s+experience|professional\s+experience|experience|employment|education|academic|skills|technical\s+skills|certifications|awards|publications)\b/i;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (/^(?:key\s+technical\s+projects|technical\s+projects|personal\s+projects|featured\s+projects|relevant\s+projects|notable\s+projects|selected\s+projects|projects)\b/i.test(line)) {
      inProjects = true;
      continue;
    }

    if (inProjects && SECTION_BREAK_REGEX.test(line)) {
      if (currentProject) projects.push(currentProject);
      currentProject = null;
      inProjects = false;
      break;
    }

    if (inProjects) {
      const isBullet = line.startsWith('•') || line.startsWith('-') || line.startsWith('*') || /^\d+\.\s/.test(line);

      if (isBullet && currentProject) {
        const cleanBullet = line.replace(/^[•\-*]\s*|\d+\.\s*/, '').trim();
        if (cleanBullet.length > 3) {
          currentProject.bullets.push(cleanBullet);
        }
      } else if (!isBullet && line.length > 1) {
        const urlMatch = line.match(/https?:\/\/[^\s)]+|[a-zA-Z0-9_-]+\.(?:com|org|io|dev|app|net|co|ai)\/[^\s)]*/i);
        const rawUrl = urlMatch ? urlMatch[0] : '';
        let cleanLine = line.replace(/^[#•\-_*|\s]+|[|\s]+$/g, '');

        // Check if this line is a continuation of the previous bullet point
        const lastBullet = currentProject?.bullets?.[currentProject.bullets.length - 1];
        const lastBulletIncomplete = lastBullet && !/[.;!]$/.test(lastBullet.trim());
        const isLikelyContinuation =
          currentProject &&
          currentProject.bullets.length > 0 &&
          !rawUrl &&
          (
            lastBulletIncomplete ||
            lastBullet?.endsWith('-') ||
            /^[a-z0-9,;/&–—\-)]/.test(cleanLine) ||
            /^(?:and|or|but|nor|for|yet|so|with|that|which|who|whom|whose|where|when|while|as|in|on|at|by|from|to|into|through|during|including|plus)\b/i.test(cleanLine)
          ) &&
          !/^[A-Z\s]{4,}$/.test(cleanLine);

        if (isLikelyContinuation) {
          if (lastBullet?.endsWith('-')) {
            currentProject.bullets[currentProject.bullets.length - 1] = lastBullet.slice(0, -1) + cleanLine;
          } else {
            currentProject.bullets[currentProject.bullets.length - 1] += ' ' + cleanLine;
          }
          continue;
        }

        // Check if this line is a tech-stack / metadata subtitle for the current project
        const hasTechSeparators = cleanLine.includes('·') || cleanLine.includes(' • ') || (cleanLine.includes('|') && !cleanLine.includes(' - ')) || /^[a-zA-Z0-9#+.\s]+(,\s+[a-zA-Z0-9#+.\s]+){2,}/.test(cleanLine);
        const hasTechPrefix = /^(?:tech|stack|technologies|tools|built\s+with|key\s+tech|environment)\b[:\s]/i.test(cleanLine);
        const isTechStackLine =
          currentProject &&
          currentProject.bullets.length === 0 &&
          (hasTechSeparators || hasTechPrefix || Boolean(rawUrl && cleanLine.length < 120)) &&
          cleanLine.length < 180 &&
          !/[.!?]$/.test(cleanLine.trim());

        if (isTechStackLine) {
          if (rawUrl && !currentProject.url) {
            currentProject.url = rawUrl.startsWith('http') ? rawUrl : `https://${rawUrl}`;
          }

          let pureTech = cleanLine
            .replace(/https?:\/\/[^\s|·,]+/gi, '')
            .replace(/[a-zA-Z0-9_-]+\.(?:com|org|io|dev|app|net|co|ai)\/[^\s|·,]*/gi, '')
            .replace(/^(?:tech|stack|technologies|tools|built\s+with|key\s+tech|environment)\b[:\s]*/i, '')
            .replace(/[|·*•]/g, ', ')
            .replace(/\s+,/g, ',')
            .replace(/,\s*,/g, ',')
            .replace(/^[\s,]+|[\s,]+$/g, '')
            .trim();

          currentProject.tech = pureTech;
          currentProject.tech_stack = pureTech;
          continue;
        }

        // Project header: MUST start with uppercase letter/digit and contain title/separator
        const isProjectHeader =
          /^[A-Z0-9]/.test(cleanLine) &&
          (
            cleanLine.includes(' - ') ||
            cleanLine.includes(' — ') ||
            cleanLine.includes(' – ') ||
            cleanLine.includes(' | ') ||
            (lines[i + 1] && (lines[i + 1].includes('github.com') || lines[i + 1].includes('·') || lines[i + 1].startsWith('*') || lines[i + 1].startsWith('•')))
          );

        if (isProjectHeader) {
          if (currentProject && (currentProject.bullets.length > 0 || currentProject.name)) {
            projects.push(currentProject);
          }

          let tech = '';
          const bracketMatch = cleanLine.match(/[[(]([^)\]]+)[\])]/);
          if (bracketMatch) {
            tech = bracketMatch[1].trim();
            cleanLine = cleanLine.replace(bracketMatch[0], '').trim();
          }

          let projName = cleanLine;
          if (cleanLine.includes(' | ')) {
            const pipeParts = cleanLine.split(/\s+\|\s+/).map(p => p.trim()).filter(Boolean);
            projName = pipeParts[0];
            if (pipeParts[1] && !tech && !pipeParts[1].startsWith('http') && !pipeParts[1].includes('github.com')) {
              tech = pipeParts[1];
            }
          } else if (cleanLine.includes(' - ') || cleanLine.includes(' — ') || cleanLine.includes(' – ')) {
            const parts = cleanLine.split(/\s+[-—–]\s+/).map(p => p.trim()).filter(Boolean);
            projName = parts[0];
            if (parts[1] && !tech && !parts[1].startsWith('http') && !parts[1].includes('github.com')) {
              tech = parts[1];
            }
          }

          projName = projName.replace(/https?:\/\/[^\s]+|github\.com\/[^\s]+/gi, '').replace(/[|•\-_*,\s]+$/g, '').trim();

          currentProject = {
            id: 'proj_ext_' + Math.random().toString(36).substring(2, 9),
            name: projName.trim() || 'Project',
            tech: tech,
            tech_stack: tech,
            url: rawUrl.startsWith('http') ? rawUrl : (rawUrl ? `https://${rawUrl}` : ''),
            description: '',
            bullets: []
          };
        } else if (currentProject && currentProject.bullets.length > 0) {
          currentProject.bullets[currentProject.bullets.length - 1] += ' ' + cleanLine;
        }
      }
    }
  }

  if (currentProject && (currentProject.bullets.length > 0 || currentProject.name)) {
    projects.push(currentProject);
  }

  return projects;
}

/**
 * Detects whether a document text comes from a LinkedIn profile PDF export ("Save to PDF").
 * @param {string} text
 * @returns {boolean}
 */
export function isLinkedInProfilePdf(text) {
  if (!text || typeof text !== 'string') return false;
  const hasLinkedInUrl = /linkedin\.com\/in\/|\(LinkedIn\)/i.test(text);
  const hasTopSkills = /\bTop Skills\b/i.test(text);
  const hasPageIndicator = /Page\s+\d+\s+of\s+\d+/i.test(text);
  const hasContactSection = /\bContact\b/i.test(text) && /\(LinkedIn\)/i.test(text);
  const hasProfileHeader = /\bExperience\b/i.test(text) && /\bEducation\b/i.test(text);

  return (hasTopSkills && (hasLinkedInUrl || hasPageIndicator)) ||
         (hasContactSection && hasTopSkills) ||
         (hasLinkedInUrl && hasPageIndicator && hasProfileHeader);
}

/**
 * Specialized parser for LinkedIn PDF Profile Exports.
 * Extracts Contact, Top Skills, Headline, Location, Summary, Experience, Education, and Certifications.
 * @param {string} text
 * @returns {object}
 */
export function extractLinkedInProfileDetails(text) {
  if (!text) return null;

  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  
  const result = {
    personal: {
      name: '',
      headline: '',
      email: '',
      phone: '',
      location: '',
      linkedin: '',
      github: '',
      portfolio: ''
    },
    topSkills: [],
    summary: '',
    workHistory: [],
    education: [],
    certifications: [],
    languages: []
  };

  // 1. Email extraction (LinkedIn format: email@domain.com (Personal) or (Work))
  const emailMatch = text.match(/\b([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,})\b(?:\s*\((?:Personal|Work|Other)\))?/i);
  if (emailMatch) {
    result.personal.email = emailMatch[1];
  }

  // 2. Phone extraction (LinkedIn format: +1 415-555-0199 (Mobile) or (Work))
  const phoneMatch = text.match(/((?:\+?\d{1,3}[-.\s]?)?\(?\d{2,4}\)?[-.\s]?\d{3,4}[-.\s]?\d{4})\s*\((?:Mobile|Work|Home)\)/i) ||
                     text.match(/(?:\+?\d{1,3}[-.\s]?)?\(?\d{2,4}\)?[-.\s]?\d{3,4}[-.\s]?\d{4}/);
  if (phoneMatch) {
    result.personal.phone = phoneMatch[1] ? phoneMatch[1].trim() : phoneMatch[0].trim();
  }

  // 3. LinkedIn profile URL
  const linkedinMatch = text.match(/(?:https?:\/\/)?(?:www\.)?linkedin\.com\/in\/[A-Za-z0-9_-]+/i);
  if (linkedinMatch) {
    result.personal.linkedin = linkedinMatch[0].startsWith('http') ? linkedinMatch[0] : `https://${linkedinMatch[0]}`;
  }

  // 4. Section segmentation: Top Skills, Summary, Languages, Certifications, Experience, Education
  const SECTION_HEADERS = [
    { key: 'topSkills', regex: /^Top\s+Skills$/i },
    { key: 'languages', regex: /^Languages$/i },
    { key: 'certifications', regex: /^Certifications$/i },
    { key: 'summary', regex: /^Summary$/i },
    { key: 'experience', regex: /^Experience$/i },
    { key: 'education', regex: /^Education$/i }
  ];

  // First identify candidate name and headline:
  // In LinkedIn PDF exports, the candidate headline contains a separator '|' or role keyword,
  // and is directly preceded by the candidate's name.
  let candidateNameIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    if (l.includes('|') || /\b(?:Engineer|Developer|Architect|Manager|Lead|Designer|Founder|Consultant|Specialist|Scientist|Analyst)\b/i.test(l)) {
      if (i > 0) {
        const prev = lines[i - 1];
        if (
          /^[A-Z][a-zA-Z'.\-]+(?:\s+[A-Z][a-zA-Z'.\-]+){1,3}$/.test(prev) &&
          !/^(?:Top Skills|Languages|Certifications|Contact|Experience|Education|Summary|Page)\b/i.test(prev) &&
          !prev.includes('@') && !prev.includes('http')
        ) {
          candidateNameIdx = i - 1;
          result.personal.name = prev;
          result.personal.headline = l;
          if (i + 1 < lines.length && !SECTION_HEADERS.some(h => h.regex.test(lines[i + 1]))) {
            if (/^[A-Za-z\s,.-]+$/.test(lines[i + 1]) && lines[i + 1].length < 80) {
              result.personal.location = lines[i + 1];
            }
          }
          break;
        }
      }
    }
  }

  // Fallback if name not found by headline pattern
  if (!result.personal.name) {
    const fallback = extractPersonalDetails(text);
    result.personal.name = fallback.name || 'Candidate';
    if (!result.personal.location) result.personal.location = fallback.location || '';
  }

  let currentSection = null;
  const sectionContent = {
    contact: [],
    topSkills: [],
    languages: [],
    certifications: [],
    summary: [],
    experience: [],
    education: []
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // If we reach the candidate name / headline block before Summary/Experience, clear section
    if (candidateNameIdx !== -1 && (i === candidateNameIdx || i === candidateNameIdx + 1 || (result.personal.location && line === result.personal.location))) {
      currentSection = null;
      continue;
    }

    let matchedHeader = false;
    for (const sec of SECTION_HEADERS) {
      if (sec.regex.test(line)) {
        currentSection = sec.key;
        matchedHeader = true;
        break;
      }
    }

    if (matchedHeader) continue;

    // Ignore page indicators like "Page 1 of 2"
    if (/^Page\s+\d+\s+of\s+\d+$/i.test(line)) continue;

    if (currentSection) {
      sectionContent[currentSection].push(line);
    } else {
      sectionContent.contact.push(line);
    }
  }

  // Parse Top Skills
  result.topSkills = sectionContent.topSkills
    .map(s => s.replace(/^[•\-*]\s*/, '').trim())
    .filter(s => s.length > 1 && !/^(?:Languages|Certifications|Summary|Page)\b/i.test(s));

  // Parse Languages
  result.languages = sectionContent.languages
    .map(l => l.trim())
    .filter(l => l.length > 1 && !SECTION_HEADERS.some(h => h.regex.test(l)));

  // Parse Certifications
  result.certifications = sectionContent.certifications
    .map(c => c.replace(/^[•\-*]\s*/, '').trim())
    .filter(c => c.length > 2 && !SECTION_HEADERS.some(h => h.regex.test(c)));

  // Parse Summary
  result.summary = sectionContent.summary.join(' ').trim();

  // Parse Experience
  if (sectionContent.experience.length > 0) {
    const expText = 'Experience\n' + sectionContent.experience.join('\n');
    result.workHistory = extractWorkHistory(expText);
  }

  // Parse Education
  if (sectionContent.education.length > 0) {
    const eduText = 'Education\n' + sectionContent.education.join('\n');
    result.education = extractEducation(eduText);
  }

  return result;
}

/**
 * Main entrance: Full authentic extraction from raw resume text or file.
 * Returns a complete Knowledge Base object conforming to SPrav Job AI format.
 * Guarantees zero leakage of PDF internal binary tokens or 'endobj'.
 */
export async function extractAuthenticResumeProfile(fileOrText) {
  let rawText = '';
  let filename = '';

  if (typeof fileOrText === 'string') {
    rawText = fileOrText;
  } else if (fileOrText && typeof fileOrText === 'object') {
    filename = fileOrText.name || '';
    rawText = await extractTextFromFile(fileOrText);
  }

  // Anti-corruption check: Disallow empty text or raw PDF binary syntax
  if (!rawText || rawText.trim().length === 0) {
    throw new Error('No readable text found in resume file. Please verify the document is not empty, encrypted, or an image-only scan.');
  }

  if (
    /\b(?:endobj|endstream|startxref|xref|FlateDecode)\b/i.test(rawText) ||
    /^\s*\d+\s+0\s+obj\b/m.test(rawText)
  ) {
    throw new Error('Invalid resume content: Contains binary PDF syntax tokens (endobj/obj). Please upload a valid document or paste text.');
  }

  const isLinkedIn = isLinkedInProfilePdf(rawText);
  let linkedInProfile = null;
  if (isLinkedIn) {
    linkedInProfile = extractLinkedInProfileDetails(rawText);
  }

  const personal = linkedInProfile?.personal?.name ? linkedInProfile.personal : extractPersonalDetails(rawText);
  const skills = extractVerifiedSkills(rawText);

  // If LinkedIn Top Skills were found, ensure they are categorized into taxonomy buckets
  if (linkedInProfile?.topSkills?.length > 0) {
    for (const skill of linkedInProfile.topSkills) {
      let categorized = false;
      const lowerSkill = skill.toLowerCase();
      for (const [cat, catalog] of Object.entries(SKILL_TAXONOMY)) {
        if (catalog.some(k => lowerSkill.includes(k) || k.includes(lowerSkill))) {
          if (!skills[cat].includes(skill)) {
            skills[cat].push(skill);
          }
          categorized = true;
          break;
        }
      }
      if (!categorized) {
        if (!skills.full_stack_backend) skills.full_stack_backend = [];
        if (!skills.full_stack_backend.includes(skill)) {
          skills.full_stack_backend.push(skill);
        }
      }
    }
  }

  const workHistory = (linkedInProfile?.workHistory?.length > 0)
    ? linkedInProfile.workHistory
    : extractWorkHistory(rawText);

  const education = (linkedInProfile?.education?.length > 0)
    ? linkedInProfile.education
    : extractEducation(rawText);

  const projects = extractProjects(rawText);
  const certifications = (linkedInProfile?.certifications?.length > 0)
    ? linkedInProfile.certifications
    : [];

  // Flatten bullets for quick reference
  const resumeBullets = [];
  for (const job of workHistory) {
    for (const b of job.bullets || []) {
      resumeBullets.push({
        bullet: b,
        category: job.title || job.company || 'Experience',
        metrics: /\d+%|\$\d+|\b\d+\s*(?:users|clients|engineers|teams|services)\b/i.test(b)
      });
    }
  }
  for (const proj of projects) {
    for (const b of proj.bullets || []) {
      resumeBullets.push({
        parent_id: proj.id,
        bullet: b,
        category: proj.name || 'Project',
        metrics: /\d+%|\$\d+|\b\d+\s*(?:users|clients|engineers|teams|services)\b/i.test(b)
      });
    }
  }

  return {
    personal: {
      name: personal.name || 'Candidate',
      headline: personal.headline || '',
      email: personal.email || '',
      phone: personal.phone || '',
      location: personal.location || '',
      linkedin: personal.linkedin || '',
      github: personal.github || '',
      portfolio: personal.portfolio || ''
    },
    summary: linkedInProfile?.summary || '',
    skills,
    top_skills: linkedInProfile?.topSkills || [],
    work_history: workHistory,
    projects,
    github_projects: [],
    portfolio_projects: [],
    education,
    certifications,
    languages: linkedInProfile?.languages || [],
    resume_bullets: resumeBullets,
    raw_text_preview: rawText.substring(0, 500),
    extracted_at: new Date().toISOString(),
    source_filename: filename,
    is_linkedin_export: isLinkedIn,
    import_source: isLinkedIn ? 'LinkedIn Profile PDF Export' : 'Standard Document Extraction',
    mode: 'authentic_client_extraction'
  };
}
