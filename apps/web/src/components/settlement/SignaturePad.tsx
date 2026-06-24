import { useCallback, useRef, useState } from 'react';

export interface SignaturePadProps {
  onChange?: (signatureBase64: string | null) => void;
  width?: number;
  height?: number;
}

interface Point {
  x: number;
  y: number;
}

export function SignaturePad({ onChange, width = 400, height = 120 }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawingRef = useRef(false);
  const strokesRef = useRef<Point[][]>([]);
  const currentStrokeRef = useRef<Point[]>([]);
  const [, setRevision] = useState(0);

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, width, height);
    // intentional hex: canvas signature ink — non-chrome drawing color (SPLR-91 out-of-scope)
    ctx.strokeStyle = '#111';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    for (const stroke of strokesRef.current) {
      if (stroke.length === 0) continue;
      ctx.beginPath();
      ctx.moveTo(stroke[0].x, stroke[0].y);
      for (let i = 1; i < stroke.length; i += 1) {
        ctx.lineTo(stroke[i].x, stroke[i].y);
      }
      ctx.stroke();
    }
  }, [width, height]);

  const emitChange = useCallback(() => {
    const payload = strokesRef.current.filter((s) => s.length > 0);
    if (payload.length === 0) {
      onChange?.(null);
      return;
    }
    const json = JSON.stringify(payload);
    onChange?.(btoa(json));
  }, [onChange]);

  const getPoint = (event: React.PointerEvent<HTMLCanvasElement>): Point => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const scaleX = width / rect.width;
    const scaleY = height / rect.height;
    return {
      x: (event.clientX - rect.left) * scaleX,
      y: (event.clientY - rect.top) * scaleY,
    };
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (typeof event.currentTarget.setPointerCapture === 'function') {
      event.currentTarget.setPointerCapture(event.pointerId);
    }
    drawingRef.current = true;
    currentStrokeRef.current = [getPoint(event)];
    redraw();
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return;
    currentStrokeRef.current.push(getPoint(event));
    redraw();
    const ctx = canvasRef.current?.getContext('2d');
    const stroke = currentStrokeRef.current;
    if (ctx && stroke.length >= 2) {
      const prev = stroke[stroke.length - 2];
      const curr = stroke[stroke.length - 1];
      ctx.beginPath();
      ctx.moveTo(prev.x, prev.y);
      ctx.lineTo(curr.x, curr.y);
      ctx.stroke();
    }
  };

  const finishStroke = () => {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    if (currentStrokeRef.current.length > 0) {
      strokesRef.current.push([...currentStrokeRef.current]);
    }
    currentStrokeRef.current = [];
    emitChange();
    setRevision((r) => r + 1);
  };

  const clear = () => {
    strokesRef.current = [];
    currentStrokeRef.current = [];
    drawingRef.current = false;
    redraw();
    emitChange();
    setRevision((r) => r + 1);
  };

  return (
    <div className="signature-pad" data-testid="signature-pad">
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        data-testid="signature-canvas"
        className="signature-pad__canvas"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={finishStroke}
        onPointerLeave={finishStroke}
      />
      <div className="signature-pad__actions">
        <button type="button" data-testid="signature-clear-btn" onClick={clear}>
          Clear / Redo
        </button>
      </div>
    </div>
  );
}

export function decodeSignaturePayload(base64: string): Point[][] {
  const json = atob(base64);
  return JSON.parse(json) as Point[][];
}
