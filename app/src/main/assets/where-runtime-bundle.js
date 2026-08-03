/* Generated from goto-where/Javascript/runtime/index.js. Do not edit. */
(function(global){
  'use strict';
  var modules = Object.create(null);
  modules["runtime/index.js"] = function(module, exports, require){
'use strict';

/**
 * GOTO Where — JavaScript 参考运行时入口
 *
 * 统一导出 Core 模块和 Port 内存实现，便于测试和集成。
 *
 * 设计原则：
 *   - 平台无关：不引用 Android API
 *   - 单一权威实现：runtime/javascript/ 是 JS 唯一权威运行时
 *   - 薄适配器：HOST 提供的真实适配器应包装在 ports/ 接口下
 */

const { CandidateGenerator } = require('../core/candidate-generator.js');
const { ReminderScorer, DEFAULT_CONFIG: SCORER_CONFIG } = require('../core/reminder-scorer.js');
const { TimingPolicy, DEFAULT_CONFIG: TIMING_CONFIG } = require('../core/timing-policy.js');
const { InterruptionPolicy, DEFAULT_CONFIG: INTERRUPTION_CONFIG } = require('../core/interruption-policy.js');
const { ReminderDecisionEngine } = require('../core/reminder-decision-engine.js');
const { FeedbackProcessor } = require('../core/feedback-processor.js');
const { ContextEnricher } = require('../core/context-enricher.js');
const { FileVectorIndexBuilder, DEFAULT_CHUNKING_CONFIG } = require('../core/file-vector-index-builder.js');
const { InMemoryScheduler } = require('./in-memory-scheduler.js');
const { InMemoryDeliveryAdapter } = require('./in-memory-delivery-adapter.js');
const { WhereRuntime } = require('./where-runtime.js');

// Port 抽象类
const { BaseReader } = require('../ports/base-reader.js');
const { BaseWriter } = require('../ports/base-writer.js');
const { SignalSource } = require('../ports/signal-source.js');
const { ClockPort } = require('../ports/clock-port.js');
const { DeliveryPort } = require('../ports/delivery-port.js');
const { SchedulerPort } = require('../ports/scheduler-port.js');

module.exports = {
  // Core
  CandidateGenerator,
  ReminderScorer,
  TimingPolicy,
  InterruptionPolicy,
  ReminderDecisionEngine,
  FeedbackProcessor,
  ContextEnricher,
  FileVectorIndexBuilder,

  // Runtime
  WhereRuntime,
  InMemoryScheduler,
  InMemoryDeliveryAdapter,

  // Port abstract classes
  BaseReader,
  BaseWriter,
  SignalSource,
  ClockPort,
  DeliveryPort,
  SchedulerPort,

  // Default configs
  configs: {
    scorer: SCORER_CONFIG,
    timing: TIMING_CONFIG,
    interruption: INTERRUPTION_CONFIG,
    chunking: DEFAULT_CHUNKING_CONFIG
  }
};

  };
  modules["core/candidate-generator.js"] = function(module, exports, require){
'use strict';

/**
 * CandidateGenerator — 提醒候选生成器
 *
 * 根据 ContextSignal + 多种 Pattern 生成 ReminderCandidate。
 *
 * 第一版候选来源：
 *   A. timing-pattern    时间使用模式（工作日 8:40 常打开地图）
 *   B. app-transition    应用转移模式（相机 → 小红书）
 *   C. goto-internal     GOTO 内部行为模式（晚上经常搜索"复盘"）
 *   D. user-created      用户主动创建的宽松提醒（"晚上提醒我复盘"）
 *
 * 平台无关：不引用 Android API。所有外部数据通过 BaseReader / 构造参数注入。
 */

/**
 * 生成 UUID v4（用于 candidateId）。
 */
function genId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'c-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
}

class CandidateGenerator {
  /**
   * @param {object} opts
   *   - {number} [timingWindowMinutes=30] 时间模式窗口（前后 N 分钟内视为命中）
   *   - {function} [idGen] 自定义 ID 生成器（测试用）
   *   - {function} [now] 自定义时间函数（测试用，返回 ISO 字符串）
   */
  constructor(opts = {}) {
    this._timingWindow = opts.timingWindowMinutes != null ? opts.timingWindowMinutes : 30;
    this._idGen = opts.idGen || genId;
    this._now = opts.now || (() => new Date().toISOString());
  }

  /**
   * 生成候选。
   * @param {object} params
   *   - {object} signals ContextSignal
   *   - {Array<object>} [timingPatterns] TimingPattern[]
   *   - {Array<object>} [transitionPatterns] AppTransitionPattern[]
   *   - {Array<object>} [gotoInternalPatterns] 自定义结构 { query, typicalHour, typicalMinute, confidence, packageName? }
   *   - {Array<object>} [userCreatedRules] 自定义结构 { ruleId, title, packageName?, deliverAt, confidence? }
   *   - {Array<object>} [smartRankingHints] 个人层智能排名候选 { packageName, score, source? }
   * @returns {Promise<Array<object>>} ReminderCandidate[]
   */
  async generate({
    signals,
    timingPatterns = [],
    transitionPatterns = [],
    gotoInternalPatterns = [],
    userCreatedRules = [],
    smartRankingHints = []
  } = {}) {
    const now = this._now();
    const candidates = [];

    // A. 时间使用模式
    for (const p of timingPatterns || []) {
      const candidate = this._fromTimingPattern(p, signals, now);
      if (candidate) candidates.push(candidate);
    }

    // B. 应用转移模式
    for (const p of transitionPatterns || []) {
      const candidate = this._fromAppTransition(p, signals, now);
      if (candidate) candidates.push(candidate);
    }

    // C. GOTO 内部行为模式
    for (const p of gotoInternalPatterns || []) {
      const candidate = this._fromGotoInternal(p, signals, now);
      if (candidate) candidates.push(candidate);
    }

    // D. 用户主动创建的宽松提醒
    for (const r of userCreatedRules || []) {
      const candidate = this._fromUserCreated(r, signals, now);
      if (candidate) candidates.push(candidate);
    }

    // E. 个人层智能排名候选（来自 HourlyRankingBuilder.smartRanking）
    // 仅注入未与 A/B/C/D 重复的候选（避免同包名重复）
    const existingPackages = new Set(candidates.map(c => c.packageName).filter(Boolean));
    for (const hint of smartRankingHints || []) {
      if (!hint || !hint.packageName) continue;
      if (existingPackages.has(hint.packageName)) continue;
      candidates.push(this._fromSmartRankingHint(hint, now));
      existingPackages.add(hint.packageName);
    }

    return candidates;
  }

  /**
   * E. 个人层智能排名候选（来自 HourlyRankingBuilder.smartRanking）。
   *
   * 与 A/B/C/D 不同，smartRanking 不依赖时间窗口命中，
   * 而是基于"当前时段 + weekday + 近期权重的融合分"直接注入。
   * confidence 由 hint.score 归一化（0..1）。
   */
  _fromSmartRankingHint(hint, nowIso) {
    const score = typeof hint.score === 'number' ? Math.max(0, Math.min(1, hint.score)) : 0.5;
    return {
      candidateId: this._idGen(),
      ruleId: 'smart-ranking:' + hint.packageName,
      packageName: hint.packageName,
      title: `GOTO: ${hint.packageName}`,
      subtitle: 'smart ranking hint',
      source: 'user-created',  // 复用 user-created 作为宽松来源
      confidence: score,
      generatedAt: nowIso
      // 不设置 timingPattern：smartRanking 候选不强制时间窗口，由 Scorer 评分 + InterruptionPolicy 决定
    };
  }

  /**
   * A. 时间使用模式生成候选。
   * 命中条件：当前时间在 typicalHour:typicalMinute 的窗口内（前后 _timingWindow 分钟）。
   */
  _fromTimingPattern(pattern, signals, nowIso) {
    if (!pattern || !pattern.packageName) return null;
    if (typeof pattern.typicalHour !== 'number') return null;

    const weekdayOk = this._weekdayMatch(pattern, signals);
    const timeOk = this._timeWithinWindow(
      signals.hour, signals.minute,
      pattern.typicalHour, pattern.typicalMinute || 0,
      this._timingWindow
    );
    if (!weekdayOk || !timeOk) return null;

    return {
      candidateId: this._idGen(),
      ruleId: 'timing:' + pattern.packageName,
      packageName: pattern.packageName,
      title: pattern.title || `打开 ${pattern.packageName}`,
      subtitle: pattern.subtitle,
      source: 'timing-pattern',
      confidence: typeof pattern.confidence === 'number' ? pattern.confidence : 0.5,
      timingPattern: pattern,
      generatedAt: nowIso,
      expiresAt: this._expiresAt(signals, pattern.typicalHour, pattern.typicalMinute || 0)
    };
  }

  /**
   * B. 应用转移模式生成候选。
   * 命中条件：当前前台应用 = pattern.fromPackageName（视为"刚结束"或"正在使用"）。
   */
  _fromAppTransition(pattern, signals, nowIso) {
    if (!pattern || !pattern.fromPackageName || !pattern.toPackageName) return null;
    if (signals.foregroundPackageName !== pattern.fromPackageName) return null;

    return {
      candidateId: this._idGen(),
      ruleId: `transition:${pattern.fromPackageName}->${pattern.toPackageName}`,
      packageName: pattern.toPackageName,
      title: pattern.title || `打开 ${pattern.toPackageName}`,
      subtitle: pattern.subtitle,
      source: 'app-transition',
      confidence: typeof pattern.confidence === 'number' ? pattern.confidence : 0.5,
      appTransition: pattern,
      generatedAt: nowIso,
      expiresAt: this._expiresAt(signals, signals.hour, (signals.minute + 5) % 60)
    };
  }

  /**
   * C. GOTO 内部行为模式生成候选。
   * 例如：每天晚上经常搜索"复盘" → 生成 GOTO 内部卡片候选。
   * 命中条件：当前时间在 typicalHour 窗口内。
   */
  _fromGotoInternal(pattern, signals, nowIso) {
    if (!pattern || !pattern.query) return null;
    if (typeof pattern.typicalHour !== 'number') return null;

    const timeOk = this._timeWithinWindow(
      signals.hour, signals.minute,
      pattern.typicalHour, pattern.typicalMinute || 0,
      this._timingWindow
    );
    if (!timeOk) return null;

    return {
      candidateId: this._idGen(),
      ruleId: `goto-internal:${pattern.query}`,
      packageName: pattern.packageName || 'com.goto.internal',
      title: pattern.title || `GOTO: ${pattern.query}`,
      subtitle: pattern.subtitle || pattern.query,
      source: 'goto-internal',
      confidence: typeof pattern.confidence === 'number' ? pattern.confidence : 0.5,
      timingPattern: {
        packageName: pattern.packageName || 'com.goto.internal',
        typicalHour: pattern.typicalHour,
        typicalMinute: pattern.typicalMinute || 0,
        confidence: pattern.confidence || 0.5,
        sampleCount: pattern.sampleCount || 0
      },
      generatedAt: nowIso,
      expiresAt: this._expiresAt(signals, pattern.typicalHour, pattern.typicalMinute || 0)
    };
  }

  /**
   * D. 用户主动创建的宽松提醒。
   * 直接生成候选，不强制时间窗口（由 TimingPolicy 判断）。
   */
  _fromUserCreated(rule, signals, nowIso) {
    if (!rule || !rule.ruleId || !rule.title) return null;

    return {
      candidateId: this._idGen(),
      ruleId: rule.ruleId,
      packageName: rule.packageName || 'com.goto.internal',
      title: rule.title,
      subtitle: rule.subtitle,
      source: 'user-created',
      confidence: typeof rule.confidence === 'number' ? rule.confidence : 0.9,
      timingPattern: rule.deliverAt ? {
        typicalHour: rule.deliverAt.hour,
        typicalMinute: rule.deliverAt.minute,
        confidence: 1.0,
        sampleCount: 1
      } : null,
      generatedAt: nowIso,
      expiresAt: rule.expiresAt || null
    };
  }

  // ====== 工具方法 ======

  _weekdayMatch(pattern, signals) {
    if (!Array.isArray(pattern.weekdayPattern) || pattern.weekdayPattern.length !== 7) {
      return true; // 无 weekday 限制 → 全周允许
    }
    const day = signals.weekday;
    if (typeof day !== 'number') return true;
    return !!pattern.weekdayPattern[day];
  }

  _timeWithinWindow(nowH, nowM, targetH, targetM, windowMinutes) {
    if (typeof nowH !== 'number' || typeof nowM !== 'number') return false;
    const nowMin = nowH * 60 + nowM;
    const targetMin = targetH * 60 + (targetM || 0);
    const diff = Math.abs(nowMin - targetMin);
    // 跨午夜容忍（例如 23:50 vs 00:10）
    const circular = Math.min(diff, 24 * 60 - diff);
    return circular <= windowMinutes;
  }

  _expiresAt(signals, targetH, targetM) {
    if (typeof signals.hour !== 'number') return null;
    const nowMin = signals.hour * 60 + (signals.minute || 0);
    const targetMin = targetH * 60 + (targetM || 0);
    let diff = targetMin - nowMin;
    if (diff < 0) diff += 24 * 60;
    // 过期时间 = 目标时间 + 窗口
    const expires = new Date(Date.now() + (diff + this._timingWindow) * 60 * 1000);
    return expires.toISOString();
  }
}

module.exports = { CandidateGenerator };

  };
  modules["core/reminder-scorer.js"] = function(module, exports, require){
'use strict';

/**
 * ReminderScorer — 提醒评分器
 *
 * 综合 confidence × expectedValue × 历史反馈，为每个 ReminderCandidate 计算
 * 最终 score。
 *
 * 评分公式：
 *   simpleMode=true（默认）：
 *     score = baseConfidence × weight × ignorePenalty
 *     - weight 来自 preference.weight（默认 0.5）
 *     - ignorePenalty = max(0, 1 - ignoreCount × 0.15)，5 次归零
 *
 *   simpleMode=false（保留原始公式）：
 *     successProbability = baseConfidence
 *                       × priorityWeight
 *                       × (1 - consecutiveIgnorePenalty)
 *                       × openedBonus
 *                       × recencyDecay
 *     expectedValue     = successProbability × userValue
 *     score             = expectedValue
 *
 * 平台无关，不引用 Android API。
 */

const PRIORITY_WEIGHT = {
  low: 0.6,
  normal: 1.0,
  high: 1.3
};

const DEFAULT_CONFIG = {
  // 连续忽略惩罚：每次忽略降低 successProbability 的比例
  consecutiveIgnorePenaltyRate: 0.15,
  // 连续忽略上限：超过此次数后 expectedValue 直接归零
  consecutiveIgnoreMax: 5,
  // 打开反馈加成
  openedBonusPerOpen: 0.05,
  openedBonusMax: 0.25,
  // 时间衰减（近期反馈权重更高）
  recencyHalfLifeHours: 168, // 7 天
  // 最低 userValue（避免完全归零）
  userValueFloor: 0.05
};

class ReminderScorer {
  /**
   * @param {object} [config] 覆盖默认配置
   * @param {function} [now] 自定义时间函数（测试用，返回 ISO 字符串）
   */
  constructor(config = {}, now, simpleMode = true) {
    this._config = Object.assign({}, DEFAULT_CONFIG, config);
    this._now = now || (() => new Date().toISOString());
    this._simpleMode = simpleMode;
  }

  /**
   * 为候选打分。
   * @param {object} params
   *   - {Array<object>} candidates ReminderCandidate[]
   *   - {Map<string, object>} preferences ruleId → ReminderPreference
   *   - {Array<object>} recentFeedback ReminderFeedback[]（最近 N 条）
   *   - {number} [globalDeviceFactor=1.0] 设备层全局调整因子
   *   - {object} [categoryFactors={}] 按类别调整因子
   *   - {Map<string, object>} [feedbackHitRates] packageName → { hitRate }
   *   - {Map<string, string>} [packageCategories] packageName → category 映射
   * @returns {Promise<Array<object>>} candidates with confidence + expectedValue + score
   */
  async score({
    candidates = [],
    preferences = new Map(),
    recentFeedback = [],
    globalDeviceFactor = 1.0,
    categoryFactors = {},
    feedbackHitRates = new Map(),
    packageCategories = new Map()
  } = {}) {
    const feedbackByRule = this._groupFeedbackByRule(recentFeedback);
    const out = [];

    for (const c of candidates) {
      const pref = preferences.get(c.ruleId) || {
        ruleId: c.ruleId,
        enabled: true,
        priority: 'normal',
        consecutiveIgnoreCount: 0,
        weight: 0.5
      };

      const ruleFeedback = feedbackByRule.get(c.ruleId) || [];

      // 反馈链命中率降权（命中率 < 0.5 时降权，0→0.7，0.5→1.0）
      const hitRateEntry = feedbackHitRates.get(c.packageName);
      const hitRate = hitRateEntry ? hitRateEntry.hitRate : null;
      const hitRateFactor = (hitRate == null)
        ? 1.0
        : (hitRate >= 0.5 ? 1.0 : 0.7 + 0.3 * (hitRate / 0.5));

      // 类别因子：通过 packageCategories 查找候选所属类别
      const category = packageCategories.get(c.packageName);
      const categoryFactor = (category && categoryFactors[category] != null)
        ? categoryFactors[category]
        : 1.0;

      const scored = this._scoreOne(c, pref, ruleFeedback, globalDeviceFactor, hitRateFactor, categoryFactor);
      out.push(scored);
    }

    // 按 score 降序
    out.sort((a, b) => (b.score || 0) - (a.score || 0));
    return out;
  }

  _scoreOne(candidate, preference, ruleFeedback, globalDeviceFactor = 1.0, hitRateFactor = 1.0, categoryFactor = 1.0) {
    const config = this._config;
    const baseConfidence = typeof candidate.confidence === 'number' ? candidate.confidence : 0.5;
    const weight = (preference.weight != null) ? preference.weight : 0.5;

    if (this._simpleMode) {
      // 简化评分：score = baseConfidence × weight × ignorePenalty × deviceFactor × hitRateFactor × categoryFactor
      const ignoreCount = preference.consecutiveIgnoreCount || 0;
      const ignorePenalty = ignoreCount >= 5
        ? 0
        : Math.max(0, 1 - ignoreCount * 0.15);
      const rawScore = baseConfidence * weight * ignorePenalty;
      // 三层联动：设备因子 + 命中率因子 + 类别因子
      const score = rawScore * globalDeviceFactor * hitRateFactor * categoryFactor;

      return Object.assign({}, candidate, {
        confidence: baseConfidence,
        expectedValue: score,
        score,
        scoringTrace: {
          baseConfidence,
          weight,
          ignoreCount,
          ignorePenalty,
          globalDeviceFactor,
          hitRateFactor,
          categoryFactor,
          successProbability: score
        }
      });
    }

    // 原始评分公式（simpleMode = false）
    // 1. 优先级权重
    const priorityWeight = PRIORITY_WEIGHT[preference.priority || 'normal'] || 1.0;

    // 2. 连续忽略惩罚
    const ignoreCount = preference.consecutiveIgnoreCount || 0;
    let ignorePenalty = 1.0;
    if (ignoreCount >= config.consecutiveIgnoreMax) {
      ignorePenalty = 0;
    } else {
      ignorePenalty = Math.max(0, 1 - ignoreCount * config.consecutiveIgnorePenaltyRate);
    }

    // 3. 打开反馈加成
    const openedCount = ruleFeedback.filter(f => f.action === 'opened').length;
    const openedBonus = Math.min(
      config.openedBonusMax,
      openedCount * config.openedBonusPerOpen
    );

    // 4. 时间衰减（基于最近一次反馈）
    const recencyDecay = this._recencyDecay(ruleFeedback);

    // 5. 计算
    const successProbability = baseConfidence
      * priorityWeight
      * ignorePenalty
      * (1 + openedBonus)
      * recencyDecay;

    // userValue ≈ baseConfidence（候选自带的置信度作为用户价值估计）
    const userValue = Math.max(config.userValueFloor, baseConfidence);

    const rawExpectedValue = successProbability * userValue;
    // 三层联动：设备因子 + 命中率因子 + 类别因子
    const expectedValue = rawExpectedValue * globalDeviceFactor * hitRateFactor * categoryFactor;
    const score = expectedValue;

    return Object.assign({}, candidate, {
      confidence: baseConfidence,
      expectedValue,
      score,
      scoringTrace: {
        baseConfidence,
        priorityWeight,
        weight,
        ignoreCount,
        ignorePenalty,
        openedBonus,
        recencyDecay,
        globalDeviceFactor,
        hitRateFactor,
        categoryFactor,
        successProbability,
        userValue
      }
    });
  }

  _groupFeedbackByRule(feedback) {
    const map = new Map();
    for (const f of feedback || []) {
      // 通过 candidateId 反查 ruleId 不直接可得；这里使用 receiptId 关联
      // 实际使用时由调用方通过 candidate → rule 关联
      // 这里简化：使用 f.ruleId（如果存在）或 f.candidateId 作为 key
      const key = f.ruleId || f.candidateId;
      if (!key) continue;
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(f);
    }
    return map;
  }

  _recencyDecay(ruleFeedback) {
    if (!ruleFeedback || ruleFeedback.length === 0) return 1.0;
    // 取最近一次反馈时间
    const latest = ruleFeedback
      .map(f => f.timestamp)
      .filter(Boolean)
      .sort()
      .reverse()[0];
    if (!latest) return 1.0;

    const then = new Date(latest).getTime();
    if (isNaN(then)) return 1.0;
    const nowMs = new Date(this._now()).getTime();
    const hoursAgo = Math.max(0, (nowMs - then) / (1000 * 60 * 60));
    const halfLife = this._config.recencyHalfLifeHours;
    return Math.pow(0.5, hoursAgo / halfLife);
  }
}

module.exports = { ReminderScorer, DEFAULT_CONFIG };

  };
  modules["core/timing-policy.js"] = function(module, exports, require){
'use strict';

/**
 * TimingPolicy — 时机判断策略
 *
 * 判断"现在是不是合适时机"。
 *
 * 规则：
 *   - timing-pattern：当前时间在 typicalHour 窗口内
 *   - app-transition：立即响应（前台应用匹配即视为时机合适）
 *   - goto-internal：同 timing-pattern
 *   - user-created：检查 deliverAt 是否到达
 *
 * 平台无关。
 */

const DEFAULT_CONFIG = {
  // 时间模式窗口（前后 N 分钟内视为时机合适）
  timingWindowMinutes: 30,
  // 过期候选视为时机不合适
  rejectExpired: true
};

class TimingPolicy {
  /**
   * @param {object} [config]
   * @param {function} [now] 自定义时间函数（返回 ISO 字符串）
   */
  constructor(config = {}, now) {
    this._config = Object.assign({}, DEFAULT_CONFIG, config);
    this._now = now || (() => new Date().toISOString());
  }

  /**
   * @param {object} params
   *   - {object} candidate ReminderCandidate
   *   - {object} clock ClockPort 实现（必须）
   * @returns {Promise<object>} { timingOk: boolean, reason: string, deferUntil?: string }
   */
  async check({ candidate, clock } = {}) {
    if (!candidate) {
      return { timingOk: false, reason: 'no-candidate' };
    }

    // 过期检查
    if (this._config.rejectExpired && candidate.expiresAt) {
      const nowMs = new Date(this._now()).getTime();
      const expMs = new Date(candidate.expiresAt).getTime();
      if (!isNaN(expMs) && nowMs > expMs) {
        return { timingOk: false, reason: 'expired' };
      }
    }

    switch (candidate.source) {
      case 'timing-pattern':
        return this._checkTimingPattern(candidate, clock);
      case 'app-transition':
        return this._checkAppTransition(candidate, clock);
      case 'goto-internal':
        return this._checkTimingPattern(candidate, clock);
      case 'user-created':
        return this._checkUserCreated(candidate, clock);
      default:
        return { timingOk: false, reason: 'unknown-source' };
    }
  }

  _checkTimingPattern(candidate, clock) {
    const tp = candidate.timingPattern;
    if (!tp || typeof tp.typicalHour !== 'number') {
      return { timingOk: false, reason: 'no-timing-pattern' };
    }

    const now = clock.now();
    const hour = now.hour;
    const minute = now.minute;
    if (typeof hour !== 'number' || typeof minute !== 'number') {
      return { timingOk: false, reason: 'no-clock' };
    }

    // weekday 检查
    if (Array.isArray(tp.weekdayPattern) && tp.weekdayPattern.length === 7) {
      const wd = now.weekday;
      if (typeof wd === 'number' && !tp.weekdayPattern[wd]) {
        // 不在允许的星期 → 计算下一个允许的日期
        const next = this._nextAllowedWeekday(tp.weekdayPattern, wd);
        return {
          timingOk: false,
          reason: 'weekday-mismatch',
          deferUntil: this._deferToNextDay(tp.typicalHour, tp.typicalMinute || 0, next)
        };
      }
    }

    const inWindow = this._withinWindow(
      hour, minute,
      tp.typicalHour, tp.typicalMinute || 0,
      this._config.timingWindowMinutes
    );

    if (inWindow) {
      return { timingOk: true, reason: 'within-timing-window' };
    }

    // 不在窗口 → defer 到下一个时间点
    return {
      timingOk: false,
      reason: 'outside-timing-window',
      deferUntil: this._deferToNextDay(tp.typicalHour, tp.typicalMinute || 0, 0)
    };
  }

  _checkAppTransition(candidate, clock) {
    // 应用转移模式：候选生成时已确认 foreground 匹配 → 时机合适
    return { timingOk: true, reason: 'transition-triggered' };
  }

  _checkUserCreated(candidate, clock) {
    const tp = candidate.timingPattern;
    if (!tp || typeof tp.typicalHour !== 'number') {
      // 无具体时间 → 立即投递
      return { timingOk: true, reason: 'user-created-immediate' };
    }

    const now = clock.now();
    const inWindow = this._withinWindow(
      now.hour, now.minute,
      tp.typicalHour, tp.typicalMinute || 0,
      this._config.timingWindowMinutes
    );

    if (inWindow) {
      return { timingOk: true, reason: 'user-created-within-window' };
    }
    return {
      timingOk: false,
      reason: 'user-created-outside-window',
      deferUntil: this._deferToNextDay(tp.typicalHour, tp.typicalMinute || 0, 0)
    };
  }

  // ====== 工具方法 ======

  _withinWindow(nowH, nowM, targetH, targetM, windowMinutes) {
    if (typeof nowH !== 'number' || typeof nowM !== 'number') return false;
    const nowMin = nowH * 60 + nowM;
    const targetMin = targetH * 60 + (targetM || 0);
    const diff = Math.abs(nowMin - targetMin);
    const circular = Math.min(diff, 24 * 60 - diff);
    return circular <= windowMinutes;
  }

  _nextAllowedWeekday(weekdayPattern, currentWd) {
    for (let i = 1; i <= 7; i++) {
      const next = (currentWd + i) % 7;
      if (weekdayPattern[next]) return i;
    }
    return 1;
  }

  _deferToNextDay(hour, minute, daysAhead) {
    const t = new Date(this._now());
    t.setDate(t.getDate() + (daysAhead || 1));
    t.setHours(hour, minute, 0, 0);
    return t.toISOString();
  }
}

module.exports = { TimingPolicy, DEFAULT_CONFIG };

  };
  modules["core/interruption-policy.js"] = function(module, exports, require){
'use strict';

/**
 * InterruptionPolicy — 防打扰策略
 *
 * 11 项防打扰规则：
 *   1. dailyLimit                  每日总提醒上限
 *   2. perAppDailyLimit            单应用每日上限
 *   3. globalCooldown              全局冷却（连续提醒最小间隔）
 *   4. perRuleCooldown             单规则冷却
 *   5. quietHours                  静默时间
 *   6. duplicateSuppression        重复抑制（短时间内相同候选）
 *   7. minimumConfidence           最低置信度
 *   8. minimumExpectedValue        最低期望值
 *   9. recentlyDismissedSuppression 近期被 dismissed 抑制
 *  10. consecutiveIgnorePenalty    连续忽略惩罚（达到上限后抑制）
 *  11. expiredCandidateRemoval     过期候选移除
 *
 * 规则：
 *   - 一次行为不能形成提醒规则（sampleCount < threshold 时不投递）
 *   - 低置信度候选不投递
 *   - 静默时间不投递非紧急提醒
 *   - 连续忽略后降低分数
 *   - 用户关闭规则后立即停止
 *   - 相同提醒短时间内不能重复出现
 *   - Where 重启后长期状态必须来自 Base
 *
 * 平台无关。
 */

const DEFAULT_CONFIG = {
  dailyLimit: 20,
  perAppDailyLimit: 5,
  globalCooldownMs: 5 * 60 * 1000,        // 5 分钟
  perRuleCooldownMs: 30 * 60 * 1000,      // 30 分钟
  quietHours: { start: 22, end: 8 },       // 22:00 - 08:00
  duplicateSuppressionMs: 60 * 60 * 1000,  // 1 小时内相同 ruleId 视为重复
  minimumConfidence: 0.4,
  minimumExpectedValue: 0.05,
  recentlyDismissedSuppressionMs: 6 * 60 * 60 * 1000, // 6 小时
  consecutiveIgnorePenaltyMax: 5,          // 连续忽略达到 5 次后抑制
  expiredCandidateRemoval: true,
  minSampleCount: 3,                       // 一次行为不能形成提醒规则
  // ====== 设备传感器抑制配置（v1.1 三层联动） ======
  suppressOnDriving: true,                 // 驾驶模式抑制
  drivingConfidenceThreshold: 50,
  suppressOnCriticalBattery: true,         // 极低电量抑制
  criticalBatteryLevel: 10,
  suppressOnScreenOff: false               // 锁屏抑制（默认关闭，避免与锁屏通知策略冲突）
};

class InterruptionPolicy {
  /**
   * @param {object} [config] 覆盖默认配置
   * @param {function} [now] 自定义时间函数（返回 ISO 字符串）
   */
  constructor(config = {}, now) {
    this._config = Object.assign({}, DEFAULT_CONFIG, config);
    this._now = now || (() => new Date().toISOString());
  }

  /**
   * @param {object} params
   *   - {object} candidate ReminderCandidate（含 score / expectedValue）
   *   - {object} preference ReminderPreference
   *   - {object} state 运行时状态
   *     - {number} dailyCount
   *     - {Map<string, number>} perAppDailyCount
   *     - {number} lastGlobalDeliverAt（ms timestamp）
   *     - {Map<string, number>} lastPerRuleDeliverAt
   *     - {Map<string, number>} recentlyDismissedRuleAt
   *     - {Map<string, number>} lastDeliveredRuleAt
   *   - {object} clock ClockPort
   *   - {object} [sensorSnapshot] 设备传感器快照（可选，null = 无传感器抑制检查）
   * @returns {Promise<object>} { interruptionOk: boolean, suppressionReasons: string[] }
   */
  async check({ candidate, preference, state, clock, sensorSnapshot = null } = {}) {
    const reasons = [];
    if (!candidate) {
      return { interruptionOk: false, suppressionReasons: ['no-candidate'] };
    }

    const cfg = this._config;
    const nowIso = this._now();
    const nowMs = new Date(nowIso).getTime();
    const nowHour = clock ? clock.now().hour : new Date().getHours();

    // 0. 规则被关闭 → 立即抑制
    if (preference && preference.enabled === false) {
      reasons.push('rule-disabled');
    }

    // 1. dailyLimit
    const dailyCount = (state && state.dailyCount) || 0;
    if (dailyCount >= cfg.dailyLimit) {
      reasons.push('daily-limit');
    }

    // 2. perAppDailyLimit
    const perApp = (state && state.perAppDailyCount)
      ? (state.perAppDailyCount.get(candidate.packageName) || 0)
      : 0;
    if (perApp >= cfg.perAppDailyLimit) {
      reasons.push('per-app-daily-limit');
    }

    // 3. globalCooldown
    const lastGlobal = (state && state.lastGlobalDeliverAt) || 0;
    if (lastGlobal && (nowMs - lastGlobal) < cfg.globalCooldownMs) {
      reasons.push('global-cooldown');
    }

    // 4. perRuleCooldown
    const lastPerRule = (state && state.lastPerRuleDeliverAt)
      ? (state.lastPerRuleDeliverAt.get(candidate.ruleId) || 0)
      : 0;
    if (lastPerRule && (nowMs - lastPerRule) < cfg.perRuleCooldownMs) {
      reasons.push('per-rule-cooldown');
    }

    // 5. quietHours
    if (this._inQuietHours(nowHour, cfg.quietHours)) {
      reasons.push('quiet-hours');
    }

    // 6. duplicateSuppression
    const lastDup = (state && state.lastDeliveredRuleAt)
      ? (state.lastDeliveredRuleAt.get(candidate.ruleId) || 0)
      : 0;
    if (lastDup && (nowMs - lastDup) < cfg.duplicateSuppressionMs) {
      reasons.push('duplicate-suppression');
    }

    // 7. minimumConfidence
    const confidence = typeof candidate.confidence === 'number' ? candidate.confidence : 0;
    if (confidence < cfg.minimumConfidence) {
      reasons.push('minimum-confidence');
    }

    // 8. minimumExpectedValue
    const ev = typeof candidate.expectedValue === 'number' ? candidate.expectedValue : 0;
    if (ev < cfg.minimumExpectedValue) {
      reasons.push('minimum-expected-value');
    }

    // 9. recentlyDismissedSuppression
    const recentDismiss = (state && state.recentlyDismissedRuleAt)
      ? (state.recentlyDismissedRuleAt.get(candidate.ruleId) || 0)
      : 0;
    if (recentDismiss && (nowMs - recentDismiss) < cfg.recentlyDismissedSuppressionMs) {
      reasons.push('recently-dismissed');
    }

    // 10. consecutiveIgnorePenalty
    const ignoreCount = (preference && preference.consecutiveIgnoreCount) || 0;
    if (ignoreCount >= cfg.consecutiveIgnorePenaltyMax) {
      reasons.push('consecutive-ignore-penalty');
    }

    // 11. expiredCandidateRemoval
    if (cfg.expiredCandidateRemoval && candidate.expiresAt) {
      const expMs = new Date(candidate.expiresAt).getTime();
      if (!isNaN(expMs) && nowMs > expMs) {
        reasons.push('expired');
      }
    }

    // 12. minSampleCount（一次行为不能形成提醒规则）
    const sampleCount = this._extractSampleCount(candidate);
    if (typeof sampleCount === 'number' && sampleCount < cfg.minSampleCount) {
      reasons.push('insufficient-samples');
    }

    // ====== 设备层传感器抑制（v1.1 三层联动） ======

    // 13. driving-mode：驾驶中（confidence >= 阈值）→ 全局抑制（安全优先）
    if (cfg.suppressOnDriving && sensorSnapshot && sensorSnapshot.motion) {
      const motion = sensorSnapshot.motion;
      if (motion.activity === 'driving' && motion.confidence >= cfg.drivingConfidenceThreshold) {
        reasons.push('driving-mode');
      }
    }

    // 14. critical-battery：极低电量且未充电 → 全局抑制（节能优先）
    if (cfg.suppressOnCriticalBattery && sensorSnapshot && sensorSnapshot.battery) {
      const battery = sensorSnapshot.battery;
      if (!battery.isCharging && battery.level < cfg.criticalBatteryLevel) {
        reasons.push('critical-battery');
      }
    }

    // 15. screen-off：屏幕关闭（可选，默认关闭，避免与锁屏通知策略冲突）
    if (cfg.suppressOnScreenOff && sensorSnapshot && sensorSnapshot.screen) {
      const screen = sensorSnapshot.screen;
      if (!screen.isOn) {
        reasons.push('screen-off');
      }
    }

    return {
      interruptionOk: reasons.length === 0,
      suppressionReasons: reasons
    };
  }

  _inQuietHours(hour, quietHours) {
    if (!quietHours) return false;
    const { start, end } = quietHours;
    if (start == null || end == null) return false;
    // 跨午夜情况（如 22-8）
    if (start > end) {
      return hour >= start || hour < end;
    }
    return hour >= start && hour < end;
  }

  _extractSampleCount(candidate) {
    if (candidate.timingPattern && typeof candidate.timingPattern.sampleCount === 'number') {
      return candidate.timingPattern.sampleCount;
    }
    if (candidate.appTransition && typeof candidate.appTransition.sampleCount === 'number') {
      return candidate.appTransition.sampleCount;
    }
    if (candidate.source === 'user-created') return Infinity; // 用户创建不限制
    return undefined;
  }
}

module.exports = { InterruptionPolicy, DEFAULT_CONFIG };

  };
  modules["core/reminder-decision-engine.js"] = function(module, exports, require){
'use strict';

/**
 * ReminderDecisionEngine — 提醒决策引擎
 *
 * 汇总三层判断（Scorer + Timing + Interruption）输出最终 ReminderDecision。
 *
 * action 取值：
 *   - deliver   时机合适 + 不打扰 + 分数够高 → 立即投递
 *   - defer     时机不合适但候选有效 → 延后到 deferUntil
 *   - suppress  被防打扰规则抑制 → 不投递（但保留候选用于学习）
 *   - discard   候选无效/过期/规则关闭 → 丢弃
 *
 * 平台无关。
 */

function genId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'd-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
}

const DISCARD_REASONS = new Set([
  'expired',
  'rule-disabled',
  'no-candidate',
  'unknown-source',
  'no-timing-pattern'
]);

const SUPPRESS_REASONS = new Set([
  'daily-limit',
  'per-app-daily-limit',
  'global-cooldown',
  'per-rule-cooldown',
  'quiet-hours',
  'duplicate-suppression',
  'minimum-confidence',
  'minimum-expected-value',
  'recently-dismissed',
  'consecutive-ignore-penalty',
  'insufficient-samples'
]);

class ReminderDecisionEngine {
  /**
   * @param {object} [opts]
   *   - {function} [idGen] 自定义 ID 生成器
   *   - {function} [now] 自定义时间函数
   */
  constructor(opts = {}) {
    this._idGen = opts.idGen || genId;
    this._now = opts.now || (() => new Date().toISOString());
  }

  /**
   * 对单个候选做决策。
   * @param {object} params
   *   - {object} scoredCandidate ReminderScorer 输出的候选（含 score / expectedValue）
   *   - {object} timingResult TimingPolicy.check() 输出
   *   - {object} interruptionResult InterruptionPolicy.check() 输出
   * @returns {Promise<object>} ReminderDecision
   */
  async decide({ scoredCandidate, timingResult, interruptionResult } = {}) {
    const decidedAt = this._now();
    if (!scoredCandidate) {
      return {
        decisionId: this._idGen(),
        candidateId: '',
        action: 'discard',
        score: 0,
        confidence: 0,
        suppressionReasons: ['no-candidate'],
        explanation: 'No candidate provided',
        decidedAt
      };
    }

    const reasons = (interruptionResult && interruptionResult.suppressionReasons) || [];
    const timingOk = !!(timingResult && timingResult.timingOk);
    const interruptionOk = !!(interruptionResult && interruptionResult.interruptionOk);

    // 1. 优先判定 discard（候选无效）
    const hasDiscardReason = reasons.some(r => DISCARD_REASONS.has(r));
    if (hasDiscardReason) {
      return this._buildDecision(scoredCandidate, 'discard', reasons, decidedAt, {
        explanation: 'Candidate discarded: ' + reasons.filter(r => DISCARD_REASONS.has(r)).join(', ')
      });
    }

    // 2. 被防打扰规则抑制 → suppress
    if (!interruptionOk) {
      const suppressReasons = reasons.filter(r => SUPPRESS_REASONS.has(r));
      return this._buildDecision(scoredCandidate, 'suppress', suppressReasons, decidedAt, {
        explanation: 'Suppressed by interruption policy: ' + suppressReasons.join(', ')
      });
    }

    // 3. 时机不合适 → defer
    if (!timingOk) {
      return this._buildDecision(scoredCandidate, 'defer', reasons, decidedAt, {
        explanation: 'Deferred: ' + (timingResult && timingResult.reason),
        deliverAt: timingResult && timingResult.deferUntil
      });
    }

    // 4. 一切正常 → deliver
    return this._buildDecision(scoredCandidate, 'deliver', [], decidedAt, {
      explanation: 'Deliver: timing ok + interruption ok + score='
        + (typeof scoredCandidate.score === 'number' ? scoredCandidate.score.toFixed(3) : 'n/a'),
      deliverAt: decidedAt
    });
  }

  /**
   * 批量决策：对一组候选依次决策，并按优先级排序。
   * 同一时刻只允许一个 deliver（最高分），其余 defer。
   */
  async decideBatch({ scoredCandidates = [], timingResults = [], interruptionResults = [] } = {}) {
    const decisions = [];
    let delivered = false;

    // scoredCandidates 已按 score 降序
    for (let i = 0; i < scoredCandidates.length; i++) {
      const candidate = scoredCandidates[i];
      const timing = timingResults[i] || { timingOk: true, reason: 'default' };
      const interruption = interruptionResults[i] || { interruptionOk: true, suppressionReasons: [] };

      const decision = await this.decide({
        scoredCandidate: candidate,
        timingResult: timing,
        interruptionResult: interruption
      });

      // 同一时刻只允许一个 deliver
      if (decision.action === 'deliver' && delivered) {
        decision.action = 'defer';
        decision.suppressionReasons = (decision.suppressionReasons || []).concat(['one-deliver-per-batch']);
        decision.explanation = 'Deferred: another candidate already delivered in this batch';
        if (!decision.deliverAt) {
          const t = new Date(this._now());
          t.setMinutes(t.getMinutes() + 30);
          decision.deliverAt = t.toISOString();
        }
      }
      if (decision.action === 'deliver') delivered = true;

      decisions.push(decision);
    }

    return decisions;
  }

  _buildDecision(candidate, action, reasons, decidedAt, extra = {}) {
    return Object.assign({
      decisionId: this._idGen(),
      candidateId: candidate.candidateId || '',
      action,
      score: typeof candidate.score === 'number' ? candidate.score : 0,
      confidence: typeof candidate.confidence === 'number' ? candidate.confidence : 0,
      suppressionReasons: reasons,
      explanation: '',
      decidedAt
    }, extra);
  }
}

module.exports = { ReminderDecisionEngine };

  };
  modules["core/feedback-processor.js"] = function(module, exports, require){
'use strict';

/**
 * FeedbackProcessor — 用户反馈处理器
 *
 * 接收用户对提醒的反馈（opened / ignored / dismissed / disabled_rule / snoozed），
 * 计算需要更新的 ReminderPreference，并准备通过 BaseWriter 写回。
 *
 * 反馈语义：
 *   - opened          用户打开了提醒 → 重置 consecutiveIgnoreCount，weight += 0.1（封顶 1.0）
 *   - ignored         用户忽略 → consecutiveIgnoreCount++（不改 weight，5 次后 weight 归零）
 *   - dismissed       用户主动关闭 → weight -= 0.15（下限 0.0），consecutiveIgnoreCount++
 *   - disabled_rule   用户关闭规则 → preference.enabled = false，weight = 0
 *   - snoozed         用户稍后提醒 → 重新调度（由调用方处理，不改 weight）
 *
 * weight 调整规则：
 *   - 默认 weight = 0.5
 *   - opened 提升 weight，dismissed 降低 weight，ignored 不直接改 weight
 *   - 连续忽略 consecutiveIgnoreCount >= 5 时，weight 强制归零
 *
 * 重要：
 *   - FeedbackProcessor 不直接写库，只计算 preference 变更
 *   - 实际写入由调用方通过 BaseWriter.updateReminderPreference() 完成
 *   - 平台无关
 */

class FeedbackProcessor {
  /**
   * @param {object} [opts]
   *   - {function} [now] 自定义时间函数
   */
  constructor(opts = {}) {
    this._now = opts.now || (() => new Date().toISOString());
  }

  /**
   * 处理反馈，返回需要更新的 preference 和副作用。
   * @param {object} params
   *   - {object} feedback ReminderFeedback
   *   - {object} currentPreference ReminderPreference
   * @returns {Promise<object>} {
   *     updatedPreference: ReminderPreference,
   *     shouldWriteBack: boolean,
   *     shouldReschedule: boolean,
   *     rescheduleDelayMs?: number
   *   }
   */
  async process({ feedback, currentPreference } = {}) {
    if (!feedback || !feedback.action) {
      return {
        updatedPreference: currentPreference,
        shouldWriteBack: false,
        shouldReschedule: false
      };
    }

    const now = this._now();
    const basePref = currentPreference || {
      ruleId: feedback.ruleId || '',
      enabled: true,
      priority: 'normal',
      consecutiveIgnoreCount: 0,
      weight: 0.5,
      updatedAt: now,
      lastFeedbackAt: now
    };

    let updatedPref = Object.assign({}, basePref, {
      lastFeedbackAt: now,
      updatedAt: now
    });
    // 确保 weight 有默认值（兼容 Base 中无 weight 字段的旧记录）
    if (updatedPref.weight == null) {
      updatedPref.weight = 0.5;
    }
    let shouldWriteBack = true;
    let shouldReschedule = false;
    let rescheduleDelayMs = 0;

    switch (feedback.action) {
      case 'opened':
        // 用户打开了 → 重置忽略计数，提升权重（封顶 1.0）
        updatedPref.consecutiveIgnoreCount = 0;
        updatedPref.weight = Math.min(1.0, updatedPref.weight + 0.1);
        updatedPref.lastDeliveredAt = feedback.timestamp || now;
        break;

      case 'ignored':
        // 用户忽略 → 增加忽略计数（不改 weight，5 次后由后置规则归零）
        updatedPref.consecutiveIgnoreCount = (basePref.consecutiveIgnoreCount || 0) + 1;
        break;

      case 'dismissed':
        // 用户主动关闭 → 降低权重（下限 0.0），增加忽略计数
        updatedPref.consecutiveIgnoreCount = (basePref.consecutiveIgnoreCount || 0) + 1;
        updatedPref.weight = Math.max(0.0, updatedPref.weight - 0.15);
        break;

      case 'disabled_rule':
        // 用户关闭规则 → 立即停止，权重归零
        updatedPref.enabled = false;
        updatedPref.weight = 0;
        updatedPref.consecutiveIgnoreCount = (basePref.consecutiveIgnoreCount || 0) + 1;
        break;

      case 'snoozed':
        // 用户稍后提醒 → 重新调度（不改 weight）
        shouldReschedule = true;
        rescheduleDelayMs = (feedback.delayMs && feedback.delayMs > 0)
          ? feedback.delayMs
          : 30 * 60 * 1000; // 默认 30 分钟
        break;

      default:
        shouldWriteBack = false;
        break;
    }

    // 连续忽略达 5 次 → 权重归零
    if ((updatedPref.consecutiveIgnoreCount || 0) >= 5) {
      updatedPref.weight = 0;
    }

    return {
      updatedPreference: updatedPref,
      shouldWriteBack,
      shouldReschedule,
      rescheduleDelayMs
    };
  }

  /**
   * 批量处理一组反馈。
   * @param {Array<object>} items [{ feedback, currentPreference }]
   * @returns {Promise<Array<object>>}
   */
  async processBatch(items = []) {
    const out = [];
    for (const item of items) {
      out.push(await this.process(item));
    }
    return out;
  }
}

module.exports = { FeedbackProcessor };

  };
  modules["core/context-enricher.js"] = function(module, exports, require){
'use strict';

/**
 * ContextEnricher — 三层信号融合器
 *
 * 职责：
 *   1. 从 DeviceSensorPort 读取设备层传感器快照 → 计算设备调整因子
 *   2. 从 BaseReader 读取个人层 smartRanking → 候选 hints
 *   3. 从 BaseReader 读取 feedbackChainHitRate → 命中率降权因子
 *   4. 输出 EnrichedContext，供 WhereRuntime 注入 CandidateGenerator + ReminderScorer
 *
 * 设计原则：
 *   - 平台无关
 *   - 任一层不可用 → 该层因子返回中性值，不阻塞流程
 *   - 纯算术融合，无副作用
 *   - 公共层 RAG 召回接口预留
 *
 * 联动矩阵（设备 → 评分调整）：
 *   | 传感器状态              | 调整 |
 *   |------------------------|------|
 *   | 电量 < 20% 且未充电     | 全局降权 0.7 |
 *   | 电量 < 10% 且未充电     | 全局降权 0.5 |
 *   | 耳机/蓝牙音频连接       | 音频类应用上浮 1.2 |
 *   | 屏幕关闭                | 全局降权 0.8（避免锁屏打扰） |
 *   | 低功耗模式              | 全局降权 0.7 |
 *   | 网络弱（非 WiFi/未验证）| 流媒体类降权 0.8 |
 *   | 运动=驾驶              | 全局降权 0.5（安全优先） |
 */

class ContextEnricher {
  /**
   * @param {object} [sensorPort] DeviceSensorPort 实现（可选，null = 无传感器模式）
   */
  constructor(sensorPort = null) {
    this._sensorPort = sensorPort;
  }

  /**
   * 融合三层信号。
   *
   * @param {object} params
   *   - {Array<object>} [smartRankingHints] 个人层智能排名候选
   *   - {Map<string, object>} [feedbackHitRates] packageName → FeedbackChainHitRate
   *   - {Array<string>} [candidatePackages] 当前候选应用包名列表（预留）
   * @returns {Promise<object>} EnrichedContext
   */
  async enrich({
    smartRankingHints = [],
    feedbackHitRates = new Map(),
    candidatePackages = []
  } = {}) {
    // 1. 设备层：读取传感器快照
    let sensorSnapshot = null;
    if (this._sensorPort && this._sensorPort.available) {
      try {
        sensorSnapshot = await this._sensorPort.read();
      } catch (e) {
        sensorSnapshot = null;
      }
    }

    // 2. 计算设备调整因子
    const deviceFactors = this._computeDeviceFactors(sensorSnapshot);

    // 3. 构建解释
    const explanation = this._buildExplanation(
      sensorSnapshot,
      smartRankingHints.length,
      feedbackHitRates.size || 0
    );

    return {
      sensorSnapshot,
      smartRankingHints,
      feedbackHitRates,
      globalDeviceFactor: deviceFactors.globalFactor,
      categoryFactors: deviceFactors.categoryFactors,
      explanation
    };
  }

  /** 根据传感器状态计算调整因子 */
  _computeDeviceFactors(snapshot) {
    if (!snapshot) return { globalFactor: 1.0, categoryFactors: {} };

    let globalFactor = 1.0;
    const categoryFactors = {};

    // 电量调整
    const battery = snapshot.battery;
    if (battery && !battery.isCharging) {
      if (battery.level < 10) globalFactor *= 0.5;
      else if (battery.level < 20) globalFactor *= 0.7;
    }
    // 低功耗模式
    if (battery && battery.isLowPower) {
      globalFactor *= 0.7;
    }

    // 屏幕关闭（锁屏状态降权）
    const screen = snapshot.screen;
    if (screen && !screen.isOn) {
      globalFactor *= 0.8;
    }

    // 运动状态：驾驶时全局降权
    const motion = snapshot.motion;
    if (motion && motion.activity === 'driving' && motion.confidence >= 50) {
      globalFactor *= 0.5;
    }

    // 音频：耳机/蓝牙连接 → 音频类上浮
    const audio = snapshot.audio;
    if (audio && (audio.headphoneConnected || audio.bluetoothConnected)) {
      categoryFactors['音乐'] = 1.2;
      categoryFactors['听书播客'] = 1.2;
      categoryFactors['在线视频'] = 1.1;
    }

    // 网络：弱网 → 流媒体类降权
    const network = snapshot.network;
    if (network && network.type !== 'wifi' && !network.isStrong) {
      categoryFactors['在线视频'] = (categoryFactors['在线视频'] || 1.0) * 0.8;
      categoryFactors['音乐'] = (categoryFactors['音乐'] || 1.0) * 0.8;
    }

    // 全局因子下限保护
    globalFactor = Math.max(0.1, Math.min(1.0, globalFactor));

    return { globalFactor, categoryFactors };
  }

  _buildExplanation(snapshot, hintsCount, hitRatesCount) {
    const parts = [];
    if (snapshot) {
      parts.push('sensor:ok');
      if (snapshot.battery) {
        parts.push(`battery:${snapshot.battery.level}%`);
        if (snapshot.battery.isCharging) parts.push('charging');
      }
      if (snapshot.audio && (snapshot.audio.headphoneConnected || snapshot.audio.bluetoothConnected)) {
        parts.push('audio:connected');
      }
      if (snapshot.motion && snapshot.motion.activity !== 'unknown') {
        parts.push(`motion:${snapshot.motion.activity}`);
      }
    } else {
      parts.push('sensor:na');
    }
    parts.push(`hints:${hintsCount}`);
    parts.push(`hitRates:${hitRatesCount}`);
    return parts.join(' ');
  }
}

module.exports = { ContextEnricher };

  };
  modules["core/file-vector-index-builder.js"] = function(module, exports, require){
'use strict';

/**
 * FileVectorIndexBuilder — 设备文件层向量库构建器
 *
 * 将 FileIndexResult（file-index）转换为 FileVectorResult（file-vectors）。
 * 对齐 goto-base/shared/data/device/schema/file-vectors.schema.json。
 *
 * 平台无关：嵌入器通过 EmbeddingProvider Port 注入，不依赖 Android API。
 * Base 纪律：本类属于 Where Core，Base 只做数据容纳口。
 *
 * 职责：
 *   1. 遍历 FileIndexResult.fileIndex 中的每个 FileIndexEntry
 *   2. 读取文件内容预览（contentPreview）作为原始文本
 *   3. 按 ChunkingConfig 分块（大文件分块，单文件最多 maxChunksPerFile 块）
 *   4. 调用 EmbeddingProvider.embed 生成向量
 *   5. 构建 FileVectorEntry（含 vectorId / fileId / documentText / vector / metadata）
 *   6. 构建 byFileId + byExtension 轻量索引
 *   7. 输出 FileVectorResult（符合 file-vectors.schema.json）
 *
 * 降级策略：
 *   - EmbeddingProvider 不可用 → 仅保留 documentText，vector 为空数组
 *   - 单块嵌入失败 → 跳过该块，不影响其他块
 *   - 单文件分块失败 → 跳过该文件
 */

/** 默认分块配置 */
const DEFAULT_CHUNKING_CONFIG = {
  maxChunkChars: 800,    // 单块最大字符数（约 200 token）
  overlapChars: 100,     // 块间重叠字符数
  maxChunksPerFile: 32   // 单文件最大分块数
};

/** 生成 UUID v4（用于 vectorId） */
function genId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return 'fv-' + crypto.randomUUID();
  }
  return 'fv-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
}

