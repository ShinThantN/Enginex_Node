import { Router } from 'express';
import {
  registerUser,
  loginUser,
  refresh,
  logoutUser,
  verifyEmail,
  resendOtp,
} from './auth.controller.js';

const authRouter = Router();

authRouter.post('/register', registerUser);
authRouter.post('/login', loginUser);
authRouter.post('/verify-email', verifyEmail);
authRouter.post('/resend-otp', resendOtp);
authRouter.post('/refresh', refresh);
authRouter.post('/logout', logoutUser);

export default authRouter;
