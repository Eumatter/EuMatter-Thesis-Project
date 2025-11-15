import transporter from '../config/nodemailer.js';
import userNotificationPreferencesModel from '../models/userNotificationPreferencesModel.js';

/**
 * Check if user has email notifications enabled and wants this type of notification
 */
async function shouldSendEmail(userId, notificationType) {
    try {
        const preferences = await userNotificationPreferencesModel.findOne({ userId });
        
        // If no preferences, default to enabled
        if (!preferences) {
            return true;
        }
        
        // Check if email is enabled
        if (!preferences.emailEnabled) {
            return false;
        }
        
        // Check notification type preference
        const typeMap = {
            'event_created': 'events',
            'event_updated': 'events',
            'event_cancelled': 'events',
            'event_reminder': 'events',
            'volunteer_invitation': 'volunteers',
            'volunteer_approved': 'volunteers',
            'volunteer_registered': 'volunteers',
            'volunteer_invitation_accepted': 'volunteers',
            'donation_received': 'donations',
            'donation_success': 'donations',
            'feedback_deadline': 'volunteers',
            'attendance_recorded': 'volunteers',
            'comment_added': 'social',
            'reaction_added': 'social'
        };
        
        const category = typeMap[notificationType] || 'system';
        return preferences.emailTypes?.[category] !== false;
    } catch (error) {
        console.error('Error checking email preferences:', error);
        return true; // Default to enabled on error
    }
}

/**
 * Get email template based on notification type
 */
function getEmailTemplate(type, title, message, payload = {}) {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const eventLink = payload.eventId ? `${frontendUrl}/user/events/${payload.eventId}` : `${frontendUrl}/notifications`;
    
    const baseTemplate = {
        event_created: {
            subject: `New Event: ${title}`,
            color: '#800000',
            icon: '📅'
        },
        event_updated: {
            subject: `Event Updated: ${title}`,
            color: '#0066cc',
            icon: '🔄'
        },
        volunteer_invitation: {
            subject: `Volunteer Invitation: ${title}`,
            color: '#800000',
            icon: '👥'
        },
        volunteer_approved: {
            subject: `Volunteer Application Approved`,
            color: '#28a745',
            icon: '✅'
        },
        donation_received: {
            subject: `Donation Received`,
            color: '#ffc107',
            icon: '💰'
        },
        feedback_deadline: {
            subject: `Feedback Deadline Reminder`,
            color: '#dc3545',
            icon: '⏰'
        }
    };
    
    const template = baseTemplate[type] || {
        subject: title,
        color: '#800000',
        icon: '🔔'
    };
    
    return {
        subject: template.subject,
        html: `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>${template.subject}</title>
            </head>
            <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
                <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 20px;">
                    <tr>
                        <td align="center">
                            <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                                <!-- Header -->
                                <tr>
                                    <td style="background: linear-gradient(135deg, #800000 0%, #a00000 100%); padding: 30px; text-align: center;">
                                        <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: bold;">
                                            ${template.icon} EuMatter
                                        </h1>
                                    </td>
                                </tr>
                                
                                <!-- Content -->
                                <tr>
                                    <td style="padding: 40px 30px;">
                                        <h2 style="color: ${template.color}; margin: 0 0 20px 0; font-size: 24px;">
                                            ${title}
                                        </h2>
                                        <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0;">
                                            ${message}
                                        </p>
                                        
                                        ${payload.eventId ? `
                                        <table width="100%" cellpadding="0" cellspacing="0">
                                            <tr>
                                                <td align="center" style="padding: 20px 0;">
                                                    <a href="${eventLink}" 
                                                       style="display: inline-block; background: linear-gradient(135deg, #800000 0%, #a00000 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-weight: bold; font-size: 16px;">
                                                        View Event
                                                    </a>
                                                </td>
                                            </tr>
                                        </table>
                                        ` : ''}
                                    </td>
                                </tr>
                                
                                <!-- Footer -->
                                <tr>
                                    <td style="background-color: #f9f9f9; padding: 20px 30px; text-align: center; border-top: 1px solid #e0e0e0;">
                                        <p style="color: #666666; font-size: 12px; margin: 0;">
                                            This is an automated message from EuMatter.<br>
                                            You can manage your notification preferences in your account settings.
                                        </p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                </table>
            </body>
            </html>
        `
    };
}

/**
 * Send email notification to a user
 */
export async function sendEmailNotification(userId, userEmail, title, message, payload = {}) {
    try {
        // Check if email notifications should be sent
        const shouldSend = await shouldSendEmail(userId, payload.type || 'system');
        if (!shouldSend) {
            return { sent: false, reason: 'User disabled email notifications for this type' };
        }
        
        if (!userEmail) {
            return { sent: false, reason: 'No email address provided' };
        }
        
        // Get email template
        const emailTemplate = getEmailTemplate(payload.type || 'system', title, message, payload);
        
        // Send email
        const mailOptions = {
            from: process.env.SENDER_EMAIL || 'noreply@eumatter.com',
            to: userEmail,
            subject: emailTemplate.subject,
            html: emailTemplate.html
        };
        
        await transporter.sendMail(mailOptions);
        
        return { sent: true };
    } catch (error) {
        console.error('Error sending email notification:', error);
        return { sent: false, error: error.message };
    }
}

/**
 * Send email notification to multiple users
 */
export async function sendEmailNotifications(userData, title, message, payload = {}) {
    if (!Array.isArray(userData) || userData.length === 0) {
        return { totalSent: 0, totalFailed: 0 };
    }
    
    let totalSent = 0;
    let totalFailed = 0;
    
    const results = await Promise.all(
        userData.map(async (user) => {
            const result = await sendEmailNotification(
                user._id || user.id,
                user.email,
                title,
                message,
                payload
            );
            if (result.sent) {
                totalSent++;
            } else {
                totalFailed++;
            }
            return result;
        })
    );
    
    return { totalSent, totalFailed };
}