class FileVectorIndexBuilder {
  /**
   * @param {object} [options]
   *   - {object} [embeddingProvider] EmbeddingProvider Port（可选，null = 仅保留文本）
   *   - {object} [chunkingConfig] 分块策略
   *   - {function} [now] 自定义时间函数（测试用）
   *   - {function} [idGen] 自定义 ID 生成器（测试用）
   */
  constructor(options = {}) {
    this._embeddingProvider = options.embeddingProvider || null;
    this._chunkingConfig = Object.assign({}, DEFAULT_CHUNKING_CONFIG, options.chunkingConfig || {});
    this._now = options.now || (() => new Date().toISOString());
    this._idGen = options.idGen || genId;
  }

  /**
   * 从 FileIndexResult 构建文件向量库。
   *
   * @param {object} fileIndexResult 文件扫描结果（来自 FileIndexScanner.scan）
   * @param {string} [deviceId] 设备唯一标识（默认取 fileIndexResult.deviceId）
   * @returns {Promise<object>} FileVectorResult
   */
  async build(fileIndexResult, deviceId = fileIndexResult.deviceId) {
    const vectors = [];
    const byFileId = new Map();
    const byExtension = new Map();

    const providerAvailable = !!(this._embeddingProvider && this._embeddingProvider.available);
    const modelName = (this._embeddingProvider && this._embeddingProvider.modelName) || 'unavailable';
    const dimension = (this._embeddingProvider && this._embeddingProvider.dimension) || 0;
    const generatorId = providerAvailable ? 'embedding-provider' : 'text-only-fallback';

    for (const entry of (fileIndexResult.fileIndex || [])) {
      try {
        const chunks = this._chunkText(entry.contentPreview || '', this._chunkingConfig);
        const chunksToProcess = chunks.slice(0, this._chunkingConfig.maxChunksPerFile);

        for (let i = 0; i < chunksToProcess.length; i++) {
          const chunkText = chunksToProcess[i];
          if (!chunkText) continue;

          let vector = [];
          if (providerAvailable) {
            try {
              vector = await this._embeddingProvider.embed(chunkText);
            } catch (e) {
              vector = [];
            }
          }

          const vectorId = this._idGen();
          vectors.push({
            vectorId,
            fileId: entry.fileId,
            documentText: chunkText,
            vector,
            metadata: {
              fileName: entry.fileName,
              extension: entry.extension,
              chunkIndex: i
            }
          });

          // 更新索引
          if (!byFileId.has(entry.fileId)) byFileId.set(entry.fileId, []);
          byFileId.get(entry.fileId).push(vectorId);

          if (!byExtension.has(entry.extension)) byExtension.set(entry.extension, []);
          byExtension.get(entry.extension).push(vectorId);
        }
      } catch (e) {
        // 单文件处理失败不阻塞整体构建
      }
    }

    return {
      deviceId,
      embeddingModel: modelName,
      dimension,
      vectorGenerator: generatorId,
      vectors,
      index: {
        byFileId: this._mapToObject(byFileId),
        byExtension: this._mapToObject(byExtension)
      },
      lastUpdated: this._now()
    };
  }

