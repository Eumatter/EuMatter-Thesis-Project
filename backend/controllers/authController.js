import userModel from "../models/userModel.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import transporter, { sendEmailWithRetry } from "../config/nodemailer.js";
import { createAuditLog } from "./auditLogController.js";

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
            if (!mseufCategory || !["Student", "Faculty", "Staff", "Alumni"].includes(mseufCategory)) {
                return res.json({ success: false, message: "Please select Student, Faculty, Staff, or Alumni" });
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
            if (!outsiderCategory || !["External Partner", "General Public"].includes(outsiderCategory)) {
                return res.json({ success: false, message: "Please select your category (External Partner or General Public)" });
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

        // Log user registration - don't await, fire and forget
        const clientIp = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'] || 'Unknown';
        const userAgent = req.headers['user-agent'] || 'Unknown';
        
        createAuditLog({
            userId: user._id,
            userEmail: user.email,
            userRole: user.role,
            actionType: 'USER_CREATED',
            resourceType: 'user',
            resourceId: user._id,
            ipAddress: clientIp,
            userAgent: userAgent,
            requestMethod: req.method,
            requestEndpoint: req.path,
            responseStatus: 200,
            success: true,
            newValues: {
                name: user.name,
                email: user.email,
                role: user.role,
                userType: user.userType
            }
        }).catch(err => console.error('Failed to log audit:', err));

        // Generate OTP for email verification (only for Users)
        // This applies to ALL users with role "User" regardless of userType (MSEUF or Outsider)
        // Both MSEUF (Student/Faculty/Staff/Alumni) and Outsider (External Partner/General Public) users receive OTP
        let otp = null;
        if (needsVerification) {
            otp = String(Math.floor(100000 + Math.random() * 900000));
            user.verifyOtp = otp;
            user.verifyOtpExpireAt = Date.now() + 10 * 60 * 1000; // 10 minutes
            user.verifyOtpAttempts = 0; // Reset attempts when generating new OTP
            user.verifyOtpLastAttempt = 0; // Reset last attempt time
            await user.save();
            console.log(`📧 OTP generated for ${userType === 'MSEUF' ? mseufCategory : outsiderCategory} user: ${email}`);
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
                    // Send verification OTP email for both MSEUF and Guest/Outsider users
                    const userTypeText = userType === 'MSEUF' 
                        ? (mseufCategory ? `${mseufCategory} of MSEUF` : 'MSEUF Member')
                        : (outsiderCategory ? outsiderCategory : 'Guest User');
                    
                    const mailOptions = {
                        from: process.env.SENDER_EMAIL || 'noreply@eumatter.com',
                        to: email,
                        subject: "EuMatter - Verify Your Email Address",
                        html: `
                            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
                                <div style="background-color: white; border-radius: 8px; padding: 30px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                                    <div style="text-align: center; margin-bottom: 30px;">
                                        <h2 style="color: #800000; font-size: 28px; margin: 0 0 10px 0;">Welcome to EuMatter! 🎉</h2>
                                    </div>
                                    <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">Hello ${name},</p>
                                    <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                                        Thank you for registering with EuMatter as a <strong>${userTypeText}</strong>. 
                                        To complete your registration and verify your email address, please use the following verification code:
                                    </p>
                                    <div style="background: linear-gradient(135deg, #f0f0f0 0%, #e0e0e0 100%); padding: 25px; text-align: center; margin: 30px 0; border-radius: 8px; border: 2px solid #e5e7eb;">
                                        <h1 style="color: #800000; font-size: 36px; letter-spacing: 8px; margin: 0; font-weight: bold;">${otp}</h1>
                                    </div>
                                    <p style="color: #374151; font-size: 14px; line-height: 1.6; margin: 20px 0;">
                                        <strong style="color: #dc2626;">⚠️ This code will expire in 10 minutes.</strong>
                                    </p>
                                    <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin: 20px 0 0 0;">
                                        If you did not create an account with EuMatter, please ignore this email.
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
                    
                    // Send email asynchronously (fire and forget) - don't block registration response
                    // OTP is already saved to user record, so verification will work even if email fails
                    sendEmailWithRetry(mailOptions, 3, 3000)
                        .then((emailResult) => {
                            console.log(`✅ Verification OTP email sent successfully to ${email} (MessageId: ${emailResult.messageId || 'N/A'})`);
                            console.log(`   User Type: ${userType}, Email Type: ${email.includes('@student.mseuf.edu.ph') ? 'MSEUF Student' : email.includes('@mseuf.edu.ph') ? 'MSEUF Faculty/Staff' : 'Guest/Outsider'}`);
                        })
                        .catch((sendError) => {
                            // Log error but don't throw - registration already succeeded and OTP is saved
                            console.error(`❌ Failed to send verification OTP email to ${email}:`, sendError.message);
                            console.error(`   Error details:`, {
                                message: sendError.message,
                                code: sendError.code,
                                userType: userType,
                                emailType: email.includes('@student.mseuf.edu.ph') ? 'MSEUF Student' : email.includes('@mseuf.edu.ph') ? 'MSEUF Faculty/Staff' : 'Guest/Outsider'
                            });
                            // Note: OTP is still saved, user can still verify
                            console.warn(`   ⚠️  Note: OTP has been saved and verification will still work. User can use the OTP code to verify.`);
                        });
                } else {
                    // Send welcome email for non-User roles (no verification needed)
                    const mailOptions = {
                        from: process.env.SENDER_EMAIL || 'noreply@eumatter.com',
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
                    // Send welcome email asynchronously (fire and forget) - don't block registration response
                    sendEmailWithRetry(mailOptions, 3, 3000)
                        .then((emailResult) => {
                            console.log(`✅ Welcome email sent successfully to ${email} (MessageId: ${emailResult.messageId || 'N/A'})`);
                        })
                        .catch((sendError) => {
                            // Log error but don't throw - registration already succeeded
                            console.error(`❌ Failed to send welcome email to ${email}:`, sendError.message);
                            console.error(`   Error details:`, {
                                message: sendError.message,
                                code: sendError.code,
                                userType: userType
                            });
                        });
                }
            } catch (emailError) {
                // Catch any errors in the email sending process
                console.error(`❌ Error in email sending process for ${email}:`, emailError);
                // Don't throw - registration already succeeded
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
        const clientIp = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'] || 'Unknown';
        const userAgent = req.headers['user-agent'] || 'Unknown';
        
        if (!user) {
            // Log failed login attempt (user not found) - don't await, fire and forget
            createAuditLog({
                userEmail: email,
                actionType: 'LOGIN_FAILURE',
                resourceType: 'user',
                ipAddress: clientIp,
                userAgent: userAgent,
                requestMethod: req.method,
                requestEndpoint: req.path,
                responseStatus: 401,
                success: false,
                errorMessage: 'User not found'
            }).catch(err => console.error('Failed to log audit:', err));
            return res.json({ success: false, message: "Invalid email or password" });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            // Log failed login attempt (wrong password) - don't await, fire and forget
            createAuditLog({
                userId: user._id,
                userEmail: user.email,
                userRole: user.role,
                actionType: 'LOGIN_FAILURE',
                resourceType: 'user',
                resourceId: user._id,
                ipAddress: clientIp,
                userAgent: userAgent,
                requestMethod: req.method,
                requestEndpoint: req.path,
                responseStatus: 401,
                success: false,
                errorMessage: 'Invalid password'
            }).catch(err => console.error('Failed to log audit:', err));
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
                user.verifyOtpAttempts = 0; // Reset attempts when generating new OTP
                user.verifyOtpLastAttempt = 0; // Reset last attempt time
                await user.save();

                // Send verification OTP email
                const mailOptions = {
                    from: process.env.SENDER_EMAIL || 'noreply@eumatter.com',
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
                
                // Send email with retry (fire and forget - don't block login response)
                // OTP is already saved, so user can still verify even if email fails
                sendEmailWithRetry(mailOptions, 3, 3000)
                    .then(result => {
                        console.log(`✅ Verification OTP email sent during login to ${email} (MessageId: ${result.messageId || 'N/A'})`);
                    })
                    .catch(error => {
                        console.error(`❌ Failed to send verification OTP email during login to ${email}:`, error.message);
                        console.warn(`   ⚠️  Note: OTP has been saved. User can still verify using the OTP code.`);
                    });
            }

            const token = jwt.sign(
                { id: user._id, role: user.role },
                process.env.JWT_SECRET,
                { expiresIn: "7d" }
            );

            res.cookie("token", token, cookieOptions);

            // Log login attempt requiring verification - don't await, fire and forget
            createAuditLog({
                userId: user._id,
                userEmail: user.email,
                userRole: user.role,
                actionType: 'USER_LOGIN',
                resourceType: 'user',
                resourceId: user._id,
                ipAddress: clientIp,
                userAgent: userAgent,
                requestMethod: req.method,
                requestEndpoint: req.path,
                responseStatus: 200,
                success: false,
                errorMessage: 'Account verification required',
                sessionId: token.substring(0, 20)
            }).catch(err => console.error('Failed to log audit:', err));

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

        // Create audit log for successful login - don't await, fire and forget
        createAuditLog({
            userId: user._id,
            userEmail: user.email,
            userRole: user.role,
            actionType: 'USER_LOGIN',
            resourceType: 'user',
            resourceId: user._id,
            ipAddress: clientIp,
            userAgent: userAgent,
            requestMethod: req.method,
            requestEndpoint: req.path,
            responseStatus: 200,
            success: true,
            sessionId: token.substring(0, 20) // Store partial token for session tracking
        }).catch(err => console.error('Failed to log audit:', err));

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
        user.verifyOtpAttempts = 0; // Reset attempts when generating new OTP
        user.verifyOtpLastAttempt = 0; // Reset last attempt time
        await user.save();

        // Determine user type for email personalization
        const userTypeText = user.userType === 'MSEUF' 
            ? (user.mseufCategory ? `${user.mseufCategory} of MSEUF` : 'MSEUF Member')
            : (user.outsiderCategory ? user.outsiderCategory : 'Guest User');
        
        const emailType = user.email.includes('@student.mseuf.edu.ph') 
            ? 'MSEUF Student' 
            : user.email.includes('@mseuf.edu.ph') 
                ? 'MSEUF Faculty/Staff' 
                : 'Guest/Outsider';
        
        const mailOptions = {
            from: process.env.SENDER_EMAIL || 'noreply@eumatter.com',
            to: user.email,
            subject: "EuMatter - Verify Your Email Address",
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
                    <div style="background-color: white; border-radius: 8px; padding: 30px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                        <div style="text-align: center; margin-bottom: 30px;">
                            <h2 style="color: #800000; font-size: 28px; margin: 0 0 10px 0;">Email Verification Code</h2>
                        </div>
                        <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">Hello ${user.name},</p>
                        <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                            Please use the following verification code to verify your email address for your <strong>${userTypeText}</strong> account:
                        </p>
                        <div style="background: linear-gradient(135deg, #f0f0f0 0%, #e0e0e0 100%); padding: 25px; text-align: center; margin: 30px 0; border-radius: 8px; border: 2px solid #e5e7eb;">
                            <h1 style="color: #800000; font-size: 36px; letter-spacing: 8px; margin: 0; font-weight: bold;">${otp}</h1>
                        </div>
                        <p style="color: #374151; font-size: 14px; line-height: 1.6; margin: 20px 0;">
                            <strong style="color: #dc2626;">⚠️ This code will expire in 10 minutes.</strong>
                        </p>
                        <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin: 20px 0 0 0;">
                            If you did not request this code, please ignore this email.
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
        
        // Send email asynchronously and respond immediately to prevent timeout
        // Email sending will happen in the background
        const clientIp = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'] || 'Unknown';
        const userAgent = req.headers['user-agent'] || 'Unknown';
        
        // Respond immediately to prevent frontend timeout
        // OTP is already saved, so verification will work even if email sending fails
        res.json({ success: true, message: "Verification OTP is being sent to your email. Please check your inbox. If you don't receive it, the OTP has been generated and you can try verifying with it." });
        
        // Send email in background (fire and forget)
        // OTP is already saved, so verification will work even if email sending fails
        sendEmailWithRetry(mailOptions, 3, 3000)
            .then((emailResult) => {
                console.log(`✅ Verification OTP email sent successfully to ${user.email} (MessageId: ${emailResult.messageId || 'N/A'})`);
                console.log(`   User Type: ${user.userType || 'N/A'}, Email Type: ${emailType}`);
                
                // Log OTP resend - don't await, fire and forget
                createAuditLog({
                    userId: user._id,
                    userEmail: user.email,
                    userRole: user.role,
                    actionType: 'OTP_RESENT',
                    resourceType: 'user',
                    resourceId: user._id,
                    ipAddress: clientIp,
                    userAgent: userAgent,
                    requestMethod: req.method,
                    requestEndpoint: req.path,
                    responseStatus: 200,
                    success: true
                }).catch(err => console.error('Failed to log audit:', err));
            })
            .catch((emailError) => {
                // Log email send failure - don't await, fire and forget
                console.error(`❌ Failed to send verification OTP email to ${user.email}:`, emailError);
                console.error(`   Error details:`, {
                    message: emailError.message,
                    code: emailError.code,
                    command: emailError.command,
                    response: emailError.response,
                    userType: user.userType,
                    emailType: emailType
                });
                
                // Log email failure but note that HTTP response was 200 (email sent in background)
                // The endpoint responded successfully, but email delivery failed asynchronously
                createAuditLog({
                    userId: user._id,
                    userEmail: user.email,
                    userRole: user.role,
                    actionType: 'EMAIL_SEND_FAILURE',
                    resourceType: 'user',
                    resourceId: user._id,
                    ipAddress: clientIp,
                    userAgent: userAgent,
                    requestMethod: req.method,
                    requestEndpoint: req.path,
                    responseStatus: 200, // HTTP response was 200, email failed in background
                    success: false, // Email delivery failed, but OTP was saved
                    errorMessage: `Background email send failed (${emailType}): ${emailError.message || 'Unknown error'}. OTP was generated and saved.`
                }).catch(err => console.error('Failed to log audit:', err));
            });
        
        return; // Exit early since we already sent response
        
    } catch (error) {
        return res.json({ success: false, message: error.message });
    }
};

// ===================== VERIFY EMAIL =====================
export const verifyEmail = async (req, res) => {
    try {
        let { email, otp } = req.body;
        
        // Normalize inputs - trim whitespace, convert to lowercase email
        email = email?.trim().toLowerCase();
        otp = otp?.trim().replace(/\s/g, ''); // Remove all whitespace from OTP
        
        if (!email || !otp) {
            return res.json({ success: false, message: "Email and OTP are required" });
        }

        // Validate OTP format (must be 6 digits)
        if (!/^\d{6}$/.test(otp)) {
            return res.json({ success: false, message: "OTP must be exactly 6 digits. Please check and try again." });
        }

        const user = await userModel.findOne({ email: email.toLowerCase() });
        if (!user) {
            return res.json({ success: false, message: "User not found. Please check your email address." });
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

        // Check if OTP exists
        if (!user.verifyOtp || user.verifyOtp === "") {
            // Log failed OTP verification (no OTP) - don't await, fire and forget
            const clientIp = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'] || 'Unknown';
            const userAgent = req.headers['user-agent'] || 'Unknown';
            
            createAuditLog({
                userId: user._id,
                userEmail: user.email,
                userRole: user.role,
                actionType: 'EMAIL_VERIFICATION',
                resourceType: 'user',
                resourceId: user._id,
                ipAddress: clientIp,
                userAgent: userAgent,
                requestMethod: req.method,
                requestEndpoint: req.path,
                responseStatus: 400,
                success: false,
                errorMessage: 'No OTP found. Please request a new code.'
            }).catch(err => console.error('Failed to log audit:', err));
            
            return res.json({ 
                success: false, 
                message: "No verification code found. Please request a new code.",
                actionRequired: "resend_otp"
            });
        }

        // Check if OTP is expired
        if (user.verifyOtpExpireAt < Date.now()) {
            // Log failed OTP verification (expired) - don't await, fire and forget
            const clientIp = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'] || 'Unknown';
            const userAgent = req.headers['user-agent'] || 'Unknown';
            
            createAuditLog({
                userId: user._id,
                userEmail: user.email,
                userRole: user.role,
                actionType: 'EMAIL_VERIFICATION',
                resourceType: 'user',
                resourceId: user._id,
                ipAddress: clientIp,
                userAgent: userAgent,
                requestMethod: req.method,
                requestEndpoint: req.path,
                responseStatus: 400,
                success: false,
                errorMessage: 'OTP expired'
            }).catch(err => console.error('Failed to log audit:', err));
            
            // Generate and save new OTP automatically as fallback
            const newOtp = String(Math.floor(100000 + Math.random() * 900000));
            user.verifyOtp = newOtp;
            user.verifyOtpExpireAt = Date.now() + 10 * 60 * 1000; // 10 minutes
            await user.save();
            
            // Send new OTP email in background
            const mailOptions = {
                from: process.env.SENDER_EMAIL || 'noreply@eumatter.com',
                to: user.email,
                subject: "EuMatter - New Verification Code",
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
                        <div style="background-color: white; border-radius: 8px; padding: 30px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                            <div style="text-align: center; margin-bottom: 30px;">
                                <h2 style="color: #800000; font-size: 28px; margin: 0 0 10px 0;">New Verification Code</h2>
                            </div>
                            <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">Hello ${user.name},</p>
                            <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                                Your previous verification code has expired. Here's your new verification code:
                            </p>
                            <div style="background: linear-gradient(135deg, #f0f0f0 0%, #e0e0e0 100%); padding: 25px; text-align: center; margin: 30px 0; border-radius: 8px; border: 2px solid #e5e7eb;">
                                <h1 style="color: #800000; font-size: 36px; letter-spacing: 8px; margin: 0; font-weight: bold;">${newOtp}</h1>
                            </div>
                            <p style="color: #374151; font-size: 14px; line-height: 1.6; margin: 20px 0;">
                                <strong style="color: #dc2626;">⚠️ This code will expire in 10 minutes.</strong>
                            </p>
                            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
                                <p style="color: #6b7280; font-size: 14px; margin: 0;">
                                    Best regards,<br/>
                                    <strong style="color: #800000;">The EuMatter Team</strong>
                                </p>
                            </div>
                        </div>
                    </div>
                `
            };
            
            sendEmailWithRetry(mailOptions, 3, 3000)
                .then(() => console.log(`✅ New OTP email sent automatically to ${user.email} after expiration`))
                .catch(err => console.error(`❌ Failed to send new OTP email to ${user.email}:`, err.message));
            
            return res.json({ 
                success: false, 
                message: "The verification code has expired. A new code has been generated and sent to your email. Please check your inbox.",
                actionRequired: "code_regenerated",
                codeSent: true
            });
        }

        // Verify OTP (case-sensitive comparison)
        if (user.verifyOtp !== otp) {
            // Log failed OTP verification (invalid) - don't await, fire and forget
            const clientIp = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'] || 'Unknown';
            const userAgent = req.headers['user-agent'] || 'Unknown';
            
            // Check how many attempts remain (limit to 5 attempts per 15 minutes)
            const lastAttemptTime = user.verifyOtpLastAttempt || 0;
            const attemptsWindow = 15 * 60 * 1000; // 15 minutes
            const attemptsCount = (user.verifyOtpAttempts || 0);
            
            if (Date.now() - lastAttemptTime > attemptsWindow) {
                // Reset attempts if window passed
                user.verifyOtpAttempts = 1;
            } else {
                user.verifyOtpAttempts = (attemptsCount || 0) + 1;
            }
            user.verifyOtpLastAttempt = Date.now();
            await user.save();
            
            const remainingAttempts = Math.max(0, 5 - (user.verifyOtpAttempts || 0));
            
            createAuditLog({
                userId: user._id,
                userEmail: user.email,
                userRole: user.role,
                actionType: 'EMAIL_VERIFICATION',
                resourceType: 'user',
                resourceId: user._id,
                ipAddress: clientIp,
                userAgent: userAgent,
                requestMethod: req.method,
                requestEndpoint: req.path,
                responseStatus: 400,
                success: false,
                errorMessage: `Invalid OTP. Attempt ${user.verifyOtpAttempts}/5`
            }).catch(err => console.error('Failed to log audit:', err));
            
            if (remainingAttempts === 0) {
                // Too many attempts - generate new OTP
                const newOtp = String(Math.floor(100000 + Math.random() * 900000));
                user.verifyOtp = newOtp;
                user.verifyOtpExpireAt = Date.now() + 10 * 60 * 1000;
                user.verifyOtpAttempts = 0;
                await user.save();
                
                // Send new OTP email in background
                const mailOptions = {
                    from: process.env.SENDER_EMAIL || 'noreply@eumatter.com',
                    to: user.email,
                    subject: "EuMatter - New Verification Code (Too Many Attempts)",
                    html: `
                        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
                            <div style="background-color: white; border-radius: 8px; padding: 30px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                                <div style="text-align: center; margin-bottom: 30px;">
                                    <h2 style="color: #800000; font-size: 28px; margin: 0 0 10px 0;">New Verification Code</h2>
                                </div>
                                <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">Hello ${user.name},</p>
                                <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                                    Due to multiple failed attempts, a new verification code has been generated for your security:
                                </p>
                                <div style="background: linear-gradient(135deg, #f0f0f0 0%, #e0e0e0 100%); padding: 25px; text-align: center; margin: 30px 0; border-radius: 8px; border: 2px solid #e5e7eb;">
                                    <h1 style="color: #800000; font-size: 36px; letter-spacing: 8px; margin: 0; font-weight: bold;">${newOtp}</h1>
                                </div>
                                <p style="color: #374151; font-size: 14px; line-height: 1.6; margin: 20px 0;">
                                    <strong style="color: #dc2626;">⚠️ This code will expire in 10 minutes.</strong>
                                </p>
                                <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
                                    <p style="color: #6b7280; font-size: 14px; margin: 0;">
                                        Best regards,<br/>
                                        <strong style="color: #800000;">The EuMatter Team</strong>
                                    </p>
                                </div>
                            </div>
                        </div>
                    `
                };
                
                sendEmailWithRetry(mailOptions, 3, 3000)
                    .then(() => console.log(`✅ New OTP email sent automatically to ${user.email} after too many attempts`))
                    .catch(err => console.error(`❌ Failed to send new OTP email to ${user.email}:`, err.message));
                
                return res.json({ 
                    success: false, 
                    message: "Too many incorrect attempts. A new verification code has been generated and sent to your email. Please check your inbox.",
                    actionRequired: "code_regenerated",
                    codeSent: true
                });
            }
            
            return res.json({ 
                success: false, 
                message: `Incorrect verification code. Please check and try again. ${remainingAttempts > 0 ? `(${remainingAttempts} attempt${remainingAttempts !== 1 ? 's' : ''} remaining)` : ''}`,
                remainingAttempts
            });
        }

        // OTP is valid - verify the account
        const previousVerified = user.isAccountVerified;
        user.isAccountVerified = true;
        user.verifyOtp = "";
        user.verifyOtpExpireAt = 0;
        user.verifyOtpAttempts = 0; // Reset attempts
        user.verifyOtpLastAttempt = 0; // Reset last attempt
        await user.save();

        // Log successful OTP verification - don't await, fire and forget
        const clientIp = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'] || 'Unknown';
        const userAgent = req.headers['user-agent'] || 'Unknown';
        
        createAuditLog({
            userId: user._id,
            userEmail: user.email,
            userRole: user.role,
            actionType: 'EMAIL_VERIFICATION',
            resourceType: 'user',
            resourceId: user._id,
            ipAddress: clientIp,
            userAgent: userAgent,
            requestMethod: req.method,
            requestEndpoint: req.path,
            responseStatus: 200,
            success: true,
            previousValues: { isAccountVerified: previousVerified },
            newValues: { isAccountVerified: true }
        }).catch(err => console.error('Failed to log audit:', err));

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

// ===================== CHECK OTP STATUS =====================
/**
 * Check OTP status without consuming it (helpful for debugging and user feedback)
 */
export const checkOtpStatus = async (req, res) => {
    try {
        let { email } = req.body;
        
        // Normalize email
        email = email?.trim().toLowerCase();
        
        if (!email) {
            return res.json({ success: false, message: "Email is required" });
        }

        const user = await userModel.findOne({ email: email.toLowerCase() });
        if (!user) {
            return res.json({ success: false, message: "User not found" });
        }

        // Roles that do NOT require email verification
        const rolesNotRequiringVerification = ['CRD Staff', 'System Administrator', 'Department/Organization'];
        const isRoleExempt = rolesNotRequiringVerification.includes(user.role);
        
        if (isRoleExempt || user.isAccountVerified) {
            return res.json({ 
                success: true, 
                message: "Account is verified",
                verified: true,
                requiresOtp: false
            });
        }

        const hasOtp = !!(user.verifyOtp && user.verifyOtp !== "");
        const isExpired = user.verifyOtpExpireAt < Date.now();
        const remainingAttempts = Math.max(0, 5 - (user.verifyOtpAttempts || 0));
        const timeUntilExpiry = user.verifyOtpExpireAt > Date.now() 
            ? Math.floor((user.verifyOtpExpireAt - Date.now()) / 1000 / 60) // minutes
            : 0;

        return res.json({
            success: true,
            verified: false,
            requiresOtp: true,
            hasOtp: hasOtp && !isExpired,
            isExpired: isExpired,
            remainingAttempts: remainingAttempts,
            timeUntilExpiry: timeUntilExpiry, // in minutes
            message: hasOtp 
                ? (isExpired 
                    ? "OTP has expired. Please request a new code."
                    : `OTP is valid for ${timeUntilExpiry} more minute${timeUntilExpiry !== 1 ? 's' : ''}.`)
                : "No OTP found. Please request a verification code."
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
        
        try {
            const emailResult = await sendEmailWithRetry(mailOptions, 3, 3000);
            console.log(`✅ Password reset OTP email sent successfully to ${email} (MessageId: ${emailResult.messageId || 'N/A'})`);
            
            // Log password reset request - don't await, fire and forget
            const clientIp = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'] || 'Unknown';
            const userAgent = req.headers['user-agent'] || 'Unknown';
            
            createAuditLog({
                userId: user._id,
                userEmail: user.email,
                userRole: user.role,
                actionType: 'PASSWORD_RESET_REQUEST',
                resourceType: 'user',
                resourceId: user._id,
                ipAddress: clientIp,
                userAgent: userAgent,
                requestMethod: req.method,
                requestEndpoint: req.path,
                responseStatus: 200,
                success: true
            }).catch(err => console.error('Failed to log audit:', err));

            return res.json({ success: true, message: "Password reset code sent to your email" });
        } catch (emailError) {
            console.error(`❌ Failed to send password reset OTP email to ${email}:`, emailError);
            
            // Log email send failure - don't await, fire and forget
            const clientIp = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'] || 'Unknown';
            const userAgent = req.headers['user-agent'] || 'Unknown';
            
            createAuditLog({
                userId: user._id,
                userEmail: user.email,
                userRole: user.role,
                actionType: 'EMAIL_SEND_FAILURE',
                resourceType: 'user',
                resourceId: user._id,
                ipAddress: clientIp,
                userAgent: userAgent,
                requestMethod: req.method,
                requestEndpoint: req.path,
                responseStatus: 500,
                success: false,
                errorMessage: `Failed to send password reset OTP email: ${emailError.message}`
            }).catch(err => console.error('Failed to log audit:', err));
            
            // Provide more specific error message
            let errorMessage = "Failed to send password reset email after multiple attempts. Please try again later.";
            if (emailError.code === 'EAUTH' || emailError.message?.includes('authentication')) {
                errorMessage = "Email service authentication failed. Please contact support.";
            } else if (emailError.code === 'ECONNECTION' || emailError.code === 'ETIMEDOUT' || emailError.message?.includes('timeout') || emailError.message?.includes('Connection')) {
                errorMessage = "Email service connection timed out. Please try again in a few moments. If the problem persists, contact support.";
            } else if (emailError.code === 'ESOCKET') {
                errorMessage = "Email service socket error. Please try again in a few moments.";
            } else if (emailError.responseCode) {
                errorMessage = `Email service error (${emailError.responseCode}): ${emailError.response || 'Please try again later'}`;
            }
            
            return res.json({ success: false, message: errorMessage });
        }

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
            // Log failed OTP verification (invalid) - don't await, fire and forget
            const clientIp = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'] || 'Unknown';
            const userAgent = req.headers['user-agent'] || 'Unknown';
            
            createAuditLog({
                userId: user._id,
                userEmail: user.email,
                userRole: user.role,
                actionType: 'PASSWORD_RESET_OTP_VERIFIED',
                resourceType: 'user',
                resourceId: user._id,
                ipAddress: clientIp,
                userAgent: userAgent,
                requestMethod: req.method,
                requestEndpoint: req.path,
                responseStatus: 400,
                success: false,
                errorMessage: 'Invalid OTP'
            }).catch(err => console.error('Failed to log audit:', err));
            
            return res.json({ success: false, message: "Invalid verification code. Please check and try again." });
        }

        if (user.resetOtpExpireAt < Date.now()) {
            // Log failed OTP verification (expired) - don't await, fire and forget
            const clientIp = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'] || 'Unknown';
            const userAgent = req.headers['user-agent'] || 'Unknown';
            
            createAuditLog({
                userId: user._id,
                userEmail: user.email,
                userRole: user.role,
                actionType: 'PASSWORD_RESET_OTP_VERIFIED',
                resourceType: 'user',
                resourceId: user._id,
                ipAddress: clientIp,
                userAgent: userAgent,
                requestMethod: req.method,
                requestEndpoint: req.path,
                responseStatus: 400,
                success: false,
                errorMessage: 'OTP expired'
            }).catch(err => console.error('Failed to log audit:', err));
            
            return res.json({ success: false, message: "Verification code has expired. Please request a new one." });
        }

        // Log successful OTP verification - don't await, fire and forget
        const clientIp = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'] || 'Unknown';
        const userAgent = req.headers['user-agent'] || 'Unknown';
        
        createAuditLog({
            userId: user._id,
            userEmail: user.email,
            userRole: user.role,
            actionType: 'PASSWORD_RESET_OTP_VERIFIED',
            resourceType: 'user',
            resourceId: user._id,
            ipAddress: clientIp,
            userAgent: userAgent,
            requestMethod: req.method,
            requestEndpoint: req.path,
            responseStatus: 200,
            success: true
        }).catch(err => console.error('Failed to log audit:', err));

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

        // Log password reset - don't await, fire and forget
        const clientIp = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'] || 'Unknown';
        const userAgent = req.headers['user-agent'] || 'Unknown';
        
        createAuditLog({
            userId: user._id,
            userEmail: user.email,
            userRole: user.role,
            actionType: 'PASSWORD_CHANGE',
            resourceType: 'user',
            resourceId: user._id,
            ipAddress: clientIp,
            userAgent: userAgent,
            requestMethod: req.method,
            requestEndpoint: req.path,
            responseStatus: 200,
            success: true
        }).catch(err => console.error('Failed to log audit:', err));

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

// ===================== TEST EMAIL (ADMIN ONLY) =====================
export const testEmail = async (req, res) => {
    try {
        // Check if user is admin
        if (!req.user || !['System Administrator', 'CRD Staff'].includes(req.user.role)) {
            return res.json({ success: false, message: "Unauthorized. Admin access required." });
        }

        const { email } = req.body;
        
        if (!email) {
            return res.json({ success: false, message: "Email address is required" });
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.json({ success: false, message: "Invalid email address format" });
        }

        // Get email service status
        const { getEmailServiceStatus } = await import("../config/nodemailer.js");
        const emailStatus = getEmailServiceStatus();

        const testMailOptions = {
            from: process.env.SENDER_EMAIL || 'noreply@eumatter.com',
            to: email,
            subject: "EuMatter - Test Email",
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
                    <div style="background-color: white; border-radius: 8px; padding: 30px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                        <div style="text-align: center; margin-bottom: 30px;">
                            <h2 style="color: #800000; font-size: 28px; margin: 0 0 10px 0;">✅ Test Email Successful</h2>
                        </div>
                        <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">Hello,</p>
                        <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                            This is a test email from EuMatter to verify that email sending is working correctly.
                        </p>
                        <div style="background: linear-gradient(135deg, #f0f0f0 0%, #e0e0e0 100%); padding: 25px; text-align: center; margin: 30px 0; border-radius: 8px; border: 2px solid #e5e7eb;">
                            <p style="color: #800000; font-size: 18px; margin: 0; font-weight: bold;">Email Service Status: ${emailStatus}</p>
                            <p style="color: #6b7280; font-size: 14px; margin: 10px 0 0 0;">Timestamp: ${new Date().toLocaleString()}</p>
                        </div>
                        <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin: 20px 0 0 0;">
                            If you received this email, it means the email configuration is working correctly!
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
                            This is a test email. Please do not reply.
                        </p>
                    </div>
                </div>
            `
        };

        try {
            const emailResult = await sendEmailWithRetry(testMailOptions, 3, 3000);
            
            console.log(`✅ Test email sent successfully to ${email} (MessageId: ${emailResult.messageId || 'N/A'})`);
            console.log(`   Email service status: ${emailStatus}`);
            console.log(`   Sent by: ${req.user.name} (${req.user.email})`);

            // Log test email - don't await, fire and forget
            const clientIp = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'] || 'Unknown';
            const userAgent = req.headers['user-agent'] || 'Unknown';
            
            createAuditLog({
                userId: req.user.id,
                userEmail: req.user.email,
                userRole: req.user.role,
                actionType: 'EMAIL_TEST',
                resourceType: 'system',
                ipAddress: clientIp,
                userAgent: userAgent,
                requestMethod: req.method,
                requestEndpoint: req.path,
                responseStatus: 200,
                success: true,
                newValues: {
                    testEmail: email,
                    emailServiceStatus: emailStatus,
                    messageId: emailResult.messageId
                }
            }).catch(err => console.error('Failed to log audit:', err));

            return res.json({ 
                success: true, 
                message: `Test email sent successfully to ${email}`,
                emailServiceStatus: emailStatus,
                messageId: emailResult.messageId
            });
        } catch (emailError) {
            console.error(`❌ Failed to send test email to ${email}:`, emailError);
            
            // Log test email failure - don't await, fire and forget
            const clientIp = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'] || 'Unknown';
            const userAgent = req.headers['user-agent'] || 'Unknown';
            
            createAuditLog({
                userId: req.user.id,
                userEmail: req.user.email,
                userRole: req.user.role,
                actionType: 'EMAIL_TEST',
                resourceType: 'system',
                ipAddress: clientIp,
                userAgent: userAgent,
                requestMethod: req.method,
                requestEndpoint: req.path,
                responseStatus: 500,
                success: false,
                errorMessage: `Failed to send test email: ${emailError.message || 'Unknown error'}`
            }).catch(err => console.error('Failed to log audit:', err));

            let errorMessage = "Failed to send test email after multiple attempts.";
            if (emailError.code === 'EAUTH') {
                errorMessage = "Email service authentication failed. Please check SMTP credentials.";
            } else if (emailError.code === 'ECONNECTION' || emailError.code === 'ETIMEDOUT') {
                errorMessage = "Email service connection timed out. Please check network connectivity and SMTP settings.";
            } else if (emailError.code === 'ESOCKET') {
                errorMessage = "Email service socket error. Please check SMTP configuration.";
            }

            return res.json({ 
                success: false, 
                message: errorMessage,
                error: emailError.message,
                emailServiceStatus: emailStatus
            });
        }

    } catch (error) {
        return res.json({ success: false, message: error.message });
    }
};

// ===================== EMAIL STATUS (ADMIN ONLY) =====================
export const getEmailStatus = async (req, res) => {
    try {
        // Check if user is admin
        if (!req.user || !['System Administrator', 'CRD Staff'].includes(req.user.role)) {
            return res.json({ success: false, message: "Unauthorized. Admin access required." });
        }

        const { getEmailServiceStatus } = await import("../config/nodemailer.js");
        const emailStatus = getEmailServiceStatus();

        const statusInfo = {
            status: emailStatus,
            smtpHost: process.env.SMTP_HOST ? '✓ Configured' : '✗ Not set',
            smtpPort: process.env.SMTP_PORT || '587 (default)',
            smtpUser: process.env.SMTP_USER ? '✓ Configured' : '✗ Not set',
            smtpPassword: process.env.SMTP_PASSWORD ? '✓ Configured' : '✗ Not set',
            senderEmail: process.env.SENDER_EMAIL || 'Not set',
            environment: process.env.NODE_ENV || 'development',
            isProduction: process.env.NODE_ENV === 'production' || process.env.RENDER === 'true'
        };

        return res.json({ 
            success: true, 
            emailService: statusInfo
        });

    } catch (error) {
        return res.json({ success: false, message: error.message });
    }
};

// ===================== LOGOUT =====================
export const logout = async (req, res) => {
    try {
        // Get user info before clearing cookie (if token exists)
        let userId = null;
        let userEmail = null;
        let userRole = null;
        
        try {
            const token = req.cookies.token;
            if (token) {
                const decoded = jwt.verify(token, process.env.JWT_SECRET);
                const user = await userModel.findById(decoded.id).select('email role');
                if (user) {
                    userId = user._id;
                    userEmail = user.email;
                    userRole = user.role;
                }
            }
        } catch (err) {
            // Token invalid or expired, continue with logout
        }

        res.clearCookie("token", cookieOptions);

        // Log logout event - don't await, fire and forget
        const clientIp = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'] || 'Unknown';
        const userAgent = req.headers['user-agent'] || 'Unknown';
        
        if (userId) {
            createAuditLog({
                userId: userId,
                userEmail: userEmail,
                userRole: userRole,
                actionType: 'USER_LOGOUT',
                resourceType: 'user',
                resourceId: userId,
                ipAddress: clientIp,
                userAgent: userAgent,
                requestMethod: req.method,
                requestEndpoint: req.path,
                responseStatus: 200,
                success: true
            }).catch(err => console.error('Failed to log audit:', err));
        }

        return res.json({ success: true, message: "Logged out successfully" });
    } catch (error) {
        return res.json({ success: false, message: error.message });
    }
};



