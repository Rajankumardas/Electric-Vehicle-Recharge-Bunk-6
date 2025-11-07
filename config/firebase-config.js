/**
 * Firebase Configuration for EV Recharge Bunk
 * Author: MiniMax Agent
 * Description: Firebase setup and initialization
 */

// Firebase configuration
const firebaseConfig = {
    // Replace with your actual Firebase config
    apiKey: "your-api-key-here",
    authDomain: "your-project-id.firebaseapp.com",
    projectId: "your-project-id",
    storageBucket: "your-project-id.appspot.com",
    messagingSenderId: "123456789",
    appId: "your-app-id-here"
};

// Firebase services configuration
const firebaseServices = {
    auth: null,
    firestore: null,
    storage: null
};

/**
 * Initialize Firebase
 */
function initializeFirebase() {
    try {
        // Import Firebase modules
        const { initializeApp } = window.firebase;
        const { getAuth } = window.firebase;
        const { getFirestore } = window.firebase;
        const { getStorage } = window.firebase;

        // Initialize Firebase app
        const app = initializeApp(firebaseConfig);
        
        // Initialize Firebase services
        firebaseServices.auth = getAuth(app);
        firebaseServices.firestore = getFirestore(app);
        firebaseServices.storage = getStorage(app);

        console.log('Firebase initialized successfully');
        return true;
    } catch (error) {
        console.error('Firebase initialization failed:', error);
        return false;
    }
}

/**
 * Database Schema for EV Recharge Bunk
 */
const databaseSchema = {
    // Users collection
    users: {
        userId: "string",
        email: "string",
        firstName: "string",
        lastName: "string",
        phone: "string",
        vehicleType: "string",
        createdAt: "timestamp",
        updatedAt: "timestamp",
        isActive: "boolean"
    },
    
    // Charging stations collection
    chargingStations: {
        stationId: "string",
        name: "string",
        address: "string",
        location: {
            latitude: "number",
            longitude: "number"
        },
        contact: {
            phone: "string",
            email: "string"
        },
        totalSlots: "number",
        availableSlots: "number",
        chargingTypes: ["string"],
        chargingSpeed: "string",
        isActive: "boolean",
        createdAt: "timestamp",
        updatedAt: "timestamp"
    },
    
    // Charging slots collection
    chargingSlots: {
        slotId: "string",
        stationId: "string",
        slotNumber: "string",
        isAvailable: "boolean",
        chargingType: "string",
        maxPower: "number",
        createdAt: "timestamp",
        updatedAt: "timestamp"
    },
    
    // Bookings collection
    bookings: {
        bookingId: "string",
        userId: "string",
        stationId: "string",
        slotId: "string",
        bookingDate: "timestamp",
        startTime: "timestamp",
        endTime: "timestamp",
        status: "string", // pending, confirmed, in_progress, completed, cancelled
        estimatedDuration: "number", // in minutes
        actualDuration: "number",
        totalCost: "number",
        createdAt: "timestamp",
        updatedAt: "timestamp"
    },
    
    // Admin users collection
    adminUsers: {
        adminId: "string",
        email: "string",
        role: "string",
        permissions: ["string"],
        isActive: "boolean",
        createdAt: "timestamp",
        lastLogin: "timestamp"
    }
};

/**
 * Firebase Authentication Methods
 */
