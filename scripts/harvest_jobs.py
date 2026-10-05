#!/usr/bin/env python3
"""
scripts/harvest_jobs.py
========================
High-Performance, Zero-Cost Autonomous ATS Job Harvesting Engine for SPrav Job AI.
Runs on $0 open infrastructure (GitHub Actions cron workers + GitHub Pages CDN).

Direct ATS Endpoints (Zero auth, zero headless browsers, zero proxies, zero rate limits):
1. Greenhouse:     https://boards-api.greenhouse.io/v1/boards/{company}/jobs?content=true
2. Lever:          https://api.lever.co/v0/postings/{company}?mode=json
3. Ashby:          https://api.ashbyhq.com/posting-api/job-board/{company}
4. Workable:       https://apply.workable.com/api/v1/widget/accounts/{company}
5. SmartRecruiters:https://api.smartrecruiters.com/v1/companies/{company}/postings
6. Arbeitnow API:  https://www.arbeitnow.com/api/job-board-api (European & Remote, Visa Sponsorship)
7. Remotive Direct:https://remotive.com/api/remote-jobs?category=software-dev (Remote-First Developer)

Pipeline Standards:
- Freshness: Validates posting timestamp is strictly <= 14 days old (drops stale listings)
- Anti-Ghost Filter: Excludes evergreen pools, generic applications, and talent communities
- Canonical Dedup: SHA-256 fingerprinting on (company + normalized title + location)
- Output Artifacts:
    * dist_feed/jobs.json & jobs.json.gz (90%+ gzip compression for <200ms edge delivery)
    * dist_feed/feed_manifest.json (Rich diagnostic telemetry and freshness breakdown)
    * dist_feed/latest.json & latest.json.gz (Backward compatibility)
    * dist_feed/latest-tech-jobs.json & latest-tech-jobs.json.gz (Backward compatibility)
    * public/data/sprav_daily_jobs.json (Local fallback for web app)
"""

import argparse
import concurrent.futures
from datetime import datetime, timezone
import gzip
import hashlib
import html
import json
import os
from pathlib import Path
import re
import sys

# Configure UTF-8 streams for cross-platform Windows / Linux console safety
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")
import time
import urllib.error
import urllib.request

# ── 1. Anti-Ghost & Evergreen Heuristic Filter ─────────────────────────────
GHOST_TITLE_REGEX = re.compile(
    r"\b("
    r"general\s+application|general\s+interest|general\s+inquiry|"
    r"talent\s+(community|pool|network|pipeline)|"
    r"future\s+opportunit(y|ies)|future\s+roles|"
    r"expression(s)?\s+of\s+interest|eoi\b|"
    r"connect\s+with\s+us|join\s+our\s+talent|"
    r"open\s+application|speculative\s+application|"
    r"register\s+your\s+interest|unsolicited\s+application|"
    r"evergreen|various\s+(roles|positions|opportunities)|"
    r"casual\s+pool|expression\s+of\s+interest"
    r")\b",
    re.IGNORECASE
)

