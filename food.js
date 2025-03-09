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