const request = require('supertest');
const express = require('express');
const matchRoutes = require('./matchRoutes');
const pool = require('../config/database');
const { protect, isAdmin } = require('../middleware/authMiddleware');

// Mock the pool object
jest.mock('../config/database', () => {
  const mockClient = {
    query: jest.fn(),
    release: jest.fn(),
    // Mock transaction methods
    beginTransaction: jest.fn(),
    commit: jest.fn(),
    rollback: jest.fn(),
  };

  const pool = {
    connect: jest.fn(() => Promise.resolve(mockClient)),
    query: jest.fn(), // This is for direct pool.query calls, if any
  };
  return {
    ...pool,
    mockClient: mockClient, // Export mockClient for testing purposes
  };
});

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
app.use('/api/matches', matchRoutes);

describe('Match Routes', () => {
  afterEach(() => {
    jest.clearAllMocks();
    // Clear the mock for pool.connect and mockClient.query
    require('../config/database').connect.mockClear();
    require('../config/database').query.mockClear();
    require('../config/database').mockClient.query.mockClear();
  });

  describe('GET /api/matches', () => {
    it('should get all matches', async () => {
      const matches = [
        { id: 1, court_id: 1, start_time: '2025-11-10T10:00:00Z', end_time: '2025-11-10T11:00:00Z' },
        { id: 2, court_id: 2, start_time: '2025-11-10T12:00:00Z', end_time: '2025-11-10T13:00:00Z' },
      ];
      pool.query.mockResolvedValue({ rows: matches });

      const res = await request(app).get('/api/matches');

      expect(res.statusCode).toEqual(200);
      expect(res.body).toEqual(matches);
    });
  });

  describe('GET /api/matches/:bookingId', () => {
    it('should get a single match by ID', async () => {
      const match = { id: 1, court_id: 1, start_time: '2025-11-10T10:00:00Z', end_time: '2025-11-10T11:00:00Z' };
      pool.query.mockResolvedValue({ rows: [match] });

      const res = await request(app).get('/api/matches/1');

      expect(res.statusCode).toEqual(200);
      expect(res.body).toEqual(match);
    });

    it('should return 404 if match not found', async () => {
      pool.query.mockResolvedValue({ rows: [] });

      const res = await request(app).get('/api/matches/999');

      expect(res.statusCode).toEqual(404);
      expect(res.body).toHaveProperty('message', 'Partida no encontrada.');
    });
  });

  describe('POST /api/matches', () => {
    it('should create a new match (admin only)', async () => {
      const newMatch = { id: 3, court_id: 1, start_time: '2025-11-11T10:00:00Z', end_time: '2025-11-11T11:00:00Z', max_participants: 4, is_open_match: true, price: 10 };
      pool.query.mockResolvedValue({ rows: [newMatch] });
      isAdmin.mockImplementationOnce((req, res, next) => {
        req.user.role = 'admin';
        next();
      });

      const res = await request(app)
        .post('/api/matches')
        .send({ court_id: 1, start_time: '2025-11-11T10:00:00Z', end_time: '2025-11-11T11:00:00Z', max_participants: 4, is_open_match: true, price: 10 });

      expect(res.statusCode).toEqual(201);
      expect(res.body).toEqual(newMatch);
    });

    it('should return 403 if non-admin tries to create a match', async () => {
      isAdmin.mockImplementationOnce((req, res, next) => {
        req.user.role = 'user'; // Mock as a regular user
        res.status(403).json({ message: 'Acceso denegado. Solo administradores.' });
      });

      const res = await request(app)
        .post('/api/matches')
        .send({ court_id: 1, start_time: '2025-11-11T10:00:00Z', end_time: '2025-11-11T11:00:00Z', max_participants: 4, is_open_match: true, price: 10 });

      expect(res.statusCode).toEqual(403);
      expect(res.body).toHaveProperty('message', 'Acceso denegado. Solo administradores.');
    });
  });

  describe('PUT /api/matches/:bookingId', () => {
    it('should update a match (admin only)', async () => {
      const updatedMatch = { id: 1, court_id: 1, start_time: '2025-11-10T10:00:00Z', end_time: '2025-11-10T11:00:00Z', max_participants: 4, is_open_match: true, price: 12, status: 'confirmed' };
      pool.query.mockResolvedValue({ rows: [updatedMatch] });
      isAdmin.mockImplementationOnce((req, res, next) => {
        req.user.role = 'admin';
        next();
      });

      const res = await request(app)
        .put('/api/matches/1')
        .send({ court_id: 1, start_time: '2025-11-10T10:00:00Z', end_time: '2025-11-10T11:00:00Z', max_participants: 4, is_open_match: true, price: 12, status: 'confirmed' });

      expect(res.statusCode).toEqual(200);
      expect(res.body).toEqual(updatedMatch);
    });

    it('should return 403 if non-admin tries to update a match', async () => {
      isAdmin.mockImplementationOnce((req, res, next) => {
        req.user.role = 'user'; // Mock as a regular user
        res.status(403).json({ message: 'Acceso denegado. Solo administradores.' });
      });

      const res = await request(app)
        .put('/api/matches/1')
        .send({ court_id: 1, start_time: '2025-11-10T10:00:00Z', end_time: '2025-11-10T11:00:00Z', max_participants: 4, is_open_match: true, price: 12, status: 'confirmed' });

      expect(res.statusCode).toEqual(403);
      expect(res.body).toHaveProperty('message', 'Acceso denegado. Solo administradores.');
    });
  });

  describe('DELETE /api/matches/:bookingId', () => {
    it('should delete a match (admin only)', async () => {
      pool.query.mockResolvedValue({ rowCount: 1 });
      isAdmin.mockImplementationOnce((req, res, next) => {
        req.user.role = 'admin';
        next();
      });

      const res = await request(app).delete('/api/matches/1');

      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('message', 'Partida eliminada correctamente.');
    });

    it('should return 403 if non-admin tries to delete a match', async () => {
      isAdmin.mockImplementationOnce((req, res, next) => {
        req.user.role = 'user'; // Mock as a regular user
        res.status(403).json({ message: 'Acceso denegado. Solo administradores.' });
      });

      const res = await request(app).delete('/api/matches/1');

      expect(res.statusCode).toEqual(403);
      expect(res.body).toHaveProperty('message', 'Acceso denegado. Solo administradores.');
    });
  });

  describe('POST /api/matches/:bookingId/join', () => {
    it('should allow a user to join an open match', async () => {
      const { mockClient, connect } = require('../config/database');
      connect.mockResolvedValue(mockClient);

      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({ rows: [{ id: 1, user_id: 2, is_open_match: true, max_participants: 4 }] }) // Booking exists
        .mockResolvedValueOnce({ rows: [] }) // No participants yet
        .mockResolvedValueOnce({ rowCount: 1 }) // Insert participant
        .mockResolvedValueOnce({ rows: [] }); // COMMIT

      const res = await request(app).post('/api/matches/1/join');

      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('message', 'Te has unido a la partida con éxito.');
      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should return 400 if user tries to join their own match', async () => {
      const { mockClient, connect } = require('../config/database');
      connect.mockResolvedValue(mockClient);

      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({ rows: [{ id: 1, user_id: 1, is_open_match: true, max_participants: 4 }] }) // User is organizer
        .mockResolvedValueOnce({ rows: [] }); // ROLLBACK

      const res = await request(app).post('/api/matches/1/join');

      expect(res.statusCode).toEqual(400);
      expect(res.body).toHaveProperty('message', 'No puedes unirte a tu propia partida, ya eres el organizador.');
      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should return 400 if match is full', async () => {
      const { mockClient, connect } = require('../config/database');
      connect.mockResolvedValue(mockClient);

      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({ rows: [{ id: 1, user_id: 2, is_open_match: true, max_participants: 1 }] }) // Booking exists, max 1 participant
        .mockResolvedValueOnce({ rows: [{ user_id: 3 }] }) // One participant already
        .mockResolvedValueOnce({ rows: [] }); // ROLLBACK

      const res = await request(app).post('/api/matches/1/join');

      expect(res.statusCode).toEqual(400);
      expect(res.body).toHaveProperty('message', 'Esta partida ya está completa.');
      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should return 400 if user already joined', async () => {
      const { mockClient, connect } = require('../config/database');
      connect.mockResolvedValue(mockClient);

      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({ rows: [{ id: 1, user_id: 2, is_open_match: true, max_participants: 4 }] }) // Booking exists
        .mockResolvedValueOnce({ rows: [{ user_id: 1 }] }) // User already joined
        .mockResolvedValueOnce({ rows: [] }); // ROLLBACK

      const res = await request(app).post('/api/matches/1/join');

      expect(res.statusCode).toEqual(400);
      expect(res.body).toHaveProperty('message', 'Ya te has unido a esta partida.');
      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  describe('DELETE /api/matches/:bookingId/leave', () => {
    it('should allow a user to leave an open match', async () => {
      const { mockClient, connect } = require('../config/database');
      connect.mockResolvedValue(mockClient);

      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({ rows: [{ id: 1, user_id: 2, start_time: new Date(Date.now() + 7 * 3600 * 1000).toISOString(), max_participants: 4 }] }) // Booking exists, >6h until match
        .mockResolvedValueOnce({ rowCount: 1 }) // Participant deleted
        .mockResolvedValueOnce({ rows: [{ user_id: 3 }] }) // Remaining participants
        .mockResolvedValueOnce({ rows: [] }); // COMMIT

      const res = await request(app).delete('/api/matches/1/leave');

      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('message', 'Has abandonado la partida correctamente.');
      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should return 400 if user is not in the match', async () => {
      const { mockClient, connect } = require('../config/database');
      connect.mockResolvedValue(mockClient);

      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({ rows: [{ id: 1, user_id: 2, start_time: new Date(Date.now() + 7 * 3600 * 1000).toISOString(), max_participants: 4 }] }) // Booking exists
        .mockResolvedValueOnce({ rowCount: 0 }) // No participant deleted
        .mockResolvedValueOnce({ rows: [] }); // ROLLBACK

      const res = await request(app).delete('/api/matches/1/leave');

      expect(res.statusCode).toEqual(400);
      expect(res.body).toHaveProperty('message', 'No estás unido a esta partida.');
      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should transfer organizer role if organizer leaves and other participants exist', async () => {
      const { mockClient, connect } = require('../config/database');
      connect.mockResolvedValue(mockClient);

      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({ rows: [{ id: 1, user_id: 1, start_time: new Date(Date.now() + 7 * 3600 * 1000).toISOString(), max_participants: 4 }] }) // User is organizer
        .mockResolvedValueOnce({ rowCount: 1 }) // Participant deleted
        .mockResolvedValueOnce({ rows: [{ user_id: 3 }] }) // Remaining participants
        .mockResolvedValueOnce({ rowCount: 1 }) // Update booking (new organizer)
        .mockResolvedValueOnce({ rows: [] }); // COMMIT

      const res = await request(app).delete('/api/matches/1/leave');

      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('message', 'Has abandonado la partida correctamente.');
      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should cancel match if organizer leaves and no other participants exist', async () => {
      const { mockClient, connect } = require('../config/database');
      connect.mockResolvedValue(mockClient);

      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({ rows: [{ id: 1, user_id: 1, start_time: new Date(Date.now() + 7 * 3600 * 1000).toISOString(), max_participants: 4 }] }) // User is organizer
        .mockResolvedValueOnce({ rowCount: 1 }) // Participant deleted
        .mockResolvedValueOnce({ rows: [] }) // No remaining participants
        .mockResolvedValueOnce({ rowCount: 1 }) // Cancel booking
        .mockResolvedValueOnce({ rows: [] }); // COMMIT

      const res = await request(app).delete('/api/matches/1/leave');

      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('message', 'Has abandonado la partida correctamente.');
      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should cancel match if not full and within 6 hours of start time', async () => {
      const { mockClient, connect } = require('../config/database');
      connect.mockResolvedValue(mockClient);

      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({ rows: [{ id: 1, user_id: 2, start_time: new Date(Date.now() + 5 * 3600 * 1000).toISOString(), max_participants: 4 }] }) // Booking exists, <6h until match
        .mockResolvedValueOnce({ rowCount: 1 }) // Participant deleted
        .mockResolvedValueOnce({ rows: [{ user_id: 3 }] }) // Remaining participants
        .mockResolvedValueOnce({ rowCount: 1 }) // Cancel booking
        .mockResolvedValueOnce({ rows: [] }); // COMMIT

      const res = await request(app).delete('/api/matches/1/leave');

      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('message', 'Has abandonado la partida correctamente.');
      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      expect(mockClient.release).toHaveBeenCalled();
    });
  });
});
