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
```javascript
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
```

4. Código Fuente del Backend (Node.js)
Esta sección contiene el código completo para cada archivo JavaScript en la carpeta src/, así como los archivos de configuración en la raíz del backend.

package.json
```json
{
  "dependencies": {
    "bcrypt": "^5.1.1",
    "cors": "^2.8.5",
    "date-fns": "^3.6.0",

    "dotenv": "^16.4.5",
    "express": "^4.19.2",
    "ics": "^3.7.6",
    "jsonwebtoken": "^9.0.2",
    "node-pg-migrate": "^7.5.2",
    "nodemailer": "^6.9.14",
    "pg": "^8.12.0"
  },
  "name": "p_at_home_backend",
  "version": "2.0.0",
  "description": "Sistema de reservas de pistas de pádel para residencias.",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "migrate": "node-pg-migrate"
  }
}
```

server.js
```javascript
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
```

src/config/database.js
```javascript
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
```

src/middleware/authMiddleware.js
```javascript
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
```

src/services/emailService.js
```javascript
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
```

src/jobs/checkWaitingList.js
```javascript
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
        
        const confirmationUrl = `${process.env.APP_URL}/confirm-booking.html?token=${confirmationToken}`;
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
```

src/jobs/checkOpenMatches.js
```javascript
// Fichero: src/jobs/checkOpenMatches.js
// Importamos dotenv para que este script independiente pueda leer el .env
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });

const pool = require('../config/database');
const sendEmail = require('../services/emailService');

async function cancelIncompleteMatches() {
  console.log(`[CRON JOB - Partidas Abiertas] - ${new Date().toISOString()} - Verificando partidas incompletas...`);
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Buscamos todas las partidas abiertas ('is_open_match' = true) que estén 'confirmed'
    //    y que vayan a empezar dentro del período de cancelación (ej. 6 horas)
    const bookingsToCancelResult = await client.query(
      `SELECT b.id, b.start_time, b.max_participants, b.auto_cancel_hours_before, array_agg(mp.user_id) as participant_ids
       FROM bookings b
       LEFT JOIN match_participants mp ON b.id = mp.booking_id
       WHERE b.is_open_match = TRUE
         AND b.status = 'confirmed'
         -- La hora de inicio está entre ahora y el límite de cancelación (ej. 6 horas desde ahora)
         AND b.start_time BETWEEN NOW() AND NOW() + (b.auto_cancel_hours_before * INTERVAL '1 hour')
       GROUP BY b.id
       -- Y filtramos solo las que no han alcanzado el máximo de participantes
       HAVING COUNT(mp.user_id) < b.max_participants`
    );

    if (bookingsToCancelResult.rows.length === 0) {
      console.log('[CRON JOB - Partidas Abiertas] - No hay partidas incompletas para cancelar.');
      await client.query('COMMIT'); // Hacemos commit igual para cerrar la transacción
      return;
    }

    console.log(`[CRON JOB - Partidas Abiertas] - Se encontraron ${bookingsToCancelResult.rows.length} partidas para cancelar.`);
    
    for (const match of bookingsToCancelResult.rows) {
      // 2. Cancelamos la reserva
      await client.query("UPDATE bookings SET status = 'cancelled_by_admin' WHERE id = $1", [match.id]);

      // 3. Obtenemos los emails de los participantes que sí se habían apuntado
      if (match.participant_ids && match.participant_ids[0] !== null) {
        const usersResult = await client.query("SELECT email, name FROM users WHERE id = ANY($1::bigint[])", [match.participant_ids]);
        
        // 4. Enviamos el correo de cancelación a todos los apuntados
        for (const user of usersResult.rows) {
          sendEmail({
            to: user.email,
            subject: 'Partida Abierta Cancelada en Padel@Home',
            html: `<h3>Hola, ${user.name}</h3>
                   <p>La partida abierta programada para el ${new Date(match.start_time).toLocaleString('es-ES')} ha sido 
                   cancelada automáticamente porque no se ha alcanzado el mínimo de ${match.max_participants} jugadores
                   ${match.auto_cancel_hours_before} horas antes de su inicio.</p>
                   <p>El slot de la pista ha sido liberado.</p>`
          });
        }
        console.log(`[CRON JOB - Partidas Abiertas] - Partida ${match.id} cancelada. Notificando a ${usersResult.rows.length} participantes.`);
      }
    }

    await client.query('COMMIT');

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[CRON JOB - Partidas Abiertas] - Error cancelando partidas:', error);
  } finally {
    client.release();
  }
}

// Ejecutamos la función y cerramos el pool para que el script termine
cancelIncompleteMatches().then(() => {
  console.log('[CRON JOB - Partidas Abiertas] - Verificación de partidas completada.');
  pool.end();
});
```

src/api/authRoutes.js
```javascript
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
```

src/controllers/authController.js
```javascript
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

    const resetUrl = `${process.env.APP_URL}/reset-password.html?token=${resetToken}`;
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

// --- AÑADE ESTA NUEVA FUNCIÓN ---
const getRegistrationStatus = async (req, res) => {
  try {
    const result = await pool.query("SELECT setting_value FROM instance_settings WHERE setting_key = 'allow_public_registration'");
    let status = 'false'; // Por defecto es falso (más seguro)
    if (result.rows.length > 0) {
      status = result.rows[0].setting_value;
    }
    res.json({ allowRegistration: status === 'true' });
  } catch (error) {
    console.error('Error al obtener el estado del registro:', error);
    res.status(500).json({ message: 'Error interno del servidor.' });
  }
};

// Actualiza el module.exports al final del archivo
module.exports = {
  registerUser,
  loginUser,
  forgotPassword,
  resetPassword,
  getRegistrationStatus // <-- añade esto
};
```

src/api/userRoutes.js
```javascript
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
```

src/controllers/userController.js
```javascript
const pool = require('../config/database');
const bcrypt = require('bcrypt'); // Necesitaremos bcrypt para cambiar la contraseña // --- 1. FUNCIÓN QUE YA TENÍAMOS ---
const getUserProfile = async (req, res) => {
  try {
    const userId = req.user.id; 
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

// --- 2. NUEVA FUNCIÓN: ACTUALIZAR INFORMACIÓN DEL PERFIL ---
const updateUserProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    // Solo permitimos que se actualicen estos campos
    const { name, floor, door, phone_number } = req.body;

    if (!name) {
      return res.status(400).json({ message: 'El nombre es requerido.' });
    }

    const { rows } = await pool.query(
      "UPDATE users SET name = $1, floor = $2, door = $3, phone_number = $4, updated_at = NOW() WHERE id = $5 RETURNING id, name, email, floor, door, phone_number",
      [name, floor, door, phone_number, userId]
    );

    res.json({ message: 'Perfil actualizado con éxito.', user: rows[0] });
  } catch (error) {
    console.error('Error al actualizar el perfil:', error);
    res.status(500).json({ message: 'Error interno del servidor.' });
  }
};// --- 3. NUEVA FUNCIÓN: CAMBIAR LA CONTRASEÑA ---
const changeUserPassword = async (req, res) => {
  try {
    const userId = req.user.id;
    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
      return res.status(400).json({ message: 'La contraseña antigua y la nueva son requeridas.' });
    }

    // 1. Obtenemos el hash de la contraseña actual del usuario
    const userResult = await pool.query("SELECT password_hash FROM users WHERE id = $1", [userId]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({ message: 'Usuario no encontrado.' });
    }
    const currentHash = userResult.rows[0].password_hash;

    // 2. Comparamos la contraseña antigua con el hash
    const isMatch = await bcrypt.compare(oldPassword, currentHash);
    if (!isMatch) {
      return res.status(401).json({ message: 'La contraseña antigua no es correcta.' });
    }

    // 3. Si coincide, hasheamos la nueva contraseña
    const salt = await bcrypt.genSalt(10);
    const newPasswordHash = await bcrypt.hash(newPassword, salt);

    // 4. Actualizamos la contraseña en la base de datos
    await pool.query("UPDATE users SET password_hash = $1 WHERE id = $2", [newPasswordHash, userId]);

    res.json({ message: 'Contraseña actualizada con éxito.' });
  } catch (error) {
    console.error('Error al cambiar la contraseña:', error);
    res.status(500).json({ message: 'Error interno del servidor.' });
  }
};


// --- EXPORTAMOS TODAS LAS FUNCIONES ---
module.exports = {
  getUserProfile,
  updateUserProfile,
  changeUserPassword
};
```

src/api/scheduleRoutes.js
```javascript
const express = require('express');
const router = express.Router();
const { getAvailability, getWeekSchedule } = require('../controllers/scheduleController');
const { protect } = require('../middleware/authMiddleware');

// Ruta para la vista de disponibilidad de un solo día (antigua)
router.get('/availability', protect, getAvailability);

// Ruta para la nueva vista de calendario semanal
router.get('/week', protect, getWeekSchedule);

module.exports = router;
```

src/controllers/scheduleController.js
```javascript
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
```

src/api/bookingRoutes.js
```javascript
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
```

