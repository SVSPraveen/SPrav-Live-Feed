/**
 * wasm_engine_bridge.js
 * =====================
 * High-performance, anti-reverse-engineering WebAssembly bridge for SPrav Job AI.
 *
 * Routes proprietary mathematical scoring, decay calculation, and benchmark formulas
 * through a pre-compiled WebAssembly binary (sprav_engine_bg.wasm).
 *
 * Fully resilient:
 * If the WebAssembly runtime is unsupported, loading, or fails, the bridge
 * seamlessly and synchronously executes the exact calibrated JS fallback formulas
 * without dropping a single frame or interrupting the user.
 */

// Mapping of freshness telemetry string codes to Wasm numeric constants
const FRESHNESS_CODE_MAP = {
  ULTRA_FRESH: 1,
  FRESH_DROP: 2,
  ACTIVE_CYCLE: 3,
  MODERATE_AGE: 4,
  STALE_PIPELINE: 5,
  REPOST_WARNING: 6,
  LIKELY_GHOST: 7,
  ultra_fresh: 1,
  fresh_drop: 2,
  active_cycle: 3,
  moderate_age: 4,
  stale_pipeline: 5,
  repost_warning: 6,
  likely_ghost: 7,
};

const GRADE_LETTERS = ['F', 'D', 'C', 'B', 'A'];

// JS Fallback constants (identical mathematical calibration)
const FALLBACK_DIMENSION_WEIGHTS = {
  contact: 0.12,
  sections: 0.10,
  format: 0.10,
  keywords: 0.10,
  actionVerbs: 0.10,
  quantification: 0.10,
  dates: 0.07,
  length: 0.07,
  redFlags: 0.10,
  skills: 0.07,
  education: 0.07,
};

class WasmEngineBridge {
  constructor() {
    this._wasmInstance = null;
    this._initPromise = null;
    this._isReady = false;
    this._initFailed = false;

    // Trigger eager background initialization
    this.init().catch(() => {
      // Handled internally by fallback
    });
  }

  /**
   * Initializes the WebAssembly binary instance.
   * Works across modern browsers (Vite) and Node.js test runners.
   */
  async init() {
    if (this._isReady && this._wasmInstance) return this._wasmInstance;
    if (this._initPromise) return this._initPromise;

    this._initPromise = (async () => {
      try {
        let wasmBytes = null;

        // Node environment (e.g. node --test)
        if (typeof window === 'undefined' && typeof process !== 'undefined') {
          try {
            const fs = await import('fs');
            const path = await import('path');
            const { fileURLToPath } = await import('url');
            const __filename = fileURLToPath(import.meta.url);
            const __dirname = path.dirname(__filename);
            const candidate1 = path.resolve(__dirname, '..', 'core', 'engine-wasm', 'pkg', 'sprav_engine_bg.wasm');
            const candidate2 = path.resolve(__dirname, '..', 'engine-wasm', 'pkg', 'sprav_engine_bg.wasm');
            const wasmPath = fs.existsSync(candidate1) ? candidate1 : candidate2;
            if (fs.existsSync(wasmPath)) {
              wasmBytes = fs.readFileSync(wasmPath);
            }
          } catch (e) {
            // Fallback to fetch
          }
        }

        if (!wasmBytes) {
          // Browser or fetch-compatible environment
          const wasmUrl = new URL('../core/engine-wasm/pkg/sprav_engine_bg.wasm', import.meta.url).href;
          const res = await fetch(wasmUrl);
          if (!res.ok) throw new Error(`HTTP ${res.status} fetching wasm binary`);
          wasmBytes = await res.arrayBuffer();
        }

        const { instance } = await WebAssembly.instantiate(wasmBytes, {});
        this._wasmInstance = instance.exports;
        this._isReady = true;
        this._initFailed = false;
        return this._wasmInstance;
      } catch (err) {
        this._initFailed = true;
        this._wasmInstance = null;
        // Silent fallback — mathematical calculations continue seamlessly in JS
        return null;
      }
    })();

    return this._initPromise;
  }

  isReady() {
    return this._isReady && this._wasmInstance !== null;
  }

  getKernelVersion() {
    if (this.isReady()) {
      return this._wasmInstance.wasm_kernel_version();
    }
    return 20260919;
  }

  /**
   * Computes the overall ATS score from dimension sub-scores.
   *
   * @param {Object} dimensions - Map of dimension objects or scores
   * @param {boolean} hasJd - Whether a Job Description is active
   * @returns {number} Integer score clamped [0, 100]
   */
  scoreResume(dimensions = {}, hasJd = false) {
    const extractScore = (dim) => {
      if (dim == null) return 0;
      if (typeof dim === 'number') return dim;
      if (typeof dim.score === 'number') return dim.score;
      return 0;
    };

    const contact = extractScore(dimensions.contact);
    const sections = extractScore(dimensions.sections);
    const format = extractScore(dimensions.format);
    const keywords = extractScore(dimensions.keywords);
    const actionVerbs = extractScore(dimensions.actionVerbs);
    const quantification = extractScore(dimensions.quantification);
    const dates = extractScore(dimensions.dates);
    const length = extractScore(dimensions.length);
    const redFlags = extractScore(dimensions.redFlags);
    const skills = extractScore(dimensions.skills);
    const education = extractScore(dimensions.education);
    const jdMatch = extractScore(dimensions.jdMatch);
    const jdFlag = hasJd || dimensions.jdMatch != null;

    if (this.isReady()) {
      try {
        return Math.round(
          this._wasmInstance.score_resume(
            contact,
            sections,
            format,
            keywords,
            actionVerbs,
            quantification,
            dates,
            length,
            redFlags,
            skills,
            education,
            jdMatch,
            jdFlag ? 1 : 0
          )
        );
      } catch (err) {
        // Fall back gracefully
      }
    }

    // Pure JS Fallback
    const weights = { ...FALLBACK_DIMENSION_WEIGHTS };
    if (jdFlag) {
      weights.jdMatch = weights.keywords;
      weights.keywords = 0;
    }

    const map = {
      contact,
      sections,
      format,
      keywords,
      actionVerbs,
      quantification,
      dates,
      length,
      redFlags,
      skills,
      education,
    };
    if (jdFlag) map.jdMatch = jdMatch;

    let overallScore = 0;
    let totalWeight = 0;
    for (const [dim, score] of Object.entries(map)) {
      const w = weights[dim] || 0;
      overallScore += score * w;
      totalWeight += w;
    }

    if (totalWeight > 0) overallScore = overallScore / totalWeight;
    return Math.min(100, Math.max(0, Math.round(overallScore)));
  }

