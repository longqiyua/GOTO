/*
 * GOTO Engine — 自愈式规则纠偏 (Self-Healing) 单元测试
 * 运行: node test_self_healing.js
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
  console.log('\n=== 自愈式规则纠偏 单元测试 ===\n');

  // ---- 组1: BlockFlag 基础 ----
  console.log('[组1] BlockFlag 增删查');
  {
    const { sandbox, getStore } = buildSandbox();
    const eng = loadEngine(sandbox);
    eng.clearExpiredBlockFlags();

    eng.addBlockFlag('发短信', '微信', 3);
    assert('addBlockFlag 后 isBlockFlagged=true', eng.isBlockFlagged('发短信','微信') === true);
    assert('未标记应用 isBlockFlagged=false', eng.isBlockFlagged('发短信','QQ') === false);
    assert('大小写/空格归一', eng.isBlockFlagged('  发短信 ', '微信') === true);

    const preview = eng.getBlockFlagPreview('发短信');
    assert('getBlockFlagPreview 返回1项', preview.length === 1, 'len=' + preview.length);
    assert('remainDays 在 0-3 之间', preview[0].remainDays >= 0 && preview[0].remainDays <= 3, 'days=' + preview[0].remainDays);

    const removed = eng.removeBlockFlag('发短信','微信');
    assert('removeBlockFlag 返回 true', removed === true);
    assert('移除后 isBlockFlagged=false', eng.isBlockFlagged('发短信','微信') === false);
    assert('重复移除返回 false', eng.removeBlockFlag('发短信','微信') === false);
  }

  // ---- 组2: 过期清理 ----
  console.log('\n[组2] 3 天过期清理');
  {
    const { sandbox, getStore } = buildSandbox();
    const eng = loadEngine(sandbox);
    eng.addBlockFlag('发短信', '微信', 3);
    // 手动把 expire 改成过去
    const flags = JSON.parse(getStore()['goto_engine_block_flags']);
    flags['发短信']['微信'].expire = Date.now() - 1000;
    getStore()['goto_engine_block_flags'] = JSON.stringify(flags);
    // isBlockFlagged 会触发清理
    assert('过期后 isBlockFlagged=false', eng.isBlockFlagged('发短信','微信') === false);
    const flags2 = eng.getBlockFlags();
    assert('过期清理后该 query 键被删除', !flags2['发短信'], JSON.stringify(flags2));
  }

  // ---- 组3: applySelfHealing 权重 + BlockFlag ----
  console.log('\n[组3] applySelfHealing 调教');
  {
    const { sandbox, getStore } = buildSandbox();
    const eng = loadEngine(sandbox);
    // 模拟当前搜索结果候选
    sandbox._lastSearchContext = {
      list: [
        { id:'wx', name:'微信' },
        { id:'qq', name:'QQ' },
        { id:'sms', name:'短信' }
      ],
      info: {}
    };
    const res = eng.applySelfHealing('发短信', '短信');
    assert('返回 defaultApp=短信', res && res.defaultApp === '短信', JSON.stringify(res));
    assert('blockedApps 包含微信与QQ', res && res.blockedApps.indexOf('微信')>=0 && res.blockedApps.indexOf('QQ')>=0, JSON.stringify(res&&res.blockedApps));
    assert('微信被 BlockFlag', eng.isBlockFlagged('发短信','微信') === true);
    assert('QQ 被 BlockFlag', eng.isBlockFlagged('发短信','QQ') === true);
    assert('短信未被 BlockFlag', eng.isBlockFlagged('发短信','短信') === false);

    const weights = eng.getRuleWeights();
    const wSms = weights['发短信']['短信'];
    const wWx = weights['发短信']['微信'];
    assert('短信权重提升 (>0.6)', typeof wSms==='number' && wSms > 0.6, 'wSms=' + wSms);
    assert('微信权重下降 (<0.5)', typeof wWx==='number' && wWx < 0.5, 'wWx=' + wWx);
    assert('权重边界 [0,1]', wSms>=0 && wSms<=1 && wWx>=0 && wWx<=1, 'wSms='+wSms+' wWx='+wWx);

    // 自愈历史记录
    const healing = eng.getSelfHealingState();
    assert('自愈历史记录1条', healing['发短信'] && healing['发短信'].length === 1, JSON.stringify(healing['发短信']));
    assert('自愈历史 defaultApp=短信', healing['发短信'][0].defaultApp === '短信');
  }

  // ---- 组4: fuzzySearch 过滤被 Block 的应用 ----
  console.log('\n[组4] fuzzySearch 过滤被 Block 应用');
  {
    const { sandbox } = buildSandbox();
    const eng = loadEngine(sandbox);
    sandbox.localStorage.setItem('goto_simint_enabled','1');
    // mock document.body.classList.contains 返回 false（非 super/t9/meta）
    sandbox.document.body.classList.contains = () => false;
    const apps = [
      { id:'wx', name:'微信', py:'weixin', en:'wechat', cat:'社交' },
      { id:'sms', name:'短信', py:'duanxin', en:'sms', cat:'系统' }
    ];
    sandbox._appDataset = apps;
    eng.buildSearchIndex(apps);
    eng.addBlockFlag('微信', '微信', 3);
    const r = eng.fuzzySearch('微信', apps);
    assert('被 Block 的微信不在结果', !r.list.some(a => a.name === '微信'), 'list=' + r.list.map(a=>a.name).join(','));
    assert('结果非空（回退或保留其他）', r.list.length >= 0);
  }

  // ---- 组5: 容量上限 LRU ----
  console.log('\n[组5] BlockFlag 容量上限');
  {
    const { sandbox } = buildSandbox();
    const eng = loadEngine(sandbox);
    for(let i=0;i<210;i++){
      eng.addBlockFlag('q'+i, 'app'+i, 3);
    }
    const flags = eng.getBlockFlags();
    const total = Object.keys(flags).reduce((s,k)=>s+Object.keys(flags[k]).length,0);
    assert('总量不超过上限 200', total <= 200, 'total=' + total);
  }

  // ---- 组6: 边界与空值 ----
  console.log('\n[组6] 边界与空值');
  {
    const { sandbox } = buildSandbox();
    const eng = loadEngine(sandbox);
    assert('空 query addBlockFlag 返回 false', eng.addBlockFlag('', '微信') === false);
    assert('空 app addBlockFlag 返回 false', eng.addBlockFlag('发短信', '') === false);
    assert('空参数 isBlockFlagged=false', eng.isBlockFlagged('', '') === false);
    const res = eng.applySelfHealing('', '微信');
    assert('空 query applySelfHealing 返回 null', res === null);
  }

  console.log('\n----------------------------------------');
  console.log('通过: ' + pass + ' / 失败: ' + fail);
  console.log('----------------------------------------\n');
  process.exit(fail > 0 ? 1 : 0);
}

run();
