document.addEventListener('DOMContentLoaded', () => {
    const API_BASE_URL = 'http://localhost:3000/api';
    const loginForm = document.getElementById('login-form');
    const errorMessageEl = document.getElementById('error-message');

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        errorMessageEl.style.display = 'none';

        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;

        try {
            const response = await fetch(`${API_BASE_URL}/admin/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Login gagal.');
            }

            // Simpan token admin ke localStorage
            localStorage.setItem('adminAuthToken', data.token);

            // Redirect ke halaman admin
            window.location.href = 'admin.html';
        } catch (error) {
            errorMessageEl.textContent = error.message;
            errorMessageEl.style.display = 'block';
        }
    });
});