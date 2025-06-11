import express, { Request, Response } from 'express';

export let port = process.env.PORT ? parseInt(process.env.PORT, 10) : 7260;

const router = express.Router();

router.post('/', (req: Request, res: Response) => {
  const { newPort } = req.body as { newPort: number };
  if (!newPort || isNaN(newPort)) {
    return res.status(400).send({ error: 'Invalid port number' });
  }
  console.log(`Changing server port to ${newPort}...`);
  res.send({ message: `Server port will change to ${newPort}. Restarting...` });
  port = newPort;
  throw new Error ('Restarting server...');
});

export default router;