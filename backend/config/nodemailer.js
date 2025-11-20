import nodemailer from 'nodemailer'

// Validate required environment variables
const requiredEnvVars = ['SMTP_HOST', 'SMTP_USER', 'SMTP_PASSWORD', 'SENDER_EMAIL'];
const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
    console.error('❌ Missing required SMTP environment variables:');
    missingVars.forEach(varName => console.error(`   - ${varName}`));
    console.error('   Email sending will fail. Please configure these variables.');
}

const port = Number(process.env.SMTP_PORT || 587)
const isProduction = process.env.NODE_ENV === 'production' || process.env.RENDER === 'true'

// Increase timeouts for production/cloud environments
const connectionTimeout = isProduction ? 30000 : 15000; // 30s for production, 15s for dev
const greetingTimeout = isProduction ? 30000 : 15000;
const socketTimeout = isProduction ? 30000 : 15000;

// Connection pooling causes issues in cloud environments like Render.com
// Use direct connections instead of pooling for better reliability
const usePooling = process.env.EMAIL_USE_POOLING === 'true' && !isProduction;

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: port === 465,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD
    },
    // Connection timeout and retry options - increased for cloud environments
    connectionTimeout: isProduction ? 60000 : connectionTimeout, // 60s for production
    greetingTimeout: isProduction ? 60000 : greetingTimeout, // 60s for production
    socketTimeout: isProduction ? 60000 : socketTimeout, // 60s for production
    // Retry configuration - disable pooling in production/cloud
    pool: usePooling,
    maxConnections: usePooling ? 5 : 1, // Single connection when not pooling
    maxMessages: usePooling ? 100 : 1,
    rateLimit: usePooling ? 14 : false, // Disable rate limiting when not pooling
    // Enable debug in development
    debug: process.env.NODE_ENV === 'development',
    logger: process.env.NODE_ENV === 'development',
    // Additional options for better reliability
    tls: {
        rejectUnauthorized: false // Allow self-signed certificates if needed
    },
    // Connection options for better reliability
    requireTLS: port === 587, // Require TLS for port 587
    requireSSL: port === 465 // Require SSL for port 465
})

// Non-blocking connection verification with timeout
let emailServiceStatus = 'pending';

if (process.env.VERIFY_EMAIL_CONNECTION !== 'false') {
    // Use setImmediate to make verification truly non-blocking
    setImmediate(() => {
        // Use setTimeout to add a timeout wrapper
        const verificationTimeout = setTimeout(() => {
            if (emailServiceStatus === 'pending') {
                emailServiceStatus = 'timeout';
                console.warn('⚠️ Email service verification timed out after 20 seconds.');
                console.warn('   This is common in cloud environments (Render, Heroku, etc.).');
                console.warn('   Email sending will still work - verification is just a startup check.');
                console.warn('   To disable verification, set VERIFY_EMAIL_CONNECTION=false');
            }
        }, 20000); // 20 second timeout for verification

        transporter.verify((error, success) => {
            clearTimeout(verificationTimeout);
            
            if (error) {
                emailServiceStatus = 'failed';
                console.error('❌ Email service connection verification failed:', error.message);
                console.error('   Error code:', error.code || 'N/A');
                console.error('   Note: Email sending will still be attempted when needed.');
                if (missingVars.length > 0) {
                    console.error('   ⚠️ Some required environment variables are missing - check above.');
                }
            } else {
                emailServiceStatus = 'verified';
                console.log('✅ Email service connection verified successfully');
                console.log(`   SMTP Host: ${process.env.SMTP_HOST || 'Not set'}`);
                console.log(`   SMTP Port: ${port}`);
                console.log(`   Sender Email: ${process.env.SENDER_EMAIL || 'Not set'}`);
                console.log(`   Environment: ${isProduction ? 'Production' : 'Development'}`);
            }
        });
    });
} else {
    emailServiceStatus = 'skipped';
    console.log('📧 Email service verification skipped (VERIFY_EMAIL_CONNECTION=false)');
}

// Export status for monitoring
export const getEmailServiceStatus = () => emailServiceStatus;

/**
 * Validate email address format
 * @param {String} email - Email address to validate
 * @returns {Boolean} True if valid email format
 */
const isValidEmail = (email) => {
    if (!email || typeof email !== 'string') return false;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};

/**
 * Get the correct sender email address
 * Priority: SENDER_EMAIL > SMTP_USER > fallback
 * Many SMTP servers require the "from" address to match the authenticated user
 * @returns {String} Valid sender email address
 */
