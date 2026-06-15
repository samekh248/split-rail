import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { SignaturePad, decodeSignaturePayload } from '@/components/settlement/SignaturePad';

describe('SignaturePad', () => {
  it('decodeSignaturePayload parses base64 vector JSON', () => {
    const payload = btoa('[[{"x":10,"y":20},{"x":30,"y":40}]]');
    const strokes = decodeSignaturePayload(payload);
    expect(strokes).toHaveLength(1);
    expect(strokes[0]).toHaveLength(2);
  });

  it('clear resets the canvas and signature payload', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    HTMLCanvasElement.prototype.getContext = vi.fn(() => ({
      clearRect: vi.fn(),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      stroke: vi.fn(),
      strokeStyle: '',
      lineWidth: 1,
      lineCap: 'round',
      lineJoin: 'round',
    })) as unknown as typeof HTMLCanvasElement.prototype.getContext;

    render(<SignaturePad onChange={onChange} width={200} height={80} />);
    await user.click(screen.getByTestId('signature-clear-btn'));
    expect(onChange).toHaveBeenCalledWith(null);
  });
});
