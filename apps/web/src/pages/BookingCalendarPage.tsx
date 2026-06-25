import { useMemo, useState } from 'react';
import { useCalendarPlacements } from '@/api/calendar';
import { useRegions } from '@/api/regions';
import { BookingCalendarControls } from '@/components/booking/BookingCalendarControls';
import { BookingCalendarMatrix } from '@/components/booking/BookingCalendarMatrix';
import { BookingCalendarMobileStream } from '@/components/booking/BookingCalendarMobileStream';
import { BookingDailyAgendaDrawer } from '@/components/booking/BookingDailyAgendaDrawer';
import { BookingEventDrawer } from '@/components/booking/BookingEventDrawer';
import { CreateBookingEventModal } from '@/components/booking/CreateBookingEventModal';
import { CreateHoldModal } from '@/components/booking/CreateHoldModal';
import { RegionManagementPanel } from '@/components/booking/RegionManagementPanel';
import { useActiveVenue } from '@/venue/useActiveVenue';
import {
  filterPlacementsByView,
  getCalendarDaysForMonth,
  getMonthBounds,
  groupPlacementsByDate,
  toDateKey,
  type BookingPlacement,
  type CalendarViewContext,
} from '@/lib/bookingCalendar';
import type { CalendarPlacementDto } from '@/types/generated-api';

function defaultMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function toBookingPlacement(dto: CalendarPlacementDto): BookingPlacement {
  return {
    eventId: dto.eventId ?? '',
    venueId: dto.venueId ?? '',
    venueName: dto.venueName ?? 'Unknown venue',
    regionId: dto.regionId ?? null,
    regionName: dto.regionName ?? null,
    title: dto.title ?? 'Untitled',
    eventDate: dto.eventDate ?? '',
    bookingPlacementStatus: (dto.bookingPlacementStatus ?? 'CONFIRMED') as BookingPlacement['bookingPlacementStatus'],
    doorsTime: dto.doorsTime ?? null,
    loadInTime: dto.loadInTime ?? null,
    curfewTime: dto.curfewTime ?? null,
    supportLineup: dto.supportLineup ?? null,
    workspaceAllowed: dto.workspaceAllowed ?? true,
  };
}

export function BookingCalendarPage() {
  const { venues } = useActiveVenue();
  const { data: regions = [] } = useRegions();
  const [context, setContext] = useState<CalendarViewContext>({
    viewMode: 'global',
    regionId: null,
    venueId: null,
    month: defaultMonth(),
    showCancelled: false,
  });
  const bounds = useMemo(() => getMonthBounds(context.month), [context.month]);
  const { data: placements = [], refetch } = useCalendarPlacements({
    from: bounds.from,
    to: bounds.to,
    includeCancelled: context.showCancelled,
  });

  const [agendaDate, setAgendaDate] = useState<string | null>(null);
  const [selectedPlacement, setSelectedPlacement] = useState<BookingPlacement | null>(null);
  const [createEventOpen, setCreateEventOpen] = useState(false);
  const [createHoldOpen, setCreateHoldOpen] = useState(false);
  const [regionsOpen, setRegionsOpen] = useState(false);
  const [quickAdd, setQuickAdd] = useState<{ venueId: string; date: string } | null>(null);

  const filtered = useMemo(
    () => filterPlacementsByView(placements.map(toBookingPlacement), context),
    [placements, context],
  );
  const placementsByDate = useMemo(
    () => groupPlacementsByDate(filtered),
    [filtered],
  );
  const days = useMemo(
    () => getCalendarDaysForMonth(context.month).map((date) => toDateKey(date)),
    [context.month],
  );

  const agendaPlacements = agendaDate ? placementsByDate[agendaDate] ?? [] : [];

  return (
    <div className="booking-calendar-page" data-testid="booking-calendar-page">
      <BookingCalendarControls
        context={context}
        regions={regions}
        venues={venues}
        onContextChange={setContext}
        onCreateEvent={() => {
          setQuickAdd(null);
          setCreateEventOpen(true);
        }}
        onCreateHold={() => {
          setQuickAdd(null);
          setCreateHoldOpen(true);
        }}
        onManageRegions={() => setRegionsOpen(true)}
      />

      <BookingCalendarMatrix
        month={context.month}
        placementsByDate={placementsByDate}
        onDateClick={setAgendaDate}
        onPlacementClick={setSelectedPlacement}
        onCellQuickAdd={(dateKey) => {
          setQuickAdd({ date: dateKey, venueId: venues[0]?.id ?? '' });
          setCreateEventOpen(true);
        }}
      />

      <BookingCalendarMobileStream
        days={days}
        placementsByDate={placementsByDate}
        onPlacementClick={setSelectedPlacement}
      />

      <BookingDailyAgendaDrawer
        open={Boolean(agendaDate)}
        dateKey={agendaDate}
        placements={agendaPlacements}
        onClose={() => setAgendaDate(null)}
        onPlacementClick={(placement) => {
          setAgendaDate(null);
          setSelectedPlacement(placement);
        }}
      />

      <BookingEventDrawer
        open={Boolean(selectedPlacement)}
        placement={selectedPlacement}
        onClose={() => setSelectedPlacement(null)}
        onUpdated={() => void refetch()}
      />

      <CreateBookingEventModal
        open={createEventOpen}
        venues={venues}
        defaultVenueId={quickAdd?.venueId}
        defaultDate={quickAdd?.date}
        onClose={() => setCreateEventOpen(false)}
        onCreated={() => void refetch()}
      />

      <CreateHoldModal
        open={createHoldOpen}
        venues={venues}
        defaultVenueId={quickAdd?.venueId}
        defaultDate={quickAdd?.date}
        onClose={() => setCreateHoldOpen(false)}
        onCreated={() => void refetch()}
      />

      <RegionManagementPanel open={regionsOpen} onClose={() => setRegionsOpen(false)} />
    </div>
  );
}
