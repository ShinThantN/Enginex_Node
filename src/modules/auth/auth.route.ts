import { Router } from 'express';
import {
  registerUser,
  loginUser,
  refresh,
  logoutUser,
} from './auth.controller.js';

const authRouter = Router();

authRouter.post('/register', registerUser);
authRouter.post('/login', loginUser);
authRouter.post('/refresh', refresh);
authRouter.post('/logout', logoutUser);

export default authRouter;
