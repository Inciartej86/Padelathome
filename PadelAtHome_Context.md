Proyecto: Padel@Home - Resumen de Exportación
Este documento contiene el contexto completo, los requisitos, el esquema de la base de datos y el código fuente final del proyecto de la aplicación de reservas de pádel "Padel@Home".

1. Resumen de Requisitos Funcionales
Aplicación: Progressive Web App (PWA) instalable.

Usuarios: Dos roles, user (Residente) y admin.

Flujo de Registro (Admin-céntrico): Los administradores crean las cuentas de los residentes. El sistema envía un enlace de bienvenida para que el nuevo usuario establezca su contraseña.

Autenticación: Login seguro con email/contraseña y gestión de sesión por Tokens JWT.

Dashboard de Usuario:

Muestra el calendario semanal (L-D) con slots coloreados.

Permite reservar (con opción de crear "Partida Abierta").

Permite unirse a "Partidas Abiertas" de otros.

Permite apuntarse a la "Lista de Espera" de slots ocupados.

Muestra la "Próxima Reserva" del usuario (sea propia o como participante).

Permite cancelar reservas propias o abandonar partidas.

Panel de Administración:

Gestión de Usuarios (invitar, aprobar, activar/desactivar).

Gestión de Edificios (lista cerrada de direcciones válidas).

Gestión de Pistas (crear, editar).

Gestión de Bloqueos (bloquear horarios).

Gestión de Ajustes (horarios de apertura, reglas).

Notificaciones: Correos electrónicos automáticos para confirmación de reserva (con adjunto .ics), invitación de nuevos usuarios y notificaciones de lista de espera.

Reglas de Negocio Avanzadas:

Lista de Espera: Automática, por orden de llegada, con tiempo de confirmación de 30 minutos.

Partidas Abiertas: Cancelación automática si no se llena 6h antes; si un participante se va a última hora, la partida continúa con un hueco libre.

2. Pila Tecnológica
Backend: Node.js, Express.js

Base de Datos: PostgreSQL

Frontend: Vanilla JavaScript (ES6+), HTML5, CSS3

Despliegue: Contenedores Docker

3. Esquema de la Base de Datos (PostgreSQL)
Este es el script de migración (node-pg-migrate) para construir toda la base de datos.

migrations/[timestamp]-crear-tablas-iniciales.js
JavaScript

exports.shorthands = undefined;

exports.up = pgm => {
    // --- TIPOS ENUMERADOS ---
    pgm.createType('user_role_enum', ['user', 'admin']);
    pgm.createType('account_status_enum', ['pending_approval', 'active', 'inactive']);
    pgm.createType('booking_status_enum', ['confirmed', 'cancelled_by_user', 'cancelled_by_admin']);

    // --- TABLA buildings ---
    pgm.createTable('buildings', {
        id: 'id',
        address: { type: 'varchar(255)', notNull: true, unique: true },
        description: { type: 'text' },
        created_at: { type: 'timestamptz', notNull: true, default: pgm.func('current_timestamp') },
        updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('current_timestamp') }
    });

    // --- TABLA users ---
    pgm.createTable('users', {
        id: 'id',
        email: { type: 'varchar(255)', notNull: true, unique: true },
        password_hash: { type: 'varchar(255)', notNull: true },
        name: { type: 'varchar(255)', notNull: true },
        floor: { type: 'varchar(50)' },
        door: { type: 'varchar(50)' },
        phone_number: { type: 'varchar(50)' },
        role: { type: 'user_role_enum', notNull: true, default: 'user' },
        account_status: { type: 'account_status_enum', notNull: true, default: 'pending_approval' },
        building_id: { type: 'bigint', references: 'buildings', onDelete: 'SET NULL' },
        created_at: { type: 'timestamptz', notNull: true, default: pgm.func('current_timestamp') },
        updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('current_timestamp') }
    });
    
    // --- TABLA courts ---
    pgm.createTable('courts', {
        id: 'id',
        name: { type: 'varchar(255)', notNull: true, unique: true },
        description: { type: 'text' },
        is_active: { type: 'boolean', notNull: true, default: true },
        created_at: { type: 'timestamptz', notNull: true, default: pgm.func('current_timestamp') },
        updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('current_timestamp') }
    });

    // --- TABLA bookings ---
    pgm.createTable('bookings', {
        id: 'id',
        court_id: { type: 'bigint', notNull: true, references: 'courts' },
        user_id: { type: 'bigint', notNull: true, references: 'users' },
        start_time: { type: 'timestamptz', notNull: true },
        end_time: { type: 'timestamptz', notNull: true },
        status: { type: 'booking_status_enum', notNull: true, default: 'confirmed' },
        is_open_match: { type: 'boolean', notNull: true, default: false },
        max_participants: { type: 'integer' },
        auto_cancel_hours_before: { type: 'integer' },
        created_at: { type: 'timestamptz', notNull: true, default: pgm.func('current_timestamp') },
        updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('current_timestamp') }
    });

    // --- TABLA match_participants ---
    pgm.createTable('match_participants', {
        id: 'id',
        booking_id: { type: 'bigint', notNull: true, references: 'bookings', onDelete: 'CASCADE' },
        user_id: { type: 'bigint', notNull: true, references: 'users', onDelete: 'CASCADE' },
        joined_at: { type: 'timestamptz', notNull: true, default: pgm.func('current_timestamp') },
    });
    pgm.addConstraint('match_participants', 'unique_booking_user', {
        unique: ['booking_id', 'user_id']
    });

    // --- TABLA waiting_list_entries ---
    pgm.createTable('waiting_list_entries', {
        id: 'id',
        court_id: { type: 'bigint', notNull: true, references: 'courts', onDelete: 'CASCADE' },
        user_id: { type: 'bigint', notNull: true, references: 'users', onDelete: 'CASCADE' },
        slot_start_time: { type: 'timestamptz', notNull: true },
        slot_end_time: { type: 'timestamptz', notNull: true },
        requested_at: { type: 'timestamptz', notNull: true, default: pgm.func('current_timestamp') },
        status: { type: 'varchar(50)', notNull: true, default: 'waiting' }, // waiting, notified, confirmed, expired
        notification_sent_at: { type: 'timestamptz' },
        confirmation_token: { type: 'text' },
        notification_expires_at: { type: 'timestamptz' }
    });
    pgm.addConstraint('waiting_list_entries', 'unique_waitlist_entry', {
        unique: ['court_id', 'user_id', 'slot_start_time']
    });

    // --- TABLA instance_settings ---
    pgm.createTable('instance_settings', {
        setting_key: { type: 'varchar(255)', primaryKey: true },
        setting_value: { type: 'text', notNull: true },
        description: { type: 'text' },
        created_at: { type: 'timestamptz', notNull: true, default: pgm.func('current_timestamp') },
        updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('current_timestamp') }
    });

    // --- TABLA blocked_periods ---
    pgm.createTable('blocked_periods', {
        id: 'id',
        court_id: { type: 'bigint', notNull: true, references: 'courts', onDelete: 'CASCADE' },
        start_time: { type: 'timestamptz', notNull: true },
        end_time: { type: 'timestamptz', notNull: true },
        reason: { type: 'text' },
        is_full_day: { type: 'boolean', notNull: true, default: false },
        created_at: { type: 'timestamptz', notNull: true, default: pgm.func('current_timestamp') },
        updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('current_timestamp') }
    });

    // --- TABLA password_reset_tokens ---
    pgm.createTable('password_reset_tokens', {
        token: { type: 'text', primaryKey: true },
        user_id: { type: 'bigint', notNull: true, references: 'users', onDelete: 'CASCADE' },
        expires_at: { type: 'timestamptz', notNull: true }
    });
};

exports.down = pgm => {
    // Definir aquí el orden inverso de borrado
    pgm.dropTable('password_reset_tokens');
    pgm.dropTable('blocked_periods');
    pgm.dropTable('instance_settings');
    pgm.dropTable('waiting_list_entries');
    pgm.dropTable('match_participants');
    pgm.dropTable('bookings');
    pgm.dropTable('courts');
    pgm.dropTable('users');
    pgm.dropTable('buildings');
    pgm.dropType('user_role_enum');
    pgm.dropType('account_status_enum');
    pgm.dropType('booking_status_enum');
};


4. Código Fuente del Backend (Node.js)
Esta sección contiene el código completo para cada archivo JavaScript en la carpeta src/, así como los archivos de configuración en la raíz del backend.

package.json
JSON

{
  "name": "p_at_home_backend",
  "version": "2.0.0",
  "description": "Sistema de reservas de pistas de pádel para residencias.",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "migrate": "node-pg-migrate"
  },
  "dependencies": {
    "bcrypt": "^5.1.1",
    "cors": "^2.8.5",
    "date-fns": "^3.6.0",
    "dcron": "^1.1.1",
    "dotenv": "^16.4.5",
    "express": "^4.19.2",
    "ics": "^3.7.6",
    "jsonwebtoken": "^9.0.2",
    "node-pg-migrate": "^7.5.2",
    "nodemailer": "^6.9.14",
    "pg": "^8.12.0"
  }
}
server.js (Raíz del proyecto)
JavaScript

// Carga las variables de entorno desde .env al principio de todo
require('dotenv').config();

// Imports de las librerías
const express = require('express');
const cors = require('cors');

// Imports de nuestros módulos de rutas
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

// --- Middlewares ---
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// --- Definición de Rutas de la API ---
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/schedule', scheduleRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/courts', courtRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/waiting-list', waitingListRoutes);
app.use('/api/matches', matchRoutes);

// --- Arranque del Servidor ---
app.listen(PORT, () => {
  console.log(`Servidor corriendo y escuchando en el puerto ${PORT}`);
});
src/config/database.js
JavaScript

const { Pool } = require('pg');

// El pool lee automáticamente las variables de entorno PG_...
// pero las definimos explícitamente para mayor claridad
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_DATABASE,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

pool.on('connect', () => {
  console.log('Conexión exitosa a la base de datos PostgreSQL');
});

module.exports = pool;
src/middleware/authMiddleware.js
JavaScript

const jwt = require('jsonwebtoken');

const protect = (req, res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Añadimos los datos del usuario (del token) al objeto 'req'
      req.user = decoded; 
      next();
    } catch (error) {
      console.error('Error de autenticación de token', error);
      res.status(401).json({ message: 'No autorizado, token fallido.' });
    }
  }

  if (!token) {
    res.status(401).json({ message: 'No autorizado, no hay token.' });
  }
};

const isAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({ message: 'Acceso denegado. Se requiere rol de administrador.' });
  }
};

module.exports = { protect, isAdmin };
src/services/emailService.js
JavaScript

const nodemailer = require('nodemailer');

// 1. Creamos el "transportador" que usará los datos del .env
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true', // true para puerto 465, false para otros
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
});

// 2. Creamos una función reutilizable para enviar los correos
const sendEmail = async ({ to, subject, html, attachments = [] }) => {
  try {
    const mailOptions = {
      from: `"${process.env.SMTP_FROM_NAME}" <${process.env.SMTP_USER}>`,
      to: to,
      subject: subject,
      html: html,
      attachments: attachments,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Correo enviado: %s', info.messageId);
    
    // Log para previsualizar con Ethereal
    console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));
    
  } catch (error) {
    console.error('Error al intentar enviar el correo:', error);
  }
};

module.exports = sendEmail;
src/jobs/checkWaitingList.js
JavaScript

// Le decimos a dotenv dónde encontrar el fichero .env
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });

const pool = require('../config/database');
const sendEmail = require('../services/emailService');
const crypto = require('crypto');

async function processExpiredWaitlistEntries() {
  console.log(`[CRON JOB] - ${new Date().toISOString()} - Iniciando verificación de la lista de espera...`);
  const client = await pool.connect();

  try {
    // 1. Buscamos todas las entradas notificadas cuyo tiempo ha pasado
    const expiredEntriesResult = await client.query(
      "SELECT * FROM waiting_list_entries WHERE status = 'notified' AND notification_expires_at < NOW()"
    );

    if (expiredEntriesResult.rows.length === 0) {
      console.log('[CRON JOB] - No hay entradas expiradas que procesar.');
      return;
    }

    console.log(`[CRON JOB] - Se encontraron ${expiredEntriesResult.rows.length} entradas expiradas.`);

    for (const expiredEntry of expiredEntriesResult.rows) {
      await client.query('BEGIN');

      // 2a. Marcamos la entrada actual como 'expired'
      await client.query("UPDATE waiting_list_entries SET status = 'expired' WHERE id = $1", [expiredEntry.id]);

      // 2b. Buscamos a la siguiente persona en la cola para el mismo slot
      const nextInLineResult = await client.query(
        `SELECT wle.id, u.name as user_name, u.email as user_email, wle.slot_start_time
         FROM waiting_list_entries wle
         JOIN users u ON wle.user_id = u.id
         WHERE wle.court_id = $1 AND wle.slot_start_time = $2 AND wle.status = 'waiting'
         ORDER BY wle.requested_at ASC
         LIMIT 1`,
        [expiredEntry.court_id, expiredEntry.slot_start_time]
      );

      // 2c. Si hay alguien más en la lista...
      if (nextInLineResult.rows.length > 0) {
        const nextUser = nextInLineResult.rows[0];
        const confirmationToken = crypto.randomBytes(32).toString('hex');
        const expires_at = new Date(Date.now() + 30 * 60 * 1000); // 30 minutos

        await client.query(
          "UPDATE waiting_list_entries SET status = 'notified', confirmation_token = $1, notification_expires_at = $2, notification_sent_at = NOW() WHERE id = $3",
          [confirmationToken, expires_at, nextUser.id]
        );
        
        const confirmationUrl = `http://${process.env.PUBLIC_IP || '10.10.10.2'}:3000/confirm-booking.html?token=${confirmationToken}`;
        sendEmail({
            to: nextUser.user_email,
            subject: '¡Un hueco se ha liberado en Padel@Home!',
            html: `<h3>¡Hola, ${nextUser.user_name}!</h3><p>El turno anterior ha expirado. ¡Ahora es tu oportunidad!</p><p>Tienes <strong>30 minutos</strong> para confirmar la reserva haciendo clic en el enlace.</p><a href="${confirmationUrl}">Confirmar mi Reserva</a>`
        });
        console.log(`[CRON JOB] - Turno expirado. Notificando al siguiente usuario: ${nextUser.user_id}`);
      }
      
      await client.query('COMMIT');
    }

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[CRON JOB] - Error procesando la lista de espera:', error);
  } finally {
    client.release();
  }
}

processExpiredWaitlistEntries().then(() => {
  console.log('[CRON JOB] - Verificación completada.');
  pool.end();
});


4. Código Fuente del Backend (Continuación)
4.1 Módulo de Autenticación
src/api/authRoutes.js
JavaScript

const express = require('express');
const router = express.Router();
const {
  registerUser,
  loginUser,
  forgotPassword,
  resetPassword
} = require('../controllers/authController');

// POST /api/auth/register (Endpoint público para registrarse)
router.post('/register', registerUser);

// POST /api/auth/login (Endpoint público para iniciar sesión)
router.post('/login', loginUser);

