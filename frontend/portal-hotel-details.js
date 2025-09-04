document.addEventListener('DOMContentLoaded', () => {
    const API_BASE_URL = 'https://corporate-booking.onrender.com/api';

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
    if (!decodedToken || !decodedToken.userId) { // Tambahkan validasi untuk userId
        localStorage.removeItem('corporateAuthToken');
        window.location.href = 'login.html';
        return;
    }
    const companyId = decodedToken.companyId;
    const companyName = decodedToken.companyName;
    const userId = decodedToken.userId; // Ekstrak userId dari token
    let companyCredit = { available: 0 }; // State untuk menyimpan info kredit

    // --- Get hotelId from URL ---
    const params = new URLSearchParams(window.location.search);
    const hotelId = params.get('id'); // FIX: Parameter name should be 'id' to match the link from portal.js
    if (!hotelId) {
        document.querySelector('main').innerHTML = '<div class="container"><p>ID Hotel tidak ditemukan. Silakan kembali ke portal dan pilih hotel.</p></div>';
        return;
    }

    // --- Element Selectors ---
    const companyNameDisplay = document.getElementById('company-name-display');
    const hotelHeroSection = document.getElementById('hotel-hero-section');
    const hotelHeroTitle = document.getElementById('hotel-hero-title');
    const hotelInfoContainer = document.getElementById('hotel-info-container');
    const hotelDescriptionContainer = document.getElementById('hotel-description-container');
    const reviewsList = document.getElementById('reviews-list');
    const roomGrid = document.getElementById('room-grid');

    // Dropdown and Modal Elements
    const changePasswordBtn = document.getElementById('change-password-btn');
    const changePasswordModal = document.getElementById('change-password-modal');
    const changePasswordModalOverlay = document.getElementById('change-password-modal-overlay');
    const changePasswordModalCloseBtn = document.getElementById('change-password-modal-close-btn');
    const changePasswordForm = document.getElementById('change-password-form');
    const logoutBtn = document.getElementById('logout-btn');
    // Booking Modal Elements
    const bookingModal = document.getElementById('booking-modal');
    const bookingModalOverlay = document.getElementById('booking-modal-overlay');
    const bookingModalCloseBtn = document.getElementById('booking-modal-close-btn');
    const bookingForm = document.getElementById('booking-form');
    const checkInInput = document.getElementById('check-in');
    const checkOutInput = document.getElementById('check-out');
    const confirmBookingBtn = document.getElementById('confirm-booking-btn');
    const bookingErrorMessage = document.getElementById('booking-error-message');

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

    const generateStars = (rating) => {
        const totalStars = 5;
        let starHTML = '';
        const roundedRating = Math.round(rating);
        for (let i = 0; i < totalStars; i++) {
            starHTML += i < roundedRating ? '★' : '☆';
        }
        return `<span style="color: #FBBF24;">${starHTML}</span>`;
    };

    // --- Fungsi Baru untuk mengambil data kredit ---
    const fetchCompanyCredit = async () => {
        try {
            // FIX: Menggunakan endpoint /portal yang benar untuk mengambil data perusahaan
            const response = await fetch(`${API_BASE_URL}/portal/companies/${companyId}`, { headers: authHeader });
            if (!response.ok) return; // Jangan blokir jika gagal, tapi kredit tidak akan divalidasi
            const company = await response.json();
            const creditLimit = parseFloat(company.credit_limit);
            const creditUsed = parseFloat(company.credit_used);
            companyCredit.available = creditLimit - creditUsed;
        } catch (error) {
            console.error('Gagal memuat data kredit perusahaan:', error);
            // Biarkan available credit 0, validasi akan gagal jika harga > 0
        }
    };

    // --- Data Fetching and Rendering ---
    const fetchDetails = async () => {
        try {
            // Fetch hotel info, rooms with special price, and reviews
            const [hotelRes, roomsRes, reviewsRes, _creditRes] = await Promise.all([
                fetch(`${API_BASE_URL}/hotels/${hotelId}`), // Endpoint publik, tidak perlu diubah
                fetch(`${API_BASE_URL}/portal/hotels/${hotelId}/rooms`, { headers: authHeader }), // FIX: Menggunakan endpoint /portal
                fetch(`${API_BASE_URL}/hotels/${hotelId}/reviews`),
                fetchCompanyCredit() // Panggil fungsi untuk memuat kredit
            ]);

            if (!hotelRes.ok) throw new Error(`Gagal memuat detail hotel.`);
            if (!roomsRes.ok) {
                 const err = await roomsRes.json();
                 throw new Error(err.error || 'Gagal memuat data kamar.');
            }
            if (!reviewsRes.ok) console.error('Gagal memuat ulasan.'); // Don't throw, just log error

            const hotel = await hotelRes.json();
            const rooms = await roomsRes.json();
            const reviews = reviewsRes.ok ? await reviewsRes.json() : [];

            renderHero(hotel);
            renderHotelInfo(hotel);
            renderDescription(hotel);
            renderReviews(reviews);
            renderRooms(rooms);

        } catch (error) {
            console.error('Error fetching details:', error);
            hotelInfoContainer.innerHTML = `<h1>Terjadi Kesalahan</h1>`;
            roomGrid.innerHTML = `<p>${error.message}</p>`;
        }
    };

    const renderHero = (hotel) => {
        if (hotel.image_url) {
            hotelHeroSection.style.backgroundImage = `linear-gradient(rgba(26, 32, 44, 0.7), rgba(26, 32, 44, 0.7)), url('${hotel.image_url}')`;
        }
        hotelHeroTitle.textContent = hotel.name;
    };

    const renderHotelInfo = (hotel) => {
        hotelInfoContainer.innerHTML = `
            <div class="hotel-rating-details">
                ${generateStars(hotel.average_rating)}
                <strong>${parseFloat(hotel.average_rating).toFixed(1)}</strong>
                <span>(${hotel.review_count} ulasan)</span>
            </div>
        `;
        document.title = `${hotel.name} - Portal Perusahaan`;
    };

    const renderDescription = (hotel) => {
        let amenitiesHTML = '';
        if (hotel.amenities && hotel.amenities.length > 0) {
            amenitiesHTML = `
                <h4>Fasilitas Unggulan</h4>
                <div class="facility-grid">
                    ${hotel.amenities.map(amenity => `<span class="facility-item"><i class="fas fa-check-circle"></i> ${amenity}</span>`).join('')}
                </div>
            `;
        }
        hotelDescriptionContainer.innerHTML = `
            <h2>Tentang Hotel</h2>
            <p>${hotel.description || 'Tidak ada deskripsi untuk hotel ini.'}</p>
            ${amenitiesHTML}
        `;
    };

    const renderReviews = (reviews) => {
        if (!reviews || reviews.length === 0) {
            reviewsList.innerHTML = '<div class="review-card"><p>Belum ada ulasan untuk hotel ini.</p></div>';
            return;
        }
        reviewsList.innerHTML = reviews.map(review => `
            <div class="review-card">
                <div class="review-header">
                    <span class="review-author">${review.company_name}</span>
                    <span class="review-date">${new Date(review.created_at).toLocaleDateString('id-ID')}</span>
                </div>
                <div class="review-rating">${generateStars(review.rating)}</div>
                <p class="review-comment">${review.comment || '<i>Tidak ada komentar.</i>'}</p>
            </div>
        `).join('');
    };

    // Kamus untuk memetakan nama fasilitas ke kelas ikon Font Awesome
    const facilityIconMap = {
        'air conditioning': 'fa-snowflake',
        'ac': 'fa-snowflake',
        'bath towel': 'fa-bath',
        'towel': 'fa-bath',
        'body soap': 'fa-soap',
        'soap': 'fa-soap',
        'cable tv': 'fa-tv',
        'tv': 'fa-tv',
        'coffee maker': 'fa-mug-hot',
        'complimentary bottled water': 'fa-bottle-water',
        'water': 'fa-bottle-water',
        'hair dryer': 'fa-wind',
        'hot & cold shower': 'fa-shower',
        'shower': 'fa-shower',
        'idd telephone': 'fa-phone',
        'telephone': 'fa-phone',
        'lcd flat panel tv': 'fa-tv',
        'non-smoking': 'fa-ban-smoking',
        'safe deposit box': 'fa-lock',
        'shampoo': 'fa-pump-soap',
        'slippers': 'fa-shoe-prints',
        'smooking': 'fa-smoking', // Handle typo
        'smoking': 'fa-smoking',
        'toothbrush': 'fa-tooth',
        'wifi': 'fa-wifi',
        'default': 'fa-check-circle' // Ikon default jika tidak ditemukan
    };

    const renderFacilities = (facilities) => {
        if (!facilities || !Array.isArray(facilities) || facilities.length === 0) {
            return '';
        }
        const facilitiesHTML = facilities.map(facility => {
            const facilityLower = facility.toLowerCase().trim();
            const iconClass = facilityIconMap[facilityLower] || facilityIconMap['default'];
            return `<span class="facility-item"><i class="fas ${iconClass}"></i> ${facility}</span>`;
        }).join('');
        // Menggunakan style dari style.css dan portal.css
        return `<div class="room-facilities"><h4>Fasilitas Kamar</h4><div class="facility-grid">${facilitiesHTML}</div></div>`;
    };

    // Fungsi baru untuk merender opsi paket, disamakan dengan alur publik
    const renderPackageOptions = (room) => {
        if (!room.packages || room.packages.length === 0) {
            return '<p>Opsi harga tidak tersedia.</p>';
        }

        return room.packages.map(pkg => `
            <div class="package-option-item">
                <div class="package-details">
                    <h5>${pkg.option_name}</h5>
                    ${pkg.option_description ? `<p class="package-description">${pkg.option_description}</p>` : ''}
                    <strong>${formatCurrency(pkg.price)}</strong> / malam
                </div>
                <button class="btn btn-secondary btn-sm btn-select-package" data-room-id="${room.id}" data-room-name="${room.name}" data-option-name="${pkg.option_name}" data-price="${pkg.price}">Pilih & Pesan</button>
            </div>
        `).join('');
    };

    const renderRooms = (rooms) => {
        if (!rooms || rooms.length === 0) {
            roomGrid.innerHTML = '<p>Tidak ada kamar yang tersedia untuk hotel ini.</p>';
            return;
        }

        const groupedRooms = rooms.reduce((acc, room) => {
            if (!acc[room.id]) {
                acc[room.id] = {
                    ...room, // Salin semua properti dasar dari kamar
                    packages: []
                };
            }
            acc[room.id].packages.push({
                option_name: room.option_name,
                option_description: room.option_description,
                price: parseFloat(room.price)
            });
            return acc;
        }, {});

        roomGrid.innerHTML = ''; // Hapus pesan "Memuat..."
        Object.values(groupedRooms).forEach(room => {
            const card = document.createElement('div');
            card.className = 'room-card'; // Memakai ulang class dari portal.css

            // Hitung harga minimum untuk tampilan "Mulai dari"
            const minPrice = Math.min(...room.packages.map(p => p.price));

            card.innerHTML = `
                <img src="${room.image_url || 'https://via.placeholder.com/400x250.png?text=No+Image'}" alt="${room.name}" class="room-card-img">
                <div class="room-card-content">
                    <h3>${room.name}</h3>
                    ${renderFacilities(room.facilities)}
                    <p class="description">${room.description || 'Tidak ada deskripsi untuk kamar ini.'}</p>
                    <div class="room-card-footer">
                        <div class="room-price">
                            <span>Harga Mulai</span>
                            <strong>${formatCurrency(minPrice)}</strong>
                        </div>
                        <button class="btn btn-primary btn-toggle-packages" data-room-id="${room.id}">Lihat Paket Harga</button>
                    </div>
                </div>
                <div class="room-package-options" id="packages-for-room-${room.id}">
                    ${renderPackageOptions(room)}
                </div>
            `;
            roomGrid.appendChild(card);
        });
    };

    // --- Booking Logic ---
    const openBookingModal = (roomId, fullRoomName, roomPrice) => {
        document.getElementById('booking-modal-room-name').textContent = fullRoomName;
        document.getElementById('booking-room-id').value = roomId;
        document.getElementById('booking-room-price').value = roomPrice;

        // Set min date for check-in to today
        const today = new Date().toISOString().split('T')[0];
        checkInInput.min = today;

        // Panggil untuk menginisialisasi ringkasan jika tanggal sudah terisi
        updatePriceSummary();

        checkRoomAvailability(); // Panggil pengecekan ketersediaan saat modal dibuka
        bookingModal.classList.add('active');
        bookingModalOverlay.classList.add('active');
    };

    const closeBookingModal = () => {
        bookingModal.classList.remove('active');
        bookingModalOverlay.classList.remove('active');
        bookingForm.reset();
        updatePriceSummary(); // Reset summary
        const availabilityStatusEl = document.getElementById('booking-availability-status');
        availabilityStatusEl.style.display = 'none'; // Sembunyikan status saat modal ditutup
    };

    const updatePriceSummary = () => {
        const checkIn = new Date(checkInInput.value);
        const checkOut = new Date(checkOutInput.value);
        const pricePerNight = parseFloat(document.getElementById('booking-room-price').value);

        if (checkInInput.value && checkOutInput.value && checkOut > checkIn) {
            const timeDiff = checkOut.getTime() - checkIn.getTime();
            const nights = Math.ceil(timeDiff / (1000 * 3600 * 24));
            const totalPrice = nights * pricePerNight;

            document.getElementById('total-nights').textContent = nights;
            document.getElementById('total-price').textContent = formatCurrency(totalPrice);
        } else {
            document.getElementById('total-nights').textContent = 0;
            document.getElementById('total-price').textContent = formatCurrency(0);
        }
    };

    const checkRoomAvailability = async () => {
        const availabilityStatusEl = document.getElementById('booking-availability-status');
        // Pastikan elemen ada sebelum melanjutkan untuk mencegah error
        if (!availabilityStatusEl) {
            console.warn('Elemen #booking-availability-status tidak ditemukan di HTML.');
            return;
        }

        const roomId = document.getElementById('booking-room-id').value;
        const checkIn = checkInInput.value;
        const checkOut = checkOutInput.value;

        // Sembunyikan status jika input tidak lengkap atau tidak valid
        if (!roomId || !checkIn || !checkOut || new Date(checkOut) <= new Date(checkIn)) {
            availabilityStatusEl.style.display = 'none';
            confirmBookingBtn.disabled = true; // Nonaktifkan tombol jika tanggal tidak valid
            return;
        }

        availabilityStatusEl.style.display = 'block';
        availabilityStatusEl.className = 'booking-availability-status status-checking';
        availabilityStatusEl.textContent = 'Mengecek ketersediaan...';
        confirmBookingBtn.disabled = true;

        try {
            const response = await fetch(`${API_BASE_URL}/portal/rooms/${roomId}/availability?checkIn=${checkIn}&checkOut=${checkOut}`, { headers: authHeader });
            if (!response.ok) throw new Error('Gagal memeriksa ketersediaan.');

            const data = await response.json();
            // Pastikan data.available adalah angka yang valid sebelum dibandingkan
            const availableRooms = parseInt(data.available, 10);
            if (!isNaN(availableRooms) && availableRooms > 0) {
                availabilityStatusEl.className = 'booking-availability-status status-available';
                availabilityStatusEl.textContent = `Tersedia! (${data.available} kamar tersisa)`;
                confirmBookingBtn.disabled = false; // Aktifkan tombol
            } else {
                availabilityStatusEl.className = 'booking-availability-status status-unavailable';
                availabilityStatusEl.textContent = 'Kamar penuh untuk tanggal yang dipilih.';
                confirmBookingBtn.disabled = true; // Tetap nonaktifkan tombol
            }
        } catch (error) {
            console.error('Availability check error:', error);
            availabilityStatusEl.className = 'booking-availability-status status-unavailable';
            availabilityStatusEl.textContent = 'Gagal memeriksa ketersediaan.';
            confirmBookingBtn.disabled = true;
        }
    };

    // Event Listeners for Booking
    // Disesuaikan agar sama dengan alur publik
    roomGrid.addEventListener('click', (e) => {
        const target = e.target;

        // Tombol untuk menampilkan/menyembunyikan paket harga
        if (target.classList.contains('btn-toggle-packages')) {
            const roomId = target.dataset.roomId;
            const packageContainer = document.getElementById(`packages-for-room-${roomId}`);
            packageContainer.classList.toggle('visible');
        }

        // Tombol untuk memilih paket dan membuka modal booking
        if (target.classList.contains('btn-select-package')) {
            const { roomId, roomName, optionName, price } = target.dataset;
            openBookingModal(roomId, `${roomName} (${optionName})`, price);
        }
    });

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

    if (bookingModal) {
        bookingModalCloseBtn.addEventListener('click', closeBookingModal);
        bookingModalOverlay.addEventListener('click', closeBookingModal);

        checkInInput.addEventListener('input', () => {
            // Setel tanggal minimum untuk check-out
            checkOutInput.min = checkInInput.value;
            // Jika tanggal check-out saat ini tidak valid, kosongkan
            if (checkOutInput.value && checkOutInput.value < checkInInput.value) {
                checkOutInput.value = '';
            }
            updatePriceSummary();
            checkRoomAvailability();
        });

        checkOutInput.addEventListener('change', () => { updatePriceSummary(); checkRoomAvailability(); });

        bookingForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            // --- UI State: Loading ---
            const btnText = confirmBookingBtn.querySelector('.btn-text');
            const btnSpinner = confirmBookingBtn.querySelector('.btn-spinner');
            confirmBookingBtn.disabled = true;
            btnText.style.display = 'none';
            btnSpinner.style.display = 'inline-block';
            bookingErrorMessage.style.display = 'none';

            try {
                // --- 1. Data Collection & Validation ---
                const totalPrice = parseFloat(document.getElementById('total-price').textContent.replace(/[^0-9]/g, ''));
                const guestName = document.getElementById('guest-name').value;
                const guestEmail = document.getElementById('guest-email').value;
                const checkIn = checkInInput.value;
                const checkOut = checkOutInput.value;
                const guestIdImage = document.getElementById('guest-id-image').files[0];
                const guaranteeLetter = document.getElementById('guarantee-letter').files[0];

                if (!guestName || !guestEmail || !checkIn || !checkOut) {
                    throw new Error('Nama tamu, email, tanggal check-in, dan check-out wajib diisi.');
                }
                if (totalPrice <= 0) {
                    throw new Error('Tanggal check-out harus setelah tanggal check-in.');
                }
                // Validasi file di frontend sebelum mengirim
                if (!guestIdImage || !guaranteeLetter) {
                    throw new Error('Foto KTP/Paspor dan Surat Jaminan wajib diunggah.');
                }
                // Validasi kredit
                if (totalPrice > companyCredit.available) {
                    throw new Error(`Pemesanan gagal. Total harga (${formatCurrency(totalPrice)}) melebihi kredit tersedia (${formatCurrency(companyCredit.available)}).`);
                }

               // Persiapkan FormData untuk mengirim file
                const formData = new FormData();
                formData.append('user_id', userId);
                formData.append('company_id', companyId);
                formData.append('hotel_id', hotelId);
                formData.append('room_type_id', document.getElementById('booking-room-id').value);
                formData.append('room_name', document.getElementById('booking-modal-room-name').textContent);
                formData.append('guest_name', guestName);
                formData.append('guest_email', guestEmail);
                formData.append('check_in_date', checkIn);
                formData.append('check_out_date', checkOut);
                formData.append('total_price', totalPrice);

                // Append File Data
                if (guestIdImage) {
                    formData.append('guest_id_image', guestIdImage);
                };

                if (guaranteeLetter) {
                    formData.append('guarantee_letter', guaranteeLetter);
                };

                const response = await fetch(`${API_BASE_URL}/portal/bookings`, { // FIX: Menggunakan endpoint /portal
                    method: 'POST',
                    headers:  { 'Authorization': `Bearer ${token}` },
                    body: formData // FIX: formData
                });
                
                 const result = await response.json();
                if (!response.ok) {
                    throw new Error(result.error || 'Gagal melakukan pemesanan.');
                }

                // --- 4. Success ---
            alert(result.message || 'Pemesanan Anda berhasil dan sedang menunggu persetujuan dari perusahaan Anda. Anda akan diarahkan ke halaman riwayat.');
                window.location.href = 'portal-history.html'; // Redirect ke riwayat

            } catch (error) {
                // --- 5. Error Handling ---
                 bookingErrorMessage.textContent = error.message;
                bookingErrorMessage.style.display = 'block';
                console.error('Corporate booking error:', error);
            } finally {
                // --- UI State: Reset ---
                confirmBookingBtn.disabled = false;
                btnText.style.display = 'inline-block';
                btnSpinner.style.display = 'none';
            }
        });
    }

    // --- Initial Load ---
    fetchDetails();
});