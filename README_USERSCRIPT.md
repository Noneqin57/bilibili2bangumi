# bilibili2bangumi

在 B 站观看 UP 主上传的番剧视频时，手动搜索并同步到 Bangumi 收藏进度。

## 功能特性

- **智能标题解析** — 自动识别视频标题中的番剧名称和集数
- **多种同步模式** — 支持关闭、智能辅助、全自动三种模式
- **UP 主白名单** — 只同步信任的 UP 主发布的视频

## 安装

1. 安装 [Tampermonkey](https://www.tampermonkey.net/) 或 [Violentmonkey](https://violentmonkey.github.io/) 浏览器扩展
2. [点击此处安装脚本](https://raw.githubusercontent.com/Noneqin57/bilibili2bangumi/main/bilibili2bangumi.user.js)

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

### 支持的标题格式

脚本会自动识别以下格式的集数：

- `第X话/集`
- `[XX]`
- `EP.XX`
- `#X`
- `SXXEXX`
- `X话`
- `『作品名』XX`

## 权限说明

- `GM_setValue` / `GM_getValue` — 存储配置和历史记录
- `GM_xmlhttpRequest` — 调用 Bangumi API
- `GM_addStyle` — 添加自定义样式

## 更新日志

### v0.5.0

- 性能优化：移除轮询，改用事件驱动
- 新增请求去重和 LRU 缓存
- 相似度算法升级为 Levenshtein 编辑距离

### v0.4.0

- 新增自动同步功能
- 新增相似度匹配算法

## 许可证

MIT

## 相关链接

- [GitHub 仓库](https://github.com/Noneqin57/bilibili2bangumi)
- [Bangumi](https://bgm.tv/)

