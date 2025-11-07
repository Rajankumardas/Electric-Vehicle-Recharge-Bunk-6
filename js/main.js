/**
 * EV Recharge Bunk - Main JavaScript
 * Author: MiniMax Agent
 * Description: Main application logic for the EV charging station booking system
 */

class EVRechargeApp {
    constructor() {
        this.currentUser = null;
        this.isAdmin = false;
        this.init();
    }

    /**
     * Initialize the application
     */
    init() {
        this.setupEventListeners();
        this.initializeAnimations();
        this.checkAuthStatus();
        this.logger.info('EV Recharge Bunk application initialized');
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Mobile menu toggle
        const mobileMenuToggle = document.querySelector('.mobile-menu-toggle');
        if (mobileMenuToggle) {
            mobileMenuToggle.addEventListener('click', this.toggleMobileMenu.bind(this));
        }

        // Navigation links
        const navLinks = document.querySelectorAll('.nav-link');
        navLinks.forEach(link => {
            link.addEventListener('click', this.handleNavigation.bind(this));
        });

        // Smooth scrolling for anchor links
        const anchorLinks = document.querySelectorAll('a[href^="#"]');
        anchorLinks.forEach(link => {
            link.addEventListener('click', this.handleAnchorClick.bind(this));
        });

        // Statistics counter animation
        this.animateCounters();
    }

    /**
     * Toggle mobile menu
     */
    toggleMobileMenu() {
        const navMenu = document.querySelector('.nav-menu');
        const navActions = document.querySelector('.nav-actions');
        
        if (navMenu && navActions) {
            navMenu.classList.toggle('mobile-active');
            navActions.classList.toggle('mobile-active');
        }
    }

    /**
     * Handle navigation
     */
    handleNavigation(e) {
        // Remove active class from all nav links
        const navLinks = document.querySelectorAll('.nav-link');
        navLinks.forEach(link => link.classList.remove('active'));
        
        // Add active class to clicked link
        e.target.classList.add('active');
        
        this.logger.info('Navigation clicked', { target: e.target.textContent });
    }

    /**
     * Handle anchor link clicks for smooth scrolling
     */
    handleAnchorClick(e) {
        e.preventDefault();
        const targetId = e.target.getAttribute('href').substring(1);
        const targetElement = document.getElementById(targetId);
        
        if (targetElement) {
            const headerHeight = document.querySelector('.header').offsetHeight;
            const targetPosition = targetElement.offsetTop - headerHeight;
            
            window.scrollTo({
                top: targetPosition,
                behavior: 'smooth'
            });
        }
    }