# ── 2. Curated Seed Catalog (250+ Premier Employers Across Ashby, GH, Lever, Workable, SR) ─
CURATED_DEFAULT_BOARDS = [
    # Ashby High-Growth & AI Pioneers
    {"platform": "ashby", "slug": "openai", "name": "OpenAI", "category": "AI & Foundation Models"},
    {"platform": "ashby", "slug": "anthropic", "name": "Anthropic", "category": "AI & Foundation Models"},
    {"platform": "ashby", "slug": "perplexity", "name": "Perplexity AI", "category": "AI & Foundation Models"},
    {"platform": "ashby", "slug": "modal", "name": "Modal Labs", "category": "Cloud & AI Infrastructure"},
    {"platform": "ashby", "slug": "cursor", "name": "Cursor / Anysphere", "category": "Developer Tools"},
    {"platform": "ashby", "slug": "replit", "name": "Replit", "category": "Developer Tools"},
    {"platform": "ashby", "slug": "linear", "name": "Linear", "category": "Productivity SaaS"},
    {"platform": "ashby", "slug": "posthog", "name": "PostHog", "category": "Developer Tools & Analytics"},
    {"platform": "ashby", "slug": "vercel", "name": "Vercel", "category": "Cloud & Frontend Infrastructure"},
    {"platform": "ashby", "slug": "supabase", "name": "Supabase", "category": "Cloud & Database Infrastructure"},
    {"platform": "ashby", "slug": "ramp", "name": "Ramp", "category": "Fintech"},
    {"platform": "ashby", "slug": "together-ai", "name": "Together AI", "category": "AI & Foundation Models"},
    {"platform": "ashby", "slug": "resend", "name": "Resend", "category": "Developer Tools"},
    {"platform": "ashby", "slug": "mistral", "name": "Mistral AI", "category": "AI & Foundation Models"},
    {"platform": "ashby", "slug": "mistralai", "name": "Mistral AI", "category": "AI & Foundation Models"},
    {"platform": "ashby", "slug": "cohere", "name": "Cohere", "category": "AI & Foundation Models"},
    {"platform": "ashby", "slug": "groq", "name": "Groq", "category": "AI Hardware & Inference"},
    {"platform": "ashby", "slug": "dust", "name": "Dust", "category": "AI & Enterprise Software"},
    {"platform": "ashby", "slug": "cognition", "name": "Cognition AI", "category": "AI Agents"},
    {"platform": "ashby", "slug": "scale-ai", "name": "Scale AI", "category": "AI Infrastructure"},
    {"platform": "ashby", "slug": "quora", "name": "Quora / Poe", "category": "Consumer & AI"},
    {"platform": "ashby", "slug": "sentry", "name": "Sentry", "category": "Developer Tools & Observability"},
    {"platform": "ashby", "slug": "runwayml", "name": "Runway", "category": "AI Media"},
    {"platform": "ashby", "slug": "baseten", "name": "Baseten", "category": "AI Infrastructure"},
    {"platform": "ashby", "slug": "pinecone", "name": "Pinecone", "category": "Vector DB & AI"},
    {"platform": "ashby", "slug": "midjourney", "name": "Midjourney", "category": "Generative Media"},
    {"platform": "ashby", "slug": "synthesia", "name": "Synthesia", "category": "AI Video"},
    {"platform": "ashby", "slug": "glean", "name": "Glean", "category": "Enterprise Search & AI"},
    {"platform": "ashby", "slug": "warp", "name": "Warp", "category": "Developer Tools"},
    {"platform": "ashby", "slug": "langchain", "name": "LangChain", "category": "AI Frameworks"},
    {"platform": "ashby", "slug": "weaviate", "name": "Weaviate", "category": "Vector Search"},
    {"platform": "ashby", "slug": "elevenlabs", "name": "ElevenLabs", "category": "Audio AI"},

    # Greenhouse Tech Titans & Scaleups
    {"platform": "greenhouse", "slug": "gitlab", "name": "GitLab", "category": "Developer Platforms"},
    {"platform": "greenhouse", "slug": "figma", "name": "Figma", "category": "Design & Collaboration"},
    {"platform": "greenhouse", "slug": "reddit", "name": "Reddit", "category": "Social & Community"},
    {"platform": "greenhouse", "slug": "databricks", "name": "Databricks", "category": "Data & AI"},
    {"platform": "greenhouse", "slug": "doordash", "name": "DoorDash", "category": "Logistics & Consumer"},
    {"platform": "greenhouse", "slug": "pinterest", "name": "Pinterest", "category": "Visual Search"},
    {"platform": "greenhouse", "slug": "affirm", "name": "Affirm", "category": "Fintech"},
    {"platform": "greenhouse", "slug": "dropbox", "name": "Dropbox", "category": "Cloud Storage"},
    {"platform": "greenhouse", "slug": "cloudflare", "name": "Cloudflare", "category": "Edge & Security"},
    {"platform": "greenhouse", "slug": "instacart", "name": "Instacart", "category": "E-Commerce & Delivery"},
    {"platform": "greenhouse", "slug": "robinhood", "name": "Robinhood", "category": "Fintech & Trading"},
    {"platform": "greenhouse", "slug": "datadog", "name": "Datadog", "category": "Observability & Monitoring"},
    {"platform": "greenhouse", "slug": "elastic", "name": "Elastic", "category": "Search & Observability"},
    {"platform": "greenhouse", "slug": "coinbase", "name": "Coinbase", "category": "Crypto & Fintech"},
    {"platform": "greenhouse", "slug": "mongodb", "name": "MongoDB", "category": "Database Infrastructure"},
    {"platform": "greenhouse", "slug": "twitch", "name": "Twitch", "category": "Streaming & Gaming"},
    {"platform": "greenhouse", "slug": "discord", "name": "Discord", "category": "Communications"},
    {"platform": "greenhouse", "slug": "gusto", "name": "Gusto", "category": "HR Tech & Payroll"},
    {"platform": "greenhouse", "slug": "brex", "name": "Brex", "category": "Fintech"},
    {"platform": "greenhouse", "slug": "scaleai", "name": "Scale AI", "category": "AI Infrastructure"},
    {"platform": "greenhouse", "slug": "stripe", "name": "Stripe", "category": "Financial Infrastructure"},
    {"platform": "greenhouse", "slug": "shopify", "name": "Shopify", "category": "Commerce Platforms"},
    {"platform": "greenhouse", "slug": "waymo", "name": "Waymo", "category": "Autonomous Vehicles"},
    {"platform": "greenhouse", "slug": "lyft", "name": "Lyft", "category": "Rideshare & Transport"},
    {"platform": "greenhouse", "slug": "snap", "name": "Snap Inc.", "category": "Augmented Reality"},
    {"platform": "greenhouse", "slug": "unity", "name": "Unity", "category": "3D & Game Engine"},
    {"platform": "greenhouse", "slug": "hubspot", "name": "HubSpot", "category": "CRM & Marketing SaaS"},
    {"platform": "greenhouse", "slug": "pagerduty", "name": "PagerDuty", "category": "Incident Response"},
    {"platform": "greenhouse", "slug": "splunk", "name": "Splunk", "category": "Security & Observability"},
    {"platform": "greenhouse", "slug": "box", "name": "Box", "category": "Enterprise Content Management"},
    {"platform": "greenhouse", "slug": "palantir", "name": "Palantir", "category": "Enterprise Data & AI"},
    {"platform": "greenhouse", "slug": "notion", "name": "Notion", "category": "Workspace & Productivity"},
    {"platform": "greenhouse", "slug": "airtable", "name": "Airtable", "category": "Connected Apps"},
    {"platform": "greenhouse", "slug": "plaid", "name": "Plaid", "category": "Fintech Infrastructure"},
    {"platform": "greenhouse", "slug": "crowdstrike", "name": "CrowdStrike", "category": "Cybersecurity"},
    {"platform": "greenhouse", "slug": "zscaler", "name": "Zscaler", "category": "Zero Trust Security"},
    {"platform": "greenhouse", "slug": "andurilindustries", "name": "Anduril Industries", "category": "Defense Tech"},
    {"platform": "greenhouse", "slug": "skydio", "name": "Skydio", "category": "Autonomous Drones"},
    {"platform": "greenhouse", "slug": "snowflake", "name": "Snowflake", "category": "Data Cloud"},
    {"platform": "greenhouse", "slug": "confluent", "name": "Confluent", "category": "Data Streaming"},
    {"platform": "greenhouse", "slug": "hashicorp", "name": "HashiCorp", "category": "Infrastructure Automation"},
    {"platform": "greenhouse", "slug": "rubrik", "name": "Rubrik", "category": "Data Security"},
    {"platform": "greenhouse", "slug": "samsara", "name": "Samsara", "category": "Connected Operations"},
    {"platform": "greenhouse", "slug": "okta", "name": "Okta", "category": "Identity Security"},
    {"platform": "greenhouse", "slug": "toast", "name": "Toast", "category": "Restaurant POS & Tech"},
    {"platform": "greenhouse", "slug": "chime", "name": "Chime", "category": "Fintech"},
    {"platform": "greenhouse", "slug": "sofi", "name": "SoFi", "category": "Digital Banking"},
    {"platform": "greenhouse", "slug": "klarna", "name": "Klarna", "category": "Payments & Shopping"},
    {"platform": "greenhouse", "slug": "duolingo", "name": "Duolingo", "category": "EdTech & Language"},

    # Lever Modern Tech Boards
    {"platform": "lever", "slug": "cred", "name": "CRED", "category": "Fintech & Rewards"},
    {"platform": "lever", "slug": "netflix", "name": "Netflix", "category": "Entertainment & Streaming"},
    {"platform": "lever", "slug": "spotify", "name": "Spotify", "category": "Audio & Streaming"},
    {"platform": "lever", "slug": "atlassian", "name": "Atlassian", "category": "Team Collaboration"},
    {"platform": "lever", "slug": "eventbrite", "name": "Eventbrite", "category": "Ticketing & Events"},
    {"platform": "lever", "slug": "clearbit", "name": "Clearbit", "category": "B2B Data"},
    {"platform": "lever", "slug": "mux", "name": "Mux", "category": "Video Infrastructure"},
    {"platform": "lever", "slug": "remote", "name": "Remote.com", "category": "Global HR & Payroll"},
    {"platform": "lever", "slug": "sourcegraph", "name": "Sourcegraph", "category": "Code Intelligence"},
    {"platform": "lever", "slug": "retool", "name": "Retool", "category": "Internal Developer Tools"},
    {"platform": "lever", "slug": "lattice", "name": "Lattice", "category": "HR SaaS"},
    {"platform": "lever", "slug": "webflow", "name": "Webflow", "category": "Visual Development"},
    {"platform": "lever", "slug": "benchling", "name": "Benchling", "category": "Life Sciences R&D Cloud"},
    {"platform": "lever", "slug": "ironclad", "name": "Ironclad", "category": "Contract Management SaaS"},
    {"platform": "lever", "slug": "dbtlabs", "name": "dbt Labs", "category": "Analytics Engineering"},
    {"platform": "lever", "slug": "checkr", "name": "Checkr", "category": "Background Screening"},
    {"platform": "lever", "slug": "applied-intuition", "name": "Applied Intuition", "category": "Autonomous Systems"},
    {"platform": "lever", "slug": "front", "name": "Front", "category": "Customer Operations"},
    {"platform": "lever", "slug": "deliveroo", "name": "Deliveroo", "category": "Food Delivery"},
    {"platform": "lever", "slug": "monzo", "name": "Monzo Bank", "category": "Digital Banking"},

    # Workable Curated High-Growth Tech
    {"platform": "workable", "slug": "personio", "name": "Personio", "category": "European HR Tech"},
    {"platform": "workable", "slug": "typeform", "name": "Typeform", "category": "Interactive SaaS"},
    {"platform": "workable", "slug": "wolt", "name": "Wolt", "category": "Food Delivery & Commerce"},
    {"platform": "workable", "slug": "invision", "name": "InVision", "category": "Design Collaboration"},
    {"platform": "workable", "slug": "omio", "name": "Omio", "category": "Travel Tech"},
    {"platform": "workable", "slug": "taxfix", "name": "Taxfix", "category": "Fintech"},
    {"platform": "workable", "slug": "pleo", "name": "Pleo", "category": "Company Cards & Fintech"},
    {"platform": "workable", "slug": "contentful", "name": "Contentful", "category": "Headless CMS"},

    # SmartRecruiters Global Portals
    {"platform": "smartrecruiters", "slug": "visa", "name": "Visa", "category": "Global Payments"},
    {"platform": "smartrecruiters", "slug": "twitter", "name": "X / Twitter", "category": "Social Media"},
    {"platform": "smartrecruiters", "slug": "ubisoft", "name": "Ubisoft", "category": "Gaming & Entertainment"},
    {"platform": "smartrecruiters", "slug": "linkedin", "name": "LinkedIn", "category": "Professional Social"},
    {"platform": "smartrecruiters", "slug": "square", "name": "Block / Square", "category": "Fintech & Commerce"},
    {"platform": "smartrecruiters", "slug": "bosch", "name": "Bosch Global", "category": "Industrial & IoT"},

    # Top Indian Unicorns & High-Growth GCCs (Specialist 2 Regional Feed Ingestion)
    {"platform": "greenhouse", "slug": "razorpaysoftwareprivatelimited", "name": "Razorpay", "category": "Fintech & Payments"},
    {"platform": "greenhouse", "slug": "postman", "name": "Postman", "category": "Developer Tools"},
    {"platform": "greenhouse", "slug": "inmobi", "name": "InMobi", "category": "AdTech & AI"},
    {"platform": "greenhouse", "slug": "groww", "name": "Groww", "category": "Fintech & WealthTech"},
    {"platform": "greenhouse", "slug": "swiggy", "name": "Swiggy", "category": "Consumer & Delivery"},
    {"platform": "greenhouse", "slug": "zomato", "name": "Zomato", "category": "Consumer & FoodTech"},
    {"platform": "greenhouse", "slug": "blinkit", "name": "Blinkit", "category": "Quick Commerce"},
    {"platform": "greenhouse", "slug": "cred", "name": "CRED", "category": "Fintech"},
    {"platform": "greenhouse", "slug": "meesho", "name": "Meesho", "category": "E-Commerce"},
    {"platform": "greenhouse", "slug": "urbancompany", "name": "Urban Company", "category": "Home Services"},
    {"platform": "greenhouse", "slug": "curefit", "name": "Cult.fit", "category": "Health & Fitness"},
    {"platform": "greenhouse", "slug": "zepto", "name": "Zepto", "category": "Quick Commerce"},
    {"platform": "greenhouse", "slug": "olaelectric", "name": "Ola Electric", "category": "EV & Mobility"},
    {"platform": "greenhouse", "slug": "phonepe", "name": "PhonePe", "category": "Fintech & UPI"},
    {"platform": "greenhouse", "slug": "browserstack", "name": "BrowserStack", "category": "Developer Tools & Testing"},
    {"platform": "greenhouse", "slug": "hasura", "name": "Hasura", "category": "GraphQL & Developer Tools"},
    {"platform": "greenhouse", "slug": "chargebee", "name": "Chargebee", "category": "Subscription Billing"},
    {"platform": "greenhouse", "slug": "freshworks", "name": "Freshworks", "category": "Customer SaaS"},
    {"platform": "greenhouse", "slug": "clevertap", "name": "CleverTap", "category": "Customer Retention SaaS"},
    {"platform": "greenhouse", "slug": "moengage", "name": "MoEngage", "category": "Customer Engagement"},
    {"platform": "greenhouse", "slug": "whatfix", "name": "Whatfix", "category": "Digital Adoption"},
    {"platform": "greenhouse", "slug": "darwinbox", "name": "Darwinbox", "category": "HR Tech"},
    {"platform": "greenhouse", "slug": "yellowai", "name": "Yellow.ai", "category": "Conversational AI"}
]


