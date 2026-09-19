#!/usr/bin/env python3
"""Refresh the "Latest" cards on the front page.

Fetches the newest Political Calculus post (Substack RSS), the newest
Rethink episode (BBC podcast RSS) and the newest Prospect column (parsed
from the Prospect author page, which has no feed), then rewrites the block
between <!-- NOW:START --> and <!-- NOW:END --> in index.html.

If a source can't be reached or has changed format, its previous card is
kept (from assets/data/now.json), so a failure never blanks the page.
Uses only the Python standard library. Run from the repository root:

    python3 scripts/update_now.py
"""
import html
import json
import re
import sys
import urllib.request
import xml.etree.ElementTree as ET
from email.utils import parsedate_to_datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
INDEX = ROOT / "index.html"
CACHE = ROOT / "assets" / "data" / "now.json"
UA = "Mozilla/5.0 (compatible; benwansell-site-updater; +https://benwansell.github.io/)"

SUBSTACK_FEED = "https://benansell.substack.com/feed"
RETHINK_FEED = "https://podcasts.files.bbci.co.uk/p08gt1ry.rss"
PROSPECT_AUTHOR = "https://www.prospectmagazine.co.uk/author/5582/ben-ansell"


def fetch(url):
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=30) as r:
        return r.read()


def clean(text, limit=170):
    """Strip tags and whitespace, and trim to a sentence-ish length."""
    text = html.unescape(re.sub(r"<[^>]+>", " ", text or ""))
    text = re.sub(r"\s+", " ", text).strip()
    if len(text) > limit:
        text = text[:limit].rsplit(" ", 1)[0].rstrip(",;:—-") + "…"
    return text


def nice_date(rfc822):
    try:
        d = parsedate_to_datetime(rfc822)
        return f"{d.day} {d.strftime('%B %Y')}"
    except (TypeError, ValueError):
        return ""


def latest_from_feed(url):
    item = ET.fromstring(fetch(url)).find("channel/item")
    return {
        "title": clean(item.findtext("title"), 120),
        "url": (item.findtext("link") or "").strip().replace("http://", "https://", 1),
        "date": nice_date(item.findtext("pubDate")),
        "summary": clean(item.findtext("description")),
    }


def latest_prospect():
    page = fetch(PROSPECT_AUTHOR).decode("utf-8", "ignore")
    block = page.split('class="pro-magazine-section__article"')[1]
    href = re.search(r'<a href="?([^"\s>]+)', block).group(1)
    title = re.search(r'article-headline">([^<]+)', block).group(1)
    url = href if href.startswith("http") else "https://www.prospectmagazine.co.uk" + href
    summary = ""
    try:
        art = fetch(url).decode("utf-8", "ignore")
        m = re.search(r'name="description" content="([^"]*)"', art)
        summary = clean(m.group(1)) if m else ""
    except Exception:
        pass
    return {"title": clean(title, 120), "url": url, "date": "", "summary": summary}


SOURCES = [
    # key, label, link text, fetcher
    ("prospect", "Latest in Prospect", "Read the column", latest_prospect),
    ("substack", "Latest on Political Calculus", "Read the post", lambda: latest_from_feed(SUBSTACK_FEED)),
    ("rethink", "Latest on Rethink, BBC Radio 4", "Listen", lambda: latest_from_feed(RETHINK_FEED)),
]


def render(cards):
    out = []
    for key, label, cta, _ in SOURCES:
        c = cards.get(key)
        if not c:
            continue
        date = f'<span class="now-date">{html.escape(c["date"])}</span>' if c.get("date") else ""
        summary = f'<p>{html.escape(c["summary"])}</p>' if c.get("summary") else ""
        out.append(
            f'                    <a class="now-card now-{key}" href="{html.escape(c["url"])}">\n'
            f'                        <span class="now-label">{label}</span>\n'
            f'                        <h3>{html.escape(c["title"])}</h3>\n'
            f'                        {summary}\n'
            f'                        <span class="now-foot">{date}<span class="now-cta">{cta} &rarr;</span></span>\n'
            f'                    </a>'
        )
    return "\n".join(out)


def main():
    cards = json.loads(CACHE.read_text()) if CACHE.exists() else {}
    for key, label, _, fetcher in SOURCES:
        try:
            cards[key] = fetcher()
            print(f"updated {key}: {cards[key]['title']}")
        except Exception as e:  # keep the previous card
            print(f"WARNING: could not update {key} ({e}); keeping previous card", file=sys.stderr)

    CACHE.parent.mkdir(parents=True, exist_ok=True)
    CACHE.write_text(json.dumps(cards, indent=2, ensure_ascii=False) + "\n")

    page = INDEX.read_text()
    new = re.sub(
        r"(<!-- NOW:START -->).*?(\n[ \t]*<!-- NOW:END -->)",
        lambda m: m.group(1) + "\n" + render(cards) + m.group(2),
        page,
        flags=re.S,
    )
    if new != page:
        INDEX.write_text(new)
        print("index.html updated")


if __name__ == "__main__":
    main()
