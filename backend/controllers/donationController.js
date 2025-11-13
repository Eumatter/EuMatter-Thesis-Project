import pdfkit from "pdfkit";
import fs from "fs";
import path from "path";
import donationModel from "../models/donationModel.js";
import paymongoClient, { getPaymongoPublicKey } from "../config/paymongo.js";
import { notifyUsers } from "../utils/notify.js";
import eventModel from "../models/eventModel.js";



const toCentavos = (amount) => Math.round(Number(amount) * 100);

// Helper function to send donation notifications
const sendDonationNotifications = async (donation) => {
  try {
    const eventTitle = donation.event ? (await eventModel.findById(donation.event).select('title').lean())?.title : 'General';
    
    // Notify donor (if logged in) with confirmation message
    if (donation.user) {
      const donorId = donation.user._id || donation.user;
      if (donorId) {
        await notifyUsers({
          userIds: [donorId],
          title: "Donation Successful",
          message: `Thank you for your donation of ₱${donation.amount.toLocaleString()}${donation.event ? ` to "${eventTitle}"` : ''}. Your contribution makes a difference!`,
          payload: {
            donationId: donation._id,
            eventId: donation.event,
            amount: donation.amount,
            type: "donation_success"
          }
        });
      }
    }
    
    // Notify event creator (if event-specific donation)
    if (donation.event) {
      const event = await eventModel.findById(donation.event).populate('createdBy', '_id').lean();
      if (event && event.createdBy) {
        const creatorId = event.createdBy._id || event.createdBy;
        if (creatorId) {
          await notifyUsers({
            userIds: [creatorId],
            title: "Donation Received",
            message: `₱${donation.amount.toLocaleString()} donation received for your event "${eventTitle}"`,
            payload: {
              donationId: donation._id,
              eventId: donation.event,
              amount: donation.amount,
              type: "donation_received"
            }
          });
        }
      }
    }
    
    // Notify CRD Staff for tracking
    const userModel = (await import("../models/userModel.js")).default;
    const crdStaff = await userModel.find({ 
      role: { $in: ["CRD Staff", "System Administrator"] } 
    }).select('_id').lean();
    const staffIds = crdStaff.map(staff => staff._id);
    
    if (staffIds.length > 0) {
      await notifyUsers({
        userIds: staffIds,
        title: "Donation Received",
        message: `₱${donation.amount.toLocaleString()} donation received${donation.event ? ` for "${eventTitle}"` : ''}`,
        payload: {
          donationId: donation._id,
          eventId: donation.event,
          amount: donation.amount,
          type: "donation_received"
        }
      });
    }
  } catch (error) {
    console.error("Error sending donation notifications:", error);
    // Don't fail the donation process if notifications fail
  }
};

export const createDonation = async (req, res) => {
  try {
    const { donorName, donorEmail, amount, message = "", paymentMethod, eventId = null } = req.body;
    const userId = req.user?._id || null;
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
    console.error("❌ createDonation Error:", err.response?.data || err.message);
    return res.status(500).json({ error: err.response?.data || err.message });
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
      } else if (["failed", "canceled"].includes(status)) {
        donation.status = "failed";
        await donation.save();
        // Send failure notification to donor
        if (donation.user) {
          try {
            await notifyUsers({
              userIds: [donation.user],
              title: "Donation Failed",
              message: `Your donation of ₱${donation.amount} failed. Please try again.`,
              payload: { donationId: donation._id, eventId: donation.event, type: "donation_failed" }
            });
          } catch (err) {
            console.error("Error sending donation failure notification:", err);
          }
        }
      } else {
        donation.status = "pending";
        await donation.save();
      }

      console.log("✅ Donation updated (intent):", donation.status);
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
      } else if (["failed", "expired"].includes(status)) {
        donation.status = "failed";
        await donation.save();
        // Send failure notification to donor
        if (donation.user) {
          try {
            await notifyUsers({
              userIds: [donation.user],
              title: "Donation Failed",
              message: `Your donation of ₱${donation.amount} failed. Please try again.`,
              payload: { donationId: donation._id, eventId: donation.event, type: "donation_failed" }
            });
          } catch (err) {
            console.error("Error sending donation failure notification:", err);
          }
        }
      } else {
        donation.status = "pending";
        await donation.save();
      }

      console.log("✅ Donation updated (source):", donation.status);
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
          // Send failure notification to donor
          if (donation.user) {
            try {
              await notifyUsers({
                userIds: [donation.user],
                title: "Donation Failed",
                message: `Your donation of ₱${donation.amount} failed. Please try again.`,
                payload: { donationId: donation._id, eventId: donation.event, type: "donation_failed" }
              });
            } catch (err) {
              console.error("Error sending donation failure notification:", err);
            }
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
        const donations = await donationModel.find({ user: userId }).sort({ createdAt: -1 });
        return res.json({ success: true, donations });
    } catch (error) {
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
        
        // Get all donations and populate user and event
        const donations = await donationModel.find({})
            .populate('user', 'name email profileImage')
            .populate('event', 'title')
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

export const downloadReceipt = async (req, res) => {
    try {
        const { id } = req.params;
        const donation = await donationModel.findById(id).populate('event', 'title');
        if (!donation) return res.status(404).json({ success: false, message: "Not found" });
        if (donation.status !== "succeeded") {
            return res.status(400).json({ success: false, message: "Receipt available only for completed donations" });
        }
        const receiptsDir = path.join(process.cwd(), "backend", "uploads", "receipts");
        if (!fs.existsSync(receiptsDir)) fs.mkdirSync(receiptsDir, { recursive: true });
        const filePath = path.join(receiptsDir, `${donation._id}.pdf`);
        const doc = new pdfkit({ size: "A4", margin: 60 });
        const stream = fs.createWriteStream(filePath);
        doc.pipe(stream);
        
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
            doc.text(`Transaction ID: ${donation.paymongoReferenceId}`, 85, doc.y);
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
            doc.y += 40; // Approximate height for message
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
        
        // Draw filled rectangle with border
        doc.save();
        doc.fillColor('#E6F7E6');
        doc.rect(statusX, statusY, statusWidth, statusHeight);
        doc.fill();
        
        doc.strokeColor('#006600');
        doc.lineWidth(2);
        doc.rect(statusX, statusY, statusWidth, statusHeight);
        doc.stroke();
        doc.restore();
        
        // Add text on top
        doc.fillColor('#006600');
        doc.fontSize(14).font('Helvetica-Bold');
        doc.text('✓ PAYMENT SUCCEEDED', statusX, statusY + 11, { 
            width: statusWidth, 
            align: 'center'
        });
        doc.fillColor('#000000');
        
        // Move cursor below badge
        doc.y = statusY + statusHeight + 20;
        
        // Footer Section
        doc.fontSize(12).font('Helvetica');
        doc.fillColor('#666666');
        doc.text('Thank you for your generous donation!', 60, doc.y, { align: 'center', width: 492 });
        doc.y += 20;
        doc.fontSize(11);
        doc.text('This receipt serves as proof of your donation to EUMATTER.', 60, doc.y, { align: 'center', width: 492 });
        doc.y += 18;
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
        stream.on("finish", () => {
            res.download(filePath, `donation-receipt-${donation._id}.pdf`);
        });
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
