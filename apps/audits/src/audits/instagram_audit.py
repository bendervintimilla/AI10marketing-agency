"""
instagram_audit.py — 32-check Instagram audit (extracted from claude-ads).

Evaluates content, audience, monetization, and organic+paid integration.
Returns structured result with per-check status, weighted score, and report.
"""

import re
from datetime import datetime, timezone
from typing import Any

# ─────────────────────────────────────────────────────────────────────────────
# Severity & category weights
# ─────────────────────────────────────────────────────────────────────────────

SEVERITY_WEIGHT = {"critical": 5.0, "high": 3.0, "medium": 1.5, "low": 0.5}

CATEGORY_WEIGHT = {
    "Content & Creative": 0.30,
    "Audience & Reach": 0.25,
    "Monetization": 0.25,
    "Organic + Paid Integration": 0.20,
}

# ─────────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────────

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


def _media_analysis(media: list[dict]) -> dict:
    """Compute content mix from raw media list."""
    if not media:
        return {"total": 0, "reels_pct": 0, "carousel_pct": 0, "image_pct": 0,
                "last_post_days": None, "post_count_30d": 0, "avg_caption_len": 0,
                "has_cta": False, "hashtag_avg": 0}

    reels = sum(1 for m in media if m.get("media_product_type") == "REELS")
    carousels = sum(1 for m in media if m.get("media_type") == "CAROUSEL_ALBUM")
    images = sum(1 for m in media if m.get("media_type") == "IMAGE"
                 and m.get("media_product_type") != "REELS")
    total = len(media)

    # Recency
    timestamps = [m.get("timestamp") for m in media if m.get("timestamp")]
    last_post_days = None
    post_count_30d = 0
    if timestamps:
        latest = max(timestamps)
        latest_dt = datetime.fromisoformat(latest.replace("Z", "+00:00"))
        now = datetime.now(timezone.utc)
        last_post_days = (now - latest_dt).days
        cutoff_30d = (now - latest_dt).total_seconds()
        post_count_30d = sum(
            1 for t in timestamps
            if (now - datetime.fromisoformat(t.replace("Z", "+00:00"))).days <= 30
        )

    # Caption analysis
    captions = [m.get("caption", "") or "" for m in media]
    avg_caption_len = sum(len(c) for c in captions) / max(len(captions), 1)
    cta_keywords = ["link en bio", "reserva", "wa.me", "whatsapp", "domicilio",
                    "pídelo", "compra", "comprar", "book", "reserve"]
    has_cta = any(any(k in c.lower() for k in cta_keywords) for c in captions[:10])
    hashtag_avg = sum(len(re.findall(r"#\w+", c)) for c in captions) / max(len(captions), 1)

    return {
        "total": total,
        "reels_count": reels,
        "carousel_count": carousels,
        "image_count": images,
        "reels_pct": round(reels / total * 100, 1),
        "carousel_pct": round(carousels / total * 100, 1),
        "image_pct": round(images / total * 100, 1),
        "last_post_days": last_post_days,
        "post_count_30d": post_count_30d,
        "avg_caption_len": round(avg_caption_len),
        "has_cta": has_cta,
        "hashtag_avg": round(hashtag_avg, 1),
    }


# ─────────────────────────────────────────────────────────────────────────────
# Main audit
# ─────────────────────────────────────────────────────────────────────────────

