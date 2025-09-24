// services/emailService.js - Updated for Brevo API

const nodemailer = require('nodemailer');
const SibApiV3Sdk = require('@sendinblue/client');
require('dotenv').config();

const createBrevoClient = () => {
  if (process.env.BREVO_API_KEY) {
    const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();
    const apiKey = apiInstance.authentications['apiKey'];
    apiKey.apiKey = process.env.BREVO_API_KEY;
    return apiInstance;
  }
  return null;
};

const createTransporter = () => {

  if (process.env.BREVO_API_KEY) {
    console.log('🚀 Using Brevo transporter...');
    try {
      return nodemailer.createTransport({
        host: 'smtp-relay.brevo.com',
        port: 587,
        secure: false, // true for 465, false for other ports
        auth: {
          user: process.env.BREVO_LOGIN || process.env.BREVO_EMAIL, // Your Brevo login email
          pass: process.env.BREVO_API_KEY // Your Brevo API key
        },
        tls: {
          rejectUnauthorized: false
        }
      });
    } catch (error) {
      console.error('⚠️ Failed to create Brevo transporter:', error.message);
    }
  }

  // Try Mailgun as fallback
  if (process.env.MAILGUN_API_KEY && process.env.MAILGUN_DOMAIN) {
    console.log('📧 Using Mailgun transporter...');
    try {
      return nodemailer.createTransporter({
        host: 'smtp.mailgun.org',
        port: 587,
        secure: false,
        auth: {
          user: `postmaster@${process.env.MAILGUN_DOMAIN}`,
          pass: process.env.MAILGUN_API_KEY
        }
      });
    } catch (error) {
      console.error('⚠️ Failed to create Mailgun transporter:', error.message);
    }
  }

  // Gmail fallback (for local development only)
  if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
    console.log('📧 Using Gmail transporter (local development only)...');
    console.warn('⚠️ Note: Gmail SMTP may not work on Render due to port restrictions');
    
    try {
      return nodemailer.createTransporter({
        service: 'gmail',
        host: 'smtp.gmail.com',
        port: 587,
        secure: false,
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS
        },
        tls: {
          rejectUnauthorized: false
        },
        connectionTimeout: 60000,
        greetingTimeout: 30000,
        socketTimeout: 60000,
      });
    } catch (error) {
      console.error('⚠️ Failed to create Gmail transporter:', error.message);
    }
  }

  console.warn('⚠️ No email service configured');
  console.log('💡 To set up Brevo (recommended):');
  console.log('1. Sign up at https://brevo.com (300 emails/day free forever)');
  console.log('2. Go to Settings → SMTP & API → SMTP');
  console.log('3. Get your login email and API key');
  console.log('4. Set these environment variables:');
  console.log('   BREVO_LOGIN=your-login-email@example.com');
  console.log('   BREVO_API_KEY=your-api-key');
  console.log('   BREVO_FROM_EMAIL=TalentConnect <noreply@yourdomain.com>');
  
  return null;
};

const transporter = createTransporter();

// Get the FROM email address
const getFromEmail = () => {
  if (process.env.BREVO_FROM_EMAIL) {
    return process.env.BREVO_FROM_EMAIL;
  } else if (process.env.BREVO_LOGIN) {
    return {
      name: 'TalentConnect',
      address: process.env.BREVO_LOGIN
    };
  } else if (process.env.MAILGUN_FROM_EMAIL) {
    return process.env.MAILGUN_FROM_EMAIL;
  } else if (process.env.MAILGUN_DOMAIN) {
    return {
      name: 'TalentConnect',
      address: `noreply@${process.env.MAILGUN_DOMAIN}`
    };
  } else if (process.env.EMAIL_USER) {
    return {
      name: 'TalentConnect',
      address: process.env.EMAIL_USER
    };
  } else {
    return {
      name: 'TalentConnect',
      address: 'noreply@example.com'
    };
  }
};

