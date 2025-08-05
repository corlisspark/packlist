// Firebase Functions Email Example
// Place this in functions/index.js for your Firebase project

const functions = require('firebase-functions');
const admin = require('firebase-admin');
const nodemailer = require('nodemailer');

admin.initializeApp();

// Configure email transporter
const transporter = nodemailer.createTransporter({
  service: 'gmail', // or your email provider
  auth: {
    user: 'your-email@gmail.com',
    pass: 'your-app-password' // Use app passwords for Gmail
  }
});

// Send pack notification email
exports.sendPackNotification = functions.firestore
  .document('posts/{postId}')
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();
    
    // Only send email if status changed to approved or rejected
    if (before.status !== after.status && 
        (after.status === 'approved' || after.status === 'rejected')) {
      
      try {
        // Get user data
        const userDoc = await admin.firestore()
          .collection('users')
          .doc(after.userId)
          .get();
        
        if (!userDoc.exists) return;
        
        const userData = userDoc.data();
        
        // Skip if user doesn't want email notifications
        if (!userData.preferences?.emailNotifications) return;
        
        const mailOptions = {
          from: 'PacksList <noreply@packslist.com>',
          to: userData.email,
          subject: `Your pack "${after.title}" has been ${after.status}`,
          html: generateEmailTemplate(after, userData, after.status)
        };
        
        await transporter.sendMail(mailOptions);
        console.log('Email sent successfully to:', userData.email);
        
      } catch (error) {
        console.error('Error sending email:', error);
      }
    }
  });

// Generate email template
function generateEmailTemplate(packData, userData, status) {
  const isApproved = status === 'approved';
  const statusColor = isApproved ? '#28a745' : '#dc3545';
  const statusText = isApproved ? 'Approved' : 'Rejected';
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background: #f8f9fa; }
        .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; }
        .header { background: ${statusColor}; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; }
        .footer { background: #f8f9fa; padding: 15px; text-align: center; font-size: 12px; color: #666; }
        .button { display: inline-block; padding: 12px 24px; background: #007bff; color: white; text-decoration: none; border-radius: 5px; margin: 10px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🌿 PacksList</h1>
          <h2>Pack ${statusText}</h2>
        </div>
        <div class="content">
          <p>Hi ${userData.displayName || 'there'},</p>
          <p>Your pack listing "<strong>${packData.title}</strong>" has been <strong>${statusText.toLowerCase()}</strong>.</p>
          
          ${isApproved ? `
            <p>🎉 Great news! Your pack is now live and visible to other users in ${packData.location}.</p>
            <a href="${process.env.APP_URL || 'https://packslist.com'}" class="button">View Your Pack</a>
          ` : `
            <p>Unfortunately, your pack listing didn't meet our community guidelines. You can resubmit with corrections.</p>
            <a href="${process.env.APP_URL || 'https://packslist.com'}/new.html" class="button">Submit New Pack</a>
          `}
          
          <p>Thanks for using PacksList!</p>
        </div>
        <div class="footer">
          <p>This email was sent automatically. Please don't reply to this email.</p>
          <p>PacksList - Local Delivery Network</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

// Send welcome email for new users
exports.sendWelcomeEmail = functions.auth.user().onCreate(async (user) => {
  const mailOptions = {
    from: 'PacksList <welcome@packslist.com>',
    to: user.email,
    subject: 'Welcome to PacksList! 🌿',
    html: `
      <h1>Welcome to PacksList!</h1>
      <p>Hi ${user.displayName || 'there'},</p>
      <p>Thanks for joining our local delivery community!</p>
      <p>You can now browse and post pack listings in your area.</p>
      <a href="${process.env.APP_URL || 'https://packslist.com'}" style="background: #28a745; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px;">Start Browsing</a>
    `
  };
  
  try {
    await transporter.sendMail(mailOptions);
    console.log('Welcome email sent to:', user.email);
  } catch (error) {
    console.error('Error sending welcome email:', error);
  }
});