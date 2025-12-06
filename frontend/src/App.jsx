import React, { useEffect } from 'react'
import { Routes, Route, useLocation } from 'react-router-dom'
import { toast } from 'react-toastify'
import axios from 'axios'
import { getBackendUrl } from './utils/backendUrl.js'
import Home from './pages/Home.jsx'
import PublicCampaigns from './pages/PublicCampaigns.jsx'
import Login from './pages/auth/LoginPage.jsx'
import RegisterPage from './pages/auth/RegisterPage.jsx'
import NotFound from './pages/NotFound.jsx'
import VerifyEmailPage from './pages/auth/VerifyEmailPage'
import ResetPasswordPage from './pages/auth/ResetPasswordPage'
import UserDashboard from './pages/user/User/UserDashboard.jsx'
import UserEvents from './pages/user/User/UserEvents.jsx'
import UserProfile from './pages/user/User/UserProfile.jsx'
import VolunteerHistory from './pages/user/User/VolunteerHistory.jsx'
import EventDetails from './pages/user/User/EventDetails.jsx'
import CalendarPage from './pages/common/CalendarPage.jsx'
import CRDDashboard from './pages/user/CRD_Staff/CRDDashboard.jsx'
import EventManagement from './pages/user/CRD_Staff/EventManagement.jsx'
import Reports from './pages/user/CRD_Staff/Reports.jsx'
import DepartmentLeaderboard from './pages/user/CRD_Staff/DepartmentLeaderboard.jsx'
import InKindDonations from './pages/user/CRD_Staff/InKindDonations.jsx'
import CRDDonations from './pages/user/CRD_Staff/CRDDonations.jsx'
import SystemAdminDashboard from './pages/user/System_Admin/SystemAdminDashboard.jsx'
import UserManagement from './pages/user/System_Admin/UserManagement.jsx'
import SystemAdminSettings from './pages/user/System_Admin/SystemSettings.jsx'
import SystemReports from './pages/user/System_Admin/SystemReports.jsx'
import WalletManagement from './pages/user/System_Admin/WalletManagement.jsx'
import WalletStatus from './pages/user/Department/WalletStatus.jsx'
import ProtectedRoute from './components/ProtectedRoute.jsx'
import { ToastContainer } from 'react-toastify'
import DepartmentDashboard from './pages/user/Department/DepartmentDashboard'
import DepartmentEventManagement from './pages/user/Department/EventManagement'
import DepartmentDonations from './pages/user/Department/DepartmentDonations'
import DepartmentReports from './pages/user/Department/DepartmentReports'
import VolunteerManagement from './pages/user/Department/VolunteerManagement'
import DepartmentEventDetails from './pages/user/Department/EventDetails'
import QRScanner from './pages/user/QRScanner'
import EventAttendance from './pages/user/EventAttendance'
import DonationForm from './components/DonationForm.jsx'
import DonationHistory from './pages/user/User/DonationHistory.jsx'
import PaymentProcessing from './pages/PaymentProcessing.jsx'
import PWAInstallPrompt from './components/PWAInstallPrompt.jsx'
import TermsAndConditions from './pages/auth/TermsAndConditions.jsx'
import SystemSettings from './pages/common/SystemSettings.jsx'
import Program from './pages/Program.jsx'
import NSTP from './pages/NSTP.jsx'
import About from './pages/About.jsx'
import SuccessStories from './pages/SuccessStories.jsx'
import SafetyGuidelines from './pages/SafetyGuidelines.jsx'
import PrivacyPolicy from './pages/PrivacyPolicy.jsx'
import TermsOfService from './pages/TermsOfService.jsx'
import Notifications from './pages/user/Notifications.jsx'
import NotificationPreferences from './pages/user/NotificationPreferences.jsx'
import MaintenanceMode from './pages/MaintenanceMode.jsx'
import UserManual from './pages/UserManual.jsx'
import { AppContent as AppContext } from './context/AppContext.jsx'
import { CacheProvider } from './context/CacheContext.jsx'
import PushNotificationPrompt from './components/PushNotificationPrompt.jsx'

