const express = require('express');
const router = express.Router();
const {
  registerUser,
  loginUser,
  forgotPassword,
  resetPassword,
  getRegistrationStatus
} = require('../controllers/authController');

// POST /api/auth/register (Endpoint público para registrarse)
router.post('/register', registerUser);

// POST /api/auth/login (Endpoint público para iniciar sesión)
router.post('/login', loginUser);

// POST /api/auth/forgot-password (Endpoint público para solicitar reseteo)
router.post('/forgot-password', forgotPassword);

// POST /api/auth/reset-password (Endpoint público para establecer nueva contraseña)
router.post('/reset-password', resetPassword);

// GET /api/auth/registration-status
router.get('/registration-status', getRegistrationStatus);

module.exports = router;