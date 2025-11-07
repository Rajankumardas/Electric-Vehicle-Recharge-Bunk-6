/**
 * User Authentication
 * Author: MiniMax Agent
 * Description: User-specific authentication logic for login and registration
 */

class UserAuthentication {
    constructor() {
        this.authManager = new AuthManager();
        this.formValidator = new FormValidator();
        this.init();
    }

    /**
     * Initialize user authentication
     */
    init() {
        this.setupEventListeners();
        this.checkAuthStatus();
        this.logger.info('UserAuthentication initialized');
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // User login form
        const loginForm = document.getElementById('userLoginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', this.handleUserLogin.bind(this));
        }

        // User registration form
        const registerForm = document.getElementById('userRegisterForm');
        if (registerForm) {
            registerForm.addEventListener('submit', this.handleUserRegistration.bind(this));
            this.setupPasswordValidation();
        }

        // Password toggles
        this.setupPasswordToggles();
    }

    /**
     * Check current authentication status
     */
    checkAuthStatus() {
        if (this.authManager.isAuthenticated()) {
            const session = this.authManager.getStoredSession();
            if (session && !session.isAdmin) {
                // Redirect authenticated users away from login pages
                const currentPage = window.location.pathname;
                if (currentPage.includes('login') || currentPage.includes('register')) {
                    window.location.href = 'user-dashboard.html';
                }
            }
        }
    }

    /**
     * Handle user login
     */
    async handleUserLogin(event) {
        event.preventDefault();
        
        const form = event.target;
        const formData = new FormData(form);
        const userData = {
            email: formData.get('email'),
            password: formData.get('password')
        };

        // Validate form data
        const validation = this.validateLoginForm(userData);
        if (!validation.isValid) {
            this.showFormErrors(validation.errors);
            return;
        }

        // Show loading state
        const submitButton = form.querySelector('button[type="submit"]');
        const resetLoading = this.showLoading(submitButton);

        try {
            // Attempt to sign in
            const result = await window.FirebaseConfig.authMethods.signIn(
                userData.email, 
                userData.password
            );

            if (result.success) {
                this.logger.info('User login successful', { email: userData.email });
                
                // Check remember me
                const rememberMe = formData.get('rememberMe');
                if (rememberMe) {
                    localStorage.setItem('ev_bunk_remember_me', 'true');
                }

                // Show success and redirect
                this.showNotification('Login successful! Redirecting...', 'success');
                
                setTimeout(() => {
                    const destination = this.authManager.getIntendedDestination();
                    window.location.href = destination;
                }, 1500);
                
            } else {
                this.showError('loginError', this.getErrorMessage(result.error));
            }
        } catch (error) {
            this.logger.error('Login error', error);
            this.showError('loginError', 'An unexpected error occurred. Please try again.');
        } finally {
            resetLoading();
        }
    }

    /**
     * Handle user registration
     */
    async handleUserRegistration(event) {
        event.preventDefault();
        
        const form = event.target;
        const formData = new FormData(form);
        const userData = {
            firstName: formData.get('firstName'),
            lastName: formData.get('lastName'),
            email: formData.get('email'),
            phone: formData.get('phone'),
            password: formData.get('password'),
            confirmPassword: formData.get('confirmPassword'),
            vehicleType: formData.get('vehicleType'),
            termsAccepted: formData.get('termsAccepted'),
            newsletter: formData.get('newsletter')
        };

        // Validate form data
        const validation = this.validateRegistrationForm(userData);
        if (!validation.isValid) {
            this.showFormErrors(validation.errors);
            return;
        }

        // Show loading state
        const submitButton = form.querySelector('button[type="submit"]');
        const resetLoading = this.showLoading(submitButton);

        try {
            // Attempt to sign up
            const result = await window.FirebaseConfig.authMethods.signUp(
                userData.email, 
                userData.password, 
                {
                    firstName: userData.firstName,
                    lastName: userData.lastName,
                    phone: userData.phone,
                    vehicleType: userData.vehicleType
                }
            );

            if (result.success) {
                this.logger.info('User registration successful', { email: userData.email });
                
                // Show success message
                this.showNotification('Account created successfully! Please check your email for verification.', 'success');
                
                // Clear form
                form.reset();
                
                // Redirect to login after 3 seconds
                setTimeout(() => {
                    window.location.href = 'user-login.html';
                }, 3000);
                
            } else {
                this.showError('registrationError', this.getErrorMessage(result.error));
            }
        } catch (error) {
            this.logger.error('Registration error', error);
            this.showError('registrationError', 'An unexpected error occurred. Please try again.');
        } finally {
            resetLoading();
        }
    }

    /**
     * Setup password validation for registration
     */
    setupPasswordValidation() {
        const passwordInput = document.getElementById('password');
        const confirmPasswordInput = document.getElementById('confirmPassword');
        const strengthIndicator = document.getElementById('passwordStrength');

        if (passwordInput) {
            passwordInput.addEventListener('input', (e) => {
                this.updatePasswordStrength(e.target.value, strengthIndicator);
                this.validatePasswordMatch();
            });
        }

        if (confirmPasswordInput) {
            confirmPasswordInput.addEventListener('input', () => {
                this.validatePasswordMatch();
            });
        }
    }

    /**
     * Update password strength indicator
     */
    updatePasswordStrength(password, indicator) {
        if (!indicator) return;

        const strength = this.authManager.validatePasswordStrength(password);
        
        const strengthBar = indicator.querySelector('.strength-fill');
        const strengthText = indicator.querySelector('.strength-text');

        if (password.length === 0) {
            indicator.style.display = 'none';
            return;
        }

        indicator.style.display = 'block';
        
        // Update progress bar
        const percentage = (strength.strength / 5) * 100;
        strengthBar.style.width = percentage + '%';
        
        // Set color based on strength
        const colors = {
            weak: '#ef4444',
            medium: '#f59e0b',
            strong: '#10b981',
            'very-strong': '#059669'
        };
        strengthBar.style.background = colors[strength.feedback.level];
        
        // Update text
        strengthText.textContent = strength.feedback.message;
        
        // Show requirements if not strong
        if (!strength.isStrong && strength.feedback.feedback.length > 0) {
            const requirementsList = strength.feedback.feedback.join(', ');
            strengthText.title = `Missing: ${requirementsList}`;
        } else {
            strengthText.title = '';
        }
    }

    /**
     * Validate password match
     */
    validatePasswordMatch() {
        const password = document.getElementById('password');
        const confirmPassword = document.getElementById('confirmPassword');
        
        if (password && confirmPassword) {
            const passwordError = document.getElementById('passwordError');
            const confirmPasswordError = document.getElementById('confirmPasswordError');
            
            if (password.value && confirmPassword.value) {
                if (password.value !== confirmPassword.value) {
                    this.showError('confirmPasswordError', 'Passwords do not match');
                    password.classList.add('error');
                    confirmPassword.classList.add('error');
                } else {
                    this.clearError('confirmPasswordError');
                    password.classList.remove('error');
                    confirmPassword.classList.remove('error');
                }
            }
        }
    }

    /**
     * Setup password toggle buttons
     */
    setupPasswordToggles() {
        const toggles = document.querySelectorAll('.password-toggle');
        
        toggles.forEach(toggle => {
            toggle.addEventListener('click', (e) => {
                e.preventDefault();
                const targetId = toggle.getAttribute('data-target');
                const targetInput = document.getElementById(targetId);
                
                if (targetInput) {
                    const type = targetInput.getAttribute('type') === 'password' ? 'text' : 'password';
                    targetInput.setAttribute('type', type);
                    
                    const icon = toggle.querySelector('i');
                    icon.className = type === 'password' ? 'fas fa-eye' : 'fas fa-eye-slash';
                }
            });
        });
    }

    /**
     * Validate login form
     */
    validateLoginForm(userData) {
        const errors = [];

        // Email validation
        const emailValidation = this.formValidator.validate('Email', userData.email, 'email');
        if (!emailValidation.isValid) {
            errors.push({ field: 'emailError', message: emailValidation.message });
        }

        // Password validation
        if (!userData.password || userData.password.length < 6) {
            errors.push({ field: 'passwordError', message: 'Password must be at least 6 characters' });
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    /**
     * Validate registration form
     */
    validateRegistrationForm(userData) {
        const errors = [];

        // Required fields
        const requiredFields = [
            { name: 'First Name', value: userData.firstName, field: 'firstNameError' },
            { name: 'Last Name', value: userData.lastName, field: 'lastNameError' },
            { name: 'Email', value: userData.email, field: 'emailError' },
            { name: 'Phone', value: userData.phone, field: 'phoneError' },
            { name: 'Vehicle Type', value: userData.vehicleType, field: 'vehicleTypeError' }
        ];

        requiredFields.forEach(field => {
            if (!field.value || field.value.trim() === '') {
                errors.push({ field: field.field, message: `${field.name} is required` });
            }
        });

        // Email validation
        const emailValidation = this.formValidator.validate('Email', userData.email, 'email');
        if (!emailValidation.isValid) {
            errors.push({ field: 'emailError', message: emailValidation.message });
        }

        // Phone validation
        const phoneValidation = this.formValidator.validate('Phone', userData.phone, 'phone');
        if (!phoneValidation.isValid) {
            errors.push({ field: 'phoneError', message: phoneValidation.message });
        }

        // Password validation
        if (!userData.password || userData.password.length < 8) {
            errors.push({ field: 'passwordError', message: 'Password must be at least 8 characters' });
        }

        // Terms acceptance
        if (!userData.termsAccepted) {
            errors.push({ field: 'termsError', message: 'You must accept the terms and conditions' });
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    /**
     * Show form errors
     */
    showFormErrors(errors) {
        errors.forEach(error => {
            this.showError(error.field, error.message);
        });
    }

    /**
     * Show individual field error
     */
    showError(fieldId, message) {
        const errorElement = document.getElementById(fieldId);
        if (errorElement) {
            errorElement.textContent = message;
            errorElement.style.display = 'block';
            
            // Add error class to input if exists
            const inputId = fieldId.replace('Error', '');
            const input = document.getElementById(inputId);
            if (input) {
                input.classList.add('error');
            }
        }
    }

    /**
     * Clear field error
     */
    clearError(fieldId) {
        const errorElement = document.getElementById(fieldId);
        if (errorElement) {
            errorElement.textContent = '';
            errorElement.style.display = 'none';
            
            // Remove error class from input if exists
            const inputId = fieldId.replace('Error', '');
            const input = document.getElementById(inputId);
            if (input) {
                input.classList.remove('error');
            }
        }
    }

    /**
     * Get error message from Firebase error
     */
    getErrorMessage(firebaseError) {
        const errorMap = {
            'auth/user-not-found': 'No account found with this email address.',
            'auth/wrong-password': 'Incorrect password. Please try again.',
            'auth/email-already-in-use': 'An account with this email already exists.',
            'auth/weak-password': 'Password is too weak. Please choose a stronger password.',
            'auth/invalid-email': 'Please enter a valid email address.',
            'auth/user-disabled': 'This account has been disabled. Please contact support.',
            'auth/too-many-requests': 'Too many failed attempts. Please try again later.'
        };

        return errorMap[firebaseError] || 'An error occurred. Please try again.';
    }

    /**
     * Show loading state
     */
    showLoading(buttonElement) {
        if (buttonElement) {
            const originalText = buttonElement.innerHTML;
            buttonElement.innerHTML = '<span class="loading"></span> Processing...';
            buttonElement.disabled = true;
            return () => {
                buttonElement.innerHTML = originalText;
                buttonElement.disabled = false;
            };
        }
        return () => {};
    }

    /**
     * Show notification
     */
    showNotification(message, type = 'info', duration = 5000) {
        if (window.evApp && window.evApp.showNotification) {
            window.evApp.showNotification(message, type, duration);
        } else {
            console.log(`[${type.toUpperCase()}] ${message}`);
        }
    }

    /**
     * Logger utility
     */
    logger = {
        info: (message, data = null) => {
            console.log(`[UserAuth] INFO: ${message}`, data || '');
        },
        error: (message, error = null) => {
            console.error(`[UserAuth] ERROR: ${message}`, error || '');
        },
        warn: (message, data = null) => {
            console.warn(`[UserAuth] WARN: ${message}`, data || '');
        }
    };
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Only initialize on authentication pages
    const authPages = ['user-login', 'user-register', 'user-dashboard'];
    const currentPage = window.location.pathname;
    
    if (authPages.some(page => currentPage.includes(page))) {
        window.userAuth = new UserAuthentication();
        console.log('UserAuthentication initialized');
    }
});

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = UserAuthentication;
}