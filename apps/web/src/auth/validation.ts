const EMAIL_REGEX = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export function validateEmail(email: string): string | undefined {
  if (!email.trim()) {
    return 'Email is required.';
  }
  if (email.length > 255) {
    return 'Enter a valid email address.';
  }
  if (!EMAIL_REGEX.test(email)) {
    return 'Enter a valid email address.';
  }
  return undefined;
}

export function validatePassword(password: string): string | undefined {
  if (!password || password.length < 8) {
    return 'Password must be at least 8 characters.';
  }
  if (!/[A-Z]/.test(password)) {
    return 'Password must contain an uppercase letter.';
  }
  if (!/[a-z]/.test(password)) {
    return 'Password must contain a lowercase letter.';
  }
  if (!/\d/.test(password)) {
    return 'Password must contain a digit.';
  }
  return undefined;
}

export function validateOrganizationName(name: string): string | undefined {
  if (!name.trim()) {
    return 'Organization name is required.';
  }
  return undefined;
}

/** Matches backend NameValidation.MaxLength for venues. */
export const VENUE_NAME_MAX_LENGTH = 200;

export function validateVenueName(name: string): string | undefined {
  if (!name.trim()) {
    return 'Venue name is required.';
  }
  if (name.trim().length > VENUE_NAME_MAX_LENGTH) {
    return `Venue name must be ${VENUE_NAME_MAX_LENGTH} characters or fewer.`;
  }
  return undefined;
}

export const EVENT_TITLE_MAX_LENGTH = 200;

export interface EventFormValues {
  title: string;
  eventDate: string;
  qboTagName: string;
}

export function validateEventForm(values: EventFormValues): Partial<Record<keyof EventFormValues, string>> {
  const errors: Partial<Record<keyof EventFormValues, string>> = {};
  if (!values.title.trim()) {
    errors.title = 'Event title is required.';
  } else if (values.title.trim().length > EVENT_TITLE_MAX_LENGTH) {
    errors.title = `Event title must be ${EVENT_TITLE_MAX_LENGTH} characters or fewer.`;
  }
  if (!values.eventDate.trim()) {
    errors.eventDate = 'Event date is required.';
  } else if (Number.isNaN(Date.parse(values.eventDate))) {
    errors.eventDate = 'Enter a valid event date.';
  }
  return errors;
}
