import { getFallbackNumber, setFallbackNumber } from '../utils/fallbackUtils';
import express, { Request, Response } from 'express';

const router = express.Router();

router.post('/', (req: Request, res: Response) => {
  const { newFallbackNumber } = req.body as { newFallbackNumber: string };
  if (!newFallbackNumber || typeof newFallbackNumber !== 'string') {
    return res.status(400).send({ error: 'Invalid fallback number' });
  }
  
  // Basic validation for phone number format
  const cleaned = newFallbackNumber.replace(/[^\d+]/g, "");
  if (cleaned.length < 10 || cleaned.length > 15) {
    return res.status(400).send({ 
      error: 'Invalid phone number format',
      provided: newFallbackNumber,
      suggestion: 'Please provide a valid phone number with 10-15 digits'
    });
  }
  
  const previousNumber = getFallbackNumber();
  setFallbackNumber(newFallbackNumber);
  const newNumber = getFallbackNumber();
  
  console.log(`✅ Fallback number updated to ${newNumber}`);
  
  res.send({ 
    message: 'Fallback number updated successfully', 
    fallbackNumber: newNumber,
    previousNumber: previousNumber
  });
});

// GET endpoint to retrieve current fallback number
router.get('/', (req: Request, res: Response) => {
  const currentFallback = getFallbackNumber();
  res.send({ 
    fallbackNumber: currentFallback,
    source: 'runtime or environment'
  });
});

export default router;