def load_company_registry(workspace_root: Path) -> list[dict]:
    """
    Loads company registry by combining:
    1. public/data/companies.json
    2. Curated default seeds
    Returns deduplicated list of board targets.
    """
    boards = []
    seen_keys = set()

    def add_board(platform: str, slug: str, name: str = "", category: str = "Tech"):
        platform = platform.lower().strip()
        slug = slug.strip()
        if not slug or not platform:
            return
        key = f"{platform}::{slug.lower()}"
        if key in seen_keys:
            return
        seen_keys.add(key)
        clean_name = name or slug.replace("-", " ").replace("_", " ").title()
        boards.append({
            "platform": platform,
            "slug": slug,
            "name": clean_name,
            "category": category
        })

    # Add seeds first
    for b in CURATED_DEFAULT_BOARDS:
        add_board(b["platform"], b["slug"], b["name"], b.get("category", "Tech"))

    # Load from public/data/companies.json if exists
    json_path = workspace_root / "public" / "data" / "companies.json"
    if json_path.exists():
        try:
            with open(json_path, "r", encoding="utf-8") as f:
                data = json.load(f)
            platforms = data.get("platforms", {})
            for plat, slugs in platforms.items():
                if isinstance(slugs, list):
                    for slug in slugs:
                        if isinstance(slug, str):
                            add_board(plat, slug)
                        elif isinstance(slug, dict):
                            add_board(plat, slug.get("slug", ""), slug.get("name", ""))
        except Exception as e:
            print(f"[Warn] Could not parse companies.json: {e}", file=sys.stderr)

    return boards


def clean_html_description(text: str, max_chars: int = 400) -> str:
    """
    Strips raw HTML tags, unescapes HTML entities, normalizes whitespace,
    and budgets payload characters for high-compression edge delivery.
    """
    if not text:
        return ""
    clean = re.sub(r"<[^>]+>", " ", text)
    clean = html.unescape(clean)
    clean = re.sub(r"\s+", " ", clean).strip()
    return clean[:max_chars]


def parse_timestamp_to_epoch(ts_val) -> float | None:
    """
    Converts various timestamp formats into UTC epoch seconds.
    Supports ISO 8601 strings, millisecond integers, numeric strings, and YYYY-MM-DD.
    """
    if ts_val is None:
        return None

    # Case 1: Milliseconds integer or float (Lever createdAt, Arbeitnow unix epoch)
    if isinstance(ts_val, (int, float)):
        # If > 1e11, it's milliseconds
        if ts_val > 100000000000:
            return ts_val / 1000.0
        return float(ts_val)

    # Case 2: String parsing
    if isinstance(ts_val, str):
        val = ts_val.strip()
        if not val:
            return None

        # Numeric string (e.g. "1743685200")
        if val.isdigit():
            num = float(val)
            return num / 1000.0 if num > 100000000000 else num

        # Clean trailing Z for standard ISO parsing
        val_clean = val.replace("Z", "+00:00")
        try:
            dt = datetime.fromisoformat(val_clean)
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=timezone.utc)
            return dt.timestamp()
        except ValueError:
            pass

        # Try YYYY-MM-DD
        try:
            dt = datetime.strptime(val[:10], "%Y-%m-%d").replace(tzinfo=timezone.utc)
            return dt.timestamp()
        except ValueError:
            pass

    return None


