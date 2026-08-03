(function (root, factory) {
  var api = factory(root || {});
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.GOTOPrethink = api;
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : null), function (global) {
  'use strict';

  var MAX_CANDIDATES = 5;
  var MIN_CONFIDENCE = 0.45;
  var rememberedApps = [];
  var modelProvider = null;

  function normalize(value) {
    return String(value == null ? '' : value)
      .normalize('NFKC')
      .replace(/[\u0000-\u001f\u007f\u200b-\u200d\u2060\ufeff]/g, ' ')
      .toLowerCase().replace(/\s+/g, ' ').trim();
  }

  function tokens(value) { return normalize(value).match(/[\u3400-\u9fff]+|[a-z0-9]+/g) || []; }

  function appFields(app) {
    if (!app) return [];
    return [app.name, app.label, app.appName, app.en, app.py, app.abbr,
      app.packageName, app.id].map(normalize).filter(function (value) { return value; });
  }

  function appName(app, fallback) {
    return normalize(app && (app.name || app.label || app.appName || app.en) || fallback);
  }

  function appList(options) {
    var list = options && Array.isArray(options.apps) ? options.apps :
      (Array.isArray(global._appDataset) ? global._appDataset : rememberedApps);
    return list.slice();
  }

  function damerauDistance(leftValue, rightValue) {
    var left = normalize(leftValue), right = normalize(rightValue);
    var matrix = [], i, j;
    for (i = 0; i <= left.length; i++) {
      matrix[i] = [];
      for (j = 0; j <= right.length; j++) matrix[i][j] = i === 0 ? j : (j === 0 ? i : 0);
    }
    for (i = 1; i <= left.length; i++) {
      for (j = 1; j <= right.length; j++) {
        var cost = left[i - 1] === right[j - 1] ? 0 : 1;
        matrix[i][j] = Math.min(matrix[i - 1][j] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j - 1] + cost);
        if (i > 1 && j > 1 && left[i - 1] === right[j - 2] && left[i - 2] === right[j - 1]) {
          matrix[i][j] = Math.min(matrix[i][j], matrix[i - 2][j - 2] + cost);
        }
      }
    }
    return matrix[left.length][right.length];
  }

  function addCandidate(map, candidate) {
    if (!candidate || !candidate.query || candidate.confidence < MIN_CONFIDENCE) return;
    var key = normalize(candidate.query), previous = map[key];
    if (!previous || candidate.confidence > previous.confidence) map[key] = candidate;
  }

  function expand(raw, options) {
    options = options || {};
    var original = String(raw == null ? '' : raw);
    var clean = normalize(original);
    var candidates = {}, words = tokens(clean), apps = appList(options);
    var enabled = options.enabled !== false && (options.enabled === true || isEnabled());

    addCandidate(candidates, {
      query: original.trim(), confidence: 1, source: 'ORIGINAL_QUERY', editCost: 0,
      explanation: 'The original query is preserved and has the highest priority.'
    });
    if (!enabled || !clean) return { raw: original, candidates: Object.keys(candidates).map(function (key) { return candidates[key]; }), version: '1.0' };

    apps.forEach(function (app) {
      var fields = appFields(app), canonical = appName(app, fields[0]);
      if (!canonical) return;
      fields.forEach(function (field) {
        words.forEach(function (word, wordIndex) {
          if (field === word) {
            addCandidate(candidates, { query: canonical, appId: app.id || app.packageName || canonical,
              confidence: 0.98, source: 'APP_ALIAS', editCost: 0,
              explanation: 'Application name or alias matched exactly.', tokenIndex: wordIndex });
            return;
          }
          if (word.length > field.length && word.slice(-field.length) === field && word.length - field.length <= 5) {
            addCandidate(candidates, { query: canonical, appId: app.id || app.packageName || canonical,
              confidence: Math.max(0.72, 0.91 - (word.length - field.length) * 0.035),
              source: 'REPEATED_NOISE', editCost: (word.length - field.length) / Math.max(word.length, 1),
              explanation: 'Repeated leading characters were proposed as noise.', tokenIndex: wordIndex });
            return;
          }
          var distance = damerauDistance(word, field);
          var editCost = distance / Math.max(word.length, field.length, 1);
          if (field.length >= 3 && editCost <= 0.42) {
            addCandidate(candidates, { query: canonical, appId: app.id || app.packageName || canonical,
              confidence: Math.max(0.46, 0.9 - editCost * 0.72),
              source: distance === 1 ? 'KEYBOARD_CORRECTION' : 'EDIT_DISTANCE',
              editCost: Number(editCost.toFixed(3)),
              explanation: distance === 1 ? 'One-character keyboard or transposition correction.' : 'Edit distance is within the confidence threshold.',
              tokenIndex: wordIndex });
          }
        });
      });
      if (words.length === 1 && words[0].length <= 3 && canonical.charAt(0) === words[0].charAt(0)) {
        addCandidate(candidates, { query: canonical, appId: app.id || app.packageName || canonical,
          confidence: 0.47, source: 'PREFIX_NEIGHBOR', editCost: 0.53,
          explanation: 'Low-confidence same-prefix candidate.' });
      }
    });

    if (modelProvider && typeof modelProvider === 'function') {
      try {
        var hints = modelProvider({ raw: original, apps: apps, candidates: Object.keys(candidates).map(function (key) { return candidates[key]; }) });
        if (Array.isArray(hints)) hints.slice(0, MAX_CANDIDATES).forEach(function (hint) {
          addCandidate(candidates, Object.assign({}, hint, { source: hint.source || 'MODEL_HINT', explanation: hint.explanation || 'Model-provided pre-association hint.' }));
        });
      } catch (_) {}
    }

    var list = Object.keys(candidates).map(function (key) { return candidates[key]; });
    list.sort(function (a, b) {
      if (a.source === 'ORIGINAL_QUERY') return -1;
      if (b.source === 'ORIGINAL_QUERY') return 1;
      return b.confidence - a.confidence;
    });
    return { raw: original, candidates: list.slice(0, MAX_CANDIDATES), version: '1.0', minConfidence: MIN_CONFIDENCE, maxCandidates: MAX_CANDIDATES };
  }

  function mergeResults(branches) {
    var byApp = {};
    (branches || []).forEach(function (branch) {
      var result = branch && branch.result || {}, candidate = branch && branch.candidate || {};
      (Array.isArray(result.list) ? result.list : []).forEach(function (app, index) {
        var id = String(app.id || app.packageName || app.name || index), scores = result.scores || {};
        var base = Number(scores[id] != null ? scores[id] : (scores[app.name] != null ? scores[app.name] : 100 - index));
        if (!isFinite(base)) base = 100 - index;
        var entry = byApp[id] || { app: app, paths: [], hits: [], mode: '' };
        entry.paths.push({ score: base * Number(candidate.confidence || 1), candidate: candidate });
        (result.hits && result.hits[id] || []).forEach(function (hit) { if (entry.hits.indexOf(hit) < 0) entry.hits.push(hit); });
        entry.mode = entry.mode || (result.modeMap && (result.modeMap[id] || result.modeMap[app.name])) || '';
        byApp[id] = entry;
      });
    });
    var entries = Object.keys(byApp).map(function (id) {
      var entry = byApp[id];
      entry.paths.sort(function (a, b) { return b.score - a.score; });
      var best = entry.paths[0] || { score: 0, candidate: {} }, second = entry.paths[1] ? entry.paths[1].score : 0;
      entry.app._prethinkScore = best.score - 0.1 * second;
      entry.app._prethinkSource = best.candidate.source || 'ORIGINAL_QUERY';
      entry.app._prethinkExplanation = best.candidate.explanation || '';
      return entry;
    }).sort(function (a, b) { return b.app._prethinkScore - a.app._prethinkScore; });
    var output = { list: entries.map(function (entry) { return entry.app; }), hits: {}, scores: {}, modeMap: {}, intentLabel: entries.length ? 'GOTO Prethink + Engine' : 'No intent identified' };
    entries.forEach(function (entry) {
      var id = String(entry.app.id || entry.app.packageName || entry.app.name);
      output.hits[id] = entry.hits; output.scores[id] = entry.app._prethinkScore;
      output.modeMap[id] = entry.mode || ('Prethink · ' + entry.app._prethinkSource);
    });
    return output;
  }

  function scorePaths(scores) {
    var values = (Array.isArray(scores) ? scores : []).map(Number).filter(function (value) { return isFinite(value); }).sort(function (a, b) { return b - a; });
    return (values[0] || 0) - 0.1 * (values[1] || 0);
  }

  function explainCandidate(candidate) {
    candidate = candidate || {};
    return { query: String(candidate.query || ''), confidence: Number(candidate.confidence || 0), source: String(candidate.source || 'UNKNOWN'), editCost: Number(candidate.editCost || 0), explanation: String(candidate.explanation || '') };
  }

  function isEnabled() {
    try { return !!(global.localStorage && global.localStorage.getItem('goto_prethink_enabled') === '1'); } catch (_) { return false; }
  }

  function apiContract() {
    return { name: 'goto-prethink', version: '1.0', role: 'query-expansion', preservesRawQuery: true,
      maxCandidates: MAX_CANDIDATES, minConfidence: MIN_CONFIDENCE,
      sources: ['ORIGINAL_QUERY', 'APP_ALIAS', 'REPEATED_NOISE', 'KEYBOARD_CORRECTION', 'EDIT_DISTANCE', 'PREFIX_NEIGHBOR', 'MODEL_HINT'] };
  }

  function create(config) {
    config = config || {};
    var localApps = Array.isArray(config.apps) ? config.apps.slice() : [];
    var localProvider = typeof config.modelProvider === 'function' ? config.modelProvider : null;
    var localEnabled = config.enabled !== false;
    var instance = {
      version: '1.0', contract: apiContract(), mergeResults: mergeResults, scorePaths: scorePaths, explainCandidate: explainCandidate,
      expand: function (raw, options) {
        options = Object.assign({}, options || {}, { apps: options && Array.isArray(options.apps) ? options.apps : localApps, enabled: options && options.enabled != null ? options.enabled : localEnabled });
        var previous = modelProvider; modelProvider = localProvider;
        try { return expand(raw, options); } finally { modelProvider = previous; }
      },
      observeApps: function (apps) { localApps = Array.isArray(apps) ? apps.slice() : []; return localApps.length; },
      setModelProvider: function (provider) { localProvider = typeof provider === 'function' ? provider : null; return !!localProvider; },
      destroy: function () { localApps = []; localProvider = null; }
    };
    instance.search = function (raw, engineSearch, options) {
      var report = instance.expand(raw, options || {});
      if (typeof engineSearch !== 'function') return Promise.resolve({ raw: raw, candidates: report.candidates, result: null });
      return Promise.all(report.candidates.map(function (candidate) { return Promise.resolve(engineSearch(candidate.query, candidate)).then(function (result) { return { candidate: candidate, result: result || { list: [] } }; }); }))
        .then(function (branches) { return { raw: raw, candidates: report.candidates, result: mergeResults(branches) }; });
    };
    return instance;
  }

  var api = { version: '1.0', contract: apiContract(), maxCandidates: MAX_CANDIDATES, minConfidence: MIN_CONFIDENCE,
    expand: expand, mergeResults: mergeResults, scorePaths: scorePaths, explainCandidate: explainCandidate, create: create,
    search: function (raw, engineSearch, options) { return create(options || {}).search(raw, engineSearch, options || {}); },
    isEnabled: isEnabled,
    setEnabled: function (enabled) { try { global.localStorage.setItem('goto_prethink_enabled', enabled ? '1' : '0'); } catch (_) {} return !!enabled; },
    observeApps: function (apps) { rememberedApps = Array.isArray(apps) ? apps.slice() : []; return rememberedApps.length; },
    setModelProvider: function (provider) { modelProvider = typeof provider === 'function' ? provider : null; return !!modelProvider; },
    getModelProvider: function () { return modelProvider; }
  };
  api.registerModelProvider = api.setModelProvider;
  return api;
});
