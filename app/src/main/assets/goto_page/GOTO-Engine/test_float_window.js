/*
 * GOTO Engine — 智能悬浮窗 (Float Window) 单元测试
 * 运行: node test_float_window.js
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
  console.log('\n=== 智能悬浮窗 单元测试 ===\n');

  // ---- 组1: 初始状态 ----
  console.log('[组1] 初始状态');
  {
    const { sandbox } = buildSandbox();
    const eng = loadEngine(sandbox);
    const s = eng.getFloatWindowState();
    assert('初始 enabled=false', s.enabled === false, 'enabled=' + s.enabled);
    assert('初始 singleClick=search', s.singleClick === 'search', 'singleClick=' + s.singleClick);
    assert('初始 doubleClick=meta', s.doubleClick === 'meta', 'doubleClick=' + s.doubleClick);
    assert('初始 position=top-center', s.position === 'top-center', 'position=' + s.position);
    assert('初始 autoMorph=true', s.autoMorph === true, 'autoMorph=' + s.autoMorph);
    assert('初始 morphMessage 为空', s.morphMessage === '', 'morphMessage=' + s.morphMessage);
    assert('isFloatWindowEnabled() 返回 false', eng.isFloatWindowEnabled() === false);
  }

  // ---- 组2: 开关 ----
  console.log('[组2] 开关 setFloatWindowEnabled');
  {
    const { sandbox } = buildSandbox();
    const eng = loadEngine(sandbox);
    const s1 = eng.setFloatWindowEnabled(true);
    assert('setFloatWindowEnabled(true) 后 enabled=true', s1.enabled === true);
    assert('isFloatWindowEnabled() 返回 true', eng.isFloatWindowEnabled() === true);
    const s2 = eng.setFloatWindowEnabled(false);
    assert('setFloatWindowEnabled(false) 后 enabled=false', s2.enabled === false);
    assert('isFloatWindowEnabled() 返回 false', eng.isFloatWindowEnabled() === false);
  }

  // ---- 组3: 配置更新 ----
  console.log('[组3] 配置更新 updateFloatWindowConfig');
  {
    const { sandbox } = buildSandbox();
    const eng = loadEngine(sandbox);
    eng.updateFloatWindowConfig({
      singleClick: 'chain',
      doubleClick: 'pioneer',
      position: 'top-left',
      autoMorph: false,
      lastX: 100,
      lastY: 50
    });
    const s = eng.getFloatWindowState();
    assert('singleClick 更新为 chain', s.singleClick === 'chain', 'singleClick=' + s.singleClick);
    assert('doubleClick 更新为 pioneer', s.doubleClick === 'pioneer', 'doubleClick=' + s.doubleClick);
    assert('position 更新为 top-left', s.position === 'top-left', 'position=' + s.position);
    assert('autoMorph 更新为 false', s.autoMorph === false, 'autoMorph=' + s.autoMorph);
    assert('lastX=100', s.lastX === 100, 'lastX=' + s.lastX);
    assert('lastY=50', s.lastY === 50, 'lastY=' + s.lastY);
  }

  // ---- 组4: position 非法值回退 ----
  console.log('[组4] position 非法值回退');
  {
    const { sandbox } = buildSandbox();
    const eng = loadEngine(sandbox);
    // 先设为合法值
    eng.updateFloatWindowConfig({ position: 'top-right' });
    // 尝试设为非法值（应被忽略）
    eng.updateFloatWindowConfig({ position: 'bottom-center' });
    const s = eng.getFloatWindowState();
    assert('非法 position 被忽略，保持 top-right', s.position === 'top-right', 'position=' + s.position);
    // 直接写入非法值后读取（getFloatWindowState 应回退默认）
    eng.saveFloatWindowState({ enabled:true, position:'bottom-left', singleClick:'search', doubleClick:'meta', autoMorph:true });
    const s2 = eng.getFloatWindowState();
    assert('直接写入非法 position 后读取回退 top-center', s2.position === 'top-center', 'position=' + s2.position);
  }

  // ---- 组5: 变形提示 triggerFloatWindowMorph ----
  console.log('[组5] 变形提示 triggerFloatWindowMorph');
  {
    const { sandbox } = buildSandbox();
    const eng = loadEngine(sandbox);
    assert('初始无变形', eng.isFloatWindowMorphActive() === false);
    eng.triggerFloatWindowMorph('是否打开高德地图？', 8000);
    assert('trigger 后 isFloatWindowMorphActive=true', eng.isFloatWindowMorphActive() === true);
    const s = eng.getFloatWindowState();
    assert('morphMessage 已设置', s.morphMessage === '是否打开高德地图？', 'morphMessage=' + s.morphMessage);
    assert('morphExpire > 当前时间', s.morphExpire > Date.now(), 'morphExpire=' + s.morphExpire);
    eng.clearFloatWindowMorph();
    assert('clear 后 isFloatWindowMorphActive=false', eng.isFloatWindowMorphActive() === false);
    const s2 = eng.getFloatWindowState();
    assert('clear 后 morphMessage 为空', s2.morphMessage === '', 'morphMessage=' + s2.morphMessage);
  }

  // ---- 组6: 变形提示过期 ----
  console.log('[组6] 变形提示过期');
  {
    const { sandbox } = buildSandbox();
    const eng = loadEngine(sandbox);
    // 设置一个 1ms 的极短 TTL
    eng.triggerFloatWindowMorph('快速过期提示', 1);
    assert('trigger 后立即为 true', eng.isFloatWindowMorphActive() === true);
    // 等待过期
    setTimeout(function(){
      const active = eng.isFloatWindowMorphActive();
      assert('1ms 后 isFloatWindowMorphActive=false（已过期）', active === false, 'active=' + active);
      finish();
    }, 30);
  }

  function finish(){
    console.log('\n----------------------------------------');
    console.log('通过: ' + pass + ' / 失败: ' + fail);
    console.log('----------------------------------------');
    process.exit(fail > 0 ? 1 : 0);
  }

  // 如果没有异步测试，直接结束
  if(fail === 0 && pass > 0){
    // 组6 有异步，等待它完成
  }
}

run();
