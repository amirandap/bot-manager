/* eslint-disable no-process-exit */
import express, { Response } from 'express';
import { spawn } from 'child_process';

const router = express.Router();

router.post('/', (req, res: Response) => {
  console.log('Restarting bot...');
  res.send({ message: 'Bot is restarting...' });
  setTimeout(function () {
    process.on('exit', function () {
      spawn(process.argv.shift() as string, process.argv, {
        cwd: process.cwd(),
        detached : true,
        stdio: 'inherit',
      });
    });
    process.exit();
  }, 5000);
});

export default router;