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