// Enhanced verification with better error reporting
const verifyEmailConfig = async () => {
  if (!transporter) {
    console.log('❌ Email service disabled - no transporter available');
    
    // Show setup instructions based on environment
    if (process.env.NODE_ENV === 'production') {
      console.log('📧 PRODUCTION SETUP REQUIRED:');
      console.log('Option 1 - Brevo (RECOMMENDED - 300 emails/day free):');
      console.log('1. Sign up at https://brevo.com');
      console.log('2. Go to Settings → SMTP & API → SMTP');
      console.log('3. Add environment variables in Render:');
      console.log('   BREVO_LOGIN=your-login-email@example.com');
      console.log('   BREVO_API_KEY=your-api-key');
      console.log('   BREVO_FROM_EMAIL=TalentConnect <noreply@yourdomain.com>');
      console.log('');
      console.log('Option 2 - Mailgun:');
      console.log('   MAILGUN_API_KEY=key-your-api-key');
      console.log('   MAILGUN_DOMAIN=your-domain.mailgun.org');
    } else {
      console.log('📧 DEVELOPMENT SETUP:');
      console.log('Add to your .env file:');
      console.log('BREVO_LOGIN=your-login-email@example.com');
      console.log('BREVO_API_KEY=your-api-key');
      console.log('BREVO_FROM_EMAIL=TalentConnect <noreply@yourdomain.com>');
    }
    
    return false;
  }

  try {
    console.log('🔍 Verifying email configuration...');
    await transporter.verify();
    console.log('✅ Email service is ready');
    
    // Log which service is being used
    if (process.env.BREVO_API_KEY) {
      console.log(`📧 Using Brevo with login: ${process.env.BREVO_LOGIN}`);
      console.log('📊 Daily limit: 300 emails (Brevo free plan)');
    } else if (process.env.MAILGUN_API_KEY) {
      console.log(`📧 Using Mailgun domain: ${process.env.MAILGUN_DOMAIN}`);
    } else {
      console.log('📧 Using Gmail SMTP');
    }
    
    return true;
  } catch (error) {
    console.error('❌ Email service verification failed:');
    console.error('Error code:', error.code);
    console.error('Error message:', error.message);
    
    // Provide specific troubleshooting
    if (error.code === 'ETIMEDOUT') {
      console.error('💡 Connection timeout - check your network/firewall');
    } else if (error.code === 'EAUTH') {
      console.error('💡 Authentication failed - check your API key/credentials');
      if (process.env.BREVO_API_KEY) {
        console.error('💡 For Brevo: Make sure you\'re using the SMTP API key, not the API v3 key');
      }
    } else if (error.code === 'ENOTFOUND') {
      console.error('💡 Host not found - check your SMTP host configuration');
    }
    
    return false;
  }
};

const sendEmailWithBrevoAPI = async (emailData) => {
  const brevoClient = createBrevoClient();
  if (!brevoClient) {
    return { success: false, error: 'Brevo API not configured' };
  }
  try {
    const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();
    
    sendSmtpEmail.subject = emailData.subject;
    sendSmtpEmail.htmlContent = emailData.html;
    sendSmtpEmail.textContent = emailData.text;
    sendSmtpEmail.sender = { 
      name: "TalentConnect", 
      email: process.env.BREVO_LOGIN 
    };
    sendSmtpEmail.to = [{ email: emailData.to }];
    
    const result = await brevoClient.sendTransacEmail(sendSmtpEmail);
    console.log('Email sent successfully via Brevo API:', result.response.statusCode);
    return { success: true, messageId: result.response.headers['x-message-id'] };
    
  } catch (error) {
    console.error('Brevo API error:', error);
    return { success: false, error: error.message };
  }
};

