document.addEventListener('DOMContentLoaded', () => {
    const API_BASE_URL = 'https://padelathome.wincicloud.win';
    const registerForm = document.getElementById('register-form');
    const messageParagraph = document.getElementById('message');

    registerForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const data = {
            name: document.getElementById('name').value,
            email: document.getElementById('email').value,
            password: document.getElementById('password').value,
            building: document.getElementById('building').value,
            floor: document.getElementById('floor').value,
            door: document.getElementById('door').value,
        };

        messageParagraph.textContent = 'Enviando registro...';
        messageParagraph.className = '';

        try {
            const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.message);

            registerForm.reset();
            messageParagraph.className = 'success-text';
            messageParagraph.textContent = '¡Registro exitoso! Un administrador debe aprobar tu cuenta.';
            setTimeout(() => { window.location.href = '/login.html'; }, 5000);

        } catch (error) {
            messageParagraph.className = 'error-text';
            messageParagraph.textContent = error.message;
        }
    });
});