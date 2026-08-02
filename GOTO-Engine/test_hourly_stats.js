/*
 * GOTO Engine — 24小时分时段统计 (Hourly Stats) 单元测试
 * 运行: node test_hourly_stats.js
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
  console.log('\n=== 24小时分时段统计 单元测试 ===\n');

  // ---- 组1: getHourlyStats 基础结构 ----
  console.log('[组1] getHourlyStats 基础结构');
  {
    const { sandbox } = buildSandbox();
    const eng = loadEngine(sandbox);
    var hours = eng.getHourlyStats({ topN:3 });
    assert('返回数组长度 24', Array.isArray(hours) && hours.length === 24, 'length=' + hours.length);
    assert('hour[0].hour=0', hours[0].hour === 0);
    assert('hour[23].hour=23', hours[23].hour === 23);
    assert('hour[0].total=0（空数据）', hours[0].total === 0);
    assert('hour[0].topApps 是数组', Array.isArray(hours[0].topApps));
    assert('hour[0].apps 是对象', typeof hours[0].apps === 'object');
  }

  // ---- 组2: hourly 数据聚合 ----
  console.log('[组2] hourly 数据聚合');
  {
    const { sandbox } = buildSandbox();
    const eng = loadEngine(sandbox);
    // 直接构造 stats 数据
    var stats = {
      '发短信': {
        apps: {
          '微信': { total: 5, hourly: { '9': 2, '21': 3 } },
          'QQ': { total: 2, hourly: { '9': 1, '14': 1 } }
        }
      },
      '看视频': {
        apps: {
          'B站': { total: 4, hourly: { '21': 3, '22': 1 } }
        }
      }
    };
    eng.saveRuleStats(stats);
    var hours = eng.getHourlyStats({ topN:3 });
    // 9时：微信2 + QQ1 = 3
    assert('9时 total=3', hours[9].total === 3, 'total=' + hours[9].total);
    assert('9时 微信 count=2', hours[9].apps['微信'] === 2, 'count=' + hours[9].apps['微信']);
    assert('9时 QQ count=1', hours[9].apps['QQ'] === 1);
    // 21时：微信3 + B站3 = 6
    assert('21时 total=6', hours[21].total === 6, 'total=' + hours[21].total);
    // 14时：QQ1 = 1
    assert('14时 total=1', hours[14].total === 1);
    // 0时：无数据
    assert('0时 total=0', hours[0].total === 0);
  }

  // ---- 组3: topApps 排序 ----
  console.log('[组3] topApps 排序');
  {
    const { sandbox } = buildSandbox();
    const eng = loadEngine(sandbox);
    eng.saveRuleStats({
      'test': {
        apps: {
          'A': { total: 5, hourly: { '10': 5 } },
          'B': { total: 3, hourly: { '10': 3 } },
          'C': { total: 1, hourly: { '10': 1 } }
        }
      }
    });
    var hours = eng.getHourlyStats({ topN:2 });
    assert('10时 topApps 长度=2（topN=2）', hours[10].topApps.length === 2);
    assert('10时 top1 是 A', hours[10].topApps[0].app === 'A');
    assert('10时 top1 count=5', hours[10].topApps[0].count === 5);
    assert('10时 top2 是 B', hours[10].topApps[1].app === 'B');
  }

  // ---- 组4: getFullTimeStats 全时段聚合 ----
  console.log('[组4] getFullTimeStats 全时段聚合');
  {
    const { sandbox } = buildSandbox();
    const eng = loadEngine(sandbox);
    eng.saveRuleStats({
      '发短信': {
        apps: {
          '微信': { total: 5, hourly: { '9': 2, '21': 3 } },
          'QQ': { total: 2, hourly: { '9': 1, '14': 1 } }
        }
      },
      '看视频': {
        apps: {
          'B站': { total: 4, hourly: { '21': 3, '22': 1 } }
        }
      }
    });
    var full = eng.getFullTimeStats({ topN:10 });
    assert('queryCount=2', full.queryCount === 2, 'queryCount=' + full.queryCount);
    assert('totalClicks=11（5+2+4）', full.totalClicks === 11, 'totalClicks=' + full.totalClicks);
    assert('uniqueApps=3', full.uniqueApps === 3, 'uniqueApps=' + full.uniqueApps);
    assert('top1 是 微信 count=5', full.topApps[0].app === '微信' && full.topApps[0].count === 5);
    assert('top2 是 B站 count=4', full.topApps[1].app === 'B站' && full.topApps[1].count === 4);
    assert('top3 是 QQ count=2', full.topApps[2].app === 'QQ' && full.topApps[2].count === 2);
  }

  // ---- 组5: 空数据时返回有效结构 ----
  console.log('[组5] 空数据时返回有效结构');
  {
    const { sandbox } = buildSandbox();
    const eng = loadEngine(sandbox);
    var full = eng.getFullTimeStats({});
    assert('空数据 queryCount=0', full.queryCount === 0);
    assert('空数据 totalClicks=0', full.totalClicks === 0);
    assert('空数据 uniqueApps=0', full.uniqueApps === 0);
    assert('空数据 topApps 是空数组', Array.isArray(full.topApps) && full.topApps.length === 0);
  }

  // ---- 组6: getCurrentHourStats ----
  console.log('[组6] getCurrentHourStats');
  {
    const { sandbox } = buildSandbox();
    const eng = loadEngine(sandbox);
    var currentHour = new Date().getHours();
    eng.saveRuleStats({
      'test': {
        apps: {
          'A': { total: 1, hourly: {} }
        }
      }
    });
    // 在当前小时写入数据
    var stats = eng.getRuleStats();
    stats['test'].apps['A'].hourly[String(currentHour)] = 3;
    eng.saveRuleStats(stats);
    var cur = eng.getCurrentHourStats();
    assert('getCurrentHourStats hour=' + currentHour, cur.hour === currentHour, 'hour=' + cur.hour);
    assert('getCurrentHourStats total=3', cur.total === 3, 'total=' + cur.total);
    assert('getCurrentHourStats topApps[0].app=A', cur.topApps[0] && cur.topApps[0].app === 'A');
  }

  console.log('\n----------------------------------------');
  console.log('通过: ' + pass + ' / 失败: ' + fail);
  console.log('----------------------------------------');
  process.exit(fail > 0 ? 1 : 0);
}

run();
