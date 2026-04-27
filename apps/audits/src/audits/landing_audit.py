"""
landing_audit.py — Landing page audit (15 checks).

Fetches a URL, analyzes HTML for: meta tags, schema markup, Pixel,
GTM/GA, WhatsApp, reservation CTA, mobile viewport, performance hints.
"""

import re
import time
import urllib.request
from typing import Any

SEVERITY_WEIGHT = {"critical": 5.0, "high": 3.0, "medium": 1.5, "low": 0.5}

CATEGORY_WEIGHT = {
    "Structure": 0.25,
    "Conversion": 0.30,
    "Tracking": 0.30,
    "SEO/Schema": 0.15,
}


def _check(check_id: str, category: str, severity: str, status: str,
           message: str, evidence: dict | None = None,
           recommendation: str | None = None) -> dict:
    return {
        "check_id": check_id,
        "category": category,
        "severity": severity,
        "status": status,
        "message": message,
        "evidence": evidence or {},
        "recommendation": recommendation,
    }


def audit_landing(url: str, brand_name: str = "") -> dict:
    """Run 15-check landing page audit."""
    started = time.time()

    try:
        req = urllib.request.Request(url, headers={
            # Pose as a real browser — many sites reject explicit bot UAs (HTTP 406)
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                          "AppleWebKit/537.36 (KHTML, like Gecko) "
                          "Chrome/124.0.0.0 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "es-EC,es;q=0.9,en;q=0.8",
        })
        resp = urllib.request.urlopen(req, timeout=15)
        html = resp.read().decode("utf-8", errors="replace")
        load_time_ms = int((time.time() - started) * 1000)
        status_code = resp.getcode()
    except Exception as e:
        return {
            "error": str(e),
            "url": url,
            "checks": [_check("LP-FETCH", "Structure", "critical", "FAIL",
                              f"Could not fetch URL: {e}")],
            "score": 0,
            "grade": "F",
            "summary": {"by_category": {}, "checks_passed": 0,
                        "checks_warned": 0, "checks_failed": 1, "checks_na": 0},
        }

    html_lower = html.lower()
    checks: list[dict] = []

    # ─── Structure ──────────────────────────────────────────────────────────

    if status_code == 200:
        checks.append(_check("LP-S1", "Structure", "critical", "PASS",
            f"HTTP 200 OK in {load_time_ms}ms"))
    else:
        checks.append(_check("LP-S1", "Structure", "critical", "FAIL",
            f"HTTP {status_code} returned"))

    if load_time_ms < 2000:
        checks.append(_check("LP-S2", "Structure", "high", "PASS",
            f"Load time {load_time_ms}ms (<2s)"))
    elif load_time_ms < 4000:
        checks.append(_check("LP-S2", "Structure", "high", "WARNING",
            f"Load time {load_time_ms}ms — borderline"))
    else:
        checks.append(_check("LP-S2", "Structure", "high", "FAIL",
            f"Load time {load_time_ms}ms — too slow",
            recommendation="Compress images, enable caching, lazy-load below-fold"))

    if 'name="viewport"' in html_lower:
        checks.append(_check("LP-S3", "Structure", "high", "PASS",
            "Mobile viewport meta tag present"))
    else:
        checks.append(_check("LP-S3", "Structure", "high", "FAIL",
            "No mobile viewport meta — site won't render correctly on phones",
            recommendation='Add: <meta name="viewport" content="width=device-width, initial-scale=1">'))

    title_match = re.search(r"<title>(.*?)</title>", html_lower, re.DOTALL)
    if title_match and 10 <= len(title_match.group(1).strip()) <= 70:
        checks.append(_check("LP-S4", "Structure", "medium", "PASS",
            "Page title present and well-sized"))
    else:
        checks.append(_check("LP-S4", "Structure", "medium", "WARNING",
            "Title tag missing or wrong length (10-70 chars optimal)"))

    # ─── Conversion ─────────────────────────────────────────────────────────

    has_whatsapp = bool(re.search(r"wa\.me/\d+|api\.whatsapp\.com", html_lower))
    if has_whatsapp:
        checks.append(_check("LP-C1", "Conversion", "critical", "PASS",
            "WhatsApp link detected"))
    else:
        checks.append(_check("LP-C1", "Conversion", "critical", "FAIL",
            "No WhatsApp link — primary conversion path missing for restaurant",
            recommendation='Add: <a href="https://wa.me/593XXXXXXXXX">📲 WhatsApp</a>'))

    reservation_kw = ["reserva", "reserve", "book a table", "agendar", "menu", "carta"]
    has_reservation_cta = any(k in html_lower for k in reservation_kw)
    if has_reservation_cta:
        checks.append(_check("LP-C2", "Conversion", "critical", "PASS",
            "Reservation/menu CTA present"))
    else:
        checks.append(_check("LP-C2", "Conversion", "critical", "FAIL",
            "No reservation/menu CTA visible"))

    has_phone = bool(re.search(r"tel:[+\d\s-]+", html_lower))
    if has_phone:
        checks.append(_check("LP-C3", "Conversion", "high", "PASS",
            "Phone tap-to-call link present"))
    else:
        checks.append(_check("LP-C3", "Conversion", "high", "WARNING",
            "No tel: link — mobile users can't tap to call"))

    has_map = "maps.google" in html_lower or "google.com/maps" in html_lower or '<iframe' in html_lower
    if has_map:
        checks.append(_check("LP-C4", "Conversion", "medium", "PASS",
            "Map embed or directions link present"))
    else:
        checks.append(_check("LP-C4", "Conversion", "medium", "WARNING",
            "No map embed — adds 'directions' conversion path"))

    # ─── Tracking ───────────────────────────────────────────────────────────

    has_pixel = "fbq(" in html or "connect.facebook.net" in html_lower
    if has_pixel:
        checks.append(_check("LP-T1", "Tracking", "critical", "PASS",
            "Meta Pixel detected"))
    else:
        checks.append(_check("LP-T1", "Tracking", "critical", "FAIL",
            "No Meta Pixel — paid Instagram traffic is unattributable",
            recommendation="Install Meta Pixel via GTM"))

    has_gtm = "googletagmanager.com" in html_lower
    has_ga = "google-analytics.com" in html_lower or "gtag(" in html
    if has_gtm or has_ga:
        checks.append(_check("LP-T2", "Tracking", "high", "PASS",
            "Google Tag Manager / Analytics present"))
    else:
        checks.append(_check("LP-T2", "Tracking", "high", "FAIL",
            "No GTM or GA — no behavioral analytics"))

    has_tiktok_pixel = "ttq.load" in html or "analytics.tiktok.com" in html_lower
    if has_tiktok_pixel:
        checks.append(_check("LP-T3", "Tracking", "medium", "PASS",
            "TikTok Pixel detected"))
    else:
        checks.append(_check("LP-T3", "Tracking", "medium", "NA",
            "TikTok Pixel not detected (only required if running TikTok ads)"))

    # ─── SEO / Schema ───────────────────────────────────────────────────────

    has_localbusiness = '"@type":"localbusiness"' in html_lower.replace(" ", "") \
        or '"@type":"restaurant"' in html_lower.replace(" ", "")
    if has_localbusiness:
        checks.append(_check("LP-SC1", "SEO/Schema", "high", "PASS",
            "LocalBusiness/Restaurant schema markup present"))
    else:
        checks.append(_check("LP-SC1", "SEO/Schema", "high", "FAIL",
            "No LocalBusiness/Restaurant schema — hurts local SEO ranking",
            recommendation='Add JSON-LD with @type: "Restaurant" including address, phone, hours'))

    og_title = bool(re.search(r'property=["\']og:title["\']', html_lower))
    if og_title:
        checks.append(_check("LP-SC2", "SEO/Schema", "medium", "PASS",
            "Open Graph tags present (social sharing)"))
    else:
        checks.append(_check("LP-SC2", "SEO/Schema", "medium", "WARNING",
            "No Open Graph tags — links shared on FB/IG won't preview properly"))

    has_meta_desc = bool(re.search(r'name=["\']description["\']', html_lower))
    if has_meta_desc:
        checks.append(_check("LP-SC3", "SEO/Schema", "medium", "PASS",
            "Meta description present"))
    else:
        checks.append(_check("LP-SC3", "SEO/Schema", "medium", "WARNING",
            "No meta description — Google generates one automatically (suboptimal)"))

    # ─── Score ──────────────────────────────────────────────────────────────

    score, grade, summary = _compute_score(checks)
    summary["url"] = url
    summary["load_time_ms"] = load_time_ms
    summary["status_code"] = status_code

    return {"checks": checks, "score": score, "grade": grade, "summary": summary}


