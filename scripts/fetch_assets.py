#!/usr/bin/env python3
"""Build the flash-montage asset library from open-licence sources (CC0 / public domain only).

usage:
  python3 -I scripts/fetch_assets.py                      # every category in assets/sources/queries.json
  python3 -I scripts/fetch_assets.py --only cosmos,botanical
  python3 -I scripts/fetch_assets.py --query "chrome sphere" --category studio-objects --source openverse

Writes:
  assets/library/<category>/<source>-<id>.jpg   (max 1600 px long edge, JPEG q84)
  assets/library/<category>/thumbs/<same>.jpg   (320 px, for galleries)
  assets/library/manifest.jsonl                 (one record per file: licence, creator, page, size, ground, palette)

Sources: Openverse (license=cc0,pdm), NASA Image Library, Wikimedia Commons (public-domain/CC0 files only),
Cleveland Museum of Art Open Access (cc0=1). Openverse anon limits: 20 req/min, 200/day; this paces itself.
"""
import argparse, concurrent.futures as cf, hashlib, io, json, os, re, sys, threading, time, urllib.parse, urllib.request

from PIL import Image, ImageStat

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LIB = os.path.join(ROOT, "assets", "library")
MANIFEST = os.path.join(LIB, "manifest.jsonl")
UA = "flash-montage-skill/1.0 (asset research; open-licence only)"
PER = {"openverse": 12, "commons": 10, "nasa": 8, "cleveland": 10}
MIN_EDGE = 800
CACHE = os.path.join(ROOT, "assets", "sources", "cache")
_last_ov = [0.0]
_wm_lock = threading.Lock()
_mf_lock = threading.Lock()


def get_json(url, pace=None):
    """GET JSON with an on-disk cache, so re-runs never spend Openverse's 200/day anon quota twice."""
    key = os.path.join(CACHE, hashlib.sha1(url.encode()).hexdigest() + ".json")
    if os.path.exists(key):
        return json.load(open(key))
    d = _get_json(url, pace)
    if d is not None:
        os.makedirs(CACHE, exist_ok=True)
        json.dump(d, open(key, "w"))
    return d


def _get_json(url, pace=None):
    if pace == "openverse":
        wait = 3.2 - (time.time() - _last_ov[0])
        if wait > 0:
            time.sleep(wait)
        _last_ov[0] = time.time()
    for attempt in range(4):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": UA})
            with urllib.request.urlopen(req, timeout=40) as r:
                return json.load(r)
        except urllib.error.HTTPError as e:
            if e.code == 429:
                time.sleep(20 * (attempt + 1))
                continue
            print(f"  ! {e.code} {url[:100]}", file=sys.stderr)
            return None
        except Exception as e:  # noqa: BLE001
            print(f"  ! {type(e).__name__} {url[:100]}", file=sys.stderr)
            time.sleep(2)
    return None


# ---------- source adapters: each yields candidate dicts ----------

def src_openverse(q, n):
    u = "https://api.openverse.org/v1/images/?" + urllib.parse.urlencode(
        {"q": q, "license": "cc0,pdm", "page_size": 20, "mature": "false"})
    d = get_json(u, pace="openverse") or {}
    out = []
    for r in d.get("results", []):
        w, h = r.get("width") or 0, r.get("height") or 0
        if w and h and max(w, h) < MIN_EDGE:
            continue
        out.append({"id": r["id"][:12], "url": r["url"], "title": r.get("title") or q, "creator": r.get("creator"),
                    "license": r.get("license"), "license_url": r.get("license_url"),
                    "page": r.get("foreign_landing_url"), "provider": r.get("provider")})
        if len(out) >= n:
            break
    return out


def src_nasa(q, n):
    u = "https://images-api.nasa.gov/search?" + urllib.parse.urlencode({"q": q, "media_type": "image", "page_size": 25})
    d = get_json(u) or {}
    out = []
    for it in d.get("collection", {}).get("items", []):
        data = it["data"][0]
        credit = " ".join(str(data.get(k, "")) for k in ("secondary_creator", "photographer", "center"))
        desc = (data.get("description") or "")[:4000]
        flag = "ESA" in credit or "ESA/" in desc or "©" in desc
        nid = data["nasa_id"]
        out.append({"id": re.sub(r"[^A-Za-z0-9_-]", "", nid)[:40], "nasa_id": nid, "title": data.get("title"),
                    "creator": data.get("secondary_creator") or data.get("center"),
                    "license": "nasa-check-credit" if flag else "nasa-pd",
                    "license_url": "https://www.nasa.gov/nasa-brand-center/images-and-media/",
                    "page": f"https://images.nasa.gov/details/{urllib.parse.quote(nid)}", "provider": "nasa"})
        if len(out) >= n:
            break
    for c in out:  # resolve the largest rendition <= ~large
        man = get_json(f"https://images-api.nasa.gov/asset/{urllib.parse.quote(c['nasa_id'])}") or {}
        hrefs = [i["href"] for i in man.get("collection", {}).get("items", [])]
        pick = next((h for k in ("~large.jpg", "~medium.jpg", "~orig.jpg") for h in hrefs if h.endswith(k)), None)
        c["url"] = pick.replace("http://", "https://") if pick else None
    return [c for c in out if c.get("url")]


