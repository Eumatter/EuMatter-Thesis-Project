import React, { useContext, useState, useRef, useEffect } from 'react';
import Button from './Button';
import { useNavigate, useLocation } from 'react-router-dom';
import { AppContent } from '../context/AppContext.jsx';
import axios from 'axios';
import { toast } from 'react-toastify';
import { formatNotificationPayload, getNotificationIcon, getNotificationColorClass } from '../utils/notificationFormatter.js';
import eumatterLogo from '../assets/eumatter_logo.png';
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
    FaClock,
    FaChevronRight
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

    // Prevent body scroll and apply blur when mobile menu or dropdown is open
    useEffect(() => {
        if (isMobileMenuOpen || isDropdownOpen) {
            document.body.style.overflow = 'hidden';
            document.body.style.position = 'fixed';
            document.body.style.width = '100%';
            // Add blur class to body and all content when mobile menu is open
            if (isMobileMenuOpen) {
                // Use setTimeout to ensure DOM is ready
                setTimeout(() => {
                    document.body.classList.add('mobile-menu-open');
                    
                    // Get header first to exclude it from blur
                    const header = document.querySelector('header');
                    
                    // Blur all main content areas and sections (excluding header)
                    const mainContents = document.querySelectorAll('main, [role="main"], .main-content, section, article');
                    mainContents.forEach(content => {
                        // Skip menu overlay elements and header
                        if (!content.closest('.mobile-menu-overlay') && 
                            !content.closest('header') &&
                            content !== header &&
                            !content.classList.contains('mobile-menu-overlay') &&
                            !content.classList.contains('mobile-menu-slider')) {
                            content.classList.add('mobile-menu-blur');
                            
                            // Also blur all direct children divs inside main content
                            const childDivs = content.querySelectorAll(':scope > div');
                            childDivs.forEach(div => {
                                if (!div.closest('header') && 
                                    !div.closest('.mobile-menu-overlay') &&
                                    !div.classList.contains('mobile-menu-overlay') &&
                                    !div.classList.contains('mobile-menu-slider')) {
                                    div.classList.add('mobile-menu-blur');
                                }
                            });
                        }
                    });
                    
                    // Blur containers and wrappers that are not inside header
                    const containers = document.querySelectorAll('div[class*="container"], div[class*="wrapper"], div[class*="grid"], div[class*="flex"]');
                    containers.forEach(container => {
                        // Skip if it's inside header or menu overlay
                        if (!container.closest('header') && 
                            !container.closest('.mobile-menu-overlay') &&
                            !container.closest('main') &&
                            container !== header &&
                            !container.classList.contains('mobile-menu-overlay') &&
                            !container.classList.contains('mobile-menu-slider')) {
                            container.classList.add('mobile-menu-blur');
                        }
                    });
                }, 0);
            }
        } else {
            document.body.style.overflow = 'unset';
            document.body.style.position = 'unset';
            document.body.style.width = 'unset';
            // Remove blur class from body and all content
            document.body.classList.remove('mobile-menu-open');
            
            // Remove blur from main content
            const mainContents = document.querySelectorAll('main, [role="main"], .main-content, section, article');
            mainContents.forEach(content => {
                content.classList.remove('mobile-menu-blur');
                // Also remove from child divs
                const childDivs = content.querySelectorAll(':scope > div');
                childDivs.forEach(div => {
                    div.classList.remove('mobile-menu-blur');
                });
            });
            
            // Remove blur from containers and wrappers
            const containers = document.querySelectorAll('div.mobile-menu-blur, div[class*="container"].mobile-menu-blur, div[class*="wrapper"].mobile-menu-blur, div[class*="grid"].mobile-menu-blur, div[class*="flex"].mobile-menu-blur');
            containers.forEach(container => {
                if (!container.closest('header') && !container.closest('.mobile-menu-overlay')) {
                    container.classList.remove('mobile-menu-blur');
                }
            });
        }
        return () => {
            document.body.style.overflow = 'unset';
            document.body.style.position = 'unset';
            document.body.style.width = 'unset';
            document.body.classList.remove('mobile-menu-open');
            
            // Remove blur from main content
            const mainContents = document.querySelectorAll('main, [role="main"], .main-content, section, article');
            mainContents.forEach(content => {
                content.classList.remove('mobile-menu-blur');
                // Also remove from child divs
                const childDivs = content.querySelectorAll(':scope > div');
                childDivs.forEach(div => {
                    div.classList.remove('mobile-menu-blur');
                });
            });
            
            // Remove blur from containers and wrappers
            const containers = document.querySelectorAll('div.mobile-menu-blur, div[class*="container"].mobile-menu-blur, div[class*="wrapper"].mobile-menu-blur, div[class*="grid"].mobile-menu-blur, div[class*="flex"].mobile-menu-blur');
            containers.forEach(container => {
                if (!container.closest('header') && !container.closest('.mobile-menu-overlay')) {
                    container.classList.remove('mobile-menu-blur');
                }
            });
        };
    }, [isMobileMenuOpen, isDropdownOpen]);

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
				let fetchedNotifications = [];
				if (Array.isArray(data)) {
					fetchedNotifications = data;
				} else if (data && data.notifications) {
					fetchedNotifications = data.notifications;
				}
				
				// Remove duplicates based on notification ID
				const uniqueNotifications = fetchedNotifications.filter((n, index, self) =>
					index === self.findIndex((t) => t.id === n.id || (t._id && t._id === n._id))
				);
				
				// Only show unread notifications in dropdown
				const unreadOnly = uniqueNotifications.filter(n => n && (n.unread || n.read === false));
				setNotifications(unreadOnly);
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
	
	const handleNotificationClick = async (notification) => {
		try {
			// Mark as read if unread
			if (notification.unread || notification.read === false) {
				axios.defaults.withCredentials = true;
				await axios.post(backendUrl + `api/notifications/${notification.id || notification._id}/read`);
				// Remove from dropdown immediately
				setNotifications(prev => prev.filter(n => (n.id || n._id) !== (notification.id || notification._id)));
			}
			
			// Navigate based on payload
			if (notification.payload?.eventId) {
				navigate(`/user/events/${notification.payload.eventId}`);
			} else {
				navigate('/notifications');
			}
			setIsBellOpen(false);
		} catch (error) {
			console.error('Error handling notification click:', error);
			// Still navigate even if marking as read fails
			if (notification.payload?.eventId) {
				navigate(`/user/events/${notification.payload.eventId}`);
			} else {
				navigate('/notifications');
			}
			setIsBellOpen(false);
		}
	};

	const markAllRead = async () => {
		try {
			axios.defaults.withCredentials = true;
			await axios.post(backendUrl + 'api/notifications/mark-all-read');
			// Clear all notifications from dropdown since they're all read now
			setNotifications([]);
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
                    setIsDropdownOpen(false); // Close dropdown menu when navigating
                }}
                className={`w-full flex items-center space-x-4 p-4 rounded-xl transition-all duration-300 touch-manipulation relative group mb-3 px-4
                    ${isActive 
                        ? 'bg-gradient-to-r from-[#800000] to-[#9c0000] text-white shadow-xl shadow-[#800000]/40 scale-[1.01] ring-2 ring-[#800000]/20' 
                        : 'bg-white/80 text-gray-800 hover:bg-gradient-to-r hover:from-[#800000]/10 hover:to-[#800000]/5 active:bg-[#800000]/20 border border-gray-200/50 hover:border-[#800000]/40 hover:shadow-lg active:shadow-xl'
                    }
                    font-semibold ${className}`}
            >
                <span className={`text-2xl flex-shrink-0 transition-all duration-300 ${isActive ? 'text-white scale-110' : 'text-[#800000] group-hover:scale-110 group-hover:rotate-3'}`}>
                    {icon}
                </span>
                <span className={`text-base font-bold flex-1 text-left transition-all duration-300 ${isActive ? 'text-white' : 'text-gray-900 group-hover:text-[#800000]'}`}>
                    {children}
                </span>
                {isActive && (
                    <FaCheckCircle className="text-lg flex-shrink-0 animate-pulse text-white" />
                )}
                {!isActive && (
                    <FaChevronRight className="text-sm text-gray-400 flex-shrink-0 group-hover:translate-x-1 group-hover:text-[#800000] transition-all duration-300" />
                )}
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
        {/* CSS Animations for slider menu */}
        <style>{`
            @keyframes slideInRight {
                from {
                    transform: translateX(100%);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }
            @keyframes fadeIn {
                from {
                    opacity: 0;
                }
                to {
                    opacity: 1;
                }
            }
            @keyframes slideInUp {
                from {
                    transform: translateY(10px);
                    opacity: 0;
                }
                to {
                    transform: translateY(0);
                    opacity: 1;
                }
            }
            /* Ensure profile slider is above everything */
            .profile-slider-container {
                position: fixed !important;
                z-index: 99999 !important;
                top: 0 !important;
                left: 0 !important;
                right: 0 !important;
                bottom: 0 !important;
            }
            .profile-slider-menu {
                position: fixed !important;
                z-index: 100000 !important;
                top: 0 !important;
                right: 0 !important;
                bottom: 0 !important;
                height: 100vh !important;
                max-height: 100vh !important;
            }
        `}</style>
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
        <header className={`fixed ${showMaintenanceBanner ? 'top-12 sm:top-14' : 'top-0'} left-0 right-0 z-[100] bg-white/95 shadow-md font-poppins backdrop-blur-sm overflow-visible transition-all duration-300 ${isMobileMenuOpen ? 'mobile-menu-blur' : ''}`}>
            <div className="w-full px-2 sm:px-3 md:px-4 lg:px-6 xl:px-8 py-2.5 sm:py-3 md:py-4">
                <div className="max-w-7xl mx-auto flex justify-between items-center gap-1.5 sm:gap-2">
                    {/* Left side - Logo and App Name */}
                    <div className="flex items-center min-w-0 flex-1 gap-2 sm:gap-2.5 md:gap-3">
                        {/* Logo */}
                        <div className="flex-shrink-0">
                            <img 
                                src={eumatterLogo} 
                                alt="EuMatter Logo" 
                                className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 lg:w-14 lg:h-14 xl:w-16 xl:h-16 object-contain"
                            />
                        </div>
                        {/* App Name */}
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
								<FaBell className="w-5 h-5 sm:w-6 sm:h-6 text-gray-700" />
								{unreadCount > 0 && (
									<span className="absolute -top-0.5 -right-0.5 sm:-top-1 sm:-right-1 bg-red-600 text-white text-[9px] sm:text-[10px] px-1 sm:px-1.5 py-0.5 rounded-full font-semibold min-w-[16px] sm:min-w-[18px] text-center">{unreadCount > 99 ? '99+' : unreadCount}</span>
								)}
							</button>
							{isBellOpen && (
                                <div className="fixed sm:absolute right-2 sm:right-0 mt-2 w-[calc(100vw-1rem)] sm:w-80 md:w-96 max-w-[calc(100vw-1rem)] sm:max-w-none bg-white rounded-2xl shadow-2xl border-2 border-[#800000]/10 z-[110] animate-in fade-in slide-in-from-top-2 duration-200 overflow-hidden backdrop-blur-sm">
									{/* Header with View All button in top right */}
									<div className="px-4 py-3 bg-gradient-to-r from-[#800000] via-[#900000] to-[#800000] text-white flex items-center justify-between relative">
										<div className="flex items-center gap-2">
											<div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm">
												<FaBell className="w-4 h-4" />
											</div>
											<div>
												<span className="text-sm font-bold block">Notifications</span>
												{unreadCount > 0 && (
													<span className="text-xs text-white/90">
														{unreadCount} {unreadCount === 1 ? 'new' : 'new'}
													</span>
												)}
											</div>
										</div>
										<div className="flex items-center gap-2">
											{unreadCount > 0 && (
												<button 
													className="text-xs px-2 py-1 bg-white/20 hover:bg-white/30 rounded-lg font-medium transition-all duration-200 backdrop-blur-sm" 
													onClick={(e) => { 
														e.stopPropagation(); 
														markAllRead(); 
													}}
												>
													Mark all read
												</button>
											)}
											<button
												onClick={(e) => {
													e.stopPropagation();
													navigate('/notifications');
													setIsBellOpen(false);
												}}
												className="text-xs px-3 py-1.5 bg-gradient-to-r from-[#D4AF37] to-[#C9A227] hover:from-[#C9A227] hover:to-[#B8941F] text-white rounded-lg font-semibold shadow-md hover:shadow-lg transition-all duration-200 flex items-center gap-1.5"
											>
												<FaEye className="w-3 h-3" />
												View All
											</button>
										</div>
									</div>
									
									{/* Notifications List */}
									<div className="max-h-96 overflow-y-auto bg-gradient-to-b from-white to-gray-50/50">
										{isLoadingNotifications && (
											<div className="p-8 text-center">
												<div className="inline-block animate-spin rounded-full h-8 w-8 border-3 border-[#800000] border-t-transparent"></div>
												<p className="text-sm text-gray-600 mt-3 font-medium">Loading notifications...</p>
											</div>
										)}
										{!isLoadingNotifications && notifications.length === 0 && (
											<div className="p-8 text-center">
												<div className="w-16 h-16 bg-gradient-to-br from-[#800000]/10 to-[#D4AF37]/10 rounded-full flex items-center justify-center mx-auto mb-3">
													<FaBell className="w-8 h-8 text-gray-400" />
												</div>
												<p className="text-sm font-semibold text-gray-700 mb-1">All caught up!</p>
												<p className="text-xs text-gray-500">No new notifications</p>
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
											
											const notificationType = n.payload?.type || 'system';
											const icon = getNotificationIcon(notificationType);
											const colorClass = getNotificationColorClass(notificationType);
											
											return (
												<div 
													key={n.id || n._id || idx} 
													onClick={() => handleNotificationClick(n)}
													className={`px-4 py-3.5 border-b cursor-pointer transition-all duration-300 hover:shadow-md hover:bg-gradient-to-r hover:from-white hover:to-[#800000]/5 ${
														n.unread || n.read === false 
															? 'bg-gradient-to-r from-[#800000]/8 via-[#D4AF37]/5 to-transparent border-[#800000]/20' 
															: 'bg-white border-gray-100'
													}`}
												>
													<div className="flex items-start gap-3">
														{/* Icon */}
														<div className={`flex-shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br ${colorClass} flex items-center justify-center text-white shadow-md text-lg`}>
															{icon}
														</div>
														
														{/* Content */}
														<div className="flex-1 min-w-0">
															<div className="flex items-start justify-between gap-2 mb-1">
																<h4 className={`font-bold text-sm leading-tight ${
																	n.unread || n.read === false ? 'text-gray-900' : 'text-gray-700'
																}`}>
																	{n.title || 'Notification'}
																</h4>
																{(n.unread || n.read === false) && (
																	<div className="flex-shrink-0 w-2 h-2 bg-[#800000] rounded-full mt-1.5 animate-pulse"></div>
																)}
															</div>
															<p className="text-xs text-gray-600 line-clamp-2 mb-2 leading-relaxed">
																{n.message || n.body || 'No message'}
															</p>
															<div className="flex items-center justify-between">
																<span className="text-xs text-gray-500 font-medium">
																	{formatTime(n.createdAt)}
																</span>
																{n.payload?.eventId && (
																	<span className="text-xs text-[#800000] font-semibold flex items-center gap-1">
																		View
																		<FaChevronRight className="w-2.5 h-2.5" />
																	</span>
																)}
															</div>
														</div>
													</div>
												</div>
											);
										})}
									</div>
								</div>
							)}
						</div>

                        {/* User Dropdown */}
                        <div className="relative" ref={dropdownRef}>
                            <button
                                onClick={() => {
                                    const next = !isDropdownOpen;
                                    setIsDropdownOpen(next);
                                    if (next) {
                                        setIsBellOpen(false);
                                        setIsMobileMenuOpen(false); // Close mobile menu when user dropdown opens
                                    }
                                }}
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
                            </button>
                            {/* Desktop Dropdown - Keep for desktop screens only - Only Calendar, Account Settings, System Settings, and Logout */}
                            {isDropdownOpen && (
                                <div className="hidden lg:block absolute right-0 mt-2 w-72 lg:w-80 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-[120]">
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
                                                    <div className="text-xs text-[#800000] font-medium mt-0.5">{userData.role}</div>
                                                </div>
                                            </div>
                                        </button>
                                    </div>
                                    <div className="py-2">
                                        {/* Desktop: Only Calendar, Account Settings, System Settings, and Logout */}
                                        {/* Calendar */}
                                        <button 
                                            onClick={() => { 
                                                const calendarRoute = isUser ? '/user/calendar' : 
                                                                   isDept ? '/department/calendar' : 
                                                                   isCRD ? '/crd-staff/calendar' : 
                                                                   '/system-admin/dashboard';
                                                navigate(calendarRoute); 
                                                setIsDropdownOpen(false); 
                                            }} 
                                            className="w-full text-left px-5 py-2.5 text-sm text-gray-800 hover:bg-gray-50 flex items-center gap-2"
                                        >
                                            <FaCalendar className="w-4 h-4" />
                                            Calendar
                                        </button>
                                        <div className="my-2 h-px bg-gray-100" />
                                        
                                        {/* Account Settings */}
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
                                        
                                        {/* Logout */}
                                        <button onClick={handleLogout} className="w-full text-left px-5 py-2.5 text-sm text-red-700 hover:bg-red-50 flex items-center gap-2">
                                            <FaSignOutAlt className="w-4 h-4" />
                                            Logout
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Mobile Slider Menu for User Dropdown - Slides from right */}
                            {isDropdownOpen && (
                                <div 
                                    className="lg:hidden profile-slider-container pointer-events-none"
                                    style={{ zIndex: 99999 }}
                                >
                                    {/* Backdrop overlay with full blur */}
                                    <div 
                                        className="fixed inset-0 bg-black/70 backdrop-blur-xl pointer-events-auto"
                                        onClick={() => setIsDropdownOpen(false)}
                                        style={{
                                            animation: 'fadeIn 0.3s ease-out',
                                            zIndex: 99999,
                                            backdropFilter: 'blur(24px)',
                                            WebkitBackdropFilter: 'blur(24px)'
                                        }}
                                    />
                                    {/* Slider menu from right - Full height */}
                                    <div 
                                        className="profile-slider-menu w-80 max-w-[85vw] bg-white shadow-2xl flex flex-col pointer-events-auto"
                                        style={{
                                            animation: 'slideInRight 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                                            boxShadow: '-8px 0 32px rgba(0, 0, 0, 0.25)',
                                            transform: 'translateX(0)'
                                        }}
                                    >
                                        {/* Enhanced Header with close button */}
                                        <div className="px-6 py-5 flex items-center justify-between border-b-2 border-[#800000]/30 bg-gradient-to-br from-[#800000] via-[#900000] to-[#800000] text-white shadow-xl relative z-10">
                                            <div className="flex items-center gap-3 flex-1 min-w-0">
                                                {userData?.profileImage ? (
                                                    <div className="relative flex-shrink-0">
                                                        <img 
                                                            src={userData.profileImage} 
                                                            alt={userData.name} 
                                                            className="w-12 h-12 rounded-full object-cover border-3 border-white/40 shadow-lg ring-2 ring-white/20" 
                                                        />
                                                        <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-green-500 rounded-full border-2 border-white shadow-md"></div>
                                                    </div>
                                                ) : (
                                                    <div className="w-12 h-12 rounded-full bg-white/25 backdrop-blur-sm flex items-center justify-center border-2 border-white/40 shadow-lg ring-2 ring-white/20 text-white font-bold text-base flex-shrink-0">
                                                        {(userData?.name || 'User').split(' ').slice(0,2).map(n=>n.charAt(0).toUpperCase()).join('')}
                                                    </div>
                                                )}
                                                <div className="flex-1 min-w-0">
                                                    <div className="text-base font-extrabold tracking-tight truncate">{userData.name}</div>
                                                    <div className="text-xs opacity-95 font-semibold mt-0.5 truncate">{userData.role}</div>
                                                    <div className="text-[10px] opacity-80 font-medium mt-0.5 truncate">{userData.email}</div>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => setIsDropdownOpen(false)}
                                                className="ml-3 p-2.5 rounded-xl hover:bg-white/30 active:bg-white/40 active:scale-95 transition-all duration-200 touch-manipulation shadow-lg hover:shadow-xl flex-shrink-0"
                                                aria-label="Close menu"
                                            >
                                                <FaTimes className="w-6 h-6" />
                                            </button>
                                        </div>

                                        {/* Scrollable menu content - Full height */}
                                        <div 
                                            className="flex-1 overflow-y-auto overflow-x-hidden bg-gradient-to-b from-white via-gray-50/50 to-white"
                                            style={{
                                                height: 'calc(100vh - 80px)',
                                                maxHeight: 'calc(100vh - 80px)',
                                                WebkitOverflowScrolling: 'touch'
                                            }}
                                        >
                                            <div className="py-4 px-3">
                                                {/* Navigation Links Based on User Role */}
                                                {isUser && (
                                                    <>
                                                        <MobileNavLink to={getDashboardRoute(userData.role)} icon={<FaTachometerAlt />}>Dashboard</MobileNavLink>
                                                        <MobileNavLink to="/user/events" icon={<FaCalendarAlt />}>Events</MobileNavLink>
                                                        <MobileNavLink to="/user/donations" icon={<FaHandHoldingHeart />}>Donations</MobileNavLink>
                                                        <MobileNavLink to="/user/calendar" icon={<FaCalendar />}>Calendar</MobileNavLink>
                                                    </>
                                                )}

                                                {isDept && (
                                                    <>
                                                        <MobileNavLink to="/department/dashboard" icon={<FaTachometerAlt />}>Dashboard</MobileNavLink>
                                                        <MobileNavLink to="/department/events" icon={<FaCalendarAlt />}>Events</MobileNavLink>
                                                        <MobileNavLink to="/department/donations" icon={<FaHandHoldingHeart />}>Donations</MobileNavLink>
                                                        <MobileNavLink to="/department/reports" icon={<FaChartLine />}>Reports</MobileNavLink>
                                                        <MobileNavLink to="/department/calendar" icon={<FaCalendar />}>Calendar</MobileNavLink>
                                                    </>
                                                )}

                                                {isCRD && (
                                                    <>
                                                        <MobileNavLink to="/crd-staff/dashboard" icon={<FaTachometerAlt />}>Dashboard</MobileNavLink>
                                                        <MobileNavLink to="/crd-staff/events" icon={<FaCalendarAlt />}>Events</MobileNavLink>
                                                        <MobileNavLink to="/crd-staff/reports" icon={<FaChartLine />}>Reports</MobileNavLink>
                                                        <MobileNavLink to="/crd-staff/leaderboard" icon={<FaTrophy />}>Leaderboard</MobileNavLink>
                                                        <MobileNavLink to="/crd-staff/donations" icon={<FaBoxOpen />}>Donations</MobileNavLink>
                                                        <MobileNavLink to="/crd-staff/calendar" icon={<FaCalendar />}>Calendar</MobileNavLink>
                                                    </>
                                                )}

                                                {userData?.role && userData.role.toLowerCase().includes('system admin') && (
                                                    <>
                                                        <MobileNavLink to="/system-admin/dashboard" icon={<FaTachometerAlt />}>Dashboard</MobileNavLink>
                                                        <MobileNavLink to="/system-admin/users" icon={<FaUsers />}>User Management</MobileNavLink>
                                                        <MobileNavLink to="/system-admin/settings" icon={<FaCogs />}>System Settings</MobileNavLink>
                                                        <MobileNavLink to="/system-admin/reports" icon={<FaChartLine />}>System Reports</MobileNavLink>
                                                    </>
                                                )}

                                                {/* Account section - Enhanced */}
                                                <div className="border-t-2 border-gray-200/80 my-4 pt-4 mx-2">
                                                    <div className="px-3 py-2 mb-3">
                                                        <span className="text-xs font-extrabold text-gray-600 uppercase tracking-widest">Account</span>
                                                    </div>
                                                    <MobileNavLink to={getProfileRoute()} icon={<FaCog />}>Account Settings</MobileNavLink>
                                                    {userData.role && !userData.role.toLowerCase().includes('system admin') && (
                                                        <MobileNavLink to="/system-settings" icon={<FaSlidersH />}>System Settings</MobileNavLink>
                                                    )}
                                                    {userData.role === 'User' && !userData.isAccountVerified && (
                                                        <MobileNavLink to="/email-verify" icon={<FaCheckCircle />} className="text-orange-700 hover:bg-orange-50">Verify Account</MobileNavLink>
                                                    )}
                                                </div>

                                                {/* Logout Button - Enhanced */}
                                                <div className="border-t-2 border-gray-200/80 my-4 pt-4 mx-2">
                                                    <button 
                                                        onClick={() => {
                                                            handleLogout();
                                                            setIsDropdownOpen(false);
                                                        }} 
                                                        className="w-full flex items-center space-x-4 p-4 rounded-xl transition-all duration-300 touch-manipulation bg-gradient-to-r from-red-50 via-red-50/80 to-red-50/50 text-red-700 hover:from-red-100 hover:via-red-100/80 hover:to-red-100/50 active:from-red-200 active:via-red-200/80 active:to-red-200/50 border-2 border-red-200 hover:border-red-300 active:border-red-400 font-bold shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] group"
                                                    >
                                                        <FaSignOutAlt className="text-xl flex-shrink-0 group-hover:rotate-12 transition-transform duration-300" />
                                                        <span className="text-base font-bold flex-1 text-left">Logout</span>
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
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
                            onClick={() => {
                                const next = !isMobileMenuOpen;
                                setIsMobileMenuOpen(next);
                                if (next) {
                                    setIsDropdownOpen(false); // Close user dropdown when mobile menu opens
                                    setIsBellOpen(false);
                                }
                            }}
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
        {/* Mobile slider menu - slides in from right */}
                {isMobileMenuOpen && (
                    <div className="lg:hidden mobile-menu-overlay fixed inset-0 z-[9998] pointer-events-none" style={{ filter: 'none', WebkitFilter: 'none' }}>
                        {/* Backdrop overlay with full blur - spans full height from top to bottom */}
                        <div 
                            className="fixed top-0 left-0 right-0 bottom-0 w-full h-full min-h-screen bg-black/70 backdrop-blur-xl pointer-events-auto"
                            onClick={() => setIsMobileMenuOpen(false)}
                            style={{
                                animation: 'fadeIn 0.3s ease-out',
                                backdropFilter: 'blur(20px)',
                                WebkitBackdropFilter: 'blur(20px)',
                                height: '100vh',
                                minHeight: '100vh',
                                maxHeight: '100vh',
                                zIndex: 9998,
                                transition: 'opacity 0.3s ease-out, backdrop-filter 0.3s ease-out',
                                filter: 'none',
                                WebkitFilter: 'none'
                            }}
                        />
                        {/* Slider menu from right - full height from top to bottom */}
                        <div 
                            className="fixed top-0 right-0 bottom-0 w-80 max-w-[85vw] bg-white shadow-2xl flex flex-col border-l border-gray-200 pointer-events-auto mobile-menu-slider"
                            style={{
                                animation: 'slideInRight 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                                boxShadow: '-4px 0 24px rgba(0, 0, 0, 0.15)',
                                zIndex: 9999,
                                transition: 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                                filter: 'none',
                                WebkitFilter: 'none'
                            }}
                        >
                            {/* Header with close button - Enhanced design */}
                            <div className="px-5 py-4 flex items-center justify-between border-b-2 border-[#800000]/20 bg-gradient-to-br from-[#800000] via-[#900000] to-[#800000] text-white shadow-lg">
                                <div className="flex items-center gap-3">
                                    <div>
                                        <div className="text-base font-extrabold tracking-tight">EUMATTER</div>
                                        <div className="text-xs opacity-90 font-medium">Navigation Menu</div>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setIsMobileMenuOpen(false)}
                                    className="p-2.5 rounded-xl hover:bg-white/25 active:bg-white/35 active:scale-95 transition-all duration-200 touch-manipulation shadow-md hover:shadow-lg"
                                    aria-label="Close menu"
                                >
                                    <FaTimes className="w-5 h-5" />
                                </button>
                            </div>

                            {/* Scrollable menu content with improved styling */}
                            <div className="flex-1 overflow-y-auto overflow-x-hidden bg-gradient-to-b from-white via-gray-50/30 to-white">
                                {/* Primary links for logged out users */}
                                {!isLoggedIn && (
                                    <div className="py-3 px-3">
                                        <MobileNavLink to="/" icon={<FaHome />}>Home</MobileNavLink>
                                        <MobileNavLink to="/program" icon={<FaBookOpen />}>Program</MobileNavLink>
                                        <MobileNavLink to="/nstp" icon={<FaClipboardList />}>NSTP</MobileNavLink>
                                        <MobileNavLink to="/about" icon={<FaInfoCircle />}>About</MobileNavLink>
                                        <div className="px-3 py-4 mt-3">
                                            <Button
                                                onClick={() => { navigate('/login'); setIsMobileMenuOpen(false); }}
                                                variant="gold"
                                                size="lg"
                                                className="w-full shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
                                            >
                                                Join Us
                                            </Button>
                                        </div>
                                    </div>
                                )}

                                {/* Role-aware navigation for logged in users */}
                                {isLoggedIn && (
                                    <div className="py-3 px-3">
                                        {isUser && (
                                            <>
                                                <MobileNavLink to={getDashboardRoute(userData.role)} icon={<FaTachometerAlt />}>Dashboard</MobileNavLink>
                                                <MobileNavLink to="/user/events" icon={<FaCalendarAlt />}>Events</MobileNavLink>
                                                <MobileNavLink to="/user/donations" icon={<FaHandHoldingHeart />}>Donations</MobileNavLink>
                                                <MobileNavLink to="/user/calendar" icon={<FaCalendar />}>Calendar</MobileNavLink>
                                            </>
                                        )}

                                        {isDept && (
                                            <>
                                                <MobileNavLink to="/department/dashboard" icon={<FaTachometerAlt />}>Dashboard</MobileNavLink>
                                                <MobileNavLink to="/department/events" icon={<FaCalendarAlt />}>Events</MobileNavLink>
                                                <MobileNavLink to="/department/donations" icon={<FaHandHoldingHeart />}>Donations</MobileNavLink>
                                                <MobileNavLink to="/department/reports" icon={<FaChartLine />}>Reports</MobileNavLink>
                                                <MobileNavLink to="/department/calendar" icon={<FaCalendar />}>Calendar</MobileNavLink>
                                            </>
                                        )}

                                        {isCRD && (
                                            <>
                                                <MobileNavLink to="/crd-staff/dashboard" icon={<FaTachometerAlt />}>Dashboard</MobileNavLink>
                                                <MobileNavLink to="/crd-staff/events" icon={<FaCalendarAlt />}>Events</MobileNavLink>
                                                <MobileNavLink to="/crd-staff/reports" icon={<FaChartLine />}>Reports</MobileNavLink>
                                                <MobileNavLink to="/crd-staff/leaderboard" icon={<FaTrophy />}>Leaderboard</MobileNavLink>
                                                <MobileNavLink to="/crd-staff/donations" icon={<FaBoxOpen />}>Donations</MobileNavLink>
                                                <MobileNavLink to="/crd-staff/calendar" icon={<FaCalendar />}>Calendar</MobileNavLink>
                                            </>
                                        )}

                                        {userData?.role && userData.role.toLowerCase().includes('system admin') && (
                                            <>
                                                <MobileNavLink to="/system-admin/dashboard" icon={<FaTachometerAlt />}>Dashboard</MobileNavLink>
                                                <MobileNavLink to="/system-admin/users" icon={<FaUsers />}>User Management</MobileNavLink>
                                                <MobileNavLink to="/system-admin/settings" icon={<FaCogs />}>System Settings</MobileNavLink>
                                                <MobileNavLink to="/system-admin/reports" icon={<FaChartLine />}>System Reports</MobileNavLink>
                                            </>
                                        )}

                                        {/* Account section - Enhanced styling */}
                                        <div className="border-t-2 border-gray-200 my-3 pt-3 mx-2">
                                            <div className="px-3 py-1 mb-3">
                                                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Account</span>
                                            </div>
                                            <MobileNavLink to={getProfileRoute()} icon={<FaUser />}>Profile</MobileNavLink>
                                            <MobileNavLink to={getProfileRoute()} icon={<FaCog />}>Account Settings</MobileNavLink>
                                            {userData.role && !userData.role.toLowerCase().includes('system admin') && (
                                                <MobileNavLink to="/system-settings" icon={<FaSlidersH />}>System Settings</MobileNavLink>
                                            )}
                                            {userData.role === 'User' && !userData.isAccountVerified && (
                                                <MobileNavLink to="/email-verify" icon={<FaCheckCircle />} className="text-orange-700 hover:bg-orange-50">Verify Account</MobileNavLink>
                                            )}
                                        </div>

                                        {/* Logout - Enhanced styling */}
                                        <div className="border-t-2 border-gray-200 my-3 pt-3 mx-2">
                                            <button 
                                                onClick={() => {
                                                    handleLogout();
                                                    setIsMobileMenuOpen(false);
                                                }} 
                                                className="w-full flex items-center space-x-4 p-4 rounded-xl transition-all duration-300 touch-manipulation bg-gradient-to-r from-red-50 to-red-50/50 text-red-700 hover:from-red-100 hover:to-red-100/50 active:from-red-200 active:to-red-200/50 border-2 border-red-200 hover:border-red-300 font-semibold shadow-md hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] group"
                                            >
                                                <FaSignOutAlt className="text-xl flex-shrink-0 group-hover:rotate-12 transition-transform duration-300" />
                                                <span className="text-base font-semibold flex-1 text-left">Logout</span>
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Footer with user info if logged in - Enhanced design */}
                            {isLoggedIn && userData && (
                                <div className="px-5 py-4 border-t-2 border-gray-200 bg-gradient-to-br from-gray-50 via-white to-gray-50 shadow-inner">
                                    <div className="flex items-center gap-3 p-2 rounded-xl hover:bg-white/50 transition-all duration-200 cursor-pointer" onClick={() => { navigate(getProfileRoute()); setIsMobileMenuOpen(false); }}>
                                        {userData?.profileImage ? (
                                            <div className="relative">
                                                <img 
                                                    src={userData.profileImage} 
                                                    alt={userData.name} 
                                                    className="w-12 h-12 rounded-full object-cover border-2 border-[#800000] shadow-md" 
                                                />
                                                <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-green-500 rounded-full border-2 border-white"></div>
                                            </div>
                                        ) : (
                                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#800000] to-[#9c0000] text-white flex items-center justify-center font-bold text-base shadow-md">
                                                {(userData?.name || 'User').split(' ').slice(0,2).map(n=>n.charAt(0).toUpperCase()).join('')}
                                            </div>
                                        )}
                                        <div className="flex-1 min-w-0">
                                            <div className="text-sm font-bold text-gray-900 truncate">{userData.name}</div>
                                            <div className="text-xs text-gray-600 truncate">{userData.email}</div>
                                            <div className="text-xs text-[#800000] font-semibold mt-0.5">{userData.role}</div>
                                        </div>
                                        <FaChevronRight className="text-gray-400 flex-shrink-0" />
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}
        {/* Spacer to offset fixed header height */}
        <div aria-hidden className={`${showMaintenanceBanner ? 'h-20 sm:h-24 md:h-28 lg:h-28' : 'h-14 sm:h-16 md:h-20 lg:h-20'}`}></div>
        </>
    );
};

export default Header;