src/controllers/bookingController.js
```javascript
const db = require('../config/database');
const { addMinutes } = require('date-fns');
const sendEmail = require('../services/emailService');
const ics = require('ics');
const crypto = require('crypto'); // Necesario para la lista de espera

/**
 * @description Crea una nueva reserva (privada o partida abierta)
 */
const createBooking = async (req, res) => {
  const userId = req.user.id;
  const { courtId, startTime, durationMinutes, isOpenMatch, maxParticipants } = req.body;
  if (!courtId || !startTime || !durationMinutes) {
    return res.status(400).json({ message: 'Se requiere courtId, startTime y durationMinutes.' });
  }
  const bookingStartTime = new Date(startTime);
  if (bookingStartTime < new Date()) {
    return res.status(400).json({ message: 'No se puede reservar en un horario pasado.' });
  }
  const bookingEndTime = addMinutes(bookingStartTime, durationMinutes);
  const client = await db.connect();

  try {
    await client.query('BEGIN');

    // Regla 1: ¿El usuario ya tiene una reserva activa?
    const activeBookingResult = await client.query("SELECT id FROM bookings WHERE user_id = $1 AND status = 'confirmed' AND end_time > (NOW() AT TIME ZONE 'UTC')", [userId]);
    if (activeBookingResult.rows.length > 0 && !isOpenMatch) {
      throw new Error('Ya tienes una reserva personal activa.');
    }

    // Regla 2: ¿El slot sigue disponible?
    const [bookingsResult, blockedResult] = await Promise.all([
        client.query("SELECT start_time, end_time FROM bookings WHERE court_id = $1 AND status = 'confirmed' AND start_time < $2 AND end_time > $3", [courtId, bookingEndTime, bookingStartTime]),
        db.query("SELECT start_time, end_time FROM blocked_periods WHERE court_id = $1 AND start_time < $2 AND end_time > $3", [courtId, bookingEndTime, bookingStartTime])
    ]);

    if (bookingsResult.rows.length > 0 || blockedResult.rows.length > 0) {
        throw new Error('El horario seleccionado ya no está disponible.');
    }

    // 3. Insertamos la nueva reserva
    const newBookingResult = await client.query(
      "INSERT INTO bookings (court_id, user_id, start_time, end_time, is_open_match, max_participants, auto_cancel_hours_before) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *",
      [courtId, userId, bookingStartTime, bookingEndTime, !!isOpenMatch, isOpenMatch ? maxParticipants : null, isOpenMatch ? 6 : null]
    );
    const newBooking = newBookingResult.rows[0];

    // 4. Si es partida abierta, añadimos al creador como participante
    if (newBooking.is_open_match) {
      await client.query("INSERT INTO match_participants (booking_id, user_id) VALUES ($1, $2)", [newBooking.id, userId]);
    }

    // 5. Obtenemos los datos para el email DENTRO de la transacción
    const userResult = await client.query("SELECT name, email FROM users WHERE id = $1", [userId]);
    const courtResult = await db.query("SELECT name FROM courts WHERE id = $1", [courtId]);
    
    await client.query('COMMIT');

    // 6. Enviamos el correo de confirmación (con .ics)
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

/**
 * @description Obtiene la próxima reserva activa del usuario (propia o como participante)
 */
const getMyBooking = async (req, res) => {
  try {
    const userId = req.user.id;
    const query = `
      WITH MyNextBookings AS (
        SELECT b.*, c.name as court_name, 'participant' as participation_type
        FROM bookings b
        JOIN courts c ON b.court_id = c.id
        JOIN match_participants mp ON b.id = mp.booking_id
        WHERE mp.user_id = $1 AND b.user_id != $1 AND b.status = 'confirmed' AND b.end_time > (NOW() AT TIME ZONE 'UTC')
        UNION
        SELECT b.*, c.name as court_name, 'owner' as participation_type
        FROM bookings b
        JOIN courts c ON b.court_id = c.id
        WHERE b.user_id = $1 AND b.status = 'confirmed' AND b.end_time > (NOW() AT TIME ZONE 'UTC')
      )
      SELECT * FROM MyNextBookings
      ORDER BY start_time ASC
      LIMIT 1;
        `;
    
        const result = await db.query(query, [userId]);
    
    if (result.rows.length > 0) {
      res.json(result.rows[0]);
    } else {
      res.json(null);
    }
  } catch (error) {
    console.error('Error al obtener mi reserva:', error);
    res.status(500).json({ message: 'Error interno del servidor.', error: error.message });
  }
};

/**
 * @description Cancela una reserva del usuario logueado y activa la lista de espera
 */
const cancelMyBooking = async (req, res) => {
  const client = await db.connect();
  try {
    const userId = req.user.id; // El ID del usuario que está cancelando
    const { bookingId } = req.params; // El ID de la reserva a cancelar
    
    await client.query('BEGIN');

    // 1. Verificamos que el usuario es el DUEÑO y cancelamos la reserva
    const result = await client.query(
      "UPDATE bookings SET status = 'cancelled_by_user' WHERE id = $1 AND user_id = $2 AND status = 'confirmed' RETURNING *",
      [bookingId, userId]
    );

    // Si no se actualizó ninguna fila, es porque no es el dueño o la reserva no existe
    if (result.rowCount === 0) {
      throw new Error('No se encontró una reserva activa para cancelar o no tienes permiso para hacerlo.');
    }

    const cancelledBooking = result.rows[0];

    // --- LÓGICA DE LISTA DE ESPERA (se activa al cancelar) ---
    // 2. Buscamos al primer usuario en la lista de espera para este slot
    const waitingListResult = await client.query(
      `SELECT wle.id, wle.user_id, u.name as user_name, u.email as user_email, wle.slot_start_time
       FROM waiting_list_entries wle
       JOIN users u ON wle.user_id = u.id
       WHERE wle.court_id = $1 AND wle.slot_start_time = $2 AND wle.status = 'waiting'
       ORDER BY wle.requested_at ASC
       LIMIT 1`,
      [cancelledBooking.court_id, cancelledBooking.start_time]
    );

    // 3. Si encontramos a alguien...
    if (waitingListResult.rows.length > 0) {
      const luckyUser = waitingListResult.rows[0];
      
      const confirmationToken = crypto.randomBytes(32).toString('hex');
      const expires_at = new Date(Date.now() + 30 * 60 * 1000); // 30 minutos

      // 4. Actualizamos su estado a 'notified' y guardamos el token
      await client.query(
        "UPDATE waiting_list_entries SET status = 'notified', confirmation_token = $1, notification_expires_at = $2, notification_sent_at = NOW() WHERE id = $3",
        [confirmationToken, expires_at, luckyUser.id]
      );

      // 5. Le enviamos el correo de notificación
      const confirmationUrl = `${process.env.APP_URL}/confirm-booking.html?token=${confirmationToken}`;
      sendEmail({
        to: luckyUser.user_email,
        subject: '¡Un hueco se ha liberado en Padel@Home!',
        html: `<h3>¡Hola, ${luckyUser.user_name}!</h3><p>Se ha liberado el horario por el que estabas esperando (${new Date(luckyUser.slot_start_time).toLocaleString('es-ES')}).</p><p>Tienes <strong>30 minutos</strong> para confirmar la reserva haciendo clic en el siguiente enlace. Después, tu turno expirará.</p><a href="${confirmationUrl}">Confirmar mi Reserva</a>`
      });
      console.log(`Notificación de lista de espera enviada al usuario ${luckyUser.user_id}`);
    }
    // --- FIN DE LÓGICA DE LISTA DE ESPERA ---

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

// Exportamos todas las funciones del controlador
module.exports = {
  createBooking,
  getMyBooking,
  cancelMyBooking,
};
```

src/api/courtRoutes.js
```javascript
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
```

src/controllers/courtController.js
```javascript
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
```

src/api/adminRoutes.js
```javascript
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
  getDashboardStats,
  resetUserPassword,
  updateUserRole,
} = require('../controllers/adminController');
const { protect, isAdmin } = require('../middleware/authMiddleware');

// Rutas de Gestión de Usuarios
router.get('/users', protect, isAdmin, getAllUsers);
router.post('/users/invite', protect, isAdmin, inviteUser);
router.put('/users/:userId/approve', protect, isAdmin, approveUser);
router.put('/users/:userId/status', protect, isAdmin, updateUserStatus);
router.put('/users/:userId/reset-password', protect, isAdmin, resetUserPassword);
router.put('/users/:userId/role', protect, isAdmin, updateUserRole);

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

// Rutas de Estadísticas
router.get('/stats', protect, isAdmin, getDashboardStats);

module.exports = router;
```

src/controllers/adminController.js
```javascript
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
    const setPasswordUrl = `${process.env.APP_URL}/reset-password.html?token=${resetToken}`;
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

const resetUserPassword = async (req, res) => {
  const { userId } = req.params;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const userResult = await client.query("SELECT id, name, email FROM users WHERE id = $1", [userId]);
    if (userResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Usuario no encontrado.' });
    }
    const user = userResult.rows[0];

    const resetToken = crypto.randomBytes(32).toString('hex');
    const expires_at = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 horas de validez

    await client.query("INSERT INTO password_reset_tokens (token, user_id, expires_at) VALUES ($1, $2, $3)", [resetToken, user.id, expires_at]);

    const setPasswordUrl = `${process.env.APP_URL}/reset-password.html?token=${resetToken}`;
    sendEmail({
      to: user.email,
      subject: 'Restablecimiento de Contraseña para Padel@Home',
      html: `<h3>¡Hola, ${user.name}!</h3><p>Se ha solicitado un restablecimiento de contraseña para tu cuenta de Padel@Home.</p><p>Por favor, haz clic en el siguiente enlace para establecer una nueva contraseña. El enlace es válido por 24 horas.</p><a href="${setPasswordUrl}">Establecer nueva contraseña</a><p>Si no solicitaste este cambio, por favor ignora este correo.</p>`
    });

    await client.query('COMMIT');
    res.status(200).json({ message: 'Enlace de restablecimiento de contraseña enviado al correo del usuario.' });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error al solicitar restablecimiento de contraseña para usuario:', error);
    res.status(500).json({ message: 'Error interno del servidor.' });
  } finally {
    client.release();
  }
};

const updateUserRole = async (req, res) => {
  try {
    const { userId } = req.params;
    const { role } = req.body;

    if (!['user', 'admin'].includes(role)) {
      return res.status(400).json({ message: 'El rol proporcionado no es válido. Debe ser "user" o "admin".' });
    }

    const result = await pool.query(
      "UPDATE users SET role = $1 WHERE id = $2 RETURNING id, name, email, role",
      [role, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Usuario no encontrado.' });
    }

    res.json({ message: `Rol del usuario actualizado a '${role}'.`, user: result.rows[0] });
  } catch (error) {
    console.error('Error al actualizar el rol del usuario:', error);
    res.status(500).json({ message: 'Error interno del servidor.' });
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
    res.status(500).json({ message: 'Error interno del servidor.' });
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
    res.status(500).json({ message: 'Error interno del servidor.' });
  } finally {
    client.release();
  }
};

// --- AÑADE ESTA NUEVA FUNCIÓN ---
const getDashboardStats = async (req, res) => {
  try {
    // 1. Total de reservas en los últimos 30 días
    const totalBookingsResult = pool.query(
      "SELECT COUNT(*) as total_bookings FROM bookings WHERE status = 'confirmed' AND start_time > NOW() - INTERVAL '30 days'"
    );

    // 2. Usuarios más activos (Top 3)
    const topUsersResult = pool.query(
      `SELECT u.name, COUNT(b.id) as booking_count
       FROM bookings b
       JOIN users u ON b.user_id = u.id
       WHERE b.status = 'confirmed' AND b.start_time > NOW() - INTERVAL '30 days'
       GROUP BY u.name
       ORDER BY booking_count DESC
       LIMIT 3`
    );

    // 3. Horas pico (agrupadas por hora del día)
    const peakHoursResult = pool.query(
      `SELECT EXTRACT(HOUR FROM start_time) as hour, COUNT(*) as count
       FROM bookings
       WHERE status = 'confirmed' AND start_time > NOW() - INTERVAL '30 days'
       GROUP BY hour
       ORDER BY count DESC`
    );
    
    // Ejecutamos todas las consultas en paralelo
    const [totalBookings, topUsers, peakHours] = await Promise.all([
      totalBookingsResult,
      topUsersResult,
      peakHoursResult
    ]);

    // Formateamos la respuesta
    const stats = {
      totalBookings: totalBookings.rows[0].total_bookings || 0,
      topUsers: topUsers.rows,
      peakHours: peakHours.rows,
    };

    res.json(stats);

  } catch (error) {
    console.error('Error al obtener las estadísticas del dashboard:', error);
    res.status(500).json({ message: 'Error interno del servidor.' });
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
  getDashboardStats,
  resetUserPassword,
  updateUserRole, // <-- añade esto
};
```

src/api/waitingListRoutes.js
```javascript
const express = require('express');
const router = express.Router();
const { joinWaitingList, confirmBookingFromWaitlist } = require('../controllers/waitingListController');
const { protect } = require('../middleware/authMiddleware');

// POST /api/waiting-list - Apuntarse a la lista de espera
router.post('/', protect, joinWaitingList);

// POST /api/waiting-list/confirm - Confirmar la reserva desde el email
router.post('/confirm', confirmBookingFromWaitlist);

module.exports = router;
```

src/controllers/waitingListController.js
```javascript
const pool = require('../config/database');

const joinWaitingList = async (req, res) => {
  const userId = req.user.id;
  const { courtId, slotStartTime, slotEndTime } = req.body;

  if (!courtId || !slotStartTime || !slotEndTime) {
    return res.status(400).json({ message: 'Se requiere courtId, slotStartTime y slotEndTime.' });
  }

  try {
    // Verificar si el slot ya está ocupado por una reserva confirmada
    const bookingResult = await pool.query(
      "SELECT id FROM bookings WHERE court_id = $1 AND start_time = $2 AND status = 'confirmed'",
      [courtId, slotStartTime]
    );
    if (bookingResult.rows.length === 0) {
      return res.status(400).json({ message: 'Este horario no está ocupado o ya no existe.' });
    }
    
    // Verificar si el usuario ya está en la lista de espera para este slot
    const existingEntry = await pool.query(
      "SELECT id FROM waiting_list_entries WHERE user_id = $1 AND court_id = $2 AND slot_start_time = $3 AND status = 'waiting'",
      [userId, courtId, slotStartTime]
    );
    if (existingEntry.rows.length > 0) {
      return res.status(400).json({ message: 'Ya estás en la lista de espera para este horario.' });
    }

    const { rows } = await pool.query(
      "INSERT INTO waiting_list_entries (court_id, user_id, slot_start_time, slot_end_time) VALUES ($1, $2, $3, $4) RETURNING *",
      [courtId, userId, slotStartTime, slotEndTime]
    );

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
    // Buscar la entrada en la lista de espera con el token y que no haya expirado
    const entryResult = await pool.query(
      "SELECT * FROM waiting_list_entries WHERE confirmation_token = $1 AND status = 'notified' AND notification_expires_at > NOW()",
      [token]
    );

    if (entryResult.rows.length === 0) {
      throw new Error('El enlace de confirmación es inválido o ha expirado.');
    }
    const entry = entryResult.rows[0];

    // Verificar si el slot sigue libre (la reserva original pudo haber sido tomada por otro)
    const bookingResult = await pool.query(
      "SELECT id FROM bookings WHERE court_id = $1 AND start_time = $2 AND status = 'confirmed'",
      [entry.court_id, entry.slot_start_time]
    );
    if (bookingResult.rows.length > 0) {
      throw new Error('Lo sentimos, alguien ha reservado este slot justo antes que tú.');
    }

    // Crear la nueva reserva
    await client.query(
      "INSERT INTO bookings (court_id, user_id, start_time, end_time, status) VALUES ($1, $2, $3, $4, 'confirmed')",
      [entry.court_id, entry.user_id, entry.slot_start_time, entry.slot_end_time]
    );

    // Actualizar el estado de la entrada de la lista de espera
    await client.query(
      "UPDATE waiting_list_entries SET status = 'confirmed' WHERE id = $1",
      [entry.id]
    );

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
```

