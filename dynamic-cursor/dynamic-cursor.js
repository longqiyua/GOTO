/*!
 * Dynamic Cursor — Monkeytype 风格连续跟随光标
 * v1.0.0 · MIT
 *
 * 设计要点：
 *   1. 隐藏原生 caret（caret-color:transparent，见 dynamic-cursor.css），由 .dc-caret 接管视觉
 *   2. 通过镜像 div 测量光标像素位置（避免破坏输入框 selectionStart）
 *   3. 使用 transform:translateX 平移，120ms ease 缓动 → 视觉连续而非瞬移
 *   4. 输入/点击/键盘移动时立即响应；停止 600ms 后进入闪烁态
 *   5. 颜色固定为强调色低饱和（#9A6E62）
 *
 * API：
 *   // 浏览器全局
 *   DynamicCursor.init(inputEl, caretEl, options);
 *   DynamicCursor.init(inputEl, caretEl); // 使用默认 options
 *
 *   // CommonJS / 模块
 *   var DynamicCursor = require('./dynamic-cursor');
 *
 * options（全部可选）：
 *   {
 *     blinkDelayMs: 600,      // 静止多久后进入闪烁态
 *     transitionMs: 120,      // 平移缓动时间（与 CSS 中 transition 保持一致）
 *     rowSelector: '.dc-input-row' // 输入行的容器选择器（用于定位镜像 div 与 padding）
 *   }
 *
 * DOM 结构要求：
 *   <div class="dc-input-row">
 *     <input id="myInput" />
 *     <div class="dc-caret" id="myCaret"></div>
 *   </div>
 *
 * 兼容：若使用旧命名 .sc-caret / .sc-input-row，传入 options.rowSelector='.sc-input-row' 即可。
 */
(function (root, factory) {
  var mod = factory(root || {});
  if (typeof module === 'object' && module.exports) module.exports = mod;
  if (root) root.DynamicCursor = mod;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  'use strict';

  var DEFAULTS = {
    blinkDelayMs: 600,
    transitionMs: 120,
    rowSelector: '.dc-input-row'
  };

  /**
   * 初始化一个输入框的自定义光标。
   * @param {HTMLInputElement} inputEl 目标输入框
   * @param {HTMLElement} caretEl 光标元素（.dc-caret）
   * @param {Object} [options]
   * @returns {{destroy:Function}|null} 返回带 destroy() 的句柄，失败返回 null
   */
  function init(inputEl, caretEl, options) {
    if (!inputEl || !caretEl) return null;
    var opts = Object.assign({}, DEFAULTS, options || {});
    var inputRow = inputEl.closest(opts.rowSelector);
    if (!inputRow) return null;

    // 创建镜像 div，用于测量字符宽度
    var mirror = document.createElement('div');
    mirror.style.cssText = [
      'position:absolute', 'visibility:hidden', 'white-space:pre',
      'font:inherit', 'letter-spacing:inherit', 'text-transform:inherit',
      'border:0', 'padding:0', 'margin:0', 'left:0', 'top:0', 'pointer-events:none'
    ].join(';');
    inputRow.appendChild(mirror);

    function _measureCaretX() {
      var cs = getComputedStyle(inputEl);
      mirror.style.font = cs.font;
      mirror.style.letterSpacing = cs.letterSpacing;
      mirror.style.fontSize = cs.fontSize;
      mirror.style.fontFamily = cs.fontFamily;
      mirror.style.fontWeight = cs.fontWeight;
      mirror.style.fontStyle = cs.fontStyle;
      mirror.style.textTransform = cs.textTransform;
      var val = inputEl.value || '';
      var pos = inputEl.selectionStart || 0;
      mirror.textContent = val.substring(0, pos);
      var caretLeft = mirror.getBoundingClientRect().width;
      var inputRect = inputEl.getBoundingClientRect();
      var rowRect = inputRow.getBoundingClientRect();
      var inputLeftOffset = inputRect.left - rowRect.left;
      caretLeft = caretLeft + inputLeftOffset - (inputEl.scrollLeft || 0);
      var padLeft = parseFloat(cs.paddingLeft) || 0;
      caretLeft += padLeft;
      return caretLeft;
    }

    var _blinkTimer = null;
    var _rafScheduled = false;

    function _updateCaret() {
      if (_rafScheduled) return;
      _rafScheduled = true;
      requestAnimationFrame(function () {
        _rafScheduled = false;
        if (document.activeElement !== inputEl) {
          caretEl.classList.remove('is-visible', 'is-blinking');
          return;
        }
        var x = _measureCaretX();
        caretEl.style.transform = 'translateX(' + x + 'px)';
        caretEl.classList.add('is-visible');
        if (_blinkTimer) clearTimeout(_blinkTimer);
        caretEl.classList.remove('is-blinking');
        _blinkTimer = setTimeout(function () {
          caretEl.classList.add('is-blinking');
        }, opts.blinkDelayMs);
      });
    }

    function _onInput() { _updateCaret(); }
    function _onClick() { _updateCaret(); }
    function _onKeyup() { _updateCaret(); }
    function _onFocus() { _updateCaret(); }
    function _onBlur() {
      caretEl.classList.remove('is-visible', 'is-blinking');
      if (_blinkTimer) clearTimeout(_blinkTimer);
    }
    function _onSelectionChange() {
      if (document.activeElement === inputEl) _updateCaret();
    }
    function _onResize() {
      if (document.activeElement === inputEl) _updateCaret();
    }

    inputEl.addEventListener('input', _onInput);
    inputEl.addEventListener('click', _onClick);
    inputEl.addEventListener('keyup', _onKeyup);
    inputEl.addEventListener('focus', _onFocus);
    inputEl.addEventListener('blur', _onBlur);
    document.addEventListener('selectionchange', _onSelectionChange);
    window.addEventListener('resize', _onResize);

    _updateCaret();

    return {
      destroy: function () {
        inputEl.removeEventListener('input', _onInput);
        inputEl.removeEventListener('click', _onClick);
        inputEl.removeEventListener('keyup', _onKeyup);
        inputEl.removeEventListener('focus', _onFocus);
        inputEl.removeEventListener('blur', _onBlur);
        document.removeEventListener('selectionchange', _onSelectionChange);
        window.removeEventListener('resize', _onResize);
        if (_blinkTimer) clearTimeout(_blinkTimer);
        if (mirror.parentNode) mirror.parentNode.removeChild(mirror);
        caretEl.classList.remove('is-visible', 'is-blinking');
      }
    };
  }

  return { init: init, version: '1.0.0' };
});
