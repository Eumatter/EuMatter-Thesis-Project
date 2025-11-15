/**
 * Browser Compatibility Utility
 * Handles cross-browser compatibility for Safari, Brave, Chrome, Firefox, and mobile browsers
 */

export const detectBrowser = () => {
    const userAgent = navigator.userAgent || navigator.vendor || window.opera || '';
    const ua = userAgent.toLowerCase();
    
    // Detect Brave browser (Brave uses Chrome user agent but has navigator.brave)
    const isBrave = navigator.brave && typeof navigator.brave.isBrave === 'function';
    
    // Detect Safari (must check before Chrome since Chrome also contains 'safari')
    const isSafari = /^((?!chrome|android).)*safari/i.test(userAgent) || 
                     (/safari/i.test(userAgent) && !/chrome|crios|fxios/i.test(userAgent));
    
    // Detect Chrome (but not Brave or Edge)
    const isChrome = /chrome/i.test(userAgent) && !/edge|edg|brave/i.test(userAgent) && !isSafari;
    
    // Detect Edge
    const isEdge = /edge|edg/i.test(userAgent);
    
    // Detect Firefox
    const isFirefox = /firefox|fxios/i.test(userAgent);
    
    // Detect Opera
    const isOpera = /opera|opr/i.test(userAgent);
    
    // Detect mobile browsers
    const isMobile = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(ua);
    const isIOS = /iphone|ipad|ipod/i.test(ua);
    const isAndroid = /android/i.test(ua);
    
    // Detect specific mobile browsers
    const isSafariIOS = isIOS && isSafari;
    const isChromeMobile = isMobile && isChrome;
    const isSamsungInternet = /samsungbrowser/i.test(ua);
    const isUCBrowser = /ucbrowser/i.test(ua);
    
    // Get browser version
    const getVersion = () => {
        if (isSafari) {
            const match = userAgent.match(/version\/(\d+)/i);
            return match ? parseInt(match[1]) : null;
        }
        if (isChrome || isBrave) {
            const match = userAgent.match(/chrome\/(\d+)/i);
            return match ? parseInt(match[1]) : null;
        }
        if (isFirefox) {
            const match = userAgent.match(/firefox\/(\d+)/i);
            return match ? parseInt(match[1]) : null;
        }
        if (isEdge) {
            const match = userAgent.match(/edge\/(\d+)/i) || userAgent.match(/edg\/(\d+)/i);
            return match ? parseInt(match[1]) : null;
        }
        return null;
    };
    
    return {
        name: isBrave ? 'Brave' : 
              isSafari ? 'Safari' : 
              isChrome ? 'Chrome' : 
              isEdge ? 'Edge' : 
              isFirefox ? 'Firefox' : 
              isOpera ? 'Opera' : 'Unknown',
        isBrave,
        isSafari,
        isChrome,
        isEdge,
        isFirefox,
        isOpera,
        isMobile,
        isIOS,
        isAndroid,
        isSafariIOS,
        isChromeMobile,
        isSamsungInternet,
        isUCBrowser,
        version: getVersion(),
        userAgent
    };
};

/**
 * Check if browser supports specific features
 */
export const checkFeatureSupport = () => {
    const browser = detectBrowser();
    
    return {
        // Camera API support
        camera: {
            getUserMedia: !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia),
            webkitGetUserMedia: !!(navigator.webkitGetUserMedia),
            mozGetUserMedia: !!(navigator.mozGetUserMedia),
            msGetUserMedia: !!(navigator.msGetUserMedia),
            supported: !!(navigator.mediaDevices?.getUserMedia || 
                         navigator.webkitGetUserMedia || 
                         navigator.mozGetUserMedia || 
                         navigator.msGetUserMedia)
        },
        
        // Service Worker support
        serviceWorker: 'serviceWorker' in navigator,
        
        // Local Storage support
        localStorage: (() => {
            try {
                const test = '__localStorage_test__';
                localStorage.setItem(test, test);
                localStorage.removeItem(test);
                return true;
            } catch (e) {
                return false;
            }
        })(),
        
        // IndexedDB support
        indexedDB: 'indexedDB' in window,
        
        // WebP image support
        webp: (() => {
            const canvas = document.createElement('canvas');
            canvas.width = 1;
            canvas.height = 1;
            return canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
        })(),
        
        // CSS Grid support
        cssGrid: CSS.supports('display', 'grid'),
        
        // Flexbox support
        flexbox: CSS.supports('display', 'flex'),
        
        // Intersection Observer support
        intersectionObserver: 'IntersectionObserver' in window,
        
        // Fetch API support
        fetch: 'fetch' in window,
        
        // Promise support
        promise: typeof Promise !== 'undefined',
        
        // Clipboard API support
        clipboard: 'clipboard' in navigator || 
                   (document.execCommand && document.execCommand('copy')),
        
        // Touch events support
        touch: 'ontouchstart' in window || navigator.maxTouchPoints > 0,
        
        // Safari specific
        safari: browser.isSafari,
        safariVersion: browser.isSafari ? browser.version : null,
        
        // Brave specific
        brave: browser.isBrave
    };
};

/**
 * Get camera constraints compatible with all browsers
 */
