import React, { useContext, useState, useEffect, useRef } from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import { AppContent } from '../../../context/AppContext';
import { toast } from 'react-toastify';
import axios from 'axios';
import { FaTachometerAlt, FaUsers, FaCogs, FaChartBar, FaUserCog, FaTimes, FaBars } from 'react-icons/fa';

const sidebarItems = [
    { name: 'Dashboard', path: '/system-admin/dashboard', icon: <FaTachometerAlt /> },
    { name: 'User Management', path: '/system-admin/users', icon: <FaUsers /> },
    { name: 'System Settings', path: '/system-admin/settings', icon: <FaCogs /> },
    { name: 'System Reports', path: '/system-admin/reports', icon: <FaChartBar /> },
];

const SystemAdminSidebar = ({ isOpen, onClose }) => {
    const navigate = useNavigate();
    const { backendUrl, setIsLoggedIn, setUserData } = useContext(AppContent);
    const sidebarRef = useRef(null);

    // Close sidebar when clicking outside on mobile
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (sidebarRef.current && !sidebarRef.current.contains(event.target) && window.innerWidth < 1024) {
                onClose();
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [onClose]);

    const handleLogout = async () => {
        try {
            // Remove any trailing slashes from backendUrl
            const baseUrl = backendUrl.replace(/\/+$/, '');
            const response = await axios.post(`${baseUrl}/api/auth/logout`, {}, {
                withCredentials: true
            });

            if (response.data.success) {
                setIsLoggedIn(false);
                setUserData(null);
                toast.success('Logged out successfully');
                navigate('/login');
            }
        } catch (error) {
            console.error('Logout error:', error);
            if (error.response?.status === 404) {
                toast.error('Logout endpoint not found');
            } else {
                toast.error('Error logging out');
            }
        }
    };

    return (
        <>
            {/* Mobile Overlay */}
            {isOpen && (
                <div 
                    className="fixed inset-0 z-40 lg:hidden transition-opacity duration-300 bg-white/20 backdrop-blur-sm"
                    onClick={onClose}
                />
            )}
            
            {/* Sidebar */}
            <aside 
                ref={sidebarRef}
                className={`fixed left-0 top-0 h-screen w-64 sm:w-72 bg-gradient-to-b from-[#800000] to-[#EE1212] text-white p-4 sm:p-6 shadow-2xl flex flex-col z-50 transition-transform duration-300 ease-in-out
                    ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
                `}
            >
                {/* Header with Close Button for Mobile */}
                <div className="flex items-center justify-between mb-6 sm:mb-10">
                    <h2 className="text-lg sm:text-xl lg:text-2xl font-extrabold tracking-wide flex-1">Admin Panel</h2>
                    <button
                        onClick={onClose}
                        className="lg:hidden p-2 hover:bg-red-700 rounded-lg transition-colors touch-manipulation"
                        aria-label="Close menu"
                    >
                        <FaTimes className="w-5 h-5" />
                    </button>
                </div>
            
            {/* Navigation - Fixed height, no scrolling */}
            <nav className="flex-1 flex flex-col justify-center">
                <ul className="space-y-3 sm:space-y-4">
                    {sidebarItems.map((item) => (
                        <li key={item.name}>
                            <NavLink
                                to={item.path}
                                end
                                onClick={() => {
                                    // Close sidebar on mobile after navigation
                                    if (window.innerWidth < 1024) {
                                        onClose();
                                    }
                                }}
                                className={({ isActive }) =>
                                    `flex items-center space-x-3 sm:space-x-4 w-full p-2.5 sm:p-3 rounded-xl transition-all duration-200 touch-manipulation
                                    ${isActive
                                        ? 'bg-red-700 bg-opacity-20 text-white font-semibold shadow-lg'
                                        : 'hover:bg-red-900 hover:bg-opacity-50 active:bg-opacity-70'
                                    }`
                                }
                            >
                                <span className="text-lg sm:text-xl flex-shrink-0">{item.icon}</span>
                                <span className="text-sm sm:text-base lg:text-lg">{item.name}</span>
                            </NavLink>
                        </li>
                    ))}
                </ul>
            </nav>
            
            {/* Logout button - Fixed at bottom */}
            <div className="mt-auto">
                <button
                    onClick={handleLogout}
                    className="w-full flex items-center justify-center px-3 sm:px-4 py-2.5 sm:py-3 text-white hover:bg-red-700 active:bg-red-800 rounded-lg transition-all duration-200 shadow-lg touch-manipulation"
                >
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-4 w-4 sm:h-5 sm:w-5 mr-2"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                        />
                    </svg>
                    <span className="text-sm sm:text-base">Logout</span>
                </button>
            </div>
        </aside>
        </>
    );
};

export default SystemAdminSidebar;