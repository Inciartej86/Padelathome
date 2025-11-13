document.addEventListener('DOMContentLoaded', () => {
    // --- 1. CONFIGURACIÓN INICIAL Y ELEMENTOS DEL DOM ---
    const API_BASE_URL = 'https://padelathome.wincicloud.win';
    const authToken = localStorage.getItem('authToken');

    const adminNameSpan = document.getElementById('admin-name');
    const logoutButton = document.getElementById('logout-button');

    // Tabs
    const tabLinks = document.querySelectorAll('.tab-link');
    const tabContents = document.querySelectorAll('.tab-content');
    // Acordeones
    const accordionHeaders = document.querySelectorAll('.accordion-header');
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
            fetchAndDisplayStats(); // <-- Nueva llamada
        } catch (error) {
            console.error(error);
            localStorage.removeItem('authToken');
            alert('Sesión inválida. Por favor, inicia sesión de nuevo.');
            window.location.href = '/login.html';
        }
    };

    // --- NUEVA FUNCIÓN: Obtener y mostrar estadísticas ---
    const fetchAndDisplayStats = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/admin/stats`, { headers: { 'Authorization': `Bearer ${authToken}` } });
            if (!response.ok) throw new Error('No se pudieron obtener las estadísticas.');
            const stats = await response.json();

            document.getElementById('total-bookings').textContent = stats.totalBookings;

            const mostActiveUsersList = document.getElementById('most-active-users');
            mostActiveUsersList.innerHTML = '';
            if (stats.topUsers.length > 0) {
                stats.topUsers.forEach(user => {
                    const li = document.createElement('li');
                    li.textContent = `${user.name} (${user.booking_count} reservas)`;
                    mostActiveUsersList.appendChild(li);
                });
            } else {
                mostActiveUsersList.innerHTML = '<li>No hay datos de usuarios activos.</li>';
            }

            const peakHoursList = document.getElementById('peak-hours');
            peakHoursList.innerHTML = '';
            if (stats.peakHours.length > 0) {
                stats.peakHours.forEach(hourStat => {
                    const li = document.createElement('li');
                    li.textContent = `Hora ${hourStat.hour}:00 (${hourStat.count} reservas)`;
                    peakHoursList.appendChild(li);
                });
            } else {
                peakHoursList.innerHTML = '<li>No hay datos de horas pico.</li>';
            }

        } catch (error) {
            console.error('Error al obtener estadísticas:', error);
            document.getElementById('total-bookings').textContent = 'Error';
            document.getElementById('most-active-users').innerHTML = '<li>Error al cargar.</li>';
            document.getElementById('peak-hours').innerHTML = '<li>Error al cargar.</li>';
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
                    <td>${user.role}</td>
                    <td>
                        ${user.account_status === 'pending_approval' ? `<button class="approve-btn" data-userid="${user.id}">Aprobar</button>` : ''}
                        ${user.account_status === 'active' ? `<button class="deactivate-btn" data-userid="${user.id}">Desactivar</button>` : ''}
                        ${user.account_status === 'inactive' ? `<button class="activate-btn" data-userid="${user.id}">Activar</button>` : ''}
                    </td>
                    <td>
                        <button class="reset-password-btn" data-userid="${user.id}">Restablecer Contraseña</button>
                        <button class="toggle-role-btn" data-userid="${user.id}" data-currentrole="${user.role}">
                            ${user.role === 'admin' ? 'Cambiar a Usuario' : 'Cambiar a Admin'}
                        </button>
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
        } else if (target.classList.contains('reset-password-btn')) {
            actionUrl = `${API_BASE_URL}/api/admin/users/${userId}/reset-password`;
            actionMethod = 'POST';
            if (!confirm('¿Estás seguro de que quieres enviar un correo de restablecimiento de contraseña a este usuario?')) return;
        } else if (target.classList.contains('toggle-role-btn')) {
            const currentRole = target.dataset.currentrole;
            const newRole = currentRole === 'admin' ? 'user' : 'admin';
            actionUrl = `${API_BASE_URL}/api/admin/users/${userId}/role`;
            actionPayload = { role: newRole };
            if (!confirm(`¿Estás seguro de que quieres cambiar el rol de este usuario a ${newRole}?`)) return;
        } else {
            return;
        }
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


        // Lógica para el cambio de pestañas
        tabLinks.forEach(link => {
            link.addEventListener('click', () => {
                const tab = link.dataset.tab;

                tabLinks.forEach(item => item.classList.remove('active'));
                link.classList.add('active');

                tabContents.forEach(content => {
                    if (content.id === tab) {
                        content.classList.add('active');
                    } else {
                        content.classList.remove('active');
                    }
                });
            });
        });

        // Lógica para los acordeones
        accordionHeaders.forEach(header => {
            header.addEventListener('click', () => {
                const accordionContent = header.nextElementSibling;
                header.classList.toggle('active');
                if (accordionContent.style.display === 'block') {
                    accordionContent.style.display = 'none';
                } else {
                    accordionContent.style.display = 'block';
                }
            });
        });
        
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