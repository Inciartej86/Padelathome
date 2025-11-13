document.addEventListener('DOMContentLoaded', () => {
    // --- 1. CONFIGURACIÓN INICIAL Y ELEMENTOS DEL DOM ---
    const API_BASE_URL = 'https://padelathome.wincicloud.win'; // IP de la Raspberry Pi
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
    // Nuevo Modal para Mi Reserva
    const myBookingModalOverlay = document.getElementById('my-booking-modal-overlay');
    const myBookingModalTime = document.getElementById('my-booking-modal-time');
    const myBookingCancelBtn = document.getElementById('my-booking-cancel-btn');
    const myBookingCloseBtn = document.getElementById('my-booking-close-btn');
    // Nuevo Modal para Mi Partida Abierta
    const myMatchModalOverlay = document.getElementById('my-match-modal-overlay');
    const myMatchModalTime = document.getElementById('my-match-modal-time');
    const myMatchParticipantsList = document.getElementById('my-match-participants-list');
    const myMatchCancelMatchBtn = document.getElementById('my-match-cancel-match-btn'); // Nuevo
    const myMatchLeaveBtn = document.getElementById('my-match-leave-btn');
    const myMatchCloseBtn = document.getElementById('my-match-close-btn');

    // --- 2. ESTADO GLOBAL ---
    let currentDisplayedDate = new Date();
    let weeklyScheduleData = {};
    let userActiveBooking = null; // Nuevo: para almacenar la reserva activa del usuario

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
            userActiveBooking = booking; // Almacenamos la reserva activa globalmente
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
                    
                    const now = new Date();
                    const slotStartTime = new Date(currentSlotData.startTime);

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

                    // Si el slot ya ha pasado, lo marcamos visualmente como tal y lo hacemos no interactivo
                    if (slotStartTime < now) {
                        slotCell.classList.add('past-slot');
                        // No cambiamos el cellContent para que muestre el estado original (Libre, Ocupado, etc.)
                        // La interactividad se manejará en handleCalendarClick
                    } else if (userActiveBooking && userActiveBooking.id === currentSlotData.bookingId) {
                        // Si es la reserva activa del usuario
                        if (userActiveBooking.participation_type === 'owner') {
                            slotCell.classList.add('my-private-booking');
                            cellContent = 'Mi Reserva';
                        } else if (userActiveBooking.participation_type === 'participant') {
                            slotCell.classList.add('my-joined-match');
                            cellContent = `Mi Partida Abierta (${currentSlotData.participants}/${currentSlotData.maxParticipants})`;
                        }
                        slotCell.dataset.myBookingId = userActiveBooking.id; // Para referencia en el click handler
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

    // Nuevo: Mostrar modal para mi reserva
    const showMyBookingModal = (target) => {
        const startTime = target.dataset.starttime;
        myBookingModalTime.textContent = new Date(startTime).toLocaleString('es-ES');
        myBookingCancelBtn.dataset.bookingId = target.dataset.myBookingId;
        myBookingModalOverlay.classList.remove('hidden');
    };

    // Nuevo: Mostrar modal para mi partida abierta
    const showMyMatchModal = async (target) => {
        const bookingId = target.dataset.myBookingId;
        const startTime = target.dataset.starttime;
        myMatchModalTime.textContent = new Date(startTime).toLocaleString('es-ES');
        
        // Determinar si el usuario es el propietario de la partida
        const isOwner = userActiveBooking && userActiveBooking.id === bookingId && userActiveBooking.participation_type === 'owner';

        if (isOwner) {
            myMatchCancelMatchBtn.classList.remove('hidden');
            myMatchCancelMatchBtn.dataset.bookingId = bookingId;
            myMatchLeaveBtn.classList.add('hidden'); // El propietario no "abandona", cancela
        } else {
            myMatchCancelMatchBtn.classList.add('hidden');
            myMatchLeaveBtn.classList.remove('hidden');
            myMatchLeaveBtn.dataset.bookingId = bookingId;
        }

        // Fetch participants
        try {
            const response = await fetch(`${API_BASE_URL}/api/matches/${bookingId}/participants`, { headers: { 'Authorization': `Bearer ${authToken}` } });
            if (!response.ok) throw new Error('No se pudieron obtener los participantes.');
            const { participants } = await response.json();
            myMatchParticipantsList.innerHTML = '';
            participants.forEach(p => {
                const li = document.createElement('li');
                li.textContent = p.name;
                myMatchParticipantsList.appendChild(li);
            });
        } catch (error) {
            console.error('Error al cargar participantes:', error);
            myMatchParticipantsList.innerHTML = '<li>Error al cargar participantes.</li>';
        }

        myMatchModalOverlay.classList.remove('hidden');
    };

    // --- 5. MANEJADORES DE EVENTOS (HANDLERS) ---
    const handleCalendarClick = (event) => {
        const target = event.target.closest('.slot');
        if (!target) return;

        // Si el slot es pasado, no permitimos ninguna interacción
        if (target.classList.contains('past-slot')) {
            return;
        }

        // Nuevo: Si es mi reserva privada
        if (target.classList.contains('my-private-booking')) {
            showMyBookingModal(target);
        } 
        // Nuevo: Si es mi partida abierta
        else if (target.classList.contains('my-joined-match')) {
            showMyMatchModal(target);
        }
        // Comportamiento existente para otros slots
        else if (target.classList.contains('available')) {
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
        if (!bookingId) {
            return;
        }
        let url = '';
        let method = 'DELETE';
        let confirmMessage = '';
        if (target.id === 'cancel-booking-btn' || target.id === 'my-booking-cancel-btn' || target.id === 'my-match-cancel-match-btn') {
            url = `${API_BASE_URL}/api/bookings/${bookingId}`;
            confirmMessage = '¿Estás seguro de que quieres cancelar esta reserva/partida?';
        } else if (target.id === 'leave-match-btn' || target.id === 'my-match-leave-btn') {
            url = `${API_BASE_URL}/api/matches/${bookingId}/leave`;
            confirmMessage = '¿Estás seguro de que quieres abandonar esta partida?';
        } else {
            return;
        }
        if (!confirm(confirmMessage)) return;
        try {
            const response = await fetch(url, { method, headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}` } });
            if (!response.ok) { const data = await response.json(); throw new Error(data.message); }
            const data = await response.json();
            alert(data.message || 'Acción completada con éxito.');
            // Close any open modals
            myBookingModalOverlay.classList.add('hidden');
            myMatchModalOverlay.classList.add('hidden');
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
        // Nuevos listeners para mis modales
        myBookingModalOverlay.addEventListener('click', (event) => { if (event.target === myBookingModalOverlay) myBookingModalOverlay.classList.add('hidden'); });
        myBookingCloseBtn.addEventListener('click', () => { myBookingModalOverlay.classList.add('hidden'); });
        myMatchModalOverlay.addEventListener('click', (event) => { if (event.target === myMatchModalOverlay) myMatchModalOverlay.classList.add('hidden'); });
        myMatchCloseBtn.addEventListener('click', () => { myMatchModalOverlay.classList.add('hidden'); });

        // Listeners para los botones de ACCIÓN de los modales
        bookingModalOptions.addEventListener('click', handleBookingModalAction);
        waitlistJoinBtn.addEventListener('click', handleWaitlistModalAction);
        joinMatchConfirmBtn.addEventListener('click', handleJoinMatchAction);
        // Nuevos listeners de acción para mis modales
        myBookingCancelBtn.addEventListener('click', handleMyBookingActions); // Reutilizamos la función existente
        myMatchLeaveBtn.addEventListener('click', handleMyBookingActions); // Reutilizamos la función existente
        myMatchCancelMatchBtn.addEventListener('click', handleMyBookingActions); // Nuevo: Reutilizamos la función existente
    };

    // Envuelve toda la inicialización en un listener que se asegura de que el HTML está listo
    initializePage();
});