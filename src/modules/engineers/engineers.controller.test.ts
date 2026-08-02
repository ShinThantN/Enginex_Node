import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { getEngineerProfile, updateEngineerProfile } from './engineers.controller.js';
import * as engineerService from './engineers.service.js';

type AsyncMock<T> = jest.Mock<(...args: unknown[]) => Promise<T>>;

class TestError extends Error {
  statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
  }
}

const app = express();
app.use(express.json());
app.use((req, _res, next) => {
  req.user = { id: 1, role: 'ENGINEER' };
  next();
});

app.get('/api/engineer/profile', getEngineerProfile);
app.patch('/api/engineer/profile', updateEngineerProfile);

jest.mock('./engineers.service.js', () => ({
  getEngineerProfileService: jest.fn(),
  updateEngineerProfileService: jest.fn(),
}));

describe('Engineer Controller Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/engineer/profile', () => {
    it('should return engineer profile data', async () => {
      const mockProfile = {
        id: 1,
        fullName: 'Engineer One',
        email: 'engineer@gmail.com',
        role: 'ENGINEER',
        engineerProfile: { bio: 'Civil engineer' },
      };

      (engineerService.getEngineerProfileService as unknown as AsyncMock<typeof mockProfile>).mockResolvedValue(mockProfile);

      const res = await request(app).get('/api/engineer/profile');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('Engineer Profile Displayed');
      expect(res.body.data).toEqual(mockProfile);
      expect(engineerService.getEngineerProfileService).toHaveBeenCalledWith(1);
    });

    it('should return service error status and message', async () => {
      (engineerService.getEngineerProfileService as unknown as AsyncMock<unknown>).mockRejectedValue(
        new TestError('Engineer profile is only available for ENGINEER users', 403)
      );

      const res = await request(app).get('/api/engineer/profile');

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Engineer profile is only available for ENGINEER users');
    });
  });

  describe('PATCH /api/engineer/profile', () => {
    it('should return 422 if validation fails', async () => {
      const res = await request(app)
        .patch('/api/engineer/profile')
        .send({ yearsOfExperience: -1 });

      expect(res.status).toBe(422);
      expect(res.body.message).toBe('Validation Failed');
    });

    it('should update engineer profile data', async () => {
      const mockProfile = {
        id: 1,
        fullName: 'Engineer One',
        email: 'engineer@gmail.com',
        role: 'ENGINEER',
        engineerProfile: { specialization: 'CIVIL', yearsOfExperience: 5 },
      };

      (engineerService.updateEngineerProfileService as unknown as AsyncMock<typeof mockProfile>).mockResolvedValue(mockProfile);

      const payload = { specialization: 'CIVIL', yearsOfExperience: 5 };
      const res = await request(app)
        .patch('/api/engineer/profile')
        .send(payload);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('Engineer Profile Updated Successfully');
      expect(res.body.data).toEqual(mockProfile);
      expect(engineerService.updateEngineerProfileService).toHaveBeenCalledWith(1, payload);
    });
  });
});
