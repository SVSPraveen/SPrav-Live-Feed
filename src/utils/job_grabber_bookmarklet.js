/**
 * job_grabber_bookmarklet.js
 * ==========================
 * Universal 1-Click Job Grabber & Domestic Portal DOM Ingestion Engine ($0).
 * 
 * Runs client-side natively inside the browser context of ANY job board:
 * - India: Naukri, Instahyre, Hirist, Internshala, LinkedIn India
 * - Global: LinkedIn Jobs, Indeed, Glassdoor, ZipRecruiter, Dice, Wellfound
 * - Europe: Otta, StepStone, Totaljobs, Xing
 * - APAC: Seek, JobStreet, MyCareersFuture
 * - Enterprise & Direct ATS: Workday, Taleo, SuccessFactors, iCIMS, Greenhouse, Lever, Ashby
 * 
 * Bypasses CORS and anti-bot walls natively with zero proxy servers.
 * Extracts Schema.org JSON-LD, microdata, and heuristic DOM elements,
 * then dispatches the parsed job directly into SPrav via BroadcastChannel and URL payload.
 */

/**
 * Extracts raw job data from the current document using Schema.org JSON-LD,
 * OpenGraph meta tags, and platform-specific DOM fallback selectors.
 * Designed to run directly inside any browser tab.
 */
