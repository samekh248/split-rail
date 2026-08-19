import { useCallback, useEffect, useRef, useState } from 'react';
import {
  buildCreateSeed,
  clampToDayBounds,
  detectSameStageOverlap,
  DRAG_THRESHOLD_PX,
  minutesToTime,
  placeBlockStart,
  resizeBlockBound,
  snapMinutesToSlot,
  TIMELINE_SLOT_MINUTES,
  timeToMinutes,
} from '@/components/festival/timelineUtils';
import type { ProgrammingBlockResponse } from '@/types/generated-api';

export type GestureIntent =
  | { kind: 'click'; blockId: string }
  | { kind: 'create'; dayDate: string; stageZoneId: string; startTime: string; endTime: string }
  | { kind: 'move'; blockId: string; stageZoneId: string; startTime: string; endTime: string }
  | { kind: 'resize'; blockId: string; startTime: string; endTime: string };

export type GesturePhase = 'idle' | 'pressing' | 'moving' | 'resizing' | 'creating';

interface PressOrigin {
  kind: 'block' | 'edge' | 'slot';
  blockId: string | null;
  edge: 'start' | 'end' | null;
  stageZoneId: string;
  startTime: string;
  endTime: string;
  clientX: number;
  clientY: number;
  /** How far into the block the grab landed, so the block stays under the cursor on a move. */
  grabOffsetMinutes: number;
}

export interface GestureState {
  phase: GesturePhase;
  origin: PressOrigin;
  currentStageId: string;
  currentStartTime: string;
  currentEndTime: string;
  isValid: boolean;
  conflictBlockId: string | null;
}

export interface UseTimelineInteractionOptions {
  dayDate: string;
  blocks: ProgrammingBlockResponse[];
  canManage: boolean;
  onIntent: (intent: GestureIntent) => void;
}

export interface StartPressOptions {
  kind: 'block' | 'edge' | 'slot';
  blockId?: string;
  edge?: 'start' | 'end';
  stageZoneId: string;
  startTime: string;
  endTime?: string;
  clientX?: number;
  clientY?: number;
  /** Continuous minutes under the pointer at press, used to anchor the grab offset. */
  pointerMinutes?: number;
}

export interface PointerUpdate {
  stageZoneId: string;
  minutes: number;
  clientX?: number;
  clientY?: number;
  /**
   * 'pointer' — a continuous pointermove, gated by the pixel threshold.
   * 'cell' — the pointer crossed into a different grid cell, which is itself proof of travel
   * and so bypasses the pixel threshold.
   */
  source?: 'pointer' | 'cell';
}

/**
 * Pointer-gesture state machine backing the timeline's click / create / move / resize
 * interactions (spec 085).
 *
 * Tracking is driven by continuous pointer coordinates rather than by which grid cell the
 * pointer has entered: cell-entry events are throttled to one per ~30-minute row, are swallowed
 * entirely when another block card sits over the target, and are dropped altogether on a fast
 * flick. Coordinates give pixel-resolution feedback and work uniformly over empty and occupied
 * regions. A press becomes a drag after DRAG_THRESHOLD_PX of travel; below that it stays a click.
 */
