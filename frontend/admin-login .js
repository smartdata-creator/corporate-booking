document.addEventListener('DOMContentLoaded', () => {
    const API_BASE_URL = 'https://corporate-booking.onrender.com/api/admin/auth/login';
    const loginForm = document.getElementById('login-form');
    const errorMessageEl = document.getElementById('error-message');

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        errorMessageEl.style.display = 'none';

        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;

        try {
            const response = await fetch(`${API_BASE_URL}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Login gagal.');
            }

            // Simpan token ke localStorage
            localStorage.setItem('authToken', data.token);

            // Redirect ke halaman portal
            window.location.href = 'portal.html';
        } catch (error) {
            errorMessageEl.textContent = error.message;
            errorMessageEl.style.display = 'block';
        }
    });
});