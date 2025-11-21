document.addEventListener('DOMContentLoaded', () => {
    const socket = io();

    // --- WebSocket Event Listeners ---
    socket.on('connect', () => console.log('Connected to WebSocket server'));
    socket.on('disconnect', () => console.log('Disconnected from WebSocket server'));
    socket.on('connect_error', (error) => console.error('WebSocket connection error:', error));

    const refreshDataAndRender = async () => {
        await fetchMyBooking();
        await handleViewChange();
    };

    socket.on('booking:created', (booking) => {
        console.log('WebSocket: Booking created', booking);
        refreshDataAndRender();
    });
    socket.on('booking:cancelled', (data) => {
        console.log('WebSocket: Booking cancelled', data);
        refreshDataAndRender();
    });
    socket.on('match:updated', async (data) => {
        console.log('WebSocket: Match updated', data);
        await refreshDataAndRender();
        if (userActiveBooking && userActiveBooking.id === data.bookingId && myMatchModalOverlay.classList.contains('hidden')) {
            showMyMatchModal(userActiveBooking.id, userActiveBooking.start_time);
        }
    });

    // --- 1. CONFIGURACIÓN INICIAL Y ELEMENTOS DEL DOM ---
    const API_BASE_URL = 'https://padelathome.wincicloud.win';
    const authToken = localStorage.getItem('authToken');
    
    // --- Global State ---
    let currentDisplayedDate = new Date();
    let weeklyScheduleData = {};
    let userActiveBooking = null;
    let selectedCourtId = null; 
    let courtsData = []; 
    
    // --- DOM Elements ---
    const welcomeMessage = document.getElementById('welcome-message');
    const myBookingContainer = document.getElementById('my-booking');
    const calendarContainer = document.getElementById('weekly-calendar-container');
    const dailySlotsContainer = document.getElementById('daily-slots-container');
    const dateStripContainer = document.querySelector('.date-strip-container');
    const weekDatesTitle = document.getElementById('week-dates-title');
    const prevWeekBtn = document.getElementById('prev-week-btn');
    const nextWeekBtn = document.getElementById('next-week-btn');
    const logoutButton = document.getElementById('logout-button');
    const adminPanelBtn = document.getElementById('admin-panel-btn');
    const bookingModalOverlay = document.getElementById('modal-overlay');
    const bookingModalTime = document.getElementById('modal-time');
    const bookingModalOptions = document.getElementById('modal-options-container');
    const bookingModalCancelBtn = document.getElementById('modal-cancel-btn');
    const openMatchCheckbox = document.getElementById('open-match-checkbox');
    const waitlistModalOverlay = document.getElementById('waitlist-modal-overlay');
    const waitlistJoinBtn = document.getElementById('waitlist-join-btn');
    const waitlistCancelBtn = document.getElementById('waitlist-cancel-btn');
    const joinMatchModalOverlay = document.getElementById('join-match-modal-overlay');
    const joinMatchTime = document.getElementById('join-match-time');
    const joinMatchParticipants = document.getElementById('join-match-participants');
    const joinMatchConfirmBtn = document.getElementById('join-match-confirm-btn');
    const joinMatchCancelBtn = document.getElementById('join-match-cancel-btn');
    const myBookingModalOverlay = document.getElementById('my-booking-modal-overlay');
    const myBookingModalTime = document.getElementById('my-booking-modal-time');
    const myBookingCancelBtn = document.getElementById('my-booking-cancel-btn');
    const myBookingCloseBtn = document.getElementById('my-booking-close-btn');
    const myMatchModalOverlay = document.getElementById('my-match-modal-overlay');
    const myMatchModalTime = document.getElementById('my-match-modal-time');
    const myMatchParticipantsList = document.getElementById('my-match-participants-list');
    const myMatchCancelMatchBtn = document.getElementById('my-match-cancel-match-btn');
    const myMatchLeaveBtn = document.getElementById('my-match-leave-btn');
    const myMatchCloseBtn = document.getElementById('my-match-close-btn');
    const joinMatchParticipantsList = document.getElementById('join-match-participants-list');

    // --- 2. LÓGICA DE RESPONSIVE DESIGN Y RENDERIZADO ---
    async function initializeCourtSelector() {
        const courtSelectorContainer = document.querySelector('.court-selector-container');
        const courtSelectDropdown = document.getElementById('court-select');
        try {
            const response = await fetch(`${API_BASE_URL}/api/courts`, { headers: { 'Authorization': `Bearer ${authToken}` } });
            if (!response.ok) throw new Error('Failed to fetch courts');
            courtsData = await response.json();
            if (courtsData.length <= 1) {
                courtSelectorContainer.classList.add('hidden');
                if (courtsData.length === 1) selectedCourtId = courtsData[0].id;
                handleViewChange();
            } else {
                courtSelectDropdown.innerHTML = courtsData.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
                selectedCourtId = parseInt(courtSelectDropdown.value, 10);
                courtSelectorContainer.classList.remove('hidden');
                courtSelectDropdown.addEventListener('change', (e) => {
                    selectedCourtId = parseInt(e.target.value, 10);
                    handleViewChange();
                });
                handleViewChange();
            }
        } catch (error) {
            console.error("Error initializing court selector:", error);
            calendarContainer.innerHTML = '<p class="error-text">No se pudieron cargar las pistas.</p>';
        }
    }

    function handleViewChange() {
        if (!selectedCourtId) {
            calendarContainer.innerHTML = '<p>Selecciona una pista para ver la disponibilidad.</p>';
            dailySlotsContainer.innerHTML = '';
            return;
        }
        const isMobile = window.innerWidth <= 768;
        if (isMobile) {
            renderMobileDailyView(currentDisplayedDate);
        } else {
            renderWeeklyCalendar(currentDisplayedDate);
        }
    }

    async function renderMobileDailyView(date) {
        renderDateStrip(date);
        dailySlotsContainer.innerHTML = '<p>Cargando horarios...</p>';
        const dateString = new Date(date).toISOString().split('T')[0];
        try {
            const response = await fetch(`${API_BASE_URL}/api/schedule/day?courtId=${selectedCourtId}&date=${dateString}`, {
                headers: { 'Authorization': `Bearer ${authToken}` }
            });
            if (!response.ok) throw new Error('No se pudo cargar la disponibilidad del día.');
            const slots = await response.json();
            dailySlotsContainer.innerHTML = '';
            if (slots.length === 0) {
                dailySlotsContainer.innerHTML = '<p>No hay horarios disponibles para este día.</p>';
                return;
            }

            const now = new Date();

            slots.forEach(slot => {
                const slotElement = document.createElement('div');
                slotElement.className = 'daily-slot';
                const slotStartTime = new Date(slot.startTime);

                let finalStatus = slot.status;
                let statusText = '';

                if (slotStartTime < now) {
                    finalStatus = 'past';
                    statusText = 'Pasado';
                } else {
                    switch (slot.status) {
                        case 'available':
                            statusText = 'Disponible';
                            break;
                        case 'booked':
                            statusText = 'Ocupado';
                            slotElement.dataset.waitlistable = 'true';
                            break;
                        case 'open_match_available':
                            statusText = `Partida Abierta (${slot.participants}/${slot.maxParticipants})`;
                            break;
                        case 'open_match_full':
                            statusText = 'Partida Llena';
                            break;
                        case 'my_private_booking':
                            statusText = 'Mi Reserva';
                            break;
                        case 'my_joined_match':
                            statusText = 'Inscrito';
                            break;
                        case 'blocked':
                            statusText = 'Bloqueado';
                            break;
                        default:
                            statusText = 'No disponible';
                    }
                }
                
                slotElement.dataset.starttime = slot.startTime;
                slotElement.dataset.status = finalStatus;
                if(slot.bookingId) slotElement.dataset.bookingId = slot.bookingId;
                if(slot.participants) slotElement.dataset.participants = slot.participants;
                if(slot.maxParticipants) slotElement.dataset.maxParticipants = slot.maxParticipants;

                slotElement.innerHTML = `
                    <div class="slot-header" data-status="${finalStatus}">
                        <span class="slot-time">${formatTime(slotStartTime)}</span>
                        <span class="slot-status" data-status="${finalStatus}">${statusText}</span>
                    </div>
                    ${finalStatus === 'available' ? `
                    <div class="slot-details">
                        <p>Elige una duración para reservar:</p>
                        <div class="duration-options">
                            ${slot.availableDurations.includes(60) ? `<button class="book-btn" data-duration="60" data-starttime="${slot.startTime}">60 min</button>` : ''}
                            ${slot.availableDurations.includes(90) ? `<button class="book-btn" data-duration="90" data-starttime="${slot.startTime}">90 min</button>` : ''}
                        </div>
                        <div class="open-match-toggle">
                            <input type="checkbox" id="open-match-${slot.startTime}">
                            <label for="open-match-${slot.startTime}">Crear partida abierta (4 jugadores)</label>
                        </div>
                    </div>` : ''}
                `;
                dailySlotsContainer.appendChild(slotElement);
            });
        } catch (error) {
            console.error('Error en renderMobileDailyView:', error);
            dailySlotsContainer.innerHTML = `<p class="error-text">${error.message}</p>`;
        }
    }

    function getWeekDays(date) {
        const start = new Date(date);
        const day = start.getDay();
        const diff = start.getDate() - day + (day === 0 ? -6 : 1);
        start.setDate(diff);
        return Array.from({ length: 7 }).map((_, i) => {
            const d = new Date(start);
            d.setDate(start.getDate() + i);
            return d;
        });
    }

    function renderDateStrip(selectedDate) {
        const week = getWeekDays(selectedDate);
        const strip = document.createElement('div');
        strip.className = 'date-strip';
        const locale = 'es-ES';
        const selectedDayString = selectedDate.toISOString().split('T')[0];
        week.forEach(day => {
            const item = document.createElement('div');
            item.className = 'date-item';
            const dayString = day.toISOString().split('T')[0];
            if (dayString === selectedDayString) {
                item.classList.add('selected');
            }
            item.innerHTML = `
                <span class="day-name">${day.toLocaleDateString(locale, { weekday: 'short' })}</span>
                <span class="day-number">${day.getDate()}</span>
            `;
            item.addEventListener('click', () => {
                currentDisplayedDate = day;
                handleViewChange();
            });
            strip.appendChild(item);
        });
        dateStripContainer.innerHTML = '';
        dateStripContainer.appendChild(strip);
    }
    
    const formatDate = (date) => new Date(date).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
    const formatTime = (date) => new Date(date).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', hour12: false });
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
            userActiveBooking = booking;
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
    const showBookingModal = (startTime, availableDurations) => {
        const modalTitle = document.getElementById('modal-title');
        modalTitle.textContent = "Confirmar Reserva";
        openMatchCheckbox.checked = false;
        bookingModalTime.textContent =  `Has seleccionado el horario de las ${formatTime(new Date(startTime))}.`;
        bookingModalOptions.innerHTML = '';
        
        document.querySelector('#booking-modal .form-group').style.display = 'block';
        document.querySelector('#booking-modal p:nth-of-type(2)').style.display = 'block';
        
        availableDurations.forEach(duration => {
            const button = document.createElement('button');
            button.textContent = `${duration} min`;
            button.dataset.duration = duration;
            button.dataset.starttime = startTime;
            bookingModalOptions.appendChild(button);
        });
        bookingModalOverlay.classList.remove('hidden');
    };
    const showMobileConfirmationModal = (startTime, duration, isOpenMatch) => {
        const modalTitle = document.getElementById('modal-title');
        const openMatchText = isOpenMatch ? " (Partida Abierta)" : "";
        
        modalTitle.textContent = "Confirmar Reserva";
        bookingModalTime.textContent = `¿Reservar a las ${formatTime(new Date(startTime))} por ${duration} min${openMatchText}?`;
        
        bookingModalOptions.innerHTML = '';
        document.querySelector('#booking-modal .form-group').style.display = 'none';
        document.querySelector('#booking-modal p:nth-of-type(2)').style.display = 'none';

        const confirmBtn = document.createElement('button');
        confirmBtn.textContent = 'Confirmar Reserva';
        confirmBtn.dataset.starttime = startTime;
        confirmBtn.dataset.duration = duration;
        openMatchCheckbox.checked = isOpenMatch; 
        
        bookingModalOptions.appendChild(confirmBtn);
        bookingModalOverlay.classList.remove('hidden');
    };
    const showWaitlistModal = (target) => {
        const startTime = target.dataset.starttime;
        waitlistJoinBtn.dataset.courtid = "1";
        waitlistJoinBtn.dataset.starttime = startTime;
        waitlistModalOverlay.classList.remove('hidden');
    };
    const showOpenMatchModal = async (target) => {
        const { bookingId, participants, maxParticipants, starttime } = target.dataset;
        joinMatchTime.textContent = new Date(starttime).toLocaleString('es-ES');
        joinMatchParticipants.textContent = `${participants}/${maxParticipants}`;
        joinMatchConfirmBtn.dataset.bookingId = bookingId;
        try {
            const response = await fetch(`${API_BASE_URL}/api/matches/${bookingId}/participants`, { headers: { 'Authorization': `Bearer ${authToken}` } });
            if (!response.ok) throw new Error('No se pudieron obtener los participantes.');
            const { participants: currentPlayers } = await response.json();
            joinMatchParticipantsList.innerHTML = ''; 
            if (currentPlayers.length > 0) {
                currentPlayers.forEach(p => { const li = document.createElement('li'); li.textContent = p.name; joinMatchParticipantsList.appendChild(li); });
            } else {
                const li = document.createElement('li'); li.textContent = 'No hay jugadores apuntados aún.'; joinMatchParticipantsList.appendChild(li);
            }
        } catch (error) {
            console.error('Error al cargar participantes para unirse:', error);
            joinMatchParticipantsList.innerHTML = '<li>Error al cargar participantes.</li>';
        }
        joinMatchModalOverlay.classList.remove('hidden');
    };
    const showMyBookingModal = (target) => {
        const startTime = target.dataset.starttime;
        myBookingModalTime.textContent = new Date(startTime).toLocaleString('es-ES');
        myBookingCancelBtn.dataset.bookingId = target.dataset.bookingId; // Corrected from myBookingId
        myBookingModalOverlay.classList.remove('hidden');
    };
    const showMyMatchModal = async (bookingId, startTime) => {
        if (!userActiveBooking || userActiveBooking.id !== bookingId) {
            await fetchMyBooking();
            if (!userActiveBooking || userActiveBooking.id !== bookingId) {
                console.error('Error: userActiveBooking does not match the provided bookingId.');
                return;
            }
        }
        myMatchModalTime.textContent = new Date(startTime).toLocaleString('es-ES');
        const isOwner = userActiveBooking.participation_type === 'owner';
        if (isOwner) {
            myMatchCancelMatchBtn.classList.remove('hidden');
            myMatchCancelMatchBtn.dataset.bookingId = bookingId;
            myMatchLeaveBtn.classList.add('hidden'); 
        } else {
            myMatchCancelMatchBtn.classList.add('hidden');
            myMatchLeaveBtn.classList.remove('hidden');
            myMatchLeaveBtn.dataset.bookingId = bookingId;
        }
        try {
            const response = await fetch(`${API_BASE_URL}/api/matches/${bookingId}/participants`, { headers: { 'Authorization': `Bearer ${authToken}` } });
            if (!response.ok) throw new Error('No se pudieron obtener los participantes.');
            const { participants } = await response.json();
            myMatchParticipantsList.innerHTML = '';
            participants.forEach(p => { const li = document.createElement('li'); li.textContent = p.name; myMatchParticipantsList.appendChild(li); });
        } catch (error) {
            console.error('Error al cargar participantes:', error);
            myMatchParticipantsList.innerHTML = '<li>Error al cargar participantes.</li>';
        }
        myMatchModalOverlay.classList.remove('hidden');
    };
    const handleCalendarClick = (event) => {
        const target = event.target.closest('.slot');
        if (!target) return;
        if (target.classList.contains('past-slot')) return;
        if (target.classList.contains('my-private-booking')) showMyBookingModal(target);
        else if (target.classList.contains('my-joined-match')) showMyMatchModal(target.dataset.bookingId, target.dataset.starttime);
        else if (target.classList.contains('available')) {
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
            showBookingModal(startTime, availableDurations);
        }
        else if (target.dataset.waitlistable === 'true') showWaitlistModal(target);
        else if (target.dataset.action === 'join_match') showOpenMatchModal(target);
    };

    const handleMobileSlotClick = (event) => {
        const header = event.target.closest('.slot-header');
        const bookButton = event.target.closest('.book-btn');
        const slotElement = event.target.closest('.daily-slot');

        if (slotElement && slotElement.dataset.status === 'past') {
            return;
        }

        if (bookButton) {
            const { starttime, duration } = bookButton.dataset;
            const details = bookButton.closest('.slot-details');
            const isOpenMatch = details.querySelector('input[type="checkbox"]').checked;
            showMobileConfirmationModal(starttime, duration, isOpenMatch);
            return;
        }

        if (header && slotElement) {
            const status = slotElement.dataset.status;
            switch(status) {
                case 'available':
                    const details = header.nextElementSibling;
                    document.querySelectorAll('.slot-details.active').forEach(openDetail => {
                        if (openDetail !== details) openDetail.classList.remove('active');
                    });
                    details.classList.toggle('active');
                    break;
                case 'open_match_available':
                    showOpenMatchModal({ dataset: slotElement.dataset });
                    break;
                case 'my_private_booking':
                    showMyBookingModal({ dataset: slotElement.dataset });
                    break;
                case 'my_joined_match':
                    showMyMatchModal(slotElement.dataset.bookingId, slotElement.dataset.starttime);
                    break;
                case 'booked':
                case 'open_match_full':
                    showWaitlistModal({ dataset: slotElement.dataset });
                    break;
            }
        }
    };

    const handleMyBookingActions = async (event) => {
        const target = event.target;
        const bookingId = target.dataset.bookingId;
        if (!bookingId) return;
        let url = '';
        let method = 'DELETE';
        let confirmMessage = '';
        if (target.id === 'cancel-booking-btn' || target.id === 'my-booking-cancel-btn' || target.id === 'my-match-cancel-match-btn') {
            url = `${API_BASE_URL}/api/bookings/${bookingId}`;
            confirmMessage = '¿Estás seguro de que quieres cancelar esta reserva/partida?';
        } else if (target.id === 'leave-match-btn' || target.id === 'my-match-leave-btn') {
            url = `${API_BASE_URL}/api/matches/${bookingId}/leave`;
            confirmMessage = '¿Estás seguro de que quieres abandonar esta partida?';
        } else return;
        if (!confirm(confirmMessage)) return;
        try {
            const response = await fetch(url, { method, headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}` } });
            if (!response.ok) { const data = await response.json(); throw new Error(data.message); }
            const data = await response.json();
            alert(data.message || 'Acción completada con éxito.');
            myBookingModalOverlay.classList.add('hidden');
            myMatchModalOverlay.classList.add('hidden');
            fetchMyBooking();
            handleViewChange();
        } catch (error) {
            alert(`Error: ${error.message}`);
        }
    };
    const handleBookingModalAction = async (event) => {
        if (event.target.tagName !== 'BUTTON') return;
        const { starttime, duration } = event.target.dataset;
        if (!starttime) return;
        const body = {
            courtId: selectedCourtId,
            startTime: starttime,
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
            handleViewChange();
            fetchMyBooking();
        } catch (error) {
            console.error("Booking Error:", error);
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
            handleViewChange();
        } catch(error) {
            alert(`Error: ${error.message}`);
        }
    };

    async function renderWeeklyCalendar(date) {
        calendarContainer.innerHTML = '<p>Cargando calendario...</p>';
        const dateString = new Date(date).toISOString().split('T')[0];
        try {
            const response = await fetch(`${API_BASE_URL}/api/schedule/week?courtId=${selectedCourtId}&date=${dateString}`, { headers: { 'Authorization': `Bearer ${authToken}` } });
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
                    const now = new Date();
                    const slotStartTime = new Date(currentSlotData.startTime);
                    let cellContent = '';
                    switch (currentSlotData.status) {
                        case 'available': slotCell.classList.add('available'); cellContent = 'Libre'; break;
                        case 'booked': slotCell.classList.add('booked'); slotCell.dataset.waitlistable = 'true'; cellContent = 'Ocupado'; break;
                        case 'open_match_available': slotCell.classList.add('open-match'); slotCell.dataset.action = 'join_match'; slotCell.dataset.bookingId = currentSlotData.bookingId; slotCell.dataset.participants = currentSlotData.participants; slotCell.dataset.maxParticipants = currentSlotData.maxParticipants; cellContent = `Partida Abierta (${currentSlotData.participants}/${currentSlotData.maxParticipants})`; break;
                        case 'open_match_full': slotCell.classList.add('booked'); cellContent = `Partida Llena`; break;
                        case 'blocked': slotCell.classList.add('blocked'); cellContent = currentSlotData.reason || 'Bloqueado'; break;
                    }
                    if (slotStartTime < now) slotCell.classList.add('past-slot');
                    else if (userActiveBooking && userActiveBooking.id === currentSlotData.bookingId) {
                        if (userActiveBooking.participation_type === 'owner') { slotCell.classList.add('my-private-booking'); cellContent = 'Mi Reserva'; } 
                        else if (userActiveBooking.participation_type === 'participant') { slotCell.classList.add('my-joined-match'); cellContent = `Mi Partida Abierta (${currentSlotData.participants}/${currentSlotData.maxParticipants})`; }
                        slotCell.dataset.bookingId = currentSlotData.bookingId;
                    }
                    slotCell.innerHTML = `<span>${cellContent}</span>`;
                    grid.appendChild(slotCell);
                });
            });
            calendarContainer.innerHTML = '';
            calendarContainer.appendChild(grid);
        } catch (error) {
            console.error("Error al renderizar el calendario:", error);
            calendarContainer.innerHTML = `<p style="color:red;">${error.message}</p>`;
        }
    };
    
    function initializeApp() {
        if (!authToken) {
            window.location.href = '/login.html';
            return;
        }
        fetchUserProfile();
        fetchMyBooking();
        initializeCourtSelector(); 
        logoutButton.addEventListener('click', () => { localStorage.removeItem('authToken'); window.location.href = '/login.html'; });
        adminPanelBtn.addEventListener('click', () => window.location.href = '/admin.html');
        prevWeekBtn.addEventListener('click', () => { currentDisplayedDate.setDate(currentDisplayedDate.getDate() - 7); handleViewChange(); });
        nextWeekBtn.addEventListener('click', () => { currentDisplayedDate.setDate(currentDisplayedDate.getDate() + 7); handleViewChange(); });
        myBookingContainer.addEventListener('click', handleMyBookingActions);
        calendarContainer.addEventListener('click', handleCalendarClick);
        dailySlotsContainer.addEventListener('click', handleMobileSlotClick);
        bookingModalOverlay.addEventListener('click', (event) => { if (event.target === bookingModalOverlay) bookingModalOverlay.classList.add('hidden'); });
        bookingModalCancelBtn.addEventListener('click', () => { bookingModalOverlay.classList.add('hidden'); });
        waitlistModalOverlay.addEventListener('click', (event) => { if (event.target.id === 'waitlist-modal-overlay') waitlistModalOverlay.classList.add('hidden'); });
        waitlistCancelBtn.addEventListener('click', () => { waitlistModalOverlay.classList.add('hidden'); });
        joinMatchModalOverlay.addEventListener('click', (event) => { if (event.target.id === 'join-match-modal-overlay') joinMatchModalOverlay.classList.add('hidden'); });
        joinMatchCancelBtn.addEventListener('click', () => { joinMatchModalOverlay.classList.add('hidden'); });
        myBookingModalOverlay.addEventListener('click', (event) => { if (event.target === myBookingModalOverlay) myBookingModalOverlay.classList.add('hidden'); });
        myBookingCloseBtn.addEventListener('click', () => { myBookingModalOverlay.classList.add('hidden'); });
        myMatchModalOverlay.addEventListener('click', (event) => { if (event.target === myMatchModalOverlay) myMatchModalOverlay.classList.add('hidden'); });
        myMatchCloseBtn.addEventListener('click', () => { myMatchModalOverlay.classList.add('hidden'); });
        bookingModalOptions.addEventListener('click', handleBookingModalAction);
        waitlistJoinBtn.addEventListener('click', handleWaitlistModalAction);
        joinMatchConfirmBtn.addEventListener('click', handleJoinMatchAction);
        myBookingCancelBtn.addEventListener('click', handleMyBookingActions);
        myMatchLeaveBtn.addEventListener('click', handleMyBookingActions);
        myMatchCancelMatchBtn.addEventListener('click', handleMyBookingActions);
        window.addEventListener('resize', handleViewChange);
    }

    initializeApp();
});