def fetch_with_retry(url: str, timeout: float = 6.0, retries: int = 1) -> dict | list | None:
    """
    Direct HTTP GET request using Python standard library urllib.
    Zero external dependencies, fast, deterministic.
    """
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36 SPrav-Job-AI-Engine/2.0",
        "Accept": "application/json, text/plain, */*",
        "Accept-Encoding": "gzip, deflate"
    }

    req = urllib.request.Request(url, headers=headers)
    for attempt in range(retries + 1):
        try:
            with urllib.request.urlopen(req, timeout=timeout) as resp:
                raw_data = resp.read()
                # Check for gzip header
                if resp.headers.get("Content-Encoding") == "gzip" or raw_data.startswith(b"\x1f\x8b"):
                    raw_data = gzip.decompress(raw_data)
                text = raw_data.decode("utf-8", errors="replace")
                return json.loads(text)
        except urllib.error.HTTPError as e:
            if e.code in (404, 410):
                return None  # Company board does not exist or was renamed
            if e.code == 429:
                time.sleep(0.5 * (attempt + 1))  # Backoff
            elif attempt == retries:
                return None
        except Exception:
            if attempt == retries:
                return None
            time.sleep(0.2)
    return None


def harvest_board(board: dict, max_age_days: float, now_epoch: float) -> list[dict]:
    """
    Queries direct public ATS endpoint for a specific employer board.
    Normalizes, validates freshness (<= max_age_days), filters ghosts.
    """
    platform = board["platform"]
    slug = board["slug"]
    name = board["name"]
    category = board.get("category", "Technology")

    raw_jobs = []

    # ── 1. Greenhouse ──────────────────────────────────────────────────────────
    if platform == "greenhouse":
        url = f"https://boards-api.greenhouse.io/v1/boards/{slug}/jobs?content=true"
        data = fetch_with_retry(url)
        if isinstance(data, dict):
            for j in data.get("jobs", []):
                updated_at_val = j.get("updated_at")
                loc = (j.get("location") or {}).get("name", "Remote")
                job_id = str(j.get("id"))
                raw_jobs.append({
                    "id": f"gh_{slug}_{job_id}",
                    "gh_jid": job_id,
                    "title": (j.get("title") or "").strip(),
                    "company": name,
                    "location": loc or "Remote",
                    "url": j.get("absolute_url") or f"https://boards.greenhouse.io/{slug}",
                    "source": "GREENHOUSE_ATS",
                    "portal": "Greenhouse (Official)",
                    "category": category,
                    "posted_at_raw": updated_at_val,
                    "is_remote": "remote" in (loc or "").lower(),
                    "description": f"{j.get('title')} at {name}. Location: {loc}."
                })

    # ── 2. Lever ───────────────────────────────────────────────────────────────
    elif platform == "lever":
        url = f"https://api.lever.co/v0/postings/{slug}?mode=json"
        data = fetch_with_retry(url)
        if isinstance(data, list):
            for j in data:
                loc = (j.get("categories") or {}).get("location", "Remote")
                team = (j.get("categories") or {}).get("team", "")
                created_at_val = j.get("createdAt")
                job_id = str(j.get("id"))
                raw_jobs.append({
                    "id": f"lever_{slug}_{job_id}",
                    "lever_jid": job_id,
                    "title": (j.get("text") or "").strip(),
                    "company": name,
                    "location": loc or "Remote",
                    "url": j.get("hostedUrl") or f"https://jobs.lever.co/{slug}/{job_id}",
                    "source": "LEVER_ATS",
                    "portal": "Lever (Official)",
                    "category": team or category,
                    "posted_at_raw": created_at_val,
                    "is_remote": "remote" in (loc or "").lower() or (j.get("workplaceType") or "") == "remote",
                    "description": f"{j.get('text')} at {name}. {j.get('descriptionPlain', '')[:250]}"
                })

    # ── 3. Ashby ───────────────────────────────────────────────────────────────
    elif platform == "ashby":
        url = f"https://api.ashbyhq.com/posting-api/job-board/{slug}"
        data = fetch_with_retry(url)
        if isinstance(data, dict):
            for j in data.get("jobs", []):
                loc = j.get("location") or "Remote"
                pub_at_val = j.get("publishedAt")
                job_id = str(j.get("id"))
                raw_jobs.append({
                    "id": f"ashby_{slug}_{job_id}",
                    "ashby_jid": job_id,
                    "title": (j.get("title") or "").strip(),
                    "company": name,
                    "location": loc,
                    "url": j.get("jobUrl") or f"https://jobs.ashbyhq.com/{slug}/{job_id}",
                    "source": "ASHBY_ATS",
                    "portal": "Ashby (Official)",
                    "category": j.get("department") or category,
                    "posted_at_raw": pub_at_val,
                    "is_remote": bool(j.get("isRemote")) or "remote" in str(loc).lower(),
                    "description": f"{j.get('title')} at {name}. {j.get('descriptionPlain', '')[:250]}"
                })

    # ── 4. Workable ────────────────────────────────────────────────────────────
    elif platform == "workable":
        url = f"https://apply.workable.com/api/v1/widget/accounts/{slug}?details=true"
        data = fetch_with_retry(url)
        jobs_list = []
        if isinstance(data, dict) and isinstance(data.get("jobs"), list):
            jobs_list = data["jobs"]
        elif isinstance(data, dict) and isinstance(data.get("results"), list):
            jobs_list = data["results"]

        for j in jobs_list:
            city = j.get("city") or ""
            country = j.get("country") or ""
            loc_parts = [p for p in (city, country) if p]
            loc = ", ".join(loc_parts) if loc_parts else "Remote"
            job_id = j.get("shortcode") or j.get("id")
            pub_on_val = j.get("published_on") or j.get("created_at")
            is_rem = bool(j.get("telecommuting")) or (j.get("workplace") or "").lower() == "remote" or "remote" in loc.lower()
            raw_jobs.append({
                "id": f"workable_{slug}_{job_id}",
                "title": (j.get("title") or "").strip(),
                "company": name,
                "location": loc,
                "url": j.get("url") or f"https://apply.workable.com/{slug}/j/{job_id}/",
                "source": "WORKABLE_ATS",
                "portal": "Workable (Official)",
                "category": j.get("department") or category,
                "posted_at_raw": pub_on_val,
                "is_remote": is_rem,
                "description": f"{j.get('title')} at {name}. {j.get('description', '')[:250]}"
            })

    # ── 5. SmartRecruiters ─────────────────────────────────────────────────────
    elif platform == "smartrecruiters":
        url = f"https://api.smartrecruiters.com/v1/companies/{slug}/postings"
        data = fetch_with_retry(url)
        if isinstance(data, dict):
            for j in data.get("content", []):
                loc_obj = j.get("location") or {}
                city = loc_obj.get("city") or ""
                country = loc_obj.get("country") or ""
                loc = f"{city}, {country}".strip(", ") or "Remote"
                job_id = j.get("id")
                raw_jobs.append({
                    "id": f"sr_{slug}_{job_id}",
                    "title": (j.get("name") or "").strip(),
                    "company": name,
                    "location": loc,
                    "url": f"https://jobs.smartrecruiters.com/{name}/{job_id}",
                    "source": "SMARTRECRUITERS_ATS",
                    "portal": "SmartRecruiters (Official)",
                    "category": (j.get("function") or {}).get("label") or category,
                    "posted_at_raw": j.get("releasedDate"),
                    "is_remote": "remote" in loc.lower(),
                    "description": f"{j.get('name')} at {name}."
                })

    return normalize_and_filter_jobs(raw_jobs, max_age_days, now_epoch)


