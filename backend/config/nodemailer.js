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

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: port === 465,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD
    },
    // Connection timeout and retry options
    connectionTimeout: connectionTimeout,
    greetingTimeout: greetingTimeout,
    socketTimeout: socketTimeout,
    // Retry configuration
    pool: true,
    maxConnections: 5,
    maxMessages: 100,
    rateLimit: 14, // Limit to 14 messages per second (Brevo limit)
    // Enable debug in development
    debug: process.env.NODE_ENV === 'development',
    logger: process.env.NODE_ENV === 'development',
    // Additional options for better reliability
    tls: {
        rejectUnauthorized: false // Allow self-signed certificates if needed
    }
})

// Non-blocking connection verification with timeout
let emailServiceStatus = 'pending';

if (process.env.VERIFY_EMAIL_CONNECTION !== 'false') {
    // Use setTimeout to make verification non-blocking and add a timeout
    const verificationTimeout = setTimeout(() => {
        if (emailServiceStatus === 'pending') {
            emailServiceStatus = 'timeout';
            console.warn('⚠️ Email service verification timed out. Email sending will still work, but verification is incomplete.');
            console.warn('   This is common in cloud environments. Email sending will be attempted when needed.');
        }
    }, 20000); // 20 second timeout for verification

    transporter.verify((error, success) => {
        clearTimeout(verificationTimeout);
        
        if (error) {
            emailServiceStatus = 'failed';
            console.error('❌ Email service connection verification failed:', error.message);
            console.error('   Error code:', error.code || 'N/A');
            console.error('   Note: Email sending will still be attempted when needed.');
            console.error('   Please verify SMTP configuration if emails fail to send:');
            console.error('   - SMTP_HOST');
            console.error('   - SMTP_PORT');
            console.error('   - SMTP_USER');
            console.error('   - SMTP_PASSWORD');
            console.error('   - SENDER_EMAIL');
        } else {
            emailServiceStatus = 'verified';
            console.log('✅ Email service connection verified successfully');
            console.log(`   SMTP Host: ${process.env.SMTP_HOST || 'Not set'}`);
            console.log(`   SMTP Port: ${port}`);
            console.log(`   Sender Email: ${process.env.SENDER_EMAIL || 'Not set'}`);
        }
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
export const sendEmailWithRetry = async (mailOptions, maxRetries = 3, initialDelay = 1000) => {
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
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            const result = await transporter.sendMail(mailOptions);
            if (attempt > 0) {
                console.log(`✅ Email sent successfully on attempt ${attempt + 1}/${maxRetries + 1} to ${mailOptions.to}`);
            } else {
                console.log(`✅ Email sent successfully to ${mailOptions.to} (MessageId: ${result.messageId || 'N/A'})`);
            }
            return result;
        } catch (error) {
            lastError = error;
            const isRetryable = 
                error.code === 'ECONNECTION' || 
                error.code === 'ETIMEDOUT' ||
                error.message?.includes('timeout') ||
                error.message?.includes('Connection') ||
                error.code === 'ESOCKET' ||
                error.code === 'ETIMEDOUT' ||
                (error.responseCode >= 500 && error.responseCode < 600);
            
            // Don't retry on last attempt or non-retryable errors
            if (attempt === maxRetries || !isRetryable) {
                // Log detailed error information
                console.error(`❌ Email send failed after ${attempt + 1} attempt(s):`, {
                    to: mailOptions.to,
                    subject: mailOptions.subject,
                    error: error.message,
                    code: error.code,
                    responseCode: error.responseCode,
                    command: error.command
                });
                throw error;
            }
            
            // Calculate delay with exponential backoff
            const delay = initialDelay * Math.pow(2, attempt);
            console.warn(`⚠️ Email send failed (attempt ${attempt + 1}/${maxRetries + 1}) to ${mailOptions.to}: ${error.message}`);
            console.warn(`   Retrying in ${delay}ms...`);
            
            // Wait before retrying
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
    
    throw lastError;
};

export default transporter;