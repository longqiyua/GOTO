/*!
 * GOTO Page — Electron 主进程入口
 * -----------------------------------------------------------------------------
 * 复用 GOTO Page 的纯前端页面（index.html），无需修改任何前端代码。
 *
 * 启动方式（在 GOTO Page/electron/ 目录下）：
 *   npm install
 *   npx electron .      # 或 npm start
 *
 * 打包（后续可选）：
 *   npx electron-builder        # 需追加 builder 配置
 *   npx electron-forge package  # 或 forge
 *
 * 设计说明：
 *   - 主进程仅负责创建窗口与加载本地 index.html，业务逻辑全在前端 JS。
 *   - 预留 preload 钩子（preload.js）便于后续向页面注入原生能力
 *    （文件系统 / 系统托盘 / 全局快捷键 / 自启动等）。
 *   - 页面已有 standalone 模式检测：Electron 环境下 window.electronAPI
 *     存在时会进入"宿主接入"模式，否则进入 standalone 预览模式（功能正常）。
 */
const { app, BrowserWindow, shell } = require('electron');
const path = require('path');

const PAGE_DIR = path.join(__dirname, '..', '');  // GOTO Page/ 根目录
const INDEX_HTML = path.join(PAGE_DIR, 'index.html');

let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    title: 'GOTO Page',
    backgroundColor: '#F2F2F0',
    autoHideMenuBar: true,           // 隐藏菜单栏（Alt 可唤出）
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,        // 安全：预加载脚本与页面上下文隔离
      nodeIntegration: false,        // 安全：页面不直接 require Node 模块
      sandbox: false,                // preload 需要 Electron API
      spellcheck: false
    }
  });

  // 加载本地页面（file:// 协议，Service Worker 不会生效，但页面功能完整）
  mainWindow.loadFile(INDEX_HTML);

  // 外部链接在系统默认浏览器打开，而非 Electron 窗口内
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/.test(url)) {
      shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });

  // 阻止意外导航到外部站点
  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (!url.startsWith('file:')) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// ═══════ App 生命周期 ═══════
app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    // macOS：点击 Dock 图标时若无窗口则重建
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  // macOS：窗口全关后保留进程；其余平台退出
  if (process.platform !== 'darwin') app.quit();
});