src/api/matchRoutes.js
```javascript
const express = require('express');
const router = express.Router();
const { getOpenMatches, joinOpenMatch, leaveOpenMatch, getMatchParticipants } = require('../controllers/matchController');
const { protect } = require('../middleware/authMiddleware');

// GET /api/matches/open - Obtener todas las partidas abiertas disponibles
router.get('/open', protect, getOpenMatches);

// POST /api/matches/:bookingId/join - Unirse a una partida abierta
router.post('/:bookingId/join', protect, joinOpenMatch);

// DELETE /api/matches/:bookingId/leave - Abandonar una partida abierta
router.delete('/:bookingId/leave', protect, leaveOpenMatch);

// GET /api/matches/:bookingId/participants - Ver los participantes de una partida
router.get('/:bookingId/participants', protect, getMatchParticipants);

module.exports = router;
```

src/controllers/matchController.js
```javascript
const pool = require('../config/database');

const getOpenMatches = async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT 
        b.id, 
        b.court_id, 
        c.name as court_name,
        b.start_time, 
        b.end_time, 
        b.max_participants,
        COUNT(mp.user_id) as current_participants,
        b.user_id as organizer_id,
        u.name as organizer_name
      FROM bookings b
      JOIN courts c ON b.court_id = c.id
      LEFT JOIN match_participants mp ON b.id = mp.booking_id
      JOIN users u ON b.user_id = u.id
      WHERE b.is_open_match = TRUE 
        AND b.status = 'confirmed' 
        AND b.end_time > NOW()
      GROUP BY b.id, c.name, u.name
      ORDER BY b.start_time ASC;
    `);
    res.json(rows);
  } catch (error) {
    console.error('Error al obtener partidas abiertas:', error);
    res.status(500).json({ message: 'Error interno del servidor.' });
  }
};

const joinOpenMatch = async (req, res) => {
  const userId = req.user.id;
  const { bookingId } = req.params;
  if (!bookingId || isNaN(parseInt(bookingId))) {
    return res.status(400).json({ message: 'El ID de la partida proporcionado no es válido.' });
  }
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // Bloquear la fila de la reserva para evitar condiciones de carrera
    const bookingResult = await client.query("SELECT * FROM bookings WHERE id = $1 AND status = 'confirmed' FOR UPDATE", [bookingId]);
    if (bookingResult.rows.length === 0) throw new Error('Esta partida ya no existe o ha sido cancelada.');
    
    const booking = bookingResult.rows[0];
    if (!booking.is_open_match) throw new Error('Esta reserva no es una partida abierta.');
    if (booking.user_id === userId) throw new Error('No puedes unirte a tu propia partida, ya eres el organizador.');

    // Contar participantes actuales
    const participantsResult = await client.query("SELECT user_id FROM match_participants WHERE booking_id = $1", [bookingId]);
    if (participantsResult.rows.length >= booking.max_participants) throw new Error('Esta partida ya está completa.');
    
    // Verificar si el usuario ya está unido
    const isAlreadyJoined = participantsResult.rows.some(p => p.user_id == userId);
    if (isAlreadyJoined) throw new Error('Ya te has unido a esta partida.');

    // Añadir participante
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
  const userId = req.user.id; // Usuario que abandona
  const { bookingId } = req.params;
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Obtenemos la reserva y la bloqueamos
    const bookingResult = await client.query(
      "SELECT * FROM bookings WHERE id = $1 AND status = 'confirmed' FOR UPDATE",
      [bookingId]
    );
    if (bookingResult.rows.length === 0) {
      throw new Error("La partida ya no existe o fue cancelada.");
    }
    const booking = bookingResult.rows[0];
    const isOwner = booking.user_id == userId; // ¿El que abandona es el dueño?

    // 2. Verificamos que el usuario está realmente en la partida y lo eliminamos
    // Esta eliminación se hace SIEMPRE, sea dueño o participante, porque el dueño también "abandona" su rol.
    // Si el dueño no está en match_participants, esta query no eliminará nada, lo cual es correcto.
    await client.query(
      "DELETE FROM match_participants WHERE booking_id = $1 AND user_id = $2",
      [bookingId, userId]
    );

    // --- LÓGICA DE REGLAS DE NEGOCIO ---
    const hoursRemaining = (new Date(booking.start_time).getTime() - new Date().getTime()) / 3600000;
    const autoCancelHoursBefore = booking.auto_cancel_hours_before || 6; // Default to 6 hours if not set
    
    // 3. REGLA: Cancelación a última hora (< 6h)
    // Si faltan 6 horas o menos, y alguien (CUALQUIERA) se va, la partida se cancela.
    if (hoursRemaining <= autoCancelHoursBefore) {
      await client.query("UPDATE bookings SET status = 'cancelled_by_admin' WHERE id = $1", [bookingId]);
      console.log(`Partida ${bookingId} cancelada por abandono a última hora.`);
      // TODO: Notificar a todos los participantes restantes de la cancelación.
    } 
    // 4. REGLA: El organizador abandona (y faltan MÁS de 6 horas)
    else if (isOwner) {
      // 4a. Buscamos al siguiente participante por orden de antigüedad
      const nextOrganizerResult = await client.query(
        "SELECT user_id FROM match_participants WHERE booking_id = $1 ORDER BY joined_at ASC LIMIT 1",
        [bookingId]
      );
      
      if (nextOrganizerResult.rows.length > 0) {
        // 4b. Si hay alguien, lo nombramos nuevo organizador
        const newOwnerId = nextOrganizerResult.rows[0].user_id;
        await client.query("UPDATE bookings SET user_id = $1 WHERE id = $2", [newOwnerId, bookingId]);
        console.log(`Partida ${bookingId}: El organizador ha cambiado a ${newOwnerId}.`);
      } else {
        // 4c. Si no queda nadie, la partida se cancela
        await client.query("UPDATE bookings SET status = 'cancelled_by_admin' WHERE id = $1", [bookingId]);
        console.log(`Partida ${bookingId} cancelada. El organizador era el último jugador.`);
      }
    }
    // 5. Si abandona un participante normal y faltan MÁS de 6 horas, no pasa nada
    // (Simplemente se libera un hueco).

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

const getMatchParticipants = async (req, res) => {
  const { bookingId } = req.params;

  try {
    // Obtenemos el ID del organizador primero
    const bookingResult = await pool.query("SELECT user_id FROM bookings WHERE id = $1", [bookingId]);
    if (bookingResult.rows.length === 0) {
      throw new Error("Partida no encontrada.");
    }
    const ownerId = bookingResult.rows[0].user_id;

    // Buscamos a todos los participantes y sus nombres
    const participantsResult = await pool.query(
      `SELECT u.id, u.name 
       FROM match_participants mp
       JOIN users u ON mp.user_id = u.id
       WHERE mp.booking_id = $1
       ORDER BY mp.joined_at ASC`, // Ordenamos por orden de llegada
      [bookingId]
    );

    // Mapeamos el resultado para marcar quién es el organizador
    const participants = participantsResult.rows.map(p => ({
      id: p.id,
      name: p.name,
      isOwner: p.id == ownerId // Añadimos una bandera si es el organizador
    }));

    res.json(participants);

  } catch (error) {
    console.error('Error al obtener participantes:', error);
    res.status(400).json({ message: error.message });
  }
};

module.exports = {
  getOpenMatches,
  joinOpenMatch,
  leaveOpenMatch,
  getMatchParticipants,
};
```

5. Código Fuente del Frontend (Carpeta public/)

public/style.css
```css
/* Fichero: public/style.css */

/* --- 1. Definición de Variables (Nuestra Paleta de Colores) --- */
:root {
  --primary-color: #0d6efd;      /* Un azul profesional y vibrante */
  --secondary-color: #6c757d;   /* Un gris neutro para texto secundario */
  --accent-color: #527853;       /* Un verde salvia (sage green) para acentos */
  --background-color: #f8f9fa;  /* Un gris muy claro para el fondo */
  --surface-color: #ffffff;     /* Blanco para las "tarjetas" y superficies */
  --text-color: #212529;        /* Negro/gris oscuro para el texto principal */
  --border-color: #dee2e6;      /* Un gris claro para bordes */
  --success-color: #198754;     /* Verde para mensajes de éxito */
  --danger-color: #dc3545;      /* Rojo para errores */
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

/* --- 3. Contenedor Principal --- */
.container {
  max-width: 960px;
  margin: 20px auto; /* Centra el contenido en la página */
  padding: 0 15px;
}


/* Fichero: public/style.css (añadir al final) */

/* --- Estilos para el Dashboard --- */

.main-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.card {
  background-color: var(--surface-color);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 24px;
  margin-bottom: 20px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
}

/* Estilo para botones */
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

button:hover {
  background-color: #0b5ed7; /* Un azul un poco más oscuro */
}

button#cancel-booking-btn {
  background-color: var(--danger-color);
}
button#cancel-booking-btn:hover {
  background-color: #bb2d3b;
}

/* Estilo para inputs */
input[type="date"] {
  padding: 8px;
  border: 1px solid var(--border-color);
  border-radius: 5px;
  font-size: 1em;
}

/* --- La Magia: Grid para los Slots de Disponibilidad --- */
#slots-container {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); /* Columnas responsivas */
  gap: 10px; /* Espacio entre botones */
}

#slots-container button {
  background-color: var(--accent-color); /* Nuestro verde salvia */
  width: 100%;
}
#slots-container button:hover {
  background-color: #4a6b4b; /* Un verde un poco más oscuro */
}

/* Fichero: public/style.css (añadir al final) */

/* --- Estilos para las Páginas de Login y Registro --- */

.auth-container {
  display: flex;
  justify-content: center; /* Centrado horizontal */
  align-items: center;    /* Centrado vertical */
  min-height: 100vh;      /* Ocupa toda la altura de la pantalla */
  padding: 20px;
  box-sizing: border-box; /* Para que el padding no afecte el tamaño total */
}

.auth-card {
  width: 100%;
  max-width: 400px; /* Ancho máximo para el formulario */
}

.auth-card h1 {
  text-align: center;
  margin-bottom: 0.5em;
}

.auth-card p {
  text-align: center;
  color: var(--secondary-color);
  margin-top: 0;
  margin-bottom: 2em;
}

.form-group {
  margin-bottom: 1.5em;
}

.form-group label {
  display: block;
  margin-bottom: 0.5em;
  font-weight: 500;
}

/* Aplicamos un estilo más moderno a todos los inputs */
input[type="text"],
input[type="email"],
input[type="password"],
input[type="tel"],
input[type="date"],
input[type="time"],
input[type="number"],
textarea,
select {
  width: 100%;
  padding: 10px;
  border: 1px solid var(--border-color);
  border-radius: 5px;
  box-sizing: border-box; /* Importante para que el padding no desborde el ancho */
  font-size: 1em;
}

