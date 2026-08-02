(function communityDockModule(){
  'use strict';

  var GISCUS_CONFIG = Object.assign({
    repo: 'longqiyua/goto',
    repoId: '',
    category: 'Announcements',
    categoryId: '',
    mapping: 'specific',
    term: 'GOTO Community / Say Hello'
  }, window.GOTO_GISCUS_CONFIG || {});

  var activePanel = null;
  var giscusMounted = false;

  function isEnglish(){
    return window._lang === 'en' || document.documentElement.lang === 'en' || document.body.classList.contains('lang-en');
  }

  function translateCommunityDock(){
    var en = isEnglish();
    document.querySelectorAll('[data-community-zh]').forEach(function(node){
      node.textContent = node.getAttribute(en ? 'data-community-en' : 'data-community-zh') || node.textContent;
    });
    document.querySelectorAll('[data-community-placeholder-zh]').forEach(function(node){
      node.placeholder = node.getAttribute(en ? 'data-community-placeholder-en' : 'data-community-placeholder-zh') || '';
    });
    document.querySelectorAll('.community-panel-close').forEach(function(node){
      node.setAttribute('aria-label', en ? 'Close' : '关闭');
    });
    renderGiscusSetupNote();
    syncGiscusTheme();
  }

  function panelFor(type){
    return document.getElementById(type === 'hello' ? 'helloDockPanel' : 'sponsorDockPanel');
  }

  function triggerFor(type){
    return document.getElementById(type === 'hello' ? 'helloDockTrigger' : 'sponsorDockTrigger');
  }

  function closePanel(type){
    var panel = panelFor(type);
    var trigger = triggerFor(type);
    if(panel){ panel.classList.remove('is-open'); panel.setAttribute('aria-hidden','true'); }
    if(trigger){ trigger.classList.remove('is-active'); trigger.setAttribute('aria-expanded','false'); }
    if(activePanel === type) activePanel = null;
    var dock = document.getElementById('communityDock');
    if(dock && !activePanel) dock.classList.remove('has-open-panel');
  }

  function openPanel(type){
    if(activePanel && activePanel !== type) closePanel(activePanel);
    var panel = panelFor(type);
    var trigger = triggerFor(type);
    var dock = document.getElementById('communityDock');
    if(!panel || !trigger || !dock) return;
    activePanel = type;
    panel.classList.add('is-open');
    panel.setAttribute('aria-hidden','false');
    trigger.classList.add('is-active');
    trigger.setAttribute('aria-expanded','true');
    dock.classList.add('has-open-panel');
    if(type === 'hello') mountGiscus();
  }

  function togglePanel(type, force){
    var shouldOpen = typeof force === 'boolean' ? force : activePanel !== type;
    if(shouldOpen) openPanel(type); else closePanel(type);
  }

  function notify(messageZh,messageEn){
    var message = isEnglish() ? messageEn : messageZh;
    if(typeof window.toast === 'function') window.toast(message);
  }

  function loadIdentity(){
    try{
      var saved = JSON.parse(localStorage.getItem('goto_community_identity') || '{}');
      var name = document.getElementById('helloNameInput');
      var contact = document.getElementById('helloContactInput');
      if(name) name.value = saved.name || '';
      if(contact) contact.value = saved.contact || '';
    }catch(_){ }
  }

  function readIdentity(){
    return {
      name: (document.getElementById('helloNameInput') || {}).value || '',
      contact: (document.getElementById('helloContactInput') || {}).value || ''
    };
  }

  function saveIdentity(source){
    try{
      var previous = JSON.parse(localStorage.getItem('goto_community_identity') || '{}');
      var next = Object.assign({},previous,readIdentity());
      localStorage.setItem('goto_community_identity',JSON.stringify(next));
      loadIdentity();
      notify('已保存到当前设备','Saved on this device');
    }catch(_){
      notify('当前浏览器无法保存','This browser could not save the information');
    }
  }

  function copyIdentity(){
    var identity = readIdentity();
    var text = isEnglish()
      ? 'Name: ' + (identity.name || '—') + '\nContact (optional): ' + (identity.contact || '—')
      : '称呼：' + (identity.name || '—') + '\n联系方式（可选）：' + (identity.contact || '—');
    if(navigator.clipboard && navigator.clipboard.writeText){
      navigator.clipboard.writeText(text).then(function(){
        notify('联系卡已复制，可按需粘贴到留言','Contact card copied; paste it into your message if desired');
      }).catch(function(){ fallbackCopy(text); });
    }else fallbackCopy(text);
  }

  function fallbackCopy(text){
    var area = document.createElement('textarea');
    area.value = text; area.style.position='fixed'; area.style.opacity='0';
    document.body.appendChild(area); area.select();
    try{ document.execCommand('copy'); notify('联系卡已复制，可按需粘贴到留言','Contact card copied'); }
    catch(_){ notify('复制失败，请手动填写','Copy failed; please enter it manually'); }
    area.remove();
  }

  function triggerBadgeDownload(url,filename){
    var anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  }

  function downloadBadgeBlob(blob,filename){
    var url=URL.createObjectURL(blob);
    triggerBadgeDownload(url,filename);
    window.setTimeout(function(){URL.revokeObjectURL(url);},1200);
  }

  function badgeHtmlDocument(){
    return '<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'
      + '<title>GOTO Badge</title><style>*{box-sizing:border-box}body{margin:0;min-height:100vh;display:grid;place-items:center;background:#111216;color:#fff;font-family:Arial,sans-serif;perspective:1200px}.card{width:min(82vw,720px);aspect-ratio:1.84;position:relative;transform-style:preserve-3d;transition:transform .9s cubic-bezier(.2,1,.3,1);cursor:pointer}.card.flip{transform:rotateY(180deg)}.face{position:absolute;inset:0;padding:9%;display:flex;flex-direction:column;justify-content:space-between;backface-visibility:hidden;border:1px solid #777;border-radius:6%;overflow:hidden;background:linear-gradient(135deg,#565a61 0%,#17191d 24%,#3d4148 48%,#0f1115 76%,#555a62 100%);box-shadow:0 35px 90px #0009,inset 0 1px #fff8}.face:before{content:"";position:absolute;inset:0;background:linear-gradient(110deg,transparent 20%,#fff4 42%,transparent 58%),radial-gradient(circle at 18% 8%,var(--accent,#A85434) 0 2%,transparent 18%);mix-blend-mode:screen;pointer-events:none}.back{transform:rotateY(180deg);background:linear-gradient(145deg,#23262b,#08090c 55%,#4b5058)}h1{margin:0;font-size:clamp(48px,12vw,118px);letter-spacing:-.07em}.tag{font-weight:700;letter-spacing:.22em;color:#d8dbe1}.rainbow{height:5px;border-radius:9px;background:linear-gradient(90deg,#f35,#fb3,#8e5,#3cf,#65f,#c5f)}button{position:fixed;bottom:7vh;border:1px solid #ffffff55;border-radius:999px;padding:12px 20px;background:#ffffff12;color:#fff;backdrop-filter:blur(14px);cursor:pointer}</style>'
      + '<body><div class="card" id="card"><section class="face"><div class="rainbow"></div><h1>GOTO</h1><div class="tag">FOCUS · LOCAL-FIRST · 2021.7.22</div></section><section class="face back"><div class="rainbow"></div><h1>GOTO</h1><div class="tag">A CALM LAUNCHER FOR YOUR APPS</div></section></div><button id="flip">反转 / FLIP</button>'
      + '<script>const c=document.getElementById("card"),f=()=>c.classList.toggle("flip");c.onclick=f;document.getElementById("flip").onclick=f;<\/script></body></html>';
  }

  function downloadBadgeHtml(){
    downloadBadgeBlob(new Blob([badgeHtmlDocument()],{type:'text/html;charset=utf-8'}),'goto-badge.html');
    notify('HTML 徽章已下载','HTML badge downloaded');
  }

  function downloadBadgePng(){
    var canvas=document.createElement('canvas');
    canvas.width=1600; canvas.height=870;
    var ctx=canvas.getContext('2d');
    var bg=ctx.createLinearGradient(0,0,1600,870);
    bg.addColorStop(0,'#555a62'); bg.addColorStop(.28,'#17191d'); bg.addColorStop(.7,'#0f1115'); bg.addColorStop(1,'#4b5058');
    ctx.fillStyle=bg; ctx.fillRect(0,0,1600,870);
    ctx.fillStyle='#ff5a00'; ctx.fillRect(110,112,280,10);
    ctx.fillStyle='#f5f5f2'; ctx.font='700 210px Poppins,Arial,sans-serif'; ctx.fillText('GOTO',110,410);
    ctx.fillStyle='#d8dbe1'; ctx.font='600 34px Arial,sans-serif'; ctx.letterSpacing='8px'; ctx.fillText('FOCUS · LOCAL-FIRST · V1.0',118,515);
    ctx.fillStyle='#ffffff26'; ctx.fillRect(110,650,1380,2);
    ctx.fillStyle='#b9bec8'; ctx.font='28px Arial,sans-serif'; ctx.fillText('A CALM LAUNCHER FOR YOUR APPS',118,720);
    canvas.toBlob(function(blob){
      if(blob) downloadBadgeBlob(blob,'goto-badge.png');
      else triggerBadgeDownload(canvas.toDataURL('image/png'),'goto-badge.png');
      notify('PNG 徽章已下载','PNG badge downloaded');
    },'image/png');
  }
  function flipBadge(){
    var card=document.getElementById('gotoBadgeCard');
    var button=document.getElementById('gotoBadgeFlip');
    if(!card)return;
    var flipped=card.classList.toggle('is-flipped');
    if(button)button.setAttribute('aria-pressed',flipped?'true':'false');
  }

  function closeBadgeExperience(){
    var overlay=document.getElementById('gotoBadgeOverlay');
    if(!overlay)return;
    overlay.classList.remove('is-open');
    overlay.setAttribute('aria-hidden','true');
    document.body.classList.remove('badge-overlay-open');
  }

  function ensureBadgeOverlay(){
    var overlay=document.getElementById('gotoBadgeOverlay');
    if(overlay)return overlay;
    overlay=document.createElement('div');
    overlay.id='gotoBadgeOverlay';
    overlay.className='goto-badge-overlay';
    overlay.setAttribute('aria-hidden','true');
    overlay.innerHTML='<button class="goto-badge-close" id="gotoBadgeClose" type="button" aria-label="Close">×</button>'
      + '<div class="goto-badge-stage"><button class="goto-metal-badge" id="gotoBadgeCard" type="button" aria-label="Flip GOTO badge">'
      + '<span class="goto-badge-face goto-badge-front"><i class="goto-rainbow-line"></i><span class="goto-badge-chip"></span><strong>GOTO</strong><small>FOCUS · LOCAL-FIRST · 2021.7.22</small></span>'
      + '<span class="goto-badge-face goto-badge-back"><i class="goto-badge-magstripe"></i><i class="goto-rainbow-line"></i><strong>GOTO</strong><small data-community-zh="安静、专注的应用启动器" data-community-en="A calm launcher for your apps">安静、专注的应用启动器</small></span></button>'
      + '<div class="goto-badge-actions"><button id="gotoBadgeFlip" type="button" aria-pressed="false" data-community-zh="反转" data-community-en="Flip">反转</button><button id="gotoBadgeHtml" type="button">HTML</button><button id="gotoBadgePng" type="button">PNG</button></div></div>';
    document.body.appendChild(overlay);
    document.getElementById('gotoBadgeClose').addEventListener('click',closeBadgeExperience);
    document.getElementById('gotoBadgeCard').addEventListener('click',flipBadge);
    document.getElementById('gotoBadgeFlip').addEventListener('click',flipBadge);
    document.getElementById('gotoBadgeHtml').addEventListener('click',downloadBadgeHtml);
    document.getElementById('gotoBadgePng').addEventListener('click',downloadBadgePng);
    overlay.addEventListener('click',function(event){if(event.target===overlay)closeBadgeExperience();});
    translateCommunityDock();
    return overlay;
  }

  function downloadBadge(){
    var overlay=ensureBadgeOverlay();
    overlay.setAttribute('aria-hidden','false');
    document.body.classList.add('badge-overlay-open');
    requestAnimationFrame(function(){overlay.classList.add('is-open');});
  }

  function hasGiscusConfig(){
    return Boolean(GISCUS_CONFIG.repo && GISCUS_CONFIG.repoId && GISCUS_CONFIG.category && GISCUS_CONFIG.categoryId);
  }

  function renderGiscusSetupNote(){
    var note = document.getElementById('giscusSetupNote');
    if(!note || hasGiscusConfig()) return;
    var en = isEnglish();
    note.innerHTML = '<b style="color:var(--accent,#C45A26);">'+(en?'giscus App not installed':'giscus App 未安装')+'</b>'+
      '<p style="margin:6px 0 8px;line-height:1.6;">'+(en?'The giscus GitHub App has not been installed on this repository yet.':'giscus GitHub App 尚未安装到此仓库。')+'</p>'+
      '<ol style="margin:0 0 8px 16px;padding:0;line-height:1.7;font-size:10px;">'+
      '<li>'+(en?'Install ':'安装 ')+'<a href="https://github.com/apps/giscus" target="_blank" rel="noopener" style="color:var(--accent,#C45A26);">giscus App</a> '+('to your repo')+'</li>'+
      '<li>'+(en?'Get categoryId from ':'从 ')+'<a href="https://giscus.app/zh-CN" target="_blank" rel="noopener" style="color:var(--accent,#C45A26);">giscus.app</a> '+('配置页获取 categoryId')+'</li>'+
      '<li>'+(en?'Fill in ':'填入 ')+'<code style="background:rgba(0,0,0,0.06);padding:1px 3px;border-radius:3px;">community-config.js</code></li>'+
      '</ol>'+
      '<div><a href="https://github.com/'+GISCUS_CONFIG.repo+'/discussions" target="_blank" rel="noopener" style="color:var(--muted);font-size:10px;">GitHub Discussions ↗</a></div>';
  }

  function mountGiscus(){
    if(giscusMounted) return;
    renderGiscusSetupNote();
    if(!hasGiscusConfig()) return;
    var host = document.getElementById('giscusHost');
    if(!host) return;
    host.innerHTML = '';
    var script = document.createElement('script');
    script.src = 'https://giscus.app/client.js';
    script.async = true;
    script.crossOrigin = 'anonymous';
    script.setAttribute('data-repo',GISCUS_CONFIG.repo);
    script.setAttribute('data-repo-id',GISCUS_CONFIG.repoId);
    script.setAttribute('data-category',GISCUS_CONFIG.category);
    script.setAttribute('data-category-id',GISCUS_CONFIG.categoryId);
    script.setAttribute('data-mapping',GISCUS_CONFIG.mapping);
    script.setAttribute('data-term',GISCUS_CONFIG.term);
    script.setAttribute('data-strict','1');
    script.setAttribute('data-reactions-enabled','1');
    script.setAttribute('data-emit-metadata','0');
    script.setAttribute('data-input-position','top');
    script.setAttribute('data-theme',document.body.classList.contains('dark') || document.body.classList.contains('light-sense-dark') ? 'dark' : 'light');
    script.setAttribute('data-lang',isEnglish() ? 'en' : 'zh-CN');
    script.setAttribute('data-loading','lazy');
    script.onerror=function(){
      host.innerHTML='<div class="giscus-setup-note" style="display:block;padding:13px;border:1.2px dashed rgba(150,150,150,0.25);border-radius:9px;font-size:10px;color:#999;line-height:1.6;">评论区加载失败（仓库未启用 giscus 或网络异常）。可前往 <a href="https://github.com/'+GISCUS_CONFIG.repo+'/discussions" target="_blank" rel="noopener" style="color:var(--accent,#B75A48);">GitHub Discussions</a> 直接留言。</div>';
    };
    host.appendChild(script);
    giscusMounted = true;
  }

  function syncGiscusTheme(){
    var frame = document.querySelector('#giscusHost iframe.giscus-frame');
    if(!frame || !frame.contentWindow) return;
    frame.contentWindow.postMessage({giscus:{setConfig:{
      theme:document.body.classList.contains('dark') || document.body.classList.contains('light-sense-dark') ? 'dark' : 'light',
      lang:isEnglish() ? 'en' : 'zh-CN'
    }}},'https://giscus.app');
  }

  function bind(){
    var sponsor = triggerFor('sponsor');
    var hello = triggerFor('hello');
    if(sponsor) sponsor.addEventListener('click',function(){togglePanel('sponsor');});
    if(hello) hello.addEventListener('click',function(){togglePanel('hello');});
    document.querySelectorAll('[data-community-close]').forEach(function(button){
      button.addEventListener('click',function(){closePanel(button.getAttribute('data-community-close'));});
    });
    var saveHello = document.getElementById('saveHelloIdentity');
    var copyHello = document.getElementById('copyHelloIdentity');
    var badge = document.getElementById('downloadGotoBadge');
    if(saveHello) saveHello.addEventListener('click',function(){saveIdentity('hello');});
    if(copyHello) copyHello.addEventListener('click',copyIdentity);
    if(badge) badge.addEventListener('click',downloadBadge);
    document.querySelectorAll('.support-qr-frame img').forEach(function(image){
      image.addEventListener('error',function(){
        image.closest('.support-qr-frame').classList.add('is-missing');
        image.alt = isEnglish() ? 'QR code reserved area' : '收款码预留位置';
      });
    });
    document.addEventListener('keydown',function(event){if(event.key==='Escape')closeBadgeExperience();});
    new MutationObserver(syncGiscusTheme).observe(document.body,{attributes:true,attributeFilter:['class']});
  }

  function init(){
    bind();
    loadIdentity();
    translateCommunityDock();
  }

  window.toggleCommunityDock = togglePanel;
  window.syncCommunityDockLanguage = translateCommunityDock;
  window.GOTO_GISCUS_CONFIG = GISCUS_CONFIG;
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();
