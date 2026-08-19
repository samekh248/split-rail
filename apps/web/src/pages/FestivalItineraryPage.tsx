import { useEffect, useMemo, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft, faCalendarDays, faPlus } from '@fortawesome/free-solid-svg-icons';
import {
  useBlockHistory,
  useItinerary,
  usePinProgrammingBlock,
  usePublicItinerary,
  useSetBlockBookingStatus,
  useSetBlockStatus,
  useSetPublishVisibility,
  useUnpinProgrammingBlock,
  useUpdateBlock,
} from '@/api/festivals';
import { useEvents } from '@/api/events';
import { usePinEvent, useUnpinEvent } from '@/api/dashboard';
import { PinToggleButton } from '@/components/PinToggleButton';
import { BlockEditorDrawer } from '@/components/festival/BlockEditorDrawer';
import { ConflictDialog } from '@/components/festival/ConflictDialog';
import type { BlockConflictInfo } from '@/components/festival/conflictTypes';
import {
  applyItineraryFilters,
  DEFAULT_ITINERARY_FILTERS,
  filterStagesByItineraryFilter,
  ItineraryFilters,
} from '@/components/festival/ItineraryFilters';
import { ScheduleHistoryPanel } from '@/components/festival/ScheduleHistoryPanel';
import {
  TimelineGrid,
  type BlockPlacementChange,
  type SlotCreateSeed,
} from '@/components/festival/TimelineGrid';
import { ViewToggle } from '@/components/festival/ViewToggle';
import { buildEventWorkspacePath } from '@/lib/appRoute';
import { navigateToEventWorkspace } from '@/lib/eventWorkspaceRoute';
import type { FestivalBookingStatus } from '@/lib/festivalBookingStatus';
import {
  readItineraryViewMode,
  writeItineraryViewMode,
  type ItineraryViewMode,
} from '@/lib/itineraryViewStorage';
import type { ProgrammingBlockResponse, PublicProgrammingBlockResponse } from '@/types/generated-api';

export interface FestivalItineraryPageProps {
  venueId: string;
  eventId: string;
  canManage?: boolean;
  canPublish?: boolean;
}

interface ConflictState {
  block: ProgrammingBlockResponse;
  conflict: BlockConflictInfo;
}

