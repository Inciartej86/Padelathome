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