def audit_account(account: dict, brand_name: str = "") -> dict:
    """Evaluate all 32 Instagram checks. Returns full audit result."""
    media = account.get("media", [])
    bio = account.get("biography", "") or ""
    website = account.get("website")
    followers = account.get("followers_count", 0)
    handle = account.get("username", "")

    a = _media_analysis(media)
    checks: list[dict] = []

    # ─── Content & Creative (8 checks) ──────────────────────────────────────

    # IG-C1: Reels ≥40%
    if a["reels_pct"] >= 40:
        checks.append(_check("IG-C1", "Content & Creative", "high", "PASS",
            f"Reels share {a['reels_pct']}% (≥40% target)",
            {"reels_pct": a["reels_pct"]}))
    elif a["reels_pct"] >= 20:
        checks.append(_check("IG-C1", "Content & Creative", "high", "WARNING",
            f"Reels share {a['reels_pct']}%, target ≥40%",
            {"reels_pct": a["reels_pct"]},
            "Produce 2 Reels per week — Reels reach 2-4x more non-followers"))
    else:
        checks.append(_check("IG-C1", "Content & Creative", "high", "FAIL",
            f"Reels share only {a['reels_pct']}% — far below 40% target",
            {"reels_pct": a["reels_pct"]},
            "Critical: dedicate 40%+ of content to vertical Reels"))

    # IG-C2: Carousels present (2.8x dwell time)
    if a["carousel_pct"] >= 25:
        checks.append(_check("IG-C2", "Content & Creative", "medium", "PASS",
            f"Carousels {a['carousel_pct']}% — good dwell time signal"))
    elif a["carousel_pct"] >= 10:
        checks.append(_check("IG-C2", "Content & Creative", "medium", "WARNING",
            f"Carousels only {a['carousel_pct']}% — could be higher"))
    else:
        checks.append(_check("IG-C2", "Content & Creative", "medium", "FAIL",
            "No carousels detected — missing 2.8× dwell-time format",
            recommendation="Add 1 carousel post per week"))

    # IG-C3: Posting cadence (>3 posts/30d)
    if a["post_count_30d"] >= 12:
        checks.append(_check("IG-C3", "Content & Creative", "high", "PASS",
            f"{a['post_count_30d']} posts in last 30 days"))
    elif a["post_count_30d"] >= 4:
        checks.append(_check("IG-C3", "Content & Creative", "high", "WARNING",
            f"Only {a['post_count_30d']} posts in 30d — target ≥12 (3/week)"))
    else:
        checks.append(_check("IG-C3", "Content & Creative", "high", "FAIL",
            f"Severely under-posting: {a['post_count_30d']} posts in 30 days",
            recommendation="Minimum 3 posts per week to maintain algorithmic priority"))

    # IG-C4: Caption length (Reels: short; carousel: long)
    if 50 <= a["avg_caption_len"] <= 300:
        checks.append(_check("IG-C4", "Content & Creative", "low", "PASS",
            f"Caption length {a['avg_caption_len']} chars — well calibrated"))
    elif a["avg_caption_len"] < 50:
        checks.append(_check("IG-C4", "Content & Creative", "low", "WARNING",
            "Captions too short — add story, context, or CTA"))
    else:
        checks.append(_check("IG-C4", "Content & Creative", "low", "WARNING",
            f"Captions average {a['avg_caption_len']} chars — may be too long"))

    # IG-C5: Hashtag count (3-5 optimal)
    if 3 <= a["hashtag_avg"] <= 5:
        checks.append(_check("IG-C5", "Content & Creative", "low", "PASS",
            f"Hashtag use ~{a['hashtag_avg']} per post"))
    elif a["hashtag_avg"] > 10:
        checks.append(_check("IG-C5", "Content & Creative", "low", "WARNING",
            f"{a['hashtag_avg']} hashtags/post — over the 3-5 sweet spot"))
    elif a["hashtag_avg"] < 1:
        checks.append(_check("IG-C5", "Content & Creative", "low", "WARNING",
            "No hashtags detected — adds discovery surface"))
    else:
        checks.append(_check("IG-C5", "Content & Creative", "low", "PASS",
            f"~{a['hashtag_avg']} hashtags/post"))

    # IG-C6: Format diversity
    formats_active = sum(1 for v in [a["reels_count"], a["carousel_count"], a["image_count"]] if v > 0)
    if formats_active >= 3:
        checks.append(_check("IG-C6", "Content & Creative", "medium", "PASS",
            "All 3 formats active (Reels/Carousel/Image)"))
    elif formats_active == 2:
        checks.append(_check("IG-C6", "Content & Creative", "medium", "WARNING",
            "Only 2 of 3 formats active"))
    else:
        checks.append(_check("IG-C6", "Content & Creative", "medium", "FAIL",
            "Single format only — algorithm penalizes monotony"))

    # IG-C7: Recency
    if a["last_post_days"] is None:
        checks.append(_check("IG-C7", "Content & Creative", "critical", "NA",
            "No posts available"))
    elif a["last_post_days"] <= 7:
        checks.append(_check("IG-C7", "Content & Creative", "critical", "PASS",
            f"Last post {a['last_post_days']} days ago"))
    elif a["last_post_days"] <= 30:
        checks.append(_check("IG-C7", "Content & Creative", "critical", "WARNING",
            f"Last post {a['last_post_days']} days ago — algorithm decay risk"))
    else:
        checks.append(_check("IG-C7", "Content & Creative", "critical", "FAIL",
            f"DORMANT: last post {a['last_post_days']} days ago",
            recommendation="Reactivation campaign needed — followers will be re-distributed"))

    # IG-C8: UGC presence (heuristic: caption mentions "@" non-self)
    ugc_count = sum(1 for m in media[:20]
                    if "@" in (m.get("caption") or "") and handle.lower() not in (m.get("caption") or "").lower())
    ugc_pct = ugc_count / min(20, max(len(media), 1)) * 100
    if ugc_pct >= 20:
        checks.append(_check("IG-C8", "Content & Creative", "medium", "PASS",
            f"UGC tagging ~{ugc_pct:.0f}% of posts"))
    elif ugc_pct >= 5:
        checks.append(_check("IG-C8", "Content & Creative", "medium", "WARNING",
            f"UGC at {ugc_pct:.0f}% — target 20%+"))
    else:
        checks.append(_check("IG-C8", "Content & Creative", "medium", "FAIL",
            "Negligible UGC — strong social proof gap",
            recommendation="Reshare 1-2 customer posts/week from Stories"))

    # ─── Audience & Reach (4 checks, mostly N/A without insights scope) ────

    for cid, msg in [
        ("IG-A1", "Engagement rate vs benchmark"),
        ("IG-A2", "Reels watch-through rate"),
        ("IG-A3", "Saves rate per post"),
        ("IG-A4", "Follower growth trend (MoM)"),
    ]:
        checks.append(_check(cid, "Audience & Reach", "high", "NA",
            f"{msg} — requires instagram_manage_insights scope"))

    # ─── Monetization (8 checks) ────────────────────────────────────────────

    # IG-M1: Bio CTA
    cta_in_bio = bool(re.search(r"(reserva|book|wa\.me|whatsapp|menu|carta|order)", bio.lower()))
    if cta_in_bio:
        checks.append(_check("IG-M1", "Monetization", "critical", "PASS",
            "Bio contains action keyword (reservation/order/menu)"))
    else:
        checks.append(_check("IG-M1", "Monetization", "critical", "FAIL",
            "No CTA in bio — primary conversion path missing",
            {"bio": bio[:200]},
            "Add: 'Reserva → link 👇' or 'WhatsApp directo en link'"))

    # IG-M2: Website link
    if website:
        checks.append(_check("IG-M2", "Monetization", "critical", "PASS",
            f"Website link active: {website}"))
    else:
        checks.append(_check("IG-M2", "Monetization", "critical", "FAIL",
            "No link in bio — every conversion lost",
            recommendation="Add Linktree or direct reservation URL"))

    # IG-M3: Bio length quality
    if len(bio) >= 80:
        checks.append(_check("IG-M3", "Monetization", "medium", "PASS",
            f"Bio is {len(bio)} chars — descriptive"))
    else:
        checks.append(_check("IG-M3", "Monetization", "medium", "WARNING",
            f"Bio only {len(bio)} chars — explain what you offer"))

    # IG-M4: Caption CTA frequency
    cta_in_captions = sum(1 for m in media[:20]
                          if any(k in (m.get("caption") or "").lower()
                                 for k in ["link en bio", "reserva", "wa.me", "whatsapp", "domicilio", "book"]))
    cta_pct = cta_in_captions / min(20, max(len(media), 1)) * 100
    if cta_pct >= 50:
        checks.append(_check("IG-M4", "Monetization", "high", "PASS",
            f"CTA in {cta_pct:.0f}% of recent captions"))
    elif cta_pct >= 20:
        checks.append(_check("IG-M4", "Monetization", "high", "WARNING",
            f"CTA in only {cta_pct:.0f}% of captions — target 100%"))
    else:
        checks.append(_check("IG-M4", "Monetization", "high", "FAIL",
            f"CTA in {cta_pct:.0f}% of captions — almost every post unmonetized",
            recommendation="Add 'Reserva en bio 👆' or similar to every single post"))

    for cid, msg in [
        ("IG-M5", "Action button (Book/Order Food) enabled"),
        ("IG-M6", "Story link stickers used"),
        ("IG-M7", "Highlights organized by customer journey"),
        ("IG-M8", "DM response speed badge"),
    ]:
        checks.append(_check(cid, "Monetization", "medium", "NA",
            f"{msg} — requires manual review or insights scope"))

    # ─── Organic + Paid Integration (7 checks) ──────────────────────────────

    for cid, msg, sev in [
        ("IG-P1", "Top organic posts boosted as paid", "critical"),
        ("IG-P2", "Reels converted to Reel ads", "high"),
        ("IG-P3", "Partnership Ads tested with creators", "medium"),
        ("IG-P4", "Custom Audience built from IG engagers", "high"),
        ("IG-P5", "Instagram placement performance tracked monthly", "medium"),
        ("IG-P6", "Bio link UTM parameters present", "high"),
        ("IG-P7", "Instagram-native 9:16 ad formats used", "medium"),
    ]:
        # Heuristic: if website has UTM params, IG-P6 passes
        if cid == "IG-P6":
            if website and ("utm_" in (website or "")):
                checks.append(_check(cid, "Organic + Paid Integration", sev, "PASS",
                    "Bio link includes UTM tracking"))
            else:
                checks.append(_check(cid, "Organic + Paid Integration", sev, "FAIL",
                    "Bio link missing UTM params — paid traffic untracked",
                    recommendation="Add ?utm_source=instagram&utm_medium=bio to website link"))
        else:
            checks.append(_check(cid, "Organic + Paid Integration", sev, "NA",
                f"{msg} — requires Meta Ads account access"))

    # ─── Compute weighted score ─────────────────────────────────────────────

    score, grade, summary = _compute_score(checks)
    summary["account"] = {
        "username": handle,
        "name": account.get("name"),
        "followers": followers,
        "media_count": account.get("media_count"),
    }
    summary["content_mix"] = a

    return {
        "checks": checks,
        "score": score,
        "grade": grade,
        "summary": summary,
    }


