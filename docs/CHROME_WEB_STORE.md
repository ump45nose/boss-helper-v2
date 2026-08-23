# Chrome Web Store 上架资料

适用版本：`0.5.1`  
上传包：`output/boss-helper-0.5.1-chrome.zip`

## 商店详情页

| 字段 | 建议填写内容 |
| --- | --- |
| 名称（中文） | Boss直聘 AI 求职助手 |
| 名称（英文） | BossHelper – BOSS Job Assistant |
| 简短说明（中文） | 在 Boss直聘上智能筛选职位、批量投递并生成个性化招呼语，减少重复操作，提高求职效率。 |
| 简短说明（英文） | Filter jobs, streamline applications, and generate personalized greetings on BOSS Zhipin. |
| 类别 | Productivity |
| 语言 | 简体中文；可额外提供英文详情页 |
| 支持网址 | 项目的 GitHub Issues 页面 |
| 隐私政策网址 | 必须先将根目录 `PRIVACY.md` 部署为可公开访问的 HTTPS 页面，再填写该 URL。 |

## 详细说明（中文）

BossHelper 是仅在 Boss直聘网站运行的求职辅助扩展，帮助用户减少重复操作并保留最终控制权。

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

| 权限 | 填写内容 |
| --- | --- |
| `storage` | 保存用户的筛选规则、AI 配置、去重记录、统计和缓存，避免重复输入并支持本地处理。 |
| `cookies` | 读取当前 Boss直聘已登录会话所需的 Cookie，以便在用户已登录状态下执行职位查询、投递和聊天请求。不会将 Cookie 发送给扩展开发者。 |
| `notifications` | 在用户离开当前标签页时显示投递或处理结果通知。 |
| `zhipin.com` 及子域 host permissions | 扩展仅在 Boss直聘页面和接口运行，用于读取页面职位信息、执行用户触发的投递/聊天操作，并加载扩展 UI。 |

### Data usage disclosure

请按实际启用功能选择数据类型，并确保与 `PRIVACY.md` 完全一致：

- 勾选：认证信息（Boss直聘会话 Cookie/令牌）、网站内容与浏览活动（仅 Boss直聘）、用户内容/个人通信（用户启用招呼语或聊天时）。
- 若用户配置 AI：勾选 API Key 等认证信息，以及为 AI 功能发送的职位、招聘者和招呼语文本。
- 若用户启用地址筛选：披露地址或坐标会发送给高德地图。
- 声明：不出售用户数据；不将数据用于广告、信用评估或与扩展单一用途无关的用途；仅为提供已披露功能而向 Boss直聘、用户选择的 AI 服务和可选高德地图发送必要数据。

### Remote code

选择“否，不使用远程代码”。扩展会请求公开的版本/公告 JSON，但不会下载或执行远程 JavaScript、WASM 或其他可执行代码。

## 图形资产清单

- 商店图标：`public/icons/128.png`，已随最终 Manifest 打包；
- 截图：选择 `docs/img/QQ20250223-165333.png`、`QQ20250223-165504.png`、`QQ20250223-165518.png`、`QQ20250223-165913.png`，均为 1280×800；
- **仍需制作**：440×280 小宣传图（必需）；1400×560 Marquee 图（可选）。宣传图避免使用未经授权的 Boss直聘或 Google 商标。

Chrome 官方要求至少一张 1280×800 截图，最多五张；小宣传图为 440×280。官方资料：

- <https://developer.chrome.com/docs/webstore/cws-dashboard-listing/>
- <https://developer.chrome.com/docs/webstore/cws-dashboard-privacy>
- <https://developer.chrome.com/docs/webstore/user_data>
