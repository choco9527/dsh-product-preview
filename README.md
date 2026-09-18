# DSH 产物预览插件

[`English`](./README.en.md)

`dsh-product-preview` 为 DSH 对话增加类似访达分栏视图，用于浏览本地文件产物。ZIP、JSON、PDF、表格和其他无法内嵌预览的文件仍显示文件详情，并提供打开和文件夹定位入口。

VAP 透明预览使用独立的 `video-animation-player`，不依赖公司组件库。支持带内嵌 `vapc` 的 MP4，以及包含单个 MP4 和可选 `vapc.json` 的 ZIP；保留原始帧率、静音循环播放。普通 MP4 回退到视频播放器，普通 ZIP 保留文件详情。ZIP 只在内存读取，输入和展开选定文件上限 64 MiB、配置上限 1 MiB、条目上限 128；不支持需要动态资源绑定的 VAPX。切换文件时取消读取并释放播放器和 Blob URL。播放器代码随插件浏览器包分发，按选择初始化，不在线下载额外脚本；错误时仍可打开原文件。

紧凑三栏保留节点、真实目录与文件名，为媒体预览留出主要空间。文件大小与格式直接展示，完整路径和来源工具可在“文件详情”中展开。在产物页发送消息并获接收后，自动回到对话；发送失败则保留当前页面。

左侧使用只读 React Flow 展示会话节点，虚线仅表示会话顺序，不推断素材依赖。点击节点沿用中间文件列表与右侧图片、视频和 SVGA 预览；支持缩放和平移，不提供拖拽修改、连线或删除。图内手势不切换会话页签。图组件按需挂载，依赖及样式编入浏览器能力包，无需公网运行时加载。

节点下方以小字显示首次报告产物的会话事件时间，使用本机时区，悬停查看完整日期；没有时间记录时不显示。节点序号使用浅色文字，选中时仍与标题区分。

在桌面端，双指左右横扫内容区可在“对话”“产物”“轨迹”间切换；侧边反馈会随手势距离拉出，到首尾页则不会出现。

![产物预览三栏界面](./assets/product-preview-demo.png)

插件会读取成功的工具结果和助手文本，发现其中的文件绝对路径，并将每个文件归入最先报告该路径的对话节点。无扩展名文件可通过 JSON 路径值、反引号路径或 Markdown 链接报告。界面保留原始目录与文件名，仅展示位于 `allowedRoots` 下且仍存在的普通文件，不扫描磁盘目录。非媒体文件以附件形式提供，预览大小限制不影响文件收录。

此 bundle 不依赖特定产品或 Bot。Desktop 宿主可选地通过 `/api/product-preview/actions` 提供原生操作，例如打开、在访达中显示和右键菜单。

路径识别支持 POSIX 绝对路径、Windows 各盘符路径（正斜杠或反斜杠）和 UNC 共享路径（`\\server\share\image.png`），保留中文与空格。网络 URL、相对路径和 Windows 设备路径不作为本地媒体产物。识别路径不授予访问权限；共享路径同样需要位于宿主配置的 `allowedRoots` 下。

## 安装与兼容性

面向 DSH Web / Desktop 的 `0.1.2-alpha.3` 宿主依赖构建；其他版本尚未验证。使用 Node.js `^22.19.0 || >=24.0.0`。

从 [GitHub Releases](https://github.com/choco9527/dsh-product-preview/releases) 获取预构建包，再安装到目标 Profile：

```sh
dsh plugin --profile web add https://github.com/choco9527/dsh-product-preview/releases/latest/download/dsh-product-preview.tgz
```

Desktop 用户请将 `web` 替换为实际 Profile 名称。插件复用宿主的 DSH 和 React 依赖，不包含 Desktop 或 Bot。安装后需要配置允许读取的目录；默认列表为空，不会开放整个磁盘。

## 配置

```yaml
- id: product-preview
  name: dsh-product-preview
  config:
    allowedRoots:
      - /absolute/path/to/your/output-directory
```

支持 PNG、JPEG、WebP、GIF、MP4、MOV、WebM、M4V 与 SVGA。本包内置 `svga.lite`，因此安装后预览 SVGA 不需要再从网络下载播放器。

SVGA 播放器直接编入浏览器产物，构建时检查不可残留外部包名加载。解析使用内置的主线程模式，无需额外 Worker 文件；加载和解析失败会分别显示对应状态。

## 开发

使用 Node.js 22 或更新版本，以及通过 Corepack 启用的 pnpm：

```sh
corepack pnpm install
corepack pnpm run typecheck
corepack pnpm test
corepack pnpm run package
```

开发依赖从公开 npm registry 安装，无需同级 Desktop 仓库。DSH 与 React 声明为宿主 peer 依赖，SVGA 播放器作为开发依赖编入浏览器产物；安装预构建包无需在用户电脑运行构建脚本。

开发依赖补齐插件使用的宿主类型。`skipLibCheck` 仅跳过第三方声明文件自身的检查：DSH alpha 声明还引用宿主生成的 RPC 类型，无法在独立插件中完整验证；插件源码仍按 `strict` 检查。
