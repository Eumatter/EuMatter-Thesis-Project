import React, { useState, useEffect } from 'react';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import { applySystemSettings } from '../../context/AppContext.jsx';
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
    const [settings, setSettings] = useState({
        fontSize: 'medium',
        textContrast: 'normal',
        colorScheme: 'light',
        reduceMotion: false,
        highContrast: false
    });
    const [openSections, setOpenSections] = useState({
        accessibility: false,
        textContrast: false,
        appearance: false
    });

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

    const applySettings = (newSettings) => {
        applySystemSettings(newSettings);
    };

    const updateSetting = (key, value) => {
        setSettings(prev => {
            const newSettings = { ...prev, [key]: value };
            applySettings(newSettings);
            localStorage.setItem('systemSettings', JSON.stringify(newSettings));
            return newSettings;
        });
    };

    const updateMultipleSettings = (updates) => {
        setSettings(prev => {
            const newSettings = { ...prev, ...updates };
            applySettings(newSettings);
            localStorage.setItem('systemSettings', JSON.stringify(newSettings));
            return newSettings;
        });
    };

    const handleSave = () => {
        localStorage.setItem('systemSettings', JSON.stringify(settings));
        applySettings(settings);
        toast.success('Settings saved');
    };

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
        toast.success('Settings reset to default');
    };

    const toggleSection = (section) => {
        setOpenSections(prev => ({ ...prev, [section]: !prev[section] }));
    };

    const sectionHeaderClass = 'flex items-center justify-between w-full p-4 sm:p-5 text-left hover:bg-gray-50 transition-colors lg:cursor-default';
    const sectionTitleClass = 'text-base font-semibold text-gray-900';
    const labelClass = 'block text-sm font-medium text-gray-700 mb-1.5';
    const hintClass = 'text-xs text-gray-500 mb-3';
    const cardClass = 'bg-white rounded-xl border border-gray-200 overflow-hidden';
    const selectedClass = 'border-[#800000] bg-[#800000]/5 text-[#800000]';
    const unselectedClass = 'border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-50';
    const toggleTrackClass = 'relative w-10 h-5 bg-gray-200 rounded-full peer peer-checked:bg-[#800000] after:content-[\'\'] after:absolute after:top-0.5 after:left-0.5 after:rounded-full after:h-4 after:w-4 after:bg-white after:border after:border-gray-300 after:transition-all peer-checked:after:translate-x-5';

    return (
        <div className="min-h-screen bg-gray-50">
            <Header />

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Page header — same style as Donations / Events */}
                <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6 sm:p-8 mb-6 sm:mb-8">
                    <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0">
                            <FaSlidersH className="text-[#800000] text-xl" />
                        </div>
                        <div>
                            <h1
                                className="text-2xl sm:text-3xl font-bold mb-1"
                                style={{
                                    backgroundImage: 'linear-gradient(to right, #800000, #900000)',
                                    WebkitBackgroundClip: 'text',
                                    WebkitTextFillColor: 'transparent',
                                    backgroundClip: 'text'
                                }}
                            >
                                System Settings
                            </h1>
                            <p className="text-gray-600 text-sm sm:text-base">
                                Customize accessibility and appearance. Changes apply immediately.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="space-y-4">
                    {/* Accessibility */}
                    <div className={cardClass}>
                        <button
                            type="button"
                            onClick={() => toggleSection('accessibility')}
                            className={`${sectionHeaderClass} lg:pointer-events-none`}
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center">
                                    <FaUniversalAccess className="text-gray-600" />
                                </div>
                                <span className={sectionTitleClass}>Accessibility</span>
                            </div>
                            <span className="lg:hidden text-gray-400">
                                {openSections.accessibility ? <FaChevronUp className="w-4 h-4" /> : <FaChevronDown className="w-4 h-4" />}
                            </span>
                        </button>
                        <div className={`px-4 sm:px-5 pb-5 ${openSections.accessibility ? '' : 'hidden lg:block'}`}>
                            <div className="border-t border-gray-100 pt-4 space-y-5">
                                <div>
                                    <label className={labelClass}>Font size</label>
                                    <p className={hintClass}>Adjust text size across the app.</p>
                                    <div className="grid grid-cols-4 gap-2">
                                        {['small', 'medium', 'large', 'extra-large'].map((size) => (
                                            <button
                                                key={size}
                                                type="button"
                                                onClick={() => updateSetting('fontSize', size)}
                                                className={`px-3 py-2.5 rounded-lg border text-sm font-medium transition-colors ${settings.fontSize === size ? selectedClass : unselectedClass}`}
                                            >
                                                <span className={size === 'small' ? 'text-xs' : size === 'medium' ? 'text-sm' : size === 'large' ? 'text-base' : 'text-lg'}>Aa</span>
                                                <span className="block text-xs mt-0.5 capitalize">{size.replace('-', ' ')}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div className="flex items-center justify-between p-3 rounded-lg border border-gray-200 bg-gray-50">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <FaInfoCircle className="text-gray-500 flex-shrink-0" />
                                        <div>
                                            <p className="text-sm font-medium text-gray-900">Reduce motion</p>
                                            <p className="text-xs text-gray-500">Minimize animations and transitions.</p>
                                        </div>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer flex-shrink-0 ml-3">
                                        <input
                                            type="checkbox"
                                            checked={settings.reduceMotion}
                                            onChange={(e) => updateSetting('reduceMotion', e.target.checked)}
                                            className="sr-only peer"
                                        />
                                        <div className={`${toggleTrackClass} after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:rounded-full after:h-4 after:w-4 after:border after:transition-all peer-checked:after:translate-x-5`} />
                                    </label>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Text contrast */}
                    <div className={cardClass}>
                        <button
                            type="button"
                            onClick={() => toggleSection('textContrast')}
                            className={`${sectionHeaderClass} lg:pointer-events-none`}
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center">
                                    <FaEye className="text-gray-600" />
                                </div>
                                <span className={sectionTitleClass}>Text contrast</span>
                            </div>
                            <span className="lg:hidden text-gray-400">
                                {openSections.textContrast ? <FaChevronUp className="w-4 h-4" /> : <FaChevronDown className="w-4 h-4" />}
                            </span>
                        </button>
                        <div className={`px-4 sm:px-5 pb-5 ${openSections.textContrast ? '' : 'hidden lg:block'}`}>
                            <div className="border-t border-gray-100 pt-4 space-y-5">
                                <div>
                                    <label className={labelClass}>Contrast level</label>
                                    <p className={hintClass}>Higher contrast can improve readability.</p>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <label className={`flex items-start gap-3 p-4 rounded-lg border cursor-pointer transition-colors ${settings.textContrast === 'normal' ? selectedClass : unselectedClass}`}>
                                            <input
                                                type="radio"
                                                name="textContrast"
                                                value="normal"
                                                checked={settings.textContrast === 'normal'}
                                                onChange={(e) => updateSetting('textContrast', e.target.value)}
                                                className="mt-0.5 w-4 h-4 text-[#800000] focus:ring-[#800000]"
                                            />
                                            <div>
                                                <span className="text-sm font-medium text-gray-900">Normal</span>
                                                <p className="text-xs text-gray-500 mt-0.5">Standard contrast.</p>
                                            </div>
                                        </label>
                                        <label className={`flex items-start gap-3 p-4 rounded-lg border cursor-pointer transition-colors ${settings.textContrast === 'high' ? selectedClass : unselectedClass}`}>
                                            <input
                                                type="radio"
                                                name="textContrast"
                                                value="high"
                                                checked={settings.textContrast === 'high'}
                                                onChange={(e) => updateSetting('textContrast', e.target.value)}
                                                className="mt-0.5 w-4 h-4 text-[#800000] focus:ring-[#800000]"
                                            />
                                            <div>
                                                <span className="text-sm font-medium text-gray-900">High</span>
                                                <p className="text-xs text-gray-500 mt-0.5">Enhanced readability.</p>
                                            </div>
                                        </label>
                                    </div>
                                </div>
                                <div className="flex items-center justify-between p-3 rounded-lg border border-gray-200 bg-gray-50">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <FaPalette className="text-gray-500 flex-shrink-0" />
                                        <div>
                                            <p className="text-sm font-medium text-gray-900">High contrast mode</p>
                                            <p className="text-xs text-gray-500">Stronger borders and contrast app-wide.</p>
                                        </div>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer flex-shrink-0 ml-3">
                                        <input
                                            type="checkbox"
                                            checked={settings.highContrast}
                                            onChange={(e) => {
                                                const isChecked = e.target.checked;
                                                if (isChecked && settings.textContrast === 'normal') {
                                                    updateMultipleSettings({ highContrast: isChecked, textContrast: 'high' });
                                                } else {
                                                    updateSetting('highContrast', isChecked);
                                                }
                                            }}
                                            className="sr-only peer"
                                        />
                                        <div className={`${toggleTrackClass} after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:rounded-full after:h-4 after:w-4 after:border after:transition-all peer-checked:after:translate-x-5`} />
                                    </label>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Appearance */}
                    <div className={cardClass}>
                        <button
                            type="button"
                            onClick={() => toggleSection('appearance')}
                            className={`${sectionHeaderClass} lg:pointer-events-none`}
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center">
                                    <FaPalette className="text-gray-600" />
                                </div>
                                <span className={sectionTitleClass}>Appearance</span>
                            </div>
                            <span className="lg:hidden text-gray-400">
                                {openSections.appearance ? <FaChevronUp className="w-4 h-4" /> : <FaChevronDown className="w-4 h-4" />}
                            </span>
                        </button>
                        <div className={`px-4 sm:px-5 pb-5 ${openSections.appearance ? '' : 'hidden lg:block'}`}>
                            <div className="border-t border-gray-100 pt-4">
                                <label className={labelClass}>Theme</label>
                                <p className={hintClass}>Light or dark interface.</p>
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        type="button"
                                        onClick={() => updateSetting('colorScheme', 'light')}
                                        className={`flex flex-col items-center gap-2 p-4 rounded-xl border transition-colors ${settings.colorScheme === 'light' ? selectedClass : unselectedClass}`}
                                    >
                                        <FaSun className="text-xl text-current" />
                                        <span className="text-sm font-medium">Light</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => updateSetting('colorScheme', 'dark')}
                                        className={`flex flex-col items-center gap-2 p-4 rounded-xl border transition-colors ${settings.colorScheme === 'dark' ? selectedClass : unselectedClass}`}
                                    >
                                        <FaMoon className="text-xl text-current" />
                                        <span className="text-sm font-medium">Dark</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col-reverse sm:flex-row gap-3 justify-end pt-2">
                        <button
                            type="button"
                            onClick={handleReset}
                            className="px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 focus:ring-2 focus:ring-[#800000] focus:ring-offset-1 flex items-center justify-center gap-2"
                        >
                            <FaUndo className="w-4 h-4" /> Reset to default
                        </button>
                        <button
                            type="button"
                            onClick={handleSave}
                            className="px-4 py-2.5 text-sm font-medium text-white bg-[#800000] rounded-lg hover:bg-[#9c0000] focus:ring-2 focus:ring-[#800000] focus:ring-offset-2 flex items-center justify-center gap-2"
                        >
                            <FaSave className="w-4 h-4" /> Save settings
                        </button>
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    );
};

export default SystemSettings;
