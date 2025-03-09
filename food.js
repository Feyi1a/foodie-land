// Enforce strict mode and modern practices
'use strict';

/**
 * Application Configuration
 */
const CONFIG = Object.freeze({
    API: {
        BASE_URL: 'https://api.example.com',
        ENDPOINTS: {
            LOGIN: '/auth/login',
            SIGNUP: '/auth/signup',
            NEWSLETTER: '/newsletter/subscribe'
        }
    },
    MAP: {
        DEFAULT_LOCATION: { lat: 40.7128, lng: -74.0060 },
        DEFAULT_ZOOM: 13,
        API_KEY: 'YOUR_API_KEY'
    },
    VALIDATION: {
        EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        PASSWORD: {
            MIN_LENGTH: 6,
            PATTERN: /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{6,}$/
        },
        COUPON: /^[A-Z0-9]{6}$/
    }
});

/**
 * State Management
 */
const AppState = {
    isLoading: false,
    currentUser: null,
    errors: new Map(),
    
    setLoading(status) {
        this.isLoading = status;
        this.updateUI();
    },
    
    setError(key, message) {
        this.errors.set(key, message);
        this.updateUI();
    },
    
    clearError(key) {
        this.errors.delete(key);
        this.updateUI();
    },
    
    updateUI() {
        // Update loading indicators
        document.querySelectorAll('[data-loading]')
            .forEach(el => el.style.display = this.isLoading ? 'block' : 'none');
            
        // Update error displays
        this.errors.forEach((message, key) => {
            const errorEl = document.querySelector(`[data-error="${key}"]`);
            if (errorEl) errorEl.textContent = message;
        });
    }
};

/**
 * Form Handling
 */
class FormHandler {
    constructor(formId, options = {}) {
        this.form = document.getElementById(formId);
        this.options = {
            validateOnInput: true,
            submitCallback: null,
            ...options
        };
        
        if (this.form) {
            this.initialize();
        }
    }
    
    initialize() {
        // Add form submission handler
        this.form.addEventListener('submit', this.handleSubmit.bind(this));
        
        // Add input validation if enabled
        if (this.options.validateOnInput) {
            this.form.addEventListener('input', this.handleInput.bind(this));
        }
    }
    
    async handleSubmit(event) {
        event.preventDefault();
        
        try {
            AppState.setLoading(true);
            AppState.clearError(this.form.id);
            
            // Validate form
            const formData = new FormData(this.form);
            const validationResult = this.validateForm(formData);
            
            if (!validationResult.isValid) {
                throw new Error(validationResult.error);
            }
            
            // Process form data
            const data = Object.fromEntries(formData.entries());
            
            // Call submit callback if provided
            if (this.options.submitCallback) {
                await this.options.submitCallback(data);
            }
            
            // Reset form on success
            this.form.reset();
            
        } catch (error) {
            AppState.setError(this.form.id, error.message);
            console.error('Form submission error:', error);
        } finally {
            AppState.setLoading(false);
        }
    }
    
    handleInput(event) {
        const field = event.target;
        this.validateField(field);
    }
    
    validateForm(formData) {
        // Implement form-specific validation
        const email = formData.get('email');
        const password = formData.get('password');
        
        if (email && !CONFIG.VALIDATION.EMAIL.test(email)) {
            return {
                isValid: false,
                error: 'Please enter a valid email address'
            };
        }
        
        if (password && !CONFIG.VALIDATION.PASSWORD.PATTERN.test(password)) {
            return {
                isValid: false,
                error: 'Password must contain at least 6 characters, including letters and numbers'
            };
        }
        
        return { isValid: true };
    }
    
    validateField(field) {
        const value = field.value;
        let isValid = true;
        let errorMessage = '';
        
        switch (field.type) {
            case 'email':
                isValid = CONFIG.VALIDATION.EMAIL.test(value);
                errorMessage = 'Please enter a valid email address';
                break;
            case 'password':
                isValid = CONFIG.VALIDATION.PASSWORD.PATTERN.test(value);
                errorMessage = 'Password must contain at least 6 characters, including letters and numbers';
                break;
        }
        
        this.updateFieldValidation(field, isValid, errorMessage);
    }
    
