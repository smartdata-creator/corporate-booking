document.addEventListener('DOMContentLoaded', () => {
    const API_BASE_URL = 'https://corporate-booking.onrender.com/api';

    // Ambil token dari localStorage. Kunci 'corporateAuthToken' harus konsisten dengan yang disimpan saat login.
    const token = localStorage.getItem('corporateAuthToken');
    if (!token) {
        window.location.href = 'login.html';
        return;
    }
    const authHeader = { 'Authorization': `Bearer ${token}` };

    // --- Decode JWT to get company info ---
    const parseJwt = (token) => {
        try {
            // Mengganti atob yang sudah usang dan menambahkan penanganan untuk URL-safe base64
            const base64Url = token.split('.')[1];
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
                return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
            }).join(''));
            return JSON.parse(jsonPayload);
        } catch (e) {
            return null;
        }
    };

    const decodedToken = parseJwt(token);
    if (!decodedToken) {
        localStorage.removeItem('corporateAuthToken');
        window.location.href = 'login.html';
        return;
    }

    const companyId = decodedToken.companyId;
    const companyName = decodedToken.companyName;

    // --- Element Selectors ---
    const companyNameDisplay = document.getElementById('company-name-display');
    const availableCreditEl = document.getElementById('available-credit');
    const usedCreditEl = document.getElementById('used-credit');
    const totalLimitEl = document.getElementById('total-limit');
    const hotelGrid = document.getElementById('hotel-grid-portal');

    // Dropdown and Modal Elements
    const changePasswordBtn = document.getElementById('change-password-btn');
    const changePasswordModal = document.getElementById('change-password-modal');
    const changePasswordModalOverlay = document.getElementById('change-password-modal-overlay');
    const changePasswordModalCloseBtn = document.getElementById('change-password-modal-close-btn');
    const changePasswordForm = document.getElementById('change-password-form');
    const logoutBtn = document.getElementById('logout-btn');

    // --- Setup Logout ---
    logoutBtn.addEventListener('click', (e) => {
        e.preventDefault();
        localStorage.removeItem('corporateAuthToken');
        window.location.href = 'login.html';
    });

    // --- Setup Change Password Modal ---
    const closeChangePasswordModal = () => {
        changePasswordModal.classList.remove('active');
        changePasswordModalOverlay.classList.remove('active');
        changePasswordForm.reset();
    };

    changePasswordBtn.addEventListener('click', (e) => {
        e.preventDefault();
        changePasswordModal.classList.add('active');
        changePasswordModalOverlay.classList.add('active');
    });
    changePasswordModalCloseBtn.addEventListener('click', closeChangePasswordModal);
    changePasswordModalOverlay.addEventListener('click', closeChangePasswordModal);

    // --- Helper Functions ---
    const formatCurrency = (number) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0,
        }).format(number);
    };

    const generateStars = (rating) => {
        const totalStars = 5;
        let starHTML = '';
        const roundedRating = Math.round(rating);
        for (let i = 0; i < totalStars; i++) {
            starHTML += i < roundedRating ? '★' : '☆';
        }
        return `<span style="color: #FBBF24; font-size: 1.1rem;">${starHTML}</span>`;
    };

    // --- Data Fetching and Rendering ---
    const fetchCompanyData = async () => {
        try {
            // FIX: Menggunakan endpoint /portal yang benar
            const response = await fetch(`${API_BASE_URL}/portal/companies/${companyId}`, { headers: authHeader });
            if (!response.ok) {
                throw new Error('Gagal memuat data perusahaan.');
            }
            const company = await response.json();

            // Render Company Info
            companyNameDisplay.textContent = companyName;
            const creditLimit = parseFloat(company.credit_limit);
            const creditUsed = parseFloat(company.credit_used);
            const availableCredit = creditLimit - creditUsed;

            totalLimitEl.textContent = formatCurrency(creditLimit);
            usedCreditEl.textContent = formatCurrency(creditUsed);
            availableCreditEl.textContent = formatCurrency(availableCredit);

        } catch (error) {
            console.error('Error fetching company data:', error);
            document.querySelector('.credit-info .container').innerHTML = `<p>Gagal memuat data kredit: ${error.message}</p>`;
        }
    };

    const fetchAndRenderHotels = async () => {
        try {
            // Mengambil daftar hotel yang HANYA diizinkan untuk perusahaan ini.
            // Endpoint ini dilindungi dan difilter di backend.
            const response = await fetch(`${API_BASE_URL}/portal/hotels`, { headers: authHeader });
            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.error || 'Gagal memuat data hotel.');
            }
            const hotels = await response.json();

            if (hotels.length === 0) {
                hotelGrid.innerHTML = '<p style="text-align: center; grid-column: 1 / -1;">Tidak ada hotel yang tersedia untuk perusahaan Anda saat ini.</p>';
                return;
            }

            hotelGrid.innerHTML = ''; // Hapus pesan "Memuat..."
            hotels.forEach(hotel => {
                const cardLink = document.createElement('a');
                // Arahkan ke halaman detail portal dengan menyertakan ID hotel.
                // ID perusahaan akan diambil dari token di halaman detail.
                cardLink.href = `portal-hotel-details.html?id=${hotel.id}`;
                cardLink.className = 'hotel-card'; // Menggunakan style dari halaman utama
                cardLink.innerHTML = `
                    <img src="${hotel.image_url || 'https://via.placeholder.com/400x250.png?text=No+Image'}" alt="${hotel.name}">
                    <div class="hotel-card-content">
                        <h3>${hotel.name}</h3>
                        <div class="hotel-rating">
                            ${generateStars(hotel.average_rating)}
                            <small>(${hotel.review_count} ulasan)</small>
                        </div>
                    </div>
                    <div class="hotel-cta">
                        <span class="btn btn-secondary">Lihat Harga Korporat</span>
                    </div>
                `;
                hotelGrid.appendChild(cardLink);
            });
        } catch (error) {
            console.error('Error fetching hotel data:', error);
            hotelGrid.innerHTML = `<p>Gagal memuat data hotel: ${error.message}</p>`;
        }
    };

    // --- Initial Load ---
    fetchCompanyData();
    fetchAndRenderHotels();

    // --- Change Password Form Logic ---
    changePasswordForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const oldPassword = document.getElementById('old-password').value;
        const newPassword = document.getElementById('new-password').value;
        const confirmPassword = document.getElementById('confirm-password').value;

        if (newPassword !== confirmPassword) {
            alert('Password baru dan konfirmasi password tidak cocok.');
            return;
        }

        if (newPassword.length < 6) {
            alert('Password baru minimal harus 6 karakter.');
            return;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/portal/users/password`, {
                method: 'PUT',
                headers: { ...authHeader, 'Content-Type': 'application/json' },
                body: JSON.stringify({ oldPassword, newPassword })
            });

            const result = await response.json();
            if (!response.ok) {
                throw new Error(result.error || 'Gagal mengganti password.');
            }

            alert(result.message);
            closeChangePasswordModal();

        } catch (error) {
            console.error('Error changing password:', error);
            alert(`Terjadi kesalahan: ${error.message}`);
        }
    });


    // --- WebSocket Logic for Real-time Updates ---
    function setupWebSocket() {
        const token = localStorage.getItem('corporateAuthToken');
        if (!token) return;

        // Tentukan protokol ws:// atau wss:// secara dinamis
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        // Menggunakan host dari API_BASE_URL untuk konsistensi, jika backend di domain berbeda
        const wsHost = API_BASE_URL.replace(/^http/, 'ws').replace('/api', '');
        const wsUrl = `${wsHost}?token=${token}`;

        const ws = new WebSocket(wsUrl);

        ws.onopen = () => {
            console.log('Koneksi WebSocket berhasil dibuat.');
        };

        ws.onmessage = (event) => {
            try {
                const message = JSON.parse(event.data);
                if (message.type === 'credit_updated') {
                    console.log('Notifikasi pembaruan kredit diterima. Memuat ulang data kredit...');
                    fetchCompanyData(); // Panggil fungsi yang sudah ada untuk refresh UI
                }
            } catch (e) {
                console.error('Gagal mem-parsing pesan WebSocket:', e);
            }
        };

        ws.onclose = () => {
            console.log('Koneksi WebSocket ditutup. Mencoba menyambung kembali dalam 5 detik...');
            setTimeout(setupWebSocket, 5000); // Logika koneksi ulang sederhana
        };

        ws.onerror = (error) => {
            console.error('Terjadi error pada WebSocket:', error);
            ws.close(); // Ini akan memicu event onclose dan logika koneksi ulang
        };
    }

    setupWebSocket();
});