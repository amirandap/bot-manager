/* eslint-disable max-len */
import { client } from '@src/config/whatsAppClient';
import { cleanAndFormatPhoneNumber } from '@src/helpers/cleanAndFormatPhoneNumber';
import { sendErrorMessage, sendImageAndMessage } from '@src/helpers/helpers';
import { Participant } from '@src/types/types';
import express from 'express';

const router = express.Router();

router.post('/', async (req, res) => {
  const { participant } = req.body as { participant: Participant };
  console.log('Payload recibido en /followup: ', req.body);
  try {

    if(!participant) {
      return res.status(400).send({ error: 'Missing parameters' });
    }
    const { phone, image, rank, name } = participant;

    if( typeof phone !== 'string' || !image || !rank || !name ) {
      return res.status(400).send({ error: 'Missing parameters' });
    }

    const { cleanedPhoneNumber } = cleanAndFormatPhoneNumber(phone);

    const text = `Saludos ${name}, felicidades en tu P${rank}, sube tu historia a Instagram y recuerda etiquetar a @gpesportsrd y @entrandoapits. ¡Buena suerte en tu próxima carrera!`;
        
    await sendImageAndMessage(client, `${cleanedPhoneNumber.replace(/\+/g, '')}@c.us`, image, `image_${name}`, text);
    return res.status(200).send({ message: 'Message sent successfully' });
  } catch (error) {
    console.error('Error sending the message:', error);
    let reason = 'Unknown reason';
    if (error instanceof Error) {
      reason = error?.message && error.message;
    }
    const errorMessage: string = `
Error en /followup

Payload: ${JSON.stringify(req.body)}
Error: ${reason}
`;
    await sendErrorMessage(client, errorMessage);
    return res.status(500).send({ error: `Error sending message: ${reason}`, errorMessage });
  }
});

export default router;
