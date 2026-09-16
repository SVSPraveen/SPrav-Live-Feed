# SPrav Live Feed — Autonomous Sovereign Job Stream CDN 🌐⚡

[![Sovereign Feed Sync](https://github.com/SVSPraveen/SPrav-Live-Feed/actions/workflows/sprav_daily_jobs_sync.yml/badge.svg)](https://github.com/SVSPraveen/SPrav-Live-Feed/actions/workflows/sprav_daily_jobs_sync.yml)
[![Live Dashboard](https://img.shields.io/badge/Status_Dashboard-Live-10b981.svg)](https://svspraveen.github.io/SPrav-Live-Feed/)
[![Free Hosting](https://img.shields.io/badge/Server_Cost-$0.00-blue.svg)](https://svspraveen.github.io/SPrav-Live-Feed/)
[![Active Roles](https://img.shields.io/badge/Active_Roles-13,000+-8b5cf6.svg)](https://svspraveen.github.io/SPrav-Live-Feed/mirror_manifest.json)

Automated, high-frequency, direct ATS job feed aggregation engine powering **SPrav Job AI**.
Built on a zero-server economics model operating 100% on free GitHub Actions cloud runners and distributed over GitHub Pages global CDN.

---

## 🚀 Live CDN Endpoints

| Resource | URL | Format / Size | Description |
| :--- | :--- | :--- | :--- |
| **Live Status Dashboard** | [svspraveen.github.io/SPrav-Live-Feed](https://svspraveen.github.io/SPrav-Live-Feed/) | Interactive HTML | Real-time visual metrics, sync status & source telemetry |
| **Mirror Manifest** | [`mirror_manifest.json`](https://svspraveen.github.io/SPrav-Live-Feed/mirror_manifest.json) | JSON (~400 B) | Aggregation timestamps, total counts & source breakdown |
| **Compressed Binary Feed** | [`latest-tech-jobs.json.gz`](https://svspraveen.github.io/SPrav-Live-Feed/latest-tech-jobs.json.gz) | Gzip (~1.15 MB) | Full compressed stream of 13,000+ verified active tech jobs |
| **Standard Feed** | [`latest.json.gz`](https://svspraveen.github.io/SPrav-Live-Feed/latest.json.gz) | Gzip (~1.15 MB) | Canonical mirror stream alias |

---

## 📊 Ingestion Architecture (V3 Universe)

The aggregation pipeline queries zero-auth, public endpoints every **8 hours** (`0 */8 * * *`):

1. **159 Direct ATS Boards**: Queries live endpoints for Ashby, Greenhouse, Lever, and SmartRecruiters (OpenAI, Anthropic, Stripe, Datadog, Figma, Cloudflare, Retool, Canva, Reddit, etc.).
2. **GitHub Community Feeds**: Integrates verified bot feeds from `SimplifyJobs/New-Grad-Positions` and `Summer2025-Internships`.
3. **Open Global Tech APIs**: Ingests remote and visa-sponsored developer roles from Arbeitnow and Remotive.
4. **Deduplication Engine**: Normalizes roles by company, standardized title, and application link.

---

## ⚡ Client-Side Zero-VRAM Consumption

The client application (`SPrav Job AI`) consumes this feed using native browser streams:
```javascript
import { fetchDailyMirrorJobs } from './utils/github_job_streamer.js';

// Downloads 1.15 MB in ~350ms, decompresses in browser memory, consumes 0 VRAM
const jobs = await fetchDailyMirrorJobs();
console.log(`Loaded ${jobs.length} verified jobs!`);
```

---

## 🛡️ License

MIT © [SVS Praveen](https://github.com/SVSPraveen)