def _compute_score(checks: list[dict]) -> tuple[float, str, dict]:
    by_cat: dict[str, dict] = {}
    for cat in CATEGORY_WEIGHT:
        by_cat[cat] = {"earned": 0.0, "possible": 0.0, "passed": 0,
                       "warned": 0, "failed": 0, "na": 0, "score": None}

    for c in checks:
        if c["status"] == "NA":
            by_cat[c["category"]]["na"] += 1
            continue
        sev = SEVERITY_WEIGHT.get(c["severity"], 1.0)
        possible = sev * CATEGORY_WEIGHT[c["category"]]
        earned = {"PASS": possible, "WARNING": possible * 0.5, "FAIL": 0}.get(c["status"], 0)
        by_cat[c["category"]]["earned"] += earned
        by_cat[c["category"]]["possible"] += possible
        by_cat[c["category"]][{"PASS": "passed", "WARNING": "warned", "FAIL": "failed"}[c["status"]]] += 1

    for cat, b in by_cat.items():
        b["score"] = round(b["earned"] / b["possible"] * 100, 1) if b["possible"] > 0 else None

    total_earned = sum(b["earned"] for b in by_cat.values())
    total_possible = sum(b["possible"] for b in by_cat.values())
    score = round(total_earned / total_possible * 100, 1) if total_possible > 0 else 0

    if score >= 90: grade = "A"
    elif score >= 75: grade = "B"
    elif score >= 60: grade = "C"
    elif score >= 40: grade = "D"
    else: grade = "F"

    return score, grade, {
        "by_category": by_cat,
        "checks_passed": sum(1 for c in checks if c["status"] == "PASS"),
        "checks_warned": sum(1 for c in checks if c["status"] == "WARNING"),
        "checks_failed": sum(1 for c in checks if c["status"] == "FAIL"),
        "checks_na": sum(1 for c in checks if c["status"] == "NA"),
    }
