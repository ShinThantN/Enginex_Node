
import express from 'express';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import routes from './routes/index.js';
import { env } from './config/env.js';

dotenv.config();

const app = express();

app.use(express.json());
app.use(cookieParser());

// Module routes
app.use('/api', routes);

app.get('/health', (_req, res) => {
  res.send('Api is healthy and running!');
});

// Global error handler
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  const status = err.statusCode || err.status || 500;
  res.status(status).json({
    success: false,
    status,
    message: err.message || 'Internal Server Error',
  });
});

const PORT = env.PORT;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
