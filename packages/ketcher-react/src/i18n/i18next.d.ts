import 'i18next';

declare module 'i18next' {
  interface TFunction {
    (
      key: string,
      defaultValue?: string,
      options?: Record<string, unknown>,
    ): string;
    (key: string, options?: Record<string, unknown>): string;
  }
}
