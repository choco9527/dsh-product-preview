# DSH 产物预览插件

[`English`](./README.en.md)

`dsh-product-preview` 为 DSH 对话增加类似访达分栏视图，用于浏览本地生成的媒体产物。

紧凑三栏保留节点、真实目录与文件名，为媒体预览留出主要空间。文件大小与格式直接展示，完整路径和来源工具可在“文件详情”中展开。在产物页发送消息并获接收后，自动回到对话；发送失败则保留当前页面。

在桌面端，双指左右横扫内容区可在“对话”“产物”“轨迹”间切换；侧边反馈会随手势距离拉出，到首尾页则不会出现。

![产物预览三栏界面](./assets/product-preview-demo.png)

插件会读取成功的工具结果和助手文本，发现其中的图片、视频与 SVGA 绝对路径，并将每个文件归入最先报告该路径的对话节点。界面保留原始目录与文件名。只有位于 `allowedRoots` 下且仍存在的文件，才能获得短时有效的同源预览地址。

此 bundle 不依赖特定产品或 Bot。Desktop 宿主可选地通过 `/api/product-preview/actions` 提供原生操作，例如打开、在访达中显示和右键菜单。

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
