import { Router } from 'express';
import {
  registerUser,
  loginUser,
  refresh,
  logoutUser,
  getAllUser,
  getUserById,
  updateUser,
  deleteUser,
} from './auth.controller.ts';

const authRouter = Router();

authRouter.post('/register', registerUser);
authRouter.post('/login', loginUser);
authRouter.post('/refresh', refresh);
authRouter.post('/logout', logoutUser);

authRouter.get('/users', getAllUser);
authRouter.get('/users/:id', getUserById);
authRouter.put('/users/:id', updateUser);
authRouter.delete('/users/:id', deleteUser);

export default authRouter;