// POST /api/auth/forgot-password (Endpoint público para solicitar reseteo)
router.post('/forgot-password', forgotPassword);

// POST /api/auth/reset-password (Endpoint público para establecer nueva contraseña)
router.post('/reset-password', resetPassword);

module.exports = router;
src/controllers/authController.js
JavaScript

const pool = require('../config/database');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const sendEmail = require('../services/emailService');

// Nota: La función 'registerUser' se mantiene para el registro público
// aunque el flujo principal ahora es 'inviteUser' (en adminController)
const registerUser = async (req, res) => {
  const { name, email, password, building, floor, door } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ message: 'Nombre, email y contraseña son requeridos.' });
  }
  try {
    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    // Buscamos el ID del edificio basado en la dirección de texto (ajustar si es necesario)
    const buildingResult = await pool.query("SELECT id FROM buildings WHERE address = $1", [building]);
    const building_id = buildingResult.rows.length > 0 ? buildingResult.rows[0].id : null;

    const newUser = await pool.query(
      "INSERT INTO users (name, email, password_hash, building_id, floor, door) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, name, email, account_status",
      [name, email, password_hash, building_id, floor, door]
    );
    res.status(201).json({
      message: "Registro exitoso. Tu cuenta está pendiente de aprobación.",
      user: newUser.rows[0]
    });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(400).json({ message: 'El correo electrónico ya está en uso.' });
    }
    console.error('Error en el registro:', error);
    res.status(500).json({ message: 'Error interno del servidor.' });
  }
};

const loginUser = async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: 'Email y contraseña son requeridos.' });
  }
  try {
    const userResult = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
    if (userResult.rows.length === 0) {
      return res.status(401).json({ message: 'Credenciales inválidas.' });
    }
    const user = userResult.rows[0];

    if (user.account_status !== 'active') {
      return res.status(403).json({ message: 'Tu cuenta está inactiva o pendiente de aprobación.' });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ message: 'Credenciales inválidas.' });
    }

    const payload = { id: user.id, role: user.role, name: user.name, email: user.email };
    const token = jwt.sign(
      payload,
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      message: "Inicio de sesión exitoso.",
      token: token,
      user: { id: user.id, name: user.name, role: user.role }
    });
  } catch (error) {
    console.error('Error en el login:', error);
    res.status(500).json({ message: 'Error interno del servidor.' });
  }
};

const forgotPassword = async (req, res) => {
  const { email } = req.body;
  const client = await pool.connect();
  try {
    const userResult = await client.query("SELECT * FROM users WHERE email = $1 AND account_status = 'active'", [email]);
    if (userResult.rows.length === 0) {
      // No revelamos si el usuario existe o no
      return res.json({ message: 'Si tu cuenta existe, se ha enviado un enlace para restablecer la contraseña.' });
    }
    const user = userResult.rows[0];
    const resetToken = crypto.randomBytes(32).toString('hex');
    const expires_at = new Date(Date.now() + 30 * 60 * 1000); // 30 minutos

    await client.query("DELETE FROM password_reset_tokens WHERE user_id = $1", [user.id]);
    await client.query("INSERT INTO password_reset_tokens (token, user_id, expires_at) VALUES ($1, $2, $3)", [resetToken, user.id, expires_at]);

    const resetUrl = `http://${process.env.PUBLIC_IP || '10.10.10.2'}:3000/reset-password.html?token=${resetToken}`;
    sendEmail({
      to: user.email,
      subject: 'Restablece tu contraseña de Padel@Home',
      html: `<h3>Hola, ${user.name}</h3><p>Recibimos una solicitud para restablecer tu contraseña. Haz clic en el siguiente enlace para crear una nueva:</p><a href="${resetUrl}">Restablecer Contraseña</a><p>Este enlace expirará en 30 minutos.</p>`
    });
    res.json({ message: 'Si tu cuenta existe, se ha enviado un enlace para restablecer la contraseña.' });
  } catch (error) {
    console.error("Error en forgotPassword:", error);
    res.status(500).json({ message: 'Error interno del servidor.' });
  } finally {
    client.release();
  }
};