def _compute_score(checks: list[dict]) -> tuple[float, str, dict]:
    """Apply severity × category weighting. Returns (score, grade, summary)."""
    by_cat: dict[str, dict] = {}
    for cat in CATEGORY_WEIGHT:
        by_cat[cat] = {"earned": 0.0, "possible": 0.0, "passed": 0, "warned": 0,
                       "failed": 0, "na": 0, "score": None}

    for c in checks:
        if c["status"] == "NA":
            by_cat[c["category"]]["na"] += 1
            continue
        sev = SEVERITY_WEIGHT.get(c["severity"], 1.0)
        possible = sev * CATEGORY_WEIGHT[c["category"]]
        earned = {
            "PASS": possible,
            "WARNING": possible * 0.5,
            "FAIL": 0,
        }.get(c["status"], 0)
        by_cat[c["category"]]["earned"] += earned
        by_cat[c["category"]]["possible"] += possible
        by_cat[c["category"]][{"PASS": "passed", "WARNING": "warned", "FAIL": "failed"}[c["status"]]] += 1

    # Per-category score
    for cat, b in by_cat.items():
        b["score"] = round(b["earned"] / b["possible"] * 100, 1) if b["possible"] > 0 else None

    # Overall
    total_earned = sum(b["earned"] for b in by_cat.values())
    total_possible = sum(b["possible"] for b in by_cat.values())
    score = round(total_earned / total_possible * 100, 1) if total_possible > 0 else 0

    if score >= 90: grade = "A"
    elif score >= 75: grade = "B"
    elif score >= 60: grade = "C"
    elif score >= 40: grade = "D"
    else: grade = "F"

    return score, grade, {"by_category": by_cat,
                          "checks_passed": sum(1 for c in checks if c["status"] == "PASS"),
                          "checks_warned": sum(1 for c in checks if c["status"] == "WARNING"),
                          "checks_failed": sum(1 for c in checks if c["status"] == "FAIL"),
                          "checks_na": sum(1 for c in checks if c["status"] == "NA")}
