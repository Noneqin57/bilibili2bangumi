# Bangumi Sync for Bilibili UGC

在 B 站观看 UGC 番剧视频时，手动搜索并同步到 Bangumi 收藏进度。

## 功能介绍

- 智能识别视频标题中的番剧名称和集数
- 一键搜索 Bangumi 条目并同步观看进度
- UP 主白名单管理，只同步信任的 UP 主
- 24 小时内防重复同步
- 宽屏/全屏模式下自动隐藏悬浮球
- 支持手动搜索番剧

## 安装

1. 安装 [Tampermonkey](https://www.tampermonkey.net/) 或 [Violentmonkey](https://violentmonkey.github.io/) 浏览器扩展
2. [点击安装脚本](https://raw.githubusercontent.com/bangumi-sync/bangumi-sync/main/bangumi-sync.user.js)

## 使用说明

### 首次配置

1. 点击页面右下角的粉色 Bangumi 悬浮球
2. 选择「设置」
3. 在 [next.bgm.tv/demo/access-token](https://next.bgm.tv/demo/access-token) 生成 Access Token 并填入
4. 添加信任的 UP 主到白名单

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
| 宽屏时隐藏悬浮球     | 避免遮挡视频画面         |
| 24小时内防重复同步   | 防止同一集被重复标记       |

## 技术架构

```
BangumiSync
├── Config        # 配置管理（Token、白名单、历史记录）
├── Matcher       # 标题解析和集数提取
├── BangumiAPI    # Bangumi API 封装
├── UI            # 悬浮球、面板、Toast 等界面元素
├── BiliWatcher   # B 站页面信息提取
└── Orchestrator  # 同步流程编排
```

## 权限说明

脚本需要以下权限：

- `GM_setValue` / `GM_getValue` - 存储配置和历史记录
- `GM_xmlhttpRequest` - 调用 Bangumi API
- `GM_registerMenuCommand` - 注册菜单命令
- `GM_addStyle` - 添加自定义样式

## 更新日志

### v0.3.5

- 优化标题解析逻辑，支持更多格式
- 添加季节月份标记过滤
- 改进悬浮球收起/展开交互

### v0.3.0

- 添加 24 小时防重复同步功能
- 支持宽屏/全屏自动隐藏
- 优化搜索结果展示

## 许可证

MIT License

## 相关链接

- [Bangumi](https://bgm.tv/)
- [Greasy Fork](https://greasyfork.org/)

