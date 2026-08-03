/*
 * GOTO Engine — 关联规则挖掘 (Association Rule Mining) 单元测试
 * 运行: node test_association.js
 * 说明: 用 vm 沙箱 mock window/localStorage/document，加载 goto-engine.js 后断言
 */
'use strict';
const vm = require('vm');
const fs = require('fs');
const path = require('path');

function buildSandbox(){
  const store = {};
  const localStorage = {
    getItem: k => (k in store ? store[k] : null),
    setItem: (k,v) => { store[k] = String(v); },
    removeItem: k => { delete store[k]; }
  };
  const sandbox = {
    localStorage,
    performance: { now: () => Date.now() },
    navigator: { language:'zh-CN', onLine:true, hardwareConcurrency:4, connection:{effectiveType:'4g'} },
    document: { body: { classList:{ contains: () => false } } },
    console,
    Date,
    Math,
    JSON,
    Set,
    Map,
    Object,
    Array
  };
  sandbox.window = sandbox;
  sandbox.global = sandbox;
  vm.createContext(sandbox);
  return { sandbox, getStore: () => store };
}

function loadEngine(sandbox){
  const code = fs.readFileSync(path.join(__dirname,'goto-engine.js'),'utf8');
  vm.runInContext(code, sandbox);
  return sandbox.GOTOEngine;
}

let pass = 0, fail = 0;
function assert(name, cond, extra){
  if(cond){ pass++; console.log('  ✓ ' + name); }
  else { fail++; console.log('  ✗ ' + name + (extra ? '  => ' + extra : '')); }
}

