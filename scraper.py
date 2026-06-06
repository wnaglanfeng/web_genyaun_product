"""
100gsoft.cn 产品信息爬虫
用法: python scraper.py <产品页面URL>
示例: python scraper.py https://www.100gsoft.cn/sjsoft/xxxxx.html
"""

import sys
import re
import json
import requests
from bs4 import BeautifulSoup

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36'
}


def scrape_product(url):
    """爬取单个产品页面，返回产品信息字典"""
    print(f'正在请求: {url}')
    resp = requests.get(url, headers=HEADERS, timeout=15)
    if resp.status_code != 200:
        print(f'请求失败，状态码: {resp.status_code}')
        return None

    soup = BeautifulSoup(resp.text, 'html.parser')

    info = {
        'name': '',
        'icon': '',
        'description': '',
        'features': [],
        'category': '',
        'platforms': [],
        'downloads': [],
        'color': '#3b82f6',
    }

    # --- 产品名称 ---
    title_tag = soup.select_one('h1')
    if not title_tag:
        title_tag = soup.select_one('title')
    if title_tag:
        info['name'] = title_tag.get_text(strip=True)
    else:
        # 从 URL 中提取名称
        info['name'] = url.rstrip('/').rsplit('/', 1)[-1].replace('.html', '')

    # --- 图标 ---
    icon_tag = soup.select_one('.app-icon img, .soft-icon img, .detail-icon img, img[src*="icon"]')
    if not icon_tag:
        icon_tag = soup.select_one('.detail-img img, .app-img img, .soft-img img')
    if not icon_tag:
        # 尝试找第一个合适的图片
        for img in soup.select('img'):
            src = img.get('src', '')
            if src and ('logo' in src.lower() or 'icon' in src.lower() or 'app' in src.lower()):
                icon_tag = img
                break
    if icon_tag:
        src = icon_tag.get('src', '')
        if src:
            if src.startswith('//'):
                src = 'https:' + src
            elif src.startswith('/'):
                src = 'https://www.100gsoft.cn' + src
            info['icon'] = src

    # --- 描述 ---
    desc_tag = soup.select_one('.soft-description, .app-description, .detail-description, .intro-text')
    if not desc_tag:
        desc_tag = soup.select_one('meta[name="description"]')
        if desc_tag:
            info['description'] = desc_tag.get('content', '')
    if desc_tag and not info['description']:
        info['description'] = desc_tag.get_text(strip=True)

    if not info['description']:
        # 尝试从页面文本中提取
        text = soup.get_text()
        # 找"简介"或"介绍"附近的段落
        for p in soup.select('p'):
            txt = p.get_text(strip=True)
            if len(txt) > 30 and ('测速' in txt or '功能' in txt or '支持' in txt):
                info['description'] = txt
                break

    # --- 功能/特性 ---
    feature_tags = soup.select('.feature-list li, .func-list li, .tag-list .tag, .feature-item')
    for tag in feature_tags:
        txt = tag.get_text(strip=True)
        if txt and len(txt) < 20:
            info['features'].append(txt)

    # --- 分类 ---
    cat_tag = soup.select_one('.category, .soft-category, .app-category, .breadcrumb li:last-child')
    if cat_tag:
        info['category'] = cat_tag.get_text(strip=True)
    if not info['category']:
        # 从面包屑中提取
        bread = soup.select('.breadcrumb a, .breadcrumb span')
        if len(bread) >= 2:
            info['category'] = bread[-1].get_text(strip=True)

    # --- 平台 ---
    platform_tags = soup.select('.platform-list span, .support-platform span, .os-list span')
    for pt in platform_tags:
        txt = pt.get_text(strip=True)
        if txt:
            info['platforms'].append(txt)
    if not info['platforms']:
        # 从下载链接中推断
        page_text = soup.get_text().lower()
        if 'ios' in page_text or 'iphone' in page_text:
            info['platforms'].append('iOS')
        if 'android' in page_text:
            info['platforms'].append('Android')

    # --- 下载链接 ---
    download_links = soup.select('a[href*="download"], a[href*="itunes"], a[href*="play.google"], .download-btn')
    if not download_links:
        download_links = soup.select('a.btn, a[class*="down"], a[class*="btn"]')
    seen = set()
    for link in download_links:
        href = link.get('href', '')
        label = link.get_text(strip=True) or '下载'
        if href and href not in seen:
            seen.add(href)
            if href.startswith('/'):
                href = 'https://www.100gsoft.cn' + href
            elif href.startswith('//'):
                href = 'https:' + href
            platform = 'iOS' if 'ios' in label.lower() or 'app store' in label.lower() else 'Android'
            info['downloads'].append({
                'platform': platform,
                'url': href,
                'label': label
            })

    # 如果没有下载链接，把 URL 本身作为下载页
    if not info['downloads']:
        info['downloads'] = [
            {'platform': 'iOS', 'url': url, 'label': '查看详情' if 'iOS' in str(info['platforms']) else 'App Store 下载'},
            {'platform': 'Android', 'url': url, 'label': '查看详情' if 'Android' in str(info['platforms']) else 'Google Play 下载'},
        ]

    # --- 清理 ---
    # 去掉过长的描述
    if info['description'] and len(info['description']) > 200:
        info['description'] = info['description'][:200] + '...'

    # 如果没有描述，用名称
    if not info['description']:
        info['description'] = f'{info["name"]}，一款优秀的手机应用。'

    # 如果没有功能，用默认值
    if not info['features']:
        info['features'] = ['请补充功能描述']

    # 如果没有分类
    if not info['category']:
        info['category'] = '工具'

    # 如果没有平台
    if not info['platforms']:
        info['platforms'] = ['iOS', 'Android']

    return info


def print_product(info):
    """打印产品信息"""
    print('\n' + '=' * 60)
    print(f'产品名称: {info["name"]}')
    print(f'图标地址: {info["icon"]}')
    print(f'分类: {info["category"]}')
    print(f'描述: {info["description"]}')
    print(f'功能: {", ".join(info["features"])}')
    print(f'平台: {", ".join(info["platforms"])}')
    print(f'下载:')
    for dl in info['downloads']:
        print(f'  - {dl["label"]}: {dl["url"]}')
    print('=' * 60)


def to_js_format(info, product_id=1):
    """输出为 JS 产品数据格式"""
    colors = ['#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#059669', '#d946ef', '#0ea5e9', '#6366f1']
    color = colors[(product_id - 1) % len(colors)]

    print('\n--- JS 产品数据 ---')
    print(f'  {{')
    print(f'    id: {product_id},')
    print(f'    name: \'{info["name"]}\',')
    print(f'    subtitle: \'{info["name"]}\',')
    print(f'    icon: \'{info["icon"]}\',')
    print(f'    description: \'{info["description"]}\',')
    print(f'    features: {json.dumps(info["features"], ensure_ascii=False)},')
    print(f'    category: \'{info["category"]}\',')
    print(f'    platforms: {json.dumps(info["platforms"], ensure_ascii=False)},')
    print(f'    downloads: {json.dumps(info["downloads"], ensure_ascii=False, indent=6)},')
    print(f'    color: \'{color}\',')
    print(f'  }},')


if __name__ == '__main__':
    if len(sys.argv) < 2:
        print('用法: python scraper.py <产品页面URL>')
        print('示例: python scraper.py https://www.100gsoft.cn/sjsoft/512688.html')
        sys.exit(1)

    url = sys.argv[1]
    product = scrape_product(url)

    if product:
        print_product(product)
        to_js_format(product)
    else:
        print('爬取失败，请检查 URL 是否正确或页面是否需要登录。')
