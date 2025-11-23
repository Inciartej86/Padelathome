const express = require('express');
const router = express.Router();
const {
  createBooking,
  getMyBookings,
  cancelMyBooking
} = require('../controllers/bookingController');
const { protect } = require('../middleware/authMiddleware');

// POST /api/bookings - Crear una reserva (privada o partida abierta)
router.post('/', protect, createBooking);

// GET /api/bookings/me - Obtener TODAS las reservas/partidas activas del usuario
router.get('/me', protect, getMyBookings);

// DELETE /api/bookings/:bookingId - Cancelar una reserva (si eres el dueño)
router.delete('/:bookingId', protect, cancelMyBooking);

module.exports = router;