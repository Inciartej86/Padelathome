document.addEventListener('DOMContentLoaded', () => {
    // La IP se debe reemplazar por la IP pública o dominio en producción
    const API_BASE_URL = 'https://padelathome.wincicloud.win';

    const loginForm = document.getElementById('login-form');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const errorMessage = document.getElementById('error-message');
    const registerLink = document.getElementById('register-link-container');

    // Comprobamos si el registro público está habilitado
    const checkRegistrationStatus = async () => {
        try {
            // Asumimos que el admin puede habilitar/deshabilitar esto en los ajustes
            // Por ahora, lo mostramos, pero la lógica de 'inviteUser' es la principal
            // const response = await fetch(`${API_BASE_URL}/api/admin/settings`);
            // const settings = await response.json();
            // if (settings.allow_public_registration === 'true') {
            //   registerLink.style.display = 'block';
            // }
            // Como el flujo principal es por invitación, lo dejamos oculto o lo quitamos.
            // Para este ejemplo, lo dejaremos oculto.
        } catch (e) {
            console.error("No se pudo verificar el estado del registro.");
        }
    };
    checkRegistrationStatus();


    loginForm.addEventListener('submit', async (event) => {
        event.preventDefault(); 
        const email = emailInput.value;
        const password = passwordInput.value;
        errorMessage.textContent = '';

        try {
            const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            });

            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.message || 'Error al iniciar sesión');
            }

            localStorage.setItem('authToken', data.token);
            window.location.href = '/dashboard.html'; // Redirigir al dashboard

        } catch (error) {
            errorMessage.textContent = error.message;
        }
    });
});