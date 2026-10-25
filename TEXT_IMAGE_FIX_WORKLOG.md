# 文本工具 / 插入图像工具修复 · 跨轮工作记录（WIP）

> 本文件为「Ketcher文本图像工具修复轮询」定时任务的临时工作记录，配合 Draft PR 使用。
> **修复完成、PR 标记为 Ready for review 之前，应删除本文件**，保持最终 PR diff 干净。
> 权威、持续更新的记录以 Draft PR 正文为准（整体目标 / 当前进展 / 下一轮目标 / 根因线索 / 验证记录 / 阻塞点）。

## 整体目标
- 修复 `QiXinia/ketcher_zh`（base: `master`）当前版本：
  - 文本工具（Text）无法正确插入文本；
  - 插入图像工具（Insert Image）无法正确插入图像。
- 验收：文本与图像均可正确插入、显示、保存并重载；相关测试 / 类型检查 / 构建通过；无回归。

## 工作分支
- `fix/text-image-tool-insertion` → `master`

## 下一轮目标（首轮）
1. 克隆仓库、安装依赖。
2. 复现两个缺陷并记录现象。
3. 排查 `packages/ketcher-react` 中 editor/tools 文本/图像工具及工具注册、事件坐标、state 更新、序列化路径，定位根因。
4. 最小修复、补测试、验证，更新 Draft PR 正文。

## 进展记录（首轮）

### 环境（已完成）
- 沙箱自带 Node v22，但仓库要求 `node >=24.14.1`；已在 `~/node24` 安装 Node v24.14.1（PATH 需 `export PATH=$HOME/node24/bin:$PATH`）。
- `npm install`（根目录 workspaces）首次因 EMFILE(too many open files) 失败，沙箱无法 `ulimit -n`；降低 `--maxsockets=4` 重试后成功（3160 包）。
- `packages/ketcher-core` 需先 `npm run ajv`（生成 `src/domain/serializers/ket/compiledSchema.js`）否则 28 个测试套件报找不到 compiledSchema。

### 静态对比（fork master vs 上游 base f4f013e / 3.18.0）
- fork 独有提交：`c189faded`(merge 3.18)、`65dd675d0`(EventEmitter 类型)、`37ece59f0`(example webpack 开关)、`1e6f39706`(文本与化学数据 I/O 大改)。
- 已逐文件比对以下与"插入"强相关的路径，**核心层初步未发现阻断插入的硬伤**：
  - `editor/tool/text.ts`：相对上游仅把嵌套 if 拍平，语义等价；新建文本走 `!id && id!==0 && content` → `fromTextCreation`，正常。
  - `editor/tool/image.ts`：相对上游仅 `String.raw`\+`` 改为 `'\\+'`，运行时等价；click→file input→onload→`fromImageCreation` 链路完整。
  - `tool/index.ts`：`text: TextTool`、`[IMAGE_KEY]: ImageTool` 注册完好，无 diff。
  - `CoordinateTransformation`、`closest.ts`、`action/tools.ts` 仅 i18n 标题/触摸命中系数，不影响桌面点击。
  - `Editor.ts` domEventSetup：fork 把 mouse* 换成 pointer*，并新增 GestureRecognizer（仅 touch、不 preventDefault/stopPropagation）；click→tool.click 分发链路保留。
  - ketcher-core 动作/序列化：`fromTextCreation`/`fromImageCreation`/`ImageUpsert.execute`/`prepareStructForKet`/`serializeMicromolecules` 文本与图像节点遍历均在。

### 已跑通的验证（jest，ketcher-core）
- `npm run ajv` 后全量 core 单测：550 passed，仅 1 个无关失败 `RotationView` 手柄 hover 颜色（#365CFF vs #B4B9D6，主题色，非本次缺陷）。
- 自写往返探针（已删）：`fromTextCreation` 后 `struct.texts.size===1`；`KetSerializer.serialize(struct)` 输出含 type=text 节点；`fromImageCreation` 后 `struct.images.size===1`。**核心层插入+KET 序列化正常**（早期探针 size=0 是误把返回的 inverted action 又 perform 了一次，已澄清）。
- ketcher-react 单测：273 passed，7 failed 全是 i18n 快照（英文按钮文案变中文，如 Save→保存），与插入逻辑无关。

### 当前断点
- 正在用 vite standalone dev server + 系统 chromium 无头实机复现，确认"点文本工具→画布→弹窗输入→确定"与"点图像工具→选图→落画布"的真实表现（不显示/报错/无响应），再据此定位 UI 层根因。
- 重点待查：`state/editor/index.js` onElementEdit → openDialog('text') 与 Text.tsx 的 result() 回传链；图像工具隐藏 file input 在 iframe/standalone 下的 click 是否被拦；retext.ts 新增对齐/行高代码在真实 paper 环境是否抛错导致文本不显示。

### 变更时间线
- 2026-10-26 02:06　首轮：环境就绪（Node24 + npm install + ajv），核心/单测初步排查完成，开始无头浏览器实机复现；按锁刷新要求先推一次 WIP。
