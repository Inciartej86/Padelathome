const express = require('express');
const router = express.Router();
const { getAvailability, getWeekSchedule, getDaySchedule } = require('../controllers/scheduleController');
const { protect } = require('../middleware/authMiddleware');

// Ruta para la vista de disponibilidad de un solo día (antigua)
router.get('/availability', protect, getAvailability);

// Ruta para la nueva vista de calendario semanal
router.get('/week', protect, getWeekSchedule);

router.get('/day', protect, getDaySchedule);

module.exports = router;