  /**
   * 将回填后的 FileIndexEntry 数组返回（设置 vectorId 指向 file-vectors）。
   *
   * 用于在 file-index 和 file-vectors 之间建立双向引用：
   *   file-index.entry.vectorId → file-vectors.vectorId
   *
   * @param {object} fileIndexResult 原始文件索引
   * @param {object} vectorResult 向量库构建结果
   * @returns {Array<object>} 回填 vectorId 后的 FileIndexEntry 数组
   */
  backfillVectorIds(fileIndexResult, vectorResult) {
    const fileIdToFirstVectorId = new Map();
    const byFileId = vectorResult.index && vectorResult.index.byFileId
      ? vectorResult.index.byFileId
      : {};
    for (const [fileId, ids] of Object.entries(byFileId)) {
      if (Array.isArray(ids) && ids.length > 0) {
        fileIdToFirstVectorId.set(fileId, ids[0]);
      }
    }

    return (fileIndexResult.fileIndex || []).map(entry => {
      const vectorId = fileIdToFirstVectorId.get(entry.fileId);
      if (vectorId) {
        return Object.assign({}, entry, { vectorId });
      }
      return entry;
    });
  }

  /**
   * 文本分块（按字符数 + 重叠）。
   *
   * @param {string} text 原始文本
   * @param {object} config 分块配置
   * @returns {Array<string>} 分块列表
   */
  _chunkText(text, config) {
    if (!text) return [];
    if (text.length <= config.maxChunkChars) return [text];

    const chunks = [];
    let start = 0;
    const step = config.maxChunkChars - config.overlapChars;

    while (start < text.length) {
      const end = Math.min(start + config.maxChunkChars, text.length);
      const chunk = text.substring(start, end);
      if (chunk) chunks.push(chunk);
      if (end >= text.length) break;
      start += step;
    }

    return chunks;
  }

