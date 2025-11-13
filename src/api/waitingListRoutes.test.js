const request = require('supertest');
const express = require('express');
const waitingListRoutes = require('./waitingListRoutes');
const pool = require('../config/database');
const { protect } = require('../middleware/authMiddleware');

// Mock the pool object
jest.mock('../config/database', () => ({
  query: jest.fn(),
}));

// Mock the auth middleware
jest.mock('../middleware/authMiddleware', () => ({
  protect: jest.fn((req, res, next) => {
    req.user = { id: 1, role: 'user' }; // Mock a logged-in user
    next();
  }),
}));

const app = express();
app.use(express.json());
app.use('/api/waiting-list', waitingListRoutes);

describe('Waiting List Routes', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/waiting-list', () => {
    it('should get the waiting list for the logged-in user', async () => {
      const waitingList = [
        { id: 1, user_id: 1, court_id: 1, date: '2025-11-10' },
      ];
      pool.query.mockResolvedValue({ rows: waitingList });

      const res = await request(app).get('/api/waiting-list');

      expect(res.statusCode).toEqual(200);
      expect(res.body).toEqual(waitingList);
    });
  });

  describe('POST /api/waiting-list', () => {
    it('should add the user to the waiting list', async () => {
      const newWaitingListEntry = { id: 2, user_id: 1, court_id: 1, slot_start_time: '2025-11-11T10:00:00Z', slot_end_time: '2025-11-11T11:00:00Z' };
      pool.query
        .mockResolvedValueOnce({ rows: [{ id: 1 }] }) // Mock booking exists
        .mockResolvedValueOnce({ rows: [] }) // Mock not already in waiting list
        .mockResolvedValueOnce({ rows: [newWaitingListEntry] }); // Mock insert

      const res = await request(app)
        .post('/api/waiting-list')
        .send({ courtId: 1, slotStartTime: '2025-11-11T10:00:00Z', slotEndTime: '2025-11-11T11:00:00Z' });

      expect(res.statusCode).toEqual(201);
      expect(res.body).toHaveProperty('message', 'Te has apuntado a la lista de espera correctamente.');
      expect(res.body).toHaveProperty('entry', newWaitingListEntry);
    });
  });

  describe('DELETE /api/waiting-list/:id', () => {
    it('should remove the user from the waiting list', async () => {
      pool.query.mockResolvedValue({ rowCount: 1 });

      const res = await request(app).delete('/api/waiting-list/1');

      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('message', 'Has sido eliminado de la lista de espera.');
    });
  });
});