const resetPassword = async (req, res) => {
  const { token, newPassword } = req.body;
  if (!token || !newPassword) {
    return res.status(400).json({ message: 'Token y nueva contraseña son requeridos.' });
  }
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const tokenResult = await client.query("SELECT * FROM password_reset_tokens WHERE token = $1 AND expires_at > NOW()", [token]);
    if (tokenResult.rows.length === 0) {
      return res.status(400).json({ message: 'El token es inválido o ha expirado.' });
    }
    const userId = tokenResult.rows[0].user_id;
    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(newPassword, salt);
    await client.query("UPDATE users SET password_hash = $1 WHERE id = $2", [password_hash, userId]);
    await client.query("DELETE FROM password_reset_tokens WHERE token = $1", [token]);
    await client.query('COMMIT');
    res.json({ message: 'Contraseña actualizada correctamente.' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error("Error en resetPassword:", error);
    res.status(500).json({ message: 'Error interno del servidor.' });
  } finally {
    client.release();
  }
};

module.exports = {
  registerUser,
  loginUser,
  forgotPassword,
  resetPassword
};
4.2 Módulo de Perfil de Usuario
src/api/userRoutes.js
JavaScript

const express = require('express');
const router = express.Router();
const { getUserProfile } = require('../controllers/userController');
const { protect } = require('../middleware/authMiddleware');

// GET /api/users/me (Ruta protegida para obtener el perfil del usuario logueado)
router.get('/me', protect, getUserProfile);

module.exports = router;
src/controllers/userController.js
JavaScript

const pool = require('../config/database');

const getUserProfile = async (req, res) => {
  try {
    const userId = req.user.id; 
    
    // Consulta SQL actualizada con JOIN para obtener la dirección
    const userResult = await pool.query(
      `SELECT 
         u.id, u.name, u.email, u.floor, u.door, u.phone_number, u.role, u.account_status,
         b.address as building_address 
       FROM 
         users u 
       LEFT JOIN 
         buildings b ON u.building_id = b.id 
       WHERE 
         u.id = $1`,
      [userId]
    );

    if (userResult.rows.length > 0) {
      res.json(userResult.rows[0]);
    } else {
      res.status(404).json({ message: 'Usuario no encontrado.' });
    }
  } catch (error) {
    console.error('Error al obtener perfil de usuario:', error);
    res.status(500).json({ message: 'Error interno del servidor.' });
  }
};

module.exports = {
  getUserProfile,
};


4. Código Fuente del Backend (Continuación)
4.3 Módulo de Calendario (Schedule)
src/api/scheduleRoutes.js
JavaScript

const express = require('express');
const router = express.Router();
const { getAvailability, getWeekSchedule } = require('../controllers/scheduleController');
const { protect } = require('../middleware/authMiddleware');

// Ruta para la vista de disponibilidad de un solo día (antigua)
router.get('/availability', protect, getAvailability);

// Ruta para la nueva vista de calendario semanal
router.get('/week', protect, getWeekSchedule);

module.exports = router;
src/controllers/scheduleController.js
JavaScript

const pool = require('../config/database');
const { startOfWeek, endOfWeek, startOfDay, endOfDay, eachDayOfInterval, parseISO } = require('date-fns');

// --- Función auxiliar para la disponibilidad de un día ---
function isSlotAvailable(start, end, bookings, blocked) {
    for (const booking of bookings) {
        if (start < new Date(booking.end_time) && end > new Date(booking.start_time)) return false;
    }
    for (const block of blocked) {
        if (start < new Date(block.end_time) && end > new Date(block.start_time)) return false;
    }
    return true;
}

// --- Controlador para la disponibilidad de UN DÍA (original) ---
const getAvailability = async (req, res) => {
  const { courtId, date } = req.query;
  if (!courtId || !date) {
    return res.status(400).json({ message: 'Se requiere courtId y date.' });
  }
  try {
    const targetDate = parseISO(date);
    const startOfTargetDate = startOfDay(targetDate);
    const endOfTargetDate = endOfDay(targetDate);
    const [bookingsResult, blockedResult, settingsResult] = await Promise.all([
      pool.query("SELECT start_time, end_time FROM bookings WHERE court_id = $1 AND status = 'confirmed' AND start_time >= $2 AND start_time <= $3", [courtId, startOfTargetDate, endOfTargetDate]),
      pool.query("SELECT start_time, end_time, reason FROM blocked_periods WHERE court_id = $1 AND start_time >= $2 AND start_time <= $3", [courtId, startOfTargetDate, endOfTargetDate]),
      pool.query("SELECT setting_value FROM instance_settings WHERE setting_key IN ('operating_open_time', 'operating_close_time')")
    ]);
    const bookings = bookingsResult.rows;
    const blockedPeriods = blockedResult.rows;
    const openTime = settingsResult.rows.find(s => s.setting_key === 'operating_open_time')?.setting_value || '08:00';
    const closeTime = settingsResult.rows.find(s => s.setting_key === 'operating_close_time')?.setting_value || '22:00';
    const availableSlots = [];
    const [openHour, openMinute] = openTime.split(':');
    const [closeHour, closeMinute] = closeTime.split(':');
    const dayStartTime = new Date(targetDate.setHours(openHour, openMinute, 0, 0));
    const dayEndTime = new Date(targetDate.setHours(closeHour, closeMinute, 0, 0));
    for (let i = dayStartTime; i < dayEndTime; i.setMinutes(i.getMinutes() + 30)) {
        const potentialStartTime = new Date(i);
        const availableDurations = [];
        const endTime60 = new Date(potentialStartTime.getTime() + 60 * 60000);
        if (isSlotAvailable(potentialStartTime, endTime60, bookings, blockedPeriods) && endTime60 <= dayEndTime) {
            availableDurations.push(60);
        }
        const endTime90 = new Date(potentialStartTime.getTime() + 90 * 60000);
        if (isSlotAvailable(potentialStartTime, endTime90, bookings, blockedPeriods) && endTime90 <= dayEndTime) {
            availableDurations.push(90);
        }
        if (availableDurations.length > 0) {
            availableSlots.push({ startTime: potentialStartTime.toISOString(), availableDurations });
        }
    }
    res.json({ availability: availableSlots, blocked: blockedPeriods });
  } catch (error) {
    console.error('Error al obtener disponibilidad:', error);
    res.status(500).json({ message: 'Error interno del servidor.' });
  }
};


// --- Controlador para la disponibilidad de TODA LA SEMANA ---
const getWeekSchedule = async (req, res) => {
  const { courtId, date } = req.query;
  if (!courtId || !date) {
    return res.status(400).json({ message: 'Se requiere courtId y date.' });
  }
  try {
    const targetDate = parseISO(date);
    const weekStart = startOfWeek(targetDate, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(targetDate, { weekStartsOn: 1 });

    const bookingsResult = await pool.query("SELECT id, user_id, start_time, end_time, is_open_match, max_participants FROM bookings WHERE court_id = $1 AND status = 'confirmed' AND start_time >= $2 AND end_time <= $3", [courtId, weekStart, weekEnd]);
    const bookingIds = bookingsResult.rows.map(b => b.id);

    const [blockedResult, participantsResult, settingsResult] = await Promise.all([
      pool.query("SELECT start_time, end_time, reason FROM blocked_periods WHERE court_id = $1 AND start_time >= $2 AND end_time <= $3", [courtId, weekStart, weekEnd]),
      pool.query("SELECT booking_id, COUNT(user_id) as participant_count FROM match_participants WHERE booking_id = ANY($1::bigint[]) GROUP BY booking_id", [bookingIds]),
      pool.query("SELECT setting_key, setting_value FROM instance_settings WHERE setting_key IN ('operating_open_time', 'operating_close_time')")
    ]);
    
    const participantCounts = participantsResult.rows.reduce((acc, row) => { acc[row.booking_id] = parseInt(row.participant_count, 10); return acc; }, {});
    const openTime = settingsResult.rows.find(s => s.setting_key === 'operating_open_time')?.setting_value || '08:00';
    const closeTime = settingsResult.rows.find(s => s.setting_key === 'operating_close_time')?.setting_value || '22:00';
    
    const schedule = {};
    const daysOfWeek = eachDayOfInterval({ start: weekStart, end: weekEnd });

    daysOfWeek.forEach(day => {
      const dayString = day.toISOString().split('T')[0];
      schedule[dayString] = [];
      const dayStartTime = new Date(`${dayString}T${openTime}:00Z`); // Aseguramos UTC
      const dayEndTime = new Date(`${dayString}T${closeTime}:00Z`); // Aseguramos UTC
      
      for (let i = dayStartTime; i < dayEndTime; i.setMinutes(i.getMinutes() + 30)) {
        const slotTime = new Date(i);
        let slotInfo = { startTime: slotTime.toISOString(), status: 'available' };
        
        const conflictingBooking = bookingsResult.rows.find(b => slotTime >= new Date(b.start_time) && slotTime < new Date(b.end_time));
        const conflictingBlock = blockedResult.rows.find(b => slotTime >= new Date(b.start_time) && slotTime < new Date(b.end_time));

        if (conflictingBlock) {
          slotInfo.status = 'blocked';
          slotInfo.reason = conflictingBlock.reason;
        } else if (conflictingBooking) {
          slotInfo.bookingId = conflictingBooking.id;
          if (conflictingBooking.is_open_match) {
            const participants = participantCounts[conflictingBooking.id] || 1; // El creador cuenta como 1
            slotInfo.status = participants >= conflictingBooking.max_participants ? 'open_match_full' : 'open_match_available';
            slotInfo.participants = participants;
            slotInfo.maxParticipants = conflictingBooking.max_participants;
          } else {
            slotInfo.status = 'booked';
          }
        }
        schedule[dayString].push(slotInfo);
      }
    });

    res.json({ weekStart: weekStart.toISOString(), weekEnd: weekEnd.toISOString(), schedule: schedule });

  } catch (error) {
    console.error('Error al obtener el calendario semanal:', error);
    res.status(500).json({ message: 'Error interno del servidor.' });
  }
};

module.exports = {
  getAvailability,
  getWeekSchedule,
};
4.4 Módulo de Reservas (Bookings)
src/api/bookingRoutes.js
JavaScript

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
src/controllers/bookingController.js
JavaScript

const pool = require('../config/database');
const { addMinutes } = require('date-fns');
const sendEmail = require('../services/emailService');
const ics = require('ics');
const crypto = require('crypto');

const createBooking = async (req, res) => {
  const userId = req.user.id;
  const { courtId, startTime, durationMinutes, isOpenMatch, maxParticipants } = req.body;

  if (!courtId || !startTime || !durationMinutes) {
    return res.status(400).json({ message: 'Se requiere courtId, startTime y durationMinutes.' });
  }
  const bookingStartTime = new Date(startTime);
  const bookingEndTime = addMinutes(bookingStartTime, durationMinutes);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const activeBookingResult = await client.query("SELECT id FROM bookings WHERE user_id = $1 AND status = 'confirmed' AND end_time > (NOW() AT TIME ZONE 'UTC')", [userId]);
    if (activeBookingResult.rows.length > 0 && !isOpenMatch) {
      throw new Error('Ya tienes una reserva personal activa.');
    }
    const [bookingsResult, blockedResult] = await Promise.all([
        client.query("SELECT start_time, end_time FROM bookings WHERE court_id = $1 AND status = 'confirmed' AND start_time < $2 AND end_time > $3", [courtId, bookingEndTime, bookingStartTime]),
        client.query("SELECT start_time, end_time FROM blocked_periods WHERE court_id = $1 AND start_time < $2 AND end_time > $3", [courtId, bookingEndTime, bookingStartTime])
    ]);
    if (bookingsResult.rows.length > 0 || blockedResult.rows.length > 0) {
        throw new Error('El horario seleccionado ya no está disponible.');
    }
    
    const newBookingResult = await client.query(
      "INSERT INTO bookings (court_id, user_id, start_time, end_time, is_open_match, max_participants, auto_cancel_hours_before) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *",
      [courtId, userId, bookingStartTime, bookingEndTime, !!isOpenMatch, isOpenMatch ? maxParticipants : null, isOpenMatch ? 6 : null]
    );
    const newBooking = newBookingResult.rows[0];

    if (newBooking.is_open_match) {
      await client.query("INSERT INTO match_participants (booking_id, user_id) VALUES ($1, $2)", [newBooking.id, userId]);
    }

    const userResult = await client.query("SELECT name, email FROM users WHERE id = $1", [userId]);
    const courtResult = await client.query("SELECT name FROM courts WHERE id = $1", [courtId]);
    
    await client.query('COMMIT');

    // Enviar email después de confirmar la transacción
    const user = userResult.rows[0];
    const courtName = courtResult.rows[0].name;
    const event = {
      title: 'Reserva de Pista de Pádel',
      description: `Pista: ${courtName}\nReservado por: ${user.name}\n\nNos veremos en la pista, ¡no olvides dar lo mejor!`,
      start: [bookingStartTime.getUTCFullYear(), bookingStartTime.getUTCMonth() + 1, bookingStartTime.getUTCDate(), bookingStartTime.getUTCHours(), bookingStartTime.getUTCMinutes()],
      end: [bookingEndTime.getUTCFullYear(), bookingEndTime.getUTCMonth() + 1, bookingEndTime.getUTCDate(), bookingEndTime.getUTCHours(), bookingEndTime.getUTCMinutes()],
      status: 'CONFIRMED',
      organizer: { name: 'Padel@Home Admin', email: process.env.SMTP_USER },
      attendees: [{ name: user.name, email: user.email, rsvp: true, role: 'REQ-PARTICIPANT' }]
    };
    
    const { error, value } = ics.createEvent(event);
    if (!error) {
        sendEmail({
            to: user.email,
            subject: `Confirmación de Reserva en Padel@Home para el ${bookingStartTime.toLocaleDateString('es-ES')}`,
            html: `<h3>¡Hola, ${user.name}!</h3><p>Tu reserva ha sido confirmada. Adjuntamos un evento de calendario.</p>`,
            attachments: [{ filename: 'invitacion.ics', content: value, contentType: 'text/calendar' }]
        });
    }

    res.status(201).json(newBooking);

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error al crear la reserva:', error);
    res.status(400).json({ message: error.message || 'Error al procesar la reserva.' });
  } finally {
    client.release();
  }
};

const getMyBooking = async (req, res) => {
  try {
    const userId = req.user.id;
    const query = `
      SELECT b.*, c.name as court_name, 'owner' as participation_type
      FROM bookings b
      JOIN courts c ON b.court_id = c.id
      WHERE b.user_id = $1 AND b.status = 'confirmed' AND b.end_time > (NOW() AT TIME ZONE 'UTC')
      UNION
      SELECT b.*, c.name as court_name, 'participant' as participation_type
      FROM bookings b
      JOIN courts c ON b.court_id = c.id
      JOIN match_participants mp ON b.id = mp.booking_id
      WHERE mp.user_id = $1 AND b.user_id != $1 AND b.status = 'confirmed' AND b.end_time > (NOW() AT TIME ZONE 'UTC')
      ORDER BY start_time ASC
      LIMIT 1;
    `;
    const result = await pool.query(query, [userId]);
    if (result.rows.length > 0) {
      res.json(result.rows[0]);
    } else {
      res.json(null);
    }
  } catch (error) {
    console.error('Error al obtener mi reserva:', error);
    res.status(500).json({ message: 'Error interno del servidor.' });
  }
};

const cancelMyBooking = async (req, res) => {
  const client = await pool.connect();
  try {
    const userId = req.user.id;
    const { bookingId } = req.params;
    
    await client.query('BEGIN');

    const result = await client.query(
      "UPDATE bookings SET status = 'cancelled_by_user' WHERE id = $1 AND user_id = $2 AND status = 'confirmed' RETURNING *",
      [bookingId, userId]
    );
    if (result.rowCount === 0) {
      throw new Error('No se encontró una reserva activa para cancelar o no tienes permiso para hacerlo.');
    }
    const cancelledBooking = result.rows[0];

    // Disparador de la Lista de Espera
    const waitingListResult = await client.query(
      `SELECT wle.id, wle.user_id, u.name as user_name, u.email as user_email, wle.slot_start_time
       FROM waiting_list_entries wle
       JOIN users u ON wle.user_id = u.id
       WHERE wle.court_id = $1 AND wle.slot_start_time = $2 AND wle.status = 'waiting'
       ORDER BY wle.requested_at ASC
       LIMIT 1`,
      [cancelledBooking.court_id, cancelledBooking.start_time]
    );

    if (waitingListResult.rows.length > 0) {
      const luckyUser = waitingListResult.rows[0];
      const confirmationToken = crypto.randomBytes(32).toString('hex');
      const expires_at = new Date(Date.now() + 30 * 60 * 1000); // 30 minutos

      await client.query(
        "UPDATE waiting_list_entries SET status = 'notified', confirmation_token = $1, notification_expires_at = $2, notification_sent_at = NOW() WHERE id = $3",
        [confirmationToken, expires_at, luckyUser.id]
      );
      
      const confirmationUrl = `http://${process.env.PUBLIC_IP || '10.10.10.2'}:3000/confirm-booking.html?token=${confirmationToken}`;
      sendEmail({
        to: luckyUser.user_email,
        subject: '¡Un hueco se ha liberado en Padel@Home!',
        html: `<h3>¡Hola, ${luckyUser.user_name}!</h3><p>Se ha liberado el horario por el que estabas esperando.</p><p>Tienes <strong>30 minutos</strong> para confirmar la reserva.</p><a href="${confirmationUrl}">Confirmar mi Reserva</a>`
      });
      console.log(`Notificación de lista de espera enviada al usuario ${luckyUser.user_id}`);
    }

    await client.query('COMMIT');
    res.json({ message: 'Reserva cancelada exitosamente.' });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error al cancelar la reserva:', error);
    res.status(400).json({ message: error.message || 'Error interno del servidor.' });
  } finally {
    client.release();
  }
};

module.exports = {
  createBooking,
  getMyBooking,
  cancelMyBooking,
};
4.5 Módulo de Pistas (Courts)
src/api/courtRoutes.js
JavaScript

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
src/controllers/courtController.js
JavaScript

const pool = require('../config/database');

const getAllCourts = async (req, res) => {
  try {
    const { rows } = await pool.query("SELECT * FROM courts ORDER BY name");
    // Filtramos solo las activas si el usuario no es admin
    if (req.user.role !== 'admin') {
      res.json(rows.filter(court => court.is_active));
    } else {
      res.json(rows); // El admin las ve todas
    }
  } catch (error) {
    console.error('Error al obtener las pistas:', error);
    res.status(500).json({ message: 'Error interno del servidor.' });
  }
};

const createCourt = async (req, res) => {
  const { name, description } = req.body;
  if (!name) {
    return res.status(400).json({ message: 'El nombre de la pista es requerido.' });
  }
  try {
    const { rows } = await pool.query(
      "INSERT INTO courts (name, description) VALUES ($1, $2) RETURNING *",
      [name, description]
    );
    res.status(201).json(rows[0]);
  } catch (error) {
    console.error('Error al crear la pista:', error);
    res.status(500).json({ message: 'Error interno del servidor.' });
  }
};

const updateCourt = async (req, res) => {
  try {
    const { courtId } = req.params;
    const { name, description, is_active } = req.body;
    const { rows } = await pool.query(
      "UPDATE courts SET name = $1, description = $2, is_active = $3, updated_at = NOW() WHERE id = $4 RETURNING *",
      [name, description, is_active, courtId]
    );
    if (rows.length === 0) {
      return res.status(404).json({ message: 'Pista no encontrada.' });
    }
    res.json(rows[0]);
  } catch (error) {
    console.error('Error al actualizar la pista:', error);
    res.status(500).json({ message: 'Error interno del servidor.' });
  }
};

module.exports = {
  getAllCourts,
  createCourt,
  updateCourt,
};

4. Código Fuente del Backend (Final)
4.6 Módulo de Administración (Admin)
src/api/adminRoutes.js
JavaScript

const express = require('express');
const router = express.Router();
const {
  getAllUsers,
  approveUser,
  updateUserStatus,
  inviteUser,
  createBuilding,
  getAllBuildings,
  updateBuilding,
  deleteBuilding,
  createBlockedPeriod,
  deleteBlockedPeriod,
  getBlockedPeriods,
  getSettings,
  updateSettings,
} = require('../controllers/adminController');
const { protect, isAdmin } = require('../middleware/authMiddleware');

// Rutas de Gestión de Usuarios
router.get('/users', protect, isAdmin, getAllUsers);
router.post('/users/invite', protect, isAdmin, inviteUser);
router.put('/users/:userId/approve', protect, isAdmin, approveUser);
router.put('/users/:userId/status', protect, isAdmin, updateUserStatus);

// Rutas de Gestión de Edificios (CRUD)
router.post('/buildings', protect, isAdmin, createBuilding);
router.get('/buildings', protect, isAdmin, getAllBuildings);
router.put('/buildings/:buildingId', protect, isAdmin, updateBuilding);
router.delete('/buildings/:buildingId', protect, isAdmin, deleteBuilding);

// Rutas de Gestión de Bloqueos
router.get('/blocked-periods', protect, isAdmin, getBlockedPeriods);
router.post('/blocked-periods', protect, isAdmin, createBlockedPeriod);
router.delete('/blocked-periods/:blockedPeriodId', protect, isAdmin, deleteBlockedPeriod);

// Rutas de Gestión de Ajustes
router.get('/settings', protect, isAdmin, getSettings);
router.put('/settings', protect, isAdmin, updateSettings);

module.exports = router;
src/controllers/adminController.js
JavaScript

const pool = require('../config/database');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const sendEmail = require('../services/emailService');

// --- Funciones de Gestión de Usuarios ---
const getAllUsers = async (req, res) => {
  try {
    const { status, search } = req.query;
    let query = `SELECT u.id, u.name, u.email, u.floor, u.door, u.phone_number, u.role, u.account_status, b.address as building_address FROM users u LEFT JOIN buildings b ON u.building_id = b.id`;
    const queryParams = [];
    if (status || search) {
      query += " WHERE";
      let paramIndex = 1;
      if (status) {
        query += ` u.account_status = $${paramIndex}`;
        queryParams.push(status);
        paramIndex++;
      }
      if (search) {
        if(queryParams.length > 0) query += " AND";
        query += ` (u.name ILIKE $${paramIndex} OR u.email ILIKE $${paramIndex})`;
        queryParams.push(`%${search}%`);
      }
    }
    query += " ORDER BY u.created_at DESC";
    const { rows } = await pool.query(query, queryParams);
    res.json(rows);
  } catch (error) {
    console.error('Error al obtener usuarios:', error);
    res.status(500).json({ message: 'Error interno del servidor.' });
  }
};

const approveUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const result = await pool.query("UPDATE users SET account_status = 'active' WHERE id = $1 AND account_status = 'pending_approval' RETURNING *", [userId]);
    if (result.rows.length === 0) return res.status(404).json({ message: 'Usuario no encontrado o ya está activo.' });
    const approvedUser = result.rows[0];
    sendEmail({ to: approvedUser.email, subject: '¡Tu cuenta en Padel@Home ha sido aprobada!', html: `<h3>¡Hola, ${approvedUser.name}!</h3><p>Tu cuenta ha sido aprobada. ¡Ya puedes iniciar sesión!</p>` });
    res.json({ message: 'Usuario aprobado exitosamente.', user: { id: approvedUser.id, name: approvedUser.name, account_status: approvedUser.account_status }});
  } catch (error) {
    console.error('Error al aprobar usuario:', error);
    res.status(500).json({ message: 'Error interno del servidor.' });
  }
};

const updateUserStatus = async (req, res) => {
  try {
    const { userId } = req.params;
    const { status } = req.body;
    if (!['active', 'inactive'].includes(status)) return res.status(400).json({ message: 'El estado proporcionado no es válido.' });
    const result = await pool.query("UPDATE users SET account_status = $1 WHERE id = $2 RETURNING id, name, account_status", [status, userId]);
    if (result.rows.length === 0) return res.status(404).json({ message: 'Usuario no encontrado.' });
    res.json({ message: `El estado del usuario ha sido actualizado a '${status}'.`, user: result.rows[0] });
  } catch (error) {
    console.error('Error al actualizar el estado del usuario:', error);
    res.status(500).json({ message: 'Error interno del servidor.' });
  }
};

const inviteUser = async (req, res) => {
  const { name, email, building_id, floor, door, phone_number } = req.body;
  if (!name || !email || !building_id) return res.status(400).json({ message: 'Nombre, email y edificio son requeridos.' });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const tempPassword = crypto.randomBytes(20).toString('hex');
    const password_hash = await bcrypt.hash(tempPassword, 10);
    const newUserResult = await client.query("INSERT INTO users (name, email, password_hash, building_id, floor, door, phone_number, account_status) VALUES ($1, $2, $3, $4, $5, $6, $7, 'active') RETURNING id, name, email", [name, email, password_hash, parseInt(building_id), floor, door, phone_number]);
    const newUser = newUserResult.rows[0];
    const resetToken = crypto.randomBytes(32).toString('hex');
    const expires_at = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await client.query("INSERT INTO password_reset_tokens (token, user_id, expires_at) VALUES ($1, $2, $3)", [resetToken, newUser.id, expires_at]);
    const setPasswordUrl = `http://${process.env.PUBLIC_IP || '10.10.10.2'}:3000/reset-password.html?token=${resetToken}`;
    sendEmail({ to: newUser.email, subject: '¡Bienvenido a Padel@Home! Establece tu contraseña', html: `<h3>¡Hola, ${newUser.name}!</h3><p>Un administrador te ha creado una cuenta en Padel@Home.</p><p>Por favor, haz clic en el siguiente enlace para establecer tu contraseña. El enlace es válido por 24 horas.</p><a href="${setPasswordUrl}">Establecer mi contraseña</a>`});
    await client.query('COMMIT');
    res.status(201).json({ message: 'Usuario invitado exitosamente.', user: newUser });
  } catch (error) {
    await client.query('ROLLBACK');
    if (error.code === '23505') return res.status(400).json({ message: 'El correo electrónico ya está en uso.' });
    console.error('Error al invitar usuario:', error);
    res.status(500).json({ message: 'Error interno del servidor.' });
  } finally {
    client.release();
  }
};

