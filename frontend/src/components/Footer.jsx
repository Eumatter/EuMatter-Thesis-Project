import React, { useContext } from 'react';
import { useLocation } from 'react-router-dom';
import { AppContent } from '../context/AppContext.jsx';

const Footer = () => {
    const location = useLocation();
    const { isLoggedIn } = useContext(AppContent);

    const isHomePage = location.pathname === '/';

    // Hide on mobile for logged-in users except on Home page
    const mobileVisibilityClass = !isHomePage && isLoggedIn ? 'hidden md:block' : 'block';

    return (
        <footer className={`w-full bg-[#800000] text-white ${mobileVisibilityClass}`}>
            <div className="w-full px-4 sm:px-6 md:px-8 lg:px-10 xl:px-12 py-10 sm:py-12">
                <div className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-10">
                    {/* Brand */}
                    <div className="space-y-3">
                        <h3 className="text-3xl sm:text-4xl md:text-2xl lg:text-3xl font-extrabold tracking-tight leading-tight">EUMATTER</h3>
                        <p className="text-base sm:text-lg md:text-l opacity-90 leading-relaxed max-w-sm mt-2">Connecting communities through meaningful university initiatives.</p>
                        <div className="flex items-center gap-4">
                            {/* Facebook */}
                            <a href="#" aria-label="Facebook" className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors">
                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M22 12.06C22 6.52 17.52 2 12 2S2 6.52 2 12.06c0 4.99 3.66 9.13 8.44 9.94v-7.03H7.9v-2.91h2.54V9.41c0-2.5 1.49-3.89 3.77-3.89 1.09 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56v1.87h2.77l-.44 2.91h-2.33V22c4.78-.81 8.44-4.95 8.44-9.94Z" />
                                </svg>
                            </a>
                            {/* Instagram */}
                            <a href="#" aria-label="Instagram" className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors">
                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M7 2h10a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a5 5 0 0 1 5-5Zm0 2a3 3 0 0 0-3 3v10a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3V7a3 3 0 0 0-3-3H7Zm5 3.5A5.5 5.5 0 1 1 6.5 13 5.51 5.51 0 0 1 12 7.5Zm0 2A3.5 3.5 0 1 0 15.5 13 3.5 3.5 0 0 0 12 9.5Zm5.75-2.25a.75.75 0 1 1-.75.75.75.75 0 0 1 .75-.75Z" />
                                </svg>
                            </a>
                            {/* LinkedIn */}
                            <a href="#" aria-label="LinkedIn" className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors">
                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M6.94 8.5V20H3.56V8.5h3.38ZM5.25 3.5a2.02 2.02 0 1 1 0 4.04 2.02 2.02 0 0 1 0-4.04ZM21 13.83V20h-3.38v-5.39c0-1.35-.48-2.27-1.69-2.27-.92 0-1.47.62-1.71 1.22-.09.22-.12.52-.12.83V20h-3.38s.04-8.73 0-9.5H14v1.35c.45-.69 1.26-1.66 3.07-1.66 2.24 0 3.93 1.47 3.93 4.64Z" />
                                </svg>
                            </a>
                        </div>
                    </div>

                    {/* Quick Links */}
                    <div>
                        <h4 className="text-lg md:text-xl font-extrabold text-[#ffd700]">Quick Links</h4>
                        <ul className="mt-3 md:mt-4 space-y-1.5 md:space-y-2 text-sm md:text-[15px]">
                            <li><a href="#" className="hover:underline">About Us</a></li>
                            <li><a href="#" className="hover:underline">How It Works</a></li>
                            <li><a href="#" className="hover:underline">Success Stories</a></li>
                            <li><a href="#" className="hover:underline">Contact</a></li>
                        </ul>
                    </div>

                    {/* Support */}
                    <div>
                        <h4 className="text-lg md:text-xl font-extrabold text-[#ffd700]">Support</h4>
                        <ul className="mt-3 md:mt-4 space-y-1.5 md:space-y-2 text-sm md:text-[15px]">
                            <li><a href="#" className="hover:underline">Help Center</a></li>
                            <li><a href="#" className="hover:underline">Safety Guidelines</a></li>
                            <li><a href="#" className="hover:underline">Terms of Service</a></li>
                            <li><a href="#" className="hover:underline">Privacy Policy</a></li>
                        </ul>
                    </div>

                    {/* Contact Us */}
                    <div>
                        <h4 className="text-lg md:text-xl font-extrabold text-[#ffd700]">Contact Us</h4>
                        <ul className="mt-3 md:mt-4 space-y-1.5 md:space-y-2 text-sm md:text-[15px]">
                            <li>Email: Info@eumatter.com</li>
                            <li>Phone: (123) 456-7890</li>
                            <li>Address: University Campus, City, Country</li>
                        </ul>
                    </div>
                </div>

                <div className="mt-8 border-t border-white/15 pt-4 text-center">
                    <p className="text-xs sm:text-sm opacity-80">
                        © 2025 EuMatter - MSEUF Community Relation Department. All rights reserved.
                    </p>
                </div>
            </div>
        </footer>
    );
};

export default Footer;