export function useTimelineInteraction({
  dayDate,
  blocks,
  canManage,
  onIntent,
}: UseTimelineInteractionOptions) {
  const [gesture, setGesture] = useState<GestureState | null>(null);
  // Mirrors `gesture` synchronously so `release()` can read the latest state and call
  // `onIntent` as a plain side effect *outside* a setState updater. Calling a
  // parent-triggering callback like `onIntent` from inside a `setGesture` updater is unsafe:
  // React may invoke updaters during another component's render, which is exactly what
  // produces "Cannot update a component while rendering a different component" — updaters
  // must stay pure. Mutating a plain ref here has no such restriction.
  const gestureRef = useRef<GestureState | null>(null);

  const startPress = useCallback(
    (options: StartPressOptions) => {
      if (!canManage) {
        return;
      }
      const startTime = options.startTime;
      const endTime = options.endTime ?? options.startTime;
      const pointerMinutes = options.pointerMinutes ?? timeToMinutes(startTime);
      const next: GestureState = {
        phase: 'pressing',
        origin: {
          kind: options.kind,
          blockId: options.blockId ?? null,
          edge: options.edge ?? null,
          stageZoneId: options.stageZoneId,
          startTime,
          endTime,
          clientX: options.clientX ?? 0,
          clientY: options.clientY ?? 0,
          grabOffsetMinutes:
            options.kind === 'block' ? pointerMinutes - timeToMinutes(startTime) : 0,
        },
        currentStageId: options.stageZoneId,
        currentStartTime: startTime,
        currentEndTime: endTime,
        isValid: true,
        conflictBlockId: null,
      };
      gestureRef.current = next;
      setGesture(next);
    },
    [canManage],
  );

  const updatePointer = useCallback(
    (update: PointerUpdate) => {
      setGesture((prev) => {
        if (!prev) {
          return prev;
        }

        if (prev.phase === 'pressing' && !hasTravelled(prev, update)) {
          gestureRef.current = prev;
          return prev;
        }

        // Dragging out of an empty slot sweeps out the span of a block to create. The press
        // slot is the anchor: dragging down grows the end, dragging up grows the start, and the
        // span never shrinks below the one-slot minimum a new block gets from a plain click.
        if (prev.origin.kind === 'slot') {
          const anchorStart = timeToMinutes(prev.origin.startTime);
          const anchorEnd = anchorStart + TIMELINE_SLOT_MINUTES;
          const swept = clampToDayBounds(snapMinutesToSlot(update.minutes));
          const startTime = minutesToTime(Math.min(anchorStart, swept));
          const endTime = minutesToTime(Math.max(anchorEnd, swept));
          const conflict = detectSameStageOverlap(blocks, {
            stageZoneId: prev.origin.stageZoneId,
            dayDate,
            startTime,
            endTime,
          });

          const drafted: GestureState = {
            ...prev,
            phase: 'creating',
            currentStageId: prev.origin.stageZoneId,
            currentStartTime: startTime,
            currentEndTime: endTime,
            isValid: !conflict,
            conflictBlockId: conflict?.id ?? null,
          };
          gestureRef.current = drafted;
          return drafted;
        }

        let next: GestureState;

        if (prev.origin.kind === 'edge') {
          // Always resolve against the ORIGIN bounds, never the live preview, so a resize
          // tracks the pointer absolutely instead of accumulating drift each frame.
          const resized = resizeBlockBound(
            { startTime: prev.origin.startTime, endTime: prev.origin.endTime },
            prev.origin.edge!,
            update.minutes,
          );

          if (!resized) {
            // Below one interval or outside the day: hold the last valid preview, flag invalid.
            next = { ...prev, phase: 'resizing', isValid: false, conflictBlockId: null };
          } else {
            const conflict = detectSameStageOverlap(blocks, {
              id: prev.origin.blockId ?? undefined,
              stageZoneId: prev.origin.stageZoneId,
              dayDate,
              startTime: resized.startTime,
              endTime: resized.endTime,
            });
            next = {
              ...prev,
              phase: 'resizing',
              currentStageId: prev.origin.stageZoneId,
              currentStartTime: resized.startTime,
              currentEndTime: resized.endTime,
              isValid: !conflict,
              conflictBlockId: conflict?.id ?? null,
            };
          }
        } else {
          const duration =
            timeToMinutes(prev.origin.endTime) - timeToMinutes(prev.origin.startTime);
          const placed = placeBlockStart(update.minutes - prev.origin.grabOffsetMinutes, duration);
          const conflict = detectSameStageOverlap(blocks, {
            id: prev.origin.blockId ?? undefined,
            stageZoneId: update.stageZoneId,
            dayDate,
            startTime: placed.startTime,
            endTime: placed.endTime,
          });

          next = {
            ...prev,
            phase: 'moving',
            currentStageId: update.stageZoneId,
            currentStartTime: placed.startTime,
            currentEndTime: placed.endTime,
            isValid: !conflict,
            conflictBlockId: conflict?.id ?? null,
          };
        }

        gestureRef.current = next;
        return next;
      });
    },
    [blocks, dayDate],
  );

  const release = useCallback(() => {
    const prev = gestureRef.current;
    if (!prev) {
      return;
    }
    gestureRef.current = null;
    setGesture(null);

    if (prev.phase === 'pressing') {
      if (prev.origin.kind === 'block' && prev.origin.blockId) {
        onIntent({ kind: 'click', blockId: prev.origin.blockId });
      } else if (prev.origin.kind === 'slot') {
        const seed = buildCreateSeed(dayDate, prev.origin.stageZoneId, prev.origin.startTime);
        onIntent({ kind: 'create', ...seed });
      }
      return;
    }

    if (prev.phase === 'moving' && prev.origin.kind === 'block' && prev.origin.blockId) {
      const noop =
        prev.currentStageId === prev.origin.stageZoneId &&
        prev.currentStartTime === prev.origin.startTime;
      // The client-side conflict check only drives the live preview (research.md D3) — the
      // server remains the authority, so a candidate the client flags as conflicting is still
      // submitted and left to the server's same-stage overlap check to accept or refuse.
      if (!noop) {
        onIntent({
          kind: 'move',
          blockId: prev.origin.blockId,
          stageZoneId: prev.currentStageId,
          startTime: prev.currentStartTime,
          endTime: prev.currentEndTime,
        });
      }
      return;
    }

    // A swept-out span opens the create form pre-filled with exactly that span, rather than
    // the one-slot default a plain click produces.
    if (prev.phase === 'creating') {
      onIntent({
        kind: 'create',
        dayDate,
        stageZoneId: prev.currentStageId,
        startTime: prev.currentStartTime,
        endTime: prev.currentEndTime,
      });
      return;
    }

    if (prev.phase === 'resizing' && prev.origin.blockId) {
      const changed =
        prev.currentStartTime !== prev.origin.startTime ||
        prev.currentEndTime !== prev.origin.endTime;
      if (changed) {
        onIntent({
          kind: 'resize',
          blockId: prev.origin.blockId,
          startTime: prev.currentStartTime,
          endTime: prev.currentEndTime,
        });
      }
    }
  }, [dayDate, onIntent]);

  const cancel = useCallback(() => {
    gestureRef.current = null;
    setGesture(null);
  }, []);

  const isActive = gesture !== null;

  useEffect(() => {
    if (!isActive) {
      return;
    }
    const handlePointerUp = () => release();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        cancel();
      }
    };
    document.addEventListener('pointerup', handlePointerUp);
    document.addEventListener('pointercancel', handlePointerUp);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerup', handlePointerUp);
      document.removeEventListener('pointercancel', handlePointerUp);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isActive, release, cancel]);

  return { gesture, startPress, updatePointer, release, cancel };
}

/** Whether a press has travelled far enough to count as a drag rather than a click. */
function hasTravelled(gesture: GestureState, update: PointerUpdate): boolean {
  if (update.source === 'cell') {
    // Crossing into another cell is unambiguous travel for an edge drag. For a body drag,
    // re-entering the block's own origin row is not.
    if (gesture.origin.kind === 'edge') {
      return true;
    }
    return (
      update.stageZoneId !== gesture.origin.stageZoneId ||
      Math.abs(update.minutes - timeToMinutes(gesture.origin.startTime)) >= 1
    );
  }

  const dx = (update.clientX ?? 0) - gesture.origin.clientX;
  const dy = (update.clientY ?? 0) - gesture.origin.clientY;
  return Math.hypot(dx, dy) >= DRAG_THRESHOLD_PX;
}