// --- Funciones de Gestión de Edificios ---
const createBuilding = async (req, res) => {
  const { address, description } = req.body;
  if (!address) return res.status(400).json({ message: 'La dirección del edificio es requerida.' });
  try {
    const { rows } = await pool.query("INSERT INTO buildings (address, description) VALUES ($1, $2) RETURNING *", [address, description]);
    res.status(201).json(rows[0]);
  } catch (error) {
    console.error('Error al crear el edificio:', error);
    res.status(500).json({ message: 'Error interno del servidor.' });
  }
};

const getAllBuildings = async (req, res) => {
  try {
    const { rows } = await pool.query("SELECT * FROM buildings ORDER BY address ASC");
    res.json(rows);
  } catch (error) {
    console.error('Error al obtener los edificios:', error);
    res.status(500).json({ message: 'Error interno del servidor.' });
  }
};

const updateBuilding = async (req, res) => {
  try {
    const { buildingId } = req.params;
    const { address, description } = req.body;
    const { rows } = await pool.query("UPDATE buildings SET address = $1, description = $2, updated_at = NOW() WHERE id = $3 RETURNING *", [address, description, buildingId]);
    if (rows.length === 0) return res.status(404).json({ message: 'Edificio no encontrado.' });
    res.json(rows[0]);
  } catch (error) {
    console.error('Error al actualizar el edificio:', error);
    res.status(500).json({ message: 'Error interno del servidor.' });
  }
};

const deleteBuilding = async (req, res) => {
  try {
    const { buildingId } = req.params;
    const result = await pool.query("DELETE FROM buildings WHERE id = $1", [buildingId]);
    if (result.rowCount === 0) return res.status(404).json({ message: 'Edificio no encontrado.' });
    res.json({ message: 'Edificio eliminado exitosamente.' });
  } catch (error) {
    console.error('Error al eliminar el edificio:', error);
    res.status(500).json({ message: 'Error interno del servidor.' });
  }
};

