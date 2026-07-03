
import express from 'express';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import authRouter from './modules/auth/auth.route.js';
import { env } from './config/env.js';

dotenv.config();

const app = express();

app.use(express.json());
app.use(cookieParser());

// Auth Module Route ချိတ်ဆက်ခြင်း
app.use('/api/auth', authRouter);

// Global Error Handler (asyncHandler မှ တက်လာမည့် error များ ဖမ်းရန်)
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
  });
});

const PORT = env.PORT;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});