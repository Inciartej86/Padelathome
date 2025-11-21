const pool = require('../config/database');
// AÑADIMOS 'format' A LOS IMPORTS
const { startOfWeek, endOfWeek, startOfDay, endOfDay, eachDayOfInterval, parseISO, format } = require('date-fns');

// --- Función auxiliar ---
function isSlotAvailable(start, end, bookings, blocked) {
    for (const booking of bookings) {
        if (start < new Date(booking.end_time) && end > new Date(booking.start_time)) return false;
    }
    for (const block of blocked) {
        if (start < new Date(block.end_time) && end > new Date(block.start_time)) return false;
    }
    return true;
}

// --- getAvailability (Sin cambios importantes, pero actualizado por coherencia) ---
const getAvailability = async (req, res) => {
    // ... (puedes mantener tu código actual o copiar este bloque si prefieres)
    // Por brevedad, me centro en getWeekSchedule que es el que falla
    const { courtId, date } = req.query;
    if (!courtId || !date) return res.status(400).json({ message: 'Se requiere courtId y date.' });
    try {
        const targetDate = parseISO(date);
        const startOfTargetDate = startOfDay(targetDate);
        const endOfTargetDate = endOfDay(targetDate);
        // ... (consultas igual que antes) ...
        const [bookingsResult, blockedResult, settingsResult] = await Promise.all([
             pool.query("SELECT start_time, end_time FROM bookings WHERE court_id = $1 AND status = 'confirmed' AND start_time >= $2 AND start_time <= $3", [courtId, startOfTargetDate, endOfTargetDate]),
             pool.query("SELECT start_time, end_time, reason FROM blocked_periods WHERE court_id = $1 AND start_time >= $2 AND start_time <= $3", [courtId, startOfTargetDate, endOfTargetDate]),
             pool.query("SELECT setting_value FROM instance_settings WHERE setting_key IN ('operating_open_time', 'operating_close_time')")
        ]);
        // ... (procesamiento igual que antes) ...
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
             // ... lógica de slots ...
             const potentialStartTime = new Date(i);
             const availableDurations = [];
             const endTime60 = new Date(potentialStartTime.getTime() + 60 * 60000);
             if (isSlotAvailable(potentialStartTime, endTime60, bookings, blockedPeriods) && endTime60 <= dayEndTime) availableDurations.push(60);
             const endTime90 = new Date(potentialStartTime.getTime() + 90 * 60000);
             if (isSlotAvailable(potentialStartTime, endTime90, bookings, blockedPeriods) && endTime90 <= dayEndTime) availableDurations.push(90);
             if (availableDurations.length > 0) availableSlots.push({ startTime: potentialStartTime.toISOString(), availableDurations });
        }
        res.json({ availability: availableSlots, blocked: blockedPeriods });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error interno.' });
    }
};

// --- CONTROLADOR CORREGIDO PARA LA SEMANA ---
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
      // --- CORRECCIÓN CLAVE AQUÍ ---
      // Usamos 'format' para obtener la fecha local YYYY-MM-DD sin conversión a UTC
      const dayString = format(day, 'yyyy-MM-dd');
      
      schedule[dayString] = [];
      
      // Quitamos la 'Z' para que interprete la hora como local del servidor
      const dayStartTime = new Date(`${dayString}T${openTime}:00`); 
      const dayEndTime = new Date(`${dayString}T${closeTime}:00`);
      
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
            const participants = participantCounts[conflictingBooking.id] || 1;
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
