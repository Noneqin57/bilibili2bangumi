# bilibili2bangumi

在 B 站观看up上传的番剧视频时，自动/手动搜索并同步到 Bangumi 收藏进度。

## 功能特性

- **智能标题解析** — 自动识别视频标题中的番剧名称和集数
- **多种同步模式** — 支持关闭、智能辅助、全自动三种模式
- **UP 主白名单** — 只同步信任的 UP 主发布的视频
- **相似度匹配** — 基于 Levenshtein 编辑距离的标题匹配算法
- **防重复同步** — 24 小时内同一集不会重复标记
- **宽屏自动隐藏** — 宽屏/全屏模式下自动隐藏悬浮球
- **双平台支持** — 同时支持油猴脚本和 Edge 浏览器扩展

## 安装

### 油猴脚本

1. 安装 [Tampermonkey](https://www.tampermonkey.net/) 或 [Violentmonkey](https://violentmonkey.github.io/) 浏览器扩展
2. 在添加脚本中添加脚本bilibili2bangumi.user.js

### Edge 扩展

1. 下载 `edge-extension/` 目录
2. 打开 Edge，访问 `edge://extensions/`
3. 开启「开发人员模式」
4. 点击「加载解压缩的扩展」

## 使用说明

### 首次配置

1. 点击页面右下角的粉色 Bangumi 悬浮球
2. 选择「设置」
3. 在 [next.bgm.tv/demo/access-token](https://next.bgm.tv/demo/access-token) 生成 Access Token 并填入
4. 添加信任的 UP 主到白名单

### 同步模式

| 模式           | 说明                   |
| ------------ | -------------------- |
| **关闭**       | 保持现有手动流程，点击悬浮球手动同步   |
| **智能辅助**     | 自动搜索匹配条目，点击悬浮球快速确认同步 |
| **全自动（实验性）** | 播放后自动同步，无需任何操作       |

### 同步进度

1. 在 B 站观看番剧视频时，点击悬浮球
2. 选择「搜索并同步」
3. 从搜索结果中选择正确的番剧条目
4. 确认集数后点击「确认同步」

### 支持的标题格式

脚本会自动识别以下格式的集数：

- `第X话/集`
- `[XX]`
- `EP.XX`
- `#X`
- `SXXEXX`
- `X话`
- `『作品名』XX`

## 配置选项

| 选项           | 说明               |
| ------------ | ---------------- |
| Access Token | Bangumi API 访问令牌 |
| UP 白名单       | 只同步白名单中 UP 主的视频  |
| 自动同步模式       | 关闭 / 智能辅助 / 全自动  |
| 宽屏时隐藏悬浮球     | 避免遮挡视频画面         |
| 24小时内防重复同步   | 防止同一集被重复标记       |

## 技术架构

本项目采用**源码共享 + 构建脚本**架构，同时支持油猴脚本和 Edge 浏览器扩展。

```
bilibili2bangumi/
├── src/
│   ├── core/                    # 核心业务逻辑
│   │   ├── logger.js            # 统一日志工具
│   │   ├── config.js            # 配置管理
│   │   ├── matcher.js           # 标题解析 + 集数提取（含 LRU 缓存）
│   │   ├── bangumi-api.js       # Bangumi API 封装（含请求去重）
│   │   ├── ui.js                # UI 组件（悬浮球、面板等）
│   │   ├── bilibili-watcher.js  # B 站页面信息提取
│   │   ├── orchestrator.js      # 同步流程编排
│   │   ├── video-observer.js    # 视频播放事件监听
│   │   └── auto-sync.js         # 自动同步逻辑（含相似度算法）
│   └── platforms/               # 平台适配层
│       ├── userscript-adapter.js
│       └── extension-adapter.js
├── build.js                     # 构建脚本
├── bilibili2bangumi.user.js     # 构建产物：油猴脚本
└── edge-extension/              # 构建产物：Edge 扩展
```

### 核心模块

| 模块            | 职责                                         |
| ------------- | ------------------------------------------ |
| Logger        | 统一日志输出，支持 debug/info/warn/error 分级         |
| Config        | 配置管理（Token、白名单、历史记录、自动同步设置）                |
| Matcher       | 标题解析和集数提取，内置 LRU 缓存避免重复正则匹配                |
| BangumiAPI    | Bangumi API 封装，支持请求去重和指数退避重试               |
| UI            | 悬浮球、面板、Toast 等界面组件                         |
| BiliWatcher   | B 站页面信息提取（标题、UP 主、UID）                     |
| Orchestrator  | 同步流程编排                                     |
| VideoObserver | 视频播放事件监听，基于 MutationObserver + popstate 事件 |
| AutoSync      | 自动同步逻辑，基于 Levenshtein 编辑距离的相似度匹配           |

## 开发

### 构建

```bash
npm run build
```

### 开发模式

```bash
npm run dev
```

### 代码规范

项目使用 ESLint 进行代码规范检查：

- 缩进：2 空格
- 引号：单引号
- 分号：强制

## 权限说明

### 油猴脚本

- `GM_setValue` / `GM_getValue` — 存储配置和历史记录
- `GM_xmlhttpRequest` — 调用 Bangumi API
- `GM_registerMenuCommand` — 注册菜单命令
- `GM_addStyle` — 添加自定义样式

### Edge 扩展

- `storage` — 使用 localStorage 存储配置
- `*://www.bilibili.com/*` — 仅在 B 站视频页面运行

## 更新日志

### v0.5.0

**性能优化**

- VideoObserver 移除 setInterval 轮询，改用 MutationObserver + popstate 事件驱动
- UI 模块移除全屏检测轮询
- BangumiAPI 增加请求去重，500ms 内相同请求复用 Promise
- Matcher 增加 LRU 缓存，避免重复正则匹配

**代码质量**

- 新增 Logger 统一日志模块
- UI 模块提取模板函数，HTML 生成逻辑与业务逻辑解耦

**功能优化**

- AutoSync 相似度算法升级为 Levenshtein 编辑距离 + 字符重叠率
- 扩展版统一配置 key 命名，支持旧数据自动迁移

**工程化**

- build.js 增加版本号一致性校验、构建时间戳、产物文件大小报告
- 添加 ESLint 配置，统一代码风格

### v0.4.0

- 新增自动同步功能，支持智能辅助和全自动模式
- 新增相似度匹配算法，自动选择最匹配的番剧条目
- 新增首次观看确认机制

### v0.3.5

- 优化标题解析逻辑，支持更多格式
- 添加季节月份标记过滤
- 改进悬浮球收起/展开交互

### v0.3.0

- 添加 24 小时防重复同步功能
- 支持宽屏/全屏自动隐藏
- 优化搜索结果展示

## 许可证

[MIT](./LICENSE)

## 相关链接

- [Bangumi](https://bgm.tv/)
- [Bangumi API 文档](https://github.com/bangumi/api)

