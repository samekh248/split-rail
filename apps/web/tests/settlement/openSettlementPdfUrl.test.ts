import { describe, expect, it, vi } from 'vitest';
import { openSettlementPdfUrl } from '@/api/settlement';

describe('openSettlementPdfUrl', () => {
  it('opens external URLs via a temporary anchor', async () => {
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    await openSettlementPdfUrl('https://storage.example/settlement.pdf');

    expect(clickSpy).toHaveBeenCalled();
    const anchor = clickSpy.mock.instances[0] as HTMLAnchorElement;
    expect(anchor.href).toBe('https://storage.example/settlement.pdf');
    expect(anchor.target).toBe('_blank');

    clickSpy.mockRestore();
  });
});
