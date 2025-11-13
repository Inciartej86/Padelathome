document.addEventListener('DOMContentLoaded', async () => {
const API_BASE_URL = 'http://padelathome.wincicloud.win';
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