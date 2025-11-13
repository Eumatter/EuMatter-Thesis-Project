import React, { useState, useEffect, useContext } from 'react';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import { AppContent, applySystemSettings } from '../../context/AppContext.jsx';
import { 
    FaUniversalAccess, 
    FaFont, 
    FaEye, 
    FaPalette, 
    FaMoon, 
    FaSun,
    FaUndo,
    FaSave,
    FaInfoCircle,
    FaSlidersH,
    FaChevronDown,
    FaChevronUp
} from 'react-icons/fa';
import { toast } from 'react-toastify';

const SystemSettings = () => {
    const { userData } = useContext(AppContent);
    const [settings, setSettings] = useState({
        fontSize: 'medium', // small, medium, large, extra-large
        textContrast: 'normal', // normal, high
        colorScheme: 'light', // light, dark
        reduceMotion: false,
        highContrast: false
    });
    const [openSections, setOpenSections] = useState({
        accessibility: false,
        textContrast: false,
        appearance: false
    });

    // Load settings from localStorage on mount
    useEffect(() => {
        const savedSettings = localStorage.getItem('systemSettings');
        if (savedSettings) {
            try {
                const parsed = JSON.parse(savedSettings);
                setSettings(prev => ({ ...prev, ...parsed }));
                applySettings(parsed);
            } catch (error) {
                console.error('Error loading settings:', error);
            }
        }
    }, []);

    // Apply settings using the global utility function
    const applySettings = (newSettings) => {
        applySystemSettings(newSettings);
    };

    // Update settings and apply immediately
    const updateSetting = (key, value) => {
        setSettings(prev => {
            const newSettings = { ...prev, [key]: value };
            applySettings(newSettings);
            localStorage.setItem('systemSettings', JSON.stringify(newSettings));
            return newSettings;
        });
    };

    // Update multiple settings at once
    const updateMultipleSettings = (updates) => {
        setSettings(prev => {
            const newSettings = { ...prev, ...updates };
            applySettings(newSettings);
            localStorage.setItem('systemSettings', JSON.stringify(newSettings));
            return newSettings;
        });
    };

    // Save settings
    const handleSave = () => {
        localStorage.setItem('systemSettings', JSON.stringify(settings));
        toast.success('Settings saved successfully!');
    };

    // Reset to default
    const handleReset = () => {
        const defaultSettings = {
            fontSize: 'medium',
            textContrast: 'normal',
            colorScheme: 'light',
            reduceMotion: false,
            highContrast: false
        };
        setSettings(defaultSettings);
        applySettings(defaultSettings);
        localStorage.setItem('systemSettings', JSON.stringify(defaultSettings));
        toast.success('Settings reset to default!');
    };

    // Toggle section visibility
    const toggleSection = (section) => {
        setOpenSections(prev => ({
            ...prev,
            [section]: !prev[section]
        }));
    };

    return (
        <div className="min-h-screen bg-gray-50">
            <Header />
            
            <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Page Header */}
                <div className="bg-white rounded-xl shadow-md p-6 mb-8">
                    <div className="flex items-center space-x-3 mb-2">
                        <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
                            <FaSlidersH className="text-white text-xl" />
                        </div>
                        <div>
                            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">System Settings</h1>
                            <p className="text-gray-600 text-sm md:text-base">Customize your application experience and accessibility options</p>
                        </div>
                    </div>
                </div>

                <div className="space-y-4">
                    {/* Accessibility Settings - Collapsible on mobile/tablet, expanded on desktop */}
                    <div className="bg-white rounded-xl shadow-md overflow-hidden">
                        {/* Mobile/Tablet: Collapsible Header */}
                        <button
                            onClick={() => toggleSection('accessibility')}
                            className="lg:hidden w-full flex items-center justify-between p-6 hover:bg-gray-50 transition-colors"
                        >
                            <div className="flex items-center space-x-3">
                                <FaUniversalAccess className="text-blue-600 text-xl" />
                                <h2 className="text-xl font-semibold text-gray-900">Accessibility Settings</h2>
                            </div>
                            {openSections.accessibility ? (
                                <FaChevronUp className="text-gray-600" />
                            ) : (
                                <FaChevronDown className="text-gray-600" />
                            )}
                        </button>
                        
                        {/* Desktop: Static Header */}
                        <div className="hidden lg:flex items-center space-x-3 p-6 border-b border-gray-200">
                            <FaUniversalAccess className="text-blue-600 text-xl" />
                            <h2 className="text-xl font-semibold text-gray-900">Accessibility Settings</h2>
                        </div>
                        
                        {/* Content: Hidden on mobile when closed, always visible on desktop */}
                        <div className={`px-6 pb-6 space-y-6 ${openSections.accessibility ? 'border-t border-gray-200 pt-6 animate-slide-down' : 'lg:border-t lg:border-gray-200 lg:pt-6'} ${openSections.accessibility ? '' : 'hidden lg:block'}`}>
                            {/* Font Size */}
                            <div>
                                <div className="flex items-center space-x-2 mb-3">
                                    <FaFont className="text-gray-600" />
                                    <label className="text-base font-medium text-gray-900">Font Size</label>
                                </div>
                                <p className="text-sm text-gray-600 mb-4">Adjust the text size throughout the application for better readability. Larger text sizes help users with visual impairments.</p>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                    {['small', 'medium', 'large', 'extra-large'].map((size) => (
                                        <button
                                            key={size}
                                            onClick={() => updateSetting('fontSize', size)}
                                            className={`px-4 py-3 rounded-lg border-2 transition-all duration-200 ${
                                                settings.fontSize === size
                                                    ? 'border-blue-600 bg-blue-50 text-blue-900 font-semibold shadow-md'
                                                    : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                                            }`}
                                        >
                                            <div className="text-center">
                                                <div className={`font-bold mb-1 ${
                                                    size === 'small' ? 'text-sm' :
                                                    size === 'medium' ? 'text-base' :
                                                    size === 'large' ? 'text-lg' :
                                                    'text-xl'
                                                }`}>
                                                    Aa
                                                </div>
                                                <div className="text-xs capitalize font-medium">{size.replace('-', ' ')}</div>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Reduce Motion */}
                            <div>
                                <div className="flex items-center justify-between p-4 border-2 border-gray-200 rounded-lg bg-gray-50">
                                    <div className="flex items-center space-x-3 flex-1">
                                        <FaInfoCircle className="text-blue-600 text-lg flex-shrink-0" />
                                        <div className="flex-1">
                                            <div className="font-semibold text-gray-900 mb-1">Reduce Motion</div>
                                            <div className="text-sm text-gray-700 leading-relaxed">
                                                Minimize or disable animations and transitions throughout the application. This helps users with motion sensitivity or vestibular disorders by reducing visual distractions and preventing motion-induced discomfort.
                                            </div>
                                        </div>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer ml-4 flex-shrink-0">
                                        <input
                                            type="checkbox"
                                            checked={settings.reduceMotion}
                                            onChange={(e) => updateSetting('reduceMotion', e.target.checked)}
                                            className="sr-only peer"
                                        />
                                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                    </label>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Text Contrast Settings - Collapsible on mobile/tablet, expanded on desktop */}
                    <div className="bg-white rounded-xl shadow-md overflow-hidden">
                        {/* Mobile/Tablet: Collapsible Header */}
                        <button
                            onClick={() => toggleSection('textContrast')}
                            className="lg:hidden w-full flex items-center justify-between p-6 hover:bg-gray-50 transition-colors"
                        >
                            <div className="flex items-center space-x-3">
                                <FaEye className="text-green-600 text-xl" />
                                <h2 className="text-xl font-semibold text-gray-900">Text Contrast Settings</h2>
                            </div>
                            {openSections.textContrast ? (
                                <FaChevronUp className="text-gray-600" />
                            ) : (
                                <FaChevronDown className="text-gray-600" />
                            )}
                        </button>
                        
                        {/* Desktop: Static Header */}
                        <div className="hidden lg:flex items-center space-x-3 p-6 border-b border-gray-200">
                            <FaEye className="text-green-600 text-xl" />
                            <h2 className="text-xl font-semibold text-gray-900">Text Contrast Settings</h2>
                        </div>
                        
                        {/* Content: Hidden on mobile when closed, always visible on desktop */}
                        <div className={`px-6 pb-6 space-y-6 ${openSections.textContrast ? 'border-t border-gray-200 pt-6 animate-slide-down' : 'lg:border-t lg:border-gray-200 lg:pt-6'} ${openSections.textContrast ? '' : 'hidden lg:block'}`}>
                            {/* Information Box */}
                            <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-lg">
                                <div className="flex items-start">
                                    <FaInfoCircle className="text-blue-600 text-lg mt-0.5 mr-3 flex-shrink-0" />
                                    <div>
                                        <h4 className="font-semibold text-blue-900 mb-2">About Text Contrast</h4>
                                        <p className="text-sm text-blue-800 leading-relaxed">
                                            Text contrast determines how clearly text stands out against its background. Higher contrast improves readability for users with visual impairments, low vision, or when viewing content in bright lighting conditions. Choose the option that provides the best reading experience for you.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Text Contrast Options */}
                            <div>
                                <label className="block text-base font-semibold text-gray-900 mb-4">
                                    Select Text Contrast Level
                                </label>
                                <div className="space-y-3">
                                    <label className={`flex items-start space-x-4 p-5 border-2 rounded-xl cursor-pointer transition-all duration-200 ${
                                        settings.textContrast === 'normal'
                                            ? 'border-blue-500 bg-blue-50 shadow-md'
                                            : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
                                    }`}>
                                        <input
                                            type="radio"
                                            name="textContrast"
                                            value="normal"
                                            checked={settings.textContrast === 'normal'}
                                            onChange={(e) => updateSetting('textContrast', e.target.value)}
                                            className="w-5 h-5 text-blue-600 focus:ring-blue-500 mt-0.5 flex-shrink-0"
                                        />
                                        <div className="flex-1">
                                            <div className="font-semibold text-gray-900 mb-2 flex items-center">
                                                <span className="w-2 h-2 bg-gray-400 rounded-full mr-2"></span>
                                                Normal Contrast
                                            </div>
                                            <div className="text-sm text-gray-700 leading-relaxed ml-4">
                                                Standard text contrast suitable for most users. Text colors follow the default application theme with moderate contrast ratios for comfortable reading in normal lighting conditions.
                                            </div>
                                        </div>
                                    </label>
                                    
                                    <label className={`flex items-start space-x-4 p-5 border-2 rounded-xl cursor-pointer transition-all duration-200 ${
                                        settings.textContrast === 'high'
                                            ? 'border-blue-500 bg-blue-50 shadow-md'
                                            : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
                                    }`}>
                                        <input
                                            type="radio"
                                            name="textContrast"
                                            value="high"
                                            checked={settings.textContrast === 'high'}
                                            onChange={(e) => updateSetting('textContrast', e.target.value)}
                                            className="w-5 h-5 text-blue-600 focus:ring-blue-500 mt-0.5 flex-shrink-0"
                                        />
                                        <div className="flex-1">
                                            <div className="font-semibold text-gray-900 mb-2 flex items-center">
                                                <span className="w-2 h-2 bg-black rounded-full mr-2"></span>
                                                High Contrast
                                            </div>
                                            <div className="text-sm text-gray-700 leading-relaxed ml-4">
                                                Enhanced text contrast with darker text colors and improved contrast ratios. Recommended for users with visual impairments, low vision, or when reading in bright environments. Text becomes more distinct and easier to read.
                                            </div>
                                        </div>
                                    </label>
                                </div>
                            </div>

                            {/* High Contrast Mode */}
                            <div>
                                <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 rounded-r-lg mb-4">
                                    <div className="flex items-start">
                                        <FaInfoCircle className="text-yellow-700 text-lg mt-0.5 mr-3 flex-shrink-0" />
                                        <div>
                                            <h4 className="font-semibold text-yellow-900 mb-1">High Contrast Mode</h4>
                                            <p className="text-sm text-yellow-800 leading-relaxed">
                                                High Contrast Mode enhances not just text, but also colors, borders, and UI elements throughout the entire application. When enabled, it automatically applies high text contrast and adds stronger borders to improve overall visibility and accessibility.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="flex items-center justify-between p-5 border-2 border-gray-200 rounded-xl bg-gray-50">
                                    <div className="flex items-center space-x-3 flex-1">
                                        <FaPalette className="text-purple-600 text-lg flex-shrink-0" />
                                        <div className="flex-1">
                                            <div className="font-semibold text-gray-900 mb-1">Enable High Contrast Mode</div>
                                            <div className="text-sm text-gray-700 leading-relaxed">
                                                Activates high contrast colors, borders, and enhanced text contrast across all pages and components in the application.
                                            </div>
                                        </div>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer ml-4 flex-shrink-0">
                                        <input
                                            type="checkbox"
                                            checked={settings.highContrast}
                                            onChange={(e) => {
                                                const isChecked = e.target.checked;
                                                // If enabling high contrast, also enable high text contrast
                                                if (isChecked && settings.textContrast === 'normal') {
                                                    updateMultipleSettings({
                                                        highContrast: isChecked,
                                                        textContrast: 'high'
                                                    });
                                                } else {
                                                    updateSetting('highContrast', isChecked);
                                                }
                                            }}
                                            className="sr-only peer"
                                        />
                                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                    </label>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Appearance Settings - Collapsible on mobile/tablet, expanded on desktop */}
                    <div className="bg-white rounded-xl shadow-md overflow-hidden">
                        {/* Mobile/Tablet: Collapsible Header */}
                        <button
                            onClick={() => toggleSection('appearance')}
                            className="lg:hidden w-full flex items-center justify-between p-6 hover:bg-gray-50 transition-colors"
                        >
                            <div className="flex items-center space-x-3">
                                <FaPalette className="text-purple-600 text-xl" />
                                <h2 className="text-xl font-semibold text-gray-900">Appearance Settings</h2>
                            </div>
                            {openSections.appearance ? (
                                <FaChevronUp className="text-gray-600" />
                            ) : (
                                <FaChevronDown className="text-gray-600" />
                            )}
                        </button>
                        
                        {/* Desktop: Static Header */}
                        <div className="hidden lg:flex items-center space-x-3 p-6 border-b border-gray-200">
                            <FaPalette className="text-purple-600 text-xl" />
                            <h2 className="text-xl font-semibold text-gray-900">Appearance Settings</h2>
                        </div>
                        
                        {/* Content: Hidden on mobile when closed, always visible on desktop */}
                        <div className={`px-6 pb-6 space-y-4 ${openSections.appearance ? 'border-t border-gray-200 pt-6 animate-slide-down' : 'lg:border-t lg:border-gray-200 lg:pt-6'} ${openSections.appearance ? '' : 'hidden lg:block'}`}>
                            {/* Color Scheme */}
                            <div>
                                <div className="flex items-center space-x-2 mb-3">
                                    <FaMoon className="text-gray-600" />
                                    <label className="text-base font-semibold text-gray-900">Color Scheme / Theme</label>
                                </div>
                                <p className="text-sm text-gray-600 mb-4">Choose your preferred color theme for the application interface. Light theme is default, while dark theme reduces eye strain in low-light conditions.</p>
                                <div className="grid grid-cols-2 gap-4">
                                    <button
                                        onClick={() => updateSetting('colorScheme', 'light')}
                                        className={`px-6 py-4 rounded-xl border-2 transition-all duration-200 flex flex-col items-center justify-center space-y-2 ${
                                            settings.colorScheme === 'light'
                                                ? 'border-blue-600 bg-blue-50 text-blue-900 shadow-md'
                                                : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                                        }`}
                                    >
                                        <FaSun className="text-2xl" />
                                        <span className="font-semibold">Light Theme</span>
                                        <span className="text-xs text-center">Default bright interface</span>
                                    </button>
                                    <button
                                        onClick={() => updateSetting('colorScheme', 'dark')}
                                        className={`px-6 py-4 rounded-xl border-2 transition-all duration-200 flex flex-col items-center justify-center space-y-2 ${
                                            settings.colorScheme === 'dark'
                                                ? 'border-blue-600 bg-blue-50 text-blue-900 shadow-md'
                                                : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                                        }`}
                                    >
                                        <FaMoon className="text-2xl" />
                                        <span className="font-semibold">Dark Theme</span>
                                        <span className="text-xs text-center">Dark interface for low light</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-col sm:flex-row gap-4 justify-end">
                        <button
                            onClick={handleReset}
                            className="px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors duration-200 flex items-center justify-center space-x-2"
                        >
                            <FaUndo className="text-sm" />
                            <span>Reset to Default</span>
                        </button>
                        <button
                            onClick={handleSave}
                            className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors duration-200 flex items-center justify-center space-x-2"
                        >
                            <FaSave className="text-sm" />
                            <span>Save Settings</span>
                        </button>
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    );
};

export default SystemSettings;
