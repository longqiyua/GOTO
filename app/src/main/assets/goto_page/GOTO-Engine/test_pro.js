/*
 * GOTO Engine — 模拟智能 PRO (Pro Context Injection) 单元测试
 * 运行: node test_pro.js
 * 说明: 验证 PRO 开关、非敏感信息采集快照、电量/信号感知规则注入加权
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
    navigator: { language:'zh-CN', onLine:true, hardwareConcurrency:4 },
    document: { body: { classList:{ contains: () => false } } },
    console, Date, Math, JSON, Set, Map, Object, Array
  };
  sandbox.window = sandbox;
  sandbox.global = sandbox;
  vm.createContext(sandbox);
  return { sandbox, getStore: () => store };
}
function loadEngine(sandbox){
  vm.runInContext(fs.readFileSync(path.join(__dirname,'goto-engine.js'),'utf8'), sandbox);
  return sandbox.GOTOEngine;
}
let pass=0, fail=0;
function assert(name, cond, extra){
  if(cond){ pass++; console.log('  ✓ ' + name); }
  else { fail++; console.log('  ✗ ' + name + (extra?'  => '+extra:'')); }
}

function run(){
  console.log('\n=== 模拟智能 PRO 单元测试 ===\n');

  console.log('[组1] PRO 开关状态');
  {
    const { sandbox } = buildSandbox();
    const eng = loadEngine(sandbox);
    assert('初始 PRO 关闭', eng.isProEnabled() === false);
    assert('PRO 关闭时 boost=0 (游戏)', eng._getProContextBoost('x', {name:'王者荣耀',cat:'游戏'}) === 0);
    eng.setProEnabled(true);
    assert('setProEnabled(true) 后开启', eng.isProEnabled() === true);
    eng.setProEnabled(false);
    assert('setProEnabled(false) 后关闭', eng.isProEnabled() === false);
  }

  console.log('\n[组2] 低电量感知 — 压制耗电应用');
  {
    const { sandbox } = buildSandbox();
    const eng = loadEngine(sandbox);
    eng.setProEnabled(true);
    let pro = eng.getProState();
    pro.battery = { level:0.1, charging:false, granted:true };
    pro.signal = { effectiveType:'4g', rtt:50 };
    eng.saveProState(pro);

    const boostGame = eng._getProContextBoost('x', {name:'王者荣耀',cat:'游戏'});
    assert('低电量非充电 游戏 boost=-40', boostGame === -40, 'boost='+boostGame);
    const boostVideo = eng._getProContextBoost('x', {name:'B站',cat:'视频'});
    assert('低电量非充电 视频 boost=-30', boostVideo === -30, 'boost='+boostVideo);
    const boostNormal = eng._getProContextBoost('x', {name:'微信',cat:'通讯'});
    assert('低电量 通讯应用 boost=0', boostNormal === 0, 'boost='+boostNormal);
  }

  console.log('\n[组3] 弱网感知 — 压制流媒体');
  {
    const { sandbox } = buildSandbox();
    const eng = loadEngine(sandbox);
    eng.setProEnabled(true);
    let pro = eng.getProState();
    pro.battery = { level:0.9, charging:true, granted:true };
    pro.signal = { effectiveType:'2g', rtt:600 };
    eng.saveProState(pro);

    const boostMusic = eng._getProContextBoost('x', {name:'网易云音乐',cat:'音乐'});
    assert('弱网(2g) 流媒体 boost=-25', boostMusic === -25, 'boost='+boostMusic);
    const boostNonMedia = eng._getProContextBoost('x', {name:'微信',cat:'通讯'});
    assert('弱网 非流媒体 boost=0', boostNonMedia === 0, 'boost='+boostNonMedia);
  }

  console.log('\n[组4] 正常状态不干预');
  {
    const { sandbox } = buildSandbox();
    const eng = loadEngine(sandbox);
    eng.setProEnabled(true);
    let pro = eng.getProState();
    pro.battery = { level:0.85, charging:true, granted:true };
    pro.signal = { effectiveType:'4g', rtt:40 };
    eng.saveProState(pro);

    assert('电量充足充电 游戏 boost=0', eng._getProContextBoost('x',{name:'王者荣耀',cat:'游戏'}) === 0);
    assert('电量充足充电 视频 boost=0', eng._getProContextBoost('x',{name:'抖音',cat:'视频'}) === 0);
  }

  console.log('\n[组5] 快照完整性');
  {
    const { sandbox } = buildSandbox();
    const eng = loadEngine(sandbox);
    eng.setProEnabled(true);
    let pro = eng.getProState();
    pro.battery = { level:0.5, charging:true, granted:true };
    pro.location = { lat:31.23, lng:121.47, accuracy:30, granted:true, grantedAt:Date.now() };
    eng.saveProState(pro);
    const snap = eng.getProSnapshot();
    assert('snapshot.proEnabled=true', snap.proEnabled === true);
    assert('snapshot.battery.level=0.5', snap.battery && snap.battery.level === 0.5);
    assert('snapshot.location 含 lat/lng', snap.location && typeof snap.location.lat === 'number');
    assert('snapshot.hour 为数字', typeof snap.hour === 'number');
  }

  console.log('\n[组6] PRO 关闭后不干预（即使有数据）');
  {
    const { sandbox } = buildSandbox();
    const eng = loadEngine(sandbox);
    eng.setProEnabled(true);
    let pro = eng.getProState();
    pro.battery = { level:0.05, charging:false, granted:true };
    pro.signal = { effectiveType:'2g', rtt:800 };
    eng.saveProState(pro);
    eng.setProEnabled(false);
    assert('关闭后 游戏 boost=0', eng._getProContextBoost('x',{name:'王者荣耀',cat:'游戏'}) === 0);
    assert('关闭后 流媒体 boost=0', eng._getProContextBoost('x',{name:'B站',cat:'视频'}) === 0);
  }

  console.log('\n----------------------------------------');
  console.log('通过: ' + pass + ' / 失败: ' + fail);
  console.log('----------------------------------------\n');
  process.exit(fail > 0 ? 1 : 0);
}
run();
