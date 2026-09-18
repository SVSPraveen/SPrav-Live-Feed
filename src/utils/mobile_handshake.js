/**
 * mobile_handshake.js
 * ===================
 * Laptop GPU -> Mobile P2P Continuity & Handshake Engine ($0).
 * 
 * Allows a user to perform heavy scans, ATS evaluations, and WebGPU synthesis
 * on their desktop or laptop with dedicated GPU, then instantly transfer their
 * top matches, tailored pitches, screening answers, and candidate profile to their
 * mobile device via:
 * 1. Dynamic Compressed QR Code Handshake (Camera Scan)
 * 2. 1-Click Mobile Sync Bundle Download/Import (.sprav-sync)
 * 3. Local Wi-Fi Direct Peer Link
 * 
 * Zero cloud servers, zero third-party database sync, 100% private.
 */
import { safeJsonParse, sanitizeObject, isValidWebUrl } from './security_guard.js';

/**
 * Builds a compact, transfer-optimized mobile sync bundle from local storage.
 * Minimizes payload size so it fits directly inside scannable QR codes or URL fragments.
 */
export function buildMobileHandshakePayload(options = {}) {
  const {
    kb = {},
    scope = {},
    jobs = [],
    topLimit = 35,
    includePitches = true,
    compactForQr = false
  } = options;

  // 1. Candidate Core Facts
  const candidate = {
    name: kb.personal?.name || kb.personal_info?.name || kb.name || kb.candidate_name || '',
    email: kb.personal?.email || kb.email || kb.contact_info?.email || '',
    phone: kb.personal?.phone || kb.phone || kb.contact_info?.phone || '',
    location: kb.personal?.location || kb.location || (scope.locations && scope.locations[0]) || '',
    linkedin: kb.personal?.linkedin || kb.linkedin || '',
    github: kb.personal?.github || kb.github || '',
    skills: Array.isArray(kb.skills) 
      ? kb.skills.slice(0, compactForQr ? 6 : 25) 
      : (typeof kb.skills === 'object' && kb.skills ? Object.values(kb.skills).flat().slice(0, compactForQr ? 6 : 25) : [])
  };

  // 2. Application Scope
  const targetScope = {
    roles: Array.isArray(scope.roles) ? scope.roles.slice(0, compactForQr ? 3 : 10) : [],
    locations: Array.isArray(scope.locations) ? scope.locations.slice(0, compactForQr ? 2 : 5) : [],
    salary: scope.target_salary || ''
  };

  // 3. Filter and compact high-priority jobs
  const sortedJobs = [...jobs].sort((a, b) => {
    const scoreA = parseFloat(a.ats_match_score) || 0;
    const scoreB = parseFloat(b.ats_match_score) || 0;
    return scoreB - scoreA;
  });

  const effectiveLimit = compactForQr ? Math.min(topLimit, 8) : topLimit;

  if (compactForQr) {
    // Ultra-compact representation for optimal camera scanning (<800 bytes)
    const compactJobList = sortedJobs.slice(0, effectiveLimit).map(j => ({
      i: String(j.id || '').slice(0, 36),
      t: String(j.title || '').slice(0, 45),
      c: String(j.company || '').slice(0, 30),
      u: j.url || '',
      a: j.ats_match_score != null ? Math.round(Number(j.ats_match_score)) : null,
      f: j.founder_email || undefined
    }));

    return {
      sprav_sync: true,
      v: 2,
      compact: true,
      ts: Date.now(),
      c: {
        n: candidate.name,
        e: candidate.email,
        p: candidate.phone,
        l: candidate.linkedin
      },
      s: {
        r: targetScope.roles.slice(0, 3),
        l: targetScope.locations.slice(0, 2)
      },
      j: compactJobList,
      meta: {
        total_scanned: jobs.length,
        transferred_count: compactJobList.length
      }
    };
  }

  const compactJobs = sortedJobs.slice(0, topLimit).map(j => ({
    id: j.id,
    title: j.title,
    company: j.company,
    location: j.location || 'Remote',
    url: j.url || '',
    source: j.source || 'direct_ats',
    ats: j.ats_match_score != null ? Math.round(Number(j.ats_match_score)) : null,
    fit: j.fit_score != null ? Number(j.fit_score) : null,
    status: j.status || 'new',
    founder_email: j.founder_email || null,
    pitch: includePitches 
      ? (j.cover_letter_body || j.tailored_pitch || '').slice(0, 280)
      : ''
  }));

  return {
    sprav_sync: true,
    version: 1,
    timestamp: Date.now(),
    device: 'desktop_gpu',
    candidate,
    scope: targetScope,
    jobs: compactJobs,
    meta: {
      total_scanned: jobs.length,
      transferred_count: compactJobs.length
    }
  };
}

/**
 * Encodes payload into URL-safe base64 string.
 */
