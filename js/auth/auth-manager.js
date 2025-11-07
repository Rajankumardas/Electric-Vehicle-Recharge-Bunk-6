/**
 * Authentication Manager
 * Author: MiniMax Agent
 * Description: Centralized authentication management for the EV Recharge Bunk system
 */

class AuthManager {
    constructor() {
        this.currentUser = null;
        this.isAdmin = false;
        this.init();
    }

    /**
     * Initialize authentication manager
     */
    init() {
        this.setupAuthStateListener();
        this.logger.info('AuthManager initialized');
    }

    /**
     * Setup Firebase auth state listener
     */
    setupAuthStateListener() {
        if (typeof window.firebase !== 'undefined' && window.FirebaseConfig) {
            const { auth, onAuthStateChanged } = window.firebase;
            
            onAuthStateChanged(auth, async (user) => {
                if (user) {
                    await this.handleUserLogin(user);
                } else {
                    this.handleUserLogout();
                }
            });
        }
    }

    /**
     * Handle user login
     */
    async handleUserLogin(user) {
        try {
            this.currentUser = user;
            
            // Check if user is admin
            const adminCheck = await window.FirebaseConfig.authMethods.checkAdminRole(user.uid);
            this.isAdmin = adminCheck.isAdmin;
            
            // Store user session
            this.storeUserSession(user, adminCheck);
            
            // Log successful authentication
            this.logger.info('User authenticated', { 
                userId: user.uid, 
                isAdmin: this.isAdmin 
            });
            
            // Show success notification
            this.showNotification('Authentication successful!', 'success');
            
            // Redirect based on user role
            this.redirectAfterLogin();
            
        } catch (error) {
            this.logger.error('Login handler error', error);
            this.showNotification('Authentication failed', 'error');
        }
    }

    /**
     * Handle user logout
     */
    handleUserLogout() {
        this.currentUser = null;
        this.isAdmin = false;
        this.clearUserSession();
        
        this.logger.info('User logged out');
        
        // Redirect to appropriate login page
        if (window.location.pathname.includes('admin')) {
            window.location.href = 'admin-login.html';
        } else {
            window.location.href = 'user-login.html';
        }
    }

    /**
     * Store user session
     */
    storeUserSession(user, adminCheck) {
        const sessionData = {
            userId: user.uid,
            email: user.email,
            displayName: user.displayName,
            isAdmin: adminCheck.isAdmin,
            role: adminCheck.role,
            permissions: adminCheck.permissions || [],
            loginTime: Date.now()
        };
        
        localStorage.setItem('ev_bunk_session', JSON.stringify(sessionData));
    }

    /**
     * Clear user session
     */
    clearUserSession() {
        localStorage.removeItem('ev_bunk_session');
        sessionStorage.removeItem('ev_bunk_session');
    }

    /**
     * Get stored session
     */
    getStoredSession() {
        try {
            const session = localStorage.getItem('ev_bunk_session') || 
                          sessionStorage.getItem('ev_bunk_session');
            return session ? JSON.parse(session) : null;
        } catch (error) {
            this.logger.error('Error retrieving session', error);
            return null;
        }
    }

    /**
     * Check if user is authenticated
     */
    isAuthenticated() {
        return this.currentUser !== null || this.getStoredSession() !== null;
    }

    /**
     * Check if user has permission
     */
    hasPermission(permission) {
        const session = this.getStoredSession();
        if (!session || !session.permissions) return false;
        
        return session.permissions.includes(permission);
    }

    /**
     * Redirect after successful login
     */
    redirectAfterLogin() {
        const currentPage = window.location.pathname;
        const session = this.getStoredSession();
        
        if (session && session.isAdmin) {
            // Admin user trying to access admin area
            if (currentPage.includes('admin-login') || currentPage.includes('user-login')) {
                window.location.href = 'admin-dashboard.html';
            }
        } else {
            // Regular user
            if (currentPage.includes('admin-login')) {
                this.showNotification('Please use user login', 'warning');
                window.location.href = 'user-login.html';
            } else if (currentPage.includes('admin-dashboard')) {
                this.showNotification('Admin access required', 'error');
                window.location.href = 'user-login.html';
            }
        }
    }

