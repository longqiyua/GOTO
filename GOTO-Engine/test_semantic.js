/*
 * GOTO Engine — 语义联想模块（Semantic Associations）单元测试
 * 运行: node test_semantic.js
 *
 * 测试范围：
 *   1. L1 同步扩展（直接命中 / 反向命中 / 包含关系）
 *   2. 开关关闭后返回空
 *   3. isReady 状态变迁
 *   4. init 异步加载（config + pinyin-index）
 *   5. L2 异步扩展（mock fetch）
 *   6. loadShard 内存 LRU 命中
 *   7. 统计信息 getStats
 *   8. clearCache 清缓存
 *   9. 降级路径（fetch 失败时仍返回 L1）
 */
'use strict';
const vm = require('vm');
const fs = require('fs');
const path = require('path');

let passed = 0, failed = 0;
function assert(cond, msg){
  if(cond){ passed++; }
  else { failed++; console.error('  FAIL: ' + msg); }
}
function assertEq(a, b, msg){
  assert(a === b, msg + ' (expected ' + JSON.stringify(b) + ', got ' + JSON.stringify(a) + ')');
}
function assertGt(a, b, msg){
  assert(a > b, msg + ' (expected ' + JSON.stringify(a) + ' > ' + JSON.stringify(b) + ')');
}

function buildSandbox(){
  const store = {};
  const localStorage = {
    getItem: k => (k in store ? store[k] : null),
    setItem: (k,v) => { store[k] = String(v); },
    removeItem: k => { delete store[k]; }
  };

  // mock fetch：根据 URL 返回不同数据
  const fetchCalls = [];
  function fetch(url){
    fetchCalls.push(url);
    return new Promise(function(resolve, reject){
      // pinyin-index
      if(url.indexOf('pinyin-index.json') >= 0){
        resolve({
          ok: true,
          json: () => Promise.resolve({ '_meta':'test', '安':'a', '聊':'l', '导':'d', '微':'w' })
        });
        return;
      }
      // semantic-config
      if(url.indexOf('semantic-config.json') >= 0){
        resolve({
          ok: true,
          json: () => Promise.resolve({
            version: '1.0.0',
            synonyms: { count: 2, shards: { a:{file:'shard-a.json',count:1}, l:{file:'shard-l.json',count:1} } },
            vectors: { available: false },
            pinyinIndex: 'pinyin-index.json'
          })
        });
        return;
      }
      // shard-a (安静)
      if(url.indexOf('shard-a.json') >= 0){
        resolve({
          ok: true,
          json: () => Promise.resolve({ words: { '安静': ['宁静','寂静','静谧','清静'] } })
        });
        return;
      }
      // shard-l (聊天)
      if(url.indexOf('shard-l.json') >= 0){
        resolve({
          ok: true,
          json: () => Promise.resolve({ words: { '聊天': ['聊聊','沟通','对话'] } })
        });
        return;
      }
      // 其他 404
      resolve({ ok: false, json: () => Promise.resolve(null) });
    });
  }

  const sandbox = {
    localStorage,
    fetch,
    console,
    Date,
    Math,
    JSON,
    Set,
    Map,
    Object,
    Array,
    Promise,
    indexedDB: null  // 测试降级路径
  };
  sandbox.window = sandbox;
  sandbox.global = sandbox;
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  return { sandbox, getStore: () => store, getFetchCalls: () => fetchCalls };
}

function loadSemantic(sandbox){
  const code = fs.readFileSync(path.join(__dirname, 'semantic', 'semantic-loader.js'), 'utf8');
  vm.runInContext(code, sandbox);
  return sandbox.GOTOSemantic;
}

