import React from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import { FaArrowLeft, FaFileContract, FaCheckCircle } from 'react-icons/fa';

const TermsAndConditions = () => {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            <Header />
            
            <main className="flex-1 container mx-auto px-4 md:px-6 lg:px-8 py-8 max-w-4xl">
                {/* Header */}
                <div className="bg-gradient-to-r from-[#800000] via-[#A00000] to-[#EE1212] rounded-xl shadow-lg p-6 mb-6">
                    <div className="flex items-center space-x-3 mb-4">
                        <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                            <FaFileContract className="text-white text-xl" />
                        </div>
                        <h1 className="text-2xl md:text-3xl font-bold text-white">Terms and Conditions</h1>
                    </div>
                    <p className="text-white/90 text-sm md:text-base">
                        Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                    </p>
                </div>

                {/* Terms Content */}
                <div className="bg-white rounded-xl shadow-md p-6 md:p-8 space-y-6">
                    {/* Introduction */}
                    <section>
                        <h2 className="text-xl font-bold text-gray-900 mb-3">1. Introduction</h2>
                        <p className="text-gray-700 leading-relaxed">
                            Welcome to EuMatter, a community-driven platform for managing events, donations, and volunteer activities 
                            at Manuel S. Enverga University Foundation (MSEUF). By accessing and using this platform, you agree to 
                            comply with and be bound by the following terms and conditions.
                        </p>
                    </section>

                    {/* Acceptance of Terms */}
                    <section>
                        <h2 className="text-xl font-bold text-gray-900 mb-3">2. Acceptance of Terms</h2>
                        <p className="text-gray-700 leading-relaxed">
                            By creating an account and using EuMatter, you acknowledge that you have read, understood, and agree to 
                            be bound by these Terms and Conditions. If you do not agree with any part of these terms, you must not 
                            use this platform.
                        </p>
                    </section>

                    {/* User Accounts */}
                    <section>
                        <h2 className="text-xl font-bold text-gray-900 mb-3">3. User Accounts</h2>
                        <div className="space-y-3">
                            <p className="text-gray-700 leading-relaxed">
                                <strong className="text-gray-900">3.1 Account Creation:</strong> You are responsible for providing 
                                accurate and complete information during registration. You must maintain the confidentiality of your 
                                account credentials.
                            </p>
                            <p className="text-gray-700 leading-relaxed">
                                <strong className="text-gray-900">3.2 Account Security:</strong> You are solely responsible for all 
                                activities that occur under your account. You must immediately notify us of any unauthorized use of 
                                your account.
                            </p>
                            <p className="text-gray-700 leading-relaxed">
                                <strong className="text-gray-900">3.3 Account Types:</strong> The platform supports different user 
                                types (MSEUF Members and Guests/Outsiders) with varying access levels and permissions.
                            </p>
                            <p className="text-gray-700 leading-relaxed">
                                <strong className="text-gray-900">3.4 Email Verification:</strong> All users must verify their email 
                                address before accessing the platform. Unverified accounts may have limited functionality.
                            </p>
                        </div>
                    </section>

                    {/* User Responsibilities */}
                    <section>
                        <h2 className="text-xl font-bold text-gray-900 mb-3">4. User Responsibilities</h2>
                        <div className="space-y-3">
                            <p className="text-gray-700 leading-relaxed">
                                <strong className="text-gray-900">4.1 Appropriate Use:</strong> You agree to use the platform only 
                                for lawful purposes and in a way that does not infringe the rights of others or restrict their use 
                                of the platform.
                            </p>
                            <p className="text-gray-700 leading-relaxed">
                                <strong className="text-gray-900">4.2 Prohibited Activities:</strong> You must not:
                            </p>
                            <ul className="list-disc list-inside ml-4 space-y-2 text-gray-700">
                                <li>Upload, post, or transmit any content that is illegal, harmful, or offensive</li>
                                <li>Impersonate any person or entity or falsely state your affiliation with any person or entity</li>
                                <li>Interfere with or disrupt the platform's servers or networks</li>
                                <li>Attempt to gain unauthorized access to any portion of the platform</li>
                                <li>Use the platform for any commercial purpose without prior authorization</li>
                                <li>Collect or store personal data about other users without their consent</li>
                            </ul>
                        </div>
                    </section>

                    {/* Events and Activities */}
                    <section>
                        <h2 className="text-xl font-bold text-gray-900 mb-3">5. Events and Activities</h2>
                        <div className="space-y-3">
                            <p className="text-gray-700 leading-relaxed">
                                <strong className="text-gray-900">5.1 Event Creation:</strong> Authorized departments and organizations 
                                may create and manage events. Event creators are responsible for the accuracy of event information.
                            </p>
                            <p className="text-gray-700 leading-relaxed">
                                <strong className="text-gray-900">5.2 Event Participation:</strong> By registering for an event, you 
                                agree to attend and participate in good faith. Failure to attend without proper notice may affect your 
                                future event registrations.
                            </p>
                            <p className="text-gray-700 leading-relaxed">
                                <strong className="text-gray-900">5.3 Volunteer Activities:</strong> Volunteer participation is 
                                voluntary. You understand that volunteer activities may involve physical activities and assume all 
                                associated risks.
                            </p>
                        </div>
                    </section>

                    {/* Donations */}
                    <section>
                        <h2 className="text-xl font-bold text-gray-900 mb-3">6. Donations</h2>
                        <div className="space-y-3">
                            <p className="text-gray-700 leading-relaxed">
                                <strong className="text-gray-900">6.1 Donation Processing:</strong> Donations made through the platform 
                                are processed securely. We use reputable payment processors to handle financial transactions.
                            </p>
                            <p className="text-gray-700 leading-relaxed">
                                <strong className="text-gray-900">6.2 Donation Receipts:</strong> Receipts for donations will be 
                                provided electronically. You are responsible for keeping records of your donations for tax purposes.
                            </p>
                            <p className="text-gray-700 leading-relaxed">
                                <strong className="text-gray-900">6.3 Refund Policy:</strong> Donation refunds are subject to the 
                                policies of the receiving department or organization. Please contact the event organizer for refund 
                                requests.
                            </p>
                            <p className="text-gray-700 leading-relaxed">
                                <strong className="text-gray-900">6.4 In-Kind Donations:</strong> In-kind donations must be accurately 
                                described and delivered as specified. The receiving organization reserves the right to refuse donations 
                                that do not meet their requirements.
                            </p>
                        </div>
                    </section>

                    {/* Privacy and Data Protection */}
                    <section>
                        <h2 className="text-xl font-bold text-gray-900 mb-3">7. Privacy and Data Protection</h2>
                        <div className="space-y-3">
                            <p className="text-gray-700 leading-relaxed">
                                <strong className="text-gray-900">7.1 Data Collection:</strong> We collect and process personal 
                                information in accordance with our Privacy Policy and applicable data protection laws.
                            </p>
                            <p className="text-gray-700 leading-relaxed">
                                <strong className="text-gray-900">7.2 Data Usage:</strong> Your personal information is used to 
                                provide platform services, process transactions, and communicate with you about events and activities.
                            </p>
                            <p className="text-gray-700 leading-relaxed">
                                <strong className="text-gray-900">7.3 Data Security:</strong> We implement reasonable security measures 
                                to protect your personal information. However, no method of transmission over the internet is 100% secure.
                            </p>
                            <p className="text-gray-700 leading-relaxed">
                                <strong className="text-gray-900">7.4 Data Sharing:</strong> We do not sell your personal information 
                                to third parties. We may share information with authorized departments and organizations for event 
                                management purposes.
                            </p>
                        </div>
                    </section>

                    {/* Intellectual Property */}
                    <section>
                        <h2 className="text-xl font-bold text-gray-900 mb-3">8. Intellectual Property</h2>
                        <div className="space-y-3">
                            <p className="text-gray-700 leading-relaxed">
                                <strong className="text-gray-900">8.1 Platform Content:</strong> All content on the platform, including 
                                text, graphics, logos, and software, is the property of MSEUF or its content providers and is protected 
                                by copyright and other intellectual property laws.
                            </p>
                            <p className="text-gray-700 leading-relaxed">
                                <strong className="text-gray-900">8.2 User Content:</strong> By posting content on the platform, you 
                                grant MSEUF a non-exclusive, royalty-free license to use, reproduce, and distribute your content for 
                                platform-related purposes.
                            </p>
                        </div>
                    </section>

                    {/* Limitation of Liability */}
                    <section>
                        <h2 className="text-xl font-bold text-gray-900 mb-3">9. Limitation of Liability</h2>
                        <p className="text-gray-700 leading-relaxed">
                            To the maximum extent permitted by law, MSEUF and its affiliates shall not be liable for any indirect, 
                            incidental, special, consequential, or punitive damages arising out of or relating to your use of the 
                            platform. This includes but is not limited to loss of data, loss of profits, or business interruption.
                        </p>
                    </section>

                    {/* Termination */}
                    <section>
                        <h2 className="text-xl font-bold text-gray-900 mb-3">10. Termination</h2>
                        <div className="space-y-3">
                            <p className="text-gray-700 leading-relaxed">
                                <strong className="text-gray-900">10.1 User Termination:</strong> You may terminate your account at 
                                any time by contacting the platform administrators.
                            </p>
                            <p className="text-gray-700 leading-relaxed">
                                <strong className="text-gray-900">10.2 Platform Termination:</strong> We reserve the right to suspend 
                                or terminate your account at any time for violations of these Terms and Conditions or for any other 
                                reason we deem necessary.
                            </p>
                        </div>
                    </section>

                    {/* Changes to Terms */}
                    <section>
                        <h2 className="text-xl font-bold text-gray-900 mb-3">11. Changes to Terms</h2>
                        <p className="text-gray-700 leading-relaxed">
                            We reserve the right to modify these Terms and Conditions at any time. We will notify users of significant 
                            changes via email or through the platform. Your continued use of the platform after such modifications 
                            constitutes your acceptance of the updated terms.
                        </p>
                    </section>

                    {/* Governing Law */}
                    <section>
                        <h2 className="text-xl font-bold text-gray-900 mb-3">12. Governing Law</h2>
                        <p className="text-gray-700 leading-relaxed">
                            These Terms and Conditions shall be governed by and construed in accordance with the laws of the Republic 
                            of the Philippines. Any disputes arising from these terms shall be subject to the exclusive jurisdiction 
                            of the courts of the Philippines.
                        </p>
                    </section>

                    {/* Contact Information */}
                    <section>
                        <h2 className="text-xl font-bold text-gray-900 mb-3">13. Contact Information</h2>
                        <p className="text-gray-700 leading-relaxed">
                            If you have any questions or concerns about these Terms and Conditions, please contact us at:
                        </p>
                        <div className="mt-3 p-4 bg-gray-50 rounded-lg">
                            <p className="text-gray-700">
                                <strong className="text-gray-900">Manuel S. Enverga University Foundation</strong><br />
                                Community Relations and Development Office<br />
                                Email: crd@mseuf.edu.ph<br />
                                Phone: (042) 373-7300
                            </p>
                        </div>
                    </section>

                    {/* Acknowledgment */}
                    <section className="bg-gradient-to-r from-yellow-50 to-yellow-100 border-2 border-yellow-300 rounded-lg p-6">
                        <div className="flex items-start space-x-3">
                            <FaCheckCircle className="text-yellow-600 text-xl mt-1 flex-shrink-0" />
                            <div>
                                <h3 className="text-lg font-bold text-gray-900 mb-2">Acknowledgment</h3>
                                <p className="text-gray-700 leading-relaxed">
                                    By using EuMatter, you acknowledge that you have read, understood, and agree to be bound by these 
                                    Terms and Conditions. You understand that violation of these terms may result in the suspension or 
                                    termination of your account.
                                </p>
                            </div>
                        </div>
                    </section>
                </div>

                {/* Back to Registration Button - Only at bottom */}
                <div className="mt-6 text-center">
                    <button
                        onClick={() => {
                            // Navigate back to registration page
                            // The step will be restored from sessionStorage
                            navigate('/register');
                        }}
                        className="group relative inline-flex items-center gap-3 px-6 py-4 bg-gradient-to-bl from-[#800000] to-[#EE1212] text-white rounded-2xl shadow-[0_8px_24px_rgba(128,0,0,0.35),0_0_0_1px_rgba(255,255,255,0.1)] hover:shadow-[0_12px_32px_rgba(128,0,0,0.45),0_0_0_1px_rgba(255,255,255,0.15)] hover:from-[#700000] hover:to-[#DD0000] transition-all duration-300 font-semibold transform hover:scale-105 active:scale-95 border border-white/20 hover:border-white/30 backdrop-blur-sm overflow-hidden"
                        aria-label="Back to Registration"
                    >
                        {/* Animated background shimmer effect */}
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                        
                        {/* Arrow Left Icon with hover animation */}
                        <div className="relative z-10 flex items-center justify-center transition-transform duration-300 group-hover:-translate-x-1">
                            <FaArrowLeft className="w-5 h-5 md:w-6 md:h-6" />
                        </div>
                        
                        {/* Text */}
                        <span className="relative z-10 text-sm md:text-base font-bold tracking-wide">
                            Back to Registration
                        </span>
                    </button>
                </div>
            </main>

            <Footer />
        </div>
    );
};

export default TermsAndConditions;

