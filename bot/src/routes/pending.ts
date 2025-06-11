/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable max-len */
import { client } from '@src/config/whatsAppClient';
import { User, fetchUserData, formatMessage, sendErrorMessage, sendMessage } from '@src/helpers/helpers';
import express from 'express';

const router = express.Router();

router.post('/', async (req, res) => {
  const { discorduserid, message }: { discorduserid: string; message: string } = req.body;
  console.log('Payload recibido en /pending: ', req.body);
  try {

    if(!discorduserid || !message) {
      return res.status(400).send({ error: 'Missing parameters' });
    }

    const userData: User = await fetchUserData(discorduserid);

    if(userData){
      const { cleanedPhoneNumber, formattedMessage } = formatMessage(message, userData);

      const result = await sendMessage(client, cleanedPhoneNumber, formattedMessage);

      return res.status(200).send(result);
    }

    // eslint-disable-next-line no-console
    console.error('Discord user ID not found:', discorduserid);
    res.status(404).send({ error: 'Discord user ID not found' });
  } catch (error) {
    console.error('Error sending the message:', error);
    let reason = 'Unknown reason';
    if (error instanceof Error) {
      reason = error?.message && error.message;
    }
    const errorMessage: string = `
Error en /pending

Discord user ID: ${discorduserid}
Error: ${reason}
`;
    await sendErrorMessage(client, errorMessage);
    return res.status(500).send({ error: `Error sending message: ${reason}`, errorMessage });
  }

});

export default router;