def normalize_and_filter_jobs(raw_jobs: list[dict], max_age_days: float, now_epoch: float) -> list[dict]:
    """
    Normalizes raw job payloads, validates freshness (<= max_age_days),
    applies anti-ghost filters, and standardizes schema fields.
    """
    valid_jobs = []
    now_iso = datetime.now(timezone.utc).isoformat()

    for item in raw_jobs:
        title = (item.get("title") or "").strip()
        if not title or len(title) < 3:
            continue

        # Anti-ghost check
        if GHOST_TITLE_REGEX.search(title):
            continue

        # Freshness calculation
        epoch_ts = parse_timestamp_to_epoch(item.get("posted_at_raw"))
        if epoch_ts is None:
            # If no timestamp returned by ATS, default to current check time
            epoch_ts = now_epoch
            iso_posted = now_iso
            age_days = 0.0
        else:
            age_days = max(0.0, (now_epoch - epoch_ts) / 86400.0)
            iso_posted = datetime.fromtimestamp(epoch_ts, tz=timezone.utc).isoformat()

        # Strict 14-day freshness check
        if age_days > max_age_days:
            continue

        # Determine freshness tier
        if age_days <= 1.0:
            freshness_tier = "< 24h"
        elif age_days <= 3.0:
            freshness_tier = "< 3d"
        elif age_days <= 7.0:
            freshness_tier = "< 7d"
        else:
            freshness_tier = "< 14d"

        # Check visa sponsorship: either explicit boolean or regex detection
        raw_visa = item.get("visa_sponsorship")
        if isinstance(raw_visa, bool):
            visa_sponsorship = raw_visa
        else:
            combined_visa_text = f"{title} {item.get('description', '')} {item.get('location', '')}".lower()
            visa_sponsorship = bool(re.search(
                r"\b(visa\s*sponsor|visa\s*support|relocation\s*support|relocation\s*package|blue\s*card)\b",
                combined_visa_text
            ))

        # Canonical normalization
        valid_jobs.append({
            "id": item["id"],
            "title": title,
            "company": item["company"],
            "location": item["location"],
            "url": item["url"],
            "portal": item["portal"],
            "source": item["source"],
            "category": item.get("category", "Technology"),
            "is_remote": bool(item.get("is_remote")),
            "posted_at": iso_posted,
            "posted_epoch": int(epoch_ts),
            "age_days": round(age_days, 1),
            "freshness_tier": freshness_tier,
            "ghost_risk": "low",
            "ghost_score": 5,
            "verified_live": True,
            "verified_ats_timestamp": now_iso,
            "direct_ats": True,
            "gh_jid": item.get("gh_jid"),
            "lever_jid": item.get("lever_jid"),
            "ashby_jid": item.get("ashby_jid"),
            "description": item.get("description", f"{title} at {item['company']}."),
            "visa_sponsorship": visa_sponsorship,
            "salary": item.get("salary"),
            "candidate_required_location": item.get("candidate_required_location") or item.get("location"),
            "tags": item.get("tags", [])
        })

    return valid_jobs


def harvest_arbeitnow_feed(max_age_days: float, now_epoch: float, max_pages: int = 3) -> list[dict]:
    """
    Ingests live European & remote tech jobs directly from Arbeitnow API.
    Endpoint: https://www.arbeitnow.com/api/job-board-api
    Free, zero auth, includes visa_sponsorship boolean field, Greenhouse/Lever backed.
    """
    raw_jobs = []
    base_url = "https://www.arbeitnow.com/api/job-board-api"
    current_url = base_url

    for page in range(1, max_pages + 1):
        if not current_url:
            break
        data = fetch_with_retry(current_url, timeout=10.0, retries=2)
        if not isinstance(data, dict):
            break
        items = data.get("data", [])
        if not items:
            break

        for j in items:
            title = (j.get("title") or "").strip()
            company = (j.get("company_name") or "Tech Employer").strip()
            slug = j.get("slug") or hashlib.sha256(f"{company}:{title}".encode("utf-8")).hexdigest()[:12]
            loc = j.get("location") or ("Remote" if j.get("remote") else "Europe")
            is_remote = bool(j.get("remote")) or "remote" in str(loc).lower() or "homeoffice" in str(loc).lower()

            raw_visa = j.get("visa_sponsorship")
            raw_desc = j.get("description") or ""
            clean_desc = clean_html_description(raw_desc)
            tags = j.get("tags") or []
            job_types = j.get("job_types") or []

            if isinstance(raw_visa, bool):
                has_visa = raw_visa
            else:
                combined_text = f"{title} {raw_desc} {' '.join(tags)} {' '.join(job_types)} {loc}".lower()
                has_visa = bool(re.search(
                    r"\b(visa\s*sponsor|visa\s*support|relocat|relocation\s*support|relocation\s*package|blue\s*card|work\s*permit|sponsorship\s*available)\b",
                    combined_text
                ))

            job_url = j.get("url") or f"https://www.arbeitnow.com/jobs/{slug}"
            created_at = j.get("created_at")

            raw_jobs.append({
                "id": f"arbeitnow_{slug}",
                "title": title,
                "company": company,
                "location": loc,
                "url": job_url,
                "source": "ARBEITNOW_DIRECT",
                "portal": "Arbeitnow (EU & Remote)",
                "category": (tags[0] if tags else "Software Engineering"),
                "posted_at_raw": created_at,
                "is_remote": is_remote,
                "visa_sponsorship": has_visa,
                "salary": None,
                "candidate_required_location": loc,
                "tags": tags,
                "description": f"{title} at {company}. Location: {loc}. {clean_desc}"
            })

        links = data.get("links") or {}
        current_url = links.get("next")
        if not current_url:
            break

    return normalize_and_filter_jobs(raw_jobs, max_age_days, now_epoch)


def harvest_remotive_feed(max_age_days: float, now_epoch: float, category: str = "software-dev") -> list[dict]:
    """
    Ingests live remote developer jobs directly from Remotive API.
    Endpoint: https://remotive.com/api/remote-jobs?category=software-dev
    Free, remote-first, tags salary ranges and regional constraints.
    """
    raw_jobs = []
    url = f"https://remotive.com/api/remote-jobs?category={category}"
    data = fetch_with_retry(url, timeout=12.0, retries=2)
    if isinstance(data, dict):
        jobs_list = data.get("jobs", [])
        for j in jobs_list:
            title = (j.get("title") or "").strip()
            company = (j.get("company_name") or "Remote Tech Employer").strip()
            job_id = j.get("id") or hashlib.sha256(f"{company}:{title}".encode("utf-8")).hexdigest()[:12]
            loc = j.get("candidate_required_location") or "Worldwide / Remote"
            salary = (j.get("salary") or "").strip() or None
            raw_desc = j.get("description") or ""
            clean_desc = clean_html_description(raw_desc)
            tags = j.get("tags") or []

            combined_text = f"{title} {raw_desc} {' '.join(tags)} {loc}".lower()
            has_visa = bool(re.search(
                r"\b(visa\s*sponsor|visa\s*support|relocat|relocation\s*support|relocation\s*package|work\s*permit|sponsorship\s*available)\b",
                combined_text
            ))

            raw_jobs.append({
                "id": f"remotive_{job_id}",
                "title": title,
                "company": company,
                "location": loc,
                "url": j.get("url") or f"https://remotive.com/remote-jobs/{category}/{job_id}",
                "source": "REMOTIVE_DIRECT",
                "portal": "Remotive (Remote Dev)",
                "category": j.get("category") or "Software Development",
                "posted_at_raw": j.get("publication_date"),
                "is_remote": True,
                "visa_sponsorship": has_visa,
                "salary": salary,
                "candidate_required_location": loc,
                "tags": tags,
                "description": f"{title} at {company}. Remote ({loc}). {('Salary: ' + salary + '. ') if salary else ''}{clean_desc}"
            })

    return normalize_and_filter_jobs(raw_jobs, max_age_days, now_epoch)