    updateFieldValidation(field, isValid, errorMessage) {
        const errorEl = field.parentElement.querySelector('.error-message');
        
        if (!isValid) {
            field.classList.add('invalid');
            if (errorEl) errorEl.textContent = errorMessage;
        } else {
            field.classList.remove('invalid');
            if (errorEl) errorEl.textContent = '';
        }
    }
}

/**
 * API Service
 */
class APIService {
    static async request(endpoint, options = {}) {
        try {
            const response = await fetch(`${CONFIG.API.BASE_URL}${endpoint}`, {
                headers: {
                    'Content-Type': 'application/json'
                },
                ...options
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error('API request failed:', error);
            throw error;
        }
    }
    
    static async login(credentials) {
        return this.request(CONFIG.API.ENDPOINTS.LOGIN, {
            method: 'POST',
            body: JSON.stringify(credentials)
        });
    }
    
    static async signup(userData) {
        return this.request(CONFIG.API.ENDPOINTS.SIGNUP, {
            method: 'POST',
            body: JSON.stringify(userData)
        });
    }
    
    static async subscribeNewsletter(email) {
        return this.request(CONFIG.API.ENDPOINTS.NEWSLETTER, {
            method: 'POST',
            body: JSON.stringify({ email })
        });
    }
}

/**
 * Map Handler
 */
/*

class MapHandler {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.map = null;
        this.marker = null;
    }
    
    async initialize() {
        try {
            const location = await this.getUserLocation();
            this.initializeMap(location);
        } catch (error) {
            console.error('Map initialization error:', error);
            this.initializeMap(CONFIG.MAP.DEFAULT_LOCATION);
        }
    }
    
    getUserLocation() {
        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) {
                reject(new Error('Geolocation is not supported'));
                return;
            }
            
            navigator.geolocation.getCurrentPosition(
                position => resolve({
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                }),
                error => reject(error)
            );
        });
    }
    
    initializeMap(location) {
        this.map = new google.maps.Map(this.container, {
            center: location,
            zoom: CONFIG.MAP.DEFAULT_ZOOM
        });
        
        this.marker = new google.maps.Marker({
            position: location,
            map: this.map,
            animation: google.maps.Animation.DROP
        });
    }
}
*/

/**
 * Utility Functions
 */
const utils = {
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },
    
    async loadScript(src) {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = src;
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }
};

/**
 * Initialize Application
 */
document.addEventListener('DOMContentLoaded', () => {
    // Initialize forms
    const loginForm = new FormHandler('login-form', {
        submitCallback: async (data) => {
            const response = await APIService.login(data);
            // Handle successful login
        }
    });
    
    const signupForm = new FormHandler('signup-form', {
        submitCallback: async (data) => {
            const response = await APIService.signup(data);
            // Handle successful signup
        }
    });
    
    const newsletterForm = new FormHandler('newsletter-form', {
        submitCallback: async (data) => {
            const response = await APIService.subscribeNewsletter(data.email);
            // Handle successful subscription
        }
    });
    
    // Initialize map
    const map = new MapHandler('map');
    map.initialize();
    
    // Initialize modal handlers
    document.querySelectorAll('[data-modal-trigger]').forEach(trigger => {
        trigger.addEventListener('click', (e) => {
            e.preventDefault();
            const modalId = trigger.dataset.modalTrigger;
            const modal = document.getElementById(modalId);
            if (modal) modal.classList.add('active');
        });
    });
});



// Initialize Map
/*
function initMap() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(function(position) {
            const map = new google.maps.Map(document.getElementById('map'), {
                center: {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                },
                zoom: 15
            });

            new google.maps.Marker({
                position: {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                },
                map: map,
                title: 'Your Location'
            });
        });
    }
}
*/



// Handle Sign Up
document.getElementById('signup-form').addEventListener('submit', function(e) {
    e.preventDefault();
    const couponCode = document.getElementById('coupon-code').value;
    const email = document.getElementById('signup-email').value;
    const password = document.getElementById('signup-password').value;

    if (!email || !password) {
        alert('Please fill in all required fields.');
        return;
    }

    if (couponCode) {
        alert('Welcome! Your coupon code has been applied. Enjoy 20% off your first order!');
    } else {
        alert('Account created successfully!');
    }
    closeModal('signup-modal');
    return;
});

// Handle Login
document.getElementById('login-form').addEventListener('submit', function(e) {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    if (!email || !password) {
        alert('Please fill in all required fields.');
        return;
    }

    alert('Logged in successfully!');
    closeModal('login-modal');
    return;
});

// Function to close modal
function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}

