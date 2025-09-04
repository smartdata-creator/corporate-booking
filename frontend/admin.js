
document.addEventListener('DOMContentLoaded', () => {
    // --- Persiapan Otentikasi ---
    // Token dijamin ada oleh admin-auth.js, jadi kita bisa langsung menggunakannya.
    const token = localStorage.getItem('adminAuthToken');
    const authHeader = { 'Authorization': `Bearer ${token}` };

    const API_BASE_URL = 'https://corporate-booking.onrender.com/api';

    // --- State Aplikasi ---
    let hotels = [];
    let submissions = [];
    let companies = [];
    let testimonials = [];
    let promos = [];
    let activities = [];
    let bookings = [];
    let reviews = [];
    let bookingCurrentPage = 1;
    let bookingTotalPages = 1;
    let bookingSearchTerm = '';
    let bookingStatusFilterValue = '';
    let bookingStartDate = '';
    let bookingEndDate = '';
    let adminUsers = [];
    let companyEmployees = [];
    const bookingsPerPage = 10;

    // --- Elements ---
    const adminNameDisplay = document.getElementById('admin-name-display');

    // Mobile Menu Elements
    const hamburgerBtn = document.getElementById('hamburger-btn');
    const adminLayout = document.querySelector('.admin-layout');
    const mobileOverlay = document.getElementById('mobile-overlay');
    const adminSidebar = document.getElementById('admin-sidebar');
    const activityFeedList = document.getElementById('activity-feed-list');
    const navLinks = document.querySelectorAll('.sidebar-nav .nav-link');
    const contentSections = document.querySelectorAll('.content-section');
    const hotelTableBody = document.getElementById('hotel-table-body');
    const submissionTableBody = document.getElementById('submission-table-body');
    const totalHotelsEl = document.getElementById('total-hotels');
    const totalBookingsEl = document.getElementById('total-bookings');
    const totalSubmissionsEl = document.getElementById('total-submissions');
    const totalTestimonialsEl = document.getElementById('total-testimonials');
    const testimonialTableBody = document.getElementById('testimonial-table-body');
    const promoTableBody = document.getElementById('promo-table-body');
    const companyTableBody = document.getElementById('company-table-body');
    // Elemen untuk filter pengajuan
    const submissionSearchInput = document.getElementById('submission-search-input');
    const submissionStatusFilter = document.getElementById('submission-status-filter');
    const submissionFilterReset = document.getElementById('submission-filter-reset');
    // Elemen untuk filter perusahaan
    const companySearchInput = document.getElementById('company-search-input');
    const companyStatusFilter = document.getElementById('company-status-filter');
    const reviewTableBody = document.getElementById('review-table-body');
    const companyFilterReset = document.getElementById('company-filter-reset');


    const totalCompaniesEl = document.getElementById('total-companies');

    const bookingSearchForm = document.getElementById('booking-search-form');
    const bookingSearchInput = document.getElementById('booking-search-input');
    const bookingStatusFilter = document.getElementById('booking-status-filter');
    const bookingStartDateInput = document.getElementById('booking-start-date');
    const bookingEndDateInput = document.getElementById('booking-end-date');
    const bookingFilterResetBtn = document.getElementById('booking-filter-reset-btn');
    
    const dashboardAllotmentContainer = document.getElementById('dashboard-allotment-container');
    const bookingTrendChartCanvas = document.getElementById('booking-trend-chart');
    let bookingTrendChart = null; // Untuk menyimpan instance chart

    // --- Modal Elements ---
    const addHotelBtn = document.getElementById('add-hotel-btn');
    const hotelModal = document.getElementById('hotel-modal');
    const hotelModalOverlay = document.getElementById('hotel-modal-overlay');
    const hotelModalCloseBtn = document.getElementById('hotel-modal-close-btn');
    const hotelForm = document.getElementById('hotel-form');
    const hotelModalTitle = document.getElementById('hotel-modal-title');
    const addTestimonialBtn = document.getElementById('add-testimonial-btn');
    const testimonialModal = document.getElementById('testimonial-modal');
    const testimonialModalOverlay = document.getElementById('testimonial-modal-overlay');
    const testimonialModalCloseBtn = document.getElementById('testimonial-modal-close-btn');
    const testimonialForm = document.getElementById('testimonial-form');
    const testimonialModalTitle = document.getElementById('testimonial-modal-title');
    const addPromoBtn = document.getElementById('add-promo-btn');
    const promoModal = document.getElementById('promo-modal');
    const promoModalOverlay = document.getElementById('promo-modal-overlay');
    const promoModalCloseBtn = document.getElementById('promo-modal-close-btn');
    const promoForm = document.getElementById('promo-form');
    const promoModalTitle = document.getElementById('promo-modal-title');
    const approveModal = document.getElementById('approve-modal');
    const approveModalOverlay = document.getElementById('approve-modal-overlay');
    const approveModalCloseBtn = document.getElementById('approve-modal-close-btn');
    const approveForm = document.getElementById('approve-form');
    const approveCompanyName = document.getElementById('approve-company-name');
    const approveSubmissionIdInput = document.getElementById('approve-submission-id');
    const editSubmissionModal = document.getElementById('edit-submission-modal');
    const editSubmissionModalOverlay = document.getElementById('edit-submission-modal-overlay');
    const editSubmissionModalCloseBtn = document.getElementById('edit-submission-modal-close-btn');
    const editSubmissionForm = document.getElementById('edit-submission-form');
    const editCompanyModal = document.getElementById('edit-company-modal');
    const editCompanyModalOverlay = document.getElementById('edit-company-modal-overlay');
    const editCompanyModalCloseBtn = document.getElementById('edit-company-modal-close-btn');
    const editCompanyForm = document.getElementById('edit-company-form');
    const approveHotelAccessSelect = document.getElementById('approve-hotel-access');
    const editCompanyHotelAccessSelect = document.getElementById('edit-company-hotel-access');

    const createUserModal = document.getElementById('create-user-modal');
    const createUserModalOverlay = document.getElementById('create-user-modal-overlay');
    const createUserModalCloseBtn = document.getElementById('create-user-modal-close-btn');
    const createUserForm = document.getElementById('create-user-form');
    const createUserCompanyName = document.getElementById('create-user-company-name');
    const createUserCompanyIdInput = document.getElementById('create-user-company-id');
    const roomManagementModal = document.getElementById('room-management-modal');
    const roomManagementModalOverlay = document.getElementById('room-management-modal-overlay');
    const roomManagementModalCloseBtn = document.getElementById('room-management-modal-close-btn');
    const roomManagementModalTitle = document.getElementById('room-management-modal-title');
    const roomTableBody = document.getElementById('room-table-body');
    const addRoomBtn = document.getElementById('add-room-btn');
    const companyPriceModal = document.getElementById('company-price-modal');
    const companyPriceModalOverlay = document.getElementById('company-price-modal-overlay');
    const companyPriceModalCloseBtn = document.getElementById('company-price-modal-close-btn');
    const companyPriceForm = document.getElementById('company-price-form');
    const companyPriceTableBody = document.getElementById('company-price-table-body');
    const companyPriceModalTitle = document.getElementById('company-price-modal-title');
    const roomFormModal = document.getElementById('room-form-modal');
    const roomFormModalOverlay = document.getElementById('room-form-modal-overlay');
    const roomFormModalCloseBtn = document.getElementById('room-form-modal-close-btn');
    const roomForm = document.getElementById('room-form');
    const roomFormModalTitle = document.getElementById('room-form-modal-title');

    const manageUserModal = document.getElementById('manage-user-modal');
    const manageUserModalOverlay = document.getElementById('manage-user-modal-overlay');
    const manageUserModalCloseBtn = document.getElementById('manage-user-modal-close-btn');
    const manageUserForm = document.getElementById('manage-user-form');
    const logoutBtn = document.getElementById('logout-btn');
    const manageUserModalTitle = document.getElementById('manage-user-modal-title');

    // Employee Management Modals
    const employeeManagementModal = document.getElementById('employee-management-modal');
    const employeeManagementModalOverlay = document.getElementById('employee-management-modal-overlay');
    const employeeManagementModalCloseBtn = document.getElementById('employee-management-modal-close-btn');
    const employeeManagementModalTitle = document.getElementById('employee-management-modal-title');
    const employeeTableBody = document.getElementById('employee-table-body');
    const addEmployeeBtn = document.getElementById('add-employee-btn');
    const employeeFormModal = document.getElementById('employee-form-modal');
    const employeeFormModalOverlay = document.getElementById('employee-form-modal-overlay');
    const employeeFormModalCloseBtn = document.getElementById('employee-form-modal-close-btn');
    const employeeForm = document.getElementById('employee-form');

    // Admin User Management Elements
    const adminUserTableBody = document.getElementById('admin-user-table-body');
    const adminUserModal = document.getElementById('admin-user-modal');
    const adminUserModalOverlay = document.getElementById('admin-user-modal-overlay');
    const adminUserModalCloseBtn = document.getElementById('admin-user-modal-close-btn');
    const adminUserForm = document.getElementById('admin-user-form');
    const adminUserModalTitle = document.getElementById('admin-user-modal-title');
    const hotelAccessGroup = document.getElementById('admin-hotel-access-group');

    // --- PENGATURAN (Settings) ---
    const heroSettingsForm = document.getElementById('hero-settings-form');
    const integrationSettingsForm = document.getElementById('integration-settings-form');
    const paymentGatewayForm = document.getElementById('payment-gateway-form');
    const logoSettingsForm = document.getElementById('logo-settings-form');

    const loadSettings = async () => {
        try {
            const [heroRes, integrationRes, paymentRes, logoRes] = await Promise.allSettled([
                fetch(`${API_BASE_URL}/settings/hero-background`),
                fetch(`${API_BASE_URL}/admin/settings/integration`, { headers: authHeader }),
                fetch(`${API_BASE_URL}/admin/settings/payment-gateway`, { headers: authHeader }),
                fetch(`${API_BASE_URL}/admin/settings/company-logo`, { headers: authHeader })
            ]);

            if (heroRes.status === 'fulfilled' && heroRes.value.ok) {
                const data = await heroRes.value.json();
                if (data.url) document.getElementById('hero-image-url').value = data.url;
            }

            if (integrationRes.status === 'fulfilled' && integrationRes.value.ok) {
                const data = await integrationRes.value.json();
                if (data.settings) {
                    document.getElementById('integration-api-url').value = data.settings.apiUrl || '';
                    document.getElementById('integration-api-key').value = data.settings.apiKey || '';
                    document.getElementById('integration-hotel-id').value = data.settings.hotelId || '';
                }
            }

            if (paymentRes.status === 'fulfilled' && paymentRes.value.ok) {
                const data = await paymentRes.value.json();
                if (data.settings) {
                    document.getElementById('pg-is-production').value = data.settings.isProduction || 'false';
                    document.getElementById('pg-server-key').value = data.settings.serverKey || '';
                    document.getElementById('pg-client-key').value = data.settings.clientKey || '';
                }
            }

            if (logoRes.status === 'fulfilled' && logoRes.value.ok) {
                const data = await logoRes.value.json();
                if (data.url) document.getElementById('logo-image-url').value = data.url;
            }
        } catch (error) {
            console.error('Gagal memuat pengaturan:', error);
            showToast('Gagal memuat sebagian atau seluruh pengaturan.', 'error');
        }
    };

    // --- Settings Modals ---
    const heroSettingsModal = document.getElementById('hero-settings-modal');
    const heroSettingsModalOverlay = document.getElementById('hero-settings-modal-overlay');
    const heroSettingsModalCloseBtn = document.getElementById('hero-settings-modal-close-btn');
    const closeHeroSettingsModal = () => {
        if (heroSettingsModal) heroSettingsModal.classList.remove('active');
        if (heroSettingsModalOverlay) heroSettingsModalOverlay.classList.remove('active');
    };

    const paymentGatewayModal = document.getElementById('payment-gateway-modal');
    const paymentGatewayModalOverlay = document.getElementById('payment-gateway-modal-overlay');
    const paymentGatewayModalCloseBtn = document.getElementById('payment-gateway-modal-close-btn');
    const closePaymentGatewayModal = () => {
        if (paymentGatewayModal) paymentGatewayModal.classList.remove('active');
        if (paymentGatewayModalOverlay) paymentGatewayModalOverlay.classList.remove('active');
    };

    const integrationSettingsModal = document.getElementById('integration-settings-modal');
    const integrationSettingsModalOverlay = document.getElementById('integration-settings-modal-overlay');
    const integrationSettingsModalCloseBtn = document.getElementById('integration-settings-modal-close-btn');
    const closeIntegrationSettingsModal = () => {
        if (integrationSettingsModal) integrationSettingsModal.classList.remove('active');
        if (integrationSettingsModalOverlay) integrationSettingsModalOverlay.classList.remove('active');
    };

    const logoSettingsModal = document.getElementById('logo-settings-modal');
    const logoSettingsModalOverlay = document.getElementById('logo-settings-modal-overlay');
    const logoSettingsModalCloseBtn = document.getElementById('logo-settings-modal-close-btn');
    const closeLogoSettingsModal = () => {
        if (logoSettingsModal) logoSettingsModal.classList.remove('active');
        if (logoSettingsModalOverlay) logoSettingsModalOverlay.classList.remove('active');
    };

    // --- Settings Event Listeners ---
    const settingsGrid = document.querySelector('.settings-grid');
    if (settingsGrid) {
        settingsGrid.addEventListener('click', (e) => {
            const card = e.target.closest('.settings-card[data-modal-target]');
            if (card) {
                const modalId = card.dataset.modalTarget;
                const modal = document.getElementById(modalId);
                const modalOverlay = document.getElementById(`${modalId}-overlay`);
                if (modal && modalOverlay) {
                    loadSettings().then(() => {
                        modal.classList.add('active');
                        modalOverlay.classList.add('active');
                    });
                }
            }
        });
    }

    if (heroSettingsModal) { heroSettingsModalCloseBtn.addEventListener('click', closeHeroSettingsModal); heroSettingsModalOverlay.addEventListener('click', closeHeroSettingsModal); }
    if (paymentGatewayModal) { paymentGatewayModalCloseBtn.addEventListener('click', closePaymentGatewayModal); paymentGatewayModalOverlay.addEventListener('click', closePaymentGatewayModal); }
    if (integrationSettingsModal) { integrationSettingsModalCloseBtn.addEventListener('click', closeIntegrationSettingsModal); integrationSettingsModalOverlay.addEventListener('click', closeIntegrationSettingsModal); }
    if (logoSettingsModal) { logoSettingsModalCloseBtn.addEventListener('click', closeLogoSettingsModal); logoSettingsModalOverlay.addEventListener('click', closeLogoSettingsModal); }
    if (heroSettingsForm) {
        heroSettingsForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const url = document.getElementById('hero-image-url').value;
            try {
                const response = await fetch(`${API_BASE_URL}/admin/settings/hero-background`, {
                    method: 'PUT',
                    headers: { ...authHeader, 'Content-Type': 'application/json' },
                    body: JSON.stringify({ url })
                });
                if (!response.ok) {
                    const errData = await response.json();
                    throw new Error(errData.error || 'Gagal menyimpan perubahan');
                }
                showToast('Pengaturan gambar latar berhasil disimpan.', 'success');
                closeHeroSettingsModal();
            } catch (error) {
                showToast(`Error: ${error.message}`, 'error');
            }
        });
    }

    if (integrationSettingsForm) {
        integrationSettingsForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const settingsData = {
                apiUrl: document.getElementById('integration-api-url').value,
                apiKey: document.getElementById('integration-api-key').value,
                hotelId: document.getElementById('integration-hotel-id').value,
            };
            try {
                const response = await fetch(`${API_BASE_URL}/admin/settings/integration`, {
                    method: 'PUT',
                    headers: { ...authHeader, 'Content-Type': 'application/json' },
                    body: JSON.stringify(settingsData)
                });
                if (!response.ok) {
                    const errData = await response.json();
                    throw new Error(errData.error || 'Gagal menyimpan konfigurasi integrasi.');
                }
                showToast('Pengaturan integrasi berhasil disimpan.', 'success');
                closeIntegrationSettingsModal();
            } catch (error) {
                showToast(`Error: ${error.message}`, 'error');
            }
        });
    }

    if (paymentGatewayForm) {
        paymentGatewayForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const settingsData = {
                isProduction: document.getElementById('pg-is-production').value === 'true',
                serverKey: document.getElementById('pg-server-key').value,
                clientKey: document.getElementById('pg-client-key').value,
            };
            if (!settingsData.serverKey || !settingsData.clientKey) {
                showToast('Server Key dan Client Key wajib diisi.', 'error');
                return;
            }
            try {
                const response = await fetch(`${API_BASE_URL}/admin/settings/payment-gateway`, {
                    method: 'PUT',
                    headers: { ...authHeader, 'Content-Type': 'application/json' },
                    body: JSON.stringify(settingsData)
                });
                if (!response.ok) {
                    const errData = await response.json();
                    throw new Error(errData.error || 'Gagal menyimpan konfigurasi.');
                }
                showToast('Konfigurasi Payment Gateway berhasil disimpan!', 'success');
                closePaymentGatewayModal();
            } catch (error) {
                showToast(`Error: ${error.message}`, 'error');
            }
        });
    }

    if (logoSettingsForm) {
        logoSettingsForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const url = document.getElementById('logo-image-url').value;
            try {
                // Anda perlu membuat endpoint ini di backend
                const response = await fetch(`${API_BASE_URL}/admin/settings/company-logo`, {
                    method: 'PUT',
                    headers: { ...authHeader, 'Content-Type': 'application/json' },
                    body: JSON.stringify({ url })
                });
                if (!response.ok) {
                    const errData = await response.json();
                    throw new Error(errData.error || 'Gagal menyimpan logo');
                }
                showToast('Logo perusahaan berhasil disimpan.', 'success');
                closeLogoSettingsModal();
            } catch (error) {
                showToast(`Error: ${error.message}`, 'error');
            }
        });
    }

    // --- Functions ---

    /**
     * Mendekode token JWT untuk mendapatkan payload-nya.
     * @param {string} token String token JWT.
     * @returns {object|null} Objek payload atau null jika parsing gagal.
     */
    const parseJwt = (token) => {
        try {
            const base64Url = token.split('.')[1];
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            // atob mendekode base64, dan sisanya menangani karakter UTF-8 dengan benar.
            const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
                return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
            }).join(''));

            return JSON.parse(jsonPayload);
        } catch (e) {
            console.error("Gagal mendekode token:", e);
            return null; // Kembalikan null jika parsing gagal
        }
    };

    /**
     * Menganimasikan angka dari 0 ke nilai akhir dengan efek count-up.
     * @param {HTMLElement} el Elemen HTML yang akan dianimasikan.
     * @param {number} end Angka akhir yang dituju.
     * @param {number} duration Durasi animasi dalam milidetik.
     */
    const animateCountUp = (el, end, duration = 1500) => {
        if (!el) return;
        const finalEnd = parseInt(end, 10) || 0;
        const startTime = performance.now();

        const step = (currentTime) => {
            const elapsedTime = currentTime - startTime;
            const progress = Math.min(elapsedTime / duration, 1);
            const currentCount = Math.floor(progress * finalEnd);

            el.textContent = currentCount.toLocaleString('id-ID');

            if (progress < 1) {
                requestAnimationFrame(step);
            } else {
                el.textContent = finalEnd.toLocaleString('id-ID');
            }
        };
        requestAnimationFrame(step);
    };

    /**
     * Merender tabel ringkasan alotment di dashboard.
     * @param {Array} allotmentData Data alotment yang sudah terstruktur.
     */
    const renderDashboardAllotmentTable = (allotmentData) => {
        if (!dashboardAllotmentContainer) return;

        if (!allotmentData || allotmentData.length === 0) {
            dashboardAllotmentContainer.innerHTML = '<div class="card"><div class="card-body"><p>Tidak ada data alotment untuk ditampilkan.</p></div></div>';
            return;
        }

        let tableHtml = `
            <div class="card">
                <div class="card-header">
                    <h3>Ringkasan Alotment Kamar (Hari Ini)</h3>
                </div>
                <div class="card-body">
                    <div class="table-responsive">
                        <table class="table">
                            <thead>
                                <tr>
                                    <th>Hotel</th>
                                    <th>Tipe Kamar</th>
                                    <th>Total Alotment</th>
                                    <th>Terpesan</th>
                                    <th style="width: 100px;">Tersisa</th>
                                </tr>
                            </thead>
                            <tbody>
        `;

        allotmentData.forEach(hotel => {
            if (hotel.rooms && hotel.rooms.length > 0) {
                hotel.rooms.forEach((room, index) => {
                    const remaining = room.total_allotment - room.booked_count;
                    const remainingClass = remaining <= 3 ? 'text-danger' : remaining <= 7 ? 'text-warning' : 'text-success';
                    
                    tableHtml += `
                        <tr>
                            ${index === 0 ? `<td rowspan="${hotel.rooms.length}" style="vertical-align: middle;">${hotel.hotel_name}</td>` : ''}
                            <td>${room.room_name}</td>
                            <td>${room.total_allotment}</td>
                            <td>${room.booked_count}</td>
                            <td class="font-weight-bold ${remainingClass}">${remaining}</td>
                        </tr>
                    `;
                });
            }
        });

        tableHtml += `
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;

        dashboardAllotmentContainer.innerHTML = tableHtml;
    };

    /**
     * Menampilkan notifikasi toast di pojok kanan bawah.
     * @param {string} message - Pesan utama notifikasi.
     * @param {string} [type='info'] - Tipe notifikasi ('info', 'success').
     * @param {number} [duration=5000] - Durasi tampilan dalam milidetik.
     */
    const showToast = (message, type = 'info', duration = 5000) => {
        const container = document.getElementById('toast-container');
        if (!container) return;

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;

        const iconClass = type === 'success' ? 'fa-check-circle' : 'fa-bell';
        const iconColorClass = type === 'success' ? 'success' : 'info';

        toast.innerHTML = `
            <div class="toast-icon ${iconColorClass}">
                <i class="fas ${iconClass}"></i>
            </div>
            <div class="toast-message">
                <p>${message}</p>
            </div>
        `;

        container.appendChild(toast);

        setTimeout(() => { toast.classList.add('show'); }, 100);

        setTimeout(() => {
            toast.classList.remove('show');
            toast.addEventListener('transitionend', () => toast.remove());
        }, duration);
    };

    /**
     * Mengubah tanggal menjadi format "time ago".
     * @param {string | Date} date - Tanggal dalam format string atau objek Date.
     * @returns {string} String yang diformat (e.g., "5 menit lalu").
     */
    const timeAgo = (date) => {
        const seconds = Math.floor((new Date() - new Date(date)) / 1000);
        let interval = seconds / 31536000;
        if (interval > 1) return Math.floor(interval) + " tahun lalu";
        interval = seconds / 2592000;
        if (interval > 1) return Math.floor(interval) + " bulan lalu";
        interval = seconds / 86400;
        if (interval > 1) return Math.floor(interval) + " hari lalu";
        interval = seconds / 3600;
        if (interval > 1) return Math.floor(interval) + " jam lalu";
        interval = seconds / 60;
        if (interval > 1) return Math.floor(interval) + " menit lalu";
        return "Baru saja";
    };

    const renderActivityFeed = () => {
        if (!activityFeedList) return;
        activityFeedList.innerHTML = '';
    
        if (!activities || activities.length === 0) {
            activityFeedList.innerHTML = '<li>Tidak ada aktivitas terbaru.</li>';
            return;
        }
    
        const iconMap = {
            'booking_created': { icon: 'fa-calendar-check', class: 'booking' },
            'booking_status_changed': { icon: 'fa-calendar-day', class: 'booking' },
            'submission_approved': { icon: 'fa-check-circle', class: 'submission' },
            'submission_created': { icon: 'fa-file-alt', class: 'submission' },
            'company_created': { icon: 'fa-building', class: 'company' },
            'user_created': { icon: 'fa-user-plus', class: 'user' },
            'hotel_added': { icon: 'fa-hotel', class: 'hotel' },
            'room_added': { icon: 'fa-bed', class: 'hotel' },
        };
    
        activities.slice(0, 10).forEach(activity => { // Tampilkan 10 aktivitas teratas
            const li = document.createElement('li');
            const activityIcon = iconMap[activity.type] || { icon: 'fa-info-circle', class: 'company' };
            
            li.innerHTML = `
                <div class="activity-icon ${activityIcon.class}">
                    <i class="fas ${activityIcon.icon}"></i>
                </div>
                <div class="activity-details">
                    <p>${activity.description}</p>
                    <span class="activity-time">${timeAgo(activity.timestamp)}</span>
                </div>
            `;
            activityFeedList.appendChild(li);
        });
    };

    // Function to switch between content sections
    const showSection = (hash) => {
        const targetId = hash.substring(1);
        contentSections.forEach(section => {
            section.classList.toggle('active', section.id === targetId);
        });
        navLinks.forEach(link => {
            link.classList.toggle('active', link.getAttribute('href') === hash);
        });
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

    // Function to render hotel table
    const renderHotelTable = () => {
        hotelTableBody.innerHTML = '';
        if (!hotels || hotels.length === 0) {
            hotelTableBody.innerHTML = '<tr><td colspan="4">Tidak ada data hotel.</td></tr>';
        } else {
            hotels.forEach(hotel => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${hotel.name}</td>
                    <td>${generateStars(hotel.average_rating)} (${parseFloat(hotel.average_rating).toFixed(1)})</td>
                    <td><a href="${hotel.image_url}" target="_blank">Lihat</a></td>
                    <td>
                        <button class="btn btn-secondary btn-manage-rooms" data-id="${hotel.id}" data-name="${hotel.name}" style="margin-right: 5px;">Kelola Kamar</button>
                        <button class="btn btn-edit" data-id="${hotel.id}">Edit</button>
                        <button class="btn btn-delete" data-id="${hotel.id}">Hapus</button>
                    </td>
                `;
                hotelTableBody.appendChild(row);
            });
        }
        animateCountUp(totalHotelsEl, hotels.length);
    };

    // Function to render submission table
    const renderSubmissionTable = () => {
        const searchTerm = submissionSearchInput.value.toLowerCase().trim();
        const statusFilter = submissionStatusFilter.value;

        const filteredSubmissions = submissions.filter(sub => {
            const matchesStatus = !statusFilter || sub.status === statusFilter;
            const matchesSearch = !searchTerm ||
                (sub.company_name && sub.company_name.toLowerCase().includes(searchTerm)) ||
                (sub.company_npwp && sub.company_npwp.includes(searchTerm)) ||
                (sub.contact_person_name && sub.contact_person_name.toLowerCase().includes(searchTerm));
            return matchesStatus && matchesSearch;
        });

        submissionTableBody.innerHTML = '';
        if (filteredSubmissions.length === 0) {
            const message = searchTerm || statusFilter ? 'Tidak ada data pengajuan yang cocok dengan filter.' : 'Tidak ada data pengajuan.';
            submissionTableBody.innerHTML = `<tr><td colspan="8" style="text-align: center;">${message}</td></tr>`;
        } else {
            filteredSubmissions.forEach(sub => {
                const row = document.createElement('tr');
                const printButton = `<button class="btn btn-info btn-sm btn-print-submission" data-id="${sub.id}" title="Cetak PDF"><i class="fas fa-print"></i></button>`;
                let actionButtons = '';
                let statusHtml = '';

                switch (sub.status) {
                    case 'pending':
                        statusHtml = `<span class="status-pending">Pending</span>`;
                        actionButtons = `
                            ${printButton}
                            <button class="btn btn-warning btn-sm btn-verify" data-id="${sub.id}">Verifikasi</button>
                            <button class="btn btn-secondary btn-sm btn-edit-submission" data-id="${sub.id}">Edit</button>
                            <button class="btn btn-danger btn-sm btn-delete" data-id="${sub.id}">Hapus</button>
                        `;
                        break;
                    case 'verifying':
                        statusHtml = `<span class="status-verifying">Verifying</span>`;
                        actionButtons = `
                            ${printButton}
                            <button class="btn btn-success btn-sm btn-approve" data-id="${sub.id}" data-company-name="${sub.company_name}">Setujui</button>
                            <button class="btn btn-danger btn-sm btn-reject" data-id="${sub.id}">Tolak</button>
                            <button class="btn btn-secondary btn-sm btn-edit-submission" data-id="${sub.id}">Edit</button>
                        `;
                        break;
                    case 'approved':
                        statusHtml = `<span class="status-confirmed">Approved</span>`;
                        actionButtons = `
                            ${printButton}
                            <span class="status-confirmed">Telah Disetujui</span>
                        `;
                        break;
                    case 'rejected':
                        statusHtml = `<span class="status-canceled">Rejected</span>`;
                        actionButtons = `
                            ${printButton}
                            <span class="status-canceled">Telah Ditolak</span>
                        `;
                        break;
                    default:
                        statusHtml = `<span>${sub.status}</span>`;
                        actionButtons = `<span>-</span>`;
                }

                row.innerHTML = `
                    <td>${sub.company_name}</td>
                    <td>${sub.company_npwp || '-'}</td>
                    <td>${sub.contact_person_name}<br><small>${sub.contact_person_phone}</small></td>
                    <td>${sub.finance_pic_email || '-'}</td>
                    <td>${formatCurrency(sub.credit_estimation || 0)}</td>
                    <td>${(sub.service_type || '').toUpperCase()}</td>
                    <td>${statusHtml}</td>
                    <td class="action-buttons">${actionButtons}</td>
                `;
                submissionTableBody.appendChild(row);
            });
        }
        animateCountUp(totalSubmissionsEl, submissions.length);
    };

    // Function to render testimonial table
    const renderTestimonialTable = () => {
        testimonialTableBody.innerHTML = '';
        if (!testimonials || testimonials.length === 0) {
            testimonialTableBody.innerHTML = '<tr><td colspan="5">Tidak ada data testimoni.</td></tr>';
        } else {
            testimonials.forEach(testimonial => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${testimonial.author}</td>
                    <td>${testimonial.title}</td>
                    <td title="${testimonial.quote}">${testimonial.quote.substring(0, 50)}...</td>
                    <td><a href="${testimonial.image_url}" target="_blank">Lihat</a></td>
                    <td>
                        <button class="btn btn-edit" data-id="${testimonial.id}" data-type="testimonial">Edit</button>
                        <button class="btn btn-delete" data-id="${testimonial.id}" data-type="testimonial">Hapus</button>
                    </td>
                `;
                testimonialTableBody.appendChild(row);
            });
        }
        animateCountUp(totalTestimonialsEl, testimonials.length);
    };

    // Function to render promo table
    const renderAdminPromos = () => {
        if (!promoTableBody) return;
        promoTableBody.innerHTML = '';
        if (!promos || promos.length === 0) {
            promoTableBody.innerHTML = '<tr><td colspan="4" style="text-align:center;">Belum ada promo yang ditambahkan.</td></tr>';
        } else {
            promos.forEach(promo => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td><img src="${promo.image_url}" alt="${promo.title || 'Preview'}" class="promo-preview-img"></td>
                    <td>${promo.title || '-'}</td>
                    <td><a href="${promo.link_url || '#'}" target="_blank" rel="noopener noreferrer">${promo.link_url || '-'}</a></td>
                    <td>
                        <button class="btn btn-edit" data-id="${promo.id}" data-type="promo">Edit</button>
                        <button class="btn btn-delete" data-id="${promo.id}" data-type="promo">Hapus</button>
                    </td>
                `;
                promoTableBody.appendChild(row);
            });
        }
    };

    // Function to render company table
    const renderCompanyTable = () => {
        const searchTerm = companySearchInput.value.toLowerCase().trim();
        const statusFilter = companyStatusFilter.value;

        const filteredCompanies = companies.filter(comp => {
            // Asumsi objek company memiliki properti 'status': 'active' atau 'suspended'
            const matchesStatus = !statusFilter || comp.status === statusFilter;
            const matchesSearch = !searchTerm || (comp.name && comp.name.toLowerCase().includes(searchTerm));
            return matchesStatus && matchesSearch;
        });

        companyTableBody.innerHTML = '';
        if (filteredCompanies.length === 0) {
            const message = searchTerm || statusFilter ? 'Tidak ada data perusahaan yang cocok dengan filter.' : 'Belum ada perusahaan yang disetujui.';
            companyTableBody.innerHTML = `<tr><td colspan="6" style="text-align: center;">${message}</td></tr>`;
        } else {
            filteredCompanies.forEach(company => {
                const row = document.createElement('tr');
                const statusHtml = company.status === 'suspended'
                    ? `<span class="status-canceled">Suspended</span>`
                    : `<span class="status-confirmed">Aktif</span>`;

                row.innerHTML = `
                    <td>KSB - ${company.id}</td>
                    <td>${company.name}</td>
                    <td>${formatCurrency(company.credit_limit || 0)}</td>
                    <td>${formatCurrency(company.credit_used || 0)}</td>
                    <td>${statusHtml}</td>
                    <td class="action-buttons">
                        ${!company.has_user
                            ? `<button class="btn btn-primary btn-create-user" data-id="${company.id}" data-name="${company.name}">Buat User Login</button>`
                            : `<button class="btn btn-secondary btn-manage-user" data-id="${company.id}" data-name="${company.name}">Kelola Login</button>`
                        }
                        <button class="btn btn-success btn-manage-employees" data-id="${company.id}" data-name="${company.name}" style="margin-left: 5px;">Kelola Karyawan</button>
                        <button class="btn btn-edit btn-edit-company" data-id="${company.id}" style="margin-left: 5px;">Edit</button>
                        <button class="btn btn-info manage-price-btn" data-id="${company.id}" data-name="${company.name}" style="margin-left: 5px;">Kelola Harga</button>
                    </td>
                `;
                companyTableBody.appendChild(row);
            });
        }
        animateCountUp(totalCompaniesEl, companies.length);
    };

    const renderReviewTable = () => {
        if (!reviewTableBody) return;
        reviewTableBody.innerHTML = '';
        if (reviews.length === 0) {
            reviewTableBody.innerHTML = '<tr><td colspan="7" style="text-align:center;">Belum ada ulasan.</td></tr>';
            return;
        }
        reviews.forEach(review => {
            const row = document.createElement('tr');
            const toggleButtonText = review.is_featured ? 'Sembunyikan' : 'Tampilkan';
            const toggleButtonClass = review.is_featured ? 'btn-secondary' : 'btn-success';

            row.innerHTML = `
                <td>${review.hotel_name || 'N/A'}</td>
                <td>${review.reviewer_name || 'Anonim'}</td>
                <td>${'★'.repeat(review.rating)}${'☆'.repeat(5 - review.rating)}</td>
                <td class="comment-cell">${review.comment || '-'}</td>
                <td>${new Date(review.created_at).toLocaleDateString('id-ID')}</td>
                <td>
                    <button class="btn ${toggleButtonClass} btn-sm btn-toggle-feature" data-id="${review.id}">${toggleButtonText}</button>
                </td>
                <td class="action-buttons">
                    <button class="btn btn-delete btn-sm btn-delete-review" data-id="${review.id}" title="Hapus Ulasan">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `;
            reviewTableBody.appendChild(row);
        });
    };

    const loadReviews = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/admin/reviews`, { headers: authHeader });
            if (!response.ok) throw new Error('Gagal memuat ulasan.');
            reviews = await response.json();
            renderReviewTable();
        } catch (error) {
            console.error('Error loading reviews:', error);
            if (reviewTableBody) reviewTableBody.innerHTML = '<tr><td colspan="7" style="text-align:center; color:red;">Gagal memuat ulasan.</td></tr>';
        }
    };

    /**
     * Mengisi elemen <select> dengan daftar hotel.
     * @param {HTMLSelectElement} selectElement - Elemen select yang akan diisi.
     * @param {number[]} [selectedIds=[]] - Array ID hotel yang harus dipilih secara default.
     */
    const populateHotelSelect = (selectElement, selectedIds = []) => {
        if (!selectElement) return;
        selectElement.innerHTML = hotels.map(h => 
            `<option value="${h.id}" ${selectedIds.includes(h.id) ? 'selected' : ''}>${h.name}</option>`
        ).join('');
    };

    // Function to render admin user table
    const renderAdminUserTable = () => {
        adminUserTableBody.innerHTML = '';
        if (!adminUsers || adminUsers.length === 0) {
            adminUserTableBody.innerHTML = '<tr><td colspan="4">Tidak ada data user admin.</td></tr>';
        } else {
            adminUsers.forEach(user => {
                const row = document.createElement('tr');
                // Anda perlu menambahkan kolom seperti 'created_at' atau 'id' di backend
                row.innerHTML = `
                    <td>${user.full_name}</td>
                    <td>${user.email}</td>
                    <td><span class="role-${user.role.toLowerCase().replace(' ', '-')}">${user.role}</span></td>
                    <td>
                        <button class="btn btn-edit" data-id="${user.id}" data-type="admin-user">Edit</button>
                        <button class="btn btn-delete" data-id="${user.id}" data-type="admin-user">Hapus</button>
                    </td>
                `;
                adminUserTableBody.appendChild(row);
            });
        }
    };
    // Function to render booking table
    const renderBookingTable = () => {
        const bookingTableBody = document.getElementById('booking-table-body');
        bookingTableBody.innerHTML = '';
        if (!bookings || bookings.length === 0) {
            bookingTableBody.innerHTML = '<tr><td colspan="12">Tidak ada data booking.</td></tr>'; // FIX: Colspan disesuaikan menjadi 12
        } else {
            bookings.forEach(booking => {
                const row = document.createElement('tr');

                // Menentukan kelas CSS berdasarkan status untuk pewarnaan
                let statusClass = '';
                if (booking.status === 'confirmed') {
                    statusClass = 'status-confirmed';
                } else if (booking.status === 'canceled') {
                    statusClass = 'status-canceled';
                } else {
                    statusClass = 'status-pending';
                }

                const source = booking.company_name
                    ? `<span class="source-corporate">${booking.company_name}</span>`
                    : `<span class="source-public">Publik</span>`;

                // Membuat link untuk lampiran
                let attachmentsHtml = '';
                if (booking.guest_id_image) {
                    const imageUrl = `/${booking.guest_id_image.replace(/\\/g, '/')}`;
                    attachmentsHtml += `<a href="${imageUrl}" target="_blank" class="attachment-icon" title="Lihat ID Card"><i class="fas fa-id-card"></i></a>`;
                }
                if (booking.guarantee_letter) {
                    const pdfUrl = `/${booking.guarantee_letter.replace(/\\/g, '/')}`;
                    attachmentsHtml += `<a href="${pdfUrl}" target="_blank" class="attachment-icon" title="Lihat Surat Jaminan"><i class="fas fa-file-pdf"></i></a>`;
                }
                attachmentsHtml = attachmentsHtml || '<span>-</span>';

                row.innerHTML = `
                    <td>${booking.id}</td>
                    <td>${booking.guest_name}</td>
                    <td>${source}</td>
                    <td>${booking.guest_email}</td>
                    <td>${booking.hotel_name}</td>
                    <td>${booking.room_name}</td>
                    <td>${new Date(booking.check_in_date).toLocaleDateString('id-ID')}</td>
                    <td>${new Date(booking.check_out_date).toLocaleDateString('id-ID')}</td>
                    <td>${formatCurrency(booking.total_price)}</td>
                    <td>
                        <select class="booking-status-select ${statusClass}" data-id="${booking.id}">
                            <option value="pending" ${booking.status === 'pending' ? 'selected' : ''}>Pending</option>
                            <option value="confirmed" ${booking.status === 'confirmed' ? 'selected' : ''}>Confirmed</option>
                            <option value="canceled" ${booking.status === 'canceled' ? 'selected' : ''}>Canceled</option>
                        </select>
                    </td>
                    <td>${attachmentsHtml}</td>
                    <td>${new Date(booking.booking_date).toLocaleString('id-ID')}</td>
                `;
                bookingTableBody.appendChild(row);
            });
        }
    };

    const fetchAdminUsers = async () => {
        try {
            // FIX: Menggunakan endpoint yang sudah diperbarui dan tidak ambigu
            const res = await fetch(`${API_BASE_URL}/admin/admin-users`, { headers: authHeader });
            
            if (!res.ok) {
                const err = await res.json();
                // Jika error karena hak akses (bukan superadmin), jangan tampilkan error besar.
                // Cukup log di konsol dan biarkan tabel kosong.
                if (res.status === 403) {
                    console.warn('Akses ke data user admin ditolak (memerlukan Super Admin).');
                    adminUserTableBody.innerHTML = `<tr><td colspan="4">Anda tidak memiliki hak akses untuk melihat data ini.</td></tr>`;
                    // Sembunyikan juga menunya sebagai tindakan pengamanan tambahan
                    const adminUserMenu = document.querySelector('a[href="#admin-user-management"]');
                    if (adminUserMenu) adminUserMenu.parentElement.style.display = 'none';
                    return;
                }
                throw new Error(err.error || 'Gagal memuat data user admin.');
            }

            adminUsers = await res.json();
            renderAdminUserTable();
        } catch (error) {
            console.error('Error di fetchAdminUsers:', error);
            adminUserTableBody.innerHTML = `<tr><td colspan="4">${error.message}</td></tr>`;
        }
    };
    const fetchAndRenderBookings = async (page = 1, searchTerm = '', status = '', startDate = '', endDate = '') => {
        try {
            const searchParam = searchTerm ? `&search=${encodeURIComponent(searchTerm)}` : '';
            const statusParam = status ? `&status=${encodeURIComponent(status)}` : '';
            const startDateParam = startDate ? `&startDate=${startDate}` : '';
            const endDateParam = endDate ? `&endDate=${endDate}` : '';
            // FIX: Menggunakan endpoint admin yang benar (/admin/bookings)
            const res = await fetch(`${API_BASE_URL}/admin/bookings?page=${page}&limit=${bookingsPerPage}${searchParam}${statusParam}${startDateParam}${endDateParam}`, { headers: authHeader });
            
            if (!res.ok) {
                // FIX: Penanganan error yang lebih andal untuk mencegah crash JSON.parse
                const contentType = res.headers.get('content-type');
                let errorMessage = `Gagal memuat data booking (Status: ${res.status}).`;

                if (contentType && contentType.includes('application/json')) {
                    try {
                        const err = await res.json();
                        errorMessage = err.error || JSON.stringify(err);
                    } catch (e) {
                        // Biarkan pesan error default jika JSON tidak valid
                    }
                }
                throw new Error(errorMessage);
            }
            const data = await res.json();
            bookings = data.bookings;
            bookingCurrentPage = data.currentPage;
            bookingTotalPages = data.totalPages;
            bookingSearchTerm = searchTerm;
            bookingStatusFilterValue = status;
            bookingStartDate = startDate;
            bookingEndDate = endDate;

            renderBookingTable();
            renderBookingPagination();
            animateCountUp(totalBookingsEl, data.totalItems);
        } catch (error) {
            console.error('Gagal memuat data booking:', error);
            document.getElementById('booking-table-body').innerHTML = `<tr><td colspan="11">${error.message}</td></tr>`;
        }
    };

    const renderBookingPagination = () => {
        const paginationContainer = document.getElementById('booking-pagination');
        if (!paginationContainer) return;

        paginationContainer.innerHTML = '';

        if (bookingTotalPages <= 1) return;

        let paginationHTML = `
            <button class="btn btn-secondary" id="booking-prev-btn" ${bookingCurrentPage === 1 ? 'disabled' : ''}>&laquo; Sebelumnya</button>
            <span>Halaman ${bookingCurrentPage} dari ${bookingTotalPages}</span>
            <button class="btn btn-secondary" id="booking-next-btn" ${bookingCurrentPage === bookingTotalPages ? 'disabled' : ''}>Berikutnya &raquo;</button>
        `;
        paginationContainer.innerHTML = paginationHTML;

        document.getElementById('booking-prev-btn')?.addEventListener('click', () => {
            if (bookingCurrentPage > 1) fetchAndRenderBookings(bookingCurrentPage - 1, bookingSearchTerm, bookingStatusFilterValue, bookingStartDate, bookingEndDate);
        });

        document.getElementById('booking-next-btn')?.addEventListener('click', () => {
            if (bookingCurrentPage < bookingTotalPages) fetchAndRenderBookings(bookingCurrentPage + 1, bookingSearchTerm, bookingStatusFilterValue, bookingStartDate, bookingEndDate);
        });
    };

    const formatCurrency = (number) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency', currency: 'IDR', minimumFractionDigits: 0
        }).format(number);
    };

    const renderBookingChart = (stats) => {
        if (!bookingTrendChartCanvas) return;
    
        const labels = stats.map(stat => new Date(stat.day).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }));
        const data = stats.map(stat => stat.count);
    
        if (bookingTrendChart) {
            bookingTrendChart.destroy(); // Hancurkan chart lama sebelum membuat yang baru
        }
    
        const ctx = bookingTrendChartCanvas.getContext('2d');
        bookingTrendChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Jumlah Booking',
                    data: data,
                    borderColor: 'rgba(0, 100, 210, 1)',
                    backgroundColor: 'rgba(0, 100, 210, 0.1)',
                    fill: true,
                    tension: 0.3
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: { beginAtZero: true, ticks: { stepSize: 1 } }
                }
            }
        });
    };

    // --- Modal Logic ---
    const openHotelModal = () => {
        hotelModal.classList.add('active');
        hotelModalOverlay.classList.add('active');
    };

    const closeHotelModal = () => {
        hotelModal.classList.remove('active');
        hotelModalOverlay.classList.remove('active');
        hotelForm.reset();
        document.getElementById('hotel-id').value = '';
    };

    const openTestimonialModal = () => {
        testimonialModal.classList.add('active');
        testimonialModalOverlay.classList.add('active');
    };

    const closeTestimonialModal = () => {
        testimonialModal.classList.remove('active');
        testimonialModalOverlay.classList.remove('active');
        testimonialForm.reset();
        document.getElementById('testimonial-id').value = '';
    };

    const openPromoModal = (promo = null) => {
        promoForm.reset();
        const promoIdInput = document.getElementById('promo-id');
        const promoImageUrlInput = document.getElementById('promo-image-url');
        const promoTitleInput = document.getElementById('promo-title');
        const promoLinkUrlInput = document.getElementById('promo-link-url');
        const promoHotelIdSelect = document.getElementById('promo-hotel-id');

        // Isi dropdown hotel
        promoHotelIdSelect.innerHTML = '<option value="">-- Tidak ada link ke hotel spesifik --</option>';
        hotels.forEach(hotel => {
            const option = document.createElement('option');
            option.value = hotel.id;
            option.textContent = hotel.name;
            promoHotelIdSelect.appendChild(option);
        });

        if (promo) {
            promoModalTitle.textContent = 'Edit Promo';
            promoIdInput.value = promo.id;
            promoImageUrlInput.value = promo.image_url;
            promoTitleInput.value = promo.title;
            promoLinkUrlInput.value = promo.link_url;
            promoHotelIdSelect.value = promo.hotel_id || '';
        } else {
            promoModalTitle.textContent = 'Tambah Promo Baru';
            promoIdInput.value = '';
        }
        promoModal.classList.add('active');
        promoModalOverlay.classList.add('active');
    };

    const closePromoModal = () => {
        promoModal.classList.remove('active');
        promoModalOverlay.classList.remove('active');
    };

    const openApproveModal = (submissionId, companyName) => {
        approveSubmissionIdInput.value = submissionId;
        approveCompanyName.textContent = companyName;
        populateHotelSelect(approveHotelAccessSelect); // Isi pilihan hotel
        approveModal.classList.add('active');
        approveModalOverlay.classList.add('active');
    };
    const closeApproveModal = () => {
        approveModal.classList.remove('active');
        approveModalOverlay.classList.remove('active');
        approveForm.reset();
    };

    const openEditSubmissionModal = (submission) => {
        // Populate the form with new, more detailed fields
        // Note: The corresponding HTML in admin.html must be updated with these IDs.
        document.getElementById('edit-submission-id').value = submission.id;
        document.getElementById('edit-company-name').value = submission.company_name;
        document.getElementById('edit-company-npwp').value = submission.company_npwp;
        document.getElementById('edit-company-address').value = submission.company_address;
        document.getElementById('edit-contact-person-name').value = submission.contact_person_name;
        document.getElementById('edit-contact-person-email').value = submission.contact_person_email;
        document.getElementById('edit-contact-person-phone').value = submission.contact_person_phone;
        document.getElementById('edit-finance-pic-email').value = submission.finance_pic_email;
        document.getElementById('edit-credit-estimation').value = submission.credit_estimation;

        // Handle radio button for service type
        const serviceTypeRadio = document.querySelector(`input[name="edit-service-type"][value="${submission.service_type}"]`);
        if (serviceTypeRadio) serviceTypeRadio.checked = true;

        editSubmissionModal.classList.add('active');
        editSubmissionModalOverlay.classList.add('active');
    };
    const closeEditSubmissionModal = () => {
        editSubmissionModal.classList.remove('active');
        editSubmissionModalOverlay.classList.remove('active');
        editSubmissionForm.reset();
    };

    const openEditCompanyModal = (company) => {
        document.getElementById('edit-company-id').value = company.id;
        document.getElementById('edit-company-name').textContent = company.name;
        document.getElementById('edit-credit-limit').value = company.credit_limit;
        // Isi dan pilih hotel yang sudah diizinkan
        populateHotelSelect(editCompanyHotelAccessSelect, company.accessible_hotel_ids || []);
        editCompanyModal.classList.add('active');
        editCompanyModalOverlay.classList.add('active');
    };
    const closeEditCompanyModal = () => {
        editCompanyModal.classList.remove('active');
        editCompanyModalOverlay.classList.remove('active');
        editCompanyForm.reset();
    };

    const openCreateUserModal = (companyId, companyName) => {
        createUserCompanyIdInput.value = companyId;
        createUserCompanyName.textContent = companyName;
        createUserModal.classList.add('active');
        createUserModalOverlay.classList.add('active');
    };
    const closeCreateUserModal = () => {
        createUserModal.classList.remove('active');
        createUserModalOverlay.classList.remove('active');
        createUserForm.reset();
    };

    const openManageUserModal = async (companyId, companyName) => {
        try {
            // Endpoint ini perlu Anda buat di backend
            const response = await fetch(`${API_BASE_URL}/admin/companies/${companyId}/user`, { headers: authHeader });
            if (!response.ok) {
                throw new Error('Gagal memuat data user. Mungkin user belum dibuat atau terjadi kesalahan server.');
            }
            const user = await response.json(); // Expects { id, email, company_id }

            document.getElementById('manage-user-id').value = user.id;
            document.getElementById('manage-user-company-name').textContent = companyName;
            document.getElementById('manage-user-email').value = user.email;
            document.getElementById('reset-user-password').value = ''; // Clear password field

            manageUserModalTitle.textContent = `Kelola User untuk ${companyName}`;
            manageUserModal.classList.add('active');
            manageUserModalOverlay.classList.add('active');

        } catch (error) {
            alert(error.message);
            console.error('Error fetching user for company:', error);
        }
    };

    const closeManageUserModal = () => {
        manageUserModal.classList.remove('active');
        manageUserModalOverlay.classList.remove('active');
        manageUserForm.reset();
    };

    const openCompanyPriceModal = async (companyId, companyName) => {
        companyPriceModalTitle.textContent = `Kelola Harga untuk ${companyName}`;
        document.getElementById('price-form-company-id').value = companyId;

        companyPriceModal.classList.add('active');
        companyPriceModalOverlay.classList.add('active');

        try {
            const response = await fetch(`${API_BASE_URL}/admin/companies/${companyId}/prices`, {
                headers: authHeader
            });
            if (!response.ok) throw new Error('Gagal memuat data harga.');
            const priceData = await response.json(); // Ekspektasi: [{ hotelName, roomId, roomName, optionName, defaultPrice, specialPrice }, ...]

            if (priceData.length === 0) {
                companyPriceTableBody.innerHTML = `
                    <tr><td colspan="4" style="text-align: center; padding: 2rem;">Tidak ada kamar yang bisa diatur untuk perusahaan ini.<br><small>Pastikan perusahaan ini memiliki akses ke hotel dan hotel tersebut memiliki tipe kamar dengan paket harga yang sudah diatur.</small></td></tr>
                `;
                return;
            }

            companyPriceTableBody.innerHTML = ''; // Kosongkan tabel

            // Kelompokkan data berdasarkan hotel dan kamar untuk menggunakan rowspan
            const groupedData = priceData.reduce((acc, item) => {
                if (!acc[item.hotelName]) acc[item.hotelName] = {};
                if (!acc[item.hotelName][item.roomName]) acc[item.hotelName][item.roomName] = [];
                acc[item.hotelName][item.roomName].push(item);
                return acc;
            }, {});

            // Render tabel dengan rowspan
            for (const hotelName in groupedData) {
                let isFirstHotelRow = true;
                for (const roomName in groupedData[hotelName]) {
                    const packages = groupedData[hotelName][roomName];
                    let isFirstRoomRow = true;
                    packages.forEach(pkg => {
                        const row = companyPriceTableBody.insertRow();
                        let rowHTML = '';

                        if (isFirstHotelRow) {
                            const hotelRowspan = Object.values(groupedData[hotelName]).reduce((sum, rooms) => sum + rooms.length, 0);
                            rowHTML += `<td rowspan="${hotelRowspan}">${hotelName}</td>`;
                            isFirstHotelRow = false;
                        }

                        if (isFirstRoomRow) {
                            rowHTML += `<td rowspan="${packages.length}">${roomName}</td>`;
                            isFirstRoomRow = false;
                        }

                        rowHTML += `
                            <td>
                                <div>${pkg.optionName}</div>
                                <small>(${formatCurrency(pkg.defaultPrice)})</small>
                            </td>
                            <td>
                                <input type="number" class="form-control" data-room-id="${pkg.roomId}" data-option-name="${pkg.optionName}" value="${pkg.specialPrice || ''}" placeholder="Harga Khusus">
                            </td>
                        `;
                        row.innerHTML = rowHTML;
                    });
                }
            }

        } catch (error) {
            console.error('Error fetching company prices:', error);
            companyPriceTableBody.innerHTML = `<tr><td colspan="4">Gagal memuat data. ${error.message}</td></tr>`;
        }
    };

    const closeCompanyPriceModal = () => {
        companyPriceModal.classList.remove('active');
        companyPriceModalOverlay.classList.remove('active');
        companyPriceForm.reset();
    };

    // --- Employee Management Functions ---
    let currentManagingCompanyId = null;

    const openEmployeeManagementModal = (companyId, companyName) => {
        currentManagingCompanyId = companyId;
        employeeManagementModalTitle.textContent = `Kelola Karyawan untuk ${companyName}`;
        employeeManagementModal.classList.add('active');
        employeeManagementModalOverlay.classList.add('active');
        fetchAndRenderCompanyEmployees(companyId);
    };

    const closeEmployeeManagementModal = () => {
        employeeManagementModal.classList.remove('active');
        employeeManagementModalOverlay.classList.remove('active');
        currentManagingCompanyId = null;
        companyEmployees = [];
    };

    const fetchAndRenderCompanyEmployees = async (companyId) => {
        employeeTableBody.innerHTML = '<tr><td colspan="4">Memuat data karyawan...</td></tr>';
        try {
            // Endpoint ini perlu dibuat di backend
            const response = await fetch(`${API_BASE_URL}/admin/companies/${companyId}/employees`, { headers: authHeader });
            
            // Penanganan error yang lebih baik
            if (!response.ok) {
                const contentType = response.headers.get('content-type');
                let errorMessage = `Gagal memuat data karyawan (Status: ${response.status}).`;

                // Jika responsnya JSON, kita bisa parse pesannya
                if (contentType && contentType.includes('application/json')) {
                    const err = await response.json();
                    errorMessage = err.error || JSON.stringify(err);
                }
                // Jika bukan JSON (kemungkinan HTML), kita tidak coba parse
                throw new Error(errorMessage);
            }
            companyEmployees = await response.json();
            renderCompanyEmployeesTable();
        } catch (error) {
            console.error('Error fetching company employees:', error);
            employeeTableBody.innerHTML = `<tr><td colspan="4" style="color: red;">${error.message}</td></tr>`;
        }
    };

    const renderCompanyEmployeesTable = () => {
        employeeTableBody.innerHTML = '';
        if (companyEmployees.length === 0) {
            employeeTableBody.innerHTML = '<tr><td colspan="4" style="text-align: center;">Belum ada karyawan yang ditambahkan.</td></tr>';
            return;
        }
        companyEmployees.forEach(employee => {
            const row = employeeTableBody.insertRow();
            const roleText = employee.role === 'approver' ? 'Approver' : 'Karyawan';
            row.innerHTML = `
                <td>${employee.full_name}</td>
                <td>${employee.email}</td>
                <td><span class="role-${employee.role}">${roleText}</span></td>
                <td>
                    <button class="btn btn-edit btn-edit-employee" data-id="${employee.id}">Edit</button>
                    <button class="btn btn-delete btn-delete-employee" data-id="${employee.id}">Hapus</button>
                </td>
            `;
        });
    };

    const openEmployeeFormModal = (employee = null) => {
        employeeForm.reset();
        document.getElementById('employee-company-id').value = currentManagingCompanyId;
        const passwordInput = document.getElementById('employee-password');

        if (employee) { // Mode Edit
            document.getElementById('employee-form-modal-title').textContent = 'Edit Karyawan';
            document.getElementById('employee-id').value = employee.id;
            document.getElementById('employee-full-name').value = employee.full_name;
            document.getElementById('employee-email').value = employee.email;
            document.getElementById('employee-role').value = employee.role;
            passwordInput.required = false;
        } else { // Mode Tambah
            document.getElementById('employee-form-modal-title').textContent = 'Tambah Karyawan Baru';
            document.getElementById('employee-id').value = '';
            passwordInput.required = true;
        }
        employeeFormModal.classList.add('active');
        employeeFormModalOverlay.classList.add('active');
    };

    const closeEmployeeFormModal = () => {
        employeeFormModal.classList.remove('active');
        employeeFormModalOverlay.classList.remove('active');
    };

    const handleDeleteEmployee = async (employeeId) => {
        if (confirm('Apakah Anda yakin ingin menghapus karyawan ini? Tindakan ini tidak dapat dibatalkan.')) {
            try {
                const response = await fetch(`${API_BASE_URL}/admin/employees/${employeeId}`, { method: 'DELETE', headers: authHeader });
                if (!response.ok) {
                    const err = await response.json();
                    throw new Error(err.error || 'Gagal menghapus karyawan.');
                }
                alert('Karyawan berhasil dihapus.');
                fetchAndRenderCompanyEmployees(currentManagingCompanyId);
            } catch (error) {
                alert(`Terjadi kesalahan: ${error.message}`);
            }
        }
    };
    // --- Event Listeners ---

    // Hamburger Menu Logic
    if (hamburgerBtn && adminLayout && mobileOverlay && adminSidebar) {
        hamburgerBtn.addEventListener('click', () => {
            adminLayout.classList.toggle('sidebar-visible');
        });

        mobileOverlay.addEventListener('click', () => {
            adminLayout.classList.remove('sidebar-visible');
        });

        // Close sidebar when a nav link is clicked on mobile
        adminSidebar.addEventListener('click', (e) => {
            // Cek apakah yang diklik adalah link navigasi
            if (e.target.closest('.nav-link')) {
                adminLayout.classList.remove('sidebar-visible');
            }
        });
    }

    // Logout button
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            // Tampilkan konfirmasi sebelum logout
            if (confirm('Apakah Anda yakin ingin logout?')) {
                // Hapus token dari localStorage
                localStorage.removeItem('adminAuthToken');
                // Arahkan kembali ke halaman login
                window.location.href = 'admin-login.html';
            }
        });
    }

    // Sidebar navigation
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const hash = e.currentTarget.getAttribute('href'); // FIX: Gunakan currentTarget untuk selalu mendapatkan elemen <a>
            window.location.hash = hash;
        });
    });

    // Handle hash change for navigation
    window.addEventListener('hashchange', () => {
        showSection(window.location.hash || '#dashboard');
    });

    // Admin User Management Tab functionality
    const adminUserManagementSection = document.getElementById('admin-user-management');
    if (adminUserManagementSection) {
        const tabNav = adminUserManagementSection.querySelector('.tab-nav');
        if (tabNav) {
            tabNav.addEventListener('click', (e) => {
                // Pastikan yang diklik adalah tombol tab dan bukan yang sudah aktif
                if (e.target.classList.contains('tab-btn') && !e.target.classList.contains('active')) {
                    const targetTabId = e.target.dataset.tab;
                    const tabContainer = e.target.closest('.tab-container');

                    // Nonaktifkan semua tombol dan konten tab
                    tabContainer.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
                    tabContainer.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));

                    // Aktifkan tombol yang diklik dan konten yang sesuai
                    e.target.classList.add('active');
                    document.getElementById(targetTabId).classList.add('active');
                }
            });
        }
    }

    // Admin user table actions (Edit/Delete)
    adminUserTableBody.addEventListener('click', async (e) => {
        const target = e.target;
        if (target.dataset.type !== 'admin-user') return;

        const id = target.dataset.id;

        if (target.classList.contains('btn-edit')) {
            const user = adminUsers.find(u => u.id == id);
            if (user) openAdminUserModal(user);
            return;
        }

        if (target.classList.contains('btn-delete')) {
            if (confirm('Apakah Anda yakin ingin menghapus user admin ini?')) {
                try {
                    const res = await fetch(`${API_BASE_URL}/admin/admin-users/${id}`, { method: 'DELETE', headers: authHeader });
                    if (!res.ok) {
                        const err = await res.json();
                        throw new Error(err.error || 'Gagal menghapus user.');
                    }
                    alert('User berhasil dihapus.');
                    fetchAdminUsers(); // Refresh tabel
                } catch (error) {
                    alert(`Terjadi kesalahan: ${error.message}`);
                }
            }
        }
    });
    // Hotel table actions (Edit/Delete)
    hotelTableBody.addEventListener('click', (e) => {
        const target = e.target;
        const id = parseInt(target.dataset.id);

        if (target.classList.contains('btn-delete')) {
            if (confirm('Apakah Anda yakin ingin menghapus hotel ini?')) {
                fetch(`${API_BASE_URL}/admin/hotels/${id}`, { method: 'DELETE', headers: authHeader })
                    .then(() => fetchAllData());
            }
        }

        if (target.classList.contains('btn-manage-rooms')) {
            roomManager.open(target.dataset.id, target.dataset.name);
        }

        if (target.classList.contains('btn-edit')) {
            const hotel = hotels.find(h => h.id === id);
            if (hotel) {
                hotelModalTitle.textContent = 'Edit Hotel';
                document.getElementById('hotel-id').value = hotel.id;
                document.getElementById('hotel-name').value = hotel.name;
                document.getElementById('hotel-description').value = hotel.description || '';
                document.getElementById('hotel-amenities').value = Array.isArray(hotel.amenities) ? hotel.amenities.join(', ') : '';
                document.getElementById('hotel-image-url').value = hotel.image_url;
                openHotelModal();
            }
        }
    });
    
    submissionTableBody.addEventListener('click', (e) => {
        const target = e.target;
        const id = parseInt(target.dataset.id);

        // Handle print submission button
        const printSubmissionBtn = e.target.closest('.btn-print-submission');
        if (printSubmissionBtn) {
            e.preventDefault();
            const submissionId = printSubmissionBtn.dataset.id;
            const submission = submissions.find(s => s.id == submissionId);
            if (submission) {
                generateSubmissionPDF(submission);
            } else {
                showToast('Data pengajuan tidak ditemukan.', 'error');
            }
            return;
        }

        if (target.classList.contains('btn-delete')) {
            if (confirm('Apakah Anda yakin ingin menghapus pengajuan ini?')) {
                // FIX: Menggunakan endpoint admin yang benar
                fetch(`${API_BASE_URL}/admin/submissions/${id}`, { method: 'DELETE', headers: authHeader })
                    .then(() => fetchAllData());
            }
        }

        if (target.classList.contains('btn-approve')) {
            const companyName = target.dataset.companyName;
            openApproveModal(id, companyName);
        }

        if (target.classList.contains('btn-edit-submission')) {
            const submission = submissions.find(s => s.id === id);
            if (submission) {
                openEditSubmissionModal(submission);
            }
        }

        if (target.classList.contains('btn-verify')) {
            if (confirm('Anda akan mengubah status pengajuan ini menjadi "Dalam Proses Verifikasi" dan mengirim notifikasi email ke klien. Lanjutkan?')) {
                // FIX: Menggunakan endpoint admin yang benar
                fetch(`${API_BASE_URL}/admin/submissions/${id}/status`, {
                    method: 'PUT',
                    headers: { ...authHeader, 'Content-Type': 'application/json' },
                    body: JSON.stringify({ status: 'verifying' })
                })
                .then(res => {
                    if (!res.ok) throw new Error('Gagal mengubah status.');
                    alert('Status berhasil diubah dan notifikasi email telah dikirim.');
                    fetchAllData();
                })
                .catch(err => alert(err.message));
            }
        }

        if (target.classList.contains('btn-reject')) {
            if (confirm('Anda yakin ingin MENOLAK pengajuan ini? Email penolakan akan dikirim.')) {
                // FIX: Menggunakan endpoint admin yang benar
                fetch(`${API_BASE_URL}/admin/submissions/${id}/status`, {
                    method: 'PUT',
                    headers: { ...authHeader, 'Content-Type': 'application/json' },
                    body: JSON.stringify({ status: 'rejected' })
                })
                .then(res => {
                    if (!res.ok) throw new Error('Gagal menolak pengajuan.');
                    alert('Pengajuan telah ditolak dan email notifikasi telah dikirim.');
                    fetchAllData();
                })
                .catch(err => alert(err.message));
            }
        }
    });

    // Testimonial table actions (Edit/Delete)
    testimonialTableBody.addEventListener('click', (e) => {
        const target = e.target;
        if (!target.classList.contains('btn')) return; // Guard clause

        const id = parseInt(target.dataset.id);

        if (target.classList.contains('btn-delete')) {
            if (confirm('Apakah Anda yakin ingin menghapus testimoni ini?')) {
                fetch(`${API_BASE_URL}/admin/testimonials/${id}`, { method: 'DELETE', headers: authHeader })
                    .then(() => fetchAllData());
            }
        }

        if (target.classList.contains('btn-edit')) {
            const testimonial = testimonials.find(t => t.id === id);
            if (testimonial) {
                testimonialModalTitle.textContent = 'Edit Testimoni';
                document.getElementById('testimonial-id').value = testimonial.id;
                document.getElementById('testimonial-author').value = testimonial.author;
                document.getElementById('testimonial-title').value = testimonial.title;
                document.getElementById('testimonial-quote').value = testimonial.quote;
                document.getElementById('testimonial-image-url').value = testimonial.image_url;
                openTestimonialModal();
            }
        }
    });

    // Promo table actions (Edit/Delete)
    if (promoTableBody) {
        promoTableBody.addEventListener('click', (e) => {
            const target = e.target;
            if (target.dataset.type !== 'promo') return;

            const id = parseInt(target.dataset.id);

            if (target.classList.contains('btn-edit')) {
                const promo = promos.find(p => p.id === id);
                if (promo) openPromoModal(promo);
            }

            if (target.classList.contains('btn-delete')) {
                if (confirm('Apakah Anda yakin ingin menghapus promo ini?')) {
                    fetch(`${API_BASE_URL}/admin/promos/${id}`, { method: 'DELETE', headers: authHeader })
                        .then(res => {
                            if (!res.ok) throw new Error('Gagal menghapus promo.');
                            alert('Promo berhasil dihapus.');
                            fetchAllData();
                        })
                        .catch(err => alert(err.message));
                }
            }
        });
    }

    // Promo Modal open/close/submit
    if (addPromoBtn) addPromoBtn.addEventListener('click', () => openPromoModal(null));
    if (promoModalCloseBtn) promoModalCloseBtn.addEventListener('click', closePromoModal);
    if (promoModalOverlay) promoModalOverlay.addEventListener('click', closePromoModal);
    if (promoForm) {
        promoForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const id = document.getElementById('promo-id').value;
            const promoData = {
                image_url: document.getElementById('promo-image-url').value,
                title: document.getElementById('promo-title').value,
                link_url: document.getElementById('promo-link-url').value,
                hotel_id: document.getElementById('promo-hotel-id').value,
            };
            const method = id ? 'PUT' : 'POST';
            const url = id ? `${API_BASE_URL}/admin/promos/${id}` : `${API_BASE_URL}/admin/promos`;

            try {
                const res = await fetch(url, { method, headers: { ...authHeader, 'Content-Type': 'application/json' }, body: JSON.stringify(promoData) });
                if (!res.ok) { const err = await res.json(); throw new Error(err.error || 'Gagal menyimpan promo.'); }
                alert('Promo berhasil disimpan!');
                closePromoModal();
                fetchAllData();
            } catch (error) { alert(`Terjadi kesalahan: ${error.message}`); }
        });
    }

    // Form submission for editing a submission
    editSubmissionForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('edit-submission-id').value;

        // Collect data from the new, more detailed form fields
        const updatedData = {
            company_name: document.getElementById('edit-company-name').value,
            company_npwp: document.getElementById('edit-company-npwp').value,
            company_address: document.getElementById('edit-company-address').value,
            contact_person_name: document.getElementById('edit-contact-person-name').value,
            contact_person_email: document.getElementById('edit-contact-person-email').value,
            contact_person_phone: document.getElementById('edit-contact-person-phone').value,
            finance_pic_email: document.getElementById('edit-finance-pic-email').value,
            credit_estimation: parseFloat(document.getElementById('edit-credit-estimation').value) || 0,
            service_type: document.querySelector('input[name="edit-service-type"]:checked')?.value,
        };

        // Basic validation
        if (!updatedData.company_name || !updatedData.company_npwp || !updatedData.contact_person_name) {
            alert('Nama Perusahaan, NPWP, dan Nama PIC wajib diisi.');
            return;
        }

        try {
            // FIX: Menggunakan endpoint admin yang benar
            const response = await fetch(`${API_BASE_URL}/admin/submissions/${id}`, {
                method: 'PUT',
                headers: { ...authHeader, 'Content-Type': 'application/json' },
                body: JSON.stringify(updatedData)
            });

            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.error || 'Gagal memperbarui pengajuan.');
            }

            alert('Data pengajuan berhasil diperbarui!');
            closeEditSubmissionModal();
            fetchAllData(); // Refresh data
        } catch (error) {
            console.error('Error updating submission:', error);
            alert(`Terjadi kesalahan: ${error.message}`);
        }
    });

    // Form submission for approving a submission
    approveForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const submissionId = approveSubmissionIdInput.value;
        const creditLimit = document.getElementById('credit-limit').value;
        const selectedHotelIds = Array.from(approveHotelAccessSelect.selectedOptions).map(opt => parseInt(opt.value));

        if (!creditLimit || parseFloat(creditLimit) <= 0) {
            alert('Harap masukkan limit kredit yang valid.');
            return;
        }

        const body = {
            submission_id: parseInt(submissionId),
            credit_limit: parseFloat(creditLimit),
            hotel_ids: selectedHotelIds // Kirim array ID hotel
        };

        try {
            // FIX: Menggunakan endpoint admin yang benar
            const response = await fetch(`${API_BASE_URL}/admin/companies`, {
                method: 'POST',
                headers: { ...authHeader, 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });

            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.error || 'Gagal menyetujui pengajuan.');
            }

            alert('Pengajuan berhasil disetujui dan perusahaan telah dibuat!');
            closeApproveModal();
            fetchAllData(); // Refresh data di semua tabel
        } catch (error) {
            console.error('Error approving submission:', error);
            alert(`Terjadi kesalahan: ${error.message}`);
        }
    });

    // Modal open/close
    addHotelBtn.addEventListener('click', () => {
        hotelModalTitle.textContent = 'Tambah Hotel Baru';
        openHotelModal();
    });
    hotelModalCloseBtn.addEventListener('click', closeHotelModal);
    hotelModalOverlay.addEventListener('click', closeHotelModal);

    addTestimonialBtn.addEventListener('click', () => {
        testimonialModalTitle.textContent = 'Tambah Testimoni Baru';
        openTestimonialModal();
    });
    testimonialModalCloseBtn.addEventListener('click', closeTestimonialModal);
    testimonialModalOverlay.addEventListener('click', closeTestimonialModal);

    approveModalCloseBtn.addEventListener('click', closeApproveModal);
    approveModalOverlay.addEventListener('click', closeApproveModal);

    if (editSubmissionModalCloseBtn) {
        editSubmissionModalCloseBtn.addEventListener('click', closeEditSubmissionModal);
    }
    if (editSubmissionModalOverlay) {
        editSubmissionModalOverlay.addEventListener('click', closeEditSubmissionModal);
    }

    editCompanyModalCloseBtn.addEventListener('click', closeEditCompanyModal);
    editCompanyModalOverlay.addEventListener('click', closeEditCompanyModal);


    createUserModalCloseBtn.addEventListener('click', closeCreateUserModal);
    createUserModalOverlay.addEventListener('click', closeCreateUserModal);

    // Listener untuk modal utama Kelola Kamar (sekarang dikelola oleh roomManager)
    roomManagementModalCloseBtn.addEventListener('click', () => roomManager.close());
    roomManagementModalOverlay.addEventListener('click', () => roomManager.close());

    // Listener untuk form kamar (sekarang dikelola oleh roomManager)
    roomFormModalCloseBtn.addEventListener('click', () => roomManager.closeFormModal());
    roomFormModalOverlay.addEventListener('click', () => roomManager.closeFormModal());

    companyTableBody.addEventListener('click', (e) => {
        const target = e.target;
        if (target.classList.contains('btn-create-user')) {
            const companyId = e.target.dataset.id;
            const companyName = e.target.dataset.name;
            openCreateUserModal(companyId, companyName);
        }
        if (target.classList.contains('btn-manage-user')) {
            const companyId = target.dataset.id;
            const companyName = target.dataset.name;
            openManageUserModal(companyId, companyName);
        }
        if (target.classList.contains('btn-manage-employees')) {
            const companyId = e.target.dataset.id;
            const companyName = e.target.dataset.name;
            openEmployeeManagementModal(companyId, companyName);
        }
        if (target.classList.contains('manage-price-btn')) {
            const companyId = e.target.dataset.id;
            const companyName = e.target.dataset.name;
            openCompanyPriceModal(companyId, companyName);
        }
        if (target.classList.contains('btn-edit-company')) {
            const companyId = e.target.dataset.id;
            const company = companies.find(c => c.id == companyId); // Temukan data perusahaan dari state
            if (company) openEditCompanyModal(company);
        }
    });

    // Employee Management Listeners
    employeeManagementModalCloseBtn.addEventListener('click', closeEmployeeManagementModal);
    employeeManagementModalOverlay.addEventListener('click', closeEmployeeManagementModal);
    addEmployeeBtn.addEventListener('click', () => openEmployeeFormModal(null));
    employeeFormModalCloseBtn.addEventListener('click', closeEmployeeFormModal);
    employeeFormModalOverlay.addEventListener('click', closeEmployeeFormModal);

    employeeTableBody.addEventListener('click', (e) => {
        const target = e.target;
        const id = target.dataset.id;
        if (target.classList.contains('btn-edit-employee')) {
            const employee = companyEmployees.find(emp => emp.id == id);
            if (employee) openEmployeeFormModal(employee);
        }
        if (target.classList.contains('btn-delete-employee')) {
            handleDeleteEmployee(id);
        }
    });

    companyPriceModalCloseBtn.addEventListener('click', closeCompanyPriceModal);
    companyPriceModalOverlay.addEventListener('click', closeCompanyPriceModal);

    manageUserModalCloseBtn.addEventListener('click', closeManageUserModal);
    manageUserModalOverlay.addEventListener('click', closeManageUserModal);

    // Company Price form submission
    companyPriceForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const companyId = document.getElementById('price-form-company-id').value;
        const inputs = document.querySelectorAll('#company-price-table-body input[data-room-id]');

        const pricesToUpdate = [];
        inputs.forEach(input => {
            pricesToUpdate.push({
                room_id: input.dataset.roomId,
                option_name: input.dataset.optionName, // Ambil nama paket dari data attribute
                price: input.value ? parseFloat(input.value) : null
            });
        });

        try {
            const response = await fetch(`${API_BASE_URL}/admin/companies/${companyId}/prices`, {
                method: 'POST',
                headers: { ...authHeader, 'Content-Type': 'application/json' },
                body: JSON.stringify({ prices: pricesToUpdate })
            });
            if (!response.ok) throw new Error('Gagal menyimpan harga khusus.');
            alert('Harga khusus berhasil diperbarui!');
            closeCompanyPriceModal();
        } catch (error) {
            console.error('Error saving company prices:', error);
            alert(`Terjadi kesalahan: ${error.message}`);
        }
    });

    // Edit Company form submission
    editCompanyForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const companyId = document.getElementById('edit-company-id').value;
        const creditLimit = document.getElementById('edit-credit-limit').value;
        const selectedHotelIds = Array.from(editCompanyHotelAccessSelect.selectedOptions).map(opt => parseInt(opt.value));

        try {
            const response = await fetch(`${API_BASE_URL}/admin/companies/${companyId}`, {
                method: 'PUT',
                headers: { ...authHeader, 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    credit_limit: parseFloat(creditLimit),
                    hotel_ids: selectedHotelIds // Kirim juga daftar hotel yang diperbarui
                })
            });

            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.error || 'Gagal memperbarui data perusahaan.');
            }

            alert('Data perusahaan berhasil diperbarui!');
            closeEditCompanyModal();
            fetchAllData(); // Refresh data to show the new credit limit
        } catch (error) {
            console.error('Error updating company:', error);
            alert(`Terjadi kesalahan: ${error.message}`);
        }
    });

    // Employee Form submission
    employeeForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const employeeId = document.getElementById('employee-id').value;
        const password = document.getElementById('employee-password').value;

        if (!employeeId && !password) {
            alert('Password wajib diisi untuk karyawan baru.');
            return;
        }

        const employeeData = {
            company_id: document.getElementById('employee-company-id').value,
            full_name: document.getElementById('employee-full-name').value,
            email: document.getElementById('employee-email').value,
            role: document.getElementById('employee-role').value,
        };
        if (password) employeeData.password = password;

        const method = employeeId ? 'PUT' : 'POST';
        const url = employeeId ? `${API_BASE_URL}/admin/employees/${employeeId}` : `${API_BASE_URL}/admin/employees`;

        try {
            const response = await fetch(url, {
                method,
                headers: { ...authHeader, 'Content-Type': 'application/json' },
                body: JSON.stringify(employeeData)
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error || 'Gagal menyimpan data karyawan.');
            alert('Data karyawan berhasil disimpan!');
            closeEmployeeFormModal();
            fetchAndRenderCompanyEmployees(currentManagingCompanyId);
        } catch (error) { alert(`Terjadi kesalahan: ${error.message}`); }
    });

    // Create User form submission
    createUserForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const companyId = createUserCompanyIdInput.value;
        const fullName = document.getElementById('create-user-full-name').value;
        const email = document.getElementById('create-user-email').value;
        const password = document.getElementById('create-user-password').value;

        try {
            const response = await fetch(`${API_BASE_URL}/admin/corporate-users`, {
                method: 'POST',
                headers: { ...authHeader, 'Content-Type': 'application/json' },
                body: JSON.stringify({ company_id: companyId, full_name: fullName, email, password })
            });

            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.error || 'Gagal membuat user.');
            }

            alert('User berhasil dibuat!');
            closeCreateUserModal();
            fetchAllData(); // Refresh data untuk update status di tabel
        } catch (error) {
            console.error('Error creating user:', error);
            alert(`Terjadi kesalahan: ${error.message}`);
        }
    });

    // Event listener untuk mengubah status booking
    document.getElementById('booking-table-body').addEventListener('change', async (e) => {
        if (e.target.classList.contains('booking-status-select')) {
            const bookingId = e.target.dataset.id;
            const newStatus = e.target.value;
            const selectElement = e.target;

            // Simpan status asli jika terjadi kegagalan
            const originalStatus = bookings.find(b => b.id == bookingId)?.status;

            if (!confirm(`Anda yakin ingin mengubah status booking #${bookingId} menjadi "${newStatus}"?`)) {
                selectElement.value = originalStatus; // Kembalikan jika dibatalkan
                return;
            }

            try {
                const response = await fetch(`${API_BASE_URL}/admin/bookings/${bookingId}/status`, {
                    method: 'PUT',
                    headers: { ...authHeader, 'Content-Type': 'application/json' },
                    body: JSON.stringify({ status: newStatus })
                });

                if (!response.ok) {
                    const err = await response.json();
                    throw new Error(err.error || 'Gagal mengubah status booking.');
                }

                // Perbarui state lokal untuk menghindari refresh halaman
                const bookingToUpdate = bookings.find(b => b.id == bookingId);
                if (bookingToUpdate) {
                    bookingToUpdate.status = newStatus;
                }

                // Perbarui class untuk styling
                selectElement.className = `booking-status-select ${newStatus === 'confirmed' ? 'status-confirmed' : newStatus === 'canceled' ? 'status-canceled' : 'status-pending'}`;

                alert(`Status booking #${bookingId} berhasil diubah.`);
            } catch (error) {
                console.error('Error updating booking status:', error);
                alert(`Terjadi kesalahan: ${error.message}`);
                selectElement.value = originalStatus; // Kembalikan jika gagal
            }
        }
    });

    // Manage User form submission (for password reset)
    manageUserForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const userId = document.getElementById('manage-user-id').value;
        const newPassword = document.getElementById('reset-user-password').value;

        if (!newPassword) {
            alert('Tidak ada perubahan yang disimpan. Password tidak diisi.');
            return;
        }

        if (confirm('Apakah Anda yakin ingin mereset password untuk user ini?')) {
            try {
                // FIX: Menggunakan endpoint yang lebih spesifik dan tidak ambigu
                const response = await fetch(`${API_BASE_URL}/admin/corporate-users/${userId}/password`, {
                    method: 'PUT',
                    headers: { ...authHeader, 'Content-Type': 'application/json' },
                    body: JSON.stringify({ password: newPassword })
                });

                if (!response.ok) {
                    const err = await response.json();
                    throw new Error(err.error || 'Gagal mereset password.');
                }

                alert('Password user berhasil direset!');
                closeManageUserModal();
            } catch (error) {
                console.error('Error resetting password:', error);
                alert(`Terjadi kesalahan: ${error.message}`);
            }
        }
    });

    // Delete user button listener
    document.getElementById('delete-user-btn').addEventListener('click', async () => {
        const userId = document.getElementById('manage-user-id').value;
        const companyName = document.getElementById('manage-user-company-name').textContent;

        if (confirm(`APAKAH ANDA YAKIN ingin menghapus user untuk ${companyName}? Tindakan ini tidak dapat dibatalkan.`)) {
            try {
                // FIX: Menggunakan endpoint yang lebih spesifik dan tidak ambigu
                const response = await fetch(`${API_BASE_URL}/admin/corporate-users/${userId}`, {
                    method: 'DELETE',
                    headers: authHeader
                });

                if (!response.ok) {
                    const err = await response.json();
                    throw new Error(err.error || 'Gagal menghapus user.');
                }

                alert('User berhasil dihapus.');
                closeManageUserModal();
                fetchAllData(); // Refresh the company list to show the "Buat User" button again
            } catch (error) {
                console.error('Error deleting user:', error);
                alert(`Terjadi kesalahan: ${error.message}`);
            }
        }
    });

    // =================================================================
    // Room Management Module - Restructured for Clarity and Stability
    // =================================================================
    const roomManager = {
        // Elements
        modal: document.getElementById('room-management-modal'),
        modalOverlay: document.getElementById('room-management-modal-overlay'),
        title: document.getElementById('room-management-modal-title'),
        tableBody: document.getElementById('room-table-body'),
        addBtn: document.getElementById('add-room-btn'),

        formModal: document.getElementById('room-form-modal'),
        formModalOverlay: document.getElementById('room-form-modal-overlay'),
        form: document.getElementById('room-form'),
        formTitle: document.getElementById('room-form-modal-title'),
        priceOptionsContainer: document.getElementById('room-price-options-container'),
        addPriceOptionBtn: document.getElementById('add-price-option-btn'),

        allotmentModal: document.getElementById('allotment-management-modal'),
        allotmentModalOverlay: document.getElementById('allotment-management-modal-overlay'),
        allotmentModalCloseBtn: document.getElementById('allotment-management-modal-close-btn'),
        allotmentForm: document.getElementById('allotment-form'),
        allotmentTitle: document.getElementById('allotment-management-modal-title'),

        // State
        currentRooms: [],
        currentHotelId: null,

        init() {
            this.addBtn.addEventListener('click', () => this.openFormModal(null));
            this.tableBody.addEventListener('click', (e) => this.handleTableClick(e));
            this.form.addEventListener('submit', (e) => this.save(e));
            this.addPriceOptionBtn.addEventListener('click', () => this.renderPriceOptionRow());
            this.allotmentModalCloseBtn.addEventListener('click', () => this.closeAllotmentModal());
            this.allotmentModalOverlay.addEventListener('click', () => this.closeAllotmentModal());
            this.allotmentForm.addEventListener('submit', (e) => this.saveAllotment(e));
        },

        open(hotelId, hotelName) {
            this.title.textContent = `Kelola Kamar untuk ${hotelName}`;
            this.currentHotelId = hotelId;
            this.modal.classList.add('active');
            this.modalOverlay.classList.add('active');
            this.fetchAndRender(hotelId);
        },

        close() {
            this.modal.classList.remove('active');
            this.modalOverlay.classList.remove('active');
            this.currentHotelId = null;
        },

        async fetchAndRender(hotelId) {
            try {
                // Menggunakan endpoint khusus admin yang mengembalikan struktur data yang benar (dengan price_options nested)
                // Ini memperbaiki bug di mana harga default tidak muncul dan tidak bisa diedit.
                const res = await fetch(`${API_BASE_URL}/admin/hotels/${hotelId}/rooms`, { headers: authHeader });
                if (!res.ok) throw new Error('Gagal memuat data kamar.');
                this.currentRooms = await res.json();
                this.tableBody.innerHTML = '';
                if (this.currentRooms.length === 0) {
                    this.tableBody.innerHTML = '<tr><td colspan="4">Belum ada tipe kamar untuk hotel ini.</td></tr>';
                } else {
                    this.currentRooms.forEach(room => {
                        const row = this.tableBody.insertRow();
                        let priceDisplay = '-';
                        if (Array.isArray(room.price_options) && room.price_options.length > 0) {
                            const minPrice = Math.min(...room.price_options.map(p => parseFloat(p.price)));
                            priceDisplay = `Mulai ${formatCurrency(minPrice)}`;
                        }
                        row.innerHTML = `
                            <td>${room.name}</td>
                            <td>${priceDisplay}</td>
                            <td><a href="${room.image_url || '#'}" target="_blank" rel="noopener noreferrer">${room.image_url ? 'Lihat' : '-'}</a></td>
                            <td>
                                <button class="btn btn-edit btn-edit-room" data-id="${room.id}">Edit</button>
                                <button class="btn btn-info btn-manage-allotment" data-id="${room.id}" data-name="${room.name}">Alotment</button>
                                <button class="btn btn-delete btn-delete-room" data-id="${room.id}">Hapus</button>
                            </td>
                        `;
                    });
                }
            } catch (error) {
                console.error('Error fetching rooms:', error);
                this.tableBody.innerHTML = '<tr><td colspan="4">Gagal memuat data kamar.</td></tr>';
            }
        },

        handleTableClick(e) {
            const target = e.target;
            const id = parseInt(target.dataset.id);
            if (target.classList.contains('btn-edit-room')) {
                const room = this.currentRooms.find(r => r.id === id);
                this.openFormModal(room);
            } else if (target.classList.contains('btn-manage-allotment')) {
                const roomName = target.dataset.name;
                this.openAllotmentModal(id, roomName);
            } else if (target.classList.contains('btn-delete-room')) {
                this.delete(id);
            }
        },

        openFormModal(room) {
            const isEditing = !!room;
            this.form.reset();
            this.formTitle.textContent = `${isEditing ? 'Edit' : 'Tambah'} Tipe Kamar`;
            document.getElementById('room-hotel-id').value = this.currentHotelId;

            if (isEditing) {
                document.getElementById('room-id').value = room.id;
                document.getElementById('room-name').value = room.name;
                document.getElementById('room-description').value = room.description || '';
                document.getElementById('room-facilities').value = Array.isArray(room.facilities) ? room.facilities.join(', ') : '';
                document.getElementById('room-image-url').value = room.image_url || '';
            }

            this.priceOptionsContainer.innerHTML = '';
            if (isEditing && room.price_options && room.price_options.length > 0) {
                room.price_options.forEach(option => this.renderPriceOptionRow(option));
            } else {
                this.renderPriceOptionRow();
            }

            this.formModal.classList.add('active');
            this.formModalOverlay.classList.add('active');
        },

        closeFormModal() {
            this.formModal.classList.remove('active');
            this.formModalOverlay.classList.remove('active');
            this.form.reset();
        },

        async save(e) {
            e.preventDefault();
            const roomId = document.getElementById('room-id').value;
            const priceOptions = [];
            const priceOptionRows = this.priceOptionsContainer.querySelectorAll('.price-option-row');
            let hasInvalidPrice = false;

            priceOptionRows.forEach(row => {
                const nameInput = row.querySelector('.price-option-name');
                const descInput = row.querySelector('.price-option-description');
                const priceInput = row.querySelector('.price-option-value');
                if (nameInput.value && priceInput.value) {
                    priceOptions.push({
                        name: nameInput.value,
                        description: descInput.value,
                        price: parseFloat(priceInput.value)
                    });
                } else if (nameInput.value || priceInput.value) {
                    hasInvalidPrice = true;
                }
            });

            if (hasInvalidPrice || priceOptions.length === 0) {
                alert('Harap isi nama paket dan harga dengan lengkap untuk setiap opsi. Minimal harus ada satu paket harga.');
                return;
            }

            const roomData = {
                hotel_id: this.currentHotelId,
                name: document.getElementById('room-name').value,
                description: document.getElementById('room-description').value,
                image_url: document.getElementById('room-image-url').value,
                facilities: document.getElementById('room-facilities').value.split(',').map(f => f.trim()).filter(f => f),
                price_options: priceOptions
            };

            const method = roomId ? 'PUT' : 'POST';
            const url = roomId ? `${API_BASE_URL}/admin/rooms/${roomId}` : `${API_BASE_URL}/admin/rooms`;

            try {
                const res = await fetch(url, { method, headers: { ...authHeader, 'Content-Type': 'application/json' }, body: JSON.stringify(roomData) });
                if (!res.ok) {
                    const errData = await res.json();
                    throw new Error(errData.error || 'Gagal menyimpan data kamar.');
                }
                this.closeFormModal();
                this.fetchAndRender(this.currentHotelId);
                fetchAllData(); // Refresh hotel list to update "Mulai dari" price
            } catch (error) {
                console.error('Error saving room:', error);
                alert(`Terjadi kesalahan: ${error.message}`);
            }
        },

        async delete(roomId) {
            if (confirm('Apakah Anda yakin ingin menghapus tipe kamar ini?')) {
                try {
                    const res = await fetch(`${API_BASE_URL}/admin/rooms/${roomId}`, { method: 'DELETE', headers: authHeader });
                    if (!res.ok) throw new Error('Gagal menghapus kamar.');
                    this.fetchAndRender(this.currentHotelId);
                } catch (error) {
                    alert(error.message);
                }
            }
        },

        openAllotmentModal(roomId, roomName) {
            this.allotmentTitle.textContent = `Kelola Alotment untuk ${roomName}`;
            document.getElementById('allotment-room-id').value = roomId;
            this.allotmentForm.reset();
            this.allotmentModal.classList.add('active');
            this.allotmentModalOverlay.classList.add('active');
            this.fetchAndRenderAllotments(roomId);
        },

        closeAllotmentModal() {
            this.allotmentModal.classList.remove('active');
            this.allotmentModalOverlay.classList.remove('active');
        },

        async fetchAndRenderAllotments(roomId) {
            const listContainer = document.getElementById('current-allotments-list');
            listContainer.innerHTML = 'Memuat...';
            try {
                const res = await fetch(`${API_BASE_URL}/admin/rooms/${roomId}/allotments`, { headers: authHeader });
                if (!res.ok) throw new Error('Gagal memuat data alotment.');
                const allotments = await res.json();
                if (allotments.length === 0) {
                    listContainer.innerHTML = '<p>Belum ada alotment yang diatur untuk 30 hari ke depan.</p>';
                    return;
                }
                let tableHTML = '<table><thead><tr><th>Tanggal</th><th>Total Alotment</th><th>Terpesan</th><th>Tersisa</th></tr></thead><tbody>';
                allotments.forEach(a => {
                    const remaining = a.total_allotment - a.booked_count;
                    tableHTML += `<tr>
                        <td>${new Date(a.allotment_date).toLocaleDateString('id-ID')}</td>
                        <td>${a.total_allotment}</td>
                        <td>${a.booked_count}</td>
                        <td style="font-weight: bold; color: ${remaining > 0 ? 'green' : 'red'};">${remaining}</td>
                    </tr>`;
                });
                tableHTML += '</tbody></table>';
                listContainer.innerHTML = tableHTML;
            } catch (error) {
                listContainer.innerHTML = `<p style="color:red;">${error.message}</p>`;
            }
        },

        async saveAllotment(e) {
            e.preventDefault();
            const roomId = document.getElementById('allotment-room-id').value;
            const allotmentData = {
                startDate: document.getElementById('allotment-start-date').value,
                endDate: document.getElementById('allotment-end-date').value,
                count: parseInt(document.getElementById('allotment-count').value, 10)
            };

            try {
                const res = await fetch(`${API_BASE_URL}/admin/rooms/${roomId}/allotments`, { method: 'POST', headers: { ...authHeader, 'Content-Type': 'application/json' }, body: JSON.stringify(allotmentData) });
                if (!res.ok) { const err = await res.json(); throw new Error(err.error || 'Gagal menyimpan alotment.'); }
                alert('Alotment berhasil disimpan!');
                this.fetchAndRenderAllotments(roomId); // Refresh list
            } catch (error) {
                alert(`Terjadi kesalahan: ${error.message}`);
            }
        },

        renderPriceOptionRow(option = {}) {
            const row = document.createElement('div');
            row.className = 'price-option-row';
            row.innerHTML = `
                <div class="price-option-details-inputs">
                    <input type="text" class="form-control price-option-name" placeholder="Nama Paket (e.g., Room Only)" value="${option.name || ''}" required>
                    <input type="text" class="form-control price-option-description" placeholder="Keterangan (e.g., Tanpa sarapan)" value="${option.description || ''}">
                </div>
                <input type="number" class="form-control price-option-value" placeholder="Harga" value="${option.price || ''}" required>
                <button type="button" class="btn-delete-option" title="Hapus Opsi">&times;</button>
            `;
            this.priceOptionsContainer.appendChild(row);
            row.querySelector('.btn-delete-option').addEventListener('click', () => row.remove());
        }
    };

    // --- Admin User Management - Modal & Logic ---

    const toggleHotelAccessField = () => {
        const selectedRole = document.getElementById('modal-admin-user-role').value;
        hotelAccessGroup.style.display = selectedRole === 'admin' ? 'block' : 'none';
    };

    const openAdminUserModal = async (user = null) => {
        adminUserForm.reset();
        document.getElementById('admin-user-id').value = '';
        const passwordInput = document.getElementById('modal-admin-user-password');

        // Isi pilihan hotel di modal
        const hotelAccessSelect = document.getElementById('modal-admin-hotel-access');
        try {
            // Gunakan data hotel yang sudah ada jika tersedia
            if (hotels.length === 0) await fetchAllData(); // Pastikan data hotel termuat
            hotelAccessSelect.innerHTML = hotels.map(h => `<option value="${h.id}">${h.name}</option>`).join('');
        } catch (error) {
            console.error("Gagal memuat daftar hotel untuk modal:", error);
            hotelAccessSelect.innerHTML = '<option disabled>Gagal memuat hotel</option>';
        }

        if (user) {
            // Mode Edit
            adminUserModalTitle.textContent = 'Edit User Admin';
            passwordInput.placeholder = "Kosongkan jika tidak ingin mengubah";
            passwordInput.required = false;

            // Ambil data detail user termasuk hotel_ids
            try {
                const res = await fetch(`${API_BASE_URL}/admin/admin-users/${user.id}`, { headers: authHeader });
                if (!res.ok) throw new Error('Gagal mengambil detail user.');
                const userDetails = await res.json();

                document.getElementById('admin-user-id').value = userDetails.id;
                document.getElementById('modal-admin-user-name').value = userDetails.full_name;
                document.getElementById('modal-admin-user-email').value = userDetails.email;
                document.getElementById('modal-admin-user-role').value = userDetails.role;

                // Set hotel yang dipilih
                if (userDetails.hotel_ids && userDetails.hotel_ids.length > 0) {
                    Array.from(hotelAccessSelect.options).forEach(option => {
                        if (userDetails.hotel_ids.includes(parseInt(option.value))) {
                            option.selected = true;
                        }
                    });
                }
            } catch (error) {
                alert(error.message);
                return; // Jangan buka modal jika gagal fetch data
            }

        } else {
            // Mode Tambah
            adminUserModalTitle.textContent = 'Tambah User Admin Baru';
            passwordInput.placeholder = "Password wajib diisi";
            passwordInput.required = true;
        }

        toggleHotelAccessField();
        adminUserModal.classList.add('active');
        adminUserModalOverlay.classList.add('active');
    };

    const closeAdminUserModal = () => {
        adminUserModal.classList.remove('active');
        adminUserModalOverlay.classList.remove('active');
    };

    // Event listener untuk modal user admin
    adminUserModalCloseBtn.addEventListener('click', closeAdminUserModal);
    adminUserModalOverlay.addEventListener('click', closeAdminUserModal);
    document.getElementById('modal-admin-user-role').addEventListener('change', toggleHotelAccessField);

    // Tombol "Buat User Baru" di tab sekarang membuka modal
    const createAdminUserBtn = document.getElementById('btn-create-admin-user');
    if (createAdminUserBtn) {
        createAdminUserBtn.addEventListener('click', (e) => {
            e.preventDefault();
            openAdminUserModal(null);
        });
    }

    // Form submission untuk modal user admin
    adminUserForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('admin-user-id').value;
        const password = document.getElementById('modal-admin-user-password').value;

        if (!id && !password) {
            alert('Password wajib diisi untuk user baru.');
            return;
        }

        const hotelAccessSelect = document.getElementById('modal-admin-hotel-access');
        const selectedHotelIds = Array.from(hotelAccessSelect.selectedOptions).map(opt => parseInt(opt.value));

        const userData = {
            full_name: document.getElementById('modal-admin-user-name').value,
            email: document.getElementById('modal-admin-user-email').value,
            role: document.getElementById('modal-admin-user-role').value,
            hotel_ids: selectedHotelIds
        };

        if (password) {
            userData.password = password;
        }

        const method = id ? 'PUT' : 'POST';
        const url = id ? `${API_BASE_URL}/admin/admin-users/${id}` : `${API_BASE_URL}/admin/admin-users`;

        try {
            const res = await fetch(url, {
                method: method,
                headers: { ...authHeader, 'Content-Type': 'application/json' },
                body: JSON.stringify(userData)
            });
            const result = await res.json();
            if (!res.ok) throw new Error(result.error || 'Gagal menyimpan data user.');

            alert('User admin berhasil disimpan!');
            closeAdminUserModal();
            fetchAdminUsers(); // Refresh tabel
        } catch (error) {
            alert(`Terjadi kesalahan: ${error.message}`);
        }
    });

    // --- Data Fetching ---
    const fetchAllData = async () => {
        try {
            // FIX: Mengarahkan semua panggilan ke endpoint /api/admin yang dilindungi
            const [hotelsRes, submissionsRes, testimonialsRes, companiesRes, corporateUsersRes, bookingStatsRes, activitiesRes, promosRes] = await Promise.all([
                fetch(`${API_BASE_URL}/admin/hotels`, { headers: authHeader }),
                fetch(`${API_BASE_URL}/admin/submissions`, { headers: authHeader }),
                fetch(`${API_BASE_URL}/admin/testimonials`, { headers: authHeader }),
                fetch(`${API_BASE_URL}/admin/companies`, { headers: authHeader }),
                fetch(`${API_BASE_URL}/admin/corporate-users`, { headers: authHeader }), // FIX: Panggil endpoint baru
                fetch(`${API_BASE_URL}/admin/booking-stats`, { headers: authHeader }),
                fetch(`${API_BASE_URL}/admin/activities`, { headers: authHeader }),
                fetch(`${API_BASE_URL}/admin/promos`, { headers: authHeader })
            ]);

            // Cek jika ada response yang gagal
            for (const res of [hotelsRes, submissionsRes, testimonialsRes, companiesRes, corporateUsersRes, bookingStatsRes, activitiesRes, promosRes]) {
                if (!res.ok) {
                    // Jika error adalah 401 atau 403, token tidak valid, redirect ke login
                    if (res.status === 401 || res.status === 403) {
                        alert('Sesi Anda telah berakhir. Silakan login kembali.');
                        localStorage.removeItem('adminAuthToken');
                        window.location.href = 'admin-login.html';
                        return;
                    }

                    // FIX: Penanganan error yang lebih andal untuk mencegah crash JSON.parse
                    const contentType = res.headers.get('content-type');
                    let errorMessage = `Gagal memuat data dari ${res.url} (Status: ${res.status}).`;

                    if (contentType && contentType.includes('application/json')) {
                        try {
                            const err = await res.json();
                            errorMessage = err.error || JSON.stringify(err);
                        } catch (e) {
                            // Biarkan pesan error default jika JSON tidak valid
                        }
                    }
                    
                    throw new Error(errorMessage);
                }
            }

            hotels = await hotelsRes.json();
            submissions = await submissionsRes.json();
            testimonials = await testimonialsRes.json();
            promos = await promosRes.json();
            companies = await companiesRes.json();
            const users = await corporateUsersRes.json();
            const bookingStats = await bookingStatsRes.json();
            activities = await activitiesRes.json();

            renderHotelTable();
            renderSubmissionTable();
            renderAdminPromos();

            // Tandai perusahaan yang sudah punya user
            const userCompanyIds = new Set(users.map(u => u.company_id));
            companies.forEach(c => c.has_user = userCompanyIds.has(c.id));

            renderCompanyTable();
            renderTestimonialTable();
            renderBookingChart(bookingStats);
            renderActivityFeed();

            // Panggil fungsi baru untuk memuat halaman pertama booking
            fetchAndRenderBookings(1, '', '', '', '');
        } catch (error) {
            console.error('Gagal memuat data dari server:', error);
            alert(`Tidak dapat memuat data: ${error.message}`);
        }
    };

    // --- WebSocket Logic for Real-time Admin Updates ---
    const setupWebSocket = () => {
        const adminToken = localStorage.getItem('adminAuthToken');
        if (!adminToken) return;

        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsHost = API_BASE_URL.replace(/^http/, 'ws').replace('/api', '');
        const wsUrl = `${wsHost}?token=${adminToken}`;

        const ws = new WebSocket(wsUrl);

        ws.onopen = () => {
            console.log('Koneksi WebSocket Admin berhasil dibuat.');
        };

        ws.onmessage = (event) => {
            try {
                const message = JSON.parse(event.data);

                // Notifikasi untuk booking baru
                if (message.type === 'new_booking_received' && message.payload) {
                    const booking = message.payload;
                    showToast(`Booking baru #${booking.id} dari ${booking.guest_name} telah masuk!`, 'success');
                    fetchAllData(); // Refresh data dashboard dan tabel booking
                }

                // Notifikasi untuk pengajuan baru
                if (message.type === 'submission_created' && message.payload) {
                    const submission = message.payload;
                    showToast(`Pengajuan baru dari ${submission.company} telah diterima.`, 'info');
                    fetchAllData(); // Refresh data dashboard dan tabel pengajuan
                }

            } catch (e) {
                console.error('Gagal mem-parsing pesan WebSocket Admin:', e);
            }
        };

        ws.onclose = () => {
            console.log('Koneksi WebSocket Admin ditutup. Mencoba menyambung kembali dalam 5 detik...');
            setTimeout(setupWebSocket, 5000);
        };

        ws.onerror = (error) => {
            console.error('Terjadi error pada WebSocket Admin:', error);
            ws.close();
        };
    };

    /**
     * Mengambil dan merender data ringkasan alotment untuk dashboard.
     */
    const fetchAndRenderDashboardAllotments = async () => {
        if (!dashboardAllotmentContainer) return;
        dashboardAllotmentContainer.innerHTML = '<div class="card"><div class="card-body"><p>Memuat data alotment...</p></div></div>';
        try {
            // PENTING: Anda perlu membuat endpoint ini di backend Anda.
            const response = await fetch(`${API_BASE_URL}/admin/dashboard/allotment-summary`, { headers: authHeader });
            if (!response.ok) {
                const contentType = response.headers.get('content-type');
                let errorMessage = `Gagal memuat ringkasan alotment (Status: ${response.status}).`;
                if (contentType && contentType.includes('application/json')) {
                    try {
                        const err = await response.json();
                        errorMessage = err.error || JSON.stringify(err);
                    } catch (e) {
                        // Biarkan pesan error default jika JSON tidak valid
                    }
                }
                throw new Error(errorMessage);
            }
            const data = await response.json();
            renderDashboardAllotmentTable(data);
        } catch (error) {
            console.error('Error fetching dashboard allotments:', error);
            dashboardAllotmentContainer.innerHTML = `<div class="card"><div class="card-body"><p class="text-danger">Gagal memuat data alotment: ${error.message}</p></div></div>`;
        }
    };

    /**
     * Inisialisasi seluruh panel admin, termasuk pengecekan role
     * dan pemanggilan fungsi fetch data yang sesuai.
     */
    const initializeAdminPanel = async () => {
        const decodedToken = parseJwt(token);
        if (!decodedToken) {
            // Fallback jika admin-auth.js gagal
            localStorage.removeItem('adminAuthToken');
            window.location.href = 'admin-login.html';
            return;
        }

        // Setel pesan selamat datang
        const adminDisplay = decodedToken.name || decodedToken.email || 'Admin';
        if (adminNameDisplay) adminNameDisplay.textContent = `Selamat Datang, ${adminDisplay}`;

        // Muat semua data utama
        await fetchAllData();
        await loadReviews();
        await fetchAndRenderDashboardAllotments(); // Panggil fungsi untuk memuat tabel alotment

        // Hanya Super Admin yang bisa melihat dan memuat data user admin
        if (decodedToken.role === 'superadmin') {
            await fetchAdminUsers();
        } else {
            const adminUserMenu = document.querySelector('a[href="#admin-user-management"]');
            if (adminUserMenu) adminUserMenu.parentElement.style.display = 'none';
        }

        showSection(window.location.hash || '#dashboard');
        roomManager.init(); // Initialize the room management module
        setupWebSocket(); // Panggil fungsi untuk memulai koneksi WebSocket
    };

    const generateSubmissionPDF = async (submission) => {
        let logoUrl = '';
        try {
            // Ambil URL logo terbaru setiap kali PDF dibuat
            const res = await fetch(`${API_BASE_URL}/admin/settings/company-logo`, { headers: authHeader });
            if (res.ok) {
                const data = await res.json();
                logoUrl = data.url;
            }
        } catch (e) {
            console.error("Gagal mengambil logo perusahaan untuk PDF:", e);
        }

        const logoHtml = logoUrl ? `<div class="header"><img src="${logoUrl}" alt="Company Logo" style="max-height: 70px; max-width: 220px; margin-bottom: 20px;"></div>` : '';

        const printContent = `
            <!DOCTYPE html>
            <html lang="id">
            <head>
                <meta charset="UTF-8">
                <title>Formulir Pengajuan Fasilitas Kredit - ${submission.company_name}</title>
                <style>
                    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 800px; margin: 20px auto; padding: 20px; border: 1px solid #ccc; }
                    .header { text-align: left; border-bottom: 2px solid #eee; padding-bottom: 15px; margin-bottom: 15px; }
                    h1 { text-align: center; color: #2c3e50; margin-top: 0; }
                    h2 { font-size: 1.2em; text-align: left; border-bottom: 1px solid #eee; margin-top: 30px; }
                    table { width: 100%; border-collapse: collapse; margin-top: 15px; }
                    td { padding: 10px; border: 1px solid #ddd; }
                    td:first-child { font-weight: bold; background-color: #f9f9f9; width: 30%; }
                    .signature-section { margin-top: 80px; display: flex; justify-content: space-between; text-align: center; }
                    .signature-box { width: 45%; }
                    .signature-line { border-bottom: 1px solid #333; margin-top: 70px; }
                    .footer { text-align: center; margin-top: 50px; font-size: 0.8em; color: #777; }
                    @media print {
                        body { -webkit-print-color-adjust: exact; }
                        .container { border: none; box-shadow: none; }
                        .no-print { display: none; }
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    ${logoHtml}
                    <h1>Formulir Pengajuan Fasilitas Kredit</h1>
                    
                    <h2>Informasi Perusahaan</h2>
                    <table>
                        <tr><td>Nama Perusahaan</td><td>${submission.company_name || ''}</td></tr>
                        <tr><td>No. NPWP</td><td>${submission.company_npwp || ''}</td></tr>
                        <tr><td>Alamat Perusahaan</td><td>${submission.company_address || ''}</td></tr>
                    </table>
    
                    <h2>Informasi Penanggung Jawab (PIC)</h2>
                    <table>
                        <tr><td>Nama PIC</td><td>${submission.contact_person_name || ''}</td></tr>
                        <tr><td>Email PIC</td><td>${submission.contact_person_email || ''}</td></tr>
                        <tr><td>Telepon PIC</td><td>${submission.contact_person_phone || ''}</td></tr>
                    </table>
    
                    <h2>Informasi Keuangan & Kebutuhan</h2>
                    <table>
                        <tr><td>Email Bagian Keuangan</td><td>${submission.finance_pic_email || ''}</td></tr>
                        <tr><td>Jenis Kebutuhan</td><td>${(submission.service_type || '').toUpperCase()}</td></tr>
                        <tr><td>Estimasi Kredit per Bulan</td><td>${formatCurrency(submission.credit_estimation || 0)}</td></tr>
                    </table>
    
                    <div class="signature-section">
                        <div class="signature-box">
                            <p>Diajukan oleh,</p>
                            <div class="signature-line"></div>
                            <p>( ${submission.contact_person_name || '..............................'} )</p>
                            <p>Direktur / Penanggung Jawab</p>
                        </div>
                        <div class="signature-box">
                            <p>Mengetahui,</p>
                            <div class="signature-line"></div>
                            <p>( .............................. )</p>
                            <p>KAGUM MICE & TRAVEL BOOKING</p>
                        </div>
                    </div>
    
                    <div class="footer">
                        <p>Dokumen ini dicetak pada: ${new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
                        <p>Dengan menandatangani formulir ini, perusahaan pemohon menyatakan bahwa seluruh data yang diberikan adalah benar dan menyetujui syarat & ketentuan yang berlaku.</p>
                    </div>
                </div>
            </body>
            </html>
        `;
    
        const printWindow = window.open('', '_blank');
        printWindow.document.write(printContent);
        printWindow.document.close();
        printWindow.focus();
        // Gunakan timeout untuk memastikan konten dimuat sebelum dicetak
        setTimeout(() => {
            printWindow.print();
            printWindow.close();
        }, 500);
    };

    // Event listeners untuk review management
    if (reviewTableBody) {
        reviewTableBody.addEventListener('click', async (e) => {
            const deleteBtn = e.target.closest('.btn-delete-review');
            const featureBtn = e.target.closest('.btn-toggle-feature');

            if (deleteBtn) {
                const reviewId = deleteBtn.dataset.id;
                if (confirm(`Anda yakin ingin menghapus ulasan #${reviewId}?`)) {
                    try {
                        const response = await fetch(`${API_BASE_URL}/admin/reviews/${reviewId}`, { method: 'DELETE', headers: authHeader });
                        if (!response.ok) throw new Error('Gagal menghapus ulasan.');
                        showToast('Ulasan berhasil dihapus.', 'success');
                        loadReviews(); // Refresh table
                    } catch (error) {
                        showToast(`Error: ${error.message}`, 'error');
                    }
                }
            }

            if (featureBtn) {
                const reviewId = featureBtn.dataset.id;
                try {
                    featureBtn.disabled = true;
                    const response = await fetch(`${API_BASE_URL}/admin/reviews/${reviewId}/feature`, { method: 'PUT', headers: authHeader });
                    if (!response.ok) throw new Error('Gagal mengubah status "featured".');
                    showToast('Status "featured" berhasil diubah.', 'success');
                    loadReviews(); // Refresh table
                } catch (error) {
                    showToast(`Error: ${error.message}`, 'error');
                } finally {
                    featureBtn.disabled = false;
                }
            }
        });
    }

    // --- Initial Load ---
    initializeAdminPanel();
});
