import React, { useContext, useState, useEffect } from 'react'
import Header from '../../../components/Header'
import Footer from '../../../components/Footer'
import Button from '../../../components/Button'
import LoadingSpinner from '../../../components/LoadingSpinner'
import { AppContent } from '../../../context/AppContext.jsx'
import SystemAdminSidebar from '../System_Admin/SystemAdminSidebar.jsx';
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { toast } from 'react-toastify'
import { motion } from 'framer-motion'
import { FaTools, FaCog, FaEnvelope, FaShieldAlt, FaSave, FaCheckCircle, FaUser, FaUsers, FaUserTie, FaUserShield } from 'react-icons/fa'

const SystemSettings = () => {
    const navigate = useNavigate()
    const { backendUrl, userData } = useContext(AppContent)
    const [isSidebarOpen, setIsSidebarOpen] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [isSaving, setIsSaving] = useState(false)
    const [settings, setSettings] = useState({
        maintenanceMode: {
            enabled: false,
            message: 'We are currently performing scheduled maintenance. Please check back soon.',
            estimatedEndTime: '',
            allowedRoles: ['System Administrator', 'CRD Staff']
        },
        systemName: 'EuMatter',
        emailNotifications: true,
        passwordPolicy: '6',
        twoFactorAuth: false
    })

    useEffect(() => {
        fetchSettings()
    }, [])

    const fetchSettings = async () => {
        try {
            setIsLoading(true)
            axios.defaults.withCredentials = true
            const { data } = await axios.get(backendUrl + 'api/system-settings')
            if (data.success && data.settings) {
                setSettings({
                    maintenanceMode: {
                        enabled: data.settings.maintenanceMode?.enabled || false,
                        message: data.settings.maintenanceMode?.message || settings.maintenanceMode.message,
                        estimatedEndTime: data.settings.maintenanceMode?.estimatedEndTime 
                            ? new Date(data.settings.maintenanceMode.estimatedEndTime).toISOString().slice(0, 16)
                            : '',
                        allowedRoles: data.settings.maintenanceMode?.allowedRoles || ['System Administrator', 'CRD Staff']
                    },
                    systemName: data.settings.systemName || 'EuMatter',
                    emailNotifications: data.settings.emailNotifications !== undefined ? data.settings.emailNotifications : true,
                    passwordPolicy: data.settings.passwordPolicy || '6',
                    twoFactorAuth: data.settings.twoFactorAuth || false
                })
            }
        } catch (error) {
            console.error('Error fetching settings:', error)
            toast.error('Failed to load system settings')
        } finally {
            setIsLoading(false)
        }
    }

    const handleSave = async () => {
        try {
            // Validate that at least one role is selected if maintenance mode is enabled
            if (settings.maintenanceMode.enabled && (!settings.maintenanceMode.allowedRoles || settings.maintenanceMode.allowedRoles.length === 0)) {
                toast.error('At least one role must be selected to allow access during maintenance mode');
                return;
            }
            
            setIsSaving(true)
            axios.defaults.withCredentials = true
            
            const payload = {
                maintenanceMode: {
                    enabled: settings.maintenanceMode.enabled,
                    message: settings.maintenanceMode.message,
                    estimatedEndTime: settings.maintenanceMode.estimatedEndTime 
                        ? new Date(settings.maintenanceMode.estimatedEndTime).toISOString()
                        : null,
                    allowedRoles: settings.maintenanceMode.allowedRoles || ['System Administrator', 'CRD Staff']
                },
                systemName: settings.systemName,
                emailNotifications: settings.emailNotifications,
                passwordPolicy: settings.passwordPolicy,
                twoFactorAuth: settings.twoFactorAuth
            }

            const { data } = await axios.put(backendUrl + 'api/system-settings', payload)
            
            if (data.success) {
                toast.success('System settings saved successfully!')
            } else {
                toast.error(data.message || 'Failed to save settings')
            }
        } catch (error) {
            console.error('Error saving settings:', error)
            toast.error(error?.response?.data?.message || 'Failed to save system settings')
        } finally {
            setIsSaving(false)
        }
    }

    const handleMaintenanceToggle = (enabled) => {
        setSettings(prev => ({
            ...prev,
            maintenanceMode: {
                ...prev.maintenanceMode,
                enabled,
                // Clear estimatedEndTime when disabling
                estimatedEndTime: enabled ? prev.maintenanceMode.estimatedEndTime : '',
                // Keep allowedRoles when toggling
                allowedRoles: prev.maintenanceMode.allowedRoles || ['System Administrator', 'CRD Staff']
            }
        }))
    }

    const handleRoleToggle = (role) => {
        setSettings(prev => {
            const currentRoles = prev.maintenanceMode.allowedRoles || [];
            const newRoles = currentRoles.includes(role)
                ? currentRoles.filter(r => r !== role)
                : [...currentRoles, role];
            
            return {
                ...prev,
                maintenanceMode: {
                    ...prev.maintenanceMode,
                    allowedRoles: newRoles
                }
            };
        });
    }

    if (isLoading) {
        return (
            <div className="bg-gray-50 min-h-screen">
                <SystemAdminSidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
                <main className="lg:ml-64 xl:ml-72 min-h-screen flex items-center justify-center">
                    <LoadingSpinner size="large" text="Loading settings..." />
                </main>
            </div>
        )
    }

    return (
        <div className="bg-gray-50 min-h-screen">
            <SystemAdminSidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
            <main className="lg:ml-64 xl:ml-72 min-h-screen overflow-y-auto">
                {/* Mobile Menu Button */}
                <div className="lg:hidden sticky top-0 z-30 bg-white shadow-sm px-4 py-3 flex items-center">
                    <button
                        onClick={() => setIsSidebarOpen(true)}
                        className="p-2 text-[#800000] hover:bg-gray-100 rounded-lg transition-colors touch-manipulation"
                        aria-label="Open menu"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                        </svg>
                    </button>
                    <h1 className="ml-3 text-xl font-bold text-[#800000]">System Admin</h1>
                </div>

                <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 py-4 sm:py-6 md:py-8">
                    {/* Header section */}
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-white rounded-xl shadow-md p-4 sm:p-6 mb-6 sm:mb-8 transition-all duration-300 hover:shadow-lg"
                    >
                        <div className="flex items-center space-x-3 mb-2">
                            <div className="w-12 h-12 bg-gradient-to-br from-[#800000] to-[#EE1212] rounded-xl flex items-center justify-center shadow-md">
                                <FaCog className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-black">System Settings</h1>
                                <p className="text-sm sm:text-base text-gray-600">Configure system preferences and settings.</p>
                            </div>
                        </div>
                    </motion.div>

                    {/* Settings sections */}
                    <div className="space-y-4 sm:space-y-6">
                        {/* Maintenance Mode Settings */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 }}
                            className="bg-white rounded-xl shadow-md p-4 sm:p-6 transform transition-all duration-300 hover:shadow-lg"
                        >
                            <div className="flex items-center space-x-3 mb-4 sm:mb-6">
                                <div className="w-10 h-10 bg-gradient-to-br from-[#800000] to-[#EE1212] rounded-lg flex items-center justify-center shadow-md">
                                    <FaTools className="w-5 h-5 text-white" />
                                </div>
                                <h3 className="text-lg sm:text-xl font-semibold text-black">Maintenance Mode</h3>
                            </div>
                            <div className="space-y-4">
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 p-4 border-2 border-gray-200 rounded-lg transition-all duration-200 hover:border-[#800000]/30">
                                    <div className="flex-1 min-w-0">
                                        <h4 className="font-semibold text-black text-sm sm:text-base mb-1">Enable Maintenance Mode</h4>
                                        <p className="text-xs sm:text-sm text-gray-600">When enabled, users will see a maintenance page and cannot access the system</p>
                                    </div>
                                    <div className="flex-shrink-0">
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={settings.maintenanceMode.enabled}
                                                onChange={(e) => handleMaintenanceToggle(e.target.checked)}
                                                className="sr-only peer"
                                            />
                                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#800000]/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#800000]"></div>
                                        </label>
                                    </div>
                                </div>

                                {settings.maintenanceMode.enabled && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        exit={{ opacity: 0, height: 0 }}
                                        className="space-y-4 p-4 bg-yellow-50/50 border-2 border-yellow-200 rounded-lg"
                                    >
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-900 mb-2">Maintenance Message</label>
                                            <textarea
                                                value={settings.maintenanceMode.message}
                                                onChange={(e) => setSettings(prev => ({
                                                    ...prev,
                                                    maintenanceMode: { ...prev.maintenanceMode, message: e.target.value }
                                                }))}
                                                rows={3}
                                                className="w-full px-4 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#800000] focus:border-[#800000] transition-colors duration-200 resize-none"
                                                placeholder="Enter maintenance message..."
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-900 mb-2">
                                                Estimated End Time (Optional)
                                                <span className="text-xs font-normal text-gray-500 ml-2">Leave empty to enable without time frame</span>
                                            </label>
                                            <input
                                                type="datetime-local"
                                                value={settings.maintenanceMode.estimatedEndTime}
                                                onChange={(e) => setSettings(prev => ({
                                                    ...prev,
                                                    maintenanceMode: { ...prev.maintenanceMode, estimatedEndTime: e.target.value }
                                                }))}
                                                className="w-full px-4 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#800000] focus:border-[#800000] transition-colors duration-200"
                                            />
                                            <p className="text-xs text-gray-500 mt-1">
                                                If no time frame is set, maintenance mode will remain active until manually disabled.
                                            </p>
                                        </div>
                                        
                                        {/* Allowed Roles Selection */}
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-900 mb-3">
                                                Roles Allowed to Access During Maintenance
                                            </label>
                                            <p className="text-xs text-gray-500 mb-3">
                                                Select which roles can log in and access the system during maintenance mode.
                                            </p>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                {/* System Administrator */}
                                                <label className="flex items-center space-x-3 p-3 border-2 border-gray-200 rounded-lg hover:border-[#800000]/30 transition-all duration-200 cursor-pointer bg-white hover:bg-gray-50">
                                                    <input
                                                        type="checkbox"
                                                        checked={settings.maintenanceMode.allowedRoles?.includes('System Administrator') || false}
                                                        onChange={() => handleRoleToggle('System Administrator')}
                                                        className="w-5 h-5 text-[#800000] border-gray-300 rounded focus:ring-[#800000] focus:ring-2 cursor-pointer"
                                                    />
                                                    <div className="flex items-center space-x-2 flex-1">
                                                        <FaUserShield className="w-5 h-5 text-[#800000]" />
                                                        <span className="text-sm font-medium text-gray-900">System Administrator</span>
                                                    </div>
                                                </label>

                                                {/* CRD Staff */}
                                                <label className="flex items-center space-x-3 p-3 border-2 border-gray-200 rounded-lg hover:border-[#800000]/30 transition-all duration-200 cursor-pointer bg-white hover:bg-gray-50">
                                                    <input
                                                        type="checkbox"
                                                        checked={settings.maintenanceMode.allowedRoles?.includes('CRD Staff') || false}
                                                        onChange={() => handleRoleToggle('CRD Staff')}
                                                        className="w-5 h-5 text-[#800000] border-gray-300 rounded focus:ring-[#800000] focus:ring-2 cursor-pointer"
                                                    />
                                                    <div className="flex items-center space-x-2 flex-1">
                                                        <FaUserTie className="w-5 h-5 text-[#800000]" />
                                                        <span className="text-sm font-medium text-gray-900">CRD Staff</span>
                                                    </div>
                                                </label>

                                                {/* Department/Organization */}
                                                <label className="flex items-center space-x-3 p-3 border-2 border-gray-200 rounded-lg hover:border-[#800000]/30 transition-all duration-200 cursor-pointer bg-white hover:bg-gray-50">
                                                    <input
                                                        type="checkbox"
                                                        checked={settings.maintenanceMode.allowedRoles?.includes('Department/Organization') || false}
                                                        onChange={() => handleRoleToggle('Department/Organization')}
                                                        className="w-5 h-5 text-[#800000] border-gray-300 rounded focus:ring-[#800000] focus:ring-2 cursor-pointer"
                                                    />
                                                    <div className="flex items-center space-x-2 flex-1">
                                                        <FaUsers className="w-5 h-5 text-[#800000]" />
                                                        <span className="text-sm font-medium text-gray-900">Department/Organization</span>
                                                    </div>
                                                </label>

                                                {/* User */}
                                                <label className="flex items-center space-x-3 p-3 border-2 border-gray-200 rounded-lg hover:border-[#800000]/30 transition-all duration-200 cursor-pointer bg-white hover:bg-gray-50">
                                                    <input
                                                        type="checkbox"
                                                        checked={settings.maintenanceMode.allowedRoles?.includes('User') || false}
                                                        onChange={() => handleRoleToggle('User')}
                                                        className="w-5 h-5 text-[#800000] border-gray-300 rounded focus:ring-[#800000] focus:ring-2 cursor-pointer"
                                                    />
                                                    <div className="flex items-center space-x-2 flex-1">
                                                        <FaUser className="w-5 h-5 text-[#800000]" />
                                                        <span className="text-sm font-medium text-gray-900">User</span>
                                                    </div>
                                                </label>
                                            </div>
                                            {settings.maintenanceMode.allowedRoles?.length === 0 && (
                                                <p className="text-xs text-red-600 mt-2">
                                                    ⚠️ At least one role must be selected to allow access during maintenance.
                                                </p>
                                            )}
                                        </div>
                                    </motion.div>
                                )}
                            </div>
                        </motion.div>

                        {/* General Settings */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                            className="bg-white rounded-xl shadow-md p-4 sm:p-6 transform transition-all duration-300 hover:shadow-lg"
                        >
                            <h3 className="text-lg sm:text-xl font-semibold text-black mb-4 sm:mb-6">General Settings</h3>
                            <div className="space-y-4">
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 p-4 border border-gray-200 rounded-lg transition-colors duration-200 hover:bg-gray-50">
                                    <div className="flex-1 min-w-0">
                                        <h4 className="font-medium text-black text-sm sm:text-base">System Name</h4>
                                        <p className="text-xs sm:text-sm text-gray-600 mt-1">Configure the system display name</p>
                                    </div>
                                    <div className="flex-shrink-0 w-full sm:w-auto sm:min-w-[200px]">
                                        <input
                                            type="text"
                                            value={settings.systemName}
                                            onChange={(e) => setSettings(prev => ({ ...prev, systemName: e.target.value }))}
                                            className="w-full px-4 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#800000] focus:border-[#800000] transition-colors duration-200"
                                        />
                                    </div>
                                </div>
                            </div>
                        </motion.div>

                        {/* Email Settings */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 }}
                            className="bg-white rounded-xl shadow-md p-4 sm:p-6 transform transition-all duration-300 hover:shadow-lg"
                        >
                            <div className="flex items-center space-x-3 mb-4 sm:mb-6">
                                <div className="w-10 h-10 bg-gradient-to-br from-[#800000] to-[#EE1212] rounded-lg flex items-center justify-center shadow-md">
                                    <FaEnvelope className="w-5 h-5 text-white" />
                                </div>
                                <h3 className="text-lg sm:text-xl font-semibold text-black">Email Settings</h3>
                            </div>
                            <div className="space-y-4">
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 p-4 border border-gray-200 rounded-lg transition-colors duration-200 hover:bg-gray-50">
                                    <div className="flex-1 min-w-0">
                                        <h4 className="font-medium text-black text-sm sm:text-base">Email Notifications</h4>
                                        <p className="text-xs sm:text-sm text-gray-600 mt-1">Enable system email notifications</p>
                                    </div>
                                    <div className="flex-shrink-0">
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={settings.emailNotifications}
                                                onChange={(e) => setSettings(prev => ({ ...prev, emailNotifications: e.target.checked }))}
                                                className="sr-only peer"
                                            />
                                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#800000]/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#800000]"></div>
                                        </label>
                                    </div>
                                </div>
                            </div>
                        </motion.div>

                        {/* Security Settings */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.4 }}
                            className="bg-white rounded-xl shadow-md p-4 sm:p-6 transform transition-all duration-300 hover:shadow-lg"
                        >
                            <div className="flex items-center space-x-3 mb-4 sm:mb-6">
                                <div className="w-10 h-10 bg-gradient-to-br from-[#800000] to-[#EE1212] rounded-lg flex items-center justify-center shadow-md">
                                    <FaShieldAlt className="w-5 h-5 text-white" />
                                </div>
                                <h3 className="text-lg sm:text-xl font-semibold text-black">Security Settings</h3>
                            </div>
                            <div className="space-y-4">
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 p-4 border border-gray-200 rounded-lg transition-colors duration-200 hover:bg-gray-50">
                                    <div className="flex-1 min-w-0">
                                        <h4 className="font-medium text-black text-sm sm:text-base">Password Policy</h4>
                                        <p className="text-xs sm:text-sm text-gray-600 mt-1">Minimum password requirements</p>
                                    </div>
                                    <div className="flex-shrink-0 w-full sm:w-auto sm:min-w-[200px]">
                                        <select
                                            value={settings.passwordPolicy}
                                            onChange={(e) => setSettings(prev => ({ ...prev, passwordPolicy: e.target.value }))}
                                            className="w-full px-4 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#800000] focus:border-[#800000] transition-colors duration-200 bg-white"
                                        >
                                            <option value="6">6 characters minimum</option>
                                            <option value="8">8 characters minimum</option>
                                            <option value="12">12 characters minimum</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 p-4 border border-gray-200 rounded-lg transition-colors duration-200 hover:bg-gray-50">
                                    <div className="flex-1 min-w-0">
                                        <h4 className="font-medium text-black text-sm sm:text-base">Two-Factor Authentication</h4>
                                        <p className="text-xs sm:text-sm text-gray-600 mt-1">Require 2FA for all users</p>
                                    </div>
                                    <div className="flex-shrink-0">
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={settings.twoFactorAuth}
                                                onChange={(e) => setSettings(prev => ({ ...prev, twoFactorAuth: e.target.checked }))}
                                                className="sr-only peer"
                                            />
                                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#800000]/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#800000]"></div>
                                        </label>
                                    </div>
                                </div>
                            </div>
                        </motion.div>

                        {/* Save Button */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.5 }}
                            className="flex justify-center sm:justify-end pt-4"
                        >
                            <Button
                                variant="primary"
                                size="lg"
                                onClick={handleSave}
                                disabled={isSaving}
                                className="w-full sm:w-auto min-w-[200px]"
                            >
                                {isSaving ? (
                                    <>
                                        <LoadingSpinner size="tiny" inline />
                                        <span>Saving...</span>
                                    </>
                                ) : (
                                    <>
                                        <FaSave className="mr-2" />
                                        Save Settings
                                    </>
                                )}
                            </Button>
                        </motion.div>
                    </div>
                </div>
            </main>
        </div>
    )
}

export default SystemSettings