// Function to ignore the page
function ignorePage(modalId) {
    closeModal(modalId);
    alert('You have chosen to ignore this page.');
}

// Add event listeners for ignore buttons
document.getElementById('ignore-signup').addEventListener('click', function() {
    ignorePage('signup-modal');
});

document.getElementById('ignore-login').addEventListener('click', function() {
    ignorePage('login-modal');
});

// Close modals when clicking outside
window.onclick = function(event) {
    if (event.target.classList.contains('modal')) {
        closeModal(event.target.id);
    }
}

// Close modals when pressing the Esc key
window.onkeydown = function(event) {
    if (event.key === 'Escape') {
        document.querySelectorAll('.modal').forEach(modal => {
            if (modal.style.display === 'flex') {
                closeModal(modal.id);
            }
        });
    }
}




// Handle Newsletter Subscription
document.getElementById('newsletter-form').addEventListener('submit', function(e) {
    e.preventDefault();
    alert('Thank you for subscribing to our newsletter!');
});





// Authentication Modal Functions
function showModal(type) {
    document.getElementById(`${type}-modal`).style.display = 'flex';
}

// Close modals when clicking outside
window.onclick = function(event) {
    if (event.target.classList.contains('modal')) {
        event.target.style.display = 'none';
    }
}

// Handle Sign Up
document.getElementById('signup-form').addEventListener('submit', function(e) {
    e.preventDefault();
    const formData = new FormData(this);
    const couponCode = formData.get('coupon-code');

    // Validate form data
    if (!validateForm(formData)) {
        return;
    }

    // Check coupon code
    if (couponCode) {
        if (validateCouponCode(couponCode)) {
            alert('Welcome! Your coupon code has been applied. Enjoy 20% off your first order!');
        } else {
            alert('Invalid coupon code. Please try again.');
            return;
        }
    }

    // Simulate API call
    simulateSignup(formData)
        .then(() => {
            alert('Account created successfully!');
            document.getElementById('signup-modal').style.display = 'none';
            this.reset();
        })
        .catch(error => {
            alert('Error creating account: ' + error.message);
        });
});

// Handle Login
document.getElementById('login-form').addEventListener('submit', function(e) {
    e.preventDefault();
    const formData = new FormData(this);

    // Validate form data
    if (!validateForm(formData)) {
        return;
    }

    // Simulate API call
    simulateLogin(formData)
        .then(() => {
            alert('Logged in successfully!');
            document.getElementById('login-modal').style.display = 'none';
            this.reset();
        })
        .catch(error => {
            alert('Error logging in: ' + error.message);
        });
});

// Handle Newsletter Subscription
document.getElementById('newsletter-form').addEventListener('submit', function(e) {
    e.preventDefault();
    const email = this.querySelector('input[type="email"]').value;

    if (!validateEmail(email)) {
        alert('Please enter a valid email address.');
        return;
    }

    // Simulate API call
    simulateNewsletterSubscription(email)
        .then(() => {
            alert('Thank you for subscribing to our newsletter!');
            this.reset();
        })
        .catch(error => {
            alert('Error subscribing: ' + error.message);
        });
});

// Form Validation
function validateForm(formData) {
    const email = formData.get('email');
    const password = formData.get('password');

    if (!validateEmail(email)) {
        alert('Please enter a valid email address.');
        return false;
    }

    if (password && password.length < 6) {
        alert('Password must be at least 6 characters long.');
        return false;
    }

    return true;
}

function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

function validateCouponCode(code) {
    // Add your coupon code validation logic here
    return code.length === 6 && /^[A-Z0-9]+$/.test(code);
}

// API Simulation Functions
function simulateSignup(formData) {
    return new Promise((resolve) => {
        setTimeout(resolve, 1000);
    });
}

function simulateLogin(formData) {
    return new Promise((resolve) => {
        setTimeout(resolve, 1000);
    });
}

function simulateNewsletterSubscription(email) {
    return new Promise((resolve) => {
        setTimeout(resolve, 1000);
    });
}