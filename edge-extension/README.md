# bilibili2bangumi Edge 扩展

在 B 站观看 UGC 番剧视频时，手动搜索并同步到 Bangumi 收藏进度。

## 安装方法

### 方法一：开发者模式加载（推荐）

1. 打开 Edge 浏览器，在地址栏输入 `edge://extensions/` 并回车
2. 在左侧打开「开发人员模式」开关
3. 点击「加载解压缩的扩展」按钮
4. 选择 `edge-extension` 文件夹
5. 扩展安装完成！

### 方法二：打包安装

1. 在 `edge://extensions/` 页面
2. 点击「打包扩展」按钮
3. 选择 `edge-extension` 文件夹
4. 将生成的 `.crx` 文件拖入 Edge 扩展页面安装

## 使用方法

1. 访问任意 B 站视频页面（`https://www.bilibili.com/video/*`）
2. 将鼠标悬停在页面右侧的粉色悬浮球上
3. 等待 200ms 后悬浮球会展开
4. 点击悬浮球打开菜单，选择需要的功能：
   - 🔍 搜索并同步
   - ✏️ 手动搜索
   - ➕ 添加当前 UP
   - ⚙️ 设置

## 功能说明

### 搜索并同步
自动识别视频标题中的番剧名称和集数，搜索 Bangumi 条目并同步观看进度。

### 手动搜索
当自动识别不准确时，可以手动输入番剧名称进行搜索。

### 添加当前 UP
将当前视频 UP 主添加到白名单，白名单内的 UP 主视频才会显示同步按钮。

### 设置
- 配置 Bangumi Access Token
- 管理 UP 主白名单
- 开启/关闭宽屏自动隐藏
- 开启/关闭 24 小时防重复同步

## 获取 Bangumi Token

1. 访问 https://next.bgm.tv/demo/access-token
2. 登录你的 Bangumi 账号
3. 生成 Access Token
4. 在扩展设置中粘贴 Token

## 文件结构

```
edge-extension/
├── manifest.json      # 扩展配置文件
├── content.js         # 内容脚本（注入器）
├── injected.js        # 主功能脚本
├── popup.html         # 弹出窗口 HTML
├── popup.js           # 弹出窗口脚本
├── icons/             # 图标文件夹
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
└── README.md          # 本文件
```

## 与 UserScript 版本的区别

| 特性 | Edge 扩展 | UserScript |
|------|-----------|------------|
| 安装方式 | 扩展商店/开发者模式 | Tampermonkey 等插件 |
| 数据存储 | localStorage | GM_setValue/GM_getValue |
| 网络请求 | XMLHttpRequest | GM_xmlhttpRequest |
| 样式注入 | 动态创建 style 标签 | GM_addStyle |
| 自动更新 | 浏览器自动更新 | 脚本管理器检查更新 |

## 注意事项

1. 扩展只在 `bilibili.com/video/*` 页面生效
2. 需要配置 Bangumi Access Token 才能同步
3. 首次使用需要添加 UP 主到白名单
4. 宽屏/全屏模式下悬浮球会自动隐藏

## 问题反馈

如有问题，请访问 GitHub 仓库提交 Issue：
https://github.com/bilibili2bangumi/bilibili2bangumi
