import { GroupChat } from "whatsapp-web.js";

/**
 * Group utilities for WhatsApp bot
 * Contains functions for processing group information
 */

/**
 * Extract detailed information from a GroupChat object
 * @param group WhatsApp GroupChat object
 * @returns Formatted group details
 */
export function getGroupDetails(group: GroupChat) {
  return {
    id: group.id._serialized,
    name: group.name,
    participantCount: group.participants ? group.participants.length : 0,
    description: group.description || "",
    isReadOnly: group.isReadOnly || false,
    isMuted: group.isMuted || false,
    timestamp: group.timestamp || null,
    owner: group.owner ? group.owner._serialized : null,
    participants: group.participants
      ? group.participants.map((participant) => ({
          id: participant.id._serialized,
          isAdmin: participant.isAdmin || false,
          isSuperAdmin: participant.isSuperAdmin || false,
        }))
      : [],
  };
}

/**
 * Check if bot is admin in a group
 * @param group WhatsApp GroupChat object
 * @param botId Bot's WhatsApp ID
 * @returns boolean indicating if bot is admin
 */
export function isBotAdminInGroup(group: GroupChat, botId: string): boolean {
  if (!group.participants) return false;

  const botParticipant = group.participants.find(
    (participant) => participant.id._serialized === botId
  );

  return botParticipant ? botParticipant.isAdmin || false : false;
}

/**
 * Get group admins list
 * @param group WhatsApp GroupChat object
 * @returns Array of admin participant IDs
 */
export function getGroupAdmins(group: GroupChat): string[] {
  if (!group.participants) return [];

  return group.participants
    .filter((participant) => participant.isAdmin)
    .map((participant) => participant.id._serialized);
}