const AppContent = () => {
    const location = useLocation();
    const { userData, isLoggedIn, setUserData, setIsLoggedIn } = React.useContext(AppContext);
    const [maintenanceMode, setMaintenanceMode] = React.useState(false);
    const [maintenanceAllowedRoles, setMaintenanceAllowedRoles] = React.useState(['System Administrator', 'CRD Staff']);
    const [isCheckingMaintenance, setIsCheckingMaintenance] = React.useState(true);
    
    // Pages where Install App button should be shown (home page only)
    const showInstallButton = location.pathname === '/';
    
    // Check maintenance mode status
    useEffect(() => {
        const checkMaintenanceMode = async () => {
            try {
                const backendUrl = getBackendUrl();
                const { data } = await axios.get(backendUrl + 'api/system-settings/maintenance-mode');
                if (data.success) {
                    setMaintenanceMode(data.maintenanceMode);
                    setMaintenanceAllowedRoles(data.allowedRoles || ['System Administrator', 'CRD Staff']);
                }
            } catch (error) {
                // Only log connection errors in development mode
                if (error.code === 'ERR_NETWORK' || error.message?.includes('ERR_CONNECTION_REFUSED')) {
                    // Backend is not running - silently handle this
                    if (process.env.NODE_ENV === 'development') {
                        console.warn('Backend server is not running. Maintenance mode check skipped.');
                    }
                } else {
                    // Log other errors
                    console.error('Error checking maintenance mode:', error);
                }
                // Default to false if check fails
                setMaintenanceMode(false);
                setMaintenanceAllowedRoles(['System Administrator', 'CRD Staff']);
            } finally {
                setIsCheckingMaintenance(false);
            }
        };

        checkMaintenanceMode();
        
        // Check maintenance mode every 30 seconds
        const interval = setInterval(checkMaintenanceMode, 30000);
        return () => clearInterval(interval);
    }, []);
    
    // Clear all toasts when navigating to a new page
    useEffect(() => {
        toast.dismiss();
    }, [location.pathname]);

    // Scroll to top when navigating to a new page (applies to all routes and all roles)
    useEffect(() => {
        // Scroll to top instantly when route changes for immediate navigation feedback
        window.scrollTo(0, 0);
    }, [location.pathname]);

    // Determine maintenance access rules
    const publicPages = ['/', '/login', '/register', '/campaigns', '/program', '/nstp', '/about', '/terms-and-conditions', '/email-verify', '/reset-password'];
    const isPublicPage = publicPages.includes(location.pathname);
    const canBypassMaintenance = userData?.role && maintenanceAllowedRoles.includes(userData.role);
    const isHomeOrLogin = ['/', '/login'].includes(location.pathname);

    // Automatically log out users whose roles are not allowed during maintenance
    useEffect(() => {
        const forceLogoutForMaintenance = async () => {
            try {
                axios.defaults.withCredentials = true;
                await axios.post(getBackendUrl() + 'api/auth/logout');
            } catch (error) {
                // silent fail - we'll still clear local state
                console.warn('Forced logout during maintenance failed:', error?.message || error);
            } finally {
                setIsLoggedIn(false);
                setUserData(null);
            }
        };

        if (maintenanceMode && isLoggedIn && !canBypassMaintenance) {
            forceLogoutForMaintenance();
        }
    }, [maintenanceMode, isLoggedIn, canBypassMaintenance, setIsLoggedIn, setUserData]);

    // Show maintenance page if enabled and user role is not in allowed roles
    // Home page and login page are always accessible to everyone
    if (isCheckingMaintenance) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#800000] mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading...</p>
                </div>
            </div>
        );
    }
    
    // Show maintenance page if enabled, user role is not in allowed roles, and trying to access protected routes
    // Home page and login page are always accessible (handled in LoginPage for login attempts)
    // Only roles selected in maintenance settings can access the system during maintenance
    if (maintenanceMode && !canBypassMaintenance && !isHomeOrLogin && !isPublicPage) {
        return <MaintenanceMode />;
    }
    
    return (
        <div>
            <ToastContainer
                position="top-right"
                autoClose={5000}
                hideProgressBar={false}
                newestOnTop={true}
                closeOnClick
                rtl={false}
                pauseOnFocusLoss
                draggable
                pauseOnHover
                limit={5}
                theme="colored"
            />
            {showInstallButton && <PWAInstallPrompt />}
            {isLoggedIn && <PushNotificationPrompt />}
            <Routes>
                <Route path="/" element={
                    <ProtectedRoute>
                        <Home />
                    </ProtectedRoute>
                } />
                <Route path="/login" element={<Login />} />
                <Route path="/campaigns" element={<PublicCampaigns />} />
                <Route path="/program" element={<Program />} />
                <Route path="/nstp" element={<NSTP />} />
                <Route path="/about" element={<About />} />
                <Route path="/success-stories" element={<SuccessStories />} />
                <Route path="/safety-guidelines" element={<SafetyGuidelines />} />
                <Route path="/privacy-policy" element={<PrivacyPolicy />} />
                <Route path="/terms-of-service" element={<TermsOfService />} />
                <Route path="/user-manual" element={<UserManual />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route path="/terms-and-conditions" element={<TermsAndConditions />} />
                <Route path="/email-verify" element={<VerifyEmailPage />} />
                <Route path="/reset-password" element={<ResetPasswordPage />} />

                {/* User Routes */}
                <Route path="/user/dashboard" element={<ProtectedRoute><UserDashboard /></ProtectedRoute>} />
                <Route path="/user/events" element={<ProtectedRoute><UserEvents /></ProtectedRoute>} />
                <Route path="/user/events/:id" element={<ProtectedRoute><EventDetails /></ProtectedRoute>} />
                <Route path="/user/profile" element={<ProtectedRoute><UserProfile /></ProtectedRoute>} />
                <Route path="/user/volunteer-history" element={<ProtectedRoute><VolunteerHistory /></ProtectedRoute>} />
                <Route path="/user/calendar" element={<ProtectedRoute><CalendarPage /></ProtectedRoute>} />
                <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
                <Route path="/user/notification-preferences" element={<ProtectedRoute><NotificationPreferences /></ProtectedRoute>} />

                {/* CRD Staff Routes */}
                <Route path="/crd-staff/dashboard" element={<ProtectedRoute allowedRoles={['CRD Staff','System Administrator']}><CRDDashboard /></ProtectedRoute>} />
                <Route path="/crd-staff/events" element={<ProtectedRoute allowedRoles={['CRD Staff','System Administrator']}><EventManagement /></ProtectedRoute>} />
                <Route path="/crd-staff/reports" element={<ProtectedRoute allowedRoles={['CRD Staff','System Administrator']}><Reports /></ProtectedRoute>} />
                <Route path="/crd-staff/calendar" element={<ProtectedRoute allowedRoles={['CRD Staff','System Administrator']}><CalendarPage /></ProtectedRoute>} />
                <Route path="/crd-staff/leaderboard" element={<ProtectedRoute allowedRoles={['CRD Staff','System Administrator']}><DepartmentLeaderboard /></ProtectedRoute>} />
                <Route path="/crd-staff/in-kind-donations" element={<ProtectedRoute allowedRoles={['CRD Staff','System Administrator']}><InKindDonations /></ProtectedRoute>} />
                <Route path="/crd-staff/donations" element={<ProtectedRoute allowedRoles={['CRD Staff','System Administrator']}><CRDDonations /></ProtectedRoute>} />
                <Route path="/crd-staff/profile" element={<ProtectedRoute allowedRoles={['CRD Staff','System Administrator']}><UserProfile /></ProtectedRoute>} />

                {/* System Administrator Routes */}
                <Route path="/system-admin/dashboard" element={<ProtectedRoute allowedRoles={['System Administrator']}><SystemAdminDashboard /></ProtectedRoute>} />
                <Route path="/system-admin/users" element={<ProtectedRoute allowedRoles={['System Administrator']}><UserManagement /></ProtectedRoute>} />
                <Route path="/system-admin/wallets" element={<ProtectedRoute allowedRoles={['System Administrator']}><WalletManagement /></ProtectedRoute>} />
                    <Route path="/system-admin/settings" element={<ProtectedRoute allowedRoles={['System Administrator']}><SystemAdminSettings /></ProtectedRoute>} />
                <Route path="/system-admin/reports" element={<ProtectedRoute allowedRoles={['System Administrator']}><SystemReports /></ProtectedRoute>} />
                <Route path="/system-admin/profile" element={<ProtectedRoute allowedRoles={['System Administrator']}><UserProfile /></ProtectedRoute>} />

                {/* Department Routes */}
                <Route path="/department/wallet-status" element={<ProtectedRoute allowedRoles={['Department/Organization']}><WalletStatus /></ProtectedRoute>} />
                <Route path="/department/dashboard" element={<ProtectedRoute allowedRoles={['Department/Organization','System Administrator']}><DepartmentDashboard /></ProtectedRoute>} />
                <Route path="/department/events" element={<ProtectedRoute allowedRoles={['Department/Organization','System Administrator']}><DepartmentEventManagement /></ProtectedRoute>} />
                <Route path="/department/volunteer-management/:eventId" element={<ProtectedRoute allowedRoles={['Department/Organization','System Administrator']}><VolunteerManagement /></ProtectedRoute>} />
                <Route path="/department/events/:eventId/details" element={<ProtectedRoute allowedRoles={['Department/Organization','System Administrator']}><DepartmentEventDetails /></ProtectedRoute>} />
                <Route path="/department/donations" element={<ProtectedRoute allowedRoles={['Department/Organization','System Administrator']}><DepartmentDonations /></ProtectedRoute>} />
                <Route path="/department/reports" element={<ProtectedRoute allowedRoles={['Department/Organization','System Administrator']}><DepartmentReports /></ProtectedRoute>} />
                <Route path="/department/calendar" element={<ProtectedRoute allowedRoles={['Department/Organization','System Administrator']}><CalendarPage /></ProtectedRoute>} />
                <Route path="/department/profile" element={<ProtectedRoute allowedRoles={['Department/Organization','System Administrator']}><UserProfile /></ProtectedRoute>} />

                {/* Volunteer Routes */}
                <Route path="/volunteer/attendance/:eventId" element={<ProtectedRoute><EventAttendance /></ProtectedRoute>} />
                <Route path="/volunteer/qr-scanner/:eventId" element={<ProtectedRoute><QRScanner /></ProtectedRoute>} />

                    {/* Donations */}
                    <Route path="/donate" element={<ProtectedRoute><DonationForm /></ProtectedRoute>} />
                    <Route path="/donations" element={<ProtectedRoute><DonationHistory /></ProtectedRoute>} />
                    <Route path="/user/donations" element={<ProtectedRoute><DonationHistory /></ProtectedRoute>} />
                    <Route path="/donation/processing" element={<PaymentProcessing />} />
                    <Route path="/donation/success" element={<PaymentProcessing />} />

                    {/* System Settings */}
                    <Route path="/system-settings" element={<ProtectedRoute><SystemSettings /></ProtectedRoute>} />

                    <Route path="*" element={<NotFound />} />
            </Routes>
        </div>
    )
}

const App = () => {
    return <AppContent />
}

export default App