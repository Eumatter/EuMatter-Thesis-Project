import userModel from "../models/userModel.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import transporter from "../config/nodemailer.js";

const isProd = process.env.NODE_ENV === 'production' || process.env.RENDER === 'true'
const cookieOptions = {
    httpOnly: true,
    secure: process.env.COOKIE_SECURE
        ? process.env.COOKIE_SECURE !== 'false'
        : isProd,
    sameSite: process.env.COOKIE_SAME_SITE
        ? process.env.COOKIE_SAME_SITE
        : (isProd ? 'none' : 'lax'),
    path: '/',
    maxAge: 7 * 24 * 60 * 60 * 1000
}

// Helper function to validate MSEUF email and extract ID
const validateMSEUFEmail = (email) => {
    // MSEUF email patterns:
    // Student: A22-34197@student.mseuf.edu.ph or T22-34197@student.mseuf.edu.ph
    // Format: [Letter][2 digits]-[5 digits]@student.mseuf.edu.ph
    // Faculty/Staff: juan.delacruz@mseuf.edu.ph
    // Format: name.name@mseuf.edu.ph (must NOT be @student.mseuf.edu.ph)
    
    const emailLower = email.toLowerCase();
    
    // Student format: A22-34197@student.mseuf.edu.ph or T22-34197@student.mseuf.edu.ph
    const studentPattern = /^([A-Z]\d{2}-\d{5})@student\.mseuf\.edu\.ph$/i;
    const studentMatch = email.match(studentPattern);
    if (studentMatch) {
        // Extract ID from student email (e.g., A22-34197)
        return { isValid: true, mseufId: studentMatch[1].toUpperCase() };
    }
    
    // Faculty/Staff format: juan.delacruz@mseuf.edu.ph
    // Must be @mseuf.edu.ph but NOT @student.mseuf.edu.ph
    const facultyPattern = /^.+@mseuf\.edu\.ph$/i;
    if (facultyPattern.test(email) && !emailLower.includes('@student.mseuf.edu.ph')) {
        // For faculty/staff, extract the part before @
        const idPart = email.split('@')[0];
        return { isValid: true, mseufId: idPart };
    }
    
    return { isValid: false, mseufId: null };
};

