#!/usr/bin/env python3
"""
audit_runner.py — Entry point invoked by the BullMQ worker.

Reads a JSON job spec from stdin or --input flag, runs the requested audit,
prints structured JSON to stdout. Exit code 0 on success, 1 on failure.

This is the contract between the Node worker and the Python audit logic.
The worker spawns: `python3 audit_runner.py --input job.json`
The worker reads stdout as JSON and persists to AuditRun + AuditCheck rows.

Usage:
  echo '{"platform": "INSTAGRAM", "ig_user_id": "...", ...}' | python3 audit_runner.py
  python3 audit_runner.py --input job.json
"""

import argparse
import json
import sys
import traceback
from datetime import datetime
from pathlib import Path

# Add fetchers + audits to path
ROOT = Path(__file__).parent
sys.path.insert(0, str(ROOT / "fetchers"))
sys.path.insert(0, str(ROOT / "audits"))


def run_instagram_audit(spec: dict) -> dict:
    """Run a 32-check Instagram audit for one IG account."""
    from audits.instagram_audit import audit_account

    ig_user_id = spec["ig_user_id"]
    access_token = spec["access_token"]
    brand_name = spec.get("brand_name", "Unknown")

    # Fetch raw data via Meta Graph API
    import urllib.request, urllib.parse
    base = "https://graph.facebook.com/v20.0"

    profile_url = f"{base}/{ig_user_id}?fields=id,name,username,biography,website,followers_count,follows_count,media_count,profile_picture_url&access_token={access_token}"
    media_url = f"{base}/{ig_user_id}/media?fields=id,caption,media_type,media_product_type,timestamp,permalink,thumbnail_url&limit=50&access_token={access_token}"

    profile = json.loads(urllib.request.urlopen(profile_url, timeout=20).read())
    media_resp = json.loads(urllib.request.urlopen(media_url, timeout=20).read())

    if "error" in profile:
        raise RuntimeError(f"Meta API error: {profile['error']}")

    account = {
        "username": profile.get("username"),
        "name": profile.get("name"),
        "biography": profile.get("biography", ""),
        "website": profile.get("website"),
        "followers_count": profile.get("followers_count", 0),
        "media_count": profile.get("media_count", 0),
        "media": media_resp.get("data", []),
    }

    return audit_account(account, brand_name=brand_name)


def run_landing_audit(spec: dict) -> dict:
    """Run a landing page audit on a URL."""
    from audits.landing_audit import audit_landing
    return audit_landing(spec["url"], brand_name=spec.get("brand_name", "Unknown"))


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", help="Path to JSON job spec (default: stdin)")
    args = parser.parse_args()

    try:
        if args.input:
            with open(args.input) as f:
                spec = json.load(f)
        else:
            spec = json.load(sys.stdin)

        platform = spec.get("platform", "").upper()
        started = datetime.utcnow()

        if platform == "INSTAGRAM":
            result = run_instagram_audit(spec)
        elif platform == "LANDING":
            result = run_landing_audit(spec)
        elif platform in ("META", "GOOGLE", "TIKTOK", "YOUTUBE", "LINKEDIN", "MICROSOFT"):
            # Skill-doc-only mode: no live data fetcher wired yet for these
            # platforms (or credentials not connected). The Claude agent in
            # the worker will still produce a full strategic analysis from
            # BrandMemory + the platform's .md skill doc. We return an empty
            # checklist with a flag so the agent knows it's running blind.
            result = {
                "checks": [],
                "score": None,
                "grade": None,
                "summary": {
                    "mode": "skill_doc_only",
                    "message": f"No live {platform} data fetched — Claude will analyze using the skill doc + brand memory.",
                    "by_category": {},
                },
                "raw_data": {
                    "platform": platform,
                    "note": "Connect ad account in Settings → Accounts to enable live data fetching.",
                },
            }
        else:
            raise ValueError(f"Unsupported platform: {platform}")

        result["platform"] = platform
        result["started_at"] = started.isoformat() + "Z"
        result["completed_at"] = datetime.utcnow().isoformat() + "Z"
        result["duration_ms"] = int((datetime.utcnow() - started).total_seconds() * 1000)

        print(json.dumps(result, default=str))
        sys.exit(0)

    except Exception as exc:
        error = {
            "error": str(exc),
            "type": type(exc).__name__,
            "traceback": traceback.format_exc(),
        }
        print(json.dumps(error), file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
