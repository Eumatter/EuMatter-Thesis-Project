import nodemailer from 'nodemailer'

const port = Number(process.env.SMTP_PORT || 587)
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: port === 465,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD
    },
    // Add connection timeout and retry options
    connectionTimeout: 10000, // 10 seconds
    greetingTimeout: 10000,
    socketTimeout: 10000,
    // Enable debug in development
    debug: process.env.NODE_ENV === 'development',
    logger: process.env.NODE_ENV === 'development'
})

// Verify connection on startup (optional, can be disabled)
if (process.env.VERIFY_EMAIL_CONNECTION !== 'false') {
    transporter.verify((error, success) => {
        if (error) {
            console.error('❌ Email service connection failed:', error.message);
            console.error('   Please check your SMTP configuration in environment variables:');
            console.error('   - SMTP_HOST');
            console.error('   - SMTP_PORT');
            console.error('   - SMTP_USER');
            console.error('   - SMTP_PASSWORD');
            console.error('   - SENDER_EMAIL');
        } else {
            console.log('✅ Email service connection verified successfully');
            console.log(`   SMTP Host: ${process.env.SMTP_HOST || 'Not set'}`);
            console.log(`   SMTP Port: ${port}`);
            console.log(`   Sender Email: ${process.env.SENDER_EMAIL || 'Not set'}`);
        }
    });
}

export default transporter;