export const getSenderEmail = () => {
    // Priority 1: Use SENDER_EMAIL if set and valid
    if (process.env.SENDER_EMAIL && isValidEmail(process.env.SENDER_EMAIL)) {
        return process.env.SENDER_EMAIL;
    }
    
    // Priority 2: Use SMTP_USER if it's a valid email (most SMTP servers require this)
    if (process.env.SMTP_USER && isValidEmail(process.env.SMTP_USER)) {
        console.warn(`⚠️ SENDER_EMAIL not set or invalid. Using SMTP_USER as sender: ${process.env.SMTP_USER}`);
        return process.env.SMTP_USER;
    }
    
    // Priority 3: Fallback (should not happen if env vars are set correctly)
    console.error(`❌ Neither SENDER_EMAIL nor SMTP_USER is a valid email. Using fallback.`);
    return 'noreply@eumatter.com';
};

/**
 * Send email with retry logic
 * @param {Object} mailOptions - Nodemailer mail options
 * @param {Number} maxRetries - Maximum number of retry attempts (default: 3)
 * @param {Number} initialDelay - Initial delay in ms before retry (default: 1000)
 * @returns {Promise<Object>} Email result
 */
export const sendEmailWithRetry = async (mailOptions, maxRetries = 5, initialDelay = 3000) => {
    // Validate email configuration
    if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASSWORD) {
        const errorMsg = 'SMTP configuration is incomplete. Please check environment variables: SMTP_HOST, SMTP_USER, SMTP_PASSWORD';
        console.error(`❌ ${errorMsg}`);
        throw new Error(errorMsg);
    }
    
    // Validate and set sender email
    // Many SMTP servers require the "from" address to match the authenticated user
    if (!mailOptions.from) {
        mailOptions.from = getSenderEmail();
    }
    
    // Validate the from email
    if (!isValidEmail(mailOptions.from)) {
        throw new Error(`Invalid sender email address: ${mailOptions.from}. Please set SENDER_EMAIL or ensure SMTP_USER is a valid email.`);
    }
    
    // Warn if SENDER_EMAIL doesn't match SMTP_USER (some servers require them to match)
    if (process.env.SENDER_EMAIL && process.env.SMTP_USER && 
        process.env.SENDER_EMAIL !== process.env.SMTP_USER) {
        console.warn(`⚠️ SENDER_EMAIL (${process.env.SENDER_EMAIL}) differs from SMTP_USER (${process.env.SMTP_USER})`);
        console.warn(`   Some SMTP servers require these to match. If you see "Invalid from" errors, set SENDER_EMAIL=${process.env.SMTP_USER}`);
    }
    
    // Validate recipient email
    if (!mailOptions.to) {
        throw new Error('Recipient email address is required');
    }
    
    if (!isValidEmail(mailOptions.to)) {
        throw new Error(`Invalid recipient email address: ${mailOptions.to}`);
    }
    
    // Ensure subject is set
    if (!mailOptions.subject) {
        mailOptions.subject = 'EuMatter Notification';
    }
    
    let lastError = null;
    
    // Create a new transporter for each attempt to avoid connection pool issues
    const createFreshTransporter = () => {
        return nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port,
            secure: port === 465,
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASSWORD
            },
            // Use reasonable timeouts - even slow SMTP servers should respond within 30s
            connectionTimeout: isProduction ? 30000 : connectionTimeout, // 30s for production
            greetingTimeout: isProduction ? 30000 : greetingTimeout, // 30s for production
            socketTimeout: isProduction ? 30000 : socketTimeout, // 30s for production
            pool: false, // Never use pooling for fresh connections
            tls: {
                rejectUnauthorized: false
            },
            requireTLS: port === 587,
            requireSSL: port === 465
        });
    };
    
    // Log email attempt start
    console.log(`📧 Attempting to send email to ${mailOptions.to} (Subject: ${mailOptions.subject})`);
    console.log(`   Retry attempts: ${maxRetries + 1} total`);
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        // Always use fresh transporter in production/cloud to avoid connection issues
        // In development, use fresh transporter after first attempt
        const useFreshTransporter = isProduction || attempt > 0;
        const attemptTransporter = useFreshTransporter ? createFreshTransporter() : transporter;
        
        if (attempt > 0) {
            console.log(`   Retry attempt ${attempt + 1}/${maxRetries + 1} for ${mailOptions.to}`);
        }
        
        try {
            // Add timeout wrapper for the entire send operation
            // Use reasonable timeout to fail fast if SMTP is unresponsive
            // Even cloud SMTP servers should respond within 30 seconds
            const emailTimeout = isProduction ? 30000 : 20000; // 30s for production, 20s for dev
            const sendPromise = attemptTransporter.sendMail(mailOptions);
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => {
                    const timeoutError = new Error(`Email send operation timed out after ${emailTimeout / 1000} seconds`);
                    timeoutError.code = 'ETIMEDOUT';
                    reject(timeoutError);
                }, emailTimeout);
            });
            
            const result = await Promise.race([sendPromise, timeoutPromise]);
            
            // Close fresh transporter if we created one
            if (useFreshTransporter && attemptTransporter.close) {
                try {
                    const closeResult = attemptTransporter.close();
                    if (closeResult && typeof closeResult.catch === 'function') {
                        closeResult.catch(() => {}); // Ignore close errors
                    }
                } catch (closeError) {
                    // Ignore close errors silently
                }
            }
            
            // Success logging
            const attemptInfo = attempt > 0 ? ` on attempt ${attempt + 1}/${maxRetries + 1}` : '';
            console.log(`✅ Email sent successfully${attemptInfo} to ${mailOptions.to}`);
            console.log(`   MessageId: ${result.messageId || 'N/A'}`);
            console.log(`   Subject: ${mailOptions.subject}`);
            console.log(`   Timestamp: ${new Date().toISOString()}`);
            
            return result;
        } catch (error) {
            // Close fresh transporter on error
            if (useFreshTransporter && attemptTransporter.close) {
                try {
                    const closeResult = attemptTransporter.close();
                    if (closeResult && typeof closeResult.catch === 'function') {
                        closeResult.catch(() => {}); // Ignore close errors
                    }
                } catch (closeError) {
                    // Ignore close errors silently
                }
            }
            
            lastError = error;
            
            // Check for "Invalid from" error specifically
            const isInvalidFromError = 
                error.message?.includes('Invalid from') ||
                error.message?.includes('invalid from') ||
                error.response?.includes('Invalid from') ||
                error.response?.includes('451') ||
                (error.responseCode === 451 && error.message?.includes('from'));
            
            if (isInvalidFromError) {
                console.error(`❌ Invalid "from" email address error detected.`);
                console.error(`   Current from: ${mailOptions.from}`);
                console.error(`   SMTP_USER: ${process.env.SMTP_USER || 'Not set'}`);
                console.error(`   SENDER_EMAIL: ${process.env.SENDER_EMAIL || 'Not set'}`);
                console.error(`   Solution: Set SENDER_EMAIL to match SMTP_USER, or ensure both are set correctly.`);
                console.error(`   Many SMTP servers require the "from" address to match the authenticated user email.`);
                // Don't retry invalid from errors - they won't succeed
                throw new Error(`Invalid "from" email address. The "from" address (${mailOptions.from}) must match your SMTP authenticated user (${process.env.SMTP_USER || 'not set'}). Please set SENDER_EMAIL environment variable to match SMTP_USER.`);
            }
            
            // Consider timeout errors as retryable - they might succeed on retry
            const isRetryable = 
                error.code === 'ECONNECTION' || 
                error.code === 'ETIMEDOUT' ||
                error.code === 'ESOCKET' ||
                error.code === 'EAUTH' ||
                error.message?.includes('timeout') ||
                error.message?.includes('Timed out') ||
                error.message?.includes('Connection') ||
                error.message?.includes('timed out') ||
                error.message?.includes('Connection timeout') ||
                error.message?.includes('Socket timeout') ||
                (error.responseCode && error.responseCode >= 500 && error.responseCode < 600);
            
            // Don't retry on last attempt or non-retryable errors
            if (attempt === maxRetries || !isRetryable) {
                // Log detailed error information
                console.error(`❌ Email send failed after ${attempt + 1} attempt(s) to ${mailOptions.to}:`, {
                    to: mailOptions.to,
                    subject: mailOptions.subject,
                    error: error.message,
                    code: error.code,
                    responseCode: error.responseCode,
                    command: error.command,
                    response: error.response,
                    stack: isProduction ? undefined : error.stack // Only log stack in dev
                });
                console.error(`   Final error: ${error.message}`);
                if (error.code) console.error(`   Error code: ${error.code}`);
                if (error.responseCode) console.error(`   Response code: ${error.responseCode}`);
                
                throw error;
            }
            
            // Calculate delay with exponential backoff (longer delays for cloud)
            const delay = initialDelay * Math.pow(2, attempt);
            console.warn(`⚠️ Email send failed (attempt ${attempt + 1}/${maxRetries + 1}) to ${mailOptions.to}: ${error.message}`);
            console.warn(`   Error code: ${error.code || 'N/A'}`);
            if (error.responseCode) console.warn(`   Response code: ${error.responseCode}`);
            console.warn(`   Retrying in ${delay}ms...`);
            
            // Wait before retrying
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
    
    throw lastError;
};

export default transporter;