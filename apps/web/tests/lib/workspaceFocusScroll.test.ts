import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  WORKSPACE_FOCUS_TARGETS,
  isRecognizedWorkspaceFocus,
  scrollToWorkspaceFocus,
} from '@/lib/workspaceFocusScroll';

describe('workspaceFocusScroll', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    vi.restoreAllMocks();
    HTMLElement.prototype.scrollIntoView = vi.fn();
  });

  describe('isRecognizedWorkspaceFocus', () => {
    it('accepts all five focus values', () => {
      expect(isRecognizedWorkspaceFocus('deal')).toBe(true);
      expect(isRecognizedWorkspaceFocus('settlement')).toBe(true);
      expect(isRecognizedWorkspaceFocus('signature')).toBe(true);
      expect(isRecognizedWorkspaceFocus('variance')).toBe(true);
      expect(isRecognizedWorkspaceFocus('sync')).toBe(true);
    });

    it('rejects invalid, empty, and null values', () => {
      expect(isRecognizedWorkspaceFocus('invalid')).toBe(false);
      expect(isRecognizedWorkspaceFocus('')).toBe(false);
      expect(isRecognizedWorkspaceFocus(null)).toBe(false);
      expect(isRecognizedWorkspaceFocus(undefined)).toBe(false);
    });
  });

  describe('WORKSPACE_FOCUS_TARGETS', () => {
    it('maps each focus value to a data-testid selector', () => {
      expect(WORKSPACE_FOCUS_TARGETS.deal).toBe('[data-testid="artist-deal-panel"]');
      expect(WORKSPACE_FOCUS_TARGETS.settlement).toBe('[data-testid="ledger-grid"]');
      expect(WORKSPACE_FOCUS_TARGETS.signature).toBe('[data-testid="finalize-settlement-panel"]');
      expect(WORKSPACE_FOCUS_TARGETS.variance).toBe('[data-testid="variance-banner"]');
      expect(WORKSPACE_FOCUS_TARGETS.sync).toBe('[data-testid="workspace-focus-sync"]');
    });
  });

  describe('scrollToWorkspaceFocus', () => {
    it('scrolls target into view and focuses first focusable control', () => {
      document.body.innerHTML = `
        <section data-testid="artist-deal-panel">
          <button type="button" id="deal-btn">Add artist</button>
        </section>
      `;
      const panel = document.querySelector('[data-testid="artist-deal-panel"]') as HTMLElement;
      const button = document.getElementById('deal-btn') as HTMLButtonElement;
      const focusSpy = vi.spyOn(button, 'focus');

      expect(scrollToWorkspaceFocus('deal')).toBe(true);
      expect(panel.scrollIntoView).toHaveBeenCalledWith({ block: 'start' });
      expect(focusSpy).toHaveBeenCalled();
    });

    it('scrolls without focusing when no focusable control exists', () => {
      document.body.innerHTML = `
        <div data-testid="variance-banner">Variance alert</div>
      `;
      const banner = document.querySelector('[data-testid="variance-banner"]') as HTMLElement;

      expect(scrollToWorkspaceFocus('variance')).toBe(true);
      expect(banner.scrollIntoView).toHaveBeenCalledWith({ block: 'start' });
    });

    it('returns false when target is missing from DOM', () => {
      expect(scrollToWorkspaceFocus('signature')).toBe(false);
    });
  });
});