// --- Funciones de Gestión de Bloqueos ---
const createBlockedPeriod = async (req, res) => {
  const { courtId, startTime, endTime, reason, is_full_day } = req.body;
  if (!courtId || !startTime || !endTime) return res.status(400).json({ message: 'courtId, startTime y endTime son requeridos.' });
  try {
    const { rows } = await pool.query("INSERT INTO blocked_periods (court_id, start_time, end_time, reason, is_full_day) VALUES ($1, $2, $3, $4, $5) RETURNING *", [courtId, startTime, endTime, reason, is_full_day || false]);
    res.status(201).json(rows[0]);
  } catch (error) {
    console.error('Error al crear período de bloqueo:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

const deleteBlockedPeriod = async (req, res) => {
  try {
    const { blockedPeriodId } = req.params;
    const result = await pool.query("DELETE FROM blocked_periods WHERE id = $1", [blockedPeriodId]);
    if (result.rowCount === 0) return res.status(404).json({ message: 'Período de bloqueo no encontrado.' });
    res.json({ message: 'Período de bloqueo eliminado exitosamente.' });
  } catch (error) {
    console.error('Error al eliminar período de bloqueo:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

const getBlockedPeriods = async (req, res) => {
  try {
    const { rows } = await pool.query("SELECT bp.*, c.name as court_name FROM blocked_periods bp JOIN courts c ON c.id = bp.court_id WHERE bp.end_time > NOW() ORDER BY bp.start_time ASC");
    res.json(rows);
  } catch (error) {
    console.error('Error al obtener períodos de bloqueo:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

// --- Funciones de Gestión de Ajustes ---
const getSettings = async (req, res) => {
  try {
    const { rows } = await pool.query("SELECT setting_key, setting_value FROM instance_settings");
    const settingsObject = rows.reduce((acc, row) => { acc[row.setting_key] = row.setting_value; return acc; }, {});
    res.json(settingsObject);
  } catch (error) {
    console.error('Error al obtener los ajustes:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

const updateSettings = async (req, res) => {
  const settingsToUpdate = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const key in settingsToUpdate) {
      const value = settingsToUpdate[key];
      await client.query("UPDATE instance_settings SET setting_value = $1, updated_at = NOW() WHERE setting_key = $2", [value, key]);
    }
    await client.query('COMMIT');
    res.json({ message: 'Ajustes actualizados exitosamente.' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error al actualizar los ajustes:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  } finally {
    client.release();
  }
};


// --- Exportamos TODAS las funciones del controlador ---
module.exports = {
  getAllUsers,
  approveUser,
  updateUserStatus,
  inviteUser,
  createBuilding,
  getAllBuildings,
  updateBuilding,
  deleteBuilding,
  createBlockedPeriod,
  deleteBlockedPeriod,
  getBlockedPeriods,
  getSettings,
  updateSettings,
};
4.7 Módulo de Lista de Espera
src/api/waitingListRoutes.js
JavaScript

const express = require('express');
const router = express.Router();
const { joinWaitingList, confirmBookingFromWaitlist } = require('../controllers/waitingListController');
const { protect } = require('../middleware/authMiddleware');

// POST /api/waiting-list - Apuntarse a la lista de espera
router.post('/', protect, joinWaitingList);

// POST /api/waiting-list/confirm - Confirmar la reserva desde el email
router.post('/confirm', confirmBookingFromWaitlist);

module.exports = router;
src/controllers/waitingListController.js
JavaScript

const pool = require('../config/database');

const joinWaitingList = async (req, res) => {
  const userId = req.user.id;
  const { courtId, slotStartTime, slotEndTime } = req.body;
  if (!courtId || !slotStartTime || !slotEndTime) {
    return res.status(400).json({ message: 'Se requiere courtId, slotStartTime y slotEndTime.' });
  }
  try {
    const bookingResult = await pool.query("SELECT id FROM bookings WHERE court_id = $1 AND start_time = $2 AND status = 'confirmed'", [courtId, slotStartTime]);
    if (bookingResult.rows.length === 0) {
      return res.status(400).json({ message: 'Este horario no está ocupado o ya no existe.' });
    }
    const existingEntry = await pool.query("SELECT id FROM waiting_list_entries WHERE user_id = $1 AND court_id = $2 AND slot_start_time = $3", [userId, courtId, slotStartTime]);
    if (existingEntry.rows.length > 0) {
      return res.status(400).json({ message: 'Ya estás en la lista de espera para este horario.' });
    }
    const { rows } = await pool.query("INSERT INTO waiting_list_entries (court_id, user_id, slot_start_time, slot_end_time) VALUES ($1, $2, $3, $4) RETURNING *", [courtId, userId, slotStartTime, slotEndTime]);
    res.status(201).json({ message: 'Te has apuntado a la lista de espera correctamente.', entry: rows[0] });
  } catch (error) {
    console.error('Error al unirse a la lista de espera:', error);
    res.status(500).json({ message: 'Error interno del servidor.' });
  }
};

const confirmBookingFromWaitlist = async (req, res) => {
  const { token } = req.body;
  if (!token) {
    return res.status(400).json({ message: 'Falta el token.' });
  }
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const entryResult = await client.query("SELECT * FROM waiting_list_entries WHERE confirmation_token = $1 AND status = 'notified' AND notification_expires_at > NOW()", [token]);
    if (entryResult.rows.length === 0) {
      throw new Error('El enlace de confirmación es inválido o ha expirado.');
    }
    const entry = entryResult.rows[0];
    const bookingResult = await client.query("SELECT id FROM bookings WHERE court_id = $1 AND start_time = $2 AND status = 'confirmed'", [entry.court_id, entry.slot_start_time]);
    if (bookingResult.rows.length > 0) {
      throw new Error('Lo sentimos, alguien ha reservado este slot justo antes que tú.');
    }
    await client.query("INSERT INTO bookings (court_id, user_id, start_time, end_time, status) VALUES ($1, $2, $3, $4, 'confirmed')", [entry.court_id, entry.user_id, entry.slot_start_time, entry.slot_end_time]);
    await client.query("UPDATE waiting_list_entries SET status = 'confirmed' WHERE id = $1", [entry.id]);
    await client.query('COMMIT');
    res.status(201).json({ message: '¡Reserva confirmada exitosamente!' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error("Error al confirmar desde lista de espera:", error);
    res.status(400).json({ message: error.message });
  } finally {
    client.release();
  }
};

module.exports = {
  joinWaitingList,
  confirmBookingFromWaitlist,
};
4.8 Módulo de Partidas Abiertas (Matches)
src/api/matchRoutes.js
JavaScript

const express = require('express');
const router = express.Router();
const { joinOpenMatch, leaveOpenMatch } = require('../controllers/matchController');
const { protect } = require('../middleware/authMiddleware');

// POST /api/matches/:bookingId/join - Unirse a una partida abierta
router.post('/:bookingId/join', protect, joinOpenMatch);

// DELETE /api/matches/:bookingId/leave - Abandonar una partida abierta
router.delete('/:bookingId/leave', protect, leaveOpenMatch);

module.exports = router;
src/controllers/matchController.js
JavaScript

const pool = require('../config/database');

const joinOpenMatch = async (req, res) => {
  const userId = req.user.id;
  const { bookingId } = req.params;
  if (!bookingId || isNaN(parseInt(bookingId))) {
    return res.status(400).json({ message: 'El ID de la partida proporcionado no es válido.' });
  }
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const bookingResult = await client.query("SELECT * FROM bookings WHERE id = $1 AND status = 'confirmed' FOR UPDATE", [bookingId]);
    if (bookingResult.rows.length === 0) throw new Error('Esta partida ya no existe o ha sido cancelada.');
    
    const booking = bookingResult.rows[0];
    if (!booking.is_open_match) throw new Error('Esta reserva no es una partida abierta.');
    if (booking.user_id === userId) throw new Error('No puedes unirte a tu propia partida, ya eres el organizador.');

    const participantsResult = await client.query("SELECT user_id FROM match_participants WHERE booking_id = $1", [bookingId]);
    if (participantsResult.rows.length >= booking.max_participants) throw new Error('Esta partida ya está completa.');
    
    const isAlreadyJoined = participantsResult.rows.some(p => p.user_id == userId);
    if (isAlreadyJoined) throw new Error('Ya te has unido a esta partida.');

    await client.query("INSERT INTO match_participants (booking_id, user_id) VALUES ($1, $2)", [bookingId, userId]);
    await client.query('COMMIT');
    res.status(200).json({ message: 'Te has unido a la partida con éxito.' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error al unirse a la partida:', error);
    res.status(400).json({ message: error.message || 'Error al procesar la solicitud.' });
  } finally {
    client.release();
  }
};

const leaveOpenMatch = async (req, res) => {
  const userId = req.user.id;
  const { bookingId } = req.params;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const participantResult = await client.query("SELECT * FROM match_participants WHERE booking_id = $1 AND user_id = $2", [bookingId, userId]);
    if (participantResult.rowCount === 0) {
      throw new Error("No estás unido a esta partida.");
    }
    await client.query("DELETE FROM match_participants WHERE booking_id = $1 AND user_id = $2", [bookingId, userId]);
    // TODO: Lógica de reglas de negocio (nombrar nuevo organizador, cancelación < 6h).
    await client.query('COMMIT');
    res.json({ message: 'Has abandonado la partida correctamente.' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error al abandonar la partida:', error);
    res.status(400).json({ message: error.message });
  } finally {
    client.release();
  }
};

module.exports = {
  joinOpenMatch,
  leaveOpenMatch,
};

5. Código Fuente del Frontend (Carpeta public/)
5.1 Hoja de Estilos Global (public/style.css)
Este archivo define la apariencia visual de toda la aplicación.

CSS

/* --- 1. Definición de Variables (Nuestra Paleta de Colores) --- */
:root {
  --primary-color: #0d6efd;      /* Azul profesional */
  --secondary-color: #6c757d;   /* Gris neutro */
  --accent-color: #527853;       /* Verde salvia (sage green) */
  --background-color: #f8f9fa;  /* Gris muy claro de fondo */
  --surface-color: #ffffff;     /* Blanco para "tarjetas" */
  --text-color: #212529;        /* Negro/gris oscuro de texto */
  --border-color: #dee2e6;      /* Gris claro de bordes */
  --success-color: #198754;     /* Verde de éxito */
  --danger-color: #dc3545;       /* Rojo de error/peligro */
}

/* --- 2. Estilos Globales y Reset Básico --- */
body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  margin: 0;
  background-color: var(--background-color);
  color: var(--text-color);
  line-height: 1.5;
}

h1, h2, h3 {
  color: var(--primary-color);
  font-weight: 500;
}

/* --- 3. Clases de Utilidad --- */
.container {
  max-width: 960px;
  margin: 20px auto;
  padding: 0 15px;
}

.card {
  background-color: var(--surface-color);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 24px;
  margin-bottom: 20px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
}

.hidden {
  display: none !important;
}

/* --- Estilos para Botones --- */
button {
  background-color: var(--primary-color);
  color: white;
  border: none;
  padding: 10px 15px;
  border-radius: 5px;
  cursor: pointer;
  font-size: 1em;
  transition: background-color 0.2s ease;
}
button:hover { background-color: #0b5ed7; }

/* --- Estilos para Formularios --- */
.form-group {
  margin-bottom: 1.5em;
}
.form-group label {
  display: block;
  margin-bottom: 0.5em;
  font-weight: 500;
}
input[type="text"], input[type="email"], input[type="password"],
input[type="tel"], input[type="date"], input[type="time"],
input[type="number"], input[type="datetime-local"],
textarea, select {
  width: 100%;
  padding: 10px;
  border: 1px solid var(--border-color);
  border-radius: 5px;
  box-sizing: border-box;
  font-size: 1em;
}

/* --- Estilos para Páginas de Login/Registro --- */
.auth-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  padding: 20px;
  box-sizing: border-box;
}
.auth-card {
  width: 100%;
  max-width: 400px;
}
.auth-card h1 { text-align: center; margin-bottom: 0.5em; }
.auth-card p { text-align: center; color: var(--secondary-color); margin-top: 0; margin-bottom: 2em; }
button.full-width { width: 100%; padding: 12px; font-size: 1.1em; margin-top: 1em; }
.switch-form-text { text-align: center; margin-top: 1.5em; }
a { color: var(--primary-color); text-decoration: none; }
a:hover { text-decoration: underline; }
.error-text { color: var(--danger-color); text-align: center; font-weight: bold; }
.success-text { color: var(--success-color); text-align: center; font-weight: bold; }

/* --- Estilos para el Dashboard --- */
.main-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}
.header-buttons { display: flex; gap: 10px; }
#logout-button { background-color: var(--secondary-color); }
#logout-button:hover { background-color: #5c636a; }
button#cancel-booking-btn { background-color: var(--danger-color); }
button#cancel-booking-btn:hover { background-color: #bb2d3b; }
button#leave-match-btn { background-color: var(--secondary-color); }

/* --- Estilos para el Calendario Semanal --- */
.calendar-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1em;
}
#weekly-calendar-container { overflow-x: auto; }
.calendar-grid {
  display: grid;
  grid-template-columns: 60px repeat(7, 1fr); 
  gap: 2px;
  background-color: var(--border-color);
  border: 1px solid var(--border-color);
}
.grid-cell {
  background-color: var(--surface-color);
  padding: 8px;
  min-height: 40px;
  font-size: 0.85em;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  text-align: center;
}
.day-header, .time-header {
  background-color: #e9ecef;
  font-weight: bold;
  position: sticky; top: 0; z-index: 10;
}
.time-header { left: 0; z-index: 20; }
.slot { cursor: pointer; transition: transform 0.1s ease; }
.slot:hover { transform: scale(1.05); z-index: 30; }

/* Colores de estado del slot */
.slot.available { background-color: #d4edda; }
.slot.open-match { background-color: #fff3cd; }
.slot.booked { background-color: #f8d7da; color: #58151d; }
.slot.blocked { background-color: #6c757d; color: white; }
.slot button.join-waitlist-btn {
  background-color: var(--primary-color);
  color: white;
  font-size: 0.9em;
  padding: 3px 6px;
  margin-top: 5px;
  border: none;
  border-radius: 3px;
}
.legend { display: flex; flex-wrap: wrap; gap: 15px; margin-top: 15px; font-size: 0.9em; }
.color-box { display: inline-block; width: 15px; height: 15px; border: 1px solid #ccc; vertical-align: middle; margin-right: 5px;}
.color-box.available { background-color: #d4edda; }
.color-box.open-match { background-color: #fff3cd; }
.color-box.booked { background-color: #f8d7da; }

/* --- Estilos para los Modales --- */
#modal-overlay, #waitlist-modal-overlay, #join-match-modal-overlay {
  position: fixed; top: 0; left: 0; width: 100%; height: 100%;
  background-color: rgba(0, 0, 0, 0.6);
  display: flex; justify-content: center; align-items: center;
  z-index: 1000;
}
#booking-modal, #waitlist-modal, #join-match-modal {
  width: 100%; max-width: 450px; text-align: center;
}
.open-match-toggle {
  display: flex; align-items: center; justify-content: center;
  gap: 10px; background-color: #f8f9fa; padding: 10px;
  border-radius: 5px; margin-bottom: 1em;
}
#modal-options-container, #waitlist-modal-options, #join-match-modal-options {
  display: flex; justify-content: center; gap: 15px; margin: 20px 0;
}
#modal-options-container button, #waitlist-join-btn, #join-match-confirm-btn {
  background-color: var(--success-color);
}
#modal-cancel-btn, #waitlist-cancel-btn, #join-match-cancel-btn {
  background-color: var(--secondary-color);
}

/* --- Estilos para el Panel de Administración --- */
.admin-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}
.admin-card { display: flex; flex-direction: column; }
.full-width-card { grid-column: 1 / -1; }
table { width: 100%; border-collapse: collapse; margin-top: 1em; }
th, td { border: 1px solid var(--border-color); padding: 8px 12px; text-align: left; vertical-align: middle; }
th { background-color: #f8f9fa; font-weight: 600; }
tr:nth-child(even) { background-color: #f8f9fa; }
td button { padding: 5px 10px; margin-right: 5px; font-size: 0.9em; }
#courts-list-container ul, #blocks-list-container ul, #buildings-list-container ul {
  list-style-type: none; padding: 0;
}
#courts-list-container li, #blocks-list-container li, #buildings-list-container li {
  padding: 10px; border-bottom: 1px solid var(--border-color);
}
#courts-list-container li:last-child, #blocks-list-container li:last-child, #buildings-list-container li:last-child {
  border-bottom: none;
}
.form-buttons { margin-top: 1em; }
.settings-grid {
  display: grid; grid-template-columns: 1fr 1fr;
  gap: 20px; margin: 1em 0;
}
#court-active-div, .settings-grid .form-group {
    display: flex; align-items: center; gap: 10px;
}

5. Código Fuente del Frontend (Continuación)
5.2 Páginas de Autenticación y Perfil
public/login.html
HTML

<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Padel@Home - Login</title>
  <link rel="stylesheet" href="/style.css">
  <link rel="manifest" href="/manifest.json">
</head>
<body>
  <div class="auth-container">
    <div class="card auth-card">
      <h1>Iniciar Sesión</h1>
      <p>Bienvenido a Padel@Home</p>

      <form id="login-form">
        <div class="form-group">
          <label for="email">Correo Electrónico:</label>
          <input type="email" id="email" name="email" required>
        </div>
        <div class="form-group">
          <label for="password">Contraseña:</label>
          <input type="password" id="password" name="password" required>
        </div>
        <button type="submit" class="full-width">Iniciar Sesión</button>
      </form>

      <p id="error-message" class="error-text"></p>
  
      <div class="switch-form-text">
        <p>¿Olvidaste tu contraseña? <a href="/forgot-password.html">Restablécela aquí</a>.</p>
        <p id="register-link-container" style="display: none;">¿No tienes una cuenta? <a href="/register.html">Regístrate aquí</a>.</p>
      </div>
    </div>
  </div>

  <script src="login.js"></script>
  <script src="main.js"></script>
</body>
</html>
public/login.js
JavaScript

document.addEventListener('DOMContentLoaded', () => {
    // La IP se debe reemplazar por la IP pública o dominio en producción
    const API_BASE_URL = 'http://10.10.10.2:3000';

    const loginForm = document.getElementById('login-form');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const errorMessage = document.getElementById('error-message');
    const registerLink = document.getElementById('register-link-container');

    // Comprobamos si el registro público está habilitado
    const checkRegistrationStatus = async () => {
        try {
            // Asumimos que el admin puede habilitar/deshabilitar esto en los ajustes
            // Por ahora, lo mostramos, pero la lógica de 'inviteUser' es la principal
            // const response = await fetch(`${API_BASE_URL}/api/admin/settings`);
            // const settings = await response.json();
            // if (settings.allow_public_registration === 'true') {
            //   registerLink.style.display = 'block';
            // }
            // Como el flujo principal es por invitación, lo dejamos oculto o lo quitamos.
            // Para este ejemplo, lo dejaremos oculto.
        } catch (e) {
            console.error("No se pudo verificar el estado del registro.");
        }
    };
    checkRegistrationStatus();


    loginForm.addEventListener('submit', async (event) => {
        event.preventDefault(); 
        const email = emailInput.value;
        const password = passwordInput.value;
        errorMessage.textContent = '';

        try {
            const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            });

            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.message || 'Error al iniciar sesión');
            }

            localStorage.setItem('authToken', data.token);
            window.location.href = '/dashboard.html'; // Redirigir al dashboard

        } catch (error) {
            errorMessage.textContent = error.message;
        }
    });
});
public/register.html
(Esta página es para el registro público, que hemos decidido deshabilitar por defecto, pero el código existe).

HTML

<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Padel@Home - Registro</title>
  <link rel="stylesheet" href="/style.css">
  <link rel="manifest" href="/manifest.json">
</head>
<body>
  <div class="auth-container">
    <div class="card auth-card">
      <h1>Registro de Nuevo Usuario</h1>
      <p>Crea tu cuenta. Deberá ser aprobada por un administrador.</p>

      <form id="register-form">
        <div class="form-group"><label for="name">Nombre Completo:</label><input type="text" id="name" required></div>
        <div class="form-group"><label for="email">Correo Electrónico:</label><input type="email" id="email" required></div>
        <div class="form-group"><label for="password">Contraseña:</label><input type="password" id="password" required></div>
        
        <div class="form-group"><label for="building">Edificio / Dirección:</label><input type="text" id="building"></div>
        <div class="form-group"><label for="floor">Piso:</label><input type="text" id="floor"></div>
        <div class="form-group"><label for="door">Puerta:</label><input type="text" id="door"></div>
        
        <button type="submit" class="full-width">Registrarse</button>
      </form>

      <p id="message" class="success-text"></p>

      <div class="switch-form-text">
        <p>¿Ya tienes una cuenta? <a href="/login.html">Inicia sesión</a>.</p>
      </div>
    </div>
  </div>

  <script src="register.js"></script>
  <script src="main.js"></script>
</body>
</html>
public/register.js
JavaScript

document.addEventListener('DOMContentLoaded', () => {
    const API_BASE_URL = 'http://10.10.10.2:3000';
    const registerForm = document.getElementById('register-form');
    const messageParagraph = document.getElementById('message');

    registerForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const data = {
            name: document.getElementById('name').value,
            email: document.getElementById('email').value,
            password: document.getElementById('password').value,
            building: document.getElementById('building').value,
            floor: document.getElementById('floor').value,
            door: document.getElementById('door').value,
        };

        messageParagraph.textContent = 'Enviando registro...';
        messageParagraph.className = '';

        try {
            const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.message);

            registerForm.reset();
            messageParagraph.className = 'success-text';
            messageParagraph.textContent = '¡Registro exitoso! Un administrador debe aprobar tu cuenta.';
            setTimeout(() => { window.location.href = '/login.html'; }, 5000);

        } catch (error) {
            messageParagraph.className = 'error-text';
            messageParagraph.textContent = error.message;
        }
    });
});
public/reset-password.html
(Esta página la usa tanto el flujo de "olvidé contraseña" como el de "invitar usuario").

HTML

<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Padel@Home - Restablecer Contraseña</title>
  <link rel="stylesheet" href="/style.css">
  <link rel="manifest" href="/manifest.json">
</head>
<body>
  <div class="auth-container">
    <div class="card auth-card">
      <h1>Establecer Nueva Contraseña</h1>
      <p>Por favor, introduce tu nueva contraseña.</p>

      <form id="reset-password-form">
        <div class="form-group">
          <label for="password">Nueva Contraseña:</label>
          <input type="password" id="password" required>
        </div>
        <div class="form-group">
          <label for="confirm-password">Confirmar Nueva Contraseña:</label>
          <input type="password" id="confirm-password" required>
        </div>
        <button type="submit" class="full-width">Guardar Contraseña</button>
      </form>
      <p id="message"></p>
    </div>
  </div>
  <script src="reset-password.js"></script>
  <script src="main.js"></script>
</body>
</html>
public/reset-password.js
JavaScript

document.addEventListener('DOMContentLoaded', () => {
    const API_BASE_URL = 'http://10.10.10.2:3000';
    const resetForm = document.getElementById('reset-password-form');
    const passwordInput = document.getElementById('password');
    const confirmPasswordInput = document.getElementById('confirm-password');
    const messageParagraph = document.getElementById('message');

    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');

    if (!token) {
        messageParagraph.textContent = 'Error: No se ha proporcionado un token válido.';
        messageParagraph.className = 'error-text';
    }

    resetForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const password = passwordInput.value;
        const confirmPassword = confirmPasswordInput.value;

        if (password !== confirmPassword) {
            messageParagraph.textContent = 'Las contraseñas no coinciden.';
            messageParagraph.className = 'error-text';
            return;
        }

        messageParagraph.textContent = 'Guardando...';
        messageParagraph.className = '';

        try {
            const response = await fetch(`${API_BASE_URL}/api/auth/reset-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token: token, newPassword: password })
            });

            const result = await response.json();
            if (!response.ok) throw new Error(result.message);

            messageParagraph.className = 'success-text';
            messageParagraph.textContent = '¡Contraseña actualizada con éxito! Serás redirigido al login.';
            setTimeout(() => { window.location.href = '/login.html'; }, 3000);

        } catch (error) {
            messageParagraph.className = 'error-text';
            messageParagraph.textContent = error.message;
        }
    });
});
public/confirm-booking.html
HTML

<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Padel@Home - Confirmar Reserva</title>
  <link rel="stylesheet" href="/style.css">
  <link rel="manifest" href="/manifest.json">
</head>
<body>
  <div class="auth-container">
    <div class="card auth-card">
      <h1 id="status-title">Confirmando tu Reserva...</h1>
      <p id="status-message">Por favor, espera un momento.</p>
      <a href="/login.html" id="login-link" style="display: none;">Ir a Iniciar Sesión</a>
    </div>
  </div>
  <script src="confirm-booking.js"></script>
  <script src="main.js"></script>
</body>
</html>
public/confirm-booking.js
JavaScript

document.addEventListener('DOMContentLoaded', () => {
    const API_BASE_URL = 'http://10.10.10.2:3000';
    const statusTitle = document.getElementById('status-title');
    const statusMessage = document.getElementById('status-message');
    const loginLink = document.getElementById('login-link');

    const confirmBooking = async () => {
        const urlParams = new URLSearchParams(window.location.search);
        const token = urlParams.get('token');

        if (!token) {
            statusTitle.textContent = 'Error';
            statusMessage.textContent = 'Falta el token de confirmación.';
            return;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/api/waiting-list/confirm`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token: token }),
            });
            
            const data = await response.json();
            if (!response.ok) throw new Error(data.message);
            
            statusTitle.textContent = '¡Reserva Confirmada!';
            statusTitle.style.color = 'var(--success-color)';
            statusMessage.textContent = 'Tu reserva se ha realizado con éxito. Ya puedes verla en tu dashboard.';
            loginLink.style.display = 'block';

        } catch (error) {
            statusTitle.textContent = 'Error en la Confirmación';
            statusTitle.style.color = 'var(--danger-color)';
            statusMessage.textContent = error.message;
        }
    };

    confirmBooking();
});

5. Código Fuente del Frontend (Continuación)
5.3 Página Principal del Usuario (Dashboard)
public/dashboard.html
(Esta es la estructura HTML completa que soporta el calendario semanal y todos los popups).

HTML

<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Padel@Home - Dashboard</title>
    <link rel="stylesheet" href="/style.css">
    <link rel="manifest" href="/manifest.json">
</head>
<body>
    <div class="container">
        <header class="main-header">
            <h1 id="welcome-message">Bienvenido a Padel@Home</h1>
            <div class="header-buttons">
                <button id="admin-panel-btn" style="display: none;">Panel de Admin</button>
                <button id="logout-button">Cerrar Sesión</button>
            </div>
        </header>
    
        <section class="card" id="my-booking-container">
            <h2>Mi Próxima Reserva</h2>
            <div id="my-booking">Cargando...</div>
        </section>
    
        <section class="card">
            <h2>Calendario Semanal de Disponibilidad</h2>
            <div class="calendar-header">
                <button id="prev-week-btn">&lt; Semana Anterior</button>
                <h3 id="week-dates-title">Cargando...</h3>
                <button id="next-week-btn">Semana Siguiente &gt;</button>
            </div>
            <div id="weekly-calendar-container">
                </div>
        </section>
    </div>

    <div id="modal-overlay" class="hidden">
        <div id="booking-modal" class="card">
            <h3 id="modal-title">Confirmar Reserva</h3>
            <p>Has seleccionado el horario de las <strong id="modal-time">--:--</strong>.</p>
            <div class="form-group open-match-toggle">
                <input type="checkbox" id="open-match-checkbox">
                <label for="open-match-checkbox">Abrir partida (4 jugadores)</label>
            </div>
            <p>Por favor, elige la duración:</p>
            <div id="modal-options-container">
                </div>
            <hr>
            <button id="modal-cancel-btn">Cancelar</button>
        </div>
    </div>
  
    <div id="waitlist-modal-overlay" class="hidden">
        <div id="waitlist-modal" class="card">
            <h3>Horario Ocupado</h3>
            <p>Este horario ya está reservado.</p>
            <p>¿Quieres que te notifiquemos si se libera?</p>
            <div id="waitlist-modal-options">
                <button id="waitlist-join-btn">Sí, agregarme a la lista</button>
                <button id="waitlist-cancel-btn">No, gracias</button>
            </div>
        </div>
    </div>

    <div id="join-match-modal-overlay" class="hidden">
        <div id="join-match-modal" class="card">
            <h3>Unirse a Partida Abierta</h3>
            <p>Has seleccionado una partida abierta para el <strong id="join-match-time">--:--</strong>.</p>
            <p>Participantes actuales: <strong id="join-match-participants">--/--</strong>.</p>
            <p>¿Quieres unirte a esta partida?</p>
            <div id="join-match-modal-options">
                <button id="join-match-confirm-btn">Sí, unirme</button>
                <button id="join-match-cancel-btn">No, gracias</button>
            </div>
        </div>
    </div>
  
    <script src="dashboard.js"></script>
    <script src="main.js"></script>
</body>
</html>
public/dashboard.js
(Este es el archivo JavaScript más complejo. Contiene toda la lógica para renderizar el calendario y manejar los tres popups interactivos).

JavaScript

document.addEventListener('DOMContentLoaded', () => {
    // --- 1. CONFIGURACIÓN INICIAL Y ELEMENTOS DEL DOM ---
    const API_BASE_URL = 'http://10.10.10.2:3000'; // IP de la Raspberry Pi
    const authToken = localStorage.getItem('authToken');

    // Elementos del DOM
    const welcomeMessage = document.getElementById('welcome-message');
    const logoutButton = document.getElementById('logout-button');
    const adminPanelBtn = document.getElementById('admin-panel-btn');
    const myBookingContainer = document.getElementById('my-booking');
    const prevWeekBtn = document.getElementById('prev-week-btn');
    const nextWeekBtn = document.getElementById('next-week-btn');
    const weekDatesTitle = document.getElementById('week-dates-title');
    const calendarContainer = document.getElementById('weekly-calendar-container');
    // Modal de Reserva
    const bookingModalOverlay = document.getElementById('modal-overlay');
    const bookingModalTime = document.getElementById('modal-time');
    const bookingModalOptions = document.getElementById('modal-options-container');
    const bookingModalCancelBtn = document.getElementById('modal-cancel-btn');
    const openMatchCheckbox = document.getElementById('open-match-checkbox');
    // Modal de Lista de Espera
    const waitlistModalOverlay = document.getElementById('waitlist-modal-overlay');
    const waitlistJoinBtn = document.getElementById('waitlist-join-btn');
    const waitlistCancelBtn = document.getElementById('waitlist-cancel-btn');
    // Modal de Partida Abierta
    const joinMatchModalOverlay = document.getElementById('join-match-modal-overlay');
    const joinMatchTime = document.getElementById('join-match-time');
    const joinMatchParticipants = document.getElementById('join-match-participants');
    const joinMatchConfirmBtn = document.getElementById('join-match-confirm-btn');
    const joinMatchCancelBtn = document.getElementById('join-match-cancel-btn');

    // --- 2. ESTADO GLOBAL ---
    let currentDisplayedDate = new Date();
    let weeklyScheduleData = {};

    // --- 3. FUNCIONES AUXILIARES ---
    const formatDate = (date) => new Date(date).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
    const formatTime = (date) => new Date(date).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', hour12: false });

    // --- 4. FUNCIONES PRINCIPALES ---
    const fetchUserProfile = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/users/me`, { headers: { 'Authorization': `Bearer ${authToken}` } });
            if (!response.ok) throw new Error('No se pudo obtener el perfil.');
            const user = await response.json();
            welcomeMessage.textContent = `Bienvenido, ${user.name}!`;
            if (user.role === 'admin') {
                adminPanelBtn.style.display = 'inline-block';
            }
        } catch (error) {
            console.error("Error en fetchUserProfile:", error);
        }
    };

    const fetchMyBooking = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/bookings/me`, { headers: { 'Authorization': `Bearer ${authToken}` } });
            if (!response.ok) throw new Error('Error al cargar tu reserva.');
            const booking = await response.json();
            if (booking) {
                const isOwner = booking.participation_type === 'owner';
                const buttonHtml = isOwner 
                    ? `<button id="cancel-booking-btn" data-booking-id="${booking.id}">Cancelar Reserva Completa</button>`
                    : `<button id="leave-match-btn" data-booking-id="${booking.id}">Abandonar Partida</button>`;
                myBookingContainer.innerHTML = `<p><strong>Pista:</strong> ${booking.court_name}<br><strong>Día:</strong> ${new Date(booking.start_time).toLocaleString('es-ES')}</p>${buttonHtml}`;
            } else {
                myBookingContainer.innerHTML = '<p>No tienes ninguna reserva activa.</p>';
            }
        } catch (error) {
            console.error('Error en fetchMyBooking:', error);
            myBookingContainer.innerHTML = '<p style="color:red;">No se pudo obtener tu reserva.</p>';
        }
    };

    const renderWeeklyCalendar = async (date) => {
        calendarContainer.innerHTML = '<p>Cargando calendario...</p>';
        const dateString = new Date(date).toISOString().split('T')[0];
        try {
            const response = await fetch(`${API_BASE_URL}/api/schedule/week?courtId=1&date=${dateString}`, { headers: { 'Authorization': `Bearer ${authToken}` } });
            if (!response.ok) throw new Error('No se pudo cargar el calendario.');
            const data = await response.json();
            weeklyScheduleData = data.schedule;
            weekDatesTitle.textContent = `Semana del ${formatDate(data.weekStart)} al ${formatDate(data.weekEnd)}`;
            
            const grid = document.createElement('div');
            grid.className = 'calendar-grid';
            const days = ['Horas', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
            days.forEach(day => {
                const dayCell = document.createElement('div'); dayCell.className = 'grid-cell day-header';
                dayCell.textContent = day; grid.appendChild(dayCell);
            });

            const weekDays = Object.keys(weeklyScheduleData).sort();
            if (weekDays.length === 0) throw new Error("No se recibieron datos del calendario.");
            
            const timeSlots = weeklyScheduleData[weekDays[0]];
            timeSlots.forEach((slot, timeIndex) => {
                const timeCell = document.createElement('div');
                timeCell.className = 'grid-cell time-header';
                timeCell.textContent = formatTime(new Date(slot.startTime));
                grid.appendChild(timeCell);

                weekDays.forEach(dayString => {
                    const currentSlotData = weeklyScheduleData[dayString][timeIndex];
                    const slotCell = document.createElement('div');
                    slotCell.className = 'grid-cell slot';
                    slotCell.dataset.starttime = currentSlotData.startTime;
                    
                    let cellContent = '';
                    switch (currentSlotData.status) {
                        case 'available':
                            slotCell.classList.add('available');
                            cellContent = 'Libre';
                            break;
                        case 'booked':
                            slotCell.classList.add('booked');
                            slotCell.dataset.waitlistable = 'true';
                            cellContent = 'Ocupado';
                            break;
                        case 'open_match_available':
                            slotCell.classList.add('open-match');
                            slotCell.dataset.action = 'join_match';
                            slotCell.dataset.bookingId = currentSlotData.bookingId;
                            slotCell.dataset.participants = currentSlotData.participants;
                            slotCell.dataset.maxParticipants = currentSlotData.maxParticipants;
                            cellContent = `Partida Abierta (${currentSlotData.participants}/${currentSlotData.maxParticipants})`;
                            break;
                        case 'open_match_full':
                            slotCell.classList.add('booked');
                            cellContent = `Partida Llena`;
                            break;
                        case 'blocked':
                            slotCell.classList.add('blocked');
                            cellContent = currentSlotData.reason || 'Bloqueado';
                            break;
                    }
                    slotCell.innerHTML = `<span>${cellContent}</span>`;
                    grid.appendChild(slotCell);
                });
            });
            
            calendarContainer.innerHTML = '';
            calendarContainer.appendChild(grid);
            const legend = document.createElement('div');
            legend.className = 'legend';
            legend.innerHTML = `<div><span class="color-box available"></span> Disponible</div> <div><span class="color-box open-match"></span> Partida Abierta</div> <div><span class="color-box booked"></span> Ocupado</div>`;
            calendarContainer.appendChild(legend);
        } catch (error) {
            console.error("Error al renderizar el calendario:", error);
            calendarContainer.innerHTML = `<p style="color:red;">${error.message}</p>`;
        }
    };
    
    const showBookingModal = (target) => {
        const startTime = target.dataset.starttime;
        const dateString = startTime.split('T')[0];
        const timeIndex = weeklyScheduleData[dateString]?.findIndex(slot => slot.startTime === startTime);
        if (timeIndex === -1 || !weeklyScheduleData[dateString]) return;
        const daySlots = weeklyScheduleData[dateString];
        const availableDurations = [];
        if (daySlots[timeIndex + 1]?.status === 'available') availableDurations.push(60);
        if (daySlots[timeIndex + 1]?.status === 'available' && daySlots[timeIndex + 2]?.status === 'available') availableDurations.push(90);
        if (availableDurations.length === 0) {
            alert('No hay suficiente tiempo continuo para una reserva completa (mínimo 60 min).');
            return;
        }
        openMatchCheckbox.checked = false;
        bookingModalTime.textContent = formatTime(new Date(startTime));
        bookingModalOptions.innerHTML = '';
        availableDurations.forEach(duration => {
            const button = document.createElement('button');
            button.textContent = `${duration} min`;
            button.dataset.duration = duration;
            button.dataset.startTime = startTime;
            bookingModalOptions.appendChild(button);
        });
        bookingModalOverlay.classList.remove('hidden');
    };

    const showWaitlistModal = (target) => {
        const startTime = target.dataset.starttime;
        waitlistJoinBtn.dataset.courtid = "1";
        waitlistJoinBtn.dataset.starttime = startTime;
        waitlistModalOverlay.classList.remove('hidden');
    };
    
    const showOpenMatchModal = (target) => {
        const { bookingId, participants, maxParticipants, starttime } = target.dataset;
        joinMatchTime.textContent = new Date(starttime).toLocaleString('es-ES');
        joinMatchParticipants.textContent = `${participants}/${maxParticipants}`;
        joinMatchConfirmBtn.dataset.bookingId = bookingId;
        joinMatchModalOverlay.classList.remove('hidden');
    };

    // --- 5. MANEJADORES DE EVENTOS (HANDLERS) ---
    const handleCalendarClick = (event) => {
        const target = event.target.closest('.slot');
        if (!target) return;
        if (target.classList.contains('available')) {
            showBookingModal(target);
        } else if (target.dataset.waitlistable === 'true') {
            showWaitlistModal(target);
        } else if (target.dataset.action === 'join_match') {
            showOpenMatchModal(target);
        }
    };
    
    const handleMyBookingActions = async (event) => {
        const target = event.target;
        const bookingId = target.dataset.bookingId;
        if (!bookingId) return;
        let url = '';
        let method = 'DELETE';
        let confirmMessage = '';
        if (target.id === 'cancel-booking-btn') {
            url = `${API_BASE_URL}/api/bookings/${bookingId}`;
            confirmMessage = '¿Estás seguro de que quieres cancelar esta reserva?';
        } else if (target.id === 'leave-match-btn') {
            url = `${API_BASE_URL}/api/matches/${bookingId}/leave`;
            confirmMessage = '¿Estás seguro de que quieres abandonar esta partida?';
        } else {
            return;
        }
        if (!confirm(confirmMessage)) return;
        try {
            const response = await fetch(url, { method, headers: { 'Authorization': `Bearer ${authToken}` } });
            if (!response.ok) { const data = await response.json(); throw new Error(data.message); }
            const data = await response.json();
            alert(data.message || 'Acción completada con éxito.');
            fetchMyBooking();
            renderWeeklyCalendar(currentDisplayedDate);
        } catch (error) {
            alert(`Error: ${error.message}`);
        }
    };
    
    const handleBookingModalAction = async (event) => {
        if (event.target.tagName !== 'BUTTON') return;
        const { startTime, duration } = event.target.dataset;
        const body = {
            courtId: 1,
            startTime: startTime,
            durationMinutes: parseInt(duration),
            isOpenMatch: openMatchCheckbox.checked,
            maxParticipants: openMatchCheckbox.checked ? 4 : null
        };
        try {
            const response = await fetch(`${API_BASE_URL}/api/bookings`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}` },
                body: JSON.stringify(body)
            });
            if (!response.ok) { const data = await response.json(); throw new Error(data.message); }
            alert('¡Reserva creada con éxito!');
            bookingModalOverlay.classList.add('hidden');
            renderWeeklyCalendar(currentDisplayedDate);
            fetchMyBooking();
        } catch (error) {
            alert(`Error al reservar: ${error.message}`);
        }
    };

    const handleWaitlistModalAction = async () => {
        const { courtid, starttime } = waitlistJoinBtn.dataset;
        const slotEndTime = new Date(new Date(starttime).getTime() + 30 * 60000).toISOString();
        try {
            const response = await fetch(`${API_BASE_URL}/api/waiting-list`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}` },
                body: JSON.stringify({ courtId: parseInt(courtid), slotStartTime: starttime, slotEndTime: slotEndTime })
            });
            if (!response.ok) { const data = await response.json(); throw new Error(data.message); }
            alert('¡Te has apuntado a la lista de espera con éxito!');
            waitlistModalOverlay.classList.add('hidden');
        } catch(error) {
            alert(`Error: ${error.message}`);
        }
    };
    
    const handleJoinMatchAction = async (event) => {
        const bookingId = event.target.dataset.bookingId;
        if (!bookingId || bookingId === 'undefined') {
            alert('Error: No se pudo identificar la partida. El ID es inválido.');
            return;
        }
        try {
            const response = await fetch(`${API_BASE_URL}/api/matches/${bookingId}/join`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${authToken}` }
            });
            if (!response.ok) { const data = await response.json(); throw new Error(data.message); }
            alert('¡Te has unido a la partida con éxito!');
            joinMatchModalOverlay.classList.add('hidden');
            renderWeeklyCalendar(currentDisplayedDate);
        } catch(error) {
            alert(`Error: ${error.message}`);
        }
    };
    
    // --- 6. LÓGICA DE INICIO Y ASIGNACIÓN DE EVENTOS ---
    
    const initializePage = () => {
        if (!authToken) {
            alert('Debes iniciar sesión para ver esta página.');
            window.location.href = '/login.html';
            return;
        }

        // Carga de datos inicial
        fetchUserProfile();
        fetchMyBooking();
        renderWeeklyCalendar(currentDisplayedDate);

        // Listeners de navegación y acciones generales
        logoutButton.addEventListener('click', () => { localStorage.removeItem('authToken'); window.location.href = '/login.html'; });
        adminPanelBtn.addEventListener('click', () => { window.location.href = '/admin.html'; });
        prevWeekBtn.addEventListener('click', () => { currentDisplayedDate.setDate(currentDisplayedDate.getDate() - 7); renderWeeklyCalendar(currentDisplayedDate); });
        nextWeekBtn.addEventListener('click', () => { currentDisplayedDate.setDate(currentDisplayedDate.getDate() + 7); renderWeeklyCalendar(currentDisplayedDate); });
        
        // Listeners principales para delegación de eventos
        myBookingContainer.addEventListener('click', handleMyBookingActions);
        calendarContainer.addEventListener('click', handleCalendarClick);
        
        // Listeners para cerrar los modales
        bookingModalOverlay.addEventListener('click', (event) => { if (event.target === bookingModalOverlay) bookingModalOverlay.classList.add('hidden'); });
        bookingModalCancelBtn.addEventListener('click', () => { bookingModalOverlay.classList.add('hidden'); });
        waitlistModalOverlay.addEventListener('click', (event) => { if (event.target.id === 'waitlist-modal-overlay') waitlistModalOverlay.classList.add('hidden'); });
        waitlistCancelBtn.addEventListener('click', () => { waitlistModalOverlay.classList.add('hidden'); });
        joinMatchModalOverlay.addEventListener('click', (event) => { if (event.target.id === 'join-match-modal-overlay') joinMatchModalOverlay.classList.add('hidden'); });
        joinMatchCancelBtn.addEventListener('click', () => { joinMatchModalOverlay.classList.add('hidden'); });

        // Listeners para los botones de ACCIÓN de los modales
        bookingModalOptions.addEventListener('click', handleBookingModalAction);
        waitlistJoinBtn.addEventListener('click', handleWaitlistModalAction);
        joinMatchConfirmBtn.addEventListener('click', handleJoinMatchAction);
    };

    // Envuelve toda la inicialización en un listener que se asegura de que el HTML está listo
    initializePage();
});


5. Código Fuente del Frontend (Continuación)
5.4 Página del Panel de Administración
public/admin.html
HTML

<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Padel@Home - Panel de Admin</title>
  <link rel="stylesheet" href="/style.css">
  <link rel="manifest" href="/manifest.json">
</head>
<body>
  <div class="container">
    <header class="main-header">
      <h1>Panel de Administración</h1>
      <p>Bienvenido, <span id="admin-name"></span>. (<a href="#" id="logout-button">Cerrar Sesión</a>)</p>
    </header>

    <main class="admin-grid">
      <section class="card admin-card">
        <h2>Gestión de Usuarios</h2>
        <div id="invite-user-section">
          <h3>Invitar Nuevo Usuario</h3>
          <form id="invite-user-form">
            <div class="form-group"><label for="invite-name">Nombre:</label><input type="text" id="invite-name" required></div>
            <div class="form-group"><label for="invite-email">Email:</label><input type="email" id="invite-email" required></div>
            <div class="form-group"><label for="invite-building">Edificio:</label><select id="invite-building" required></select></div>
            <div class="form-group"><label for="invite-floor">Piso:</label><input type="text" id="invite-floor" required></div>
            <div class="form-group"><label for="invite-door">Puerta:</label><input type="text" id="invite-door" required></div>
            <button type="submit">Enviar Invitación</button>
          </form>
        </div>
        <hr>
        <h3>Usuarios Registrados</h3>
        <div id="user-management">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Nombre</th>
                <th>Email</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody id="user-table-body">
              </tbody>
          </table>
        </div>
      </section>

      <section class="card admin-card">
        <h2>Gestión de Edificios</h2>
        <div id="building-management">
          <h3 id="building-form-title">Añadir Nuevo Edificio</h3>
          <form id="building-form">
            <input type="hidden" id="building-id">
            <div class="form-group"><label for="building-address">Dirección / Nombre:</label><input type="text" id="building-address" required></div>
            <div class="form-group"><label for="building-description">Descripción:</label><textarea id="building-description" rows="2"></textarea></div>
            <div class="form-buttons">
              <button type="submit">Guardar Edificio</button>
              <button type="button" id="cancel-building-edit-btn" style="display: none;">Cancelar</button>
            </div>
          </form>
          <h3>Edificios Existentes</h3>
          <div id="buildings-list-container"></div>
        </div>
      </section>

      <section class="card admin-card">
        <h2>Gestión de Pistas</h2>
        <div id="court-management">
          <h3 id="court-form-title">Crear Nueva Pista</h3>
          <form id="court-form">
            <input type="hidden" id="court-id">
            <div class="form-group"><label for="court-name">Nombre:</label><input type="text" id="court-name" required></div>
            <div class="form-group"><label for="court-description">Descripción:</label><textarea id="court-description" rows="2"></textarea></div>
            <div id="court-active-div" style="display: none;" class="form-group"><label for="court-is-active">Activa:</label><input type="checkbox" id="court-is-active"></div>
            <div class="form-buttons">
              <button type="submit">Guardar</button>
              <button type="button" id="cancel-edit-btn" style="display: none;">Cancelar</button>
            </div>
          </form>
          <h3>Pistas Existentes</h3>
          <div id="courts-list-container"></div>
        </div>
      </section>

      <section class="card admin-card">
        <h2>Gestión de Bloqueos</h2>
        <div id="block-management">
          <h3>Crear Nuevo Bloqueo</h3>
          <form id="create-block-form">
            <div class="form-group"><label for="block-court-select">Pista:</label><select id="block-court-select" required></select></div>
            <div class="form-group"><label for="block-start-time">Inicio:</label><input type="datetime-local" id="block-start-time" required></div>
            <div class="form-group"><label for="block-end-time">Fin:</label><input type="datetime-local" id="block-end-time" required></div>
            <div class="form-group"><label for="block-reason">Motivo:</label><input type="text" id="block-reason"></div>
            <button type="submit">Crear Bloqueo</button>
          </form>
          <h3>Bloqueos Activos</h3>
          <div id="blocks-list-container"></div>
        </div>
      </section>

      <section class="card admin-card full-width-card">
        <h2>Gestión de Ajustes Generales</h2>
        <div id="settings-management">
          <form id="settings-form">
            <p>Aquí puedes cambiar los parámetros de funcionamiento de la aplicación.</p>
            <div class="settings-grid">
              <div class="form-group"><label for="setting-open-time">Hora de Apertura:</label><input type="time" id="setting-open-time"></div>
              <div class="form-group"><label for="setting-close-time">Hora de Cierre:</label><input type="time" id="setting-close-time"></div>
              <div class="form-group"><label for="setting-advance-days">Días de Antelación:</label><input type="number" id="setting-advance-days" min="1"></div>
              <div class="form-group"><label for="setting-gap-optimization">Optimización de Huecos:</label><input type="checkbox" id="setting-gap-optimization"></div>
            </div>
            <button type="submit">Guardar todos los Ajustes</button>
          </form>
        </div>
      </section>
    </main>
  </div>
  
  <script src="admin.js"></script>
  <script src="main.js"></script>
</body>
</html>
public/admin.js
(Este es el archivo JavaScript final y completo para el panel de administración, con todas las funciones y listeners).

JavaScript

document.addEventListener('DOMContentLoaded', () => {
    // --- 1. CONFIGURACIÓN INICIAL Y ELEMENTOS DEL DOM ---
    const API_BASE_URL = 'http://10.10.10.2:3000';
    const authToken = localStorage.getItem('authToken');

    const adminNameSpan = document.getElementById('admin-name');
    const logoutButton = document.getElementById('logout-button');
    // Usuarios
    const userTableBody = document.getElementById('user-table-body');
    const inviteUserForm = document.getElementById('invite-user-form');
    const inviteBuildingSelect = document.getElementById('invite-building');
    // Pistas
    const courtForm = document.getElementById('court-form');
    const courtFormTitle = document.getElementById('court-form-title');
    const courtIdInput = document.getElementById('court-id');
    const courtNameInput = document.getElementById('court-name');
    const courtDescriptionInput = document.getElementById('court-description');
    const courtIsActiveDiv = document.getElementById('court-active-div');
    const courtIsActiveCheckbox = document.getElementById('court-is-active');
    const cancelEditBtn = document.getElementById('cancel-edit-btn');
    const courtsListContainer = document.getElementById('courts-list-container');
    // Bloqueos
    const createBlockForm = document.getElementById('create-block-form');
    const blockCourtSelect = document.getElementById('block-court-select');
    const blockStartTimeInput = document.getElementById('block-start-time');
    const blockEndTimeInput = document.getElementById('block-end-time');
    const blockReasonInput = document.getElementById('block-reason');
    const blocksListContainer = document.getElementById('blocks-list-container');
    // Edificios
    const buildingForm = document.getElementById('building-form');
    const buildingFormTitle = document.getElementById('building-form-title');
    const buildingIdInput = document.getElementById('building-id');
    const buildingAddressInput = document.getElementById('building-address');
    const buildingDescriptionInput = document.getElementById('building-description');
    const cancelBuildingEditBtn = document.getElementById('cancel-building-edit-btn');
    const buildingsListContainer = document.getElementById('buildings-list-container');
    // Ajustes
    const settingsForm = document.getElementById('settings-form');
    const openTimeInput = document.getElementById('setting-open-time');
    const closeTimeInput = document.getElementById('setting-close-time');
    const advanceDaysInput = document.getElementById('setting-advance-days');
    const gapOptimizationCheckbox = document.getElementById('setting-gap-optimization');

    // --- 2. DATOS GLOBALES ---
    let allCourtsData = [];
    let allBuildings = [];

    // --- 3. FUNCIONES PRINCIPALES ---

    const initializeAdminPanel = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/users/me`, { headers: { 'Authorization': `Bearer ${authToken}` }});
            if (!response.ok) throw new Error('Token inválido.');
            const user = await response.json();
            if (user.role !== 'admin') {
                alert('Acceso denegado. No eres administrador.');
                window.location.href = '/dashboard.html';
                return;
            }
            adminNameSpan.textContent = user.name;
            // Cargar todos los datos del panel
            fetchAndDisplayUsers();
            fetchAndDisplayCourts();
            fetchAndDisplayBuildings();
            fetchAndDisplayBlockedPeriods();
            fetchAndDisplaySettings();
        } catch (error) {
            console.error(error);
            localStorage.removeItem('authToken');
            alert('Sesión inválida. Por favor, inicia sesión de nuevo.');
            window.location.href = '/login.html';
        }
    };

    const fetchAndDisplayUsers = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/admin/users`, { headers: { 'Authorization': `Bearer ${authToken}` } });
            const users = await response.json();
            userTableBody.innerHTML = '';
            users.forEach(user => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${user.id}</td>
                    <td>${user.name}</td>
                    <td>${user.email}</td>
                    <td>${user.account_status}</td>
                    <td>
                        ${user.account_status === 'pending_approval' ? `<button class="approve-btn" data-userid="${user.id}">Aprobar</button>` : ''}
                        ${user.account_status === 'active' ? `<button class="deactivate-btn" data-userid="${user.id}">Desactivar</button>` : ''}
                        ${user.account_status === 'inactive' ? `<button class="activate-btn" data-userid="${user.id}">Activar</button>` : ''}
                    </td>`;
                userTableBody.appendChild(row);
            });
        } catch (error) {
            console.error('Error al obtener usuarios:', error);
            userTableBody.innerHTML = '<tr><td colspan="5" style="color:red;">Error al cargar los usuarios.</td></tr>';
        }
    };

    const fetchAndDisplayCourts = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/courts`, { headers: { 'Authorization': `Bearer ${authToken}` } });
            if (!response.ok) throw new Error(`Error del servidor: ${response.statusText}`);
            const courts = await response.json();
            allCourtsData = courts;
            
            blockCourtSelect.innerHTML = '';
            courts.forEach(court => {
                if (court.is_active) { 
                    const option = document.createElement('option');
                    option.value = court.id;
                    option.textContent = court.name;
                    blockCourtSelect.appendChild(option);
                }
            });

            courtsListContainer.innerHTML = '';
            const courtList = document.createElement('ul');
            if (courts.length === 0) {
                courtList.innerHTML = '<li>No hay pistas creadas en el sistema.</li>';
            } else {
                courts.forEach(court => {
                    const listItem = document.createElement('li');
                    listItem.innerHTML = `<strong>${court.name}</strong> (ID: ${court.id}) - Estado: ${court.is_active ? '<strong>Activa</strong>' : '<span style="color:red;">Inactiva</span>'}<br><em>${court.description || 'Sin descripción.'}</em><br><button class="edit-court-btn" data-courtid="${court.id}">Editar</button>`;
                    courtList.appendChild(listItem);
                });
            }
            courtsListContainer.appendChild(courtList);
        } catch (error) {
            console.error('Error al obtener pistas:', error);
            courtsListContainer.innerHTML = '<p style="color:red;">Error al cargar la información de las pistas.</p>';
        }
    };

    const fetchAndDisplayBuildings = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/admin/buildings`, { headers: { 'Authorization': `Bearer ${authToken}` } });
            const buildings = await response.json();
            allBuildings = buildings;

            inviteBuildingSelect.innerHTML = '';
            if (buildings.length > 0) {
                buildings.forEach(building => {
                    const option = document.createElement('option');
                    option.value = building.id;
                    option.textContent = building.address;
                    inviteBuildingSelect.appendChild(option);
                });
            }
            
            buildingsListContainer.innerHTML = '';
            const list = document.createElement('ul');
            if (buildings.length === 0) {
                list.innerHTML = '<li>No hay edificios creados.</li>';
            } else {
                buildings.forEach(building => {
                    const item = document.createElement('li');
                    item.innerHTML = `<strong>${building.address}</strong> (ID: ${building.id})<br><em>${building.description || 'Sin descripción'}</em><br><button class="edit-building-btn" data-buildingid="${building.id}">Editar</button><button class="delete-building-btn" data-buildingid="${building.id}">Eliminar</button>`;
                    list.appendChild(item);
                });
            }
            buildingsListContainer.appendChild(list);
        } catch (error) {
            console.error('Error al obtener edificios:', error);
            buildingsListContainer.innerHTML = '<p style="color:red;">Error al cargar los edificios.</p>';
        }
    };

    const fetchAndDisplayBlockedPeriods = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/admin/blocked-periods`, { headers: { 'Authorization': `Bearer ${authToken}` } });
            const blockedPeriods = await response.json();
            blocksListContainer.innerHTML = '';
            const list = document.createElement('ul');
            if (blockedPeriods.length === 0) {
                list.innerHTML = '<li>No hay bloqueos futuros programados.</li>';
            } else {
                blockedPeriods.forEach(block => {
                    const item = document.createElement('li');
                    item.innerHTML = `<strong>Pista:</strong> ${block.court_name} <br><strong>Desde:</strong> ${new Date(block.start_time).toLocaleString('es-ES')} <br><strong>Hasta:</strong> ${new Date(block.end_time).toLocaleString('es-ES')} <br><strong>Motivo:</strong> ${block.reason || 'N/A'}<button class="delete-block-btn" data-blockid="${block.id}">Eliminar</button>`;
                    list.appendChild(item);
                });
            }
            blocksListContainer.appendChild(list);
        } catch (error) {
            console.error('Error al obtener bloqueos:', error);
            blocksListContainer.innerHTML = '<p style="color:red;">Error al cargar los bloqueos.</p>';
        }
    };

    const fetchAndDisplaySettings = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/admin/settings`, { headers: { 'Authorization': `Bearer ${authToken}` } });
            const settings = await response.json();
            openTimeInput.value = settings.operating_open_time || '08:00';
            closeTimeInput.value = settings.operating_close_time || '22:00';
            advanceDaysInput.value = settings.booking_advance_days || '7';
            gapOptimizationCheckbox.checked = settings.enable_booking_gap_optimization === 'true';
        } catch (error) {
            console.error('Error al obtener los ajustes:', error);
            alert('No se pudieron cargar los ajustes.');
        }
    };

    const resetCourtForm = () => {
        courtFormTitle.textContent = 'Crear Nueva Pista';
        courtForm.reset();
        courtIdInput.value = '';
        courtIsActiveDiv.style.display = 'none';
        cancelEditBtn.style.display = 'none';
    };

    const resetBuildingForm = () => {
        buildingFormTitle.textContent = 'Añadir Nuevo Edificio';
        buildingForm.reset();
        buildingIdInput.value = '';
        cancelBuildingEditBtn.style.display = 'none';
    };

    const handleUserAction = async (event) => {
        const target = event.target;
        const userId = target.dataset.userid;
        if (!userId) return;
        let actionUrl = '';
        let actionMethod = 'PUT';
        let actionPayload = {};
        if (target.classList.contains('approve-btn')) {
            actionUrl = `${API_BASE_URL}/api/admin/users/${userId}/approve`;
        } else if (target.classList.contains('deactivate-btn')) {
            actionUrl = `${API_BASE_URL}/api/admin/users/${userId}/status`;
            actionPayload = { status: 'inactive' };
        } else if (target.classList.contains('activate-btn')) {
            actionUrl = `${API_BASE_URL}/api/admin/users/${userId}/status`;
            actionPayload = { status: 'active' };
        } else {
            return;
        }
        if (!confirm('¿Estás seguro de que quieres realizar esta acción?')) return;
        try {
            const response = await fetch(actionUrl, {
                method: actionMethod,
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}` },
                body: Object.keys(actionPayload).length > 0 ? JSON.stringify(actionPayload) : null,
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message);
            alert('Acción completada con éxito.');
            fetchAndDisplayUsers();
        } catch(error) {
            alert(`Error: ${error.message}`);
        }
    };
    
    // --- 5. LÓGICA DE INICIO Y ASIGNACIÓN DE EVENTOS ---
    
    const initializePage = () => {
        if (!authToken) {
            alert('Debes iniciar sesión para ver esta página.');
            window.location.href = '/login.html';
            return;
        }

        initializeAdminPanel();

        logoutButton.addEventListener('click', () => { localStorage.removeItem('authToken'); window.location.href = '/login.html'; });
        
        // Listeners de delegación de eventos
        userTableBody.addEventListener('click', handleUserAction);

        courtsListContainer.addEventListener('click', (event) => {
            if (event.target.classList.contains('edit-court-btn')) {
                const courtId = event.target.dataset.courtid;
                const courtToEdit = allCourtsData.find(c => c.id == courtId);
                if (courtToEdit) {
                    courtFormTitle.textContent = 'Editar Pista';
                    courtIdInput.value = courtToEdit.id;
                    courtNameInput.value = courtToEdit.name;
                    courtDescriptionInput.value = courtToEdit.description;
                    courtIsActiveDiv.style.display = 'block';
                    courtIsActiveCheckbox.checked = courtToEdit.is_active;
                    cancelEditBtn.style.display = 'inline-block';
                    courtForm.scrollIntoView({ behavior: 'smooth' });
                }
            }
        });

        buildingsListContainer.addEventListener('click', (event) => {
            const target = event.target;
            const buildingId = target.dataset.buildingid;
            if (!buildingId) return;
            if (target.classList.contains('edit-building-btn')) {
                const buildingToEdit = allBuildings.find(b => b.id == buildingId);
                if (buildingToEdit) {
                    buildingFormTitle.textContent = 'Editar Edificio';
                    buildingIdInput.value = buildingToEdit.id;
                    buildingAddressInput.value = buildingToEdit.address;
                    buildingDescriptionInput.value = buildingToEdit.description;
                    cancelBuildingEditBtn.style.display = 'inline-block';
                    buildingForm.scrollIntoView({ behavior: 'smooth' });
                }
            } else if (target.classList.contains('delete-building-btn')) {
                if (!confirm(`¿Estás seguro de que quieres eliminar el edificio ID ${buildingId}?`)) return;
                fetch(`${API_BASE_URL}/api/admin/buildings/${buildingId}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${authToken}` } })
                .then(response => response.json().then(data => ({ ok: response.ok, data })))
                .then(({ ok, data }) => {
                    if (!ok) throw new Error(data.message);
                    alert('Edificio eliminado.');
                    fetchAndDisplayBuildings();
                })
                .catch(error => alert(`Error: ${error.message}`));
            }
        });

        blocksListContainer.addEventListener('click', async (event) => {
            if (event.target.classList.contains('delete-block-btn')) {
                const blockId = event.target.dataset.blockid;
                if (!confirm(`¿Estás seguro de que quieres eliminar el bloqueo ID ${blockId}?`)) return;
                try {
                    const response = await fetch(`${API_BASE_URL}/api/admin/blocked-periods/${blockId}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${authToken}` } });
                    const data = await response.json();
                    if (!response.ok) throw new Error(data.message);
                    alert('Bloqueo eliminado.');
                    fetchAndDisplayBlockedPeriods();
                } catch(error) {
                    alert(`Error: ${error.message}`);
                }
            }
        });

        // Listeners de formularios
        inviteUserForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            const payload = {
                name: document.getElementById('invite-name').value,
                email: document.getElementById('invite-email').value,
                building_id: document.getElementById('invite-building').value,
                floor: document.getElementById('invite-floor').value,
                door: document.getElementById('invite-door').value,
            };
            try {
                const response = await fetch(`${API_BASE_URL}/api/admin/users/invite`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}` },
                    body: JSON.stringify(payload)
                });
                const data = await response.json();
                if (!response.ok) throw new Error(data.message);
                alert('Invitación enviada con éxito.');
                inviteUserForm.reset();
                fetchAndDisplayUsers();
            } catch (error) {
                alert(`Error: ${error.message}`);
            }
        });

        courtForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            const courtId = courtIdInput.value;
            const isEditing = !!courtId;
            const url = isEditing ? `${API_BASE_URL}/api/courts/${courtId}` : `${API_BASE_URL}/api/courts`;
            const method = isEditing ? 'PUT' : 'POST';
            const body = {
                name: courtNameInput.value,
                description: courtDescriptionInput.value,
            };
            if (isEditing) { body.is_active = courtIsActiveCheckbox.checked; }
            try {
                const response = await fetch(url, {
                    method: method,
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}` },
                    body: JSON.stringify(body)
                });
                const data = await response.json();
                if (!response.ok) throw new Error(data.message);
                alert(`Pista ${isEditing ? 'actualizada' : 'creada'} con éxito.`);
                resetCourtForm();
                fetchAndDisplayCourts();
            } catch (error) {
                alert(`Error: ${error.message}`);
            }
        });
        
        createBlockForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            try {
                const response = await fetch(`${API_BASE_URL}/api/admin/blocked-periods`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}` },
                    body: JSON.stringify({
                        courtId: blockCourtSelect.value,
                        startTime: blockStartTimeInput.value,
                        endTime: blockEndTimeInput.value,
                        reason: blockReasonInput.value
                    })
                });
                const data = await response.json();
                if (!response.ok) throw new Error(data.message);
                alert('Bloqueo creado.');
                createBlockForm.reset();
                fetchAndDisplayBlockedPeriods();
            } catch(error) {
                alert(`Error: ${error.message}`);
            }
        });

        buildingForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            const buildingId = buildingIdInput.value;
            const isEditing = !!buildingId;
            const url = isEditing ? `${API_BASE_URL}/api/admin/buildings/${buildingId}` : `${API_BASE_URL}/api/admin/buildings`;
            const method = isEditing ? 'PUT' : 'POST';
            try {
                const response = await fetch(url, {
                    method,
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}` },
                    body: JSON.stringify({
                        address: buildingAddressInput.value,
                        description: buildingDescriptionInput.value
                    })
                });
                const data = await response.json();
                if (!response.ok) throw new Error(data.message);
                alert(`Edificio ${isEditing ? 'actualizado' : 'creado'}.`);
                resetBuildingForm();
                fetchAndDisplayBuildings();
            } catch (error) {
                alert(`Error: ${error.message}`);
            }
        });

        settingsForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            const settingsToUpdate = {
                operating_open_time: openTimeInput.value,
                operating_close_time: closeTimeInput.value,
                booking_advance_days: advanceDaysInput.value,
                enable_booking_gap_optimization: gapOptimizationCheckbox.checked.toString()
            };
            if (!confirm('¿Guardar nuevos ajustes?')) return;
            try {
                const response = await fetch(`${API_BASE_URL}/api/admin/settings`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}` },
                    body: JSON.stringify(settingsToUpdate)
                });
                const data = await response.json();
                if (!response.ok) throw new Error(data.message);
                alert('Ajustes guardados.');
            } catch (error) {
                alert(`Error al guardar: ${error.message}`);
            }
        });

        // Listeners para botones de cancelar edición
        cancelEditBtn.addEventListener('click', resetCourtForm);
        cancelBuildingEditBtn.addEventListener('click', resetBuildingForm);
    };

    initializePage();
});

