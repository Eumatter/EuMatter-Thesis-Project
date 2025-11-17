import pdfkit from "pdfkit";
import fs from "fs";
import path from "path";
import donationModel from "../models/donationModel.js";
import paymongoClient, { getPaymongoPublicKey } from "../config/paymongo.js";
import { notifyUsers } from "../utils/notify.js";
import eventModel from "../models/eventModel.js";
import transporter from "../config/nodemailer.js";
import userModel from "../models/userModel.js";



const toCentavos = (amount) => Math.round(Number(amount) * 100);

// Generate receipt PDF as buffer (in-memory, not saved to disk)
const generateReceiptPDF = async (donation) => {
    return new Promise((resolve, reject) => {
        try {
            const doc = new pdfkit({ size: "A4", margin: 60 });
            const chunks = [];
            
            doc.on('data', chunk => chunks.push(chunk));
            doc.on('end', () => resolve(Buffer.concat(chunks)));
            doc.on('error', reject);
            
            // Header Section with Maroon Background
            doc.save();
            doc.fillColor('#800020');
            doc.rect(0, 0, 612, 130);
            doc.fill();
            doc.restore();
            
            // Header Text (White)
            doc.fillColor('#FFFFFF');
            doc.fontSize(34).font('Helvetica-Bold');
            doc.text('EUMATTER', 60, 40, { align: 'center', width: 492 });
            doc.fontSize(15).font('Helvetica');
            doc.text('Community Relations Department', 60, 75, { align: 'center', width: 492 });
            doc.fontSize(12);
            doc.text('Enverga University', 60, 95, { align: 'center', width: 492 });
            
            // Reset color for body
            doc.fillColor('#000000');
            doc.strokeColor('#000000');
            
            // Receipt Title
            doc.y = 160;
            doc.fontSize(28).font('Helvetica-Bold');
            doc.text('DONATION RECEIPT', 60, doc.y, { align: 'center', width: 492 });
            
            // Receipt Number
            doc.y += 30;
            doc.fontSize(12).font('Helvetica');
            doc.fillColor('#666666');
            doc.text(`Receipt No: ${donation._id.toString().substring(0, 8).toUpperCase()}`, 60, doc.y, { align: 'center', width: 492 });
            doc.fillColor('#000000');
            
            // Separator Line
            doc.y += 25;
            doc.strokeColor('#800020');
            doc.lineWidth(2);
            doc.moveTo(60, doc.y);
            doc.lineTo(552, doc.y);
            doc.stroke();
            
            // Donor Information Section
            doc.y += 25;
            doc.fontSize(16).font('Helvetica-Bold');
            doc.text('Donor Information', 60, doc.y, { underline: true });
            
            doc.y += 25;
            doc.fontSize(13).font('Helvetica');
            doc.text(`Name: ${donation.donorName}`, 85, doc.y);
            doc.y += 20;
            doc.text(`Email: ${donation.donorEmail}`, 85, doc.y);
            
            // Donation Details Section
            doc.y += 30;
            doc.fontSize(16).font('Helvetica-Bold');
            doc.text('Donation Details', 60, doc.y, { underline: true });
            
            doc.y += 25;
            // Amount - Large and prominent
            doc.fontSize(20).font('Helvetica-Bold');
            doc.fillColor('#800020');
            doc.text(`Amount: PHP ${donation.amount.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 85, doc.y);
            doc.fillColor('#000000');
            
            doc.y += 25;
            doc.fontSize(13).font('Helvetica');
            doc.text(`Payment Method: ${donation.paymentMethod.charAt(0).toUpperCase() + donation.paymentMethod.slice(1)}`, 85, doc.y);
            
            if (donation.event && donation.event.title) {
                doc.y += 20;
                doc.text(`Event: ${donation.event.title}`, 85, doc.y);
            }
            
            // Date and Time
            doc.y += 20;
            const date = new Date(donation.createdAt);
            const formattedDate = date.toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
            doc.text(`Date: ${formattedDate}`, 85, doc.y);
            
            if (donation.paymongoReferenceId) {
                doc.y += 20;
                doc.fontSize(10);
                doc.fillColor('#666666');
                doc.text(`Payment Transaction ID: ${donation.paymongoReferenceId}`, 85, doc.y);
                doc.y += 15;
                doc.fontSize(9);
                doc.fillColor('#888888');
                doc.text(`Note: For payment transaction details, please refer to your ${donation.paymentMethod === 'gcash' ? 'GCash' : donation.paymentMethod === 'paymaya' ? 'PayMaya' : donation.paymentMethod.toUpperCase()} receipt.`, 85, doc.y, { width: 472, align: 'left' });
                doc.fillColor('#000000');
            }
            
            // Message Section (if exists)
            if (donation.message && donation.message.trim() !== '') {
                doc.y += 30;
                doc.fontSize(16).font('Helvetica-Bold');
                doc.text('Message', 60, doc.y, { underline: true });
                doc.y += 25;
                doc.fontSize(12).font('Helvetica');
                doc.fillColor('#333333');
                doc.text(donation.message, 85, doc.y, { width: 472, align: 'left' });
                doc.y += 40;
                doc.fillColor('#000000');
            }
            
            // Separator Line
            doc.y += 25;
            doc.strokeColor('#800020');
            doc.lineWidth(2);
            doc.moveTo(60, doc.y);
            doc.lineTo(552, doc.y);
            doc.stroke();
            
            // Status Badge
            doc.y += 25;
            const statusY = doc.y;
            const statusWidth = 220;
            const statusX = (612 - statusWidth) / 2;
            const statusHeight = 35;
            
            doc.save();
            doc.fillColor('#E6F7E6');
            doc.rect(statusX, statusY, statusWidth, statusHeight);
            doc.fill();
            
            doc.strokeColor('#006600');
            doc.lineWidth(2);
            doc.rect(statusX, statusY, statusWidth, statusHeight);
            doc.stroke();
            doc.restore();
            
            doc.fillColor('#006600');
            doc.fontSize(14).font('Helvetica-Bold');
            doc.text('✓ PAYMENT SUCCEEDED', statusX, statusY + 11, { 
                width: statusWidth, 
                align: 'center'
            });
            doc.fillColor('#000000');
            
            doc.y = statusY + statusHeight + 20;
            
            // Footer Section
            doc.fontSize(12).font('Helvetica');
            doc.fillColor('#666666');
            doc.text('Thank you for your generous donation!', 60, doc.y, { align: 'center', width: 492 });
            doc.y += 20;
            doc.fontSize(11);
            doc.text('This is an official acknowledgment receipt from EUMATTER.', 60, doc.y, { align: 'center', width: 492 });
            doc.y += 15;
            doc.fontSize(10);
            doc.fillColor('#555555');
            doc.text('This receipt serves as official proof of your donation for organizational records.', 60, doc.y, { align: 'center', width: 492 });
            doc.y += 15;
            doc.text('For payment transaction details, please refer to your payment provider receipt', 60, doc.y, { align: 'center', width: 492 });
            doc.y += 15;
            doc.text('(GCash/PayMaya/Card transaction receipt).', 60, doc.y, { align: 'center', width: 492 });
            doc.y += 20;
            doc.fontSize(11);
            doc.fillColor('#666666');
            doc.text('For any inquiries, please contact the Community Relations Department.', 60, doc.y, { align: 'center', width: 492 });
            
            // Footer with organization info
            doc.y += 35;
            doc.fontSize(9);
            doc.fillColor('#999999');
            doc.text('EUMATTER - Community Relations Department', 60, doc.y, { align: 'center', width: 492 });
            doc.y += 15;
            doc.text('Enverga University | www.mseuf.edu.ph', 60, doc.y, { align: 'center', width: 492 });
            doc.y += 15;
            doc.text(`Generated on: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`, 60, doc.y, { align: 'center', width: 492 });
            
            doc.end();
        } catch (error) {
            reject(error);
        }
    });
};

// Send receipt via email
const sendReceiptEmail = async (donation, recipientEmail, recipientName, emailType = 'donor') => {
    try {
        if (!recipientEmail) {
            console.log('No email address provided for receipt');
            return { sent: false, reason: 'No email address' };
        }

        // Generate PDF buffer
        const pdfBuffer = await generateReceiptPDF(donation);
        
        // Determine email subject and body based on recipient type
        let subject, htmlBody;
        const receiptFileName = `EUMATTER-Donation-Receipt-${donation._id.toString().substring(0, 8).toUpperCase()}.pdf`;
        
        if (emailType === 'donor') {
            subject = `Thank You for Your Donation - Official Receipt`;
            htmlBody = `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <div style="background: linear-gradient(135deg, #800020 0%, #a00030 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
                        <h1 style="color: white; margin: 0; font-size: 28px;">EUMATTER</h1>
                        <p style="color: #f0f0f0; margin: 5px 0 0 0;">Community Relations Department</p>
                    </div>
                    <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
                        <h2 style="color: #800020; margin-top: 0;">Thank You for Your Generous Donation!</h2>
                        <p style="color: #333; line-height: 1.6;">
                            Dear ${donation.donorName},
                        </p>
                        <p style="color: #333; line-height: 1.6;">
                            We are grateful for your donation of <strong>₱${donation.amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</strong>${donation.event && donation.event.title ? ` to "${donation.event.title}"` : ''}.
                        </p>
                        <p style="color: #333; line-height: 1.6;">
                            Your official acknowledgment receipt is attached to this email. This receipt serves as official proof of your donation for organizational records.
                        </p>
                        <p style="color: #666; font-size: 12px; margin-top: 20px;">
                            <strong>Note:</strong> For payment transaction details, please refer to your ${donation.paymentMethod === 'gcash' ? 'GCash' : donation.paymentMethod === 'paymaya' ? 'PayMaya' : donation.paymentMethod.toUpperCase()} receipt.
                        </p>
                        <p style="color: #333; line-height: 1.6; margin-top: 20px;">
                            Your contribution makes a significant difference in our community initiatives.
                        </p>
                        <p style="color: #333; line-height: 1.6;">
                            For any inquiries, please contact the Community Relations Department.
                        </p>
                        <p style="color: #666; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd;">
                            Best regards,<br>
                            <strong>EUMATTER - Community Relations Department</strong><br>
                            Enverga University
                        </p>
                    </div>
                </div>
            `;
        } else if (emailType === 'organizer') {
            subject = `Donation Received for Your Event - Receipt`;
            htmlBody = `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <div style="background: linear-gradient(135deg, #800020 0%, #a00030 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
                        <h1 style="color: white; margin: 0; font-size: 28px;">EUMATTER</h1>
                        <p style="color: #f0f0f0; margin: 5px 0 0 0;">Community Relations Department</p>
                    </div>
                    <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
                        <h2 style="color: #800020; margin-top: 0;">Donation Received for Your Event</h2>
                        <p style="color: #333; line-height: 1.6;">
                            Dear ${recipientName || 'Event Organizer'},
                        </p>
                        <p style="color: #333; line-height: 1.6;">
                            A donation of <strong>₱${donation.amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</strong> has been received for your event <strong>"${donation.event?.title || 'N/A'}"</strong>.
                        </p>
                        <p style="color: #333; line-height: 1.6;">
                            <strong>Donor:</strong> ${donation.donorName} (${donation.donorEmail})
                        </p>
                        <p style="color: #333; line-height: 1.6;">
                            The official acknowledgment receipt is attached for your records.
                        </p>
                        <p style="color: #666; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd;">
                            Best regards,<br>
                            <strong>EUMATTER - Community Relations Department</strong><br>
                            Enverga University
                        </p>
                    </div>
                </div>
            `;
        } else { // CRD staff
            subject = `Donation Transaction - Receipt for Transparency`;
            htmlBody = `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <div style="background: linear-gradient(135deg, #800020 0%, #a00030 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
                        <h1 style="color: white; margin: 0; font-size: 28px;">EUMATTER</h1>
                        <p style="color: #f0f0f0; margin: 5px 0 0 0;">Community Relations Department</p>
                    </div>
                    <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
                        <h2 style="color: #800020; margin-top: 0;">Donation Transaction Record</h2>
                        <p style="color: #333; line-height: 1.6;">
                            A new donation has been processed in the system.
                        </p>
                        <p style="color: #333; line-height: 1.6;">
                            <strong>Amount:</strong> ₱${donation.amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}<br>
                            <strong>Donor:</strong> ${donation.donorName} (${donation.donorEmail})<br>
                            <strong>Payment Method:</strong> ${donation.paymentMethod.charAt(0).toUpperCase() + donation.paymentMethod.slice(1)}<br>
                            ${donation.event?.title ? `<strong>Event:</strong> ${donation.event.title}<br>` : ''}
                            <strong>Transaction ID:</strong> ${donation.paymongoReferenceId || 'N/A'}
                        </p>
                        <p style="color: #333; line-height: 1.6;">
                            The official acknowledgment receipt is attached for transparency and record-keeping purposes.
                        </p>
                        <p style="color: #666; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd;">
                            This is an automated notification for transparency monitoring.<br>
                            <strong>EUMATTER - Community Relations Department</strong><br>
                            Enverga University
                        </p>
                    </div>
                </div>
            `;
        }
        
        const mailOptions = {
            from: process.env.SENDER_EMAIL || 'noreply@eumatter.com',
            to: recipientEmail,
            subject: subject,
            html: htmlBody,
            attachments: [
                {
                    filename: receiptFileName,
                    content: pdfBuffer,
                    contentType: 'application/pdf'
                }
            ]
        };
        
        await transporter.sendMail(mailOptions);
        console.log(`✅ Receipt email sent to ${recipientEmail} (${emailType})`);
        return { sent: true };
    } catch (error) {
        console.error(`❌ Error sending receipt email to ${recipientEmail}:`, error);
        return { sent: false, error: error.message };
    }
};

// Helper function to send donation notifications and email receipts
const sendDonationNotifications = async (donation) => {
  try {
    // Populate donation with event and department details for receipt generation
    const donationWithEvent = await donationModel.findById(donation._id)
      .populate('event', 'title createdBy')
      .populate('department', 'name email role')
      .lean();
    if (!donationWithEvent) {
      console.error('Donation not found for notifications');
      return;
    }
    
    const eventTitle = donationWithEvent.event?.title || 'General';
    
    // Send receipt email to donor
    if (donationWithEvent.donorEmail) {
      await sendReceiptEmail(donationWithEvent, donationWithEvent.donorEmail, donationWithEvent.donorName, 'donor');
    }
    
    // Notify donor (if logged in) with in-app notification - Transfer Confirmed
    if (donationWithEvent.user) {
      const donorId = donationWithEvent.user._id || donationWithEvent.user;
      if (donorId) {
        await notifyUsers({
          userIds: [donorId],
          title: "Transfer Confirmed - Money Entered CRD",
          message: `Your donation of ₱${donationWithEvent.amount.toLocaleString()}${donationWithEvent.event ? ` to "${eventTitle}"` : ''} has been successfully transferred and entered into CRD. Your receipt has been sent to your email.`,
          payload: {
            donationId: donationWithEvent._id,
            eventId: donationWithEvent.event?._id,
            amount: donationWithEvent.amount,
            type: "donation_success"
          }
        });
      }
    }
    
    // Also notify anonymous donors via email (if no user account but has email)
    if (!donationWithEvent.user && donationWithEvent.donorEmail) {
      // Email notification is already sent via sendReceiptEmail above
      // But we can add a specific email for transfer confirmation
      try {
        const transferConfirmationHtml = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #28a745 0%, #20c997 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
              <h1 style="color: white; margin: 0; font-size: 28px;">✓ Transfer Confirmed</h1>
            </div>
            <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
              <h2 style="color: #28a745; margin-top: 0;">Money Has Entered CRD</h2>
              <p style="color: #333; line-height: 1.6;">
                Dear ${donationWithEvent.donorName},
              </p>
              <p style="color: #333; line-height: 1.6;">
                We are pleased to confirm that your donation of <strong>₱${donationWithEvent.amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</strong>${donationWithEvent.event && donationWithEvent.event.title ? ` to "${donationWithEvent.event.title}"` : ''} has been <strong>successfully transferred and entered into CRD</strong>.
              </p>
              <p style="color: #333; line-height: 1.6;">
                Your official acknowledgment receipt is attached to this email.
              </p>
              <p style="color: #666; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd;">
                Best regards,<br>
                <strong>EUMATTER - Community Relations Department</strong><br>
                Enverga University
              </p>
            </div>
          </div>
        `;
        
        await transporter.sendMail({
          from: process.env.SENDER_EMAIL || 'noreply@eumatter.com',
          to: donationWithEvent.donorEmail,
          subject: 'Transfer Confirmed - Money Entered CRD',
          html: transferConfirmationHtml
        });
      } catch (emailError) {
        console.error('Error sending transfer confirmation email:', emailError);
      }
    }
    
    // Send receipt email to event organizer (if event-specific donation)
    if (donationWithEvent.event && donationWithEvent.event.createdBy) {
      const event = await eventModel.findById(donationWithEvent.event._id || donationWithEvent.event).populate('createdBy', 'name email').lean();
      if (event && event.createdBy && event.createdBy.email) {
        await sendReceiptEmail(donationWithEvent, event.createdBy.email, event.createdBy.name, 'organizer');
        
        // In-app notification
        const creatorId = event.createdBy._id || event.createdBy;
        if (creatorId) {
          await notifyUsers({
            userIds: [creatorId],
            title: "Donation Received",
            message: `₱${donationWithEvent.amount.toLocaleString()} donation received for your event "${eventTitle}". Receipt sent to your email.`,
            payload: {
              donationId: donationWithEvent._id,
              eventId: donationWithEvent.event._id || donationWithEvent.event,
              amount: donationWithEvent.amount,
              type: "donation_received"
            }
          });
        }
      }
    }
    
    // Send receipt email to department (if department-specific donation)
    if (donationWithEvent.recipientType === "department" && donationWithEvent.department) {
      const department = donationWithEvent.department;
      if (department.email) {
        await sendReceiptEmail(donationWithEvent, department.email, department.name, 'organizer');
        
        // In-app notification to department
        if (department._id) {
          await notifyUsers({
            userIds: [department._id],
            title: "Donation Received",
            message: `₱${donationWithEvent.amount.toLocaleString()} donation received directly to your department. Receipt sent to your email.`,
            payload: {
              donationId: donationWithEvent._id,
              departmentId: department._id,
              amount: donationWithEvent.amount,
              type: "donation_received"
            }
          });
        }
      }
    }
    
    // Send receipt email to CRD Staff for transparency
    const crdStaff = await userModel.find({ 
      role: { $in: ["CRD Staff", "System Administrator"] } 
    }).select('_id email name').lean();
    
    // Send email receipts to CRD staff
    for (const staff of crdStaff) {
      if (staff.email) {
        await sendReceiptEmail(donationWithEvent, staff.email, staff.name, 'crd');
      }
    }
    
    // In-app notifications for CRD staff - Money Entered CRD
    const staffIds = crdStaff.map(staff => staff._id);
    if (staffIds.length > 0) {
      await notifyUsers({
        userIds: staffIds,
        title: "Money Entered CRD - Donation Received",
        message: `₱${donationWithEvent.amount.toLocaleString()} donation from ${donationWithEvent.donorName}${donationWithEvent.event ? ` for "${eventTitle}"` : ''} has been successfully transferred and entered into CRD. Receipt sent to your email for transparency.`,
        payload: {
          donationId: donationWithEvent._id,
          eventId: donationWithEvent.event?._id,
          amount: donationWithEvent.amount,
          type: "donation_received"
        }
      });
    }
  } catch (error) {
    console.error("Error sending donation notifications and receipts:", error);
    // Don't fail the donation process if notifications fail
  }
};

export const createDonation = async (req, res) => {
  try {
    const { 
      donorName, 
      donorEmail, 
      amount, 
      message = "", 
      paymentMethod, 
      eventId = null,
      recipientType = "crd", // "crd", "department", "event"
      departmentId = null // Department/Organization user ID
    } = req.body;
    const userId = req.user?._id || null;
    
    // Validate required fields
    if (!donorName || !donorEmail || !amount) {
      return res.status(400).json({ 
        success: false, 
        message: "Missing required fields: donorName, donorEmail, and amount are required" 
      });
    }

    if (!paymentMethod) {
      return res.status(400).json({ 
        success: false, 
        message: "Payment method is required" 
      });
    }

    // Validate recipient type and department
    if (recipientType === "department" && !departmentId) {
      return res.status(400).json({ 
        success: false, 
        message: "Department ID is required when donating to a department" 
      });
    }

    // Validate department exists and is a Department/Organization role
    if (departmentId) {
      const userModel = (await import("../models/userModel.js")).default;
      const department = await userModel.findById(departmentId);
      if (!department || department.role !== "Department/Organization") {
        return res.status(400).json({ 
          success: false, 
          message: "Invalid department. Department must be a Department/Organization role." 
        });
      }
    }

    // Determine recipient type based on eventId and departmentId
    let finalRecipientType = recipientType;
    if (eventId) {
      finalRecipientType = "event";
    } else if (departmentId) {
      finalRecipientType = "department";
    } else {
      finalRecipientType = "crd";
    }

    // Handle cash donations - no PayMongo processing needed
    if (paymentMethod === "cash") {
      const donation = await donationModel.create({
        donorName,
        donorEmail,
        amount: Number(amount),
        message,
        paymentMethod: "cash",
        status: "cash_pending_verification", // Cash donations need verification
        user: userId,
        event: eventId,
        recipientType: finalRecipientType,
        department: departmentId || null,
        clientKey: ""
      });

      console.log("💵 Created cash donation entry:", donation._id);

      // Send notifications for cash donation
      try {
        const notifyUsers = (await import("../utils/notify.js")).notifyUsers;
        await notifyUsers({
          userIds: userId ? [userId] : [],
          title: "Cash Donation Submitted",
          message: `Your cash donation of ₱${Number(amount).toLocaleString()} has been submitted and is pending verification. You will be notified once it's verified.`,
          payload: {
            donationId: donation._id,
            type: "cash_donation_submitted",
            recipientType: finalRecipientType
          }
        });

        // Notify recipient (CRD or Department)
        if (finalRecipientType === "crd") {
          const userModel = (await import("../models/userModel.js")).default;
          const crdStaff = await userModel.find({ 
            role: { $in: ["CRD Staff", "System Administrator"] } 
          }).select('_id').lean();
          const staffIds = crdStaff.map(staff => staff._id);
          if (staffIds.length > 0) {
            await notifyUsers({
              userIds: staffIds,
              title: "New Cash Donation - Verification Required",
              message: `A cash donation of ₱${Number(amount).toLocaleString()} from ${donorName} is pending verification.`,
              payload: {
                donationId: donation._id,
                type: "cash_donation_pending",
                recipientType: "crd"
              }
            });
          }
        } else if (finalRecipientType === "department" && departmentId) {
          await notifyUsers({
            userIds: [departmentId],
            title: "New Cash Donation - Verification Required",
            message: `A cash donation of ₱${Number(amount).toLocaleString()} from ${donorName} is pending verification.`,
            payload: {
              donationId: donation._id,
              type: "cash_donation_pending",
              recipientType: "department"
            }
          });

          // Also notify CRD for transparency
          const userModel = (await import("../models/userModel.js")).default;
          const crdStaff = await userModel.find({ 
            role: { $in: ["CRD Staff", "System Administrator"] } 
          }).select('_id').lean();
          const staffIds = crdStaff.map(staff => staff._id);
          if (staffIds.length > 0) {
            await notifyUsers({
              userIds: staffIds,
              title: "Department Cash Donation - For Transparency",
              message: `A cash donation of ₱${Number(amount).toLocaleString()} from ${donorName} to a department is pending verification.`,
              payload: {
                donationId: donation._id,
                type: "cash_donation_transparency",
                recipientType: "department"
              }
            });
          }
        }
      } catch (notifError) {
        console.error("Error sending cash donation notifications:", notifError);
      }

      return res.json({
        success: true,
        message: "Cash donation submitted successfully. It will be verified by the recipient.",
        donation: donation,
        type: "cash",
        requiresVerification: true
      });
    }

    // For non-cash payments, validate PayMongo environment variables
    if (!process.env.PAYMONGO_SECRET_KEY) {
      console.error("❌ PAYMONGO_SECRET_KEY is not set");
      return res.status(500).json({ 
        success: false, 
        message: "Payment service configuration error. Please contact support." 
      });
    }

    if (!process.env.BACKEND_URL) {
      console.error("❌ BACKEND_URL is not set");
      console.error("💡 For Render deployment, set BACKEND_URL to your Render service URL (e.g., https://your-service.onrender.com)");
      return res.status(500).json({ 
        success: false, 
        message: "Server configuration error: BACKEND_URL environment variable is missing. Please contact support." 
      });
    }

    if (!process.env.FRONTEND_URL) {
      console.error("❌ FRONTEND_URL is not set");
      return res.status(500).json({ 
        success: false, 
        message: "Server configuration error. Please contact support." 
      });
    }

    const amountInCents = toCentavos(amount);

    // 1️⃣ Create the donation entry
    const donation = await donationModel.create({
      donorName,
      donorEmail,
      amount: Number(amount),
      message,
      paymentMethod,
      status: "pending",
      user: userId,
      event: eventId,
      recipientType: finalRecipientType,
      department: departmentId || null,
      clientKey: process.env.PAYMONGO_PUBLIC_KEY || ""
    });
    console.log("🟢 Created donation entry:", donation._id);

    // 2️⃣ Handle GCash or other source-based payments
    if (paymentMethod === "gcash") {
      const { data } = await paymongoClient.post("/sources", {
        data: {
          attributes: {
            amount: amountInCents,
            currency: "PHP",
            type: "gcash",
            redirect: {
              success: `${process.env.BACKEND_URL}/api/donations/paymongo-redirect?donationId=${donation._id}`,
              failed: `${process.env.BACKEND_URL}/api/donations/paymongo-redirect?donationId=${donation._id}`
            },
            statement_descriptor: "EUMatter Donation"
          }
        }
      });
      const source = data.data;
      donation.paymongoReferenceId = source.id;
      donation.sourceCheckoutUrl = source.attributes.redirect.checkout_url;
      await donation.save();

      return res.json({
        success: true,
        type: "source",
        donationId: donation._id,
        checkoutUrl: donation.sourceCheckoutUrl
      });
    }

    // 3️⃣ Handle PayMaya using Payment Intents + Payment Method flow
    if (paymentMethod === "paymaya") {
      console.log("💳 Starting PayMaya payment flow...");
    
      // 1️⃣ Create Payment Intent
      const { data: intentData } = await paymongoClient.post("/payment_intents", {
        data: {
          attributes: {
            amount: amountInCents,
            payment_method_allowed: ["paymaya"],
            payment_method_options: { card: { request_three_d_secure: "any" } },
            currency: "PHP",
            capture_type: "automatic",
            statement_descriptor: "EUMatter Donation"
          }
        }
      });
      const intent = intentData.data;
      console.log("🟢 Payment Intent created:", {
        id: intent.id,
        status: intent.attributes.status,
        amount: intent.attributes.amount,
        currency: intent.attributes.currency
      });
    
      // 2️⃣ Create Payment Method
      const { data: pmData } = await paymongoClient.post("/payment_methods", {
        data: { attributes: { type: "paymaya" } }
      });
      const paymentMethodObj = pmData.data;
      console.log("🟢 Payment Method created:", {
        id: paymentMethodObj.id,
        type: paymentMethodObj.attributes.type,
        livemode: paymentMethodObj.attributes.livemode
      });
    
      // 3️⃣ Attach Payment Method to Payment Intent
      const { data: attachData } = await paymongoClient.post(`/payment_intents/${intent.id}/attach`, {
        data: {
          attributes: {
            payment_method: paymentMethodObj.id,
            return_url: `${process.env.BACKEND_URL}/api/donations/paymongo-redirect?donationId=${donation._id}`
          }
        }
      });
      const attachedIntent = attachData.data;
      console.log("🟢 Payment Method attached to Payment Intent:", {
        paymentIntentId: attachedIntent.id,
        status: attachedIntent.attributes.status,
        nextAction: attachedIntent.attributes.next_action
      });
    
      // 4️⃣ Save info in database
      donation.paymongoReferenceId = intent.id;
      donation.sourceCheckoutUrl = attachedIntent.attributes.next_action?.redirect?.url || null;
      await donation.save();
      console.log("💾 Donation updated with PayMaya checkout URL:", donation.sourceCheckoutUrl);
      
    
      // 5️⃣ Return checkout URL to frontend
      return res.json({
        success: true,
        type: "intent",
        donationId: donation._id,
        checkoutUrl: donation.sourceCheckoutUrl,
        status: attachedIntent.attributes.status
      });
    }
    

    // 4️⃣ Handle Card payments via Payment Intents
    if (paymentMethod === "card") {
      const { data: intentData } = await paymongoClient.post("/payment_intents", {
        data: {
          attributes: {
            amount: amountInCents,
            payment_method_allowed: ["card"],
            payment_method_options: { card: { request_three_d_secure: "any" } },
            currency: "PHP",
            statement_descriptor: "EUMatter Donation"
          }
        }
      });
      const intent = intentData.data;
      donation.paymongoReferenceId = intent.id;
      await donation.save();

      return res.json({
        success: true,
        type: "intent",
        donationId: donation._id,
        clientKey: getPaymongoPublicKey(),
        paymentIntentId: intent.id,
        status: intent.attributes.status
      });
    }

    // ❌ Invalid payment method
    return res.status(400).json({ success: false, message: "Invalid payment method" });

  } catch (err) {
    console.error("❌ createDonation Error:", {
      message: err.message,
      name: err.name,
      response: err.response?.data,
      status: err.response?.status,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
    
    // Handle missing PayMongo secret key error (from interceptor)
    if (err.message && err.message.includes("PAYMONGO_SECRET_KEY")) {
      return res.status(500).json({ 
        success: false,
        message: "Payment service is not configured. Please contact support.",
        error: "Missing PAYMONGO_SECRET_KEY environment variable"
      });
    }
    
    // Handle PayMongo API errors
    if (err.response?.data) {
      const paymongoError = err.response.data;
      const errorMessage = paymongoError.errors?.[0]?.detail || paymongoError.message || "Payment processing failed";
      console.error("❌ PayMongo API Error Details:", {
        errors: paymongoError.errors,
        message: paymongoError.message
      });
      return res.status(500).json({ 
        success: false,
        message: errorMessage,
        error: process.env.NODE_ENV === 'development' ? paymongoError : undefined
      });
    }
    
    // Handle network/timeout errors
    if (err.code === 'ECONNABORTED' || err.message.includes('timeout')) {
      return res.status(500).json({ 
        success: false,
        message: "Payment service timeout. Please try again in a moment."
      });
    }
    
    // Handle database errors
    if (err.name === 'ValidationError') {
      return res.status(400).json({ 
        success: false,
        message: "Invalid donation data: " + Object.values(err.errors).map(e => e.message).join(", ")
      });
    }
    
    // Handle MongoDB connection errors
    if (err.name === 'MongoError' || err.name === 'MongoServerError') {
      console.error("❌ Database Error:", err.message);
      return res.status(500).json({ 
        success: false,
        message: "Database error. Please try again later."
      });
    }
    
    // Generic error
    return res.status(500).json({ 
      success: false,
      message: err.message || "An error occurred while processing your donation. Please try again.",
      error: process.env.NODE_ENV === 'development' ? {
        message: err.message,
        name: err.name,
        stack: err.stack
      } : undefined
    });
  }
};



export const attachPaymentMethod = async (req, res) => {
  try {
    const { donationId, paymentMethodId } = req.body;
    if (!donationId || !paymentMethodId) {
      return res.status(400).json({ success: false, message: "Missing donationId or paymentMethodId" });
    }

    const donation = await donationModel.findById(donationId);
    if (!donation) {
      return res.status(404).json({ success: false, message: "Donation not found" });
    }

    const supportedMethods = ["card", "gcash", "paymaya", "grab_pay", "billease", "qrph", "dob", "bank"];
    if (!supportedMethods.includes(donation.paymentMethod)) {
      return res.status(400).json({ success: false, message: "Unsupported payment method" });
    }

    // Only Payment Intents can attach a payment method
    if (!["card", "paymaya", "grab_pay", "billease", "qrph", "dob"].includes(donation.paymentMethod)) {
      return res.status(400).json({ success: false, message: "This payment method cannot attach a payment method" });
    }

    const intentId = donation.paymongoReferenceId;
    if (!intentId) {
      return res.status(400).json({ success: false, message: "No payment intent found for this donation" });
    }

    // Attach the payment method
    const { data } = await paymongoClient.post(`/payment_intents/${intentId}/attach`, {
      data: {
        attributes: {
          payment_method: paymentMethodId,
          return_url: `${process.env.FRONTEND_URL}/donation/success?donationId=${donation._id}`
        }
      }
    });

    const attachedIntent = data.data;

    // Save any updated status
    donation.status = attachedIntent.attributes.status;
    await donation.save();

    // Return redirect URL if available (PayMaya & other redirect-based payments)
    const redirectUrl = attachedIntent.attributes.next_action?.redirect?.url || null;

    return res.json({
      success: true,
      intent: attachedIntent,
      redirectUrl
    });
  } catch (error) {
    console.error("❌ Attach Payment Method Error:", error.response?.data || error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
};


export const confirmSourcePayment = async (req, res) => {
  try {
    const { sourceId, donationId } = req.body;
    console.log("📥 confirmSourcePayment called with:", { sourceId, donationId });

    if (!donationId) {
      return res.status(400).json({ success: false, message: "Missing donationId" });
    }

    const donation = await donationModel.findById(donationId);
    if (!donation) {
      return res.status(404).json({ success: false, message: "Donation not found" });
    }

    // 🧠 Detect type from prefix automatically
    const isIntent = sourceId?.startsWith("pi_") || donation.paymongoReferenceId?.startsWith("pi_");
    const isSource = sourceId?.startsWith("src_") || donation.paymongoReferenceId?.startsWith("src_");

    if (isIntent) {
      const intentId = sourceId || donation.paymongoReferenceId;
      console.log("💳 Checking PayMaya Payment Intent:", intentId);

      const { data } = await paymongoClient.get(`/payment_intents/${intentId}`);
      const intent = data.data;
      const status = intent.attributes.status;

      console.log("💡 Payment Intent status:", status);

      if (["succeeded", "paid"].includes(status)) {
        donation.status = "succeeded";
        await donation.save();
        // Send notifications for successful donation
        await sendDonationNotifications(donation);
        console.log("✅ Donation updated (intent - succeeded/paid):", donation.status);
        return res.json({ success: true, donation });
      } else if (["failed", "canceled"].includes(status)) {
        donation.status = "failed";
        await donation.save();
        // Send failure notification to donor - Transfer Failed
        if (donation.user) {
          try {
            await notifyUsers({
              userIds: [donation.user],
              title: "Transfer Failed - Money Did Not Enter CRD",
              message: `Your donation of ₱${donation.amount.toLocaleString()} failed to transfer. The money did not enter CRD. Please try again or contact support if the issue persists.`,
              payload: { donationId: donation._id, eventId: donation.event, type: "donation_failed" }
            });
          } catch (err) {
            console.error("Error sending donation failure notification:", err);
          }
        }
        
        // Also notify anonymous donors via email if transfer fails
        if (!donation.user && donation.donorEmail) {
          try {
            await transporter.sendMail({
              from: process.env.SENDER_EMAIL || 'noreply@eumatter.com',
              to: donation.donorEmail,
              subject: 'Transfer Failed - Donation Not Processed',
              html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                  <div style="background: linear-gradient(135deg, #dc3545 0%, #c82333 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
                    <h1 style="color: white; margin: 0; font-size: 28px;">⚠️ Transfer Failed</h1>
                  </div>
                  <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
                    <h2 style="color: #dc3545; margin-top: 0;">Money Did Not Enter CRD</h2>
                    <p style="color: #333; line-height: 1.6;">
                      Dear ${donation.donorName},
                    </p>
                    <p style="color: #333; line-height: 1.6;">
                      We regret to inform you that your donation of <strong>₱${donation.amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</strong> <strong>failed to transfer</strong>. The money did not enter CRD.
                    </p>
                    <p style="color: #333; line-height: 1.6;">
                      Please try again or contact our support team if you continue to experience issues.
                    </p>
                    <p style="color: #666; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd;">
                      Best regards,<br>
                      <strong>EUMATTER - Community Relations Department</strong><br>
                      Enverga University
                    </p>
                  </div>
                </div>
              `
            });
          } catch (emailError) {
            console.error('Error sending transfer failure email:', emailError);
          }
        }
        
        // Notify CRD staff about failed transfer
        try {
          const crdStaff = await userModel.find({ 
            role: { $in: ["CRD Staff", "System Administrator"] } 
          }).select('_id').lean();
          const staffIds = crdStaff.map(staff => staff._id);
          if (staffIds.length > 0) {
            await notifyUsers({
              userIds: staffIds,
              title: "Transfer Failed - Donation Not Received",
              message: `A donation of ₱${donation.amount.toLocaleString()} from ${donation.donorName} failed to transfer. Money did not enter CRD.`,
              payload: { donationId: donation._id, eventId: donation.event, type: "donation_failed" }
            });
          }
        } catch (err) {
          console.error("Error notifying CRD staff about failed transfer:", err);
        }
        console.log("✅ Donation updated (intent - failed):", donation.status);
        return res.json({ success: true, donation });
      } else {
        // Status is still pending (awaiting payment)
        // Don't update donation status if it's already succeeded (from webhook or previous check)
        if (donation.status !== "succeeded") {
          donation.status = "pending";
          await donation.save();
        }
      }

      console.log("✅ Donation updated (intent - pending):", donation.status);
      return res.json({ success: true, donation });
    }

    if (isSource) {
      const srcId = sourceId || donation.paymongoReferenceId;
      console.log("🔍 Checking Source status:", srcId);

      const { data } = await paymongoClient.get(`/sources/${srcId}`);
      const source = data.data;
      const status = source.attributes.status;

      console.log("💡 Source status:", status);

      if (status === "chargeable") {
        const paymentResponse = await paymongoClient.post("/payments", {
          data: {
            attributes: {
              amount: source.attributes.amount,
              currency: source.attributes.currency,
              source: { id: source.id, type: "source" },
              description: "EUMatter Donation",
            },
          },
        });
        donation.status = "succeeded";
        donation.paymongoPaymentId = paymentResponse.data.data.id;
        await donation.save();
        // Send notifications for successful donation
        await sendDonationNotifications(donation);
        return res.json({ success: true, donation, payment: paymentResponse.data.data });
      }

      if (status === "paid") {
        donation.status = "succeeded";
        await donation.save();
        // Send notifications for successful donation
        await sendDonationNotifications(donation);
        console.log("✅ Donation updated (source - paid):", donation.status);
        return res.json({ success: true, donation });
      } else if (["failed", "expired"].includes(status)) {
        donation.status = "failed";
        await donation.save();
        // Send failure notification to donor - Transfer Failed
        if (donation.user) {
          try {
            await notifyUsers({
              userIds: [donation.user],
              title: "Transfer Failed - Money Did Not Enter CRD",
              message: `Your donation of ₱${donation.amount.toLocaleString()} failed to transfer. The money did not enter CRD. Please try again or contact support if the issue persists.`,
              payload: { donationId: donation._id, eventId: donation.event, type: "donation_failed" }
            });
          } catch (err) {
            console.error("Error sending donation failure notification:", err);
          }
        }
        
        // Also notify anonymous donors via email if transfer fails
        if (!donation.user && donation.donorEmail) {
          try {
            await transporter.sendMail({
              from: process.env.SENDER_EMAIL || 'noreply@eumatter.com',
              to: donation.donorEmail,
              subject: 'Transfer Failed - Donation Not Processed',
              html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                  <div style="background: linear-gradient(135deg, #dc3545 0%, #c82333 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
                    <h1 style="color: white; margin: 0; font-size: 28px;">⚠️ Transfer Failed</h1>
                  </div>
                  <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
                    <h2 style="color: #dc3545; margin-top: 0;">Money Did Not Enter CRD</h2>
                    <p style="color: #333; line-height: 1.6;">
                      Dear ${donation.donorName},
                    </p>
                    <p style="color: #333; line-height: 1.6;">
                      We regret to inform you that your donation of <strong>₱${donation.amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</strong> <strong>failed to transfer</strong>. The money did not enter CRD.
                    </p>
                    <p style="color: #333; line-height: 1.6;">
                      Please try again or contact our support team if you continue to experience issues.
                    </p>
                    <p style="color: #666; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd;">
                      Best regards,<br>
                      <strong>EUMATTER - Community Relations Department</strong><br>
                      Enverga University
                    </p>
                  </div>
                </div>
              `
            });
          } catch (emailError) {
            console.error('Error sending transfer failure email:', emailError);
          }
        }
        
        // Notify CRD staff about failed transfer
        try {
          const crdStaff = await userModel.find({ 
            role: { $in: ["CRD Staff", "System Administrator"] } 
          }).select('_id').lean();
          const staffIds = crdStaff.map(staff => staff._id);
          if (staffIds.length > 0) {
            await notifyUsers({
              userIds: staffIds,
              title: "Transfer Failed - Donation Not Received",
              message: `A donation of ₱${donation.amount.toLocaleString()} from ${donation.donorName} failed to transfer. Money did not enter CRD.`,
              payload: { donationId: donation._id, eventId: donation.event, type: "donation_failed" }
            });
          }
        } catch (err) {
          console.error("Error notifying CRD staff about failed transfer:", err);
        }
        console.log("✅ Donation updated (source - failed):", donation.status);
        return res.json({ success: true, donation });
      } else {
        // Status is still pending (not yet chargeable, paid, failed, or expired)
        // Don't update donation status if it's already succeeded (from webhook or previous check)
        if (donation.status !== "succeeded") {
          donation.status = "pending";
          await donation.save();
        }
      }

      console.log("✅ Donation updated (source - pending):", donation.status);
      return res.json({ success: true, donation });
    }

    console.warn("⚠️ Unknown PayMongo ID type:", sourceId);
    return res.status(400).json({ success: false, message: "Unknown PayMongo ID type" });

  } catch (err) {
    console.error("❌ confirmSourcePayment Error:", err.response?.data || err.message);
    return res.status(500).json({
      success: false,
      message: err.response?.data?.errors?.[0]?.detail || err.message,
    });
  }
};


  

export const handleWebhook = async (req, res) => {
    try {
      const event = req.body;
  
      if (!event?.type || !event?.data) {
        return res.status(400).json({ success: false, message: "Invalid webhook payload" });
      }
  
      const type = event.type;
      const resource = event.data;
      const attributes = resource.attributes || {};
      const paymentId = resource.id; // for payment events
      const metadata = attributes.metadata || {};
      const donationId = metadata.donationId || null;
  
      console.log(`📩 PayMongo Webhook Received: ${type} | Resource ID: ${paymentId}`);
      console.log("Metadata:", metadata);
  
      let donation = null;
  
      // Try to match donation via metadata (most reliable)
      if (donationId) {
        donation = await donationModel.findById(donationId);
      }
  
      // Fallback: find by PayMongo reference ID (intent ID)
      if (!donation) {
        donation = await donationModel.findOne({ paymongoReferenceId: paymentId });
      }
  
      if (!donation) {
        console.warn(`⚠️ No donation found for webhook event: ${paymentId}`);
        return res.status(200).json({ received: true });
      }
  
      switch (type) {
        case "payment.paid":
          donation.status = "succeeded";
          await donation.save();
          console.log(`✅ Donation ${donation._id} marked as succeeded.`);
          // Send notifications for successful donation
          await sendDonationNotifications(donation);
          break;
  
        case "payment.failed":
        case "payment.refunded":
        case "source.canceled":
          donation.status = "failed";
          await donation.save();
          console.log(`❌ Donation ${donation._id} marked as failed.`);
          // Send failure notification to donor - Transfer Failed
          if (donation.user) {
            try {
              await notifyUsers({
                userIds: [donation.user],
                title: "Transfer Failed - Money Did Not Enter CRD",
                message: `Your donation of ₱${donation.amount.toLocaleString()} failed to transfer. The money did not enter CRD. Please try again or contact support if the issue persists.`,
                payload: { donationId: donation._id, eventId: donation.event, type: "donation_failed" }
              });
            } catch (err) {
              console.error("Error sending donation failure notification:", err);
            }
          }
          
          // Also notify anonymous donors via email if transfer fails
          if (!donation.user && donation.donorEmail) {
            try {
              await transporter.sendMail({
                from: process.env.SENDER_EMAIL || 'noreply@eumatter.com',
                to: donation.donorEmail,
                subject: 'Transfer Failed - Donation Not Processed',
                html: `
                  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <div style="background: linear-gradient(135deg, #dc3545 0%, #c82333 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
                      <h1 style="color: white; margin: 0; font-size: 28px;">⚠️ Transfer Failed</h1>
                    </div>
                    <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
                      <h2 style="color: #dc3545; margin-top: 0;">Money Did Not Enter CRD</h2>
                      <p style="color: #333; line-height: 1.6;">
                        Dear ${donation.donorName},
                      </p>
                      <p style="color: #333; line-height: 1.6;">
                        We regret to inform you that your donation of <strong>₱${donation.amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</strong> <strong>failed to transfer</strong>. The money did not enter CRD.
                      </p>
                      <p style="color: #333; line-height: 1.6;">
                        Please try again or contact our support team if you continue to experience issues.
                      </p>
                      <p style="color: #666; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd;">
                        Best regards,<br>
                        <strong>EUMATTER - Community Relations Department</strong><br>
                        Enverga University
                      </p>
                    </div>
                  </div>
                `
              });
            } catch (emailError) {
              console.error('Error sending transfer failure email:', emailError);
            }
          }
          
          // Notify CRD staff about failed transfer
          try {
            const crdStaff = await userModel.find({ 
              role: { $in: ["CRD Staff", "System Administrator"] } 
            }).select('_id').lean();
            const staffIds = crdStaff.map(staff => staff._id);
            if (staffIds.length > 0) {
              await notifyUsers({
                userIds: staffIds,
                title: "Transfer Failed - Donation Not Received",
                message: `A donation of ₱${donation.amount.toLocaleString()} from ${donation.donorName} failed to transfer. Money did not enter CRD.`,
                payload: { donationId: donation._id, eventId: donation.event, type: "donation_failed" }
              });
            }
          } catch (err) {
            console.error("Error notifying CRD staff about failed transfer:", err);
          }
          break;
  
        case "source.chargeable":
          // Optional: handle chargeable sources (if using Sources API)
          console.log(`💳 Source is chargeable (manual capture flow)`);
          break;
  
        default:
          console.log(`ℹ️ Unhandled PayMongo event type: ${type}`);
          break;
      }
  
      return res.status(200).json({ received: true });
    } catch (error) {
      console.error("❗ PayMongo Webhook Error:", error.message);
      return res.status(500).json({ success: false, message: error.message });
    }
  };
  

export const getMyDonations = async (req, res) => {
    try {
        const userId = req.user?._id;
        if (!userId) return res.status(401).json({ success: false, message: "Unauthorized" });
        // Filter out pending donations - only return successful/completed donations
        const donations = await donationModel.find({ 
            user: userId,
            status: { $ne: 'pending' } // Exclude pending donations
        }).sort({ createdAt: -1 });
        return res.json({ success: true, donations });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

// Verify cash donation (CRD Staff or Department can verify)
export const verifyCashDonation = async (req, res) => {
  try {
    const { id } = req.params;
    const { receiptNumber, verificationNotes } = req.body;
    const userId = req.user?._id;

    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const donation = await donationModel.findById(id).populate('department', 'name email role');
    if (!donation) {
      return res.status(404).json({ success: false, message: "Donation not found" });
    }

    if (donation.paymentMethod !== "cash") {
      return res.status(400).json({ success: false, message: "This donation is not a cash donation" });
    }

    if (donation.status !== "cash_pending_verification") {
      return res.status(400).json({ success: false, message: "This donation is not pending verification" });
    }

    // Check if user has permission to verify
    const userModel = (await import("../models/userModel.js")).default;
    const user = await userModel.findById(userId);
    const isCRDStaff = user?.role === "CRD Staff" || user?.role === "System Administrator";
    const isDepartmentOwner = donation.recipientType === "department" && 
                              donation.department?._id?.toString() === userId.toString();

    if (!isCRDStaff && !isDepartmentOwner) {
      return res.status(403).json({ 
        success: false, 
        message: "You don't have permission to verify this donation" 
      });
    }

    // Update donation status
    donation.status = "cash_verified";
    donation.cashVerification.verifiedBy = userId;
    donation.cashVerification.verifiedAt = new Date();
    donation.cashVerification.receiptNumber = receiptNumber || "";
    donation.cashVerification.verificationNotes = verificationNotes || "";
    await donation.save();

    // Send notifications
    try {
      const notifyUsers = (await import("../utils/notify.js")).notifyUsers;
      
      // Notify donor
      if (donation.user) {
        await notifyUsers({
          userIds: [donation.user],
          title: "Cash Donation Verified",
          message: `Your cash donation of ₱${donation.amount.toLocaleString()} has been verified. Receipt Number: ${receiptNumber || 'N/A'}`,
          payload: {
            donationId: donation._id,
            type: "cash_donation_verified",
            recipientType: donation.recipientType
          }
        });
      }

      // Notify CRD for transparency if verified by department
      if (isDepartmentOwner) {
        const crdStaff = await userModel.find({ 
          role: { $in: ["CRD Staff", "System Administrator"] } 
        }).select('_id').lean();
        const staffIds = crdStaff.map(staff => staff._id);
        if (staffIds.length > 0) {
          await notifyUsers({
            userIds: staffIds,
            title: "Department Cash Donation Verified",
            message: `A cash donation of ₱${donation.amount.toLocaleString()} to ${donation.department?.name || 'a department'} has been verified.`,
            payload: {
              donationId: donation._id,
              type: "cash_donation_verified_transparency",
              recipientType: "department"
            }
          });
        }
      }
    } catch (notifError) {
      console.error("Error sending verification notifications:", notifError);
    }

    return res.json({
      success: true,
      message: "Cash donation verified successfully",
      donation: await donationModel.findById(donation._id)
        .populate('user', 'name email')
        .populate('department', 'name email')
        .populate('event', 'title')
        .populate('cashVerification.verifiedBy', 'name email')
    });
  } catch (error) {
    console.error("Error verifying cash donation:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Complete cash donation (mark as completed after physical receipt)
export const completeCashDonation = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?._id;

    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const donation = await donationModel.findById(id).populate('department', 'name email role');
    if (!donation) {
      return res.status(404).json({ success: false, message: "Donation not found" });
    }

    if (donation.paymentMethod !== "cash") {
      return res.status(400).json({ success: false, message: "This donation is not a cash donation" });
    }

    if (donation.status !== "cash_verified") {
      return res.status(400).json({ success: false, message: "Donation must be verified before completion" });
    }

    // Check if user has permission
    const userModel = (await import("../models/userModel.js")).default;
    const user = await userModel.findById(userId);
    const isCRDStaff = user?.role === "CRD Staff" || user?.role === "System Administrator";
    const isDepartmentOwner = donation.recipientType === "department" && 
                              donation.department?._id?.toString() === userId.toString();

    if (!isCRDStaff && !isDepartmentOwner) {
      return res.status(403).json({ 
        success: false, 
        message: "You don't have permission to complete this donation" 
      });
    }

    // Update donation status
    donation.status = "cash_completed";
    donation.cashVerification.completedBy = userId;
    donation.cashVerification.completedAt = new Date();
    await donation.save();

    // Send receipt email and notifications
    try {
      await sendDonationNotifications(donation);
    } catch (emailError) {
      console.error("Error sending receipt email and notifications:", emailError);
    }

    return res.json({
      success: true,
      message: "Cash donation completed successfully",
      donation: await donationModel.findById(donation._id)
        .populate('user', 'name email')
        .populate('department', 'name email')
        .populate('event', 'title')
        .populate('cashVerification.verifiedBy', 'name email')
        .populate('cashVerification.completedBy', 'name email')
    });
  } catch (error) {
    console.error("Error completing cash donation:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getAllDonations = async (req, res) => {
    try {
        const user = req.user;
        if (!user) return res.status(401).json({ success: false, message: "Unauthorized" });
        
        // Check if user is CRD Staff or System Administrator
        const allowedRoles = ['CRD Staff', 'System Administrator'];
        if (!allowedRoles.includes(user.role)) {
            return res.status(403).json({ success: false, message: "Access denied. CRD Staff or System Administrator required." });
        }
        
        // Get all donations for transparency - includes CRD, Department, and Event donations
        const donations = await donationModel.find({})
            .populate('user', 'name email profileImage')
            .populate('event', 'title createdBy')
            .populate('department', 'name email role')
            .populate('cashVerification.verifiedBy', 'name email')
            .populate('cashVerification.completedBy', 'name email')
            .sort({ createdAt: -1 });
        
        return res.json({ success: true, donations });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

export const getDonationById = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user?._id;
        const donation = await donationModel.findById(id);
        if (!donation) return res.status(404).json({ success: false, message: "Not found" });
        if (donation.user && String(donation.user) !== String(userId)) {
            return res.status(403).json({ success: false, message: "Forbidden" });
        }
        return res.json({ success: true, donation });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

// Keep download receipt for CRD staff only (for transparency/monitoring)
export const downloadReceipt = async (req, res) => {
    try {
        const { id } = req.params;
        const user = req.user;
        
        // Only allow CRD Staff and System Administrators to download receipts
        const allowedRoles = ['CRD Staff', 'System Administrator'];
        if (!allowedRoles.includes(user?.role)) {
            return res.status(403).json({ 
                success: false, 
                message: "Access denied. Receipts are sent via email. Please check your email for the receipt." 
            });
        }
        
        const donation = await donationModel.findById(id).populate('event', 'title');
        if (!donation) return res.status(404).json({ success: false, message: "Not found" });
        if (donation.status !== "succeeded") {
            return res.status(400).json({ success: false, message: "Receipt available only for completed donations" });
        }
        
        // Generate PDF buffer
        const pdfBuffer = await generateReceiptPDF(donation);
        
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=EUMATTER-Donation-Receipt-${donation._id.toString().substring(0, 8).toUpperCase()}.pdf`);
        res.send(pdfBuffer);
    } catch (error) {
        console.error('Receipt generation error:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
};


// Handles PayMongo redirect before sending user to the frontend
export const paymongoRedirect = async (req, res) => {
  try {
    const donationId = req.query.donationId;
    const sourceId = req.query.id; // Source ID for GCash or PayMaya Payment Intent

    console.log("➡️ PayMongo redirect received:", { donationId, sourceId });

    if (!donationId && !sourceId) {
      console.warn("⚠️ Missing donationId and sourceId in redirect");
      return res.redirect(`${process.env.FRONTEND_URL}/donation/failed`);
    }

    // Fetch donation
    let donation;
    if (donationId) {
      donation = await donationModel.findById(donationId);
    }
    // fallback: find by paymongoReferenceId if donationId not found
    if (!donation && sourceId) {
      donation = await donationModel.findOne({ paymongoReferenceId: sourceId });
    }

    if (!donation) {
      console.warn("⚠️ Donation not found for redirect");
      return res.redirect(`${process.env.FRONTEND_URL}/donation/failed`);
    }

    // Set reference ID if missing
    if (!donation.paymongoReferenceId && sourceId) {
      donation.paymongoReferenceId = sourceId;
      await donation.save();
    }

    // Unified redirect for both GCash and PayMaya
    let redirectUrl;
    if (["gcash", "paymaya"].includes(donation.paymentMethod)) {
      redirectUrl = `${process.env.FRONTEND_URL}/donation/success?donationId=${donation._id}&sourceId=${donation.paymongoReferenceId}`;
    } else {
      redirectUrl = `${process.env.FRONTEND_URL}/donation/failed`;
    }

    console.log("🔁 Redirecting user to frontend:", redirectUrl);
    return res.redirect(redirectUrl);

  } catch (error) {
    console.error("❌ PayMongo redirect error:", error.message);
    return res.redirect(`${process.env.FRONTEND_URL}/donation/failed`);
  }
};
