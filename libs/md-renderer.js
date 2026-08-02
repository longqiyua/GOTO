/*!
 * GOTO MD Renderer — 轻量级 Markdown → HTML 渲染器（离线可用，无外部依赖）
 * 支持：标题 / 段落 / 有序无序列表 / 围栏代码块 / 表格 / 链接 / 粗体 / 斜体 /
 *       引用块 / 水平线 / 内联代码 / 图片 / 删除线 / 原生 HTML 嵌入（含 <details> 折叠）
 * 供 GOTO Page 右侧文档区加载 GithubPage/ 目录下的 MD 文档使用。
 */
(function (root) {
  'use strict';

  // —— HTML 转义，防止 MD 源码中的 < > & 被当作标签 ——
  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
  // 属性值转义
  function escapeAttr(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/"/g, '&quot;');
  }

  // —— 内联元素渲染：内联代码 / 图片 / 链接 / 粗体 / 斜体 / 删除线 ——
  function inline(text) {
    var codes = [];
    // 先抽出 `code`，避免内部被其它规则误处理
    text = text.replace(/`+([^`]+?)`+/g, function (m, p1) {
      codes.push('<code>' + escapeHtml(p1) + '</code>');
      return '\u0000C' + (codes.length - 1) + '\u0000';
    });
    // 图片 ![alt](url "title")
    text = text.replace(/!\[([^\]]*)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)/g, function (m, a, u, t) {
      return '<img src="' + escapeAttr(u) + '" alt="' + escapeHtml(a) + '"' + (t ? ' title="' + escapeHtml(t) + '"' : '') + '/>';
    });
    // 链接 [text](url "title") —— 外部链接新开标签
    text = text.replace(/\[([^\]]+)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)/g, function (m, t, u, title) {
      return '<a href="' + escapeAttr(u) + '"' +
        (/^(https?:|\/\/)/.test(u) ? ' target="_blank" rel="noopener noreferrer"' : '') +
        (title ? ' title="' + escapeHtml(title) + '"' : '') + '>' + t + '</a>';
    });
    // 粗体 **text** / __text__
    text = text.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    text = text.replace(/__([^_]+)__/g, '<strong>$1</strong>');
    // 斜体 *text* / _text_（避免吞掉粗体的星号）
    text = text.replace(/(^|[^*])\*(?!\s)([^*]*?)\*(?!\*)/g, '$1<em>$2</em>');
    text = text.replace(/(^|[^_])_(?!\s)([^_]*?)_(?!_)/g, '$1<em>$2</em>');
    // 删除线 ~~text~~
    text = text.replace(/~~([^~]+)~~/g, '<del>$1</del>');
    // 还原内联代码占位
    text = text.replace(/\u0000C(\d+)\u0000/g, function (m, i) { return codes[+i] || ''; });
    return text;
  }

  // 判断某行是否开启一个新的块级结构（用于段落合并的终止条件）
  function isBlockStart(line) {
    if (/^\s*$/.test(line)) return true;            // 空行
    if (/^\s*<[a-zA-Z\/!]/.test(line)) return true; // HTML 块
    if (/^#{1,6}\s/.test(line)) return true;        // 标题
    if (/^\s*([-*_])\1{2,}\s*$/.test(line)) return true; // 水平线
    if (/^\s*>\s?/.test(line)) return true;         // 引用
    if (/^\s*[-*+]\s/.test(line)) return true;      // 无序列表
    if (/^\s*\d+\.\s/.test(line)) return true;      // 有序列表
    if (/^\s*(```|~~~)/.test(line)) return true;   // 围栏代码块
    return false;
  }

  // —— 主渲染入口：将 MD 文本转为 HTML 字符串 ——
  function render(md) {
    if (md == null) md = '';
    var src = String(md).replace(/\r\n?/g, '\n');
    var lines = src.split('\n');
    var out = [];
    var i = 0, line, m;

    while (i < lines.length) {
      line = lines[i];

      // 空行跳过
      if (/^\s*$/.test(line)) { i++; continue; }

      // 原生 HTML 块：以 < 开头，连续收集直到空行（保留 <details> 折叠交互）
      if (/^\s*<[a-zA-Z\/!]/.test(line)) {
        var block = [line];
        i++;
        while (i < lines.length && !/^\s*$/.test(lines[i])) { block.push(lines[i]); i++; }
        out.push(block.join('\n'));
        continue;
      }

      // 围栏代码块 ```lang / ~~~lang
      m = line.match(/^(\s*)(`{3,}|~{3,})(\w*)\s*$/);
      if (m) {
        var ch = m[2][0], lang = m[3] || '';
        var code = [];
        i++;
        while (i < lines.length && !/^\s*(`{3,}|~{3,})\s*$/.test(lines[i])) { code.push(lines[i]); i++; }
        if (i < lines.length) i++; // 跳过结束围栏
        out.push('<pre><code class="language-' + escapeAttr(lang) + '">' + escapeHtml(code.join('\n')) + '</code></pre>');
        continue;
      }

      // 标题 # ~ ######
      m = line.match(/^(#{1,6})\s+(.+?)\s*#*\s*$/);
      if (m) {
        var lv = m[1].length;
        out.push('<h' + lv + '>' + inline(m[2]) + '</h' + lv + '>');
        i++;
        continue;
      }

      // 水平线 --- / *** / ___
      if (/^\s*([-*_])\1{2,}\s*$/.test(line)) { out.push('<hr/>'); i++; continue; }

      // 表格：当前行含 |，且下一行是分隔行 |---|---|
      if (/\|/.test(line) && i + 1 < lines.length &&
          /^\s*\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)+\|?\s*$/.test(lines[i + 1])) {
        var header = line.split('|').map(function (c) { return c.trim(); });
        if (header.length && header[0] === '') header.shift();
        if (header.length && header[header.length - 1] === '') header.pop();
        // 分隔行 → 对齐方式（先剥离首尾空元素，避免索引错位）
        var rawAligns = lines[i + 1].split('|');
        if (rawAligns.length && rawAligns[0].trim() === '') rawAligns.shift();
        if (rawAligns.length && rawAligns[rawAligns.length - 1].trim() === '') rawAligns.pop();
        var aligns = rawAligns.map(function (c) {
          c = c.trim();
          var l = /^:/.test(c), r = /:$/.test(c);
          return (l && r) ? 'center' : l ? 'left' : r ? 'right' : 'left';
        });
        i += 2;
        var rows = [];
        while (i < lines.length && /\|/.test(lines[i])) {
          var cells = lines[i].split('|').map(function (c) { return c.trim(); });
          if (cells.length && cells[0] === '') cells.shift();
          if (cells.length && cells[cells.length - 1] === '') cells.pop();
          rows.push(cells);
          i++;
        }
        var t = '<table><thead><tr>';
        header.forEach(function (c, idx) {
          t += '<th style="text-align:' + (aligns[idx] || 'left') + '">' + inline(c) + '</th>';
        });
        t += '</tr></thead><tbody>';
        rows.forEach(function (r) {
          t += '<tr>';
          for (var k = 0; k < header.length; k++) {
            t += '<td style="text-align:' + (aligns[k] || 'left') + '">' + inline(r[k] || '') + '</td>';
          }
          t += '</tr>';
        });
        t += '</tbody></table>';
        out.push(t);
        continue;
      }

      // 引用块 > ...
      if (/^\s*>\s?/.test(line)) {
        var quote = [];
        while (i < lines.length && /^\s*>\s?/.test(lines[i])) { quote.push(lines[i].replace(/^\s*>\s?/, '')); i++; }
        out.push('<blockquote>' + render(quote.join('\n')) + '</blockquote>');
        continue;
      }

      // 无序列表 - / * / +
      if (/^\s*[-*+]\s+/.test(line)) {
        var ul = [];
        while (i < lines.length && /^\s*[-*+]\s+/.test(lines[i])) { ul.push(lines[i].replace(/^\s*[-*+]\s+/, '')); i++; }
        out.push('<ul>' + ul.map(function (t) { return '<li>' + inline(t) + '</li>'; }).join('') + '</ul>');
        continue;
      }

      // 有序列表 1. 2. 3.
      if (/^\s*\d+\.\s+/.test(line)) {
        var ol = [];
        while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) { ol.push(lines[i].replace(/^\s*\d+\.\s+/, '')); i++; }
        out.push('<ol>' + ol.map(function (t) { return '<li>' + inline(t) + '</li>'; }).join('') + '</ol>');
        continue;
      }

      // 段落：连续非块起始行合并
      var para = [line];
      i++;
      while (i < lines.length && !isBlockStart(lines[i])) { para.push(lines[i]); i++; }
      out.push('<p>' + inline(para.join(' ')) + '</p>');
    }

    return out.join('\n');
  }

  // 暴露到全局
  root.GotoMDRenderer = { render: render, escapeHtml: escapeHtml, inline: inline };
})(typeof window !== 'undefined' ? window : this);