5. Código Fuente del Frontend (Final)
5.5 Archivos de PWA y Raíz (public/)
public/manifest.json
(Define cómo se instala la aplicación en un dispositivo).

JSON

{
  "name": "Padel@Home",
  "short_name": "Padel@Home",
  "description": "Sistema de reservas de pistas de pádel para residencias.",
  "start_url": "/login.html",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#0d6efd",
  "orientation": "portrait-primary",
  "icons": [
    {
      "src": "/images/icon-192x192.png",
      "type": "image/png",
      "sizes": "192x192"
    },
    {
      "src": "/images/icon-512x512.png",
      "type": "image/png",
      "sizes": "512x512"
    }
  ]
}
public/service-worker.js
(Maneja el cacheo de archivos para el funcionamiento offline básico).

JavaScript

const CACHE_NAME = 'padelathome-cache-v1';
// Lista de archivos base para que la app cargue offline
const urlsToCache = [
  '/',
  '/login.html',
  '/dashboard.html',
  '/admin.html',
  '/style.css',
  '/main.js',
  '/login.js',
  '/dashboard.js',
  '/admin.js',
  '/images/icon-192x192.png',
  '/images/icon-512x512.png'
  // Nota: Las imágenes de los iconos deben existir en /public/images/
];

// Evento 'install': Guarda los archivos base en la caché
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Cache abierta');
        return cache.addAll(urlsToCache);
      })
  );
});

