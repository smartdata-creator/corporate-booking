document.addEventListener('DOMContentLoaded', () => {
    const API_BASE_URL = 'https://corporate-booking.onrender.com/api';

    const hotelInfoContainer = document.getElementById('hotel-info-container');
    const hotelHeroSection = document.getElementById('hotel-hero-section');
    const hotelHeroTitle = document.getElementById('hotel-hero-title');
    const hotelHeroSubtitle = document.getElementById('hotel-hero-subtitle');
    const roomGrid = document.getElementById('room-grid');
    const hotelDescriptionContainer = document.getElementById('hotel-description-container');

    // Booking Modal Elements
    const bookingModal = document.getElementById('booking-modal');
    const bookingModalOverlay = document.getElementById('booking-modal-overlay');
    const bookingModalCloseBtn = document.getElementById('booking-modal-close-btn');
    const bookingForm = document.getElementById('booking-form');
    const checkInInput = document.getElementById('check-in');
    const checkOutInput = document.getElementById('check-out');
    const confirmBookingBtn = document.getElementById('confirm-booking-btn');
    const bookingErrorMessage = document.getElementById('booking-error-message');

    // Ambil ID hotel dari parameter URL
    const params = new URLSearchParams(window.location.search);
    const hotelId = params.get('id');

    if (!hotelId) {
        document.querySelector('main').innerHTML = '<div class="container"><p>ID Hotel tidak ditemukan. Silakan kembali ke halaman utama dan pilih hotel.</p></div>';
        return;
    }

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

    const fetchHotelDetails = async () => {
        try {
            // Ambil data detail hotel dan data kamar secara bersamaan
            const [hotelRes, roomsRes, reviewsRes] = await Promise.all([
                fetch(`${API_BASE_URL}/hotels/${hotelId}`),
                fetch(`${API_BASE_URL}/hotels/${hotelId}/rooms`),
                fetch(`${API_BASE_URL}/hotels/${hotelId}/reviews`)
            ]);

            if (!hotelRes.ok) throw new Error(`Gagal memuat detail hotel (status: ${hotelRes.status}).`);
            if (!roomsRes.ok) throw new Error(`Gagal memuat data kamar (status: ${roomsRes.status}).`);
            if (!reviewsRes.ok) throw new Error(`Gagal memuat ulasan (status: ${reviewsRes.status}).`);

            const hotel = await hotelRes.json();
            const rooms = await roomsRes.json();
            const reviews = await reviewsRes.json();

            renderHotelInfo(hotel);
            renderRooms(rooms);
            renderReviews(reviews);

        } catch (error) {
            console.error('Error fetching hotel details:', error);
            hotelInfoContainer.innerHTML = `<h1>Terjadi Kesalahan</h1><p>${error.message}</p>`;
            roomGrid.innerHTML = '';
        }
    };

    const renderHotelInfo = (hotel) => {
        // Set judul halaman dan hero
        document.title = `${hotel.name} - MICE & TRAVEL Booking`;
        hotelHeroTitle.textContent = hotel.name;
        // Subtitle dikosongkan agar sama dengan tampilan portal
        hotelHeroSubtitle.textContent = ''; 
        if (hotel.image_url) {
            // Menggunakan gradient yang sama dengan portal untuk konsistensi
            hotelHeroSection.style.backgroundImage = `linear-gradient(rgba(26, 32, 44, 0.7), rgba(26, 32, 44, 0.7)), url('${hotel.image_url}')`;
        }

        // Render rating di bawah hero
        hotelInfoContainer.innerHTML = `
            <div class="hotel-rating-details">
                ${generateStars(hotel.average_rating)}
                <strong>${parseFloat(hotel.average_rating).toFixed(1)}</strong>
                <span>(${hotel.review_count} ulasan)</span>
            </div>
        `;

        // Render deskripsi dan fasilitas
        let descriptionHTML = '';
        if (hotel.description) {
            descriptionHTML = `<p>${hotel.description}</p>`;
        }

        let amenitiesHTML = '';
        if (hotel.amenities && hotel.amenities.length > 0) {
            amenitiesHTML = `
                <h4>Fasilitas Unggulan</h4>
                <div class="facility-grid">
                    ${hotel.amenities.map(amenity => `<span class="facility-item"><i class="fas fa-check-circle"></i> ${amenity}</span>`).join('')}
                </div>
            `;
        }

        const fullContent = `<h2>Tentang Hotel</h2>${descriptionHTML}${amenitiesHTML}`;
        if (fullContent) {
            hotelDescriptionContainer.innerHTML = fullContent;
        } else {
            // Sembunyikan seluruh section jika tidak ada deskripsi maupun fasilitas
            hotelDescriptionContainer.parentElement.style.display = 'none';
        }
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
        return `<div class="room-facilities"><h4>Fasilitas Kamar</h4><div class="facility-grid">${facilitiesHTML}</div></div>`;
    };

    const renderPackageOptions = (room) => {
        // Data sekarang ada di 'packages' setelah dikelompokkan
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
            roomGrid.innerHTML = '<p>Saat ini belum ada tipe kamar yang tersedia untuk hotel ini.</p>';
            return;
        }
        // 1. Kelompokkan paket harga berdasarkan ID kamar karena API mengembalikan data flat
        const groupedRooms = rooms.reduce((acc, room) => {
            // Jika kamar belum ada di accumulator, buat entri baru
            if (!acc[room.id]) {
                acc[room.id] = {
                    id: room.id,
                    name: room.name,
                    description: room.description,
                    image_url: room.image_url,
                    facilities: room.facilities,
                    packages: [] // Buat array untuk menampung paket harga
                };
            }
            // Tambahkan detail paket ke kamar yang sesuai
            acc[room.id].packages.push({
                option_name: room.option_name,
                option_description: room.option_description,
                price: parseFloat(room.price)
            });
            return acc;
        }, {});

        roomGrid.innerHTML = ''; // Hapus pesan "Memuat..."

        // 2. Render setiap kamar yang sudah dikelompokkan
        Object.values(groupedRooms).forEach(room => {
            // Cari harga terendah dari paket-paket yang ada
            const lowestPrice = Math.min(...room.packages.map(pkg => pkg.price));
            
            const card = document.createElement('div');
            card.className = 'room-card'; // Memakai ulang class dari portal.css
            card.innerHTML = `
                <img src="${room.image_url || 'https://via.placeholder.com/400x250.png?text=No+Image'}" alt="${room.name}" class="room-card-img">
                <div class="room-card-content">
                    <h3>${room.name}</h3>
                    ${renderFacilities(room.facilities)}
                    <p class="description">${room.description || 'Tidak ada deskripsi.'}</p>
                    <div class="room-card-footer">
                        <div class="room-price">
                            <span>Harga Mulai</span>
                            <strong>${formatCurrency(lowestPrice)}</strong>
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

    const renderReviews = (reviews) => {
        const reviewsList = document.getElementById('reviews-list');
        if (!reviewsList) return;

        if (reviews.length === 0) {
            reviewsList.innerHTML = '<p>Belum ada ulasan untuk hotel ini.</p>';
            return;
        }

        reviewsList.innerHTML = '';
        reviews.forEach(review => {
            const reviewCard = document.createElement('div');
            reviewCard.className = 'review-card';
            reviewCard.innerHTML = `
                <div class="review-header">
                    <strong class="review-author">${review.company_name}</strong>
                    <span class="review-date">${new Date(review.created_at).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                </div>
                <div class="review-rating">${generateStars(review.rating)}</div>
                <p class="review-comment">${review.comment || '<i>Tidak ada komentar.</i>'}</p>
            `;
            reviewsList.appendChild(reviewCard);
        });
    };

    // --- Booking Logic ---
    const openBookingModal = (roomId, fullRoomName, price) => {
        // Set the details in the modal based on the selected package
        document.getElementById('booking-modal-room-name').textContent = fullRoomName;
        document.getElementById('booking-room-id').value = roomId;
        document.getElementById('booking-room-price').value = price;

        // Set min date for check-in to today
        const today = new Date().toISOString().split('T')[0];
        checkInInput.min = today;

        // Update the price summary
        updatePriceSummary();

        // Show the modal
        bookingModal.classList.add('active');
        bookingModalOverlay.classList.add('active');
        document.body.classList.add('modal-active');
    };

    const closeBookingModal = () => {
        bookingModal.classList.remove('active');
        bookingModalOverlay.classList.remove('active');
        document.body.classList.remove('modal-active');
        bookingForm.reset();
        updatePriceSummary(); // Reset summary
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

    // Event Listeners for Booking
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

    // Tambahkan event listener untuk menutup modal dan memperbarui harga
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
    });

    checkOutInput.addEventListener('change', updatePriceSummary);

    bookingForm.addEventListener('submit', async (e) => { // Disempurnakan agar setara dengan alur korporat
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
            const bookingData = {
                hotel_id: hotelId,
                room_type_id: document.getElementById('booking-room-id').value,
                room_name: document.getElementById('booking-modal-room-name').textContent,
                guest_name: document.getElementById('guest-name').value,
                guest_email: document.getElementById('guest-email').value,
                check_in_date: checkInInput.value,
                check_out_date: checkOutInput.value,
                total_price: parseFloat(document.getElementById('total-price').textContent.replace(/[^0-9]/g, ''))
            };

            if (!bookingData.guest_name || !bookingData.guest_email || !bookingData.check_in_date || !bookingData.check_out_date) {
                throw new Error('Semua field wajib diisi.');
            }
            if (bookingData.total_price <= 0) {
                throw new Error('Tanggal check-out harus setelah tanggal check-in.');
            }

            // --- 2. API Call ---
            const response = await fetch(`${API_BASE_URL}/bookings`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(bookingData)
            });
            
            const result = await response.json();
            if (!response.ok) {
                throw new Error(result.error || 'Gagal melakukan pemesanan.');
            }

            // --- 3. Success ---
            alert('Pemesanan Anda berhasil! Terima kasih.'); // Notifikasi sederhana untuk publik
            closeBookingModal(); // Tutup modal dan reset form

        } catch (error) {
            // --- 4. Error Handling ---
            bookingErrorMessage.textContent = error.message;
            bookingErrorMessage.style.display = 'block';
            console.error('Public booking error:', error);
        } finally {
            // --- UI State: Reset ---
            confirmBookingBtn.disabled = false;
            btnText.style.display = 'inline-block';
            btnSpinner.style.display = 'none';
        }
    });

    // Panggil fungsi utama untuk memuat data
    fetchHotelDetails();

});