PD_RE = re.compile(r"^(public domain|pd|cc0|cc-zero|no restrictions)", re.I)


def src_commons(q, n):
    u = "https://commons.wikimedia.org/w/api.php?" + urllib.parse.urlencode({
        "action": "query", "format": "json", "generator": "search", "gsrsearch": f"{q} filetype:bitmap",
        "gsrnamespace": 6, "gsrlimit": 40, "prop": "imageinfo", "iiprop": "url|size|extmetadata", "iiurlwidth": 1920})
    if q.startswith("Kunstformen"):
        u = "https://commons.wikimedia.org/w/api.php?" + urllib.parse.urlencode({
            "action": "query", "format": "json", "generator": "categorymembers", "gcmtitle": "Category:Kunstformen der Natur",
            "gcmtype": "file", "gcmlimit": 60, "prop": "imageinfo", "iiprop": "url|size|extmetadata", "iiurlwidth": 1920})
    d = get_json(u) or {}
    pages = sorted(d.get("query", {}).get("pages", {}).values(), key=lambda p: p.get("index", 0))
    out = []
    for p in pages:
        ii = (p.get("imageinfo") or [{}])[0]
        md = ii.get("extmetadata", {})
        lic = (md.get("LicenseShortName", {}) or {}).get("value", "")
        if not PD_RE.match(lic.strip()):
            continue
        if max(ii.get("width", 0), ii.get("height", 0)) < MIN_EDGE:
            continue
        artist = re.sub(r"<[^>]+>", "", (md.get("Artist", {}) or {}).get("value", ""))[:120]
        out.append({"id": hashlib.sha1(p["title"].encode()).hexdigest()[:12], "url": ii.get("thumburl") or ii.get("url"),
                    "title": p["title"].removeprefix("File:"), "creator": artist or None, "license": lic,
                    "license_url": (md.get("LicenseUrl", {}) or {}).get("value"),
                    "page": ii.get("descriptionurl"), "provider": "wikimedia-commons"})
        if len(out) >= n:
            break
    return out


def src_cleveland(q, n):
    u = "https://openaccess-api.clevelandart.org/api/artworks/?" + urllib.parse.urlencode(
        {"q": q, "cc0": 1, "has_image": 1, "limit": n * 2})
    d = get_json(u) or {}
    out = []
    for x in d.get("data", []):
        im = x.get("images") or {}
        url = (im.get("print") or {}).get("url") or (im.get("web") or {}).get("url")
        if not url:
            continue
        creators = ", ".join(c.get("description", "") for c in (x.get("creators") or []))[:120]
        out.append({"id": str(x["id"]), "url": url, "title": x.get("title"), "creator": creators or ", ".join(x.get("culture") or []) or None,
                    "license": "cc0", "license_url": "https://creativecommons.org/publicdomain/zero/1.0/",
                    "page": x.get("url"), "provider": "cleveland-museum-of-art"})
        if len(out) >= n:
            break
    return out


SOURCES = {"openverse": src_openverse, "nasa": src_nasa, "commons": src_commons, "cleveland": src_cleveland}


# ---------- image handling ----------

