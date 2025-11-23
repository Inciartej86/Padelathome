import { fetchApi, authToken } from './js/services/api.js';
import { formatDate, formatTime, showNotification } from './js/utils.js';
import * as Modals from './js/ui/modals.js';

// Inicializar conexión WebSocket
const socket = io();
socket.on('connect', () => console.log('Connected to WebSocket'));

document.addEventListener('DOMContentLoaded', () => {
    if (!authToken) {
        window.location.href = '/login.html';
        return;
    }

    // --- Estado Global ---
    let currentDisplayedDate = new Date();
    let weeklyScheduleData = {};
    let userActiveBooking = null;
    let selectedCourtId = null;
    let courtsData = [];

    // --- Elementos del DOM ---
    const welcomeMessage = document.getElementById('welcome-message');
    const myBookingContainer = document.getElementById('my-booking');
    const calendarContainer = document.getElementById('weekly-calendar-container');
    const dailySlotsContainer = document.getElementById('daily-slots-container');
    const prevWeekBtn = document.getElementById('prev-week-btn');
    const nextWeekBtn = document.getElementById('next-week-btn');
    const weekDatesTitle = document.getElementById('week-dates-title');
    const logoutButton = document.getElementById('logout-button');
    const adminPanelBtn = document.getElementById('admin-panel-btn');
    const courtSelectorContainer = document.querySelector('.court-selector-container');
    const courtSelectDropdown = document.getElementById('court-select');
    const profileBtn = document.getElementById('profile-btn');
    const faqBtn = document.getElementById('faq-button'); // Corregido ID

    // --- WebSocket Listeners ---
    const refreshDataAndRender = async () => {
        await fetchMyBooking();
        await handleViewChange();
    };
    socket.on('booking:created', () => refreshDataAndRender());
    socket.on('booking:cancelled', () => refreshDataAndRender());
    socket.on('match:updated', () => refreshDataAndRender());


    // --- Lógica de Negocio ---

    const fetchUserProfile = async () => {
        try {
            const user = await fetchApi('/users/me');
            welcomeMessage.textContent = `Bienvenido, ${user.name}!`;
            if (user.role === 'admin') {
                adminPanelBtn.style.display = 'inline-block';
            }
        } catch (error) {
            console.error(error);
        }
    };

    const fetchMyBooking = async () => {
        try {
            const bookings = await fetchApi('/bookings/me'); // Espera array
            // Tomamos el primero si existe, para la lógica de "active"
            userActiveBooking = (bookings && bookings.length > 0) ? bookings[0] : null;
            renderMyBookings(bookings);
        } catch (error) {
            console.error(error);
            myBookingContainer.innerHTML = '<p class="error-text">Error al cargar reservas.</p>';
        }
    };

    function renderMyBookings(bookings) {
        myBookingContainer.innerHTML = '';
        if (bookings && bookings.length > 0) {
            bookings.forEach(booking => {
                const isOwner = booking.participation_type === 'owner';
                const btnText = isOwner ? 'Cancelar Reserva' : 'Abandonar Partida';
                // Usamos data attributes para delegación
                const btn = `<button class="action-btn" data-action="${isOwner ? 'cancel' : 'leave'}" data-id="${booking.id}">${btnText}</button>`;
                
                const div = document.createElement('div');
                div.className = 'booking-item';
                div.innerHTML = `
                    <p><strong>${booking.court_name}</strong> - ${new Date(booking.start_time).toLocaleString()}</p>
                    ${btn}
                `;
                myBookingContainer.appendChild(div);
            });
        } else {
            myBookingContainer.innerHTML = '<p>No tienes ninguna reserva activa.</p>';
        }
    }

    async function initializeCourtSelector() {
        try {
            courtsData = await fetchApi('/courts');
            if (courtsData.length <= 1) {
                if (courtSelectorContainer) courtSelectorContainer.classList.add('hidden');
                if (courtsData.length === 1) selectedCourtId = courtsData[0].id;
            } else {
                courtSelectDropdown.innerHTML = courtsData.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
                selectedCourtId = parseInt(courtSelectDropdown.value, 10);
                if (courtSelectorContainer) courtSelectorContainer.classList.remove('hidden');
                
                courtSelectDropdown.addEventListener('change', (e) => {
                    selectedCourtId = parseInt(e.target.value, 10);
                    handleViewChange();
                });
            }
            handleViewChange();
        } catch (error) {
            console.error(error);
        }
    }

    function handleViewChange() {
        if (!selectedCourtId) return;
        const isMobile = window.innerWidth <= 768;
        if (isMobile) {
            calendarContainer.style.display = 'none';
            dailySlotsContainer.style.display = 'block';
            // TODO: Implementar renderMobileDailyView si se desea
            dailySlotsContainer.innerHTML = '<p>Vista móvil en construcción.</p>'; 
        } else {
            dailySlotsContainer.style.display = 'none';
            calendarContainer.style.display = 'block';
            renderWeeklyCalendar(currentDisplayedDate);
        }
    }

    // --- Renderizado del Calendario (Grid) ---
    async function renderWeeklyCalendar(date) {
        calendarContainer.innerHTML = '<p>Cargando...</p>';
        const dateString = date.toISOString().split('T')[0];
        try {
            const data = await fetchApi(`/schedule/week?courtId=${selectedCourtId}&date=${dateString}`);
            weeklyScheduleData = data.schedule;
            weekDatesTitle.textContent = `Semana del ${formatDate(data.weekStart)} al ${formatDate(data.weekEnd)}`;

            const grid = document.createElement('div');
            grid.className = 'calendar-grid';
            
            // Cabeceras
            ['Horas', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].forEach(d => {
                const div = document.createElement('div');
                div.className = 'grid-cell header';
                div.textContent = d;
                grid.appendChild(div);
            });

            const weekDays = Object.keys(weeklyScheduleData).sort();
            const timeSlots = weeklyScheduleData[weekDays[0]];
            const now = new Date();

            timeSlots.forEach((slot, index) => {
                // Columna Hora
                const timeDiv = document.createElement('div');
                timeDiv.className = 'grid-cell time-header';
                timeDiv.textContent = formatTime(new Date(slot.startTime));
                grid.appendChild(timeDiv);

                weekDays.forEach(dayKey => {
                    const daySlot = weeklyScheduleData[dayKey][index];
                    const cell = document.createElement('div');
                    const slotTime = new Date(daySlot.startTime);
                    
                    // Determinar estado base
                    let status = daySlot.status;
                    if (slotTime < now) status = 'past';

                    // Clase CSS base
                    cell.className = `grid-cell slot ${status}`;
                    
                    // Data attributes para el click
                    cell.dataset.status = status;
                    cell.dataset.starttime = daySlot.startTime;
                    if (daySlot.bookingId) cell.dataset.bookingId = daySlot.bookingId;
                    
                    // Lógica de texto y atributos específicos
                    let text = '';
                    if (status === 'available') {
                        text = 'Libre';
                    } else if (status === 'booked') {
                        text = 'Ocupado';
                        cell.dataset.waitlistable = 'true';
                    } else if (status === 'blocked') {
                        text = daySlot.reason || 'Bloqueado';
                    } else if (status === 'open_match_available') {
                        text = `Abierta ${daySlot.participants}/4`;
                        cell.dataset.action = 'join_match';
                        cell.dataset.participants = daySlot.participants;
                        cell.dataset.maxParticipants = daySlot.maxParticipants;
                    } else if (status === 'open_match_full') {
                        text = 'Llena';
                        cell.dataset.waitlistable = 'true';
                    } else if (status === 'past') {
                        text = 'Pasado';
                    }

                    // Sobreescribir si es MI reserva
                    // Buscamos en la lista de mis reservas activas si alguna coincide con este slot
                    // Nota: userActiveBooking es un array ahora en la lógica global, pero aquí simplificamos
                    // Para hacerlo perfecto, deberíamos iterar sobre userActiveBookings (array)
                    // Pero como optimización, confiamos en el renderMyBookings para la gestión
                    
                    // Importante: NO ponemos botones HTML dentro. El clic lo maneja el contenedor.
                    cell.textContent = text;
                    grid.appendChild(cell);
                });
            });

            calendarContainer.innerHTML = '';
            calendarContainer.appendChild(grid);

        } catch (error) {
            calendarContainer.innerHTML = `<p class="error-text">${error.message}</p>`;
        }
    }


    // --- Inicialización de Modales ---
    const modalHandlers = {
        onConfirmBooking: async (data) => {
            try {
                const body = { ...data, courtId: selectedCourtId };
                if (data.isOpenMatch) body.maxParticipants = 4;
                
                await fetchApi('/bookings', { method: 'POST', body: JSON.stringify(body) });
                showNotification('Reserva creada', 'success');
                Modals.hideAllModals(); // Asegúrate de exportar esto en modals.js o cerrar manualmente
                // Hack si hideAllModals no es exportada:
                document.getElementById('modal-overlay').classList.add('hidden');
                refreshDataAndRender();
            } catch (e) { showNotification(e.message, 'error'); }
        },
        onJoinWaitlist: async (data) => {
            try {
                // Calcular fin (ej. +90min)
                const end = new Date(new Date(data.startTime).getTime() + 90*60000).toISOString();
                await fetchApi('/waiting-list', { 
                    method: 'POST', 
                    body: JSON.stringify({ courtId: parseInt(data.courtId), slotStartTime: data.startTime, slotEndTime: end })
                });
                showNotification('Apuntado a lista de espera', 'success');
                document.getElementById('waitlist-modal-overlay').classList.add('hidden');
            } catch (e) { showNotification(e.message, 'error'); }
        },
        onJoinMatch: async (data) => {
            try {
                await fetchApi(`/matches/${data.bookingId}/join`, { method: 'POST' });
                showNotification('Te has unido a la partida', 'success');
                document.getElementById('join-match-modal-overlay').classList.add('hidden');
                refreshDataAndRender();
            } catch (e) { showNotification(e.message, 'error'); }
        },
        onCancelBooking: async (data) => {
            if (!confirm('¿Seguro que quieres cancelar?')) return;
            try {
                await fetchApi(`/bookings/${data.bookingId}`, { method: 'DELETE' });
                showNotification('Reserva cancelada', 'success');
                // Cerrar modales si estaban abiertos
                document.getElementById('my-booking-modal-overlay')?.classList.add('hidden');
                refreshDataAndRender();
            } catch (e) { showNotification(e.message, 'error'); }
        },
        onLeaveMatch: async (data) => {
            if (!confirm('¿Seguro que quieres abandonar?')) return;
            try {
                await fetchApi(`/matches/${data.bookingId}/leave`, { method: 'DELETE' });
                showNotification('Has abandonado la partida', 'success');
                document.getElementById('my-match-modal-overlay')?.classList.add('hidden');
                refreshDataAndRender();
            } catch (e) { showNotification(e.message, 'error'); }
        }
    };

    Modals.initModals(modalHandlers);


    // --- Listeners Globales ---
    async function init() {
        await fetchUserProfile();
        await initializeCourtSelector(); 
        await fetchMyBooking(); // Carga inicial

        logoutButton.addEventListener('click', () => {
            localStorage.removeItem('authToken');
            window.location.href = '/login.html';
        });
        adminPanelBtn.addEventListener('click', () => window.location.href = '/admin.html');
        profileBtn.addEventListener('click', () => window.location.href = '/profile.html');
        if(faqBtn) faqBtn.addEventListener('click', () => window.location.href = '/faq.html');

        prevWeekBtn.addEventListener('click', () => {
            currentDisplayedDate.setDate(currentDisplayedDate.getDate() - 7);
            handleViewChange();
        });
        nextWeekBtn.addEventListener('click', () => {
            currentDisplayedDate.setDate(currentDisplayedDate.getDate() + 7);
            handleViewChange();
        });
        
        // Delegación para "Mis Reservas"
        myBookingContainer.addEventListener('click', (e) => {
            if (e.target.tagName !== 'BUTTON') return;
            const id = e.target.dataset.id;
            const action = e.target.dataset.action;
            if (action === 'cancel') modalHandlers.onCancelBooking({ bookingId: id });
            if (action === 'leave') modalHandlers.onLeaveMatch({ bookingId: id });
        });

        // Delegación para Calendario (Grid)
        calendarContainer.addEventListener('click', async (e) => {
            const cell = e.target.closest('.slot');
            if (!cell) return;
            const status = cell.dataset.status;
            const startTime = cell.dataset.starttime;
            
            if (status === 'available') {
                Modals.showBookingModal(startTime, [60, 90]);
            } else if (status === 'booked' || status === 'open_match_full') {
                // Solo si tiene el flag waitlistable
                if (cell.dataset.waitlistable) Modals.showWaitlistModal(startTime, selectedCourtId);
            } else if (status === 'open_match_available') {
                const bookingId = cell.dataset.bookingId;
                try {
                    const participants = await fetchApi(`/matches/${bookingId}/participants`);
                    Modals.showOpenMatchModal({
                        bookingId, 
                        starttime: startTime,
                        participants: cell.dataset.participants,
                        maxParticipants: cell.dataset.maxParticipants
                    }, participants);
                } catch (e) { console.error(e); }
            }
        });

        window.addEventListener('resize', handleViewChange);
    }

    init();
});