export function extractJobFromDom(doc = document, win = window) {
  let title = '';
  let company = '';
  let location = '';
  let salary = '';
  let description = '';
  const url = win.location?.href || '';
  const hostname = win.location?.hostname || '';

  // 1. Try Schema.org JSON-LD First (Standard across modern career sites & job boards)
  try {
    const scripts = doc.querySelectorAll('script[type="application/ld+json"]');
    for (const script of scripts) {
      try {
        const parsed = JSON.parse(script.textContent || '{}');
        const items = Array.isArray(parsed) ? parsed : [parsed];
        for (const item of items) {
          if (item && (item['@type'] === 'JobPosting' || item['@type']?.includes?.('JobPosting'))) {
            if (item.title && !title) title = String(item.title).trim();
            if (item.hiringOrganization?.name && !company) company = String(item.hiringOrganization.name).trim();
            if (item.description && !description) description = String(item.description).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
            if (item.jobLocation?.address) {
              const addr = item.jobLocation.address;
              const locParts = [addr.addressLocality, addr.addressRegion, addr.addressCountry].filter(Boolean);
              if (locParts.length > 0 && !location) location = locParts.join(', ');
            }
            if (item.baseSalary) {
              const val = item.baseSalary.value || item.baseSalary;
              const cur = item.baseSalary.currency || '$';
              if (typeof val === 'number') {
                salary = `${cur} ${Number(val).toLocaleString('en-US')}`;
              } else if (val && (val.minValue != null || val.maxValue != null)) {
                const min = val.minValue != null ? Number(val.minValue).toLocaleString('en-US') : '';
                const max = val.maxValue != null ? Number(val.maxValue).toLocaleString('en-US') : '';
                salary = min && max ? `${cur} ${min} - ${cur} ${max}` : `${cur} ${min || max}`;
              }
            }
          }
        }
      } catch {}
    }
  } catch {}

  // 2. Specific Platform Heuristics & Selectors
  // ────────────────────────────────────────────────────────────────────────────
  // A. NAUKRI (India)
  if (hostname.includes('naukri.com')) {
    title = title || doc.querySelector('h1.styles_jd-header-title__rZwM1, .jd-header-title, .job-title, header h1')?.innerText?.trim() || '';
    company = company || doc.querySelector('.styles_jd-header-comp-name__MvqAI a, .jd-header-comp-name a, .company-name')?.innerText?.trim() || '';
    location = location || doc.querySelector('.styles_jdn-header-loc__n_h7S, .location, .loc')?.innerText?.trim() || '';
    salary = salary || doc.querySelector('.styles_jdn-header-sal__, .salary, .sal')?.innerText?.trim() || '';
    const descEl = doc.querySelector('.styles_JDJobs-rec-section__ReBcq, .job-desc, section.job-desc');
    if (descEl) description = descEl.innerText?.trim() || description;
  }

  // B. LINKEDIN (Global)
  if (hostname.includes('linkedin.com')) {
    title = title || doc.querySelector('.job-details-jobs-unified-top-card__job-title, .jobs-unified-top-card__job-title, h1.t-24')?.innerText?.trim() || '';
    company = company || doc.querySelector('.job-details-jobs-unified-top-card__company-name a, .jobs-unified-top-card__company-name a, .jobs-unified-top-card__subtitle-primary-grouping a')?.innerText?.trim() || '';
    location = location || doc.querySelector('.job-details-jobs-unified-top-card__bullet, .jobs-unified-top-card__bullet')?.innerText?.trim() || '';
    const descEl = doc.querySelector('#job-details, .jobs-description__content, .jobs-box__html-content');
    if (descEl) description = descEl.innerText?.trim() || description;
  }

  // C. INSTAHYRE (India)
  if (hostname.includes('instahyre.com')) {
    title = title || doc.querySelector('.employer-job-header h1, .job-header h1, h1')?.innerText?.trim() || '';
    company = company || doc.querySelector('.employer-job-header .company-name, .company-name')?.innerText?.trim() || '';
    location = location || doc.querySelector('.employer-job-header .location, .job-locations')?.innerText?.trim() || '';
    const descEl = doc.querySelector('.job-description, #job-description');
    if (descEl) description = descEl.innerText?.trim() || description;
  }

  // D. INDEED (Global)
  if (hostname.includes('indeed.com')) {
    title = title || doc.querySelector('h1.jobsearch-JobInfoHeader-title, [data-testid="jobsearch-JobInfoHeader-title"]')?.innerText?.trim() || '';
    company = company || doc.querySelector('[data-testid="inlineHeader-companyName"] a, [data-testid="inlineHeader-companyName"], [data-company-name="true"]')?.innerText?.trim() || '';
    location = location || doc.querySelector('[data-testid="inlineHeader-companyLocation"], [data-testid="job-location"]')?.innerText?.trim() || '';
    salary = salary || doc.querySelector('#salaryInfoAndJobType, [data-testid="attribute_snippets_test_id"]')?.innerText?.trim() || '';
    const descEl = doc.querySelector('#jobDescriptionText');
    if (descEl) description = descEl.innerText?.trim() || description;
  }

  // E. SEEK (APAC - Australia / NZ)
  if (hostname.includes('seek.com')) {
    title = title || doc.querySelector('[data-automation="job-detail-title"], h1')?.innerText?.trim() || '';
    company = company || doc.querySelector('[data-automation="advertiser-name"]')?.innerText?.trim() || '';
    location = location || doc.querySelector('[data-automation="job-detail-location"]')?.innerText?.trim() || '';
    const descEl = doc.querySelector('[data-automation="jobAdDetails"]');
    if (descEl) description = descEl.innerText?.trim() || description;
  }

  // F. INTERNSHALA (India Freshers & Interns)
  if (hostname.includes('internshala.com')) {
    title = title || doc.querySelector('.profile_on_detail_page, .job_header h1, h1')?.innerText?.trim() || '';
    company = company || doc.querySelector('.link_display_like_text, .company_name')?.innerText?.trim() || '';
    location = location || doc.querySelector('#location_names, .location_link')?.innerText?.trim() || '';
    salary = salary || doc.querySelector('.stipend, .salary')?.innerText?.trim() || '';
    const descEl = doc.querySelector('.text-container, .internship_details');
    if (descEl) description = descEl.innerText?.trim() || description;
  }

  // 3. Fallbacks across OpenGraph, Document Title, and Semantic Blocks
  if (!title) {
    const ogTitle = doc.querySelector('meta[property="og:title"]')?.getAttribute('content');
    if (ogTitle) {
      title = ogTitle.split(/[-–|·:]/)[0]?.trim() || ogTitle.trim();
    } else {
      title = doc.querySelector('h1')?.innerText?.trim() || doc.title?.split(/[-–|·:]/)[0]?.trim() || 'Software Engineer';
    }
  }

  if (!company) {
    const ogSite = doc.querySelector('meta[property="og:site_name"]')?.getAttribute('content');
    if (ogSite) {
      company = ogSite.trim();
    } else {
      // Try hostname extraction (e.g., "stripe.com" -> "Stripe")
      const parts = hostname.replace(/^www\./, '').split('.');
      if (parts.length >= 2 && !['naukri', 'linkedin', 'indeed', 'glassdoor', 'seek', 'instahyre'].includes(parts[0])) {
        company = parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
      } else {
        company = 'Target Employer';
      }
    }
  }

  if (!description) {
    const article = doc.querySelector('article, main, [role="main"], .job-description, .description');
    if (article) {
      description = article.innerText?.trim() || '';
    } else {
      const bodyText = doc.body?.innerText || '';
      description = bodyText.slice(0, 3500).trim();
    }
  }

  // Clean description of excess whitespace
  description = description.replace(/\r\n/g, '\n').replace(/[ \t]+/g, ' ').replace(/\n\s*\n/g, '\n\n').slice(0, 8000);

  // Normalize location
  if (!location) {
    if (/remote/i.test(title) || /remote/i.test(description.slice(0, 400))) {
      location = 'Remote';
    } else {
      location = 'Unspecified';
    }
  }

  // Defensive Sanitization (OWASP A03 / Anti-XSS)
  const sanitizeField = (s) => String(s || '').replace(/<[^>]+>/g, '').replace(/[\r\n\t]+/g, ' ').trim();
  const safeJobUrl = (u) => {
    const trimmed = String(u || '').trim();
    if (/^(javascript|data|vbscript):/i.test(trimmed)) return '#';
    return trimmed;
  };

  return {
    id: `grabbed_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    title: sanitizeField(title).slice(0, 120),
    company: sanitizeField(company).slice(0, 80),
    location: sanitizeField(location).slice(0, 100),
    salary: sanitizeField(salary) || 'Unlisted',
    description: sanitizeField(description) || 'No job description captured.',
    url: safeJobUrl(url),
    portal: sanitizeField(hostname) || 'Direct Career Site',
    source: 'SPrav Universal Job Grabber',
    posted_at: new Date().toISOString(),
    status: 'new',
    is_remote: /remote/i.test(location) || /remote/i.test(title)
  };
}

/**
 * Builds the executable javascript: bookmarklet string.
 * When clicked in the browser bar, executes extraction, shows on-screen HUD,
 * and sends the job payload to SPrav via BroadcastChannel and localStorage.
 */
export function buildJobGrabberBookmarkletCode(spravAppUrl = 'http://localhost:5173') {
  let cleanOrigin = 'http://localhost:5173';
  try {
    const raw = String(spravAppUrl || '').trim();
    const u = new URL(raw || 'http://localhost:5173');
    if ((u.protocol === 'http:' || u.protocol === 'https:') && /^https?:\/\/[a-zA-Z0-9.-]+(?::\d+)?$/i.test(u.origin)) {
      cleanOrigin = u.origin;
    }
  } catch (_) {
    cleanOrigin = 'http://localhost:5173';
  }

  const code = `
javascript:(function(){
  try {
    ${extractJobFromDom.toString()}
    var job = extractJobFromDom(document, window);
    
    // 1. Send via BroadcastChannel if SPrav is open in another tab
    try {
      if (typeof BroadcastChannel !== 'undefined') {
        var bc = new BroadcastChannel('sprav_job_sync');
        bc.postMessage({ type: 'SPRAV_IMPORT_JOB', job: job, timestamp: Date.now() });
        setTimeout(function(){ bc.close(); }, 3000);
      }
    } catch(e){}

    // 2. Prepare Direct Launch URL with payload (JSON.stringify guarantees zero string injection)
    var cleanOrigin = ${JSON.stringify(cleanOrigin)};
    var baseUrl = ${JSON.stringify(cleanOrigin + '/#portal?import=')};
    var payloadBase64 = '';
    try {
      payloadBase64 = encodeURIComponent(btoa(unescape(encodeURIComponent(JSON.stringify(job)))));
    } catch(e){}
    var launchUrl = baseUrl + payloadBase64;

    // 3. Inject Floating HUD overlay with Shadow DOM isolation (OWASP A03 / DOM Clobbering Defense)
    var oldHud = document.getElementById('sprav-grabber-hud');
    if (oldHud && typeof oldHud.remove === 'function') oldHud.remove();

    var hud = document.createElement('div');
    hud.id = 'sprav-grabber-hud';
    hud.style.cssText = 'position:fixed;top:20px;right:20px;z-index:2147483647;pointer-events:auto;';

    // Use Shadow DOM if supported to isolate styles and prevent host DOM clobbering
    var root = hud.attachShadow ? hud.attachShadow({ mode: 'open' }) : hud;

    var container = document.createElement('div');
    container.style.cssText = 'width:340px;padding:16px;background:#0f172a;color:#ffffff;border:1px solid #10b981;border-radius:14px;box-shadow:0 20px 40px rgba(0,0,0,0.6);font-family:system-ui,-apple-system,sans-serif;font-size:13px;line-height:1.4;box-sizing:border-box;';

    var headerRow = document.createElement('div');
    headerRow.style.cssText = 'display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;';

    var badgeGroup = document.createElement('div');
    badgeGroup.style.cssText = 'display:flex;align-items:center;gap:6px;';
    var badge = document.createElement('span');
    badge.style.cssText = 'background:#10b981;color:#fff;font-size:10px;font-weight:800;padding:2px 6px;border-radius:4px;text-transform:uppercase;';
    badge.textContent = 'SPrav AI';
    var badgeText = document.createElement('span');
    badgeText.style.cssText = 'font-weight:700;color:#34d399;';
    badgeText.textContent = 'Job Captured!';
    badgeGroup.appendChild(badge);
    badgeGroup.appendChild(badgeText);

    var closeBtn = document.createElement('button');
    closeBtn.id = 'sprav-hud-close';
    closeBtn.style.cssText = 'background:none;border:none;color:#94a3b8;cursor:pointer;font-size:18px;line-height:1;padding:0 4px;';
    closeBtn.innerHTML = '&times;';
    closeBtn.onclick = function(){ hud.remove(); };

    headerRow.appendChild(badgeGroup);
    headerRow.appendChild(closeBtn);
    container.appendChild(headerRow);

    var titleEl = document.createElement('div');
    titleEl.id = 'sprav-hud-title';
    titleEl.style.cssText = 'font-weight:700;font-size:14px;color:#f8fafc;margin-bottom:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;';
    titleEl.textContent = job.title || 'Job';
    titleEl.title = job.title || 'Job';
    container.appendChild(titleEl);

    var metaEl = document.createElement('div');
    metaEl.id = 'sprav-hud-meta';
    metaEl.style.cssText = 'color:#38bdf8;font-weight:600;margin-bottom:6px;font-size:12px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;';
    metaEl.textContent = (job.company || 'Company') + ' \\u2022 ' + (job.location || 'Location');
    container.appendChild(metaEl);

    var salaryEl = document.createElement('div');
    salaryEl.id = 'sprav-hud-salary';
    salaryEl.style.cssText = 'color:#fbbf24;font-size:12px;margin-bottom:8px;display:none;';
    if (job.salary && job.salary !== 'Unlisted') {
      salaryEl.textContent = '\\uD83D\\uDCB0 ' + job.salary;
      salaryEl.style.display = 'block';
    }
    container.appendChild(salaryEl);

    var btnRow = document.createElement('div');
    btnRow.style.cssText = 'display:flex;gap:8px;margin-top:10px;';

    var launchLink = document.createElement('a');
    launchLink.id = 'sprav-hud-launch';
    launchLink.target = '_blank';
    launchLink.rel = 'noopener noreferrer';
    launchLink.style.cssText = 'flex:1;text-align:center;background:#10b981;color:#ffffff;text-decoration:none;font-weight:700;padding:8px 12px;border-radius:8px;font-size:12px;cursor:pointer;';
    launchLink.textContent = 'Open in SPrav \\u2192';
    launchLink.href = /^https?:\\/\\//i.test(launchUrl) ? launchUrl : '#';

    var copyBtn = document.createElement('button');
    copyBtn.id = 'sprav-hud-copy';
    copyBtn.style.cssText = 'background:#1e293b;border:1px solid #334155;color:#e2e8f0;padding:8px 10px;border-radius:8px;cursor:pointer;font-size:12px;';
    copyBtn.textContent = 'Copy JSON';
    copyBtn.onclick = function(){
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(JSON.stringify(job, null, 2)).then(function(){
          copyBtn.textContent = 'Copied!';
          setTimeout(function(){ copyBtn.textContent = 'Copy JSON'; }, 2000);
        });
      }
    };

    btnRow.appendChild(launchLink);
    btnRow.appendChild(copyBtn);
    container.appendChild(btnRow);

    root.appendChild(container);
    document.body.appendChild(hud);

    setTimeout(function(){ if (hud && hud.parentNode) hud.remove(); }, 12000);
  } catch(err) {
    alert('SPrav Job Grabber Error: ' + err.message);
  }
})();
  `.trim().replace(/\n\s*/g, '');

  return code;
}

export const generateJobGrabberBookmarklet = buildJobGrabberBookmarkletCode;
