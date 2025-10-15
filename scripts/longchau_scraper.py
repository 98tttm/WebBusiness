"""Crawler for nhathuoclongchau.com.vn product catalog.

This script walks through the public sitemaps, pulls product detail pages,
and normalises the data into the schema requested by the client.
"""

from __future__ import annotations

import argparse
import csv
import itertools
import json
import random
import re
import time
from dataclasses import dataclass, asdict
from datetime import datetime, timedelta, timezone
from hashlib import md5
from typing import Dict, Iterable, List, Optional
from urllib.parse import urlparse
import xml.etree.ElementTree as ET
import unicodedata

import requests
from bs4 import BeautifulSoup
from bs4.element import NavigableString, Tag

SITEMAP_INDEX = "https://nhathuoclongchau.com.vn/sitemap.xml"
DEFAULT_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/118.0.0.0 Safari/537.36"
    ),
    "Accept-Language": "vi,en;q=0.9",
}

SESSION = requests.Session()
SESSION.headers.update(DEFAULT_HEADERS)

# Common herb keywords (Vietnamese + English).
HERB_KEYWORDS = {
    "ginkgo",
    "nhân sâm",
    "ginseng",
    "sâm",
    "hoàng kỳ",
    "artichoke",
    "atisho",
    "curcumin",
    "tam thất",
    "cam thảo",
    "thảo quyết minh",
    "milk thistle",
    "echinacea",
    "elderberry",
    "hawthorn",
    "hibiscus",
    "tảo",
    "spirulina",
    "aloe",
    "nha đam",
    "ginger",
    "gừng",
    "tỏi",
    "garlic",
    "saffron",
    "tràm",
    "peppermint",
    "chùm ngây",
    "moringa",
    "đinh lăng",
    "cao",
}

NON_PRODUCT_SEGMENTS = {
    "bai-viet",
    "benh",
    "tin-tuc",
    "cam-nang",
    "khuyen-mai",
    "thu-vien",
    "dich-vu",
}


@dataclass
class ProductRecord:
    raw_id: str
    name: str
    brand: str
    country: Optional[str]
    description: str
    price: int
    discount: int
    stock: int
    unit: Optional[str]
    image: Optional[str]
    gallery: List[str]
    usage: str
    ingredients: str
    warnings: str
    prescriptionRequired: str
    createDate: str
    expiredDate: str
    categoryId: str
    activeIngredientIds: List[str]
    herbIds: List[str]

    def to_dict(self) -> dict:
        data = asdict(self)
        data["_id"] = data.pop("raw_id")
        order = [
            "_id",
            "name",
            "brand",
            "country",
            "description",
            "price",
            "discount",
            "stock",
            "unit",
            "image",
            "gallery",
            "usage",
            "ingredients",
            "warnings",
            "prescriptionRequired",
            "createDate",
            "expiredDate",
            "categoryId",
            "activeIngredientIds",
            "herbIds",
        ]
        return {key: data.get(key) for key in order}


@dataclass
class CategoryRecord:
    raw_id: str
    name: str
    slug: str
    parent_id: Optional[str]

    def to_dict(self) -> dict:
        return {
            "_id": self.raw_id,
            "name": self.name,
            "slug": self.slug,
            "parentId": self.parent_id,
        }


CATEGORY_REGISTRY: Dict[str, CategoryRecord] = {}


def fetch_url(url: str, *, sleep: float = 0.5) -> requests.Response:
    """GET helper with basic throttling."""
    response = SESSION.get(url, timeout=30)
    time.sleep(sleep)
    response.raise_for_status()
    return response


def iter_sitemap_urls() -> Iterable[str]:
    """Yield product URLs discovered through the sitemap index."""
    resp = fetch_url(SITEMAP_INDEX)
    sitemap_urls = extract_loc_entries(resp.text, entry_tag="sitemap")
    for sitemap_url in sitemap_urls:
        sitemap_resp = fetch_url(sitemap_url)
        for loc in extract_loc_entries(sitemap_resp.text, entry_tag="url"):
            if is_product_url(loc):
                yield loc


def extract_loc_entries(xml_text: str, entry_tag: str) -> List[str]:
    """Grab <loc> entries for either sitemap or url elements."""
    try:
        root = ET.fromstring(xml_text)
    except ET.ParseError:
        return []
    ns = {"sm": "http://www.sitemaps.org/schemas/sitemap/0.9"}
    results: List[str] = []
    for node in root.findall(f"sm:{entry_tag}/sm:loc", ns):
        if node.text:
            results.append(node.text.strip())
    return results


def is_product_url(url: str) -> bool:
    """Best-effort filter to keep product detail pages only."""
    parsed = urlparse(url)
    path = parsed.path
    if not path.endswith(".html"):
        return False
    if any(f"/{segment}/" in path for segment in NON_PRODUCT_SEGMENTS):
        return False
    return path.count("/") >= 2


