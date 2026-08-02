# GOTO Music · 彩蛋音乐播放器

> 一个嵌入式于 GOTO 在线预览站点右侧文档区的微型音乐播放器，定位为「彩蛋」性质，提供博朗风格的拟物 UI 与实时频谱可视化。

## 设计语言

- **整体风格**：60% 扁平 + 40% 拟物
- **布局**：左右排列（左海报轻拟态 + 右控制区包豪斯拟物按钮）
- **配色**：以 GOTO 强调色 `#C45A26` 为主色，搭配中性灰白
- **字体**：标题使用 Poppins 700（Google Fonts, OFL 1.1），等宽文字使用 SF Mono

## 核心功能

### 1. 播放控制
- **三段式分体按钮**：上一首 / 播放-暂停 / 下一首
- **循环模式**：列表循环（LIST）/ 单曲循环（SINGLE），状态持久化到 `localStorage`
- **进度条**：可拖拽定位，hover 时显示滑块
- **音量旋钮**：拟物金属质感，支持：
  - 鼠标按住拖动旋转（角度映射音量 0-100）
  - 鼠标滚轮微调
  - 键盘方向键（可达性）
  - 转动时播放 tick 音效（每 5% 一档，0/100 端点强音）

### 2. 频谱可视化（博朗风格）
- 基于 **Web Audio API** 的 `AnalyserNode` 实时频域分析
- Canvas 2D 绘制 64 段柱状图
- 渐变颜色：低频暖橙 → 高频亮黄
- 白色峰值保持线（缓慢回落）
- 右上角实时显示 PEAK dB 值
- 暂停时显示低幅「心跳」波动（不停止 rAF）
- 屏幕底部刻度：20Hz - 20kHz

### 3. 音效系统
基于原生 `OscillatorNode + GainNode` 实现 9 种按钮音效：

| 类型 | 频率/波形 | 用途 |
|---|---|---|
| `tick` | 2200Hz square | 旋钮每档 |
| `tickStrong` | 1400Hz square | 旋钮 0/100 端点 |
| `play` | 660Hz sine | 播放按钮 |
| `pause` | 440→280Hz sine 滑音 | 暂停按钮 |
| `switch` | 880+1320Hz triangle 双音 | 切歌 |
| `loop` | 1100+1650Hz square 双音 | 循环切换 |
| `list` | 1600Hz sine | 列表展开 |
| `select` | 1200Hz triangle | 列表项点击 |
| `drop` | 520→1040Hz sine 上扬 | 拖拽成功 |

### 4. 播放列表
- 默认展开（可在右下角按钮切换显示/隐藏）
- 列表项点击切换播放
- 拖拽本地 mp3/wav 文件自动加入列表
- 显示当前曲目高亮 + 序号 + 标题 + 来源标签

### 5. 多版本歌曲模块
支持「一首歌的不同风格版本」概念：

#### 自动分组规则
拖拽文件时按文件名智能识别：
- `歌名 - 版本.mp3` → 组=「歌名」，版本=「版本」
- `歌名(Demo).mp3` → 组=「歌名」，版本=「Demo」
- 同名文件自动归为同一首歌的不同版本

#### playlist.json 结构

支持三种 track 类型：

```json
{
  "defaultCover": "cover.jpg",
  "tracks": [
    {
      "id": "song_001",
      "name": "歌曲名",
      "versions": [
        { "file": "song_001_original.mp3", "label": "Original" },
        { "file": "song_001_demo.mp3",    "label": "Demo" },
        { "file": "song_001_live.mp3",    "label": "Live" }
      ]
    },
    {
      "id": "tomorrow",
      "name": "明天见明天见",
      "type": "folder",
      "folder": "tomorrow",
      "artist": "GOTO Music Demo",
      "album": "明天见明天见",
      "lyrics": "",
      "versions": [
        { "file": "tomorrow/OST(Alpha-Listen_with_caution).mp3", "label": "OST" },
        { "file": "tomorrow/Pop.mp3",  "label": "Pop" },
        { "file": "tomorrow/Rock.mp3", "label": "Rock" }
      ]
    },
    {
      "id": "goto_theme",
      "name": "GOTO 宣传曲",
      "type": "single",
      "slot": "easter_egg_2",
      "file": "",
      "poster": "",
      "lyrics": ""
    }
  ]
}
```

| 类型 | 触发条件 | 说明 |
|---|---|---|
| `single` | `type === "single"` 或仅有 `file` 字段 | 单曲；`slot: "easter_egg_2"` 表示 GOTO 宣传曲彩蛋槽位（留空等待用户绑定） |
| 内联 versions | 没有指定 `type`，但提供了 `versions` 数组 | 兼容旧版的多版本结构 |
| `folder` | `type === "folder"` | 文件夹多版本结构，支持子目录路径与共用歌词字段 |

`folder` 类型支持把同一首歌的不同风格版本（Pop / Rock / Jazz / 另类摇滚 等）放在同一文件夹下，通过 `versions[].file` 的相对路径定位。版本切换器以 chip 形式出现在列表头部，点击即切换并自动播放。

当当前播放的歌曲属于多版本组时，列表头部出现 VERSIONS 切换模块（chip 按钮）。

## 文件结构

```
GithubPages/
├── Document/
│   └── music_page.html        # 播放器页面（HTML + CSS + JS 一体）
├── music/
│   ├── playlist.json          # 播放列表配置
│   ├── cover.jpg              # 默认封面（可选）
│   └── *.mp3 / *.wav          # 用户放入的音频文件
└── poster/                    # 海报图片（与音乐同名的 jpg/png）
```

## 彩蛋槽位

### GOTO 宣传曲（待绑定）
页面预留第二个彩蛋槽位「GOTO 宣传曲」。用户主动绑定 mp3 文件后自动加载播放。未绑定时显示 GOTO 黑底白字 logo + 强调色渐变作为占位封面。

## 开源声明

本项目音乐播放器模块**未引入任何第三方 JS 库**，所有功能基于浏览器原生 API 实现：

| 功能 | 技术 | 协议 |
|---|---|---|
| 频谱可视化 | Web Audio API（AnalyserNode + Canvas 2D） | W3C 标准 |
| 音效系统 | Web Audio API（OscillatorNode + GainNode） | W3C 标准 |
| 音频解码 | HTML5 Audio API | W3C 标准 |
| 拖拽上传 | HTML5 Drag and Drop API | W3C 标准 |
| 本地存储 | localStorage Web API | W3C 标准 |
| 字体 | Poppins | Google Fonts, OFL 1.1 |
| 字体 | SF Mono | Apple system font |
| 图标 | 内联 SVG | 基于 Lucide / Feather Icons (MIT) 的简化版 |

如后续接入 `wavesurfer.js`、`visualizer` 等开源组件，将在 `music_page.html` 顶部注释块中实时补充声明。

## 浏览器兼容性

- Chrome / Edge 88+
- Firefox 85+
- Safari 14+
- 移动端浏览器（iOS Safari 14+, Chrome Android）

**注意**：`AudioContext` 需要用户交互后才能启动（浏览器策略），首次点击播放按钮时会自动 resume。

## 后续规划

- [ ] 绑定 GOTO 宣传曲的 mp3 文件到预留槽位
- [ ] 移动端独立页面的微型 mp3/mp4 播放器
- [ ] 全部文件索引功能（mp3/mp4 默认打开方式 + GOTO 打开提示）
- [ ] 多端同步播放状态
