# ChemWiki fork 升级至 Ketcher 3.18.0

## 来源与保留的适配

合并 EPAM 正式标签 `v3.18.0`，对应提交
`f4f013e1855b71b0cbd37fc79d55b0cbe51c2371`。
升级前 fork 为 `0fb9270f30a6dd73404540d630189da723a9c3ed`，共同祖先为
`5f3748777fb52bc9e481a06682d3daf6f74bb741`。
采用双亲合并，保留 fork 的 19 个定制提交和上游新增的 163 个提交。

继续保留：

- 中英文切换、动态设置标签、模板显示名称及本地化弹窗/工具栏。
- 深色模式 CSS 变量、iframe `theme:change` 消息、主题查询参数和偏好保存。
- 双指缩放/平移、长按、Pointer Events、触控取消和失焦清理。
- `getZoom`、`onZoomChange`、`offZoomChange` 与 iframe `zoom:change` 通知。
- 可拖拽多窗口弹窗、独立窗口表单、前台窗口切换及工具栏水平滚动。
- 浏览器 EventEmitter、Windows 示例构建脚本和内部类型路径映射。

## 合并决定

32 处源码/配置冲突逐项处理。使用上游 `.mjs` Rollup 配置和 TypeScript 6
配置，同时保留 React 兼容声明、浏览器事件实现、中文化和弹窗扩展。
将旧 Node16 配置与新增 bundler 配置统一为兼容的 ESNext/bundler 组合，
移除重复 `moduleResolution` 与过时 `baseUrl`。

保留 3.18 的价态模式、芳香化跳过超原子、旋转角度及 RNA Builder 修复，
新增设置和磷酸位置提示补齐中英文文本。合并依赖后基于正式版锁文件
执行 `npm.cmd install --package-lock-only --ignore-scripts --legacy-peer-deps`，
再以 `npm.cmd ci --ignore-scripts --legacy-peer-deps` 验证可复现安装。

2244 处测试截图冲突均来自 fork 既有删除与上游修改的交叉，延续 fork
的删除决定。其他新增上游测试及数据正常合并。

## 验证

Node/npm 命令通过 PowerShell 7 隐藏窗口、BelowNormal 优先级运行，
依赖安装通过 ChemWiki 仓库资源协调器串行执行。

- `npm.cmd run test:chemwiki-adaptations`：6 项通过，直接执行源码，覆盖
  浏览器事件、双指手势、长按取消、多窗口状态、主题消息及本地化新设置。
- `npm.cmd run ajv --workspace ketcher-core`：生成忽略跟踪的 KET 校验器。
- `npm.cmd run test:unit --workspace ketcher-core -- --runInBand --runTestsByPath
  __tests__/application/render/renderers/TransientView/RotationView.test.ts
  __tests__/application/editor/tools/ZoomTool.test.ts`：2 组、6 项通过。
- ChemWiki 现有 Ketcher 分析、就绪、文件 URL、命名字段、管理端保存、
  Lumina 嵌入测试：40 项通过。
- 语法审计：831 个变更源码文件均可解析，21 个适配新增文件和全部既有
  中英文翻译键仍存在，四个包的 3.18.0 版本及依赖声明与锁文件一致。

本次更新源码子模块；ChemWiki 使用的
`chemwiki-frontend/public/reference/ketcher/` 静态发行包需单独构建和同步。
未执行生产构建或浏览器端发行包验证。按 ChemWiki 资源规则检查到已有
`npm run dev` 进程后，未另外启动完整类型检查。