// Evento 'fetch': Intercepta las peticiones de la aplicación
self.addEventListener('fetch', event => {
  // Ignora todas las peticiones a la API, esas siempre deben ir a la red
  if (event.request.url.includes('/api/')) {
    return;
  }

  // Estrategia "Cache First":
  // Intenta servir el archivo desde la caché. Si no está, ve a la red.
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          return response; // Servir desde la caché
        }
        return fetch(event.request); // Ir a la red
      })
  );
});
public/main.js
(Script global que registra el Service Worker).

JavaScript

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js')
      .then(registration => {
        console.log('Service Worker registrado con éxito:', registration.scope);
      })
      .catch(error => {
        console.log('Fallo en el registro del Service Worker:', error);
      });
  });
}
(Recuerda que este archivo main.js debe estar enlazado en todos tus archivos .html)

6. Archivos de Configuración de Despliegue (Docker)
Estos archivos van en la raíz del proyecto (p_at_home_backend/).

Dockerfile
(La "receta" para construir la imagen de producción del backend).

Dockerfile

# --- ETAPA 1: El Constructor (Builder) ---
FROM node:20-alpine AS builder
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm install
COPY . .

# --- ETAPA 2: La Imagen Final de Producción ---
FROM node:20-alpine
WORKDIR /usr/src/app