  /**
   * Converts numeric ATS score into grade letter: 'A', 'B', 'C', 'D', or 'F'
   */
  scoreToGrade(score = 0) {
    const num = Number(score) || 0;
    if (this.isReady()) {
      try {
        const gradeIdx = this._wasmInstance.score_grade(num);
        return GRADE_LETTERS[gradeIdx] || 'F';
      } catch (err) {
        // Fall back
      }
    }

    if (num >= 90) return 'A';
    if (num >= 80) return 'B';
    if (num >= 70) return 'C';
    if (num >= 60) return 'D';
    return 'F';
  }

  /**
   * Evaluates freshness multiplier.
   */
  getFreshnessMultiplier(codeOrString, ageDays = 0) {
    const codeNum = typeof codeOrString === 'number'
      ? codeOrString
      : (FRESHNESS_CODE_MAP[codeOrString] || 0);

    if (this.isReady()) {
      try {
        return this._wasmInstance.get_freshness_multiplier(codeNum, Number(ageDays) || 0);
      } catch (err) {
        // Fall back
      }
    }

    const norm = typeof codeOrString === 'string' ? codeOrString.toLowerCase() : codeOrString;
    switch (norm) {
      case 'ultra_fresh':
      case 1:
        return 1.25;
      case 'fresh_drop':
      case 2:
        return 1.15;
      case 'active_cycle':
      case 3:
        return (Number(ageDays) || 0) <= 7 ? 1.0 : 0.90;
      case 'moderate_age':
      case 4:
        return 0.80;
      case 'stale_pipeline':
      case 5:
        return 0.65;
      case 'repost_warning':
      case 6:
        return 0.50;
      case 'likely_ghost':
      case 7:
        return 0.35;
      default:
        return 1.0;
    }
  }

  /**
   * Evaluates decayed ATS score clamped to [15, 100].
   */
  calculateFreshnessDecay(atsScore = 75, codeOrString = 'ACTIVE_CYCLE', ageDays = 0) {
    const baseScore = typeof atsScore === 'number' && !isNaN(atsScore) ? atsScore : parseFloat(atsScore) || 75;
    const codeNum = typeof codeOrString === 'number'
      ? codeOrString
      : (FRESHNESS_CODE_MAP[codeOrString] || 0);

    if (this.isReady()) {
      try {
        return Math.round(
          this._wasmInstance.calculate_freshness_decay(baseScore, codeNum, Number(ageDays) || 0)
        );
      } catch (err) {
        // Fall back
      }
    }

    const mult = this.getFreshnessMultiplier(codeOrString, ageDays);
    return Math.min(100, Math.max(15, Math.round(baseScore * mult)));
  }

  /**
   * Calculates interview callback probability clamped to [5, 95].
   */
  calculateCallbackLikelihood(atsScore = 50, freshnessMultiplier = 1.0, isRemote = false) {
    const numericAts = Math.min(100, Math.max(0, Number(atsScore) || 50));
    const mult = typeof freshnessMultiplier === 'number' && freshnessMultiplier > 0 ? freshnessMultiplier : 1.0;

    if (this.isReady()) {
      try {
        return Math.round(
          this._wasmInstance.calculate_callback_likelihood(numericAts, mult, isRemote ? 1 : 0)
        );
      } catch (err) {
        // Fall back
      }
    }

    let raw = (numericAts * 0.75) * mult;
    if (isRemote) raw -= 8;
    if (mult >= 1.15) {
      raw += 10;
    } else if (mult <= 0.50) {
      raw -= 12;
    }
    return Math.round(Math.min(95, Math.max(5, raw)));
  }

  /**
   * Calculates salary percentage delta relative to informed benchmark median.
   */
  calculateSalaryDelta(jobMedian = 0, benchmarkMedian = 0) {
    if (benchmarkMedian <= 0) return 0;

    if (this.isReady()) {
      try {
        return Math.round(
          this._wasmInstance.calculate_salary_delta(Number(jobMedian) || 0, Number(benchmarkMedian) || 0)
        );
      } catch (err) {
        // Fall back
      }
    }

    return Math.round(((jobMedian - benchmarkMedian) / benchmarkMedian) * 100);
  }

  /**
   * Classifies market alignment tier from delta percentage:
   * 'above_market' | 'at_market' | 'below_market'
   */
  classifySalaryTier(deltaPercent = 0) {
    const delta = Number(deltaPercent) || 0;

    if (this.isReady()) {
      try {
        const tierCode = this._wasmInstance.classify_salary_tier(delta);
        if (tierCode === 1) return 'above_market';
        if (tierCode === -1) return 'below_market';
        return 'at_market';
      } catch (err) {
        // Fall back
      }
    }

    if (delta >= 10) return 'above_market';
    if (delta <= -10) return 'below_market';
    return 'at_market';
  }
}

// Export singleton instance
export const wasmEngine = new WasmEngineBridge();
export default wasmEngine;
