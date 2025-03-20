import express from 'express';
import { setBotsRoutes } from './routes/botsRoutes';
import { setStatusRoutes } from './routes/statusRoutes';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(cors());

setBotsRoutes(app);
setStatusRoutes(app);

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});