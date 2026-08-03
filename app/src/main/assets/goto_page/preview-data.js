(function(root, factory){
  'use strict';
  var api = factory();
  if(typeof module === 'object' && module.exports) module.exports = api;
  if(root) {
    root.GOTODataIO = api;
    if(root.document) api.installBrowserBindings(root);
  }
})(typeof window !== 'undefined' ? window : null, function(){
  'use strict';

  var SCHEMA = 'goto-transfer';
  var VERSION = 2;
  var SENSITIVE_KEYS = ['goto_webdav_config', 'goto_s3_cfg'];
  var NON_TRANSFERABLE_KEYS = ['goto_activated','goto_activated_at','goto_authorized','goto_authorized_at','goto_stat_shortcut_gesture'];
  var STAT_EXACT = [
    'goto_stat_searches','goto_stat_shortcut_index',
    'goto_app_stats','goto_recent_apps','goto_hour_buckets',
    'goto_simint_user_memory','goto_simint_pending_index','goto_simint_stats',
    'goto_engine_rule_weights','goto_engine_rule_weights_ts','goto_engine_action_chains',
    'goto_engine_negative_feedback','goto_engine_block_flags','goto_engine_self_healing',
    'goto_engine_pro_snapshot','goto_engine_global_preference'
  ];
  var STAT_PREFIX = ['goto_stats_hourly_'];

  function isStatKey(key){
    return STAT_EXACT.indexOf(key) >= 0 || STAT_PREFIX.some(function(prefix){ return key.indexOf(prefix) === 0; });
  }
  function isConfigKey(key){
    return key.indexOf('goto_') === 0 && !isStatKey(key) && SENSITIVE_KEYS.indexOf(key) < 0 && NON_TRANSFERABLE_KEYS.indexOf(key) < 0;
  }
  function decodeValue(raw){
    if(raw === null || raw === undefined) return null;
    try { return JSON.parse(raw); } catch(_) { return String(raw); }
  }
  function encodeValue(value){
    return typeof value === 'string' ? value : JSON.stringify(value);
  }
  function collect(storage, kind){
    var data = {};
    if(kind === 'stats' && storage.getItem('goto_activated') !== '1') return data;
    for(var i=0; i<storage.length; i++){
      var key = storage.key(i);
      if(!key) continue;
      var allowed = kind === 'stats' ? isStatKey(key) : isConfigKey(key);
      if(allowed) data[key] = decodeValue(storage.getItem(key));
    }
    return data;
  }
  function makePackage(kind, storage, now){
    if(kind !== 'config' && kind !== 'stats') throw new Error('不支持的数据类型');
    return {
      schema: SCHEMA,
      version: VERSION,
      kind: kind,
      app: 'GOTO',
      exportedAt: (now || new Date()).toISOString(),
      excluded: kind === 'config' ? SENSITIVE_KEYS.slice() : [],
      data: collect(storage, kind)
    };
  }
  function extractJsonFromHtml(text){
    var match = String(text).match(/<script[^>]+type=["']application\/json["'][^>]*>([\s\S]*?)<\/script>/i);
    if(match) return match[1].replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&amp;/g,'&');
    var pre = String(text).match(/<pre[^>]*>([\s\S]*?)<\/pre>/i);
    if(pre) return pre[1].replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&amp;/g,'&');
    throw new Error('HTML 中没有可识别的 GOTO 数据');
  }
  function parseCsv(text){
    var lines = String(text).replace(/^\uFEFF/,'').split(/\r?\n/).filter(Boolean);
    if(!lines.length || !/^key,value$/i.test(lines[0].trim())) throw new Error('CSV 表头应为 key,value');
    var data = {};
    lines.slice(1).forEach(function(line){
      var match = line.match(/^"((?:[^"]|"")*)","((?:[^"]|"")*)"$/);
      if(!match) return;
      var key = match[1].replace(/""/g,'"');
      var raw = match[2].replace(/""/g,'"');
      data[key] = decodeValue(raw);
    });
    return data;
  }
  function parsePayload(text){
    var source = String(text || '').trim();
    if(!source) throw new Error('文件内容为空');
    if(source.charAt(0) === '<') source = extractJsonFromHtml(source);
    if(/^key,value(?:\r?\n|$)/i.test(source)) return {legacy:true, data:parseCsv(source)};
    var parsed = JSON.parse(source);
    if(!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('数据根节点必须是对象');
    if(parsed.schema === SCHEMA){
      if(parsed.version > VERSION) throw new Error('数据版本高于当前软件，请先升级 GOTO');
      if(parsed.kind !== 'config' && parsed.kind !== 'stats') throw new Error('数据包类型无效');
      if(!parsed.data || typeof parsed.data !== 'object' || Array.isArray(parsed.data)) throw new Error('数据包缺少 data');
      return parsed;
    }
    return {legacy:true, data:parsed};
  }
  function normalizeImport(parsed, expectedKind){
    if(parsed.kind && parsed.kind !== expectedKind) throw new Error(expectedKind === 'config' ? '请选择配置数据文件' : '请选择统计数据文件');
    var source = parsed.data || {};
    var keys = Object.keys(source);
    var output = {};
    var hasStorageKeys = keys.some(function(key){ return key.indexOf('goto_') === 0; });
    if(expectedKind === 'config' && !hasStorageKeys && !parsed.kind){
      output.goto_settings = source;
      return output;
    }
    keys.forEach(function(key){
      var allowed = expectedKind === 'stats' ? isStatKey(key) : isConfigKey(key);
      if(allowed) output[key] = source[key];
    });
    if(!Object.keys(output).length) throw new Error('没有找到可导入的'+(expectedKind === 'config' ? '配置' : '统计')+'数据');
    return output;
  }
  function applyImport(storage, expectedKind, parsed){
    var values = normalizeImport(parsed, expectedKind);
    Object.keys(values).forEach(function(key){ storage.setItem(key, encodeValue(values[key])); });
    return Object.keys(values);
  }
  function toCsv(pkg){
    var lines = ['key,value'];
    Object.keys(pkg.data).sort().forEach(function(key){
      var value = encodeValue(pkg.data[key]).replace(/"/g,'""');
      lines.push('"'+key.replace(/"/g,'""')+'","'+value+'"');
    });
    return '\uFEFF'+lines.join('\n');
  }
  function serialize(pkg, format){
    if(format === 'csv') return toCsv(pkg);
    return JSON.stringify(pkg, null, 2);
  }

  function installBrowserBindings(win){
    var doc = win.document;
    function notify(message){ if(typeof win.toast === 'function') win.toast(message); }
    function filename(kind, ext){
      var stamp = new Date().toISOString().slice(0,10).replace(/-/g,'');
      return 'GOTO_'+(kind === 'config' ? '配置' : '统计')+'_'+stamp+'.'+ext;
    }
    function download(content, type, name){
      var blob = new Blob([content], {type:type});
      var url = URL.createObjectURL(blob);
      var anchor = doc.createElement('a');
      anchor.href = url; anchor.download = name;
      doc.body.appendChild(anchor); anchor.click(); anchor.remove();
      setTimeout(function(){ URL.revokeObjectURL(url); }, 500);
    }
    function exportPng(kind, pkg){
      var canvas = doc.createElement('canvas');
      var keys = Object.keys(pkg.data);
      canvas.width = 1200; canvas.height = 720;
      var ctx = canvas.getContext('2d');
      var accent = getComputedStyle(doc.body).getPropertyValue('--accent').trim() || '#B22222';
      ctx.fillStyle = '#F2F2F0'; ctx.fillRect(0,0,1200,720);
      ctx.fillStyle = '#171719'; ctx.fillRect(54,54,1092,612);
      ctx.fillStyle = accent; ctx.fillRect(54,54,12,612);
      ctx.font = '900 92px Inter, Arial, sans-serif'; ctx.fillStyle = '#FFFFFF'; ctx.fillText('GOTO',104,168);
      ctx.font = '600 34px sans-serif'; ctx.fillStyle = '#D6D6D8'; ctx.fillText(kind === 'config' ? '配置数据摘要' : '统计数据摘要',108,238);
      ctx.font = '500 25px sans-serif'; ctx.fillStyle = '#9C9CA3';
      ctx.fillText('格式版本  '+pkg.version,108,330);
      ctx.fillText('数据项目  '+keys.length,108,378);
      ctx.fillText('导出时间  '+new Date(pkg.exportedAt).toLocaleString(),108,426);
      ctx.fillText(kind === 'config' ? '安全策略  已排除云备份凭据' : '范围  搜索、启动、时段与智能统计',108,474);
      ctx.fillStyle = accent; ctx.fillRect(890,132,164,164);
      ctx.font = '800 22px Inter, Arial, sans-serif'; ctx.fillStyle = '#FFFFFF'; ctx.fillText('LOCAL',934,220);
      ctx.font = '500 20px sans-serif'; ctx.fillStyle = '#77777E'; ctx.fillText('GOTO · 数据仅由用户在本机导出',108,594);
      canvas.toBlob(function(blob){
        if(!blob){ notify('PNG 导出失败'); return; }
        var url = URL.createObjectURL(blob); var a=doc.createElement('a');
        a.href=url; a.download=filename(kind,'png'); doc.body.appendChild(a); a.click(); a.remove();
        setTimeout(function(){URL.revokeObjectURL(url);},500); notify('PNG 摘要已导出');
      }, 'image/png');
    }
    function exportKind(kind, format){
      try{
        var fmt = String(format || 'json').toLowerCase();
        var pkg = makePackage(kind, win.localStorage);
        if(fmt === 'png'){ exportPng(kind,pkg); return; }
        var body = serialize(pkg, fmt);
        var mime = fmt === 'csv' ? 'text/csv;charset=utf-8' : fmt === 'txt' ? 'text/plain;charset=utf-8' : 'application/json;charset=utf-8';
        download(body,mime,filename(kind,fmt));
        notify((kind === 'config' ? '配置' : '统计')+'已导出 · '+fmt.toUpperCase());
      }catch(error){ console.error('[GOTO data export]',error); notify('导出失败：'+error.message); }
    }
    function finishImport(kind, text){
      var parsed = parsePayload(text);
      var keys = applyImport(win.localStorage,kind,parsed);
      notify((kind === 'config' ? '配置' : '统计')+'已导入 · '+keys.length+' 项');
      if(kind === 'stats' && typeof win._refreshStatsPanel === 'function') win._refreshStatsPanel();
      if(kind === 'config') setTimeout(function(){ win.location.reload(); },650);
    }
    function importKind(kind, source){
      if(source === 'clipboard'){
        if(!win.navigator.clipboard || !win.navigator.clipboard.readText){ notify('当前浏览器不支持剪贴板读取'); return; }
        win.navigator.clipboard.readText().then(function(text){ finishImport(kind,text); }).catch(function(error){ notify('导入失败：'+error.message); });
        return;
      }
      var input = doc.createElement('input');
      input.type='file'; input.accept='.json,.txt,.csv,.html,application/json,text/plain,text/csv,text/html';
      input.onchange=function(){
        var file=input.files && input.files[0]; if(!file) return;
        var reader=new FileReader();
        reader.onload=function(){ try{ finishImport(kind,reader.result); }catch(error){ notify('导入失败：'+error.message); } };
        reader.onerror=function(){ notify('文件读取失败'); };
        reader.readAsText(file);
      };
      input.click();
    }
    win.exportConfigAs=function(format){ exportKind('config',format); };
    win.exportStatsAs=function(format){ exportKind('stats',format); };
    win.importConfigData=function(source){ importKind('config',source); };
    win.importStatsData=function(source){ importKind('stats',source); };

    /* 文案在创建、重置、编辑三条路径中保持一致。 */
    function normalizeShortcutCopy(){
      var button=doc.getElementById('sieSaveBtn');
      if(button && button.textContent !== '保存修改') button.textContent='保存';
    }
    if(doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded',normalizeShortcutCopy,{once:true});
    else normalizeShortcutCopy();
    var originalAdd=win.addShortcutInline;
    if(typeof originalAdd === 'function'){
      win.addShortcutInline=function(){ var result=originalAdd.apply(this,arguments); setTimeout(normalizeShortcutCopy,0); return result; };
    }
  }

  return {
    schema:SCHEMA, version:VERSION,
    isStatKey:isStatKey, isConfigKey:isConfigKey,
    collect:collect, makePackage:makePackage, parsePayload:parsePayload,
    normalizeImport:normalizeImport, applyImport:applyImport,
    serialize:serialize, installBrowserBindings:installBrowserBindings
  };
});
