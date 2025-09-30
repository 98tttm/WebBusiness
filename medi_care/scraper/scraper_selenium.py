# scraper/scraper_selenium.py
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from webdriver_manager.chrome import ChromeDriverManager
from selenium.webdriver.common.by import By
import time, json, os
from urllib.parse import urljoin
import requests

BASE = "https://nhathuoclongchau.com.vn"
OUT = "products_selenium.json"

def create_driver(headless=True):
    opts = Options()
    if headless:
        opts.add_argument("--headless=new")
    opts.add_argument("--no-sandbox")
    opts.add_argument("--disable-dev-shm-usage")
    driver = webdriver.Chrome(ChromeDriverManager().install(), options=opts)
    return driver

def scrape_category_selenium(cat_url, max_pages=3):
    driver = create_driver()
    driver.get(cat_url)
    time.sleep(2)
    products = []
    # scroll to load lazy items if needed
    driver.execute_script("window.scrollTo(0, document.body.scrollHeight);")
    time.sleep(1)
    cards = driver.find_elements(By.CSS_SELECTOR, "a.block.px-3")  # adjust
    print("found", len(cards))
    for c in cards:
        try:
            name = c.find_element(By.CSS_SELECTOR, "h3").text
            link = c.get_attribute('href')
            img = c.find_element(By.CSS_SELECTOR, "img").get_attribute('src')
            price = None
            try:
                price = c.find_element(By.CSS_SELECTOR, ".aBrP0").text
            except:
                price = None
            products.append({
                "name": name,
                "link": link,
                "image_url": urljoin(BASE, img) if img else None,
                "price_text": price
            })
        except Exception as e:
            print("card error", e)
    driver.quit()
    with open(OUT, 'w', encoding='utf-8') as f:
        json.dump(products, f, ensure_ascii=False, indent=2)
    print("Saved", OUT)

if __name__ == '__main__':
    scrape_category_selenium("https://nhathuoclongchau.com.vn/thuoc/thuoc-khang-sinh-khang-nam")
