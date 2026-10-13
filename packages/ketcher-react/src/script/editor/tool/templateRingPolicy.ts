import { ketcherProvider } from 'ketcher-core';
import type Editor from '../Editor';
import { MODES } from 'src/constants';

/** Only the built-in ring tools opt in. Nicknames, functional groups and
 * arbitrary library/user templates retain their own attachment semantics.
 * Alt requests sprouting; the manual does not establish an inverse Alt mode. */
export function shouldSproutRing(
  editor: Editor,
  template: { ringTool?: boolean },
  mode: unknown,
  event?: { altKey?: boolean },
): boolean {
  if (!template.ringTool || mode === MODES.FG) return false;
  return Boolean(
    event?.altKey ||
      ketcherProvider.getKetcher(editor.ketcherId).settingsService?.getSettings()
        .sproutRingsInsteadOfSpiro,
  );
}
