/**
 * User Data Service
 * Handles fetching user data from external APIs
 */

import { URL } from '../config/URL';
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
