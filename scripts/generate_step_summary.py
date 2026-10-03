#!/usr/bin/env python3
"""
scripts/generate_step_summary.py
================================
Generates GitHub Actions Rich Step Summary from dist_feed/feed_manifest.json.
Safe, robust, and free of shell quoting or backtick command substitution issues.
"""

import json
import os
from pathlib import Path
import sys

# Ensure UTF-8 output across platforms
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")


def generate_summary(manifest_path: Path, output_file: Path | None = None) -> str:
    if not manifest_path.exists():
        fallback_msg = (
            "### ⚠️ SPrav $0 Real-Time Job Engine — Harvest Report\n\n"
            "*Feed manifest not found (`dist_feed/feed_manifest.json`). "
            "Harvester may have encountered an early exit or timeout.*\n"
        )
        if output_file:
            try:
                with open(output_file, "a", encoding="utf-8") as f:
                    f.write(fallback_msg)
            except Exception as e:
                print(f"Warning: Failed to write fallback summary: {e}")
        return fallback_msg

    try:
        with open(manifest_path, "r", encoding="utf-8") as f:
            m = json.load(f)
    except Exception as e:
        err_msg = f"### ⚠️ Error parsing feed manifest: {e}\n"
        if output_file:
            with open(output_file, "a", encoding="utf-8") as f:
                f.write(err_msg)
        return err_msg

    fresh = m.get("freshness_breakdown", {})
    payload = m.get("payload_metrics", {})
    slices = m.get("regional_slices", {})
    total_jobs = m.get("total_jobs", 0)
    distinct_companies = m.get("distinct_companies", 0)
    visa_jobs = m.get("visa_sponsorship_jobs", 0)
    remote_jobs = m.get("remote_jobs", 0)
    boards_queried = m.get("boards_queried", 0)
    open_feeds = m.get("open_feeds_queried", 0)
    duration = m.get("pipeline_duration_seconds", 0)
    compression = payload.get("compression_ratio", "N/A")
    compressed_kb = payload.get("compressed_bytes", 0) / 1024.0

    lines = [
        "### 🎯 SPrav $0 Real-Time Job Engine — Harvest Report",
        "",
        "| Metric | Value |",
        "|---|---|",
        f"| **Total Verified Live Jobs** | `{total_jobs:,}` |",
        f"| **Distinct Tech Employers** | `{distinct_companies}` |",
        f"| **European & Visa Opportunities** | `{visa_jobs:,}` |",
        f"| **Global Remote Roles** | `{remote_jobs:,}` |",
        f"| **Corporate Boards Queried** | `{boards_queried}` |",
        f"| **Direct Open Feeds Ingested** | `{open_feeds} (Arbeitnow & Remotive)` |",
        f"| **Execution Duration** | `{duration}s` |",
        f"| **Compression Ratio** | `{compression}` |",
        f"| **Compressed Feed Size** | `{compressed_kb:.1f} KB` |",
        "",
        "#### 🌍 Regional Structured Slices (Zero CORS, 1h CDN)",
        f"- **India & GCCs:** `{slices.get('india', 0):,}` jobs (`feed-india.json`)",
        f"- **North America (US):** `{slices.get('us', 0):,}` jobs (`feed-us.json`)",
        f"- **Europe & UK:** `{slices.get('europe', 0):,}` jobs (`feed-europe.json`)",
        f"- **Global Remote:** `{slices.get('remote', 0):,}` jobs (`feed-remote.json`)",
        "",
        "#### 🕒 Freshness Distribution (Strict <= 14 Days)",
        f"- **< 24 Hours Fresh:** `{fresh.get('< 24h', 0):,}` postings",
        f"- **< 3 Days Fresh:** `{fresh.get('< 3d', 0):,}` postings",
        f"- **< 7 Days Fresh:** `{fresh.get('< 7d', 0):,}` postings",
        f"- **< 14 Days Fresh:** `{fresh.get('< 14d', 0):,}` postings",
        "",
        "#### 🌐 Edge CDN Distribution",
        "- `jobs.json.gz` (High-Speed Edge Delivery)",
        "- `slices/feed-india.json.gz` (India Hubs)",
        "- `slices/feed-us.json.gz` (US & Silicon Valley)",
        "- `slices/feed-europe.json.gz` (Europe & Visa Support)",
        "- `slices/feed-remote.json.gz` (Global Remote)",
        "- `latest.json.gz` (V4 Client Compatibility)",
        "- `feed_manifest.json` (Real-Time Health Manifest)",
        ""
    ]

    report = "\n".join(lines) + "\n"

    if output_file:
        try:
            with open(output_file, "a", encoding="utf-8") as f:
                f.write(report)
        except Exception as e:
            print(f"Warning: Failed writing summary to {output_file}: {e}")

    return report


def main():
    workspace_root = Path(__file__).resolve().parent.parent
    manifest_path = workspace_root / "dist_feed" / "feed_manifest.json"

    github_summary_path = os.environ.get("GITHUB_STEP_SUMMARY")
    out_file = Path(github_summary_path) if github_summary_path else None

    report = generate_summary(manifest_path, out_file)
    print(report)


if __name__ == "__main__":
    main()