// Enhanced email sending with retry logic
const sendEmailWithRetry = async (mailOptions, maxRetries = 3) => {
  // Try Brevo API first if available
  if (process.env.BREVO_API_KEY) {
    console.log('📧 Attempting to send via Brevo API...');
    const result = await sendEmailWithBrevoAPI(mailOptions);
    if (result.success) {
      return result;
    } else {
      console.warn('⚠️ Brevo API failed, falling back to SMTP...');
    }
  }

  if (!transporter) {
    const error = 'Email service not configured';
    console.error('❌', error);
    return { success: false, error };
  }

  // Ensure FROM field is set correctly
  mailOptions.from = getFromEmail();
  
  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`📧 Sending email (attempt ${attempt}/${maxRetries})...`);
      console.log(`📤 From: ${JSON.stringify(mailOptions.from)}`);
      console.log(`📤 To: ${mailOptions.to}`);
      console.log(`📤 Subject: ${mailOptions.subject}`);
      
      const result = await transporter.sendMail(mailOptions);
      console.log('✅ Email sent successfully!');
      console.log('📧 Message ID:', result.messageId);
      console.log('📧 Response:', result.response);
      
      return { success: true, messageId: result.messageId };
      
    } catch (error) {
      lastError = error;
      console.error(`❌ Email send attempt ${attempt} failed:`, error.message);
      console.error('Error details:', {
        code: error.code,
        response: error.response,
        responseCode: error.responseCode
      });
      
      // Don't retry for authentication errors
      if (error.code === 'EAUTH' || error.responseCode === 401) {
        console.error('🚫 Authentication error - not retrying');
        break;
      }
      
      // Don't retry for rate limiting (Brevo specific)
      if (error.responseCode === 429) {
        console.error('🚫 Rate limit exceeded - not retrying');
        break;
      }
      
      if (attempt < maxRetries) {
        const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
        console.log(`⏳ Retrying in ${delay/1000} seconds...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  return { success: false, error: lastError.message };
};

// Welcome email template for job seekers
const getJobSeekerWelcomeTemplate = (userData) => {
  return {
    subject: 'Welcome to TalentConnect! Your Account is Ready 🎉',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f4f4; }
          .container { max-width: 600px; margin: 20px auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-align: center; padding: 40px 20px; }
          .header h1 { margin: 0; font-size: 28px; font-weight: bold; }
          .header p { margin: 10px 0 0 0; font-size: 16px; opacity: 0.9; }
          .content { padding: 40px 30px; }
          .content h2 { color: #333; margin-top: 0; font-size: 24px; }
          .feature { background: #f8f9fa; padding: 20px; margin: 20px 0; border-radius: 8px; border-left: 4px solid #667eea; }
          .feature h3 { margin: 0 0 10px 0; color: #667eea; font-size: 18px; }
          .feature ul { margin: 10px 0; padding-left: 20px; }
          .feature ul li { margin: 5px 0; }
          .button { display: inline-block; background: #667eea; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0; transition: background 0.3s; }
          .button:hover { background: #5a67d8; }
          .footer { background: #f8f9fa; padding: 30px; text-align: center; border-top: 1px solid #e2e8f0; color: #666; font-size: 14px; }
          .footer p { margin: 5px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎉 Welcome to TalentConnect!</h1>
            <p>Your freelance journey starts here</p>
          </div>
          
          <div class="content">
            <h2>Hello ${userData.firstName} ${userData.lastName}!</h2>
            
            <p>Congratulations! Your TalentConnect account has been successfully created. You're now part of a vibrant community of talented professionals ready to connect with amazing opportunities.</p>
            
            <div class="feature">
              <h3>📋 Your Profile Details</h3>
              <p><strong>Username:</strong> ${userData.userName}<br>
                 <strong>Email:</strong> ${userData.email}<br>
                 <strong>Account Type:</strong> Job Seeker</p>
            </div>
            
            <div class="feature">
              <h3>🚀 What's Next?</h3>
              <ul>
                <li>Complete your profile with skills and experience</li>
                <li>Upload your professional CV and certificates</li>
                <li>Set your availability status</li>
                <li>Start connecting with top recruiters</li>
              </ul>
            </div>
            
            <div class="feature">
              <h3>💡 Pro Tips for Success</h3>
              <ul>
                <li>Keep your profile updated with your latest skills</li>
                <li>Upload a professional CV in PDF format</li>
                <li>Add your LinkedIn and GitHub profile links</li>
                <li>Write a compelling bio that highlights your expertise</li>
              </ul>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/login" class="button">
                🚀 Access Your Dashboard
              </a>
            </div>
            
            <p>If you have any questions or need help getting started, feel free to reply to this email or contact our support team. We're here to help you succeed!</p>
            
            <p style="margin-top: 30px;"><strong>Best regards,</strong><br>The TalentConnect Team</p>
          </div>
          
          <div class="footer">
            <p><strong>TalentConnect</strong> - Connecting Talent with Opportunity</p>
            <p>© 2024 TalentConnect. All rights reserved.</p>
            <p style="margin-top: 15px;">This email was sent to <strong>${userData.email}</strong></p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `
      Welcome to TalentConnect, ${userData.firstName}!
      
      🎉 Your account has been successfully created!
      
      Account Details:
      - Username: ${userData.userName}
      - Email: ${userData.email}
      - Account Type: Job Seeker
      
      What's Next:
      ✓ Complete your profile with skills and experience
      ✓ Upload your professional CV and certificates
      ✓ Set your availability status
      ✓ Start connecting with top recruiters
      
      Pro Tips:
      • Keep your profile updated with latest skills
      • Upload a professional CV in PDF format
      • Add LinkedIn and GitHub profile links
      • Write a compelling bio highlighting your expertise
      
      Access your dashboard: ${process.env.FRONTEND_URL || 'http://localhost:3000'}/login
      
      Questions? Reply to this email - we're here to help!
      
      Best regards,
      The TalentConnect Team
      
      ---
      TalentConnect - Connecting Talent with Opportunity
      © 2024 TalentConnect. All rights reserved.
    `
  };
};

// Welcome email template for recruiters
const getRecruiterWelcomeTemplate = (userData, companyName) => {
  return {
    subject: 'Welcome to TalentConnect! Start Finding Great Talent 🎯',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f4f4; }
          .container { max-width: 600px; margin: 20px auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); }
          .header { background: linear-gradient(135deg, #9c27b0 0%, #673ab7 100%); color: white; text-align: center; padding: 40px 20px; }
          .header h1 { margin: 0; font-size: 28px; font-weight: bold; }
          .header p { margin: 10px 0 0 0; font-size: 16px; opacity: 0.9; }
          .content { padding: 40px 30px; }
          .content h2 { color: #333; margin-top: 0; font-size: 24px; }
          .feature { background: #f8f9fa; padding: 20px; margin: 20px 0; border-radius: 8px; border-left: 4px solid #9c27b0; }
          .feature h3 { margin: 0 0 10px 0; color: #9c27b0; font-size: 18px; }
          .feature ul { margin: 10px 0; padding-left: 20px; }
          .feature ul li { margin: 8px 0; }
          .button { display: inline-block; background: #9c27b0; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0; transition: background 0.3s; }
          .button:hover { background: #8e24aa; }
          .footer { background: #f8f9fa; padding: 30px; text-align: center; border-top: 1px solid #e2e8f0; color: #666; font-size: 14px; }
          .footer p { margin: 5px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎯 Welcome to TalentConnect!</h1>
            <p>Your talent acquisition journey begins now</p>
          </div>
          
          <div class="content">
            <h2>Hello ${userData.firstName}!</h2>
            
            <p>Welcome to TalentConnect! Your recruiter account for <strong>${companyName}</strong> has been successfully created. You now have access to our extensive network of talented professionals.</p>
            
            <div class="feature">
              <h3>🏢 Your Company Profile</h3>
              <p><strong>Company:</strong> ${companyName}<br>
                 <strong>Contact Person:</strong> ${userData.firstName} ${userData.lastName}<br>
                 <strong>Email:</strong> ${userData.email}</p>
            </div>
            
            <div class="feature">
              <h3>🔍 Powerful Recruiter Toolkit</h3>
              <ul>
                <li><strong>Smart Search:</strong> Find candidates by job title, location, and specific skills</li>
                <li><strong>AI Skill Matcher:</strong> Match job requirements with candidate expertise</li>
                <li><strong>Advanced Filters:</strong> Filter by experience level, availability, and salary expectations</li>
                <li><strong>Direct Contact:</strong> Connect with candidates instantly through our messaging system</li>
                <li><strong>Profile Analytics:</strong> View detailed candidate profiles and work history</li>
              </ul>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/login" class="button">
                🚀 Access Recruiter Dashboard
              </a>
            </div>
            
            <p>Start exploring our talent pool today and discover the perfect candidates for your projects and positions!</p>
            
            <p style="margin-top: 30px;"><strong>Best regards,</strong><br>The TalentConnect Team</p>
          </div>
          
          <div class="footer">
            <p><strong>TalentConnect</strong> - Connecting Talent with Opportunity</p>
            <p>© 2024 TalentConnect. All rights reserved.</p>
            <p style="margin-top: 15px;">This email was sent to <strong>${userData.email}</strong></p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `
      Welcome to TalentConnect!
      
      🎯 Your recruiter account for ${companyName} has been successfully created!
      
      Company Profile:
      - Company: ${companyName}
      - Contact: ${userData.firstName} ${userData.lastName}
      - Email: ${userData.email}
      
      Recruiter Toolkit Features:
      ✓ Smart Search for candidates by title, location, skills
      ✓ AI Skill Matcher for job requirements
      ✓ Advanced filters by experience and availability
      ✓ Direct contact with candidates
      ✓ Detailed profile analytics
      
      Access your dashboard: ${process.env.FRONTEND_URL || 'http://localhost:3000'}/login
      
      Start exploring our talent pool and find the perfect candidates!
      
      Best regards,
      The TalentConnect Team
      
      ---
      TalentConnect - Connecting Talent with Opportunity
      © 2024 TalentConnect. All rights reserved.
    `
  };
};

// Send welcome email
const sendWelcomeEmail = async (userData, userType, companyName = null) => {
  try {
    let emailTemplate;
    
    if (userType === 'jobseeker') {
      emailTemplate = getJobSeekerWelcomeTemplate(userData);
    } else if (userType === 'recruiter') {
      emailTemplate = getRecruiterWelcomeTemplate(userData, companyName);
    } else {
      throw new Error('Invalid user type');
    }
    
    const mailOptions = {
      to: userData.email,
      subject: emailTemplate.subject,
      html: emailTemplate.html,
      text: emailTemplate.text
    };
    
    return await sendEmailWithRetry(mailOptions);
    
  } catch (error) {
    console.error('❌ Failed to send welcome email:', error.message);
    return { success: false, error: error.message };
  }
};

// Send password reset email
const sendPasswordResetEmail = async (user, resetToken) => {
  try {
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;
    
    const mailOptions = {
      to: user.email,
      subject: '🔒 Reset Your TalentConnect Password',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f4f4; }
            .container { max-width: 600px; margin: 20px auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); }
            .header { background: linear-gradient(135deg, #f44336 0%, #e91e63 100%); color: white; text-align: center; padding: 40px 20px; }
            .header h1 { margin: 0; font-size: 28px; font-weight: bold; }
            .content { padding: 40px 30px; }
            .button { display: inline-block; background: #f44336; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0; }
            .warning { background: #fff3cd; border: 1px solid #ffeaa7; padding: 20px; border-radius: 8px; margin: 20px 0; }
            .footer { background: #f8f9fa; padding: 30px; text-align: center; border-top: 1px solid #e2e8f0; color: #666; font-size: 14px; }
            .url-box { background: #f0f0f0; padding: 15px; border-radius: 6px; word-break: break-all; font-family: monospace; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🔒 Password Reset Request</h1>
              <p>Secure your TalentConnect account</p>
            </div>
            
            <div class="content">
              <h2>Hello ${user.firstName}!</h2>
              
              <p>You requested a password reset for your TalentConnect account (<strong>${user.email}</strong>).</p>
              
              <p>Click the button below to create a new password:</p>
              
              <div style="text-align: center;">
                <a href="${resetUrl}" class="button">🔓 Reset My Password</a>
              </div>
              
              <p>If the button doesn't work, copy and paste this link into your browser:</p>
              <div class="url-box">${resetUrl}</div>
              
              <div class="warning">
                <strong>⚠️ Important Security Information:</strong>
                <ul>
                  <li>This link will expire in <strong>1 hour</strong> for security</li>
                  <li>You can only use this link <strong>once</strong></li>
                  <li>If you didn't request this reset, please ignore this email</li>
                  <li>Your current password remains active until you create a new one</li>
                </ul>
              </div>
              
              <p>If you have any concerns about your account security, please contact our support team immediately.</p>
              
              <p><strong>Best regards,</strong><br>The TalentConnect Security Team</p>
            </div>
            
            <div class="footer">
              <p>© 2024 TalentConnect. All rights reserved.</p>
              <p>This email was sent to <strong>${user.email}</strong></p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
        🔒 Password Reset Request - TalentConnect
        
        Hello ${user.firstName},
        
        You requested a password reset for your TalentConnect account (${user.email}).
        
        Click this link to reset your password: ${resetUrl}
        
        ⚠️ IMPORTANT SECURITY INFORMATION:
        - This link expires in 1 hour for security
        - You can only use this link once
        - If you didn't request this reset, ignore this email
        - Your current password remains active until you create a new one
        
        If you have security concerns, contact our support team immediately.
        
        Best regards,
        The TalentConnect Security Team
        
        ---
        © 2024 TalentConnect. All rights reserved.
      `
    };
    
    return await sendEmailWithRetry(mailOptions);
    
  } catch (error) {
    console.error('❌ Failed to send password reset email:', error.message);
    return { success: false, error: error.message };
  }
};

