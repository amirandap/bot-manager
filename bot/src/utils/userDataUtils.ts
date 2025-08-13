import { User } from '../types';

/**
 * Pure utility functions for user data validation and formatting
 */

/**
 * Validate user data completeness
 * @param user User object to validate
 * @returns Validation result with missing fields
 */
export function validateUserData(user: User): {
  isValid: boolean;
  missingFields: string[];
  warnings: string[];
} {
  const missingFields: string[] = [];
  const warnings: string[] = [];

  // Required fields
  if (!user.full_name) missingFields.push('full_name');
  if (!user.user_discord_id) missingFields.push('user_discord_id');
  if (!user.celular) missingFields.push('celular');

  // Optional but recommended fields
  if (!user.username) warnings.push('username missing');
  if (!user.email) warnings.push('email missing');
  if (!user.instagram) warnings.push('instagram missing');

  return {
    isValid: missingFields.length === 0,
    missingFields,
    warnings,
  };
}

/**
 * Extract user's first name from full name
 * @param fullName Complete name string
 * @returns First name only
 */
export function extractFirstName(fullName: string): string {
  if (!fullName || typeof fullName !== 'string') {
    return 'Usuario';
  }

  const firstName = fullName.trim().split(' ')[0];
  return firstName || 'Usuario';
}

/**
 * Get display name for user (prefers nickname, falls back to first name)
 * @param user User object
 * @returns Best available display name
 */
export function getDisplayName(user: User): string {
  if (user.nickname && user.nickname.trim()) {
    return user.nickname.trim();
  }

  if (user.full_name) {
    return extractFirstName(user.full_name);
  }

  if (user.username) {
    return user.username;
  }

  return 'Usuario';
}
