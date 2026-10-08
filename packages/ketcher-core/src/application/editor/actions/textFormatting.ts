export type TextFormattingCommand =
  | 'bold'
  | 'italic'
  | 'underline'
  | 'subscript'
  | 'superscript'
  | 'plain'
  | 'formula'
  | 'alignment'
  | 'font-family'
  | 'font-size'
  | 'line-spacing';

export interface TextFormattingOperationOptions {
  id: number;
  previousContent: string;
  content: string;
}

interface LexicalTextNode {
  format?: number;
  font?: string;
  style?: string;
  text?: string;
  type?: string;
  [key: string]: unknown;
}

interface LexicalParagraphNode {
  children?: LexicalTextNode[];
  format?: string | number;
  lineSpacing?: number;
  type?: string;
  [key: string]: unknown;
}

interface LexicalEditorState {
  root?: {
    children?: LexicalParagraphNode[];
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

const FORMAT_MASKS: Partial<Record<TextFormattingCommand, number>> = {
  bold: 1,
  italic: 2,
  underline: 8,
  subscript: 32,
  superscript: 64,
};
const PLAIN_FORMAT_MASK = 1 | 2 | 4 | 8 | 16 | 32 | 64 | 128;

function setStyleProperty(style: string | undefined, property: string, value: string): string {
  const declarations = new Map<string, string>();
  for (const declaration of String(style || '').split(';')) {
    const separator = declaration.indexOf(':');
    if (separator < 0) continue;
    const key = declaration.slice(0, separator).trim().toLowerCase();
    const currentValue = declaration.slice(separator + 1).trim();
    if (key && currentValue) declarations.set(key, currentValue);
  }
  declarations.set(property, value);
  return Array.from(declarations, ([key, currentValue]) => `${key}: ${currentValue}`).join('; ');
}

function formulaParts(text: string): Array<{ text: string; format: number }> {
  const parts: Array<{ text: string; format: number }> = [];
  let buffer = '';
  let mode: 'plain' | 'subscript' | 'superscript' = 'plain';
  const flush = () => {
    if (!buffer) return;
    parts.push({ text: buffer, format: mode === 'subscript' ? 32 : mode === 'superscript' ? 64 : 0 });
    buffer = '';
  };

  const append = (character: string, nextMode: typeof mode) => {
    if (nextMode !== mode) {
      flush();
      mode = nextMode;
    }
    buffer += character;
  };

  const isChargeSign = (character: string) => /^[+\-−]$/.test(character);
  const isFormulaBoundary = (character: string) => !character || /\s|[,;)]/.test(character);

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    const previous = text[index - 1] || '';
    const next = text[index + 1] || '';

    // A caret is notation for a superscript isotope or charge. Consume the
    // marker so `^13C` and `Fe^3+` render as chemical notation rather than
    // leaving a literal caret in the label. Braces make longer annotations
    // unambiguous, for example `^{13}C`.
    if (character === '^') {
      let annotation = '';
      let end = index + 1;
      if (text[end] === '{') {
        const closingBrace = text.indexOf('}', end + 1);
        if (closingBrace > end + 1) {
          annotation = text.slice(end + 1, closingBrace);
          end = closingBrace;
        }
      } else {
        const match = text.slice(end).match(/^(?:\d+[+\-−]?|[+\-−])/);
        if (match) {
          annotation = match[0];
          end += annotation.length - 1;
        }
      }
      if (annotation) {
        flush();
        mode = 'superscript';
        buffer = annotation;
        index = end;
        continue;
      }
    }

    const isDigit = /\d/.test(character);
    const isCharge = isChargeSign(character)
      && /[A-Za-z0-9)\]]/.test(previous)
      && isFormulaBoundary(next);
    const followsFormulaTerm = /[A-Za-z0-9)\]]/.test(previous);
    const nextMode = isCharge ? 'superscript' : isDigit && followsFormulaTerm ? 'subscript' : 'plain';
    append(character, nextMode);
  }
  flush();
  return parts;
}

