import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { extractJobFromDom, buildJobGrabberBookmarkletCode } from './job_grabber_bookmarklet.js';

describe('job_grabber_bookmarklet', () => {
  it('extracts job details accurately from Schema.org JSON-LD markup', () => {
    const mockJsonLd = {
      '@type': 'JobPosting',
      title: 'Senior Software Engineer, Platform',
      hiringOrganization: { name: 'Razorpay' },
      description: '<p>Build core payment gateway infrastructure handling 10k TPS.</p>',
      jobLocation: {
        address: {
          addressLocality: 'Bengaluru',
          addressRegion: 'Karnataka',
          addressCountry: 'India'
        }
      },
      baseSalary: {
        currency: 'INR',
        value: { minValue: 2800000, maxValue: 4200000 }
      }
    };

    const mockDoc = {
      querySelectorAll: (sel) => {
        if (sel === 'script[type="application/ld+json"]') {
          return [{ textContent: JSON.stringify(mockJsonLd) }];
        }
        return [];
      },
      querySelector: () => null,
      title: 'Senior Software Engineer, Platform - Razorpay Careers'
    };

    const mockWin = {
      location: {
        href: 'https://razorpay.com/careers/jobs/12345',
        hostname: 'razorpay.com'
      }
    };

    const job = extractJobFromDom(mockDoc, mockWin);
    assert.equal(job.title, 'Senior Software Engineer, Platform');
    assert.equal(job.company, 'Razorpay');
    assert.equal(job.location, 'Bengaluru, Karnataka, India');
    assert.ok(job.salary.includes('2,800,000'));
    assert.ok(job.description.includes('core payment gateway infrastructure'));
    assert.equal(job.portal, 'razorpay.com');
  });

  it('extracts job details accurately from Naukri domestic selectors', () => {
    const mockDoc = {
      querySelectorAll: () => [],
      querySelector: (sel) => {
        if (sel.includes('styles_jd-header-title')) {
          return { innerText: 'Backend Developer (Python / Django)' };
        }
        if (sel.includes('styles_jd-header-comp-name')) {
          return { innerText: 'Swiggy' };
        }
        if (sel.includes('styles_jdn-header-loc')) {
          return { innerText: 'Bengaluru / Bangalore (Hybrid)' };
        }
        if (sel.includes('styles_jdn-header-sal')) {
          return { innerText: '18-25 Lacs P.A.' };
        }
        if (sel.includes('styles_JDJobs-rec-section')) {
          return { innerText: 'Looking for 2-4 years experience in Python, Django, PostgreSQL and Redis.' };
        }
        return null;
      },
      title: 'Backend Developer - Swiggy Jobs'
    };

    const mockWin = {
      location: {
        href: 'https://www.naukri.com/job-listings-backend-developer-swiggy-bengaluru-bangalore-2-to-4-years-123456',
        hostname: 'www.naukri.com'
      }
    };

    const job = extractJobFromDom(mockDoc, mockWin);
    assert.equal(job.title, 'Backend Developer (Python / Django)');
    assert.equal(job.company, 'Swiggy');
    assert.equal(job.location, 'Bengaluru / Bangalore (Hybrid)');
    assert.equal(job.salary, '18-25 Lacs P.A.');
    assert.ok(job.description.includes('Python, Django, PostgreSQL'));
    assert.equal(job.portal, 'www.naukri.com');
  });

  it('extracts job details accurately from LinkedIn selectors', () => {
    const mockDoc = {
      querySelectorAll: () => [],
      querySelector: (sel) => {
        if (sel.includes('job-details-jobs-unified-top-card__job-title')) {
          return { innerText: 'Staff Systems Architect' };
        }
        if (sel.includes('job-details-jobs-unified-top-card__company-name')) {
          return { innerText: 'Atlassian' };
        }
        if (sel.includes('job-details-jobs-unified-top-card__bullet')) {
          return { innerText: 'Bengaluru, Karnataka, India (Remote)' };
        }
        if (sel.includes('#job-details')) {
          return { innerText: 'Lead high-scale distributed Jira and Confluence cloud services.' };
        }
        return null;
      },
      title: 'Atlassian hiring Staff Systems Architect in Bengaluru | LinkedIn'
    };

    const mockWin = {
      location: {
        href: 'https://www.linkedin.com/jobs/view/9876543210/',
        hostname: 'www.linkedin.com'
      }
    };

    const job = extractJobFromDom(mockDoc, mockWin);
    assert.equal(job.title, 'Staff Systems Architect');
    assert.equal(job.company, 'Atlassian');
    assert.ok(job.location.includes('Bengaluru'));
    assert.ok(job.is_remote);
    assert.ok(job.description.includes('distributed Jira and Confluence'));
  });

  it('builds executable javascript: bookmarklet string without syntax errors', () => {
    const code = buildJobGrabberBookmarkletCode('http://localhost:5173');
    assert.ok(code.startsWith('javascript:'));
    assert.ok(code.includes('extractJobFromDom'));
    assert.ok(code.includes('sprav_job_sync'));
    assert.ok(code.includes('sprav-grabber-hud'));
  });

  it('neutralizes XSS payloads and malicious app URLs', () => {
    const maliciousUrl = 'javascript:alert(1)';
    const code = buildJobGrabberBookmarkletCode(maliciousUrl);
    assert.ok(code.startsWith('javascript:'));
    // Malicious URL falls back to default safe origin
    assert.ok(code.includes('http://localhost:5173'));
    assert.ok(!code.includes('javascript:alert(1)/#portal'));
    // DOM bindings use textContent to neutralize <img onerror=alert(1)>
    assert.ok(code.includes('titleEl.textContent = job.title'));
    assert.ok(code.includes('metaEl.textContent ='));
    assert.ok(code.includes('salaryEl.textContent ='));
  });

  it('prevents user-controlled string breakout via quotes and JSON.stringify serialization', () => {
    const quoteBreakout = 'https://app.sprav.ai/path"\';alert(document.domain)//';
    const code = buildJobGrabberBookmarkletCode(quoteBreakout);
    assert.ok(code.startsWith('javascript:'));
    // Origin parser normalizes or falls back, and JSON.stringify prevents any code breakout
    assert.ok(!code.includes('alert(document.domain)'));
    assert.ok(code.includes('var cleanOrigin = "https://app.sprav.ai"'));
  });

  it('isolates floating HUD with Shadow DOM and programmatic element creation to prevent DOM clobbering', () => {
    const code = buildJobGrabberBookmarkletCode('https://sprav-jobai.vercel.app');
    assert.ok(code.includes('attachShadow'));
    assert.ok(code.includes('container.appendChild(titleEl)'));
    assert.ok(code.includes('root.appendChild(container)'));
    // Does not use dangerous innerHTML with dynamic unescaped text
    assert.ok(!code.includes('hud.innerHTML = html'));
  });
});
