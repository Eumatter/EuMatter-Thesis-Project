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
 * Send email with retry logic
 * @param {Object} mailOptions - Nodemailer mail options
 * @param {Number} maxRetries - Maximum number of retry attempts (default: 3)
 * @param {Number} initialDelay - Initial delay in ms before retry (default: 1000)
 * @returns {Promise<Object>} Email result
 */
export const sendEmailWithRetry = async (mailOptions, maxRetries = 4, initialDelay = 3000) => {
    // Validate email configuration
    if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASSWORD) {
        throw new Error('SMTP configuration is incomplete. Please check environment variables: SMTP_HOST, SMTP_USER, SMTP_PASSWORD');
    }
    
    // Validate sender email
    if (!mailOptions.from) {
        mailOptions.from = process.env.SENDER_EMAIL || 'noreply@eumatter.com';
    }
    
    if (!isValidEmail(mailOptions.from)) {
        throw new Error(`Invalid sender email address: ${mailOptions.from}`);
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
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        let attemptTransporter = transporter;
        
        // Use fresh transporter for retries to avoid stale connections
        if (attempt > 0 || isProduction) {
            attemptTransporter = createFreshTransporter();
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
            if (attemptTransporter !== transporter && attemptTransporter.close) {
                try {
                    const closeResult = attemptTransporter.close();
                    if (closeResult && typeof closeResult.catch === 'function') {
                        closeResult.catch(() => {}); // Ignore close errors
                    }
                } catch (closeError) {
                    // Ignore close errors silently
                }
            }
            
            if (attempt > 0) {
                console.log(`✅ Email sent successfully on attempt ${attempt + 1}/${maxRetries + 1} to ${mailOptions.to}`);
            } else {
                console.log(`✅ Email sent successfully to ${mailOptions.to} (MessageId: ${result.messageId || 'N/A'})`);
            }
            return result;
        } catch (error) {
            // Close fresh transporter on error
            if (attemptTransporter !== transporter && attemptTransporter.close) {
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
            // Consider timeout errors as retryable - they might succeed on retry
            const isRetryable = 
                error.code === 'ECONNECTION' || 
                error.code === 'ETIMEDOUT' ||
                error.code === 'ESOCKET' ||
                error.message?.includes('timeout') ||
                error.message?.includes('Timed out') ||
                error.message?.includes('Connection') ||
                error.message?.includes('timed out') ||
                (error.responseCode && error.responseCode >= 500 && error.responseCode < 600);
            
            // Don't retry on last attempt or non-retryable errors
            if (attempt === maxRetries || !isRetryable) {
                // Log detailed error information
                console.error(`❌ Email send failed after ${attempt + 1} attempt(s):`, {
                    to: mailOptions.to,
                    subject: mailOptions.subject,
                    error: error.message,
                    code: error.code,
                    responseCode: error.responseCode,
                    command: error.command,
                    stack: isProduction ? undefined : error.stack // Only log stack in dev
                });
                throw error;
            }
            
            // Calculate delay with exponential backoff (longer delays for cloud)
            const delay = initialDelay * Math.pow(2, attempt);
            console.warn(`⚠️ Email send failed (attempt ${attempt + 1}/${maxRetries + 1}) to ${mailOptions.to}: ${error.message}`);
            console.warn(`   Error code: ${error.code || 'N/A'}`);
            console.warn(`   Retrying in ${delay}ms...`);
            
            // Wait before retrying
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
    
    throw lastError;
};

export default transporter;