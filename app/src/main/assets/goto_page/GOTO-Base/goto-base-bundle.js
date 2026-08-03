/**
 * GOTO Base HOST Bundle — 自动生成，请勿手动修改
 *
 * 由 scripts/build-host-bundle.js 生成。
 * 入口模块: integration/javascript/integration-bootstrap.js
 * 模块数量: 20
 * 生成时间: 2026-07-27T15:41:30.009Z
 */

(function (global) {
  'use strict';

  // ====== Node.js 内置模块 shim ======

    var pathShim = {
      sep: '/',
      delimiter: ':',
      join: function() {
        var parts = [];
        for (var i = 0; i < arguments.length; i++) {
          var a = arguments[i];
          if (typeof a !== 'string') continue;
          if (a.length > 0) parts.push(a);
        }
        var joined = parts.join('/');
        // 压缩连续斜杠
        joined = joined.replace(/\/+/g, '/');
        // 去除末尾斜杠（除非是根斜杠）
        if (joined.length > 1 && joined[joined.length - 1] === '/') {
          joined = joined.slice(0, -1);
        }
        return joined;
      },
      resolve: function() {
        var segments = [];
        for (var i = 0; i < arguments.length; i++) {
          var a = arguments[i];
          if (typeof a !== 'string') continue;
          var parts = a.split('/');
          for (var j = 0; j < parts.length; j++) {
            if (parts[j] === '' || parts[j] === '.') continue;
            if (parts[j] === '..') {
              if (segments.length > 0) segments.pop();
            } else {
              segments.push(parts[j]);
            }
          }
        }
        return '/' + segments.join('/');
      },
      normalize: function(p) {
        if (typeof p !== 'string') return '.';
        var parts = p.split('/');
        var segments = [];
        for (var i = 0; i < parts.length; i++) {
          if (parts[i] === '' || parts[i] === '.') continue;
          if (parts[i] === '..') {
            if (segments.length > 0) segments.pop();
          } else {
            segments.push(parts[i]);
          }
        }
        var result = segments.join('/');
        if (p[0] === '/') result = '/' + result;
        return result || '.';
      },
      dirname: function(p) {
        if (typeof p !== 'string') return '.';
        var idx = p.lastIndexOf('/');
        if (idx < 0) return '.';
        if (idx === 0) return '/';
        return p.slice(0, idx);
      },
      basename: function(p, ext) {
        if (typeof p !== 'string') return '';
        var base = p.slice(p.lastIndexOf('/') + 1);
        if (ext && base.endsWith(ext)) {
          base = base.slice(0, base.length - ext.length);
        }
        return base;
      },
      extname: function(p) {
        if (typeof p !== 'string') return '';
        var base = p.slice(p.lastIndexOf('/') + 1);
        var idx = base.lastIndexOf('.');
        if (idx < 0) return '';
        return base.slice(idx);
      },
      isAbsolute: function(p) {
        return typeof p === 'string' && p.length > 0 && p[0] === '/';
      },
      relative: function(from, to) {
        return to;
      }
    };

    var fsShim = {
      readdirSync: function(dir) {
        throw new Error('fs.readdirSync not available in browser');
      },
      readFileSync: function(file, encoding) {
        throw new Error('fs.readFileSync not available in browser');
      },
      writeFileSync: function(file, data) {
        throw new Error('fs.writeFileSync not available in browser');
      },
      existsSync: function(p) {
        return false;
      },
      statSync: function(p) {
        throw new Error('fs.statSync not available in browser');
      },
      mkdirSync: function(p) {
        throw new Error('fs.mkdirSync not available in browser');
      }
    };

    var cryptoShim = {
      randomUUID: function() {
        try {
          if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
            return crypto.randomUUID();
          }
        } catch (e) {}
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
          var r = Math.random() * 16 | 0;
          var v = c === 'x' ? r : (r & 0x3 | 0x8);
          return v.toString(16);
        });
      },
      createHash: function(alg) {
        var data = '';
        return {
          update: function(chunk) {
            if (typeof chunk === 'string') data += chunk;
            return this;
          },
          digest: function(format) {
            // 简易 hash（非加密安全），仅用于兼容
            var hash = 0;
            for (var i = 0; i < data.length; i++) {
              hash = ((hash << 5) - hash) + data.charCodeAt(i);
              hash |= 0;
            }
            var hex = (hash >>> 0).toString(16);
            while (hex.length < 8) hex = '0' + hex;
            return hex;
          }
        };
      }
    };

  var __shims = {
    path: pathShim,
    fs: fsShim,
    crypto: cryptoShim
  };

  // ====== 模块注册表 ======
  var __modules = {
    'integration/javascript/integration-bootstrap.js': function (module, exports, require, __dirname, __filename) {
      'use strict';
      
      /**
       * GOTO Base × HOST 集成层 — IntegrationBootstrap
       *
       * 一键创建 SearchCoordinator 并挂载到 HOST window。
       *
       * 用法（Node.js 测试 / 浏览器通用）：
       *   const { createCoordinator, mountOnHost, getHostMountGuide } = require('integration/javascript/integration-bootstrap.js');
       *   const { coordinator } = await createCoordinator({
       *     engineFacade: window.GOTOEngineFacade,
       *     seedsDir: 'goto-base/shared/data/seeds',
       *     storageType: 'memory',  // 'indexeddb' | 'localstorage' | 'memory'
       *     config: { maxPersonalBoost: 0.5 }
       *   });
       *   mountOnHost(window, coordinator);
       *   // 之后 HOST 可调用 window.GOTOBaseCoordinator.search(query) 与 recordSelection(...)
       *
       * 降级策略：
       *   - engineFacade 缺失 → 抛错（Engine 是核心，必须存在）
       *   - seedsDir 缺失或加载失败 → coordinator 仍创建，仅无 metadataScore
       *   - storageType 不支持 / 初始化失败 → coordinator 仍创建，仅无 personalScore
       *   - PersonalLearning init 失败 → coordinator 仍创建，仅无 personalScore
       */
      
      const path = require('path');
      const { SearchCoordinator, DEFAULT_COORDINATOR_CONFIG } = require('integration/javascript/search-coordinator.js');
      const { EngineAdapter } = require('integration/javascript/engine-adapter.js');
      const { GlobalBaseAdapter } = require('integration/javascript/global-base-adapter.js');
      const { AppIdentityResolver } = require('integration/javascript/identity/app-identity-resolver.js');
      const { HostAppAdapter } = require('integration/javascript/identity/host-app-adapter.js');
      const MANUAL_MAPPINGS = require('integration/javascript/identity/manual-mappings.js').DEFAULT_MANUAL_MAPPINGS;
      const { DebugController } = require('integration/javascript/debug/debug-controller.js');
      
      // PersonalLearning 与存储实现（运行时 javascript 包）
      const RUNTIME_JS_DIR = path.resolve(__dirname, '..', '..', 'runtime', 'javascript');
      const SRC_DIR = path.resolve(RUNTIME_JS_DIR, 'src');
      
      let _PersonalLearning = null;
      let _MemoryLearningStore = null;
      let _LocalStorageLearningStore = null;
      let _IndexedDBLearningStore = null;
      
      function loadPersonalLearningModules() {
        if (_PersonalLearning) return;
        try {
          const pl = require('runtime/javascript/src/personal-learning.js');
          _PersonalLearning = pl.PersonalLearning;
        } catch (e) { _PersonalLearning = null; }
        try {
          const mem = require('runtime/javascript/src/memory-store.js');
          _MemoryLearningStore = mem.MemoryLearningStore;
        } catch (e) { _MemoryLearningStore = null; }
        try {
          const ls = require('runtime/javascript/src/localstorage-store.js');
          _LocalStorageLearningStore = ls.LocalStorageLearningStore;
        } catch (e) { _LocalStorageLearningStore = null; }
        try {
          const idb = require('runtime/javascript/src/indexeddb-store.js');
          _IndexedDBLearningStore = idb.IndexedDBLearningStore;
        } catch (e) { _IndexedDBLearningStore = null; }
      }
      
      /**
       * 根据存储类型创建 LearningStore 实例。
       * 失败时返回 null（调用方降级）。
       */
      function createStore(storageType, config) {
        loadPersonalLearningModules();
        if (!storageType) storageType = 'memory';
        try {
          if (storageType === 'memory') {
            if (!_MemoryLearningStore) return null;
            return new _MemoryLearningStore(config);
          }
          if (storageType === 'localstorage') {
            if (!_LocalStorageLearningStore) return null;
            return new _LocalStorageLearningStore(config);
          }
          if (storageType === 'indexeddb') {
            if (!_IndexedDBLearningStore) return null;
            return new _IndexedDBLearningStore(config);
          }
        } catch (e) {
          return null;
        }
        return null;
      }
      
      /**
       * 一键创建 SearchCoordinator。
       *
       * @param {object} options
       *   - {object} engineFacade GOTOEngineFacade 实例（必须）
       *   - {string} [seedsDir] data/seeds 目录路径（Node.js）；浏览器请用 knowledgeBase 注入
       *   - {Array}  [knowledgeBase] 预加载的 AppRecord 数组（浏览器场景）
       *   - {string} [storageType='memory'] 存储类型
       *   - {object} [config] SearchCoordinator 配置覆盖
       *   - {object} [learningConfig] PersonalLearning 配置覆盖
       *   - {string} [profileId] PersonalLearning profile ID
       *   - {object} [hostContext] HOST 上下文
       *   - {function} [now] 时间函数（测试用）
       *   - {function} [idGen] UUID 生成器（测试用）
       * @returns {Promise<{
       *   coordinator: SearchCoordinator,
       *   engine: EngineAdapter,
       *   base: GlobalBaseAdapter | null,
       *   personalLearning: object | null,
       *   status: { engine: boolean, base: boolean, personal: boolean, degraded: boolean, errors: string[] }
       * }>}
       */
      async function createCoordinator(options) {
        const opts = options || {};
        const errors = [];
      
        // ===== 1. GlobalBaseAdapter（可选，先创建以便 resolver 可用）=====
        let base = null;
        try {
          if (opts.knowledgeBase && Array.isArray(opts.knowledgeBase)) {
            base = new GlobalBaseAdapter({ knowledgeBase: opts.knowledgeBase, config: opts.config });
          } else if (opts.seedsDir) {
            base = new GlobalBaseAdapter({ config: opts.config });
            const result = await base.loadSeeds(opts.seedsDir);
            if (base.loadError) {
              errors.push('Base load failed: ' + base.loadError.message);
              base = null;
            }
          }
        } catch (e) {
          errors.push('Base init failed: ' + (e && e.message ? e.message : String(e)));
          base = null;
        }
      
        // ===== 2. AppIdentityResolver（可选，依赖 base）=====
        let resolver = null;
        let hostAdapter = null;
        try {
          hostAdapter = new HostAppAdapter();
          const manualMappings = Object.assign({}, MANUAL_MAPPINGS, opts.manualMappings || {});
          resolver = new AppIdentityResolver({
            globalBase: base,
            manualMappings,
            hostAdapter
          });
        } catch (e) {
          errors.push('Resolver init failed: ' + (e && e.message ? e.message : String(e)));
          resolver = null;
        }
      
        // ===== 3. EngineAdapter（必须）=====
        if (!opts.engineFacade) {
          throw new Error('createCoordinator: engineFacade is required');
        }
        // resolvePackageName：当 HOST app 缺少 packageName 时，通过 resolver 从 GlobalBase 解析
        // 返回值用于 SearchCoordinator 的 packageName 去重与 boost 关联
        const resolvePackageName = resolver
          ? function resolvePackageName(app) {
              try {
                const r = resolver.resolve(app);
                if (r && r.packageName) return r.packageName;
                // resolver 返回 null packageName（HOST app 无 packageName 且未匹配 Base）
                // 生成稳定 stub ID：stub:<appName>，保证 PersonalLearning 可关联
                const appName = (app && (app.name || app.en || app.canonicalName)) || '';
                if (appName) {
                  const stubId = 'stub:' + appName;
                  // 注册 stub 以便后续 resolver.getAllStubs() 能查到
                  try { resolver.registerStub({
                    packageName: stubId,
                    appName: appName,
                    installedAt: '',
                    updatedAt: '',
                    discoveredVia: 'host-fallback',
                    userAliases: [app.name, app.en, app.abbr, app.py].filter(function(a){return a;}),
                    schemaVersion: '1.0.0'
                  }); } catch (_) {}
                  return stubId;
                }
                return '';
              } catch (_) {
                return '';
              }
            }
          : null;
        const engine = new EngineAdapter({ engineFacade: opts.engineFacade, resolvePackageName });
      
        // ===== 4. PersonalLearning（可选）=====
        let personalLearning = null;
        try {
          loadPersonalLearningModules();
          if (_PersonalLearning) {
            const store = createStore(opts.storageType, opts.learningConfig || opts.config);
            if (store) {
              personalLearning = new _PersonalLearning({
                store,
                config: opts.learningConfig || opts.config,
                profileId: opts.profileId,
                hostContext: opts.hostContext,
                now: opts.now,
                idGen: opts.idGen
              });
              await personalLearning.init();
              if (!personalLearning.available) {
                errors.push('PersonalLearning init failed (available=false)');
                personalLearning = null;
              }
            } else {
              errors.push('Store creation failed for storageType=' + (opts.storageType || 'memory'));
            }
          } else {
            errors.push('PersonalLearning module not loadable');
          }
        } catch (e) {
          errors.push('PersonalLearning init failed: ' + (e && e.message ? e.message : String(e)));
          personalLearning = null;
        }
      
        // ===== 5. SearchCoordinator =====
        const config = Object.assign({}, DEFAULT_COORDINATOR_CONFIG, opts.config || {});
        const coordinator = new SearchCoordinator({
          engine,
          base,
          personalLearning,
          config,
          now: opts.now,
          sessionId: opts.sessionId
        });
      
        // ===== 6. DebugController（可选，仅在 featureFlags.goto_base_debug_enabled=true 时激活）=====
        let debugController = null;
        try {
          const featureFlags = opts.featureFlags || {};
          debugController = new DebugController({
            coordinator,
            personalLearning,
            globalBase: base,
            resolver,
            featureFlags: featureFlags
          });
        } catch (e) {
          errors.push('DebugController init failed: ' + (e && e.message ? e.message : String(e)));
          debugController = null;
        }
      
        const status = {
          engine: engine.available,
          base: !!(base && base.available),
          personal: !!(personalLearning && personalLearning.available),
          resolver: !!resolver,
          debug: !!(debugController && debugController.isDebugEnabled()),
          degraded: !(base && base.available) || !(personalLearning && personalLearning.available),
          errors
        };
      
        return { coordinator, engine, base, personalLearning, resolver, debugController, status };
      }
      
      /**
       * 在 HOST window 上挂载 coordinator。
       *
       * 挂载点：window.GOTOBaseCoordinator
       * 不修改 HOST 的任何现有变量和函数。
       *
       * @param {object} hostWindow HOST 的 window 对象
       * @param {object} coordinator SearchCoordinator 实例
       * @param {object} [extras] 额外挂载项（如 personalLearning 用于设置页）
       * @returns {{ mounted: boolean, path: string }}
       */
      function mountOnHost(hostWindow, coordinator, extras) {
        if (!hostWindow || typeof hostWindow !== 'object') {
          return { mounted: false, path: '' };
        }
        if (!coordinator) {
          return { mounted: false, path: '' };
        }
        const mountPath = 'GOTOBaseCoordinator';
        hostWindow[mountPath] = coordinator;
        // 可选：挂载 personalLearning 供设置页使用
        if (extras && extras.personalLearning) {
          hostWindow.GOTOBasePersonalLearning = extras.personalLearning;
        }
        if (extras && extras.base) {
          hostWindow.GOTOBase = extras.base;
        }
        if (extras && extras.resolver) {
          hostWindow.GOTOBaseResolver = extras.resolver;
        }
        if (extras && extras.debugController) {
          hostWindow.GOTOBaseDebug = extras.debugController;
          // 注册控制台命令（仅在 debug 开启时生效）
          try { extras.debugController.registerConsoleCommands(hostWindow); } catch (_) {}
        }
        return { mounted: true, path: mountPath };
      }
      
      /**
       * 返回详细的 HOST 挂载指南字符串。
       * 描述应在 preview.html 的哪些位置插入什么代码。
       */
      function getHostMountGuide() {
        return [
          '# GOTO Base SearchCoordinator — HOST 挂载指南',
          '',
          '## 总览',
          '',
          'HOST（preview.html）通过 window.GOTOBaseCoordinator 与 SearchCoordinator 交互。',
          'SearchCoordinator 在内部协调 Engine + GlobalBase + PersonalLearning，HOST 只需调用两个 API：',
          '  - window.GOTOBaseCoordinator.search(query) → CoordinatorResponse',
          '  - window.GOTOBaseCoordinator.recordSelection(query, packageName, lastResponse)',
          '',
          '## 挂载点 1：初始化（在 GOTO Engine 加载之后）',
          '',
          '在 preview.html 中，GOTO Engine 的 <script> 标签之后插入：',
          '',
          '  <script src="GOTO-Engine/goto-engine.js"></script>',
          '  <!-- ↓ GOTO Base 集成层 ↓ -->',
          '  <script src="goto-base/integration/javascript/global-base-adapter.js"></script>',
          '  <script src="goto-base/integration/javascript/engine-adapter.js"></script>',
          '  <script src="goto-base/integration/javascript/search-coordinator.js"></script>',
          '  <script src="goto-base/integration/javascript/integration-bootstrap.js"></script>',
          '  <script>',
          '    (async function(){',
          '      try {',
          '        const { coordinator } = await GOTOBaseIntegration.createCoordinator({',
          '          engineFacade: window.GOTOEngineFacade,',
          '          seedsDir: "goto-base/shared/data/seeds",  // 浏览器场景改为 knowledgeBase: [...]',
          '          storageType: "indexeddb",          // 浏览器优先 indexeddb，降级 localstorage',
          '          config: { maxPersonalBoost: 0.5 }',
          '        });',
          '        GOTOBaseIntegration.mountOnHost(window, coordinator);',
          '      } catch (e) {',
          '        console.error("GOTOBase init failed:", e);',
          '      }',
          '    })();',
          '  </script>',
          '',
          '注意：',
          '  - 浏览器环境下 global-base-adapter.js / engine-adapter.js / search-coordinator.js / integration-bootstrap.js',
          '    使用 CommonJS (require) 形式，需要预先 bundle 或在 HOST 中提供 require shim。',
          '  - 浏览器场景下 data/seeds/ 的 JSON 文件需要通过 fetch 预加载，传入 knowledgeBase 参数。',
          '',
          '## 挂载点 2：搜索输入入口（替换 GOTOEngineFacade.search 调用）',
          '',
          '在 preview.html 的搜索输入处理函数中（约第 14218 行），',
          '将原本直接调用 GOTOEngine.runSearchPipeline 的代码：',
          '',
          '  // 旧代码：',
          '  result = (window.GOTOEngine && typeof window.GOTOEngine.runSearchPipeline === "function")',
          '    ? window.GOTOEngine.runSearchPipeline(trimmed, window._appDataset)',
          '    : _fuzzySearch(trimmed, window._appDataset);',
          '',
          '替换为：',
          '',
          '  // 新代码：通过 SearchCoordinator 协调 Engine + Base + Personal',
          '  if (window.GOTOBaseCoordinator) {',
          '    const coordinatorResp = await window.GOTOBaseCoordinator.search(trimmed);',
          '    window._lastCoordinatorResponse = coordinatorResp;  // 供点击时使用',
          '    // 把 CoordinatorResponse.results 适配为现有 UI 渲染逻辑期望的格式',
          '    result = adaptCoordinatorResponseToSearchContext(coordinatorResp, window._appDataset);',
          '    list = (coordinatorResp.results || []).map(r => ({',
          '      name: r.appName,',
          '      id: r.packageName,',
          '      score: r.finalScore,',
          '      _matchedBy: r.matchedBy,',
          '      _explanation: r.explanation',
          '    }));',
          '  } else {',
          '    // 降级：直接调用 Engine',
          '    result = (window.GOTOEngine && typeof window.GOTOEngine.runSearchPipeline === "function")',
          '      ? window.GOTOEngine.runSearchPipeline(trimmed, window._appDataset)',
          '      : _fuzzySearch(trimmed, window._appDataset);',
          '    list = ((result && result.list) || []).slice();',
          '  }',
          '',
          '## 挂载点 3：应用点击入口（在启动应用前调用 recordSelection）',
          '',
          '在 preview.html 的应用点击处理函数中（约第 13826 行 _openPredictedApp）：',
          '',
          '  // 旧代码：',
          '  window._openPredictedApp = function(app) {',
          '    var canonicalName = app.name || app.en || "";',
          '    window._onResultClick(canonicalName);',
          '    if (typeof window._openApp === "function") window._openApp(app.id || canonicalName);',
          '    else if (typeof openApp === "function") openApp(app);',
          '    else if (typeof launchApp === "function") launchApp(app);',
          '  };',
          '',
          '  // 新代码：在启动前调用 recordSelection（异步，不阻塞启动）',
          '  window._openPredictedApp = function(app) {',
          '    var canonicalName = app.name || app.en || "";',
          '    // 记录用户选择（异步，不阻塞）',
          '    try {',
          '      if (window.GOTOBaseCoordinator && window._lastCoordinatorResponse) {',
          '        var si = document.getElementById("searchInput");',
          '        var cur = si ? (si.value || "").trim() : "";',
          '        var packageName = app.id || app.packageName || "";',
          '        if (cur && packageName) {',
          '          window.GOTOBaseCoordinator.recordSelection(cur, packageName, window._lastCoordinatorResponse);',
          '        }',
          '      }',
          '    } catch (_) {}',
          '    window._onResultClick(canonicalName);',
          '    if (typeof window._openApp === "function") window._openApp(app.id || canonicalName);',
          '    else if (typeof openApp === "function") openApp(app);',
          '    else if (typeof launchApp === "function") launchApp(app);',
          '  };',
          '',
          '## 降级策略',
          '',
          'SearchCoordinator 内部自动处理降级：',
          '  - PersonalLearning 初始化失败 → coordinator 仍工作，仅无 personalScore（meta.personalEnabled=false, degraded=true）',
          '  - GlobalBase 加载失败 → coordinator 仍工作，仅无 metadataScore（meta.baseAvailable=false, degraded=true）',
          '  - Engine 不可用 → 返回空结果（meta.engineAvailable=false, degraded=true, results=[]）',
          '  - 学习开关关闭 → 不记录事件，不应用 personalBoost（meta.personalEnabled=false, degraded=false）',
          '  - recordSelection 失败 → 只记 console.warn，不影响应用启动',
          '',
          '## 隐私',
          '',
          '  - PersonalLearning 默认 localOnly=true, telemetry=false, cloudSync=false',
          '  - 所有学习数据存储在用户本地（IndexedDB / LocalStorage / Memory）',
          '  - HOST 应在设置页提供学习开关（personalLearning.setEnabled）',
          '  - HOST 应提供数据导出/重置入口（personalLearning.exportProfile / resetProfile）'
        ].join('\n');
      }
      
      module.exports = {
        createCoordinator,
        mountOnHost,
        getHostMountGuide,
        createStore,
        loadPersonalLearningModules,
        DEFAULT_COORDINATOR_CONFIG,
        // 暴露子模块类，供 HOST / 测试直接使用
        AppIdentityResolver,
        HostAppAdapter,
        DebugController,
        MANUAL_MAPPINGS
      };
      
    },
    'integration/javascript/search-coordinator.js': function (module, exports, require, __dirname, __filename) {
      'use strict';
      
      /**
       * GOTO Base × HOST 集成层 — SearchCoordinator
       *
       * 协调三个数据源，产出统一的搜索结果：
       *   1. 冻结的 GOTO Engine（通过 EngineAdapter）→ engineScore
       *   2. Global Base 知识库（通过 GlobalBaseAdapter）→ metadataScore
       *   3. Personal Learning Overlay（PersonalLearning 门面）→ personalScore
       *
       * 关键约束：
       *   - 不修改 Engine 的 QueryResponse，只包装（originalEngineResponse 原样透传）
       *   - 精确应用名命中保有最高优先级保护（matchedBy='exact-match' 强制第一）
       *   - Personal Boost 限制最大幅度（不超过 config.maxPersonalBoost，默认 0.5）
       *   - finalScore = max(engineScore, metadataScore) + personalScore
       *   - PersonalLearning 失败时自动降级（personalScore=0，degraded=true）
       *   - recordSelection 异步执行，不阻塞应用启动；失败时只记日志
       *
       * 输出 CoordinatorResponse：
       *   {
       *     originalEngineResponse,  // 原始 Engine 响应（不修改）
       *     query,                   // 原始查询
       *     normalizedQuery,         // 归一化查询
       *     queryEventId,            // 关联的 QueryEvent ID（可能为空）
       *     results: [...],          // 合并排序后结果
       *     meta: { engineAvailable, baseAvailable, personalEnabled, degraded, latencyMs }
       *   }
       */
      
      const { normalizeText } = require('integration/javascript/global-base-adapter.js');
      const { normalize: normalizeQuery, detectLanguage } = require('runtime/shared/query-normalizer.js');
      const { normalizeScores } = require('runtime/shared/learning-algorithms.js');
      
      const DEFAULT_COORDINATOR_CONFIG = Object.freeze({
        maxPersonalBoost: 0.5,
        exactMatchProtection: true,
        // 是否记录 QueryEvent（关闭后 recordSelection 仍可工作，但学习闭环不完整）
        recordQueryEvents: true,
        // 结果上限（0 = 不限制）
        maxResults: 0
      });
      
      /**
       * 判定一个候选是否为"精确应用名命中"。
       * 比对归一化后的查询与 canonicalName / appName / localizedNames（不含 aliases/abbreviations）。
       */
      function isExactAppNameMatch(normalizedQuery, candidate) {
        if (!normalizedQuery || !candidate) return false;
        const q = normalizedQuery.toLowerCase().trim();
        if (!q) return false;
        // canonicalName
        if (candidate.canonicalName && normalizeText(candidate.canonicalName) === q) return true;
        // appName（来自 Engine）
        if (candidate.appName && normalizeText(candidate.appName) === q) return true;
        // localizedNames
        if (candidate.localizedNames && typeof candidate.localizedNames === 'object') {
          for (const k of Object.keys(candidate.localizedNames)) {
            const v = candidate.localizedNames[k];
            if (v && normalizeText(v) === q) return true;
          }
        }
        return false;
      }
      
      /**
       * 分类 matchedBy 标签。
       */
      function classifyMatch(engineScore, metadataScore, personalScore, isExactMatch) {
        if (isExactMatch) return 'exact-match';
        const sources = [];
        if (engineScore > 0) sources.push('engine');
        if (metadataScore > 0) sources.push('base');
        if (personalScore > 0) sources.push('personal');
        if (sources.length === 0) return 'engine';
        if (sources.length === 1) return sources[0];
        return 'combined';
      }
      
      class SearchCoordinator {
        /**
         * @param {object} options
         *   - {object} engine EngineAdapter 实例（必须）
         *   - {object} [base] GlobalBaseAdapter 实例（可选，缺失则降级）
         *   - {object} [personalLearning] PersonalLearning 实例（可选，缺失则降级）
         *   - {object} [config] 配置覆盖
         *   - {function} [now] 自定义时间函数（测试用）
         *   - {string} [sessionId] 会话 ID
         */
        constructor({ engine, base, personalLearning, config, now, sessionId } = {}) {
          if (!engine) {
            throw new Error('SearchCoordinator: engine is required');
          }
          this._engine = engine;
          this._base = base || null;
          this._pl = personalLearning || null;
          this._config = Object.assign({}, DEFAULT_COORDINATOR_CONFIG, config || {});
          // 确保 maxPersonalBoost 数值合法
          if (typeof this._config.maxPersonalBoost !== 'number' ||
              isNaN(this._config.maxPersonalBoost) ||
              this._config.maxPersonalBoost < 0) {
            this._config.maxPersonalBoost = 0.5;
          }
          this._now = now || (() => Date.now());
          this._sessionId = sessionId || null;
        }
      
        /**
         * 主搜索入口。
         *
         * @param {string} query 用户原始查询
         * @param {object} [options]
         *   - {number} [maxResults] 结果上限（覆盖 config.maxResults）
         *   - {object} [context] 搜索上下文（透传给 PersonalLearning.recordQuery）
         * @returns {Promise<object>} CoordinatorResponse
         */
        async search(query, options) {
          const t0 = this._now();
          const opts = options || {};
          const originalQuery = query || '';
          const normalizedQuery = normalizeQuery(originalQuery);
      
          // ===== 1. 调用 Engine =====
          let engineResp;
          try {
            engineResp = await this._engine.search(originalQuery, opts);
          } catch (e) {
            engineResp = {
              results: [],
              originalResponse: null,
              degraded: true,
              error: 'EngineAdapter threw: ' + (e && e.message ? e.message : String(e))
            };
          }
          const engineAvailable = !engineResp.degraded;
          const engineResults = engineResp.results || [];
          const originalEngineResponse = engineResp.originalResponse;
      
          // ===== 2. 收集所有候选包名 =====
          const packageNames = engineResults.map(r => r.packageName).filter(Boolean);
      
          // ===== 3. 调用 Global Base 获取 metadataBoost =====
          let metadataBoostMap = new Map();
          const baseAvailable = !!(this._base && this._base.available);
          if (baseAvailable && packageNames.length > 0) {
            try {
              metadataBoostMap = this._base.getMetadataBoost(normalizedQuery, packageNames) || new Map();
            } catch (e) {
              metadataBoostMap = new Map();
            }
          }
      
          // ===== 4. 调用 Personal Learning 获取 personalBoost =====
          const plAvailable = !!(this._pl && this._pl.available);
          const plEnabled = plAvailable && this._pl.isEnabled();
          let personalBoostMap = new Map();
          if (plEnabled && packageNames.length > 0) {
            try {
              personalBoostMap = await this._pl.getPersonalBoost(normalizedQuery, packageNames) || new Map();
            } catch (e) {
              personalBoostMap = new Map();
            }
          }
      
          // ===== 5. 归一化 Engine 分数到 [0, 1] =====
          const rawEngineScores = engineResults.map(r => typeof r.score === 'number' ? r.score : 0);
          const normalizedEngineScores = normalizeScores(rawEngineScores);
      
          // ===== 6. 合并候选（按 packageName 去重）=====
          const merged = new Map(); // packageName -> candidate
          for (let i = 0; i < engineResults.length; i++) {
            const r = engineResults[i];
            if (!r || !r.packageName) continue;
            const engineScore = normalizedEngineScores[i] || 0;
            const metadataScore = metadataBoostMap.get(r.packageName) || 0;
            const rawPersonal = personalBoostMap.get(r.packageName) || 0;
            // 限幅：personalBoost 不超过 maxPersonalBoost（防御性，PL 内部已 clamp）
            const personalScore = Math.max(0, Math.min(this._config.maxPersonalBoost, rawPersonal));
      
            // 关联 Base 记录（用于精确匹配判定）
            let baseRecord = null;
            if (this._base) {
              try { baseRecord = this._base.getAppRecord(r.packageName); } catch (e) { baseRecord = null; }
            }
      
            const candidate = {
              packageName: r.packageName,
              appName: r.appName || (baseRecord && baseRecord.canonicalName) || r.packageName,
              engineScore: round4(engineScore),
              metadataScore: round4(metadataScore),
              personalScore: round4(personalScore),
              baseRecord,
              engineRank: r.rank || (i + 1)
            };
            // finalScore（不含精确匹配保护）= max(engine, metadata) + personal
            candidate.baseFinalScore = round4(Math.max(engineScore, metadataScore) + personalScore);
            merged.set(r.packageName, candidate);
          }
      
          // ===== 7. 标记精确匹配 =====
          const exactMatchedPackages = new Set();
          if (this._config.exactMatchProtection) {
            for (const c of merged.values()) {
              if (isExactAppNameMatch(normalizedQuery, c) ||
                  (c.baseRecord && isExactAppNameMatch(normalizedQuery, c.baseRecord))) {
                exactMatchedPackages.add(c.packageName);
              }
            }
          }
      
          // ===== 8. 计算 finalScore 与 matchedBy =====
          const candidates = [];
          for (const c of merged.values()) {
            const isExact = exactMatchedPackages.has(c.packageName);
            // finalScore 已在 baseFinalScore 中计算
            const finalScore = c.baseFinalScore;
            const matchedBy = classifyMatch(c.engineScore, c.metadataScore, c.personalScore, isExact);
            const explanation = buildExplanation(c, isExact, engineAvailable, baseAvailable, plEnabled);
            candidates.push({
              packageName: c.packageName,
              appName: c.appName,
              engineScore: c.engineScore,
              metadataScore: c.metadataScore,
              personalScore: c.personalScore,
              finalScore: round4(finalScore),
              matchedBy,
              explanation,
              // 内部字段（不暴露给 HOST UI，但 recordSelection 需要）
              _rankBeforeLearning: 0, // 待 step 9 填充
              _engineRank: c.engineRank,
              _baseFinalScore: c.baseFinalScore
            });
          }
      
          // ===== 9. 计算 rankBeforeLearning（按 max(engine, metadata) 排序，不含 personalBoost）=====
          const beforeLearning = candidates.slice().sort((a, b) => {
            const aBase = Math.max(a.engineScore, a.metadataScore);
            const bBase = Math.max(b.engineScore, b.metadataScore);
            if (bBase !== aBase) return bBase - aBase;
            // tiebreaker：原始 Engine rank
            return (a._engineRank || 0) - (b._engineRank || 0);
          });
          for (let i = 0; i < beforeLearning.length; i++) {
            beforeLearning[i]._rankBeforeLearning = i + 1;
          }
      
          // ===== 10. 最终排序：精确匹配优先，然后 finalScore 降序 =====
          candidates.sort((a, b) => {
            const aExact = a.matchedBy === 'exact-match';
            const bExact = b.matchedBy === 'exact-match';
            if (aExact && !bExact) return -1;
            if (bExact && !aExact) return 1;
            if (b.finalScore !== a.finalScore) return b.finalScore - a.finalScore;
            // tiebreaker：rankBeforeLearning（学习前排名靠前的优先）
            return (a._rankBeforeLearning || 999) - (b._rankBeforeLearning || 999);
          });
      
          // ===== 11. 填充最终 rank =====
          for (let i = 0; i < candidates.length; i++) {
            candidates[i].rank = i + 1;
          }
      
          // ===== 12. 结果截断 =====
          const maxResults = (typeof opts.maxResults === 'number' && opts.maxResults > 0)
            ? opts.maxResults
            : (this._config.maxResults || 0);
          const finalResults = maxResults > 0 ? candidates.slice(0, maxResults) : candidates;
      
          // ===== 13. 记录 QueryEvent（异步，不阻塞）=====
          let queryEventId = '';
          let queryEvent = null;
          if (plEnabled && this._config.recordQueryEvents) {
            try {
              queryEvent = await this._pl.recordQuery({
                rawQuery: originalQuery,
                sessionId: this._sessionId || undefined,
                context: opts.context || {},
                engineResults: engineResults.map(r => ({
                  packageName: r.packageName,
                  score: r.score,
                  name: r.appName,
                  rank: r.rank
                })),
                baseResults: [] // Base 不直接产候选，只 boost；这里留空
              });
              if (queryEvent) queryEventId = queryEvent.eventId || '';
            } catch (e) {
              queryEvent = null;
              queryEventId = '';
            }
          }
      
          // ===== 14. 计算降级标志 =====
          // degraded = Engine 不可用 OR Base 不可用 OR PL 不可用（init 失败，非用户关闭）
          const degraded = !engineAvailable || !baseAvailable || !plAvailable;
      
          const latencyMs = Math.max(0, this._now() - t0);
      
          const response = {
            originalEngineResponse,
            query: originalQuery,
            normalizedQuery,
            queryEventId,
            results: finalResults,
            meta: {
              engineAvailable,
              baseAvailable,
              personalEnabled: plEnabled,
              degraded,
              latencyMs
            }
          };
      
          // 内部缓存 QueryEvent（供 recordSelection 使用，不暴露给 HOST UI）
          Object.defineProperty(response, '_queryEvent', {
            value: queryEvent,
            writable: false,
            enumerable: false,
            configurable: false
          });
          // 内部缓存 results 映射（供 recordSelection 快速查找）
          Object.defineProperty(response, '_resultsByPackage', {
            value: new Map(finalResults.map(r => [r.packageName, r])),
            writable: false,
            enumerable: false,
            configurable: false
          });
      
          return response;
        }
      
        /**
         * 记录用户选择。异步执行，不阻塞应用启动。
         * 失败时只记日志，不抛错。
         *
         * @param {string} query 原始查询（用于在 coordinatorResponse 缺失时回退）
         * @param {string} selectedPackageName 被选中的应用包名
         * @param {object} coordinatorResponse search() 返回的 CoordinatorResponse
         * @returns {Promise<{accepted: boolean, reason?: string}>} 立即返回
         */
        async recordSelection(query, selectedPackageName, coordinatorResponse) {
          try {
            if (!selectedPackageName) {
              return { accepted: false, reason: 'no selectedPackageName' };
            }
            if (!this._pl || !this._pl.available) {
              return { accepted: false, reason: 'personal learning unavailable' };
            }
            if (!this._pl.isEnabled()) {
              return { accepted: false, reason: 'personal learning disabled' };
            }
      
            const resp = coordinatorResponse || {};
            const queryEvent = resp._queryEvent || null;
            if (!queryEvent) {
              // 没有 QueryEvent 关联，无法记录有效的 SelectionEvent
              return { accepted: false, reason: 'no associated QueryEvent' };
            }
      
            // 查找选择项的学习前/后排名
            const resultsByPackage = resp._resultsByPackage || new Map();
            const selected = resultsByPackage.get(selectedPackageName);
            const selectedRankBeforeLearning = selected ? (selected._rankBeforeLearning || 0) : 0;
            const selectedRankAfterLearning = selected ? (selected.rank || 0) : 0;
      
            // 异步执行，不阻塞调用方
            Promise.resolve()
              .then(() => this._pl.recordSelection({
                queryEvent,
                selectedPackageName,
                selectedRankBeforeLearning,
                selectedRankAfterLearning,
                selectionSource: 'engine-result'
              }))
              .catch(() => { /* 静默 */ });
      
            return { accepted: true };
          } catch (e) {
            // 静默：recordSelection 失败不影响应用启动
            return { accepted: false, reason: 'error: ' + (e && e.message ? e.message : String(e)) };
          }
        }
      
        /**
         * 等待所有待处理的学习更新完成（测试用）。
         */
        async _waitForPendingUpdates() {
          if (this._pl && typeof this._pl._waitForPendingUpdates === 'function') {
            await this._pl._waitForPendingUpdates();
          }
        }
      
        /**
         * 返回当前配置（只读）。
         */
        getConfig() {
          return Object.freeze(Object.assign({}, this._config));
        }
      }
      
      // ====== 内部辅助 ======
      
      function round4(v) {
        if (typeof v !== 'number' || isNaN(v)) return 0;
        return Math.round(v * 10000) / 10000;
      }
      
      function buildExplanation(c, isExact, engineAvailable, baseAvailable, plEnabled) {
        const parts = [];
        if (isExact) parts.push('exact-name-match');
        if (c.engineScore > 0) parts.push(`engine=${c.engineScore}`);
        if (c.metadataScore > 0) parts.push(`base=${c.metadataScore}`);
        if (c.personalScore > 0) parts.push(`personal=${c.personalScore}`);
        if (!engineAvailable) parts.push('engine-unavailable');
        if (!baseAvailable) parts.push('base-unavailable');
        if (!plEnabled) parts.push('personal-disabled');
        return parts.join('; ');
      }
      
      module.exports = {
        SearchCoordinator,
        DEFAULT_COORDINATOR_CONFIG,
        isExactAppNameMatch,
        classifyMatch,
        round4
      };
      
    },
    'integration/javascript/global-base-adapter.js': function (module, exports, require, __dirname, __filename) {
      'use strict';
      
      /**
       * GOTO Base × HOST 集成层 — GlobalBaseAdapter
       *
       * 把 data/seeds/ 下的 AppRecord JSON 包装为统一的 metadataBoost 来源。
       *
       * 职责：
       *   - 只读：仅读取 data/seeds/ 下的 JSON 文件，绝不修改
       *   - 不依赖任何 GOTO Engine 代码
       *   - 提供统一的 getMetadataBoost(query, packageNames) 接口供 SearchCoordinator 调用
       *
       * Boost 规则（可配置，默认值对齐任务规范）：
       *   - 别名命中（aliases / abbreviations / canonicalName / localizedNames）: +0.3
       *   - 关键词命中（keywords）: +0.2
       *   - 能力命中（capabilities）: +0.25
       *   - 意图命中（userIntents）: +0.35
       *   - 场景命中（usageScenarios）: +0.2
       *
       * 命中判定（normalize 后大小写不敏感）：
       *   - 精确相等：query === token
       *   - 包含：query 包含 token，或 token 包含 query（双向 substring）
       *   - 单字查询特殊处理：query 长度 === 1 时只走精确相等，避免误命中
       *
       * 多类命中累加上限：单个应用的 metadataBoost 总和 clamp 到 [0, 1]。
       */
      
      const path = require('path');
      
      const DEFAULT_BOOST_WEIGHTS = Object.freeze({
        alias: 0.3,
        keyword: 0.2,
        capability: 0.25,
        intent: 0.35,
        scenario: 0.2
      });
      
      const DEFAULT_CONFIG = Object.freeze({
        boostWeights: DEFAULT_BOOST_WEIGHTS,
        maxBoost: 1.0,
        minBoost: 0.0
      });
      
      /**
       * 简单的归一化：trim + toLowerCase + 全角转半角 + 压缩空白。
       * 复用 runtime/shared/query-normalizer.js 的纯函数（不引入 PersonalLearning 依赖）。
       */
      function normalizeText(s) {
        if (typeof s !== 'string') return '';
        let out = '';
        for (let i = 0; i < s.length; i++) {
          const code = s.charCodeAt(i);
          // 全角空格
          if (code === 0x3000) { out += ' '; continue; }
          // 全角 ASCII
          if (code >= 0xff01 && code <= 0xff5e) {
            out += String.fromCharCode(code - 0xfee0);
            continue;
          }
          // 控制字符过滤
          if (code <= 0x001f && code !== 0x0009 && code !== 0x000a && code !== 0x000d) continue;
          if (code >= 0x007f && code <= 0x009f) continue;
          out += s[i];
        }
        return out.toLowerCase().replace(/\s+/g, ' ').trim();
      }
      
      class GlobalBaseAdapter {
        /**
         * @param {object} options
         *   - {object} [knowledgeBase] 预加载的 AppRecord 数组（浏览器场景）
         *   - {object} [config] 配置覆盖
         */
        constructor({ knowledgeBase, config } = {}) {
          this._records = new Map();       // packageName -> AppRecord
          this._aliasIndex = new Map();    // normalizedAlias -> Set<packageName>
          this._loaded = false;
          this._loadError = null;
          this._config = Object.assign({}, DEFAULT_CONFIG, config || {});
          if (Array.isArray(knowledgeBase)) {
            this._ingestRecords(knowledgeBase);
            this._loaded = true;
          }
        }
      
        /**
         * 从磁盘加载 data/seeds/ 下的所有 *.json 文件。
         * 浏览器场景应直接通过 constructor({ knowledgeBase: [...] }) 注入。
         *
         * @param {string} seedsDir data/seeds 目录绝对路径
         * @returns {Promise<{loaded: number, skipped: number}>}
         */
        async loadSeeds(seedsDir) {
          if (!seedsDir) {
            this._loadError = new Error('loadSeeds: seedsDir is required');
            this._loaded = false;
            return { loaded: 0, skipped: 0 };
          }
          let fs;
          try { fs = require('fs'); }
          catch (e) {
            this._loadError = new Error('loadSeeds: fs unavailable (browser context)');
            this._loaded = false;
            return { loaded: 0, skipped: 0 };
          }
      
          let files = [];
          try {
            files = fs.readdirSync(seedsDir).filter(f => f.endsWith('.json'));
          } catch (e) {
            this._loadError = e;
            this._loaded = false;
            return { loaded: 0, skipped: 0 };
          }
      
          let loaded = 0;
          let skipped = 0;
          for (const f of files) {
            try {
              const full = path.join(seedsDir, f);
              const raw = fs.readFileSync(full, 'utf8');
              const obj = JSON.parse(raw);
              this._ingestRecord(obj);
              loaded++;
            } catch (e) {
              // 单文件失败不阻塞整体加载
              skipped++;
            }
          }
          this._loaded = true;
          this._loadError = null;
          return { loaded, skipped };
        }
      
        /**
         * 批量注入预加载的 AppRecord（浏览器 / 测试场景）。
         * @param {Array} records
         */
        loadRecords(records) {
          if (!Array.isArray(records)) return;
          this._ingestRecords(records);
          this._loaded = true;
        }
      
        _ingestRecords(records) {
          for (const r of records) {
            this._ingestRecord(r);
          }
        }
      
        _ingestRecord(rec) {
          if (!rec || typeof rec !== 'object') return;
          const packageName = rec.androidPackageName || rec.packageName || rec.recordId;
          if (!packageName) return;
          this._records.set(packageName, rec);
      
          // 索引所有"别名类"字段，便于快速反查
          const aliasTokens = this._collectAliasTokens(rec);
          for (const tok of aliasTokens) {
            const norm = normalizeText(tok);
            if (!norm) continue;
            if (!this._aliasIndex.has(norm)) this._aliasIndex.set(norm, new Set());
            this._aliasIndex.get(norm).add(packageName);
          }
        }
      
        _collectAliasTokens(rec) {
          const tokens = new Set();
          if (rec.canonicalName) tokens.add(rec.canonicalName);
          if (rec.localizedNames && typeof rec.localizedNames === 'object') {
            for (const k of Object.keys(rec.localizedNames)) {
              const v = rec.localizedNames[k];
              if (v) tokens.add(v);
            }
          }
          if (Array.isArray(rec.aliases)) {
            for (const a of rec.aliases) if (a) tokens.add(a);
          }
          if (Array.isArray(rec.abbreviations)) {
            for (const a of rec.abbreviations) if (a) tokens.add(a);
          }
          return Array.from(tokens);
        }
      
        /**
         * 是否已加载（哪怕部分失败也算 loaded=true）。
         */
        get available() {
          return this._loaded && this._records.size > 0;
        }
      
        get loadError() {
          return this._loadError;
        }
      
        /**
         * 获取单个应用记录。
         */
        getAppRecord(packageName) {
          if (!packageName) return null;
          return this._records.get(packageName) || null;
        }
      
        /**
         * 是否在 Global Base 中。
         */
        isKnown(packageName) {
          return !!packageName && this._records.has(packageName);
        }
      
        /**
         * 已加载的应用数。
         */
        size() {
          return this._records.size;
        }
      
        /**
         * 判定一个 token 是否与查询匹配（双向 substring，单字查询只走精确相等）。
         */
        _isMatch(normalizedQuery, token) {
          const normTok = normalizeText(token);
          if (!normTok || !normalizedQuery) return false;
          if (normalizedQuery === normTok) return true;
          // 单字查询（长度 1）只接受精确相等，避免 "w" 命中 "WeChat" 这种过宽匹配
          if (normalizedQuery.length <= 1) return false;
          if (normTok.length <= 1) {
            // 单字 token：要求 query 完全等于 token（已上面处理）
            return false;
          }
          return normalizedQuery.indexOf(normTok) >= 0 || normTok.indexOf(normalizedQuery) >= 0;
        }
      
        /**
         * 计算单个应用记录在给定查询下的 metadataBoost 分数。
         * @param {object} rec AppRecord
         * @param {string} normalizedQuery 归一化查询
         * @returns {number}
         */
        _scoreRecord(rec, normalizedQuery) {
          if (!rec || !normalizedQuery) return 0;
          const w = this._config.boostWeights || DEFAULT_BOOST_WEIGHTS;
          let total = 0;
      
          // 别名类（aliases / abbreviations / canonicalName / localizedNames）
          const aliasTokens = this._collectAliasTokens(rec);
          let aliasHit = false;
          for (const tok of aliasTokens) {
            if (this._isMatch(normalizedQuery, tok)) { aliasHit = true; break; }
          }
          if (aliasHit) total += (w.alias || 0);
      
          // 关键词
          if (Array.isArray(rec.keywords)) {
            for (const k of rec.keywords) {
              if (this._isMatch(normalizedQuery, k)) { total += (w.keyword || 0); break; }
            }
          }
      
          // 能力
          if (Array.isArray(rec.capabilities)) {
            for (const c of rec.capabilities) {
              if (this._isMatch(normalizedQuery, c)) { total += (w.capability || 0); break; }
            }
          }
      
          // 意图
          if (Array.isArray(rec.userIntents)) {
            for (const i of rec.userIntents) {
              if (this._isMatch(normalizedQuery, i)) { total += (w.intent || 0); break; }
            }
          }
      
          // 场景
          if (Array.isArray(rec.usageScenarios)) {
            for (const s of rec.usageScenarios) {
              if (this._isMatch(normalizedQuery, s)) { total += (w.scenario || 0); break; }
            }
          }
      
          return Math.max(this._config.minBoost, Math.min(this._config.maxBoost, total));
        }
      
        /**
         * 给定查询与候选包名列表，返回每个包名的 metadataBoost 分数。
         *
         * @param {string} query 原始或归一化查询
         * @param {Array<string>} packageNames 候选包名
         * @returns {Map<string, number>} packageName -> boost 分数（不存在的包名返回 0）
         */
        getMetadataBoost(query, packageNames) {
          const result = new Map();
          if (!query || !Array.isArray(packageNames) || packageNames.length === 0) {
            return result;
          }
          const nq = normalizeText(query);
          if (!nq) return result;
          for (const pkg of packageNames) {
            if (!pkg) continue;
            const rec = this._records.get(pkg);
            if (!rec) {
              result.set(pkg, 0);
              continue;
            }
            result.set(pkg, this._scoreRecord(rec, nq));
          }
          return result;
        }
      
        /**
         * 反查：归一化别名 → 包名（用于精确匹配保护等场景）。
         * @param {string} alias
         * @returns {Array<string>} 命中的包名列表
         */
        lookupByAlias(alias) {
          const norm = normalizeText(alias);
          if (!norm) return [];
          const set = this._aliasIndex.get(norm);
          return set ? Array.from(set) : [];
        }
      
        /**
         * 返回所有已加载的 AppRecord（用于诊断或导出）。
         */
        allRecords() {
          return Array.from(this._records.values());
        }
      }
      
      module.exports = {
        GlobalBaseAdapter,
        DEFAULT_BOOST_WEIGHTS,
        DEFAULT_CONFIG,
        normalizeText
      };
      
    },
    'runtime/shared/query-normalizer.js': function (module, exports, require, __dirname, __filename) {
      'use strict';
      
      /**
       * GOTO Base Personal Learning — QueryNormalizer (语言无关接口)
       *
       * 纯函数模块：输入用户原始查询，输出归一化后的字符串与语言检测结果。
       * 不与 Engine / Base 知识库耦合，不产生 IO 副作用。
       *
       * 归一化规则：
       *   1. trim（去首尾空白）
       *   2. 不可见字符过滤（控制字符 U+0000~U+001F, U+007F~U+009F, BOM, 零宽字符等）
       *   3. 全角字符 → 半角（含 ASCII 字母/数字/标点，及全角空格 U+3000 → 半角空格）
       *   4. 大小写归一化（toLower，但保留中文/标点）
       *   5. 连续空白压缩为单个空格
       *
       * 不做：
       *   - 不做语义合并（"微信付款" 与 "微信聊天" 保持独立）
       *   - 不做拼音转换（pinyin 仅作为 detectLanguage 的判定结果，不改写字符）
       *   - 不做停用词过滤
       *
       * 接口对齐：Kotlin/Rust 实现应保持完全一致的字符串变换规则，便于跨语言事件比对。
       */
      
      /** 全角字符 → 半角字符 的核心映射 */
      function toHalfWidthChar(ch) {
        const code = ch.charCodeAt(0);
        // 全角空格 U+3000 → 半角空格 U+0020
        if (code === 0x3000) return ' ';
        // 全角 ASCII 字符 U+FF01~U+FF5E → 半角 U+0021~U+007E
        if (code >= 0xff01 && code <= 0xff5e) {
          return String.fromCharCode(code - 0xfee0);
        }
        return ch;
      }
      
      /**
       * 过滤不可见字符：
       *   - 控制字符 U+0000~U+001F（保留 \t \n \r 暂时，由空格压缩逻辑统一处理）
       *   - 控制字符 U+007F~U+009F
       *   - BOM U+FEFF
       *   - 零宽字符 U+200B / U+200C / U+200D / U+2060
       *   - 方向控制符 U+202A~U+202E、U+2066~U+2069
       */
      function isInvisibleChar(code) {
        if (code <= 0x001f) return code !== 0x0009 && code !== 0x000a && code !== 0x000d;
        if (code >= 0x007f && code <= 0x009f) return true;
        if (code === 0xfeff) return true;
        if (code === 0x200b || code === 0x200c || code === 0x200d || code === 0x2060) return true;
        if (code >= 0x202a && code <= 0x202e) return true;
        if (code >= 0x2066 && code <= 0x2069) return true;
        return false;
      }
      
      /**
       * 归一化用户查询。
       *
       * @param {string} rawQuery 原始查询
       * @returns {string} 归一化后查询（永远不为空字符串，若输入空则返回空字符串）
       */
      function normalize(rawQuery) {
        if (typeof rawQuery !== 'string') return '';
        if (rawQuery.length === 0) return '';
      
        let out = '';
        for (let i = 0; i < rawQuery.length; i++) {
          const ch = rawQuery[i];
          const code = ch.charCodeAt(0);
          if (isInvisibleChar(code)) continue;
          out += toHalfWidthChar(ch);
        }
      
        // 大小写归一化（toLower）
        out = out.toLowerCase();
      
        // 连续空白压缩为单个空格
        out = out.replace(/\s+/g, ' ');
      
        // trim
        out = out.trim();
      
        return out;
      }
      
      // ====== 语言检测 ======
      
      /** 拼音特征表（覆盖常见拼音音节，用于判定纯拉丁字母 token 是否为拼音） */
      const PINYIN_HINTS = new Set([
        // 单韵母
        'a', 'o', 'e', 'i', 'u', 'v',
        // 复韵母
        'ai', 'ei', 'ao', 'ou', 'an', 'en', 'ang', 'eng', 'er', 'ia', 'ie', 'iao', 'iu',
        'ian', 'in', 'iang', 'iong', 'ua', 'uo', 'uai', 'ui', 'uan', 'un', 'uang', 'ue', 've',
        // b
        'ba', 'bo', 'bai', 'bei', 'bao', 'ban', 'ben', 'bang', 'beng', 'bi', 'bie', 'biao', 'bian', 'bin', 'bing',
        // p
        'pa', 'po', 'pai', 'pei', 'pao', 'pou', 'pan', 'pen', 'pang', 'peng', 'pi', 'pie', 'piao', 'pian', 'pin', 'ping',
        // m
        'ma', 'mo', 'me', 'mai', 'mei', 'mao', 'mou', 'man', 'men', 'mang', 'meng', 'mi', 'mie', 'miao', 'miu', 'mian', 'min', 'ming',
        // f
        'fa', 'fo', 'fei', 'fao', 'fou', 'fan', 'fen', 'fang', 'feng',
        // d
        'da', 'de', 'dai', 'dei', 'dao', 'dou', 'dan', 'den', 'dang', 'deng', 'di', 'die', 'diao', 'diu', 'dian', 'ding', 'du', 'duo', 'dui', 'duan', 'dun', 'dong',
        // t
        'ta', 'te', 'tai', 'tao', 'tou', 'tan', 'tang', 'teng', 'ti', 'tie', 'tiao', 'tian', 'ting', 'tu', 'tuo', 'tui', 'tuan', 'tun', 'tong',
        // n
        'na', 'ne', 'nai', 'nei', 'nao', 'nou', 'nan', 'nen', 'nang', 'neng', 'ni', 'nie', 'niao', 'niu', 'nian', 'nin', 'niang', 'ning', 'nu', 'nuo', 'nuan', 'nong',
        // l
        'la', 'le', 'lai', 'lei', 'lao', 'lou', 'lan', 'lang', 'leng', 'li', 'lia', 'lie', 'liao', 'liu', 'lian', 'lin', 'liang', 'ling', 'lo', 'lu', 'luo', 'lua', 'lui', 'luan', 'lun', 'long',
        // g
        'ga', 'ge', 'gai', 'gei', 'gao', 'gou', 'gan', 'gen', 'gang', 'geng', 'gu', 'gua', 'guo', 'guai', 'gui', 'guan', 'gun', 'guang', 'gong',
        // k
        'ka', 'ke', 'kai', 'kao', 'kou', 'kan', 'ken', 'kang', 'keng', 'ku', 'kua', 'kuo', 'kuai', 'kui', 'kuan', 'kun', 'kuang', 'kong',
        // h
        'ha', 'he', 'hai', 'hei', 'hao', 'hou', 'han', 'hen', 'hang', 'heng', 'hu', 'hua', 'huo', 'huai', 'hui', 'huan', 'hun', 'huang', 'hong',
        // j
        'ji', 'jia', 'jie', 'jiao', 'jiu', 'jian', 'jin', 'jiang', 'jiong', 'jing', 'ju', 'jue', 'juan', 'jun',
        // q
        'qi', 'qia', 'qie', 'qiao', 'qiu', 'qian', 'qin', 'qiang', 'qiong', 'qing', 'qu', 'que', 'quan', 'qun',
        // x
        'xi', 'xia', 'xie', 'xiao', 'xiu', 'xian', 'xin', 'xiang', 'xiong', 'xing', 'xu', 'xue', 'xuan', 'xun',
        // zh
        'zha', 'zhe', 'zhai', 'zhao', 'zhou', 'zhan', 'zhen', 'zhang', 'zheng', 'zhi', 'zhua', 'zhuo', 'zhuai', 'zhui', 'zhuan', 'zhun', 'zhuang', 'zhong',
        // ch
        'cha', 'che', 'chai', 'chao', 'chou', 'chan', 'chen', 'chang', 'cheng', 'chi', 'chua', 'chuo', 'chuai', 'chui', 'chuan', 'chun', 'chuang', 'chong',
        // sh
        'sha', 'she', 'shai', 'shei', 'shao', 'shou', 'shan', 'shen', 'shang', 'sheng', 'shi', 'shua', 'shuo', 'shuai', 'shui', 'shuan', 'shun', 'shuang',
        // r
        'ran', 'ren', 'rang', 'reng', 'ri', 'rou', 'ru', 'rua', 'ruo', 'rui', 'ruan', 'run', 'rong',
        // z
        'za', 'ze', 'zai', 'zei', 'zao', 'zou', 'zan', 'zen', 'zang', 'zeng', 'zi', 'zong', 'zuan', 'zui', 'zun', 'zuo',
        // c
        'ca', 'ce', 'cai', 'cao', 'cou', 'can', 'cen', 'cang', 'ceng', 'ci', 'cong', 'cuan', 'cui', 'cun', 'cuo',
        // s
        'sa', 'se', 'sai', 'sao', 'sou', 'san', 'sen', 'sang', 'seng', 'si', 'song', 'suan', 'sui', 'sun', 'suo',
        // y
        'ya', 'yo', 'ye', 'yao', 'you', 'yan', 'yin', 'yang', 'ying', 'yong', 'yu', 'yue', 'yuan', 'yun', 'wei', 'wo'
      ]);
      
      /**
       * 检测归一化后查询的主要语言/类型。
       *
       * 判定顺序：
       *   1. 全为空 → unknown
       *   2. 含中文 → zh（若混有拉丁字母则视为 mixed）
       *   3. 仅拉丁字母/数字：
       *      - 长度 1~6 且匹配常见拼音 → pinyin
       *      - 否则 en
       *   4. 含其他非拉丁非中文字符 → mixed
       *
       * @param {string} normalizedQuery 已归一化的查询
       * @returns {'zh' | 'en' | 'pinyin' | 'mixed' | 'unknown'} 语言标签
       */
      function detectLanguage(normalizedQuery) {
        if (typeof normalizedQuery !== 'string' || normalizedQuery.length === 0) return 'unknown';
      
        let hasHan = false;
        let hasLatin = false;
        let hasOther = false;
      
        for (let i = 0; i < normalizedQuery.length; i++) {
          const code = normalizedQuery.charCodeAt(i);
          if (code === 0x0020) continue; // 空格分隔符
          // CJK Unified Ideographs (常用基础区 + 扩展 A)
          if ((code >= 0x4e00 && code <= 0x9fff) || (code >= 0x3400 && code <= 0x4dbf)) {
            hasHan = true;
            continue;
          }
          // 基本拉丁字母
          if ((code >= 0x0061 && code <= 0x007a) || (code >= 0x0041 && code <= 0x005a)) {
            hasLatin = true;
            continue;
          }
          // 数字与 ASCII 标点
          if ((code >= 0x0030 && code <= 0x0039) || code === 0x002d || code === 0x002e || code === 0x005f) {
            continue;
          }
          hasOther = true;
        }
      
        if (hasHan && !hasLatin && !hasOther) return 'zh';
        if (hasHan && (hasLatin || hasOther)) return 'mixed';
        if (!hasHan && !hasLatin) return 'unknown';
      
        // 仅拉丁字母 / 数字
        if (hasOther) return 'mixed';
        // 尝试拼音判定（按 token 拆分）
        const tokens = normalizedQuery.split(/\s+/).filter(Boolean);
        if (tokens.length > 0 && tokens.every(t => t.length <= 6 && /^[a-z]+$/.test(t))) {
          const allPinyin = tokens.every(t => PINYIN_HINTS.has(t));
          if (allPinyin) return 'pinyin';
        }
        // 单 token 短拉丁串：可能是拼音（如 "wx" 不是拼音，但 "wei" 是）
        if (tokens.length === 1 && /^[a-z]+$/.test(tokens[0]) && PINYIN_HINTS.has(tokens[0])) {
          return 'pinyin';
        }
        return 'en';
      }
      
      /**
       * 判定是否为短查询。
       *
       * @param {string} normalizedQuery 已归一化的查询
       * @param {number} [shortQueryMaxLength=2] 短查询最大长度（含）
       * @returns {boolean}
       */
      function isShortQuery(normalizedQuery, shortQueryMaxLength) {
        if (typeof normalizedQuery !== 'string' || normalizedQuery.length === 0) return false;
        const maxLen = (typeof shortQueryMaxLength === 'number' && shortQueryMaxLength > 0)
          ? shortQueryMaxLength
          : 2;
        // 短查询判定基于"非空白字符数"，避免 "a b c" 被误判为长查询
        const noSpaceLen = normalizedQuery.replace(/\s+/g, '').length;
        return noSpaceLen <= maxLen;
      }
      
      module.exports = {
        normalize,
        detectLanguage,
        isShortQuery,
        // 暴露内部纯函数便于单元测试
        toHalfWidthChar,
        isInvisibleChar
      };
      
    },
    'runtime/shared/learning-algorithms.js': function (module, exports, require, __dirname, __filename) {
      'use strict';
      
      /**
       * GOTO Base Personal Learning — 核心算法（纯函数，无 IO）
       *
       * 本模块实现 Personal Learning Overlay 的所有更新/排序规则。
       * 所有函数都是纯函数：相同输入永远产出相同输出，不修改全局状态，不读写文件。
       *
       * 设计原则：
       *   1. 第一次点击：仅建立 candidate 映射，confidence 不超过 candidateThreshold
       *   2. 多次重复选择：逐步增加 confidence
       *   3. 用户改选其他应用：降低旧映射权重（correctionDecrement）
       *   4. 连续改选：视为纠错信号，减量更大
       *   5. 长期未使用：按 decayHalfLifeDays 衰减，但不低于 decayMinWeight
       *   6. 短查询（<= shortQueryMaxLength）：证据权重 *= shortQueryEvidenceFactor
       *   7. 排名第一且用户点击：增量较小（rank1ClickIncrement）
       *   8. 排名较低但用户主动点击：增量较大（lowRankClickIncrement）
       *   9. 最大 personalBoost 不超过 maxPersonalBoost
       *   10. 精确应用名命中保有最高优先级保护
       */
      
      const MS_PER_DAY = 24 * 60 * 60 * 1000;
      const MS_PER_HALF_LIFE_DIVISOR = Math.log(2); // ln(2) ≈ 0.6931
      
      /**
       * 计算时间衰减后的"加权点击次数"系数。
       *
       * 公式：factor = max(decayMinWeight, 0.5 ^ (daysSinceLastSeen / decayHalfLifeDays))
       *
       * 说明：完全等同于放射性指数衰减，半衰期为 decayHalfLifeDays。
       *   - daysSinceLastSeen = 0  → factor = 1.0（无衰减）
       *   - daysSinceLastSeen = decayHalfLifeDays → factor = 0.5
       *   - daysSinceLastSeen = 2 * decayHalfLifeDays → factor = 0.25
       *   - ... 但不低于 decayMinWeight
       *
       * @param {string} lastSeenAt ISO 8601 时间
       * @param {string|Date} now 当前时间
       * @param {object} config 学习配置
       * @returns {number} 衰减系数 [decayMinWeight, 1]
       */
      function computeDecayWeight(lastSeenAt, now, config) {
        const halfLifeDays = (config && typeof config.decayHalfLifeDays === 'number')
          ? config.decayHalfLifeDays : 30;
        const minWeight = (config && typeof config.decayMinWeight === 'number')
          ? config.decayMinWeight : 0.05;
      
        if (!lastSeenAt) return minWeight;
        const lastMs = Date.parse(lastSeenAt);
        const nowMs = (now instanceof Date) ? now.getTime() : Date.parse(now);
        if (isNaN(lastMs) || isNaN(nowMs)) return minWeight;
        if (nowMs <= lastMs) return 1.0;
      
        const daysSince = (nowMs - lastMs) / MS_PER_DAY;
        if (daysSince <= 0) return 1.0;
      
        // 0.5 ^ (days / halfLife)
        const factor = Math.pow(0.5, daysSince / halfLifeDays);
        return Math.max(minWeight, factor);
      }
      
      /**
       * 计算本次点击的增量。
       *
       * 规则：
       *   - 首次点击（isRepeat=false）：firstClickIncrement
       *   - 重复点击（isRepeat=true）：repeatClickIncrement + 排名加成
       *     - rank === 1：rank1ClickIncrement（用户预期行为，加权较小）
       *     - rank > 3（低排名）：lowRankClickIncrement（用户主动选择，加权较大）
       *     - 中间排名：0
       *   - 短查询（queryLength <= shortQueryMaxLength）：增量 *= shortQueryEvidenceFactor
       *
       * @param {number} rank 学习前排名（1-based，0 表示未在候选中）
       * @param {boolean} isRepeat 是否为重复点击（已存在 affinity）
       * @param {number} queryLength 归一化查询字符数（不含空格）
       * @param {object} config 学习配置
       * @returns {number} 增量（>= 0）
       */
      function computeClickIncrement(rank, isRepeat, queryLength, config) {
        const cfg = config || {};
        const firstInc = cfg.firstClickIncrement || 0.15;
        const repeatInc = cfg.repeatClickIncrement || 0.1;
        const rank1Inc = cfg.rank1ClickIncrement || 0.05;
        const lowRankInc = cfg.lowRankClickIncrement || 0.2;
        const shortFactor = cfg.shortQueryEvidenceFactor || 0.5;
        const shortMaxLen = cfg.shortQueryMaxLength || 2;
      
        let inc;
        if (!isRepeat) {
          inc = firstInc;
        } else {
          inc = repeatInc;
          // 排名加成（仅重复点击考虑排名加成，避免首次点击被排名主导）
          if (rank === 1) {
            inc += rank1Inc;
          } else if (rank === 0 || rank > 3) {
            // rank === 0 表示未在候选中（用户主动启动），视为强信号
            inc += lowRankInc;
          }
        }
      
        if (typeof queryLength === 'number' && queryLength > 0 && queryLength <= shortMaxLen) {
          inc *= shortFactor;
        }
      
        return Math.max(0, inc);
      }
      
      /**
       * 计算纠正减量。
       *
       * 规则：
       *   - 单次纠正（isConsecutive=false）：correctionDecrement
       *   - 连续纠正（isConsecutive=true）：correctionDecrement * 1.5（视为强纠错信号）
       *
       * @param {boolean} isConsecutive 是否为连续纠正（最近一次也是纠正）
       * @param {object} config 学习配置
       * @returns {number} 减量（>= 0）
       */
      function computeCorrectionDecrement(isConsecutive, config) {
        const cfg = config || {};
        const base = cfg.correctionDecrement || 0.15;
        return isConsecutive ? base * 1.5 : base;
      }
      
      /**
       * 判定一次点击是否为"纠正信号"。
       *
       * 纠正信号：用户改选了其他应用，并且该应用的 rank 在最近一次候选中靠前（<=3）但未被选择。
       * 此函数仅返回布尔，减量由 computeCorrectionDecrement 计算。
       *
       * @param {object} prevSelection 上次的选择事件
       * @param {object} currentSelection 本次的选择事件
       * @returns {boolean}
       */
      function isCorrectionSignal(prevSelection, currentSelection) {
        if (!prevSelection || !currentSelection) return false;
        if (prevSelection.normalizedQuery !== currentSelection.normalizedQuery) return false;
        if (prevSelection.selectedPackageName === currentSelection.selectedPackageName) return false;
        // 同一查询下用户改选了不同的应用 → 纠正
        return true;
      }
      
      /**
       * 根据 SelectionEvent 更新 QueryAppAffinity（返回新对象，不修改入参）。
       *
       * 实现说明：
       *   - 若 affinity 为空（首次点击）：firstSeenAt = timestamp，建立 candidate
       *   - selectionCount++
       *   - weightedSelectionCount = (weightedSelectionCount * decayFactor) + increment
       *     其中 decayFactor 由 lastSeenAt → timestamp 的间隔计算（按半衰期衰减）
       *   - lastSeenAt = timestamp
       *   - confidence = clamp(weightedSelectionCount, 0, 1)（更精细的 confidence 公式由 updateAliasStatus 统一）
       *   - 当前 currentWeight = weightedSelectionCount - correctionCount * correctionDecrement - negativeCount * correctionDecrement
       *
       * @param {object|null} affinity 旧 QueryAppAffinity（若不存在则传 null）
       * @param {object} selectionEvent 选择事件（必含 normalizedQuery, packageName, selectedRankBeforeLearning, timestamp）
       * @param {object} config 学习配置
       * @returns {object} 更新后的 QueryAppAffinity（新对象）
       */
      function updateAffinity(affinity, selectionEvent, config) {
        const cfg = config || {};
        const {
          createQueryAppAffinity
        } = require('runtime/shared/learning-types.js');
      
        const ts = selectionEvent.timestamp;
        const rank = selectionEvent.selectedRankBeforeLearning || 0;
        const qLen = (selectionEvent.normalizedQuery || '').replace(/\s+/g, '').length;
      
        if (!affinity) {
          // 首次点击：建立 candidate 映射
          const created = createQueryAppAffinity({
            normalizedQuery: selectionEvent.normalizedQuery,
            packageName: selectionEvent.selectedPackageName,
            firstSeenAt: ts
          });
          created.lastSeenAt = ts;
          const inc = computeClickIncrement(rank, false, qLen, cfg);
          created.selectionCount = 1;
          created.weightedSelectionCount = inc;
          created.confidence = clampConfidence(inc, cfg);
          created.currentWeight = inc;
          // 上下文统计（首次点击也填充）
          const ctx = selectionEvent.context || {};
          const timeOfDay = ctx.timeOfDay || 'unknown';
          created.contextStats[timeOfDay] = { count: 1, avgRank: rank };
          return created;
        }
      
        // 已存在 affinity：增量更新
        // 注意：返回新对象，不修改入参
        const updated = JSON.parse(JSON.stringify(affinity));
      
        const decayFactor = computeDecayWeight(updated.lastSeenAt, ts, cfg);
        const isRepeat = true;
        const inc = computeClickIncrement(rank, isRepeat, qLen, cfg);
      
        // 衰减旧权重，再加新增量
        updated.weightedSelectionCount = (updated.weightedSelectionCount * decayFactor) + inc;
        updated.selectionCount = (updated.selectionCount || 0) + 1;
        updated.lastSeenAt = ts;
      
        // 上下文统计
        const ctx = selectionEvent.context || {};
        const timeOfDay = ctx.timeOfDay || 'unknown';
        if (!updated.contextStats) updated.contextStats = {};
        const bucket = updated.contextStats[timeOfDay] || { count: 0, avgRank: 0 };
        // 增量平均
        const newCount = bucket.count + 1;
        bucket.avgRank = (bucket.avgRank * bucket.count + rank) / newCount;
        bucket.count = newCount;
        updated.contextStats[timeOfDay] = bucket;
      
        // 重置连续纠正计数（用户成功点击了此应用）
        updated.lastConsecutiveCorrectionCount = 0;
      
        // 重新计算 confidence & currentWeight
        updated.confidence = clampConfidence(updated.weightedSelectionCount, cfg);
        updated.currentWeight = updated.weightedSelectionCount
          - (updated.correctionCount || 0) * (cfg.correctionDecrement || 0.15)
          - (updated.negativeCount || 0) * (cfg.correctionDecrement || 0.15) * 0.5; // 负向信号减半
      
        return updated;
      }
      
      /**
       * 应用一次纠正信号到 affinity（用户改选了其他应用，此 affinity 被削弱）。
       * 返回新对象，不修改入参。
       *
       * @param {object} affinity 旧 affinity
       * @param {object} correctionEvent 纠正事件（包含 normalizedQuery, timestamp, selectedPackageName 是用户改选的目标）
       * @param {boolean} isConsecutive 是否连续纠正
       * @param {object} config 学习配置
       * @returns {object} 更新后的 affinity
       */
      function applyCorrection(affinity, correctionEvent, isConsecutive, config) {
        if (!affinity) return affinity;
        const cfg = config || {};
        const updated = JSON.parse(JSON.stringify(affinity));
      
        const dec = computeCorrectionDecrement(isConsecutive, cfg);
        updated.correctionCount = (updated.correctionCount || 0) + 1;
        updated.lastConsecutiveCorrectionCount = (updated.lastConsecutiveCorrectionCount || 0) + 1;
        updated.lastSeenAt = correctionEvent.timestamp || updated.lastSeenAt;
      
        // currentWeight 直接减量（可为负）
        updated.currentWeight = (updated.currentWeight || 0) - dec;
      
        // confidence 按当前权重重算
        updated.confidence = clampConfidence(updated.currentWeight, cfg);
      
        return updated;
      }
      
      /**
       * 应用一次负向信号到 affinity（用户主动跳过此应用）。
       * 返回新对象。
       *
       * @param {object} affinity
       * @param {object} negativeEvent 负向事件
       * @param {object} config
       * @returns {object}
       */
      function applyNegative(affinity, negativeEvent, config) {
        if (!affinity) return affinity;
        const cfg = config || {};
        const updated = JSON.parse(JSON.stringify(affinity));
      
        updated.negativeCount = (updated.negativeCount || 0) + 1;
        updated.lastSeenAt = negativeEvent.timestamp || updated.lastSeenAt;
        // 负向信号：currentWeight 直接减半的 correctionDecrement
        const dec = (cfg.correctionDecrement || 0.15) * 0.5;
        updated.currentWeight = (updated.currentWeight || 0) - dec;
        updated.confidence = clampConfidence(updated.currentWeight, cfg);
      
        return updated;
      }
      
      /**
       * 根据置信度与权重更新别名状态。
       *
       * 规则：
       *   - currentWeight <= suppressionThreshold → SUPPRESSED
       *   - confidence >= activeThreshold → ACTIVE
       *   - confidence >= candidateThreshold → CANDIDATE
       *   - 其他 → 维持原状态（不主动降级，避免抖动）
       *
       * 显式 DELETED 状态不在此函数恢复。
       *
       * @param {object} alias PersonalAlias 对象
       * @param {object} config 学习配置
       * @returns {object} 更新后的 alias（新对象）
       */
      function updateAliasStatus(alias, config) {
        if (!alias) return alias;
        const cfg = config || {};
        const updated = JSON.parse(JSON.stringify(alias));
      
        const {
          AliasStatus
        } = require('runtime/shared/learning-types.js');
      
        // 已显式删除，不再恢复
        if (updated.status === AliasStatus.DELETED) return updated;
      
        // 检查过期
        if (typeof updated.expiresAt === 'string' && updated.expiresAt) {
          const now = Date.now();
          const exp = Date.parse(updated.expiresAt);
          if (!isNaN(exp) && now > exp) {
            updated.status = AliasStatus.SUPPRESSED;
            return updated;
          }
        }
      
        // 强抑制优先
        if (typeof updated.currentWeight === 'number' &&
            updated.currentWeight <= (cfg.suppressionThreshold ?? -0.3)) {
          updated.status = AliasStatus.SUPPRESSED;
          return updated;
        }
      
        // 状态升级
        if (typeof updated.confidence !== 'number') updated.confidence = 0;
        if (updated.confidence >= (cfg.activeThreshold ?? 0.6)) {
          if (updated.status !== AliasStatus.ACTIVE) {
            updated.status = AliasStatus.ACTIVE;
          }
        } else if (updated.confidence >= (cfg.candidateThreshold ?? 0.3)) {
          if (updated.status === AliasStatus.CANDIDATE || updated.status === AliasStatus.ACTIVE) {
            // 维持
          } else {
            updated.status = AliasStatus.CANDIDATE;
          }
        } else {
          // confidence 不足，降至 candidate 或保持 suppressed
          if (updated.status !== AliasStatus.SUPPRESSED) {
            updated.status = AliasStatus.CANDIDATE;
          }
        }
        return updated;
      }
      
      /**
       * 计算个性化加权分数（personalBoost）。
       *
       * 公式：boost = clamp(currentWeight, 0, maxPersonalBoost)
       *
       * 注意：currentWeight 可为负（被抑制），此函数返回 0（不主动惩罚）。
       * 主动惩罚由 shouldSuppress 决定（PersonalRanker 决定是否纳入候选）。
       *
       * @param {object} affinity QueryAppAffinity
       * @param {object} config 学习配置
       * @returns {number} [0, maxPersonalBoost]
       */
      function computePersonalBoost(affinity, config) {
        if (!affinity) return 0;
        const cfg = config || {};
        const maxBoost = cfg.maxPersonalBoost ?? 0.5;
        if (typeof affinity.currentWeight !== 'number') return 0;
        if (affinity.currentWeight <= 0) return 0;
        // 加权：confidence 影响最终生效比例
        const effective = affinity.currentWeight * (typeof affinity.confidence === 'number' ? affinity.confidence : 1);
        return Math.max(0, Math.min(maxBoost, effective));
      }
      
      /**
       * 判定是否应该抑制此应用（不参与个性化加权）。
       *
       * 规则：
       *   - currentWeight <= suppressionThreshold → true
       *   - 别名状态为 SUPPRESSED 或 DELETED → true
       *
       * @param {object} affinity QueryAppAffinity
       * @param {object} config 学习配置
       * @returns {boolean}
       */
      function shouldSuppress(affinity, config) {
        if (!affinity) return false;
        const cfg = config || {};
        if (typeof affinity.currentWeight === 'number' &&
            affinity.currentWeight <= (cfg.suppressionThreshold ?? -0.3)) {
          return true;
        }
        return false;
      }
      
      /**
       * 分数归一化：将一组分数线性映射到 [0, 1]。
       *
       * 规则：
       *   - 全部相同 → 全部映射为 0.5
       *   - 否则：norm = (x - min) / (max - min)
       *   - 空输入 → 空数组
       *
       * @param {number[]} scores
       * @returns {number[]}
       */
      function normalizeScores(scores) {
        if (!Array.isArray(scores) || scores.length === 0) return [];
        if (scores.length === 1) return [0.5];
        let min = Infinity, max = -Infinity;
        for (const s of scores) {
          if (typeof s !== 'number' || isNaN(s)) continue;
          if (s < min) min = s;
          if (s > max) max = s;
        }
        if (min === max) return scores.map(() => 0.5);
        const range = max - min;
        return scores.map(s => (typeof s === 'number' && !isNaN(s)) ? (s - min) / range : 0);
      }
      
      // ====== 内部辅助 ======
      
      function clampConfidence(value, config) {
        if (typeof value !== 'number' || isNaN(value)) return 0;
        // confidence 是 [0, 1] 的概率值，由加权点击次数等推导
        // 这里使用简单的线性映射 + clamp
        return Math.max(0, Math.min(1, value));
      }
      
      module.exports = {
        // 衰减
        computeDecayWeight,
        // 增量
        computeClickIncrement,
        computeCorrectionDecrement,
        isCorrectionSignal,
        // 更新
        updateAffinity,
        applyCorrection,
        applyNegative,
        updateAliasStatus,
        // 排序
        computePersonalBoost,
        shouldSuppress,
        normalizeScores,
        // 暴露常量便于测试
        MS_PER_DAY
      };
      
    },
    'runtime/shared/learning-types.js': function (module, exports, require, __dirname, __filename) {
      'use strict';
      
      /**
       * GOTO Base Personal Learning — 数据类型与常量定义 (语言无关接口)
       *
       * 此模块定义 Personal Learning Overlay 的核心数据类型与默认配置。
       * 所有"工厂函数"返回深拷贝默认值，调用方负责填入业务字段。
       *
       * 接口对齐：Kotlin/Rust 实现应保持同名常量与字段顺序，便于跨语言事件序列化对齐。
       */
      
      // ====== Schema 版本 ======
      const LEARNING_SCHEMA_VERSION = '1.0.0';
      
      // ====== AliasStatus 枚举 ======
      const AliasStatus = Object.freeze({
        CANDIDATE: 'candidate',
        ACTIVE: 'active',
        SUPPRESSED: 'suppressed',
        DELETED: 'deleted'
      });
      
      // ====== SelectionSource 枚举 ======
      const SelectionSource = Object.freeze({
        ENGINE_RESULT: 'engine-result',
        BASE_BOOST: 'base-boost',
        PERSONAL_BOOST: 'personal-boost',
        MANUAL_LAUNCH: 'manual-launch',
        EXTERNAL: 'external'
      });
      
      // ====== QueryLanguage 枚举 ======
      const QueryLanguage = Object.freeze({
        ZH: 'zh',
        EN: 'en',
        PINYIN: 'pinyin',
        MIXED: 'mixed',
        UNKNOWN: 'unknown'
      });
      
      // ====== AliasSource 枚举 ======
      const AliasSource = Object.freeze({
        USER_CLICK: 'user-click',
        USER_IMPORT: 'user-import',
        EXPLICIT_BIND: 'explicit-bind',
        AUTO_DETECTED: 'auto-detected'
      });
      
      // ====== PersonalAliasSource 别名（与 AliasSource 同义，便于引用） ======
      const PersonalAliasSource = AliasSource;
      
      // ====== 默认配置（与 learning-config.schema.json 的 default 对齐） ======
      const DEFAULT_LEARNING_CONFIG = Object.freeze({
        maxPersonalBoost: 0.5,
        exactMatchProtection: true,
        candidateThreshold: 0.3,
        activeThreshold: 0.6,
        suppressionThreshold: -0.3,
        decayHalfLifeDays: 30,
        decayMinWeight: 0.05,
        firstClickIncrement: 0.15,
        repeatClickIncrement: 0.1,
        rank1ClickIncrement: 0.05,
        lowRankClickIncrement: 0.2,
        correctionDecrement: 0.15,
        shortQueryEvidenceFactor: 0.5,
        shortQueryMaxLength: 2,
        maxEventsKept: 10000,
        compactionIntervalEvents: 1000,
        aliasExpiresDays: 90,
        schemaVersion: LEARNING_SCHEMA_VERSION
      });
      
      /**
       * 合并用户配置与默认配置（浅合并，已冻结）。
       * @param {object} [override] 用户覆盖项
       * @returns {object} 合并后的配置（冻结）
       */
      function buildConfig(override) {
        if (!override || typeof override !== 'object') {
          return Object.assign({}, DEFAULT_LEARNING_CONFIG);
        }
        const merged = Object.assign({}, DEFAULT_LEARNING_CONFIG, override);
        // 简单数值范围保护（不抛错，clamp 到合理范围）
        merged.maxPersonalBoost = clampNum(merged.maxPersonalBoost, 0, 2);
        merged.candidateThreshold = clampNum(merged.candidateThreshold, 0, 1);
        merged.activeThreshold = clampNum(merged.activeThreshold, 0, 1);
        merged.shortQueryMaxLength = Math.max(1, Math.floor(merged.shortQueryMaxLength) || 2);
        merged.maxEventsKept = Math.max(100, Math.floor(merged.maxEventsKept) || 10000);
        merged.compactionIntervalEvents = Math.max(10, Math.floor(merged.compactionIntervalEvents) || 1000);
        merged.aliasExpiresDays = Math.max(1, Math.floor(merged.aliasExpiresDays) || 90);
        return Object.freeze(merged);
      }
      
      function clampNum(v, lo, hi) {
        if (typeof v !== 'number' || isNaN(v)) return lo;
        return Math.max(lo, Math.min(hi, v));
      }
      
      // ====== 工厂函数 ======
      
      /**
       * 创建一个空的 QueryEvent 对象，调用方填入业务字段。
       * @param {object} [init] 部分初始化字段
       * @returns {object}
       */
      function createQueryEvent(init) {
        init = init || {};
        return {
          eventId: init.eventId || '',
          rawQuery: init.rawQuery || '',
          normalizedQuery: init.normalizedQuery || '',
          queryLanguage: init.queryLanguage || QueryLanguage.UNKNOWN,
          timestamp: init.timestamp || '',
          sessionId: init.sessionId || '',
          context: init.context || {},
          candidatePackageNames: Array.isArray(init.candidatePackageNames) ? init.candidatePackageNames.slice() : [],
          engineRanking: Array.isArray(init.engineRanking) ? init.engineRanking.slice() : [],
          baseRanking: Array.isArray(init.baseRanking) ? init.baseRanking.slice() : [],
          schemaVersion: init.schemaVersion || LEARNING_SCHEMA_VERSION
        };
      }
      
      /**
       * 创建一个空的 SelectionEvent 对象。
       */
      function createSelectionEvent(init) {
        init = init || {};
        return {
          eventId: init.eventId || '',
          queryEventId: init.queryEventId || '',
          normalizedQuery: init.normalizedQuery || '',
          selectedPackageName: init.selectedPackageName || '',
          selectedRankBeforeLearning: typeof init.selectedRankBeforeLearning === 'number'
            ? init.selectedRankBeforeLearning : 0,
          selectedRankAfterLearning: typeof init.selectedRankAfterLearning === 'number'
            ? init.selectedRankAfterLearning : 0,
          timestamp: init.timestamp || '',
          sessionId: init.sessionId || '',
          selectionSource: init.selectionSource || SelectionSource.ENGINE_RESULT,
          context: init.context || {},
          dwellTimeMs: typeof init.dwellTimeMs === 'number' ? init.dwellTimeMs : undefined,
          schemaVersion: init.schemaVersion || LEARNING_SCHEMA_VERSION
        };
      }
      
      /**
       * 创建一个空的 QueryAppAffinity 对象。
       * @param {object} [init]
       * @param {string} [init.normalizedQuery]
       * @param {string} [init.packageName]
       * @param {string} [init.firstSeenAt]
       */
      function createQueryAppAffinity(init) {
        init = init || {};
        const ts = init.firstSeenAt || '';
        return {
          normalizedQuery: init.normalizedQuery || '',
          packageName: init.packageName || '',
          selectionCount: 0,
          weightedSelectionCount: 0,
          correctionCount: 0,
          negativeCount: 0,
          firstSeenAt: ts,
          lastSeenAt: ts,
          confidence: 0,
          currentWeight: 0,
          decayVersion: 0,
          contextStats: {},
          lastConsecutiveCorrectionCount: 0,
          schemaVersion: init.schemaVersion || LEARNING_SCHEMA_VERSION
        };
      }
      
      /**
       * 创建一个空的 PersonalAlias 对象。
       */
      function createPersonalAlias(init) {
        init = init || {};
        const ts = init.createdAt || '';
        return {
          alias: init.alias || '',
          packageName: init.packageName || '',
          source: init.source || AliasSource.USER_CLICK,
          confidence: 0,
          evidenceCount: 0,
          createdAt: ts,
          updatedAt: ts,
          expiresAt: init.expiresAt || null,
          status: init.status || AliasStatus.CANDIDATE,
          lastUsedAt: init.lastUsedAt || undefined,
          schemaVersion: init.schemaVersion || LEARNING_SCHEMA_VERSION
        };
      }
      
      /**
       * 创建一个 LocalAppStub 对象（用户本地未在 Base 全局知识库中的应用）。
       */
      function createLocalAppStub(init) {
        init = init || {};
        const ts = init.installedAt || '';
        return {
          packageName: init.packageName || '',
          appName: init.appName || '',
          version: typeof init.version === 'string' ? init.version : null,
          iconRef: typeof init.iconRef === 'string' ? init.iconRef : null,
          installedAt: ts,
          updatedAt: init.updatedAt || ts,
          discoveredVia: init.discoveredVia || '',
          userAliases: Array.isArray(init.userAliases) ? init.userAliases.slice() : [],
          metadata: init.metadata || {},
          schemaVersion: init.schemaVersion || LEARNING_SCHEMA_VERSION
        };
      }
      
      module.exports = {
        LEARNING_SCHEMA_VERSION,
        AliasStatus,
        SelectionSource,
        QueryLanguage,
        AliasSource,
        PersonalAliasSource,
        DEFAULT_LEARNING_CONFIG,
        buildConfig,
        createQueryEvent,
        createSelectionEvent,
        createQueryAppAffinity,
        createPersonalAlias,
        createLocalAppStub
      };
      
    },
    'integration/javascript/engine-adapter.js': function (module, exports, require, __dirname, __filename) {
      'use strict';
      
      /**
       * GOTO Base × HOST 集成层 — EngineAdapter
       *
       * 把冻结的 GOTO Engine（GOTOEngineFacade）的搜索响应包装为统一格式，
       * 供 SearchCoordinator 消费。
       *
       * 关键约束：
       *   - 不修改 GOTO Engine 任何代码，只调用其公开 API（GOTOEngineFacade.search）
       *   - 不修改 Engine 返回的 QueryResponse / SearchContext 对象
       *   - 处理 Engine 不可用 / 抛错 / 返回 null 的情况，统一降级为 { results: [], degraded: true }
       *   - 输出统一格式：
       *       {
       *         results: [{ packageName, appName, score, rank }],
       *         originalResponse: <Engine 原始响应，不修改>,
       *         degraded: boolean,
       *         error: string | null
       *       }
       */
      
      /**
       * 从 Engine 返回的 app 对象中提取 packageName 与 appName。
       * 兼容多种字段命名：id / packageName / androidPackageName / name / canonicalName / label。
       *
       * 当 app 缺少 packageName 字段时（如 HOST 网页预览数据集只有 name），
       * 可选地通过 resolver 函数从 GlobalBase 解析 packageName。
       */
      function extractPackageAndName(app, resolver) {
        if (!app || typeof app !== 'object') return { packageName: '', appName: '' };
        let packageName = app.packageName || app.id || app.androidPackageName ||
                          app.recordId || app.canonicalName || '';
        const appName = app.name || app.label || app.canonicalName || app.localizedName ||
                        app.packageName || '';
        // 当直接提取不到 packageName 时，尝试通过 resolver 从 GlobalBase 解析
        if (!packageName && resolver && typeof resolver === 'function') {
          try {
            const resolved = resolver(app);
            if (resolved && typeof resolved === 'string') packageName = resolved;
          } catch (_) { /* 静默降级 */ }
        }
        return { packageName: String(packageName || ''), appName: String(appName || '') };
      }
      
      /**
       * 从 Engine 响应中提取分数。
       * 兼容多种结构：
       *   - SearchContext: { list: [...], scores: { id -> number } }
       *   - QueryResponse: { data: { items: [{ name, score }] } }
       *   - 简单数组: [{ packageName, score }]
       */
      function extractScore(app, originalResponse, idx) {
        if (typeof app.score === 'number') return app.score;
        const id = app.packageName || app.id || app.androidPackageName || app.name;
        if (originalResponse && typeof originalResponse === 'object') {
          if (originalResponse.scores && id && typeof originalResponse.scores[id] === 'number') {
            return originalResponse.scores[id];
          }
          if (originalResponse.data && originalResponse.data.items &&
              Array.isArray(originalResponse.data.items) && idx < originalResponse.data.items.length) {
            const it = originalResponse.data.items[idx];
            if (it && typeof it.score === 'number') return it.score;
          }
        }
        // 默认分数：按 list 顺序递减（1.0, 0.9, ...），保证有相对差异
        return Math.max(0, 1 - idx * 0.1);
      }
      
      class EngineAdapter {
        /**
         * @param {object} options
         *   - {object} engineFacade GOTOEngineFacade 实例（必须提供 search 方法）
         *   - {function} [resolvePackageName] 可选，从 HOST app 解析 packageName 的函数 (app) => string
         *   - {function} [now] 自定义时间函数（测试用）
         */
        constructor({ engineFacade, resolvePackageName, now } = {}) {
          this._facade = engineFacade || null;
          this._resolvePackageName = (typeof resolvePackageName === 'function') ? resolvePackageName : null;
          this._now = now || (() => Date.now());
        }
      
        /**
         * 是否可用（facade 存在且提供 search 函数）。
         */
        get available() {
          return !!(this._facade && typeof this._facade.search === 'function');
        }
      
        /**
         * 调用 Engine 的搜索 API，包装为统一格式。
         *
         * @param {string} query 用户查询
         * @param {object} [options] 透传给 Engine 的选项
         * @returns {Promise<{
         *   results: Array<{packageName, appName, score, rank}>,
         *   originalResponse: any,
         *   degraded: boolean,
         *   error: string | null
         * }>}
         */
        async search(query, options) {
          if (!this.available) {
            return {
              results: [],
              originalResponse: null,
              degraded: true,
              error: 'Engine facade unavailable'
            };
          }
      
          let raw = null;
          try {
            const ret = this._facade.search(query, options || {});
            // 兼容同步 / Promise 返回
            raw = (ret && typeof ret.then === 'function') ? await ret : ret;
          } catch (e) {
            return {
              results: [],
              originalResponse: null,
              degraded: true,
              error: 'Engine search threw: ' + (e && e.message ? e.message : String(e))
            };
          }
      
          if (raw == null) {
            return {
              results: [],
              originalResponse: null,
              degraded: true,
              error: 'Engine returned null'
            };
          }
      
          // 提取候选列表：兼容 SearchContext.list / QueryResponse.data.items / 直接数组
          let list = null;
          if (Array.isArray(raw)) {
            list = raw;
          } else if (raw && Array.isArray(raw.list)) {
            list = raw.list;
          } else if (raw && raw.data && Array.isArray(raw.data.items)) {
            list = raw.data.items;
          } else if (raw && Array.isArray(raw.items)) {
            list = raw.items;
          } else {
            list = [];
          }
      
          const results = [];
          for (let i = 0; i < list.length; i++) {
            const app = list[i];
            if (!app) continue;
            const { packageName, appName } = extractPackageAndName(app, this._resolvePackageName);
            if (!packageName) continue;
            const score = extractScore(app, raw, i);
            results.push({
              packageName,
              appName,
              score: typeof score === 'number' ? score : 0,
              rank: i + 1
            });
          }
      
          // 重新计算 rank（保证 1-based 按 score 降序；不破坏原始顺序作为 tiebreaker）
          results.sort((a, b) => {
            if (b.score !== a.score) return b.score - a.score;
            return a.rank - b.rank;
          });
          for (let i = 0; i < results.length; i++) {
            results[i].rank = i + 1;
          }
      
          return {
            results,
            originalResponse: raw,
            degraded: false,
            error: null
          };
        }
      }
      
      module.exports = {
        EngineAdapter,
        extractPackageAndName,
        extractScore
      };
      
    },
    'integration/javascript/identity/app-identity-resolver.js': function (module, exports, require, __dirname, __filename) {
      'use strict';
      
      /**
       * GOTO Base × HOST 集成层 — AppIdentityResolver
       *
       * 在 HOST App Item（name/en/py/abbr/cat/tags，可能无 packageName）与
       * GOTO Base AppRecord（androidPackageName/canonicalName/localizedNames/aliases）之间
       * 建立身份映射。
       *
       * === 匹配优先级（严格按顺序） ===
       *   1. packageName 精确匹配        confidence=1.0   matchedBy='package-name'
       *   2. iosTrackId 等平台 ID 匹配    confidence=0.95  matchedBy='platform-id'
       *   3. canonicalName 精确匹配       confidence=0.9   matchedBy='canonical-name'
       *   4. localizedNames 匹配          confidence=0.85  matchedBy='localized-name'
       *   5. aliases 匹配                 confidence=0.75  matchedBy='alias'
       *      （多应用共享别名时降到 0.5）
       *   6. 英文名（en）匹配             confidence=0.7   matchedBy='english-name'
       *   7. 人工映射表匹配               confidence=0.8   matchedBy='manual-mapping'
       *   8. 无法匹配 → LocalAppStub       confidence=0     matchedBy='none'  isStub=true
       *
       * === 关键规则 ===
       *   - 真机 Android 场景优先使用 packageName
       *   - name/alias 只能作为降级方案（当 packageName 不可用时）
       *   - 名称相同但包名不同的应用不得误合并（如"设置"在小米/华为/OPPO 上包名不同）
       *     * 若 HOST 提供了 packageName 但未在 Base 中命中，则不再走名称匹配，
       *       直接落到 stub，避免把不同 OEM 的同名应用合并到错误的 Base 记录上
       *   - 记录映射置信度
       *   - 不确定匹配不能直接污染公共数据
       *   - 匹配大小写不敏感（名称匹配），包名匹配大小写敏感
       *   - canonicalName / localizedNames 多记录冲突时不匹配（避免误合并）
       *   - aliases 多记录共享时仍匹配，但置信度降到 0.5
       *
       * === 依赖 ===
       *   - GlobalBaseAdapter（可选，缺失时降级为仅 manual-mapping + stub）
       *   - HostAppAdapter（可选，默认内置）
       *   - runtime/shared/learning-types.js 的 createLocalAppStub（可选）
       */
      
      const { HostAppAdapter } = require('integration/javascript/identity/host-app-adapter.js');
      
      // 复用 GlobalBaseAdapter 的 normalizeText，保证大小写/全角归一化策略一致
      let _normalizeText = null;
      function normalizeText(s) {
        if (_normalizeText) return _normalizeText(s);
        // 延迟加载，避免循环依赖
        try {
          const { normalizeText: nt } = require('integration/javascript/global-base-adapter.js');
          _normalizeText = nt;
          return _normalizeText(s);
        } catch (e) {
          // 降级：简单 toLowerCase + trim
          if (typeof s !== 'string') return '';
          return s.toLowerCase().replace(/\s+/g, ' ').trim();
        }
      }
      
      // 延迟加载 createLocalAppStub
      let _createLocalAppStub = null;
      function getCreateLocalAppStub() {
        if (_createLocalAppStub !== null) return _createLocalAppStub;
        try {
          const mod = require('runtime/shared/learning-types.js');
          _createLocalAppStub = mod.createLocalAppStub || null;
        } catch (e) {
          _createLocalAppStub = false; // 标记不可用
        }
        return _createLocalAppStub;
      }
      
      // 匹配置信度常量（对齐任务规范）
      const CONFIDENCE = Object.freeze({
        PACKAGE_NAME: 1.0,
        PLATFORM_ID: 0.95,
        CANONICAL_NAME: 0.9,
        LOCALIZED_NAME: 0.85,
        ALIAS: 0.75,
        ALIAS_SHARED: 0.5,
        ENGLISH_NAME: 0.7,
        MANUAL_MAPPING: 0.8,
        NONE: 0
      });
      
      // matchedBy 枚举
      const MATCHED_BY = Object.freeze({
        PACKAGE_NAME: 'package-name',
        PLATFORM_ID: 'platform-id',
        CANONICAL_NAME: 'canonical-name',
        LOCALIZED_NAME: 'localized-name',
        ALIAS: 'alias',
        ENGLISH_NAME: 'english-name',
        MANUAL_MAPPING: 'manual-mapping',
        NONE: 'none'
      });
      
      class AppIdentityResolver {
        /**
         * @param {object} options
         *   - {object} [globalBase] GlobalBaseAdapter 实例（可选）
         *   - {object} [manualMappings] 初始人工映射表 { hostName: packageName }
         *   - {object} [hostAppAdapter] HostAppAdapter 实例（可选，默认内置）
         */
        constructor({ globalBase, manualMappings, hostAppAdapter } = {}) {
          this._base = globalBase || null;
          this._adapter = hostAppAdapter || new HostAppAdapter();
          /** @type {Map<string, string>} 归一化名称 → packageName */
          this._manualMappings = new Map();
          /** @type {Map<string, object>} packageName → LocalAppStub */
          this._stubs = new Map();
      
          // 索引（由 _rebuildIndexes 构建）
          this._canonicalIndex = new Map();  // norm → Set<pkg>
          this._localizedIndex = new Map();  // norm → Set<pkg>
          this._aliasIndex = new Map();      // norm → Set<pkg>
          this._englishIndex = new Map();    // norm → Set<pkg>
          this._iosTrackIndex = new Map();   // String(trackId) → pkg
          this._iosBundleIndex = new Map();  // bundleId → pkg
      
          // 加载初始人工映射
          if (manualMappings && typeof manualMappings === 'object') {
            for (const [name, pkg] of Object.entries(manualMappings)) {
              if (name && pkg) this.addManualMapping(name, pkg);
            }
          }
      
          // 构建索引
          this._rebuildIndexes();
        }
      
        // ====== 公共 API ======
      
        /**
         * 解析 HOST App Item，返回身份映射结果。
         * @param {object} hostApp HOST App Item（原始或已归一化）
         * @returns {{
         *   packageName: string|null,
         *   canonicalName: string,
         *   hostName: string,
         *   matchedRecordId: string|null,
         *   confidence: number,
         *   matchedBy: string,
         *   isStub: boolean
         * }}
         */
        resolve(hostApp) {
          const normalized = this._normalizeHostApp(hostApp);
      
          // 优先级 1: packageName 精确匹配 (confidence=1.0)
          if (normalized.packageName) {
            const result = this.resolveByPackageName(normalized.packageName);
            if (result) {
              return Object.assign({}, result, { hostName: normalized.name || '' });
            }
            // packageName 提供但未命中：
            // 不再走名称匹配，避免"设置"等同名不同包名应用被误合并到错误的 Base 记录上
            // 仅尝试平台 ID 匹配（使用不同的标识符体系）
          }
      
          // 优先级 2: iosTrackId / iosBundleId 平台 ID 匹配 (confidence=0.95)
          const platformMatch = this._resolveByPlatformId(normalized);
          if (platformMatch) {
            return Object.assign({}, platformMatch, { hostName: normalized.name || '' });
          }
      
          // 若 HOST 提供了 packageName 但未命中，直接落到 stub
          if (normalized.packageName) {
            return this._createStubResult(normalized);
          }
      
          // 优先级 3-7: 名称匹配（仅当未提供 packageName 时）
          const nameMatch = this.resolveByName(normalized);
          if (nameMatch) {
            return nameMatch;
          }
      
          // 优先级 8: 无法匹配 → LocalAppStub
          return this._createStubResult(normalized);
        }
      
        /**
         * 优先级 1: 使用包名精确匹配（大小写敏感）。
         * @param {string} packageName
         * @returns {object|null}
         */
        resolveByPackageName(packageName) {
          if (!packageName || typeof packageName !== 'string') return null;
          if (!this._base) return null;
          // 包名大小写敏感，不做归一化
          const rec = this._base.getAppRecord(packageName);
          if (!rec) return null;
          return {
            packageName: rec.androidPackageName || packageName,
            canonicalName: rec.canonicalName || '',
            hostName: '',
            matchedRecordId: rec.recordId || null,
            confidence: CONFIDENCE.PACKAGE_NAME,
            matchedBy: MATCHED_BY.PACKAGE_NAME,
            isStub: false
          };
        }
      
        /**
         * 优先级 3-7: 使用名称匹配（降级方案）。
         * 仅应在未提供 packageName 或 packageName 命中后调用。
         * @param {object} hostApp HOST App Item（原始或已归一化）
         * @returns {object|null} 匹配结果，null 表示无匹配
         */
        resolveByName(hostApp) {
          const normalized = this._normalizeHostApp(hostApp);
          const candidates = this._getNameCandidates(normalized);
      
          if (candidates.length === 0) {
            // 没有可匹配的名称字段，仍尝试人工映射（可能用空串？不，跳过）
            return null;
          }
      
          // 优先级 3: canonicalName 精确匹配 (confidence=0.9，多记录冲突时不匹配)
          for (const name of candidates) {
            const result = this._matchByIndex(name, this._canonicalIndex,
              MATCHED_BY.CANONICAL_NAME, CONFIDENCE.CANONICAL_NAME, /* allowShared */ false);
            if (result) return Object.assign({}, result, { hostName: normalized.name || '' });
          }
      
          // 优先级 4: localizedNames 匹配 (confidence=0.85，多记录冲突时不匹配)
          for (const name of candidates) {
            const result = this._matchByIndex(name, this._localizedIndex,
              MATCHED_BY.LOCALIZED_NAME, CONFIDENCE.LOCALIZED_NAME, /* allowShared */ false);
            if (result) return Object.assign({}, result, { hostName: normalized.name || '' });
          }
      
          // 优先级 5: aliases 匹配 (confidence=0.75，多记录共享时降到 0.5)
          for (const name of candidates) {
            const result = this._matchByIndex(name, this._aliasIndex,
              MATCHED_BY.ALIAS, CONFIDENCE.ALIAS, /* allowShared */ true);
            if (result) return Object.assign({}, result, { hostName: normalized.name || '' });
          }
      
          // 优先级 6: 英文名匹配 (confidence=0.7)
          // 英文索引只包含 localizedNames.en 的条目，优先用 en 字段查
          const enCandidates = this._getEnglishNameCandidates(normalized);
          for (const name of enCandidates) {
            const result = this._matchByIndex(name, this._englishIndex,
              MATCHED_BY.ENGLISH_NAME, CONFIDENCE.ENGLISH_NAME, /* allowShared */ false);
            if (result) return Object.assign({}, result, { hostName: normalized.name || '' });
          }
      
          // 优先级 7: 人工映射表匹配 (confidence=0.8)
          for (const name of candidates) {
            const result = this._matchByManualMapping(name);
            if (result) return Object.assign({}, result, { hostName: normalized.name || '' });
          }
      
          return null;
        }
      
        /**
         * 注册一个 LocalAppStub。
         * @param {object} stub LocalAppStub（须含 packageName）
         */
        registerStub(stub) {
          if (!stub || !stub.packageName || typeof stub.packageName !== 'string') return;
          this._stubs.set(stub.packageName, stub);
        }
      
        /**
         * 获取已注册的 LocalAppStub。
         * @param {string} packageName
         * @returns {object|null}
         */
        getStub(packageName) {
          if (!packageName) return null;
          return this._stubs.get(packageName) || null;
        }
      
        /**
         * 获取所有已注册的 LocalAppStub。
         * @returns {Array<object>}
         */
        getAllStubs() {
          return Array.from(this._stubs.values());
        }
      
        /**
         * 添加一条人工映射。
         * @param {string} hostName HOST 中使用的名称
         * @param {string} packageName 对应的 Android 包名
         */
        addManualMapping(hostName, packageName) {
          if (!hostName || typeof hostName !== 'string') return;
          if (!packageName || typeof packageName !== 'string') return;
          const norm = normalizeText(hostName);
          if (!norm) return;
          this._manualMappings.set(norm, packageName);
        }
      
        /**
         * 移除一条人工映射（主要用于测试）。
         * @param {string} hostName
         */
        removeManualMapping(hostName) {
          if (!hostName) return;
          const norm = normalizeText(hostName);
          this._manualMappings.delete(norm);
        }
      
        /**
         * 返回当前人工映射表大小。
         */
        get manualMappingCount() {
          return this._manualMappings.size;
        }
      
        /**
         * 返回已加载的 Base 记录数（诊断用）。
         */
        get baseRecordCount() {
          return this._base ? this._base.size() : 0;
        }
      
        // ====== 内部实现 ======
      
        _normalizeHostApp(hostApp) {
          // 如果已经是归一化结构（含 packageName 字段且由 adapter 产出），直接返回
          if (hostApp && typeof hostApp === 'object' &&
              'name' in hostApp && 'en' in hostApp && 'packageName' in hostApp &&
              'iosTrackId' in hostApp && 'localizedNames' in hostApp) {
            return hostApp;
          }
          return this._adapter.normalizeHostApp(hostApp);
        }
      
        /**
         * 优先级 2: 平台 ID 匹配。
         */
        _resolveByPlatformId(normalized) {
          if (!this._base) return null;
      
          // iosTrackId
          if (normalized.iosTrackId != null) {
            const pkg = this._iosTrackIndex.get(String(normalized.iosTrackId));
            if (pkg) {
              const rec = this._base.getAppRecord(pkg);
              if (rec) {
                return {
                  packageName: pkg,
                  canonicalName: rec.canonicalName || '',
                  hostName: '',
                  matchedRecordId: rec.recordId || null,
                  confidence: CONFIDENCE.PLATFORM_ID,
                  matchedBy: MATCHED_BY.PLATFORM_ID,
                  isStub: false
                };
              }
            }
          }
      
          // iosBundleId
          if (normalized.iosBundleId) {
            const pkg = this._iosBundleIndex.get(normalized.iosBundleId);
            if (pkg) {
              const rec = this._base.getAppRecord(pkg);
              if (rec) {
                return {
                  packageName: pkg,
                  canonicalName: rec.canonicalName || '',
                  hostName: '',
                  matchedRecordId: rec.recordId || null,
                  confidence: CONFIDENCE.PLATFORM_ID,
                  matchedBy: MATCHED_BY.PLATFORM_ID,
                  isStub: false
                };
              }
            }
          }
      
          return null;
        }
      
        /**
         * 通用索引匹配。
         * @param {string} name 待匹配名称
         * @param {Map<string, Set<string>>} index 归一化名称 → Set<packageName>
         * @param {string} matchedBy
         * @param {number} baseConfidence
         * @param {boolean} allowShared 是否允许多记录共享（别名允许，其他不允许）
         * @returns {object|null}
         */
        _matchByIndex(name, index, matchedBy, baseConfidence, allowShared) {
          if (!name || !index || index.size === 0) return null;
          const norm = normalizeText(name);
          if (!norm) return null;
          const set = index.get(norm);
          if (!set || set.size === 0) return null;
      
          // 多记录冲突
          if (set.size > 1) {
            if (!allowShared) {
              // canonicalName / localizedNames / english-name 冲突时不匹配
              return null;
            }
            // aliases 允许共享，但置信度降到 0.5
            const pkg = this._pickFromShared(set);
            const rec = this._base ? this._base.getAppRecord(pkg) : null;
            return {
              packageName: pkg,
              canonicalName: rec ? (rec.canonicalName || '') : '',
              hostName: '',
              matchedRecordId: rec ? (rec.recordId || null) : null,
              confidence: CONFIDENCE.ALIAS_SHARED,
              matchedBy,
              isStub: false
            };
          }
      
          const pkg = Array.from(set)[0];
          const rec = this._base ? this._base.getAppRecord(pkg) : null;
          return {
            packageName: pkg,
            canonicalName: rec ? (rec.canonicalName || '') : '',
            hostName: '',
            matchedRecordId: rec ? (rec.recordId || null) : null,
            confidence: baseConfidence,
            matchedBy,
            isStub: false
          };
        }
      
        _matchByManualMapping(name) {
          if (!name) return null;
          const norm = normalizeText(name);
          if (!norm) return null;
          const pkg = this._manualMappings.get(norm);
          if (!pkg) return null;
          const rec = this._base ? this._base.getAppRecord(pkg) : null;
          return {
            packageName: pkg,
            canonicalName: rec ? (rec.canonicalName || '') : '',
            hostName: '',
            matchedRecordId: rec ? (rec.recordId || null) : null,
            confidence: CONFIDENCE.MANUAL_MAPPING,
            matchedBy: MATCHED_BY.MANUAL_MAPPING,
            isStub: false
          };
        }
      
        /**
         * 多记录共享别名时，选择一个最匹配的。
         * 简单策略：选第一个（按插入顺序）。未来可扩展为按 popularityScore 选最优。
         */
        _pickFromShared(set) {
          return Array.from(set)[0];
        }
      
        /**
         * 收集所有可用的名称候选项（去重，按优先级排序）。
         * 顺序：name → en → abbr → py → localizedNames 各值
         */
        _getNameCandidates(normalized) {
          const candidates = [];
          const seen = new Set();
          const push = (s) => {
            if (!s) return;
            const norm = normalizeText(s);
            if (!norm || seen.has(norm)) return;
            seen.add(norm);
            candidates.push(s);
          };
          push(normalized.name);
          push(normalized.en);
          push(normalized.abbr);
          push(normalized.py);
          if (normalized.localizedNames && typeof normalized.localizedNames === 'object') {
            for (const v of Object.values(normalized.localizedNames)) {
              push(v);
            }
          }
          return candidates;
        }
      
        /**
         * 英文名匹配候选项：en 优先，其次 name，最后 abbr。
         */
        _getEnglishNameCandidates(normalized) {
          const candidates = [];
          const seen = new Set();
          const push = (s) => {
            if (!s) return;
            const norm = normalizeText(s);
            if (!norm || seen.has(norm)) return;
            seen.add(norm);
            candidates.push(s);
          };
          push(normalized.en);
          push(normalized.name);
          push(normalized.abbr);
          return candidates;
        }
      
        /**
         * 创建 stub 结果。若有 packageName 则自动注册 LocalAppStub。
         */
        _createStubResult(normalized) {
          const stubPkg = normalized.packageName || '';
          const canonicalName = normalized.name || normalized.en || '';
      
          // 自动注册 stub（仅当有 packageName 且尚未注册）
          if (stubPkg && !this._stubs.has(stubPkg)) {
            const createStub = getCreateLocalAppStub();
            if (createStub) {
              const userAliases = [normalized.name, normalized.en, normalized.abbr, normalized.py]
                .filter(a => a && typeof a === 'string');
              const stub = createStub({
                packageName: stubPkg,
                appName: canonicalName || stubPkg,
                discoveredVia: 'host-identity-resolve',
                userAliases
              });
              this._stubs.set(stubPkg, stub);
            } else {
              // learning-types 不可用时，存一个最小化对象
              this._stubs.set(stubPkg, {
                packageName: stubPkg,
                appName: canonicalName || stubPkg,
                installedAt: '',
                updatedAt: '',
                discoveredVia: 'host-identity-resolve',
                userAliases: [normalized.name, normalized.en].filter(a => a),
                schemaVersion: '1.0.0'
              });
            }
          }
      
          return {
            packageName: stubPkg || null,
            canonicalName,
            hostName: normalized.name || '',
            matchedRecordId: null,
            confidence: CONFIDENCE.NONE,
            matchedBy: MATCHED_BY.NONE,
            isStub: true
          };
        }
      
        /**
         * 从 GlobalBase 重建索引。
         */
        _rebuildIndexes() {
          this._canonicalIndex.clear();
          this._localizedIndex.clear();
          this._aliasIndex.clear();
          this._englishIndex.clear();
          this._iosTrackIndex.clear();
          this._iosBundleIndex.clear();
      
          if (!this._base) return;
          const records = this._base.allRecords();
          for (const rec of records) {
            const pkg = rec.androidPackageName || rec.packageName;
            if (!pkg) continue;
      
            // canonicalName
            if (rec.canonicalName) {
              const norm = normalizeText(rec.canonicalName);
              if (norm) this._addToIndex(this._canonicalIndex, norm, pkg);
            }
      
            // localizedNames
            if (rec.localizedNames && typeof rec.localizedNames === 'object') {
              for (const [locale, name] of Object.entries(rec.localizedNames)) {
                if (!name) continue;
                const norm = normalizeText(name);
                if (!norm) continue;
                this._addToIndex(this._localizedIndex, norm, pkg);
                // 英文索引：locale 以 en 开头
                if (locale && locale.toLowerCase().indexOf('en') === 0) {
                  this._addToIndex(this._englishIndex, norm, pkg);
                }
              }
            }
      
            // aliases
            if (Array.isArray(rec.aliases)) {
              for (const alias of rec.aliases) {
                if (!alias) continue;
                const norm = normalizeText(alias);
                if (!norm) continue;
                this._addToIndex(this._aliasIndex, norm, pkg);
              }
            }
      
            // abbreviations 也并入 alias 索引（缩写是别名的子集）
            if (Array.isArray(rec.abbreviations)) {
              for (const abbr of rec.abbreviations) {
                if (!abbr) continue;
                const norm = normalizeText(abbr);
                if (!norm) continue;
                this._addToIndex(this._aliasIndex, norm, pkg);
              }
            }
      
            // iosTrackId
            if (rec.iosTrackId != null && typeof rec.iosTrackId !== 'undefined') {
              this._iosTrackIndex.set(String(rec.iosTrackId), pkg);
            }
            // iosBundleId
            if (rec.iosBundleId) {
              this._iosBundleIndex.set(rec.iosBundleId, pkg);
            }
          }
        }
      
        _addToIndex(index, norm, pkg) {
          if (!index.has(norm)) index.set(norm, new Set());
          index.get(norm).add(pkg);
        }
      }
      
      module.exports = {
        AppIdentityResolver,
        CONFIDENCE,
        MATCHED_BY
      };
      
    },
    'integration/javascript/identity/host-app-adapter.js': function (module, exports, require, __dirname, __filename) {
      'use strict';
      
      /**
       * GOTO Base × HOST 集成层 — HostAppAdapter
       *
       * 把 HOST（如 GithubPages/index.html）的 App Item 适配为
       * AppIdentityResolver 可消费的归一化结构。
       *
       * HOST App Item 字段（参考任务规范）：
       *   - name     应用名（如"微信"）
       *   - en       英文名（如"WeChat"）
       *   - py       拼音（如"weixin"）
       *   - abbr     缩写（如"wx"）
       *   - cat      分类
       *   - tags     标签数组
       *   - packageName Android 包名（真机场景可能有，网页场景可能无）
       *
       * 字段缺失处理：
       *   - 缺失字段返回空字符串 / 空数组 / null
       *   - 兼容多种字段命名（appName / englishName / pinyin / abbreviation 等）
       *
       * 多语言名提取：
       *   - 如果 HOST 提供 localizedNames 对象（locale → name），完整保留
       *   - name 字段优先作为主名称
       *   - en 字段作为英文备选
       *
       * 不依赖任何 GOTO Engine / Base 运行时代码，纯函数式适配。
       */
      
      class HostAppAdapter {
        /**
         * 把原始 HOST App Item 归一化为标准结构。
         * @param {object} rawHostApp 原始 HOST App Item
         * @returns {{
         *   name: string,
         *   en: string,
         *   py: string,
         *   abbr: string,
         *   cat: string,
         *   tags: string[],
         *   packageName: string,
         *   iosTrackId: number|null,
         *   iosBundleId: string,
         *   localizedNames: Object<string,string>
         * }}
         */
        normalizeHostApp(rawHostApp) {
          if (!rawHostApp || typeof rawHostApp !== 'object') {
            return this._empty();
          }
      
          const name = this._str(rawHostApp.name) ||
                       this._str(rawHostApp.appName) ||
                       this._str(rawHostApp.title) ||
                       this._str(rawHostApp.label) ||
                       '';
      
          const en = this._str(rawHostApp.en) ||
                     this._str(rawHostApp.englishName) ||
                     this._str(rawHostApp.enName) ||
                     this._str(rawHostApp.english) ||
                     '';
      
          const py = this._str(rawHostApp.py) ||
                     this._str(rawHostApp.pinyin) ||
                     this._str(rawHostApp.pinyinFull) ||
                     '';
      
          const abbr = this._str(rawHostApp.abbr) ||
                       this._str(rawHostApp.abbreviation) ||
                       this._str(rawHostApp.shortName) ||
                       '';
      
          const cat = this._str(rawHostApp.cat) ||
                      this._str(rawHostApp.category) ||
                      this._str(rawHostApp.type) ||
                      '';
      
          const tags = Array.isArray(rawHostApp.tags)
            ? rawHostApp.tags.filter(t => typeof t === 'string' && t.length > 0).map(t => t.trim())
            : (Array.isArray(rawHostApp.labels) ? rawHostApp.labels.filter(t => typeof t === 'string') : []);
      
          // Package name: 优先 androidPackageName，其次 packageName
          // HOST 的 id 字段仅当形如 Android 包名时才采纳（避免把数字 ID 当包名）
          let packageName = this._str(rawHostApp.packageName) ||
                            this._str(rawHostApp.androidPackageName) ||
                            this._str(rawHostApp.pkg) ||
                            '';
          if (!packageName) {
            const id = this._str(rawHostApp.id);
            if (id && this._looksLikeAndroidPackageName(id)) {
              packageName = id;
            }
          }
      
          // iOS 平台标识
          const iosTrackId = (rawHostApp.iosTrackId != null) ? rawHostApp.iosTrackId
                           : (rawHostApp.iosTrackID != null) ? rawHostApp.iosTrackID
                           : (rawHostApp.trackId != null && this._looksLikeIosTrackId(rawHostApp.trackId)) ? rawHostApp.trackId
                           : null;
          const iosBundleId = this._str(rawHostApp.iosBundleId) ||
                              this._str(rawHostApp.bundleId) ||
                              '';
      
          // 多语言名映射：若 HOST 提供 localizedNames 对象，原样保留
          // 并把 name / en 补充进去（不覆盖已有键）
          const localizedNames = (rawHostApp.localizedNames && typeof rawHostApp.localizedNames === 'object' && !Array.isArray(rawHostApp.localizedNames))
            ? Object.assign({}, rawHostApp.localizedNames)
            : {};
          if (name && !localizedNames['zh-CN']) localizedNames['zh-CN'] = name;
          if (en && !localizedNames['en']) localizedNames['en'] = en;
      
          return {
            name,
            en,
            py,
            abbr,
            cat,
            tags,
            packageName,
            iosTrackId: (iosTrackId !== null && typeof iosTrackId === 'number') ? iosTrackId : null,
            iosBundleId,
            localizedNames
          };
        }
      
        /**
         * 批量归一化。
         * @param {Array<object>} rawHostApps
         * @returns {Array<object>}
         */
        normalizeHostApps(rawHostApps) {
          if (!Array.isArray(rawHostApps)) return [];
          return rawHostApps.map(item => this.normalizeHostApp(item));
        }
      
        _str(v) {
          if (typeof v === 'string') return v.trim();
          if (typeof v === 'number') return String(v);
          return '';
        }
      
        _empty() {
          return {
            name: '',
            en: '',
            py: '',
            abbr: '',
            cat: '',
            tags: [],
            packageName: '',
            iosTrackId: null,
            iosBundleId: '',
            localizedNames: {}
          };
        }
      
        /**
         * Android 包名格式：字母开头，含至少一个点，字符集 [a-zA-Z0-9_.]
         * 参考 schema/app-record.schema.json 的 androidPackageName pattern
         */
        _looksLikeAndroidPackageName(s) {
          return /^[a-zA-Z][a-zA-Z0-9_]*(\.[a-zA-Z0-9_]+)+$/.test(s);
        }
      
        _looksLikeIosTrackId(v) {
          return typeof v === 'number' && v > 0 && Number.isInteger(v);
        }
      }
      
      module.exports = {
        HostAppAdapter
      };
      
    },
    'integration/javascript/identity/manual-mappings.js': function (module, exports, require, __dirname, __filename) {
      'use strict';
      
      /**
       * GOTO Base × HOST 集成层 — 人工映射默认表
       *
       * 覆盖 data/seeds/ 中 110 条种子的常见 HOST 名称 → Android 包名映射。
       * 用于在 GlobalBase 自动匹配失败时作为降级方案。
       *
       * 映射来源：每条种子的 canonicalName / localizedNames / aliases / abbreviations
       *
       * 注意事项：
       *   - 键为 HOST 中可能出现的应用名（中文名、英文名、缩写、常见别名）
       *   - 值为 Android 包名（与 data/seeds/ 文件名对应）
       *   - 大小写：保留原始大小写；查询时由 resolver 归一化为小写再匹配
       *   - 唯一性：每个键只映射到一个包名；若某名称在多应用间存在歧义则不收录
       *   - 缩写（如 "wx"、"qq"）严格对齐种子的 abbreviations 字段
       *
       * 用法：
       *   const { DEFAULT_MANUAL_MAPPINGS } = require('integration/javascript/identity/manual-mappings.js');
       *   const resolver = new AppIdentityResolver({
       *     globalBase,
       *     manualMappings: DEFAULT_MANUAL_MAPPINGS
       *   });
       */
      
      const DEFAULT_MANUAL_MAPPINGS = Object.freeze({
        // === 招商银行 (cmb.pb) ===
        '招商银行': 'cmb.pb',
        '招行': 'cmb.pb',
        'CMB': 'cmb.pb',
        'cmb': 'cmb.pb',
        'CMB Mobile': 'cmb.pb',
      
        // === WPS Office (cn.wps.moffice_eng) ===
        'WPS Office': 'cn.wps.moffice_eng',
        'WPS': 'cn.wps.moffice_eng',
        'wps': 'cn.wps.moffice_eng',
      
        // === 唯品会 (com.achievo.vipshop) ===
        '唯品会': 'com.achievo.vipshop',
        'Vipshop': 'com.achievo.vipshop',
      
        // === Airbnb (com.airbnb.android) ===
        'Airbnb': 'com.airbnb.android',
        'airbnb': 'com.airbnb.android',
        '爱彼迎': 'com.airbnb.android',
      
        // === AliExpress / 速卖通 (com.alibaba.aliexpresshd) ===
        'AliExpress': 'com.alibaba.aliexpresshd',
        '速卖通': 'com.alibaba.aliexpresshd',
        'AE': 'com.alibaba.aliexpresshd',
        'ae': 'com.alibaba.aliexpresshd',
      
        // === 钉钉 (com.alibaba.android.rimet) ===
        '钉钉': 'com.alibaba.android.rimet',
        'DingTalk': 'com.alibaba.android.rimet',
        'DD': 'com.alibaba.android.rimet',
        'dd': 'com.alibaba.android.rimet',
      
        // === 飞猪旅行 (com.alipay.mobile.payee.module.koubei.travel.flgihts) ===
        '飞猪旅行': 'com.alipay.mobile.payee.module.koubei.travel.flgihts',
        '飞猪': 'com.alipay.mobile.payee.module.koubei.travel.flgihts',
        'Fliggy': 'com.alipay.mobile.payee.module.koubei.travel.flgihts',
      
        // === Amazon Shopping (com.amazon.mShop.android.shopping) ===
        'Amazon Shopping': 'com.amazon.mShop.android.shopping',
        'Amazon': 'com.amazon.mShop.android.shopping',
        '亚马逊': 'com.amazon.mShop.android.shopping',
      
        // === Chrome (com.android.chrome) ===
        'Chrome': 'com.android.chrome',
        'Google Chrome': 'com.android.chrome',
        '谷歌浏览器': 'com.android.chrome',
      
        // === Asana (com.asana.app) ===
        'Asana': 'com.asana.app',
        'asana': 'com.asana.app',
      
        // === 高德地图 (com.autonavi.minimap) ===
        '高德地图': 'com.autonavi.minimap',
        '高德': 'com.autonavi.minimap',
        'Amap': 'com.autonavi.minimap',
      
        // === 百度地图 (com.baidu.baidumap) ===
        '百度地图': 'com.baidu.baidumap',
        '百度导航': 'com.baidu.baidumap',
        'Baidu Maps': 'com.baidu.baidumap',
      
        // === 百度翻译 (com.baidu.baidutranslate) ===
        '百度翻译': 'com.baidu.baidutranslate',
        'Baidu Translate': 'com.baidu.baidutranslate',
      
        // === 作业帮 (com.baidu.homework) ===
        '作业帮': 'com.baidu.homework',
        'Zuoyebang': 'com.baidu.homework',
      
        // === 百度网盘 (com.baidu.netdisk) ===
        '百度网盘': 'com.baidu.netdisk',
        '百度云': 'com.baidu.netdisk',
        'Baidu Netdisk': 'com.baidu.netdisk',
      
        // === 薄荷健康 (com.boohee.one) ===
        '薄荷健康': 'com.boohee.one',
        '薄荷': 'com.boohee.one',
        'Boohee': 'com.boohee.one',
      
        // === 咕咚 (com.codoon.gps) ===
        '咕咚': 'com.codoon.gps',
        'Codoon': 'com.codoon.gps',
      
        // === 大众点评 (com.dianping.v1) ===
        '大众点评': 'com.dianping.v1',
        '点评': 'com.dianping.v1',
        'Dianping': 'com.dianping.v1',
      
        // === Discord (com.discord) ===
        'Discord': 'com.discord',
        'DC': 'com.discord',
        'dc': 'com.discord',
      
        // === eBay (com.ebay.mobile) ===
        'eBay': 'com.ebay.mobile',
        'ebay': 'com.ebay.mobile',
      
        // === 支付宝 (com.eg.android.AlipayGphone) ===
        '支付宝': 'com.eg.android.AlipayGphone',
        'Alipay': 'com.eg.android.AlipayGphone',
        'zfb': 'com.eg.android.AlipayGphone',
      
        // === 支付宝钱包 (com.eg.android.AlipayGphone.wallet) ===
        '支付宝钱包': 'com.eg.android.AlipayGphone.wallet',
        'Alipay Wallet': 'com.eg.android.AlipayGphone.wallet',
      
        // === 支付宝小程序版 (com.eg.android.AlipayGphoneMini) ===
        '支付宝小程序版': 'com.eg.android.AlipayGphoneMini',
        '支付宝mini': 'com.eg.android.AlipayGphoneMini',
        'Alipay Mini': 'com.eg.android.AlipayGphoneMini',
      
        // === Evernote / 印象笔记 (com.evernote) ===
        'Evernote': 'com.evernote',
        '印象笔记': 'com.evernote',
      
        // === Facebook (com.facebook.katana) ===
        'Facebook': 'com.facebook.katana',
        'FB': 'com.facebook.katana',
        'fb': 'com.facebook.katana',
      
        // === 小猿搜题 (com.fenbi.android.solar) ===
        '小猿搜题': 'com.fenbi.android.solar',
        '小猿': 'com.fenbi.android.solar',
        'Yuandaibang': 'com.fenbi.android.solar',
      
        // === 喜马拉雅 (com.gemd.iting) ===
        '喜马拉雅': 'com.gemd.iting',
        '喜马拉雅FM': 'com.gemd.iting',
        'Ximalaya': 'com.gemd.iting',
      
        // === Google Maps (com.google.android.apps.maps) ===
        'Google Maps': 'com.google.android.apps.maps',
        '谷歌地图': 'com.google.android.apps.maps',
        'Maps': 'com.google.android.apps.maps',
      
        // === YouTube (com.google.android.youtube) ===
        'YouTube': 'com.google.android.youtube',
        'youtube': 'com.google.android.youtube',
        'YT': 'com.google.android.youtube',
        'yt': 'com.google.android.youtube',
      
        // === Keep (com.goto.keep) ===
        'Keep': 'com.goto.keep',
        'keep': 'com.goto.keep',
      
        // === OPPO浏览器 (com.heytap.browser) ===
        'OPPO浏览器': 'com.heytap.browser',
        'OPPO Browser': 'com.heytap.browser',
      
        // === 华为浏览器 (com.huawei.browser) ===
        '华为浏览器': 'com.huawei.browser',
        'Huawei Browser': 'com.huawei.browser',
      
        // === 芒果TV (com.hunantv.imgo.activity) ===
        '芒果TV': 'com.hunantv.imgo.activity',
        'Mango TV': 'com.hunantv.imgo.activity',
      
        // === 工商银行 (com.icbc) ===
        '工商银行': 'com.icbc',
        '工行': 'com.icbc',
        'ICBC': 'com.icbc',
        'icbc': 'com.icbc',
        'ICBC Mobile': 'com.icbc',
      
        // === 讯飞输入法 (com.iflytek.inputmethod) ===
        '讯飞输入法': 'com.iflytek.inputmethod',
        '讯飞': 'com.iflytek.inputmethod',
        'iFlytek IME': 'com.iflytek.inputmethod',
      
        // === Instagram (com.instagram.android) ===
        'Instagram': 'com.instagram.android',
        'IG': 'com.instagram.android',
        'ig': 'com.instagram.android',
        'ins': 'com.instagram.android',
      
        // === 京东金融 (com.jd.jrapp) ===
        '京东金融': 'com.jd.jrapp',
        'JD Finance': 'com.jd.jrapp',
      
        // === 坚果云 (com.jiangyang.io.nc) ===
        '坚果云': 'com.jiangyang.io.nc',
        'Nutstore': 'com.jiangyang.io.nc',
      
        // === 简书 (com.jianshu.haruki) ===
        '简书': 'com.jianshu.haruki',
        'Jianshu': 'com.jianshu.haruki',
      
        // === 京东 (com.jingdong.app.mall) ===
        '京东': 'com.jingdong.app.mall',
        '京东商城': 'com.jingdong.app.mall',
        'JD': 'com.jingdong.app.mall',
        'jd': 'com.jingdong.app.mall',
        'jd.com': 'com.jingdong.app.mall',
      
        // === 酷狗音乐 (com.kugou.android) ===
        '酷狗音乐': 'com.kugou.android',
        '酷狗': 'com.kugou.android',
        'KuGou': 'com.kugou.android',
        'KuGou Music': 'com.kugou.android',
      
        // === LinkedIn (com.linkedin.android) ===
        'LinkedIn': 'com.linkedin.android',
        '领英': 'com.linkedin.android',
      
        // === 得到 (com.luojilab.player) ===
        '得到': 'com.luojilab.player',
        'Dedao': 'com.luojilab.player',
      
        // === 美团 (com.meituan) ===
        '美团': 'com.meituan',
        'Meituan': 'com.meituan',
        'mt': 'com.meituan',
      
        // === 小米浏览器 (com.mi.global.browser) ===
        '小米浏览器': 'com.mi.global.browser',
        'Mi Browser': 'com.mi.global.browser',
      
        // === Microsoft Edge (com.microsoft.emmx) ===
        'Microsoft Edge': 'com.microsoft.emmx',
        'Edge': 'com.microsoft.emmx',
        'MS Edge': 'com.microsoft.emmx',
      
        // === Microsoft Office (com.microsoft.office.officehubrow) ===
        'Microsoft Office': 'com.microsoft.office.officehubrow',
        'Office': 'com.microsoft.office.officehubrow',
        'MS Office': 'com.microsoft.office.officehubrow',
      
        // === Microsoft Teams (com.microsoft.teams) ===
        'Microsoft Teams': 'com.microsoft.teams',
        'Teams': 'com.microsoft.teams',
        'MS Teams': 'com.microsoft.teams',
      
        // === Microsoft To Do (com.microsoft.todos) ===
        'Microsoft To Do': 'com.microsoft.todos',
        'To Do': 'com.microsoft.todos',
        'MS To Do': 'com.microsoft.todos',
      
        // === 原神 (com.miHoYo.GenshinImpact) ===
        '原神': 'com.miHoYo.GenshinImpact',
        'Genshin Impact': 'com.miHoYo.GenshinImpact',
        'Genshin': 'com.miHoYo.GenshinImpact',
      
        // === 铁路12306 (com.MobileTicket) ===
        '铁路12306': 'com.MobileTicket',
        '12306': 'com.MobileTicket',
        '中国铁路': 'com.MobileTicket',
        'China Railway 12306': 'com.MobileTicket',
      
        // === 网易云音乐 (com.netease.cloudmusic) ===
        '网易云音乐': 'com.netease.cloudmusic',
        '网易云': 'com.netease.cloudmusic',
        'NetEase Cloud Music': 'com.netease.cloudmusic',
      
        // === 网易新闻 (com.netease.news) ===
        '网易新闻': 'com.netease.news',
        'NetEase News': 'com.netease.news',
      
        // === Netflix (com.netflix.mediaclient) ===
        'Netflix': 'com.netflix.mediaclient',
        'netflix': 'com.netflix.mediaclient',
        'NF': 'com.netflix.mediaclient',
        'nf': 'com.netflix.mediaclient',
      
        // === Notion (com.notion.id) ===
        'Notion': 'com.notion.id',
        'notion': 'com.notion.id',
      
        // === PayPal (com.paypal.android.p2pmobile) ===
        'PayPal': 'com.paypal.android.p2pmobile',
        'paypal': 'com.paypal.android.p2pmobile',
        'PP': 'com.paypal.android.p2pmobile',
        'pp': 'com.paypal.android.p2pmobile',
      
        // === 平安好医生 (com.pingan.life) ===
        '平安好医生': 'com.pingan.life',
        '平安健康': 'com.pingan.life',
        'Ping An Good Doctor': 'com.pingan.life',
      
        // === 有道词典 (com.qianyan.battery) ===
        '有道词典': 'com.qianyan.battery',
        '有道': 'com.qianyan.battery',
        'Youdao Dictionary': 'com.qianyan.battery',
        'Youdao': 'com.qianyan.battery',
      
        // === 360安全卫士 (com.qihoo360.mobilesafe) ===
        '360安全卫士': 'com.qihoo360.mobilesafe',
        '360安全': 'com.qihoo360.mobilesafe',
        '360 Security': 'com.qihoo360.mobilesafe',
        '360': 'com.qihoo360.mobilesafe',
      
        // === 爱奇艺 (com.qiyi.video) ===
        '爱奇艺': 'com.qiyi.video',
        'iQIYI': 'com.qiyi.video',
      
        // === 去哪儿旅行 (com.Qunar) ===
        '去哪儿旅行': 'com.Qunar',
        '去哪儿': 'com.Qunar',
        'Qunar': 'com.Qunar',
      
        // === Reddit (com.reddit.frontpage) ===
        'Reddit': 'com.reddit.frontpage',
        'reddit': 'com.reddit.frontpage',
      
        // === 美团外卖 (com.sankuai.meituan) ===
        '美团外卖': 'com.sankuai.meituan',
        'Meituan Waimai': 'com.sankuai.meituan',
      
        // === 嘀嗒出行 (com.sdu.didi.psnger.guide) ===
        '嘀嗒出行': 'com.sdu.didi.psnger.guide',
        '嘀嗒': 'com.sdu.didi.psnger.guide',
        'Tida Travel': 'com.sdu.didi.psnger.guide',
        'Tida': 'com.sdu.didi.psnger.guide',
      
        // === 滴滴出行 (com.sdu.didi.psnger) ===
        '滴滴出行': 'com.sdu.didi.psnger',
        '滴滴': 'com.sdu.didi.psnger',
        'DiDi': 'com.sdu.didi.psnger',
      
        // === 微博 (com.sina.weibo) ===
        '微博': 'com.sina.weibo',
        '新浪微博': 'com.sina.weibo',
        'Weibo': 'com.sina.weibo',
        'sina': 'com.sina.weibo',
        'wb': 'com.sina.weibo',
      
        // === Slack (com.slack) ===
        'Slack': 'com.slack',
        'slack': 'com.slack',
      
        // === Snapchat (com.snapchat.android) ===
        'Snapchat': 'com.snapchat.android',
        'Snap': 'com.snapchat.android',
        'SC': 'com.snapchat.android',
        'sc': 'com.snapchat.android',
      
        // === 搜狗输入法 (com.sohu.inputmethod.sogou) ===
        '搜狗输入法': 'com.sohu.inputmethod.sogou',
        '搜狗': 'com.sohu.inputmethod.sogou',
        'Sogou IME': 'com.sohu.inputmethod.sogou',
      
        // === Spotify (com.spotify.music) ===
        'Spotify': 'com.spotify.music',
        'spotify': 'com.spotify.music',
      
        // === 今日头条 (com.ss.android.article.news) ===
        '今日头条': 'com.ss.android.article.news',
        '头条': 'com.ss.android.article.news',
        'Toutiao': 'com.ss.android.article.news',
      
        // === 飞书 (com.ss.android.lark) ===
        '飞书': 'com.ss.android.lark',
        'Feishu': 'com.ss.android.lark',
        'Lark': 'com.ss.android.lark',
        'Feishu/Lark': 'com.ss.android.lark',
      
        // === 抖音 (com.ss.android.ugc.aweme) ===
        '抖音': 'com.ss.android.ugc.aweme',
        'Douyin': 'com.ss.android.ugc.aweme',
        'dy': 'com.ss.android.ugc.aweme',
      
        // === 苏宁易购 (com.suning.mobile.ebuy) ===
        '苏宁易购': 'com.suning.mobile.ebuy',
        '苏宁': 'com.suning.mobile.ebuy',
        'Suning': 'com.suning.mobile.ebuy',
      
        // === 闲鱼 (com.taobao.idlefish) ===
        '闲鱼': 'com.taobao.idlefish',
        'Xianyu': 'com.taobao.idlefish',
      
        // === 淘宝 (com.taobao.taobao) ===
        '淘宝': 'com.taobao.taobao',
        'Taobao': 'com.taobao.taobao',
        'tb': 'com.taobao.taobao',
      
        // === 英雄联盟手游 (com.tencent.lolm) ===
        '英雄联盟手游': 'com.tencent.lolm',
        'LOL手游': 'com.tencent.lolm',
        'Wild Rift': 'com.tencent.lolm',
        'lol': 'com.tencent.lolm',
      
        // === 微信 (com.tencent.mm) ===
        '微信': 'com.tencent.mm',
        'WeChat': 'com.tencent.mm',
        'wx': 'com.tencent.mm',
        'weixin': 'com.tencent.mm',
        '微聊': 'com.tencent.mm',
      
        // === QQ (com.tencent.mobileqq) ===
        'QQ': 'com.tencent.mobileqq',
        'qq': 'com.tencent.mobileqq',
        '腾讯QQ': 'com.tencent.mobileqq',
      
        // === 腾讯新闻 (com.tencent.news) ===
        '腾讯新闻': 'com.tencent.news',
        'Tencent News': 'com.tencent.news',
      
        // === 腾讯微云 (com.tencent.qcloud.scf.cosclient) ===
        '腾讯微云': 'com.tencent.qcloud.scf.cosclient',
        '微云': 'com.tencent.qcloud.scf.cosclient',
        'Weiyun': 'com.tencent.qcloud.scf.cosclient',
        'Tencent Weiyun': 'com.tencent.qcloud.scf.cosclient',
      
        // === 腾讯视频 (com.tencent.qqlive) ===
        '腾讯视频': 'com.tencent.qqlive',
        'Tencent Video': 'com.tencent.qqlive',
      
        // === QQ音乐 (com.tencent.qqmusic) ===
        'QQ音乐': 'com.tencent.qqmusic',
        'QQ Music': 'com.tencent.qqmusic',
      
        // === 腾讯手机管家 (com.tencent.qqpimsecure) ===
        '腾讯手机管家': 'com.tencent.qqpimsecure',
        '手机管家': 'com.tencent.qqpimsecure',
        'Tencent Mobile Manager': 'com.tencent.qqpimsecure',
      
        // === 和平精英 (com.tencent.tmgp.pubgmhd) ===
        '和平精英': 'com.tencent.tmgp.pubgmhd',
        'Game for Peace': 'com.tencent.tmgp.pubgmhd',
        'Pubg Mobile': 'com.tencent.tmgp.pubgmhd',
        'PUBG': 'com.tencent.tmgp.pubgmhd',
      
        // === 王者荣耀 (com.tencent.tmgp.sgame) ===
        '王者荣耀': 'com.tencent.tmgp.sgame',
        '王者': 'com.tencent.tmgp.sgame',
        'Honor of Kings': 'com.tencent.tmgp.sgame',
        'HoK': 'com.tencent.tmgp.sgame',
      
        // === 微众银行 (com.tencent.weiyun) ===
        '微众银行': 'com.tencent.weiyun',
        'WeBank': 'com.tencent.weiyun',
      
        // === 企业微信 (com.tencent.wework) ===
        '企业微信': 'com.tencent.wework',
        'WeCom': 'com.tencent.wework',
        'WeChat Work': 'com.tencent.wework',
      
        // === 悦跑圈 (com.thejoyrun.app) ===
        '悦跑圈': 'com.thejoyrun.app',
        'Joyrun': 'com.thejoyrun.app',
      
        // === 天猫 (com.tmall.wireless) ===
        '天猫': 'com.tmall.wireless',
        'Tmall': 'com.tmall.wireless',
        'tm': 'com.tmall.wireless',
      
        // === Todoist (com.todoist) ===
        'Todoist': 'com.todoist',
        'todoist': 'com.todoist',
      
        // === Trello (com.trello) ===
        'Trello': 'com.trello',
        'trello': 'com.trello',
      
        // === X / Twitter (com.twitter.android) ===
        'X': 'com.twitter.android',
        'Twitter': 'com.twitter.android',
        '推特': 'com.twitter.android',
        'twitter': 'com.twitter.android',
      
        // === Uber (com.ubercab) ===
        'Uber': 'com.ubercab',
        'uber': 'com.ubercab',
      
        // === 云闪付 (com.unionpay) ===
        '云闪付': 'com.unionpay',
        'UnionPay': 'com.unionpay',
        '银联': 'com.unionpay',
      
        // === Steam (com.valvesoftware.android.steam.community) ===
        'Steam': 'com.valvesoftware.android.steam.community',
        'steam': 'com.valvesoftware.android.steam.community',
      
        // === WhatsApp (com.whatsapp) ===
        'WhatsApp': 'com.whatsapp',
        'whatsapp': 'com.whatsapp',
        'WA': 'com.whatsapp',
        'wa': 'com.whatsapp',
      
        // === 小红书 (com.xingin.xhs) ===
        '小红书': 'com.xingin.xhs',
        'Xiaohongshu': 'com.xingin.xhs',
        'RED': 'com.xingin.xhs',
        'xhs': 'com.xingin.xhs',
      
        // === 学而思 (com.xueersi.spatio) ===
        '学而思': 'com.xueersi.spatio',
        'Xueersi': 'com.xueersi.spatio',
      
        // === 拼多多 (com.xunmeng.pinduoduo) ===
        '拼多多': 'com.xunmeng.pinduoduo',
        'Pinduoduo': 'com.xunmeng.pinduoduo',
        'PDD': 'com.xunmeng.pinduoduo',
        'pdd': 'com.xunmeng.pinduoduo',
      
        // === 优酷 (com.youku.phone) ===
        '优酷': 'com.youku.phone',
        'Youku': 'com.youku.phone',
      
        // === 知乎 (com.zhihu.android) ===
        '知乎': 'com.zhihu.android',
        'Zhihu': 'com.zhihu.android',
      
        // === TikTok (com.zhiliaoapp.musically) ===
        'TikTok': 'com.zhiliaoapp.musically',
        'tiktok': 'com.zhiliaoapp.musically',
        'tt': 'com.zhiliaoapp.musically',
      
        // === 携程旅行 (ctrip.android.view) ===
        '携程旅行': 'ctrip.android.view',
        '携程': 'ctrip.android.view',
        'Ctrip': 'ctrip.android.view',
      
        // === Obsidian (md.obsidian) ===
        'Obsidian': 'md.obsidian',
        'obsidian': 'md.obsidian',
      
        // === 饿了么 (me.ele.android.app) ===
        '饿了么': 'me.ele.android.app',
        'Ele.me': 'me.ele.android.app',
        'eleme': 'me.ele.android.app',
      
        // === Firefox (org.mozilla.firefox) ===
        'Firefox': 'org.mozilla.firefox',
        'firefox': 'org.mozilla.firefox',
        'FF': 'org.mozilla.firefox',
        'ff': 'org.mozilla.firefox',
        'Mozilla Firefox': 'org.mozilla.firefox',
      
        // === Telegram (org.telegram.messenger) ===
        'Telegram': 'org.telegram.messenger',
        'telegram': 'org.telegram.messenger',
        'TG': 'org.telegram.messenger',
        'tg': 'org.telegram.messenger',
      
        // === 哔哩哔哩 (tv.danmaku.bili) ===
        '哔哩哔哩': 'tv.danmaku.bili',
        'B站': 'tv.danmaku.bili',
        'b站': 'tv.danmaku.bili',
        'bilibili': 'tv.danmaku.bili',
        'Bili': 'tv.danmaku.bili',
        'Bilibili': 'tv.danmaku.bili',
      
        // === Zoom (us.zoom.videomeetings) ===
        'Zoom': 'us.zoom.videomeetings',
        'zoom': 'us.zoom.videomeetings'
      });
      
      module.exports = {
        DEFAULT_MANUAL_MAPPINGS
      };
      
    },
    'integration/javascript/debug/debug-controller.js': function (module, exports, require, __dirname, __filename) {
      'use strict';
      
      /**
       * GOTO Base 调试模块 — DebugController
       *
       * 为 HOST / 开发者提供 GOTO Base 行为的诊断与可解释性接口。
       *
       * 关键约束：
       *   - 所有方法仅在 featureFlags.goto_base_debug_enabled === true 时返回完整数据
       *   - debug 关闭时所有方法返回 { debugDisabled: true }
       *   - 不修改 Engine / HOST 或其他 Agent 的代码
       *   - 不上传任何调试信息（所有数据本地驻留）
       *   - 通过 registerConsoleCommands() 在 window 上挂载 window.GOTODebug.*
       *
       * 依赖：
       *   - SearchCoordinator（仅读取其 search() 返回的 CoordinatorResponse，不调用 search）
       *   - PersonalLearning（调用其 getStats / getPersonalBoost / exportProfile / resetProfile / setEnabled）
       *   - GlobalBaseAdapter（调用其 available / size）
       *   - AppIdentityResolver（可选，调用其 resolve 接口以补充包名映射）
       *   - featureFlags（外部传入的开关对象，至少包含 goto_base_debug_enabled）
       */
      
      const { LatencyProfiler } = require('integration/javascript/debug/latency-profiler.js');
      const {
        ExplainabilityFormatter,
        COLORS
      } = require('integration/javascript/debug/explainability-formatter.js');
      
      const DEBUG_FLAG = 'goto_base_debug_enabled';
      
      class DebugController {
        /**
         * @param {object} options
         *   - {object} coordinator SearchCoordinator 实例（可选，缺失时搜索诊断方法降级）
         *   - {object} [personalLearning] PersonalLearning 实例
         *   - {object} [globalBase] GlobalBaseAdapter 实例
         *   - {object} [resolver] AppIdentityResolver 实例（可选）
         *   - {object} featureFlags 必须包含 goto_base_debug_enabled
         *   - {function} [now] 自定义时间函数（测试用）
         */
        constructor({ coordinator, personalLearning, globalBase, resolver, featureFlags, now } = {}) {
          this._coordinator = coordinator || null;
          this._pl = personalLearning || null;
          this._base = globalBase || null;
          this._resolver = resolver || null;
          this._featureFlags = featureFlags || {};
          this._now = now || (() => new Date().toISOString());
          this._profiler = new LatencyProfiler({ now: undefined });
          // 内部缓存最近一次 explainSearch 的结果，供 explainResult 复用
          this._lastExplanation = null;
          // 记录 registerConsoleCommands 是否已注册
          this._commandsRegistered = false;
        }
      
        /**
         * 是否启用 debug 模式。
         */
        isDebugEnabled() {
          return this._featureFlags[DEBUG_FLAG] === true;
        }
      
        // ====== 搜索诊断 ======
      
        /**
         * 解释一次搜索的整体行为。
         * @param {string} query 原始查询
         * @param {object} coordinatorResponse SearchCoordinator.search() 返回的 CoordinatorResponse
         * @returns {object} 解释结构；debug 关闭时返回 { debugDisabled: true }
         */
        explainSearch(query, coordinatorResponse) {
          if (!this.isDebugEnabled()) {
            return { debugDisabled: true };
          }
          const resp = coordinatorResponse || {};
          const results = Array.isArray(resp.results) ? resp.results : [];
          const meta = resp.meta || {};
      
          // 拆分 engine / metadata / personal 阶段的分数信息
          const engineResults = results.map(r => ({
            packageName: r.packageName,
            appName: r.appName,
            engineScore: r.engineScore,
            engineRank: r._engineRank || 0
          }));
          const metadataBoost = {};
          const personalBoost = {};
          for (const r of results) {
            metadataBoost[r.packageName] = r.metadataScore || 0;
            personalBoost[r.packageName] = r.personalScore || 0;
          }
          const finalResults = results.map(r => ({
            packageName: r.packageName,
            appName: r.appName,
            engineScore: r.engineScore,
            metadataScore: r.metadataScore,
            personalScore: r.personalScore,
            finalScore: r.finalScore,
            matchedBy: r.matchedBy,
            explanation: r.explanation,
            rank: r.rank
          }));
      
          const latency = {
            engine: typeof meta.latencyMs === 'number' ? meta.latencyMs : null,
            metadata: null,
            personal: null,
            total: typeof meta.latencyMs === 'number' ? meta.latencyMs : null
          };
      
          const explanation = {
            summary: 'query="' + (query || '') + '" → ' + results.length + ' results' +
              (meta.degraded ? ' (degraded)' : ''),
            matchedByCounts: countBy(results, 'matchedBy'),
            topResult: results.length > 0 ? results[0].packageName : null
          };
      
          const out = {
            query: query || resp.query || '',
            normalizedQuery: resp.normalizedQuery || '',
            queryEventId: resp.queryEventId || '',
            engineResults,
            metadataBoost,
            personalBoost,
            finalResults,
            latency,
            degraded: !!meta.degraded,
            explanation
          };
          this._lastExplanation = out;
          return out;
        }
      
        /**
         * 解释单个结果。
         * @param {string} query 原始查询
         * @param {string} packageName 目标应用包名
         * @param {object} coordinatorResponse CoordinatorResponse
         * @returns {Promise<object>} debug 关闭时返回 { debugDisabled: true }
         */
        async explainResult(query, packageName, coordinatorResponse) {
          if (!this.isDebugEnabled()) {
            return { debugDisabled: true };
          }
          const resp = coordinatorResponse || {};
          const results = Array.isArray(resp.results) ? resp.results : [];
          const target = results.find(r => r.packageName === packageName);
          if (!target) {
            return {
              packageName,
              found: false,
              explanation: 'package not found in CoordinatorResponse results'
            };
          }
      
          let affinityDetails = null;
          if (this._pl && this._pl.available) {
            try {
              const normalizedQuery = resp.normalizedQuery || '';
              if (normalizedQuery) {
                const aff = await this._pl._store.getAffinity(normalizedQuery, packageName);
                affinityDetails = aff || null;
              }
            } catch (e) {
              affinityDetails = null;
            }
          }
      
          return {
            packageName: target.packageName,
            appName: target.appName,
            found: true,
            engineScore: target.engineScore,
            metadataScore: target.metadataScore,
            personalScore: target.personalScore,
            finalScore: target.finalScore,
            matchedBy: target.matchedBy,
            explanation: target.explanation,
            affinityDetails
          };
        }
      
        // ====== 学习统计 ======
      
        /**
         * 返回学习统计 + 额外诊断信息。
         * @returns {Promise<object>}
         */
        async getLearningStats() {
          if (!this.isDebugEnabled()) {
            return { debugDisabled: true };
          }
          if (!this._pl) {
            return {
              available: false,
              enabled: false,
              reason: 'PersonalLearning not provided'
            };
          }
          try {
            const stats = await this._pl.getStats();
            // 附加诊断信息
            const diag = {
              profileId: this._pl._profileId || 'default',
              localOnly: this._pl._localOnly,
              telemetry: this._pl._telemetry,
              cloudSync: this._pl._cloudSync,
              sessionId: this._pl._sessionId || null,
              recentQueryEventsCacheSize: this._pl._recentQueryEvents
                ? this._pl._recentQueryEvents.size : 0,
              pendingUpdates: this._pl._pendingUpdates
                ? this._pl._pendingUpdates.length : 0,
              eventsSinceCompact: this._pl._eventsSinceCompact || 0
            };
            return Object.assign({}, stats, { diagnostics: diag });
          } catch (e) {
            return {
              available: !!this._pl.available,
              enabled: this._pl.isEnabled(),
              error: (e && e.message) ? e.message : String(e)
            };
          }
        }
      
        /**
         * 查看指定查询下某应用的 affinity。
         * @param {string} query 原始或归一化查询
         * @param {string} packageName
         * @returns {Promise<object|null>}
         */
        async getAffinity(query, packageName) {
          if (!this.isDebugEnabled()) {
            return { debugDisabled: true };
          }
          if (!this._pl || !this._pl.available) {
            return null;
          }
          try {
            const normalized = normalizeQueryLocal(query);
            if (!normalized) return null;
            return await this._pl._store.getAffinity(normalized, packageName);
          } catch (e) {
            return null;
          }
        }
      
        /**
         * 查看某查询下的所有 affinity（按 currentWeight 降序）。
         * @param {string} query
         * @returns {Promise<Array<object>>}
         */
        async getAffinitiesForQuery(query) {
          if (!this.isDebugEnabled()) {
            return { debugDisabled: true };
          }
          if (!this._pl || !this._pl.available) {
            return [];
          }
          try {
            const normalized = normalizeQueryLocal(query);
            if (!normalized) return [];
            return await this._pl._store.getAllAffinities(normalized);
          } catch (e) {
            return [];
          }
        }
      
        /**
         * 查看指定 alias 的 PersonalAlias。
         * @param {string} alias 原始或归一化查询
         * @returns {Promise<object|null>}
         */
        async getPersonalAlias(alias) {
          if (!this.isDebugEnabled()) {
            return { debugDisabled: true };
          }
          if (!this._pl || !this._pl.available) {
            return null;
          }
          try {
            const normalized = normalizeQueryLocal(alias);
            if (!normalized) return null;
            return await this._pl._store.getPersonalAlias(normalized);
          } catch (e) {
            return null;
          }
        }
      
        /**
         * 查看所有 PersonalAlias。
         * @returns {Promise<Array<object>>}
         */
        async getAllPersonalAliases() {
          if (!this.isDebugEnabled()) {
            return { debugDisabled: true };
          }
          if (!this._pl || !this._pl.available) {
            return [];
          }
          try {
            return await this._pl._store.getAllPersonalAliases();
          } catch (e) {
            return [];
          }
        }
      
        // ====== 数据管理 ======
      
        /**
         * 导出当前 Profile（JSON）。
         * @returns {Promise<object>}
         */
        async exportProfile() {
          if (!this.isDebugEnabled()) {
            return { debugDisabled: true };
          }
          if (!this._pl) {
            return {
              profileId: 'default',
              exportedAt: this._now(),
              error: 'PersonalLearning not provided',
              queryEvents: [],
              selectionEvents: [],
              affinities: [],
              aliases: [],
              stubs: []
            };
          }
          return await this._pl.exportProfile();
        }
      
        /**
         * 清除学习数据（等价于 resetProfile）。
         * @returns {Promise<{ cleared: boolean, error?: string }>}
         */
        async clearLearningData() {
          if (!this.isDebugEnabled()) {
            return { debugDisabled: true };
          }
          if (!this._pl) {
            return { cleared: false, error: 'PersonalLearning not provided' };
          }
          try {
            await this._pl.resetProfile();
            return { cleared: true };
          } catch (e) {
            return { cleared: false, error: (e && e.message) ? e.message : String(e) };
          }
        }
      
        /**
         * 临时开启/关闭个性化（不删除学习数据）。
         * @param {boolean} enabled
         * @returns {Promise<{ enabled: boolean }>}
         */
        async setPersonalizationEnabled(enabled) {
          if (!this.isDebugEnabled()) {
            return { debugDisabled: true };
          }
          if (!this._pl) {
            return { enabled: false, error: 'PersonalLearning not provided' };
          }
          try {
            this._pl.setEnabled(!!enabled);
            // 等一拍让 setEnabled 内部的 fire-and-forget 持久化有几率完成
            await Promise.resolve();
            return { enabled: this._pl.isEnabled() };
          } catch (e) {
            return { enabled: this._pl.isEnabled(), error: (e && e.message) ? e.message : String(e) };
          }
        }
      
        // ====== Base 状态 ======
      
        /**
         * 验证 Base 数据包状态。
         * @returns {object}
         */
        getBaseStatus() {
          if (!this.isDebugEnabled()) {
            return { debugDisabled: true };
          }
          if (!this._base) {
            return {
              loaded: false,
              appCount: 0,
              schemaVersion: null,
              lastLoadedAt: null,
              corrupted: false,
              reason: 'GlobalBaseAdapter not provided'
            };
          }
          try {
            const loaded = !!this._base.available;
            const appCount = typeof this._base.size === 'function' ? this._base.size() : 0;
            const loadError = this._base.loadError || null;
            let schemaVersion = null;
            try {
              const manifest = (typeof this._base.getManifest === 'function')
                ? this._base.getManifest() : null;
              if (manifest && manifest.schemaVersion) schemaVersion = manifest.schemaVersion;
            } catch (e) { /* 静默 */ }
            return {
              loaded,
              appCount,
              schemaVersion,
              lastLoadedAt: this._base._loadedAt || null,
              corrupted: !!loadError,
              loadError: loadError ? (loadError.message || String(loadError)) : null
            };
          } catch (e) {
            return {
              loaded: false,
              appCount: 0,
              schemaVersion: null,
              lastLoadedAt: null,
              corrupted: true,
              error: (e && e.message) ? e.message : String(e)
            };
          }
        }
      
        // ====== Latency Profiler 透传 ======
      
        /**
         * 返回内部 LatencyProfiler 实例（供外部主动计时）。
         * @returns {LatencyProfiler}
         */
        getProfiler() {
          if (!this.isDebugEnabled()) return null;
          return this._profiler;
        }
      
        /**
         * 返回内部 ExplainabilityFormatter 引用（便于调用方格式化）。
         */
        getFormatter() {
          return ExplainabilityFormatter;
        }
      
        // ====== 控制台命令注册 ======
      
        /**
         * 在 hostWindow 上注册 window.GOTODebug.* 命令。
         * 仅在 debug enabled 时实际注册；否则不挂载任何命令。
         * @param {object} hostWindow
         * @returns {{ registered: boolean, commands: string[] }}
         */
        registerConsoleCommands(hostWindow) {
          if (!this.isDebugEnabled()) {
            return { registered: false, commands: [] };
          }
          if (!hostWindow || typeof hostWindow !== 'object') {
            return { registered: false, commands: [] };
          }
          const self = this;
          const commands = {
            /**
             * 解释一次搜索。
             * 用法：GOTODebug.explain(query, [coordinatorResponse])
             *   - 若未传 coordinatorResponse，则尝试 window._lastCoordinatorResponse
             */
            async explain(query, coordinatorResponse) {
              const resp = coordinatorResponse ||
                hostWindow._lastCoordinatorResponse ||
                (self._lastExplanation && self._lastExplanation._lastResponse) ||
                null;
              if (!resp) {
                return {
                  error: 'No CoordinatorResponse provided. Pass it as the 2nd argument, ' +
                    'or set window._lastCoordinatorResponse first.'
                };
              }
              const explanation = self.explainSearch(query, resp);
              const formatted = ExplainabilityFormatter.formatSearchExplanation(query, resp);
              // 打印到控制台
              try {
                const { message, styles } = ExplainabilityFormatter.formatConsole(formatted);
                if (typeof console !== 'undefined' && styles.length > 0) {
                  console.log(message, ...styles);
                } else if (typeof console !== 'undefined') {
                  console.log(formatted);
                }
              } catch (e) { /* 静默 */ }
              return explanation;
            },
      
            /**
             * 返回学习统计。
             */
            async stats() {
              const s = await self.getLearningStats();
              try {
                if (typeof console !== 'undefined') {
                  console.log('GOTODebug stats:', s);
                }
              } catch (e) { /* 静默 */ }
              return s;
            },
      
            /**
             * 查看指定查询下某应用的 affinity。
             */
            async affinity(query, packageName) {
              const aff = await self.getAffinity(query, packageName);
              const formatted = ExplainabilityFormatter.formatAffinityExplanation(aff);
              try {
                if (typeof console !== 'undefined') {
                  console.log(formatted);
                }
              } catch (e) { /* 静默 */ }
              return aff;
            },
      
            /**
             * 查看指定查询下的所有 affinity。
             */
            async affinitiesForQuery(query) {
              const list = await self.getAffinitiesForQuery(query);
              try {
                if (typeof console !== 'undefined') {
                  console.log('Affinities for "' + query + '":', list);
                }
              } catch (e) { /* 静默 */ }
              return list;
            },
      
            /**
             * 查看所有 PersonalAlias。
             */
            async aliases() {
              const list = await self.getAllPersonalAliases();
              try {
                if (typeof console !== 'undefined') {
                  console.log('PersonalAliases:', list);
                }
              } catch (e) { /* 静默 */ }
              return list;
            },
      
            /**
             * 导出 Profile JSON。
             */
            async export() {
              const profile = await self.exportProfile();
              try {
                if (typeof JSON !== 'undefined') {
                  console.log('Profile exported (' + JSON.stringify(profile).length + ' bytes)');
                }
              } catch (e) { /* 静默 */ }
              return profile;
            },
      
            /**
             * 清除学习数据。
             */
            async clear() {
              const result = await self.clearLearningData();
              try {
                if (typeof console !== 'undefined') {
                  console.log('clearLearningData:', result);
                }
              } catch (e) { /* 静默 */ }
              return result;
            },
      
            /**
             * 关闭个性化（不删除数据）。
             */
            async disablePersonalization() {
              const r = await self.setPersonalizationEnabled(false);
              try {
                if (typeof console !== 'undefined') console.log('Personalization disabled:', r);
              } catch (e) { /* 静默 */ }
              return r;
            },
      
            /**
             * 开启个性化。
             */
            async enablePersonalization() {
              const r = await self.setPersonalizationEnabled(true);
              try {
                if (typeof console !== 'undefined') console.log('Personalization enabled:', r);
              } catch (e) { /* 静默 */ }
              return r;
            },
      
            /**
             * 返回 Base 状态。
             */
            baseStatus() {
              const s = self.getBaseStatus();
              try {
                if (typeof console !== 'undefined') console.log('Base status:', s);
              } catch (e) { /* 静默 */ }
              return s;
            },
      
            /**
             * 返回 latency 报告（来自内部 profiler）。
             */
            latency() {
              const report = self._profiler.getReport();
              const formatted = self._profiler.formatReport();
              try {
                if (typeof console !== 'undefined') console.log(formatted);
              } catch (e) { /* 静默 */ }
              return report;
            },
      
            /**
             * 打印帮助。
             */
            help() {
              const help = [
                'GOTODebug commands:',
                '  GOTODebug.explain(query, [response])  - Explain the last search (or pass response)',
                '  GOTODebug.stats()                     - Show learning stats',
                '  GOTODebug.affinity(query, pkg)        - Show affinity for query/package',
                '  GOTODebug.affinitiesForQuery(query)   - Show all affinities for query',
                '  GOTODebug.aliases()                   - Show all personal aliases',
                '  GOTODebug.export()                    - Export profile as JSON',
                '  GOTODebug.clear()                     - Clear all learning data (destructive)',
                '  GOTODebug.disablePersonalization()    - Temporarily disable personalization',
                '  GOTODebug.enablePersonalization()     - Re-enable personalization',
                '  GOTODebug.baseStatus()                - Show Base data pack status',
                '  GOTODebug.latency()                   - Show latency report from profiler',
                '  GOTODebug.help()                      - Show this help'
              ].join('\n');
              try {
                if (typeof console !== 'undefined') console.log(help);
              } catch (e) { /* 静默 */ }
              return help;
            }
          };
      
          hostWindow.GOTODebug = commands;
          this._commandsRegistered = true;
          return {
            registered: true,
            commands: Object.keys(commands).sort()
          };
        }
      }
      
      // ====== 内部辅助 ======
      
      /**
       * 简易查询归一化（用于 getAffinity 等 debug 接口）。
       * 复用 runtime/shared/query-normalizer.js，失败时回退到 trim+lowercase。
       */
      function normalizeQueryLocal(query) {
        if (!query || typeof query !== 'string') return '';
        try {
          // 优先使用 runtime/shared/query-normalizer.js
          const mod = require('runtime/shared/query-normalizer.js');
          if (mod && typeof mod.normalize === 'function') {
            return mod.normalize(query) || '';
          }
        } catch (e) { /* 回退 */ }
        // 回退：trim + toLowerCase + 压缩空白
        return query.toLowerCase().replace(/\s+/g, ' ').trim();
      }
      
      function countBy(arr, key) {
        const out = {};
        for (const item of (arr || [])) {
          if (!item) continue;
          const v = item[key];
          if (v == null) continue;
          out[v] = (out[v] || 0) + 1;
        }
        return out;
      }
      
      module.exports = {
        DebugController,
        DEBUG_FLAG
      };
      
    },
    'integration/javascript/debug/latency-profiler.js': function (module, exports, require, __dirname, __filename) {
      'use strict';
      
      /**
       * GOTO Base 调试模块 — LatencyProfiler
       *
       * 用于测量 GOTO Base 各阶段（Engine / Metadata / Personal / Total）的耗时。
       *
       * 设计：
       *   - 每个 timer 通过 name 索引；同名 timer 重新 start 会覆盖原值
       *   - startTimer/endTimer 返回毫秒数（endTimer）；可多次 end 同一 timer 累加
       *   - measure(name, fn) async 包装，自动 start/end
       *   - getReport() 返回所有计时数据（name -> {count, totalMs, minMs, maxMs, lastMs}）
       *   - formatReport() 返回人类可读字符串
       *
       * 仅用于 debug 模式；非 debug 模式下不应被实例化（由 DebugController 守卫）。
       */
      
      const DEFAULT_NOW = () => {
        // 优先使用 performance.now()（更精确）；不可用时回退 Date.now()
        if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
          return performance.now();
        }
        return Date.now();
      };
      
      class LatencyProfiler {
        constructor(options) {
          const opts = options || {};
          this._now = opts.now || DEFAULT_NOW;
          // name -> { count, totalMs, minMs, maxMs, lastMs, _startMs }
          this._timers = new Map();
        }
      
        /**
         * 开始计时。同名 timer 重新开始会覆盖未结束的 _startMs，但不影响已累计的统计数据。
         * @param {string} name
         * @returns {void}
         */
        startTimer(name) {
          if (!name || typeof name !== 'string') {
            throw new Error('startTimer: name (string) is required');
          }
          let entry = this._timers.get(name);
          if (!entry) {
            entry = { count: 0, totalMs: 0, minMs: Infinity, maxMs: 0, lastMs: 0, _startMs: null };
            this._timers.set(name, entry);
          }
          entry._startMs = this._now();
        }
      
        /**
         * 结束计时并累加统计。返回本次耗时（毫秒）。
         * 若 timer 未 start，返回 0 且不影响统计。
         * @param {string} name
         * @returns {number} 本次耗时毫秒数
         */
        endTimer(name) {
          if (!name || typeof name !== 'string') {
            throw new Error('endTimer: name (string) is required');
          }
          const entry = this._timers.get(name);
          if (!entry || entry._startMs === null) {
            return 0;
          }
          const elapsed = Math.max(0, this._now() - entry._startMs);
          entry._startMs = null;
          entry.count++;
          entry.totalMs += elapsed;
          if (elapsed < entry.minMs) entry.minMs = elapsed;
          if (elapsed > entry.maxMs) entry.maxMs = elapsed;
          entry.lastMs = elapsed;
          return elapsed;
        }
      
        /**
         * 测量一个异步函数的耗时。自动 start/end，并返回函数本身的返回值。
         * @param {string} name
         * @param {function} fn async function
         * @returns {Promise<any>} fn 的返回值
         */
        async measure(name, fn) {
          if (typeof fn !== 'function') {
            throw new Error('measure: fn (function) is required');
          }
          this.startTimer(name);
          try {
            return await fn();
          } finally {
            this.endTimer(name);
          }
        }
      
        /**
         * 同步版本：测量一个同步函数的耗时。
         * @param {string} name
         * @param {function} fn sync function
         * @returns {any} fn 的返回值
         */
        measureSync(name, fn) {
          if (typeof fn !== 'function') {
            throw new Error('measureSync: fn (function) is required');
          }
          this.startTimer(name);
          try {
            return fn();
          } finally {
            this.endTimer(name);
          }
        }
      
        /**
         * 获取所有计时数据，按 name 排序。
         * @returns {object} { name: { count, totalMs, minMs, maxMs, lastMs, avgMs } }
         */
        getReport() {
          const report = {};
          const names = Array.from(this._timers.keys()).sort();
          for (const n of names) {
            const e = this._timers.get(n);
            const avg = e.count > 0 ? e.totalMs / e.count : 0;
            report[n] = {
              count: e.count,
              totalMs: round4(e.totalMs),
              minMs: e.count > 0 ? round4(e.minMs) : 0,
              maxMs: round4(e.maxMs),
              lastMs: round4(e.lastMs),
              avgMs: round4(avg)
            };
          }
          return report;
        }
      
        /**
         * 获取人类可读的耗时报告。
         * @returns {string}
         */
        formatReport() {
          const report = this.getReport();
          const names = Object.keys(report);
          if (names.length === 0) {
            return 'Latency report: (no timers recorded)';
          }
          const lines = ['Latency report:'];
          for (const n of names) {
            const r = report[n];
            const minStr = r.count > 0 ? r.minMs.toFixed(2) + 'ms' : '—';
            lines.push(
              '  ' + padName(n) +
              ' count=' + r.count +
              ' total=' + r.totalMs.toFixed(2) + 'ms' +
              ' avg=' + r.avgMs.toFixed(2) + 'ms' +
              ' min=' + minStr +
              ' max=' + r.maxMs.toFixed(2) + 'ms' +
              ' last=' + r.lastMs.toFixed(2) + 'ms'
            );
          }
          return lines.join('\n');
        }
      
        /**
         * 清空所有计时数据。
         */
        reset() {
          this._timers.clear();
        }
      
        /**
         * 检查某个 timer 是否已经 start 但未 end。
         * @param {string} name
         * @returns {boolean}
         */
        isRunning(name) {
          const entry = this._timers.get(name);
          return !!(entry && entry._startMs !== null);
        }
      }
      
      function round4(v) {
        if (typeof v !== 'number' || isNaN(v)) return 0;
        return Math.round(v * 10000) / 10000;
      }
      
      function padName(name) {
        const w = 18;
        if (name.length >= w) return name + ' ';
        return name + ' '.repeat(w - name.length);
      }
      
      module.exports = {
        LatencyProfiler
      };
      
    },
    'integration/javascript/debug/explainability-formatter.js': function (module, exports, require, __dirname, __filename) {
      'use strict';
      
      /**
       * GOTO Base 调试模块 — ExplainabilityFormatter
       *
       * 把 DebugController 产出的结构化解释转换为人类可读文本 / 浏览器控制台输出。
       *
       * 设计：
       *   - 纯函数模块（不持有状态）
       *   - 支持浏览器控制台颜色（%c 前缀样式）
       *   - 字段缺失时降级为占位符，不抛错
       *   - 兼容 CoordinatorResponse.results 的字段名
       */
      
      // ====== 颜色常量（用于 console %c 样式）======
      const COLORS = Object.freeze({
        reset: 'color: inherit;',
        bold: 'font-weight: bold;',
        dim: 'color: #888;',
        cyan: 'color: #0891b2;',
        green: 'color: #16a34a;',
        yellow: 'color: #ca8a04;',
        red: 'color: #dc2626;',
        blue: 'color: #2563eb;',
        magenta: 'color: #9333ea;',
        gray: 'color: #6b7280;'
      });
      
      /**
       * 格式化搜索整体解释（基于 explainSearch 的输出）。
       * @param {string} query 原始查询
       * @param {object} coordinatorResponse SearchCoordinator.search() 返回的 CoordinatorResponse
       * @returns {string} 人类可读字符串
       */
      function formatSearchExplanation(query, coordinatorResponse) {
        const resp = coordinatorResponse || {};
        const lines = [];
        lines.push('=== Search Explanation ===');
        lines.push('query:           ' + JSON.stringify(query || resp.query || ''));
        lines.push('normalizedQuery: ' + JSON.stringify(resp.normalizedQuery || ''));
        lines.push('queryEventId:    ' + JSON.stringify(resp.queryEventId || ''));
      
        const meta = resp.meta || {};
        lines.push('--- availability ---');
        lines.push('  engineAvailable:   ' + boolStr(meta.engineAvailable));
        lines.push('  baseAvailable:     ' + boolStr(meta.baseAvailable));
        lines.push('  personalEnabled:   ' + boolStr(meta.personalEnabled));
        lines.push('  degraded:          ' + boolStr(meta.degraded));
        if (typeof meta.latencyMs === 'number') {
          lines.push('  latencyMs:         ' + meta.latencyMs.toFixed(2));
        }
      
        const results = Array.isArray(resp.results) ? resp.results : [];
        lines.push('--- results (' + results.length + ') ---');
        for (let i = 0; i < results.length; i++) {
          const r = results[i];
          lines.push('  #' + (r.rank || (i + 1)) + ' ' + (r.appName || r.packageName || '?'));
          lines.push('     packageName:    ' + r.packageName);
          lines.push('     engineScore:    ' + fmtNum(r.engineScore));
          lines.push('     metadataScore:  ' + fmtNum(r.metadataScore));
          lines.push('     personalScore:  ' + fmtNum(r.personalScore));
          lines.push('     finalScore:     ' + fmtNum(r.finalScore));
          lines.push('     matchedBy:      ' + (r.matchedBy || '?'));
          if (r.explanation) {
            lines.push('     explanation:    ' + r.explanation);
          }
        }
        return lines.join('\n');
      }
      
      /**
       * 格式化单个结果的解释（基于 explainResult 的输出）。
       * @param {object} result DebugController.explainResult() 的返回值
       * @returns {string}
       */
      function formatResultExplanation(result) {
        if (!result || typeof result !== 'object') {
          return '=== Result Explanation ===\n(no data)';
        }
        const lines = [];
        lines.push('=== Result Explanation ===');
        lines.push('packageName:    ' + (result.packageName || '?'));
        lines.push('engineScore:    ' + fmtNum(result.engineScore));
        lines.push('metadataScore:  ' + fmtNum(result.metadataScore));
        lines.push('personalScore:  ' + fmtNum(result.personalScore));
        lines.push('finalScore:     ' + fmtNum(result.finalScore));
        lines.push('matchedBy:      ' + (result.matchedBy || '?'));
        if (result.explanation) {
          lines.push('explanation:    ' + result.explanation);
        }
        if (result.affinityDetails) {
          lines.push('--- affinity details ---');
          lines.push(formatAffinityExplanation(result.affinityDetails).split('\n').slice(1).join('\n'));
        }
        return lines.join('\n');
      }
      
      /**
       * 格式化单个 affinity 的解释。
       * @param {object} affinity QueryAppAffinity
       * @returns {string}
       */
      function formatAffinityExplanation(affinity) {
        if (!affinity || typeof affinity !== 'object') {
          return '=== Affinity ===\n(no affinity for this query/package)';
        }
        const lines = [];
        lines.push('=== Affinity ===');
        lines.push('normalizedQuery:          ' + (affinity.normalizedQuery || '?'));
        lines.push('packageName:              ' + (affinity.packageName || '?'));
        lines.push('selectionCount:           ' + (affinity.selectionCount || 0));
        lines.push('weightedSelectionCount:   ' + (affinity.weightedSelectionCount || 0));
        lines.push('correctionCount:          ' + (affinity.correctionCount || 0));
        lines.push('negativeCount:            ' + (affinity.negativeCount || 0));
        lines.push('currentWeight:            ' + fmtNum(affinity.currentWeight));
        lines.push('confidence:               ' + fmtNum(affinity.confidence));
        lines.push('firstSeenAt:              ' + (affinity.firstSeenAt || ''));
        lines.push('lastSeenAt:               ' + (affinity.lastSeenAt || ''));
        lines.push('lastConsecutiveCorrection:' + (affinity.lastConsecutiveCorrectionCount || 0));
        if (affinity.contextStats && typeof affinity.contextStats === 'object') {
          const keys = Object.keys(affinity.contextStats);
          if (keys.length > 0) {
            lines.push('contextStats:');
            for (const k of keys) {
              lines.push('  ' + k + ': ' + JSON.stringify(affinity.contextStats[k]));
            }
          }
        }
        return lines.join('\n');
      }
      
      /**
       * 格式化 latency 报告（基于 LatencyProfiler.getReport() 的返回值）。
       * @param {object} latency { engine, metadata, personal, total } 每个值为 number（毫秒）或对象
       * @returns {string}
       */
      function formatLatencyReport(latency) {
        if (!latency || typeof latency !== 'object') {
          return '=== Latency ===\n(no data)';
        }
        const lines = ['=== Latency ==='];
        const keys = Object.keys(latency);
        for (const k of keys) {
          const v = latency[k];
          if (v == null) {
            lines.push('  ' + padName(k) + ' (not measured)');
          } else if (typeof v === 'number') {
            lines.push('  ' + padName(k) + ' ' + v.toFixed(2) + ' ms');
          } else if (typeof v === 'object') {
            const ms = typeof v.totalMs === 'number' ? v.totalMs
              : typeof v.lastMs === 'number' ? v.lastMs
              : null;
            if (ms != null) {
              lines.push('  ' + padName(k) + ' ' + ms.toFixed(2) + ' ms' +
                (typeof v.count === 'number' ? ' (count=' + v.count + ')' : ''));
            } else {
              lines.push('  ' + padName(k) + ' ' + JSON.stringify(v));
            }
          } else {
            lines.push('  ' + padName(k) + ' ' + String(v));
          }
        }
        return lines.join('\n');
      }
      
      /**
       * 生成带颜色样式的控制台输出参数（用于 console.log %c 模式）。
       *
       * 返回 { message, styles }：调用方可用 console.log(message, ...styles)。
       *
       * @param {string} output 人类可读文本（如 formatSearchExplanation 的返回值）
       * @param {object} [options] { titleColor }
       * @returns {{ message: string, styles: string[] }}
       */
      function formatConsole(output, options) {
        const opts = options || {};
        if (typeof output !== 'string' || output.length === 0) {
          return { message: '', styles: [] };
        }
        const titleColor = opts.titleColor || COLORS.cyan + COLORS.bold;
        const lines = output.split('\n');
        const message = lines.map((line, i) => {
          if (i === 0) return '%c' + line + '%c';
          return line;
        }).join('\n');
        const styles = [titleColor, COLORS.reset];
        return { message, styles };
      }
      
      // ====== 内部辅助 ======
      
      function fmtNum(v) {
        if (typeof v !== 'number' || isNaN(v)) return '0';
        return v.toFixed(4);
      }
      
      function boolStr(v) {
        return v ? 'true' : 'false';
      }
      
      function padName(name) {
        const w = 12;
        if (!name) return ' '.repeat(w);
        if (name.length >= w) return name + ' ';
        return name + ' '.repeat(w - name.length);
      }
      
      module.exports = {
        ExplainabilityFormatter: {
          formatSearchExplanation,
          formatResultExplanation,
          formatAffinityExplanation,
          formatLatencyReport,
          formatConsole
        },
        COLORS
      };
      
    },
    'runtime/javascript/src/personal-learning.js': function (module, exports, require, __dirname, __filename) {
      'use strict';
      
      /**
       * GOTO Base Personal Learning — PersonalLearning 主门面（Facade）
       *
       * 封装完整的个人学习闭环：记录查询 → 记录选择 → 更新亲和度 → 更新别名 →
       * 排序时应用 personalBoost。
       *
       * 关键设计：
       *   - 所有写入操作 try/catch，失败时只记日志不抛出
       *   - isEnabled()=false 时不记录任何 QueryEvent / SelectionEvent
       *   - recordSelection 异步执行权重更新，不阻塞调用方
       *   - 初始化失败时 available=false，所有方法降级为 no-op
       *   - 调用 runtime/shared/ 的纯算法函数，不重新实现
       *   - 默认 localOnly=true, telemetry=false, cloudSync=false
       */
      
      const {
        buildConfig,
        createQueryEvent,
        createSelectionEvent,
        createPersonalAlias,
        createLocalAppStub,
        AliasStatus,
        AliasSource,
        SelectionSource
      } = require('runtime/shared/learning-types.js');
      const {
        normalize,
        detectLanguage
      } = require('runtime/shared/query-normalizer.js');
      const {
        updateAffinity,
        applyCorrection,
        updateAliasStatus,
        computePersonalBoost
      } = require('runtime/shared/learning-algorithms.js');
      const {
        rankCandidates: rankCandidatesImpl
      } = require('runtime/shared/personal-ranker.js');
      
      /**
       * 生成 UUID v4。
       */
      function genId() {
        try {
          if (typeof require === 'function') {
            const c = require('crypto');
            if (c && typeof c.randomUUID === 'function') return c.randomUUID();
          }
        } catch (e) {}
        if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
          return crypto.randomUUID();
        }
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
          const r = Math.random() * 16 | 0;
          const v = c === 'x' ? r : (r & 0x3 | 0x8);
          return v.toString(16);
        });
      }
      
      class PersonalLearning {
        /**
         * @param {object} options
         *   - {object} store LearningStore 实现（必须）
         *   - {object} [config] 学习配置覆盖
         *   - {string} [profileId='default'] Profile ID
         *   - {object} [hostContext] 宿主上下文
         *   - {function} [now] 自定义时间函数（测试用，返回 ISO 字符串）
         *   - {function} [idGen] 自定义 UUID 生成器（测试用）
         */
        constructor({ store, config, profileId, hostContext, now, idGen } = {}) {
          if (!store) {
            throw new Error('PersonalLearning: store is required');
          }
          this._store = store;
          this._config = buildConfig(config || {});
          this._profileId = profileId || 'default';
          this._hostContext = hostContext || null;
          this._now = now || (() => new Date().toISOString());
          this._idGen = idGen || genId;
      
          // 隐私默认值
          this._localOnly = true;
          this._telemetry = false;
          this._cloudSync = false;
      
          // 可用性标志
          this._available = false;
          // 学习开关（本地缓存，与 store 同步）
          this._enabled = true;
      
          // 最近 QueryEvent 缓存（eventId → QueryEvent）
          this._recentQueryEvents = new Map();
          this._maxRecentCache = 1000;
      
          // 待处理的学习更新 Promise 列表（用于测试等待）
          this._pendingUpdates = [];
      
          // 自上次 compact 以来累积的事件数
          this._eventsSinceCompact = 0;
      
          // 会话 ID
          this._sessionId = this._idGen();
      
          // Phase 3C: 写入串行化器——解决 fire-and-forget 同键竞争
          // 同一 (normalizedQuery, packageName) 的写入串行执行，不同键并行
          try {
            this._writeSerializer = new (require('runtime/javascript/src/write-serializer.js').WriteSerializer)();
          } catch (_) {
            this._writeSerializer = null;
          }
        }
      
        /**
         * 构造写入串行化 key。
         * @private
         */
        _serializeKey(normalizedQuery, packageName) {
          if (!normalizedQuery || !packageName) return '';
          return normalizedQuery + '|' + packageName;
        }
      
        /**
         * 初始化存储。失败时设置 available=false。
         */
        async init() {
          try {
            if (typeof this._store.init === 'function') {
              await this._store.init();
            }
            // 同步学习开关状态
            try {
              this._enabled = await this._store.isLearningEnabled();
            } catch (e) {
              this._enabled = true;
            }
            this._available = true;
          } catch (e) {
            this._available = false;
            this._enabled = false;
          }
        }
      
        /**
         * 是否可用（初始化成功）。
         */
        get available() {
          return this._available;
        }
      
        // ====== 学习开关 ======
      
        /**
         * 返回学习开关状态（同步，读本地缓存）。
         */
        isEnabled() {
          return this._enabled;
        }
      
        /**
         * 开/关学习（同步设置本地缓存，异步持久化）。
         */
        setEnabled(enabled) {
          this._enabled = !!enabled;
          if (this._available) {
            // fire-and-forget 持久化
            Promise.resolve()
              .then(() => this._store.setLearningEnabled(this._enabled))
              .catch(() => {});
          }
        }
      
        // ====== 记录查询 ======
      
        /**
         * 记录一次用户查询。
         * @param {object} params
         *   - {string} rawQuery 用户原始输入
         *   - {string} [sessionId] 会话 ID
         *   - {object} [context] 搜索上下文
         *   - {Array} [engineResults] Engine 候选
         *   - {Array} [baseResults] Base 候选
         * @returns {Promise<object|null>} QueryEvent；学习关闭/不可用/失败时返回 null
         */
        async recordQuery({ rawQuery, sessionId, context, engineResults, baseResults } = {}) {
          if (!this._available || !this._enabled) return null;
      
          try {
            const normalized = normalize(rawQuery || '');
            if (!normalized) return null;
            const language = detectLanguage(normalized);
      
            const engineRanking = this._buildRanking(engineResults);
            const baseRanking = this._buildRanking(baseResults);
            const candidatePackageNames = this._collectCandidates(engineResults, baseResults);
      
            const eventId = this._idGen();
            const queryEvent = createQueryEvent({
              eventId,
              rawQuery: rawQuery || '',
              normalizedQuery: normalized,
              queryLanguage: language,
              timestamp: this._now(),
              sessionId: sessionId || this._sessionId,
              context: context || {},
              candidatePackageNames,
              engineRanking,
              baseRanking
            });
      
            // 缓存最近的 QueryEvent（供 recordSelection 查询关联查询事件）
            this._cacheQueryEvent(queryEvent);
      
            // 持久化
            try {
              await this._store.recordQueryEvent(queryEvent);
            } catch (e) { /* 静默 */ }
      
            // 检查是否需要 compact
            this._eventsSinceCompact++;
            if (this._eventsSinceCompact >= this._config.compactionIntervalEvents) {
              this._eventsSinceCompact = 0;
              Promise.resolve().then(() => this._store.compact()).catch(() => {});
            }
      
            return queryEvent;
          } catch (e) {
            return null;
          }
        }
      
        /**
         * 记录一次用户选择。
         *
         * 权重更新异步执行，不阻塞调用方。调用方可通过 _waitForPendingUpdates() 等待。
         *
         * @param {object} params
         *   - {object} queryEvent 关联的 QueryEvent（由 recordQuery 返回）
         *   - {string} selectedPackageName 被选中的应用包名
         *   - {number} selectedRankBeforeLearning 学习前排名（1-based，0=未在候选中）
         *   - {number} selectedRankAfterLearning 学习后排名
         *   - {string} [selectionSource] SelectionSource 枚举值
         * @returns {Promise<object|null>} SelectionEvent；学习关闭/不可用/失败时返回 null
         */
        async recordSelection({ queryEvent, selectedPackageName, selectedRankBeforeLearning,
                                selectedRankAfterLearning, selectionSource } = {}) {
          if (!this._available || !this._enabled) return null;
          if (!queryEvent || !selectedPackageName) return null;
      
          try {
            const selectionEvent = createSelectionEvent({
              eventId: this._idGen(),
              queryEventId: queryEvent.eventId || '',
              normalizedQuery: queryEvent.normalizedQuery || '',
              selectedPackageName,
              selectedRankBeforeLearning: typeof selectedRankBeforeLearning === 'number'
                ? selectedRankBeforeLearning : 0,
              selectedRankAfterLearning: typeof selectedRankAfterLearning === 'number'
                ? selectedRankAfterLearning : 0,
              timestamp: this._now(),
              sessionId: queryEvent.sessionId || this._sessionId,
              selectionSource: selectionSource || SelectionSource.ENGINE_RESULT,
              context: queryEvent.context || {}
            });
      
            // 持久化 SelectionEvent
            try {
              await this._store.recordSelectionEvent(selectionEvent);
            } catch (e) { /* 静默 */ }
      
            // Phase 3C: 同一 (query, package) 的学习更新串行化，避免 read-modify-write 竞争
            const serializeKey = this._serializeKey(
              selectionEvent.normalizedQuery, selectionEvent.selectedPackageName);
            const updateFn = () => this._applyLearningUpdate(selectionEvent).catch(() => {});
            const updatePromise = this._writeSerializer
              ? this._writeSerializer.serialize(serializeKey, updateFn)
              : updateFn();
            this._trackPending(updatePromise);
      
            return selectionEvent;
          } catch (e) {
            return null;
          }
        }
      
        /**
         * 应用一次学习更新：
         *   1. 对同查询下的其他应用 affinity 应用 correction（用户改选 = 纠正信号）
         *   2. 对目标应用 affinity 应用 updateAffinity
         *   3. 重新评估 alias[query]：指向 currentWeight 最高的应用
         */
        async _applyLearningUpdate(selectionEvent) {
          try {
            const { normalizedQuery, selectedPackageName, timestamp } = selectionEvent;
            if (!normalizedQuery || !selectedPackageName) return;
      
            // 1. 获取此查询下的所有 affinity
            let allAffinities = [];
            try {
              allAffinities = await this._store.getAllAffinities(normalizedQuery);
            } catch (e) { allAffinities = []; }
      
            // 2. 检测连续纠正
            const isConsecutive = allAffinities.some(a =>
              a.packageName !== selectedPackageName &&
              (a.lastConsecutiveCorrectionCount || 0) > 0
            );
      
            // 3. 对其他应用应用 correction
            for (const aff of allAffinities) {
              if (aff.packageName !== selectedPackageName) {
                try {
                  const corrected = applyCorrection(aff, selectionEvent, isConsecutive, this._config);
                  await this._store.upsertAffinity(corrected);
                } catch (e) { /* 静默 */ }
              }
            }
      
            // 4. 对目标应用应用 updateAffinity
            let currentAffinity = null;
            try {
              currentAffinity = await this._store.getAffinity(normalizedQuery, selectedPackageName);
            } catch (e) { currentAffinity = null; }
            const updatedAffinity = updateAffinity(currentAffinity, selectionEvent, this._config);
            try {
              await this._store.upsertAffinity(updatedAffinity);
            } catch (e) { /* 静默 */ }
      
            // 5. 重新评估 alias
            await this._reevaluateAlias(normalizedQuery, selectionEvent);
          } catch (e) {
            // 静默：学习更新失败不影响调用方
          }
        }
      
        /**
         * 重新评估 alias[query]：
         *   - 找到该查询下 currentWeight 最高的应用
         *   - 若最高权重 <= 0：将现有 alias 标记为 SUPPRESSED
         *   - 若现有 alias 指向同一应用：更新 confidence / evidenceCount
         *   - 若现有 alias 指向不同应用或无现有 alias：创建新 candidate alias
         */
        async _reevaluateAlias(normalizedQuery, selectionEvent) {
          try {
            const allAffinities = await this._store.getAllAffinities(normalizedQuery);
            if (!allAffinities || allAffinities.length === 0) return;
      
            // 找最高 currentWeight
            let best = null;
            for (const aff of allAffinities) {
              if (!best || (aff.currentWeight || 0) > (best.currentWeight || 0)) {
                best = aff;
              }
            }
      
            const now = selectionEvent.timestamp;
            const existing = await this._store.getPersonalAlias(normalizedQuery);
      
            if (!best || (best.currentWeight || 0) <= 0) {
              // 没有正权重 affinity：抑制现有 alias
              if (existing && existing.status !== AliasStatus.SUPPRESSED &&
                  existing.status !== AliasStatus.DELETED) {
                const updated = Object.assign({}, existing, {
                  status: AliasStatus.SUPPRESSED,
                  updatedAt: now
                });
                await this._store.upsertPersonalAlias(updated);
              }
              return;
            }
      
            if (existing && existing.packageName === best.packageName) {
              // 同一应用：更新 confidence 与 evidence
              const updated = Object.assign({}, existing, {
                confidence: best.confidence,
                currentWeight: best.currentWeight,
                evidenceCount: (existing.evidenceCount || 0) + 1,
                updatedAt: now,
                lastUsedAt: now
              });
              const final = updateAliasStatus(updated, this._config);
              await this._store.upsertPersonalAlias(final);
              return;
            }
      
            // 不同应用或无现有 alias：创建/替换为新应用的 candidate alias
            const newAlias = createPersonalAlias({
              alias: normalizedQuery,
              packageName: best.packageName,
              source: AliasSource.USER_CLICK,
              createdAt: existing ? existing.createdAt : now,
              updatedAt: now,
              lastUsedAt: now
            });
            newAlias.confidence = best.confidence;
            newAlias.currentWeight = best.currentWeight;
            newAlias.evidenceCount = (existing && existing.packageName === best.packageName)
              ? (existing.evidenceCount || 0) + 1
              : 1;
            const final = updateAliasStatus(newAlias, this._config);
            await this._store.upsertPersonalAlias(final);
          } catch (e) {
            // 静默
          }
        }
      
        // ====== 排序与查询 ======
      
        /**
         * 获取指定查询下多个应用的 personalBoost 分数。
         * @param {string} query 原始或归一化查询
         * @param {string|Array<string>} packageNames 单个包名或包名数组
         * @returns {Promise<Map<string, number>>} packageName → boostScore
         */
        async getPersonalBoost(query, packageNames) {
          const result = new Map();
          if (!this._available) return result;
      
          try {
            const normalized = normalize(query || '');
            if (!normalized) return result;
      
            const packages = Array.isArray(packageNames) ? packageNames : [packageNames];
            if (!packages || packages.length === 0) return result;
      
            // 获取该查询下的所有 affinity（一次性读取，避免多次查库）
            let allAffinities = [];
            try {
              allAffinities = await this._store.getAllAffinities(normalized);
            } catch (e) { allAffinities = []; }
      
            const affMap = new Map();
            for (const a of allAffinities) {
              if (a && a.packageName) affMap.set(a.packageName, a);
            }
      
            for (const pkg of packages) {
              if (!pkg) continue;
              const aff = affMap.get(pkg);
              if (aff) {
                result.set(pkg, computePersonalBoost(aff, this._config));
              } else {
                result.set(pkg, 0);
              }
            }
          } catch (e) {
            // 静默：返回空 Map 或部分结果
          }
          return result;
        }
      
        /**
         * 获取该查询的 PersonalAlias 列表。
         * @param {string} query 原始或归一化查询
         * @returns {Promise<Array<object>>}
         */
        async getPersonalAliases(query) {
          if (!this._available) return [];
          try {
            const normalized = normalize(query || '');
            if (!normalized) return [];
            const all = await this._store.getAllPersonalAliases();
            return (all || []).filter(a => a && a.alias === normalized);
          } catch (e) {
            return [];
          }
        }
      
        /**
         * 对候选项应用个性化加权并产出最终排序。
         * @param {string} query 原始或归一化查询
         * @param {Array} engineResults Engine 候选
         * @param {Array} [baseResults] Base 候选
         * @returns {Promise<Array>} 排序后的候选列表
         */
        async rankCandidates(query, engineResults, baseResults) {
          if (!this._available) {
            // 降级：返回 engine 结果，不加 personalBoost
            return (engineResults || []).map(r => ({
              packageName: r.packageName,
              name: r.name,
              engineScore: typeof r.score === 'number' ? r.score : 0,
              baseScore: 0,
              personalScore: 0,
              finalScore: typeof r.score === 'number' ? r.score : 0,
              matchedBy: 'engine-only',
              explanation: 'degraded (unavailable)'
            }));
          }
      
          try {
            const normalized = normalize(query || '');
            let affinities = [];
            try {
              affinities = await this._store.getAllAffinities(normalized);
            } catch (e) { affinities = []; }
      
            const affMap = new Map();
            for (const a of (affinities || [])) {
              if (a && a.packageName) affMap.set(a.packageName, a);
            }
            return rankCandidatesImpl(normalized, engineResults, baseResults, affMap, this._config);
          } catch (e) {
            // 降级
            return (engineResults || []).map(r => ({
              packageName: r.packageName,
              name: r.name,
              engineScore: typeof r.score === 'number' ? r.score : 0,
              baseScore: 0,
              personalScore: 0,
              finalScore: typeof r.score === 'number' ? r.score : 0,
              matchedBy: 'engine-only',
              explanation: 'degraded (store error)'
            }));
          }
        }
      
        // ====== 导出 / 导入 / 重置 ======
      
        /**
         * 导出当前 profile 的所有数据。
         * @returns {Promise<object>}
         */
        async exportProfile() {
          if (!this._available) {
            return {
              profileId: this._profileId,
              exportedAt: this._now(),
              config: this._config,
              queryEvents: [],
              selectionEvents: [],
              affinities: [],
              aliases: [],
              stubs: []
            };
          }
          try {
            return await this._store.exportProfile(this._profileId);
          } catch (e) {
            return {
              profileId: this._profileId,
              exportedAt: this._now(),
              config: this._config,
              queryEvents: [],
              selectionEvents: [],
              affinities: [],
              aliases: [],
              stubs: []
            };
          }
        }
      
        /**
         * 导入数据。
         * @param {object} data PortableProfile 数据
         * @returns {Promise<void>}
         */
        async importProfile(data) {
          if (!this._available || !data) return;
          try {
            await this._store.importProfile(data, this._profileId);
          } catch (e) { /* 静默 */ }
        }
      
        /**
         * 清空当前 profile。
         * @returns {Promise<void>}
         */
        async resetProfile() {
          if (!this._available) return;
          try {
            await this._store.resetProfile(this._profileId);
          } catch (e) { /* 静默 */ }
          this._recentQueryEvents.clear();
          this._eventsSinceCompact = 0;
        }
      
        // ====== 压缩 ======
      
        /**
         * 手动触发压缩。
         * @returns {Promise<{compactedEvents: number, remainingEvents: number}>}
         */
        async compact() {
          if (!this._available) {
            return { compactedEvents: 0, remainingEvents: 0 };
          }
          try {
            return await this._store.compact();
          } catch (e) {
            return { compactedEvents: 0, remainingEvents: 0 };
          }
        }
      
        // ====== 统计 ======
      
        /**
         * 返回统计信息。
         * @returns {Promise<object>}
         */
        async getStats() {
          if (!this._available) {
            return {
              available: false,
              enabled: this._enabled,
              queryEvents: 0,
              selectionEvents: 0,
              affinities: 0,
              aliases: 0,
              stubs: 0,
              storageBytes: 0
            };
          }
          try {
            const s = await this._store.stats();
            return Object.assign({
              available: true,
              enabled: this._enabled,
              profileId: this._profileId
            }, s);
          } catch (e) {
            return {
              available: true,
              enabled: this._enabled,
              queryEvents: 0,
              selectionEvents: 0,
              affinities: 0,
              aliases: 0,
              stubs: 0,
              storageBytes: 0
            };
          }
        }
      
        // ====== LocalAppStub ======
      
        /**
         * 记录未知应用（本地应用存根）。
         * @param {object} params
         *   - {string} packageName
         *   - {string} appName
         *   - {string} [version]
         *   - {string} [iconRef]
         *   - {string} [discoveredVia]
         * @returns {Promise<object|null>}
         */
        async recordLocalAppStub({ packageName, appName, version, iconRef, discoveredVia } = {}) {
          if (!packageName || !appName) return null;
          try {
            const now = this._now();
            const stub = createLocalAppStub({
              packageName,
              appName,
              version: version !== undefined ? version : null,
              iconRef: iconRef !== undefined ? iconRef : null,
              installedAt: now,
              updatedAt: now,
              discoveredVia: discoveredVia || 'manual'
            });
            if (this._available) {
              try {
                await this._store.upsertLocalAppStub(stub);
              } catch (e) { /* 静默 */ }
            }
            return stub;
          } catch (e) {
            return null;
          }
        }
      
        /**
         * 返回本地应用存根列表。
         * @returns {Promise<Array<object>>}
         */
        async getLocalAppStubs() {
          if (!this._available) return [];
          try {
            // 优先使用 store 的 getAllLocalAppStubs 扩展方法
            if (typeof this._store.getAllLocalAppStubs === 'function') {
              return await this._store.getAllLocalAppStubs();
            }
            // 降级：通过 exportProfile 提取
            const exported = await this._store.exportProfile(this._profileId);
            return (exported && exported.stubs) || [];
          } catch (e) {
            return [];
          }
        }
      
        // ====== 测试辅助 ======
      
        /**
         * 等待所有待处理的学习更新完成（测试用）。
         */
        async _waitForPendingUpdates() {
          while (this._pendingUpdates.length > 0) {
            await Promise.all(this._pendingUpdates.slice());
          }
        }
      
        // ====== 内部辅助 ======
      
        _buildRanking(results) {
          if (!Array.isArray(results)) return [];
          return results.map((r, i) => {
            if (!r || !r.packageName) return null;
            return {
              packageName: r.packageName,
              score: typeof r.score === 'number' ? r.score : 0,
              rank: typeof r.rank === 'number' ? r.rank : (i + 1)
            };
          }).filter(Boolean);
        }
      
        _collectCandidates(engineResults, baseResults) {
          const set = new Set();
          if (Array.isArray(engineResults)) {
            for (const r of engineResults) {
              if (r && r.packageName) set.add(r.packageName);
            }
          }
          if (Array.isArray(baseResults)) {
            for (const r of baseResults) {
              if (r && r.packageName) set.add(r.packageName);
            }
          }
          return Array.from(set);
        }
      
        _cacheQueryEvent(event) {
          this._recentQueryEvents.set(event.eventId, event);
          if (this._recentQueryEvents.size > this._maxRecentCache) {
            const firstKey = this._recentQueryEvents.keys().next().value;
            this._recentQueryEvents.delete(firstKey);
          }
        }
      
        _trackPending(promise) {
          this._pendingUpdates.push(promise);
          const remove = () => {
            const i = this._pendingUpdates.indexOf(promise);
            if (i >= 0) this._pendingUpdates.splice(i, 1);
          };
          if (typeof promise.finally === 'function') {
            promise.finally(remove);
          } else {
            promise.then(remove, remove);
          }
        }
      }
      
      module.exports = { PersonalLearning, genId };
      
    },
    'runtime/shared/personal-ranker.js': function (module, exports, require, __dirname, __filename) {
      'use strict';
      
      /**
       * GOTO Base Personal Learning — PersonalRanker 接口
       *
       * 把 Engine/Base 的候选项与 Personal Learning Overlay 的亲和度结合，
       * 产出最终带 personalScore / finalScore 的候选列表，供 HOST 决定是否重排。
       *
       * 关键规则：
       *   1. 精确匹配保护：若 exactMatchProtection=true，且查询精确命中某应用名（或别名），
       *      则此应用保最高优先级，不会被 personalBoost 反超
       *   2. personalBoost：基于 affinity.currentWeight * confidence 计算个人加权分数
       *   3. 应该抑制的候选（shouldSuppress=true）：personalBoost=0，且不参与个人加权
       *   4. 最大 personalBoost 不超过 maxPersonalBoost
       *
       * 纯函数：不读写 store，不修改入参；返回新数组。
       */
      
      const { buildConfig } = require('runtime/shared/learning-types.js');
      const {
        computePersonalBoost,
        shouldSuppress
      } = require('runtime/shared/learning-algorithms.js');
      
      /**
       * 主入口：对候选项应用个性化加权并产出最终排序。
       *
       * 输入：
       *   - query: 归一化后的查询字符串
       *   - engineResults: Engine 返回的候选项 [{packageName, score, name, ...}]
       *   - baseResults: Base 增强后的候选项 [{packageName, score, name, ...}]（可为空）
       *   - affinities: Map<packageName, QueryAppAffinity>（由调用方从 store 读出）
       *   - config: 学习配置（可选，缺省使用 DEFAULT_LEARNING_CONFIG）
       *
       * 输出：[{packageName, engineScore, baseScore, personalScore, finalScore, matchedBy, explanation}]
       *   按 finalScore 降序排列
       *
       * matchedBy 取值：
       *   - 'exact-match': 精确命中应用名/别名
       *   - 'personal-boost': 个性化加权
       *   - 'engine-only': 仅 Engine 命中
       *   - 'base-only': 仅 Base 命中
       *   - 'manual-launch': 手动启动候选
       *
       * @param {string} query 归一化查询
       * @param {Array} engineResults Engine 候选
       * @param {Array} [baseResults] Base 候选
       * @param {Map<string, object>} [affinities] packageName → affinity
       * @param {object} [config] 学习配置
       * @returns {Array}
       */
      function rankCandidates(query, engineResults, baseResults, affinities, config) {
        const cfg = buildConfig(config || {});
        const affMap = affinities instanceof Map ? affinities : new Map(Object.entries(affinities || {}));
      
        // 合并候选：以 packageName 为 key，保留 engine/base 分数
        const merged = new Map();
        if (Array.isArray(engineResults)) {
          for (const r of engineResults) {
            if (!r || !r.packageName) continue;
            const cur = merged.get(r.packageName) || {
              packageName: r.packageName,
              name: r.name || r.label || r.packageName,
              engineScore: 0,
              baseScore: 0,
              original: r
            };
            cur.engineScore = typeof r.score === 'number' ? r.score : 0;
            merged.set(r.packageName, cur);
          }
        }
        if (Array.isArray(baseResults)) {
          for (const r of baseResults) {
            if (!r || !r.packageName) continue;
            const cur = merged.get(r.packageName) || {
              packageName: r.packageName,
              name: r.name || r.label || r.packageName,
              engineScore: 0,
              baseScore: 0,
              original: r
            };
            cur.baseScore = typeof r.score === 'number' ? r.score : 0;
            // 若 base 提供了 name，覆盖（base 数据更权威）
            if (r.name) cur.name = r.name;
            merged.set(r.packageName, cur);
          }
        }
      
        // 步骤 1: 精确匹配保护
        const exactMatchedPackages = cfg.exactMatchProtection
          ? findExactMatchPackages(query, merged, cfg)
          : new Set();
      
        // 步骤 2: 计算 personalBoost
        const candidates = [];
        for (const c of merged.values()) {
          const aff = affMap.get(c.packageName);
          let personalScore = 0;
          const explanation = [];
          if (aff && !shouldSuppress(aff, cfg)) {
            personalScore = computePersonalBoost(aff, cfg);
            if (personalScore > 0) {
              explanation.push(`personal-boost=${personalScore.toFixed(4)} (weight=${(aff.currentWeight || 0).toFixed(4)}, conf=${(aff.confidence || 0).toFixed(4)})`);
            }
          } else if (aff && shouldSuppress(aff, cfg)) {
            explanation.push(`suppressed (weight=${(aff.currentWeight || 0).toFixed(4)} <= ${cfg.suppressionThreshold})`);
          }
      
          candidates.push({
            packageName: c.packageName,
            name: c.name,
            engineScore: round4(c.engineScore),
            baseScore: round4(c.baseScore),
            personalScore: round4(personalScore),
            // finalScore = max(engineScore, baseScore) + personalBoost
            // 若有精确匹配保护，则精确匹配项不参与 personalBoost 比较
            finalScore: round4(Math.max(c.engineScore, c.baseScore) + personalScore),
            matchedBy: classifyMatch(c, exactMatchedPackages, personalScore),
            explanation: explanation.join('; ')
          });
        }
      
        // 步骤 3: 应用精确匹配保护
        const protected_ = applyExactMatchProtection(candidates, query, cfg);
      
        // 步骤 4: 限制 personalBoost 总量（防止一批候选都顶满）
        const limited = limitPersonalBoost(protected_, cfg);
      
        // 步骤 5: 排序
        limited.sort((a, b) => {
          // 精确匹配优先
          if (a.matchedBy === 'exact-match' && b.matchedBy !== 'exact-match') return -1;
          if (b.matchedBy === 'exact-match' && a.matchedBy !== 'exact-match') return 1;
          // 否则按 finalScore 降序
          return (b.finalScore || 0) - (a.finalScore || 0);
        });
      
        return limited;
      }
      
      /**
       * 应用个性化加权：对每个候选，将 personalBoost 加到 finalScore 上。
       * 已在 rankCandidates 内联实现，此函数对外暴露便于单独调用。
       *
       * @param {Array} candidates [{packageName, finalScore, ...}]
       * @param {Map<string, object>} affinities
       * @param {object} config
       * @returns {Array} 新数组，每项加 personalScore
       */
      function applyPersonalBoost(candidates, affinities, config) {
        const cfg = buildConfig(config || {});
        const affMap = affinities instanceof Map ? affinities : new Map(Object.entries(affinities || {}));
        if (!Array.isArray(candidates)) return [];
        return candidates.map(c => {
          const aff = affMap.get(c.packageName);
          let personalScore = 0;
          if (aff && !shouldSuppress(aff, cfg)) {
            personalScore = computePersonalBoost(aff, cfg);
          }
          return Object.assign({}, c, {
            personalScore: round4(personalScore),
            finalScore: round4((c.finalScore || c.engineScore || 0) + personalScore)
          });
        });
      }
      
      /**
       * 精确匹配保护：若某候选精确匹配查询，强制将其排在第一位，并标记 matchedBy='exact-match'。
       * 注意：仅修改排序与 matchedBy 标记，不修改 finalScore 字段。
       *
       * @param {Array} candidates
       * @param {string} query
       * @param {object} config
       * @returns {Array} 重排后的新数组
       */
      function applyExactMatchProtection(candidates, query, config) {
        const cfg = buildConfig(config || {});
        if (!cfg.exactMatchProtection) return candidates.slice();
        if (!query || !Array.isArray(candidates)) return candidates.slice();
      
        const qLower = String(query).toLowerCase().trim();
        if (!qLower) return candidates.slice();
      
        // 找出精确匹配的候选
        const exactMatchIndices = [];
        for (let i = 0; i < candidates.length; i++) {
          const c = candidates[i];
          if (c && c.name && String(c.name).toLowerCase().trim() === qLower) {
            exactMatchIndices.push(i);
          }
        }
      
        if (exactMatchIndices.length === 0) return candidates.slice();
      
        // 取 finalScore 最高的精确匹配项的索引
        exactMatchIndices.sort((a, b) => {
          const sa = candidates[a].finalScore || 0;
          const sb = candidates[b].finalScore || 0;
          return sb - sa;
        });
        const topIdx = exactMatchIndices[0];
      
        // 构造新数组：先放 markedTop，再放其他
        const markedTop = Object.assign({}, candidates[topIdx], { matchedBy: 'exact-match' });
        const result = [markedTop];
        for (let i = 0; i < candidates.length; i++) {
          if (i === topIdx) continue;
          result.push(candidates[i]);
        }
        return result;
      }
      
      /**
       * 限制 personalBoost 总量，防止一组候选都顶满 maxPersonalBoost。
       * 简单策略：按 personalScore 降序排序，若总和超过 N * maxPersonalBoost，按比例缩放。
       *
       * @param {Array} candidates
       * @param {object} config
       * @returns {Array} 新数组（已缩放）
       */
      function limitPersonalBoost(candidates, config) {
        const cfg = buildConfig(config || {});
        const maxBoost = cfg.maxPersonalBoost ?? 0.5;
        if (!Array.isArray(candidates) || candidates.length === 0) return [];
      
        // 找出所有有 personalScore 的候选
        let total = 0;
        const idx = [];
        for (let i = 0; i < candidates.length; i++) {
          const ps = candidates[i].personalScore || 0;
          if (ps > 0) {
            total += ps;
            idx.push(i);
          }
        }
        if (total === 0) return candidates.slice();
      
        // 每个候选上限为 maxBoost；若超出，按比例缩放
        const cap = idx.length * maxBoost;
        if (total <= cap) return candidates.slice();
      
        const scale = cap / total;
        return candidates.map((c, i) => {
          if (!idx.includes(i)) return c;
          const newPs = Math.min(maxBoost, (c.personalScore || 0) * scale);
          const diff = newPs - (c.personalScore || 0);
          return Object.assign({}, c, {
            personalScore: round4(newPs),
            finalScore: round4((c.finalScore || 0) + diff)
          });
        });
      }
      
      // ====== 内部辅助 ======
      
      function findExactMatchPackages(query, merged, config) {
        const set = new Set();
        if (!query) return set;
        const qLower = String(query).toLowerCase().trim();
        if (!qLower) return set;
        for (const c of merged.values()) {
          if (c.name && String(c.name).toLowerCase().trim() === qLower) {
            set.add(c.packageName);
          }
        }
        return set;
      }
      
      function classifyMatch(c, exactMatchedPackages, personalScore) {
        if (exactMatchedPackages.has(c.packageName)) return 'exact-match';
        if (personalScore > 0) return 'personal-boost';
        if (c.engineScore > 0 && c.baseScore > 0) return 'engine-and-base';
        if (c.baseScore > 0) return 'base-only';
        if (c.engineScore > 0) return 'engine-only';
        return 'unknown';
      }
      
      function round4(v) {
        if (typeof v !== 'number' || isNaN(v)) return 0;
        return Math.round(v * 10000) / 10000;
      }
      
      module.exports = {
        rankCandidates,
        applyPersonalBoost,
        applyExactMatchProtection,
        limitPersonalBoost
      };
      
    },
    'runtime/javascript/src/write-serializer.js': function (module, exports, require, __dirname, __filename) {
      'use strict';
      
      /**
       * GOTO Base — WriteSerializer
       *
       * Phase 3C：fire-and-forget 数据竞争修复
       *
       * 目的：
       *   解决 PersonalLearning.recordSelection() 在快速连续点击同一
       *   (normalizedQuery, packageName) 时的 read-modify-write 竞争问题。
       *
       *   修复前：两次快速点击 wx→微信
       *     A: read affinities (count=0) → compute weight=0.3 → upsert
       *     B: read affinities (count=0) → compute weight=0.3 → upsert（覆盖 A）
       *     结果：selectionCount 只 +1 而非 +2
       *
       *   修复后：同一 key 的写入串行化
       *     A: enqueue(key='wx|com.tencent.mm') → 执行
       *     B: enqueue(key='wx|com.tencent.mm') → 等待 A 完成 → 执行（读到 A 的结果）
       *     结果：selectionCount 正确 +2
       *
       *   不同 key 仍可并行（不同查询或不同应用之间无锁竞争）。
       *
       * 设计：
       *   - 每个 key 维护一个 Promise 链
       *   - serialize(key, fn) 把 fn 串到该 key 的链尾
       *   - fn 可以是 async function
       *   - 链完成后自动清理（避免内存泄漏）
       *   - 全局 getPendingCount() 用于测试断言
       *
       * 用法：
       *   const serializer = new WriteSerializer();
       *   await serializer.serialize('wx|com.tencent.mm', async () => {
       *     const aff = await store.get(...);
       *     const updated = updateAffinity(aff, ...);
       *     await store.upsert(updated);
       *   });
       */
      
      class WriteSerializer {
        constructor() {
          /** @type {Map<string, Promise>} 每个 key 的尾部 Promise */
          this._chains = new Map();
          /** @type {number} 全局进行中的任务数 */
          this._pendingCount = 0;
          /** @type {Map<string, number>} 每个 key 的总执行次数（统计用） */
          this._execCount = new Map();
        }
      
        /**
         * 串行执行 fn——同一 key 的 fn 按调用顺序排队执行。
         * 不同 key 之间并行。
         *
         * @param {string} key - 互斥键（通常是 normalizedQuery + '|' + packageName）
         * @param {function} fn - 异步或同步函数
         * @returns {Promise} fn 的返回值（Promise）
         */
        serialize(key, fn) {
          if (!key || typeof key !== 'string') {
            // 无 key 则直接执行（不串行化）
            return Promise.resolve().then(() => fn());
          }
      
          const prev = this._chains.get(key) || Promise.resolve();
          this._pendingCount++;
      
          const next = prev
            .then(() => fn())
            .catch((err) => {
              // 不让单次失败打断链——下游仍可继续
              // 但要传递 err 给当前调用的 caller
              throw err;
            })
            .then((result) => {
              this._pendingCount--;
              // 累计执行次数
              this._execCount.set(key, (this._execCount.get(key) || 0) + 1);
              // 如果当前链尾就是 next，清理引用（避免内存泄漏）
              if (this._chains.get(key) === next) {
                this._chains.delete(key);
              }
              return result;
            }, (err) => {
              this._pendingCount--;
              if (this._chains.get(key) === next) {
                this._chains.delete(key);
              }
              throw err;
            });
      
          this._chains.set(key, next);
          return next;
        }
      
        /**
         * 等待所有 key 的所有任务完成（测试用）。
         */
        async waitAll() {
          while (this._pendingCount > 0) {
            const promises = Array.from(this._chains.values());
            if (promises.length === 0) break;
            await Promise.allSettled(promises);
          }
        }
      
        /**
         * 获取当前进行中的任务数。
         */
        getPendingCount() {
          return this._pendingCount;
        }
      
        /**
         * 获取某个 key 的累计执行次数（测试断言用）。
         */
        getExecCount(key) {
          return this._execCount.get(key) || 0;
        }
      
        /**
         * 获取当前活跃的 key 数（测试用）。
         */
        getActiveKeyCount() {
          return this._chains.size;
        }
      
        /**
         * 重置所有统计（测试用）。
         * 注意：不会中断进行中的任务。
         */
        resetStats() {
          this._execCount.clear();
        }
      }
      
      module.exports = {
        WriteSerializer
      };
      
    },
    'runtime/javascript/src/memory-store.js': function (module, exports, require, __dirname, __filename) {
      'use strict';
      
      /**
       * GOTO Base Personal Learning — MemoryLearningStore
       *
       * 包装 runtime/shared/learning-store.js 的 InMemoryLearningStore，
       * 提供 Node.js 测试环境可用的内存存储实现。
       *
       * 行为与 InMemoryLearningStore 完全一致，仅作为 JS 运行时包的统一导出。
       */
      
      const { InMemoryLearningStore } = require('runtime/shared/learning-store.js');
      
      class MemoryLearningStore extends InMemoryLearningStore {
        /**
         * @param {object} [config] 学习配置
         */
        constructor(config) {
          super(config);
        }
      
        /**
         * 返回所有 LocalAppStub（扩展方法，基类未定义）。
         * @returns {Promise<Array<object>>}
         */
        async getAllLocalAppStubs() {
          const list = Array.from(this._stubsByPackage.values());
          return list.map(s => JSON.parse(JSON.stringify(s)));
        }
      
        /**
         * 获取某查询下的所有 QueryAppAffinity；无参数时返回当前 store 内所有 affinity。
         *
         * 语义统一：getAllAffinities() 无参数 ≡ getAllAffinities(undefined) 返回所有，
         * 与 stats().affinities 计数一致。覆盖基类以修正无参数返回空的 bug。
         *
         * @param {string} [normalizedQuery] 可选；省略时返回所有 affinity
         * @returns {Promise<Array<object>>} 按当前权重降序
         */
        async getAllAffinities(normalizedQuery) {
          if (normalizedQuery === undefined || normalizedQuery === null || normalizedQuery === '') {
            const all = [];
            for (const m of this._affinitiesByQuery.values()) {
              for (const aff of m.values()) all.push(aff);
            }
            return all
              .map(a => JSON.parse(JSON.stringify(a)))
              .sort((a, b) => (b.currentWeight || 0) - (a.currentWeight || 0));
          }
          return super.getAllAffinities(normalizedQuery);
        }
      }
      
      module.exports = { MemoryLearningStore };
      
    },
    'runtime/shared/learning-store.js': function (module, exports, require, __dirname, __filename) {
      'use strict';
      
      /**
       * GOTO Base Personal Learning — LearningStore 接口（抽象定义）
       *
       * 此模块定义 Personal Learning Overlay 的存储接口契约。
       * 它本身不实现具体 IO；具体实现（如 InMemoryLearningStore、FileLearningStore、
       * SQLiteLearningStore）需要实现这些方法，并满足 tests/learning-store-contract.test.js
       * 定义的行为契约。
       *
       * 设计原则：
       *   1. 所有方法应该原子、幂等（重放安全）
       *   2. 异步方法返回 Promise（即使具体实现是同步的，应包装为 Promise.resolve）
       *   3. 不假设调用方持有锁；具体实现需考虑并发安全
       *   4. profileId 用于多用户/多配置文件场景；单用户场景可使用 'default'
       *
       * 接口对齐：Kotlin/Rust 实现应保持同名方法签名（除异步模型差异）。
       */
      
      /**
       * LearningStore 抽象接口。
       *
       * 所有方法在抽象基类中抛 'NOT_IMPLEMENTED'，子类必须 override。
       */
      class LearningStore {
        /**
         * 初始化 store（如打开数据库连接、加载持久化文件等）。
         * 子类应保证此方法幂等。
         * @returns {Promise<void>}
         */
        async init() {
          throw new Error('NOT_IMPLEMENTED: init()');
        }
      
        /**
         * 关闭 store（释放资源）。
         * @returns {Promise<void>}
         */
        async close() {
          throw new Error('NOT_IMPLEMENTED: close()');
        }
      
        // ====== 事件记录 ======
      
        /**
         * 记录一次 QueryEvent。
         * @param {object} event 符合 query-event.schema.json
         * @returns {Promise<void>}
         */
        async recordQueryEvent(event) {
          throw new Error('NOT_IMPLEMENTED: recordQueryEvent()');
        }
      
        /**
         * 记录一次 SelectionEvent。
         * @param {object} event 符合 selection-event.schema.json
         * @returns {Promise<void>}
         */
        async recordSelectionEvent(event) {
          throw new Error('NOT_IMPLEMENTED: recordSelectionEvent()');
        }
      
        /**
         * 查询某段时间内的事件（用于离线分析）。
         * @param {string} [from] ISO 8601 起始时间（含）
         * @param {string} [to] ISO 8601 截止时间（含）
         * @param {number} [limit=100] 最大返回数
         * @returns {Promise<Array>} 事件列表（混合 QueryEvent 与 SelectionEvent，按 timestamp 升序）
         */
        async queryEvents(from, to, limit) {
          throw new Error('NOT_IMPLEMENTED: queryEvents()');
        }
      
        // ====== Affinity ======
      
        /**
         * 获取单个 QueryAppAffinity。
         * @param {string} normalizedQuery
         * @param {string} packageName
         * @returns {Promise<object|null>} 不存在返回 null
         */
        async getAffinity(normalizedQuery, packageName) {
          throw new Error('NOT_IMPLEMENTED: getAffinity()');
        }
      
        /**
         * 获取某查询下的所有 QueryAppAffinity。
         * @param {string} normalizedQuery
         * @returns {Promise<Array<object>>} 按当前权重降序
         */
        async getAllAffinities(normalizedQuery) {
          throw new Error('NOT_IMPLEMENTED: getAllAffinities()');
        }
      
        /**
         * 获取某应用相关的所有 QueryAppAffinity。
         * @param {string} packageName
         * @returns {Promise<Array<object>>}
         */
        async getAllAffinitiesForApp(packageName) {
          throw new Error('NOT_IMPLEMENTED: getAllAffinitiesForApp()');
        }
      
        /**
         * 写入或更新一个 QueryAppAffinity（upsert）。
         * @param {object} affinity
         * @returns {Promise<void>}
         */
        async upsertAffinity(affinity) {
          throw new Error('NOT_IMPLEMENTED: upsertAffinity()');
        }
      
        // ====== PersonalAlias ======
      
        /**
         * 获取单个别名（按归一化 alias + packageName 唯一）。
         * @param {string} alias
         * @returns {Promise<object|null>}
         */
        async getPersonalAlias(alias) {
          throw new Error('NOT_IMPLEMENTED: getPersonalAlias()');
        }
      
        /**
         * 获取所有别名（可选状态过滤）。
         * @param {string} [status] AliasStatus 枚举值
         * @returns {Promise<Array<object>>}
         */
        async getAllPersonalAliases(status) {
          throw new Error('NOT_IMPLEMENTED: getAllPersonalAliases()');
        }
      
        /**
         * 写入或更新一个 PersonalAlias（upsert）。
         * @param {object} alias
         * @returns {Promise<void>}
         */
        async upsertPersonalAlias(alias) {
          throw new Error('NOT_IMPLEMENTED: upsertPersonalAlias()');
        }
      
        // ====== LocalAppStub ======
      
        /**
         * 获取一个 LocalAppStub。
         * @param {string} packageName
         * @returns {Promise<object|null>}
         */
        async getLocalAppStub(packageName) {
          throw new Error('NOT_IMPLEMENTED: getLocalAppStub()');
        }
      
        /**
         * 写入或更新一个 LocalAppStub（upsert）。
         * @param {object} stub
         * @returns {Promise<void>}
         */
        async upsertLocalAppStub(stub) {
          throw new Error('NOT_IMPLEMENTED: upsertLocalAppStub()');
        }
      
        // ====== Profile 管理 ======
      
        /**
         * 获取 profile（包含配置、统计摘要等）。
         * @param {string} profileId
         * @returns {Promise<object|null>}
         */
        async getProfile(profileId) {
          throw new Error('NOT_IMPLEMENTED: getProfile()');
        }
      
        /**
         * 列出所有 profile。
         * @returns {Promise<Array<object>>}
         */
        async listProfiles() {
          throw new Error('NOT_IMPLEMENTED: listProfiles()');
        }
      
        /**
         * 导出 profile 数据（用于跨设备同步或备份）。
         * @param {string} profileId
         * @returns {Promise<object>} 符合 PortableProfile 结构（包含 events / affinities / aliases / stubs / config）
         */
        async exportProfile(profileId) {
          throw new Error('NOT_IMPLEMENTED: exportProfile()');
        }
      
        /**
         * 导入 profile 数据（覆盖写入）。
         * @param {object} data PortableProfile 数据
         * @param {string} [profileId] 目标 profile（默认为 'default'）
         * @returns {Promise<void>}
         */
        async importProfile(data, profileId) {
          throw new Error('NOT_IMPLEMENTED: importProfile()');
        }
      
        /**
         * 重置 profile（清空所有 events / affinities / aliases / stubs，但保留配置）。
         * @param {string} profileId
         * @returns {Promise<void>}
         */
        async resetProfile(profileId) {
          throw new Error('NOT_IMPLEMENTED: resetProfile()');
        }
      
        // ====== 压缩与清理 ======
      
        /**
         * 压缩：将旧事件聚合到 affinity 表中，并删除超过 maxEventsKept 的事件。
         * 应保证：
         *   - 调用前后 affinity 表的逻辑状态等价（不会丢学习信号）
         *   - 调用后 events 数量 <= maxEventsKept
         * @returns {Promise<{compactedEvents: number, remainingEvents: number}>}
         */
        async compact() {
          throw new Error('NOT_IMPLEMENTED: compact()');
        }
      
        // ====== 全局开关 ======
      
        /**
         * 是否启用学习（全局开关，用户可在设置中关闭）。
         * 关闭时：仍可读取已有 affinity 用于排序，但不写入新事件。
         * @returns {Promise<boolean>}
         */
        async isLearningEnabled() {
          throw new Error('NOT_IMPLEMENTED: isLearningEnabled()');
        }
      
        /**
         * 设置学习开关。
         * @param {boolean} enabled
         * @returns {Promise<void>}
         */
        async setLearningEnabled(enabled) {
          throw new Error('NOT_IMPLEMENTED: setLearningEnabled()');
        }
      
        // ====== 统计 ======
      
        /**
         * 返回 store 当前状态摘要（用于诊断）。
         * @returns {Promise<object>}
         */
        async stats() {
          throw new Error('NOT_IMPLEMENTED: stats()');
        }
      }
      
      /**
       * InMemoryLearningStore —— 最小内存实现，用于测试与开发期参考。
       *
       * 提供完整可运行实现，验证接口契约；生产环境应替换为持久化实现。
       */
      class InMemoryLearningStore extends LearningStore {
        constructor(config) {
          super();
          this._config = config || {};
          this._queryEvents = [];
          this._selectionEvents = [];
          // (normalizedQuery || '@app:' + packageName) → Map<packageName, affinity>
          this._affinitiesByQuery = new Map();
          this._affinitiesByApp = new Map();
          this._aliasesByAlias = new Map(); // alias → PersonalAlias
          this._stubsByPackage = new Map();
          this._profiles = new Map();
          this._learningEnabled = true;
          this._initialized = false;
        }
      
        async init() {
          this._initialized = true;
        }
      
        async close() {
          this._initialized = false;
        }
      
        async recordQueryEvent(event) {
          if (!this._learningEnabled) return;
          this._queryEvents.push(Object.assign({}, event));
        }
      
        async recordSelectionEvent(event) {
          if (!this._learningEnabled) return;
          this._selectionEvents.push(Object.assign({}, event));
        }
      
        async queryEvents(from, to, limit) {
          const fromMs = from ? Date.parse(from) : -Infinity;
          const toMs = to ? Date.parse(to) : Infinity;
          const cap = (typeof limit === 'number' && limit > 0) ? limit : 100;
          const all = []
            .concat(this._queryEvents.map(e => ({ type: 'query', event: e })))
            .concat(this._selectionEvents.map(e => ({ type: 'selection', event: e })));
          all.sort((a, b) => {
            const ta = Date.parse(a.event.timestamp || '');
            const tb = Date.parse(b.event.timestamp || '');
            return ta - tb;
          });
          return all
            .filter(item => {
              const t = Date.parse(item.event.timestamp || '');
              return t >= fromMs && t <= toMs;
            })
            .slice(0, cap)
            .map(item => item.event);
        }
      
        async getAffinity(normalizedQuery, packageName) {
          const m = this._affinitiesByQuery.get(normalizedQuery);
          if (!m) return null;
          return m.get(packageName) || null;
        }
      
        async getAllAffinities(normalizedQuery) {
          const m = this._affinitiesByQuery.get(normalizedQuery);
          if (!m) return [];
          return Array.from(m.values()).sort((a, b) => (b.currentWeight || 0) - (a.currentWeight || 0));
        }
      
        async getAllAffinitiesForApp(packageName) {
          const m = this._affinitiesByApp.get(packageName);
          if (!m) return [];
          return Array.from(m.values());
        }
      
        async upsertAffinity(affinity) {
          if (!affinity || !affinity.normalizedQuery || !affinity.packageName) {
            throw new Error('upsertAffinity: invalid affinity');
          }
          const qMap = this._affinitiesByQuery.get(affinity.normalizedQuery) || new Map();
          const aMap = this._affinitiesByApp.get(affinity.packageName) || new Map();
          const cloned = JSON.parse(JSON.stringify(affinity));
          qMap.set(affinity.packageName, cloned);
          aMap.set(affinity.normalizedQuery, cloned);
          this._affinitiesByQuery.set(affinity.normalizedQuery, qMap);
          this._affinitiesByApp.set(affinity.packageName, aMap);
        }
      
        async getPersonalAlias(alias) {
          return this._aliasesByAlias.get(alias) || null;
        }
      
        async getAllPersonalAliases(status) {
          const all = Array.from(this._aliasesByAlias.values());
          return status ? all.filter(a => a.status === status) : all;
        }
      
        async upsertPersonalAlias(alias) {
          if (!alias || !alias.alias) throw new Error('upsertPersonalAlias: invalid alias');
          this._aliasesByAlias.set(alias.alias, JSON.parse(JSON.stringify(alias)));
        }
      
        async getLocalAppStub(packageName) {
          return this._stubsByPackage.get(packageName) || null;
        }
      
        async upsertLocalAppStub(stub) {
          if (!stub || !stub.packageName) throw new Error('upsertLocalAppStub: invalid stub');
          this._stubsByPackage.set(stub.packageName, JSON.parse(JSON.stringify(stub)));
        }
      
        async getProfile(profileId) {
          return this._profiles.get(profileId || 'default') || null;
        }
      
        async listProfiles() {
          return Array.from(this._profiles.values());
        }
      
        async exportProfile(profileId) {
          const pid = profileId || 'default';
          return {
            profileId: pid,
            exportedAt: new Date().toISOString(),
            config: this._config,
            queryEvents: this._queryEvents.slice(),
            selectionEvents: this._selectionEvents.slice(),
            affinities: Array.from(this._affinitiesByQuery.values())
              .flatMap(m => Array.from(m.values())),
            aliases: Array.from(this._aliasesByAlias.values()),
            stubs: Array.from(this._stubsByPackage.values())
          };
        }
      
        async importProfile(data, profileId) {
          const pid = profileId || (data && data.profileId) || 'default';
          if (!data) throw new Error('importProfile: data is null');
          if (Array.isArray(data.queryEvents)) {
            this._queryEvents = data.queryEvents.slice();
          }
          if (Array.isArray(data.selectionEvents)) {
            this._selectionEvents = data.selectionEvents.slice();
          }
          if (Array.isArray(data.affinities)) {
            this._affinitiesByQuery.clear();
            this._affinitiesByApp.clear();
            for (const a of data.affinities) {
              await this.upsertAffinity(a);
            }
          }
          if (Array.isArray(data.aliases)) {
            this._aliasesByAlias.clear();
            for (const a of data.aliases) {
              await this.upsertPersonalAlias(a);
            }
          }
          if (Array.isArray(data.stubs)) {
            this._stubsByPackage.clear();
            for (const s of data.stubs) {
              await this.upsertLocalAppStub(s);
            }
          }
          if (data.config && typeof data.config === 'object') {
            this._config = Object.assign({}, this._config, data.config);
          }
          this._profiles.set(pid, { profileId: pid, updatedAt: new Date().toISOString() });
        }
      
        async resetProfile(profileId) {
          const pid = profileId || 'default';
          this._queryEvents = [];
          this._selectionEvents = [];
          this._affinitiesByQuery.clear();
          this._affinitiesByApp.clear();
          this._aliasesByAlias.clear();
          this._stubsByPackage.clear();
          this._profiles.set(pid, { profileId: pid, updatedAt: new Date().toISOString(), reset: true });
        }
      
        async compact() {
          const maxKept = this._config.maxEventsKept || 10000;
          const totalBefore = this._queryEvents.length + this._selectionEvents.length;
          if (totalBefore <= maxKept) {
            return { compactedEvents: 0, remainingEvents: totalBefore };
          }
          // 按时间排序，保留最近的 maxKept 个
          const all = []
            .concat(this._queryEvents.map(e => ({ type: 'query', event: e })))
            .concat(this._selectionEvents.map(e => ({ type: 'selection', event: e })));
          all.sort((a, b) => {
            const ta = Date.parse(a.event.timestamp || '');
            const tb = Date.parse(b.event.timestamp || '');
            return ta - tb;
          });
          const dropped = all.slice(0, all.length - maxKept);
          const remaining = all.slice(all.length - maxKept);
          this._queryEvents = remaining.filter(x => x.type === 'query').map(x => x.event);
          this._selectionEvents = remaining.filter(x => x.type === 'selection').map(x => x.event);
          return { compactedEvents: dropped.length, remainingEvents: remaining.length };
        }
      
        async isLearningEnabled() {
          return this._learningEnabled;
        }
      
        async setLearningEnabled(enabled) {
          this._learningEnabled = !!enabled;
        }
      
        async stats() {
          let affinityCount = 0;
          for (const m of this._affinitiesByQuery.values()) affinityCount += m.size;
          return {
            queryEvents: this._queryEvents.length,
            selectionEvents: this._selectionEvents.length,
            affinities: affinityCount,
            aliases: this._aliasesByAlias.size,
            stubs: this._stubsByPackage.size,
            learningEnabled: this._learningEnabled,
            initialized: this._initialized
          };
        }
      }
      
      module.exports = {
        LearningStore,
        InMemoryLearningStore
      };
      
    },
    'runtime/javascript/src/localstorage-store.js': function (module, exports, require, __dirname, __filename) {
      'use strict';
      
      /**
       * GOTO Base Personal Learning — LocalStorageLearningStore
       *
       * 使用浏览器 localStorage 作为持久化后端的 LearningStore 实现。
       *
       * 数据按 key 前缀组织（含 profileId 隔离）：
       *   - goto:learning:{profileId}:queryEvents      — QueryEvent[]
       *   - goto:learning:{profileId}:selectionEvents  — SelectionEvent[]
       *   - goto:learning:{profileId}:affinities       — { key: affinity }
       *   - goto:learning:{profileId}:aliases           — { alias: aliasObj }
       *   - goto:learning:{profileId}:stubs             — { packageName: stub }
       *   - goto:learning:{profileId}:profile           — Profile 元信息
       *   - goto:learning:{profileId}:enabled           — 学习开关 ('true'/'false')
       *   - goto:learning:{profileId}:config            — 配置
       *   - goto:learning:{profileId}:meta              — 元数据
       *
       * 关键设计：
       *   - 事件数超过 maxEventsKept 时自动压缩（删除最旧事件）
       *   - 原子写入：先写临时键再覆盖目标键；QuotaExceededError 时自动压缩并重试
       *   - 数据损坏恢复：JSON.parse 失败时隔离到 corrupted 键，返回空结果
       *   - 仅存储聚合数据和高置信度别名；原始事件定期压缩
       */
      
      const { LearningStore } = require('runtime/shared/learning-store.js');
      
      const KEY_PREFIX = 'goto:learning';
      
      function isSelectionEvent(e) {
        return e && typeof e.selectedPackageName === 'string' && e.selectedPackageName.length > 0;
      }
      
      class LocalStorageLearningStore extends LearningStore {
        /**
         * @param {object} [config] 学习配置（至少包含 maxEventsKept）
         * @param {object} [storageImpl] 显式注入的 localStorage 实现（测试用）
         * @param {string} [profileId] Profile ID（默认 'default'）
         */
        constructor(config, storageImpl, profileId) {
          super();
          this._config = config || {};
          this._maxEventsKept = (typeof this._config.maxEventsKept === 'number' && this._config.maxEventsKept > 0)
            ? this._config.maxEventsKept : 10000;
          this._profileId = profileId || 'default';
          this._storage = storageImpl || null;
          if (!this._storage) {
            try {
              if (typeof localStorage !== 'undefined') {
                this._storage = localStorage;
              }
            } catch (e) { /* sandbox */ }
          }
          if (!this._storage) {
            throw new Error('LocalStorageLearningStore: localStorage is not available');
          }
          this._initialized = false;
        }
      
        // ====== key 生成 ======
      
        _key(suffix) {
          return `${KEY_PREFIX}:${this._profileId}:${suffix}`;
        }
      
        get KEYS() {
          return {
            QUERY_EVENTS: this._key('queryEvents'),
            SELECTION_EVENTS: this._key('selectionEvents'),
            AFFINITIES: this._key('affinities'),
            ALIASES: this._key('aliases'),
            STUBS: this._key('stubs'),
            PROFILE: this._key('profile'),
            ENABLED: this._key('enabled'),
            CONFIG: this._key('config'),
            META: this._key('meta'),
            CORRUPTED: this._key('corrupted')
          };
        }
      
        async init() {
          if (this._initialized) return;
          if (this._readRaw(this.KEYS.ENABLED) === null) {
            this._writeRaw(this.KEYS.ENABLED, 'true');
          }
          if (this._readRaw(this.KEYS.CONFIG) === null) {
            this._writeJSON(this.KEYS.CONFIG, this._config || {});
          }
          if (this._readRaw(this.KEYS.META) === null) {
            this._writeJSON(this.KEYS.META, { schemaVersion: '1.0.0', createdAt: new Date().toISOString() });
          }
          this._initialized = true;
        }
      
        async close() {
          this._initialized = false;
        }
      
        // ====== 内部读写 ======
      
        _readRaw(key) {
          try {
            return this._storage.getItem(key);
          } catch (e) {
            return null;
          }
        }
      
        _writeRaw(key, value) {
          try {
            this._storage.setItem(key, value);
            return true;
          } catch (e) {
            return false;
          }
        }
      
        _removeRaw(key) {
          try {
            this._storage.removeItem(key);
            return true;
          } catch (e) {
            return false;
          }
        }
      
        _readJSON(key, defaultValue) {
          const raw = this._readRaw(key);
          if (raw === null || raw === undefined) return defaultValue;
          try {
            return JSON.parse(raw);
          } catch (e) {
            this._quarantine(key, raw);
            return defaultValue;
          }
        }
      
        /**
         * 原子写入：先写临时键，再覆盖目标键。
         * QuotaExceededError 时自动压缩事件并重试一次。
         */
        _writeJSON(key, value) {
          let serialized;
          try {
            serialized = JSON.stringify(value);
          } catch (e) {
            return false;
          }
          const tempKey = `${key}.__tmp`;
          if (!this._writeRaw(tempKey, serialized)) {
            return false;
          }
          if (!this._writeRaw(key, serialized)) {
            // 配额不足：压缩事件后重试
            this._emergencyCompact();
            if (!this._writeRaw(key, serialized)) {
              return false;
            }
          }
          this._removeRaw(tempKey);
          return true;
        }
      
        _emergencyCompact() {
          try {
            const qEvents = this._readQueryEvents();
            const sEvents = this._readSelectionEvents();
            // 保留一半事件
            const maxKeep = Math.max(1, Math.floor(this._maxEventsKept / 2));
            const newQ = this._evictOldEvents(qEvents, maxKeep);
            const newS = this._evictOldEvents(sEvents, maxKeep);
            this._writeRaw(this.KEYS.QUERY_EVENTS, JSON.stringify(newQ));
            this._writeRaw(this.KEYS.SELECTION_EVENTS, JSON.stringify(newS));
          } catch (e) {
            // 静默
          }
        }
      
        _quarantine(origKey, rawValue) {
          try {
            const ts = Date.now();
            const quarantineKey = `${this.KEYS.CORRUPTED}:${origKey}:${ts}`;
            const truncated = (typeof rawValue === 'string' && rawValue.length > 65536)
              ? rawValue.slice(0, 65536) + '...[truncated]'
              : rawValue;
            this._storage.setItem(quarantineKey, truncated);
          } catch (e) {
            // 隔离失败也忽略
          }
        }
      
        _readQueryEvents() {
          const v = this._readJSON(this.KEYS.QUERY_EVENTS, []);
          return Array.isArray(v) ? v : [];
        }
      
        _readSelectionEvents() {
          const v = this._readJSON(this.KEYS.SELECTION_EVENTS, []);
          return Array.isArray(v) ? v : [];
        }
      
        _readAffinities() {
          const v = this._readJSON(this.KEYS.AFFINITIES, {});
          return (v && typeof v === 'object') ? v : {};
        }
      
        _readAliases() {
          const v = this._readJSON(this.KEYS.ALIASES, {});
          return (v && typeof v === 'object') ? v : {};
        }
      
        _readStubs() {
          const v = this._readJSON(this.KEYS.STUBS, {});
          return (v && typeof v === 'object') ? v : {};
        }
      
        _readEnabled() {
          const raw = this._readRaw(this.KEYS.ENABLED);
          if (raw === null) return true;
          return raw === 'true';
        }
      
        _evictOldEvents(events, max) {
          if (!Array.isArray(events) || events.length <= max) return events;
          const sorted = events.slice().sort((a, b) => {
            const ta = Date.parse((a && a.timestamp) || '');
            const tb = Date.parse((b && b.timestamp) || '');
            return ta - tb;
          });
          return sorted.slice(sorted.length - max);
        }
      
        // ====== LearningStore 接口实现 ======
      
        async recordQueryEvent(event) {
          if (!this._readEnabled()) return;
          if (!event) return;
          const events = this._readQueryEvents();
          events.push(Object.assign({}, event));
          const capped = this._evictOldEvents(events, this._maxEventsKept);
          this._writeJSON(this.KEYS.QUERY_EVENTS, capped);
        }
      
        async recordSelectionEvent(event) {
          if (!this._readEnabled()) return;
          if (!event) return;
          const events = this._readSelectionEvents();
          events.push(Object.assign({}, event));
          const capped = this._evictOldEvents(events, this._maxEventsKept);
          this._writeJSON(this.KEYS.SELECTION_EVENTS, capped);
        }
      
        async queryEvents(from, to, limit) {
          const fromMs = from ? Date.parse(from) : -Infinity;
          const toMs = to ? Date.parse(to) : Infinity;
          const cap = (typeof limit === 'number' && limit > 0) ? limit : 100;
          const all = this._readQueryEvents().concat(this._readSelectionEvents());
          all.sort((a, b) => {
            const ta = Date.parse((a && a.timestamp) || '');
            const tb = Date.parse((b && b.timestamp) || '');
            return ta - tb;
          });
          return all
            .filter(e => {
              const t = Date.parse((e && e.timestamp) || '');
              return t >= fromMs && t <= toMs;
            })
            .slice(0, cap);
        }
      
        async getAffinity(normalizedQuery, packageName) {
          const all = this._readAffinities();
          const key = `${normalizedQuery}::${packageName}`;
          const v = all[key];
          return v ? JSON.parse(JSON.stringify(v)) : null;
        }
      
        async getAllAffinities(normalizedQuery) {
          const all = this._readAffinities();
          const result = [];
          const filterByQuery = normalizedQuery !== undefined && normalizedQuery !== null && normalizedQuery !== '';
          for (const k in all) {
            if (Object.prototype.hasOwnProperty.call(all, k)) {
              const aff = all[k];
              if (!aff) continue;
              if (!filterByQuery || aff.normalizedQuery === normalizedQuery) {
                result.push(JSON.parse(JSON.stringify(aff)));
              }
            }
          }
          return result.sort((a, b) => (b.currentWeight || 0) - (a.currentWeight || 0));
        }
      
        async getAllAffinitiesForApp(packageName) {
          const all = this._readAffinities();
          const result = [];
          for (const k in all) {
            if (Object.prototype.hasOwnProperty.call(all, k)) {
              const aff = all[k];
              if (aff && aff.packageName === packageName) {
                result.push(JSON.parse(JSON.stringify(aff)));
              }
            }
          }
          return result;
        }
      
        async upsertAffinity(affinity) {
          if (!affinity || !affinity.normalizedQuery || !affinity.packageName) {
            throw new Error('upsertAffinity: invalid affinity');
          }
          const all = this._readAffinities();
          const key = `${affinity.normalizedQuery}::${affinity.packageName}`;
          all[key] = JSON.parse(JSON.stringify(affinity));
          this._writeJSON(this.KEYS.AFFINITIES, all);
        }
      
        async getPersonalAlias(alias) {
          const all = this._readAliases();
          const v = all[alias];
          return v ? JSON.parse(JSON.stringify(v)) : null;
        }
      
        async getAllPersonalAliases(status) {
          const all = this._readAliases();
          const result = [];
          for (const k in all) {
            if (Object.prototype.hasOwnProperty.call(all, k)) {
              const a = all[k];
              if (!status || (a && a.status === status)) {
                result.push(JSON.parse(JSON.stringify(a)));
              }
            }
          }
          return result;
        }
      
        async upsertPersonalAlias(alias) {
          if (!alias || !alias.alias) throw new Error('upsertPersonalAlias: invalid alias');
          const all = this._readAliases();
          all[alias.alias] = JSON.parse(JSON.stringify(alias));
          this._writeJSON(this.KEYS.ALIASES, all);
        }
      
        async getLocalAppStub(packageName) {
          const all = this._readStubs();
          const v = all[packageName];
          return v ? JSON.parse(JSON.stringify(v)) : null;
        }
      
        async upsertLocalAppStub(stub) {
          if (!stub || !stub.packageName) throw new Error('upsertLocalAppStub: invalid stub');
          const all = this._readStubs();
          all[stub.packageName] = JSON.parse(JSON.stringify(stub));
          this._writeJSON(this.KEYS.STUBS, all);
        }
      
        /**
         * 返回所有 LocalAppStub（扩展方法）。
         */
        async getAllLocalAppStubs() {
          const all = this._readStubs();
          const result = [];
          for (const k in all) {
            if (Object.prototype.hasOwnProperty.call(all, k)) {
              result.push(JSON.parse(JSON.stringify(all[k])));
            }
          }
          return result;
        }
      
        async getProfile(profileId) {
          const pid = profileId || this._profileId;
          const v = this._readJSON(this._profileKey(pid), null);
          return v ? JSON.parse(JSON.stringify(v)) : null;
        }
      
        _profileKey(pid) {
          return `${KEY_PREFIX}:${pid || this._profileId}:profile`;
        }
      
        async listProfiles() {
          const result = [];
          const prefix = `${KEY_PREFIX}:`;
          let len = 0;
          try {
            len = this._storage.length;
          } catch (e) {
            len = 0;
          }
          const seen = new Set();
          for (let i = 0; i < len; i++) {
            let k = null;
            try {
              k = this._storage.key(i);
            } catch (e) { k = null; }
            if (k && k.indexOf(prefix) === 0) {
              // 提取 profileId
              const parts = k.split(':');
              if (parts.length >= 3) {
                const pid = parts[2];
                if (!seen.has(pid)) {
                  seen.add(pid);
                  const v = this._readJSON(this._profileKey(pid), null);
                  if (v) {
                    result.push(v);
                  } else {
                    result.push({ profileId: pid });
                  }
                }
              }
            }
          }
          return result;
        }
      
        async exportProfile(profileId) {
          const pid = profileId || this._profileId;
          return {
            profileId: pid,
            exportedAt: new Date().toISOString(),
            config: this._readJSON(this.KEYS.CONFIG, this._config),
            queryEvents: this._readQueryEvents(),
            selectionEvents: this._readSelectionEvents(),
            affinities: Object.values(this._readAffinities()).map(a => JSON.parse(JSON.stringify(a))),
            aliases: Object.values(this._readAliases()).map(a => JSON.parse(JSON.stringify(a))),
            stubs: Object.values(this._readStubs()).map(s => JSON.parse(JSON.stringify(s)))
          };
        }
      
        async importProfile(data, profileId) {
          const pid = profileId || (data && data.profileId) || this._profileId;
          if (!data) throw new Error('importProfile: data is null');
          if (Array.isArray(data.queryEvents)) {
            this._writeJSON(this.KEYS.QUERY_EVENTS, data.queryEvents.slice());
          }
          if (Array.isArray(data.selectionEvents)) {
            this._writeJSON(this.KEYS.SELECTION_EVENTS, data.selectionEvents.slice());
          }
          if (Array.isArray(data.affinities)) {
            const map = {};
            for (const a of data.affinities) {
              if (a && a.normalizedQuery && a.packageName) {
                map[`${a.normalizedQuery}::${a.packageName}`] = a;
              }
            }
            this._writeJSON(this.KEYS.AFFINITIES, map);
          }
          if (Array.isArray(data.aliases)) {
            const map = {};
            for (const a of data.aliases) {
              if (a && a.alias) map[a.alias] = a;
            }
            this._writeJSON(this.KEYS.ALIASES, map);
          }
          if (Array.isArray(data.stubs)) {
            const map = {};
            for (const s of data.stubs) {
              if (s && s.packageName) map[s.packageName] = s;
            }
            this._writeJSON(this.KEYS.STUBS, map);
          }
          if (data.config && typeof data.config === 'object') {
            this._writeJSON(this.KEYS.CONFIG, Object.assign({}, this._config, data.config));
          }
          this._writeJSON(this._profileKey(pid), { profileId: pid, updatedAt: new Date().toISOString() });
        }
      
        async resetProfile(profileId) {
          const pid = profileId || this._profileId;
          this._writeJSON(this.KEYS.QUERY_EVENTS, []);
          this._writeJSON(this.KEYS.SELECTION_EVENTS, []);
          this._writeJSON(this.KEYS.AFFINITIES, {});
          this._writeJSON(this.KEYS.ALIASES, {});
          this._writeJSON(this.KEYS.STUBS, {});
          this._writeJSON(this._profileKey(pid), { profileId: pid, updatedAt: new Date().toISOString(), reset: true });
        }
      
        async compact() {
          const maxKept = this._maxEventsKept;
          const queryEvents = this._readQueryEvents();
          const selectionEvents = this._readSelectionEvents();
          const total = queryEvents.length + selectionEvents.length;
          if (total <= maxKept) {
            return { compactedEvents: 0, remainingEvents: total };
          }
          const all = queryEvents.concat(selectionEvents);
          all.sort((a, b) => {
            const ta = Date.parse((a && a.timestamp) || '');
            const tb = Date.parse((b && b.timestamp) || '');
            return ta - tb;
          });
          const remaining = all.slice(all.length - maxKept);
          const newQuery = remaining.filter(e => !isSelectionEvent(e));
          const newSel = remaining.filter(e => isSelectionEvent(e));
          this._writeJSON(this.KEYS.QUERY_EVENTS, newQuery);
          this._writeJSON(this.KEYS.SELECTION_EVENTS, newSel);
          return { compactedEvents: total - remaining.length, remainingEvents: remaining.length };
        }
      
        async isLearningEnabled() {
          return this._readEnabled();
        }
      
        async setLearningEnabled(enabled) {
          this._writeRaw(this.KEYS.ENABLED, enabled ? 'true' : 'false');
        }
      
        async stats() {
          const affinities = this._readAffinities();
          const aliases = this._readAliases();
          const stubs = this._readStubs();
          let storageBytes = 0;
          try {
            const keys = [this.KEYS.QUERY_EVENTS, this.KEYS.SELECTION_EVENTS, this.KEYS.AFFINITIES,
              this.KEYS.ALIASES, this.KEYS.STUBS, this.KEYS.CONFIG, this.KEYS.ENABLED];
            for (const k of keys) {
              const v = this._readRaw(k);
              if (v) storageBytes += v.length;
            }
          } catch (e) { /* ignore */ }
          return {
            queryEvents: this._readQueryEvents().length,
            selectionEvents: this._readSelectionEvents().length,
            affinities: Object.keys(affinities).length,
            aliases: Object.keys(aliases).length,
            stubs: Object.keys(stubs).length,
            learningEnabled: this._readEnabled(),
            initialized: this._initialized,
            storageBytes
          };
        }
      }
      
      module.exports = { LocalStorageLearningStore, KEY_PREFIX };
      
    },
    'runtime/javascript/src/indexeddb-store.js': function (module, exports, require, __dirname, __filename) {
      'use strict';
      
      /**
       * GOTO Base Personal Learning — IndexedDBLearningStore
       *
       * 使用 IndexedDB 作为异步持久化后端的 LearningStore 实现（浏览器环境）。
       *
       * Object stores（DB version 1）：
       *   - queryEvents       keyPath: 'eventId'
       *   - selectionEvents   keyPath: 'eventId'
       *   - affinities        keyPath: ['normalizedQuery', 'packageName']
       *   - aliases           keyPath: ['alias', 'packageName']
       *   - localAppStubs     keyPath: 'packageName'
       *   - profiles          keyPath: 'profileId'
       *   - meta              keyPath: 'key'
       *
       * 关键设计：
       *   - profileId 隔离：每个 profile 使用独立数据库 `goto-learning-{profileId}`
       *   - 原子写入：每个操作在 IndexedDB 事务内完成
       *   - 数据损坏恢复：所有操作 try/catch，失败时返回空结果
       *   - 压缩：删除超过 maxEventsKept 的旧事件；清理过期别名
       *   - 环境检测：Node.js 无 IndexedDB 时标记 unavailable，降级为 no-op
       *   - destroy() 方法清空数据库
       */
      
      const { LearningStore, InMemoryLearningStore } = require('runtime/shared/learning-store.js');
      const { AliasStatus } = require('runtime/shared/learning-types.js');
      
      const DB_NAME_PREFIX = 'goto-learning';
      const DB_VERSION = 1;
      
      // [storeName, keyPath, indexes]
      const STORE_DEFS = [
        ['queryEvents', 'eventId', [['timestamp', 'timestamp']]],
        ['selectionEvents', 'eventId', [['timestamp', 'timestamp'], ['normalizedQuery', 'normalizedQuery']]],
        ['affinities', ['normalizedQuery', 'packageName'], [['normalizedQuery', 'normalizedQuery'], ['packageName', 'packageName']]],
        ['aliases', ['alias', 'packageName'], [['alias', 'alias'], ['packageName', 'packageName']]],
        ['localAppStubs', 'packageName', []],
        ['profiles', 'profileId', []],
        ['meta', 'key', []]
      ];
      
      function isSelectionEvent(e) {
        return e && typeof e.selectedPackageName === 'string' && e.selectedPackageName.length > 0;
      }
      
      class IndexedDBLearningStore extends LearningStore {
        /**
         * @param {object} [config] 学习配置
         * @param {object} [indexedDBImpl] 显式注入的 indexedDB 实现（测试用）
         * @param {string} [profileId] Profile ID（默认 'default'，影响数据库名）
         */
        constructor(config, indexedDBImpl, profileId) {
          super();
          this._config = config || {};
          this._maxEventsKept = (typeof this._config.maxEventsKept === 'number' && this._config.maxEventsKept > 0)
            ? this._config.maxEventsKept : 10000;
          this._aliasExpiresDays = (typeof this._config.aliasExpiresDays === 'number' && this._config.aliasExpiresDays > 0)
            ? this._config.aliasExpiresDays : 90;
          this._profileId = profileId || 'default';
          this._indexedDB = indexedDBImpl || null;
          if (!this._indexedDB) {
            try {
              if (typeof indexedDB !== 'undefined') {
                this._indexedDB = indexedDB;
              }
            } catch (e) { /* sandbox */ }
          }
          this._dbName = `${DB_NAME_PREFIX}-${this._profileId}`;
          this._db = null;
          this._fallback = null;
          this._initialized = false;
          this._learningEnabled = true;
          this._available = false;
        }
      
        /**
         * 是否使用了真实的 IndexedDB（未降级）。
         */
        isAvailable() {
          return this._available && !this._fallback;
        }
      
        /**
         * 是否降级到 InMemory（旧版 API 兼容，等价于 !isAvailable()）。
         */
        isFallback() {
          return !this.isAvailable();
        }
      
        async init() {
          if (this._initialized) return;
          if (!this._indexedDB) {
            // 无 IndexedDB：降级到 InMemory
            this._fallback = new InMemoryLearningStore(this._config);
            await this._fallback.init();
            this._initialized = true;
            this._available = false;
            return;
          }
          try {
            this._db = await this._openDB();
            try {
              const enabled = await this._metaGet('enabled');
              if (enabled === null || enabled === undefined) {
                await this._metaSet('enabled', true);
                this._learningEnabled = true;
              } else {
                this._learningEnabled = !!enabled;
              }
            } catch (e) {
              this._learningEnabled = true;
            }
            this._available = true;
          } catch (e) {
            // 打开失败：降级到 InMemory
            this._fallback = new InMemoryLearningStore(this._config);
            await this._fallback.init();
            this._available = false;
          }
          this._initialized = true;
        }
      
        async close() {
          if (this._db) {
            try { this._db.close(); } catch (e) {}
            this._db = null;
          }
          if (this._fallback) {
            await this._fallback.close();
          }
          this._initialized = false;
        }
      
        /**
         * 清空数据库（destroy）。
         */
        async destroy() {
          if (this._fallback) {
            // 降级模式：重置 fallback
            await this._fallback.resetProfile(this._profileId);
            return;
          }
          if (this._db) {
            try { this._db.close(); } catch (e) {}
            this._db = null;
          }
          if (this._indexedDB) {
            await new Promise((resolve) => {
              try {
                const req = this._indexedDB.deleteDatabase(this._dbName);
                req.onsuccess = () => resolve();
                req.onerror = () => resolve();
                req.onblocked = () => resolve();
              } catch (e) {
                resolve();
              }
            });
          }
          this._available = false;
          this._initialized = false;
        }
      
        // ====== DB 打开与版本迁移 ======
      
        _openDB() {
          return new Promise((resolve, reject) => {
            let req;
            try {
              req = this._indexedDB.open(this._dbName, DB_VERSION);
            } catch (e) {
              reject(e);
              return;
            }
            req.onupgradeneeded = (event) => {
              const db = event.target.result;
              for (const [name, keyPath, indexes] of STORE_DEFS) {
                if (!db.objectStoreNames.contains(name)) {
                  const store = db.createObjectStore(name, { keyPath: keyPath });
                  for (const [idxName, idxKeyPath] of indexes) {
                    try { store.createIndex(idxName, idxKeyPath, { unique: false }); } catch (_) {}
                  }
                }
              }
            };
            req.onsuccess = (event) => resolve(event.target.result);
            req.onerror = (event) => reject(event.target.error || new Error('IndexedDB open failed'));
            req.onblocked = () => reject(new Error('IndexedDB open blocked'));
          });
        }
      
        // ====== 事务辅助 ======
      
        _runInTx(storeNames, mode, fn) {
          return new Promise((resolve, reject) => {
            if (!this._db) {
              reject(new Error('DB not open'));
              return;
            }
            let tx;
            try {
              tx = this._db.transaction(storeNames, mode || 'readonly');
            } catch (e) {
              reject(e);
              return;
            }
            let result;
            let settled = false;
      
            const finish = (err) => {
              if (settled) return;
              settled = true;
              if (err) reject(err);
              else resolve(result);
            };
      
            tx.oncomplete = () => finish(null);
            tx.onerror = () => finish(tx.error || new Error('tx error'));
            tx.onabort = () => finish(tx.error || new Error('tx aborted'));
      
            try {
              const ret = fn(tx);
              if (ret && typeof ret.then === 'function') {
                ret.then(v => { result = v; }, e => {
                  try { tx.abort(); } catch (_) {}
                  finish(e);
                });
              } else {
                result = ret;
              }
            } catch (e) {
              try { tx.abort(); } catch (_) {}
              finish(e);
            }
          });
        }
      
        _reqToPromise(req) {
          return new Promise((resolve, reject) => {
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
          });
        }
      
        // ====== meta 存取 ======
      
        async _metaGet(key) {
          if (!this._db) return null;
          try {
            return await this._runInTx(['meta'], 'readonly', (tx) => {
              const req = tx.objectStore('meta').get(key);
              return this._reqToPromise(req).then(v => (v ? v.value : null));
            });
          } catch (e) {
            return null;
          }
        }
      
        async _metaSet(key, value) {
          if (!this._db) return;
          try {
            await this._runInTx(['meta'], 'readwrite', (tx) => {
              tx.objectStore('meta').put({ key, value });
            });
          } catch (e) {
            // 静默
          }
        }
      
        // ====== 事件记录 ======
      
        async recordQueryEvent(event) {
          if (this._fallback) return this._fallback.recordQueryEvent(event);
          if (!this._learningEnabled || !event) return;
          try {
            await this._runInTx(['queryEvents'], 'readwrite', (tx) => {
              tx.objectStore('queryEvents').put(Object.assign({}, event));
            });
            await this._maybeEvict('queryEvents');
          } catch (e) { /* 静默 */ }
        }
      
        async recordSelectionEvent(event) {
          if (this._fallback) return this._fallback.recordSelectionEvent(event);
          if (!this._learningEnabled || !event) return;
          try {
            await this._runInTx(['selectionEvents'], 'readwrite', (tx) => {
              tx.objectStore('selectionEvents').put(Object.assign({}, event));
            });
            await this._maybeEvict('selectionEvents');
          } catch (e) { /* 静默 */ }
        }
      
        async _maybeEvict(storeName) {
          try {
            const count = await this._runInTx([storeName], 'readonly', (tx) => {
              return this._reqToPromise(tx.objectStore(storeName).count());
            });
            if (count > this._maxEventsKept) {
              const all = await this._runInTx([storeName], 'readonly', (tx) => {
                return this._reqToPromise(tx.objectStore(storeName).getAll());
              });
              const sorted = (all || []).slice().sort((a, b) => {
                const ta = Date.parse((a && a.timestamp) || '');
                const tb = Date.parse((b && b.timestamp) || '');
                return ta - tb;
              });
              const toRemove = sorted.slice(0, sorted.length - this._maxEventsKept);
              const keyPath = this._keyPathFor(storeName);
              await this._runInTx([storeName], 'readwrite', (tx) => {
                for (const e of toRemove) {
                  if (Array.isArray(keyPath)) {
                    const key = keyPath.map(k => e[k]);
                    tx.objectStore(storeName).delete(key);
                  } else if (e[keyPath] !== undefined) {
                    tx.objectStore(storeName).delete(e[keyPath]);
                  }
                }
              });
            }
          } catch (e) {
            // 静默
          }
        }
      
        async queryEvents(from, to, limit) {
          if (this._fallback) return this._fallback.queryEvents(from, to, limit);
          try {
            const fromMs = from ? Date.parse(from) : -Infinity;
            const toMs = to ? Date.parse(to) : Infinity;
            const cap = (typeof limit === 'number' && limit > 0) ? limit : 100;
      
            const [queryEvents, selectionEvents] = await Promise.all([
              this._runInTx(['queryEvents'], 'readonly', (tx) =>
                this._reqToPromise(tx.objectStore('queryEvents').getAll())),
              this._runInTx(['selectionEvents'], 'readonly', (tx) =>
                this._reqToPromise(tx.objectStore('selectionEvents').getAll()))
            ]);
      
            const all = (queryEvents || []).concat(selectionEvents || []);
            all.sort((a, b) => {
              const ta = Date.parse((a && a.timestamp) || '');
              const tb = Date.parse((b && b.timestamp) || '');
              return ta - tb;
            });
            return all
              .filter(e => {
                const t = Date.parse((e && e.timestamp) || '');
                return t >= fromMs && t <= toMs;
              })
              .slice(0, cap);
          } catch (e) {
            return [];
          }
        }
      
        // ====== Affinity ======
      
        async getAffinity(normalizedQuery, packageName) {
          if (this._fallback) return this._fallback.getAffinity(normalizedQuery, packageName);
          try {
            const key = [normalizedQuery, packageName];
            const v = await this._runInTx(['affinities'], 'readonly', (tx) => {
              return this._reqToPromise(tx.objectStore('affinities').get(key));
            });
            return v || null;
          } catch (e) {
            return null;
          }
        }
      
        async getAllAffinities(normalizedQuery) {
          const filterByQuery = normalizedQuery !== undefined && normalizedQuery !== null && normalizedQuery !== '';
          // 降级到 InMemory 时：shared/InMemoryLearningStore.getAllAffinities() 无参数会返回空，
          // 这里手动遍历 _affinitiesByQuery 以保证与 stats().affinities 计数一致。
          if (this._fallback) {
            if (!filterByQuery && this._fallback._affinitiesByQuery) {
              const all = [];
              for (const m of this._fallback._affinitiesByQuery.values()) {
                for (const aff of m.values()) all.push(aff);
              }
              return all
                .map(a => JSON.parse(JSON.stringify(a)))
                .sort((a, b) => (b.currentWeight || 0) - (a.currentWeight || 0));
            }
            return this._fallback.getAllAffinities(normalizedQuery);
          }
          // 无参数：返回所有 affinity（与 stats().affinities 计数一致）
          if (!filterByQuery) {
            try {
              const all = await this._runInTx(['affinities'], 'readonly', (tx) => {
                return this._reqToPromise(tx.objectStore('affinities').getAll());
              });
              return (all || [])
                .map(a => {
                  const c = Object.assign({}, a);
                  delete c.__key;
                  return c;
                })
                .sort((a, b) => (b.currentWeight || 0) - (a.currentWeight || 0));
            } catch (e) {
              return [];
            }
          }
          try {
            const idx = this._db.transaction('affinities', 'readonly').objectStore('affinities').index('normalizedQuery');
            const all = await new Promise((resolve, reject) => {
              const req = idx.getAll(normalizedQuery);
              req.onsuccess = () => resolve(req.result);
              req.onerror = () => reject(req.error);
            });
            return (all || []).slice().sort((a, b) => (b.currentWeight || 0) - (a.currentWeight || 0));
          } catch (e) {
            // 降级：全量扫描
            try {
              const all = await this._runInTx(['affinities'], 'readonly', (tx) => {
                return this._reqToPromise(tx.objectStore('affinities').getAll());
              });
              return (all || [])
                .filter(a => a && a.normalizedQuery === normalizedQuery)
                .sort((a, b) => (b.currentWeight || 0) - (a.currentWeight || 0));
            } catch (e2) {
              return [];
            }
          }
        }
      
        async getAllAffinitiesForApp(packageName) {
          if (this._fallback) return this._fallback.getAllAffinitiesForApp(packageName);
          try {
            const all = await this._runInTx(['affinities'], 'readonly', (tx) => {
              return this._reqToPromise(tx.objectStore('affinities').getAll());
            });
            return (all || []).filter(a => a && a.packageName === packageName);
          } catch (e) {
            return [];
          }
        }
      
        async upsertAffinity(affinity) {
          if (this._fallback) return this._fallback.upsertAffinity(affinity);
          if (!affinity || !affinity.normalizedQuery || !affinity.packageName) {
            throw new Error('upsertAffinity: invalid affinity');
          }
          try {
            await this._runInTx(['affinities'], 'readwrite', (tx) => {
              tx.objectStore('affinities').put(JSON.parse(JSON.stringify(affinity)));
            });
          } catch (e) { /* 静默 */ }
        }
      
        // ====== PersonalAlias ======
      
        async getPersonalAlias(alias) {
          if (this._fallback) return this._fallback.getPersonalAlias(alias);
          try {
            // 使用 index 查找（alias 可能对应多个 packageName，取第一个 active 或第一个）
            const tx = this._db.transaction('aliases', 'readonly');
            const idx = tx.objectStore('aliases').index('alias');
            const all = await new Promise((resolve, reject) => {
              const req = idx.getAll(alias);
              req.onsuccess = () => resolve(req.result);
              req.onerror = () => reject(req.error);
            });
            if (!all || all.length === 0) return null;
            // 优先返回 active 的
            const active = all.find(a => a.status === AliasStatus.ACTIVE);
            return active || all[0];
          } catch (e) {
            return null;
          }
        }
      
        async getAllPersonalAliases(status) {
          if (this._fallback) return this._fallback.getAllPersonalAliases(status);
          try {
            const all = await this._runInTx(['aliases'], 'readonly', (tx) => {
              return this._reqToPromise(tx.objectStore('aliases').getAll());
            });
            const list = all || [];
            return status ? list.filter(a => a && a.status === status) : list;
          } catch (e) {
            return [];
          }
        }
      
        async upsertPersonalAlias(alias) {
          if (this._fallback) return this._fallback.upsertPersonalAlias(alias);
          if (!alias || !alias.alias) throw new Error('upsertPersonalAlias: invalid alias');
          try {
            await this._runInTx(['aliases'], 'readwrite', (tx) => {
              tx.objectStore('aliases').put(JSON.parse(JSON.stringify(alias)));
            });
          } catch (e) { /* 静默 */ }
        }
      
        // ====== LocalAppStub ======
      
        async getLocalAppStub(packageName) {
          if (this._fallback) return this._fallback.getLocalAppStub(packageName);
          try {
            const v = await this._runInTx(['localAppStubs'], 'readonly', (tx) => {
              return this._reqToPromise(tx.objectStore('localAppStubs').get(packageName));
            });
            return v || null;
          } catch (e) {
            return null;
          }
        }
      
        async upsertLocalAppStub(stub) {
          if (this._fallback) return this._fallback.upsertLocalAppStub(stub);
          if (!stub || !stub.packageName) throw new Error('upsertLocalAppStub: invalid stub');
          try {
            await this._runInTx(['localAppStubs'], 'readwrite', (tx) => {
              tx.objectStore('localAppStubs').put(JSON.parse(JSON.stringify(stub)));
            });
          } catch (e) { /* 静默 */ }
        }
      
        async getAllLocalAppStubs() {
          if (this._fallback) {
            // fallback 是 InMemoryLearningStore，访问内部 map
            return Array.from(this._fallback._stubsByPackage.values()).map(s => JSON.parse(JSON.stringify(s)));
          }
          try {
            const all = await this._runInTx(['localAppStubs'], 'readonly', (tx) => {
              return this._reqToPromise(tx.objectStore('localAppStubs').getAll());
            });
            return all || [];
          } catch (e) {
            return [];
          }
        }
      
        // ====== Profile ======
      
        async getProfile(profileId) {
          if (this._fallback) return this._fallback.getProfile(profileId);
          try {
            const pid = profileId || this._profileId;
            const v = await this._runInTx(['profiles'], 'readonly', (tx) => {
              return this._reqToPromise(tx.objectStore('profiles').get(pid));
            });
            return v || null;
          } catch (e) {
            return null;
          }
        }
      
        async listProfiles() {
          if (this._fallback) return this._fallback.listProfiles();
          try {
            const v = await this._runInTx(['profiles'], 'readonly', (tx) => {
              return this._reqToPromise(tx.objectStore('profiles').getAll());
            });
            return v || [];
          } catch (e) {
            return [];
          }
        }
      
        async exportProfile(profileId) {
          if (this._fallback) return this._fallback.exportProfile(profileId);
          const pid = profileId || this._profileId;
          try {
            const [queryEvents, selectionEvents, affinities, aliases, stubs] = await Promise.all([
              this._runInTx(['queryEvents'], 'readonly', (tx) =>
                this._reqToPromise(tx.objectStore('queryEvents').getAll())),
              this._runInTx(['selectionEvents'], 'readonly', (tx) =>
                this._reqToPromise(tx.objectStore('selectionEvents').getAll())),
              this._runInTx(['affinities'], 'readonly', (tx) =>
                this._reqToPromise(tx.objectStore('affinities').getAll())),
              this._runInTx(['aliases'], 'readonly', (tx) =>
                this._reqToPromise(tx.objectStore('aliases').getAll())),
              this._runInTx(['localAppStubs'], 'readonly', (tx) =>
                this._reqToPromise(tx.objectStore('localAppStubs').getAll()))
            ]);
            return {
              profileId: pid,
              exportedAt: new Date().toISOString(),
              config: this._config,
              queryEvents: queryEvents || [],
              selectionEvents: selectionEvents || [],
              affinities: affinities || [],
              aliases: aliases || [],
              stubs: stubs || []
            };
          } catch (e) {
            return {
              profileId: pid,
              exportedAt: new Date().toISOString(),
              config: this._config,
              queryEvents: [],
              selectionEvents: [],
              affinities: [],
              aliases: [],
              stubs: []
            };
          }
        }
      
        async importProfile(data, profileId) {
          if (this._fallback) return this._fallback.importProfile(data, profileId);
          const pid = profileId || (data && data.profileId) || this._profileId;
          if (!data) throw new Error('importProfile: data is null');
          try {
            await this._runInTx(
              ['queryEvents', 'selectionEvents', 'affinities', 'aliases', 'localAppStubs', 'profiles'],
              'readwrite',
              (tx) => {
                if (Array.isArray(data.queryEvents)) {
                  tx.objectStore('queryEvents').clear();
                  for (const e of data.queryEvents) {
                    if (e && e.eventId) tx.objectStore('queryEvents').put(Object.assign({}, e));
                  }
                }
                if (Array.isArray(data.selectionEvents)) {
                  tx.objectStore('selectionEvents').clear();
                  for (const e of data.selectionEvents) {
                    if (e && e.eventId) tx.objectStore('selectionEvents').put(Object.assign({}, e));
                  }
                }
                if (Array.isArray(data.affinities)) {
                  tx.objectStore('affinities').clear();
                  for (const a of data.affinities) {
                    if (a && a.normalizedQuery && a.packageName) {
                      tx.objectStore('affinities').put(JSON.parse(JSON.stringify(a)));
                    }
                  }
                }
                if (Array.isArray(data.aliases)) {
                  tx.objectStore('aliases').clear();
                  for (const a of data.aliases) {
                    if (a && a.alias && a.packageName) {
                      tx.objectStore('aliases').put(JSON.parse(JSON.stringify(a)));
                    }
                  }
                }
                if (Array.isArray(data.stubs)) {
                  tx.objectStore('localAppStubs').clear();
                  for (const s of data.stubs) {
                    if (s && s.packageName) tx.objectStore('localAppStubs').put(Object.assign({}, s));
                  }
                }
                tx.objectStore('profiles').put({ profileId: pid, updatedAt: new Date().toISOString() });
              }
            );
          } catch (e) {
            // 静默
          }
        }
      
        async resetProfile(profileId) {
          if (this._fallback) return this._fallback.resetProfile(profileId);
          const pid = profileId || this._profileId;
          try {
            await this._runInTx(
              ['queryEvents', 'selectionEvents', 'affinities', 'aliases', 'localAppStubs', 'profiles'],
              'readwrite',
              (tx) => {
                tx.objectStore('queryEvents').clear();
                tx.objectStore('selectionEvents').clear();
                tx.objectStore('affinities').clear();
                tx.objectStore('aliases').clear();
                tx.objectStore('localAppStubs').clear();
                tx.objectStore('profiles').put({ profileId: pid, updatedAt: new Date().toISOString(), reset: true });
              }
            );
          } catch (e) {
            // 静默
          }
        }
      
        async compact() {
          if (this._fallback) return this._fallback.compact();
          try {
            const maxKept = this._maxEventsKept;
            const [queryEvents, selectionEvents] = await Promise.all([
              this._runInTx(['queryEvents'], 'readonly', (tx) =>
                this._reqToPromise(tx.objectStore('queryEvents').getAll())),
              this._runInTx(['selectionEvents'], 'readonly', (tx) =>
                this._reqToPromise(tx.objectStore('selectionEvents').getAll()))
            ]);
            const total = (queryEvents || []).length + (selectionEvents || []).length;
            let compactedEvents = 0;
            if (total > maxKept) {
              const all = (queryEvents || []).concat(selectionEvents || []);
              all.sort((a, b) => {
                const ta = Date.parse((a && a.timestamp) || '');
                const tb = Date.parse((b && b.timestamp) || '');
                return ta - tb;
              });
              const remaining = all.slice(all.length - maxKept);
              const remainingQuery = remaining.filter(e => !isSelectionEvent(e));
              const remainingSel = remaining.filter(e => isSelectionEvent(e));
              await this._runInTx(['queryEvents', 'selectionEvents'], 'readwrite', (tx) => {
                tx.objectStore('queryEvents').clear();
                for (const e of remainingQuery) tx.objectStore('queryEvents').put(Object.assign({}, e));
                tx.objectStore('selectionEvents').clear();
                for (const e of remainingSel) tx.objectStore('selectionEvents').put(Object.assign({}, e));
              });
              compactedEvents = total - remaining.length;
            }
      
            // 清理过期别名
            const expiredRemoved = await this._cleanExpiredAliases();
      
            return { compactedEvents, remainingEvents: total - compactedEvents, expiredAliases: expiredRemoved };
          } catch (e) {
            return { compactedEvents: 0, remainingEvents: 0, expiredAliases: 0 };
          }
        }
      
        async _cleanExpiredAliases() {
          try {
            const all = await this._runInTx(['aliases'], 'readonly', (tx) => {
              return this._reqToPromise(tx.objectStore('aliases').getAll());
            });
            const now = Date.now();
            const toRemove = (all || []).filter(a => {
              if (a && typeof a.expiresAt === 'string' && a.expiresAt) {
                const exp = Date.parse(a.expiresAt);
                if (!isNaN(exp) && now > exp) return true;
              }
              return false;
            });
            if (toRemove.length > 0) {
              await this._runInTx(['aliases'], 'readwrite', (tx) => {
                for (const a of toRemove) {
                  tx.objectStore('aliases').delete([a.alias, a.packageName]);
                }
              });
            }
            return toRemove.length;
          } catch (e) {
            return 0;
          }
        }
      
        async isLearningEnabled() {
          if (this._fallback) return this._fallback.isLearningEnabled();
          return this._learningEnabled;
        }
      
        async setLearningEnabled(enabled) {
          if (this._fallback) return this._fallback.setLearningEnabled(enabled);
          this._learningEnabled = !!enabled;
          await this._metaSet('enabled', this._learningEnabled);
        }
      
        async stats() {
          if (this._fallback) return this._fallback.stats();
          try {
            const [queryCount, selCount, affCount, aliasCount, stubCount] = await Promise.all([
              this._runInTx(['queryEvents'], 'readonly', (tx) =>
                this._reqToPromise(tx.objectStore('queryEvents').count())),
              this._runInTx(['selectionEvents'], 'readonly', (tx) =>
                this._reqToPromise(tx.objectStore('selectionEvents').count())),
              this._runInTx(['affinities'], 'readonly', (tx) =>
                this._reqToPromise(tx.objectStore('affinities').count())),
              this._runInTx(['aliases'], 'readonly', (tx) =>
                this._reqToPromise(tx.objectStore('aliases').count())),
              this._runInTx(['localAppStubs'], 'readonly', (tx) =>
                this._reqToPromise(tx.objectStore('localAppStubs').count()))
            ]);
            return {
              queryEvents: queryCount || 0,
              selectionEvents: selCount || 0,
              affinities: affCount || 0,
              aliases: aliasCount || 0,
              stubs: stubCount || 0,
              learningEnabled: this._learningEnabled,
              initialized: this._initialized,
              available: this._available,
              storageBytes: -1 // IndexedDB 无法精确获取字节大小
            };
          } catch (e) {
            return {
              queryEvents: 0,
              selectionEvents: 0,
              affinities: 0,
              aliases: 0,
              stubs: 0,
              learningEnabled: this._learningEnabled,
              initialized: this._initialized,
              available: this._available
            };
          }
        }
      
        _keyPathFor(storeName) {
          for (const [name, keyPath] of STORE_DEFS) {
            if (name === storeName) return keyPath;
          }
          return null;
        }
      }
      
      module.exports = { IndexedDBLearningStore, DB_NAME_PREFIX, DB_VERSION, STORE_DEFS };
      
    }
  };

  // ====== 模块缓存 ======
  var __cache = {};

  // ====== require 函数 ======
  function __require(id) {
    // 内置模块 → shim
    if (__shims.hasOwnProperty(id)) {
      return __shims[id];
    }
    // 缓存命中
    if (__cache.hasOwnProperty(id)) {
      return __cache[id].exports;
    }
    // 模块不存在
    if (!__modules.hasOwnProperty(id)) {
      throw new Error('Cannot find module: ' + id);
    }
    var module = { exports: {} };
    __cache[id] = module;
    var __dirname = id.indexOf('/') >= 0 ? id.slice(0, id.lastIndexOf('/')) : '';
    var __filename = id;
    __modules[id].call(module.exports, module, module.exports, __require, __dirname, __filename);
    return module.exports;
  }

  // ====== 加载入口模块 ======
  var __entry = __require('integration/javascript/integration-bootstrap.js');

  // ====== 导出到 HOST window ======
  global.GOTOBaseIntegration = __entry;

})(typeof window !== "undefined" ? window : this);