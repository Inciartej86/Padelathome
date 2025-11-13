const express = require('express');
const router = express.Router();
const { joinWaitingList, confirmBookingFromWaitlist } = require('../controllers/waitingListController');
const { protect } = require('../middleware/authMiddleware');

// POST /api/waiting-list - Apuntarse a la lista de espera
router.post('/', protect, joinWaitingList);

// POST /api/waiting-list/confirm - Confirmar la reserva desde el email
router.post('/confirm', confirmBookingFromWaitlist);

module.exports = router;