/** v1 targets events of 3 days or fewer; the server enforces this too. */
export const MAX_FESTIVAL_DAYS = 3;

export function countFestivalDays(startDate: string, endDate: string): number | null {
  const start = Date.parse(`${startDate}T00:00:00`);
  const end = Date.parse(`${endDate}T00:00:00`);
  if (Number.isNaN(start) || Number.isNaN(end)) {
    return null;
  }
  return Math.round((end - start) / 86_400_000) + 1;
}

export function validateFestivalRange(startDate: string, endDate: string): string | undefined {
  if (!startDate) {
    return 'Start date is required.';
  }
  if (!endDate) {
    return 'End date is required.';
  }
  const days = countFestivalDays(startDate, endDate);
  if (days === null) {
    return 'Enter valid dates.';
  }
  if (days < 1) {
    return 'End date cannot be before the start date.';
  }
  if (days > MAX_FESTIVAL_DAYS) {
    return `This release supports festivals of ${MAX_FESTIVAL_DAYS} days or fewer. That range covers ${days} days.`;
  }
  return undefined;
}
