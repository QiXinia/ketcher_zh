# Ketcher UI — 汉化与深色模式适配研究报告

## 摘要
- 目标：为 Ketcher UI 提供中文（简体）本地化（汉化）方案，并为整个应用引入系统化的深色模式支持。报告给出技术选型、实施步骤、最小可行方案（POC）建议、测试要点与估时。

## 范围与假设
- 假设代码库主要的 UI 在 `packages/ketcher-react`、`packages/ketcher-standalone` 及顶层 `example/`、`demo/` 中。操作基于 React + TypeScript（严格模式）。
- 不修改现有源码前提下，优先推荐最小侵入（POC）路径；完整集成会需要把字符串外置并适配渲染层主题。

## 总体建议（快速结论）
- 汉化（i18n）推荐使用 `react-i18next`（生态成熟、TypeScript 支持、按需加载、运行时语言切换）。
- 深色模式建议基于 CSS 变量（`--*`） + 全局 `data-theme`（或 class）切换，并在渲染引擎（SVG/canvas）侧增加主题适配层（读取 CSS 变量或由上层传入主题对象）。
- 先在 `example/` 或 `demo/` 做 POC，再逐步推广到 `packages/*`。

---

## 详细方案：汉化（i18n）

1) 选型说明
- 推荐：`react-i18next` + `i18next`。优点：最小侵入、支持命名空间、按需加载、语言探测、广泛插件（后端、浏览器探测、缓存）。
- 备选：`formatjs` / `react-intl`（更强的 ICU 格式支持），或 `lingui`（良好 TS 支撑）。

2) 最小可行集成步骤（POC）
- 安装（在承载 UI 的包或顶层）

```bash
# 在使用 UI 的包或示例目录中执行
npm install react-i18next i18next i18next-browser-languagedetector i18next-http-backend
```

- 新建初始化文件（示例：`src/i18n.ts`）

```ts
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import Backend from 'i18next-http-backend';

i18n
  .use(Backend)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: 'en',
    debug: false,
    interpolation: { escapeValue: false },
    react: { useSuspense: true }
  });

export default i18n;
```

- 在入口（例如 `index.tsx`）引入并包裹 App

```tsx
import './i18n'; // side-effect 初始化
import { Suspense } from 'react';
import { I18nextProvider } from 'react-i18next';
import i18n from './i18n';

ReactDOM.render(
  <I18nextProvider i18n={i18n}>
    <Suspense fallback={null}>
      <App />
    </Suspense>
  </I18nextProvider>,
  document.getElementById('root')
);
```

- 把文本外置为 key，例如：

```tsx
// Before
<button>撤销</button>

// After
const { t } = useTranslation();
<button>{t('toolbar.undo')}</button>
```

- 翻译文件结构建议（示例）
```
public/locales/en/translation.json
public/locales/zh-CN/translation.json
```

3) 提取 & 翻译流程
- 小项目：手工把 UI 字符替换为 `t('...')` 并维护 JSON。
- 大项目：使用 `i18next-scanner` 自动提取或结合自定义脚本扫描 `t('...')`。翻译交付可使用 Crowdin/POEditor 等平台。

4) TypeScript 的类型安全（可选）
- 若希望对 translation keys 做类型检查，可在构建脚本中根据 JSON 生成一个 `locales/types.ts` 的联合类型，或采用 `i18next` 的 namespace typing 插件/自定义声明文件。

5) 特殊注意点
- 不要翻译化学专有名词、分子式、SMILES、文件格式字段、单体内部 ID 等域特定标识。
- UI 里动态构造的字符串（拼接）要改成使用占位符：`t('msg.count', { n })`。

---

## 详细方案：深色模式（Dark Mode）

1) 设计原则
- 使用 CSS 变量作为主题令牌（colors, surfaces, text, accent, svg-stroke 等）。
- 让组件使用变量而非硬编码颜色；对于无法立刻重构的代码，提供“主题适配层”在运行时替换渲染颜色。

2) 最小可行 POC（CSS 变量 + 切换）
- 在全局 CSS（例如 `index.css` / `App.css`）加入：

