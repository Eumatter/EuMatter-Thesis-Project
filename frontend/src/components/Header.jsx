import React, { useContext, useState, useRef, useEffect } from 'react';
import Button from './Button';
import { useNavigate, useLocation } from 'react-router-dom';
import { AppContent } from '../context/AppContext.jsx';
import axios from 'axios';
import { toast } from 'react-toastify';
import EnvergaLogo from '../assets/enverga-logo.png';
import { 
    FaHome, 
    FaBell, 
    FaUser, 
    FaSignOutAlt, 
    FaTimes, 
    FaCog, 
    FaChartLine, 
    FaHandHoldingHeart,
    FaCalendarAlt,
    FaFileAlt,
    FaUsers,
    FaCogs,
    FaTachometerAlt,
    FaCheckCircle,
    FaCalendar,
    FaBookOpen,
    FaClipboardList,
    FaInfoCircle,
    FaTrophy,
    FaBoxOpen,
    FaUniversalAccess,
    FaSlidersH,
    FaEye,
    FaTools,
    FaClock
} from 'react-icons/fa';

const Header = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { isLoggedIn, userData, setIsLoggedIn, setUserData, backendUrl, getDashboardRoute } = useContext(AppContent);
	const [isDropdownOpen, setIsDropdownOpen] = useState(false);
	const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
	const [isBellOpen, setIsBellOpen] = useState(false);
	const [notifications, setNotifications] = useState([]);
	const [isLoadingNotifications, setIsLoadingNotifications] = useState(false);
	const [maintenanceInfo, setMaintenanceInfo] = useState(null);
	const [timeRemaining, setTimeRemaining] = useState(null);
	const [maintenanceAllowedRoles, setMaintenanceAllowedRoles] = useState(['System Administrator', 'CRD Staff']);
    const dropdownRef = useRef(null);
    const bellRef = useRef(null);

    // Close dropdowns when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            const clickedOutsideDropdown = dropdownRef.current && !dropdownRef.current.contains(event.target);
            const clickedOutsideBell = bellRef.current && !bellRef.current.contains(event.target);
            if (clickedOutsideDropdown && clickedOutsideBell) {
                setIsDropdownOpen(false);
                setIsBellOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    // Prevent body scroll when mobile menu is open
    useEffect(() => {
        if (isMobileMenuOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isMobileMenuOpen]);

	// Check maintenance mode status for allowed roles
	useEffect(() => {
		const checkMaintenanceMode = async () => {
			if (!isLoggedIn || !userData) return;
			
			try {
				axios.defaults.withCredentials = true;
				const { data } = await axios.get(backendUrl + 'api/system-settings/maintenance-mode');
				if (data.success && data.maintenanceMode) {
					setMaintenanceAllowedRoles(data.allowedRoles || ['System Administrator', 'CRD Staff']);
					// Only show banner if current user's role is in allowed roles
					if (data.allowedRoles && data.allowedRoles.includes(userData.role)) {
						setMaintenanceInfo({
							message: data.message,
							estimatedEndTime: data.estimatedEndTime
						});
					} else {
						setMaintenanceInfo(null);
					}
				} else {
					setMaintenanceInfo(null);
				}
			} catch (error) {
				console.error('Error checking maintenance mode:', error);
				setMaintenanceInfo(null);
			}
		};
		
		checkMaintenanceMode();
		const interval = setInterval(checkMaintenanceMode, 30000); // Check every 30 seconds
		return () => clearInterval(interval);
	}, [isLoggedIn, userData, backendUrl]);

	// Calculate time remaining for maintenance mode
	useEffect(() => {
		if (maintenanceInfo?.estimatedEndTime) {
			const timer = setInterval(() => {
				const now = new Date();
				const endTime = new Date(maintenanceInfo.estimatedEndTime);
				const diff = endTime - now;

				if (diff > 0) {
					const days = Math.floor(diff / (1000 * 60 * 60 * 24));
					const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
					const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
					const seconds = Math.floor((diff % (1000 * 60)) / 1000);
					setTimeRemaining({ days, hours, minutes, seconds });
				} else {
					setTimeRemaining(null);
					setMaintenanceInfo(null);
				}
			}, 1000);

			return () => clearInterval(timer);
		} else {
			setTimeRemaining(null);
		}
	}, [maintenanceInfo]);

	// Poll notifications (in-app) every 30s when logged in
	useEffect(() => {
		let timer;
		const fetchNotifications = async () => {
			if (!isLoggedIn || !userData) return;
			try {
				setIsLoadingNotifications(true);
				axios.defaults.withCredentials = true;
				const { data } = await axios.get(backendUrl + 'api/notifications?limit=10');
				// Handle both array (backward compatibility) and object (new format) responses
				if (Array.isArray(data)) {
					setNotifications(data);
				} else if (data && data.notifications) {
					setNotifications(data.notifications);
				} else {
					setNotifications([]);
				}
            } catch (err) {
                if (err?.response?.status === 404 && timer) {
                    clearInterval(timer);
                }
				setNotifications([]);
			} finally {
				setIsLoadingNotifications(false);
			}
		};
		fetchNotifications();
		timer = setInterval(fetchNotifications, 30000);
		return () => clearInterval(timer);
	}, [isLoggedIn, userData, backendUrl]);

	const unreadCount = notifications.filter(n => n && (n.unread || n.read === false)).length;

	const markAllRead = async () => {
		try {
			axios.defaults.withCredentials = true;
			await axios.post(backendUrl + 'api/notifications/mark-all-read');
			setNotifications(prev => prev.map(n => ({ ...n, unread: false, read: true })));
		} catch (_) {
			// silent
		}
	};

    const handleLogout = async () => {
        try {
            axios.defaults.withCredentials = true;
            await axios.post(backendUrl + 'api/auth/logout');
            setIsLoggedIn(false);
            setUserData(null);
            toast.success('Logged out successfully');
            navigate('/');
        } catch (_) {
            setIsLoggedIn(false);
            setUserData(null);
            navigate('/');
        }
    };

    const getProfileRoute = () => {
        if (!userData) return '/login';
        return getDashboardRoute(userData.role).replace('/dashboard', '/profile');
    };

    const NavLink = ({ to, children, className = '' }) => {
        const isActive = location.pathname === to;
        return (
            <a
                href={to}
                className={`relative text-base lg:text-lg font-medium transition-colors duration-200 whitespace-nowrap
                           ${isActive ? 'text-[#800000]' : 'text-black'}
                           hover:text-[#800000]
                           after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-0
                           after:bg-[#800000] after:transition-all after:duration-300
                           hover:after:w-full
                           ${className}`}
                onClick={(e) => {
                    e.preventDefault();
                    navigate(to);
                }}
            >
                {children}
            </a>
        );
    };

    const MobileNavLink = ({ to, children, icon, className = '' }) => {
        const isActive = location.pathname === to;
        return (
            <button
                onClick={() => {
                    navigate(to);
                    setIsMobileMenuOpen(false);
                    setIsBellOpen(false);
                }}
                className={`w-full flex items-center space-x-4 p-4 rounded-xl transition-all duration-200 touch-manipulation
                    ${isActive 
                        ? 'bg-gradient-to-r from-[#800000] to-[#9c0000] text-white shadow-lg' 
                        : 'bg-white text-[#6b0000] hover:bg-[#6b0000]/15 active:bg-[#6b0000]/25 border border-[#800000]/10'
                    }
                    font-medium ${className}`}
            >
                {icon && <span className="text-xl flex-shrink-0">{icon}</span>}
                <span className="text-base font-medium flex-1 text-left">{children}</span>
                {isActive && <FaCheckCircle className="text-sm" />}
            </button>
        );
    };

    const BurgerIcon = ({ open }) => (
        <div className="relative w-6 h-4">
            <span className={`absolute left-0 top-0 block h-0.5 w-6 bg-[#800000] transition-transform duration-200 ${open ? 'translate-y-2 rotate-45' : ''}`}></span>
            <span className={`absolute left-0 top-1/2 -translate-y-1/2 block h-0.5 w-6 bg-[#800000] transition-opacity duration-200 ${open ? 'opacity-0' : 'opacity-100'}`}></span>
            <span className={`absolute left-0 bottom-0 block h-0.5 w-6 bg-[#800000] transition-transform duration-200 ${open ? '-translate-y-2 -rotate-45' : ''}`}></span>
        </div>
    );

    const roleKey = (userData?.role || '').toLowerCase();
    const isUser = roleKey.includes('user') && !roleKey.includes('crd');
    const isDept = roleKey.includes('department');
    const isCRD = roleKey.includes('crd');
    const canViewMaintenanceBanner = userData?.role && maintenanceAllowedRoles.includes(userData.role);
    const showMaintenanceBanner = canViewMaintenanceBanner && maintenanceInfo;

	return (
        <>
        {/* Maintenance Mode Banner for System Admin and CRD Staff */}
        {showMaintenanceBanner && (
            <div className="fixed top-0 left-0 right-0 z-[101] bg-gradient-to-r from-[#800000] to-[#EE1212] text-white shadow-lg">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-2 sm:py-3">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center space-x-2 sm:space-x-3 flex-1 min-w-0">
                            <FaTools className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
                            <div className="min-w-0">
                                <p className="text-xs sm:text-sm font-semibold">Maintenance Mode Active</p>
                                {maintenanceInfo.message && (
                                    <p className="text-[10px] sm:text-xs opacity-90 truncate">{maintenanceInfo.message}</p>
                                )}
                            </div>
                        </div>
                        {timeRemaining && (
                            <div className="flex items-center space-x-2 sm:space-x-3 flex-shrink-0">
                                <FaClock className="w-3 h-3 sm:w-4 sm:h-4" />
                                <div className="flex items-center space-x-1 sm:space-x-2 text-xs sm:text-sm font-bold">
                                    {timeRemaining.days > 0 && (
                                        <>
                                            <span>{timeRemaining.days}d</span>
                                            <span>:</span>
                                        </>
                                    )}
                                    <span>{String(timeRemaining.hours).padStart(2, '0')}h</span>
                                    <span>:</span>
                                    <span>{String(timeRemaining.minutes).padStart(2, '0')}m</span>
                                    {timeRemaining.days === 0 && (
                                        <>
                                            <span>:</span>
                                            <span>{String(timeRemaining.seconds).padStart(2, '0')}s</span>
                                        </>
                                    )}
                                </div>
                            </div>
                        )}
                        {!timeRemaining && maintenanceInfo && (
                            <div className="flex items-center space-x-2 text-xs sm:text-sm opacity-90">
                                <FaInfoCircle className="w-3 h-3 sm:w-4 sm:h-4" />
                                <span>No time frame set</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        )}
        <header className={`fixed ${showMaintenanceBanner ? 'top-12 sm:top-14' : 'top-0'} left-0 right-0 z-[100] bg-white/95 shadow-md font-poppins backdrop-blur-sm overflow-visible`}>
            <div className="w-full px-2 sm:px-3 md:px-4 lg:px-6 xl:px-8 py-2.5 sm:py-3 md:py-4">
                <div className="max-w-7xl mx-auto flex justify-between items-center gap-1.5 sm:gap-2">
                    {/* Left side - Logo and App Name */}
                    <div className="flex items-center space-x-1.5 sm:space-x-2 md:space-x-3 min-w-0 flex-1">
                        <div className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 lg:w-14 lg:h-14 xl:w-16 xl:h-16 flex-shrink-0">
                            <img 
                                src={EnvergaLogo} 
                                alt="Enverga University Logo" 
                                className="w-full h-full object-contain"
                            />
                        </div>
                        <div className="min-w-0 flex-1 overflow-hidden">
                            <h1 className="text-sm sm:text-base md:text-lg lg:text-xl xl:text-2xl 2xl:text-3xl font-extrabold text-[#800000] truncate tracking-tight leading-tight">EUMATTER</h1>
                            <p className="text-[9px] sm:text-[10px] md:text-xs lg:text-sm xl:text-base 2xl:text-lg font-medium text-[#800000] uppercase tracking-wide truncate leading-tight mt-0.5">Community Relations Department</p>
                        </div>
                    </div>

                    {/* Right side - Navigation Links or User Profile */}
				    {isLoggedIn && userData ? (
                    <div className="flex items-center space-x-2 sm:space-x-4 md:space-x-6 lg:space-x-8 flex-shrink-0 min-w-0">
                        {/* Role-aware navigation - DESKTOP ONLY (hidden on mobile) */}
                        {isUser && (
							<nav className="hidden lg:flex items-center space-x-4 xl:space-x-6">
								<NavLink to={getDashboardRoute(userData.role)}>Dashboard</NavLink>
								<NavLink to="/user/donations">Donations</NavLink>
                                <NavLink to="/user/events">Events</NavLink>
							</nav>
						)}
                        {isDept && (
							<nav className="hidden lg:flex items-center space-x-4 xl:space-x-6">
								<NavLink to="/department/dashboard">Dashboard</NavLink>
                                <NavLink to="/department/events">Events</NavLink>
                                <NavLink to="/department/donations">Donations</NavLink>
								<NavLink to="/department/reports">Reports</NavLink>
							</nav>
						)}
                        {isCRD && (
							<nav className="hidden lg:flex items-center space-x-4 xl:space-x-6">
                                <NavLink to="/crd-staff/dashboard">Dashboard</NavLink>
                                <NavLink to="/crd-staff/events">Events</NavLink>
                                <NavLink to="/crd-staff/reports">Reports</NavLink>
                                <NavLink to="/crd-staff/leaderboard">Leaderboard</NavLink>
                                <NavLink to="/crd-staff/donations">Donations</NavLink>
							</nav>
						)}
                        {userData.role && userData.role.toLowerCase().includes('system admin') && (
							<nav className="hidden lg:flex items-center space-x-4 xl:space-x-6">
                                <NavLink to="/system-admin/dashboard">Dashboard</NavLink>
                                <NavLink to="/system-admin/users">User Management</NavLink>
                                <NavLink to="/system-admin/settings">System Settings</NavLink>
                                <NavLink to="/system-admin/reports">System Reports</NavLink>
							</nav>
						)}

						{/* Notifications Bell */}
                        <div className="relative" ref={bellRef}>
							<button
								className="relative p-1.5 sm:p-2 md:p-2.5 rounded-lg hover:bg-gray-100 active:bg-gray-200 transition-colors duration-200 touch-manipulation min-w-[44px] min-h-[44px] flex items-center justify-center"
                                onClick={() => setIsBellOpen(v => { const next = !v; if (next) setIsDropdownOpen(false); return next; })}
								title="Notifications"
								aria-label="Notifications"
							>
								<svg className="w-5 h-5 sm:w-6 sm:h-6 text-gray-700" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/></svg>
								{unreadCount > 0 && (
									<span className="absolute -top-0.5 -right-0.5 sm:-top-1 sm:-right-1 bg-red-600 text-white text-[9px] sm:text-[10px] px-1 sm:px-1.5 py-0.5 rounded-full font-semibold min-w-[16px] sm:min-w-[18px] text-center">{unreadCount > 99 ? '99+' : unreadCount}</span>
								)}
							</button>
							{isBellOpen && (
                                <div className="fixed sm:absolute right-2 sm:right-0 mt-2 w-[calc(100vw-1rem)] sm:w-80 md:w-96 max-w-[calc(100vw-1rem)] sm:max-w-none bg-white rounded-xl shadow-2xl border border-gray-200 z-[110] animate-in fade-in slide-in-from-top-2 duration-200 overflow-hidden">
									{/* Header */}
									<div className="px-4 py-3 bg-gradient-to-r from-[#800000] to-[#900000] text-white flex items-center justify-between">
										<div className="flex items-center gap-2">
											<FaBell className="w-4 h-4" />
											<span className="text-sm font-bold">Notifications</span>
											{unreadCount > 0 && (
												<span className="px-2 py-0.5 bg-white/20 rounded-full text-xs font-semibold">
													{unreadCount} new
												</span>
											)}
										</div>
										{unreadCount > 0 && (
											<button 
												className="text-xs hover:underline font-medium" 
												onClick={(e) => { e.stopPropagation(); markAllRead(); }}
											>
												Mark all read
											</button>
										)}
									</div>
									
									{/* Notifications List */}
									<div className="max-h-96 overflow-y-auto">
										{isLoadingNotifications && (
											<div className="p-6 text-center">
												<div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-[#800000]"></div>
												<p className="text-sm text-gray-500 mt-2">Loading...</p>
											</div>
										)}
										{!isLoadingNotifications && notifications.length === 0 && (
											<div className="p-6 text-center">
												<FaBell className="w-12 h-12 text-gray-300 mx-auto mb-2" />
												<p className="text-sm text-gray-500">No notifications</p>
											</div>
										)}
										{!isLoadingNotifications && notifications.map((n, idx) => {
											const formatTime = (dateString) => {
												if (!dateString) return '';
												const date = new Date(dateString);
												const now = new Date();
												const diffInSeconds = Math.floor((now - date) / 1000);
												if (diffInSeconds < 60) return 'Just now';
												if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
												if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
												return date.toLocaleDateString();
											};
											
											return (
												<div 
													key={n.id || idx} 
													onClick={() => {
														if (n.payload?.eventId) {
															navigate(`/user/events/${n.payload.eventId}`);
														} else {
															navigate('/notifications');
														}
														setIsBellOpen(false);
													}}
													className={`px-4 py-3 border-b cursor-pointer transition-all duration-200 hover:bg-gray-50 ${
														n.unread || n.read === false 
															? 'bg-gradient-to-r from-[#800000]/5 to-transparent border-[#800000]/20' 
															: 'bg-white border-gray-100'
													}`}
												>
													<div className="flex items-start gap-3">
														<div className={`flex-shrink-0 w-2 h-2 rounded-full mt-2 ${
															n.unread || n.read === false ? 'bg-[#800000]' : 'bg-transparent'
														}`}></div>
														<div className="flex-1 min-w-0">
															<div className="flex items-start justify-between gap-2 mb-1">
																<div className={`font-semibold text-sm truncate ${
																	n.unread || n.read === false ? 'text-gray-900' : 'text-gray-700'
																}`}>
																	{n.title || 'Update'}
																</div>
															</div>
															<p className="text-xs text-gray-600 line-clamp-2 mb-1">
																{n.message || n.body || ''}
															</p>
															<p className="text-xs text-gray-400">
																{formatTime(n.createdAt)}
															</p>
														</div>
													</div>
												</div>
											);
										})}
									</div>
									
									{/* Footer with View All */}
									{notifications.length > 0 && (
										<div className="px-4 py-3 border-t bg-gray-50">
											<button
												onClick={() => {
													navigate('/notifications');
													setIsBellOpen(false);
												}}
												className="w-full px-4 py-2 bg-gradient-to-r from-[#800000] to-[#900000] text-white rounded-lg font-medium hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-2"
											>
												<FaEye className="w-4 h-4" />
												View All Notifications
											</button>
										</div>
									)}
								</div>
							)}
						</div>

                        {/* User Dropdown */}
                        <div className="relative" ref={dropdownRef}>
                            <button
                                onClick={() => setIsDropdownOpen(v => { const next = !v; if (next) setIsBellOpen(false); return next; })}
                                className="flex items-center space-x-1 sm:space-x-1.5 md:space-x-2 p-1 sm:p-1.5 md:p-2 rounded-lg hover:bg-gray-100 active:bg-gray-200 transition-colors duration-200 touch-manipulation min-w-[44px] min-h-[44px]"
                                aria-label="User menu"
                            >
                                {userData?.profileImage ? (
                                    <img
                                        src={userData.profileImage}
                                        alt={userData.name}
                                        className="w-7 h-7 sm:w-8 sm:h-8 md:w-9 md:h-9 rounded-full object-cover border-2 border-[#800000] flex-shrink-0"
                                    />
                                ) : (
                                    <div className="w-7 h-7 sm:w-8 sm:h-8 md:w-9 md:h-9 rounded-full bg-[#800000] text-white flex items-center justify-center font-semibold border-2 border-[#800000] text-[10px] sm:text-xs md:text-sm flex-shrink-0">
                                        {(userData?.name || 'User').split(' ').slice(0,2).map(n=>n.charAt(0).toUpperCase()).join('')}
                                    </div>
                                )}
                                <svg
                                    className={`hidden sm:block w-3.5 sm:w-4 md:w-4 text-gray-600 transition-transform duration-200 flex-shrink-0 ${isDropdownOpen ? 'rotate-180' : ''}`}
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                            </button>
                            {isDropdownOpen && (
                                <div className="fixed sm:absolute right-2 sm:right-0 mt-2 w-[calc(100vw-1rem)] sm:w-72 md:w-80 max-w-[calc(100vw-1rem)] sm:max-w-none bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-[120] animate-in fade-in slide-in-from-top-2 duration-200">
                                    <div className="px-5 py-4 bg-white/60 backdrop-blur border-b border-gray-100">
                                        <button onClick={() => { navigate(getProfileRoute()); setIsDropdownOpen(false); }} className="w-full text-left">
                                            <div className="flex items-center gap-3">
                                                {userData?.profileImage ? (
                                                    <img src={userData.profileImage} alt={userData.name} className="w-10 h-10 rounded-full object-cover border" />
                                                ) : (
                                                    <div className="w-10 h-10 rounded-full bg-[#800000] text-white flex items-center justify-center font-semibold">
                                                        {(userData?.name || 'User').split(' ').slice(0,2).map(n=>n.charAt(0).toUpperCase()).join('')}
                                                    </div>
                                                )}
                                                <div>
                                                    <div className="text-sm font-semibold text-gray-900 leading-5">{userData.name}</div>
                                                    <div className="text-xs text-gray-600">{userData.email}</div>
                                                </div>
                                            </div>
                                        </button>
                                    </div>
                                    <div className="py-2">
                                        {/* Navigation Links Based on User Role - MOBILE ONLY (hidden on desktop) */}
                                        <div className="lg:hidden">
                                            {isUser && (
                                                <>
                                                    <button onClick={() => { navigate(getDashboardRoute(userData.role)); setIsDropdownOpen(false); }} className="w-full text-left px-5 py-2.5 text-sm text-gray-800 hover:bg-gray-50 flex items-center gap-2">
                                                        <FaTachometerAlt className="w-4 h-4" />
                                                        Dashboard
                                                    </button>
                                                    <button onClick={() => { navigate('/user/events'); setIsDropdownOpen(false); }} className="w-full text-left px-5 py-2.5 text-sm text-gray-800 hover:bg-gray-50 flex items-center gap-2">
                                                        <FaCalendarAlt className="w-4 h-4" />
                                                        Events
                                                    </button>
                                                    <button onClick={() => { navigate('/user/donations'); setIsDropdownOpen(false); }} className="w-full text-left px-5 py-2.5 text-sm text-gray-800 hover:bg-gray-50 flex items-center gap-2">
                                                        <FaHandHoldingHeart className="w-4 h-4" />
                                                        Donations
                                                    </button>
                                                    <button onClick={() => { navigate('/user/calendar'); setIsDropdownOpen(false); }} className="w-full text-left px-5 py-2.5 text-sm text-gray-800 hover:bg-gray-50 flex items-center gap-2">
                                                        <FaCalendar className="w-4 h-4" />
                                                        Calendar
                                                    </button>
                                                    <div className="my-2 h-px bg-gray-100" />
                                                </>
                                            )}
                                            {isDept && (
                                                <>
                                                    <button onClick={() => { navigate('/department/dashboard'); setIsDropdownOpen(false); }} className="w-full text-left px-5 py-2.5 text-sm text-gray-800 hover:bg-gray-50 flex items-center gap-2">
                                                        <FaTachometerAlt className="w-4 h-4" />
                                                        Dashboard
                                                    </button>
                                                    <button onClick={() => { navigate('/department/events'); setIsDropdownOpen(false); }} className="w-full text-left px-5 py-2.5 text-sm text-gray-800 hover:bg-gray-50 flex items-center gap-2">
                                                        <FaCalendarAlt className="w-4 h-4" />
                                                        Events
                                                    </button>
                                                    <button onClick={() => { navigate('/department/calendar'); setIsDropdownOpen(false); }} className="w-full text-left px-5 py-2.5 text-sm text-gray-800 hover:bg-gray-50 flex items-center gap-2">
                                                        <FaCalendar className="w-4 h-4" />
                                                        Calendar
                                                    </button>
                                                    <button onClick={() => { navigate('/department/donations'); setIsDropdownOpen(false); }} className="w-full text-left px-5 py-2.5 text-sm text-gray-800 hover:bg-gray-50 flex items-center gap-2">
                                                        <FaHandHoldingHeart className="w-4 h-4" />
                                                        Donations
                                                    </button>
                                                    <button onClick={() => { navigate('/department/reports'); setIsDropdownOpen(false); }} className="w-full text-left px-5 py-2.5 text-sm text-gray-800 hover:bg-gray-50 flex items-center gap-2">
                                                        <FaChartLine className="w-4 h-4" />
                                                        Reports
                                                    </button>
                                                    <div className="my-2 h-px bg-gray-100" />
                                                </>
                                            )}
                                            {isCRD && (
                                                <>
                                                    <button onClick={() => { navigate('/crd-staff/dashboard'); setIsDropdownOpen(false); }} className="w-full text-left px-5 py-2.5 text-sm text-gray-800 hover:bg-gray-50 flex items-center gap-2">
                                                        <FaTachometerAlt className="w-4 h-4" />
                                                        Dashboard
                                                    </button>
                                                    <button onClick={() => { navigate('/crd-staff/events'); setIsDropdownOpen(false); }} className="w-full text-left px-5 py-2.5 text-sm text-gray-800 hover:bg-gray-50 flex items-center gap-2">
                                                        <FaCalendarAlt className="w-4 h-4" />
                                                        Events
                                                    </button>
                                                    <button onClick={() => { navigate('/crd-staff/calendar'); setIsDropdownOpen(false); }} className="w-full text-left px-5 py-2.5 text-sm text-gray-800 hover:bg-gray-50 flex items-center gap-2">
                                                        <FaCalendar className="w-4 h-4" />
                                                        Calendar
                                                    </button>
                                                    <button onClick={() => { navigate('/crd-staff/reports'); setIsDropdownOpen(false); }} className="w-full text-left px-5 py-2.5 text-sm text-gray-800 hover:bg-gray-50 flex items-center gap-2">
                                                        <FaChartLine className="w-4 h-4" />
                                                        Reports
                                                    </button>
                                                    <button onClick={() => { navigate('/crd-staff/leaderboard'); setIsDropdownOpen(false); }} className="w-full text-left px-5 py-2.5 text-sm text-gray-800 hover:bg-gray-50 flex items-center gap-2">
                                                        <FaTrophy className="w-4 h-4" />
                                                        Leaderboard
                                                    </button>
                                                    <button onClick={() => { navigate('/crd-staff/donations'); setIsDropdownOpen(false); }} className="w-full text-left px-5 py-2.5 text-sm text-gray-800 hover:bg-gray-50 flex items-center gap-2">
                                                        <FaBoxOpen className="w-4 h-4" />
                                                        Donations
                                                    </button>
                                                    <div className="my-2 h-px bg-gray-100" />
                                                </>
                                            )}
                                            {userData.role && userData.role.toLowerCase().includes('system admin') && (
                                                <>
                                                    <button onClick={() => { navigate('/system-admin/dashboard'); setIsDropdownOpen(false); }} className="w-full text-left px-5 py-2.5 text-sm text-gray-800 hover:bg-gray-50 flex items-center gap-2">
                                                        <FaTachometerAlt className="w-4 h-4" />
                                                        Dashboard
                                                    </button>
                                                    <button onClick={() => { navigate('/system-admin/users'); setIsDropdownOpen(false); }} className="w-full text-left px-5 py-2.5 text-sm text-gray-800 hover:bg-gray-50 flex items-center gap-2">
                                                        <FaUsers className="w-4 h-4" />
                                                        User Management
                                                    </button>
                                                    <button onClick={() => { navigate('/system-admin/settings'); setIsDropdownOpen(false); }} className="w-full text-left px-5 py-2.5 text-sm text-gray-800 hover:bg-gray-50 flex items-center gap-2">
                                                        <FaCogs className="w-4 h-4" />
                                                        System Settings
                                                    </button>
                                                    <button onClick={() => { navigate('/system-admin/reports'); setIsDropdownOpen(false); }} className="w-full text-left px-5 py-2.5 text-sm text-gray-800 hover:bg-gray-50 flex items-center gap-2">
                                                        <FaChartLine className="w-4 h-4" />
                                                        System Reports
                                                    </button>
                                                    <div className="my-2 h-px bg-gray-100" />
                                                </>
                                            )}
                                        </div>
                                        {/* Account Section */}
                                        <button onClick={() => { navigate(getProfileRoute()); setIsDropdownOpen(false); }} className="w-full text-left px-5 py-2.5 text-sm text-gray-800 hover:bg-gray-50 flex items-center gap-2">
                                            <FaCog className="w-4 h-4" />
                                            Account Settings
                                        </button>
                                        {/* System Settings - Show for all users EXCEPT System Admin */}
                                        {userData.role && !userData.role.toLowerCase().includes('system admin') && (
                                            <button onClick={() => { navigate('/system-settings'); setIsDropdownOpen(false); }} className="w-full text-left px-5 py-2.5 text-sm text-gray-800 hover:bg-gray-50 flex items-center gap-2">
                                                <FaSlidersH className="w-4 h-4" />
                                                System Settings
                                            </button>
                                        )}
                                        {/* Only show verify account button for Users who are not verified */}
                                        {userData.role === 'User' && !userData.isAccountVerified && (
                                            <button onClick={() => { navigate('/email-verify'); setIsDropdownOpen(false); }} className="w-full text-left px-5 py-2.5 text-sm text-orange-700 hover:bg-orange-50 flex items-center gap-2">
                                                <FaCheckCircle className="w-4 h-4" />
                                                Verify Account
                                            </button>
                                        )}
                                        <div className="my-2 h-px bg-gray-100" />
                                        <button onClick={handleLogout} className="w-full text-left px-5 py-2.5 text-sm text-red-700 hover:bg-red-50 flex items-center gap-2">
                                            <FaSignOutAlt className="w-4 h-4" />
                                            Logout
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    <>
                        {/* Desktop Navigation for Logged-out User */}
                        <nav className="hidden lg:flex items-center space-x-2 xl:space-x-4">
                            <div className="flex space-x-3 xl:space-x-4">
                                <NavLink to="/" className="whitespace-nowrap">Home</NavLink>
                                <NavLink to="/program" className="whitespace-nowrap">Program</NavLink>
                                <NavLink to="/nstp" className="whitespace-nowrap">NSTP</NavLink>
                                <NavLink to="/about" className="whitespace-nowrap">About</NavLink>
                            </div>
                            <Button onClick={() => navigate('/login')} variant="gold" size="md" className="ml-2 xl:ml-4 whitespace-nowrap">
                                Join Us
                            </Button>
                        </nav>
                        {/* Mobile Menu Button */}
                        <button 
                            className="lg:hidden p-1.5 sm:p-2 md:p-2.5 text-[#800000] hover:bg-[#800000]/20 active:bg-[#800000]/30 rounded-lg transition-colors duration-200 touch-manipulation min-w-[44px] min-h-[44px] flex items-center justify-center"
                            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                            aria-label={isMobileMenuOpen ? 'Close menu' : 'Open menu'}
                            aria-expanded={isMobileMenuOpen}
                        >
                            <div className={`transition-transform duration-300 ${isMobileMenuOpen ? 'rotate-90 scale-95' : 'rotate-0'}`}>
                                <BurgerIcon open={isMobileMenuOpen} />
                            </div>
                        </button>
                    </>
                    )}
                </div>
            </div>

            {/* No compact menubar; mobile uses hamburger menu overlay */}
        </header>
        {/* Mobile glassmorphic menu with smooth animation */}
                {isMobileMenuOpen && (
                    <>
                        <div 
                    className="fixed inset-0 z-[90] lg:hidden bg-black/50 backdrop-blur-sm transition-opacity duration-300"
                            onClick={() => setIsMobileMenuOpen(false)}
                        />
                <div className={`fixed ${showMaintenanceBanner ? 'top-28 sm:top-32 md:top-36' : 'top-14 sm:top-16 md:top-20'} left-0 right-0 z-[95] lg:hidden p-2 sm:p-3 md:p-4 animate-in fade-in slide-in-from-top-2 duration-200`}>
                    <div className="mx-auto w-full max-w-md md:max-w-xl rounded-2xl bg-white/90 backdrop-blur-xl shadow-2xl ring-1 ring-[#800000]/10 overflow-hidden max-h-[calc(100vh-4rem)] sm:max-h-[calc(100vh-5rem)] md:max-h-[calc(100vh-6rem)] lg:max-h-[calc(100vh-7rem)] flex flex-col">
                        <div className="px-4 py-3 flex items-center justify-start border-b border-white/60 bg-gradient-to-r from-[#800000]/90 to-[#9c0000]/90 text-white">
                            <div className="text-sm font-semibold">Menu</div>
                                </div>

                        {/* Primary links */}
                        <div className="py-1 divide-y divide-white/60 overflow-y-auto overflow-x-hidden">
                            <MobileNavLink to="/" icon={<FaHome />} className="bg-white/0 text-[#800000] hover:bg-[#800000]/25 active:bg-[#800000]/35">Home</MobileNavLink>
                            <MobileNavLink to="/program" icon={<FaBookOpen />} className="bg-white/0 text-[#800000] hover:bg-[#800000]/25 active:bg-[#800000]/35">Program</MobileNavLink>
                            <MobileNavLink to="/nstp" icon={<FaClipboardList />} className="bg-white/0 text-[#800000] hover:bg-[#800000]/25 active:bg-[#800000]/35">NSTP</MobileNavLink>
                            <MobileNavLink to="/about" icon={<FaInfoCircle />} className="bg-white/0 text-[#800000] hover:bg-[#800000]/25 active:bg-[#800000]/35">About</MobileNavLink>
                        </div>

                        {/* CTA or role-aware quick links */}
                        {!isLoggedIn ? (
                            <div className="p-3 bg-white/40 border-t border-white/60">
                                <Button
                                    onClick={() => { navigate('/login'); setIsMobileMenuOpen(false); }}
                                    variant="gold"
                                    size="lg"
                                    className="w-full"
                                >
                                    Join Us
                                </Button>
                            </div>
                        ) : (
                            <div className="p-2 bg-white/40 border-t border-white/60 space-y-2">
                                {isUser && (
                                    <>
                                        <MobileNavLink to={getDashboardRoute(userData.role)} className="text-[#800000] hover:bg-[#800000]/20 active:bg-[#800000]/30 transition-transform hover:translate-x-1">Dashboard</MobileNavLink>
                                        <MobileNavLink to="/user/donations" className="text-[#800000] hover:bg-[#800000]/20 active:bg-[#800000]/30 transition-transform hover:translate-x-1">Donations</MobileNavLink>
                                        <MobileNavLink to="/user/events" className="text-[#800000] hover:bg-[#800000]/20 active:bg-[#800000]/30 transition-transform hover:translate-x-1">Events</MobileNavLink>
                                    </>
                                )}

                                {isDept && (
                                    <>
                                        <MobileNavLink to="/department/dashboard" className="text-[#800000] hover:bg-[#800000]/20 active:bg-[#800000]/30 transition-transform hover:translate-x-1">Dashboard</MobileNavLink>
                                        <MobileNavLink to="/department/events" className="text-[#800000] hover:bg-[#800000]/20 active:bg-[#800000]/30 transition-transform hover:translate-x-1">Events</MobileNavLink>
                                        <MobileNavLink to="/department/donations" className="text-[#800000] hover:bg-[#800000]/20 active:bg-[#800000]/30 transition-transform hover:translate-x-1">Donations</MobileNavLink>
                                        <MobileNavLink to="/department/reports" className="text-[#800000] hover:bg-[#800000]/20 active:bg-[#800000]/30 transition-transform hover:translate-x-1">Reports</MobileNavLink>
                                    </>
                                )}

                                {isCRD && (
                                    <>
                                        <MobileNavLink to="/crd-staff/dashboard" className="text-[#800000] hover:bg-[#800000]/20 active:bg-[#800000]/30 transition-transform hover:translate-x-1">Dashboard</MobileNavLink>
                                        <MobileNavLink to="/crd-staff/events" className="text-[#800000] hover:bg-[#800000]/20 active:bg-[#800000]/30 transition-transform hover:translate-x-1">Events</MobileNavLink>
                                        <MobileNavLink to="/crd-staff/reports" className="text-[#800000] hover:bg-[#800000]/20 active:bg-[#800000]/30 transition-transform hover:translate-x-1">Reports</MobileNavLink>
                                        <MobileNavLink to="/crd-staff/leaderboard" className="text-[#800000] hover:bg-[#800000]/20 active:bg-[#800000]/30 transition-transform hover:translate-x-1">Leaderboard</MobileNavLink>
                                        <MobileNavLink to="/crd-staff/donations" className="text-[#800000] hover:bg-[#800000]/20 active:bg-[#800000]/30 transition-transform hover:translate-x-1">Donations</MobileNavLink>
                                    </>
                                )}

                                {userData?.role && userData.role.toLowerCase().includes('system admin') && (
                                    <>
                                        <MobileNavLink to="/system-admin/dashboard" className="text-[#800000] hover:bg-[#800000]/20 active:bg-[#800000]/30 transition-transform hover:translate-x-1">Dashboard</MobileNavLink>
                                        <MobileNavLink to="/system-admin/users" className="text-[#800000] hover:bg-[#800000]/20 active:bg-[#800000]/30 transition-transform hover:translate-x-1">User Management</MobileNavLink>
                                        <MobileNavLink to="/system-admin/settings" className="text-[#800000] hover:bg-[#800000]/20 active:bg-[#800000]/30 transition-transform hover:translate-x-1">System Settings</MobileNavLink>
                                        <MobileNavLink to="/system-admin/reports" className="text-[#800000] hover:bg-[#800000]/20 active:bg-[#800000]/30 transition-transform hover:translate-x-1">System Reports</MobileNavLink>
                                    </>
                                )}

                                <div className="pt-1">
                                    <button onClick={handleLogout} className="w-full text-left px-4 py-3 text-sm text-red-700 hover:bg-red-50 rounded-lg">Logout</button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
                    </>
                )}
        {/* Spacer to offset fixed header height */}
        <div aria-hidden className={`${showMaintenanceBanner ? 'h-20 sm:h-24 md:h-28 lg:h-28' : 'h-14 sm:h-16 md:h-20 lg:h-20'}`}></div>
        </>
    );
};

export default Header;
