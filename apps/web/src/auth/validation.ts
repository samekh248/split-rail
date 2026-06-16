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
