import React, { useContext, useState, useEffect } from 'react'
import LoadingSpinner from '../../../components/LoadingSpinner'
import { AppContent } from '../../../context/AppContext.jsx'
import SystemAdminSidebar from '../System_Admin/SystemAdminSidebar.jsx'
import axios from 'axios'
import { toast } from 'react-toastify'
import { FaTools, FaEnvelope, FaShieldAlt, FaSave, FaUser, FaUsers, FaUserTie, FaUserShield, FaBoxOpen } from 'react-icons/fa'

const SystemSettings = () => {
    const { backendUrl } = useContext(AppContent)
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
        twoFactorAuth: false,
        inKindDonationSettings: {
            enabled: true,
            allowedTypes: ['food', 'clothing', 'school_supplies', 'medical_supplies', 'equipment', 'services', 'other'],
            instructions: 'Please provide detailed information about your in-kind donation including item description, quantity, and estimated value. Our team will review your donation and contact you regarding delivery or pickup arrangements.'
        }
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
                    twoFactorAuth: data.settings.twoFactorAuth || false,
                    inKindDonationSettings: {
                        enabled: data.settings.inKindDonationSettings?.enabled !== undefined ? data.settings.inKindDonationSettings.enabled : true,
                        allowedTypes: data.settings.inKindDonationSettings?.allowedTypes || ['food', 'clothing', 'school_supplies', 'medical_supplies', 'equipment', 'services', 'other'],
                        instructions: data.settings.inKindDonationSettings?.instructions || settings.inKindDonationSettings.instructions
                    }
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
                twoFactorAuth: settings.twoFactorAuth,
                inKindDonationSettings: {
                    enabled: settings.inKindDonationSettings.enabled,
                    allowedTypes: settings.inKindDonationSettings.allowedTypes,
                    instructions: settings.inKindDonationSettings.instructions
                }
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
            <div className="bg-[#F5F5F5] min-h-screen">
                <SystemAdminSidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
                <main className="lg:ml-64 xl:ml-72 min-h-screen flex items-center justify-center">
                    <LoadingSpinner size="large" text="Loading settings..." />
                </main>
            </div>
        )
    }

    return (
        <div className="bg-[#F5F5F5] min-h-screen">
            <SystemAdminSidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
            <main className="lg:ml-64 xl:ml-72 min-h-screen overflow-y-auto">
                <div className="lg:hidden sticky top-0 z-30 bg-white border-b border-gray-100 px-4 py-3 flex items-center">
                    <button
                        type="button"
                        onClick={() => setIsSidebarOpen(true)}
                        className="p-2 text-gray-600 hover:text-[#800000] hover:bg-gray-100 rounded-xl transition"
                        aria-label="Open menu"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
                    </button>
                    <h1 className="ml-3 text-lg font-bold text-[#800000]">System Admin</h1>
                </div>

                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 sm:px-6 py-4 sm:py-5 mb-6">
                        <h1 className="text-xl sm:text-2xl font-bold text-[#800000] tracking-tight">System Settings</h1>
                        <p className="text-sm text-gray-600 mt-0.5">Configure system preferences and settings.</p>
                    </div>

                    <div className="space-y-6">
                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-6">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 rounded-xl bg-[#F5E6E8] border border-[#800000]/10 flex items-center justify-center">
                                    <FaTools className="w-5 h-5 text-[#800000]" />
                                </div>
                                <h3 className="text-lg font-bold text-gray-900">Maintenance Mode</h3>
                            </div>
                            <div className="space-y-4">
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 rounded-xl border border-gray-100 hover:bg-gray-50/80 transition">
                                    <div className="flex-1 min-w-0">
                                        <h4 className="font-medium text-gray-900 text-sm mb-1">Enable Maintenance Mode</h4>
                                        <p className="text-xs text-gray-600">When enabled, users see a maintenance page and cannot access the system.</p>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                                        <input type="checkbox" checked={settings.maintenanceMode.enabled} onChange={(e) => handleMaintenanceToggle(e.target.checked)} className="sr-only peer" />
                                        <div className="w-11 h-6 bg-gray-200 peer-focus:ring-4 peer-focus:ring-[#800000]/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#800000]" />
                                    </label>
                                </div>

                                {settings.maintenanceMode.enabled && (
                                    <div className="space-y-4 p-4 bg-amber-50/50 border border-amber-100 rounded-xl">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">Maintenance Message</label>
                                            <textarea
                                                value={settings.maintenanceMode.message}
                                                onChange={(e) => setSettings(prev => ({ ...prev, maintenanceMode: { ...prev.maintenanceMode, message: e.target.value } }))}
                                                rows={3}
                                                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#800000]/30 focus:border-[#800000] resize-none"
                                                placeholder="Enter maintenance message..."
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">Estimated End Time (Optional)</label>
                                            <input
                                                type="datetime-local"
                                                value={settings.maintenanceMode.estimatedEndTime}
                                                onChange={(e) => setSettings(prev => ({ ...prev, maintenanceMode: { ...prev.maintenanceMode, estimatedEndTime: e.target.value } }))}
                                                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#800000]/30 focus:border-[#800000]"
                                            />
                                            <p className="text-xs text-gray-500 mt-1">Leave empty to keep maintenance active until disabled.</p>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">Roles Allowed During Maintenance</label>
                                            <p className="text-xs text-gray-500 mb-3">Select which roles can access the system during maintenance.</p>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                {[
                                                    { role: 'System Administrator', Icon: FaUserShield },
                                                    { role: 'CRD Staff', Icon: FaUserTie },
                                                    { role: 'Department/Organization', Icon: FaUsers },
                                                    { role: 'User', Icon: FaUser }
                                                ].map(({ role, Icon }) => (
                                                    <label key={role} className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:bg-gray-50/80 cursor-pointer transition">
                                                        <input type="checkbox" checked={settings.maintenanceMode.allowedRoles?.includes(role) || false} onChange={() => handleRoleToggle(role)} className="w-4 h-4 text-[#800000] border-gray-300 rounded focus:ring-[#800000]/30" />
                                                        <div className="w-8 h-8 rounded-lg bg-[#F5E6E8] border border-[#800000]/10 flex items-center justify-center flex-shrink-0">
                                                            <Icon className="w-4 h-4 text-[#800000]" />
                                                        </div>
                                                        <span className="text-sm font-medium text-gray-900">{role}</span>
                                                    </label>
                                                ))}
                                            </div>
                                            {settings.maintenanceMode.allowedRoles?.length === 0 && (
                                                <p className="text-xs text-red-600 mt-2">At least one role must be selected.</p>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-6">
                            <h3 className="text-lg font-bold text-gray-900 mb-4">General Settings</h3>
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 rounded-xl border border-gray-100 hover:bg-gray-50/80 transition">
                                <div className="flex-1 min-w-0">
                                    <h4 className="font-medium text-gray-900 text-sm">System Name</h4>
                                    <p className="text-xs text-gray-600 mt-1">Display name shown in the app</p>
                                </div>
                                <input
                                    type="text"
                                    value={settings.systemName}
                                    onChange={(e) => setSettings(prev => ({ ...prev, systemName: e.target.value }))}
                                    className="w-full sm:w-56 px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#800000]/30 focus:border-[#800000]"
                                />
                            </div>
                        </div>

                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-6">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 rounded-xl bg-[#F5E6E8] border border-[#800000]/10 flex items-center justify-center">
                                    <FaEnvelope className="w-5 h-5 text-[#800000]" />
                                </div>
                                <h3 className="text-lg font-bold text-gray-900">Email Settings</h3>
                            </div>
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 rounded-xl border border-gray-100 hover:bg-gray-50/80 transition">
                                <div className="flex-1 min-w-0">
                                    <h4 className="font-medium text-gray-900 text-sm">Email Notifications</h4>
                                    <p className="text-xs text-gray-600 mt-1">Enable system email notifications</p>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                                    <input type="checkbox" checked={settings.emailNotifications} onChange={(e) => setSettings(prev => ({ ...prev, emailNotifications: e.target.checked }))} className="sr-only peer" />
                                    <div className="w-11 h-6 bg-gray-200 peer-focus:ring-4 peer-focus:ring-[#800000]/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#800000]" />
                                </label>
                            </div>
                        </div>

                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-6">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 rounded-xl bg-[#F5E6E8] border border-[#800000]/10 flex items-center justify-center">
                                    <FaShieldAlt className="w-5 h-5 text-[#800000]" />
                                </div>
                                <h3 className="text-lg font-bold text-gray-900">Security Settings</h3>
                            </div>
                            <div className="space-y-4">
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 rounded-xl border border-gray-100 hover:bg-gray-50/80 transition">
                                    <div className="flex-1 min-w-0">
                                        <h4 className="font-medium text-gray-900 text-sm">Password Policy</h4>
                                        <p className="text-xs text-gray-600 mt-1">Minimum password length</p>
                                    </div>
                                    <select
                                        value={settings.passwordPolicy}
                                        onChange={(e) => setSettings(prev => ({ ...prev, passwordPolicy: e.target.value }))}
                                        className="w-full sm:w-48 px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#800000]/30 focus:border-[#800000] bg-white"
                                    >
                                        <option value="6">6 characters minimum</option>
                                        <option value="8">8 characters minimum</option>
                                        <option value="12">12 characters minimum</option>
                                    </select>
                                </div>
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 rounded-xl border border-gray-100 hover:bg-gray-50/80 transition">
                                    <div className="flex-1 min-w-0">
                                        <h4 className="font-medium text-gray-900 text-sm">Two-Factor Authentication</h4>
                                        <p className="text-xs text-gray-600 mt-1">Require 2FA for all users</p>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                                        <input type="checkbox" checked={settings.twoFactorAuth} onChange={(e) => setSettings(prev => ({ ...prev, twoFactorAuth: e.target.checked }))} className="sr-only peer" />
                                        <div className="w-11 h-6 bg-gray-200 peer-focus:ring-4 peer-focus:ring-[#800000]/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#800000]" />
                                    </label>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-6">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 rounded-xl bg-[#F5E6E8] border border-[#800000]/10 flex items-center justify-center">
                                    <FaBoxOpen className="w-5 h-5 text-[#800000]" />
                                </div>
                                <h3 className="text-lg font-bold text-gray-900">In-Kind Donation Settings</h3>
                            </div>
                            <div className="space-y-4">
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 rounded-xl border border-gray-100 hover:bg-gray-50/80 transition">
                                    <div className="flex-1 min-w-0">
                                        <h4 className="font-medium text-gray-900 text-sm">Enable In-Kind Donations</h4>
                                        <p className="text-xs text-gray-600 mt-1">Allow users to submit in-kind donation requests</p>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                                        <input
                                            type="checkbox"
                                            checked={settings.inKindDonationSettings.enabled}
                                            onChange={(e) => setSettings(prev => ({ ...prev, inKindDonationSettings: { ...prev.inKindDonationSettings, enabled: e.target.checked } }))}
                                            className="sr-only peer"
                                        />
                                        <div className="w-11 h-6 bg-gray-200 peer-focus:ring-4 peer-focus:ring-[#800000]/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#800000]" />
                                    </label>
                                </div>

                                {settings.inKindDonationSettings.enabled && (
                                    <div className="space-y-4 p-4 bg-gray-50/80 border border-gray-100 rounded-xl">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">Allowed Donation Types</label>
                                            <p className="text-xs text-gray-500 mb-3">Selected types will appear in the donation form.</p>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                {[
                                                    { value: 'food', label: 'Food & Beverages' },
                                                    { value: 'clothing', label: 'Clothing & Textiles' },
                                                    { value: 'school_supplies', label: 'School Supplies & Books' },
                                                    { value: 'medical_supplies', label: 'Medical Supplies' },
                                                    { value: 'equipment', label: 'Equipment & Tools' },
                                                    { value: 'services', label: 'Services & Expertise' },
                                                    { value: 'other', label: 'Other' }
                                                ].map((type) => (
                                                    <label key={type.value} className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:bg-white cursor-pointer transition">
                                                        <input
                                                            type="checkbox"
                                                            checked={settings.inKindDonationSettings.allowedTypes.includes(type.value)}
                                                            onChange={(e) => {
                                                                const currentTypes = settings.inKindDonationSettings.allowedTypes || []
                                                                const newTypes = e.target.checked ? [...currentTypes, type.value] : currentTypes.filter(t => t !== type.value)
                                                                setSettings(prev => ({ ...prev, inKindDonationSettings: { ...prev.inKindDonationSettings, allowedTypes: newTypes } }))
                                                            }}
                                                            className="w-4 h-4 text-[#800000] border-gray-300 rounded focus:ring-[#800000]/30"
                                                        />
                                                        <span className="text-sm font-medium text-gray-900">{type.label}</span>
                                                    </label>
                                                ))}
                                            </div>
                                            {settings.inKindDonationSettings.allowedTypes.length === 0 && (
                                                <p className="text-xs text-red-600 mt-2">At least one donation type must be selected.</p>
                                            )}
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">Donation Instructions</label>
                                            <p className="text-xs text-gray-500 mb-2">Shown to users when submitting in-kind donations.</p>
                                            <textarea
                                                value={settings.inKindDonationSettings.instructions || ''}
                                                onChange={(e) => setSettings(prev => ({ ...prev, inKindDonationSettings: { ...prev.inKindDonationSettings, instructions: e.target.value } }))}
                                                rows={4}
                                                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#800000]/30 focus:border-[#800000] resize-none"
                                                placeholder="Enter instructions for in-kind donations..."
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="flex justify-end pt-2">
                            <button
                                type="button"
                                onClick={handleSave}
                                disabled={isSaving}
                                className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-[#800000] rounded-xl hover:bg-[#6b0000] disabled:opacity-50 disabled:cursor-not-allowed transition"
                            >
                                {isSaving ? (
                                    <>
                                        <LoadingSpinner size="tiny" inline />
                                        Saving...
                                    </>
                                ) : (
                                    <>
                                        <FaSave className="w-4 h-4" />
                                        Save Settings
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    )
}

export default SystemSettings