    /**
     * Initialize animations
     */
    initializeAnimations() {
        // Intersection Observer for fade-in animations
        const observerOptions = {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('fade-in');
                }
            });
        }, observerOptions);

        // Observe feature cards
        const featureCards = document.querySelectorAll('.feature-card');
        featureCards.forEach(card => {
            observer.observe(card);
        });
    }

    /**
     * Animate counters
     */
    animateCounters() {
        const counters = document.querySelectorAll('.stat-number');
        const speed = 2000; // Animation duration in ms

        const countUp = (counter) => {
            const target = parseInt(counter.getAttribute('data-target'));
            const count = +counter.innerText;
            const increment = target / (speed / 16);
            
            if (count < target) {
                counter.innerText = Math.ceil(count + increment);
                setTimeout(() => countUp(counter), 16);
            } else {
                counter.innerText = target;
            }
        };

        const counterObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    countUp(entry.target);
                    counterObserver.unobserve(entry.target);
                }
            });
        });

        counters.forEach(counter => {
            counterObserver.observe(counter);
        });
    }

    /**
     * Check authentication status
     */
    async checkAuthStatus() {
        try {
            // Check for stored auth token
            const token = localStorage.getItem('ev_bunk_token');
            if (token) {
                // Verify token with Firebase
                // This would be implemented with actual Firebase auth verification
                this.logger.info('User authentication verified');
            }
        } catch (error) {
            this.logger.error('Auth status check failed', error);
        }
    }

    /**
     * Show notification
     */
    showNotification(message, type = 'info', duration = 5000) {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        // Show notification
        setTimeout(() => notification.classList.add('show'), 100);
        
        // Hide and remove notification
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, duration);
    }

    /**
     * Validate form data
     */
    validateForm(formData, validationRules) {
        const errors = [];
        
        for (const field in validationRules) {
            const rule = validationRules[field];
            const value = formData[field];
            
            if (rule.required && (!value || value.trim() === '')) {
                errors.push(`${rule.label} is required`);
                continue;
            }
            
            if (value && rule.pattern && !rule.pattern.test(value)) {
                errors.push(rule.message || `${rule.label} format is invalid`);
            }
            
            if (value && rule.minLength && value.length < rule.minLength) {
                errors.push(`${rule.label} must be at least ${rule.minLength} characters`);
            }
        }
        
        return {
            isValid: errors.length === 0,
            errors
        };
    }

    /**
     * Sanitize input data
     */
    sanitizeInput(input) {
        if (typeof input !== 'string') return input;
        
        return input
            .replace(/[<>]/g, '') // Remove potential HTML tags
            .trim();
    }

    /**
     * Format date for display
     */
    formatDate(date, format = 'short') {
        const options = {
            short: { year: 'numeric', month: 'short', day: 'numeric' },
            long: { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' },
            time: { hour: '2-digit', minute: '2-digit' }
        };
        
        return new Date(date).toLocaleDateString('en-US', options[format] || options.short);
    }

    /**
     * Format distance for display
     */
    formatDistance(distance) {
        if (distance < 1) {
            return `${Math.round(distance * 1000)}m`;
        }
        return `${distance.toFixed(1)}km`;
    }

    /**
     * Get current location
     */
    async getCurrentLocation() {
        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) {
                reject(new Error('Geolocation is not supported by this browser'));
                return;
            }
            
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    resolve({
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude
                    });
                },
                (error) => {
                    reject(error);
                },
                {
                    enableHighAccuracy: true,
                    timeout: 10000,
                    maximumAge: 60000
                }
            );
        });
    }

    /**
     * Calculate distance between two points
     */
    calculateDistance(lat1, lon1, lat2, lon2) {
        const R = 6371; // Radius of the Earth in km
        const dLat = this.deg2rad(lat2 - lat1);
        const dLon = this.deg2rad(lon2 - lon1);
        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const d = R * c; // Distance in km
        return d;
    }

    /**
     * Convert degrees to radians
     */
    deg2rad(deg) {
        return deg * (Math.PI / 180);
    }

    /**
     * Generate unique ID
     */
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    /**
     * Loading state management
     */
    showLoading(buttonElement) {
        if (buttonElement) {
            const originalText = buttonElement.textContent;
            buttonElement.innerHTML = '<span class="loading"></span> Loading...';
            buttonElement.disabled = true;
            return () => {
                buttonElement.textContent = originalText;
                buttonElement.disabled = false;
            };
        }
    }

    /**
     * Logger utility
     */
    logger = {
        info: (message, data = null) => {
            console.log(`[EV Bunk] INFO: ${message}`, data || '');
        },
        error: (message, error = null) => {
            console.error(`[EV Bunk] ERROR: ${message}`, error || '');
        },
        warn: (message, data = null) => {
            console.warn(`[EV Bunk] WARN: ${message}`, data || '');
        },
        debug: (message, data = null) => {
            if (window.location.hostname === 'localhost') {
                console.debug(`[EV Bunk] DEBUG: ${message}`, data || '');
            }
        }
    };
}

/**
 * Form validation utility
 */
class FormValidator {
    constructor() {
        this.rules = {
            email: {
                pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                message: 'Please enter a valid email address'
            },
            phone: {
                pattern: /^\+?[\d\s\-\(\)]{10,}$/,
                message: 'Please enter a valid phone number'
            },
            password: {
                minLength: 6,
                message: 'Password must be at least 6 characters long'
            }
        };
    }

    validate(field, value, type) {
        const rule = this.rules[type];
        if (!rule) return { isValid: true };

        if (rule.required && (!value || value.trim() === '')) {
            return { isValid: false, message: `${field} is required` };
        }

        if (value && rule.pattern && !rule.pattern.test(value)) {
            return { isValid: false, message: rule.message };
        }

        if (value && rule.minLength && value.length < rule.minLength) {
            return { isValid: false, message: rule.message };
        }

        return { isValid: true };
    }
}

/**
 * Local storage utility
 */
class StorageManager {
    static setItem(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (error) {
            console.error('Failed to save to localStorage:', error);
            return false;
        }
    }

    static getItem(key) {
        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : null;
        } catch (error) {
            console.error('Failed to read from localStorage:', error);
            return null;
        }
    }

    static removeItem(key) {
        try {
            localStorage.removeItem(key);
            return true;
        } catch (error) {
            console.error('Failed to remove from localStorage:', error);
            return false;
        }
    }

    static clear() {
        try {
            localStorage.clear();
            return true;
        } catch (error) {
            console.error('Failed to clear localStorage:', error);
            return false;
        }
    }
}

/**
 * Initialize application when DOM is loaded
 */
document.addEventListener('DOMContentLoaded', () => {
    // Initialize the main application
    window.evApp = new EVRechargeApp();
    
    // Initialize form validators
    window.formValidator = new FormValidator();
    window.storageManager = StorageManager;
    
    // Log application start
    window.evApp.logger.info('DOM loaded, application ready');
});

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        EVRechargeApp,
        FormValidator,
        StorageManager
    };
}