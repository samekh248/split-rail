import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SignaturePad, decodeSignaturePayload } from '@/components/settlement/SignaturePad';

function createCanvasContext() {
  const clearRect = vi.fn();
  const beginPath = vi.fn();
  const moveTo = vi.fn();
  const lineTo = vi.fn();
  const stroke = vi.fn();
  const setTransform = vi.fn();
  const ctx = {
    clearRect,
    beginPath,
    moveTo,
    lineTo,
    stroke,
    setTransform,
    strokeStyle: '',
    lineWidth: 1,
    lineCap: 'round' as CanvasLineCap,
    lineJoin: 'round' as CanvasLineJoin,
  };
  return { ctx, clearRect, beginPath, moveTo, lineTo, stroke, setTransform };
}

function mockCanvasContext() {
  const mocks = createCanvasContext();
  HTMLCanvasElement.prototype.getContext = vi.fn(() => mocks.ctx) as unknown as typeof HTMLCanvasElement.prototype.getContext;
  return mocks;
}

function pointerDown(canvas: HTMLElement, x: number, y: number) {
  fireEvent.pointerDown(canvas, { clientX: x, clientY: y, pointerId: 1 });
}

function pointerMove(canvas: HTMLElement, x: number, y: number) {
  fireEvent.pointerMove(canvas, { clientX: x, clientY: y, pointerId: 1 });
}

function pointerUp(canvas: HTMLElement) {
  fireEvent.pointerUp(canvas, { pointerId: 1 });
}

function pointerLeave(canvas: HTMLElement) {
  fireEvent.pointerLeave(canvas, { pointerId: 1 });
}