    /**
     * Sign out user
     */
    async signOut() {
        try {
            const result = await window.FirebaseConfig.authMethods.signOut();
            if (result.success) {
                this.logger.info('User signed out successfully');
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            this.logger.error('Sign out error', error);
            this.showNotification('Error signing out', 'error');
        }
    }

    /**
     * Get current user data
     */
    getCurrentUser() {
        return this.currentUser;
    }

    /**
     * Get user profile data
     */
    async getUserProfile() {
        if (!this.currentUser) return null;
        
        try {
            const { doc, getDoc } = window.firebase;
            const docSnap = await getDoc(
                doc(window.FirebaseConfig.firebaseServices.firestore, 'users', this.currentUser.uid)
            );
            
            if (docSnap.exists()) {
                return { userId: docSnap.id, ...docSnap.data() };
            }
            
            return null;
        } catch (error) {
            this.logger.error('Error fetching user profile', error);
            return null;
        }
    }

    /**
     * Update user profile
     */
    async updateUserProfile(updateData) {
        if (!this.currentUser) {
            throw new Error('User not authenticated');
        }
        
        try {
            const { doc, updateDoc, serverTimestamp } = window.firebase;
            const { firestore } = window.FirebaseConfig.firebaseServices;
            
            await updateDoc(doc(firestore, 'users', this.currentUser.uid), {
                ...updateData,
                updatedAt: serverTimestamp()
            });
            
            this.logger.info('User profile updated', { userId: this.currentUser.uid });
            return { success: true };
        } catch (error) {
            this.logger.error('Error updating user profile', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Show notification
     */
    showNotification(message, type = 'info', duration = 5000) {
        // Use the app's notification system if available
        if (window.evApp && window.evApp.showNotification) {
            window.evApp.showNotification(message, type, duration);
        } else {
            // Fallback to console
            console.log(`[${type.toUpperCase()}] ${message}`);
        }
    }

    /**
     * Validate authentication for protected routes
     */
    validateAuth(requiredRole = 'user') {
        const session = this.getStoredSession();
        
        if (!this.isAuthenticated() || !session) {
            this.redirectToLogin(requiredRole);
            return false;
        }
        
        if (requiredRole === 'admin' && !session.isAdmin) {
            this.showNotification('Admin access required', 'error');
            this.redirectToLogin('admin');
            return false;
        }
        
        return true;
    }

    /**
     * Redirect to appropriate login page
     */
    redirectToLogin(role = 'user') {
        const loginPage = role === 'admin' ? 'admin-login.html' : 'user-login.html';
        
        // Store the intended destination
        sessionStorage.setItem('ev_bunk_intended_destination', window.location.pathname);
        
        window.location.href = loginPage;
    }

    /**
     * Get intended destination after login
     */
    getIntendedDestination() {
        return sessionStorage.getItem('ev_bunk_intended_destination') || 'index.html';
    }

    /**
     * Password strength validation
     */
    validatePasswordStrength(password) {
        const requirements = {
            minLength: password.length >= 8,
            hasUppercase: /[A-Z]/.test(password),
            hasLowercase: /[a-z]/.test(password),
            hasNumbers: /\d/.test(password),
            hasSpecialChar: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)
        };
        
        const strength = Object.values(requirements).filter(Boolean).length;
        
        return {
            requirements,
            strength,
            isStrong: strength >= 4,
            feedback: this.getPasswordFeedback(strength, requirements)
        };
    }

    /**
     * Get password feedback
     */
    getPasswordFeedback(strength, requirements) {
        const feedback = [];
        
        if (!requirements.minLength) feedback.push('At least 8 characters');
        if (!requirements.hasUppercase) feedback.push('One uppercase letter');
        if (!requirements.hasLowercase) feedback.push('One lowercase letter');
        if (!requirements.hasNumbers) feedback.push('One number');
        if (!requirements.hasSpecialChar) feedback.push('One special character');
        
        if (strength < 2) return { level: 'weak', message: 'Password is too weak', feedback };
        if (strength < 4) return { level: 'medium', message: 'Password is okay', feedback };
        if (strength < 5) return { level: 'strong', message: 'Password is strong', feedback };
        return { level: 'very-strong', message: 'Password is very strong', feedback };
    }

    /**
     * Logger utility
     */
    logger = {
        info: (message, data = null) => {
            console.log(`[AuthManager] INFO: ${message}`, data || '');
        },
        error: (message, error = null) => {
            console.error(`[AuthManager] ERROR: ${message}`, error || '');
        },
        warn: (message, data = null) => {
            console.warn(`[AuthManager] WARN: ${message}`, data || '');
        }
    };
}

// Export for global use
if (typeof window !== 'undefined') {
    window.AuthManager = AuthManager;
}

// For module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AuthManager;
}