const request = require('supertest');
const express = require('express');
const courtRoutes = require('./courtRoutes');
const pool = require('../config/database');
const { protect, isAdmin } = require('../middleware/authMiddleware');

// Mock the pool object
jest.mock('../config/database', () => ({
  query: jest.fn(),
}));

// Mock the auth middleware
jest.mock('../middleware/authMiddleware', () => ({
  protect: jest.fn((req, res, next) => {
    req.user = { id: 1, role: 'user' }; // Default to a logged-in user
    next();
  }),
  isAdmin: jest.fn((req, res, next) => {
    req.user.role = 'admin'; // Default to an admin user for admin routes
    next();
  }),
}));

const app = express();
app.use(express.json());
app.use('/api/courts', courtRoutes);

describe('Court Routes', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/courts', () => {
    it('should get all courts', async () => {
      const courts = [
        { id: 1, name: 'Court 1', type: 'indoor' },
        { id: 2, name: 'Court 2', type: 'outdoor' },
      ];
      pool.query.mockResolvedValue({ rows: courts });

      const res = await request(app).get('/api/courts');

      expect(res.statusCode).toEqual(200);
      expect(res.body).toEqual(courts);
    });
  });

  describe('GET /api/courts/:id', () => {
    it('should get a single court', async () => {
      const court = { id: 1, name: 'Court 1', type: 'indoor' };
      pool.query.mockResolvedValue({ rows: [court] });

      const res = await request(app).get('/api/courts/1');

      expect(res.statusCode).toEqual(200);
      expect(res.body).toEqual(court);
    });
  });

  describe('POST /api/courts', () => {
    it('should create a new court (admin only)', async () => {
      const newCourt = { id: 3, name: 'Court 3', type: 'outdoor' };
      pool.query.mockResolvedValue({ rows: [newCourt] });
      isAdmin.mockImplementationOnce((req, res, next) => {
        req.user.role = 'admin';
        next();
      });

      const res = await request(app)
        .post('/api/courts')
        .send({ name: 'Court 3', type: 'outdoor' });

      expect(res.statusCode).toEqual(201);
      expect(res.body).toEqual(newCourt);
    });

    it('should return 403 if non-admin tries to create a court', async () => {
      isAdmin.mockImplementationOnce((req, res, next) => {
        req.user.role = 'user'; // Mock as a regular user
        res.status(403).json({ message: 'Acceso denegado. Solo administradores.' });
      });

      const res = await request(app)
        .post('/api/courts')
        .send({ name: 'Court 4', type: 'indoor' });

      expect(res.statusCode).toEqual(403);
      expect(res.body).toHaveProperty('message', 'Acceso denegado. Solo administradores.');
    });
  });

  describe('PUT /api/courts/:id', () => {
    it('should update a court (admin only)', async () => {
      const updatedCourt = { id: 1, name: 'Court 1 Updated', type: 'indoor' };
      pool.query.mockResolvedValue({ rows: [updatedCourt] });
      isAdmin.mockImplementationOnce((req, res, next) => {
        req.user.role = 'admin';
        next();
      });

      const res = await request(app)
        .put('/api/courts/1')
        .send({ name: 'Court 1 Updated', type: 'indoor' });

      expect(res.statusCode).toEqual(200);
      expect(res.body).toEqual(updatedCourt);
    });

    it('should return 403 if non-admin tries to update a court', async () => {
      isAdmin.mockImplementationOnce((req, res, next) => {
        req.user.role = 'user'; // Mock as a regular user
        res.status(403).json({ message: 'Acceso denegado. Solo administradores.' });
      });

      const res = await request(app)
        .put('/api/courts/1')
        .send({ name: 'Court 1 Updated', type: 'indoor' });

      expect(res.statusCode).toEqual(403);
      expect(res.body).toHaveProperty('message', 'Acceso denegado. Solo administradores.');
    });
  });

  describe('DELETE /api/courts/:id', () => {
    it('should delete a court (admin only)', async () => {
      pool.query.mockResolvedValue({ rowCount: 1 });
      isAdmin.mockImplementationOnce((req, res, next) => {
        req.user.role = 'admin';
        next();
      });

      const res = await request(app).delete('/api/courts/1');

      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('message', 'Pista eliminada correctamente.');
    });

    it('should return 403 if non-admin tries to delete a court', async () => {
      isAdmin.mockImplementationOnce((req, res, next) => {
        req.user.role = 'user'; // Mock as a regular user
        res.status(403).json({ message: 'Acceso denegado. Solo administradores.' });
      });

      const res = await request(app).delete('/api/courts/1');

      expect(res.statusCode).toEqual(403);
      expect(res.body).toHaveProperty('message', 'Acceso denegado. Solo administradores.');
    });
  });
});
