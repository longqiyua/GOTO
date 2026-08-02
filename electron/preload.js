/*!
 * GOTO Page — Electron 预加载脚本
 * -----------------------------------------------------------------------------
 * 当前为最小占位：向渲染进程暴露一个只读标记，告知页面运行在 Electron 宿主中。
 * 页面已有的 standalone 检测会识别 window.electronAPI 并切换为"宿主接入"模式。
 *
 * 后续可在此安全地桥接原生能力（通过 contextBridge.exposeInMainWorld）：
 *   - 文件系统读写（导出/导入 GOTO 数据）
 *   - 系统托盘 / 全局快捷键
 *   - 开机自启动
 *   - 深度链接（deep link）
 *   - 应用内更新
 *
 * 安全约束：
 *   - contextIsolation: true（主进程已开启），此处的 API 会隔离注入，不暴露 Node。
 *   - 仅暴露最小必要接口，避免渲染进程获得任意 Node 能力。
 */
const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // 标记位：页面据此识别 Electron 宿主
  host: 'electron',
  appVersion: process.versions.electron || '',
  // 后续原生能力在此追加，例如：
  // pickFile: () => ipcRenderer.invoke('dialog:openFile'),
  // saveFile: (data, name) => ipcRenderer.invoke('dialog:saveFile', data, name),
});
