document.addEventListener('DOMContentLoaded', () => {
    const API_BASE_URL = 'https://corporate-booking.onrender.com/api';
    const loginForm = document.getElementById('login-form');
    const errorMessageEl = document.getElementById('error-message');

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        errorMessageEl.style.display = 'none';

        const companyIdInput = document.getElementById('company-id').value;
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;

        // Ekstrak hanya angka dari ID Perusahaan. Contoh: "KSB - 123" -> "123"
        const match = companyIdInput.match(/\d+\s*$/);
        if (!match) {
            errorMessageEl.textContent = 'Format ID Perusahaan tidak valid. Harap masukkan ID dengan benar (Contoh: KSB - 1).';
            errorMessageEl.style.display = 'block';
            return;
        }
        const companyId = match[0].trim();

        try {
            const response = await fetch(`${API_BASE_URL}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ companyId, email, password })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Login gagal.');
            }

            // Simpan token ke localStorage dengan kunci yang benar dan konsisten
            localStorage.setItem('corporateAuthToken', data.token);

            // Redirect ke halaman portal
            window.location.href = 'portal.html';
        } catch (error) {
            errorMessageEl.textContent = error.message;
            errorMessageEl.style.display = 'block';
        }
    });
});