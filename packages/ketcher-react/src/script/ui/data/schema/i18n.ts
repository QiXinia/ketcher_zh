import i18n from '../../../../i18n';

type TranslateOptions = {
  defaultValue?: string;
};

export const translate = (key: string, options?: TranslateOptions): string => {
  if (!key) {
    return options?.defaultValue ?? '';
  }
  return i18n.t(
    key,
    options?.defaultValue ? { defaultValue: options.defaultValue } : undefined,
  );
};

export const localizedProperty = <T extends Record<string, unknown>>(
  property: T,
  key: string,
  defaultValue?: string,
): T => {
  return Object.defineProperty(property, 'title', {
    get() {
      return translate(key, { defaultValue });
    },
    enumerable: true,
    configurable: true,
  });
};

export const localizedEnumNames = <T extends Record<string, unknown>>(
  property: T,
  entries: Array<{ key: string; defaultValue: string }>,
): T => {
  return Object.defineProperty(property, 'enumNames', {
    get() {
      return entries.map((entry) =>
        translate(entry.key, { defaultValue: entry.defaultValue }),
      );
    },
    enumerable: true,
    configurable: true,
  });
};

export const localizedInvalidMessage = <T extends Record<string, unknown>>(
  property: T,
  key: string,
  defaultValue?: string,
): T => {
  return Object.defineProperty(property, 'invalidMessage', {
    get() {
      return translate(key, { defaultValue });
    },
    enumerable: true,
    configurable: true,
  });
};
