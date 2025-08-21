// Main client-side JavaScript for HusaRide
class HusaRide {
  constructor() {
    this.token = this.getToken();
    this.user = this.getUser();
    this.googleMapsLoaded = false;
    this.pendingAutocompleteSetup = [];
    this.init();
  }

  // Format phone number to (XXX) XXX-XXXX format
  formatPhoneNumber(phone) {
    if (!phone) return '';
    
    // Remove all non-digit characters
    const digits = phone.replace(/\D/g, '');
    
    // Handle different phone number lengths
    if (digits.length === 10) {
      // Format as (XXX) XXX-XXXX
      return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
    } else if (digits.length === 11 && digits.startsWith('1')) {
      // Handle numbers with country code 1
      const phoneDigits = digits.slice(1);
      return `(${phoneDigits.slice(0, 3)}) ${phoneDigits.slice(3, 6)}-${phoneDigits.slice(6)}`;
    } else if (digits.length >= 10) {
      // For longer numbers, format the last 10 digits
      const phoneDigits = digits.slice(-10);
      return `(${phoneDigits.slice(0, 3)}) ${phoneDigits.slice(3, 6)}-${phoneDigits.slice(6)}`;
    }
    
    // Return original if can't format
    return phone;
  }

  getToken() {
    // Try localStorage first, then cookies
    return localStorage.getItem('token') || this.getCookie('token');
  }

  getUser() {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  }

  getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
    return null;
  }

  getCSRFToken() {
    return this.getCookie('csrf-token') || document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';
  }

  init() {
    this.setupEventListeners();
    this.updateAuthUI();
    this.setupModals();
    this.setupVehicleSelection();
    this.setupHeroFareCalculation();
    this.waitForGoogleMaps();
    this.setActiveNavigation();
    this.checkPrefilledDestination();
    this.setupPhoneFormatting();
    this.optimizeImages();
    
    // Ensure auth state is properly initialized
    setTimeout(() => this.updateAuthUI(), 100);
  }

  setActiveNavigation() {
    const currentPath = window.location.pathname;
    const navLinks = document.querySelectorAll('.nav-links a');
    
    navLinks.forEach(link => {
      link.classList.remove('active');
      if (link.getAttribute('href') === currentPath || 
          (currentPath === '/' && link.getAttribute('href') === '/')) {
        link.classList.add('active');
      }
    });
  }

  // Wait for Google Maps to be fully loaded
  waitForGoogleMaps() {
    const checkGoogleMaps = () => {
      if (typeof google !== 'undefined' && 
          google.maps && 
          google.maps.places) {
        // Check for either new or legacy autocomplete
        const hasAutocomplete = google.maps.places.PlaceAutocompleteElement || google.maps.places.Autocomplete;
        // Distance Matrix is optional - we'll handle it gracefully if missing
        const hasDistanceMatrix = google.maps.DistanceMatrixService;
        
        if (hasAutocomplete) {
          this.googleMapsLoaded = true;
          this.hasDistanceMatrix = hasDistanceMatrix;
          console.log('Google Maps loaded and ready');
          console.log('Distance Matrix available:', hasDistanceMatrix);
          
          // Process any pending autocomplete setups
          this.processPendingAutocompleteSetup();
          return true;
        }
      }
      return false;
    };

    // Check immediately
    if (!checkGoogleMaps()) {
      // Check every 500ms for up to 15 seconds
      let attempts = 0;
      const maxAttempts = 30;
      
      const interval = setInterval(() => {
        attempts++;
        if (checkGoogleMaps() || attempts >= maxAttempts) {
          clearInterval(interval);
          if (attempts >= maxAttempts && !this.googleMapsLoaded) {
            console.warn('Google Maps failed to load after 15 seconds');
            this.handleGoogleMapsFailure();
          }
        }
      }, 500);
    }
  }

  handleGoogleMapsFailure() {
    // Show user-friendly message
    this.showNotification('Map services are temporarily unavailable. Distance calculation may not work properly.', 'warning');
    
    // Disable autocomplete features gracefully
    this.googleMapsLoaded = false;
  }

  processPendingAutocompleteSetup() {
    this.pendingAutocompleteSetup.forEach(({ pickupInput, dropoffInput }) => {
      if (pickupInput && dropoffInput) {
        this.setupAutocomplete(pickupInput, dropoffInput);
      }
    });
    this.pendingAutocompleteSetup = [];
    
    // Also setup hero autocomplete
    this.setupHeroAutocomplete();
  }

  setupEventListeners() {
    // Mobile navigation toggle
    document.querySelector('.menu-toggle')?.addEventListener('click', () => this.toggleMobileNav());
    
    // Auth buttons
    document.getElementById('loginBtn')?.addEventListener('click', () => this.showModal('loginModal'));
    document.getElementById('signupBtn')?.addEventListener('click', () => this.showModal('signupModal'));
    document.getElementById('logoutBtn')?.addEventListener('click', (e) => {
      e.preventDefault();
      this.confirmLogout();
    });

    // Forms
    document.getElementById('loginForm')?.addEventListener('submit', (e) => this.handleLogin(e));
    document.getElementById('signupForm')?.addEventListener('submit', (e) => this.handleSignup(e));
    document.getElementById('bookNowBtn')?.addEventListener('click', (e) => this.handleBooking(e));
    document.getElementById('heroBookNowBtn')?.addEventListener('click', (e) => this.handleHeroBooking(e));
    document.getElementById('vehicleBookingForm')?.addEventListener('submit', (e) => this.handleVehicleBooking(e));
    document.getElementById('attractionBookingForm')?.addEventListener('submit', (e) => this.handleAttractionBooking(e));
    document.getElementById('viewAllRidesBtn')?.addEventListener('click', () => this.showRidesModal());
    document.getElementById('settingsBtn')?.addEventListener('click', () => this.showSettingsModal());
    document.getElementById('mobileSettingsBtn')?.addEventListener('click', () => this.showSettingsModal());
    
    // Settings form handlers
    document.getElementById('passwordResetForm')?.addEventListener('submit', (e) => this.handlePasswordReset(e));
    document.getElementById('notificationsForm')?.addEventListener('submit', (e) => this.handleNotificationUpdate(e));
    document.getElementById('addLocationForm')?.addEventListener('submit', (e) => this.handleAddLocation(e));
    document.getElementById('addEmergencyForm')?.addEventListener('submit', (e) => this.handleAddEmergency(e));
    
    // Settings tabs
    document.querySelectorAll('.tab-btn-modern').forEach(btn => {
      btn.addEventListener('click', (e) => this.switchTab(e.target.closest('.tab-btn-modern').dataset.tab));
    });

    // Modal switching
    document.getElementById('showSignup')?.addEventListener('click', (e) => {
      e.preventDefault();
      this.hideModal('loginModal');
      this.showModal('signupModal');
    });

    document.getElementById('showLogin')?.addEventListener('click', (e) => {
      e.preventDefault();
      this.hideModal('signupModal');
      this.showModal('loginModal');
    });

    document.getElementById('showForgotPassword')?.addEventListener('click', (e) => {
      e.preventDefault();
      this.hideModal('loginModal');
      this.showModal('forgotPasswordModal');
    });

    document.getElementById('backToLogin')?.addEventListener('click', (e) => {
      e.preventDefault();
      this.hideModal('forgotPasswordModal');
      this.showModal('loginModal');
    });

    document.getElementById('forgotPasswordForm')?.addEventListener('submit', (e) => this.handleForgotPassword(e));
  }

  setupModals() {
    // Close buttons
    document.querySelectorAll('.close').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const modal = e.target.closest('.modal');
        this.hideModal(modal.id);
      });
    });

    // Click outside to close
    window.addEventListener('click', (e) => {
      if (e.target.classList.contains('modal')) {
        this.hideModal(e.target.id);
      }
    });
    
    // Close mobile nav when clicking outside
    document.addEventListener('click', (e) => {
      const nav = document.querySelector('nav');
      const navLinks = document.querySelector('.nav-links');
      const menuToggle = document.querySelector('.menu-toggle');
      
      if (navLinks && navLinks.classList.contains('active') && 
          nav && !nav.contains(e.target)) {
        navLinks.classList.remove('active');
      }
    });
    
    // Close mobile nav when clicking on nav links
    document.querySelectorAll('.nav-links a').forEach(link => {
      link.addEventListener('click', () => {
        document.querySelector('.nav-links')?.classList.remove('active');
      });
    });
  }

  async handleLogin(e) {
    e.preventDefault();
    const form = e.target;
    const formData = new FormData(form);
    const submitBtn = form.querySelector('button[type="submit"]');
    
    // Show loading state
    submitBtn.innerHTML = '<span class="loading-spinner"></span> Logging in...';
    submitBtn.disabled = true;
    
    try {
      const response = await fetch('/auth/login', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
          'X-CSRF-Token': this.getCSRFToken()
        },
        credentials: 'same-origin',
        body: JSON.stringify({
          email: formData.get('email'),
          password: formData.get('password')
        })
      });

      const data = await response.json();
      
      if (response.ok) {
        this.token = data.token;
        this.user = data.user;
        localStorage.setItem('token', this.token);
        localStorage.setItem('user', JSON.stringify(this.user));
        
        this.updateAuthUI();
        this.hideModal('loginModal');
        this.showNotification('Login successful!', 'success');
        form.reset();
        
        // Show helpful message about autopopulation
        setTimeout(() => {
          this.showNotification('Your information has been filled in the booking form!', 'success');
        }, 1500);
      } else {
        this.showNotification(data.error, 'error');
      }
    } catch (error) {
      this.showNotification('Login failed. Please try again.', 'error');
    } finally {
      // Reset button state
      submitBtn.innerHTML = 'Login';
      submitBtn.disabled = false;
    }
  }

  async handleSignup(e) {
    e.preventDefault();
    const form = e.target;
    const formData = new FormData(form);
    
    const password = formData.get('password');
    const confirmPassword = formData.get('confirmPassword');
    
    if (password !== confirmPassword) {
      this.showNotification('Passwords do not match!', 'error');
      return;
    }

    try {
      const response = await fetch('/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.get('name'),
          email: formData.get('email'),
          password: formData.get('password'),
          phone: this.formatPhoneNumber(formData.get('phone'))
        })
      });

      const data = await response.json();
      
      if (response.ok) {
        this.token = data.token;
        this.user = data.user;
        localStorage.setItem('token', this.token);
        localStorage.setItem('user', JSON.stringify(this.user));
        
        this.updateAuthUI();
        this.hideModal('signupModal');
        this.showNotification('Account created successfully!', 'success');
        form.reset();
        
        // Show helpful message about autopopulation
        setTimeout(() => {
          this.showNotification('Your information has been filled in the booking form!', 'success');
        }, 1500);
      } else {
        this.showNotification(data.error, 'error');
      }
    } catch (error) {
      this.showNotification('Signup failed. Please try again.', 'error');
    }
  }

  async handleBooking(e) {
    e.preventDefault();
    
    const pickup = document.getElementById('pickup')?.value;
    const dropoff = document.getElementById('dropoff')?.value;
    const vehicleType = document.getElementById('vehicleType')?.value;

    if (!pickup || !dropoff || !vehicleType) {
      this.showNotification('Please fill in all fields', 'error');
      return;
    }

    if (!this.token) {
      this.showModal('loginModal');
      return;
    }

    try {
      const response = await fetch('/rides/book', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.token}`
        },
        body: JSON.stringify({
          pickupLocation: pickup,
          dropoffLocation: dropoff,
          vehicleType
        })
      });

      const data = await response.json();
      
      if (response.ok) {
        this.showNotification('Ride booked successfully! Drivers will be notified.', 'success');
        this.clearBookingForm();
      } else {
        this.showNotification(data.error, 'error');
      }
    } catch (error) {
      this.showNotification('Booking failed. Please try again.', 'error');
    }
  }

  async handleHeroBooking(e) {
    e.preventDefault();
    
    // Get form values
    const fullName = document.getElementById('heroFullName')?.value?.trim();
    const email = document.getElementById('heroEmail')?.value?.trim();
    const phone = document.getElementById('heroPhone')?.value?.trim();
    const pickup = document.getElementById('heroPickup')?.value?.trim();
    const dropoff = document.getElementById('heroDropoff')?.value?.trim();
    const vehicleType = document.getElementById('heroVehicleType')?.value;

    // Validate required fields
    const requiredFields = [
      { value: fullName, label: 'Full Name' },
      { value: email, label: 'Email Address' },
      { value: phone, label: 'Phone Number' },
      { value: pickup, label: 'Pickup Location' },
      { value: dropoff, label: 'Drop-off Location' },
      { value: vehicleType, label: 'Vehicle Type' }
    ];

    const missingFields = requiredFields.filter(field => !field.value).map(field => field.label);

    if (missingFields.length > 0) {
      const errorMessage = `Please fill in the following required fields: ${missingFields.join(', ')}`;
      this.showNotification(errorMessage, 'error');
      return;
    }

    try {
      const bookingData = {
        fullName,
        email,
        phone: this.formatPhoneNumber(phone),
        pickupLocation: pickup,
        dropoffLocation: dropoff,
        vehicleType,
        bookingDate: new Date().toISOString(),
        passengers: 1
      };

      const headers = {
        'Content-Type': 'application/json'
      };

      // Add auth header if user is logged in
      if (this.token) {
        headers['Authorization'] = `Bearer ${this.token}`;
      }

      const response = await fetch('/rides/book', {
        method: 'POST',
        headers,
        body: JSON.stringify(bookingData)
      });

      const data = await response.json();
      
      if (response.ok) {
        this.showCenteredMessage('🎉 Ride Booked Successfully!\n\nConfirmation email sent. Drivers have been notified and will contact you shortly.', 'success');
        this.clearHeroBookingForm();
      } else {
        this.showNotification(data.error || 'Booking failed. Please try again.', 'error');
      }
    } catch (error) {
      this.showNotification('Booking failed. Please try again.', 'error');
    }
  }

  confirmLogout() {
    this.showConfirmDialog(
      'Confirm Logout',
      'Are you sure you want to logout?',
      () => this.logout(),
      () => {}
    );
  }

  showConfirmDialog(title, message, onConfirm, onCancel) {
    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
    `;

    const dialog = document.createElement('div');
    dialog.style.cssText = `
      background: white;
      padding: 2rem;
      border-radius: 15px;
      text-align: center;
      max-width: 400px;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
    `;

    dialog.innerHTML = `
      <h3 style="margin: 0 0 1rem 0; color: var(--dark-color);">${this.escapeHtml(title)}</h3>
      <p style="margin: 0 0 2rem 0; color: var(--gray-color);">${this.escapeHtml(message)}</p>
      <div style="display: flex; gap: 1rem; justify-content: center;">
        <button id="confirmBtn" style="background: var(--accent-color); color: white; border: none; padding: 0.8rem 1.5rem; border-radius: 8px; font-weight: 600; cursor: pointer;">Yes, Logout</button>
        <button id="cancelBtn" style="background: var(--light-gray); color: var(--dark-color); border: none; padding: 0.8rem 1.5rem; border-radius: 8px; font-weight: 600; cursor: pointer;">Cancel</button>
      </div>
    `;

    overlay.appendChild(dialog);
    document.body.appendChild(overlay);

    dialog.querySelector('#confirmBtn').onclick = () => {
      overlay.remove();
      onConfirm();
    };

    dialog.querySelector('#cancelBtn').onclick = () => {
      overlay.remove();
      onCancel();
    };

    overlay.onclick = (e) => {
      if (e.target === overlay) {
        overlay.remove();
        onCancel();
      }
    };
  }

  async logout() {
    // Show loading notification
    this.showLoadingNotification('Logging out...');
    
    try {
      await fetch('/auth/logout', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.token}`
        }
      });
    } catch (error) {
      console.log('Logout request failed, clearing local session anyway');
    }
    
    // Add small delay for better UX
    await new Promise(resolve => setTimeout(resolve, 800));
    
    this.token = null;
    this.user = null;
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    this.hideLoadingNotification();
    
    // Redirect based on current page
    if (window.location.pathname.startsWith('/admin')) {
      window.location.href = '/admin/login';
    } else if (window.location.pathname.startsWith('/driver')) {
      window.location.href = '/driver/login';
    } else {
      this.updateAuthUI();
      this.showNotification('Logged out successfully', 'success');
    }
  }

  updateAuthUI() {
    const loginBtn = document.getElementById('loginBtn');
    const signupBtn = document.getElementById('signupBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    const userGreeting = document.getElementById('userGreeting');
    const profileSection = document.getElementById('userProfileSection');
    const bookingForm = document.getElementById('bookingForm');

    if (this.user && this.token) {
      if (loginBtn) loginBtn.style.display = 'none';
      if (signupBtn) signupBtn.style.display = 'none';
      if (logoutBtn) logoutBtn.style.display = 'inline-block';
      const settingsBtn = document.getElementById('settingsBtn');
      if (settingsBtn) settingsBtn.style.display = 'inline-block';
      if (userGreeting) {
        userGreeting.textContent = `Hello, ${this.user.name}`;
        userGreeting.style.display = 'inline';
      }
      
      // Show profile section and load user data
      if (profileSection) {
        profileSection.style.display = 'block';
        this.loadUserProfile();
      }
      if (bookingForm) {
        bookingForm.style.marginTop = '1rem';
      }
      
      // Autopopulate user information in booking forms
      this.autopopulateUserInfo();
    } else {
      if (loginBtn) loginBtn.style.display = 'inline-block';
      if (signupBtn) signupBtn.style.display = 'inline-block';
      if (logoutBtn) logoutBtn.style.display = 'none';
      const settingsBtn = document.getElementById('settingsBtn');
      if (settingsBtn) settingsBtn.style.display = 'none';
      if (userGreeting) userGreeting.style.display = 'none';
      if (profileSection) profileSection.style.display = 'none';
      if (bookingForm) bookingForm.style.marginTop = '0';
      
      // Clear autopopulated fields when logged out
      this.clearAutopopulatedFields();
    }
  }

  showModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.style.display = 'block';
      document.body.style.overflow = 'hidden';
    }
  }

  hideModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.style.display = 'none';
      document.body.style.overflow = 'auto';
    }
  }

  clearBookingForm() {
    document.getElementById('pickup').value = '';
    document.getElementById('dropoff').value = '';
    document.getElementById('vehicleType').value = '';
  }

  clearHeroBookingForm() {
    document.getElementById('heroFullName').value = '';
    document.getElementById('heroEmail').value = '';
    document.getElementById('heroPhone').value = '';
    document.getElementById('heroPickup').value = '';
    document.getElementById('heroDropoff').value = '';
    document.getElementById('heroVehicleType').value = 'comfort';
    document.getElementById('heroEstimatedFare').textContent = '$0.00';
  }

  setupHeroFareCalculation() {
    const pickupInput = document.getElementById('heroPickup');
    const dropoffInput = document.getElementById('heroDropoff');
    const vehicleSelect = document.getElementById('heroVehicleType');
    const fareDisplay = document.getElementById('heroEstimatedFare');

    if (!pickupInput || !dropoffInput || !vehicleSelect || !fareDisplay) return;

    // Initialize fare display
    fareDisplay.textContent = '$0.00';

    const calculateHeroFare = () => {
      const pickup = pickupInput.value.trim();
      const dropoff = dropoffInput.value.trim();
      const vehicleType = vehicleSelect.value || 'comfort';
      
      if (pickup && dropoff && pickup !== dropoff) {
        fareDisplay.textContent = 'Calculating...';
        
        // Get vehicle rate
        const vehicleRates = {
          limo: 2.50,
          comfort: 1.80,
          suv: 3.20,
          van: 4.50,
          wedding: 8.00,
          bus: 6.00,
          convention: 5.50,
          sports: 4.80,
          theme: 3.80,
          concert: 4.20
        };
        
        const rate = vehicleRates[vehicleType] || 1.80;
        
        // Add timeout to prevent long "Calculating..." state
        const timeoutId = setTimeout(() => {
          this.estimateHeroFare(fareDisplay, rate);
        }, 3000);
        
        // Try Google Maps distance calculation if available
        if (this.hasDistanceMatrix) {
          this.calculateHeroDistance(pickup, dropoff, fareDisplay, timeoutId, rate);
        } else {
          clearTimeout(timeoutId);
          setTimeout(() => this.estimateHeroFare(fareDisplay, rate), 1000);
        }
      } else if (pickup || dropoff) {
        fareDisplay.textContent = 'Enter both locations';
      } else {
        fareDisplay.textContent = '$0.00';
      }
    };

    // Add event listeners
    pickupInput.addEventListener('blur', calculateHeroFare);
    dropoffInput.addEventListener('blur', calculateHeroFare);
    vehicleSelect.addEventListener('change', calculateHeroFare);
    
    // Clear fare when inputs are cleared
    pickupInput.addEventListener('input', () => {
      if (!pickupInput.value.trim()) {
        fareDisplay.textContent = '$0.00';
      }
    });
    dropoffInput.addEventListener('input', () => {
      if (!dropoffInput.value.trim()) {
        fareDisplay.textContent = '$0.00';
      }
    });
  }

  setupHeroAutocomplete() {
    const pickupInput = document.getElementById('heroPickup');
    const dropoffInput = document.getElementById('heroDropoff');
    
    if (pickupInput && dropoffInput) {
      if (this.googleMapsLoaded) {
        this.setupAutocomplete(pickupInput, dropoffInput);
      } else {
        this.pendingAutocompleteSetup.push({ pickupInput, dropoffInput });
      }
    }
  }

  calculateHeroDistance(pickup, dropoff, fareDisplay, timeoutId, rate) {
    if (!this.googleMapsLoaded || typeof google === 'undefined' || !google.maps) {
      clearTimeout(timeoutId);
      this.estimateHeroFare(fareDisplay, rate);
      return;
    }
    
    if (!google.maps.DistanceMatrixService || !this.hasDistanceMatrix) {
      clearTimeout(timeoutId);
      setTimeout(() => this.estimateHeroFare(fareDisplay, rate), 1000);
      return;
    }
    
    try {
      const service = new google.maps.DistanceMatrixService();
      
      service.getDistanceMatrix({
        origins: [pickup],
        destinations: [dropoff],
        travelMode: google.maps.TravelMode.DRIVING,
        unitSystem: google.maps.UnitSystem.IMPERIAL,
        avoidHighways: false,
        avoidTolls: false
      }, (response, status) => {
        clearTimeout(timeoutId);
        
        if (status === 'OK' && 
            response.rows && 
            response.rows[0] && 
            response.rows[0].elements && 
            response.rows[0].elements[0] && 
            response.rows[0].elements[0].status === 'OK') {
          
          const distance = response.rows[0].elements[0].distance;
          const duration = response.rows[0].elements[0].duration;
          const distanceInMiles = distance.value * 0.000621371;
          const timeInHours = duration.value / 3600;
          
          // Combined fare: distance + time
          const distanceFare = distanceInMiles * rate;
          const timeFare = timeInHours * (rate * 0.5); // Time rate is 50% of distance rate
          const totalFare = distanceFare + timeFare;
          
          fareDisplay.textContent = `$${totalFare.toFixed(2)}`;
        } else {
          this.estimateHeroFare(fareDisplay, rate);
        }
      });
    } catch (error) {
      clearTimeout(timeoutId);
      this.estimateHeroFare(fareDisplay, rate);
    }
  }

  estimateHeroFare(fareDisplay, rate) {
    if (!fareDisplay || !rate) return;
    
    const estimatedMiles = Math.floor(Math.random() * 12) + 3;
    const estimatedHours = estimatedMiles / 25; // Assume 25 mph average speed
    const distanceFare = estimatedMiles * rate;
    const timeFare = estimatedHours * (rate * 0.5);
    const totalFare = distanceFare + timeFare;
    fareDisplay.textContent = `$${totalFare.toFixed(2)} (est.)`;
  }

  setupVehicleSelection() {
    // Vehicle selection buttons
    document.querySelectorAll('.select-vehicle-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const vehicleType = e.target.getAttribute('data-vehicle');
        this.openVehicleBookingModal(vehicleType);
      });
    });
  }

  openVehicleBookingModal(vehicleType) {
    const vehicleInfo = {
      limo: { name: 'Luxury Limousine', rate: 2.50, capacity: '8 passengers' },
      comfort: { name: 'Comfort Electric', rate: 1.80, capacity: '4 passengers' },
      suv: { name: 'Premium SUV', rate: 3.20, capacity: '7 passengers' },
      van: { name: 'Luxury Van', rate: 4.50, capacity: '12 passengers' },
      wedding: { name: 'Wedding Package', rate: 8.00, capacity: 'Special occasion' },
      bus: { name: 'Event Bus', rate: 6.00, capacity: '25 passengers' },
      convention: { name: 'Convention Transport', rate: 5.50, capacity: 'Business events' },
      sports: { name: 'Sports Event Transport', rate: 4.80, capacity: 'Sports events' },
      theme: { name: 'Theme Park Transport', rate: 3.80, capacity: 'Family fun' },
      concert: { name: 'Concert Transport', rate: 4.20, capacity: 'Music events' }
    };

    const vehicle = vehicleInfo[vehicleType];
    if (!vehicle) return;

    // Update selected vehicle info
    const selectedVehicleInfo = document.getElementById('selectedVehicleInfo');
    selectedVehicleInfo.innerHTML = `
      <h3>${vehicle.name}</h3>
      <p>${vehicle.capacity} • $${vehicle.rate}/mi + $${(vehicle.rate * 0.5).toFixed(2)}/hr</p>
    `;

    // Store selected vehicle type
    this.selectedVehicleType = vehicleType;
    this.selectedVehicleRate = vehicle.rate;

    // Show modal
    this.showModal('vehicleBookingModal');
    
    // Autopopulate user info in modal if logged in
    if (this.user && this.token) {
      this.autopopulateModalUserInfo();
    }
    
    // Setup fare calculation with proper delay and error handling
    setTimeout(() => {
      this.setupFareCalculation();
    }, 300);
  }

  async handleVehicleBooking(e) {
    e.preventDefault();
    const form = e.target;
    const formData = new FormData(form);
    
    // Validate required fields
    const requiredFields = [
      { name: 'fullName', label: 'Full Name' },
      { name: 'email', label: 'Email Address' },
      { name: 'phone', label: 'Phone Number' },
      { name: 'pickupLocation', label: 'Pickup Location' },
      { name: 'dropoffLocation', label: 'Drop-off Location' },
      { name: 'bookingDate', label: 'Date & Time' },
      { name: 'passengers', label: 'Number of Passengers' }
    ];

    const missingFields = [];
    for (const field of requiredFields) {
      const value = formData.get(field.name);
      if (!value || value.toString().trim() === '') {
        missingFields.push(field.label);
      }
    }

    if (missingFields.length > 0) {
      const errorMessage = `Please fill in the following required fields: ${missingFields.join(', ')}`;
      this.showNotification(errorMessage, 'error');
      return;
    }
    
    try {
      const bookingData = {
        fullName: formData.get('fullName'),
        email: formData.get('email'),
        phone: this.formatPhoneNumber(formData.get('phone')),
        pickupLocation: formData.get('pickupLocation'),
        dropoffLocation: formData.get('dropoffLocation'),
        vehicleType: this.selectedVehicleType,
        bookingDate: formData.get('bookingDate'),
        passengers: formData.get('passengers'),
        notes: formData.get('notes')
      };

      const headers = {
        'Content-Type': 'application/json'
      };

      // Add auth header if user is logged in
      if (this.token) {
        headers['Authorization'] = `Bearer ${this.token}`;
      }

      const response = await fetch('/rides/book', {
        method: 'POST',
        headers,
        body: JSON.stringify(bookingData)
      });

      const data = await response.json();
      
      if (response.ok) {
        this.hideModal('vehicleBookingModal');
        this.showCenteredMessage('🎉 Ride Booked Successfully!\n\nConfirmation email sent. Drivers have been notified and will contact you shortly.', 'success');
        form.reset();
      } else {
        this.showNotification(data.error || 'Booking failed. Please try again.', 'error');
      }
    } catch (error) {
      this.showNotification('Booking failed. Please try again.', 'error');
    }
  }

  showCenteredMessage(message, type = 'success') {
    // Create centered message overlay
    const overlay = document.createElement('div');
    overlay.className = 'centered-message-overlay';
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
    `;

    const messageBox = document.createElement('div');
    messageBox.className = 'centered-message-box';
    messageBox.style.cssText = `
      background: white;
      padding: 2rem;
      border-radius: 15px;
      text-align: center;
      max-width: 400px;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
      animation: messageSlideIn 0.3s ease-out;
    `;

    messageBox.innerHTML = `
      <div style="font-size: 1.2rem; font-weight: 600; color: #28a745; margin-bottom: 1rem; white-space: pre-line;">
        ${message}
      </div>
      <button onclick="this.closest('.centered-message-overlay').remove()" 
              style="background: #28a745; color: white; border: none; padding: 0.8rem 2rem; border-radius: 8px; font-weight: 600; cursor: pointer;">
        OK
      </button>
    `;

    // Add animation keyframes
    if (!document.querySelector('#messageAnimation')) {
      const style = document.createElement('style');
      style.id = 'messageAnimation';
      style.textContent = `
        @keyframes messageSlideIn {
          from { transform: scale(0.8); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
      `;
      document.head.appendChild(style);
    }

    overlay.appendChild(messageBox);
    document.body.appendChild(overlay);

    // Auto-remove after 5 seconds
    setTimeout(() => {
      if (overlay.parentNode) {
        overlay.remove();
      }
    }, 5000);
  }

  setupFareCalculation() {
    const pickupInput = document.getElementById('bookingPickup');
    const dropoffInput = document.getElementById('bookingDropoff');
    const fareDisplay = document.getElementById('estimatedFare');

    if (!pickupInput || !dropoffInput || !fareDisplay) {
      console.warn('Fare calculation elements not found');
      return;
    }

    // Initialize fare display
    fareDisplay.textContent = '$0.00';

    // Only setup autocomplete if Google Maps is fully ready and has legacy Autocomplete
    if (this.googleMapsLoaded && 
        typeof google !== 'undefined' && 
        google.maps && 
        google.maps.places && 
        google.maps.places.Autocomplete || google.maps.places.PlaceAutocompleteElement) {
      try {
        this.setupLegacyAutocomplete(pickupInput, dropoffInput);
        console.log('Autocomplete enabled');
      } catch (error) {
        console.warn('Autocomplete failed, using manual input:', error);
      }
    } else {
      console.log('Using manual location input (Google Maps not fully available)');
    }

    const calculateFare = () => {
      const pickup = pickupInput.value.trim();
      const dropoff = dropoffInput.value.trim();
      
      if (pickup && dropoff && pickup !== dropoff) {
        fareDisplay.textContent = 'Calculating...';
        
        // Add timeout to prevent long "Calculating..." state
        const timeoutId = setTimeout(() => {
          this.estimateFare(fareDisplay);
        }, 3000);
        
        // Try Google Maps distance calculation if available
        if (this.hasDistanceMatrix) {
          this.calculateDistance(pickup, dropoff, fareDisplay, timeoutId);
        } else {
          // Use estimation immediately
          clearTimeout(timeoutId);
          setTimeout(() => this.estimateFare(fareDisplay), 1000);
        }
      } else if (pickup || dropoff) {
        fareDisplay.textContent = 'Enter both locations';
      } else {
        fareDisplay.textContent = '$0.00';
      }
    };

    // Add event listeners
    pickupInput.addEventListener('blur', calculateFare);
    dropoffInput.addEventListener('blur', calculateFare);
    
    // Clear fare when inputs are cleared
    pickupInput.addEventListener('input', () => {
      if (!pickupInput.value.trim()) {
        fareDisplay.textContent = '$0.00';
      }
    });
    dropoffInput.addEventListener('input', () => {
      if (!dropoffInput.value.trim()) {
        fareDisplay.textContent = '$0.00';
      }
    });
  }

  setupAutocomplete(pickupInput, dropoffInput) {
    // Double-check Google Maps availability
    if (!this.googleMapsLoaded || 
        typeof google === 'undefined' || 
        !google.maps || 
        !google.maps.places) {
      console.warn('Google Maps Places not available for autocomplete');
      return;
    }
    
    try {
      // For now, let's use the legacy Autocomplete API since it's more stable
      // and the new PlaceAutocompleteElement is still being rolled out
      this.setupLegacyAutocomplete(pickupInput, dropoffInput);
      
      console.log('Autocomplete setup completed successfully');
      
    } catch (error) {
      console.error('Autocomplete setup failed:', error);
      this.showNotification('Location autocomplete is temporarily unavailable', 'warning');
    }
  }

  setupNewAutocomplete(pickupInput, dropoffInput) {
    try {
      // Create new PlaceAutocompleteElement instances with correct parameters
      const pickupAutocomplete = new google.maps.places.PlaceAutocompleteElement({
        // Note: New API has different parameter structure
        componentRestrictions: { country: 'us' },
        types: ['geocode']
        // Don't use 'fields' - it's not supported in the new API the same way
      });
      
      const dropoffAutocomplete = new google.maps.places.PlaceAutocompleteElement({
        componentRestrictions: { country: 'us' },
        types: ['geocode']
      });

      // Replace input elements with autocomplete elements
      pickupInput.parentNode.replaceChild(pickupAutocomplete, pickupInput);
      dropoffInput.parentNode.replaceChild(dropoffAutocomplete, dropoffInput);

      // Copy important attributes
      pickupAutocomplete.id = 'bookingPickup';
      dropoffAutocomplete.id = 'bookingDropoff';
      pickupAutocomplete.name = 'pickupLocation';
      dropoffAutocomplete.name = 'dropoffLocation';
      pickupAutocomplete.placeholder = 'Enter pickup location';
      dropoffAutocomplete.placeholder = 'Enter dropoff location';
      pickupAutocomplete.required = true;
      dropoffAutocomplete.required = true;

      // Add some basic styling to match your inputs
      pickupAutocomplete.style.width = '100%';
      pickupAutocomplete.style.padding = '10px';
      pickupAutocomplete.style.border = '1px solid #ddd';
      pickupAutocomplete.style.borderRadius = '5px';
      
      dropoffAutocomplete.style.width = '100%';
      dropoffAutocomplete.style.padding = '10px';
      dropoffAutocomplete.style.border = '1px solid #ddd';
      dropoffAutocomplete.style.borderRadius = '5px';

      // Store references
      this.pickupAutocomplete = pickupAutocomplete;
      this.dropoffAutocomplete = dropoffAutocomplete;

      console.log('New PlaceAutocompleteElement setup completed');
    } catch (error) {
      console.error('New autocomplete setup failed, trying legacy:', error);
      // Fall back to legacy
      this.setupLegacyAutocomplete(pickupInput, dropoffInput);
    }
  }

  setupLegacyAutocomplete(pickupInput, dropoffInput) {
    try {
      // Setup autocomplete options
      const autocompleteOptions = {
        types: ['geocode'],
        componentRestrictions: { country: 'us' },
        fields: ['place_id', 'geometry', 'name', 'formatted_address']
      };
      
      // Setup autocomplete for pickup
      const pickupAutocomplete = new google.maps.places.Autocomplete(pickupInput, autocompleteOptions);
      
      // Setup autocomplete for dropoff  
      const dropoffAutocomplete = new google.maps.places.Autocomplete(dropoffInput, autocompleteOptions);
      
      // Store autocomplete instances
      this.pickupAutocomplete = pickupAutocomplete;
      this.dropoffAutocomplete = dropoffAutocomplete;
      
      // Add place changed listeners for better UX
      pickupAutocomplete.addListener('place_changed', () => {
        const place = pickupAutocomplete.getPlace();
        if (place && place.geometry) {
          console.log('Pickup place selected:', place.name);
        }
      });
      
      dropoffAutocomplete.addListener('place_changed', () => {
        const place = dropoffAutocomplete.getPlace();
        if (place && place.geometry) {
          console.log('Dropoff place selected:', place.name);
        }
      });

      console.log('Legacy Autocomplete setup completed');
      
    } catch (error) {
      console.error('Legacy autocomplete setup failed:', error);
      throw error;
    }
  }

  calculateDistance(pickup, dropoff, fareDisplay, timeoutId) {
    if (!this.googleMapsLoaded || 
        typeof google === 'undefined' || 
        !google.maps) {
      clearTimeout(timeoutId);
      this.estimateFare(fareDisplay);
      return;
    }
    
    // Check if Distance Matrix Service is available
    if (!google.maps.DistanceMatrixService || !this.hasDistanceMatrix) {
      clearTimeout(timeoutId);
      console.log('Distance Matrix Service not available, using estimation');
      fareDisplay.textContent = 'Calculating...';
      setTimeout(() => this.estimateFare(fareDisplay), 1000);
      return;
    }
    
    try {
      const service = new google.maps.DistanceMatrixService();
      
      service.getDistanceMatrix({
        origins: [pickup],
        destinations: [dropoff],
        travelMode: google.maps.TravelMode.DRIVING,
        unitSystem: google.maps.UnitSystem.IMPERIAL,
        avoidHighways: false,
        avoidTolls: false
      }, (response, status) => {
        clearTimeout(timeoutId);
        
        if (status === 'OK' && 
            response.rows && 
            response.rows[0] && 
            response.rows[0].elements && 
            response.rows[0].elements[0] && 
            response.rows[0].elements[0].status === 'OK') {
          
          const distance = response.rows[0].elements[0].distance;
          const duration = response.rows[0].elements[0].duration;
          const distanceInMiles = distance.value * 0.000621371;
          const timeInHours = duration.value / 3600;
          
          // Combined fare: distance + time
          const distanceFare = distanceInMiles * this.selectedVehicleRate;
          const timeFare = timeInHours * (this.selectedVehicleRate * 0.5); // Time rate is 50% of distance rate
          const totalFare = distanceFare + timeFare;
          
          fareDisplay.textContent = `$${totalFare.toFixed(2)}`;
        } else {
          console.warn('Distance calculation failed:', status, response);
          this.estimateFare(fareDisplay);
        }
      });
    } catch (error) {
      clearTimeout(timeoutId);
      console.error('Distance calculation error:', error);
      this.estimateFare(fareDisplay);
    }
  }

  estimateFare(fareDisplay) {
    if (!fareDisplay || !this.selectedVehicleRate) return;
    
    // Simple estimation based on typical city distances
    const estimatedMiles = Math.floor(Math.random() * 12) + 3; // 3-15 miles
    const estimatedHours = estimatedMiles / 25; // Assume 25 mph average speed
    const distanceFare = estimatedMiles * this.selectedVehicleRate;
    const timeFare = estimatedHours * (this.selectedVehicleRate * 0.5);
    const totalFare = distanceFare + timeFare;
    fareDisplay.textContent = `$${totalFare.toFixed(2)} (est.)`;
  }

  async loadUserProfile() {
    if (!this.token) return;
    
    try {
      const response = await fetch('/rides/profile', {
        headers: { 'Authorization': `Bearer ${this.token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        this.updateProfileDisplay(data.user, data.recentRides);
      }
    } catch (error) {
      console.error('Failed to load profile:', error);
    }
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  updateProfileDisplay(user, recentRides) {
    const profileName = document.getElementById('profileName');
    const profilePoints = document.getElementById('profilePoints');
    const recentRidesList = document.getElementById('recentRidesList');
    
    if (profileName) profileName.textContent = `Welcome back, ${user.name}!`;
    if (profilePoints) profilePoints.textContent = `${user.points} points earned`;
    
    if (recentRidesList) {
      if (recentRides.length === 0) {
        recentRidesList.innerHTML = '<p class="no-rides">No recent trips</p>';
      } else {
        recentRidesList.innerHTML = recentRides.map(ride => {
          const pickup = this.escapeHtml(ride.pickupLocation);
          const dropoff = this.escapeHtml(ride.dropoffLocation);
          const vehicleType = this.escapeHtml(ride.vehicleType);
          const fare = this.escapeHtml(ride.fare.toString());
          return `
            <div class="ride-item">
              <div class="ride-info">
                <div class="ride-date">${new Date(ride.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
                <div class="ride-route">${pickup} → ${dropoff}</div>
                <div class="ride-details">${vehicleType} • $${fare}</div>
              </div>
              <div class="ride-actions">
                <button class="rebook-btn" data-pickup="${pickup}" data-dropoff="${dropoff}" data-vehicle="${vehicleType}">Rebook</button>
              </div>
            </div>
          `;
        }).join('');
        
        // Add event listeners for rebook buttons
        recentRidesList.querySelectorAll('.rebook-btn').forEach(btn => {
          btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const pickup = btn.dataset.pickup;
            const dropoff = btn.dataset.dropoff;
            const vehicleType = btn.dataset.vehicle;
            this.rebookRide(pickup, dropoff, vehicleType);
          });
        });
      }
    }
  }

  rebookRide(pickup, dropoff, vehicleType) {
    const heroPickup = document.getElementById('heroPickup');
    const heroDropoff = document.getElementById('heroDropoff');
    const heroVehicleType = document.getElementById('heroVehicleType');
    
    if (heroPickup) heroPickup.value = pickup;
    if (heroDropoff) heroDropoff.value = dropoff;
    if (heroVehicleType) heroVehicleType.value = vehicleType;
    
    // Scroll to booking form
    document.getElementById('bookingForm')?.scrollIntoView({ behavior: 'smooth' });
    this.showNotification('Trip details filled! Review and book your ride.', 'success');
  }

  async showRidesModal() {
    if (!this.token) {
      this.showModal('loginModal');
      return;
    }
    
    this.showModal('ridesModal');
    
    try {
      const response = await fetch('/rides/my-rides', {
        headers: { 'Authorization': `Bearer ${this.token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        this.displayAllRides(data.rides);
      }
    } catch (error) {
      console.error('Failed to load rides:', error);
      document.getElementById('ridesContainer').innerHTML = '<p style="text-align: center; color: var(--accent-color);">Failed to load rides</p>';
    }
  }

  displayAllRides(rides) {
    const container = document.getElementById('ridesContainer');
    
    if (rides.length === 0) {
      container.innerHTML = '<p style="text-align: center; color: var(--gray-color);">No rides found</p>';
      return;
    }
    
    container.innerHTML = rides.map(ride => {
      const pickup = this.escapeHtml(ride.pickupLocation);
      const dropoff = this.escapeHtml(ride.dropoffLocation);
      const vehicleType = this.escapeHtml(ride.vehicleType);
      const status = this.escapeHtml(ride.status);
      const fare = this.escapeHtml(ride.fare.toString());
      const driverName = ride.driver ? this.escapeHtml(ride.driver.name) : 'Not assigned';
      
      return `
        <div class="ride-card">
          <div class="ride-header">
            <div class="ride-route">${pickup} → ${dropoff}</div>
            <span class="ride-status status-${status}">${status}</span>
          </div>
          <div class="ride-meta">
            <div><strong>Vehicle:</strong> ${vehicleType}</div>
            <div><strong>Fare:</strong> $${fare}</div>
            <div><strong>Date:</strong> ${new Date(ride.createdAt).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</div>
            <div><strong>Driver:</strong> ${driverName}</div>
          </div>
          ${ride.status === 'completed' ? `
            <button class="rebook-btn" style="margin-top: 1rem;" data-pickup="${pickup}" data-dropoff="${dropoff}" data-vehicle="${vehicleType}">Book Again</button>
          ` : ''}
        </div>
      `;
    }).join('');
    
    // Add event listeners for rebook buttons
    container.querySelectorAll('.rebook-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const pickup = btn.dataset.pickup;
        const dropoff = btn.dataset.dropoff;
        const vehicleType = btn.dataset.vehicle;
        this.rebookRide(pickup, dropoff, vehicleType);
        this.hideModal('ridesModal');
      });
    });
  }

  async showSettingsModal() {
    this.showModal('settingsModal');
    await this.loadUserSettings();
  }

  async loadUserSettings() {
    try {
      const response = await fetch('/settings', {
        headers: { 'Authorization': `Bearer ${this.token}` }
      });
      if (response.ok) {
        const data = await response.json();
        this.populateSettings(data.settings);
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  }

  populateSettings(settings) {
    // Populate notification preferences
    if (settings.notifications) {
      document.querySelector('[name="email"]').checked = settings.notifications.email;
      document.querySelector('[name="sms"]').checked = settings.notifications.sms;
      document.querySelector('[name="push"]').checked = settings.notifications.push;
    }
    
    // Populate favorite locations
    this.displayFavoriteLocations(settings.favoriteLocations || []);
    
    // Populate emergency contacts
    this.displayEmergencyContacts(settings.emergencyContacts || []);
  }

  switchTab(tabName) {
    document.querySelectorAll('.tab-btn-modern').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-content-modern').forEach(content => content.classList.remove('active'));
    
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
    document.getElementById(`${tabName}Tab`).classList.add('active');
  }

  async handlePasswordReset(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    
    if (formData.get('newPassword') !== formData.get('confirmPassword')) {
      this.showNotification('Passwords do not match', 'error');
      return;
    }
    
    try {
      const response = await fetch('/settings/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.token}`
        },
        body: JSON.stringify({
          currentPassword: formData.get('currentPassword'),
          newPassword: formData.get('newPassword')
        })
      });
      
      const data = await response.json();
      if (response.ok) {
        this.showNotification('Password updated successfully', 'success');
        e.target.reset();
      } else {
        this.showNotification(data.error, 'error');
      }
    } catch (error) {
      this.showNotification('Failed to update password', 'error');
    }
  }

  async handleNotificationUpdate(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    
    try {
      const response = await fetch('/settings/notifications', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.token}`
        },
        body: JSON.stringify({
          email: formData.get('email') === 'on',
          sms: formData.get('sms') === 'on',
          push: formData.get('push') === 'on'
        })
      });
      
      if (response.ok) {
        this.showNotification('Notification preferences updated', 'success');
      }
    } catch (error) {
      this.showNotification('Failed to update preferences', 'error');
    }
  }

  async handleAddLocation(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    
    try {
      const response = await fetch('/settings/favorite-locations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.token}`
        },
        body: JSON.stringify({
          name: formData.get('name'),
          address: formData.get('address'),
          type: formData.get('type')
        })
      });
      
      if (response.ok) {
        this.showNotification('Location added successfully', 'success');
        e.target.reset();
        this.loadUserSettings();
      }
    } catch (error) {
      this.showNotification('Failed to add location', 'error');
    }
  }

  async handleAddEmergency(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    
    try {
      const response = await fetch('/settings/emergency-contacts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.token}`
        },
        body: JSON.stringify({
          name: formData.get('name'),
          phone: this.formatPhoneNumber(formData.get('phone')),
          relationship: formData.get('relationship')
        })
      });
      
      if (response.ok) {
        this.showNotification('Emergency contact added', 'success');
        e.target.reset();
        this.loadUserSettings();
      }
    } catch (error) {
      this.showNotification('Failed to add contact', 'error');
    }
  }

  displayFavoriteLocations(locations) {
    const container = document.getElementById('favoriteLocationsList');
    container.innerHTML = locations.map(loc => `
      <div class="settings-item">
        <div class="settings-item-info">
          <div class="settings-item-name">${loc.name}</div>
          <div class="settings-item-details">${loc.address}</div>
        </div>
        <button class="remove-btn" onclick="window.husaRideApp.removeLocation('${loc._id}')">Remove</button>
      </div>
    `).join('');
  }

  displayEmergencyContacts(contacts) {
    const container = document.getElementById('emergencyContactsList');
    container.innerHTML = contacts.map(contact => `
      <div class="settings-item">
        <div class="settings-item-info">
          <div class="settings-item-name">${contact.name}</div>
          <div class="settings-item-details">${contact.phone} • ${contact.relationship}</div>
        </div>
        <button class="remove-btn" onclick="window.husaRideApp.removeEmergencyContact('${contact._id}')">Remove</button>
      </div>
    `).join('');
  }

  async removeLocation(id) {
    try {
      await fetch(`/settings/favorite-locations/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${this.token}` }
      });
      this.loadUserSettings();
    } catch (error) {
      this.showNotification('Failed to remove location', 'error');
    }
  }

  async removeEmergencyContact(id) {
    try {
      await fetch(`/settings/emergency-contacts/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${this.token}` }
      });
      this.loadUserSettings();
    } catch (error) {
      this.showNotification('Failed to remove contact', 'error');
    }
  }

  showLoadingNotification(message) {
    const overlay = document.createElement('div');
    overlay.id = 'loadingOverlay';
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.3);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
    `;

    const notification = document.createElement('div');
    notification.style.cssText = `
      background: white;
      padding: 2rem;
      border-radius: 15px;
      text-align: center;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
      display: flex;
      align-items: center;
      gap: 1rem;
    `;

    notification.innerHTML = `
      <div class="loading-spinner"></div>
      <span style="font-weight: 500; color: var(--dark-color);">${message}</span>
    `;

    overlay.appendChild(notification);
    document.body.appendChild(overlay);
  }

  hideLoadingNotification() {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) overlay.remove();
  }

  async handleForgotPassword(e) {
    e.preventDefault();
    const form = e.target;
    const formData = new FormData(form);
    const submitBtn = form.querySelector('button[type="submit"]');
    
    submitBtn.innerHTML = '<span class="loading-spinner"></span> Sending...';
    submitBtn.disabled = true;
    
    try {
      const response = await fetch('/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.get('email') })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        this.hideModal('forgotPasswordModal');
        this.showNotification('Password reset link sent to your email', 'success');
        form.reset();
      } else {
        this.showNotification(data.error, 'error');
      }
    } catch (error) {
      this.showNotification('Failed to send reset link', 'error');
    } finally {
      submitBtn.innerHTML = 'Send Reset Link';
      submitBtn.disabled = false;
    }
  }

  showNotification(message, type = 'info') {
    // Create overlay
    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
    `;

    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    
    // Add styles
    notification.style.cssText = `
      padding: 20px 30px;
      border-radius: 10px;
      color: white;
      font-weight: 500;
      max-width: 400px;
      text-align: center;
      word-wrap: break-word;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
    `;

    // Set background color based on type
    const colors = {
      success: '#28a745',
      error: '#dc3545',
      info: '#17a2b8',
      warning: '#ffc107'
    };
    notification.style.backgroundColor = colors[type] || colors.info;
    
    // Adjust text color for warning
    if (type === 'warning') {
      notification.style.color = '#000';
    }

    // Add notification to overlay
    overlay.appendChild(notification);
    document.body.appendChild(overlay);

    // Remove after 4 seconds or on click
    const remove = () => {
      if (overlay.parentNode) {
        overlay.parentNode.removeChild(overlay);
      }
    };
    
    overlay.addEventListener('click', remove);
    setTimeout(remove, 4000);
  }
  
  toggleMobileNav() {
    const navLinks = document.querySelector('.nav-links');
    if (navLinks) {
      navLinks.classList.toggle('active');
    }
  }

  async handleAttractionBooking(e) {
    e.preventDefault();
    const form = e.target;
    const formData = new FormData(form);
    
    try {
      const bookingData = {
        fullName: formData.get('fullName'),
        email: formData.get('email'),
        phone: this.formatPhoneNumber(formData.get('phone')),
        pickupLocation: formData.get('pickupLocation'),
        dropoffLocation: formData.get('dropoffLocation'),
        vehicleType: formData.get('vehicleType'),
        bookingDate: formData.get('bookingDate'),
        passengers: formData.get('passengers')
      };

      const headers = {
        'Content-Type': 'application/json'
      };

      if (this.token) {
        headers['Authorization'] = `Bearer ${this.token}`;
      }

      const response = await fetch('/rides/book', {
        method: 'POST',
        headers,
        body: JSON.stringify(bookingData)
      });

      const data = await response.json();
      
      if (response.ok) {
        this.hideModal('attractionBookingModal');
        this.showCenteredMessage('🎉 Ride Booked Successfully!\n\nConfirmation email sent. Drivers have been notified and will contact you shortly.', 'success');
        form.reset();
      } else {
        this.showNotification(data.error || 'Booking failed. Please try again.', 'error');
      }
    } catch (error) {
      this.showNotification('Booking failed. Please try again.', 'error');
    }
  }

  autopopulateUserInfo() {
    if (!this.user) return;
    
    // Autopopulate hero booking form (only if fields are empty)
    const heroFullName = document.getElementById('heroFullName');
    const heroEmail = document.getElementById('heroEmail');
    const heroPhone = document.getElementById('heroPhone');
    
    if (heroFullName && !heroFullName.value.trim()) {
      heroFullName.value = this.user.name || '';
      heroFullName.style.backgroundColor = '#f0f8ff'; // Light blue to indicate autofill
    }
    if (heroEmail && !heroEmail.value.trim()) {
      heroEmail.value = this.user.email || '';
      heroEmail.style.backgroundColor = '#f0f8ff';
    }
    if (heroPhone && !heroPhone.value.trim()) {
      heroPhone.value = this.formatPhoneNumber(this.user.phone) || '';
      heroPhone.style.backgroundColor = '#f0f8ff';
    }
    
    // Add event listeners to remove highlight when user starts typing
    [heroFullName, heroEmail, heroPhone].forEach(field => {
      if (field) {
        field.addEventListener('input', function() {
          this.style.backgroundColor = '';
        }, { once: true });
      }
    });
  }
  
  autopopulateModalUserInfo() {
    if (!this.user) return;
    
    // Autopopulate vehicle booking modal (only if fields are empty)
    const bookingName = document.getElementById('bookingName');
    const bookingEmail = document.getElementById('bookingEmail');
    const bookingPhone = document.getElementById('bookingPhone');
    
    if (bookingName && !bookingName.value.trim()) {
      bookingName.value = this.user.name || '';
      bookingName.style.backgroundColor = '#f0f8ff';
    }
    if (bookingEmail && !bookingEmail.value.trim()) {
      bookingEmail.value = this.user.email || '';
      bookingEmail.style.backgroundColor = '#f0f8ff';
    }
    if (bookingPhone && !bookingPhone.value.trim()) {
      bookingPhone.value = this.formatPhoneNumber(this.user.phone) || '';
      bookingPhone.style.backgroundColor = '#f0f8ff';
    }
    
    // Autopopulate attraction booking modal (only if fields are empty)
    const attractionBookingName = document.getElementById('attractionBookingName');
    const attractionBookingEmail = document.getElementById('attractionBookingEmail');
    const attractionBookingPhone = document.getElementById('attractionBookingPhone');
    
    if (attractionBookingName && !attractionBookingName.value.trim()) {
      attractionBookingName.value = this.user.name || '';
      attractionBookingName.style.backgroundColor = '#f0f8ff';
    }
    if (attractionBookingEmail && !attractionBookingEmail.value.trim()) {
      attractionBookingEmail.value = this.user.email || '';
      attractionBookingEmail.style.backgroundColor = '#f0f8ff';
    }
    if (attractionBookingPhone && !attractionBookingPhone.value.trim()) {
      attractionBookingPhone.value = this.formatPhoneNumber(this.user.phone) || '';
      attractionBookingPhone.style.backgroundColor = '#f0f8ff';
    }
    
    // Add event listeners to remove highlight when user starts typing
    [bookingName, bookingEmail, bookingPhone, attractionBookingName, attractionBookingEmail, attractionBookingPhone].forEach(field => {
      if (field) {
        field.addEventListener('input', function() {
          this.style.backgroundColor = '';
        }, { once: true });
      }
    });
  }
  
  clearAutopopulatedFields() {
    // Clear hero booking form
    const heroFullName = document.getElementById('heroFullName');
    const heroEmail = document.getElementById('heroEmail');
    const heroPhone = document.getElementById('heroPhone');
    
    if (heroFullName) heroFullName.value = '';
    if (heroEmail) heroEmail.value = '';
    if (heroPhone) heroPhone.value = '';
  }

  checkPrefilledDestination() {
    const prefilledDestination = localStorage.getItem('prefilledDestination');
    if (prefilledDestination) {
      // Fill the hero dropoff field
      const heroDropoff = document.getElementById('heroDropoff');
      if (heroDropoff) {
        heroDropoff.value = prefilledDestination;
        // Clear the stored destination
        localStorage.removeItem('prefilledDestination');
        // Scroll to booking form
        setTimeout(() => {
          const bookingForm = document.getElementById('bookingForm');
          if (bookingForm) {
            bookingForm.scrollIntoView({ behavior: 'smooth' });
          }
        }, 500);
        // Show notification
        this.showNotification(`Destination set to: ${prefilledDestination}`, 'success');
      }
    }
  }

  setupPhoneFormatting() {
    // Find all phone input fields and add formatting
    const phoneInputs = document.querySelectorAll('input[type="tel"], input[name="phone"], #signupPhone, #heroPhone, #bookingPhone, #attractionBookingPhone');
    
    phoneInputs.forEach(input => {
      input.addEventListener('input', (e) => {
        const cursorPosition = e.target.selectionStart;
        const oldValue = e.target.value;
        const newValue = this.formatPhoneNumber(oldValue);
        
        if (newValue !== oldValue) {
          e.target.value = newValue;
          // Adjust cursor position
          const newCursorPosition = cursorPosition + (newValue.length - oldValue.length);
          e.target.setSelectionRange(newCursorPosition, newCursorPosition);
        }
      });
      
      // Format on blur as well
      input.addEventListener('blur', (e) => {
        e.target.value = this.formatPhoneNumber(e.target.value);
      });
    });
  }

  optimizeImages() {
    // Convert existing images to lazy loading (skip no-lazy class)
    document.querySelectorAll('img:not([data-src]):not(.no-lazy)').forEach(img => {
      if (img.src) {
        img.dataset.src = img.src;
        img.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMSIgaGVpZ2h0PSIxIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InRyYW5zcGFyZW50Ii8+PC9zdmc+';
        img.classList.add('lazy-image');
      }
    });
  }
}

