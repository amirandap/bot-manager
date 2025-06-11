import { GroupChat } from 'whatsapp-web.js';

export async function getGroupDetails(group: GroupChat) {

  return {
    id: group.id._serialized,
    name: group.name,
    participants: group.participants.map(participant => ({
      id: participant.id._serialized,
      isAdmin: participant.isAdmin,
      isSuperAdmin: participant.isSuperAdmin,
    })),
  };
}