def extract_next_data(html_text: str) -> dict:
    """Parse the __NEXT_DATA__ JSON blob from the rendered HTML."""
    soup = BeautifulSoup(html_text, "html.parser")
    script_tag = soup.find("script", id="__NEXT_DATA__")
    if script_tag is None or not script_tag.string:
        raise ValueError("Unable to locate __NEXT_DATA__ payload")
    return json.loads(script_tag.string)


def clean_html_fragment(fragment: Optional[str]) -> str:
    """Sanitise an HTML fragment and keep lightweight formatting tags."""
    if not fragment:
        return ""
    soup = BeautifulSoup(fragment, "html.parser")
    for tag in soup(["script", "style", "meta"]):
        tag.decompose()
    allowed_attrs = {
        "a": {"href"},
        "img": {"src", "alt"},
    }
    for tag in soup.find_all(True):
        attrs = allowed_attrs.get(tag.name, set())
        tag.attrs = {key: value for key, value in tag.attrs.items() if key in attrs}
    html = soup.decode_contents()
    html = re.sub(r">\s+<", "><", html)
    html = re.sub(r"\n{3,}", "\n\n", html)
    return html.strip()


def classify_ingredients(ingredient_items: Iterable[dict]) -> tuple[List[str], List[str]]:
    """Split ingredient names into likely active ingredients vs herbs."""
    active_ids: List[str] = []
    herb_ids: List[str] = []
    for item in ingredient_items or []:
        name = item.get("name", "")
        slug = item.get("slug", "")
        slug_tail = slugify(slug.split("/")[-1] if slug else name)
        norm_name = f"{name} {slug_tail}".lower()
        bucket = herb_ids if any(keyword in norm_name for keyword in HERB_KEYWORDS) else active_ids
        if slug_tail:
            bucket.append(slug_tail)
    active_ids = list(dict.fromkeys(active_ids))
    herb_ids = list(dict.fromkeys(herb_ids))
    return active_ids, herb_ids


def slugify(value: str) -> str:
    """Lowercase ASCII slug helper."""
    normalized = unicodedata.normalize("NFKD", value or "")
    normalized = normalized.replace("đ", "d").replace("Đ", "D")
    ascii_text = "".join(ch for ch in normalized if ch.isascii())
    ascii_text = ascii_text.lower()
    ascii_text = re.sub(r"[^a-z0-9]+", "-", ascii_text)
    slug = ascii_text.strip("-")
    return slug or "unknown"


def hash_category_id(slug: str) -> str:
    """Deterministically derive a 24-character pseudo ObjectId from the category slug."""
    digest = md5(slug.encode("utf-8")).hexdigest()
    return digest[:24]


def register_categories(page_props: dict) -> None:
    """Collect category metadata for later export."""
    categories = (page_props.get("product") or {}).get("categories") or []
    level_tracker: Dict[int, str] = {}
    for item in categories:
        slug = (item.get("slug") or "").strip().strip("/")
        if not slug:
            continue
        name = (item.get("name") or "").strip()
        level_value = item.get("level")
        if isinstance(level_value, str) and level_value.isdigit():
            level = int(level_value)
        elif isinstance(level_value, (int, float)):
            level = int(level_value)
        else:
            level = None
        parent_slug = ""
        if isinstance(level, int) and level > 1:
            parent_slug = level_tracker.get(level - 1, "")
        elif "/" in slug:
            parent_slug = slug.rsplit("/", 1)[0]
        parent_id = hash_category_id(parent_slug) if parent_slug else None
        record = CategoryRecord(
            raw_id=hash_category_id(slug),
            name=name,
            slug=slug,
            parent_id=parent_id,
        )
        existing = CATEGORY_REGISTRY.get(slug)
        if existing is None:
            CATEGORY_REGISTRY[slug] = record
        else:
            name_to_use = existing.name or name
            parent_to_use = existing.parent_id or parent_id
            CATEGORY_REGISTRY[slug] = CategoryRecord(
                raw_id=existing.raw_id,
                name=name_to_use,
                slug=existing.slug,
                parent_id=parent_to_use,
            )
        if isinstance(level, int):
            level_tracker[level] = slug


