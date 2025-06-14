import { DEFAULT_FALLBACK_PHONE_NUMBER } from '../constants/numbers';
import express, { Request, Response } from 'express';

export let fallbackNumber = DEFAULT_FALLBACK_PHONE_NUMBER;

const router = express.Router();

router.post('/', (req: Request, res: Response) => {
  const { newFallbackNumber } = req.body as { newFallbackNumber: string };
  if (!newFallbackNumber || typeof newFallbackNumber !== 'string') {
    return res.status(400).send({ error: 'Invalid fallback number' });
  }
  fallbackNumber = newFallbackNumber;
  console.log(`Fallback number updated to ${fallbackNumber}`);
  res.send({ message: 'Fallback number updated successfully', fallbackNumber });
});

export default router;