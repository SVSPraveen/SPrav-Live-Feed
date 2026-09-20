/**
 * ats_platform_detector.js
 * =========================
 * Client-Side ATS Platform Fingerprinting & Diagnostic Rules Engine.
 *
 * Responsibilities:
 * - detectAtsPlatform: Identifies corporate ATS (Workday, Greenhouse, Lever, Ashby, Taleo, etc.)
 * - getAtsPlatform: Retrieves vendor metadata, rules, and risk factors
 * - ATS_PLATFORMS: Comprehensive registry of ATS vendors, regexes, and capabilities
 * - checkTemplateCompatibility & getTemplateCompatibilityScore: Template validation rules
 *
 * Decoupled from browser_ats_scanner.js (201KB) for modular tree-shaking.
 */

export {
  ATS_PLATFORMS,
  GENERIC_ATS,
  detectAtsPlatform,
  getAtsPlatform,
  checkTemplateCompatibility,
  getTemplateCompatibilityScore
} from './ats_fingerprint_engine.js';
