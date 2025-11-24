import React, { useState, useEffect, useRef } from 'react';

const PWAInstallPrompt = () => {
    const [deferredPrompt, setDeferredPrompt] = useState(null);
    const deferredPromptRef = useRef(null);
    const [showInstallButton, setShowInstallButton] = useState(false);
    const [isInstalling, setIsInstalling] = useState(false);
    const [isIOS, setIsIOS] = useState(false);
    const [isStandalone, setIsStandalone] = useState(false);
    const [serviceWorkerRegistered, setServiceWorkerRegistered] = useState(false);
    const [browserInfo, setBrowserInfo] = useState({ name: '', isChrome: false, isEdge: false, isFirefox: false, isSafari: false });

    useEffect(() => {
        // Check if app is already installed
        const standalone = window.matchMedia('(display-mode: standalone)').matches;
        const iosStandalone = ('standalone' in window.navigator) && window.navigator.standalone;
        const userAgent = navigator.userAgent.toLowerCase();
        const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent);
        
        // Detect browser
        const isChrome = /chrome/.test(userAgent) && !/edge|edg/.test(userAgent);
        const isEdge = /edge|edg/.test(userAgent);
        const isFirefox = /firefox/.test(userAgent);
        const isSafari = /safari/.test(userAgent) && !/chrome/.test(userAgent);
        
        const detectedBrowserInfo = {
            name: isChrome ? 'Chrome' : isEdge ? 'Edge' : isFirefox ? 'Firefox' : isSafari ? 'Safari' : 'Unknown',
            isChrome,
            isEdge,
            isFirefox,
            isSafari
        };
        
        setBrowserInfo(detectedBrowserInfo);
        
        // Set state (button will remain visible even if installed)
        setIsStandalone(standalone || iosStandalone);
        setIsIOS(isIOSDevice);

        // Check if browser supports service workers (required for PWA)
        const supportsServiceWorker = 'serviceWorker' in navigator;
        if (!supportsServiceWorker) {
            setShowInstallButton(false);
            return;
        }

        // Check if service worker is registered
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.getRegistrations().then(registrations => {
                setServiceWorkerRegistered(registrations.length > 0);
            });
        }

        // Show button if browser supports service workers
        // Note: Button will be enabled/disabled based on deferredPrompt availability
        setShowInstallButton(true);

        // Listen for the beforeinstallprompt event (Chrome, Edge, etc.)
        const handleBeforeInstallPrompt = (e) => {
            // Prevent the mini-infobar from appearing on mobile
            e.preventDefault();
            // Save the event so it can be triggered later
            setDeferredPrompt(e);
            deferredPromptRef.current = e; // Also store in ref for immediate access
            // Show the install button when prompt is available
            setShowInstallButton(true);
            console.log('✅ beforeinstallprompt event fired - install prompt available');
        };

        // Check if we're on HTTPS or localhost (required for PWA)
        const isSecureContext = window.isSecureContext || location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1';
        
        if (!isSecureContext && !isIOSDevice) {
            console.warn('⚠️ PWA installation requires HTTPS or localhost');
        }

        // Listen for beforeinstallprompt event (Android/Desktop browsers)
        // Note: This event only fires on Chrome, Edge, and other Chromium-based browsers
        // It does NOT fire on Firefox or Safari
        // Also note: The event may not fire immediately - it can take a few seconds
        // or require a page refresh after the service worker is registered
        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

        // Log debug information
        console.log('🔍 PWA Install Prompt Debug:', {
            browser: detectedBrowserInfo.name,
            isIOS: isIOSDevice,
            isStandalone: standalone || iosStandalone,
            isSecureContext,
            serviceWorkerSupported: supportsServiceWorker,
            userAgent: navigator.userAgent
        });

        // Listen for app installed event (but don't hide button)
        window.addEventListener('appinstalled', () => {
            setDeferredPrompt(null);
            deferredPromptRef.current = null;
            // Don't hide button - keep it visible even after installation
            setIsStandalone(true);
            // Silent success - no toast notification
            // Clear any dismissal records
            localStorage.removeItem('pwa-install-dismissed');
        });

        // Check if service worker registration completes
        if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
            setServiceWorkerRegistered(true);
            console.log('✅ Service worker is already registered');
        }

        // Also listen for service worker registration
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.ready.then(() => {
                setServiceWorkerRegistered(true);
                console.log('✅ Service worker is ready');
                
                // The beforeinstallprompt event might fire after service worker is ready
                // Check again after a short delay
                setTimeout(() => {
                    if (!deferredPrompt && (detectedBrowserInfo.isChrome || detectedBrowserInfo.isEdge)) {
                        console.log('ℹ️ Service worker is ready but beforeinstallprompt has not fired yet');
                        console.log('💡 This is normal - the prompt may appear after a page refresh or on next visit');
                        console.log('💡 The install button will show manual instructions if the prompt is not available');
                    }
                }, 2000);
            }).catch(error => {
                console.error('❌ Service worker registration error:', error);
            });
        }

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        };
    }, []);

    const handleInstallClick = async () => {
        // If already installed, silently return (no alerts)
        if (isStandalone) {
            return;
        }

        // Get the current prompt from ref (more reliable than state)
        const currentPrompt = deferredPromptRef.current || deferredPrompt;

        // Chrome/Edge - Automatically trigger install prompt if available
        if (currentPrompt) {
            try {
                setIsInstalling(true);
                
                // Automatically show the install prompt (browser native prompt will appear)
                await currentPrompt.prompt();

                // Wait for the user to respond to the prompt
                const { outcome } = await currentPrompt.userChoice;

                // Clear the deferred prompt after use
                setDeferredPrompt(null);
                deferredPromptRef.current = null;
                
                // No toast notifications - let the browser handle the flow
                // The appinstalled event will fire when installation completes
            } catch (error) {
                console.error('Error showing install prompt:', error);
                // If prompt fails, clear it
                setDeferredPrompt(null);
                deferredPromptRef.current = null;
            } finally {
                setIsInstalling(false);
            }
            return;
        }

        // If deferredPrompt is not available, wait for service worker and check again
        if ('serviceWorker' in navigator) {
            try {
                setIsInstalling(true);
                
                // Wait for service worker to be ready
                await navigator.serviceWorker.ready;
                
                // Wait a bit for beforeinstallprompt event to potentially fire
                await new Promise(resolve => setTimeout(resolve, 1500));
                
                // Check again if prompt is now available (using ref)
                const newPrompt = deferredPromptRef.current;
                if (newPrompt) {
                    try {
                        await newPrompt.prompt();
                        const { outcome } = await newPrompt.userChoice;
                        setDeferredPrompt(null);
                        deferredPromptRef.current = null;
                        return;
                    } catch (err) {
                        console.error('Error with delayed prompt:', err);
                    }
                }
                
                // If still not available, log helpful message
                console.log('Install prompt not available yet. The browser will show the install option in the address bar when ready.');
            } catch (error) {
                console.error('Error during installation attempt:', error);
            } finally {
                setIsInstalling(false);
            }
        }
    };

    // Removed showManualInstallInstructions - no manual instructions shown
    // Installation happens automatically through browser prompts

    // Don't show if button shouldn't be shown (but show even if already installed)
    if (!showInstallButton) {
        return null;
    }

    return (
        <div className="fixed bottom-6 right-6 z-[100] animate-pwa-slide-up">
            <button
                onClick={handleInstallClick}
                disabled={isInstalling || (isStandalone && !deferredPrompt)}
                className="group relative bg-gradient-to-bl from-[#800000] to-[#EE1212] text-white px-5 py-3.5 md:px-6 md:py-4 rounded-2xl shadow-[0_8px_24px_rgba(128,0,0,0.35),0_0_0_1px_rgba(255,255,255,0.1)] hover:shadow-[0_12px_32px_rgba(128,0,0,0.45),0_0_0_1px_rgba(255,255,255,0.15)] hover:from-[#700000] hover:to-[#DD0000] disabled:opacity-70 disabled:cursor-not-allowed transition-all duration-300 flex items-center gap-2.5 md:gap-3 font-semibold transform hover:scale-105 active:scale-95 disabled:transform-none border border-white/20 hover:border-white/30 backdrop-blur-sm overflow-hidden"
                aria-label="Install EuMatter app"
                title={!deferredPrompt && !isStandalone ? "Install prompt will appear when available" : "Install EuMatter app"}
            >
                {/* Animated background shimmer effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                
                {/* Phone/Download Icon */}
                <div className="relative z-10 flex items-center justify-center">
                    {isInstalling ? (
                        <svg
                            className="w-5 h-5 md:w-6 md:h-6 animate-spin"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            xmlns="http://www.w3.org/2000/svg"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2.5}
                                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                            />
                        </svg>
                    ) : (
                        <svg
                            className="w-5 h-5 md:w-6 md:h-6"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            xmlns="http://www.w3.org/2000/svg"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2.5}
                                d="M12 18h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                            />
                        </svg>
                    )}
                </div>
                
                {/* Text */}
                <span className="relative z-10 text-xs md:text-sm font-bold tracking-wide whitespace-nowrap">
                    {isInstalling ? 'Installing...' : isStandalone ? 'Installed' : 'Install App'}
                </span>
                
                {/* Arrow icon on hover (only when not installing) */}
                {!isInstalling && (
                    <div className="relative z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 transform group-hover:translate-x-1">
                        <svg
                            className="w-3 h-3 md:w-4 md:h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            xmlns="http://www.w3.org/2000/svg"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={3}
                                d="M9 5l7 7-7 7"
                            />
                        </svg>
                    </div>
                )}
            </button>
        </div>
    );
};

export default PWAInstallPrompt;

