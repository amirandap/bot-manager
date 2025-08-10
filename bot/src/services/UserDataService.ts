/**
 * User Data Service
 * Handles fetching user data from external APIs
 */

import { URL } from '../constants/URL';
import { User } from '../types';

/**
 * Fetch user data by Discord user ID
 * @param discorduserid Discord user ID to fetch
 * @returns User data or throws error if not found
 */
export async function fetchUserData(discorduserid: string): Promise<User> {
  try {
    const response = await fetch(
      `${URL}/consultaUser/private?user_discord_id=${discorduserid}`,
      {
        method: 'GET',
        headers: { accept: 'application/json' },
      },
    );

    const users = (await response.json()) as User[];

    if (response.status === 200 && users.length > 0) {
      return users[0];
    }

    throw new Error(`User not found for Discord ID: ${discorduserid}`);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Error fetching user data: ${message}`);
  }
}

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
