# Chrome Web Store 上架资料

适用版本：`0.6.1`
上传包：`output/boss-helper-v2-0.6.1-chrome.zip`

## 商店详情页

| 字段             | 建议填写内容                                                                               |
| ---------------- | ------------------------------------------------------------------------------------------ |
| 名称（中文）     | BossHelper V2 - AI 求职筛选助手                                                            |
| 名称（英文）     | BossHelper V2 - AI Job Assistant                                                           |
| 简短说明（中文） | 在 Boss直聘筛选职位、生成 AI 招呼草稿，并由你确认后完成求职操作。                          |
| 简短说明（英文） | Filter BOSS Zhipin jobs, generate AI greeting drafts, and act only with your confirmation. |
| 类别             | Productivity                                                                               |
| 语言             | 简体中文；可额外提供英文详情页                                                             |
| 支持网址         | <https://github.com/ump45nose/boss-helper-v2/issues>                                       |
| 隐私政策网址     | 必须先将根目录 `PRIVACY.md` 部署为可公开访问的 HTTPS 页面，再填写该 URL。                  |

## 详细说明（中文）

BossHelper 是仅在 Boss直聘网站运行的求职辅助扩展，帮助用户减少重复操作并保留最终控制权。项目主页与问题反馈：<https://github.com/ump45nose/boss-helper-v2>。

- 按岗位名称、公司、薪资、规模、活跃度等规则筛选职位；
- 支持批量投递，并按公司或招聘者避免重复沟通；
- 可选 AI 筛选与个性化招呼语，模型和 API Key 由用户自行配置；
- 可选距离/路线筛选与处理结果通知；
- 所有投递和消息均使用用户当前的 Boss直聘登录会话完成。

使用前请确认投递内容、筛选规则和 AI 服务设置。扩展不会绕过 Boss直聘的账号、频率或服务规则；请遵守 Boss直聘及所用 AI 服务的条款。

## Privacy practices

### Single purpose description

帮助用户在 Boss直聘网站上筛选职位并辅助求职申请，包括批量投递和可选的 AI 招呼语生成。

### Permission justifications

| 权限                                 | 填写内容                                                                                            |
| ------------------------------------ | --------------------------------------------------------------------------------------------------- |
| `storage`                            | 保存用户的筛选规则、AI 配置、去重记录、统计和缓存，避免重复输入并支持本地处理。                     |
| `notifications`                      | 在用户离开当前标签页时显示投递或处理结果通知。                                                      |
| `zhipin.com` 及子域 host permissions | 扩展仅在 Boss直聘页面和接口运行，用于读取页面职位信息、执行用户触发的投递/聊天操作，并加载扩展 UI。 |

### Data usage disclosure

请按实际启用功能选择数据类型，并确保与 `PRIVACY.md` 完全一致：

- 勾选：网站内容与浏览活动（仅 Boss直聘）、用户内容/个人通信（用户启用招呼语或聊天时）。扩展不申请 `cookies` 权限，也不读取或导出 Cookie。
- 若用户配置 AI：勾选 API Key 等认证信息，以及为 AI 功能发送的职位、招聘者和招呼语文本。
- 若用户启用地址筛选：披露地址或坐标会发送给高德地图。
- 声明：不出售用户数据；不将数据用于广告、信用评估或与扩展单一用途无关的用途；仅为提供已披露功能而向 Boss直聘、用户选择的 AI 服务和可选高德地图发送必要数据。

### Remote code

选择“否，不使用远程代码”。扩展会请求公开的版本/公告 JSON，但不会下载或执行远程 JavaScript、WASM 或其他可执行代码。

## 图形资产清单

- 商店图标：`public/icons/boss-helper-v2-128.png`，已随最终 Manifest 打包；原始图：`docs/store/boss-helper-v2-icon.png`。
- 截图：上传 `docs/store/screenshots/01-appearance-settings.png`、`02-resume-and-fallback.png`、`03-job-filtering.png`、`04-ai-profile-and-drafts.png`、`06-progress-dashboard.png`，均为 1280×800；
- **仍需制作**：440×280 小宣传图（必需）；1400×560 Marquee 图（可选）。宣传图避免使用未经授权的 Boss直聘或 Google 商标。

Chrome 官方要求至少一张 1280×800 截图，最多五张；小宣传图为 440×280。官方资料：

- <https://developer.chrome.com/docs/webstore/cws-dashboard-listing/>
- <https://developer.chrome.com/docs/webstore/cws-dashboard-privacy>
- <https://developer.chrome.com/docs/webstore/user_data>
