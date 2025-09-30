import requests, time, json, os
from bs4 import BeautifulSoup
from urllib.parse import urljoin
from slugify import slugify

BASE = "https://nhathuoclongchau.com.vn"
HEADERS = {
    "User-Agent": "MediCareScraper/1.0 (+https://yourdomain.example) Python-requests"
}

OUT_JSON = "products_longchau.json"
IMG_DIR = "images"
os.makedirs(IMG_DIR, exist_ok=True)

def fetch(url):
    r = requests.get(url, headers=HEADERS, timeout=15)
    r.raise_for_status()
    return r.text

def parse_product_card(card):
    # **PHẢI CHỈNH** selectors theo cấu trúc site thực tế.
    # Ví dụ giả định:
    name = card.select_one('h3.product-title') or card.select_one('a.block.px-3 h3')
    link = card.select_one('a') and card.select_one('a').get('href')
    price_el = card.select_one('.price') or card.select_one('.aBrP0')
    old_price_el = card.select_one('.old-price')
    img_el = card.select_one('img')
    return {
        "name": name.text.strip() if name else None,
        "link": urljoin(BASE, link) if link else None,
        "price": parse_price(price_el.text) if price_el else None,
        "old_price": parse_price(old_price_el.text) if old_price_el else None,
        "image_url": urljoin(BASE, img_el.get('src')) if img_el and img_el.get('src') else None
    }

def parse_price(text):
    if not text: return 0.0
    import re
    s = re.sub(r'[^\d.,]', '', text).replace(',', '')
    try:
        return float(s)
    except:
        return 0.0

def scrape_category(cat_url, max_pages=5, delay=1.5):
    products = []
    for page in range(1, max_pages+1):
        url = f"{cat_url}?page={page}"
        print("Fetching", url)
        html = fetch(url)
        soup = BeautifulSoup(html, 'lxml')
        # **PHẢI CHỈNH** selector các thẻ card sản phẩm:
        cards = soup.select('div.product-card') or soup.select('a.block.px-3')
        if not cards:
            print("Không tìm thấy product cards - cần chỉnh selector.")
            break
        for c in cards:
            item = parse_product_card(c)
            # fetch detail page for description, stock, attributes
            if item.get('link'):
                try:
                    detail = fetch(item['link'])
                    dsoup = BeautifulSoup(detail, 'lxml')
                    desc = dsoup.select_one('.product-desc') or dsoup.select_one('#product-description')
                    brand = dsoup.select_one('.brand') and dsoup.select_one('.brand').text.strip()
                    # images gallery
                    imgs = [img.get('src') for img in dsoup.select('.product-gallery img') if img.get('src')]
                    item.update({
                        "description": desc.text.strip() if desc else '',
                        "brand": brand,
                        "images": [urljoin(BASE, i) for i in imgs],
                        "category": dsoup.select_one('.breadcrumb li:nth-last-child(2)') and dsoup.select_one('.breadcrumb li:nth-last-child(2)').text.strip()
                    })
                except Exception as e:
                    print("Detail error:", e)
            products.append(item)
        time.sleep(delay)
    return products

def download_image(url, dest_folder=IMG_DIR):
    if not url:
        return None
    filename = os.path.join(dest_folder, os.path.basename(url.split('?')[0]))
    if os.path.exists(filename):
        return filename
    try:
        r = requests.get(url, headers=HEADERS, stream=True, timeout=15)
        r.raise_for_status()
        with open(filename, 'wb') as f:
            for chunk in r.iter_content(1024*8):
                f.write(chunk)
        return filename
    except Exception as e:
        print("Image download error:", e)
        return None

if __name__ == '__main__':
    # ví dụ: kategori "thuốc kháng sinh" (bạn có thể đổi URL)
    cat = "https://nhathuoclongchau.com.vn/thuoc/thuoc-khang-sinh-khang-nam"
    products = scrape_category(cat, max_pages=5)
    # download first image each product
    for p in products:
        if p.get('image_url'):
            p['local_image'] = download_image(p['image_url'])
    with open(OUT_JSON, 'w', encoding='utf-8') as f:
        json.dump(products, f, ensure_ascii=False, indent=2)
    print("Saved", OUT_JSON)