// Send contact email from recruiter to candidate
const sendContactEmail = async (candidate, emailData) => {
  try {
    const { subject, message, senderInfo } = emailData;
    const candidateName = `${candidate.firstName} ${candidate.lastName}`;
    
    const mailOptions = {
      to: candidate.email,
      subject: subject,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f5f5f5; }
            .container { max-width: 600px; margin: 20px auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; }
            .content { padding: 40px 30px; }
            .candidate-info { background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 25px; border-left: 4px solid #667eea; }
            .message-content { background: #ffffff; padding: 25px; border: 1px solid #e9ecef; border-radius: 8px; margin: 25px 0; white-space: pre-wrap; font-family: Georgia, serif; line-height: 1.8; }
            .cta-button { display: inline-block; background: #28a745; color: white; padding: 15px 25px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0; }
            .warning { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 8px; margin: 20px 0; font-size: 14px; }
            .footer { background: #f8f9fa; padding: 30px; text-align: center; border-top: 1px solid #e9ecef; font-size: 14px; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>💼 New Opportunity</h1>
              <p>Message via TalentConnect Platform</p>
            </div>
            
            <div class="content">
              <div class="candidate-info">
                <h3>Hello ${candidateName}!</h3>
                <p>A recruiter found your profile on TalentConnect and wants to connect with you regarding a potential opportunity.</p>
                <p><strong>Your Profile:</strong> ${candidate.title || 'Professional'}</p>
              </div>
              
              <div class="message-content">${message.replace(/\n/g, '<br>')}</div>
              
              <div style="text-align: center;">
                <p><strong>Interested in this opportunity?</strong></p>
                <a href="mailto:${senderInfo.email || 'noreply@talentconnect.com'}?subject=Re: ${encodeURIComponent(subject)}" class="cta-button">
                  📧 Reply to Recruiter
                </a>
              </div>
              
              <div class="warning">
                <strong>🛡️ Safety Reminder:</strong>
                <ul style="margin: 8px 0; padding-left: 20px;">
                  <li>This message was sent through TalentConnect</li>
                  <li>Always verify company details before sharing personal information</li>
                  <li>Be cautious of requests for immediate payments or personal documents</li>
                  <li>If this seems suspicious, please report it to our support team</li>
                </ul>
              </div>
              
              <p style="margin-top: 30px;">
                <strong>From:</strong> ${senderInfo.name || 'TalentConnect Recruiter'}<br>
                <strong>Sent via:</strong> TalentConnect Platform<br>
                <strong>Date:</strong> ${new Date().toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </p>
            </div>
            
            <div class="footer">
              <p><strong>TalentConnect</strong> - Connecting Talent with Opportunity</p>
              <p>© 2024 TalentConnect. All rights reserved.</p>
              <p style="margin-top: 16px;">
                This email was sent to <strong>${candidate.email}</strong><br>
                <a href="#" style="color: #666;">Unsubscribe</a> | 
                <a href="#" style="color: #666;">Report Spam</a>
              </p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
        💼 New Opportunity - TalentConnect
        
        Hello ${candidateName}!
        
        A recruiter found your profile on TalentConnect and wants to connect with you regarding a potential opportunity.
        
        Your Profile: ${candidate.title || 'Professional'}
        
        MESSAGE:
        ${message}
        
        From: ${senderInfo.name || 'TalentConnect Recruiter'}
        Date: ${new Date().toLocaleDateString()}
        
        To reply, send an email to: ${senderInfo.email || 'noreply@talentconnect.com'}
        Subject: Re: ${subject}
        
        🛡️ SAFETY REMINDER:
        - This message was sent through TalentConnect
        - Always verify company details before sharing personal information
        - Be cautious of requests for payments or personal documents
        
        Best regards,
        TalentConnect Team
        
        ---
        This email was sent to ${candidate.email}
        © 2024 TalentConnect. All rights reserved.
      `,
      replyTo: senderInfo.email || 'noreply@talentconnect.com'
    };
    
    return await sendEmailWithRetry(mailOptions);
    
  } catch (error) {
    console.error('❌ Failed to send contact email:', error.message);
    return { success: false, error: error.message };
  }
};

module.exports = {
  verifyEmailConfig,
  sendWelcomeEmail,
  sendPasswordResetEmail,
  sendContactEmail,
  transporter
};