// Global callback function for Google Maps
window.initGoogleMaps = function() {
  console.log('Google Maps callback triggered');
  // The main initialization will be handled by the waitForGoogleMaps method
};

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  window.husaRideApp = new HusaRide();
});

// Handle Google Maps loading errors
window.gm_authFailure = function() {
  console.error('Google Maps authentication failed');
  if (window.husaRideApp) {
    window.husaRideApp.handleGoogleMapsFailure();
  }
};

// Privacy Policy and Terms of Service modal handlers
document.addEventListener('DOMContentLoaded', () => {
  const privacyLink = document.getElementById('privacyLink');
  const termsLink = document.getElementById('termsLink');
  const privacyModal = document.getElementById('privacyModal');
  const termsModal = document.getElementById('termsModal');
  
  if (privacyLink && privacyModal) {
    privacyLink.addEventListener('click', (e) => {
      e.preventDefault();
      privacyModal.style.display = 'block';
      document.body.style.overflow = 'hidden';
    });
  }
  
  if (termsLink && termsModal) {
    termsLink.addEventListener('click', (e) => {
      e.preventDefault();
      termsModal.style.display = 'block';
      document.body.style.overflow = 'hidden';
    });
  }
  
  // Close modals when clicking close button or outside
  document.querySelectorAll('#privacyModal .close, #termsModal .close').forEach(closeBtn => {
    closeBtn.addEventListener('click', () => {
      privacyModal.style.display = 'none';
      termsModal.style.display = 'none';
      document.body.style.overflow = 'auto';
    });
  });
  
  window.addEventListener('click', (e) => {
    if (e.target === privacyModal) {
      privacyModal.style.display = 'none';
      document.body.style.overflow = 'auto';
    }
    if (e.target === termsModal) {
      termsModal.style.display = 'none';
      document.body.style.overflow = 'auto';
    }
  });
});