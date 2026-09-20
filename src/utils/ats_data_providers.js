/**
 * ats_data_providers.js
 * =====================
 * Logical module for BYOK Data Providers and external Job API connectors:
 * - Adzuna Job Search API credentials & quota
 * - USAJOBS Federal Civil Service API credentials
 */

export {
  getAdzunaQuotaTelemetry,
  incrementAdzunaQuotaTelemetry,
  testAdzunaCredentials,
  testUsajobsCredentials
} from './ats_credentials.js';
