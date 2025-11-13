const express = require('express');
const router = express.Router();
const {
  createBooking,
  getMyBooking,
  cancelMyBooking
} = require('../controllers/bookingController');
const { protect } = require('../middleware/authMiddleware');

// POST /api/bookings - Crear una reserva (privada o partida abierta)
router.post('/', protect, createBooking);

// GET /api/bookings/me - Obtener la próxima reserva/partida del usuario
router.get('/me', protect, getMyBooking);

// DELETE /api/bookings/:bookingId - Cancelar una reserva (si eres el dueño)
router.delete('/:bookingId', protect, cancelMyBooking);

module.exports = router;