def build_product_record(next_data: dict, url: str) -> ProductRecord:
    page_props = next_data["props"]["pageProps"]
    product = page_props["product"]
    transformed = page_props.get("transformedProductData", {})
    content = page_props.get("content", {})
    default_price = transformed.get("defaultPrice") or (product.get("prices") or [{}])[0]
    promo = (page_props.get("initPromotionPrices") or [{}])[0]
    price = int(default_price.get("price") or promo.get("price") or 0)
    final_price = int(promo.get("finalPrice") or price)
    discount_value = max(0, price - final_price)
    stock = 1 if default_price.get("isInventory") else 0
    unit = default_price.get("measureUnitName") or product.get("dosageForm")

    ingredient_items = product.get("ingredient") or []
    active_ids, herb_ids = classify_ingredients(ingredient_items)
    parts: List[str] = []
    for item in ingredient_items:
        name = (item.get("name") or "").strip()
        amount = (item.get("shortDescription") or "").strip()
        if name and amount:
            parts.append(f"{name} ({amount})")
        elif name:
            parts.append(name)
    ingredient_summary = ", ".join(parts)

    category = transformed.get("highestLevelCategory") or (product.get("categories") or [{}])[-1]
    category_slug = category.get("slug") or page_props.get("breadcrumbs", [{}])[-1].get("slug") or urlparse(url).path

    description = clean_html_fragment(content.get("description") or page_props.get("seo", {}).get("description"))
    usage = clean_html_fragment(content.get("usage") or product.get("usage"))
    warnings = clean_html_fragment(content.get("careful") or product.get("contraindication") or product.get("adverseEffect"))

    now = datetime.now(timezone.utc)
    create_date = now - timedelta(days=random.randint(0, 180))
    expire_delta = timedelta(days=random.randint(365, 720))

    return ProductRecord(
        raw_id=product.get("sku") or md5(url.encode("utf-8")).hexdigest()[:24],
        name=product.get("webName") or product.get("name") or "",
        brand=product.get("brand") or "",
        country=product.get("manufactor") or product.get("brandOrigin"),
        description=description,
        price=final_price,
        discount=discount_value,
        stock=stock,
        unit=unit,
        image=product.get("primaryImage"),
        gallery=list(dict.fromkeys(transformed.get("galleryImgUrls") or product.get("secondaryImages") or [])),
        usage=usage,
        ingredients=ingredient_summary,
        warnings=warnings,
        prescriptionRequired="Có" if product.get("prescription") else "Không",
        createDate=create_date.isoformat(),
        expiredDate=(create_date + expire_delta).isoformat(),
        categoryId=hash_category_id(category_slug),
        activeIngredientIds=active_ids,
        herbIds=herb_ids,
    )


def crawl_products(limit: Optional[int] = None) -> List[ProductRecord]:
    CATEGORY_REGISTRY.clear()
    results: List[ProductRecord] = []
    for url in itertools.islice(iter_sitemap_urls(), 0, limit):
        try:
            html_resp = fetch_url(url)
            next_data = extract_next_data(html_resp.text)
            page_props = next_data.get("props", {}).get("pageProps", {})
            if "product" not in page_props:
                print(f"[SKIP] {url} (no product data)")
                continue
            register_categories(page_props)
            record = build_product_record(next_data, url)
            results.append(record)
            print(f"[OK ] {url}")
        except Exception as exc:  # noqa: BLE001
            print(f"[ERR] {url} -> {exc}")
    return results


def main() -> None:
    parser = argparse.ArgumentParser(description="Crawl nhathuoclongchau.com.vn product data.")
    parser.add_argument("--limit", type=int, default=None, help="Maximum number of products to crawl.")
    parser.add_argument("--output", default="longchau_products.json", help="Where to store the JSON file.")
    parser.add_argument(
        "--categories-output",
        default="longchau_categories.json",
        help="Where to store the categories JSON file.",
    )
    parser.add_argument("--csv", dest="csv_path", default=None, help="Optional CSV export path.")
    parser.add_argument(
        "--skip-products",
        action="store_true",
        help="Skip writing the products JSON/CSV outputs (still crawls for categories).",
    )
    parser.add_argument("--indent", type=int, default=2, help="Indent JSON output (use 0 for compact).")
    args = parser.parse_args()

    records = crawl_products(args.limit)
    indent = None if args.indent <= 0 else args.indent
    if not args.skip_products and args.output:
        out_payload = [record.to_dict() for record in records]
        with open(args.output, "w", encoding="utf-8") as fh:
            json.dump(out_payload, fh, ensure_ascii=False, indent=indent)
        print(f"Saved {len(records)} records to {args.output}")
        if args.csv_path:
            fieldnames = list(out_payload[0].keys()) if out_payload else []
            with open(args.csv_path, "w", encoding="utf-8", newline="") as csv_file:
                writer = csv.DictWriter(csv_file, fieldnames=fieldnames)
                writer.writeheader()
                writer.writerows(out_payload)
            print(f"Saved {len(records)} records to {args.csv_path}")
    elif args.skip_products and args.csv_path:
        print("Skipping CSV output because products export is disabled (--skip-products).")

    category_payload = [record.to_dict() for record in CATEGORY_REGISTRY.values()]
    category_payload.sort(key=lambda item: item["slug"])
    if args.categories_output:
        with open(args.categories_output, "w", encoding="utf-8") as fh:
            json.dump(category_payload, fh, ensure_ascii=False, indent=indent)
        print(f"Saved {len(category_payload)} categories to {args.categories_output}")


if __name__ == "__main__":
    main()