// ===================== REGISTER =====================
export const register = async (req, res) => {
    try {
        const { 
            name, 
            email, 
            password, 
            role,
            birthday,
            gender,
            address,
            contact,
            userType,
            mseufCategory,
            outsiderCategory,
            studentYear,
            department,
            course
        } = req.body;

        // Validate required fields
        if (!name || !email || !password || !userType) {
            return res.json({ success: false, message: "Name, email, password, and user type are required" });
        }

        // Validate MSEUF email if user is MSEUF
        if (userType === "MSEUF") {
            const emailValidation = validateMSEUFEmail(email);
            if (!emailValidation.isValid) {
                return res.json({ 
                    success: false, 
                    message: "Invalid MSEUF email format. Students: A22-34197@student.mseuf.edu.ph or T22-34197@student.mseuf.edu.ph. Faculty: juan.delacruz@mseuf.edu.ph" 
                });
            }
            
            // Additional validation: Students must use @student.mseuf.edu.ph, Faculty/Staff must use @mseuf.edu.ph
            if (mseufCategory === "Student") {
                if (!email.toLowerCase().includes('@student.mseuf.edu.ph')) {
                    return res.json({ 
                        success: false, 
                        message: "Students must use @student.mseuf.edu.ph email format (e.g., A22-34197@student.mseuf.edu.ph or T22-34197@student.mseuf.edu.ph)" 
                    });
                }
            } else if (mseufCategory === "Faculty" || mseufCategory === "Staff") {
                if (email.toLowerCase().includes('@student.mseuf.edu.ph')) {
                    return res.json({ 
                        success: false, 
                        message: "Faculty/Staff must use @mseuf.edu.ph email format (e.g., juan.delacruz@mseuf.edu.ph), not @student.mseuf.edu.ph" 
                    });
                }
            }

            // Validate MSEUF category
            if (!mseufCategory || !["Student", "Faculty", "Staff"].includes(mseufCategory)) {
                return res.json({ success: false, message: "Please select Student, Faculty, or Staff" });
            }

            // Validate student information if user is a student
            if (mseufCategory === "Student") {
                if (!studentYear || !department || !course) {
                    return res.json({ 
                        success: false, 
                        message: "Student year, department, and course are required for students" 
                    });
                }
            }
        } else if (userType === "Outsider") {
            // Validate outsider category
            if (!outsiderCategory || !["Alumni", "External Partner", "General Public"].includes(outsiderCategory)) {
                return res.json({ success: false, message: "Please select your category (Alumni, External Partner, or General Public)" });
            }
        }

        // Check if user already exists
        const existingUser = await userModel.findOne({ email });
        if (existingUser) {
            return res.json({ success: false, message: "User with this email already exists" });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Extract MSEUF ID if applicable
        let mseufId = "";
        if (userType === "MSEUF") {
            const emailValidation = validateMSEUFEmail(email);
            mseufId = emailValidation.mseufId || "";
        }

        // Determine if user needs verification (only for regular Users)
        const rolesRequiringVerification = ['User'];
        const userRole = role || "User";
        const needsVerification = rolesRequiringVerification.includes(userRole);

        // Create user
        const userData = {
            name,
            email,
            password: hashedPassword,
            role: userRole,
            birthday: birthday ? new Date(birthday) : null,
            gender: gender || "",
            address: address || "",
            contact: contact || "",
            userType: userType || "",
            mseufCategory: mseufCategory || "",
            outsiderCategory: outsiderCategory || "",
            studentYear: studentYear || "",
            department: department || "",
            course: course || "",
            mseufId: mseufId,
            isAccountVerified: !needsVerification // Auto-verify for non-User roles
        };

        const user = new userModel(userData);
        await user.save();

        // Generate OTP for email verification (only for Users)
        let otp = null;
        if (needsVerification) {
            otp = String(Math.floor(100000 + Math.random() * 900000));
            user.verifyOtp = otp;
            user.verifyOtpExpireAt = Date.now() + 10 * 60 * 1000; // 10 minutes
            await user.save();
        }

        // Create token but user won't be able to access dashboard until verified
        const token = jwt.sign(
            { id: user._id, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: "7d" }
        );

        res.cookie("token", token, cookieOptions);

        // Send response immediately to prevent timeout
        res.json({
            success: true,
            message: needsVerification 
                ? "Registration successful. Please verify your email to continue."
                : "Registration successful. You can now log in.",
            user: { 
                id: user._id, 
                name: user.name, 
                email: user.email, 
                role: user.role,
                isAccountVerified: user.isAccountVerified,
                userType: user.userType
            },
            requiresVerification: needsVerification && !user.isAccountVerified
        });

        // Send email asynchronously after responding to prevent blocking
        setImmediate(async () => {
            try {
                if (needsVerification && otp) {
                    // Send verification OTP email
                    const mailOptions = {
                        from: process.env.SENDER_EMAIL,
                        to: email,
                        subject: "EuMatter - Verify Your Email Address",
                        html: `
                            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                                <h2 style="color: #800000;">Welcome to EuMatter! 🎉</h2>
                                <p>Hello ${name},</p>
                                <p>Thank you for registering with EuMatter. To complete your registration and verify your email address, please use the following verification code:</p>
                                <div style="background-color: #f0f0f0; padding: 20px; text-align: center; margin: 20px 0; border-radius: 5px;">
                                    <h1 style="color: #800000; font-size: 32px; letter-spacing: 5px; margin: 0;">${otp}</h1>
                                </div>
                                <p><strong>This code will expire in 10 minutes.</strong></p>
                                <p>If you did not create an account with EuMatter, please ignore this email.</p>
                                <br/>
                                <p>Best regards,<br/>The EuMatter Team</p>
                            </div>
                        `
                    };
                    await transporter.sendMail(mailOptions);
                    console.log(`Verification OTP email sent successfully to ${email}`);
                } else {
                    // Send welcome email for non-User roles (no verification needed)
                    const mailOptions = {
                        from: process.env.SENDER_EMAIL,
                        to: email,
                        subject: "Welcome to EuMatter",
                        html: `
                            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                                <h2 style="color: #800000;">Welcome to EuMatter! 🎉</h2>
                                <p>Hello ${name},</p>
                                <p>Your account has been created successfully. You can now log in and start using the system.</p>
                                <br/>
                                <p>Best regards,<br/>The EuMatter Team</p>
                            </div>
                        `
                    };
                    await transporter.sendMail(mailOptions);
                    console.log(`Welcome email sent successfully to ${email}`);
                }
            } catch (emailError) {
                // Log email error but don't fail registration
                console.error(`Failed to send email to ${email}:`, emailError);
                // Email sending failure doesn't affect registration success
            }
        });

    } catch (error) {
        console.error("Registration error:", error);
        return res.json({ success: false, message: error.message || "Registration failed" });
    }
};

// ===================== LOGIN =====================
export const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.json({ success: false, message: "All fields are required" });
        }

        const user = await userModel.findOne({ email });
        if (!user) {
            return res.json({ success: false, message: "Invalid email or password" });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.json({ success: false, message: "Invalid email or password" });
        }

        // Check if account is verified - ONLY for regular Users
        const rolesRequiringVerification = ['User'];
        const needsVerification = rolesRequiringVerification.includes(user.role);
        
        if (needsVerification && !user.isAccountVerified) {
            // Generate new OTP if expired or doesn't exist
            if (!user.verifyOtp || user.verifyOtpExpireAt < Date.now()) {
                const otp = String(Math.floor(100000 + Math.random() * 900000));
                user.verifyOtp = otp;
                user.verifyOtpExpireAt = Date.now() + 10 * 60 * 1000; // 10 minutes
                await user.save();

                // Send verification OTP email
                const mailOptions = {
                    from: process.env.SENDER_EMAIL,
                    to: email,
                    subject: "EuMatter - Verify Your Email Address",
                    html: `
                        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                            <h2 style="color: #800000;">Email Verification Required</h2>
                            <p>Hello ${user.name},</p>
                            <p>Your account requires email verification. Please use the following verification code:</p>
                            <div style="background-color: #f0f0f0; padding: 20px; text-align: center; margin: 20px 0; border-radius: 5px;">
                                <h1 style="color: #800000; font-size: 32px; letter-spacing: 5px; margin: 0;">${otp}</h1>
                            </div>
                            <p><strong>This code will expire in 10 minutes.</strong></p>
                            <br/>
                            <p>Best regards,<br/>The EuMatter Team</p>
                        </div>
                    `
                };
                await transporter.sendMail(mailOptions);
            }

            const token = jwt.sign(
                { id: user._id, role: user.role },
                process.env.JWT_SECRET,
                { expiresIn: "7d" }
            );

            res.cookie("token", token, cookieOptions);

            return res.json({
                success: false,
                message: "Please verify your email address to continue",
                requiresVerification: true,
                user: { 
                    id: user._id, 
                    name: user.name, 
                    email: user.email, 
                    role: user.role,
                    isAccountVerified: false
                }
            });
        }

        // Roles that do NOT require email verification
        const rolesNotRequiringVerification = ['CRD Staff', 'System Administrator', 'Department/Organization'];
        const isRoleExempt = rolesNotRequiringVerification.includes(user.role);
        
        // Auto-verify non-User roles and ensure they're marked as verified in the database
        if (isRoleExempt && !user.isAccountVerified) {
            user.isAccountVerified = true;
            await user.save();
        }

        const token = jwt.sign(
            { id: user._id, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: "7d" }
        );

        res.cookie("token", token, cookieOptions);

        // Always return isAccountVerified as true for exempt roles
        return res.json({
            success: true,
            message: "Login successful",
            user: { 
                id: user._id, 
                name: user.name, 
                email: user.email, 
                role: user.role,
                isAccountVerified: isRoleExempt ? true : user.isAccountVerified
            }
        });

    } catch (error) {
        return res.json({ success: false, message: error.message });
    }
};


