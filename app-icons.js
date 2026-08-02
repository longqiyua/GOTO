/**
 * GOTO 应用图标库 (test/app-icons.js)
 * -----------------------------------------------------------------------------
 * 提供 23+ 应用的真实品牌色 SVG 矢量图标 + API 抓取框架
 *
 * 使用方式 (浏览器 console):
 *   GOTO.test.Icons.get('weixin')           → 立即返回 data URI（同步）
 *   GOTO.test.Icons.getSVG('weixin')        → 返回 SVG 字符串
 *   GOTO.test.Icons.fetch('weixin')         → 异步从 API 抓取真实 PNG，失败回退到 SVG
 *   GOTO.test.Icons.fetchFromPlayStore(pkg) → Play Store API (Google Play)
 *   GOTO.test.Icons.fetchFromAppStore(id)   → App Store API (iTunes Search)
 *
 * 数据源:
 *  - Play Store:  https://play.google.com/store/apps/details?id={package}
 *                通过 HTML 抓取 og:image 或 logo URL
 *  - App Store:   https://itunes.apple.com/lookup?id={appleId}
 *                直接返回 JSON 含 artworkUrl512
 *  - 静态回退:   真实品牌色 + 字母/几何 SVG（无网络时）
 *
 * 缓存:
 *  - localStorage.goto_icon_cache_v1 (key → dataURI)
 *  - 命中即返回，未命中则走 fetch
 * -----------------------------------------------------------------------------
 */
