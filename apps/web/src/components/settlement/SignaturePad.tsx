import { useCallback, useEffect, useId, useRef, useState } from 'react';

export interface SignaturePadProps {
  onChange?: (signatureBase64: string | null) => void;
  width?: number;
  height?: number;
  disabled?: boolean;
}

interface Point {
  x: number;
  y: number;
}

interface LogicalSize {
  width: number;
  height: number;
}

function applyStrokeStyle(ctx: CanvasRenderingContext2D) {
  // intentional hex: canvas signature ink — non-chrome drawing color (SPLR-91 out-of-scope)
  ctx.strokeStyle = '#111';
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
}

function drawSegment(ctx: CanvasRenderingContext2D, prev: Point, curr: Point) {
  applyStrokeStyle(ctx);
  ctx.beginPath();
  ctx.moveTo(prev.x, prev.y);
  ctx.lineTo(curr.x, curr.y);
  ctx.stroke();
}

export function SignaturePad({
  onChange,
  width = 400,
  height = 120,
  disabled = false,
}: SignaturePadProps) {
  const canvasId = useId();
  const hintId = `${canvasId}-hint`;
  const surfaceRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const logicalSizeRef = useRef<LogicalSize>({ width, height });
  const drawingRef = useRef(false);
  const strokesRef = useRef<Point[][]>([]);
  const currentStrokeRef = useRef<Point[]>([]);
  const [showPlaceholder, setShowPlaceholder] = useState(true);
  const [canClear, setCanClear] = useState(false);

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const { width: logicalWidth, height: logicalHeight } = logicalSizeRef.current;
    ctx.clearRect(0, 0, logicalWidth, logicalHeight);
    applyStrokeStyle(ctx);

    for (const stroke of strokesRef.current) {
      if (stroke.length === 0) continue;
      ctx.beginPath();
      ctx.moveTo(stroke[0].x, stroke[0].y);
      for (let i = 1; i < stroke.length; i += 1) {
        ctx.lineTo(stroke[i].x, stroke[i].y);
      }
      ctx.stroke();
    }
  }, []);

  const syncCanvasSize = useCallback(() => {
    const surface = surfaceRef.current;
    const canvas = canvasRef.current;
    if (!surface || !canvas) return;

    const surfaceWidth = surface.clientWidth > 0 ? surface.clientWidth : width;
    const aspect = height / width;
    const logicalWidth = surfaceWidth;
    const logicalHeight = Math.max(1, Math.round(surfaceWidth * aspect));
    const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;

    logicalSizeRef.current = { width: logicalWidth, height: logicalHeight };
    canvas.width = Math.max(1, Math.round(logicalWidth * dpr));
    canvas.height = Math.max(1, Math.round(logicalHeight * dpr));
    canvas.style.width = `${logicalWidth}px`;
    canvas.style.height = `${logicalHeight}px`;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    redraw();
  }, [width, height, redraw]);

  useEffect(() => {
    syncCanvasSize();

    const surface = surfaceRef.current;
    if (!surface || typeof ResizeObserver === 'undefined') return undefined;

    const observer = new ResizeObserver(() => {
      syncCanvasSize();
    });
    observer.observe(surface);
    return () => observer.disconnect();
  }, [syncCanvasSize]);

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
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (disabled) return;
    if (typeof event.currentTarget.setPointerCapture === 'function') {
      event.currentTarget.setPointerCapture(event.pointerId);
    }
    drawingRef.current = true;
    currentStrokeRef.current = [getPoint(event)];
    setShowPlaceholder(false);
    setCanClear(true);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (disabled || !drawingRef.current) return;
    currentStrokeRef.current.push(getPoint(event));
    const ctx = canvasRef.current?.getContext('2d');
    const stroke = currentStrokeRef.current;
    if (ctx && stroke.length >= 2) {
      const prev = stroke[stroke.length - 2];
      const curr = stroke[stroke.length - 1];
      drawSegment(ctx, prev, curr);
    }
  };

  const finishStroke = () => {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    if (currentStrokeRef.current.length > 0) {
      strokesRef.current.push([...currentStrokeRef.current]);
    }
    currentStrokeRef.current = [];
    redraw();
    emitChange();
    setCanClear(strokesRef.current.length > 0);
    if (strokesRef.current.length === 0) {
      setShowPlaceholder(true);
    }
  };

  const clear = () => {
    if (disabled) return;
    strokesRef.current = [];
    currentStrokeRef.current = [];
    drawingRef.current = false;
    redraw();
    emitChange();
    setShowPlaceholder(true);
    setCanClear(false);
  };

  return (
    <div className="form-field signature-pad" data-testid="signature-pad">
      <label className="form-field__label signature-pad__label" htmlFor={canvasId}>
        Artist signature
      </label>
      <div ref={surfaceRef} className="signature-pad__surface">
        <span
          className={`signature-pad__placeholder${showPlaceholder ? '' : ' signature-pad__placeholder--hidden'}`}
          data-testid="signature-placeholder"
          aria-hidden="true"
        >
          Sign here
        </span>
        <div className="signature-pad__baseline" aria-hidden="true" />
        <canvas
          ref={canvasRef}
          id={canvasId}
          data-testid="signature-canvas"
          className="signature-pad__canvas"
          role="img"
          aria-label="Artist signature drawing area"
          aria-describedby={hintId}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={finishStroke}
          onPointerLeave={finishStroke}
        />
      </div>
      <p id={hintId} className="signature-pad__hint" data-testid="signature-hint">
        Use your finger or pointer to sign inside the box.
      </p>
      <div className="signature-pad__actions">
        <button
          type="button"
          className="btn-secondary"
          data-testid="signature-clear-btn"
          disabled={disabled || !canClear}
          onClick={clear}
        >
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