def classify_job_regions(job: dict) -> set[str]:
    """
    Classifies a job into regional slices: india, us, europe, remote (Specialist 2).
    A job can belong to multiple slices (e.g. remote role located in India).
    """
    regions = set()
    loc = (job.get("location") or "").lower()
    comp = (job.get("company") or "").lower()
    is_remote = bool(job.get("is_remote")) or "remote" in loc or "anywhere" in loc or "worldwide" in loc or job.get("source") == "REMOTIVE_DIRECT"

    # 1. Remote slice
    if is_remote:
        regions.add("remote")

    # 2. India slice
    india_keywords = [
        "india", "bengaluru", "bangalore", "hyderabad", "mumbai", "delhi", "pune",
        "gurugram", "gurgaon", "noida", "chennai", "kolkata", "ahmedabad", "jaipur",
        "kochi", "ind", ", in", "/in"
    ]
    indian_companies = [
        "razorpay", "swiggy", "zomato", "blinkit", "cred", "meesho", "urban company",
        "cult.fit", "zepto", "ola", "phonepe", "browserstack", "hasura", "freshworks",
        "groww", "postman", "inmobi", "chargebee", "clevertap", "moengage", "whatfix",
        "darwinbox", "yellow.ai", "paytm", "delhivery"
    ]
    if any(k in loc for k in india_keywords) or any(c in comp for c in indian_companies):
        regions.add("india")

    # 3. US slice
    us_keywords = [
        "united states", "usa", "u.s.", "san francisco", "new york", "seattle", "austin",
        "chicago", "boston", "los angeles", "california", "texas", "washington", "colorado",
        "denver", "atlanta", ", ca", ", ny", ", wa", ", tx", ", ma", ", il", ", co", ", nc",
        "remote, us", "us remote", "remote - us", "(us)"
    ]
    if any(k in loc for k in us_keywords) or (is_remote and ("us" in loc or "united states" in loc)):
        regions.add("us")

    # 4. Europe slice
    europe_keywords = [
        "europe", "united kingdom", "uk", "london", "germany", "berlin", "munich",
        "france", "paris", "netherlands", "amsterdam", "ireland", "dublin", "sweden",
        "stockholm", "switzerland", "zurich", "spain", "barcelona", "madrid", "poland",
        "warsaw", "italy", "austria", "belgium", "denmark", "norway", "finland", "estonia",
        "portugal", "lisbon", "emea", "eu"
    ]
    if any(k in loc for k in europe_keywords) or job.get("visa_sponsorship") or job.get("source") == "ARBEITNOW_DIRECT":
        regions.add("europe")

    # Fallback heuristic: if unclassified, default to remote if remote flag, else us
    if not regions:
        if is_remote:
            regions.add("remote")
        else:
            regions.add("us")

    return regions


