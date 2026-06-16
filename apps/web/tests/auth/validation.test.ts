import { describe, expect, it } from 'vitest';
import {
  validateEmail,
  validateOrganizationName,
  validatePassword,
} from '@/auth/validation';

describe('validation', () => {
  describe('validateEmail', () => {
    it('rejects empty email', () => {
      expect(validateEmail('')).toBe('Email is required.');
    });

    it('rejects malformed email', () => {
      expect(validateEmail('not-an-email')).toBe('Enter a valid email address.');
    });

    it('accepts valid email', () => {
      expect(validateEmail('user@example.com')).toBeUndefined();
    });

    it('rejects an over-length email (>255 chars)', () => {
      const longLocal = 'a'.repeat(250);
      const overLong = `${longLocal}@ex.com`;
      expect(overLong.length).toBeGreaterThan(255);
      expect(validateEmail(overLong)).toBe('Enter a valid email address.');
    });

    it('rejects an email that is only whitespace', () => {
      expect(validateEmail('   ')).toBe('Email is required.');
    });
  });

  describe('validatePassword', () => {
    it('rejects short password', () => {
      expect(validatePassword('Ab1')).toBe('Password must be at least 8 characters.');
    });

    it('requires uppercase', () => {
      expect(validatePassword('password1')).toBe(
        'Password must contain an uppercase letter.',
      );
    });

    it('requires lowercase', () => {
      expect(validatePassword('PASSWORD1')).toBe(
        'Password must contain a lowercase letter.',
      );
    });

    it('requires digit', () => {
      expect(validatePassword('Password')).toBe('Password must contain a digit.');
    });

    it('accepts valid password', () => {
      expect(validatePassword('Password1')).toBeUndefined();
    });
  });

  describe('validateOrganizationName', () => {
    it('rejects empty name', () => {
      expect(validateOrganizationName('   ')).toBe('Organization name is required.');
    });

    it('accepts non-empty name', () => {
      expect(validateOrganizationName('Acme Venues')).toBeUndefined();
    });
  });
});