function applyFormat(node: LexicalTextNode, command: TextFormattingCommand, value?: string | number): boolean {
  const oldFormat = Number(node.format || 0);
  if (command === 'plain') {
    node.format = oldFormat & ~PLAIN_FORMAT_MASK;
    node.font = undefined;
    node.style = '';
  } else if (command === 'font-size') {
    const size = Number(value);
    if (!Number.isFinite(size) || size < 4 || size > 160) throw new Error('字号需在 4 至 160 px 之间');
    node.style = setStyleProperty(node.style, 'font-size', `${size}px`);
  } else if (command === 'font-family') {
    const family = String(value || '').trim();
    if (!family || family.length > 80) throw new Error('字体名称无效');
    node.font = family;
  } else if (command === 'formula') {
    const text = String(node.text || '');
    if (!text) return false;
    const parts = formulaParts(text);
    if (parts.every((part) => part.format === 0)) return false;
    const first = parts.shift()!;
    node.text = first.text;
    node.format = (oldFormat & ~96) | first.format;
    return true;
  } else if (command === 'alignment' || command === 'line-spacing') {
    return false;
  } else {
    const mask = FORMAT_MASKS[command];
    if (!mask) throw new Error(`不支持的文本样式：${command}`);
    const hasFormat = (oldFormat & mask) !== 0;
    node.format = hasFormat ? oldFormat & ~mask : oldFormat | mask;
  }
  return oldFormat !== Number(node.format || 0) || command === 'font-size' || command === 'font-family';
}

/** Apply a text formatting command to a Lexical editor state and return it as JSON. */
export function formatLexicalText(
  content: string,
  command: TextFormattingCommand,
  value?: string | number,
): string {
  let state: LexicalEditorState;
  try {
    state = JSON.parse(content) as LexicalEditorState;
  } catch {
    throw new Error('文本格式不是有效的 Lexical 内容');
  }
  if (!state.root || !Array.isArray(state.root.children)) {
    throw new Error('当前文本格式无法编辑，请先用 Ketcher 文本工具打开并保存');
  }

  const paragraphs = state.root.children.filter((paragraph) => paragraph.type === 'paragraph');
  if (!paragraphs.length) throw new Error('当前文本没有可格式化的段落');

  if (command === 'alignment') {
    const alignment = String(value || '');
    if (!['left', 'center', 'right'].includes(alignment)) throw new Error('不支持的文本对齐方式');
    paragraphs.forEach((paragraph) => { paragraph.format = alignment; });
    return JSON.stringify(state);
  }
  if (command === 'line-spacing') {
    const lineSpacing = Number(value);
    if (!Number.isFinite(lineSpacing) || lineSpacing < 0.5 || lineSpacing > 4) throw new Error('行距需在 0.5 至 4 之间');
    paragraphs.forEach((paragraph) => { paragraph.lineSpacing = lineSpacing; });
    return JSON.stringify(state);
  }

  let textNodeCount = 0;
  paragraphs.forEach((paragraph) => {
    const children = Array.isArray(paragraph.children) ? paragraph.children : [];
    const nextChildren: LexicalTextNode[] = [];
    children.forEach((node) => {
      if (node.type !== 'text' || typeof node.text !== 'string') {
        nextChildren.push(node);
        return;
      }
      textNodeCount += 1;
      if (command !== 'formula') {
        applyFormat(node, command, value);
        nextChildren.push(node);
        return;
      }
      const oldFormat = Number(node.format || 0);
      const parts = formulaParts(node.text);
      parts.forEach((part) => {
        nextChildren.push({
          ...node,
          text: part.text,
          format: (oldFormat & ~96) | part.format,
        });
      });
    });
    paragraph.children = nextChildren;
  });
  if (!textNodeCount) throw new Error('当前文本没有可格式化的文字');
  return JSON.stringify(state);
}

/** Prepare one text update so Ketcher's editor can record it as an undo operation. */
export function createTextFormattingUpdate(
  id: number,
  content: string,
  command: TextFormattingCommand,
  value?: string | number,
): TextFormattingOperationOptions | null {
  const nextContent = formatLexicalText(content, command, value);
  if (nextContent === content) return null;
  return { id, previousContent: content, content: nextContent };
}
