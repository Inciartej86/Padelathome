// Carga las variables de entorno desde .env al principio de todo
require('dotenv').config();


  // Imports de las librerías
  const express = require('express');
  const cors = require('cors');

  // Imports de nuestros módulos de rutas (comentados para depuración)
  const authRoutes = require('./src/api/authRoutes');
const userRoutes = require('./src/api/userRoutes');
const scheduleRoutes = require('./src/api/scheduleRoutes');
const bookingRoutes = require('./src/api/bookingRoutes');
const courtRoutes = require('./src/api/courtRoutes');
const adminRoutes = require('./src/api/adminRoutes');
const waitingListRoutes = require('./src/api/waitingListRoutes');
const matchRoutes = require('./src/api/matchRoutes');


  // Creación de la aplicación Express
  const app = express();
  const PORT = process.env.PORT || 3000;

  // --- Middlewares --- (comentados para depuración)
  // Habilitar CORS para permitir peticiones desde otros orígenes
  app.use(cors());
  // Permitir que el servidor entienda peticiones con cuerpo en formato JSON
  app.use(express.json());
  // Servir los archivos estáticos (HTML, CSS, JS del frontend) desde la carpeta 'public'
  app.use(express.static('public'));

  // --- Definición de Rutas de la API --- (comentados para depuración)
  app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/schedule', scheduleRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/courts', courtRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/waiting-list', waitingListRoutes);
app.use('/api/matches', matchRoutes);


  // --- Arranque del Servidor ---
  // Esta es la línea que mantiene el proceso vivo y escuchando peticiones
  app.listen(PORT, () => {
    console.log(`Servidor corriendo y escuchando en el puerto ${PORT}`);
  });