```css
:root{
  --bg: #ffffff;
  --surface: #ffffff;
  --text: #111827;
  --muted: #6b7280;
  --accent: #1f6feb;
  --svg-stroke: #111827;
}

[data-theme='dark']{
  --bg: #071024;
  --surface: #0b1220;
  --text: #e6eef6;
  --muted: #9aa4b2;
  --accent: #58a6ff;
  --svg-stroke: #dbeafe;
}

body{ background: var(--bg); color: var(--text); }
```

- 切换逻辑（示例）

```ts
function setTheme(theme: 'light'|'dark'){
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('theme', theme);
}

const saved = localStorage.getItem('theme') as 'light'|'dark'|null;
if(saved) setTheme(saved);
else if(window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) setTheme('dark');
```

3) SVG / Canvas / 渲染引擎适配
- SVG：尽量将 `stroke` / `fill` 使用 CSS 变量或 `currentColor`，例如 `stroke: var(--svg-stroke)`。
- Canvas & 自定义渲染（packages/ketcher-core 等）：推荐新增一个主题桥接（theme adapter）模块，提供 `getColor(name)`，在初始化或主题切换时从 CSS 变量读取值：

```ts
function readThemeToken(name: string){
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || '';
}

const svgStroke = readThemeToken('--svg-stroke') || '#000';
renderer.setStroke(svgStroke);
```

- 将 renderer（或渲染配置）在全局 ThemeProvider 中注册/更新，主题切换时触发重绘或更新颜色缓存。

4) 渐进式迁移策略
- 第一步：在全局声明 CSS 变量并在 `example/` 覆盖变量，验证视觉效果。
- 第二步：在常规 React 组件中替换静态颜色为变量（逐文件改造）。
- 第三步：给渲染引擎加入主题适配器，替换硬编码颜色。

5) 可访问性 & 对比度
- 深色模式下核心文本、工具栏及画布元素需满足对比度要求（WCAG）。对比度检查应为 QA 步骤。

---

## 测试与验证
- 自动化：更新 `ketcher-autotests` 中的 Playwright 场景，分别在 light/dark 下截图并比对金丝雀快照。
- 手动：按模块检查工具栏、上下文菜单、对话框、导出/打印、图像导出（确保背景/线条颜色正确）。
- i18n 特殊检查：
  - 检查占位符插值是否正确（数字、单位、方向）。
  - 检查长文本容器（按钮、工具栏）换行问题。

---

## 风险、难点与应对
- 风险：渲染层（核心绘制算法）大量硬编码颜色，迁移成本较高。应对：先实现运行时主题映射（读取 CSS 变量），减少一次性大改。
- 风险：翻译质量（专业化学术语）。应对：准备翻译备注（.po 或注释），与化学背景译者合作。

---

## 粗略估时（供预算参考）
- 评估与 POC（example/demo）：1 - 2 天
- 汉化基础集成（i18n provider + 若干主要页面替换）：2 - 4 天
- 完整字符串外置（全组件）：视规模 5 - 10 天
- 深色模式基础（CSS 变量 + POC）：1 - 2 天
- 渲染引擎主题接入与全局修正：3 - 7 天
- QA 与 翻译校对：2 - 4 天

（实际时间取决于字符串数量、渲染器改动复杂度与回归测试要求）

---

## 建议的下一步（优先级）
1. 在 `example/` 或 `demo/` 做 POC（同时完成 i18n 初始化与 CSS 变量声明），验证语言切换与深色切换对 UI/画布无重大回归。
2. 根据 POC 结果，按组件分批次外置文本并提交小型 PR，先覆盖高频路径（工具栏、对话框、菜单）。
3. 并行准备翻译（zh-CN）并与翻译团队校对专业术语。
4. 在渲染引擎中添加主题适配器，完成线条/填充颜色的动态读取与切换。

---

## 我可以为你做的事情
- 生成 POC 分支（在 `example/`）：集成 `react-i18next` + 全局 CSS 变量 + 简单切换 UI，并提交 PR。
- 或仅生成示例补丁/代码片段供团队手工合并。

---

报告已保存到仓库根目录文件：`KetcherUI_汉化_深色模式_研究报告.md`。

如需我继续：是否要我开始实现 POC（在 `example/` 中集成，并创建 PR）？
