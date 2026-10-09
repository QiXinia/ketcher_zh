/* eslint-disable @typescript-eslint/ban-types */
import {
  test as base,
  BrowserContext,
  Page,
  TestInfoError,
} from '@playwright/test';
import { waitForPageInit } from '@utils';

type CoreTestFixtures = {
  ketcherTestInfo: object;
};

type CoreWorkerFixtures = {
  ketcher: {
    page?: Page;
    testError?: TestInfoError;
    testStatus?: 'passed' | 'failed' | 'timedOut' | 'skipped' | 'interrupted';
    testTimeout?: number;
  };
  createPage: () => Promise<Page>;
  closePage: () => Promise<void>;
};

// Pin the UI to English for E2E so the upstream selectors (mostly
// language-independent data-testid, plus a small set of English labels) stay
// deterministic. The product still defaults to Chinese for real users; this
// only affects the automated browser. Must run before the app's first load.
async function pinEnglishLanguage(context: BrowserContext) {
  await context.addInitScript(() => {
    window.localStorage.setItem('ketcher-language', 'en');
  });
}

export const test = base.extend<CoreTestFixtures, CoreWorkerFixtures>({
  // Covers tests that use Playwright's built-in context/page fixtures.
  context: async ({ context }, use) => {
    await pinEnglishLanguage(context);
    await use(context);
  },

  createPage: [
    async ({ browser, ketcher }, use) => {
      await use(async () => {
        const context = await browser.newContext();
        await pinEnglishLanguage(context);
        const page = await context.newPage();
        ketcher.page = page;
        await waitForPageInit(page);
        return page;
      });
      ketcher.page = undefined;
    },
    { scope: 'worker', auto: true },
  ],

  closePage: [
    async ({ browser, ketcher }, use) => {
      await use(async () => {
        await Promise.all(
          browser.contexts().map((context) =>
            context.close({
              reason:
                ketcher.testStatus === 'timedOut'
                  ? `Test timeout of ${ketcher.testTimeout}ms exceeded.`
                  : 'Test ended.',
            }),
          ),
        );
      });
    },
    { scope: 'worker', auto: true },
  ],

  ketcher: [
    async ({}, use) => {
      await use({});
    },
    { scope: 'worker', auto: true },
  ],

  ketcherTestInfo: [
    async ({ ketcher }, use, testInfo) => {
      ketcher.testError = undefined;
      ketcher.testStatus = undefined;
      ketcher.testTimeout = undefined;
      await use({});
      ketcher.testError = testInfo.error;
      ketcher.testStatus = testInfo.status;
      ketcher.testTimeout = testInfo.timeout;
    },
    { scope: 'test', auto: true },
  ],
});