// ===================== SEND VERIFY OTP =====================
export const sendVerifyOtp = async (req, res) => {
    try {
        const { email, userId } = req.body;
        
        let user;
        if (userId) {
            user = await userModel.findById(userId);
        } else if (email) {
            user = await userModel.findOne({ email });
        } else {
            return res.json({ success: false, message: "Email or userId is required" });
        }

        if (!user) {
            return res.json({ success: false, message: "User not found" });
        }

        // Roles that do NOT require email verification
        const rolesNotRequiringVerification = ['CRD Staff', 'System Administrator', 'Department/Organization'];
        const isRoleExempt = rolesNotRequiringVerification.includes(user.role);
        
        // Non-User roles don't need verification
        if (isRoleExempt) {
            return res.json({ success: false, message: "This account type does not require email verification" });
        }

        if (user.isAccountVerified) {
            return res.json({ success: false, message: "Account already verified" });
        }

        const otp = String(Math.floor(100000 + Math.random() * 900000));
        user.verifyOtp = otp;
        user.verifyOtpExpireAt = Date.now() + 10 * 60 * 1000; // 10 minutes
        await user.save();

        const mailOptions = {
            from: process.env.SENDER_EMAIL,
            to: user.email,
            subject: "EuMatter - Verify Your Email Address",
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <h2 style="color: #800000;">Email Verification Code</h2>
                    <p>Hello ${user.name},</p>
                    <p>Please use the following verification code to verify your email address:</p>
                    <div style="background-color: #f0f0f0; padding: 20px; text-align: center; margin: 20px 0; border-radius: 5px;">
                        <h1 style="color: #800000; font-size: 32px; letter-spacing: 5px; margin: 0;">${otp}</h1>
                    </div>
                    <p><strong>This code will expire in 10 minutes.</strong></p>
                    <p>If you did not request this code, please ignore this email.</p>
                    <br/>
                    <p>Best regards,<br/>The EuMatter Team</p>
                </div>
            `
        };
        await transporter.sendMail(mailOptions);

        return res.json({ success: true, message: "Verification OTP sent to your email" });

    } catch (error) {
        return res.json({ success: false, message: error.message });
    }
};

// ===================== VERIFY EMAIL =====================
export const verifyEmail = async (req, res) => {
    try {
        const { email, otp } = req.body;
        
        if (!email || !otp) {
            return res.json({ success: false, message: "Email and OTP are required" });
        }

        const user = await userModel.findOne({ email });
        if (!user) {
            return res.json({ success: false, message: "User not found" });
        }

        // Roles that do NOT require email verification
        const rolesNotRequiringVerification = ['CRD Staff', 'System Administrator', 'Department/Organization'];
        const isRoleExempt = rolesNotRequiringVerification.includes(user.role);
        
        // Non-User roles don't need verification - auto-verify them
        if (isRoleExempt) {
            if (!user.isAccountVerified) {
                user.isAccountVerified = true;
                await user.save();
            }
            return res.json({ 
                success: true, 
                message: "Account verified successfully",
                user: {
                    id: user._id,
                    name: user.name,
                    email: user.email,
                    role: user.role,
                    isAccountVerified: true
                }
            });
        }

        if (user.isAccountVerified) {
            return res.json({ success: true, message: "Account already verified" });
        }

        if (user.verifyOtp === "" || user.verifyOtp !== otp) {
            return res.json({ success: false, message: "Invalid OTP. Please check and try again." });
        }

        if (user.verifyOtpExpireAt < Date.now()) {
            return res.json({ success: false, message: "OTP has expired. Please request a new one." });
        }

        // Verify the account
        user.isAccountVerified = true;
        user.verifyOtp = "";
        user.verifyOtpExpireAt = 0;
        await user.save();

        // Generate new token for verified user
        const token = jwt.sign(
            { id: user._id, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: "7d" }
        );

        res.cookie("token", token, cookieOptions);

        return res.json({ 
            success: true, 
            message: "Account verified successfully",
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                isAccountVerified: true
            }
        });

    } catch (error) {
        return res.json({ success: false, message: error.message });
    }
};

// ===================== SEND RESET OTP =====================
export const sendResetOtp = async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.json({ success: false, message: "Email is required" });
        }

        const user = await userModel.findOne({ email });
        if (!user) {
            return res.json({ success: false, message: "User not found" });
        }

        const otp = String(Math.floor(100000 + Math.random() * 900000));
        user.resetOtp = otp;
        user.resetOtpExpireAt = Date.now() + 15 * 60 * 1000; // 15 minutes
        await user.save();

        // Send password reset OTP email with modern format matching EuMatter style
        const mailOptions = {
            from: process.env.SENDER_EMAIL,
            to: email,
            subject: "EuMatter - Password Reset Verification Code",
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
                    <div style="background-color: white; border-radius: 8px; padding: 30px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                        <div style="text-align: center; margin-bottom: 30px;">
                            <h2 style="color: #800000; font-size: 28px; margin: 0 0 10px 0;">Password Reset Request 🔐</h2>
                        </div>
                        <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">Hello ${user.name || 'User'},</p>
                        <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">We received a request to reset your password for your EuMatter account. To proceed with the password reset, please use the following verification code:</p>
                        <div style="background: linear-gradient(135deg, #f0f0f0 0%, #e0e0e0 100%); padding: 25px; text-align: center; margin: 30px 0; border-radius: 8px; border: 2px solid #e5e7eb;">
                            <h1 style="color: #800000; font-size: 36px; letter-spacing: 8px; margin: 0; font-weight: bold;">${otp}</h1>
                        </div>
                        <p style="color: #374151; font-size: 14px; line-height: 1.6; margin: 20px 0;">
                            <strong style="color: #dc2626;">⚠️ This code will expire in 15 minutes.</strong>
                        </p>
                        <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin: 20px 0 0 0;">
                            If you did not request a password reset, please ignore this email. Your password will remain unchanged.
                        </p>
                        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
                            <p style="color: #6b7280; font-size: 14px; margin: 0;">
                                Best regards,<br/>
                                <strong style="color: #800000;">The EuMatter Team</strong>
                            </p>
                        </div>
                    </div>
                    <div style="text-align: center; margin-top: 20px;">
                        <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                            This is an automated message. Please do not reply to this email.
                        </p>
                    </div>
                </div>
            `
        };
        await transporter.sendMail(mailOptions);

        return res.json({ success: true, message: "Password reset OTP sent to email" });

    } catch (error) {
        return res.json({ success: false, message: error.message });
    }
};

