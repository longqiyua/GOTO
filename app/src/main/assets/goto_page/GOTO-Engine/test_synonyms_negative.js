/*
 * GOTO Engine — 同义词泛化映射 + 反向意图学习（负反馈）单元测试
 * 运行: node test_synonyms_negative.js
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
const failures = [];
function assert(name, cond, extra){
  if(cond){ pass++; console.log('  PASS ' + name); }
  else { fail++; failures.push(name + (extra ? '  => ' + extra : '')); console.log('  FAIL ' + name + (extra ? '  => ' + extra : '')); }
}

function run(){
  console.log('\n=== 同义词映射 + 负反馈学习 单元测试 ===\n');

  // ---- 组1: 同义词映射 SEND ----
  console.log('[组1] 同义词映射 SEND（写/发/寄/送）');
  {
    const { sandbox } = buildSandbox();
    const eng = loadEngine(sandbox);
    var syn = eng.intentSynonyms;
    assert('SEND 包含 写', syn.SEND.indexOf('写') >= 0);
    assert('SEND 包含 发', syn.SEND.indexOf('发') >= 0);
    assert('SEND 包含 寄', syn.SEND.indexOf('寄') >= 0);
    assert('SEND 包含 送', syn.SEND.indexOf('送') >= 0);
    assert('SEND 包含 发短信', syn.SEND.indexOf('发短信') >= 0);
    assert('SEND 包含 发邮件', syn.SEND.indexOf('发邮件') >= 0);
  }

  // ---- 组2: 同义词映射 CONSUME ----
  console.log('[组2] 同义词映射 CONSUME（看/听/读/欣赏）');
  {
    const { sandbox } = buildSandbox();
    const eng = loadEngine(sandbox);
    var syn = eng.intentSynonyms;
    assert('CONSUME 包含 看', syn.CONSUME.indexOf('看') >= 0);
    assert('CONSUME 包含 听', syn.CONSUME.indexOf('听') >= 0);
    assert('CONSUME 包含 读', syn.CONSUME.indexOf('读') >= 0);
    assert('CONSUME 包含 欣赏', syn.CONSUME.indexOf('欣赏') >= 0);
    assert('CONSUME 包含 播放', syn.CONSUME.indexOf('播放') >= 0);
  }

  // ---- 组3: 同义词映射 CONTACT/TRAVEL/BUY/WORK ----
  console.log('[组3] 同义词映射 CONTACT/TRAVEL/BUY/WORK');
  {
    const { sandbox } = buildSandbox();
    const eng = loadEngine(sandbox);
    var syn = eng.intentSynonyms;
    assert('CONTACT 包含 联系', syn.CONTACT.indexOf('联系') >= 0);
    assert('CONTACT 包含 聊天', syn.CONTACT.indexOf('聊天') >= 0);
    assert('TRAVEL 包含 打车', syn.TRAVEL.indexOf('打车') >= 0);
    assert('TRAVEL 包含 导航', syn.TRAVEL.indexOf('导航') >= 0);
    assert('TRAVEL 包含 查定位', syn.TRAVEL.indexOf('查定位') >= 0);
    assert('BUY 包含 买', syn.BUY.indexOf('买') >= 0);
    assert('BUY 包含 吃饭', syn.BUY.indexOf('吃饭') >= 0);
    assert('BUY 包含 点外卖', syn.BUY.indexOf('点外卖') >= 0);
    assert('WORK 包含 办公', syn.WORK.indexOf('办公') >= 0);
    assert('WORK 包含 发邮箱', syn.WORK.indexOf('发邮箱') >= 0);
  }

  // ---- 组4: extractTokens 动作词识别 ----
  console.log('[组4] extractTokens 动作词识别');
  {
    const { sandbox } = buildSandbox();
    const eng = loadEngine(sandbox);
    var t1 = eng.extractTokens('发短信给张三');
    assert('"发短信给张三" 识别 SEND 意图', t1.intents.indexOf('SEND') >= 0);
    assert('"发短信给张三" 动作词含 发短信', t1.actions.indexOf('发短信') >= 0);

    var t2 = eng.extractTokens('欣赏电影');
    assert('"欣赏电影" 识别 CONSUME 意图', t2.intents.indexOf('CONSUME') >= 0);
    assert('"欣赏电影" 动作词含 欣赏', t2.actions.indexOf('欣赏') >= 0);

    var t3 = eng.extractTokens('打车去公司');
    assert('"打车去公司" 识别 TRAVEL 意图', t3.intents.indexOf('TRAVEL') >= 0);

    var t4 = eng.extractTokens('发邮箱给老板');
    assert('"发邮箱给老板" 识别 SEND 意图', t4.intents.indexOf('SEND') >= 0);
    assert('"发邮箱给老板" 识别 WORK 意图', t4.intents.indexOf('WORK') >= 0);
  }

  // ---- 组5: 负反馈 — 首位×0.7 + 次位+0.12（clickedIndex===1）----
  console.log('[组5] 负反馈：首位×0.7 + 次位+0.12');
  {
    const { sandbox } = buildSandbox();
    const eng = loadEngine(sandbox);
    // 初始权重 A=0.8, B=0.6
    eng.saveRuleWeights({ '发短信': { 'A':0.8, 'B':0.6 } });
    var record = {
      query: '发短信',
      candidates: [
        { app:'A' },
        { app:'B' }
      ]
    };
    eng._applyNegativeFeedback(record, 'B');
    var weights = eng.getRuleWeights()['发短信'];
    // A: 0.8 * 0.7 = 0.56
    assert('首位 A 权重 0.8×0.7=0.56', Math.abs(weights['A'] - 0.56) < 0.001, 'A=' + weights['A']);
    // B: 0.6 + 0.12 = 0.72
    assert('次位 B 权重 0.6+0.12=0.72', Math.abs(weights['B'] - 0.72) < 0.001, 'B=' + weights['B']);
    // negative 计数
    var neg = eng.getNegativeState()['发短信'];
    assert('A 被忽略 1 次', neg['A'].ignored === 1);
    assert('B 忽略计数重置为 0', neg['B'].ignored === 0);
  }

  // ---- 组6: 负反馈 — 3项场景前置扣0.08 + 点击项+0.2（clickedIndex>1）----
  console.log('[组6] 负反馈：3项场景 clickedIndex=2');
  {
    const { sandbox } = buildSandbox();
    const eng = loadEngine(sandbox);
    eng.saveRuleWeights({ 'test': { 'A':0.5, 'B':0.5, 'C':0.5 } });
    var record = {
      query: 'test',
      candidates: [
        { app:'A' },
        { app:'B' },
        { app:'C' }
      ]
    };
    eng._applyNegativeFeedback(record, 'C');
    var weights = eng.getRuleWeights()['test'];
    // A: 0.5 - 0.08 = 0.42, B: 0.5 - 0.08 = 0.42, C: 0.5 + 0.2 = 0.7
    assert('前置 A 扣 0.08 → 0.42', Math.abs(weights['A'] - 0.42) < 0.001, 'A=' + weights['A']);
    assert('前置 B 扣 0.08 → 0.42', Math.abs(weights['B'] - 0.42) < 0.001, 'B=' + weights['B']);
    assert('点击项 C 加 0.2 → 0.7', Math.abs(weights['C'] - 0.7) < 0.001, 'C=' + weights['C']);
  }

  // ---- 组7: 负反馈 — 连续3次忽略归零 ----
  console.log('[组7] 负反馈：连续3次忽略归零');
  {
    const { sandbox } = buildSandbox();
    const eng = loadEngine(sandbox);
    eng.saveRuleWeights({ 'test': { 'A':0.9, 'B':0.5 } });
    var record = {
      query: 'test',
      candidates: [ { app:'A' }, { app:'B' } ]
    };
    // 连续 3 次点击 B（A 被忽略 3 次）
    eng._applyNegativeFeedback(record, 'B');
    eng._applyNegativeFeedback(record, 'B');
    eng._applyNegativeFeedback(record, 'B');
    var weights = eng.getRuleWeights()['test'];
    assert('A 连续被忽略 3 次后归零', weights['A'] === 0, 'A=' + weights['A']);
    var neg = eng.getNegativeState()['test'];
    assert('A ignored=3', neg['A'].ignored === 3);
  }

  // ---- 组8: 负反馈 — 权重边界 clamp [0,1] ----
  console.log('[组8] 负反馈：权重边界 clamp [0,1]');
  {
    const { sandbox } = buildSandbox();
    const eng = loadEngine(sandbox);
    // A 权重很低 0.05，扣 0.08 后应 clamp 到 0
    eng.saveRuleWeights({ 'test': { 'A':0.05, 'B':0.5, 'C':0.5 } });
    var record = {
      query: 'test',
      candidates: [ { app:'A' }, { app:'B' }, { app:'C' } ]
    };
    eng._applyNegativeFeedback(record, 'C');
    var weights = eng.getRuleWeights()['test'];
    assert('A 权重 0.05-0.08 clamp 到 0', weights['A'] === 0, 'A=' + weights['A']);
    // B 权重很高 0.95，加 0.2 后应 clamp 到 1
    eng.saveRuleWeights({ 'test2': { 'X':0.5, 'Y':0.95 } });
    var record2 = { query:'test2', candidates:[ {app:'X'}, {app:'Y'} ] };
    eng._applyNegativeFeedback(record2, 'Y');
    var w2 = eng.getRuleWeights()['test2'];
    assert('Y 权重 0.95+0.2 clamp 不超过 1（实际点击项为 Y，不加分）', w2['Y'] <= 1);
  }

  // ---- 组9: 负反馈 — 10+项后30%批量扣0.05 + 点击项+0.24 ----
  console.log('[组9] 负反馈：10+项后30%批量扣0.05');
  {
    const { sandbox } = buildSandbox();
    const eng = loadEngine(sandbox);
    // 10 项，点击第 9 位（index=8，>= 10*0.7=7）
    var candidates = [];
    var initWeights = {};
    for(var i=0;i<10;i++){
      candidates.push({ app:'App'+i });
      initWeights['App'+i] = 0.5;
    }
    eng.saveRuleWeights({ 'longtest': initWeights });
    var record = { query:'longtest', candidates: candidates };
    eng._applyNegativeFeedback(record, 'App8');
    var weights = eng.getRuleWeights()['longtest'];
    // 前置 App0-App7 各扣 0.05 → 0.45
    assert('前置 App0 扣 0.05 → 0.45', Math.abs(weights['App0'] - 0.45) < 0.001, 'App0=' + weights['App0']);
    assert('前置 App7 扣 0.05 → 0.45', Math.abs(weights['App7'] - 0.45) < 0.001, 'App7=' + weights['App7']);
    // 点击项 App8 加 0.24 → 0.74
    assert('点击项 App8 加 0.24 → 0.74', Math.abs(weights['App8'] - 0.74) < 0.001, 'App8=' + weights['App8']);
    // App9 在点击项之后，不扣不加
    assert('App9 不变 → 0.5', Math.abs(weights['App9'] - 0.5) < 0.001, 'App9=' + weights['App9']);
  }

  // ---- 组10: 新意图 SEARCH/OPEN/INSTALL/HEALTH/LEARN 同义词覆盖 ----
  console.log('[组10] 新意图同义词覆盖（v3.0 扩展）');
  {
    const { sandbox } = buildSandbox();
    const eng = loadEngine(sandbox);
    var syn = eng.intentSynonyms;
    // SEARCH
    assert('SEARCH 包含 搜', syn.SEARCH.indexOf('搜') >= 0);
    assert('SEARCH 包含 查', syn.SEARCH.indexOf('查') >= 0);
    assert('SEARCH 包含 搜索', syn.SEARCH.indexOf('搜索') >= 0);
    assert('SEARCH 包含 查资料', syn.SEARCH.indexOf('查资料') >= 0);
    assert('SEARCH 包含 百度一下', syn.SEARCH.indexOf('百度一下') >= 0);
    // OPEN
    assert('OPEN 包含 打开', syn.OPEN.indexOf('打开') >= 0);
    assert('OPEN 包含 启动', syn.OPEN.indexOf('启动') >= 0);
    assert('OPEN 包含 进入', syn.OPEN.indexOf('进入') >= 0);
    assert('OPEN 包含 开', syn.OPEN.indexOf('开') >= 0);
    assert('OPEN 包含 唤起', syn.OPEN.indexOf('唤起') >= 0);
    // INSTALL
    assert('INSTALL 包含 装', syn.INSTALL.indexOf('装') >= 0);
    assert('INSTALL 包含 安装', syn.INSTALL.indexOf('安装') >= 0);
    assert('INSTALL 包含 下载', syn.INSTALL.indexOf('下载') >= 0);
    assert('INSTALL 包含 升级', syn.INSTALL.indexOf('升级') >= 0);
    // HEALTH
    assert('HEALTH 包含 运动', syn.HEALTH.indexOf('运动') >= 0);
    assert('HEALTH 包含 跑步', syn.HEALTH.indexOf('跑步') >= 0);
    assert('HEALTH 包含 健身', syn.HEALTH.indexOf('健身') >= 0);
    assert('HEALTH 包含 瑜伽', syn.HEALTH.indexOf('瑜伽') >= 0);
    assert('HEALTH 包含 打卡', syn.HEALTH.indexOf('打卡') >= 0);
    // LEARN
    assert('LEARN 包含 学', syn.LEARN.indexOf('学') >= 0);
    assert('LEARN 包含 学习', syn.LEARN.indexOf('学习') >= 0);
    assert('LEARN 包含 背单词', syn.LEARN.indexOf('背单词') >= 0);
    assert('LEARN 包含 上课', syn.LEARN.indexOf('上课') >= 0);
    assert('LEARN 包含 练题', syn.LEARN.indexOf('练题') >= 0);
  }

  // ---- 组10b: 新意图同义词扩充覆盖（v3.0.1 优化）----
  console.log('[组10b] 新意图同义词扩充覆盖（v3.0.1）');
  {
    const { sandbox } = buildSandbox();
    const eng = loadEngine(sandbox);
    var syn = eng.intentSynonyms;
    // SEARCH 扩充
    assert('SEARCH 扩充: 搜个', syn.SEARCH.indexOf('搜个') >= 0);
    assert('SEARCH 扩充: 找下', syn.SEARCH.indexOf('找下') >= 0);
    assert('SEARCH 扩充: 度娘', syn.SEARCH.indexOf('度娘') >= 0);
    assert('SEARCH 扩充: 搜下', syn.SEARCH.indexOf('搜下') >= 0);
    assert('SEARCH 扩充: 查个', syn.SEARCH.indexOf('查个') >= 0);
    assert('SEARCH 扩充: 上网', syn.SEARCH.indexOf('上网') >= 0);
    assert('SEARCH 扩充: 问个', syn.SEARCH.indexOf('问个') >= 0);
    // OPEN 扩充
    assert('OPEN 扩充: 拉起', syn.OPEN.indexOf('拉起') >= 0);
    assert('OPEN 扩充: 切到', syn.OPEN.indexOf('切到') >= 0);
    assert('OPEN 扩充: 跳到', syn.OPEN.indexOf('跳到') >= 0);
    assert('OPEN 扩充: 启动一下', syn.OPEN.indexOf('启动一下') >= 0);
    assert('OPEN 扩充: 调起', syn.OPEN.indexOf('调起') >= 0);
    assert('OPEN 扩充: 起', syn.OPEN.indexOf('起') >= 0);
    // INSTALL 扩充
    assert('INSTALL 扩充: 装上', syn.INSTALL.indexOf('装上') >= 0);
    assert('INSTALL 扩充: 重新下载', syn.INSTALL.indexOf('重新下载') >= 0);
    assert('INSTALL 扩充: 装一个', syn.INSTALL.indexOf('装一个') >= 0);
    assert('INSTALL 扩充: 重下', syn.INSTALL.indexOf('重下') >= 0);
    assert('INSTALL 扩充: 下个新', syn.INSTALL.indexOf('下个新') >= 0);
    // HEALTH 扩充
    assert('HEALTH 扩充: 走路', syn.HEALTH.indexOf('走路') >= 0);
    assert('HEALTH 扩充: 散步', syn.HEALTH.indexOf('散步') >= 0);
    assert('HEALTH 扩充: 慢跑', syn.HEALTH.indexOf('慢跑') >= 0);
    assert('HEALTH 扩充: 晨跑', syn.HEALTH.indexOf('晨跑') >= 0);
    assert('HEALTH 扩充: 夜跑', syn.HEALTH.indexOf('夜跑') >= 0);
    assert('HEALTH 扩充: 锻炼身体', syn.HEALTH.indexOf('锻炼身体') >= 0);
    assert('HEALTH 扩充: 健身打卡', syn.HEALTH.indexOf('健身打卡') >= 0);
    // LEARN 扩充
    assert('LEARN 扩充: 做题', syn.LEARN.indexOf('做题') >= 0);
    assert('LEARN 扩充: 刷题', syn.LEARN.indexOf('刷题') >= 0);
    assert('LEARN 扩充: 练一下', syn.LEARN.indexOf('练一下') >= 0);
    assert('LEARN 扩充: 背古诗', syn.LEARN.indexOf('背古诗') >= 0);
    assert('LEARN 扩充: 看网课', syn.LEARN.indexOf('看网课') >= 0);
    assert('LEARN 扩充: 学日语', syn.LEARN.indexOf('学日语') >= 0);
  }

  // ---- 组11: 原有 6 意图扩充同义词覆盖 ----
  console.log('[组11] 原有 6 意图扩充同义词覆盖（v3.0 扩展）');
  {
    const { sandbox } = buildSandbox();
    const eng = loadEngine(sandbox);
    var syn = eng.intentSynonyms;
    // SEND 扩充
    assert('SEND 扩充: 留言', syn.SEND.indexOf('留言') >= 0);
    assert('SEND 扩充: 通知', syn.SEND.indexOf('通知') >= 0);
    assert('SEND 扩充: 发微信', syn.SEND.indexOf('发微信') >= 0);
    // CONSUME 扩充
    assert('CONSUME 扩充: 瞧瞧', syn.CONSUME.indexOf('瞧瞧') >= 0);
    assert('CONSUME 扩充: 围观', syn.CONSUME.indexOf('围观') >= 0);
    assert('CONSUME 扩充: 追剧', syn.CONSUME.indexOf('追剧') >= 0);
    // CONTACT 扩充
    assert('CONTACT 扩充: 唠嗑', syn.CONTACT.indexOf('唠嗑') >= 0);
    assert('CONTACT 扩充: 搭话', syn.CONTACT.indexOf('搭话') >= 0);
    assert('CONTACT 扩充: 打招呼', syn.CONTACT.indexOf('打招呼') >= 0);
    // TRAVEL 扩充
    assert('TRAVEL 扩充: 查公交', syn.TRAVEL.indexOf('查公交') >= 0);
    assert('TRAVEL 扩充: 查路线', syn.TRAVEL.indexOf('查路线') >= 0);
    assert('TRAVEL 扩充: 查票', syn.TRAVEL.indexOf('查票') >= 0);
    // BUY 扩充
    assert('BUY 扩充: 剁手', syn.BUY.indexOf('剁手') >= 0);
    assert('BUY 扩充: 拼单', syn.BUY.indexOf('拼单') >= 0);
    assert('BUY 扩充: 付款码', syn.BUY.indexOf('付款码') >= 0);
    // WORK 扩充
    assert('WORK 扩充: 写代码', syn.WORK.indexOf('写代码') >= 0);
    assert('WORK 扩充: 加班', syn.WORK.indexOf('加班') >= 0);
  }

  // ---- 组12: 新意图 extractTokens 识别 ----
  console.log('[组12] 新意图 extractTokens 识别');
  {
    const { sandbox } = buildSandbox();
    const eng = loadEngine(sandbox);
    var t1 = eng.extractTokens('搜一下');
    assert('"搜一下" 识别 SEARCH 意图', t1.intents.indexOf('SEARCH') >= 0);

    var t2 = eng.extractTokens('打开微信');
    assert('"打开微信" 识别 OPEN 意图', t2.intents.indexOf('OPEN') >= 0);

    var t3 = eng.extractTokens('下载个新app');
    assert('"下载个新app" 识别 INSTALL 意图', t3.intents.indexOf('INSTALL') >= 0);

    var t4 = eng.extractTokens('晚上去跑步');
    assert('"晚上去跑步" 识别 HEALTH 意图', t4.intents.indexOf('HEALTH') >= 0);

    var t5 = eng.extractTokens('背单词');
    assert('"背单词" 识别 LEARN 意图', t5.intents.indexOf('LEARN') >= 0);
  }

  // ---- 组13: 多意图查询（同一查询命中多个意图）----
  console.log('[组13] 多意图查询识别');
  {
    const { sandbox } = buildSandbox();
    const eng = loadEngine(sandbox);
    // "发微信学习单词" — 同时命中 SEND（发微信）和 LEARN（学习/单词）
    var t1 = eng.extractTokens('发微信学习单词');
    assert('"发微信学习单词" 识别 SEND 意图', t1.intents.indexOf('SEND') >= 0);
    assert('"发微信学习单词" 识别 LEARN 意图', t1.intents.indexOf('LEARN') >= 0);
    // "看运动视频" — CONSUME + HEALTH
    var t2 = eng.extractTokens('看运动视频');
    assert('"看运动视频" 识别 CONSUME 意图', t2.intents.indexOf('CONSUME') >= 0);
    assert('"看运动视频" 识别 HEALTH 意图', t2.intents.indexOf('HEALTH') >= 0);
  }

  // ---- 组14: 时间衰减 — 30天 50% 衰减 ----
  console.log('[组14] 负反馈：30天 50% 时间衰减');
  {
    const { sandbox } = buildSandbox();
    const eng = loadEngine(sandbox);
    // 初始权重 A=0.9, B=0.5，30 天前设置
    eng.saveRuleWeights({ 'test_decay': { 'A':0.9, 'B':0.5 } });
    eng.saveRuleWeightsTs({ 'test_decay': Date.now() - 30 * 86400000 });
    // 触发衰减：调用 _applyTimeDecayToQuery
    eng._applyTimeDecayToQuery('test_decay');
    var weights = eng.getRuleWeights()['test_decay'];
    // A: 0.5 + (0.9-0.5) * 0.5 = 0.5 + 0.2 = 0.7（半衰期）
    assert('A 30天后衰减到 0.7', Math.abs(weights['A'] - 0.7) < 0.01, 'A=' + weights['A']);
    // B: 0.5 + (0.5-0.5) * 0.5 = 0.5（无变化）
    assert('B 30天后保持 0.5', Math.abs(weights['B'] - 0.5) < 0.01, 'B=' + weights['B']);
  }

  // ---- 组15: 时间衰减 — 60天 25% 衰减 + 1天内不衰减 ----
  console.log('[组15] 负反馈：60天 25% 衰减 + 1天内不衰减');
  {
    const { sandbox } = buildSandbox();
    const eng = loadEngine(sandbox);
    // 60 天前设置
    eng.saveRuleWeights({ 'test_decay2': { 'X':0.9 } });
    eng.saveRuleWeightsTs({ 'test_decay2': Date.now() - 60 * 86400000 });
    eng._applyTimeDecayToQuery('test_decay2');
    var weights = eng.getRuleWeights()['test_decay2'];
    // X: 0.5 + (0.9-0.5) * 0.25 = 0.5 + 0.1 = 0.6
    assert('X 60天后衰减到 0.6', Math.abs(weights['X'] - 0.6) < 0.01, 'X=' + weights['X']);
  }
  {
    const { sandbox } = buildSandbox();
    const eng = loadEngine(sandbox);
    // 0.5 天前设置（小于 1 天）
    eng.saveRuleWeights({ 'test_decay3': { 'Y':0.9 } });
    eng.saveRuleWeightsTs({ 'test_decay3': Date.now() - 0.5 * 86400000 });
    eng._applyTimeDecayToQuery('test_decay3');
    var weights = eng.getRuleWeights()['test_decay3'];
    // 1 天内不衰减
    assert('Y 0.5天内不衰减 → 0.9', Math.abs(weights['Y'] - 0.9) < 0.01, 'Y=' + weights['Y']);
  }

  // ---- 组16: 相似查询权重传递 ----
  console.log('[组16] 相似查询权重传递（前缀相同 + 字符重叠）');
  {
    const { sandbox } = buildSandbox();
    const eng = loadEngine(sandbox);
    // 预存相似查询 '发短信' 的偏好：A=0.9（强偏好）— 合并到同一 saveRuleWeights 调用
    eng.saveRuleWeights({
      '发短信': { 'A':0.9, 'B':0.5 },
      '发信息': { 'A':0.5, 'B':0.5 }
    });
    // 对 '发信息' 触发负反馈（点击 B）
    eng._applyNegativeFeedback({
      query: '发信息',
      candidates: [ { app:'A' }, { app:'B' } ]
    }, 'B');
    var weights = eng.getRuleWeights()['发信息'];
    // 相似传递：A 从 0.5 提升（继承 0.9 的 20%）→ +0.08 → 0.58
    // 然后 A 在负反馈中被忽略（首位×0.7）→ 0.5*0.7 = 0.35
    // 顺序：先忽略 → 0.35，再相似传递 → +0.08 = 0.43
    assert('A 相似传递+忽略扣 → 0.43（允许 0.40-0.45）',
      Math.abs(weights['A'] - 0.43) < 0.03, 'A=' + weights['A']);
    assert('B 被点击加分 → 0.62',
      Math.abs(weights['B'] - 0.62) < 0.01, 'B=' + weights['B']);
  }
  {
    const { sandbox } = buildSandbox();
    const eng = loadEngine(sandbox);
    // 验证 _isSimilarQuery 工具函数
    assert('相似: "发短信" vs "发信息"（前缀相同）',
      eng._isSimilarQuery('发短信', '发信息') === true);
    assert('相似: "购物" vs "购物车"（字符重叠 ≥50%）',
      eng._isSimilarQuery('购物', '购物车') === true);
    assert('不相似: "运动" vs "学习"',
      eng._isSimilarQuery('运动', '学习') === false);
    assert('相同: "微信" vs "微信"',
      eng._isSimilarQuery('微信', '微信') === true);
  }

  // ---- 组17: 全局偏好递增 ----
  console.log('[组17] 全局偏好递增（跨查询共享）');
  {
    const { sandbox } = buildSandbox();
    const eng = loadEngine(sandbox);
    eng._bumpGlobalPreference('微信');
    var pref = eng.getGlobalPreference();
    // 0.5 + 0.05 = 0.55
    assert('微信 首次点击 → 0.55', Math.abs(pref['微信'] - 0.55) < 0.001, 'prefs.微信=' + pref['微信']);
    // 第 4 次点击：0.5 + 0.05*4 = 0.70
    eng._bumpGlobalPreference('微信');
    eng._bumpGlobalPreference('微信');
    eng._bumpGlobalPreference('微信');
    pref = eng.getGlobalPreference();
    assert('微信 4次点击 → 0.70', Math.abs(pref['微信'] - 0.70) < 0.001, 'prefs.微信=' + pref['微信']);
    // 多次点击应该 clamp 在 1.0
    for(var i=0;i<20;i++) eng._bumpGlobalPreference('微信');
    pref = eng.getGlobalPreference();
    assert('微信 多次点击 clamp ≤ 1.0', pref['微信'] <= 1.0, 'prefs.微信=' + pref['微信']);
  }

  // ---- 组18: baseCatalog 新分类存在性 + 涵盖应用 ----
  console.log('[组18] baseCatalog v3.0 新分类存在性');
  {
    const { sandbox } = buildSandbox();
    const eng = loadEngine(sandbox);
    var cat = eng.baseCatalog();
    assert('input 分类存在', !!cat.input);
    assert('input 包含 搜狗输入法', cat.input.apps.indexOf('搜狗输入法') >= 0);
    assert('smart_home 分类存在', !!cat.smart_home);
    assert('smart_home 包含 米家', cat.smart_home.apps.indexOf('米家') >= 0);
    assert('cloud_drive 分类存在', !!cat.cloud_drive);
    assert('cloud_drive 包含 百度网盘', cat.cloud_drive.apps.indexOf('百度网盘') >= 0);
    assert('translation 分类存在', !!cat.translation);
    assert('translation 包含 网易有道词典', cat.translation.apps.indexOf('网易有道词典') >= 0);
    assert('education 分类存在', !!cat.education);
    assert('education 包含 作业帮', cat.education.apps.indexOf('作业帮') >= 0);
    assert('health 分类存在', !!cat.health);
    assert('health 包含 Keep', cat.health.apps.indexOf('Keep') >= 0);
    assert('delivery 分类存在', !!cat.delivery);
    assert('delivery 包含 顺丰速运', cat.delivery.apps.indexOf('顺丰速运') >= 0);
  }

  // ---- 组19: 性能基准 — 100次权重调整延迟 < 50ms ----
  console.log('[组19] 性能基准：100 次负反馈延迟');
  {
    const { sandbox } = buildSandbox();
    const eng = loadEngine(sandbox);
    eng.saveRuleWeights({ 'perf_test': { 'A':0.5, 'B':0.5, 'C':0.5 } });
    var record = { query:'perf_test', candidates:[ {app:'A'},{app:'B'},{app:'C'} ] };
    // 预热
    eng._applyNegativeFeedback(record, 'C');
    // 测量
    var N = 100;
    var start = Date.now();
    for(var i=0;i<N;i++){
      eng.saveRuleWeights({ 'perf_test': { 'A':0.5, 'B':0.5, 'C':0.5 } });
      eng._applyNegativeFeedback(record, 'C');
    }
    var elapsed = Date.now() - start;
    var avgMs = elapsed / N;
    assert('100次平均延迟 < 50ms（实际 ' + avgMs.toFixed(2) + 'ms）', avgMs < 50,
      'avg=' + avgMs.toFixed(2) + 'ms');
  }

  // ---- 组20: extractTokens 边界用例 ----
  console.log('[组20] extractTokens 边界用例');
  {
    const { sandbox } = buildSandbox();
    const eng = loadEngine(sandbox);
    // 空查询
    var t1 = eng.extractTokens('');
    assert('空查询 actions 空', t1.actions.length === 0);
    assert('空查询 intents 空', t1.intents.length === 0);
    // 纯符号
    var t2 = eng.extractTokens('!!!???');
    assert('纯符号 actions 空', t2.actions.length === 0);
    // 单字查询
    var t3 = eng.extractTokens('看');
    assert('"看" 识别 CONSUME 意图', t3.intents.indexOf('CONSUME') >= 0);
    // 超长查询（sanitizeQuery 会拦截，但 extractTokens 仍工作）
    var t4 = eng.extractTokens('打开微信然后发消息给张三并学习英语');
    assert('超长查询识别 OPEN 意图', t4.intents.indexOf('OPEN') >= 0);
    assert('超长查询识别 SEND 意图', t4.intents.indexOf('SEND') >= 0);
    assert('超长查询识别 LEARN 意图', t4.intents.indexOf('LEARN') >= 0);
  }

  // ---- 组21: 意图权重阈值 — 整同义词表大小 < 5KB（极轻量）----
  console.log('[组21] 同义词表轻量化验证');
  {
    const { sandbox } = buildSandbox();
    const eng = loadEngine(sandbox);
    var json = JSON.stringify(eng.intentSynonyms);
    var bytes = Buffer.byteLength(json, 'utf8');
    var kb = bytes / 1024;
    assert('同义词表 JSON 大小 < 5KB（实际 ' + kb.toFixed(2) + 'KB）', kb < 5, 'size=' + bytes + ' bytes');
    // 验证所有 11 个意图都存在
    var expectedIntents = ['SEND','CONSUME','CONTACT','TRAVEL','BUY','WORK','SEARCH','OPEN','INSTALL','HEALTH','LEARN'];
    var missing = expectedIntents.filter(function(k){ return !eng.intentSynonyms[k]; });
    assert('11 个意图类别完整（缺失: ' + JSON.stringify(missing) + '）', missing.length === 0);
  }

  // ---- 组22: v3.1 全局时间衰减（所有过期查询，不限于点击）----
  console.log('[组22] 全局时间衰减 _decayAllStaleQueries');
  {
    const { sandbox } = buildSandbox();
    const eng = loadEngine(sandbox);
    // 准备：2 个 30 天前的过期查询 + 1 个 0.5 天的非过期查询
    eng.saveRuleWeights({
      'maint_decay_a': { 'App1': 0.9, 'App2': 0.5 },
      'maint_decay_b': { 'App1': 0.95 },
      'maint_recent':  { 'App1': 0.9 }
    });
    eng.saveRuleWeightsTs({
      'maint_decay_a': Date.now() - 30 * 86400000,
      'maint_decay_b': Date.now() - 60 * 86400000,
      'maint_recent':  Date.now() - 0.5 * 86400000
    });
    var result = eng._decayAllStaleQueries();
    assert('全局衰减 totalChecked=3', result.totalChecked === 3, 'totalChecked=' + result.totalChecked);
    assert('全局衰减 decayedCount=2（仅2个过期查询）', result.decayedCount === 2, 'decayedCount=' + result.decayedCount);
    // 验证 30 天半衰：0.9 → 0.5+(0.9-0.5)*0.5=0.7
    var wa = eng.getRuleWeights()['maint_decay_a'];
    assert('maint_decay_a App1 30天衰减到 ~0.7', Math.abs(wa['App1'] - 0.7) < 0.01, 'App1=' + wa['App1']);
    // 60 天：0.95 → 0.5+(0.95-0.5)*0.25=0.6125
    var wb = eng.getRuleWeights()['maint_decay_b'];
    assert('maint_decay_b App1 60天衰减到 ~0.6125', Math.abs(wb['App1'] - 0.6125) < 0.01, 'App1=' + wb['App1']);
    // 0.5 天不衰减
    var wr = eng.getRuleWeights()['maint_recent'];
    assert('maint_recent App1 0.5天不衰减保持 0.9', Math.abs(wr['App1'] - 0.9) < 0.001, 'App1=' + wr['App1']);
  }

  // ---- 组23: v3.1 链式边修剪 _pruneChainStore ----
  console.log('[组23] 链式边修剪 _pruneChainStore');
  {
    const { sandbox } = buildSandbox();
    const eng = loadEngine(sandbox);
    // 模拟 25 条边的链：A 节点有 25 个 toKey
    var edges = { 'app:A': {} };
    for(var i=0;i<25;i++){
      edges['app:A']['app:B'+i] = i + 1; // 权重从 1 到 25
    }
    eng.saveChainStore({ edges: edges, lastAction: 'app:A' });
    var result = eng._pruneChainStore();
    // 阶段 1：每节点上限 20，A 节点保留权重最高的 20 条
    var store = eng.getChainStore();
    var aEdges = store.edges['app:A'] || {};
    assert('A 节点被修剪到 20 条边', Object.keys(aEdges).length === 20, 'remaining=' + Object.keys(aEdges).length);
    // 保留的应该是权重最高的 20 条：app:B5..app:B24 (权重 6..25)
    assert('保留的边为高权重（B24权重25）', (aEdges['app:B24'] || 0) === 25, 'B24=' + aEdges['app:B24']);
    assert('被剪掉的边为低权重（B4权重5）', !aEdges['app:B4'], 'B4 still exists');
    assert('剪掉 5 条低权重边', result.prunedEdges === 5, 'pruned=' + result.prunedEdges);
  }

  // ---- 组24: v3.1 链式边修剪 — 总边数超限 ----
  console.log('[组24] 链式边修剪：总边数超限截断');
  {
    const { sandbox } = buildSandbox();
    const eng = loadEngine(sandbox);
    // 通过 _recordActionEdge 填入超过 CHAIN_MAX_EDGES 的边
    // 但直接 saveChainStore 更高效
    var edges = {};
    for(var f=0;f<30;f++){
      edges['app:F'+f] = {};
      for(var t=0;t<20;t++){
        // 30*20=600 条边，超过 500
        edges['app:F'+f]['app:T'+t] = ((f+1) * (t+1)) % 100 + 1;
      }
    }
    eng.saveChainStore({ edges: edges, lastAction: 'app:F0' });
    var result = eng._pruneChainStore();
    var store = eng.getChainStore();
    var totalRemaining = 0;
    Object.keys(store.edges).forEach(function(fk){
      totalRemaining += Object.keys(store.edges[fk]).length;
    });
    assert('总边数被截断到 500', totalRemaining === 500, 'remaining=' + totalRemaining);
    assert('剪掉了 100 条边', result.prunedEdges === 100, 'pruned=' + result.prunedEdges);
  }

  // ---- 组25: v3.1 旧记忆修剪 _pruneOldMemory ----
  console.log('[组25] 旧记忆修剪 _pruneOldMemory');
  {
    const { sandbox } = buildSandbox();
    const eng = loadEngine(sandbox);
    // 准备 5 条记忆：3 条 100 天前（应被修剪）+ 2 条 10 天前（应保留）
    var memory = [];
    for(var i=0;i<3;i++){
      memory.push({
        id: 'old_'+i, query: 'old_q_'+i, candidates: [],
        timestamp: Date.now() - 100 * 86400000
      });
    }
    for(var j=0;j<2;j++){
      memory.push({
        id: 'new_'+j, query: 'new_q_'+j, candidates: [],
        timestamp: Date.now() - 10 * 86400000
      });
    }
    eng.saveMemory(memory);
    var result = eng._pruneOldMemory();
    assert('剪掉 3 条 100 天前的旧记录', result.pruned === 3, 'pruned=' + result.pruned);
    assert('保留 2 条 10 天内的记录', result.remaining === 2, 'remaining=' + result.remaining);
    var mem = eng.getMemory();
    assert('memory 数组实际只保留 2 条', mem.length === 2, 'mem.length=' + mem.length);
    assert('保留的为 new_0', mem[0].id === 'new_0', 'mem[0].id=' + mem[0].id);
  }

  // ---- 组26: v3.1 maintain() 集成验证 ----
  console.log('[组26] maintain() 集成：一次性执行所有维护步骤');
  {
    const { sandbox } = buildSandbox();
    const eng = loadEngine(sandbox);
    // 准备混合状态：过期权重 + 大量链式边 + 旧记忆
    eng.saveRuleWeights({ 'mt_a': { 'App1': 0.9 } });
    eng.saveRuleWeightsTs({ 'mt_a': Date.now() - 30 * 86400000 });
    // 准备 30 个 from-key × 20 个 to-key = 600 条边（>500 上限，需被截断）
    var heavyEdges = {};
    for(var f=0;f<30;f++){
      heavyEdges['app:MF'+f] = {};
      for(var t=0;t<20;t++){
        heavyEdges['app:MF'+f]['app:MT'+t] = (f+1)*(t+1);
      }
    }
    eng.saveChainStore({ edges: heavyEdges, lastAction: 'app:MF0' });
    var oldMemory = [];
    for(var k=0;k<3;k++){
      oldMemory.push({ id:'mt_old_'+k, query:'q_'+k, candidates:[], timestamp:Date.now() - 100*86400000 });
    }
    eng.saveMemory(oldMemory);
    var result = eng.maintain();
    assert('maintain 返回 decayedQueries >= 1', result.decayedQueries >= 1, 'decayed=' + result.decayedQueries);
    assert('maintain 返回 prunedChainEdges > 0（600→500 应剪100）', result.prunedChainEdges > 0, 'pruned=' + result.prunedChainEdges);
    assert('maintain 返回 prunedMemoryRecords = 3', result.prunedMemoryRecords === 3, 'pruned=' + result.prunedMemoryRecords);
    assert('maintain 包含 ts 时间戳', typeof result.ts === 'number' && result.ts > 0, 'ts=' + result.ts);
    // 验证整体状态已清理
    var afterMem = eng.getMemory();
    assert('maintain 后 memory 已清空', afterMem.length === 0, 'mem.length=' + afterMem.length);
    var afterChain = eng.getChainStore();
    var totalAfter = 0;
    Object.keys(afterChain.edges).forEach(function(fk){ totalAfter += Object.keys(afterChain.edges[fk]).length; });
    assert('maintain 后链式边数 ≤ 500', totalAfter <= 500, 'totalAfter=' + totalAfter);
  }

  // ---- 组27: v3.1 maintain() 容错性 — 空状态下不报错 ----
  console.log('[组27] maintain() 容错性：空状态不报错');
  {
    const { sandbox } = buildSandbox();
    const eng = loadEngine(sandbox);
    // 完全空状态
    var result = eng.maintain();
    assert('空状态 decayedQueries=0', result.decayedQueries === 0, 'decayed=' + result.decayedQueries);
    assert('空状态 totalQueriesChecked=0', result.totalQueriesChecked === 0, 'totalChecked=' + result.totalQueriesChecked);
    assert('空状态 prunedChainEdges=0', result.prunedChainEdges === 0, 'pruned=' + result.prunedChainEdges);
    assert('空状态 prunedMemoryRecords=0', result.prunedMemoryRecords === 0, 'pruned=' + result.prunedMemoryRecords);
    assert('空状态 remainingChainEdges=0', result.remainingChainEdges === 0, 'remaining=' + result.remainingChainEdges);
    assert('空状态 remainingMemory=0', result.remainingMemory === 0, 'remaining=' + result.remainingMemory);
  }

  // ---- 组28: v3.1 链式边修剪 — 清理零权重边 ----
  console.log('[组28] 链式边修剪：清理权重为 0 的边');
  {
    const { sandbox } = buildSandbox();
    const eng = loadEngine(sandbox);
    // 准备：A→B 权重 5，A→C 权重 0（应被清理，因为 < 1）
    eng.saveChainStore({
      edges: { 'app:A': { 'app:B': 5, 'app:C': 0 } },
      lastAction: 'app:A'
    });
    var result = eng._pruneChainStore();
    var store = eng.getChainStore();
    var aEdges = store.edges['app:A'] || {};
    assert('权重 0 的边被清理', !aEdges['app:C'], 'C still exists');
    assert('权重 5 的边被保留', (aEdges['app:B'] || 0) === 5, 'B=' + aEdges['app:B']);
    assert('剪掉 1 条边', result.prunedEdges === 1, 'pruned=' + result.prunedEdges);
  }

  // ---- 组29: v3.0 新意图多意图场景（真实查询同时命中多个意图）----
  console.log('[组29] 新意图多意图场景：真实复合查询');
  {
    const { sandbox } = buildSandbox();
    const eng = loadEngine(sandbox);
    // "打开微信学英语" — OPEN + LEARN
    var t1 = eng.extractTokens('打开微信学英语');
    assert('"打开微信学英语" 同时识别 OPEN', t1.intents.indexOf('OPEN') >= 0);
    assert('"打开微信学英语" 同时识别 LEARN', t1.intents.indexOf('LEARN') >= 0);
    // "跑步时听音乐" — HEALTH + CONSUME
    var t2 = eng.extractTokens('跑步时听音乐');
    assert('"跑步时听音乐" 同时识别 HEALTH', t2.intents.indexOf('HEALTH') >= 0);
    assert('"跑步时听音乐" 同时识别 CONSUME', t2.intents.indexOf('CONSUME') >= 0);
    // "下载app学英语" — INSTALL + LEARN
    var t3 = eng.extractTokens('下载app学英语');
    assert('"下载app学英语" 同时识别 INSTALL', t3.intents.indexOf('INSTALL') >= 0);
    assert('"下载app学英语" 同时识别 LEARN', t3.intents.indexOf('LEARN') >= 0);
    // "搜下餐厅" — 仅 SEARCH（餐厅搜索不蕴含购买意图）
    var t4 = eng.extractTokens('搜下餐厅');
    assert('"搜下餐厅" 识别 SEARCH', t4.intents.indexOf('SEARCH') >= 0);
    assert('"搜下餐厅" 不应误判 BUY', t4.intents.indexOf('BUY') < 0);
    // "搜下餐厅吃饭" — SEARCH + BUY（明确表达要吃饭）
    var t4b = eng.extractTokens('搜下餐厅吃饭');
    assert('"搜下餐厅吃饭" 同时识别 SEARCH', t4b.intents.indexOf('SEARCH') >= 0);
    assert('"搜下餐厅吃饭" 同时识别 BUY', t4b.intents.indexOf('BUY') >= 0);
    // "起微信学日语" — OPEN + LEARN
    var t5 = eng.extractTokens('起微信学日语');
    assert('"起微信学日语" 同时识别 OPEN', t5.intents.indexOf('OPEN') >= 0);
    assert('"起微信学日语" 同时识别 LEARN', t5.intents.indexOf('LEARN') >= 0);
  }

  // ---- 组30: v3.0 新意图歧义场景（同一词在不同上下文）----
  console.log('[组30] 新意图歧义场景：同一词不同上下文');
  {
    const { sandbox } = buildSandbox();
    // "运动视频教程" — CONSUME（视频观看） + HEALTH（运动）+ LEARN（教程）
    const eng = loadEngine(sandbox);
    // "运动" 在不同查询中归属不同意图
    var t1 = eng.extractTokens('晚上去运动');          // → HEALTH
    assert('"晚上去运动" 识别 HEALTH', t1.intents.indexOf('HEALTH') >= 0);
    var t2 = eng.extractTokens('运动视频教程');         // → CONSUME（视频观看）
    assert('"运动视频教程" 识别 CONSUME', t2.intents.indexOf('CONSUME') >= 0);
    assert('"运动视频教程" 识别 HEALTH', t2.intents.indexOf('HEALTH') >= 0);
    assert('"运动视频教程" 识别 LEARN', t2.intents.indexOf('LEARN') >= 0);
    // "看" 在不同查询中归属不同意图
    var t3 = eng.extractTokens('看剧');                  // → CONSUME
    assert('"看剧" 识别 CONSUME', t3.intents.indexOf('CONSUME') >= 0);
    var t4 = eng.extractTokens('看教程学');             // → LEARN（学）也含 CONSUME
    assert('"看教程学" 识别 LEARN', t4.intents.indexOf('LEARN') >= 0);
    assert('"看教程学" 识别 CONSUME', t4.intents.indexOf('CONSUME') >= 0);
    // "学" 在不同查询中归属不同意图
    var t5 = eng.extractTokens('学英语');                // → LEARN
    assert('"学英语" 识别 LEARN', t5.intents.indexOf('LEARN') >= 0);
    var t6 = eng.extractTokens('学做饭');                // → LEARN + BUY
    assert('"学做饭" 识别 LEARN', t6.intents.indexOf('LEARN') >= 0);
    assert('"学做饭" 识别 BUY', t6.intents.indexOf('BUY') >= 0);
  }

  // ---- 组31: v3.0 新意图 extractTokens 边界用例 ----
  console.log('[组31] 新意图 extractTokens 边界用例');
  {
    const { sandbox } = buildSandbox();
    const eng = loadEngine(sandbox);
    // 纯单字查询
    var t1 = eng.extractTokens('搜');
    assert('"搜" 单字识别 SEARCH', t1.intents.indexOf('SEARCH') >= 0);
    var t2 = eng.extractTokens('装');
    assert('"装" 单字识别 INSTALL', t2.intents.indexOf('INSTALL') >= 0);
    // 句首新意图词
    var t3 = eng.extractTokens('搜一下附近的咖啡店');
    assert('"搜一下附近的咖啡店" 识别 SEARCH', t3.intents.indexOf('SEARCH') >= 0);
    // 句中新意图词
    var t4 = eng.extractTokens('我想要搜下文档');
    assert('"我想要搜下文档" 识别 SEARCH', t4.intents.indexOf('SEARCH') >= 0);
    // 句末新意图词
    var t5 = eng.extractTokens('帮我查一下');
    assert('"帮我查一下" 识别 SEARCH', t5.intents.indexOf('SEARCH') >= 0);
    // 多新意图词连续出现
    var t6 = eng.extractTokens('搜一下下载');
    assert('"搜一下下载" 同时识别 SEARCH+INSTALL', t6.intents.indexOf('SEARCH') >= 0 && t6.intents.indexOf('INSTALL') >= 0);
    // 纯动作词无目标
    var t7 = eng.extractTokens('打开');
    assert('"打开" 识别 OPEN', t7.intents.indexOf('OPEN') >= 0);
  }

  // ---- 组32: v3.0 新意图性能基准 ----
  console.log('[组32] 新意图性能基准：1000 次 extractTokens < 50ms');
  {
    const { sandbox } = buildSandbox();
    const eng = loadEngine(sandbox);
    // 预热
    for(var w=0;w<10;w++) eng.extractTokens('搜一下打开微信');
    var testQueries = [
      '搜一下', '打开微信', '下载个新app', '晚上去跑步', '背单词',
      '搜下餐厅', '起微信学日语', '下载app学英语', '跑步时听音乐', '查下文档',
      '装个新游戏', '学英语背单词', '锻炼身体', '运动视频教程', '看教程学',
      '搜个附近的咖啡店', '拉起淘宝', '装一个微信', '走路', '看网课'
    ];
    var N = 1000;
    var t0 = process.hrtime.bigint();
    for(var i=0;i<N;i++){
      eng.extractTokens(testQueries[i % testQueries.length]);
    }
    var t1 = process.hrtime.bigint();
    var totalMs = Number(t1 - t0) / 1e6;
    var avgMs = totalMs / N;
    assert('1000次新意图extractTokens < 50ms (实际 ' + totalMs.toFixed(2) + 'ms)',
      totalMs < 50, 'total=' + totalMs.toFixed(2) + 'ms');
    assert('单次平均 < 0.1ms (实际 ' + (avgMs*1000).toFixed(2) + 'μs)',
      avgMs < 0.1, 'avg=' + avgMs.toFixed(4) + 'ms');
  }

  // ---- 组33: v3.0.1 同义词表轻量化验证（更新阈值）----
  console.log('[组33] 同义词表轻量化验证（含 v3.0.1 扩充）');
  {
    const { sandbox } = buildSandbox();
    const eng = loadEngine(sandbox);
    var json = JSON.stringify(eng.intentSynonyms);
    var bytes = Buffer.byteLength(json, 'utf8');
    var kb = bytes / 1024;
    assert('同义词表 JSON 大小 < 5KB（实际 ' + kb.toFixed(2) + 'KB）', kb < 5, 'size=' + bytes + ' bytes');
    // 验证扩充后每个新意图数量合理
    assert('SEARCH 扩充后 ≥ 20 个同义词', eng.intentSynonyms.SEARCH.length >= 20, 'len=' + eng.intentSynonyms.SEARCH.length);
    assert('OPEN 扩充后 ≥ 15 个同义词', eng.intentSynonyms.OPEN.length >= 15, 'len=' + eng.intentSynonyms.OPEN.length);
    assert('INSTALL 扩充后 ≥ 15 个同义词', eng.intentSynonyms.INSTALL.length >= 15, 'len=' + eng.intentSynonyms.INSTALL.length);
    assert('HEALTH 扩充后 ≥ 20 个同义词', eng.intentSynonyms.HEALTH.length >= 20, 'len=' + eng.intentSynonyms.HEALTH.length);
    assert('LEARN 扩充后 ≥ 20 个同义词', eng.intentSynonyms.LEARN.length >= 20, 'len=' + eng.intentSynonyms.LEARN.length);
    // 11 个意图完整
    var expectedIntents = ['SEND','CONSUME','CONTACT','TRAVEL','BUY','WORK','SEARCH','OPEN','INSTALL','HEALTH','LEARN'];
    var missing = expectedIntents.filter(function(k){ return !eng.intentSynonyms[k]; });
    assert('11 个意图类别完整（缺失: ' + JSON.stringify(missing) + '）', missing.length === 0);
  }

  console.log('\n----------------------------------------');
  console.log('通过: ' + pass + ' / 失败: ' + fail);
  if(failures.length > 0){
    console.log('\n失败用例:');
    failures.forEach(function(f){ console.log('  - ' + f); });
  }
  console.log('----------------------------------------');
  process.exit(fail > 0 ? 1 : 0);
}

run();
