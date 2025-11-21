const request = require('supertest');
const express = require('express');
const userRoutes = require('./userRoutes');
const pool = require('../config/database');
const { protect, isAdmin } = require('../middleware/authMiddleware');

// Mock the pool object
jest.mock('../config/database', () => ({
  query: jest.fn(),
}));

// Mock the auth middleware
jest.mock('../middleware/authMiddleware', () => ({
  protect: (req, res, next) => {
    req.user = { id: 1 }; // Mock a logged-in user
    next();
  },
  isAdmin: (req, res, next) => {
    req.user.role = 'admin'; // Mock an admin user
    next();
  },
}));

const app = express();
app.use(express.json());
app.use('/api/users', userRoutes);

describe('User Routes', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/users/me', () => {
    it('should get the profile of the logged-in user', async () => {
      pool.query.mockResolvedValue({ rows: [{ id: 1, name: 'Test User', email: 'test@example.com' }] });

      const res = await request(app).get('/api/users/me');

      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('id', 1);
      expect(res.body).toHaveProperty('name', 'Test User');
      expect(res.body).toHaveProperty('email', 'test@example.com');
    });
  });

  describe('PUT /api/users/me', () => {
    it('should update the profile of the logged-in user', async () => {
      const updatedUser = { id: 1, name: 'Updated User', floor: '1', door: 'A', phone_number: '123456789' };
      pool.query.mockResolvedValue({ rows: [updatedUser] });

      const res = await request(app)
        .put('/api/users/me')
        .send({
          name: 'Updated User',
          floor: '1',
          door: 'A',
          phone_number: '123456789',
        });

      expect(res.statusCode).toEqual(200);
      expect(res.body).toEqual(updatedUser);
    });
  });

  describe('GET /api/users', () => {
    it('should get all users for an admin', async () => {
      const users = [
        { id: 1, name: 'Test User 1', email: 'test1@example.com' },
        { id: 2, name: 'Test User 2', email: 'test2@example.com' },
      ];
      pool.query.mockResolvedValue({ rows: users });

      const res = await request(app).get('/api/users');

      expect(res.statusCode).toEqual(200);
      expect(res.body).toEqual(users);
    });
  });

  describe('GET /api/users/:id', () => {
    it('should get a single user for an admin', async () => {
      const user = { id: 1, name: 'Test User 1', email: 'test1@example.com' };
      pool.query.mockResolvedValue({ rows: [user] });

      const res = await request(app).get('/api/users/1');

      expect(res.statusCode).toEqual(200);
      expect(res.body).toEqual(user);
    });
  });

  describe('PUT /api/users/:id', () => {
    it('should update a user for an admin', async () => {
      const updatedUser = { id: 1, name: 'Updated User', email: 'updated@example.com', role: 'user', account_status: 'active' };
      pool.query.mockResolvedValue({ rows: [updatedUser] });

      const res = await request(app)
        .put('/api/users/1')
        .send({
          name: 'Updated User',
          email: 'updated@example.com',
          role: 'user',
          account_status: 'active',
        });

      expect(res.statusCode).toEqual(200);
      expect(res.body).toEqual(updatedUser);
    });
  });

  describe('DELETE /api/users/:id', () => {
    it('should delete a user for an admin', async () => {
      pool.query.mockResolvedValue({ rowCount: 1 });

      const res = await request(app).delete('/api/users/1');

      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('message', 'Usuario eliminado correctamente.');
    });
  });
});