function run(){
  console.log('\n=== 关联规则挖掘 单元测试 ===\n');

  // ---- 组1: app→app 关联推荐（置信度≥80%，minCount≥2）----
  console.log('[组1] app→app 关联推荐');
  {
    const { sandbox } = buildSandbox();
    const eng = loadEngine(sandbox);
    // 模拟：微信→高德 3 次，微信→QQ 1 次。微信→高德 置信度 75% < 80%，不推荐
    eng._recordActionEdge('app:微信', 'app:高德地图');
    eng._recordActionEdge('app:微信', 'app:高德地图');
    eng._recordActionEdge('app:微信', 'app:高德地图');
    eng._recordActionEdge('app:微信', 'app:QQ');
    // 微信→高德 置信度 3/4=75% < 80%，不应推荐
    var recs = eng.getAssociationRecommendation('微信', { threshold:0.8, minCount:2 });
    assert('置信度 75% < 80% 时不推荐', recs.length === 0, 'recs.length=' + recs.length);

    // 再加一次微信→高德，置信度 4/5=80%，应推荐
    eng._recordActionEdge('app:微信', 'app:高德地图');
    var recs2 = eng.getAssociationRecommendation('微信', { threshold:0.8, minCount:2 });
    assert('置信度 80% ≥ 80% 时推荐', recs2.length === 1, 'recs2.length=' + recs2.length);
    assert('推荐 app 为高德地图', recs2[0].app === '高德地图', 'app=' + recs2[0].app);
    assert('confidence=0.8', recs2[0].confidence === 0.8, 'confidence=' + recs2[0].confidence);
    assert('count=4', recs2[0].count === 4, 'count=' + recs2[0].count);
  }

  // ---- 组2: minCount 不足时不推荐 ----
  console.log('[组2] minCount 不足时不推荐');
  {
    const { sandbox } = buildSandbox();
    const eng = loadEngine(sandbox);
    eng._recordActionEdge('app:微信', 'app:高德地图');
    // 只有 1 次，minCount 默认 2，不推荐
    var recs = eng.getAssociationRecommendation('微信', { threshold:0.8 });
    assert('minCount=2 且仅 1 次时不推荐', recs.length === 0, 'recs.length=' + recs.length);
    // minCount=1 时应推荐
    var recs2 = eng.getAssociationRecommendation('微信', { threshold:0.8, minCount:1 });
    assert('minCount=1 时推荐', recs2.length === 1, 'recs2.length=' + recs2.length);
  }

  // ---- 组3: 无关联数据时返回空 ----
  console.log('[组3] 无关联数据时返回空');
  {
    const { sandbox } = buildSandbox();
    const eng = loadEngine(sandbox);
    var recs = eng.getAssociationRecommendation('抖音', {});
    assert('无数据时返回空数组', Array.isArray(recs) && recs.length === 0);
    var recs2 = eng.getAssociationRecommendation('', {});
    assert('fromApp 为空时返回空数组', Array.isArray(recs2) && recs2.length === 0);
  }

  // ---- 组4: getQuickBubbles 基于查询关联 ----
  console.log('[组4] getQuickBubbles 基于查询关联');
  {
    const { sandbox } = buildSandbox();
    const eng = loadEngine(sandbox);
    // 模拟：query:发短信给张三 → app:微信 3 次，→ app:高德地图 2 次
    eng._recordActionEdge('query:发短信给张三', 'app:微信');
    eng._recordActionEdge('query:发短信给张三', 'app:微信');
    eng._recordActionEdge('query:发短信给张三', 'app:微信');
    eng._recordActionEdge('query:发短信给张三', 'app:高德地图');
    eng._recordActionEdge('query:发短信给张三', 'app:高德地图');
    var bubbles = eng.getQuickBubbles('发短信给张三', { limit:3 });
    // 微信 3/5=60% ≥ 60%，高德 2/5=40% < 60%
    assert('微信置信度 60% ≥ 60% 进入气泡', bubbles.some(function(b){ return b.app==='微信'; }));
    assert('高德置信度 40% < 60% 不进入气泡', !bubbles.some(function(b){ return b.app==='高德地图'; }));
  }

  // ---- 组5: getQuickBubbles 意图扩散 ----
  console.log('[组5] getQuickBubbles 意图扩散');
  {
    const { sandbox } = buildSandbox();
    const eng = loadEngine(sandbox);
    // 无关联数据，但查询含 TRAVEL 意图词"打车"
    var bubbles = eng.getQuickBubbles('打车去公司', { limit:3 });
    assert('TRAVEL 意图触发打车出行气泡', bubbles.some(function(b){ return b.app==='高德地图' && b.source.indexOf('intent:')===0; }));
    // BUY 意图"吃饭"
    var bubbles2 = eng.getQuickBubbles('吃饭', { limit:3 });
    assert('BUY 意图触发点外卖气泡', bubbles2.some(function(b){ return b.app==='美团'; }));
    // CONSUME 意图"看视频"
    var bubbles3 = eng.getQuickBubbles('看视频', { limit:3 });
    assert('CONSUME 意图触发看视频气泡', bubbles3.some(function(b){ return b.app==='B站'; }));
  }

  // ---- 组6: getQuickBubbles 去重 ----
  console.log('[组6] getQuickBubbles 去重');
  {
    const { sandbox } = buildSandbox();
    const eng = loadEngine(sandbox);
    // 关联推荐高德地图，意图扩散也推荐高德地图，应去重
    eng._recordActionEdge('query:打车', 'app:高德地图');
    eng._recordActionEdge('query:打车', 'app:高德地图');
    eng._recordActionEdge('query:打车', 'app:高德地图');
    var bubbles = eng.getQuickBubbles('打车', { limit:3 });
    var gaodeCount = bubbles.filter(function(b){ return b.app==='高德地图'; }).length;
    assert('高德地图只出现一次（去重）', gaodeCount === 1, 'gaodeCount=' + gaodeCount);
  }

  // ---- 组7: limit 限制 ----
  console.log('[组7] limit 限制');
  {
    const { sandbox } = buildSandbox();
    const eng = loadEngine(sandbox);
    // A 4 次（66.7%≥60%），B 2 次（33.3%<60%），仅 A 进入气泡
    eng._recordActionEdge('query:test', 'app:A');
    eng._recordActionEdge('query:test', 'app:A');
    eng._recordActionEdge('query:test', 'app:A');
    eng._recordActionEdge('query:test', 'app:A');
    eng._recordActionEdge('query:test', 'app:B');
    eng._recordActionEdge('query:test', 'app:B');
    var bubbles = eng.getQuickBubbles('test', { limit:1 });
    assert('limit=1 时只返回 1 个', bubbles.length === 1, 'bubbles.length=' + bubbles.length);
    assert('返回的是 A', bubbles[0].app === 'A', 'app=' + bubbles[0].app);
  }

  console.log('\n----------------------------------------');
  console.log('通过: ' + pass + ' / 失败: ' + fail);
  console.log('----------------------------------------');
  process.exit(fail > 0 ? 1 : 0);
}

run();
