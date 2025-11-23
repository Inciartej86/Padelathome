import { fetchApi, authToken } from './js/services/api.js';
import { formatDate, formatTime, showNotification } from './js/utils.js';
import * as Modals from './js/ui/modals.js';

// --- Utilidades ---
const debounce = (func, delay) => {
    let timeout;
    return (...args) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), delay);
    };
};

function toISODateString(date) {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
}

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
    let userActiveBookings = [];
    let selectedCourtId = null;
    let courtsData = [];
    let dailySlotsData = [];

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
            userActiveBookings = bookings || [];
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
                
                const div = document.createElement('div');
                div.className = 'booking-item';

                const p = document.createElement('p');
                const strong = document.createElement('strong');
                strong.textContent = booking.court_name;
                p.appendChild(strong);
                p.append(` - ${new Date(booking.start_time).toLocaleString()}`);

                const btn = document.createElement('button');
                btn.className = 'action-btn';
                btn.dataset.action = isOwner ? 'cancel' : 'leave';
                btn.dataset.id = booking.id;
                btn.textContent = btnText;
                
                div.appendChild(p);
                div.appendChild(btn);
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
            renderMobileView(new Date());
        } else {
            dailySlotsContainer.style.display = 'none';
            calendarContainer.style.display = 'block';
            renderWeeklyCalendar(currentDisplayedDate);
        }
    }

    // --- Renderizado de la Vista Móvil ---
    async function renderMobileView(date) {
        dailySlotsContainer.innerHTML = `
            <div class="date-strip-container">
                <div class="date-strip"></div>
            </div>
            <div class="accordion-container"></div>
        `;
        renderDateStrip(date);
        await renderDaySlots(date);
    }

    function renderDateStrip(selectedDate) {
        const strip = dailySlotsContainer.querySelector('.date-strip');
        strip.innerHTML = '';
        let date = new Date();
        for (let i = 0; i < 14; i++) {
            const dayItem = document.createElement('div');
            dayItem.className = 'date-item';
            if (date.toDateString() === selectedDate.toDateString()) {
                dayItem.classList.add('selected');
            }
            dayItem.dataset.date = toISODateString(date);
            dayItem.innerHTML = `
                <span class="day-name">${date.toLocaleDateString('es-ES', { weekday: 'short' })}</span>
                <span class="day-number">${date.getDate()}</span>
            `;
            strip.appendChild(dayItem);
            date.setDate(date.getDate() + 1);
        }
    }

    async function renderDaySlots(date) {
        const accordionContainer = dailySlotsContainer.querySelector('.accordion-container');
        accordionContainer.innerHTML = '<p>Cargando slots...</p>';
        const dateString = toISODateString(date);
        try {
            dailySlotsData = await fetchApi(`/schedule/day?courtId=${selectedCourtId}&date=${dateString}`);
            if (!dailySlotsData || dailySlotsData.length === 0) {
                accordionContainer.innerHTML = '<p>No hay slots disponibles para este día.</p>';
                return;
            }
            accordionContainer.innerHTML = '';
            const now = new Date();
            dailySlotsData.forEach((slot, index) => {
                const slotTime = new Date(slot.startTime);
                let status = slot.status;
                if (slotTime < now) {
                    status = 'past';
                }

                const div = document.createElement('div');
                div.className = 'daily-slot';
                div.innerHTML = `
                    <div class="slot-header" data-status="${status}" data-index="${index}">
                        <span class="slot-time">${formatTime(slotTime)}</span>
                        <span class="slot-status" data-status="${status}">${getSlotStatusText({ ...slot, status })}</span>
                    </div>
                    <div class="slot-details"></div>
                `;
                accordionContainer.appendChild(div);
            });
        } catch (error) {
            accordionContainer.innerHTML = `<p class="error-text">${error.message}</p>`;
        }
    }

    function getSlotStatusText(slot) {
        switch (slot.status) {
            case 'available': return 'Disponible';
            case 'booked': return 'Ocupado';
            case 'blocked': return 'Bloqueado';
            case 'open_match_available': return `Abierta ${slot.participants_count || 1}/${slot.max_participants || 4}`;
            case 'open_match_full': return `Llena ${slot.participants_count || 4}/${slot.max_participants || 4}`;
            case 'my_private_booking': return 'Mi Reserva';
            case 'my_joined_match': return `Inscrito`;
            case 'past': return 'Pasado';
            default: return 'No disponible';
        }
    }

    function renderSlotDetails(detailsContainer, slot) {
        detailsContainer.innerHTML = ''; // Limpiar
        const { status, startTime, bookingId, availableDurations } = slot;

        if (status === 'available') {
            detailsContainer.innerHTML = `
                <div class="form-group open-match-toggle">
                    <input type="checkbox" id="mobile-open-match-checkbox">
                    <label for="mobile-open-match-checkbox">Abrir partida (4 jugadores)</label>
                </div>
                <div class="duration-options">
                    ${availableDurations.map(d => `<button data-duration="${d}">${d} min</button>`).join('')}
                </div>
                <button class="cancel-booking">Cancelar</button>
            `;
            detailsContainer.querySelector('.cancel-booking').addEventListener('click', () => {
                detailsContainer.classList.remove('active');
                detailsContainer.innerHTML = '';
            });
            detailsContainer.querySelector('.duration-options').addEventListener('click', (e) => {
                if (e.target.tagName === 'BUTTON') {
                    const duration = e.target.dataset.duration;
                    const isOpenMatch = detailsContainer.querySelector('#mobile-open-match-checkbox').checked;
                    modalHandlers.onConfirmBooking({
                        startTime: startTime,
                        durationMinutes: parseInt(duration, 10),
                        isOpenMatch: isOpenMatch
                    });
                }
            });
        } else if (status === 'my_private_booking') {
            detailsContainer.innerHTML = `<p><strong>Mi Reserva Privada</strong></p><button class="cancel-booking-btn">Cancelar Reserva</button>`;
            detailsContainer.querySelector('.cancel-booking-btn').addEventListener('click', () => {
                modalHandlers.onCancelBooking({ bookingId: bookingId });
            });
        } else if (status === 'my_joined_match') {
            detailsContainer.innerHTML = `
                <p><strong>Partida Abierta (Inscrito)</strong></p>
                <p>Participantes:</p>
                <ul class="participants-list"></ul>
                <button class="leave-match-btn">Abandonar Partida</button>
            `;
            const participantsList = detailsContainer.querySelector('.participants-list');
            fetchApi(`/matches/${bookingId}/participants`).then(({ participants }) => {
                if (participants && participants.length > 0) {
                    participants.forEach(p => {
                        const li = document.createElement('li');
                        li.textContent = p.name;
                        participantsList.appendChild(li);
                    });
                } else {
                    participantsList.innerHTML = '<li>Cargando...</li>';
                }
            });
            detailsContainer.querySelector('.leave-match-btn').addEventListener('click', () => {
                modalHandlers.onLeaveMatch({ bookingId: bookingId });
            });
        } else if (status === 'booked' || status === 'open_match_full') {
            detailsContainer.innerHTML = `<p>Este horario no está disponible.</p><button class="join-waitlist-btn">Apuntarse a lista de espera</button>`;
            detailsContainer.querySelector('.join-waitlist-btn').addEventListener('click', () => {
                modalHandlers.onJoinWaitlist({ courtId: selectedCourtId, startTime: startTime });
            });
        } else if (status === 'open_match_available') {
            detailsContainer.innerHTML = `
                <p><strong>Partida Abierta</strong></p>
                <p>Participantes:</p>
                <ul class="participants-list"></ul>
                <button class="join-match-btn">Unirse a la Partida</button>
                <button class="cancel-booking">Cancelar</button>
            `;
            const participantsList = detailsContainer.querySelector('.participants-list');
            fetchApi(`/matches/${bookingId}/participants`).then(({ participants }) => {
                if (participants && participants.length > 0) {
                    participants.forEach(p => {
                        const li = document.createElement('li');
                        li.textContent = p.name;
                        participantsList.appendChild(li);
                    });
                } else {
                    participantsList.innerHTML = '<li>¡Sé el primero en unirte!</li>';
                }
            });
            detailsContainer.querySelector('.join-match-btn').addEventListener('click', () => {
                modalHandlers.onJoinMatch({ bookingId: bookingId });
            });
            detailsContainer.querySelector('.cancel-booking').addEventListener('click', () => {
                detailsContainer.classList.remove('active');
                detailsContainer.innerHTML = '';
            });
        }
    }


    // --- Renderizado del Calendario (Grid) ---
    async function renderWeeklyCalendar(date) {
        calendarContainer.innerHTML = '<p>Cargando...</p>';
        const dateString = toISODateString(date);
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

                    // Clase CSS base y específicas
                    cell.className = `grid-cell slot ${status}`;
                     if (status === 'my_open_match' || status === 'my_private_booking') {
                        cell.classList.add('my-booking');
                    }
                    
                    // Data attributes para el click
                    cell.dataset.status = status;
                    cell.dataset.starttime = daySlot.startTime;
                    if (daySlot.bookingId) cell.dataset.bookingId = daySlot.bookingId;
                    if (daySlot.participation_type) cell.dataset.participationType = daySlot.participation_type;
                    
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
                        text = `Abierta ${daySlot.participants || 1}/${daySlot.maxParticipants || 4}`;
                    } else if (status === 'open_match_full') {
                        text = 'Llena';
                        cell.dataset.waitlistable = 'true';
                    } else if (status === 'my_private_booking') {
                        text = 'Mi Reserva';
                    } else if (status === 'my_open_match') {
                        text = `Inscrito`;
                    } else if (status === 'past') {
                        text = 'Pasado';
                    }
                    
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
                Modals.hideAllModals();
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
                Modals.hideAllModals();
            } catch (e) { showNotification(e.message, 'error'); }
        },
        onJoinMatch: async (data) => {
            try {
                await fetchApi(`/matches/${data.bookingId}/join`, { method: 'POST' });
                showNotification('Te has unido a la partida', 'success');
                Modals.hideAllModals();
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
        if (profileBtn) profileBtn.addEventListener('click', () => window.location.href = '/profile.html');
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
            const bookingId = cell.dataset.bookingId ? parseInt(cell.dataset.bookingId, 10) : null;
            const participationType = cell.dataset.participationType;

            // Lógica de click basada en el nuevo status
            switch (status) {
                case 'available':
                    Modals.showBookingModal(startTime, [60, 90]);
                    break;
                
                case 'my_private_booking':
                    Modals.showMyBookingModal(bookingId, startTime);
                    break;

                case 'my_open_match': {
                    const { participants } = await fetchApi(`/matches/${bookingId}/participants`);
                    Modals.showMyMatchModal({
                        bookingId: bookingId,
                        startTime: startTime,
                        isOwner: participationType === 'owner'
                    }, participants);
                    break;
                }

                case 'open_match_available': {
                    try {
                        const { participants } = await fetchApi(`/matches/${bookingId}/participants`);
                        Modals.showOpenMatchModal({
                            bookingId,
                            starttime: startTime,
                            participants: cell.dataset.participants,
                            maxParticipants: cell.dataset.maxParticipants
                        }, participants);
                    } catch (err) {
                        console.error('Error fetching participants:', err);
                        showNotification('No se pudieron cargar los participantes.', 'error');
                    }
                    break;
                }

                case 'booked':
                case 'open_match_full':
                    if (cell.dataset.waitlistable) {
                        Modals.showWaitlistModal(startTime, selectedCourtId);
                    }
                    break;
            }
        });

        dailySlotsContainer.addEventListener('click', async (e) => {
            if (e.target.closest('.date-item')) {
                const dateItem = e.target.closest('.date-item');
                const selectedDate = new Date(dateItem.dataset.date + 'T00:00:00');
                renderDateStrip(selectedDate);
                await renderDaySlots(selectedDate);
            }

            if (e.target.closest('.slot-header')) {
                const header = e.target.closest('.slot-header');
                const status = header.dataset.status;
                if (status === 'past') return;
                
                const details = header.nextElementSibling;
                const index = header.dataset.index;
                const slot = dailySlotsData[index];

                // Cerrar otros abiertos
                document.querySelectorAll('.slot-details.active').forEach(d => {
                    if (d !== details) {
                        d.classList.remove('active');
                        d.innerHTML = '';
                    }
                });
                
                details.classList.toggle('active');

                if (details.classList.contains('active')) {
                    renderSlotDetails(details, slot);
                } else {
                    details.innerHTML = '';
                }
            }
        });

        window.addEventListener('resize', debounce(handleViewChange, 250));
    }

    init();
});