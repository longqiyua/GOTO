(function (root, factory) {
  var api = factory(root || {});
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.NoteToShow = api;
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : null), function (global) {
  'use strict';

  var VERSION = '1.0.0';

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function inlineMarkdown(value) {
    return escapeHtml(value)
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/__([^_]+)__/g, '<strong>$1</strong>')
      .replace(/\*([^*]+)\*/g, '<em>$1</em>')
      .replace(/\[([^\]]+)\]\((https?:[^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
  }

  function renderMarkdown(source) {
    var lines = String(source || '').replace(/\r/g, '').split('\n');
    var out = [], list = '', inCode = false, code = [];
    function closeList() { if (list) out.push('</' + list + '>'); list = ''; }
    function closeCode() { if (inCode) { out.push('<pre><code>' + escapeHtml(code.join('\n')) + '</code></pre>'); code = []; inCode = false; } }
    lines.forEach(function (line) {
      if (/^\s*```/.test(line)) { if (inCode) closeCode(); else { closeList(); inCode = true; } return; }
      if (inCode) { code.push(line); return; }
      if (!line.trim()) { closeList(); return; }
      var match = line.match(/^(#{1,4})\s+(.+)$/);
      if (match) { closeList(); out.push('<h' + match[1].length + '>' + inlineMarkdown(match[2]) + '</h' + match[1].length + '>'); return; }
      if (/^\s*([-*_])(?:\s*\1){2,}\s*$/.test(line)) { closeList(); out.push('<hr>'); return; }
      match = line.match(/^[-*+]\s+(.+)$/);
      if (match) { if (list !== 'ul') { closeList(); list = 'ul'; out.push('<ul>'); } out.push('<li>' + inlineMarkdown(match[1]) + '</li>'); return; }
      match = line.match(/^\d+\.\s+(.+)$/);
      if (match) { if (list !== 'ol') { closeList(); list = 'ol'; out.push('<ol>'); } out.push('<li>' + inlineMarkdown(match[1]) + '</li>'); return; }
      if (/^>\s?/.test(line)) { closeList(); out.push('<blockquote><p>' + inlineMarkdown(line.replace(/^>\s?/, '')) + '</p></blockquote>'); return; }
      closeList(); out.push('<p>' + inlineMarkdown(line) + '</p>');
    });
    closeCode(); closeList();
    return out.join('\n');
  }

  function dispatch(target, name, detail) {
    try { target.dispatchEvent(new CustomEvent(name, { detail: detail })); } catch (_) { }
  }

  function NoteToShow(rootEl, options) {
    this.root = rootEl;
    this.options = Object.assign({ sourceRoot: 'Document/', bundle: null, watchInterval: 2200, style: 'default', renderSource: null, onRendered: null, onError: null }, options || {});
    this.current = null; this.timer = null; this.destroyed = false;
    if (this.root) { this.root.classList.add('note-to-show-root'); this.setStyle(this.options.style); }
  }

  NoteToShow.prototype.setStyle = function (style) { if (this.root) this.root.setAttribute('data-note-style', style || 'default'); return this; };
  NoteToShow.prototype._sourceFromNetwork = async function (file) {
    var response = await fetch(this.options.sourceRoot + file, { cache: 'no-store' });
    if (!response.ok) throw new Error('note-to-show source unavailable: ' + file);
    return response.text();
  };
  NoteToShow.prototype.loadSource = async function (file, force) {
    var bundle = this.options.bundle || global.GOTO_DOCUMENT_BUNDLE || {};
    if (!force && typeof bundle[file] === 'string') return bundle[file];
    try { return await this._sourceFromNetwork(file); } catch (error) { if (typeof bundle[file] === 'string') return bundle[file]; throw error; }
  };
  NoteToShow.prototype.toHtml = function (source, note) {
    if (typeof this.options.renderSource === 'function') return this.options.renderSource(source, note);
    if (/\.(?:html?|xhtml)$/i.test(note.file || '')) return source;
    if (typeof global.markdownit === 'function') return global.markdownit({ html: true, linkify: true, breaks: false }).render(source);
    return renderMarkdown(source);
  };
  NoteToShow.prototype.render = function (note, source) {
    var self = this, payload = Object.assign({}, note, { source: source });
    if (this.destroyed || !this.root) return Promise.resolve();
    dispatch(this.root, 'note-to-show:before-render', payload);
    return Promise.resolve(this.toHtml(source, payload)).then(function (html) {
      if (self.destroyed) return;
      self.root.innerHTML = html; self.current = { id: note.id || '', file: note.file || '', source: source };
      self.root.setAttribute('data-note-file', note.file || ''); self.root.setAttribute('data-note-live', '1');
      dispatch(self.root, 'note-to-show:rendered', Object.assign({}, payload, { html: html }));
      if (typeof self.options.onRendered === 'function') self.options.onRendered(payload, self.root);
    }).catch(function (error) { dispatch(self.root, 'note-to-show:error', { note: payload, error: error }); if (typeof self.options.onError === 'function') self.options.onError(error, payload); });
  };
  NoteToShow.prototype.adopt = function (note) { if (this.destroyed) return this; this.current = { id: note.id || '', file: note.file || '', source: note.source || '' }; this.root.setAttribute('data-note-file', note.file || ''); this.root.setAttribute('data-note-live', '1'); this.startWatch(note); return this; };
  NoteToShow.prototype.show = async function (note) { var source = typeof note.source === 'string' ? note.source : await this.loadSource(note.file, false); await this.render(note, source); this.startWatch(note); return source; };
  NoteToShow.prototype.refresh = async function () { if (!this.current || !this.current.file || this.destroyed) return false; var source = await this.loadSource(this.current.file, true); if (source === this.current.source) return false; await this.render({ id: this.current.id, file: this.current.file }, source); return true; };
  NoteToShow.prototype.startWatch = function (note) { var self = this; this.stopWatch(); if (!this.options.watchInterval || !note || !note.file) return this; this.timer = setInterval(function () { self.refresh().catch(function (error) { dispatch(self.root, 'note-to-show:error', { note: note, error: error, phase: 'watch' }); }); }, Math.max(800, Number(this.options.watchInterval) || 2200)); return this; };
  NoteToShow.prototype.stopWatch = function () { if (this.timer) { clearInterval(this.timer); this.timer = null; } return this; };
  NoteToShow.prototype.destroy = function () { this.stopWatch(); this.destroyed = true; if (this.root) { this.root.removeAttribute('data-note-file'); this.root.removeAttribute('data-note-live'); this.root.classList.remove('note-to-show-root'); } };

  return { version: VERSION, mount: function (rootEl, options) { if (!rootEl) return null; if (rootEl.__noteToShow) rootEl.__noteToShow.destroy(); var controller = new NoteToShow(rootEl, options); rootEl.__noteToShow = controller; return controller; }, renderMarkdown: renderMarkdown, fallbackMarkdown: renderMarkdown, escapeHtml: escapeHtml };
});