# 1. Instalar dcron (para tareas cron) y tzdata (para zonas horarias)
RUN apk add --no-cache dcron tzdata

# 2. Copiar el archivo de configuración de cron
COPY padel-cron /etc/crontabs/root

# 3. Copiar el script de inicio y darle permisos
COPY entrypoint.sh /usr/src/app/entrypoint.sh
RUN chmod +x /usr/src/app/entrypoint.sh

# 4. Copiar los archivos de la aplicación desde la etapa 'builder'
COPY --from=builder /usr/src/app/node_modules ./node_modules
COPY --from=builder /usr/src/app .

# Exponer el puerto
EXPOSE 3000

# El punto de entrada que inicia cron y el servidor
ENTRYPOINT ["/usr/src/app/entrypoint.sh"]
# El comando por defecto que se pasa al entrypoint
CMD [ "node", "server.js" ]
docker-compose.yml
(Define la aplicación completa (backend + base de datos) para un despliegue fácil).

YAML

version: '3.8'

services:
  # El servicio para nuestra aplicación
  app:
    # Construye la imagen usando el Dockerfile en el directorio actual
    build: .
    image: padelathome-backend:latest
    container_name: padelathome_app
    restart: always
    ports:
      - "3000:3000"
    # Carga toda la configuración desde el fichero .env
    env_file:
      - .env 
    networks:
      - padel-network
    # Espera a que la base de datos esté lista antes de arrancar
    depends_on:
      - db

  # El servicio para nuestra base de datos
  db:
    image: postgres:15-alpine
    container_name: postgresql
    restart: always
    volumes:
      # Los datos se guardan en un volumen persistente
      - postgres_data:/var/lib/postgresql/data 
    environment:
      # Lee las variables directamente del fichero .env
      POSTGRES_DB: ${DB_DATABASE} 
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    networks:
      - padel-network

# Definimos la red para que se comuniquen
networks:
  padel-network:

# Definimos el volumen para la persistencia de datos
volumes:
  postgres_data:
entrypoint.sh
(Inicia el cron y el servidor dentro del contenedor).

Bash

#!/bin/sh
# Fichero: entrypoint.sh

# Inicia el demonio de cron en segundo plano
crond -l 2 -L /var/log/cron.log

echo "Servicio Cron iniciado en segundo plano."

# Ejecuta el comando principal (CMD del Dockerfile)
echo "Iniciando la aplicación principal (Node.js server)..."
exec "$@"
padel-cron
(Define las tareas programadas).

# Fichero: padel-cron

# Ejecutar el script de la lista de espera cada minuto
# (Para producción, cambiar a "*/5 * * * *" para cada 5 minutos)
* * * * * node /usr/src/app/src/jobs/checkWaitingList.js >> /var/log/cron.log 2>&1

# Línea vacía final requerida