describe('SignaturePad', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    Object.defineProperty(HTMLElement.prototype, 'clientWidth', {
      configurable: true,
      get() {
        return 400;
      },
    });
    Object.defineProperty(HTMLCanvasElement.prototype, 'getBoundingClientRect', {
      configurable: true,
      value: () => ({
        left: 0,
        top: 0,
        width: 400,
        height: 120,
        right: 400,
        bottom: 120,
      }),
    });
  });

  it('decodeSignaturePayload parses base64 vector JSON', () => {
    const payload = btoa('[[{"x":10,"y":20},{"x":30,"y":40}]]');
    const strokes = decodeSignaturePayload(payload);
    expect(strokes).toHaveLength(1);
    expect(strokes[0]).toHaveLength(2);
  });

  describe('form presentation (US1)', () => {
    it('renders labeled signature form structure', () => {
      mockCanvasContext();
      render(<SignaturePad width={400} height={120} />);

      expect(screen.getByText('Artist signature')).toBeInTheDocument();
      expect(document.querySelector('.signature-pad__surface')).toBeInTheDocument();
      expect(screen.getByTestId('signature-placeholder')).toHaveTextContent('Sign here');
      expect(document.querySelector('.signature-pad__baseline')).toBeInTheDocument();
      expect(screen.getByTestId('signature-hint')).toHaveTextContent(
        'Use your finger or pointer to sign inside the box.',
      );
      expect(screen.getByTestId('signature-clear-btn')).toHaveClass('btn-secondary');
    });

    it('shows placeholder when empty and hides after drawing', () => {
      mockCanvasContext();
      render(<SignaturePad width={400} height={120} />);

      const placeholder = screen.getByTestId('signature-placeholder');
      expect(placeholder).not.toHaveClass('signature-pad__placeholder--hidden');

      const canvas = screen.getByTestId('signature-canvas');
      pointerDown(canvas, 10, 20);
      expect(placeholder).toHaveClass('signature-pad__placeholder--hidden');
    });

    it('restores placeholder after clear', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      mockCanvasContext();
      render(<SignaturePad onChange={onChange} width={400} height={120} />);

      const canvas = screen.getByTestId('signature-canvas');
      pointerDown(canvas, 10, 20);
      pointerMove(canvas, 30, 40);
      pointerUp(canvas);

      await user.click(screen.getByTestId('signature-clear-btn'));

      expect(screen.getByTestId('signature-placeholder')).not.toHaveClass(
        'signature-pad__placeholder--hidden',
      );
      expect(onChange).toHaveBeenLastCalledWith(null);
    });
  });

  describe('drawing performance (US2)', () => {
    it('does not full redraw on every pointermove', () => {
      const { clearRect } = mockCanvasContext();
      render(<SignaturePad width={400} height={120} />);

      const canvas = screen.getByTestId('signature-canvas');
      pointerDown(canvas, 10, 20);
      clearRect.mockClear();

      for (let i = 0; i < 200; i += 1) {
        pointerMove(canvas, 10 + i, 20 + i);
      }

      expect(clearRect).not.toHaveBeenCalled();
    });

    it('commits stroke on pointer leave and emits base64 JSON payload', () => {
      const onChange = vi.fn();
      mockCanvasContext();
      render(<SignaturePad onChange={onChange} width={400} height={120} />);

      const canvas = screen.getByTestId('signature-canvas');
      pointerDown(canvas, 1, 2);
      pointerMove(canvas, 3, 4);
      pointerLeave(canvas);

      expect(onChange).toHaveBeenCalled();
      const payload = onChange.mock.calls[0][0] as string;
      const strokes = decodeSignaturePayload(payload);
      expect(strokes).toHaveLength(1);
      expect(strokes[0].length).toBeGreaterThanOrEqual(2);
    });

    it('supports multiple strokes in one session', () => {
      const onChange = vi.fn();
      mockCanvasContext();
      render(<SignaturePad onChange={onChange} width={400} height={120} />);

      const canvas = screen.getByTestId('signature-canvas');
      pointerDown(canvas, 1, 2);
      pointerMove(canvas, 3, 4);
      pointerUp(canvas);

      pointerDown(canvas, 10, 20);
      pointerMove(canvas, 12, 22);
      pointerUp(canvas);

      const payload = onChange.mock.calls.at(-1)?.[0] as string;
      const strokes = decodeSignaturePayload(payload);
      expect(strokes).toHaveLength(2);
    });

    it('full redraws on stroke completion', () => {
      const { clearRect } = mockCanvasContext();
      render(<SignaturePad width={400} height={120} />);

      const canvas = screen.getByTestId('signature-canvas');
      pointerDown(canvas, 10, 20);
      pointerMove(canvas, 30, 40);
      clearRect.mockClear();
      pointerUp(canvas);

      expect(clearRect).toHaveBeenCalled();
    });
  });

  describe('disabled state (US3)', () => {
    it('ignores pointer input and disables clear when disabled', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      mockCanvasContext();
      render(<SignaturePad onChange={onChange} disabled width={400} height={120} />);

      const canvas = screen.getByTestId('signature-canvas');
      pointerDown(canvas, 10, 20);
      pointerMove(canvas, 30, 40);
      pointerUp(canvas);

      expect(onChange).not.toHaveBeenCalled();
      expect(screen.getByTestId('signature-clear-btn')).toBeDisabled();

      await user.click(screen.getByTestId('signature-clear-btn'));
      expect(onChange).not.toHaveBeenCalled();
    });

    it('captures pointer on pointer down when supported', () => {
      mockCanvasContext();
      render(<SignaturePad width={400} height={120} />);

      const canvas = screen.getByTestId('signature-canvas');
      const setPointerCapture = vi.fn();
      canvas.setPointerCapture = setPointerCapture;

      pointerDown(canvas, 10, 20);
      expect(setPointerCapture).toHaveBeenCalled();
    });

    it('sizes canvas bitmap to device pixel ratio for crisp strokes', () => {
      vi.spyOn(window, 'devicePixelRatio', 'get').mockReturnValue(2);
      mockCanvasContext();
      render(<SignaturePad width={400} height={120} />);

      const canvas = screen.getByTestId('signature-canvas');
      expect(canvas.width).toBe(800);
      expect(canvas.height).toBe(240);
      expect(canvas.style.width).toBe('400px');
      expect(canvas.style.height).toBe('120px');
    });
  });
});
