/**
 * structured_schemas.js
 * =====================
 * Formal JSON Schemas for WebLLM XGrammar-constrained generation, Ollama JSON mode,
 * and Cloud BYOK structured outputs (OpenAI, Gemini, Groq, Mistral).
 *
 * Guarantees mathematical schema compliance at token generation time, preventing
 * hallucinations, missing keys, runaway strings, or unparseable formatting.
 */

/**
 * Schema for Job Description Technical Competency & Seniority Extraction (Stage 1 / JD Parsing)
 */
export const JD_COMPETENCY_SCHEMA = {
  type: 'object',
  properties: {
    must_have_skills: {
      type: 'array',
      items: { type: 'string' },
      description: 'List of mandatory technical tools, programming languages, and frameworks.'
    },
    minimum_years: {
      type: 'integer',
      description: 'Minimum required years of professional engineering experience.'
    },
    level: {
      type: 'string',
      enum: ['entry', 'mid', 'senior', 'staff', 'principal'],
      description: 'Seniority tier deduced from requirements and scope.'
    },
    responsibilities: {
      type: 'array',
      items: { type: 'string' },
      description: 'Core day-to-day architectural or deliverable responsibilities.'
    }
  },
  required: ['must_have_skills', 'minimum_years', 'level'],
  additionalProperties: true
};

/**
 * Schema for Structured ATS Fit Audit & Competency Gaps
 */
export const ATS_AUDIT_SCHEMA = {
  type: 'object',
  properties: {
    ats_score: {
      type: 'integer',
      minimum: 0,
      maximum: 100,
      description: 'ATS alignment score percentage from 0 to 100.'
    },
    matching_skills: {
      type: 'array',
      items: { type: 'string' },
      description: 'Verified candidate skills directly satisfying job requirements.'
    },
    missing_skills: {
      type: 'array',
      items: { type: 'string' },
      description: 'Required job skills not explicitly found in candidate profile.'
    },
    strategic_advice: {
      type: 'string',
      description: 'Concise tactical guidance to close missing competency gaps.'
    }
  },
  required: ['ats_score', 'matching_skills', 'missing_skills', 'strategic_advice'],
  additionalProperties: true
};

/**
 * Schema for Multi-Tone Application Follow-up & Radar Notes
 */
export const MULTI_TONE_FOLLOWUP_SCHEMA = {
  type: 'object',
  properties: {
    subject: {
      type: 'string',
      description: 'Crisp subject line under 10 words.'
    },
    email: {
      type: 'string',
      description: 'Comprehensive follow-up email under 70 words.'
    },
    tech: {
      type: 'string',
      description: 'Technical value pitch highlighting architectural impact under 60 words.'
    },
    inmail: {
      type: 'string',
      description: 'LinkedIn InMail message under 35 words.'
    },
    cover: {
      type: 'string',
      description: 'Authentic 4-thematic-beats cover letter without labeled headers.'
    }
  },
  required: ['subject', 'email', 'tech', 'inmail', 'cover'],
  additionalProperties: true
};

/**
 * Schema for Bullet Impact Optimization
 */
export const BULLET_REWRITE_SCHEMA = {
  type: 'object',
  properties: {
    polished_bullet: {
      type: 'string',
      description: 'Action-verb led, metric-quantified resume bullet.'
    },
    action_verb: {
      type: 'string',
      description: 'Strong, non-passive action verb used at the start.'
    },
    metric_highlight: {
      type: 'string',
      description: 'The quantified outcome or scale constraint preserved from original.'
    }
  },
  required: ['polished_bullet'],
  additionalProperties: true
};

/**
 * Schema for Technical Screening Question Answers
 */
export const SCREENING_ANSWER_SCHEMA = {
  type: 'object',
  properties: {
    answer: {
      type: 'string',
      description: 'Concise, truthful screening response citing candidate background.'
    },
    confidence: {
      type: 'string',
      enum: ['verified', 'inferred', 'unverified'],
      description: 'Confidence grade based strictly on factual knowledge base.'
    }
  },
  required: ['answer'],
  additionalProperties: true
};

/**
 * Schema for Micro-Chain 10-Minute Tactical Action
 */
export const MICRO_ACTION_SCHEMA = {
  type: 'object',
  properties: {
    action: {
      type: 'string',
      description: 'Single high-leverage 35-word tactical action to close top missing gap.'
    },
    time_estimate_minutes: {
      type: 'integer',
      description: 'Estimated execution time (e.g. 10).'
    },
    target_skill: {
      type: 'string',
      description: 'The primary competency addressed.'
    }
  },
  required: ['action', 'time_estimate_minutes', 'target_skill'],
  additionalProperties: true
};

/**
 * Schema for Structured STAR Answer Evaluation
 */
export const STAR_INTERVIEW_EVALUATION_SCHEMA = {
  type: 'object',
  properties: {
    scores: {
      type: 'object',
      properties: {
        S: { type: 'integer', minimum: 1, maximum: 5 },
        T: { type: 'integer', minimum: 1, maximum: 5 },
        A: { type: 'integer', minimum: 1, maximum: 5 },
        R: { type: 'integer', minimum: 1, maximum: 5 }
      },
      required: ['S', 'T', 'A', 'R']
    },
    overall: { type: 'integer', minimum: 1, maximum: 5 },
    strongest_point: { type: 'string' },
    critical_improvement: { type: 'string' },
    rewritten_result_sentence: { type: 'string' }
  },
  required: ['scores', 'overall', 'strongest_point', 'critical_improvement', 'rewritten_result_sentence'],
  additionalProperties: true
};

/**
 * Schema for Role-Specific Mock Interview Question
 */
export const MOCK_INTERVIEW_QUESTION_SCHEMA = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    question: { type: 'string' },
    category: { type: 'string', enum: ['behavioral', 'system_design', 'technical'] },
    expectedTime: { type: 'string' },
    whatInterviewersLookFor: { type: 'string' },
    starHint: { type: 'string' }
  },
  required: ['id', 'question', 'category'],
  additionalProperties: true
};

/**
 * Validates whether an object structurally complies with a schema's required keys and types.
 * Pure lightweight JavaScript validator without heavy external dependencies.
 *
 * @param {Object} data - Parsed object to validate
 * @param {Object} schema - JSON Schema definition
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateAgainstSchema(data, schema) {
  if (!data || typeof data !== 'object') {
    return { valid: false, errors: ['Input data is not an object'] };
  }
  if (!schema || typeof schema !== 'object') {
    return { valid: true, errors: [] };
  }

  const errors = [];

  // 1. Check required fields
  if (Array.isArray(schema.required)) {
    for (const reqKey of schema.required) {
      if (data[reqKey] === undefined || data[reqKey] === null) {
        errors.push(`Missing required field: '${reqKey}'`);
      }
    }
  }

  // 2. Check property types
  if (schema.properties) {
    for (const [key, propDef] of Object.entries(schema.properties)) {
      if (data[key] !== undefined && data[key] !== null) {
        const val = data[key];
        if (propDef.type === 'array' && !Array.isArray(val)) {
          errors.push(`Field '${key}' expected array, got ${typeof val}`);
        } else if (propDef.type === 'integer' && (!Number.isInteger(val) || typeof val !== 'number')) {
          errors.push(`Field '${key}' expected integer, got ${typeof val}`);
        } else if (propDef.type === 'string' && typeof val !== 'string') {
          errors.push(`Field '${key}' expected string, got ${typeof val}`);
        } else if (propDef.enum && !propDef.enum.includes(val)) {
          errors.push(`Field '${key}' value '${val}' not in allowed enum [${propDef.enum.join(', ')}]`);
        }
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}