button.full-width {
  width: 100%;
  padding: 12px;
  font-size: 1.1em;
  margin-top: 1em;
}

.switch-form-text {
  text-align: center;
  margin-top: 1.5em;
}

a {
  color: var(--primary-color);
  text-decoration: none;
}

a:hover {
  text-decoration: underline;
}

.error-text {
    color: var(--danger-color);
    text-align: center;
    font-weight: bold;
}
.success-text {
    color: var(--success-color);
    text-align: center;
    font-weight: bold;
}

/* Fichero: public/style.css (añadir al final) */

/* --- Estilos para el Panel de Administración --- */

.admin-grid {
  display: grid;
  grid-template-columns: 1fr 1fr; /* Dos columnas de igual tamaño */
  gap: 20px; /* Espacio entre las tarjetas */
}

.admin-card {
  display: flex;
  flex-direction: column;
}

.full-width-card {
  grid-column: 1 / -1; /* Hace que esta tarjeta ocupe todo el ancho */
}

/* Estilo para tablas */
table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 1em;
}
th, td {
  border: 1px solid var(--border-color);
  padding: 8px 12px;
  text-align: left;
  vertical-align: middle;
}
th {
  background-color: #f8f9fa;
  font-weight: 600;
}
tr:nth-child(even) {
  background-color: #f8f9fa; /* Color suave para filas alternas */
}
td button {
  padding: 5px 10px;
  margin-right: 5px;
  font-size: 0.9em;
}

/* Estilo para listas */
#courts-list-container ul, #blocks-list-container ul {
  list-style-type: none;
  padding: 0;
}
#courts-list-container li, #blocks-list-container li {
  padding: 10px;
  border-bottom: 1px solid var(--border-color);
}
#courts-list-container li:last-child, #blocks-list-container li:last-child {
  border-bottom: none;
}

/* Pequeños ajustes a los formularios del admin */
.form-buttons {
  margin-top: 1em;
}
.settings-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  margin-top: 1em;
  margin-bottom: 1em;
}

/* Ajuste para checkbox en línea con su label */
#court-active-div, .settings-grid .form-group {
    display: flex;
    align-items: center;
    gap: 10px;
}

/* --- Estilos para el Calendario Semanal --- */

.calendar-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1em;
}

#weekly-calendar-container {
  overflow-x: auto; /* Permite scroll horizontal en pantallas pequeñas */
}

.calendar-grid {
  display: grid;
  /* 8 columnas: 1 para la hora + 7 para los días */
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
}

.day-header, .time-header {
  background-color: #e9ecef;
  font-weight: bold;
  position: sticky; /* Para que las cabeceras se queden fijas al hacer scroll */
  top: 0;
  z-index: 10;
}

.time-header {
  left: 0;
  z-index: 20;
}

.slot {
  cursor: pointer;
  transition: transform 0.1s ease;
}
.slot:hover {
    transform: scale(1.05);
    z-index: 30;
}

/* Colores de estado (nuestro semáforo) */
.slot.available { background-color: #d4edda; } /* Verde claro */
.slot.open-match { background-color: #fff3cd; } /* Amarillo claro */
.slot.booked { background-color: #f8d7da; color: #58151d; font-weight: bold; } /* Rojo claro */
.slot.blocked { background-color: #6c757d; color: white; } /* Gris oscuro */

/* Leyenda de colores */
.legend { display: flex; gap: 15px; margin-top: 15px; font-size: 0.9em; }
.color-box { display: inline-block; width: 15px; height: 15px; border: 1px solid #ccc; vertical-align: middle; margin-right: 5px;}
.color-box.available { background-color: #d4edda; }
.color-box.open-match { background-color: #fff3cd; }
.color-box.booked { background-color: #f8d7da; }



#modal-overlay {
  position: fixed; /* Se posiciona sobre toda la ventana */
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.6); /* Fondo semitransparente */
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000; /* Para que esté por encima de todo */
}

#booking-modal {
  width: 100%;
  max-width: 450px;
  text-align: center;
}

#modal-options-container {
  display: flex;
  justify-content: center;
  gap: 15px; /* Espacio entre los botones de duración */
  margin: 20px 0;
}

#modal-options-container button {
  background-color: var(--success-color); /* Usamos el color de éxito para las opciones */
  font-size: 1.1em;
}

#modal-options-container button:hover {
    background-color: #157347;
}

#modal-cancel-btn {
  background-color: var(--secondary-color);
}

/* Clase para ocultar/mostrar el modal */
.hidden {
  display: none !important;
}

/* --- Estilos para el Modal de Lista de Espera --- */
/* Podemos reutilizar la clase del overlay del otro modal si la hacemos más genérica */
/* Por ahora, por claridad, creamos una nueva */

#waitlist-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.6);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

#waitlist-modal {
  width: 100%;
  max-width: 450px;
  text-align: center;
}

#waitlist-modal-options {
    display: flex;
    justify-content: center;
    gap: 15px;
    margin-top: 20px;
}

#waitlist-join-btn {
    background-color: var(--accent-color);
}
#waitlist-join-btn:hover {
    background-color: #4a6b4b;
}

#waitlist-cancel-btn {
    background-color: var(--secondary-color);
}
/* --- Estilos para el Modal de Partida Abierta --- */
#join-match-modal-overlay {
  position: fixed; top: 0; left: 0; width: 100%; height: 100%;
  background-color: rgba(0, 0, 0, 0.6);
  display: flex; justify-content: center; align-items: center; z-index: 1000;
}
#join-match-modal { width: 100%; max-width: 450px; text-align: center; }
#join-match-modal-options { display: flex; justify-content: center; gap: 15px; margin-top: 20px; }
#join-match-confirm-btn { background-color: var(--accent-color); }
#join-match-confirm-btn:hover { background-color: #4a6b4b; }
#join-match-cancel-btn { background-color: var(--secondary-color); }

.open-match-toggle {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    background-color: #f8f9fa;
    padding: 10px;
    border-radius: 5px;
    margin-bottom: 1em;
}
.participants-box {
    background-color: #f8f9fa;
    border: 1px solid var(--border-color);
    border-radius: 5px;
    padding: 10px;
    margin-bottom: 1em;
}
.participants-box ul {
    list-style-type: none;
    padding-left: 0;
    text-align: left;
    margin: 10px 0 0 0;
}
.participants-box li {
    padding: 5px;
    border-bottom: 1px solid #eee;
}
.participants-box li:last-child {
    border-bottom: none;
}
/* Fichero: public/style.css (añadir al final) */
/* --- Estilos para el Dashboard de Estadísticas --- */
#stats-container {  display: grid;  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));  gap: 20px;}
.stat-item {
  background-color: #f8f9fa;
  border: 1px solid var(--border-color);
  border-radius: 5px;
  padding: 15px;
}

.stat-item h3 {
  margin-top: 0;
  color: var(--secondary-color);
  font-size: 1.1em;
}

.stat-item p {
  font-size: 2.5em;
  font-weight: bold;
  color: var(--primary-color);
  text-align: center;
  margin: 10px 0;
}

.stat-item ol, .stat-item ul {
  padding-left: 20px;
}

.stat-item li {
  margin-bottom: 8px;
  font-size: 0.95em;
}
/* Fichero: public/style.css (añadir al final) */
/* --- Estilos para el Dashboard de Estadísticas --- */
#stats-container {  display: grid;  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));  gap: 20px;}
.stat-item {
  background-color: #f8f9fa;
  border: 1px solid var(--border-color);
  border-radius: 5px;
  padding: 15px;
}

.stat-item h3 {
  margin-top: 0;
  color: var(--secondary-color);
  font-size: 1.1em;
}

.stat-item p {
  font-size: 2.5em;
  font-weight: bold;
  color: var(--primary-color);
  text-align: center;
  margin: 10px 0;
}

.stat-item ol, .stat-item ul {
  padding-left: 20px;
}

.stat-item li {
  margin-bottom: 8px;
  font-size: 0.95em;
}
```

public/login.html
```html
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-T">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Padel@Home - Login</title>
  <link rel="manifest" href="/manifest.json">
<link rel="stylesheet" href="/style.css"> 
  </head>
<body>

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
        <p>¿No tienes una cuenta? <a href="/register.html">Regístrate aquí</a>.</p>
      </div>
    </div>
  </div>

  <script src="login.js"></script>
  <script src="main.js"></script>
</body>
</body>
</html>
```

public/login.js
```javascript
// Fichero: public/login.js

// 1. Obtenemos referencias a los elementos del HTML
const loginForm = document.getElementById('login-form');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const errorMessage = document.getElementById('error-message');
const registerLink = document.getElementById('register-link-container'); // <-- AÑADIR ESTA LÍNEA

// --- REEMPLAZA ESTA FUNCIÓN ---
const checkRegistrationStatus = async () => {
    try {
        const response = await fetch(`/api/auth/registration-status`);
        if (!response.ok) return;
        const data = await response.json();
        if (data.allowRegistration === true) {
            registerLink.style.display = 'block'; // Muestra el enlace
        } else {
            registerLink.style.display = 'none'; // Oculta el enlace
        }
    } catch (e) {
        console.error("No se pudo verificar el estado del registro.", e);
        registerLink.style.display = 'none'; // Más seguro ocultarlo si hay un error
    }
};

document.addEventListener('DOMContentLoaded', () => {
  // 2. Añadimos un "escuchador" para el evento 'submit' del formulario
  loginForm.addEventListener('submit', async (event) => {
    // Prevenimos el comportamiento por defecto del formulario (que recargaría la página)
    event.preventDefault(); 

    // 3. Obtenemos los valores de los inputs
    const email = emailInput.value;
    const password = passwordInput.value;
    
    // Limpiamos mensajes de error anteriores
    errorMessage.textContent = '';

    try {
      // 4. Usamos la API 'fetch' para llamar a nuestro endpoint de login en el backend
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      // 5. Manejamos la respuesta del servidor
      if (!response.ok) {
        // Si la respuesta no es exitosa (ej. 401, 403), mostramos el error
        throw new Error(data.message || 'Error al iniciar sesión');
      }

      // ¡Éxito! Guardamos el token y redirigimos
      console.log('Login exitoso!', data);
      
      localStorage.setItem('authToken', data.token);
      // Redirigimos al dashboard
      window.location.href = '/dashboard.html';

    } catch (error) {
      // Si hubo un error en la llamada fetch o en la respuesta, lo mostramos
      errorMessage.textContent = error.message;
    }
  });

  // Asegúrate de que esta función se llama al cargar la página
  checkRegistrationStatus();
});
```

public/register.html
```html
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Padel@Home - Registro</title>
  <link rel="manifest" href="/manifest.json"> </head>
<link rel="stylesheet" href="/style.css">
<body>
<div class="auth-container">
    <div class="card auth-card">
      <h1>Registro de Usuario</h1>
      <p>Crea tu cuenta para empezar a reservar.</p>

      <form id="register-form">
        <div class="form-group"><label for="name">Nombre Completo:</label><input type="text" id="name" required></div>
        <div class="form-group"><label for="email">Correo Electrónico:</label><input type="email" id="email" required></div>
        <div class="form-group"><label for="password">Contraseña:</label><input type="password" id="password" required></div>
        <div class="form-group"><label for="building">Edificio / Bloque:</label><input type="text" id="building"></div>
        <div class="form-group"><label for="floor">Piso:</label><input type="text" id="floor"></div>
        <div class="form-group"><label for="door">Puerta:</label><input type="text" id="door"></div>
        <div class="form-group"><label for="phone_number">Teléfono (opcional):</label><input type="tel" id="phone_number"></div>
        
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
```

public/register.js
```javascript
// Fichero: public/register.js

const API_BASE_URL = '';

const registerForm = document.getElementById('register-form');
const messageParagraph = document.getElementById('message');

registerForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  // Recogemos los datos del formulario usando el objeto FormData
  const formData = new FormData(registerForm);
  const data = Object.fromEntries(formData.entries());

  // Extraemos los valores de los inputs por su 'id' para más claridad
  data.name = document.getElementById('name').value;
  data.email = document.getElementById('email').value;
  data.password = document.getElementById('password').value;
  data.building = document.getElementById('building').value;
  data.floor = document.getElementById('floor').value;
  data.door = document.getElementById('door').value;
  data.phone_number = document.getElementById('phone_number').value;

  messageParagraph.textContent = 'Enviando registro...';
  messageParagraph.style.color = 'black';

  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || 'Error al registrar la cuenta.');
    }

    // Éxito
    registerForm.reset();
    messageParagraph.style.color = 'green';
    messageParagraph.textContent = '¡Registro exitoso! Un administrador debe aprobar tu cuenta antes de que puedas iniciar sesión. Serás redirigido a la página de login en 5 segundos.';

    setTimeout(() => {
      window.location.href = '/login.html';
    }, 5000);

  } catch (error) {
    messageParagraph.style.color = 'red';
    messageParagraph.textContent = error.message;
  }
});
```

public/reset-password.html
```html
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Padel@Home - Restablecer Contraseña</title>
  <link rel="stylesheet" href="/style.css"> <link rel="manifest" href="/manifest.json">
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
```

public/reset-password.js
```javascript
// Fichero: public/reset-password.js

const API_BASE_URL = '';

// Obtenemos referencias a los elementos del HTML
const resetForm = document.getElementById('reset-password-form');
const passwordInput = document.getElementById('password');
const confirmPasswordInput = document.getElementById('confirm-password');
const messageParagraph = document.getElementById('message');

// 1. Extraemos el token de la URL de la página
const urlParams = new URLSearchParams(window.location.search);
const token = urlParams.get('token');

// Si no hay token en la URL, mostramos un error
if (!token) {
  messageParagraph.textContent = 'Error: No se ha proporcionado un token válido.';
  messageParagraph.className = 'error-text';
}

resetForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  const password = passwordInput.value;
  const confirmPassword = confirmPasswordInput.value;

  // 2. Verificamos que las contraseñas coinciden
  if (password !== confirmPassword) {
    messageParagraph.textContent = 'Las contraseñas no coinciden.';
    messageParagraph.className = 'error-text';
    return;
  }

  messageParagraph.textContent = 'Guardando...';
  messageParagraph.className = '';

  try {
    // 3. Hacemos la llamada a la API que ya teníamos construida
    const response = await fetch(`${API_BASE_URL}/api/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token: token,
        newPassword: password
      })
    });

    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.message || 'El token es inválido o ha expirado.');
    }

    // 4. Éxito
    messageParagraph.textContent = '¡Contraseña actualizada con éxito! Serás redirigido a la página de login en 3 segundos.';
    messageParagraph.className = 'success-text';

    setTimeout(() => {
      window.location.href = '/login.html';
    }, 3000);

  } catch (error) {
    messageParagraph.textContent = error.message;
    messageParagraph.className = 'error-text';
  }
});
```

public/confirm-booking.html
```html
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
      <p id="status-message">Por favor, espera un momento mientras procesamos tu solicitud.</p>
      <a href="/login.html" id="login-link" style="display: none;">Ir a Iniciar Sesión</a>
    </div>
  </div>
  <script src="confirm-booking.js"></script>
  <script src="main.js"></script>
</body>
</html>
```

public/confirm-booking.js
```javascript
// Fichero: public/confirm-booking.js
const API_BASE_URL = '';

const statusTitle = document.getElementById('status-title');
const statusMessage = document.getElementById('status-message');
const loginLink = document.getElementById('login-link');

// Esta función se ejecuta automáticamente al cargar la página
async function confirmBooking() {
  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get('token');

  if (!token) {
    statusTitle.textContent = 'Error';
    statusMessage.textContent = 'Falta el token de confirmación. Por favor, usa el enlace de tu correo.';
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
}

// Llamamos a la función cuando se carga la ventana
window.addEventListener('load', confirmBooking);
```

public/dashboard.html
```html
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
        <div id="notification-container"></div>
        <header class="main-header">
  <h1 id="welcome-message">Bienvenido a Padel@Home</h1>

  <div class="header-buttons">
    <button id="profile-btn">Mi Perfil</button>
    <button id="faq-btn">F.A.Q</button>

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
                <div class="court-selector">
                    <label for="court-select">Seleccionar Pista:</label>
                    <select id="court-select"></select>
                </div>
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
    <label for="open-match-checkbox">Abrir partida para que otros se unan (4 jugadores)</label>
  </div>
  <p>Por favor, elige la duración:</p>
  <div id="modal-options-container">
    </div>
  <hr>
  <button id="modal-cancel-btn">Cancelar</button>
</div>
    </div>
  
    <script src="main.js"></script>
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
  <p>Has seleccionado una partida para el <strong id="join-match-time">--:--</strong>.</p>
  
  <div class="participants-box">
      <p>Participantes actuales: <strong id="join-match-participants">--/--</strong>.</p>
      <ul id="join-match-participants-list">
          </ul>
  </div>
  <p>¿Quieres unirte a esta partida?</p>
  <div id="join-match-modal-options">
      <button id="join-match-confirm-btn">Sí, unirme</button>
      <button id="join-match-cancel-btn">No, gracias</button>
  </div>
</div>
</div>
    <script src="dashboard.js"></script>
  </body>
</html>
```

public/dashboard.js
```javascript
const API_BASE_URL = '';
const authToken = localStorage.getItem('authToken');

// --- 1. REFERENCIAS A ELEMENTOS DEL DOM ---
const notificationContainer = document.getElementById('notification-container');
const welcomeMessage = document.getElementById('welcome-message');
const adminPanelBtn = document.getElementById('admin-panel-btn');
const profileBtn = document.getElementById('profile-btn');
const faqBtn = document.getElementById('faq-btn'); // <-- AÑADE ESTA LÍNEA
const logoutButton = document.getElementById('logout-button');
const myBookingContainer = document.getElementById('my-booking-container');
const courtSelect = document.getElementById('court-select');
const calendarContainer = document.getElementById('weekly-calendar-container');
const weekDatesTitle = document.getElementById('week-dates-title');
const prevWeekBtn = document.getElementById('prev-week-btn');
const nextWeekBtn = document.getElementById('next-week-btn');
// Modales
const bookingModalOverlay = document.getElementById('modal-overlay');
const bookingModalTime = document.getElementById('modal-time');
const bookingModalOptions = document.getElementById('modal-options-container');
const openMatchCheckbox = document.getElementById('open-match-checkbox');
const bookingModalCancelBtn = document.getElementById('modal-cancel-btn');
const waitlistModalOverlay = document.getElementById('waitlist-modal-overlay');
const waitlistJoinBtn = document.getElementById('waitlist-join-btn');
const waitlistCancelBtn = document.getElementById('waitlist-cancel-btn');
const joinMatchModalOverlay = document.getElementById('join-match-modal-overlay');
const joinMatchTime = document.getElementById('join-match-time');
const joinMatchParticipants = document.getElementById('join-match-participants');
const joinMatchConfirmBtn = document.getElementById('join-match-confirm-btn');
const joinMatchCancelBtn = document.getElementById('join-match-cancel-btn');
const joinMatchParticipantsList = document.getElementById('join-match-participants-list'); // <-- AÑADIR ESTA LÍNEA


// --- 2. DATOS GLOBALES ---
let currentDisplayedDate = new Date();
let weeklyScheduleData = {};

    // --- 3. FUNCIONES AUXILIARES ---
    const formatDate = (date) => new Date(date).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
    const formatTime = (date) => new Date(date).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', hour12: false });

    const showNotification = (message, type = 'info') => {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        notificationContainer.appendChild(notification);
        setTimeout(() => {
            notification.remove();
        }, 5000);
    };

    const fetchApi = async (url, options = {}) => {
        const headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`,
            ...options.headers,
        };

        const response = await fetch(`${API_BASE_URL}${url}`, { ...options, headers });

        const data = await response.json();
        if (!response.ok) {
            const errorMessage = data.message || 'Error en la petición a la API';
            const detailedError = data.error ? `: ${data.error}` : '';
            throw new Error(errorMessage + detailedError);
        }
        return data;
    };

    // --- 4. FUNCIONES PRINCIPALES ---

    const fetchAndPopulateCourts = async () => {
        try {
            const courts = await fetchApi('/api/courts');
            courtSelect.innerHTML = ''; // Limpiar opciones existentes
            courts.forEach(court => {
                const option = document.createElement('option');
                option.value = court.id;
                option.textContent = court.name;
                courtSelect.appendChild(option);
            });
        } catch (error) {
            console.error("Error en fetchAndPopulateCourts:", error);
            showNotification('No se pudieron cargar las pistas. Inténtalo de nuevo.', 'error');
        }
    };

    const fetchUserProfile = async () => {
        try {
            const user = await fetchApi('/api/users/me');
            welcomeMessage.textContent = `Bienvenido, ${user.name}`;
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
            let buttonHtml = '';
            
            // LÓGICA DE BOTONES CORREGIDA:
            if (booking.is_open_match) {
                // Si es una partida abierta (seas dueño o participante), el botón es "Abandonar"
                buttonHtml = `<button id="leave-match-btn" data-booking-id="${booking.id}">Abandonar Partida</button>`;
            } else {
                // Si es una reserva normal (privada), el botón es "Cancelar"
                buttonHtml = `<button id="cancel-booking-btn" data-booking-id="${booking.id}">Cancelar Reserva</button>`;
            }

            myBookingContainer.innerHTML = `
                <p><strong>Pista:</strong> ${booking.court_name}<br><strong>Día:</strong> ${new Date(booking.start_time).toLocaleString('es-ES')}</p>
                ${buttonHtml}
            `;
        } else {
            myBookingContainer.innerHTML = '<p>No tienes ninguna reserva activa.</p>';
        }
    } catch (error) {
        console.error('Error en fetchMyBooking:', error);
        myBookingContainer.innerHTML = '<p style="color:red;">No se pudo obtener tu reserva.</p>';
    }
}

    const renderWeeklyCalendar = async (date) => {
        calendarContainer.innerHTML = '<p>Cargando calendario...</p>';
        const dateString = new Date(date).toISOString().split('T')[0];
        try {
            const data = await fetchApi(`/api/schedule/week?courtId=${courtSelect.value}&date=${dateString}`);
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
            const now = new Date(); 
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
                    
                    const slotTime = new Date(currentSlotData.startTime);
                    let cellContent = '';

                    if (slotTime < now) {
                        slotCell.classList.add('blocked');
                        cellContent = 'No disponible';
                    } else {
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
            showNotification('No hay suficiente tiempo continuo para una reserva completa (mínimo 60 min).', 'error');
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

        bookingModalOverlay.addEventListener('click', (event) => { if (event.target === bookingModalOverlay) bookingModalOverlay.classList.add('hidden'); });
        bookingModalCancelBtn.addEventListener('click', () => { bookingModalOverlay.classList.add('hidden'); });
        bookingModalOptions.addEventListener('click', handleBookingModalAction);

        bookingModalOverlay.classList.remove('hidden');
    };

    const showWaitlistModal = (target) => {
        const startTime = target.dataset.starttime;
        waitlistJoinBtn.dataset.courtid = courtSelect.value;
        waitlistJoinBtn.dataset.starttime = startTime;

        waitlistModalOverlay.addEventListener('click', (event) => { if (event.target.id === 'waitlist-modal-overlay') waitlistModalOverlay.classList.add('hidden'); });
        waitlistCancelBtn.addEventListener('click', () => { waitlistModalOverlay.classList.add('hidden'); });
        waitlistJoinBtn.addEventListener('click', handleWaitlistModalAction);

        waitlistModalOverlay.classList.remove('hidden');
    };
    
    const showOpenMatchModal = async (target) => {
    const { bookingId, participants, maxParticipants, starttime } = target.dataset;

    // Populamos la información básica
    joinMatchTime.textContent = new Date(starttime).toLocaleString('es-ES');
    joinMatchParticipants.textContent = `${participants}/${maxParticipants}`;
    joinMatchConfirmBtn.dataset.bookingId = bookingId;

    // Buscamos la lista de participantes
    joinMatchParticipantsList.innerHTML = '<li>Cargando jugadores...</li>';
    try {
        const response = await fetch(`${API_BASE_URL}/api/matches/${bookingId}/participants`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        if (!response.ok) throw new Error('No se pudo cargar la lista de jugadores.');

        const participantsData = await response.json();

        // Construimos la lista de jugadores
        joinMatchParticipantsList.innerHTML = '';
        participantsData.forEach(p => {
            const li = document.createElement('li');
            li.textContent = p.name + (p.isOwner ? ' (Organizador)' : '');
            joinMatchParticipantsList.appendChild(li);
        });
    } catch (error) {
        joinMatchParticipantsList.innerHTML = `<li style="color:red;">${error.message}</li>`;
    }

    joinMatchModalOverlay.classList.remove('hidden');
    joinMatchConfirmBtn.addEventListener('click', handleJoinMatchAction); // Re-adding the event listener
    joinMatchCancelBtn.addEventListener('click', () => { joinMatchModalOverlay.classList.add('hidden'); }); // Re-adding the event listener
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
            url = `/api/bookings/${bookingId}`;
            confirmMessage = '¿Estás seguro de que quieres cancelar esta reserva para TODOS los jugadores?';
        } else if (target.id === 'leave-match-btn') {
            url = `/api/matches/${bookingId}/leave`;
            confirmMessage = '¿Estás seguro de que quieres abandonar esta partida?';
        } else {
            return;
        }

        if (!confirm(confirmMessage)) return;

        try {
            const data = await fetchApi(url, { method });
            showNotification(data.message || 'Acción completada con éxito.', 'success');
            fetchMyBooking();
            renderWeeklyCalendar(currentDisplayedDate);
        } catch (error) {
            showNotification(error.message, 'error');
        }
    };
    
    const handleBookingModalAction = async (event) => {
        if (event.target.tagName !== 'BUTTON') return;
        const { startTime, duration } = event.target.dataset;
        const body = {
            courtId: courtSelect.value,
            startTime: startTime,
            durationMinutes: parseInt(duration),
            isOpenMatch: openMatchCheckbox.checked,
            maxParticipants: openMatchCheckbox.checked ? 4 : null
        };
        try {
            await fetchApi('/api/bookings', {
                method: 'POST',
                body: JSON.stringify(body)
            });
            showNotification('¡Reserva creada con éxito!', 'success');
            bookingModalOverlay.classList.add('hidden');
            renderWeeklyCalendar(currentDisplayedDate);
            fetchMyBooking();
        } catch (error) {
            showNotification(`Error al reservar: ${error.message}`, 'error');
        }
    };

    const handleWaitlistModalAction = async () => {
        const { courtid, starttime } = waitlistJoinBtn.dataset;
        const slotEndTime = new Date(new Date(starttime).getTime() + 30 * 60000).toISOString();
        try {
            await fetchApi('/api/waiting-list', {
                method: 'POST',
                body: JSON.stringify({ courtId: parseInt(courtid), slotStartTime: starttime, slotEndTime: slotEndTime })
            });
            showNotification('¡Te has apuntado a la lista de espera con éxito!', 'success');
            waitlistModalOverlay.classList.add('hidden');
        } catch(error) {
            showNotification(error.message, 'error');
        }
    };
    
    const handleJoinMatchAction = async (event) => {
        const bookingId = event.target.dataset.bookingId;
        if (!bookingId || bookingId === 'undefined') {
            showNotification('Error: No se pudo identificar la partida. El ID es inválido.', 'error');
            return;
        }
        try {
            await fetchApi(`/api/matches/${bookingId}/join`, {
                method: 'POST'
            });
            showNotification('¡Te has unido a la partida con éxito!', 'success');
            joinMatchModalOverlay.classList.add('hidden');
            renderWeeklyCalendar(currentDisplayedDate);
        } catch(error) {
            showNotification(error.message, 'error');
        }
    };
    
    // --- 6. LÓGICA DE INICIO Y ASIGNACIÓN DE EVENTOS ---
    
    const initializePage = async () => {
        if (!authToken) {
            showNotification('Debes iniciar sesión para ver esta página.', 'error');
            window.location.href = '/login.html';
            return;
        }

        // Carga de datos inicial
        await fetchAndPopulateCourts();
        fetchUserProfile();
        fetchMyBooking();
        renderWeeklyCalendar(currentDisplayedDate);

        // Listeners de navegación y acciones generales
        logoutButton.addEventListener('click', () => { localStorage.removeItem('authToken'); window.location.href = '/login.html'; });
        adminPanelBtn.addEventListener('click', () => { window.location.href = '/admin.html'; });
        profileBtn.addEventListener('click', () => { window.location.href = '/profile.html'; });
        faqBtn.addEventListener('click', () => { window.location.href = '/faq.html'; }); // <-- AÑADE ESTA LÍNEA
        prevWeekBtn.addEventListener('click', () => { currentDisplayedDate.setDate(currentDisplayedDate.getDate() - 7); renderWeeklyCalendar(currentDisplayedDate); });
        nextWeekBtn.addEventListener('click', () => { currentDisplayedDate.setDate(currentDisplayedDate.getDate() + 7); renderWeeklyCalendar(currentDisplayedDate); });
        courtSelect.addEventListener('change', () => renderWeeklyCalendar(currentDisplayedDate));
        
        // Listeners principales para delegación de eventos
        myBookingContainer.addEventListener('click', handleMyBookingActions);
        calendarContainer.addEventListener('click', handleCalendarClick);
        
    };

    // Envuelve toda la inicialización en un listener que se asegura de que el HTML está listo
    document.addEventListener('DOMContentLoaded', initializePage);
```

public/admin.html
```html
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Padel@Home - Panel de Admin</title>
   <link rel="manifest" href="/manifest.json">
<link rel="stylesheet" href="/style.css"> 
  <style>
    body { font-family: sans-serif; }
    table { width: 100%; border-collapse: collapse; }
    th, td { border: 1px solid #ccc; padding: 8px; text-align: left; }
    th { background-color: #f2f2f2; }
    button { cursor: pointer; }
  </style>
</head>
<body>
 <body>
  <div class="container">
    <div id="notification-container"></div>
    <header class="main-header">
      <h1>Panel de Administración</h1>
      <p>Bienvenido, <span id="admin-name"></span>. <button id="dashboard-button">Ir al Dashboard</button> <button id="logout-button">Cerrar Sesión</button></p>
    </header>

    <main class="admin-grid">
      <section class="card admin-card full-width-card">
        <h2>Estadísticas (Últimos 30 Días)</h2>
        <div id="stats-container">
          <div class="stat-item">
            <h3>Reservas Totales</h3>
            <p id="stats-total-bookings">0</p>
          </div>
          <div class="stat-item">
            <h3>Usuarios Más Activos</h3>
            <ol id="stats-top-users">
              <li>Cargando...</li>
            </ol>
          </div>
          <div class="stat-item">
            <h3>Horas Pico</h3>
            <ul id="stats-peak-hours">
              <li>Cargando...</li>
            </ul>
          </div>
        </div>
      </section>
      <section class="card admin-card">
        <h2>Gestión de Usuarios</h2>
        <div id="user-management">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Nombre</th>
                <th>Email</th>
                <th>Rol</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody id="user-table-body">
              </tbody>
          </table>
        </div>
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
      </section>
      <section class="card admin-card">
        <section class="card admin-card">
        <h2>Gestión de Edificios</h2>
        <div id="building-management">
          <h3 id="building-form-title">Añadir Nuevo Edificio</h3>
          <form id="building-form">
            <input type="hidden" id="building-id">
            <div class="form-group">
              <label for="building-address">Dirección / Identificador:</label>
              <input type="text" id="building-address" required>
            </div>
            <div class="form-group">
              <label for="building-description">Descripción (opcional):</label>
              <input type="text" id="building-description">
            </div>
            <div class="form-buttons">
              <button type="submit">Guardar</button>
              <button type="button" id="cancel-building-edit-btn" style="display: none;">Cancelar Edición</button>
            </div>
          </form>

          <h3>Edificios Existentes</h3>
          <div id="buildings-list-container">
            </div>
        </div>
      </section>
        
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
              <button type="button" id="cancel-edit-btn" style="display: none;">Cancelar Edición</button>
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
              <div class="form-group">
                <label for="setting-public-registration">Permitir Registro Público:</label>
                <input type="checkbox" id="setting-public-registration">
              </div>
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
</body>
</html>
```

public/admin.js
```javascript
const API_BASE_URL = '';
const authToken = localStorage.getItem('authToken');

// --- 1. REFERENCIAS A ELEMENTOS DEL DOM ---
const adminNameSpan = document.getElementById('admin-name');
const logoutButton = document.getElementById('logout-button');
const dashboardButton = document.getElementById('dashboard-button'); // <-- AÑADE ESTA LÍNEA
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
const publicRegistrationCheckbox = document.getElementById('setting-public-registration'); // <-- AÑADE ESTA 

// --- AÑADE ESTAS LÍNEAS ---
const statsTotalBookings = document.getElementById('stats-total-bookings');
const statsTopUsers = document.getElementById('stats-top-users');
const statsPeakHours = document.getElementById('stats-peak-hours');

const notificationContainer = document.getElementById('notification-container');

// --- 2. DATOS GLOBALES ---
let allCourtsData = [];
let allBuildings = [];

// --- 3. DEFINICIÓN DE FUNCIONES ---

const showNotification = (message, type = 'info') => {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    notificationContainer.appendChild(notification);
    setTimeout(() => {
        notification.remove();
    }, 5000);
};

const fetchApi = async (url, options = {}) => {
    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
        ...options.headers,
    };

    const response = await fetch(`${API_BASE_URL}${url}`, { ...options, headers });

    const data = await response.json();
    if (!response.ok) {
        throw new Error(data.message || 'Error en la petición a la API');
    }
    return data;
};

async function initializeAdminPanel() {
  try {
    const user = await fetchApi('/api/users/me');
    if (user.role !== 'admin') {
      showNotification('Acceso denegado. No eres administrador.', 'error');
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
    fetchAndDisplayStats(); // <-- AÑADE ESTA LLAMADA
  } catch (error) {
    console.error(error);
    localStorage.removeItem('authToken');
    showNotification('Sesión inválida. Por favor, inicia sesión de nuevo.', 'error');
    window.location.href = '/login.html';
  }
}

async function fetchAndDisplayUsers() {
  try {
    const users = await fetchApi('/api/admin/users');
    userTableBody.innerHTML = '';
    users.forEach(user => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${user.id}</td>
        <td>${user.name}</td>
        <td>${user.email}</td>
        <td>
          <select class="user-role-select" data-userid="${user.id}">
            <option value="user" ${user.role === 'user' ? 'selected' : ''}>Usuario</option>
            <option value="admin" ${user.role === 'admin' ? 'selected' : ''}>Administrador</option>
          </select>
        </td>
        <td>${user.account_status}</td>
        <td>
          ${user.account_status === 'pending_approval' ? `<button class="approve-btn" data-userid="${user.id}">Aprobar</button>` : ''}
          ${user.account_status === 'active' ? `<button class="deactivate-btn" data-userid="${user.id}">Desactivar</button>` : ''}
          ${user.account_status === 'inactive' ? `<button class="activate-btn" data-userid="${user.id}">Activar</button>` : ''}
          <button class="reset-password-btn" data-userid="${user.id}">Resetear Contraseña</button>
        </td>`;
      userTableBody.appendChild(row);
    });
  } catch (error) {
    console.error('Error al obtener usuarios:', error);
    userTableBody.innerHTML = '<tr><td colspan="5" style="color:red;">Error al cargar los usuarios.</td></tr>';
  }
}

async function fetchAndDisplayCourts() {
    try {
        const courts = await fetchApi('/api/courts');
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
}

async function fetchAndDisplayBuildings() {
  try {
    const buildings = await fetchApi('/api/admin/buildings');
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
}

async function fetchAndDisplayBlockedPeriods() {
  try {
    const blockedPeriods = await fetchApi('/api/admin/blocked-periods');
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
}

async function fetchAndDisplaySettings() {
  try {
    const settings = await fetchApi('/api/admin/settings');
    openTimeInput.value = settings.operating_open_time || '08:00';
    closeTimeInput.value = settings.operating_close_time || '22:00';
    advanceDaysInput.value = settings.booking_advance_days || '7';
    gapOptimizationCheckbox.checked = settings.enable_booking_gap_optimization === 'true';
    publicRegistrationCheckbox.checked = settings.allow_public_registration === 'true'; // <-- AÑADE ESTA
  } catch (error) {
    console.error('Error al obtener los ajustes:', error);
    showNotification('No se pudieron cargar los ajustes.', 'error');
  }
}

// --- AÑADE ESTA NUEVA FUNCIÓN ---
async function fetchAndDisplayStats() {
  try {
    const response = await fetch(`${API_BASE_URL}/api/admin/stats`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    if (!response.ok) throw new Error('No se pudieron cargar las estadísticas.');

    const stats = await response.json();

    // 1. Rellenar total de reservas
    statsTotalBookings.textContent = stats.totalBookings;

    // 2. Rellenar Top Usuarios
    statsTopUsers.innerHTML = '';
    if (stats.topUsers.length === 0) {
      statsTopUsers.innerHTML = '<li>Sin datos</li>';
    } else {
      stats.topUsers.forEach(user => {
        const li = document.createElement('li');
        li.textContent = `${user.name} (${user.booking_count} reservas)`;
        statsTopUsers.appendChild(li);
      });
    }

    // 3. Rellenar Horas Pico
    statsPeakHours.innerHTML = '';
    if (stats.peakHours.length === 0) {
      statsPeakHours.innerHTML = '<li>Sin datos</li>';
    } else {
      stats.peakHours.forEach(hour => {
        const li = document.createElement('li');
        li.textContent = `A las ${hour.hour}:00 (${hour.count} reservas)`;
        statsPeakHours.appendChild(li);
      });
    }

  } catch (error) {
    console.error('Error al cargar estadísticas:', error);
    statsTotalBookings.textContent = 'Error';
    statsTopUsers.innerHTML = '<li>Error al cargar</li>';
    statsPeakHours.innerHTML = '<li>Error al cargar</li>';
  }
}

function resetCourtForm() {
  courtFormTitle.textContent = 'Crear Nueva Pista';
  courtForm.reset();
  courtIdInput.value = '';
  courtIsActiveDiv.style.display = 'none';
  cancelEditBtn.style.display = 'none';
}

function resetBuildingForm() {
  buildingFormTitle.textContent = 'Añadir Nuevo Edificio';
  buildingForm.reset();
  buildingIdInput.value = '';
  cancelBuildingEditBtn.style.display = 'none';
}

async function handleUserAction(event) {
  const target = event.target;
  const userId = target.dataset.userid;
  if (!userId) return;
  let actionUrl = '';
  let actionMethod = 'PUT';
  let actionPayload = {};
  if (target.classList.contains('approve-btn')) {
    actionUrl = `/api/admin/users/${userId}/approve`;
  } else if (target.classList.contains('deactivate-btn')) {
    actionUrl = `/api/admin/users/${userId}/status`;
    actionPayload = { status: 'inactive' };
  } else if (target.classList.contains('activate-btn')) {
    actionUrl = `/api/admin/users/${userId}/status`;
    actionPayload = { status: 'active' };
  } else if (target.classList.contains('reset-password-btn')) {
    actionUrl = `/api/admin/users/${userId}/reset-password`;
    actionMethod = 'PUT';
    if (!confirm('¿Estás seguro de que quieres enviar un enlace de restablecimiento de contraseña a este usuario?')) return;
  } else {
    return;
  }
  if (!confirm('¿Estás seguro de que quieres realizar esta acción?')) return;
  try {
    const data = await fetchApi(actionUrl, {
      method: actionMethod,
      body: Object.keys(actionPayload).length > 0 ? JSON.stringify(actionPayload) : null,
    });
    showNotification('Acción completada con éxito.', 'success');
    fetchAndDisplayUsers();
  } catch(error) {
    showNotification(error.message, 'error');
  }
}

// --- 4. LÓGICA DE INICIO Y EVENT LISTENERS ---

if (!authToken) {
  showNotification('Acceso denegado.', 'error');
  window.location.href = '/login.html';
} else {
  // Primero, definimos la lógica que se ejecutará al cargar la página
  initializeAdminPanel();

  // Luego, asignamos todos los "escuchadores" de eventos
  logoutButton.addEventListener('click', () => {
    localStorage.removeItem('authToken');
    window.location.href = '/login.html';
  });
  
  dashboardButton.addEventListener('click', () => {
    window.location.href = '/dashboard.html';
  });
  
  userTableBody.addEventListener('click', handleUserAction);

  userTableBody.addEventListener('change', async (event) => {
    if (event.target.classList.contains('user-role-select')) {
      const userId = event.target.dataset.userid;
      const newRole = event.target.value;

      if (!confirm(`¿Estás seguro de que quieres cambiar el rol del usuario ID ${userId} a "${newRole}"?`)) {
        // Revert the selection if the user cancels
        fetchAndDisplayUsers(); // Re-fetch to reset the dropdown
        return;
      }

      try {
        await fetchApi(`/api/admin/users/${userId}/role`, {
          method: 'PUT',
          body: JSON.stringify({ role: newRole }),
        });
        showNotification('Rol de usuario actualizado con éxito.', 'success');
        fetchAndDisplayUsers(); // Refresh the user list to reflect changes
      } catch (error) {
        showNotification(error.message, 'error');
        fetchAndDisplayUsers(); // Re-fetch to reset the dropdown on error
      }
    }
  });

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



  // Event listener para el formulario de pistas (Crear y Editar)
  courtForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const courtId = courtIdInput.value;
    const isEditing = !!courtId;
    
    const url = isEditing ? `/api/courts/${courtId}` : '/api/courts';
    const method = isEditing ? 'PUT' : 'POST';

    const body = {
      name: courtNameInput.value,
      description: courtDescriptionInput.value,
    };
    if (isEditing) {
      body.is_active = courtIsActiveCheckbox.checked;
    }

    try {
      await fetchApi(url, {
        method: method,
        body: JSON.stringify(body)
      });
      
      showNotification(`Pista ${isEditing ? 'actualizada' : 'creada'} con éxito.`, 'success');
      resetCourtForm();
      fetchAndDisplayCourts();
    } catch (error) {
      showNotification(error.message, 'error');
    }
  });
createBlockForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  try {
    await fetchApi('/api/admin/blocked-periods', {
      method: 'POST',
      body: JSON.stringify({
        courtId: blockCourtSelect.value,
        startTime: blockStartTimeInput.value,
        endTime: blockEndTimeInput.value,
        reason: blockReasonInput.value
      })
    });
    showNotification('Bloqueo creado con éxito.', 'success');
    createBlockForm.reset();
    fetchAndDisplayBlockedPeriods(); // Refrescamos la lista de bloqueos
  } catch(error) {
    showNotification(error.message, 'error');
  }
});

// Listener para la lista de bloqueos (para los botones de eliminar)
blocksListContainer.addEventListener('click', async (event) => {
  if (event.target.classList.contains('delete-block-btn')) {
    const blockId = event.target.dataset.blockid;
    if (!confirm(`¿Estás seguro de que quieres eliminar el bloqueo ID ${blockId}?`)) return;

    try {
      await fetchApi(`/api/admin/blocked-periods/${blockId}`, {
        method: 'DELETE'
      });
      showNotification('Bloqueo eliminado con éxito.', 'success');
      fetchAndDisplayBlockedPeriods(); // Refrescamos la lista
    } catch(error) {
      showNotification(error.message, 'error');
    }
  }
});
  
  // Listener para el formulario de edificios (maneja tanto Crear como Editar)
buildingForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const buildingId = buildingIdInput.value;
  const isEditing = !!buildingId;
  
  const url = isEditing ? `/api/admin/buildings/${buildingId}` : '/api/admin/buildings';
  const method = isEditing ? 'PUT' : 'POST';

  try {
    await fetchApi(url, {
      method,
      body: JSON.stringify({
        address: buildingAddressInput.value,
        description: buildingDescriptionInput.value
      })
    });
    
    showNotification(`Edificio ${isEditing ? 'actualizado' : 'creado'} con éxito.`, 'success');
    resetBuildingForm(); // Limpiamos el formulario
    fetchAndDisplayBuildings(); // Refrescamos la lista
  } catch (error) {
    showNotification(error.message, 'error');
  }
});

// Listener para la lista de edificios (para los botones de Editar y Eliminar)
buildingsListContainer.addEventListener('click', async (event) => {
  const target = event.target;
  const buildingId = target.dataset.buildingid;
  if (!buildingId) return; // Si no se hizo clic en un botón con ID, no hacemos nada

  // Acción para el botón "Editar"
  if (target.classList.contains('edit-building-btn')) {
    const buildingToEdit = allBuildings.find(b => b.id == buildingId);
    if (buildingToEdit) {
      buildingFormTitle.textContent = 'Editar Edificio';
      buildingIdInput.value = buildingToEdit.id;
      buildingAddressInput.value = buildingToEdit.address;
      buildingDescriptionInput.value = buildingToEdit.description;
      cancelBuildingEditBtn.style.display = 'inline-block';
      buildingForm.scrollIntoView({ behavior: 'smooth' }); // Lleva al usuario al formulario
    }
  }
  // Acción para el botón "Eliminar"
  else if (target.classList.contains('delete-building-btn')) {
    if (!confirm(`¿Estás seguro de que quieres eliminar el edificio ID ${buildingId}?`)) return;

    try {
        await fetchApi(`/api/admin/buildings/${buildingId}`, {
            method: 'DELETE'
        });
        showNotification('Edificio eliminado.', 'success');
        fetchAndDisplayBuildings(); // Refrescamos la lista
    } catch (error) {
        showNotification(error.message, 'error');
    }
  }
});

// Listener para el botón de cancelar edición
cancelBuildingEditBtn.addEventListener('click', resetBuildingForm);
  // Listener para guardar los ajustes
settingsForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  const settingsToUpdate = {
    operating_open_time: openTimeInput.value,
    operating_close_time: closeTimeInput.value,
    booking_advance_days: advanceDaysInput.value,
    enable_booking_gap_optimization: gapOptimizationCheckbox.checked.toString(), // 'true' o 'false'
    allow_public_registration: publicRegistrationCheckbox.checked.toString() // <-- AÑADE ESTA
  };

  if (!confirm('¿Estás seguro de que quieres guardar estos nuevos ajustes?')) return;

  try {
    await fetchApi('/api/admin/settings', {
      method: 'PUT',
      body: JSON.stringify(settingsToUpdate)
    });
    showNotification('Ajustes guardados con éxito.', 'success');
  } catch (error) {
    showNotification(`Error al guardar los ajustes: ${error.message}`, 'error');
  }
});  inviteUserForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const payload = {
    name: document.getElementById('invite-name').value,
    email: document.getElementById('invite-email').value,
    building_id: document.getElementById('invite-building').value,
    floor: document.getElementById('invite-floor').value,
    door: document.getElementById('invite-door').value,
  };

  try {
    await fetchApi('/api/admin/users/invite', {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    showNotification('Invitación enviada con éxito.', 'success');
    inviteUserForm.reset();
    fetchAndDisplayUsers(); // Refrescamos la lista de usuarios
  } catch (error) {
    showNotification(error.message, 'error');
  }
});
  // Event listener para el botón de cancelar edición
  cancelEditBtn.addEventListener('click', resetCourtForm);
};
```

public/main.js
```javascript
// Fichero: public/main.js

if ('serviceWorker' in navigator) { // Comprueba si el navegador soporta Service Workers
  window.addEventListener('load', () => { // Espera a que toda la página cargue
    navigator.serviceWorker.register('/service-worker.js') // Intenta registrar el archivo
      .then(registration => {
        // Si tiene éxito, lo veremos en la consola
        console.log('Service Worker registrado con éxito con el scope:', registration.scope);
      })
      .catch(error => {
        // Si falla, también veremos el error en la consola
        console.log('Fallo en el registro del Service Worker:', error);
      });
  });
}
```

public/manifest.json
```json
{
  "name": "Padel@Home",
  "short_name": "Padel@Home",
  "description": "Sistema de reservas de pistas de pádel para residencias.",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#007bff",
  "icons": [
    {
      "src": "images/icon-192x192.png",
      "type": "image/png",
      "sizes": "192x192"
    },
    {
      "src": "images/icon-512x512.png",
      "type": "image/png",
      "sizes": "512x512"
    }
  ]
}
```

public/service-worker.js
```javascript
// Fichero: public/service-worker.js

const CACHE_NAME = 'padelathome-cache-v1';
// Lista de archivos que queremos guardar en caché para que la app funcione offline
const urlsToCache = [
  '/',
  '/login.html',
  '/dashboard.html',
  '/admin.html',
  '/images/icon-192x192.png',
  '/images/icon-512x512.png'
  // Podríamos añadir un /style.css aquí si lo tuviéramos
];

// Evento 'install': Se dispara cuando el service worker se instala por primera vez.
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Cache abierta');
        return cache.addAll(urlsToCache);
      })
  );
});

// Evento 'fetch': Se dispara cada vez que la aplicación hace una petición (ej. pide un .js, un .css, una imagen).
self.addEventListener('fetch', event => {
  // Ignoramos las peticiones a la API, esas siempre deben ir a la red
  if (event.request.url.includes('/api/')) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Si encontramos el archivo en la caché, lo devolvemos desde ahí.
        if (response) {
          return response;
        }
        // Si no, hacemos la petición a la red como siempre.
        return fetch(event.request);
      })
  );
});
```

public/faq.html
```html
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Padel@Home - Preguntas Frecuentes</title>
  <link rel="stylesheet" href="/style.css">
  <link rel="manifest" href="/manifest.json">
</head>
<body>

  <div class="container">
    <header class="main-header">
      <h1>Preguntas Frecuentes (F.A.Q)</h1>
      <div class="header-buttons">
        <button id="dashboard-btn">Volver al Dashboard</button>
      </div>
    </header>

    <section class="card">
      <h2>¿Cómo usar Padel@Home?</h2>
      <p>Padel@Home es una aplicación diseñada para facilitar la reserva de pistas de pádel en tu comunidad. Aquí te explicamos cómo sacarle el máximo partido:</p>
      <ul>
        <li><strong>Visualización del Calendario:</strong> La pantalla principal muestra un calendario semanal con la disponibilidad de las pistas. Los colores indican el estado:
          <ul>
            <li><span class="color-box available"></span> <strong>Libre:</strong> Puedes reservar este horario.</li>
            <li><span class="color-box open-match"></span> <strong>Partida Abierta:</strong> Un usuario ha reservado y busca jugadores. Puedes unirte.</li>
            <li><span class="color-box booked"></span> <strong>Ocupado:</strong> Reserva privada o partida abierta completa. Puedes apuntarte a la lista de espera.</li>
            <li><span class="color-box blocked"></span> <strong>No disponible:</strong> Horario que ya ha pasado o ha sido bloqueado por un administrador. No se puede reservar.</li>
          </ul>
        </li>
        <li><strong>Mi Perfil:</strong> Accede a "Mi Perfil" para actualizar tus datos personales o cambiar tu contraseña.</li>
        <li><strong>Panel de Admin:</strong> Si eres administrador, tendrás acceso a un panel especial para gestionar usuarios, pistas y ajustes.</li>
      </ul>
    </section>

    <section class="card">
      <h2>¿Cómo reservar una pista?</h2>
      <ol>
        <li>En el calendario, haz clic en un slot de color <span class="color-box available"></span> <strong>Libre</strong>.</li>
        <li>Aparecerá una ventana emergente donde podrás elegir la duración de tu reserva (60 o 90 minutos, si están disponibles).</li>
        <li>Opcionalmente, puedes marcar la casilla "Abrir partida para que otros se unan" si quieres que otros jugadores se unan a tu reserva.</li>
        <li>Confirma tu reserva. Recibirás un correo electrónico con los detalles y un archivo .ics para añadirlo a tu calendario personal.</li>
      </ol>
    </section>

    <section class="card">
      <h2>¿Cómo cancelar una reserva o abandonar una partida?</h2>
      <ul>
        <li><strong>Cancelar una Reserva Privada:</strong> Si eres el creador de una reserva privada, ve a la sección "Mi Próxima Reserva" en el dashboard y haz clic en "Cancelar Reserva".</li>
        <li><strong>Abandonar una Partida Abierta:</strong> Si te has unido a una partida abierta o la has creado, en la sección "Mi Próxima Reserva", haz clic en "Abandonar Partida".</li>
        <li><strong>Reglas de Cancelación de Partidas Abiertas:</strong>
          <ul>
            <li>Si una partida abierta no está llena (menos de 4 jugadores) 6 horas antes de su inicio, se cancelará automáticamente y se notificará a todos los apuntados.</li>
            <li>Si un jugador abandona una partida a menos de 6 horas de su inicio, la partida NO se cancela. Su plaza se libera para que otro jugador pueda unirse.</li>
          </ul>
        </li>
      </ul>
    </section>

    <section class="card">
      <h2>¿Cómo funcionan las Partidas Abiertas?</h2>
      <p>Las Partidas Abiertas son una excelente forma de encontrar compañeros de juego:</p>
      <ol>
        <li><strong>Crear una Partida Abierta:</strong> Al reservar un slot, marca la opción "Abrir partida para que otros se unan". Tú serás el primer participante.</li>
        <li><strong>Unirse a una Partida Abierta:</strong> En el calendario, haz clic en un slot de color <span class="color-box open-match"></span> <strong>Partida Abierta</strong>. Verás cuántos jugadores hay y podrás unirte si hay plazas disponibles.</li>
        <li><strong>Cambio de Organizador:</strong> Si el creador original de una partida abierta la abandona, el segundo jugador en unirse se convertirá automáticamente en el nuevo organizador.</li>
      </ol>
    </section>
  </div>

  <script src="faq.js"></script>
  <script src="main.js"></script>
</body>
</html>
```

public/faq.js
```javascript
document.addEventListener('DOMContentLoaded', () => {
    const dashboardBtn = document.getElementById('dashboard-btn');

    dashboardBtn.addEventListener('click', () => {
        window.location.href = '/dashboard.html';
    });
});
```

public/profile.html
```html
<!DOCTYPE html> <html lang="es"><head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Padel@Home - Mi Perfil</title>
  <link rel="stylesheet" href="/style.css">
  <link rel="manifest" href="/manifest.json">
</head>
<body>

  <div class="container">
    <header class="main-header">
      <h1>Mi Perfil</h1>
      <div class="header-buttons">
        <button id="dashboard-btn">Volver al Dashboard</button>
      </div>
    </header>

    <section class="card">
      <h2>Información Personal</h2>
      <form id="profile-form">
        <div class="form-group">
          <label for="profile-email">Correo Electrónico (no se puede cambiar):</label>
          <input type="email" id="profile-email" disabled>
        </div>
        <div class="form-group">
          <label for="profile-building">Edificio / Dirección:</label>
          <input type="text" id="profile-building" disabled>
        </div>
        <div class="form-group">
          <label for="profile-name">Nombre Completo:</label>
          <input type="text" id="profile-name" required>
        </div>
        <div class="form-group">
          <label for="profile-floor">Piso:</label>
          <input type="text" id="profile-floor">
        </div>
        <div class="form-group">
          <label for="profile-door">Puerta:</label>
          <input type="text" id="profile-door">
        </div>
        <div class="form-group">
          <label for="profile-phone">Teléfono:</label>
          <input type="tel" id="profile-phone">
        </div>
        <button type="submit">Actualizar Información</button>
      </form>
      <p id="profile-message" class="success-text"></p>
    </section>

    <section class="card">
      <h2>Cambiar Contraseña</h2>
      <form id="password-form">
        <div class="form-group">
          <label for="old-password">Contraseña Antigua:</label>
          <input type="password" id="old-password" required>
        </div>
        <div class="form-group">
          <label for="new-password">Contraseña Nueva:</label>
          <input type="password" id="new-password" required>
        </div>
        <button type="submit">Cambiar Contraseña</button>
      </form>
      <p id="password-message"></p>
    </section>
  </div>

  <script src="profile.js"></script>
  <script src="main.js"></script>
</body>
</html>
```

public/profile.js
```javascript
document.addEventListener('DOMContentLoaded', async () => {
    const API_BASE_URL = '';
    const authToken = localStorage.getItem('authToken');
    // Redirigir si no está logueado
    if (!authToken) {
        window.location.href = '/login.html';
        return;
    }

    // --- Referencias a elementos del DOM ---
    const dashboardBtn = document.getElementById('dashboard-btn');
    // Formulario de perfil
    const profileForm = document.getElementById('profile-form');
    const emailInput = document.getElementById('profile-email');
    const buildingInput = document.getElementById('profile-building');
    const nameInput = document.getElementById('profile-name');
    const floorInput = document.getElementById('profile-floor');
    const doorInput = document.getElementById('profile-door');
    const phoneInput = document.getElementById('profile-phone');
    const profileMessage = document.getElementById('profile-message');
    // Formulario de contraseña
    const passwordForm = document.getElementById('password-form');
    const oldPasswordInput = document.getElementById('old-password');
    const newPasswordInput = document.getElementById('new-password');
    const passwordMessage = document.getElementById('password-message');

    // --- Función para cargar los datos del usuario ---
    const loadUserProfile = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/users/me`, {
                headers: { 'Authorization': `Bearer ${authToken}` }
            });
            if (!response.ok) throw new Error('No se pudo cargar tu perfil.');
            const user = await response.json();

            // Rellenamos el formulario con los datos
            emailInput.value = user.email;
            buildingInput.value = user.building_address || 'N/A';
            nameInput.value = user.name;
            floorInput.value = user.floor || '';
            doorInput.value = user.door || '';
            phoneInput.value = user.phone_number || '';
        } catch (error) {
            profileMessage.textContent = error.message;
            profileMessage.className = 'error-text';
        }
    };
    // --- Listeners de los formularios ---
    // 1. Actualizar Información Personal
    profileForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        profileMessage.textContent = '';
        try {
            const response = await fetch(`${API_BASE_URL}/api/users/me`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`
                },
                body: JSON.stringify({
                    name: nameInput.value,
                    floor: floorInput.value,
                    door: doorInput.value,
                    phone_number: phoneInput.value
                })
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message);

            profileMessage.textContent = data.message;
            profileMessage.className = 'success-text';
        } catch (error) {
            profileMessage.textContent = error.message;
            profileMessage.className = 'error-text';
        }
    });
    // 2. Cambiar Contraseña
    passwordForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        passwordMessage.textContent = '';
        try {
            const response = await fetch(`${API_BASE_URL}/api/users/change-password`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`
                },
                body: JSON.stringify({
                    oldPassword: oldPasswordInput.value,
                    newPassword: newPasswordInput.value
                })
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message);

            passwordMessage.textContent = data.message;
            passwordMessage.className = 'success-text';
            passwordForm.reset(); // Limpiamos el formulario
        } catch (error) {
            passwordMessage.textContent = error.message;
            passwordMessage.className = 'error-text';
        }
    });

    // Listener del botón de "Volver"
    dashboardBtn.addEventListener('click', () => {
        window.location.href = '/dashboard.html';
    });

    // --- Carga inicial de datos ---
    loadUserProfile();
});
```