// ===================== VERIFY RESET OTP =====================
export const verifyResetOtp = async (req, res) => {
    try {
        const { email, otp } = req.body;

        if (!email || !otp) {
            return res.json({ success: false, message: "Email and OTP are required" });
        }

        const user = await userModel.findOne({ email });
        if (!user) {
            return res.json({ success: false, message: "User not found" });
        }

        if (user.resetOtp === "" || user.resetOtp !== otp) {
            return res.json({ success: false, message: "Invalid verification code. Please check and try again." });
        }

        if (user.resetOtpExpireAt < Date.now()) {
            return res.json({ success: false, message: "Verification code has expired. Please request a new one." });
        }

        // OTP is valid, but don't clear it yet - keep it for password reset step
        return res.json({ success: true, message: "Verification code verified successfully" });

    } catch (error) {
        return res.json({ success: false, message: error.message });
    }
};

// ===================== RESET PASSWORD =====================
export const resetPassword = async (req, res) => {
    try {
        const { email, otp, newPassword } = req.body;

        if (!email || !otp || !newPassword) {
            return res.json({ success: false, message: "All fields required" });
        }

        const user = await userModel.findOne({ email });
        if (!user) {
            return res.json({ success: false, message: "User not found" });
        }

        if (user.resetOtp === "" || user.resetOtp !== otp) {
            return res.json({ success: false, message: "Invalid verification code" });
        }

        if (user.resetOtpExpireAt < Date.now()) {
            return res.json({ success: false, message: "Verification code has expired. Please request a new one." });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        user.password = hashedPassword;
        user.resetOtp = "";
        user.resetOtpExpireAt = 0;
        await user.save();

        return res.json({ success: true, message: "Password reset successful" });

    } catch (error) {
        return res.json({ success: false, message: error.message });
    }
};

// ===================== IS AUTHENTICATED =====================
export const isAuthenticated = async (req, res) => {
    try {
        const token = req.cookies.token;
        if (!token) return res.json({ success: false });

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await userModel.findById(decoded.id).select("-password");

        if (!user) return res.json({ success: false });

        // Roles that do NOT require email verification
        const rolesNotRequiringVerification = ['CRD Staff', 'System Administrator', 'Department/Organization'];
        const isRoleExempt = rolesNotRequiringVerification.includes(user.role);
        
        // Auto-verify non-User roles and ensure they're marked as verified in the database
        if (isRoleExempt && !user.isAccountVerified) {
            user.isAccountVerified = true;
            await user.save();
        }
        
        // Always return isAccountVerified as true for exempt roles (even if DB says false)
        const userResponse = user.toObject();
        if (isRoleExempt) {
            userResponse.isAccountVerified = true;
        }

        // Ensure createdAt is included (from timestamps: true)
        if (!userResponse.createdAt && user.createdAt) {
            userResponse.createdAt = user.createdAt;
        }

        return res.json({ success: true, user: userResponse });
    } catch (error) {
        return res.json({ success: false, message: error.message });
    }
};

// ===================== LOGOUT =====================
export const logout = async (req, res) => {
    try {
        res.clearCookie("token", cookieOptions);
        return res.json({ success: true, message: "Logged out successfully" });
    } catch (error) {
        return res.json({ success: false, message: error.message });
    }
};



