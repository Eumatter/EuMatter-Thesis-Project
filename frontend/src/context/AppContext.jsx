import { createContext, useState, useEffect } from "react";
import api from '../utils/api';
import { getBackendUrl } from '../utils/backendUrl.js';

export const AppContent = createContext();

// Utility function to apply system settings globally
export const applySystemSettings = (settings) => {
    const root = document.documentElement;
    const body = document.body;
    
    if (!settings) {
        // Load from localStorage if not provided
        const savedSettings = localStorage.getItem('systemSettings');
        if (savedSettings) {
            try {
                settings = JSON.parse(savedSettings);
            } catch (error) {
                console.error('Error parsing system settings:', error);
                return;
            }
        } else {
            return; // No settings to apply
        }
    }
    
    // Apply font size (base font size on html element)
    // Note: This scales all rem-based units proportionally
    // To see larger headings, ensure font size is set to "Medium" or "Large"
    const fontSizeMap = {
        small: '87.5%', // 14px base (16px * 0.875) - scales everything down
        medium: '100%', // 16px base (default) - recommended for best visibility
        large: '112.5%', // 18px base (16px * 1.125) - scales everything up
        'extra-large': '125%' // 20px base (16px * 1.25) - scales everything up more
    };
    // Default to 'medium' if no setting exists for optimal heading visibility
    const fontSize = settings.fontSize || 'medium';
    root.style.fontSize = fontSizeMap[fontSize] || fontSizeMap.medium;
    root.setAttribute('data-font-size', fontSize);
    
    // Apply text contrast
    if (settings.textContrast === 'high' || settings.highContrast) {
        root.classList.add('high-contrast');
        body.classList.add('high-contrast');
        root.style.setProperty('--text-contrast', '1.5');
    } else {
        root.classList.remove('high-contrast');
        body.classList.remove('high-contrast');
        root.style.setProperty('--text-contrast', '1');
    }
    
    // Apply color scheme
    if (settings.colorScheme === 'dark') {
        root.classList.add('dark-mode');
        body.classList.add('dark-mode');
    } else {
        root.classList.remove('dark-mode');
        body.classList.remove('dark-mode');
    }
    
    // Apply reduced motion
    if (settings.reduceMotion) {
        root.classList.add('reduce-motion');
        body.classList.add('reduce-motion');
        root.style.setProperty('--animation-duration', '0s');
    } else {
        root.classList.remove('reduce-motion');
        body.classList.remove('reduce-motion');
        root.style.removeProperty('--animation-duration');
    }
};

export const AppContextProvider = (props) => {
    const backendUrl = getBackendUrl();
    const [isLoggedIn, setIsLoggedIn] = useState(false)
    const [userData, setUserData] = useState(null)
    const [isLoading, setIsLoading] = useState(true)

    // Load and apply system settings on app initialization
    useEffect(() => {
        applySystemSettings();
    }, []);

    // Check authentication on app load
    useEffect(() => {
        const checkAuth = async () => {
            try {
                const { data } = await api.get('/api/auth/is-authenticated')
                if (data?.success && data?.user) {
                    setUserData(data.user)
                    setIsLoggedIn(true)
                    // Note: Verification check is handled in ProtectedRoute and LoginPage
                } else {
                    setIsLoggedIn(false)
                    setUserData(null)
                }
            } catch (_) {
                setIsLoggedIn(false)
                setUserData(null)
            } finally {
                setIsLoading(false)
            }
        }

        checkAuth()
    }, [backendUrl])

    // Helper function to get dashboard route based on user role
    const getDashboardRoute = (role) => {
        switch (role) {
            case 'CRD Staff':
                return '/crd-staff/dashboard'
            case 'System Administrator':
                return '/system-admin/dashboard'
            case 'Department/Organization':
                return '/department/dashboard'
            case 'Auditor':
                return '/auditor/dashboard'
            case 'User':
            default:
                return '/user/dashboard'
        }
    }

    const value = {
        backendUrl,
        isLoggedIn, setIsLoggedIn,
        userData, setUserData,
        isLoading,
        getDashboardRoute
    }

    return (
        <AppContent.Provider value={value}>
            {props.children}
        </AppContent.Provider>
    )
}