export function FestivalItineraryPage({
  venueId,
  eventId,
  canManage = true,
  canPublish = false,
}: FestivalItineraryPageProps) {
  const [viewMode, setViewMode] = useState<ItineraryViewMode>(() => readItineraryViewMode());
  const [selectedDay, setSelectedDay] = useState<string>('');
  const [filters, setFilters] = useState(DEFAULT_ITINERARY_FILTERS);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingBlock, setEditingBlock] = useState<ProgrammingBlockResponse | null>(null);
  const [historyBlockId, setHistoryBlockId] = useState<string | undefined>();
  const [conflictState, setConflictState] = useState<ConflictState | null>(null);
  const [editorSeed, setEditorSeed] = useState<{
    dayDate?: string;
    stageZoneId?: string;
    startTime?: string;
    endTime?: string;
  }>({});

  const itineraryQuery = useItinerary(venueId, eventId, {}, viewMode === 'internal');
  const publicItineraryQuery = usePublicItinerary(venueId, eventId, {}, viewMode === 'public');
  const eventsQuery = useEvents(venueId);
  const pinEvent = usePinEvent();
  const unpinEvent = useUnpinEvent();
  const pinBlock = usePinProgrammingBlock();
  const unpinBlock = useUnpinProgrammingBlock();
  const updateBlock = useUpdateBlock(venueId, eventId);
  const setBlockStatus = useSetBlockStatus(venueId, eventId);
  const setBlockBookingStatus = useSetBlockBookingStatus(venueId, eventId);
  const setPublishVisibility = useSetPublishVisibility(venueId, eventId);
  const historyQuery = useBlockHistory(venueId, eventId, historyBlockId, Boolean(historyBlockId));

  useEffect(() => {
    writeItineraryViewMode(viewMode);
  }, [viewMode]);

  const activeQuery = viewMode === 'public' ? publicItineraryQuery : itineraryQuery;
  const days = activeQuery.data?.days ?? [];
  const stages = activeQuery.data?.stages ?? [];
  const allBlocks = useMemo(() => {
    if (viewMode === 'public') {
      const publicBlocks = (publicItineraryQuery.data?.blocks ?? []) as PublicProgrammingBlockResponse[];
      return publicBlocks.map(
        (block): ProgrammingBlockResponse => ({
          id: block.id ?? '',
          title: block.title ?? '',
          dayDate: block.dayDate ?? '',
          stageZoneId: stages.find((stage) => stage.name === block.stageName)?.id ?? '',
          stageName: block.stageName ?? '',
          startTime: block.startTime ?? '',
          endTime: block.endTime ?? '',
          category: block.category ?? 'MUSIC',
          scheduleStatus: 'SCHEDULED',
        }),
      );
    }

    return itineraryQuery.data?.blocks ?? [];
  }, [itineraryQuery.data?.blocks, publicItineraryQuery.data?.blocks, stages, viewMode]);

  const activeDay = selectedDay || days[0]?.dayDate || '';
  const filteredBlocks = useMemo(
    () => applyItineraryFilters(allBlocks, filters),
    [allBlocks, filters],
  );
  const visibleStages = useMemo(
    () => filterStagesByItineraryFilter(stages, filters),
    [stages, filters],
  );

  const openCreateBlock = () => {
    setEditingBlock(null);
    setEditorSeed({
      dayDate: activeDay,
      stageZoneId: stages[0]?.id ?? '',
      startTime: '20:00',
      endTime: '21:00',
    });
    setEditorOpen(true);
  };

  const openEditBlock = (block: ProgrammingBlockResponse) => {
    setEditingBlock(block);
    setHistoryBlockId(block.id);
    setEditorSeed({});
    setEditorOpen(true);
  };

  const handleBlockPlacementChange = async (change: BlockPlacementChange) => {
    const block = allBlocks.find((item) => item.id === change.blockId);
    if (!block) {
      return;
    }

    await updateBlock.mutateAsync({
      blockId: change.blockId,
      title: block.title ?? '',
      dayDate: change.dayDate,
      stageZoneId: change.stageZoneId,
      startTime: change.startTime,
      endTime: change.endTime,
      category: block.category ?? 'MUSIC',
      requiresSettlement: block.requiresSettlement ?? false,
      description: block.description ?? null,
      loadInTime: block.loadInTime ?? null,
      soundcheckTime: block.soundcheckTime ?? null,
      festivalArtistId: block.festivalArtistId ?? null,
      newArtistName: null,
      isPubliclyVisible: block.isPubliclyVisible ?? false,
    });

    await itineraryQuery.refetch();
  };

  const handleSlotClick = (seed: SlotCreateSeed) => {
    setEditingBlock(null);
    setEditorSeed(seed);
    setEditorOpen(true);
  };

  const handleBookingStatusChange = async (
    block: ProgrammingBlockResponse,
    bookingStatus: FestivalBookingStatus,
  ) => {
    if (!block.id) {
      return;
    }

    await setBlockBookingStatus.mutateAsync({ blockId: block.id, bookingStatus });

    if (editingBlock?.id === block.id) {
      setEditingBlock({ ...editingBlock, bookingStatus });
    }

    await itineraryQuery.refetch();
  };

  const handleConflict = (conflict: BlockConflictInfo, block: ProgrammingBlockResponse) => {
    setConflictState({ block, conflict });
  };

  const festivalEvent = eventsQuery.data?.find((item) => item.eventId === eventId);
  const festivalPinned = festivalEvent?.isPinned === true;
  const dayCount = days.length;
  const blockCount = filteredBlocks.length;

  const handleFestivalPinToggle = () => {
    const mutation = festivalPinned ? unpinEvent : pinEvent;
    mutation.mutate({ venueId, eventId });
  };

  const handleBlockPinToggle = (block: ProgrammingBlockResponse) => {
    if (!block.id) {
      return;
    }
    const mutation = block.isPinned === true ? unpinBlock : pinBlock;
    mutation.mutate({ venueId, eventId, blockId: block.id });
  };

  const handleCancelOrMoveConflicting = async (conflictingBlockId: string) => {
    setConflictState(null);
    await setBlockStatus.mutateAsync({
      blockId: conflictingBlockId,
      status: 'CANCELED',
      reason: 'Canceled to resolve schedule conflict',
    });
    await itineraryQuery.refetch();
  };

  return (
    <div className="festival-itinerary-page" data-testid="festival-itinerary-page">
      <header className="festival-itinerary-page__hero">
        <button
          type="button"
          className="btn-secondary btn-icon-label festival-itinerary-page__back"
          onClick={() => navigateToEventWorkspace(venueId, eventId)}
        >
          <FontAwesomeIcon icon={faArrowLeft} aria-hidden="true" />
          Back to event
        </button>

        <div className="festival-itinerary-page__hero-main section-header">
          <div className="festival-itinerary-page__intro">
            <h1 className="festival-itinerary-page__title">
              <FontAwesomeIcon icon={faCalendarDays} aria-hidden="true" />
              Festival itinerary
            </h1>
            <p className="festival-itinerary-page__subtitle">
              {festivalEvent?.title ?? 'Festival schedule'}
              {dayCount > 0
                ? ` · ${dayCount} ${dayCount === 1 ? 'day' : 'days'} · ${blockCount} ${blockCount === 1 ? 'block' : 'blocks'}`
                : ''}
            </p>
          </div>
          <div className="section-header__actions">
            <PinToggleButton
              pinned={festivalPinned}
              pinnedLabel="Unpin festival"
              unpinnedLabel="Pin festival"
              testId={`festival-itinerary-pin-${eventId}`}
              showLabel
              className="btn-secondary"
              onToggle={handleFestivalPinToggle}
            />
            {canManage ? (
              <button
                type="button"
                className="btn-primary--compact btn-icon-label"
                data-testid="itinerary-add-block"
                onClick={openCreateBlock}
              >
                <FontAwesomeIcon icon={faPlus} aria-hidden="true" />
                Add block
              </button>
            ) : null}
          </div>
        </div>
      </header>

      <section className="festival-itinerary-page__toolbar">
        <ViewToggle
          mode={viewMode}
          onChange={setViewMode}
          canPublish={canPublish}
          hasSelectedBlock={Boolean(editingBlock)}
          selectedBlockIsPublic={editingBlock?.isPubliclyVisible ?? false}
          publishPending={setPublishVisibility.isPending}
          onPublishToggle={async (isPublic) => {
            if (!editingBlock?.id) {
              return;
            }
            await setPublishVisibility.mutateAsync({
              blockIds: [editingBlock.id],
              isPubliclyVisible: isPublic,
            });
            setEditingBlock({ ...editingBlock, isPubliclyVisible: isPublic });
            await activeQuery.refetch();
          }}
        />

        <ItineraryFilters stages={stages} values={filters} onChange={setFilters} />
      </section>

      <section className="festival-itinerary-page__timeline">
        {activeQuery.isLoading ? (
          <p className="festival-itinerary-page__loading" role="status">
            Loading itinerary…
          </p>
        ) : activeQuery.isError ? (
          <p className="festival-itinerary-page__error" role="alert">
            Unable to load the festival itinerary.
          </p>
        ) : (
          <TimelineGrid
            venueId={venueId}
            eventId={eventId}
            days={days}
            stages={visibleStages}
            blocks={filteredBlocks}
            selectedDay={activeDay}
            onDayChange={setSelectedDay}
            onBlockClick={openEditBlock}
            onSlotClick={handleSlotClick}
            onBlockPlacementChange={handleBlockPlacementChange}
            onConflict={handleConflict}
            onBookingStatusChange={handleBookingStatusChange}
            onPinToggle={viewMode === 'internal' ? handleBlockPinToggle : undefined}
            canManage={canManage && viewMode === 'internal'}
          />
        )}
      </section>

      {historyBlockId ? (
        <section className="festival-itinerary-page__history">
          <ScheduleHistoryPanel entries={historyQuery.data ?? []} loading={historyQuery.isLoading} />
        </section>
      ) : null}

      <BlockEditorDrawer
        venueId={venueId}
        eventId={eventId}
        open={editorOpen}
        onClose={() => {
          setEditorOpen(false);
          setEditingBlock(null);
          setHistoryBlockId(undefined);
        }}
        days={days}
        stages={stages}
        block={editingBlock}
        canPublish={canPublish}
        onPublishVisibilityChange={async (isPublic) => {
          if (!editingBlock?.id) {
            return;
          }
          await setPublishVisibility.mutateAsync({
            blockIds: [editingBlock.id],
            isPubliclyVisible: isPublic,
          });
          setEditingBlock({ ...editingBlock, isPubliclyVisible: isPublic });
          await activeQuery.refetch();
        }}
        initialDayDate={editorSeed.dayDate}
        initialStageZoneId={editorSeed.stageZoneId}
        initialStartTime={editorSeed.startTime}
        initialEndTime={editorSeed.endTime}
        onSaved={() => {
          void itineraryQuery.refetch();
        }}
      />

      <ConflictDialog
        open={Boolean(conflictState)}
        attemptedBlock={conflictState?.block ?? {}}
        conflict={
          conflictState?.conflict ?? {
            conflictingBlockTitle: '',
            message: '',
          }
        }
        onClose={() => setConflictState(null)}
        onReschedule={() => {
          if (!conflictState) {
            return;
          }
          setConflictState(null);
          openEditBlock(conflictState.block);
        }}
        onEditExisting={(conflictingBlockId) => {
          setConflictState(null);
          const conflicting = allBlocks.find((block) => block.id === conflictingBlockId);
          if (conflicting) {
            openEditBlock(conflicting);
          }
        }}
        onCancelOrMove={handleCancelOrMoveConflicting}
      />
    </div>
  );
}

export function festivalItineraryDocumentTitle(venueId: string, eventId: string): string {
  return `Itinerary · ${buildEventWorkspacePath(venueId, eventId)}`;
}
