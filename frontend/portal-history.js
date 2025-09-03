document.addEventListener('DOMContentLoaded', () => {
    const API_BASE_URL = 'http://localhost:3000/api';

    // --- Authentication Check ---
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
    const userRole = decodedToken.role; // 'approver' or 'employee'
    let companyLogoUrl = ''; // Variabel untuk menyimpan URL logo
    let bookings = []; // Variabel untuk menyimpan data booking

    // --- Element Selectors ---
    const companyNameDisplay = document.getElementById('company-name-display');
    const historyTableBody = document.getElementById('history-table-body');
    // Elemen untuk pencarian
    const historySearchInput = document.getElementById('history-search-input');
    const historyStatusFilter = document.getElementById('history-status-filter');
    const historyFilterReset = document.getElementById('history-filter-reset');

    // Dropdown and Modal Elements
    const changePasswordBtn = document.getElementById('change-password-btn');
    const changePasswordModal = document.getElementById('change-password-modal');
    const changePasswordModalOverlay = document.getElementById('change-password-modal-overlay');
    const changePasswordModalCloseBtn = document.getElementById('change-password-modal-close-btn');
    const changePasswordForm = document.getElementById('change-password-form');
    const logoutBtn = document.getElementById('logout-btn');
    // Review Modal Elements
    const reviewModal = document.getElementById('review-modal');
    const reviewModalOverlay = document.getElementById('review-modal-overlay');
    const reviewModalCloseBtn = document.getElementById('review-modal-close-btn');
    const reviewForm = document.getElementById('review-form');
    const reviewStarRating = document.getElementById('review-star-rating');
    const reviewRatingValue = document.getElementById('review-rating-value');


    // --- Setup Header & Logout ---
    if (companyNameDisplay) companyNameDisplay.textContent = companyName;
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
    if (changePasswordBtn) {
        changePasswordBtn.addEventListener('click', (e) => {
            e.preventDefault();
            changePasswordModal.classList.add('active');
            changePasswordModalOverlay.classList.add('active');
        });
        changePasswordModalCloseBtn.addEventListener('click', closeChangePasswordModal);
        changePasswordModalOverlay.addEventListener('click', closeChangePasswordModal);
    }

    // --- Helper Functions ---
    const formatCurrency = (number) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency', currency: 'IDR', minimumFractionDigits: 0,
        }).format(number);
    };

    const renderStatusSpan = (status) => {
        let statusText = status ? status.charAt(0).toUpperCase() + status.slice(1).replace(/_/g, ' ') : 'Unknown';
        let statusClass = 'status-pending'; // default
        if (status === 'confirmed') {
            statusClass = 'status-confirmed';
        } else if (status === 'canceled') {
            statusClass = 'status-canceled';
        } else if (status === 'pending_approval') {
            statusText = 'Menunggu Persetujuan';
            statusClass = 'status-verifying'; // Gunakan style yang sama dengan 'verifying'
        } else if (status === 'rejected_by_company') {
            statusText = 'Ditolak Perusahaan';
            statusClass = 'status-canceled';
        }
        return `<span class="${statusClass}">${statusText}</span>`;
    };

    const fetchCompanyLogo = async () => {
        try {
            // Gunakan endpoint publik untuk mendapatkan logo, bukan endpoint admin
            // Endpoint ini tidak memerlukan token otorisasi
            const response = await fetch(`${API_BASE_URL}/settings/company-logo`);
            if (response.ok) {
                const data = await response.json();
                companyLogoUrl = data.url;
            }
        } catch (error) {
            console.error('Gagal memuat logo perusahaan:', error);
        }
    };

    // --- Data Fetching and Rendering ---
    // Fungsi ini HANYA bertugas untuk menampilkan data yang sudah ada di variabel 'bookings'
    const renderHistory = () => {
        const searchTerm = historySearchInput ? historySearchInput.value.toLowerCase().trim() : '';
        const statusFilter = historyStatusFilter ? historyStatusFilter.value : '';
    
        const filteredBookings = bookings.filter(booking => {
            const matchesStatus = !statusFilter || booking.status === statusFilter;

            if (!searchTerm) {
                return matchesStatus;
            }
            const bookingId = String(booking.id);
            const hotelName = booking.hotel_name.toLowerCase();
            const guestName = booking.guest_name.toLowerCase();
    
            const matchesSearch = (
                bookingId.includes(searchTerm) ||
                hotelName.includes(searchTerm) ||
                guestName.includes(searchTerm)
            );

            return matchesStatus && matchesSearch;
        });
    
        historyTableBody.innerHTML = ''; // Hapus konten tabel yang ada
    
        if (filteredBookings.length === 0) {
            const message = (searchTerm || statusFilter) ? 'Tidak ada hasil yang cocok dengan pencarian Anda.' : 'Belum ada riwayat booking.';
            historyTableBody.innerHTML = `<tr><td colspan="10" style="text-align: center;">${message}</td></tr>`;
        } else {
            filteredBookings.forEach(booking => {
                const row = historyTableBody.insertRow();
                // Tambahkan atribut data untuk identifikasi mudah oleh WebSocket
                row.dataset.bookingId = booking.id;
                row.dataset.hotelId = booking.hotel_id;
                row.dataset.hotelName = booking.hotel_name;
                row.innerHTML = `
                    <td>${booking.id}</td>
                    <td>${booking.hotel_name}</td>
                    <td>${booking.room_name}</td>
                    <td>${booking.guest_name}</td>
                    <td>${new Date(booking.check_in_date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                    <td>${new Date(booking.check_out_date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                    <td>${formatCurrency(booking.total_price)}</td>
                    <td class="booking-status-cell">${renderStatusSpan(booking.status)}</td>
                    <td>${new Date(booking.booking_date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                    <td class="booking-action-cell">${generateActionCell(booking)}</td>
                `;
            });
        }
    };

    // Fungsi ini HANYA bertugas untuk mengambil data dari server
    const fetchHistory = async () => {
        historyTableBody.innerHTML = '<tr><td colspan="10" style="text-align: center;">Memuat riwayat booking...</td></tr>';
        try {
            const response = await fetch(`${API_BASE_URL}/portal/bookings`, { headers: authHeader });
            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.error || 'Gagal memuat riwayat booking.');
            }
            bookings = await response.json(); // Simpan data ke variabel global
            renderHistory(); // Panggil fungsi render untuk menampilkan data pertama kali
        } catch (error) {
            console.error('Error fetching booking history:', error);
            historyTableBody.innerHTML = `<tr><td colspan="10" style="text-align: center; color: red;">${error.message}</td></tr>`;
        }
    };

    const generateActionCell = (booking) => {
        let actionsHtml = '';

        // Aksi untuk approver
        if (userRole === 'approver' && booking.status === 'pending_approval') {
            actionsHtml += `
                <button class="btn btn-success btn-sm btn-approve" data-booking-id="${booking.id}">Setujui</button>
                <button class="btn btn-danger btn-sm btn-reject" data-booking-id="${booking.id}">Tolak</button>
            `;
            return actionsHtml;
        }

        // Aksi untuk booking yang sudah dikonfirmasi
        if (booking.status === 'confirmed') {
            // Menggunakan SVG untuk ikon Print
            const printIconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-printer-fill" viewBox="0 0 16 16" style="vertical-align: middle;"><path d="M5 1a2 2 0 0 0-2 2v2H2a2 2 0 0 0-2 2v3a2 2 0 0 0 2 2h1v1a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2v-1h1a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-1V3a2 2 0 0 0-2-2H5zm4 11a1 1 0 1 1-2 0 1 1 0 0 1 2 0zM1.5 7a.5.5 0 0 1 .5-.5h12a.5.5 0 0 1 .5.5v3a.5.5 0 0 1-.5.5h-12a.5.5 0 0 1-.5-.5v-3z"/></svg>`;
            actionsHtml += `<button class="btn btn-info btn-sm btn-print-booking" data-booking-id="${booking.id}" title="Cetak Konfirmasi">${printIconSvg}</button>`;
            
            if (!booking.review_id) {
                // Menggunakan SVG untuk ikon Ulasan (Bintang)
                const reviewIconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-star-fill" viewBox="0 0 16 16" style="vertical-align: middle;"><path d="M3.612 15.443c-.386.198-.824-.149-.746-.592l.83-4.73L.173 6.765c-.329-.314-.158-.888.283-.95l4.898-.696L7.538.792c.197-.39.73-.39.927 0l2.184 4.327 4.898.696c.441.062.612.636.282.95l-3.522 3.356.83 4.73c.078.443-.36.79-.746.592L8 13.187l-4.389 2.256z"/></svg>`;
                actionsHtml += `<button class="btn btn-secondary btn-sm btn-review" data-booking-id="${booking.id}" data-hotel-id="${booking.hotel_id}" data-hotel-name="${booking.hotel_name}" style="margin-left: 5px;" title="Beri Ulasan">${reviewIconSvg}</button>`;
            } else {
                actionsHtml += `<span class="reviewed-text" style="margin-left: 8px; vertical-align: middle;">Sudah Diulas</span>`;
            }
            return actionsHtml;
        }

        if (booking.status === 'rejected_by_company') {
            return `<span class="status-canceled">Ditolak</span>`;
        }
        return '<span>-</span>';
    };

    // --- Review Modal Logic ---
    const openReviewModal = (bookingId, hotelId, hotelName) => {
        document.getElementById('review-booking-id').value = bookingId;
        document.getElementById('review-hotel-id').value = hotelId;
        document.getElementById('review-modal-hotel-name').textContent = hotelName;
        reviewModal.classList.add('active');
        reviewModalOverlay.classList.add('active');
    };

    const closeReviewModal = () => {
        reviewModal.classList.remove('active');
        reviewModalOverlay.classList.remove('active');
        reviewForm.reset();
        // Reset stars
        Array.from(reviewStarRating.children).forEach(star => star.classList.remove('selected', 'hover'));
    };

    // --- Event Listeners ---
    historyTableBody.addEventListener('click', (e) => {
        // Menggunakan .closest() untuk memastikan event tertangkap meskipun ikon SVG yang diklik
        const reviewBtn = e.target.closest('.btn-review');
        if (reviewBtn) {
            const { bookingId, hotelId, hotelName } = reviewBtn.dataset;
            openReviewModal(bookingId, hotelId, hotelName);
        }

        // Event listener untuk tombol Cetak
        const printBtn = e.target.closest('.btn-print-booking');
        if (printBtn) {
            const button = printBtn;
            const bookingId = button.dataset.bookingId;
            const booking = bookings.find(b => b.id == bookingId);
            if (booking) {
                generateBookingConfirmationPDF(booking);
            } else {
                alert('Data booking tidak ditemukan.');
            }
        }

        // Event listener untuk tombol Setujui dan Tolak
        const handleApprovalAction = async (action) => {
            const button = e.target;
            const bookingId = button.dataset.bookingId;
            const confirmationMessage = action === 'approve'
                ? `Anda yakin ingin MENYETUJUI booking #${bookingId}?`
                : `Anda yakin ingin MENOLAK booking #${bookingId}?`;

            if (confirm(confirmationMessage)) {
                try {
                    button.disabled = true;
                    button.textContent = 'Memproses...';

                    const response = await fetch(`${API_BASE_URL}/portal/bookings/${bookingId}/status`, {
                        method: 'PUT',
                        headers: { ...authHeader, 'Content-Type': 'application/json' },
                        body: JSON.stringify({ action }) // 'approve' atau 'reject'
                    });

                    const result = await response.json();
                    if (!response.ok) throw new Error(result.error || `Gagal ${action} booking.`);

                    alert(result.message);
                    fetchHistory(); // Muat ulang data untuk menampilkan status terbaru
                } catch (error) {
                    alert(`Terjadi kesalahan: ${error.message}`);
                    button.disabled = false; // Aktifkan kembali tombol jika gagal
                    button.textContent = action === 'approve' ? 'Setujui' : 'Tolak';
                }
            }
        };

        const approveBtn = e.target.closest('.btn-approve');
        const rejectBtn = e.target.closest('.btn-reject');

        if (approveBtn) {
            handleApprovalAction('approve');
        } else if (rejectBtn) {
            handleApprovalAction('reject');
        }
    });

    // Event listener untuk fitur pencarian
    if (historySearchInput && historyStatusFilter && historyFilterReset) {
        historySearchInput.addEventListener('input', renderHistory);
        historyStatusFilter.addEventListener('change', renderHistory);
        historyFilterReset.addEventListener('click', () => {
            historySearchInput.value = '';
            historyStatusFilter.value = '';
            renderHistory();
        });
    } else {
        console.warn('Elemen pencarian/filter tidak ditemukan.');
    }

    // Event listener untuk modal ulasan
    if (reviewModal) {
        reviewModalCloseBtn.addEventListener('click', closeReviewModal);
        reviewModalOverlay.addEventListener('click', closeReviewModal);

        // Star rating interaction
        reviewStarRating.addEventListener('mouseover', e => {
            if (e.target.tagName === 'SPAN') {
                const ratingValue = e.target.dataset.value;
                Array.from(reviewStarRating.children).forEach(star => {
                    star.classList.toggle('hover', star.dataset.value <= ratingValue);
                });
            }
        });

        reviewStarRating.addEventListener('mouseout', () => {
            Array.from(reviewStarRating.children).forEach(star => star.classList.remove('hover'));
        });

        reviewStarRating.addEventListener('click', e => {
            if (e.target.tagName === 'SPAN') {
                const ratingValue = e.target.dataset.value;
                reviewRatingValue.value = ratingValue;
                Array.from(reviewStarRating.children).forEach(star => {
                    star.classList.toggle('selected', star.dataset.value <= ratingValue);
                });
            }
        });

        // Review form submission
        reviewForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const submitButton = reviewForm.querySelector('button[type="submit"]');
            const reviewData = {
                booking_id: document.getElementById('review-booking-id').value,
                hotel_id: document.getElementById('review-hotel-id').value,
                rating: reviewRatingValue.value,
                comment: document.getElementById('review-comment').value,
            };

            if (!reviewData.rating) {
                alert('Silakan pilih rating bintang terlebih dahulu.');
                return;
            }

            submitButton.disabled = true;
            submitButton.textContent = 'Mengirim...';

            try {
                const response = await fetch(`${API_BASE_URL}/portal/reviews`, {
                    method: 'POST',
                    headers: { ...authHeader, 'Content-Type': 'application/json' },
                    body: JSON.stringify(reviewData)
                });

                const result = await response.json();
                if (!response.ok) {
                    throw new Error(result.error || 'Gagal mengirim ulasan.');
                }

                alert('Terima kasih! Ulasan Anda telah berhasil dikirim.');
                closeReviewModal();
                fetchHistory(); // Refresh the history list
            } catch (error) {
                alert(`Terjadi kesalahan: ${error.message}`);
                console.error('Error submitting review:', error);
            } finally {
                submitButton.disabled = false;
                submitButton.textContent = 'Kirim Ulasan';
            }
        });
    }
    // --- Change Password Form Logic ---
    if (changePasswordForm) {
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
    }

    // --- WebSocket Logic for Real-time Updates ---
    function setupWebSocket() {
        const token = localStorage.getItem('corporateAuthToken');
        if (!token) return;

        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsHost = API_BASE_URL.replace(/^http/, 'ws').replace('/api', '');
        const wsUrl = `${wsHost}?token=${token}`;

        const ws = new WebSocket(wsUrl);

        ws.onopen = () => {
            console.log('Koneksi WebSocket untuk riwayat booking berhasil dibuat.');
        };

        ws.onmessage = (event) => {
            try {
                const message = JSON.parse(event.data);
                // Tangani notifikasi pembaruan status booking
                if (message.type === 'booking_status_updated' && message.payload) {
                    const { bookingId, newStatus, reviewId } = message.payload;
                    const row = document.querySelector(`tr[data-booking-id='${bookingId}']`);

                    if (row) {
                        console.log(`Memperbarui status untuk booking #${bookingId} menjadi ${newStatus}`);
                        // Perbarui sel status
                        const statusCell = row.querySelector('.booking-status-cell');
                        if (statusCell) statusCell.innerHTML = renderStatusSpan(newStatus);

                        // Perbarui sel aksi (misalnya, untuk menampilkan tombol "Beri Ulasan")
                        const actionCell = row.querySelector('.booking-action-cell');
                        if (actionCell) {
                            const bookingDataForAction = { id: bookingId, status: newStatus, review_id: reviewId, hotel_id: row.dataset.hotelId, hotel_name: row.dataset.hotelName };
                            actionCell.innerHTML = generateActionCell(bookingDataForAction);
                        }
                    }
                }
            } catch (e) {
                console.error('Gagal mem-parsing pesan WebSocket:', e);
            }
        };

        ws.onclose = () => {
            console.log('Koneksi WebSocket ditutup. Mencoba menyambung kembali dalam 5 detik...');
            setTimeout(setupWebSocket, 5000);
        };

        ws.onerror = (error) => {
            console.error('Terjadi error pada WebSocket:', error);
            ws.close();
        };
    }

    const generateBookingConfirmationPDF = (booking) => {
        // Gunakan logo yang sudah dimuat sebelumnya, atau nama perusahaan sebagai fallback
        const logoHtml = companyLogoUrl ? `<img src="${companyLogoUrl}" alt="Logo Perusahaan" style="max-height: 60px; max-width: 200px;">` : `<h2>${companyName}</h2>`;
        const printContent = `
            <!DOCTYPE html>
            <html lang="id">
            <head>
                <meta charset="UTF-8">
                <title>Konfirmasi Booking - #${booking.id}</title>
                <style>
                    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.5; color: #333; }
                    .voucher-container { max-width: 800px; margin: 20px auto; padding: 30px; border: 1px solid #ddd; border-radius: 10px; box-shadow: 0 0 15px rgba(0,0,0,0.05); }
                    .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #f0f0f0; padding-bottom: 20px; margin-bottom: 20px; }
                    .header-info h1 { margin: 0; font-size: 24px; color: #2c3e50; }
                    .header-info p { margin: 0; font-size: 14px; color: #777; }
                    .booking-details table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                    .booking-details th, .booking-details td { padding: 12px 15px; border: 1px solid #eee; text-align: left; }
                    .booking-details th { background-color: #f9f9f9; font-weight: 600; width: 35%; }
                    .status-paid { text-align: center; margin: 30px 0; padding: 15px; background-color: #e8f5e9; color: #2e7d32; font-size: 18px; font-weight: bold; border-radius: 5px; }
                    .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #999; }
                    @media print {
                        body { -webkit-print-color-adjust: exact; }
                        .voucher-container { border: none; box-shadow: none; }
                    }
                </style>
            </head>
            <body>
                <div class="voucher-container">
                    <div class="header">
                        <div class="logo">${logoHtml}</div>
                        <div class="header-info" style="text-align: right;">
                            <h1>Voucher Booking</h1>
                            <p>ID Booking: <strong>#${booking.id}</strong></p>
                        </div>
                    </div>
                    
                    <div class="booking-details">
                        <table>
                            <tr><th>Nama Hotel</th><td>${booking.hotel_name}</td></tr>
                            <tr><th>Nama Tamu</th><td>${booking.guest_name}</td></tr>
                            <tr><th>Tanggal Check-in</th><td>${new Date(booking.check_in_date).toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</td></tr>
                            <tr><th>Tanggal Check-out</th><td>${new Date(booking.check_out_date).toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</td></tr>
                            <tr><th>Tipe Kamar</th><td>${booking.room_name}</td></tr>
                        </table>
                    </div>
                    <div class="status-paid">LUNAS (Pembayaran oleh Perusahaan)</div>
                    <div class="footer">
                        <p>Harap tunjukkan voucher ini saat check-in. Terima kasih telah melakukan pemesanan melalui portal kami.</p>
                        <p>Dicetak pada: ${new Date().toLocaleString('id-ID')}</p>
                    </div>
                </div>
            </body>
            </html>
        `;

        const printWindow = window.open('', '_blank');
        printWindow.document.write(printContent);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => {
            printWindow.print();
            printWindow.close();
        }, 500);
    };

    // --- Initial Load ---
    fetchHistory();
    fetchCompanyLogo(); // Panggil fungsi untuk memuat logo saat halaman dibuka
    setupWebSocket(); // Panggil fungsi untuk memulai koneksi WebSocket
});