async function runTests(){
  console.log('=== GOTO 语义联想模块单元测试 ===\n');

  const { sandbox, getStore, getFetchCalls } = buildSandbox();
  const sem = loadSemantic(sandbox);

  // —— 测试 1: 模块挂载 ——
  console.log('[1] 模块挂载');
  assert(!!sem, 'GOTOSemantic 应被挂载');
  assertEq(typeof sem.expand, 'function', 'expand 应是函数');
  assertEq(typeof sem._expandSync, 'function', '_expandSync 应是函数');
  assertEq(typeof sem._expandAsync, 'function', '_expandAsync 应是函数');
  assertEq(typeof sem.loadShard, 'function', 'loadShard 应是函数');
  assertEq(typeof sem.getStats, 'function', 'getStats 应是函数');
  assertEq(typeof sem.clearCache, 'function', 'clearCache 应是函数');
  assertEq(typeof sem.init, 'function', 'init 应是函数');

  // —— 测试 2: L1 同步扩展 ——
  console.log('\n[2] L1 同步扩展');
  sem.setEnabled(true);
  assertEq(sem.isEnabled(), true, 'setEnabled(true) 后 isEnabled() 应为 true');

  // 直接命中：安静
  const l1a = sem._expandSync('安静', 10);
  assert(Array.isArray(l1a), 'L1 应返回数组');
  assertGt(l1a.length, 0, 'L1 安静 应有结果');
  console.log('  安静 →', l1a.map(r => r.term).join(','));
  assert(l1a.some(r => r.term === '宁静'), '应包含 "宁静"');
  assert(l1a.some(r => r.term === '寂静'), '应包含 "寂静"');
  assert(l1a.every(r => r.source === 'L1'), '所有结果 source 应为 L1');

  // 直接命中：发
  const l1b = sem._expandSync('发', 10);
  assertGt(l1b.length, 0, 'L1 发 应有结果');
  console.log('  发 →', l1b.map(r => r.term).join(','));
  assert(l1b.some(r => r.term === '写'), '应包含 "写"');

  // 反向命中：宁静（在 安静 的同义词列表中）
  const l1c = sem._expandSync('宁静', 10);
  assertGt(l1c.length, 0, 'L1 宁静 反向命中应有结果');
  console.log('  宁静 →', l1c.map(r => r.term).join(','));
  assert(l1c.some(r => r.term === '安静'), '反向应包含 "安静"');

  // —— 测试 3: 开关关闭后返回空 ——
  console.log('\n[3] 开关关闭');
  sem.setEnabled(false);
  assertEq(sem.isEnabled(), false, 'setEnabled(false) 后 isEnabled() 应为 false');
  const l1Off = sem._expandSync('安静', 10);
  assertEq(l1Off.length, 0, '关闭后应返回空数组');
  sem.setEnabled(true);

  // —— 测试 4: isReady 初始 false ——
  console.log('\n[4] isReady 状态变迁');
  assertEq(sem.isReady(), false, 'init 前应未就绪（ready=false）');

  // —— 测试 5: init 异步加载 ——
  console.log('\n[5] init 异步加载');
  await sem.init();
  assertEq(sem._state.ready, true, 'init 后 state.ready 应为 true');
  assertEq(sem.isAvailable(), true, 'init 后 available 应为 true（config 已加载）');
  assertEq(sem.isReady(), true, 'init 后 isReady() 应为 true（ready && enabled）');

  // —— 测试 6: L2 异步扩展 ——
  console.log('\n[6] L2 异步扩展');
  const l2a = await sem._expandAsync('安静', 10);
  assert(Array.isArray(l2a), 'L2 应返回数组');
  assertGt(l2a.length, 0, 'L2 安静 应有结果');
  console.log('  安静 →', l2a.map(r => r.term + '(' + r.source + ')').join(','));
  assert(l2a.some(r => r.term === '宁静' && r.source === 'L2'), 'L2 应包含 "宁静" (source=L2)');

  // —— 测试 7: loadShard 内存 LRU 命中 ——
  console.log('\n[7] loadShard 内存 LRU 命中');
  const callsBefore = getFetchCalls().length;
  await sem.loadShard('shard-a');
  const callsAfter = getFetchCalls().length;
  assertEq(callsAfter, callsBefore, '第二次 loadShard 应命中内存 cache，零 fetch');
  assertGt(sem._state.stats.cacheHits, 0, 'cacheHits 应 > 0');

  // —— 测试 8: 降级路径（fetch 404 的分片）——
  console.log('\n[8] 降级路径');
  const l2miss = await sem._expandAsync('xyz123', 10);
  // 应返回 L1（即使 L2 miss），但不抛错
  assert(Array.isArray(l2miss), '降级应返回数组（不抛错）');

  // —— 测试 9: 统计信息 ——
  console.log('\n[9] getStats 统计');
  const stats = sem.getStats();
  assert(typeof stats === 'object', 'stats 应是对象');
  assertEq(stats.ready, true, 'stats.ready 应为 true');
  assertEq(stats.available, true, 'stats.available 应为 true');
  assertEq(stats.enabled, true, 'stats.enabled 应为 true');
  assertGt(stats.l1Count, 100, 'L1 词条数应 > 100');
  assertGt(stats.l1Hits, 0, 'l1Hits 应 > 0');
  assertGt(stats.l2Hits, 0, 'l2Hits 应 > 0');
  assertGt(stats.cacheHits, 0, 'cacheHits 应 > 0');
  console.log('  Stats:', JSON.stringify({
    l1Count: stats.l1Count,
    l1Hits: stats.l1Hits,
    l2Hits: stats.l2Hits,
    l2Misses: stats.l2Misses,
    cacheHits: stats.cacheHits,
    cacheMisses: stats.cacheMisses,
    cachedShards: stats.cachedShards
  }));

  // —— 测试 10: clearCache ——
  console.log('\n[10] clearCache');
  await sem.clearCache();
  const stats2 = sem.getStats();
  assertEq(stats2.cachedShards, 0, '清缓存后 cachedShards 应为 0');

  // —— 测试 11: L1 在禁用状态下也能用（isReady 返回 false 但 _expandSync 仍可调）——
  console.log('\n[11] 禁用状态行为');
  sem.setEnabled(false);
  const l1disabled = sem._expandSync('安静', 10);
  assertEq(l1disabled.length, 0, '禁用时 _expandSync 应返回空');
  assertEq(sem.isReady(), false, '禁用时 isReady 应为 false');
  sem.setEnabled(true);

  // —— 测试 12: v3.2 mini 模型（L3 本地小模型）——
  console.log('\n[12] v3.2 mini 模型 — _buildMiniEmbeddings');
  const emb = sem._buildMiniEmbeddings();
  assert(emb && emb.vocabSize > 0, 'mini 模型应成功构建且 vocab 非空');
  assertGt(emb.docs.length, 100, 'mini 模型 docs 数应 > 100');
  assertGt(emb.vocabSize, 500, 'mini 模型 vocab 应 > 500');

  // —— 测试 13: findSimilar — L1 语义等价类（强语义）——
  console.log('\n[13] findSimilar — L1 语义等价类');
  const sim1 = await sem.findSimilar('聊天', 5);
  assertGt(sim1.length, 0, '"聊天" 相似词应非空');
  const sim1Terms = sim1.map(r => r.term);
  assert(sim1Terms.indexOf('沟通') >= 0, '"聊天" 应召回 "沟通"');
  assert(sim1Terms.indexOf('对话') >= 0, '"聊天" 应召回 "对话"');
  const sim1L1Hits = sim1.filter(r => r.source === 'L3-mini-L1').length;
  assertGt(sim1L1Hits, 0, '"聊天" 应有 L1 强语义命中');

  // —— 测试 14: findSimilar — 形态相似（n-gram）——
  console.log('\n[14] findSimilar — 形态相似');
  const sim2 = await sem.findSimilar('打开', 8);
  const sim2Terms = sim2.map(r => r.term);
  // "打开" 是 L1 key，应召回 L1 同义词（启动/开启/open/launch）
  assert(sim2Terms.indexOf('启动') >= 0, '"打开" 应召回 "启动"');
  assert(sim2Terms.indexOf('open') >= 0, '"打开" 应召回 "open"');

  // —— 测试 15: findSimilar — 禁用时返回空 ——
  console.log('\n[15] findSimilar — 禁用状态');
  sem.setEnabled(false);
  const sim3 = await sem.findSimilar('聊天', 5);
  assertEq(sim3.length, 0, '禁用时 findSimilar 应返回空');
  sem.setEnabled(true);

  // —— 测试 16: getStats 反映 mini 模型状态 ——
  console.log('\n[16] getStats — mini 模型字段');
  const statsMini = sem.getStats();
  assertEq(statsMini.miniModelReady, true, 'miniModelReady 应为 true');
  assertGt(statsMini.miniModelVocabSize, 0, 'miniModelVocabSize 应 > 0');
  assertGt(statsMini.miniModelDocs, 0, 'miniModelDocs 应 > 0');

  // —— 总结 ——
  console.log('\n=== 测试总结 ===');
  console.log('Passed: ' + passed);
  console.log('Failed: ' + failed);
  console.log(failed > 0 ? '\n❌ 有失败用例' : '\n✅ 全部通过');
  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch(function(e){
  console.error('Test error:', e);
  process.exit(1);
});