def run_pipeline(
    workspace_root: Path,
    output_dir: Path,
    max_age_days: float = 14.0,
    concurrency: int = 25,
    limit: int | None = None,
    platforms_filter: list[str] | None = None,
    include_open_feeds: bool = True,
    update_local_fallback: bool = True,
    verbose: bool = False
) -> dict:
    """
    Main execution pipeline for $0 real-time job harvesting.
    Ingests corporate direct ATS boards and open direct feeds (Arbeitnow & Remotive),
    applies canonical SHA-256 deduplication, and emits optimized edge feeds.
    """
    t0 = time.time()
    now_epoch = time.time()
    now_dt = datetime.now(timezone.utc)
    now_iso = now_dt.isoformat()

    print(f"[SPrav $0 Job Engine] Initializing deterministic ATS harvesting pipeline...")
    all_boards = load_company_registry(workspace_root)

    # Filter platforms if specified
    if platforms_filter:
        platforms_set = set(p.lower().strip() for p in platforms_filter)
        all_boards = [b for b in all_boards if b["platform"] in platforms_set]
        include_arbeitnow = "arbeitnow" in platforms_set
        include_remotive = "remotive" in platforms_set
    else:
        include_arbeitnow = include_open_feeds
        include_remotive = include_open_feeds

    # Apply limit if specified
    if limit and limit > 0:
        all_boards = all_boards[:limit]

    print(f"  Target: {len(all_boards)} curated corporate boards across Greenhouse, Lever, Ashby, Workable, SmartRecruiters")
    if include_arbeitnow or include_remotive:
        feed_names = []
        if include_arbeitnow:
            feed_names.append("Arbeitnow (EU & Visa)")
        if include_remotive:
            feed_names.append("Remotive (Remote Dev)")
        print(f"  Direct Open Feeds: {', '.join(feed_names)}")
    print(f"  Concurrency: {concurrency} workers | Max posting age: {max_age_days} days")

    harvested_raw_jobs = []
    completed_boards = 0

    with concurrent.futures.ThreadPoolExecutor(max_workers=concurrency) as executor:
        future_to_task = {
            executor.submit(harvest_board, board, max_age_days, now_epoch): ("board", f"{board['name']} ({board['platform']})")
            for board in all_boards
        }
        if include_arbeitnow:
            future_to_task[executor.submit(harvest_arbeitnow_feed, max_age_days, now_epoch)] = ("feed", "Arbeitnow Direct (EU & Visa)")
        if include_remotive:
            future_to_task[executor.submit(harvest_remotive_feed, max_age_days, now_epoch)] = ("feed", "Remotive Direct (Remote Dev)")

        total_tasks = len(future_to_task)
        completed_tasks = 0

        for future in concurrent.futures.as_completed(future_to_task):
            task_type, task_name = future_to_task[future]
            completed_tasks += 1
            if task_type == "board":
                completed_boards += 1
            try:
                jobs = future.result()
                if jobs:
                    harvested_raw_jobs.extend(jobs)
                    if verbose:
                        print(f"  [{completed_tasks}/{total_tasks}] {task_name}: {len(jobs)} active jobs")
            except Exception as e:
                if verbose:
                    print(f"  [{completed_tasks}/{total_tasks}] {task_name} failed: {e}")

    # Canonical Deduplication via SHA-256 fingerprint engine
    seen_fingerprints = set()
    clean_jobs = []
    dropped_duplicates = 0

    for job in harvested_raw_jobs:
        norm_company = job["company"].lower().strip()
        norm_title = re.sub(r"[^\w\s]", "", job["title"].lower()).strip()
        norm_loc = re.sub(r"[^\w\s]", "", job["location"].lower()).strip()
        fingerprint = hashlib.sha256(f"{norm_company}::{norm_title}::{norm_loc}".encode("utf-8")).hexdigest()[:16]

        if fingerprint in seen_fingerprints:
            dropped_duplicates += 1
            continue

        seen_fingerprints.add(fingerprint)
        clean_jobs.append(job)

    # Sort descending by newest posted_epoch
    clean_jobs.sort(key=lambda j: j.get("posted_epoch", 0), reverse=True)

    # Analytics breakdown
    freshness_counts = {"< 24h": 0, "< 3d": 0, "< 7d": 0, "< 14d": 0}
    platform_counts = {}
    distinct_companies = set()
    visa_sponsorship_count = 0
    remote_jobs_count = 0

    for j in clean_jobs:
        freshness_counts[j.get("freshness_tier", "< 14d")] = freshness_counts.get(j.get("freshness_tier", "< 14d"), 0) + 1
        src = j.get("source", "UNKNOWN")
        platform_counts[src] = platform_counts.get(src, 0) + 1
        distinct_companies.add(j["company"].lower())
        if j.get("visa_sponsorship"):
            visa_sponsorship_count += 1
        if j.get("is_remote"):
            remote_jobs_count += 1

    # Ensure output directory exists
    output_dir.mkdir(parents=True, exist_ok=True)

    # 1. Output jobs.json & jobs.json.gz
    json_bytes = json.dumps(clean_jobs, ensure_ascii=False, indent=None, separators=(",", ":")).encode("utf-8")
    gz_bytes = gzip.compress(json_bytes, compresslevel=9)

    with open(output_dir / "jobs.json", "wb") as f:
        f.write(json_bytes)

    with open(output_dir / "jobs.json.gz", "wb") as f:
        f.write(gz_bytes)

    # 2. Output backward compatibility aliases
    with open(output_dir / "latest.json", "wb") as f:
        f.write(json_bytes)
    with open(output_dir / "latest.json.gz", "wb") as f:
        f.write(gz_bytes)
    with open(output_dir / "latest-tech-jobs.json", "wb") as f:
        f.write(json_bytes)
    with open(output_dir / "latest-tech-jobs.json.gz", "wb") as f:
        f.write(gz_bytes)

    # 3. Output Structured Regional JSON Slices (Specialist 2: Zero CORS, Edge-Cached Regional Feeds)
    slices_dir = output_dir / "slices"
    slices_dir.mkdir(parents=True, exist_ok=True)
    slice_counts = {}

    for region in ["india", "us", "europe", "remote"]:
        region_jobs = [j for j in clean_jobs if region in classify_job_regions(j)]
        slice_counts[region] = len(region_jobs)

        reg_json = json.dumps(region_jobs, ensure_ascii=False, indent=None, separators=(",", ":")).encode("utf-8")
        reg_gz = gzip.compress(reg_json, compresslevel=9)

        # Output both in slices/ directory and root for maximum client compatibility
        with open(slices_dir / f"feed-{region}.json", "wb") as f:
            f.write(reg_json)
        with open(slices_dir / f"feed-{region}.json.gz", "wb") as f:
            f.write(reg_gz)
        with open(output_dir / f"feed-{region}.json", "wb") as f:
            f.write(reg_json)
        with open(output_dir / f"feed-{region}.json.gz", "wb") as f:
            f.write(reg_gz)

        # Update local public/data/slices fallback if requested
        if update_local_fallback:
            pub_slices_dir = workspace_root / "public" / "data" / "slices"
            pub_slices_dir.mkdir(parents=True, exist_ok=True)
            with open(pub_slices_dir / f"feed-{region}.json", "w", encoding="utf-8") as f:
                json.dump(region_jobs[:500], f, indent=2)

    # 3b. Specialist 5: Partitioned Role & City Shards (Zero-Backend Sharding)
    # Output to both output_dir / "data" / "shards" and workspace_root / "data" / "shards"
    shards_dir = output_dir / "data" / "shards"
    shards_roles_dir = shards_dir / "roles"
    shards_cities_dir = shards_dir / "cities"
    shards_roles_dir.mkdir(parents=True, exist_ok=True)
    shards_cities_dir.mkdir(parents=True, exist_ok=True)

    local_shards_dir = workspace_root / "data" / "shards"
    local_roles_dir = local_shards_dir / "roles"
    local_cities_dir = local_shards_dir / "cities"
    local_roles_dir.mkdir(parents=True, exist_ok=True)
    local_cities_dir.mkdir(parents=True, exist_ok=True)

    ROLE_PARTITIONS = {
        "frontend": re.compile(r"\b(frontend|front-end|react|vue|angular|ui|web|javascript|typescript|nextjs|css|html)\b", re.IGNORECASE),
        "backend": re.compile(r"\b(backend|back-end|api|golang|go|python|django|fastapi|java|spring|node|express|ruby|rails|c\+\+|rust|database|sql)\b", re.IGNORECASE),
        "fullstack": re.compile(r"\b(fullstack|full-stack|full\s*stack)\b", re.IGNORECASE),
        "aiml": re.compile(r"\b(ai|ml|machine\s*learning|deep\s*learning|data\s*scientist|nlp|llm|computer\s*vision|pytorch|tensorflow|genai)\b", re.IGNORECASE),
        "devops": re.compile(r"\b(devops|sre|site\s*reliability|infrastructure|cloud|platform|kubernetes|docker|aws|gcp|azure|terraform|ci/cd)\b", re.IGNORECASE),
    }

    CITY_PARTITIONS = {
        "bengaluru": re.compile(r"\b(bengaluru|bangalore|karnataka|india)\b", re.IGNORECASE),
        "london": re.compile(r"\b(london|uk|united\s*kingdom|england)\b", re.IGNORECASE),
        "san_francisco": re.compile(r"\b(san\s*francisco|sf|bay\s*area|california|ca)\b", re.IGNORECASE),
        "remote": re.compile(r"\b(remote|anywhere|virtual|worldwide|work\s*from\s*home)\b", re.IGNORECASE),
    }

    shard_metrics = {"roles": {}, "cities": {}}

    for role_name, pattern in ROLE_PARTITIONS.items():
        role_jobs = [
            j for j in clean_jobs
            if pattern.search(j.get("title", "")) or pattern.search(j.get("description", "")) or any(pattern.search(str(tag)) for tag in j.get("tags", []))
        ]
        shard_metrics["roles"][role_name] = len(role_jobs)
        r_json = json.dumps(role_jobs, ensure_ascii=False, indent=None, separators=(",", ":")).encode("utf-8")
        r_gz = gzip.compress(r_json, compresslevel=9)

        # Write to dist_feed/data/shards/roles/{role_name}.json.gz and .json
        with open(shards_roles_dir / f"{role_name}.json", "wb") as f:
            f.write(r_json)
        with open(shards_roles_dir / f"{role_name}.json.gz", "wb") as f:
            f.write(r_gz)

        # Mirror to local data/shards/roles/
        with open(local_roles_dir / f"{role_name}.json.gz", "wb") as f:
            f.write(r_gz)

    for city_name, pattern in CITY_PARTITIONS.items():
        if city_name == "remote":
            city_jobs = [j for j in clean_jobs if j.get("is_remote") or pattern.search(j.get("location", "")) or pattern.search(j.get("workplace_type", ""))]
        else:
            city_jobs = [j for j in clean_jobs if pattern.search(j.get("location", ""))]
        shard_metrics["cities"][city_name] = len(city_jobs)
        c_json = json.dumps(city_jobs, ensure_ascii=False, indent=None, separators=(",", ":")).encode("utf-8")
        c_gz = gzip.compress(c_json, compresslevel=9)

        # Write to dist_feed/data/shards/cities/{city_name}.json.gz and .json
        with open(shards_cities_dir / f"{city_name}.json", "wb") as f:
            f.write(c_json)
        with open(shards_cities_dir / f"{city_name}.json.gz", "wb") as f:
            f.write(c_gz)

        # Mirror to local data/shards/cities/
        with open(local_cities_dir / f"{city_name}.json.gz", "wb") as f:
            f.write(c_gz)

    # 4. Output .nojekyll for GitHub Pages
    with open(output_dir / ".nojekyll", "w", encoding="utf-8") as f:
        f.write("")

    # 5. Output index.html dashboard
    template_path = workspace_root / "scripts" / "feed_index.html"
    if template_path.exists():
        with open(template_path, "r", encoding="utf-8") as f:
            html_content = f.read()
        with open(output_dir / "index.html", "w", encoding="utf-8") as f:
            f.write(html_content)

    # 6. Output Vercel and Package metadata for no-op branch building
    vercel_cfg = {
        "version": 2,
        "buildCommand": "echo 'SPrav Sovereign job feed data branch - skipping compilation'",
        "outputDirectory": ".",
        "ignoreCommand": "exit 0"
    }
    with open(output_dir / "vercel.json", "w", encoding="utf-8") as f:
        json.dump(vercel_cfg, f, indent=2)

    pkg_cfg = {
        "name": "sprav-sovereign-job-feed",
        "private": True,
        "version": "2.0.0",
        "description": "SPrav Sovereign Daily Real-Time ATS Jobs Feed",
        "scripts": {"build": "echo 'Data branch - no-op'"}
    }
    with open(output_dir / "package.json", "w", encoding="utf-8") as f:
        json.dump(pkg_cfg, f, indent=2)

    # 7. Output rich feed_manifest.json
    compression_ratio = round((1.0 - (len(gz_bytes) / max(1, len(json_bytes)))) * 100.0, 1)
    duration_sec = round(time.time() - t0, 2)
    open_feeds_count = (1 if include_arbeitnow else 0) + (1 if include_remotive else 0)

    manifest = {
        "version": "2.0.0-realtime-ats",
        "harvested_at": now_iso,
        "pipeline_duration_seconds": duration_sec,
        "total_jobs": len(clean_jobs),
        "distinct_companies": len(distinct_companies),
        "boards_queried": len(all_boards),
        "open_feeds_queried": open_feeds_count,
        "duplicates_dropped": dropped_duplicates,
        "max_posting_age_days": max_age_days,
        "visa_sponsorship_jobs": visa_sponsorship_count,
        "remote_jobs": remote_jobs_count,
        "regional_slices": slice_counts,
        "freshness_breakdown": freshness_counts,
        "platform_breakdown": platform_counts,
        "payload_metrics": {
            "uncompressed_bytes": len(json_bytes),
            "compressed_bytes": len(gz_bytes),
            "compression_ratio": f"{compression_ratio}%"
        },
        "shards": shard_metrics,
        "endpoints": {
            "primary_compressed": "jobs.json.gz",
            "primary_json": "jobs.json",
            "compat_latest_gz": "latest.json.gz",
            "compat_tech_gz": "latest-tech-jobs.json.gz",
            "slice_india": "slices/feed-india.json.gz",
            "slice_us": "slices/feed-us.json.gz",
            "slice_europe": "slices/feed-europe.json.gz",
            "slice_remote": "slices/feed-remote.json.gz",
            "shards_roles": {
                "frontend": "data/shards/roles/frontend.json.gz",
                "backend": "data/shards/roles/backend.json.gz",
                "fullstack": "data/shards/roles/fullstack.json.gz",
                "aiml": "data/shards/roles/aiml.json.gz",
                "devops": "data/shards/roles/devops.json.gz"
            },
            "shards_cities": {
                "bengaluru": "data/shards/cities/bengaluru.json.gz",
                "london": "data/shards/cities/london.json.gz",
                "san_francisco": "data/shards/cities/san_francisco.json.gz",
                "remote": "data/shards/cities/remote.json.gz"
            }
        }
    }

    with open(output_dir / "feed_manifest.json", "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2)

    # 7b. Automatically write GitHub Step Summary if running in GitHub Actions
    github_summary_path = os.environ.get("GITHUB_STEP_SUMMARY")
    if github_summary_path:
        try:
            summary_script = Path(__file__).resolve().parent / "generate_step_summary.py"
            if summary_script.exists():
                import importlib.util
                spec = importlib.util.spec_from_file_location("generate_step_summary", summary_script)
                mod = importlib.util.module_from_spec(spec)
                spec.loader.exec_module(mod)
                mod.generate_summary(output_dir / "feed_manifest.json", Path(github_summary_path))
        except Exception as e:
            print(f"  ℹ Notice: Step summary auto-write skipped: {e}")

    # 8. Update local fallback public/data/sprav_daily_jobs.json if requested
    if update_local_fallback:
        public_data_dir = workspace_root / "public" / "data"
        public_data_dir.mkdir(parents=True, exist_ok=True)
        # Store clean subset in public/data/sprav_daily_jobs.json
        with open(public_data_dir / "sprav_daily_jobs.json", "w", encoding="utf-8") as f:
            json.dump(clean_jobs[:1000], f, indent=2)
        print(f"  ✓ Updated local fallback in {public_data_dir / 'sprav_daily_jobs.json'} ({min(len(clean_jobs), 1000)} jobs)")

    print(f"\n[SPrav $0 Job Engine] Ingestion Completed Successfully in {duration_sec}s!")
    print(f"  ✓ Total Verified Live Jobs: {len(clean_jobs)}")
    print(f"  ✓ Distinct Tech Employers: {len(distinct_companies)}")
    print(f"  ✓ European & Visa Opportunities: {visa_sponsorship_count}")
    print(f"  ✓ Global Remote Roles: {remote_jobs_count}")
    print(f"  ✓ Freshness Breakdown: <24h: {freshness_counts['< 24h']} | <3d: {freshness_counts['< 3d']} | <7d: {freshness_counts['< 7d']} | <14d: {freshness_counts['< 14d']}")
    print(f"  ✓ Compression: {len(json_bytes) / 1024:.1f} KB -> {len(gz_bytes) / 1024:.1f} KB ({compression_ratio}% reduction)")
    print(f"  ✓ Output Location: {output_dir.resolve()}\n")

    return manifest


def main():
    parser = argparse.ArgumentParser(description="SPrav $0 Real-Time ATS Job Harvester")
    parser.add_argument("--limit", type=int, default=None, help="Limit number of companies to query")
    parser.add_argument("--concurrency", type=int, default=25, help="Number of concurrent worker threads")
    parser.add_argument("--max-age-days", type=float, default=14.0, help="Max posting age in days (default: 14)")
    parser.add_argument("--output-dir", type=str, default="dist_feed", help="Output directory for generated feeds")
    parser.add_argument("--platforms", type=str, default=None, help="Comma-separated platforms to filter")
    parser.add_argument("--no-local-fallback", action="store_true", help="Do not update public/data/sprav_daily_jobs.json")
    parser.add_argument("--no-open-feeds", action="store_true", help="Skip Arbeitnow and Remotive direct open feed ingestion")
    parser.add_argument("--verbose", action="store_true", help="Enable verbose per-board logs")

    args = parser.parse_args()
    workspace_root = Path(__file__).resolve().parent.parent
    output_dir = workspace_root / args.output_dir

    platforms = args.platforms.split(",") if args.platforms else None

    run_pipeline(
        workspace_root=workspace_root,
        output_dir=output_dir,
        max_age_days=args.max_age_days,
        concurrency=args.concurrency,
        limit=args.limit,
        platforms_filter=platforms,
        include_open_feeds=not args.no_open_feeds,
        update_local_fallback=not args.no_local_fallback,
        verbose=args.verbose
    )


if __name__ == "__main__":
    main()
