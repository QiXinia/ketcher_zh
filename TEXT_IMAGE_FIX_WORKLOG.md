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
