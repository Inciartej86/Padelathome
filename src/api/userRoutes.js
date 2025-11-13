const express = require('express');
const router = express.Router();
// Importamos las tres funciones del controlador 
const {   getUserProfile, 
  updateUserProfile, 
  changeUserPassword 
} = require('../controllers/userController');
const { protect } = require('../middleware/authMiddleware');

// GET /api/users/me (Obtener perfil)
router.get('/me', protect, getUserProfile);

// PUT /api/users/me (Actualizar información del perfil)
router.put('/me', protect, updateUserProfile);

// PUT /api/users/change-password (Cambiar la contraseña)
router.put('/change-password', protect, changeUserPassword);

module.exports = router;