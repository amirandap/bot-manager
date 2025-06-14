/* eslint-disable max-len */
import { Request, Response } from 'express';

import express from 'express';
import { sendMessage, fetchUserData, sendErrorMessage }
  from '../helpers/helpers';
import { cleanAndFormatPhoneNumber } from '../helpers/cleanAndFormatPhoneNumber';
import { client } from '../config/whatsAppClient';

const router = express.Router();

router.post('/', async (req: Request, res: Response) => {
  const { discorduserid, phoneNumber, message } = req.body as { discorduserid: string; phoneNumber: string; message: string };
  console.log('Payload recibido en /confirmation: ', req.body);

  let userData;
  let finalPhoneNumber = phoneNumber;
  let newMessage = message;

  if (discorduserid) {
    try {
      userData = await fetchUserData(discorduserid);
      if (userData) {
        const { celular, full_name } = userData;
        finalPhoneNumber = celular;
        const firstName = full_name.split(' ')[0]; // Extract the first name
        newMessage = `Saludos ${firstName}, como estas? ${message.replace(/-/g, ' ')}`;
      } else {
        console.error('Discord user ID not found: ', discorduserid);
        return res.status(404).send({ error: 'Discord user ID not found' });
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
      return res.status(500).send({ error: 'Error when fetching phone number' });
    }
  }

  if (!finalPhoneNumber) {
    return res.status(400).send({ error: 'Either discorduserid or phoneNumber is required' });
  }

  const { cleanedPhoneNumber, isValid } = cleanAndFormatPhoneNumber(finalPhoneNumber);

  try {
    await sendMessage(client, cleanedPhoneNumber, newMessage);
    return res.send({ message: 'Message sent successfully' });
  } catch (error: unknown) {
    console.error('Error sending the message:', error);
    let reason = 'Unknown reason';
    if (error instanceof Error) {
      reason = error?.message && error.message;
    }
    let errorMessage: string = `
Error en /confirmation

${userData ? userData.full_name : ''}
www.instagram.com/${userData ? userData.instagram : ''}
${finalPhoneNumber} | ${cleanedPhoneNumber}
${discorduserid}
Error: ${reason}
`;
    if (!isValid) {
      errorMessage += ` Mensaje no enviado a: ${userData ? userData.full_name : ''} con numero de telefono ${cleanedPhoneNumber}. Instagram: ${userData ? userData.instagram : ''}, Full Name: ${userData ? userData.full_name : ''}, Celular: ${finalPhoneNumber}`;
    }
    await sendErrorMessage(client, errorMessage);
    return res.status(500).send({ error: `Error sending message: ${reason}`, errorMessage });
  }
});

export default router;