  /** Map → Object（用于序列化） */
  _mapToObject(map) {
    const obj = {};
    for (const [k, v] of map.entries()) {
      obj[k] = v;
    }
    return obj;
  }
}

module.exports = { FileVectorIndexBuilder, DEFAULT_CHUNKING_CONFIG };

  };
  modules["runtime/in-memory-scheduler.js"] = function(module, exports, require){
'use strict';

/**
 * InMemoryScheduler — SchedulerPort 的内存实现
 *
 * 仅用于 Phase 1 模拟测试和参考运行时。
 * 不依赖 Android 系统调度服务。
 *
 * 数据持久化：无（重启后清空）。
 * 真实场景下，长期调度状态由 HOST 通过 Base 持久化。
 */

const { SchedulerPort } = require('../ports/scheduler-port.js');

function genId() {
  return 's-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
}

class InMemoryScheduler extends SchedulerPort {
  /**
   * @param {object} [opts]
   *   - {function} [now] 自定义时间函数
   */
  constructor(opts = {}) {
    super();
    this._schedules = new Map(); // scheduleId → { candidate, time, createdAt }
    this._now = opts.now || (() => new Date().toISOString());
  }

  async schedule(candidate, time) {
    if (!candidate || !time) {
      throw new Error('InMemoryScheduler.schedule: candidate and time are required');
    }
    const scheduleId = genId();
    this._schedules.set(scheduleId, {
      scheduleId,
      candidate,
      time,
      createdAt: this._now()
    });
    return { scheduleId, time };
  }

  async cancel(scheduleId) {
    if (!scheduleId) return false;
    return this._schedules.delete(scheduleId);
  }

  async reschedule(scheduleId, time) {
    if (!scheduleId || !time) return false;
    const entry = this._schedules.get(scheduleId);
    if (!entry) return false;
    entry.time = time;
    entry.updatedAt = this._now();
    return true;
  }

  // ====== 测试辅助方法 ======

  size() {
    return this._schedules.size;
  }

  list() {
    return Array.from(this._schedules.values());
  }

  clear() {
    this._schedules.clear();
  }
}

module.exports = { InMemoryScheduler };

  };
  modules["ports/scheduler-port.js"] = function(module, exports, require){
'use strict';

/**
 * SchedulerPort Port — 调度未来提醒的接口。
 * 实现由 HOST 提供（可包装系统调度服务）。
 */
class SchedulerPort {
  async schedule(candidate, time) { throw new Error('NOT_IMPLEMENTED'); }
  async cancel(scheduleId) { throw new Error('NOT_IMPLEMENTED'); }
  async reschedule(scheduleId, time) { throw new Error('NOT_IMPLEMENTED'); }
}

module.exports = { SchedulerPort };

  };
  modules["runtime/in-memory-delivery-adapter.js"] = function(module, exports, require){
'use strict';

/**
 * InMemoryDeliveryAdapter — DeliveryPort 的内存实现
 *
 * 仅用于 Phase 1 模拟测试和参考运行时。
 * 不依赖 Android 系统通知服务。
 *
 * 数据持久化：无（重启后清空）。
 * 真实场景下，通知投递由 HOST 完成。
 */

const { DeliveryPort } = require('../ports/delivery-port.js');

function genId() {
  return 'r-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
}

class InMemoryDeliveryAdapter extends DeliveryPort {
  /**
   * @param {object} [opts]
   *   - {function} [now] 自定义时间函数
   *   - {boolean} [shouldFail=false] 模拟投递失败（测试用）
   */
  constructor(opts = {}) {
    super();
    this._receipts = new Map(); // receiptId → DeliveryReceipt
    this._byReminderId = new Map(); // reminderId（candidateId）→ receiptId
    this._shouldFail = !!opts.shouldFail;
    this._now = opts.now || (() => new Date().toISOString());
  }

  async deliver(decision) {
    if (!decision) {
      throw new Error('InMemoryDeliveryAdapter.deliver: decision is required');
    }
    if (this._shouldFail) {
      const receipt = {
        receiptId: genId(),
        decisionId: decision.decisionId || '',
        candidateId: decision.candidateId || '',
        channel: 'notification',
        deliveredAt: this._now(),
        status: 'failed',
        error: 'simulated-failure'
      };
      return receipt;
    }

    const receiptId = genId();
    const receipt = {
      receiptId,
      decisionId: decision.decisionId || '',
      candidateId: decision.candidateId || '',
      channel: 'notification',
      deliveredAt: this._now(),
      status: 'delivered'
    };
    this._receipts.set(receiptId, receipt);
    if (receipt.candidateId) {
      this._byReminderId.set(receipt.candidateId, receiptId);
    }
    return receipt;
  }

  async cancel(reminderId) {
    if (!reminderId) return false;
    const receiptId = this._byReminderId.get(reminderId);
    if (!receiptId) return false;
    const receipt = this._receipts.get(receiptId);
    if (!receipt) return false;
    receipt.status = 'cancelled';
    return true;
  }

  async update(reminderId, decision) {
    if (!reminderId) return false;
    const receiptId = this._byReminderId.get(reminderId);
    if (!receiptId) return false;
    const receipt = this._receipts.get(receiptId);
    if (!receipt) return false;
    // 更新关联的 decision 信息
    if (decision) {
      receipt.decisionId = decision.decisionId || receipt.decisionId;
      receipt.candidateId = decision.candidateId || receipt.candidateId;
    }
    receipt.updatedAt = this._now();
    return true;
  }

  // ====== 测试辅助方法 ======

  size() {
    return this._receipts.size;
  }

  list() {
    return Array.from(this._receipts.values());
  }

  getReceipt(receiptId) {
    return this._receipts.get(receiptId);
  }

  clear() {
    this._receipts.clear();
    this._byReminderId.clear();
  }
}

module.exports = { InMemoryDeliveryAdapter };

  };
  modules["ports/delivery-port.js"] = function(module, exports, require){
'use strict';

/**
 * DeliveryPort Port — 投递/取消/更新提醒的接口。
 * 实现由 HOST 提供（可包装系统通知服务）。
 */
class DeliveryPort {
  async deliver(decision) { throw new Error('NOT_IMPLEMENTED'); }
  async cancel(reminderId) { throw new Error('NOT_IMPLEMENTED'); }
  async update(reminderId, decision) { throw new Error('NOT_IMPLEMENTED'); }
}

module.exports = { DeliveryPort };

  };
  modules["runtime/where-runtime.js"] = function(module, exports, require){
'use strict';

/**
 * WhereRuntime — GOTO Where 统一运行时入口
 *
 * 编排完整的提醒评估流程：
 *
 *   ContextSignal
 *       ↓
 *   BaseReaderAdapter → 读取 TimingPattern / TransitionPattern / Preferences
 *       ↓
 *   CandidateGenerator → 生成候选
 *       ↓
 *   ReminderScorer → 评分（使用 Base 中的 Preference + Feedback）
 *       ↓
 *   TimingPolicy → 时机判断
 *       ↓
 *   InterruptionPolicy → 防打扰检查
 *       ↓
 *   ReminderDecisionEngine → 最终决策
 *       ↓
 *   DeliveryPort → 投递
 *
 * 反馈闭环：
 *   ReminderFeedback → FeedbackProcessor → BaseWriterAdapter → Personal Base
 *
 * 返回：
 *   {
 *     signals, candidates, scoredCandidates, decisions,
 *     degraded, latency, explanation
 *   }
 *
 * 架构原则：
 *   - Where Core 只依赖 Port，不依赖 Base 内部实现
 *   - BaseReader/BaseWriter 由外部注入（Composition Root 创建）
 *   - Base 不可用时 degraded=true，不投递任何推测提醒
 *   - 不影响 GOTO Engine 和搜索
 *   - 平台无关：不引用 Android API
 */

const { CandidateGenerator } = require('../core/candidate-generator.js');
const { ReminderScorer } = require('../core/reminder-scorer.js');
const { TimingPolicy } = require('../core/timing-policy.js');
const { InterruptionPolicy } = require('../core/interruption-policy.js');
const { ReminderDecisionEngine } = require('../core/reminder-decision-engine.js');
const { FeedbackProcessor } = require('../core/feedback-processor.js');
const { ContextEnricher } = require('../core/context-enricher.js');

class WhereRuntime {
  /**
   * @param {object} options
   *   - {object} baseReader BaseReader Port 实现（必须）
   *   - {object} baseWriter BaseWriter Port 实现（必须）
   *   - {object} clock ClockPort 实现（必须）
   *   - {object} [delivery] DeliveryPort 实现（可选，不传则不投递）
   *   - {object} [scheduler] SchedulerPort 实现（可选）
   *   - {object} [scorerConfig] ReminderScorer 配置覆盖
   *   - {object} [timingConfig] TimingPolicy 配置覆盖
   *   - {object} [interruptionConfig] InterruptionPolicy 配置覆盖
   *   - {function} [now] 自定义时间函数
   *   - {function} [idGen] 自定义 ID 生成器
   */
  constructor(options = {}) {
    this._baseReader = options.baseReader;
    this._baseWriter = options.baseWriter;
    this._clock = options.clock;
    this._delivery = options.delivery || null;
    this._scheduler = options.scheduler || null;
    /** 设备传感器 Port（可选，null = 无传感器模式） */
    this._sensorPort = options.sensorPort || null;
    /** 应用包名 → 类别映射（可选，用于 categoryFactors 联动） */
    this._packageCategories = options.packageCategories || new Map();
    this._now = options.now || (() => new Date().toISOString());
    this._idGen = options.idGen || undefined;

    // 初始化 Core 组件
    this._candidateGen = new CandidateGenerator({
      timingWindowMinutes: (options.timingConfig || {}).timingWindowMinutes,
      now: this._now,
      idGen: this._idGen
    });
    this._scorer = new ReminderScorer(options.scorerConfig || {}, this._now);
    this._timingPolicy = new TimingPolicy(options.timingConfig || {}, this._now);
    this._interruptionPolicy = new InterruptionPolicy(options.interruptionConfig || {}, this._now);
    this._decisionEngine = new ReminderDecisionEngine({ now: this._now, idGen: this._idGen });
    this._feedbackProcessor = new FeedbackProcessor({ now: this._now });
    /** 三层信号融合器（设备层 + 个人层 smartRanking/feedbackChain） */
    this._contextEnricher = new ContextEnricher(this._sensorPort);

    // 运行时状态（非持久化，重启后从 Base 恢复）
    this._runtimeState = {
      dailyCount: 0,
      perAppDailyCount: new Map(),
      lastGlobalDeliverAt: 0,
      lastPerRuleDeliverAt: new Map(),
      recentlyDismissedRuleAt: new Map(),
      lastDeliveredRuleAt: new Map()
    };
    this._lastResetDate = '';
  }

  /**
   * 评估当前上下文，生成并投递提醒。
   * @param {object} contextSignal ContextSignal（含 hour, minute, weekday, foregroundPackageName 等）
   * @returns {Promise<object>} { signals, candidates, scoredCandidates, decisions, degraded, latency, explanation }
   */
  async evaluate(contextSignal) {
    const t0 = Date.now();
    const nowIso = this._now();
    const signals = contextSignal || (this._clock ? this._clock.now() : {});

    // 1. 检查 Base 是否可用
    const readerAvailable = this._baseReader && !this._baseReader.degraded;
    const degraded = !readerAvailable;

    if (degraded) {
      return {
        signals,
        candidates: [],
        scoredCandidates: [],
        decisions: [],
        degraded: true,
        latency: Date.now() - t0,
        explanation: 'BaseReader unavailable — Where degraded, no speculative reminders'
      };
    }

    // 2. 每日重置
    this._maybeResetDaily(nowIso);

    // 3. 从 Base 读取数据
    const readResult = await this._readFromBase(signals);

    // 4. 三层信号融合（设备层传感器 + 个人层 smartRanking/feedbackChain）
    let smartRankingHints = [];
    if (this._baseReader && typeof this._baseReader.getSmartRankingHints === 'function') {
      try {
        smartRankingHints = await this._baseReader.getSmartRankingHints(20);
      } catch (e) {
        smartRankingHints = [];
      }
    }
    const enrichedContext = await this._contextEnricher.enrich({
      smartRankingHints,
      feedbackHitRates: new Map(),  // 批量查询在 candidate 生成后补
      candidatePackages: []
    });

    // 5. 生成候选（注入 smartRankingHints 作为 E 分支）
    const candidates = await this._candidateGen.generate({
      signals,
      timingPatterns: readResult.timingPatterns,
      transitionPatterns: readResult.transitionPatterns,
      gotoInternalPatterns: readResult.gotoInternalPatterns,
      smartRankingHints: enrichedContext.smartRankingHints
    });

    // 5.1 批量补查候选应用的反馈链命中率
    const candidatePackages = [...new Set(candidates.map(c => c.packageName).filter(Boolean))];
    const hitRateMap = new Map();
    if (this._baseReader && typeof this._baseReader.getFeedbackChainHitRate === 'function') {
      for (const pkg of candidatePackages) {
        try {
          const hitRate = await this._baseReader.getFeedbackChainHitRate(pkg);
          if (hitRate) hitRateMap.set(pkg, hitRate);
        } catch (e) {
          // 单个查询失败不阻塞
        }
      }
    }

    // 6. 评分（注入设备因子 + 命中率因子 + 类别因子）
    const scoredCandidates = await this._scorer.score({
      candidates,
      preferences: readResult.preferences,
      recentFeedback: readResult.recentFeedback,
      globalDeviceFactor: enrichedContext.globalDeviceFactor,
      categoryFactors: enrichedContext.categoryFactors,
      feedbackHitRates: hitRateMap,
      packageCategories: this._packageCategories
    });

    // 7. 时机判断 + 防打扰检查（含设备传感器抑制）
    const timingResults = [];
    const interruptionResults = [];
    for (const sc of scoredCandidates) {
      const pref = readResult.preferences.get(sc.ruleId) || {
        ruleId: sc.ruleId,
        enabled: true,
        priority: 'normal',
        consecutiveIgnoreCount: 0
      };

      // 规则关闭 → discard
      if (pref.enabled === false) {
        timingResults.push({ timingOk: false, reason: 'rule-disabled' });
        interruptionResults.push({ interruptionOk: false, suppressionReasons: ['rule-disabled'] });
        continue;
      }

      const timingResult = await this._timingPolicy.check({
        candidate: sc,
        clock: this._clock
      });
      timingResults.push(timingResult);

      // 注入设备传感器快照（驾驶/低电量/屏幕关闭抑制）
      const interruptionResult = await this._interruptionPolicy.check({
        candidate: sc,
        preference: pref,
        state: this._runtimeState,
        clock: this._clock,
        sensorSnapshot: enrichedContext.sensorSnapshot
      });
      interruptionResults.push(interruptionResult);
    }

    // 8. 决策
    const decisions = await this._decisionEngine.decideBatch({
      scoredCandidates,
      timingResults,
      interruptionResults
    });

    // 9. 投递
    const deliveredDecisions = [];
    for (const decision of decisions) {
      if (decision.action === 'deliver') {
        if (this._delivery) {
          try {
            await this._delivery.deliver(decision);
          } catch (e) {
            // 投递失败不影响流程
          }
        }
        deliveredDecisions.push(decision);
        this._updateRuntimeState(decision);
      } else if (decision.action === 'defer' && this._scheduler && decision.deliverAt) {
        try {
          const candidate = scoredCandidates.find(c => c.candidateId === decision.candidateId);
          if (candidate) {
            await this._scheduler.schedule(candidate, decision.deliverAt);
          }
        } catch (e) {
          // 调度失败不影响流程
        }
      }
    }

    const latency = Date.now() - t0;
    const explanation = this._buildExplanation({
      candidatesCount: candidates.length,
      scoredCount: scoredCandidates.length,
      decisionsCount: decisions.length,
      deliveredCount: deliveredDecisions.length,
      degraded
    }) + ' | ' + enrichedContext.explanation;

    return {
      signals,
      candidates,
      scoredCandidates,
      decisions,
      degraded: false,
      latency,
      explanation
    };
  }

  /**
   * 处理用户反馈并写回 Base。
   *
   * 架构说明：
   *   - 仅调用 recordReminderFeedback 记录反馈
   *   - Preference 统计更新由 BaseWriter 实现内部自动处理（避免双重写入）
   *   - FeedbackProcessor 仍用于计算 shouldReschedule 等运行时副作用
   *
   * @param {object} feedback ReminderFeedback
   */
  async processFeedback(feedback) {
    if (!feedback || !this._baseWriter || this._baseWriter.degraded) return;

    try {
      const ruleId = feedback.ruleId || feedback.candidateId || '';

      // 读取当前 preference（用于 FeedbackProcessor 计算运行时副作用）
      let currentPref = null;
      if (ruleId && this._baseReader && !this._baseReader.degraded) {
        currentPref = await this._baseReader.getReminderPreference(ruleId);
      }

      // FeedbackProcessor 计算运行时副作用（shouldReschedule 等）
      const result = await this._feedbackProcessor.process({
        feedback,
        currentPreference: currentPref
      });

      // 记录反馈（BaseWriter 实现会自动同步 Preference 统计）
      await this._baseWriter.recordReminderFeedback(feedback);

      // 处理 dismissed 运行时状态
      if (feedback.action === 'dismissed' && ruleId) {
        this._runtimeState.recentlyDismissedRuleAt.set(ruleId, Date.now());
      }

      // 处理 snoozed 重新调度
      if (feedback.action === 'snoozed' && result.shouldReschedule && this._scheduler) {
        const candidate = { candidateId: feedback.candidateId, ruleId };
        const deliverAt = new Date(Date.now() + (result.rescheduleDelayMs || 0)).toISOString();
        try {
          await this._scheduler.schedule(candidate, deliverAt);
        } catch (e) {
          // 调度失败不影响流程
        }
      }
    } catch (e) {
      // 静默降级
    }
  }

  // ====== 内部方法 ======

  async _readFromBase(signals) {
    const timingPatterns = [];
    const transitionPatterns = [];
    const gotoInternalPatterns = [];
    const preferences = new Map();
    let recentFeedback = [];

    try {
      // 读取 TimingPattern（基于前台应用或已知包名）
      if (signals.foregroundPackageName) {
        const tp = await this._baseReader.getUsagePattern(signals.foregroundPackageName);
        if (tp) timingPatterns.push(tp);

        // 读取转移模式
        const tps = await this._baseReader.getAppTransitionPattern(signals.foregroundPackageName);
        if (Array.isArray(tps)) transitionPatterns.push(...tps);
      }

      // 读取所有已知的 TimingPattern（从近一小时可能触发的应用中读取）
      // 这里简化：只读取前台应用的 pattern。未来可扩展为读取所有安装应用的 pattern。

      // 读取近期反馈
      recentFeedback = await this._baseReader.getRecentReminderFeedback({ limit: 100 });

      // 从反馈中提取 ruleId，批量读取 preferences
      const ruleIds = new Set();
      for (const f of recentFeedback) {
        if (f.candidateId) ruleIds.add(f.candidateId);
      }
      for (const c of [...timingPatterns, ...transitionPatterns]) {
        const ruleId = c.ruleId || ('timing:' + (c.packageName || ''));
        ruleIds.add(ruleId);
      }

      for (const ruleId of ruleIds) {
        try {
          const pref = await this._baseReader.getReminderPreference(ruleId);
          if (pref) {
            preferences.set(ruleId, pref);
          }
        } catch (e) {
          // 静默跳过
        }
      }
    } catch (e) {
      // 整体读取失败 → 返回空数据，degraded 由调用方判断
    }

    return { timingPatterns, transitionPatterns, gotoInternalPatterns, preferences, recentFeedback };
  }

  _updateRuntimeState(decision) {
    const now = Date.now();
    this._runtimeState.dailyCount++;
    this._runtimeState.lastGlobalDeliverAt = now;

    if (decision.candidateId) {
      this._runtimeState.lastDeliveredRuleAt.set(decision.candidateId, now);
    }

    // 从 scoredCandidate 中获取 packageName
    // decision 不直接包含 packageName，但 candidateId 可作为 key
    const key = decision.candidateId || '';
    if (key) {
      this._runtimeState.lastPerRuleDeliverAt.set(key, now);
      this._runtimeState.perAppDailyCount.set(key, (this._runtimeState.perAppDailyCount.get(key) || 0) + 1);
    }
  }

  _maybeResetDaily(nowIso) {
    const date = nowIso.slice(0, 10); // YYYY-MM-DD
    if (this._lastResetDate !== date) {
      this._runtimeState.dailyCount = 0;
      this._runtimeState.perAppDailyCount.clear();
      this._lastResetDate = date;
    }
  }

  _buildExplanation({ candidatesCount, scoredCount, decisionsCount, deliveredCount, degraded }) {
    if (degraded) {
      return 'Where degraded — Base unavailable, no reminders generated';
    }
    const parts = [];
    parts.push(`${candidatesCount} candidate(s)`);
    parts.push(`${scoredCount} scored`);
    parts.push(`${decisionsCount} decision(s)`);
    parts.push(`${deliveredCount} delivered`);
    return parts.join(' → ');
  }
}

module.exports = { WhereRuntime };

  };
  modules["ports/base-reader.js"] = function(module, exports, require){
'use strict';

/**
 * BaseReader Port — 读取 GOTO Base 数据的接口。
 * Where 通过此 Port 读取使用模式、应用转移模式、提醒偏好等。
 * 实现由 HOST 提供（可包装 Base 的 PersonalLearning API）。
 */
class BaseReader {
  async getAppRecord(packageName) { throw new Error('NOT_IMPLEMENTED'); }
  async getUsagePattern(packageName) { throw new Error('NOT_IMPLEMENTED'); }
  async getAppTransitionPattern(fromPackageName) { throw new Error('NOT_IMPLEMENTED'); }
  async getReminderPreference(ruleId) { throw new Error('NOT_IMPLEMENTED'); }
  async getRecentReminderFeedback(filter) { throw new Error('NOT_IMPLEMENTED'); }
  async getPersonalAppProfile(packageName) { throw new Error('NOT_IMPLEMENTED'); }
}

module.exports = { BaseReader };

  };
  modules["ports/base-writer.js"] = function(module, exports, require){
'use strict';

/**
 * BaseWriter Port — 写回 GOTO Base 的接口。
 * Where 通过此 Port 记录提醒反馈、更新偏好、记录上下文结果。
 */
class BaseWriter {
  async recordReminderFeedback(feedback) { throw new Error('NOT_IMPLEMENTED'); }
  async updateReminderPreference(preference) { throw new Error('NOT_IMPLEMENTED'); }
  async recordContextOutcome(outcome) { throw new Error('NOT_IMPLEMENTED'); }
}

module.exports = { BaseWriter };

  };
  modules["ports/signal-source.js"] = function(module, exports, require){
'use strict';

/**
 * SignalSource Port — 获取当前上下文信号的接口。
 * 实现由 HOST 提供（可包装系统使用统计服务 / 系统广播等）。
 */
class SignalSource {
  async getCurrentSignals() { throw new Error('NOT_IMPLEMENTED'); }
  subscribe(listener) { throw new Error('NOT_IMPLEMENTED'); }
  unsubscribe(listener) { throw new Error('NOT_IMPLEMENTED'); }
}

module.exports = { SignalSource };

  };
  modules["ports/clock-port.js"] = function(module, exports, require){
'use strict';

/**
 * ClockPort Port — 时间服务接口。
 * 平台无关，不引用 Android API。
 */
class ClockPort {
  now() { throw new Error('NOT_IMPLEMENTED'); }
  timezone() { throw new Error('NOT_IMPLEMENTED'); }
  weekday() { throw new Error('NOT_IMPLEMENTED'); }
}

module.exports = { ClockPort };

  };
  var cache = Object.create(null);
  function load(key){
    if (cache[key]) return cache[key].exports;
    if (!modules[key]) throw new Error('Where bundle module not found: ' + key);
    var module = { exports: {} }; cache[key] = module;
    modules[key](module, module.exports, function(request){
      if (request.charAt(0) !== '.') throw new Error('Unsupported external require: ' + request);
      var slash = key.lastIndexOf('/');
      var base = key.slice(0, slash + 1) + request;
      var parts = base.split('/'); var clean = [];
      for (var i=0;i<parts.length;i++){ if (!parts[i] || parts[i]==='.') continue; if(parts[i]==='..') clean.pop(); else clean.push(parts[i]); }
      var candidate = clean.join('/');
      if (!modules[candidate]) candidate += '.js';
      if (!modules[candidate]) candidate = clean.join('/') + '/index.js';
      return load(candidate);
    });
    return module.exports;
  }
  var api = load("runtime/index.js");
  global.WhereRuntime = api.WhereRuntime;
  global.GOTOWhere = api;
})(typeof window !== 'undefined' ? window : globalThis);
