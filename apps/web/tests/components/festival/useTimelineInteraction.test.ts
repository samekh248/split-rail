import { act, renderHook } from '@testing-library/react';
import { fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useTimelineInteraction } from '@/components/festival/useTimelineInteraction';
import type { ProgrammingBlockResponse } from '@/types/generated-api';

const blocks: ProgrammingBlockResponse[] = [
  {
    id: 'block-1',
    title: 'Opening Act',
    dayDate: '2026-08-14',
    stageZoneId: 'stage-1',
    startTime: '14:00',
    endTime: '15:00',
    scheduleStatus: 'SCHEDULED',
  },
  {
    id: 'block-2',
    title: 'Headliner',
    dayDate: '2026-08-14',
    stageZoneId: 'stage-2',
    startTime: '16:00',
    endTime: '17:00',
    scheduleStatus: 'SCHEDULED',
  },
];

/** Minutes-since-midnight for a HH:mm label, matching what the grid resolves from coordinates. */
function mins(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

function setup(overrides: { canManage?: boolean; blocks?: ProgrammingBlockResponse[] } = {}) {
  const onIntent = vi.fn();
  const { result } = renderHook(() =>
    useTimelineInteraction({
      dayDate: '2026-08-14',
      blocks: overrides.blocks ?? blocks,
      canManage: overrides.canManage ?? true,
      onIntent,
    }),
  );
  return { result, onIntent };
}

describe('useTimelineInteraction', () => {
  it('starts idle and does nothing when canManage is false', () => {
    const { result, onIntent } = setup({ canManage: false });

    act(() => {
      result.current.startPress({
        kind: 'block',
        blockId: 'block-1',
        stageZoneId: 'stage-1',
        startTime: '14:00',
        endTime: '15:00',
      });
    });

    expect(result.current.gesture).toBeNull();

    act(() => result.current.release());
    expect(onIntent).not.toHaveBeenCalled();
  });

  it('pressing a block body then releasing with no movement emits a click', () => {
    const { result, onIntent } = setup();

    act(() => {
      result.current.startPress({
        kind: 'block',
        blockId: 'block-1',
        stageZoneId: 'stage-1',
        startTime: '14:00',
        endTime: '15:00',
      });
    });
    expect(result.current.gesture?.phase).toBe('pressing');

    act(() => result.current.release());

    expect(onIntent).toHaveBeenCalledWith({ kind: 'click', blockId: 'block-1' });
    expect(result.current.gesture).toBeNull();
  });

  it('pressing an empty slot then releasing with no movement emits a create seed', () => {
    const { result, onIntent } = setup();

    act(() => {
      result.current.startPress({ kind: 'slot', stageZoneId: 'stage-1', startTime: '18:00' });
    });
    act(() => result.current.release());

    expect(onIntent).toHaveBeenCalledWith({
      kind: 'create',
      dayDate: '2026-08-14',
      stageZoneId: 'stage-1',
      startTime: '18:00',
      endTime: '18:30',
    });
  });

  it('entering a different slot after pressing a block body transitions to moving', () => {
    const { result } = setup();

    act(() => {
      result.current.startPress({
        kind: 'block',
        blockId: 'block-1',
        stageZoneId: 'stage-1',
        startTime: '14:00',
        endTime: '15:00',
      });
    });
    act(() => result.current.updatePointer({ stageZoneId: 'stage-1', minutes: mins('16:00'), source: 'cell' }));

    expect(result.current.gesture?.phase).toBe('moving');
    expect(result.current.gesture?.currentStartTime).toBe('16:00');
    expect(result.current.gesture?.currentEndTime).toBe('17:00');
  });

  it('re-entering the origin slot while pressing stays in pressing (no premature drag)', () => {
    const { result } = setup();

    act(() => {
      result.current.startPress({
        kind: 'block',
        blockId: 'block-1',
        stageZoneId: 'stage-1',
        startTime: '14:00',
        endTime: '15:00',
      });
    });
    act(() => result.current.updatePointer({ stageZoneId: 'stage-1', minutes: mins('14:00'), source: 'cell' }));

    expect(result.current.gesture?.phase).toBe('pressing');
  });

  it('moving to a same-stage, same-start no-op target and releasing emits nothing', () => {
    const { result, onIntent } = setup();

    act(() => {
      result.current.startPress({
        kind: 'block',
        blockId: 'block-1',
        stageZoneId: 'stage-1',
        startTime: '14:00',
        endTime: '15:00',
      });
    });
    act(() => result.current.updatePointer({ stageZoneId: 'stage-1', minutes: mins('16:00'), source: 'cell' }));
    act(() => result.current.updatePointer({ stageZoneId: 'stage-1', minutes: mins('14:00'), source: 'cell' }));
    act(() => result.current.release());

    expect(onIntent).not.toHaveBeenCalled();
  });

  it('moving a block to a valid empty target on another stage emits move on release', () => {
    const { result, onIntent } = setup();

    act(() => {
      result.current.startPress({
        kind: 'block',
        blockId: 'block-1',
        stageZoneId: 'stage-1',
        startTime: '14:00',
        endTime: '15:00',
      });
    });
    act(() => result.current.updatePointer({ stageZoneId: 'stage-2', minutes: mins('10:00'), source: 'cell' }));
    act(() => result.current.release());

    expect(onIntent).toHaveBeenCalledWith({
      kind: 'move',
      blockId: 'block-1',
      stageZoneId: 'stage-2',
      startTime: '10:00',
      endTime: '11:00',
    });
  });

  it('moving onto a same-stage conflicting block marks the preview invalid but still emits on release (server is the gate)', () => {
    const { result, onIntent } = setup();

    act(() => {
      result.current.startPress({
        kind: 'block',
        blockId: 'block-1',
        stageZoneId: 'stage-1',
        startTime: '14:00',
        endTime: '15:00',
      });
    });
    act(() => result.current.updatePointer({ stageZoneId: 'stage-2', minutes: mins('16:30'), source: 'cell' }));

    expect(result.current.gesture?.isValid).toBe(false);
    expect(result.current.gesture?.conflictBlockId).toBe('block-2');

    act(() => result.current.release());
    expect(onIntent).toHaveBeenCalledWith({
      kind: 'move',
      blockId: 'block-1',
      stageZoneId: 'stage-2',
      startTime: '16:30',
      endTime: '17:30',
    });
  });

  it('does not flag overlapping clock times on a different stage as invalid', () => {
    const { result } = setup();

    act(() => {
      result.current.startPress({
        kind: 'block',
        blockId: 'block-1',
        stageZoneId: 'stage-1',
        startTime: '14:00',
        endTime: '15:00',
      });
    });
    // block-2 occupies stage-2 16:00-17:00; moving block-1 onto stage-1 at the same clock
    // time as block-2 (different stage) must remain valid.
    act(() => result.current.updatePointer({ stageZoneId: 'stage-1', minutes: mins('16:00'), source: 'cell' }));

    expect(result.current.gesture?.isValid).toBe(true);
  });

  it('pressing an edge and entering a later slot resizes only that bound', () => {
    const { result, onIntent } = setup();

    act(() => {
      result.current.startPress({
        kind: 'edge',
        blockId: 'block-1',
        edge: 'end',
        stageZoneId: 'stage-1',
        startTime: '14:00',
        endTime: '15:00',
      });
    });
    act(() => result.current.updatePointer({ stageZoneId: 'stage-1', minutes: mins('15:30'), source: 'cell' }));
    expect(result.current.gesture?.phase).toBe('resizing');
    expect(result.current.gesture?.currentStartTime).toBe('14:00');
    expect(result.current.gesture?.currentEndTime).toBe('15:30');

    act(() => result.current.release());
    expect(onIntent).toHaveBeenCalledWith({
      kind: 'resize',
      blockId: 'block-1',
      startTime: '14:00',
      endTime: '15:30',
    });
  });

  it('resizing the start edge earlier updates only the start bound', () => {
    const { result, onIntent } = setup();

    act(() => {
      result.current.startPress({
        kind: 'edge',
        blockId: 'block-1',
        edge: 'start',
        stageZoneId: 'stage-1',
        startTime: '14:00',
        endTime: '15:00',
      });
    });
    act(() => result.current.updatePointer({ stageZoneId: 'stage-1', minutes: mins('13:30'), source: 'cell' }));
    act(() => result.current.release());

    expect(onIntent).toHaveBeenCalledWith({
      kind: 'resize',
      blockId: 'block-1',
      startTime: '13:30',
      endTime: '15:00',
    });
  });

  it('a resize below one interval is invalid and emits nothing on release', () => {
    const { result, onIntent } = setup();

    act(() => {
      result.current.startPress({
        kind: 'edge',
        blockId: 'block-1',
        edge: 'end',
        stageZoneId: 'stage-1',
        startTime: '14:00',
        endTime: '15:00',
      });
    });
    act(() => result.current.updatePointer({ stageZoneId: 'stage-1', minutes: mins('14:10'), source: 'cell' }));
    expect(result.current.gesture?.isValid).toBe(false);

    act(() => result.current.release());
    expect(onIntent).not.toHaveBeenCalled();
  });

  it('ignores stage crossings while resizing (same-stage only)', () => {
    const { result } = setup();

    act(() => {
      result.current.startPress({
        kind: 'edge',
        blockId: 'block-1',
        edge: 'end',
        stageZoneId: 'stage-1',
        startTime: '14:00',
        endTime: '15:00',
      });
    });
    act(() => result.current.updatePointer({ stageZoneId: 'stage-2', minutes: mins('18:00'), source: 'cell' }));

    expect(result.current.gesture?.currentStageId).toBe('stage-1');
  });

  it('cancel snaps back with no emission', () => {
    const { result, onIntent } = setup();

    act(() => {
      result.current.startPress({
        kind: 'block',
        blockId: 'block-1',
        stageZoneId: 'stage-1',
        startTime: '14:00',
        endTime: '15:00',
      });
    });
    act(() => result.current.updatePointer({ stageZoneId: 'stage-1', minutes: mins('16:00'), source: 'cell' }));
    act(() => result.current.cancel());

    expect(result.current.gesture).toBeNull();
    expect(onIntent).not.toHaveBeenCalled();
  });

  it('a real Escape keydown on document cancels the active gesture with no emission', () => {
    const { result, onIntent } = setup();

    act(() => {
      result.current.startPress({
        kind: 'block',
        blockId: 'block-1',
        stageZoneId: 'stage-1',
        startTime: '14:00',
        endTime: '15:00',
      });
    });
    act(() => result.current.updatePointer({ stageZoneId: 'stage-1', minutes: mins('16:00'), source: 'cell' }));
    expect(result.current.gesture?.phase).toBe('moving');

    act(() => {
      fireEvent.keyDown(document, { key: 'Escape' });
    });

    expect(result.current.gesture).toBeNull();
    expect(onIntent).not.toHaveBeenCalled();
  });

  it('a real pointerup on document releases the active gesture and emits the resulting intent', () => {
    const { result, onIntent } = setup();

    act(() => {
      result.current.startPress({ kind: 'slot', stageZoneId: 'stage-1', startTime: '18:00' });
    });
    act(() => {
      fireEvent.pointerUp(document);
    });

    expect(result.current.gesture).toBeNull();
    expect(onIntent).toHaveBeenCalledWith({
      kind: 'create',
      dayDate: '2026-08-14',
      stageZoneId: 'stage-1',
      startTime: '18:00',
      endTime: '18:30',
    });
  });

  describe('continuous pointer tracking', () => {
    function pressBlockOne(result: ReturnType<typeof setup>['result'], pointerMinutes?: number) {
      act(() => {
        result.current.startPress({
          kind: 'block',
          blockId: 'block-1',
          stageZoneId: 'stage-1',
          startTime: '14:00',
          endTime: '15:00',
          clientX: 100,
          clientY: 100,
          pointerMinutes,
        });
      });
    }

    it('treats sub-threshold pointer travel as a click, not a drag', () => {
      const { result, onIntent } = setup();
      pressBlockOne(result);

      // 3px of jitter — under DRAG_THRESHOLD_PX.
      act(() =>
        result.current.updatePointer({
          stageZoneId: 'stage-1',
          minutes: mins('16:00'),
          clientX: 102,
          clientY: 102,
        }),
      );

      expect(result.current.gesture?.phase).toBe('pressing');

      act(() => result.current.release());
      expect(onIntent).toHaveBeenCalledWith({ kind: 'click', blockId: 'block-1' });
    });

    it('starts dragging after a few pixels rather than a full cell of travel', () => {
      const { result } = setup();
      pressBlockOne(result);

      act(() =>
        result.current.updatePointer({
          stageZoneId: 'stage-1',
          minutes: mins('14:00') + 6,
          clientX: 100,
          clientY: 106,
        }),
      );

      expect(result.current.gesture?.phase).toBe('moving');
    });

    it('snaps continuous sub-cell minutes to the nearest interval', () => {
      const { result } = setup();
      pressBlockOne(result, mins('14:00'));

      // 14:38 under the cursor rounds to the 14:30 boundary, not down to the entered cell.
      act(() =>
        result.current.updatePointer({
          stageZoneId: 'stage-1',
          minutes: mins('14:38'),
          clientX: 100,
          clientY: 160,
        }),
      );

      expect(result.current.gesture?.currentStartTime).toBe('14:30');
      expect(result.current.gesture?.currentEndTime).toBe('15:30');
    });

    it('keeps the grab point under the cursor instead of snapping the block start to it', () => {
      const { result } = setup();
      // Grabbed 45 minutes into the block (at 14:45 on a 14:00–15:00 block).
      pressBlockOne(result, mins('14:45'));

      act(() =>
        result.current.updatePointer({
          stageZoneId: 'stage-1',
          minutes: mins('18:45'),
          clientX: 100,
          clientY: 400,
        }),
      );

      // The block shifts by the same 4 hours the pointer moved — its start does not jump to 18:45.
      expect(result.current.gesture?.currentStartTime).toBe('18:00');
      expect(result.current.gesture?.currentEndTime).toBe('19:00');
    });

    it('clamps a drag past the end of the day so the block stays inside the visible window', () => {
      const { result } = setup();
      pressBlockOne(result, mins('14:00'));

      act(() =>
        result.current.updatePointer({
          stageZoneId: 'stage-1',
          minutes: mins('23:50'),
          clientX: 100,
          clientY: 900,
        }),
      );

      expect(result.current.gesture?.currentStartTime).toBe('23:00');
      expect(result.current.gesture?.currentEndTime).toBe('24:00');
    });

    it('sweeps out a span when dragging down from an empty slot and creates it on release', () => {
      const { result, onIntent } = setup();

      act(() => {
        result.current.startPress({
          kind: 'slot',
          stageZoneId: 'stage-1',
          startTime: '18:00',
          clientX: 100,
          clientY: 100,
        });
      });
      act(() =>
        result.current.updatePointer({
          stageZoneId: 'stage-1',
          minutes: mins('20:00'),
          clientX: 100,
          clientY: 300,
        }),
      );

      expect(result.current.gesture?.phase).toBe('creating');
      expect(result.current.gesture?.currentStartTime).toBe('18:00');
      expect(result.current.gesture?.currentEndTime).toBe('20:00');

      act(() => result.current.release());
      expect(onIntent).toHaveBeenCalledWith({
        kind: 'create',
        dayDate: '2026-08-14',
        stageZoneId: 'stage-1',
        startTime: '18:00',
        endTime: '20:00',
      });
    });

    it('sweeps upward from the anchor slot when dragging above the press point', () => {
      const { result, onIntent } = setup();

      act(() => {
        result.current.startPress({
          kind: 'slot',
          stageZoneId: 'stage-1',
          startTime: '18:00',
          clientX: 100,
          clientY: 300,
        });
      });
      act(() =>
        result.current.updatePointer({
          stageZoneId: 'stage-1',
          minutes: mins('16:30'),
          clientX: 100,
          clientY: 100,
        }),
      );

      // The anchor slot stays covered, so the span never collapses below one interval.
      expect(result.current.gesture?.currentStartTime).toBe('16:30');
      expect(result.current.gesture?.currentEndTime).toBe('18:30');

      act(() => result.current.release());
      expect(onIntent).toHaveBeenCalledWith(
        expect.objectContaining({ kind: 'create', startTime: '16:30', endTime: '18:30' }),
      );
    });

    it('flags a swept span that collides with an existing block on the same stage', () => {
      const { result } = setup();

      act(() => {
        result.current.startPress({
          kind: 'slot',
          stageZoneId: 'stage-1',
          startTime: '13:00',
          clientX: 100,
          clientY: 100,
        });
      });
      // block-1 occupies stage-1 14:00–15:00.
      act(() =>
        result.current.updatePointer({
          stageZoneId: 'stage-1',
          minutes: mins('14:30'),
          clientX: 100,
          clientY: 200,
        }),
      );

      expect(result.current.gesture?.isValid).toBe(false);
      expect(result.current.gesture?.conflictBlockId).toBe('block-1');
    });

    it('abandons a swept span on cancel without opening the create form', () => {
      const { result, onIntent } = setup();

      act(() => {
        result.current.startPress({
          kind: 'slot',
          stageZoneId: 'stage-1',
          startTime: '18:00',
          clientX: 100,
          clientY: 100,
        });
      });
      act(() =>
        result.current.updatePointer({
          stageZoneId: 'stage-1',
          minutes: mins('20:00'),
          clientX: 100,
          clientY: 300,
        }),
      );
      act(() => result.current.cancel());

      expect(result.current.gesture).toBeNull();
      act(() => result.current.release());
      expect(onIntent).not.toHaveBeenCalled();
    });

    it('resolves a resize against the origin bounds so tracking does not drift across moves', () => {
      const { result, onIntent } = setup();

      act(() => {
        result.current.startPress({
          kind: 'edge',
          blockId: 'block-1',
          edge: 'end',
          stageZoneId: 'stage-1',
          startTime: '14:00',
          endTime: '15:00',
          clientX: 100,
          clientY: 100,
        });
      });

      // A stream of moves must land on the last pointer position, not accumulate.
      act(() =>
        result.current.updatePointer({ stageZoneId: 'stage-1', minutes: mins('16:00'), clientX: 100, clientY: 200 }),
      );
      act(() =>
        result.current.updatePointer({ stageZoneId: 'stage-1', minutes: mins('17:00'), clientX: 100, clientY: 300 }),
      );
      act(() =>
        result.current.updatePointer({ stageZoneId: 'stage-1', minutes: mins('15:30'), clientX: 100, clientY: 150 }),
      );
      act(() => result.current.release());

      expect(onIntent).toHaveBeenCalledWith({
        kind: 'resize',
        blockId: 'block-1',
        startTime: '14:00',
        endTime: '15:30',
      });
    });
  });

  it('pressing an edge and releasing with no movement emits nothing', () => {
    const { result, onIntent } = setup();

    act(() => {
      result.current.startPress({
        kind: 'edge',
        blockId: 'block-1',
        edge: 'end',
        stageZoneId: 'stage-1',
        startTime: '14:00',
        endTime: '15:00',
      });
    });
    act(() => result.current.release());

    expect(onIntent).not.toHaveBeenCalled();
  });
});
