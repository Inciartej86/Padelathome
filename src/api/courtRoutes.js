const express = require('express');
const router = express.Router();
const { getAllCourts, createCourt, updateCourt } = require('../controllers/courtController');
const { protect, isAdmin } = require('../middleware/authMiddleware');

// GET /api/courts - Obtener todas las pistas (para cualquier usuario logueado)
router.get('/', protect, getAllCourts);

// POST /api/courts - Crear una nueva pista (solo admin)
router.post('/', protect, isAdmin, createCourt);

// PUT /api/courts/:courtId - Actualizar una pista (solo admin)
router.put('/:courtId', protect, isAdmin, updateCourt);

module.exports = router;