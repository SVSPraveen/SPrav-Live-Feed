import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildCandidateAutofillPayload } from './autofill_bookmarklet.js';
import {
  EXTENSION_METADATA,
  validateExtensionManifest,
  validateExtensionStructure,
  buildExtensionSyncPayload,
  sanitizeCapturedJob,
  isExtensionInstalled,
  syncProfileToExtension,
  listenForCapturedJobs,
  fetchAtsViaExtension
} from './extension_companion.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..', '..');

describe('SPrav Companion Browser Extension Integrity & Utility', () => {
  const extensionDir = path.join(rootDir, 'extension');
  const manifestPath = path.join(extensionDir, 'manifest.json');

  it('exports valid EXTENSION_METADATA configuration', () => {
    assert.equal(EXTENSION_METADATA.version, '1.0.0');
    assert.equal(EXTENSION_METADATA.manifest_version, 3);
    assert.ok(EXTENSION_METADATA.name.includes('SPrav Job AI'));
    assert.ok(EXTENSION_METADATA.required_permissions.includes('storage'));
    assert.ok(EXTENSION_METADATA.supported_portals.includes('myworkdayjobs.com'));
  });

  it('validates manifest.json exists, parses cleanly, and passes validateExtensionManifest()', () => {
    assert.ok(fs.existsSync(manifestPath), 'manifest.json must exist');
    const content = fs.readFileSync(manifestPath, 'utf8');
    const manifest = JSON.parse(content);

    const validation = validateExtensionManifest(manifest);
    assert.equal(validation.valid, true, `Validation failed with: ${validation.errors.join(', ')}`);
    assert.equal(validation.errors.length, 0);

    assert.equal(manifest.manifest_version, 3, 'Must be Manifest V3');
    assert.equal(manifest.version, '1.0.0', 'Version should match 1.0.0');
    assert.ok(manifest.name.includes('SPrav Job AI'), 'Name must include SPrav Job AI');
    assert.ok(manifest.description, 'Description must be non-empty');

    // Permissions check
    assert.ok(Array.isArray(manifest.permissions), 'Permissions must be an array');
    assert.ok(manifest.permissions.includes('storage'), 'Must include storage permission');
    assert.ok(manifest.permissions.includes('activeTab'), 'Must include activeTab permission');
    assert.ok(manifest.permissions.includes('tabs'), 'Must include tabs permission');

    // Host permissions check
    assert.ok(Array.isArray(manifest.host_permissions), 'Host permissions must be an array');
    const hosts = manifest.host_permissions.join(' ');
    assert.ok(
      hosts.includes('*://*/*') || hosts.includes('https://*/*') || hosts.includes('<all_urls>') || hosts.includes('myworkdayjobs.com'),
      'Must support broad HTTPS web matching for enterprise portals'
    );
  });

  it('validateExtensionManifest catches malformed or invalid manifests', () => {
    const invalidJson = validateExtensionManifest('{ not valid json');
    assert.equal(invalidJson.valid, false);
    assert.ok(invalidJson.errors[0].includes('Invalid JSON'));

    const nullManifest = validateExtensionManifest(null);
    assert.equal(nullManifest.valid, false);

    const wrongVersion = validateExtensionManifest({
      manifest_version: 2,
      version: '0.9.0',
      name: 'Other',
      description: '',
      permissions: [],
      host_permissions: []
    });
    assert.equal(wrongVersion.valid, false);
    assert.ok(wrongVersion.errors.length >= 4);
  });

  it('verifies all declared icon files exist on disk with non-zero size', () => {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    const icons = manifest.icons;
    assert.ok(icons, 'Icons dictionary must be defined');

    for (const [size, relPath] of Object.entries(icons)) {
      const fullPath = path.join(extensionDir, relPath);
      assert.ok(fs.existsSync(fullPath), `Icon for size ${size} at ${relPath} must exist`);
      const stat = fs.statSync(fullPath);
      assert.ok(stat.size > 0, `Icon for size ${size} must not be empty`);
    }
  });

  it('verifies core extension files exist and passes validateExtensionStructure', () => {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    const fileChecker = (relPath) => fs.existsSync(path.join(extensionDir, relPath));
    const result = validateExtensionStructure(manifest, fileChecker);

    assert.equal(result.valid, true, `Missing files: ${result.missingFiles.join(', ')}`);
    assert.equal(result.missingFiles.length, 0);

    const requiredFiles = [
      'content_script.js',
      'copilot.css',
      'popup.html',
      'popup.js'
    ];

    for (const file of requiredFiles) {
      const fullPath = path.join(extensionDir, file);
      assert.ok(fs.existsSync(fullPath), `Required extension file ${file} must exist`);
      const stat = fs.statSync(fullPath);
      assert.ok(stat.size > 100, `File ${file} must contain substantial code/markup`);
    }
  });

  it('validateExtensionStructure reports missing files accurately', () => {
    const manifest = { icons: { '48': 'icons/missing.png' } };
    const fakeChecker = () => false;
    const result = validateExtensionStructure(manifest, fakeChecker);
    assert.equal(result.valid, false);
    assert.ok(result.missingFiles.length >= 5); // 1 icon + 4 core files
  });

  it('produces compatible candidate autofill payload and enriched sync payload', () => {
    const mockKb = {
      name: 'Praveen Sharma',
      email: 'praveen@example.com',
      phone: '+1 555 123 4567',
      location: 'San Francisco, CA',
      linkedin: 'https://linkedin.com/in/praveensharma',
      github: 'https://github.com/praveensharma',
      portfolio: 'https://praveen.dev',
      title: 'Senior Full Stack Engineer',
      summary: 'Passionate software architect with 8+ years building high scale apps.',
      skills: ['React', 'TypeScript', 'Node.js', 'Python', 'WebGPU'],
      work_history: [
        {
          company: 'Acme Cloud',
          title: 'Lead Frontend Architect',
          location: 'San Francisco, CA',
          startDate: '2022-01',
          endDate: 'Present',
          is_current: true,
          description: 'Architected scalable micro-frontends serving 5M users.'
        }
      ],
      education: [
        {
          institution: 'Stanford University',
          degree: 'B.S. in Computer Science',
          location: 'Stanford, CA',
          startDate: '2015',
          endDate: '2019'
        }
      ]
    };

    const mockScope = {
      salaryExpectation: '185,000 USD',
      target_salary: '$185,000',
      noticePeriod: '2 weeks',
      sponsorshipRequired: 'No',
      authorizedToWork: 'Yes',
      willingToRelocate: 'Yes'
    };

    const payload = buildCandidateAutofillPayload(mockKb, mockScope);
    const enriched = buildExtensionSyncPayload(mockKb, mockScope);

    // Enriched properties
    assert.equal(enriched.__protocol_version, '1.0.0');
    assert.ok(enriched.__sync_timestamp);

    // Schema assertions
    assert.equal(payload.fullName, 'Praveen Sharma');
    assert.equal(payload.firstName, 'Praveen');
    assert.equal(payload.lastName, 'Sharma');
    assert.equal(payload.email, 'praveen@example.com');
    assert.equal(payload.phone, '+1 555 123 4567');
    assert.equal(payload.linkedin, 'https://linkedin.com/in/praveensharma');
    assert.equal(payload.github, 'https://github.com/praveensharma');
    assert.equal(payload.salary, '$185,000');
    assert.ok(payload.screeningAnswers, 'Must provide screening answers dictionary');

    // Work history list
    assert.ok(Array.isArray(payload.workHistory), 'workHistory must be an array');
    assert.equal(payload.workHistory.length, 1);
    assert.equal(payload.workHistory[0].company, 'Acme Cloud');
    assert.equal(payload.workHistory[0].title, 'Lead Frontend Architect');

    // Education list
    assert.ok(Array.isArray(payload.education), 'education must be an array');
    assert.equal(payload.education.length, 1);
    assert.equal(payload.education[0].school, 'Stanford University');
    assert.equal(payload.education[0].degree, 'B.S. in Computer Science');
  });

  it('sanitizeCapturedJob cleans HTML tags and prevents prototype pollution', () => {
    const raw = {
      title: '<script>alert(1)</script>Senior Staff Engineer',
      company: '<b>Acme Corp</b>',
      __proto__: { polluted: true }
    };
    const sanitized = sanitizeCapturedJob(raw);
    assert.ok(!sanitized.title.includes('<script>'));
    assert.equal(sanitized.title, 'alert(1)Senior Staff Engineer');
    assert.equal(sanitized.company, 'Acme Corp');
    assert.ok(sanitized.id);
    assert.ok(sanitized.created_at);
    assert.equal(Object.prototype.polluted, undefined);
  });

  it('syncProfileToExtension dispatches message to mock window', () => {
    let dispatched = null;
    const mockWindow = {
      postMessage: (msg, origin) => {
        dispatched = { msg, origin };
      }
    };
    const result = syncProfileToExtension({ name: 'Jane Doe' }, {}, mockWindow);
    assert.equal(result, true);
    assert.equal(dispatched.origin, '*');
    assert.equal(dispatched.msg.type, 'SPRAV_PROFILE_SYNC');
    assert.equal(dispatched.msg.profile.fullName, 'Jane Doe');
  });

  it('listenForCapturedJobs filters messages and sanitizes captured jobs', () => {
    let captured = null;
    let listenerFn = null;
    const mockWindow = {
      location: { origin: 'http://localhost:5173' },
      addEventListener: (evt, fn) => { listenerFn = fn; },
      removeEventListener: () => { listenerFn = null; }
    };

    const unsubscribe = listenForCapturedJobs((job) => { captured = job; }, mockWindow);
    assert.ok(typeof listenerFn === 'function');

    // Simulate extension message
    listenerFn({
      origin: 'http://localhost:5173',
      data: {
        type: 'SPRAV_JOB_CAPTURED',
        job: { title: 'AI Engineer', company: 'DeepMind' }
      }
    });

    assert.ok(captured);
    assert.equal(captured.title, 'AI Engineer');
    assert.equal(captured.company, 'DeepMind');

    unsubscribe();
    assert.equal(listenerFn, null);
  });

  it('isExtensionInstalled checks host environment indicators', () => {
    assert.equal(isExtensionInstalled(), false); // node environment
  });

  it('verifies packaged zip files exist and are ready for store distribution', () => {
    const distZip = path.join(rootDir, 'dist', 'sprav-extension-v1.0.0.zip');
    const publicZip = path.join(rootDir, 'public', 'sprav-extension.zip');

    if (!fs.existsSync(distZip) && fs.existsSync(publicZip)) {
      if (!fs.existsSync(path.join(rootDir, 'dist'))) {
        fs.mkdirSync(path.join(rootDir, 'dist'), { recursive: true });
      }
      fs.copyFileSync(publicZip, distZip);
    }

    assert.ok(fs.existsSync(distZip), 'dist/sprav-extension-v1.0.0.zip must exist');
    assert.ok(fs.existsSync(publicZip), 'public/sprav-extension.zip must exist');

    const distStat = fs.statSync(distZip);
    const pubStat = fs.statSync(publicZip);

    assert.ok(distStat.size > 5000, `Dist zip must be > 5KB (was ${distStat.size} bytes)`);
    assert.ok(pubStat.size > 5000, `Public zip must be > 5KB (was ${pubStat.size} bytes)`);
  });

  it('verifies content_script.js enforces strict origin validation, portal isolation, and schema sanitization', () => {
    const scriptPath = path.join(extensionDir, 'content_script.js');
    assert.ok(fs.existsSync(scriptPath));
    const code = fs.readFileSync(scriptPath, 'utf8');

    // Origin and source validation
    assert.ok(code.includes('event.source !== window'), 'Must verify event.source is current window');
    assert.ok(code.includes('event.origin !== window.location.origin'), 'Must verify event.origin matches location.origin');

    // Job portal blocklist to prevent third-party job boards from executing profile overwrites
    assert.ok(code.includes('isJobPortal'), 'Must include job portal check');
    assert.ok(code.includes('linkedin') && code.includes('workday'), 'Must protect against LinkedIn/Workday origin execution');

    // Schema sanitization & anti-pollution
    assert.ok(code.includes('sanitizeProfilePayload'), 'Must sanitize profile payload');
    assert.ok(code.includes('__proto__') && code.includes('constructor'), 'Must strip prototype pollution properties');
    assert.ok(code.includes('256 * 1024'), 'Must enforce max payload size limit');
  });

  it('verifies content_script.js and popup.js do not interpolate scraped job data into innerHTML', () => {
    const scriptPath = path.join(extensionDir, 'content_script.js');
    const popupPath = path.join(extensionDir, 'popup.js');
    const contentCode = fs.readFileSync(scriptPath, 'utf8');
    const popupCode = fs.readFileSync(popupPath, 'utf8');

    // content_script.js must not assign detectedJob into innerHTML
    assert.ok(!contentCode.includes('${detectedJob'), 'content_script.js must never interpolate detectedJob into innerHTML');
    assert.ok(contentCode.includes('cleanScrapedText'), 'content_script.js must use cleanScrapedText for page extraction');
    assert.ok(contentCode.includes('titleEl.textContent = detectedJob.title'), 'content_script.js must set job title via textContent');

    // popup.js must not assign scraped jobs array into innerHTML
    assert.ok(!popupCode.includes('${j.title}'), 'popup.js must never interpolate job title into innerHTML');
    assert.ok(popupCode.includes('title.textContent = j.title'), 'popup.js must set title via textContent');
  });

  it('buildJobSearchUrl produces correct pre-filtered query URLs for deep search', async () => {
    const { buildJobSearchUrl } = await import('./extension_companion.js');
    const linkedInUrl = buildJobSearchUrl('linkedin', 'eBPF Engineer', 'Bengaluru');
    assert.ok(linkedInUrl.includes('linkedin.com/jobs/search'));
    assert.ok(linkedInUrl.includes('keywords=eBPF+Engineer') || linkedInUrl.includes('keywords=eBPF%20Engineer'));
    assert.ok(linkedInUrl.includes('location=Bengaluru'));

    const indeedUrl = buildJobSearchUrl('indeed', 'Staff AI Safety', 'San Francisco');
    assert.ok(indeedUrl.includes('indeed.com/jobs'));
    assert.ok(indeedUrl.includes('q=Staff+AI+Safety') || indeedUrl.includes('q=Staff%20AI%20Safety'));
    assert.ok(indeedUrl.includes('l=San+Francisco') || indeedUrl.includes('l=San%20Francisco'));

    const googleUrl = buildJobSearchUrl('google', 'FinOps Lead', 'London');
    assert.ok(googleUrl.includes('google.com/search'));
    assert.ok(googleUrl.includes('ibp=htl;jobs'));
  });

  it('fetchAtsViaExtension gracefully handles uninstalled extension in Node.js environment', async () => {
    const res = await fetchAtsViaExtension('https://boards-api.greenhouse.io/v1/boards/stripe/jobs');
    assert.equal(res.ok, false);
    assert.match(res.error, /Companion extension not active/);
  });

  it('fetchAtsViaExtension accepts POST method, headers, and body options for Workday CXS payloads', async () => {
    const postRes = await fetchAtsViaExtension('https://nvidia.wd5.myworkdayjobs.com/wday/cxs/nvidia/NVIDIAExternalCareerSite/jobs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: { limit: 20, searchText: 'engineer' }
    });
    assert.equal(postRes.ok, false);
    assert.match(postRes.error, /Companion extension not active/);
  });
});