def ground_of(img):
    """Classify the frame ground from its border: seamless-light / seamless-dark / full-bleed."""
    g = img.convert("L")
    w, h = g.size
    b = max(4, min(w, h) // 25)
    strips = [g.crop((0, 0, w, b)), g.crop((0, h - b, w, h)), g.crop((0, 0, b, h)), g.crop((w - b, 0, w, h))]
    means = [ImageStat.Stat(s).mean[0] for s in strips]
    stds = [ImageStat.Stat(s).stddev[0] for s in strips]
    m, sd = sum(means) / 4, sum(stds) / 4
    spread = max(means) - min(means)
    if sd < 18 and spread < 30 and m > 185:
        return "seamless-light", round(m)
    if sd < 18 and spread < 30 and m < 45:
        return "seamless-dark", round(m)
    return "full-bleed", round(m)


def palette_of(img, k=4):
    q = img.convert("RGB").resize((64, 64)).quantize(colors=k, method=Image.Quantize.MEDIANCUT)
    pal = q.getpalette()[: k * 3]
    counts = sorted(q.getcolors(), reverse=True)
    return ["#%02x%02x%02x" % tuple(pal[i * 3: i * 3 + 3]) for _, i in counts]


def saturation_of(img):
    hsv = img.convert("RGB").resize((96, 96)).convert("HSV")
    return round(ImageStat.Stat(hsv).mean[1] / 255, 3)


def wm_thumb(url, width=1280):
    """upload.wikimedia.org original -> standard-width thumbnail (Wikimedia only serves fixed thumb widths)."""
    m = re.match(r"https://upload\.wikimedia\.org/wikipedia/commons/([0-9a-f])/([0-9a-f]{2})/([^/]+)$", url)
    if not m:
        return None
    name = m.group(3)
    suffix = ".jpg" if name.lower().endswith((".tif", ".tiff")) else ""
    return f"https://upload.wikimedia.org/wikipedia/commons/thumb/{m.group(1)}/{m.group(2)}/{name}/{width}px-{name}{suffix}"


def fetch_bytes(url):
    """Wikimedia's upload host 429s parallel clients: serialise it, prefer a 1280 px thumb, back off."""
    wm = "wikimedia.org" in url
    if wm and "/thumb/" not in url:
        th = wm_thumb(url)
        if th:
            try:
                return fetch_bytes(th)
            except Exception:  # noqa: BLE001 - thumb wider than the original, or missing: use the original
                pass
    for attempt in range(5):
        try:
            if wm:
                _wm_lock.acquire()
                time.sleep(0.4)
            req = urllib.request.Request(url, headers={"User-Agent": UA})
            with urllib.request.urlopen(req, timeout=60) as r:
                return r.read(40_000_000)
        except urllib.error.HTTPError as e:
            if e.code == 429 and attempt < 4:
                time.sleep(8 * (attempt + 1))
                continue
            raise
        finally:
            if wm:
                _wm_lock.release()


def download(c, category, source):
    name = f"{source}-{c['id']}.jpg"
    dest = os.path.join(LIB, category, name)
    try:
        if os.path.exists(dest):  # on disk from an interrupted run: rebuild its record only
            img = Image.open(dest).convert("RGB")
        else:
            img = Image.open(io.BytesIO(fetch_bytes(c["url"])))
            img.load()
    except Exception as e:  # noqa: BLE001
        print(f"  ! download {type(e).__name__} {c['url'][:90]}", file=sys.stderr)
        return None
    if img.mode not in ("RGB", "L"):
        bg = Image.new("RGB", img.size, (255, 255, 255))
        img = img.convert("RGBA")
        bg.paste(img, mask=img.split()[-1])
        img = bg
    img = img.convert("RGB")
    if max(img.size) < MIN_EDGE:
        return None
    img.thumbnail((1600, 1600), Image.LANCZOS)
    os.makedirs(os.path.join(LIB, category, "thumbs"), exist_ok=True)
    if not os.path.exists(dest):
        img.save(dest, "JPEG", quality=84, optimize=True, progressive=True)
    th = img.copy()
    th.thumbnail((320, 320), Image.LANCZOS)
    th.save(os.path.join(LIB, category, "thumbs", name), "JPEG", quality=78)
    ground, lum = ground_of(img)
    rec = {k: c.get(k) for k in ("title", "creator", "license", "license_url", "page", "provider")}
    rec.update({"file": f"assets/library/{category}/{name}", "thumb": f"assets/library/{category}/thumbs/{name}",
                "category": category, "source": source, "w": img.size[0], "h": img.size[1],
                "aspect": round(img.size[0] / img.size[1], 3), "ground": ground, "ground_luma": lum,
                "palette": palette_of(img), "saturation": saturation_of(img), "source_url": c["url"]})
    return rec


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--only", help="comma list of categories")
    ap.add_argument("--query")
    ap.add_argument("--category")
    ap.add_argument("--source", default="openverse")
    ap.add_argument("--per", type=int)
    a = ap.parse_args()
    cfg = json.load(open(os.path.join(ROOT, "assets", "sources", "queries.json")))["categories"]
    jobs = []
    if a.query:
        jobs.append((a.category or "misc", a.source, a.query))
    else:
        only = set(a.only.split(",")) if a.only else None
        for cat, spec in cfg.items():
            if only and cat not in only:
                continue
            for src, qs in spec.items():
                if src in SOURCES:
                    jobs += [(cat, src, q) for q in qs]
    os.makedirs(LIB, exist_ok=True)
    seen = set()
    if os.path.exists(MANIFEST):
        for line in open(MANIFEST):
            r = json.loads(line)
            seen.add(r["source_url"])
    pool = cf.ThreadPoolExecutor(8)
    wm_pool = cf.ThreadPoolExecutor(1)  # Wikimedia gets its own lane so it never blocks other hosts
    futs = []
    mf = open(MANIFEST, "a")
    added = [0]

    def work(c, cat, src):
        rec = download(c, cat, src)
        if rec:
            rec["query"] = c["query"]
            with _mf_lock:
                mf.write(json.dumps(rec) + "\n")
                mf.flush()
                added[0] += 1
    for cat, src, q in jobs:
        n = a.per or PER[src]
        cands = SOURCES[src](q, n)
        new = [c for c in cands if c["url"] not in seen]
        seen.update(c["url"] for c in new)
        print(f"[{cat}] {src}: '{q}' -> {len(cands)} candidates, {len(new)} new", flush=True)
        for c in new:
            c["query"] = q
            futs.append((wm_pool if "wikimedia.org" in c["url"] else pool).submit(work, c, cat, src))
    cf.wait(futs)
    mf.close()
    print(f"added {added[0]} files -> {MANIFEST}")


if __name__ == "__main__":
    main()