export const getCameraConstraints = (preferBackCamera = true) => {
    const browser = detectBrowser();
    const features = checkFeatureSupport();
    
    // Base constraints
    const baseConstraints = {
        video: {
            facingMode: preferBackCamera ? 'environment' : 'user',
            width: { ideal: 1280 },
            height: { ideal: 720 }
        }
    };
    
    // Safari iOS specific constraints (more lenient)
    if (browser.isSafariIOS) {
        return {
            video: {
                facingMode: preferBackCamera ? 'environment' : 'user'
                // Remove strict width/height for Safari iOS
            }
        };
    }
    
    // Safari desktop
    if (browser.isSafari && !browser.isMobile) {
        return {
            video: {
                facingMode: preferBackCamera ? 'environment' : 'user',
                width: { ideal: 1280, max: 1920 },
                height: { ideal: 720, max: 1080 }
            }
        };
    }
    
    // Android browsers
    if (browser.isAndroid) {
        return {
            video: {
                facingMode: preferBackCamera ? 'environment' : 'user',
                width: { ideal: 1280 },
                height: { ideal: 720 }
            }
        };
    }
    
    return baseConstraints;
};

/**
 * Get getUserMedia with fallbacks for older browsers
 */
export const getUserMedia = async (constraints) => {
    const features = checkFeatureSupport();
    
    // Modern API
    if (features.camera.getUserMedia) {
        try {
            return await navigator.mediaDevices.getUserMedia(constraints);
        } catch (error) {
            console.warn('getUserMedia failed, trying fallback:', error);
        }
    }
    
    // WebKit (Safari, older Chrome)
    if (features.camera.webkitGetUserMedia) {
        return new Promise((resolve, reject) => {
            navigator.webkitGetUserMedia(constraints, resolve, reject);
        });
    }
    
    // Mozilla (Firefox)
    if (features.camera.mozGetUserMedia) {
        return new Promise((resolve, reject) => {
            navigator.mozGetUserMedia(constraints, resolve, reject);
        });
    }
    
    // Microsoft (Edge Legacy)
    if (features.camera.msGetUserMedia) {
        return new Promise((resolve, reject) => {
            navigator.msGetUserMedia(constraints, resolve, reject);
        });
    }
    
    throw new Error('getUserMedia is not supported in this browser');
};

/**
 * Copy to clipboard with fallbacks
 */
export const copyToClipboard = async (text) => {
    const features = checkFeatureSupport();
    
    // Modern Clipboard API
    if (features.clipboard && navigator.clipboard) {
        try {
            await navigator.clipboard.writeText(text);
            return true;
        } catch (error) {
            console.warn('Clipboard API failed, trying fallback:', error);
        }
    }
    
    // Fallback for older browsers
    try {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        
        const successful = document.execCommand('copy');
        document.body.removeChild(textArea);
        
        if (successful) {
            return true;
        }
    } catch (error) {
        console.error('Fallback copy failed:', error);
    }
    
    return false;
};

/**
 * Apply Safari-specific fixes
 */
export const applySafariFixes = () => {
    const browser = detectBrowser();
    
    if (browser.isSafari) {
        // Fix for Safari viewport height issue on mobile
        if (browser.isMobile) {
            const setVH = () => {
                const vh = window.innerHeight * 0.01;
                document.documentElement.style.setProperty('--vh', `${vh}px`);
            };
            
            setVH();
            window.addEventListener('resize', setVH);
            window.addEventListener('orientationchange', setVH);
        }
        
        // Fix for Safari smooth scroll
        if (CSS.supports('scroll-behavior', 'smooth')) {
            document.documentElement.style.scrollBehavior = 'smooth';
        }
    }
};

/**
 * Check if browser is supported
 */
export const isBrowserSupported = () => {
    const browser = detectBrowser();
    const features = checkFeatureSupport();
    
    // Minimum requirements
    if (!features.promise) return false;
    if (!features.fetch) return false;
    if (!features.localStorage) return false;
    
    // Safari version check (Safari 11.3+)
    if (browser.isSafari && browser.version && browser.version < 11) {
        return false;
    }
    
    // iOS Safari version check (iOS 11.3+)
    if (browser.isSafariIOS && browser.version && browser.version < 11) {
        return false;
    }
    
    return true;
};

/**
 * Get browser-specific CSS classes
 */
export const getBrowserClasses = () => {
    const browser = detectBrowser();
    const classes = [];
    
    if (browser.isSafari) classes.push('browser-safari');
    if (browser.isBrave) classes.push('browser-brave');
    if (browser.isChrome) classes.push('browser-chrome');
    if (browser.isFirefox) classes.push('browser-firefox');
    if (browser.isEdge) classes.push('browser-edge');
    if (browser.isMobile) classes.push('browser-mobile');
    if (browser.isIOS) classes.push('browser-ios');
    if (browser.isAndroid) classes.push('browser-android');
    
    return classes.join(' ');
};

// Initialize on load
if (typeof window !== 'undefined') {
    // Apply Safari fixes immediately
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', applySafariFixes);
    } else {
        applySafariFixes();
    }
    
    // Add browser classes to html element
    const browserClasses = getBrowserClasses();
    if (browserClasses) {
        document.documentElement.className += ' ' + browserClasses;
    }
}

export default {
    detectBrowser,
    checkFeatureSupport,
    getCameraConstraints,
    getUserMedia,
    copyToClipboard,
    applySafariFixes,
    isBrowserSupported,
    getBrowserClasses
};

