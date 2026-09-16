# SPrav Live Feed — Autonomous Sovereign Job Aggregator

**100% Free Daily Aggregated Direct ATS Job Feed**  
Powered by GitHub Actions & GitHub Pages ($0.00 / month server cost).

## Overview
This repository automatically queries verified first-party ATS job boards (Greenhouse, Ashby, Lever) once every 24 hours at 00:00 UTC, normalizes them into the standard SPrav schema, and publishes compressed feeds with open CORS (`Access-Control-Allow-Origin: *`).

## Live Feeds (Open CORS)
- **Latest Gzipped Feed**: `https://svspraveen.github.io/SPrav-Live-Feed/latest.json.gz`
- **Latest Gzipped Alternate**: `https://svspraveen.github.io/SPrav-Live-Feed/latest-tech-jobs.json.gz`
- **Feed Manifest & Stats**: `https://svspraveen.github.io/SPrav-Live-Feed/mirror_manifest.json`

## Update Schedule
Runs automatically via GitHub Actions cron: `0 0 * * *` (Daily at 00:00 UTC).
Manual triggers supported via `workflow_dispatch` in the Actions tab.