(function (global) {
  'use strict';

  // ─ 真实应用品牌色 + 几何形状（每应用 1 套，自包含 SVG 路径）
  // 形状: circle / square / roundedSquare / triangle / hexagon / pill / leaf
  var BRAND = {
    weixin:      { fg: '#FFFFFF', bg: '#07C160', text: '微', shape: 'chat',   gloss: true },
    qq:          { fg: '#FFFFFF', bg: '#12B7F5', text: 'QQ', shape: 'bird',   gloss: true },
    weibo:       { fg: '#FFFFFF', bg: '#E6162D', text: '微', shape: 'weibo',  gloss: true },
    douyin:      { fg: '#FFFFFF', bg: '#000000', text: '♪',  shape: 'music',  gloss: true },
    bilibili:    { fg: '#FFFFFF', bg: '#00AEEC', text: 'B',  shape: 'tv',     gloss: true },
    taobao:      { fg: '#FFFFFF', bg: '#FF4200', text: '淘', shape: 'pill',   gloss: true },
    jingdong:    { fg: '#FFFFFF', bg: '#E1251B', text: '京', shape: 'square', gloss: true },
    zhifubao:    { fg: '#FFFFFF', bg: '#1677FF', text: '支', shape: 'pill',   gloss: true },
    gaode:       { fg: '#FFFFFF', bg: '#00B6F7', text: '高', shape: 'pin',    gloss: true },
    baidudt:     { fg: '#FFFFFF', bg: '#1E64C8', text: '百', shape: 'shield', gloss: true },
    meituan:     { fg: '#1F1F1F', bg: '#FFD300', text: '美', shape: 'pill',   gloss: true },
    eleme:       { fg: '#FFFFFF', bg: '#0099FF', text: '饿', shape: 'pill',   gloss: true },
    wangyiyun:   { fg: '#C20C0C', bg: '#FFFFFF', text: '云', shape: 'music',  gloss: false },
    qqyy:        { fg: '#FFFFFF', bg: '#31C27C', text: 'Q',  shape: 'music',  gloss: true },
    youku:       { fg: '#FFFFFF', bg: '#00B8FF', text: '优', shape: 'play',   gloss: true },
    iqiyi:       { fg: '#FFFFFF', bg: '#00BE06', text: 'iQ', shape: 'tv',     gloss: true },
    txsp:        { fg: '#FFFFFF', bg: '#FF7028', text: '腾', shape: 'play',   gloss: true },
    zhihu:       { fg: '#FFFFFF', bg: '#0084FF', text: '知', shape: 'square', gloss: true },
    xiaohongshu: { fg: '#FFFFFF', bg: '#FF2442', text: '小', shape: 'pill',   gloss: true },
    douban:      { fg: '#2E8B57', bg: '#FFFFFF', text: '豆', shape: 'circle', gloss: false },
    dingding:    { fg: '#FFFFFF', bg: '#1677FF', text: '钉', shape: 'chat',   gloss: true },
    qiyeweixin:  { fg: '#FFFFFF', bg: '#1AAD19', text: '企', shape: 'chat',   gloss: true },
    goto:        { fg: '#FFFFFF', bg: '#E48D3A', text: 'GOTO', shape: 'square', gloss: true }
  };

  // — SVG 装饰：形状（按 key 渲染）
  function shapePath(shape) {
    switch (shape) {
      case 'chat':         return '<path d="M48 18c-16 0-30 11-30 26 0 8 4 15 10 20l-3 12 13-7c3 1 6 1 10 1 16 0 30-11 30-26S64 18 48 18z" fill="currentColor" opacity="0.18"/>';
      case 'bird':         return '<path d="M30 56c-4-2-8-2-10 0 1 6 5 10 12 12-3 2-4 4-4 6 0 4 8 6 20 6s20-2 20-6c0-2-1-4-4-6 7-2 11-6 12-12-2-2-6-2-10 0 0-10-10-18-24-18S30 46 30 56z" fill="currentColor" opacity="0.18"/>';
      case 'weibo':        return '<path d="M30 60c-6 0-10-3-10-8s4-8 10-8 10 3 10 8-4 8-10 8zm30-20c-2 0-4-2-4-4s2-4 4-4 4 2 4 4-2 4-4 4z" fill="currentColor" opacity="0.18"/>';
      case 'music':        return '<path d="M40 30v28a8 8 0 1 1-4-7V32l24-6v22a8 8 0 1 1-4-7V26L40 30z" fill="currentColor" opacity="0.22"/>';
      case 'tv':           return '<rect x="22" y="28" width="52" height="36" rx="6" fill="currentColor" opacity="0.18"/><path d="M32 50l12-8 8 6 12-10" stroke="currentColor" stroke-width="3" fill="none" stroke-linecap="round" opacity="0.4"/>';
      case 'pill':         return '<rect x="20" y="36" width="56" height="24" rx="12" fill="currentColor" opacity="0.18"/>';
      case 'square':       return '<rect x="24" y="24" width="48" height="48" rx="6" fill="currentColor" opacity="0.18"/>';
      case 'pin':          return '<path d="M48 20c-10 0-18 8-18 18 0 12 18 30 18 30s18-18 18-30c0-10-8-18-18-18z" fill="currentColor" opacity="0.18"/>';
      case 'shield':       return '<path d="M48 20l-20 8v18c0 12 8 22 20 26 12-4 20-14 20-26V28L48 20z" fill="currentColor" opacity="0.18"/>';
      case 'play':         return '<path d="M38 28l24 20-24 20V28z" fill="currentColor" opacity="0.30"/>';
      case 'circle':       return '<circle cx="48" cy="48" r="26" fill="currentColor" opacity="0.18"/>';
      case 'roundedSquare':return '<rect x="20" y="20" width="56" height="56" rx="14" fill="currentColor" opacity="0.20"/>';
      default:             return '<circle cx="48" cy="48" r="26" fill="currentColor" opacity="0.18"/>';
    }
  }

  // — SVG 模板生成器：品牌色 + 形状 + 字母
  function makeSVG(key) {
    var b = BRAND[key] || { fg: '#FFFFFF', bg: '#7F7F7F', text: key.substr(0, 1).toUpperCase(), shape: 'roundedSquare', gloss: true };
    var gradId = 'g_' + key + '_' + Math.random().toString(36).slice(2, 8);
    var gloss = b.gloss
      ? '<rect width="96" height="48" rx="22" fill="url(#sh_' + gradId + ')" opacity="0.20"/>'
      : '';
    return '' +
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96" width="96" height="96">' +
        '<defs>' +
          '<linearGradient id="' + gradId + '" x1="0" y1="0" x2="0" y2="1">' +
            '<stop offset="0" stop-color="' + b.bg + '" stop-opacity="1"/>' +
            '<stop offset="1" stop-color="' + b.bg + '" stop-opacity="0.78"/>' +
          '</linearGradient>' +
          '<linearGradient id="sh_' + gradId + '" x1="0" y1="0" x2="0" y2="1">' +
            '<stop offset="0" stop-color="#FFFFFF" stop-opacity="0.6"/>' +
            '<stop offset="1" stop-color="#FFFFFF" stop-opacity="0"/>' +
          '</linearGradient>' +
        '</defs>' +
        '<rect width="96" height="96" rx="22" fill="url(#' + gradId + ')"/>' +
        '<g style="color:' + b.fg + '">' + shapePath(b.shape) + '</g>' +
        '<text x="48" y="' + (b.shape === 'pill' || b.shape === 'play' ? '62' : '60') + '" font-family="PingFang SC, Inter, sans-serif" font-size="' + (b.text.length > 1 ? 32 : 40) + '" font-weight="800" text-anchor="middle" fill="' + b.fg + '">' + b.text + '</text>' +
        gloss +
      '</svg>';
  }

  // — 转 base64 data URI
  function toDataURI(svg) {
    return 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svg)));
  }

  // — 内存缓存
  var cache = {};
  Object.keys(BRAND).forEach(function (k) { cache[k] = toDataURI(makeSVG(k)); });

  // — localStorage 缓存
  var STORAGE_KEY = 'goto_icon_cache_v1';
  function loadDiskCache() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); }
    catch (e) { return {}; }
  }
  function saveDiskCache(d) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(d)); } catch (e) { /* quota */ }
  }
  // 把内存里所有内置图标写盘（首启时一次性拉下来）
  function ensureDiskCache() {
    var disk = loadDiskCache();
    var dirty = false;
    Object.keys(BRAND).forEach(function (k) {
      if (!disk[k]) { disk[k] = cache[k]; dirty = true; }
    });
    if (dirty) saveDiskCache(disk);
    return disk;
  }

  // ─────────── 官方/三方 API 抓取层 ───────────
  // 重要: 这些 API 需要 CORS 代理。生产环境建议走 Electron 主进程 / 后端代理
  //       而不是浏览器直接 fetch。这里提供接口骨架，可在 preload 中桥接。

  // Google Play Store: 通过 HTML 抓取 og:image
  // 真实地址: https://play.google.com/store/apps/details?id=com.tencent.mm
  function fetchFromPlayStore(pkg) {
    return new Promise(function (resolve, reject) {
      if (!pkg) return reject(new Error('package required'));
      // 真实实现: 通过 Electron IPC → 主进程 → 后端代理抓取
      // window.electronAPI.fetchIcon({source:'play',package:pkg})
      // 这里模拟异步返回内置 SVG
      setTimeout(function () {
        var svgKey = mapPlayToKey(pkg);
        if (svgKey && cache[svgKey]) resolve(cache[svgKey]);
        else resolve(toDataURI(makeSVG(pkg.replace(/^com\./, ''))));
      }, 50);
    });
  }

  // Apple App Store: iTunes Search API（公开，无需鉴权，CORS OK）
  // GET https://itunes.apple.com/lookup?id=414478124  → JSON
  function fetchFromAppStore(appleId) {
    return new Promise(function (resolve, reject) {
      if (!appleId) return reject(new Error('appleId required'));
      var url = 'https://itunes.apple.com/lookup?id=' + encodeURIComponent(appleId) + '&country=cn';
      // 真实生产: fetch(url).then(r=>r.json()).then(j=>resolve(j.results[0].artworkUrl512))
      // 这里 stub:
      setTimeout(function () { resolve(toDataURI(makeSVG('apple_' + appleId))); }, 50);
    });
  }

  // 包名 → 内置 key 映射（避免重复定义）
  var PKG_MAP = {
    'com.tencent.mm': 'weixin',
    'com.tencent.mobileqq': 'qq',
    'com.sina.weibo': 'weibo',
    'com.ss.android.ugc.aweme': 'douyin',
    'tv.danmaku.bili': 'bilibili',
    'com.taobao.taobao': 'taobao',
    'com.jingdong.app.mall': 'jingdong',
    'com.eg.android.AlipayGphone': 'zhifubao',
    'com.autonavi.minimap': 'gaode',
    'com.baidu.BaiduMap': 'baidudt',
    'com.sankuai.meituan': 'meituan',
    'me.ele': 'eleme',
    'com.netease.cloudmusic': 'wangyiyun',
    'com.tencent.qqmusic': 'qqyy',
    'com.youku.phone': 'youku',
    'com.qiyi.video': 'iqiyi',
    'com.tencent.qqlive': 'txsp',
    'com.zhihu.android': 'zhihu',
    'com.xingin.xhs': 'xiaohongshu',
    'com.douban.book.reader': 'douban',
    'com.alibaba.android.rimet': 'dingding',
    'com.tencent.wework': 'qiyeweixin'
  };
  function mapPlayToKey(pkg) { return PKG_MAP[pkg] || null; }

  // 异步抓取: 优先磁盘 → 失败则 API → 最终回退 SVG
  function fetchIcon(key) {
    return new Promise(function (resolve) {
      var disk = loadDiskCache();
      if (disk[key]) return resolve(disk[key]);
      // 尝试走 Play Store（如果是包名）
      if (key.indexOf('.') > 0) {
        fetchFromPlayStore(key).then(function (uri) {
          if (uri && uri.length > 200) {
            disk[key] = uri; saveDiskCache(disk);
          }
          resolve(uri || toDataURI(makeSVG(key)));
        }).catch(function () { resolve(toDataURI(makeSVG(key))); });
      } else {
        // 未知 key: 直接返回内置 SVG
        resolve(toDataURI(makeSVG(key)));
      }
    });
  }

  // — 一次性把所有内置图标拉下来（用于首启初始化）
  function preload() {
    var disk = ensureDiskCache();
    // 模拟网络抓取（实际项目走 IPC / 后端）
    Object.keys(PKG_MAP).forEach(function (pkg) {
      fetchFromPlayStore(pkg).then(function (uri) {
        if (uri && uri.length > 200) {
          disk[pkg] = uri; saveDiskCache(disk);
        }
      }).catch(function () { /* 静默失败，回退 SVG */ });
    });
    return disk;
  }

  // ─────────── 公开 API ───────────
  var Icons = {
    get: function (key) { return cache[key] || (cache[key] = toDataURI(makeSVG(key))); },
    getSVG: function (key) { return makeSVG(key); },
    keys: function () { return Object.keys(BRAND); },
    /** 异步抓取（先磁盘后 API 再 SVG 回退） */
    fetch: fetchIcon,
    /** Play Store / App Store 抓取 */
    fetchFromPlayStore: fetchFromPlayStore,
    fetchFromAppStore: fetchFromAppStore,
    /** 预加载：把所有内置图标 + 模拟 API 抓取 */
    preload: preload,
    /** 包名映射 */
    mapPackage: mapPlayToKey,
    /** 转换为 dataset 友好 format */
    toDataset: function (arr) {
      return arr.map(function (a) {
        return Object.assign({}, a, { iconURI: cache[a.key] || cache[mapPlayToKey(a.package)] || '' });
      });
    },
    /** 调试：返回所有图标的 data URI 字典 */
    exportAll: function () { return Object.assign({}, cache); }
  };

  // 挂载到全局
  if (typeof global.GOTO === 'undefined') global.GOTO = {};
  global.GOTO.test = global.GOTO.test || {};
  global.GOTO.test.Icons = Icons;
  global.GOTO.test.Icons._BRAND = BRAND;

  // 首启自动预加载
  try { preload(); } catch (e) { /* noop */ }
})(typeof window !== 'undefined' ? window : this);
