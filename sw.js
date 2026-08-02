/*!
 * GOTO Page Service Worker
 * -----------------------------------------------------------------------------
 * 策略：
 *   - App Shell（核心静态资源）：预缓存 + stale-while-revalidate
 *   - HTML 文档：network-first（保证内容更新）
 *   - MD 文档 / JSON：stale-while-revalidate（离线可用）
 *   - 字体 / 第三方库：已本地化到 fonts/ 与 libs/，按 stale-while-revalidate 首次请求后缓存
 * -----------------------------------------------------------------------------
 * 更新缓存时：递增 CACHE_VERSION，下次 activate 会清理旧版本。
 */
var CACHE_VERSION = 'goto-page-v63-20260802';
var APP_SHELL = [
  './',
  './index.html',
  './app-icons.js',
  './search-runtime.js',
  './home-stats-runtime.js',
  './statistics-runtime.js',
  './preview-final.css',
  './preview-authority.css',
  './preview-data.js',
  './community-config.js',
  './community-dock.js',
  './goto-logo.svg',
  './goto-logo.png',
  './manifest.json',
  './fonts/outfit.ttf',
  './fonts/fonts-local.css',
  './libs/md-renderer.js',
  './libs/markdown-it.min.js',
  './libs/mermaid.min.js',
  './dynamic-cursor/dynamic-cursor.js',
  './dynamic-cursor/dynamic-cursor.css',
  './GOTO-Engine/goto-engine.js',
  './GOTO-Engine/goto-engine-component.js',
  './GOTO-Engine/base-bridge.js',
  './GOTO-Engine/algorithms/rerank/personal-rerank.js',
  './GOTO-Engine/algorithms/rag/bm25-rag-search.js',
  './GOTO-Engine/semantic/semantic-loader.js',
  './GOTO-Base/goto-base-bundle.js',
  './Document/document-bundle.js',
  './Document/music_page.html'
];

// ═══════ Install：预缓存 App Shell ═══════
self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE_VERSION).then(function (cache) {
      // 使用 addAll 的宽容版本：单个资源失败不阻断安装
      return Promise.all(
        APP_SHELL.map(function (url) {
          return cache.add(url).catch(function () { /* 静默跳过失败项 */ });
        })
      );
    }).then(function () {
      return self.skipWaiting();
    })
  );
});

// ═══════ Activate：清理旧版本缓存 ═══════
self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys.filter(function (key) { return key !== CACHE_VERSION; })
            .map(function (key) { return caches.delete(key); })
      );
    }).then(function () {
      return self.clients.claim();
    })
  );
});

// ═══════ Fetch：路由分发 ═══════
self.addEventListener('fetch', function (event) {
  var req = event.request;

  // 只拦截同源 GET 请求
  if (req.method !== 'GET') return;
  var url = new URL(req.url);
  if (url.origin !== self.location.origin) {
    // 外部 CDN（fonts / markdown-it / mermaid / iTunes 等）不拦截
    return;
  }

  // 媒体文件（mp3/mp4/音频视频）走网络直连，避免 SWR 后台 revalidate
  // 触发 ERR_ABORTED。媒体文件通常较大且不需要缓存到 App Shell。
  if (/\.(mp3|mp4|webm|ogg|wav|m4a|flac|aac)$/i.test(url.pathname)) {
    return; // 不拦截，让浏览器直接请求
  }

  // JSON 数据文件（playlist.json 等）：network-first，保证数据实时更新
  if (/\.json$/i.test(url.pathname)) {
    event.respondWith(networkFirst(req));
    return;
  }

  // HTML 文档：network-first（保证更新）
  var accept = req.headers.get('accept') || '';
  if (accept.indexOf('text/html') >= 0 || url.pathname.endsWith('.html') || url.pathname === '/' || url.pathname === './') {
    event.respondWith(networkFirst(req));
    return;
  }

  // 其他同源资源：stale-while-revalidate
  event.respondWith(staleWhileRevalidate(req));
});

// ═══════ 策略实现 ═══════

// network-first：先网络，失败回退缓存，再失败回退 index.html
function networkFirst(req) {
  return fetch(req).then(function (res) {
    var copy = res.clone();
    caches.open(CACHE_VERSION).then(function (cache) {
      cache.put(req, copy).catch(function () {});
    });
    return res;
  }).catch(function () {
    return caches.match(req).then(function (cached) {
      return cached || caches.match('./index.html');
    });
  });
}

// stale-while-revalidate：先返回缓存，后台更新
function staleWhileRevalidate(req) {
  return caches.match(req).then(function (cached) {
    var fetchPromise = fetch(req).then(function (res) {
      // 只缓存成功响应
      if (res && res.status === 200 && res.type !== 'opaque') {
        var copy = res.clone();
        caches.open(CACHE_VERSION).then(function (cache) {
          cache.put(req, copy).catch(function () {});
        });
      }
      return res;
    }).catch(function () {
      // 网络失败：若缓存命中已返回，无操作；否则交给上层
      return cached;
    });
    // 有缓存立即返回，否则等待网络
    return cached || fetchPromise;
  });
}

// ═══════ 消息通道：支持页面主动触发更新 ═══════
self.addEventListener('message', function (event) {
  if (event.data === 'skipWaiting') {
    self.skipWaiting();
  }
});
