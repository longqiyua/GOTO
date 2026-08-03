#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Download Google Fonts CSS and referenced font files for local/self-hosted usage.
Run from repo root or GOTO Page directory.
"""
import os
import re
import sys
import urllib.request
import urllib.error

FONTS_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'fonts')
CSS_FILE = os.path.join(FONTS_DIR, 'fonts-local.css')

GOOGLE_CSS_URL = (
    "https://fonts.googleapis.com/css2?"
    "family=Inter:wght@400;500;600;700;800;900&"
    "family=JetBrains+Mono:wght@400;500;600;700&"
    "family=Noto+Sans+SC:wght@300;400;500;700;900&"
    "family=Nunito:wght@300;400;500;600;700;800;900&"
    "family=Poppins:wght@400;500;600;700;800;900&"
    "family=Geist:wght@100..900&"
    "display=swap"
)


def fetch_text(url):
    headers = {
        'User-Agent': (
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 '
            '(KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36'
        )
    }
    req = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(req, timeout=30) as resp:
        return resp.read().decode('utf-8')


def fetch_binary(url):
    headers = {
        'User-Agent': (
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 '
            '(KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36'
        )
    }
    req = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(req, timeout=60) as resp:
        return resp.read()


def main():
    os.makedirs(FONTS_DIR, exist_ok=True)
    print(f'Downloading CSS from {GOOGLE_CSS_URL}')
    try:
        css = fetch_text(GOOGLE_CSS_URL)
    except urllib.error.HTTPError as e:
        print(f'Failed to fetch CSS: {e}', file=sys.stderr)
        return 1

    urls = re.findall(r'src:\s*url\((https://[^)]+\.woff2)\)\s*format\(\'woff2\'\)', css)
    print(f'Found {len(urls)} font files to download')

    for url in urls:
        filename = url.split('/')[-1]
        if '?' in filename:
            filename = filename.split('?')[0]
        local_path = os.path.join(FONTS_DIR, filename)
        if os.path.exists(local_path):
            print(f'  exists {filename}')
            continue
        print(f'  downloading {filename} ...')
        try:
            data = fetch_binary(url)
            with open(local_path, 'wb') as f:
                f.write(data)
        except Exception as e:
            print(f'  failed {filename}: {e}', file=sys.stderr)

    # Rewrite CSS to use local paths
    def repl(m):
        url = m.group(1)
        filename = url.split('/')[-1]
        if '?' in filename:
            filename = filename.split('?')[0]
        return f"src: url('{filename}') format('woff2')"

    local_css = re.sub(r'src:\s*url\((https://[^)]+\.woff2)\)\s*format\(\'woff2\'\)', repl, css)
    with open(CSS_FILE, 'w', encoding='utf-8') as f:
        f.write(local_css)
    print(f'Wrote {CSS_FILE}')
    return 0


if __name__ == '__main__':
    sys.exit(main())