const authMethods = {
    /**
     * Sign up new user
     */
    signUp: async (email, password, userData) => {
        try {
            const { createUserWithEmailAndPassword } = window.firebase;
            const { updateProfile } = window.firebase;
            const { serverTimestamp } = window.firebase;
            
            const userCredential = await createUserWithEmailAndPassword(
                firebaseServices.auth, 
                email, 
                password
            );
            
            // Update user profile
            await updateProfile(userCredential.user, {
                displayName: `${userData.firstName} ${userData.lastName}`
            });
            
            // Save user data to Firestore
            const { doc, setDoc } = window.firebase;
            await setDoc(doc(firebaseServices.firestore, 'users', userCredential.user.uid), {
                userId: userCredential.user.uid,
                email: email,
                firstName: userData.firstName,
                lastName: userData.lastName,
                phone: userData.phone,
                vehicleType: userData.vehicleType,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
                isActive: true
            });
            
            return {
                success: true,
                user: userCredential.user,
                userData: userData
            };
        } catch (error) {
            console.error('Sign up error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    },
    
    /**
     * Sign in user
     */
    signIn: async (email, password) => {
        try {
            const { signInWithEmailAndPassword } = window.firebase;
            const userCredential = await signInWithEmailAndPassword(
                firebaseServices.auth, 
                email, 
                password
            );
            
            // Update last login
            const { doc, updateDoc, serverTimestamp } = window.firebase;
            await updateDoc(doc(firebaseServices.firestore, 'users', userCredential.user.uid), {
                lastLogin: serverTimestamp(),
                updatedAt: serverTimestamp()
            });
            
            return {
                success: true,
                user: userCredential.user
            };
        } catch (error) {
            console.error('Sign in error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    },
    
    /**
     * Sign out user
     */
    signOut: async () => {
        try {
            const { signOut } = window.firebase;
            await signOut(firebaseServices.auth);
            return { success: true };
        } catch (error) {
            console.error('Sign out error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    },
    
    /**
     * Get current user
     */
    getCurrentUser: () => {
        return firebaseServices.auth.currentUser;
    },
    
    /**
     * Check if user is admin
     */
    checkAdminRole: async (userId) => {
        try {
            const { doc, getDoc } = window.firebase;
            const docSnap = await getDoc(doc(firebaseServices.firestore, 'adminUsers', userId));
            
            if (docSnap.exists()) {
                const adminData = docSnap.data();
                return {
                    isAdmin: true,
                    role: adminData.role,
                    permissions: adminData.permissions
                };
            }
            
            return { isAdmin: false };
        } catch (error) {
            console.error('Admin check error:', error);
            return { isAdmin: false, error: error.message };
        }
    }
};

/**
 * Firestore Database Methods
 */
const dbMethods = {
    /**
     * Get all charging stations
     */
    getChargingStations: async () => {
        try {
            const { collection, getDocs, query, where, orderBy } = window.firebase;
            const q = query(
                collection(firebaseServices.firestore, 'chargingStations'),
                where('isActive', '==', true),
                orderBy('name')
            );
            
            const querySnapshot = await getDocs(q);
            const stations = [];
            
            querySnapshot.forEach((doc) => {
                stations.push({
                    stationId: doc.id,
                    ...doc.data()
                });
            });
            
            return {
                success: true,
                stations: stations
            };
        } catch (error) {
            console.error('Get stations error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    },
    
    /**
     * Get nearby charging stations
     */
    getNearbyStations: async (latitude, longitude, radiusKm = 10) => {
        try {
            // This is a simplified version. In production, you'd use Firestore's 
            // geohash queries or a dedicated geospatial database
            const result = await dbMethods.getChargingStations();
            
            if (!result.success) return result;
            
            // Filter stations by distance (simplified)
            const nearbyStations = result.stations.filter(station => {
                if (!station.location) return false;
                
                const distance = calculateDistance(
                    latitude, longitude,
                    station.location.latitude, station.location.longitude
                );
                
                return distance <= radiusKm;
            });
            
            return {
                success: true,
                stations: nearbyStations
            };
        } catch (error) {
            console.error('Get nearby stations error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    },
    
    /**
     * Create new charging station
     */
    createChargingStation: async (stationData) => {
        try {
            const { collection, addDoc, serverTimestamp } = window.firebase;
            
            const docRef = await addDoc(collection(firebaseServices.firestore, 'chargingStations'), {
                ...stationData,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
                isActive: true
            });
            
            return {
                success: true,
                stationId: docRef.id
            };
        } catch (error) {
            console.error('Create station error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    },
    
    /**
     * Update charging station
     */
    updateChargingStation: async (stationId, updateData) => {
        try {
            const { doc, updateDoc, serverTimestamp } = window.firebase;
            
            await updateDoc(doc(firebaseServices.firestore, 'chargingStations', stationId), {
                ...updateData,
                updatedAt: serverTimestamp()
            });
            
            return { success: true };
        } catch (error) {
            console.error('Update station error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    },
    
    /**
     * Get user bookings
     */
    getUserBookings: async (userId) => {
        try {
            const { collection, getDocs, query, where, orderBy } = window.firebase;
            const q = query(
                collection(firebaseServices.firestore, 'bookings'),
                where('userId', '==', userId),
                orderBy('bookingDate', 'desc')
            );
            
            const querySnapshot = await getDocs(q);
            const bookings = [];
            
            querySnapshot.forEach((doc) => {
                bookings.push({
                    bookingId: doc.id,
                    ...doc.data()
                });
            });
            
            return {
                success: true,
                bookings: bookings
            };
        } catch (error) {
            console.error('Get bookings error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    },
    
    /**
     * Create new booking
     */
    createBooking: async (bookingData) => {
        try {
            const { collection, addDoc, serverTimestamp } = window.firebase;
            
            const docRef = await addDoc(collection(firebaseServices.firestore, 'bookings'), {
                ...bookingData,
                status: 'pending',
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            });
            
            return {
                success: true,
                bookingId: docRef.id
            };
        } catch (error) {
            console.error('Create booking error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
};

/**
 * Helper function to calculate distance between two points
 */
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
        Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}

// Export for global use
if (typeof window !== 'undefined') {
    window.FirebaseConfig = {
        initializeFirebase,
        firebaseServices,
        databaseSchema,
        authMethods,
        dbMethods
    };
}

// For module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        initializeFirebase,
        firebaseServices,
        databaseSchema,
        authMethods,
        dbMethods
    };
}