export function encodeHandshakePayload(payload) {
  const jsonStr = JSON.stringify(payload);
  // Encode utf-8 safely in browser
  const utf8Bytes = new TextEncoder().encode(jsonStr);
  let binary = '';
  for (let i = 0; i < utf8Bytes.length; i++) {
    binary += String.fromCharCode(utf8Bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * Decodes URL-safe base64 string back into JSON payload.
 * Automatically normalizes compact QR payloads into standard format.
 */
export function decodeHandshakePayload(encodedStr) {
  if (!encodedStr) throw new Error('Empty payload string');

  // Convert URL-safe base64 back to standard
  let base64 = encodedStr.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4 !== 0) {
    base64 += '=';
  }

  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  const decodedJson = new TextDecoder().decode(bytes);
  const parsed = safeJsonParse(decodedJson);
  if (!parsed) throw new Error('Invalid JSON payload in handshake string');

  // Normalize compact v2 payload if received
  if (parsed && (parsed.compact || parsed.j || parsed.c)) {
    return {
      sprav_sync: true,
      version: parsed.v || 2,
      timestamp: parsed.ts || Date.now(),
      device: 'desktop_gpu_qr',
      candidate: {
        name: parsed.c?.n || parsed.candidate?.name || '',
        email: parsed.c?.e || parsed.candidate?.email || '',
        phone: parsed.c?.p || parsed.candidate?.phone || '',
        linkedin: parsed.c?.l || parsed.candidate?.linkedin || '',
        skills: []
      },
      scope: {
        roles: parsed.s?.r || parsed.scope?.roles || [],
        locations: parsed.s?.l || parsed.scope?.locations || [],
        salary: ''
      },
      jobs: (parsed.j || parsed.jobs || []).map(item => ({
        id: item.i || item.id,
        title: item.t || item.title,
        company: item.c || item.company,
        url: isValidWebUrl(item.u || item.url) ? (item.u || item.url) : '',
        ats_match_score: item.a ?? item.ats ?? 85,
        source: 'desktop_qr_sync',
        status: 'new',
        founder_email: item.f || item.founder_email || null
      })),
      meta: parsed.meta || { transferred_count: (parsed.j || []).length }
    };
  }

  return parsed;
}

/**
 * Generates the full mobile sync URL for QR codes or instant clicking.
 */
export function generateMobileSyncUrl(payload, origin) {
  const base = origin || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5174');
  const encoded = encodeHandshakePayload(payload);
  // Use hash route format compatible with SPA router
  return `${base}/#/mobile-sync?import=${encoded}`;
}

/**
 * Applies a received mobile handshake payload to the client IndexedDB vault.
 * Merges candidate facts and adds transferred jobs.
 */
export async function applyMobileHandshakeToVault(payload, storageVault) {
  const safePayload = sanitizeObject(payload);
  if (!safePayload || !safePayload.sprav_sync) {
    throw new Error('Invalid SPrav sync package format');
  }

  const importedJobs = [];

  // 1. Ingest candidate profile if provided
  if (safePayload.candidate && safePayload.candidate.name) {
    try {
      const existingKb = await storageVault.getKnowledgeBase();
      const updatedKb = {
        ...existingKb,
        name: payload.candidate.name || existingKb.name,
        candidate_name: payload.candidate.name || existingKb.candidate_name,
        email: payload.candidate.email || existingKb.email,
        phone: payload.candidate.phone || existingKb.phone,
        location: payload.candidate.location || existingKb.location,
        linkedin: payload.candidate.linkedin || existingKb.linkedin,
        github: payload.candidate.github || existingKb.github,
        skills: payload.candidate.skills && payload.candidate.skills.length > 0 
          ? payload.candidate.skills 
          : existingKb.skills
      };
      await storageVault.saveKnowledgeBase(updatedKb);
    } catch (e) {
      console.warn('Failed to merge candidate KB in mobile handshake:', e);
    }
  }

  // 2. Ingest application scope if provided
  if (payload.scope && (payload.scope.roles?.length > 0 || payload.scope.locations?.length > 0)) {
    try {
      await storageVault.saveScope(payload.scope);
    } catch (e) {
      console.warn('Failed to merge scope in mobile handshake:', e);
    }
  }

  // 3. Merge jobs into mobile vault
  if (Array.isArray(payload.jobs) && payload.jobs.length > 0) {
    try {
      const existingJobs = await storageVault.getJobs();
      const existingMap = new Map();
      existingJobs.forEach(j => {
        const key = `${(j.company || '').toLowerCase().trim()}___${(j.title || '').toLowerCase().trim()}`;
        existingMap.set(key, j);
      });

      for (const rawJob of payload.jobs) {
        const key = `${(rawJob.company || '').toLowerCase().trim()}___${(rawJob.title || '').toLowerCase().trim()}`;
        const existing = existingMap.get(key);

        const mergedJob = {
          id: rawJob.id || `m_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
          title: rawJob.title,
          company: rawJob.company,
          location: rawJob.location,
          url: rawJob.url,
          source: rawJob.source || 'desktop_p2p_sync',
          ats_match_score: rawJob.ats ?? 80,
          fit_score: rawJob.fit ?? 4.0,
          status: rawJob.status || 'action_required',
          founder_email: rawJob.founder_email || null,
          cover_letter_body: rawJob.pitch || (existing ? existing.cover_letter_body : ''),
          synced_at: new Date().toISOString()
        };

        existingMap.set(key, mergedJob);
        importedJobs.push(mergedJob);
      }

      if (typeof storageVault.saveJobs === 'function') {
        await storageVault.saveJobs(Array.from(existingMap.values()));
      } else if (typeof storageVault.saveJob === 'function') {
        for (const job of existingMap.values()) {
          await storageVault.saveJob(job);
        }
      }
    } catch (e) {
      console.error('Failed to save transferred jobs to vault:', e);
      throw e;
    }
  }

  return {
    success: true,
    candidateName: payload.candidate?.name || 'Candidate',
    jobsTransferred: importedJobs.length,
    syncTimestamp: payload.timestamp
  };
}

/**
 * Detects if the current device is a mobile device or narrow screen.
 */
export function isMobileDevice() {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || navigator.vendor || window.opera || '';
  const isMobileUa = /android|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(ua);
  const isNarrowScreen = window.innerWidth <= 768;
  return isMobileUa || isNarrowScreen;
}
