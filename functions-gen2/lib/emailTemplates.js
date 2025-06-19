"use strict";
/**
 * PWA-Enhanced Email Templates for Lumino Learning
 * Step 2: PWA-Aware Email Templates with Installation Guidance
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPersonalizedInstallInstructions = exports.createPWAPasswordSetupTemplate = exports.createPWAEmailLinkTemplate = exports.createAssignmentEmailTemplate = void 0;
/**
 * Enhanced PWA-Aware Assignment Email Template
 * Includes PWA installation guidance and optimized deep linking
 */
const createAssignmentEmailTemplate = (studentName, activityName, dueDate, assignmentToken, baseUrl = 'https://verse-dev-central.web.app') => {
    // Use direct links for email to avoid email client popup blocking
    // Launcher is great for browser-to-PWA but email clients block the intermediate window
    const pwaInstallLink = `${baseUrl}/student?pwa=install&pwa_type=student&from=email`;
    const assignmentLink = `${baseUrl}/play?token=${assignmentToken}&pwa=true&pwa_type=game&from=email&emailAccess=true`;
    const dashboardLink = `${baseUrl}/student?pwa_type=student&from=email`;
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>New Assignment from Lumino Learning</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f8fafc;
        }
        .container {
            background: white;
            border-radius: 12px;
            padding: 30px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        .pwa-badge {
            display: inline-block;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 8px 16px;
            border-radius: 20px;
            font-size: 14px;
            font-weight: bold;
            margin-bottom: 20px;
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
        }
        .assignment-info {
            background: #f1f5f9;
            padding: 20px;
            border-radius: 8px;
            margin: 20px 0;
        }
        .cta-section {
            margin: 30px 0;
            text-align: center;
        }
        .cta-button {
            display: inline-block;
            padding: 14px 28px;
            margin: 8px;
            text-decoration: none;
            border-radius: 8px;
            font-weight: bold;
            font-size: 16px;
            transition: all 0.3s ease;
        }
        .primary-button {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
        }
        .secondary-button {
            background: #10b981;
            color: white;
        }
        .tertiary-button {
            background: #3b82f6;
            color: white;
        }
        .install-section {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 25px;
            border-radius: 12px;
            margin: 25px 0;
            text-align: center;
        }
        .install-steps {
            text-align: left;
            margin: 20px 0;
        }
        .install-steps h4 {
            color: #1f2937;
            margin-top: 20px;
        }
        .benefits {
            background: #ecfdf5;
            padding: 20px;
            border-radius: 8px;
            margin: 20px 0;
        }
        .smart-links {
            background: #fef3c7;
            padding: 20px;
            border-radius: 8px;
            margin: 20px 0;
        }
        .footer {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
            font-size: 14px;
            color: #6b7280;
        }
        .interceptor-notice {
            background: #e0f2fe;
            border: 1px solid #0288d1;
            padding: 15px;
            border-radius: 8px;
            margin: 20px 0;
            font-size: 14px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="pwa-badge">📱 PWA READY</div>
            <h1>Hello ${studentName},</h1>
            <p>You have been assigned a new learning activity:</p>
        </div>

        <div class="assignment-info">
            <h2><strong>Activity:</strong> ${activityName}</h2>
            <p><strong>Due Date:</strong> ${dueDate}</p>
        </div>

        <div class="install-section">
            <h2>🚀 Get the App Experience!</h2>
            <p>Install Lumino Learning as an app on your device for faster access to assignments and an app-like experience!</p>
        </div>

        <div class="cta-section">
            <a href="${pwaInstallLink}" class="cta-button primary-button">
                📱 Install Lumino Learning App
            </a>
            <br>
            <a href="${assignmentLink}" class="cta-button secondary-button">
                🎮 Start Assignment Now
            </a>
            <br>
            <a href="${dashboardLink}" class="cta-button tertiary-button">
                📚 Visit Student Dashboard
            </a>
        </div>

        <div class="interceptor-notice">
            <h3>🔗 Direct Link Access:</h3>
            <p>These links are optimized for email and will open directly in your browser or PWA app if installed. No intermediate screens - straight to your content!</p>
        </div>

        <div class="install-steps">
            <h3>📱 How to Install the App:</h3>
            <h4>On Mobile (Chrome/Safari):</h4>
            <ol>
                <li>Tap "Install Lumino Learning App" above</li>
                <li>Look for the install prompt or "Add to Home Screen"</li>
                <li>Tap "Install" or "Add" when prompted</li>
                <li>Find the app icon on your home screen!</li>
            </ol>
            
            <h4>On Desktop (Chrome/Edge):</h4>
            <ol>
                <li>Click "Install Lumino Learning App" above</li>
                <li>Look for the install icon in your address bar</li>
                <li>Click "Install Lumino Learning" when prompted</li>
                <li>Find the app in your applications folder!</li>
            </ol>
        </div>

        <div class="benefits">
            <h3>✨ Benefits:</h3>
            <p>Faster loading, works offline, and feels like a native app!</p>
        </div>

        <div class="smart-links">
            <h3>🔗 Three Ways to Access:</h3>
            <p><strong>🚀 Option 1 - Install App (Recommended):</strong></p>
            <ul>
                <li>Click "Install Lumino Learning App" above</li>
                <li>Get native app experience with faster performance</li>
                <li>Access all assignments from your home screen</li>
            </ul>
            
            <p><strong>⚡ Option 2 - Direct Assignment:</strong></p>
            <ul>
                <li>Click "Start Assignment Now" above</li>
                <li>Begin your assignment immediately</li>
                <li>No login required for this specific assignment</li>
            </ul>
            
            <p><strong>📚 Option 3 - Student Dashboard:</strong></p>
            <ul>
                <li>Click "Visit Student Dashboard" above</li>
                <li>Sign in to view all your assignments</li>
                <li>Track progress and access additional features</li>
            </ul>
        </div>

        <div class="smart-links">
            <h3>🔗 Smart Links:</h3>
            <p>These links will automatically try to open in the Lumino Learning app if you have it installed, or open in your browser if you don't. The app provides a faster, more engaging experience!</p>
            
            <p><strong>📱 PWA Installation Link:</strong></p>
            <p><a href="${pwaInstallLink}">${pwaInstallLink}</a></p>
            
            <p><strong>🎮 Direct Assignment Link:</strong></p>
            <p><a href="${assignmentLink}">${assignmentLink}</a></p>
            
            <p><strong>📚 Student Dashboard Link:</strong></p>
            <p><a href="${dashboardLink}">${dashboardLink}</a></p>
        </div>

        <div class="footer">
            <p>These links are unique to you. Please do not share them with others.</p>
        </div>
    </div>
</body>
</html>
  `.trim();
};
exports.createAssignmentEmailTemplate = createAssignmentEmailTemplate;
/**
 * PWA-Aware Email Link Authentication Template
 * For assignments requiring authentication with PWA guidance
 */
const createPWAEmailLinkTemplate = (data) => {
    const { studentName, gameTitle, formattedDate, assignmentLink, studentPortalLink, baseUrl, pwaInstallUrl = `${baseUrl}/student?pwa=install` } = data;
    return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f8f9fa; padding: 20px; border-radius: 8px;">
      <div style="background-color: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
        
        <!-- Header with Security Badge -->
        <div style="text-align: center; margin-bottom: 20px;">
          <h2 style="color: #2D3748; margin-bottom: 10px;">Secure Assignment from Lumino Learning</h2>
          <div style="display: inline-flex; gap: 10px; justify-content: center;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 6px 12px; border-radius: 20px; font-size: 12px; font-weight: bold;">
              📱 PWA READY
            </div>
            <div style="background-color: #48BB78; color: white; padding: 6px 12px; border-radius: 20px; font-size: 12px; font-weight: bold;">
              🔐 SECURE ACCESS
            </div>
          </div>
        </div>
        
        <!-- Greeting -->
        <p style="font-size: 16px; color: #4A5568;">Hello ${studentName},</p>
        <p style="font-size: 16px; color: #4A5568;">You have been assigned a new secure learning activity:</p>
        
        <!-- Assignment Details -->
        <div style="background-color: #EDF2F7; padding: 20px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #4299E1;">
          <p style="margin: 0; font-size: 18px;"><strong>Activity:</strong> ${gameTitle}</p>
          <p style="margin: 10px 0 0 0; font-size: 16px;"><strong>Due Date:</strong> ${formattedDate}</p>
        </div>
        
        <!-- PWA Installation Priority Section -->
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 25px; border-radius: 12px; margin: 25px 0; text-align: center;">
          <h3 style="margin-top: 0; font-size: 20px; margin-bottom: 15px;">🚀 Install App First (Recommended)</h3>
          <p style="margin: 0 0 15px 0; font-size: 16px; line-height: 1.5;">
            For the best secure assignment experience, install Lumino Learning as an app first. 
            This ensures your authentication persists and assignments load faster!
          </p>
          <a href="${pwaInstallUrl}" style="display: inline-block; background-color: rgba(255,255,255,0.2); color: white; padding: 12px 25px; text-decoration: none; border-radius: 8px; font-weight: bold; border: 2px solid rgba(255,255,255,0.3);">
            📱 Install App → Then Access Assignment
          </a>
        </div>
        
        <!-- Primary Action Buttons -->
        <div style="text-align: center; margin: 30px 0;">
          <div style="margin-bottom: 15px;">
            <a href="${assignmentLink}" style="display: inline-block; background-color: #4299E1; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-size: 18px; font-weight: bold; box-shadow: 0 2px 4px rgba(0,0,0,0.2); margin-bottom: 10px;">
              🔐 Access Secure Assignment
            </a>
          </div>
          <div style="margin-top: 15px;">
            <a href="${studentPortalLink}" style="display: inline-block; background-color: #38B2AC; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-size: 18px; font-weight: bold; box-shadow: 0 2px 4px rgba(0,0,0,0.2);">
              📚 Go to Student Dashboard
            </a>
          </div>
        </div>
        
        <!-- Footer Links -->
        <div style="font-size: 14px; color: #718096; text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #E2E8F0;">
          <p><strong>📱 PWA Installation Link:</strong></p>
          <p style="word-break: break-all; background-color: #F7FAFC; padding: 10px; border-radius: 4px; margin: 10px 0;">${pwaInstallUrl}</p>
          
          <p><strong>🔐 Secure Assignment Link:</strong></p>
          <p style="word-break: break-all; background-color: #F7FAFC; padding: 10px; border-radius: 4px; margin: 10px 0;">${assignmentLink}</p>
          
          <p style="margin-top: 20px;"><strong>These secure links are unique to you. Please do not share them with others.</strong></p>
        </div>
        
      </div>
    </div>
  `;
};
exports.createPWAEmailLinkTemplate = createPWAEmailLinkTemplate;
/**
 * PWA Password Setup Email Template
 * Enhanced version with PWA installation guidance for new students
 */
const createPWAPasswordSetupTemplate = (data) => {
    const { studentName, passwordResetLink, baseUrl } = data;
    const pwaInstallUrl = `${baseUrl}/student?pwa=install`;
    return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f8f9fa; padding: 20px; border-radius: 8px;">
      <div style="background-color: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
        
        <!-- Header with Welcome Badge -->
        <div style="text-align: center; margin-bottom: 25px;">
          <h1 style="color: #2D3748; margin-bottom: 15px;">Welcome to Lumino Learning!</h1>
          <div style="display: inline-flex; gap: 10px; justify-content: center; margin-bottom: 10px;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 8px 16px; border-radius: 20px; font-size: 14px; font-weight: bold;">
              📱 PWA READY
            </div>
            <div style="background-color: #48BB78; color: white; padding: 8px 16px; border-radius: 20px; font-size: 14px; font-weight: bold;">
              🆕 NEW STUDENT
            </div>
          </div>
        </div>
        
        <!-- Greeting -->
        <p style="font-size: 16px; color: #4A5568;">Hi ${studentName},</p>
        <p style="font-size: 16px; color: #4A5568; line-height: 1.6;">
          Your teacher has created an account for you on our educational gaming platform. 
          Let's get you set up with both your password and the app experience!
        </p>
        
        <!-- PWA Installation First -->
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 25px; border-radius: 12px; margin: 25px 0; text-align: center;">
          <h2 style="margin-top: 0; font-size: 22px; margin-bottom: 15px;">🚀 Step 1: Install the App</h2>
          <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.5;">
            Start by installing Lumino Learning as an app on your device. This gives you the best experience 
            and makes accessing assignments super fast!
          </p>
          <a href="${pwaInstallUrl}" style="display: inline-block; background-color: rgba(255,255,255,0.2); color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-size: 18px; font-weight: bold; border: 2px solid rgba(255,255,255,0.3);">
            📱 Install Lumino Learning App
          </a>
        </div>
        
        <!-- Password Setup -->
        <div style="background-color: #FFF5E6; padding: 25px; border-radius: 12px; border-left: 4px solid #ED8936; margin: 25px 0; text-align: center;">
          <h2 style="color: #C05621; margin-top: 0; font-size: 22px; margin-bottom: 15px;">🔐 Step 2: Set Your Password</h2>
          <p style="color: #C05621; margin: 0 0 20px 0; font-size: 16px; line-height: 1.5;">
            After installing the app (or if you prefer to use the browser), 
            set up your password to access your learning assignments.
          </p>
          <a href="${passwordResetLink}" style="display: inline-block; background-color: #ED8936; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-size: 18px; font-weight: bold; box-shadow: 0 2px 4px rgba(0,0,0,0.2);">
            🔑 Set Your Password
          </a>
        </div>
        
        <!-- App Installation Instructions -->
        <div style="background-color: #F0FFF4; padding: 20px; border-radius: 8px; border-left: 4px solid #48BB78; margin: 25px 0;">
          <h3 style="color: #2F855A; margin-top: 0; font-size: 18px;">📱 How to Install (It's Easy!):</h3>
          <div style="color: #2F855A;">
            <p style="margin: 10px 0 5px 0;"><strong>📱 On Your Phone/Tablet:</strong></p>
            <ul style="margin: 5px 0; padding-left: 20px; line-height: 1.6;">
              <li>Tap "Install Lumino Learning App" above</li>
              <li>Look for "Add to Home Screen" or install prompt</li>
              <li>Tap "Install" or "Add"</li>
              <li>Find the Lumino Learning icon on your home screen!</li>
            </ul>
            
            <p style="margin: 15px 0 5px 0;"><strong>💻 On Your Computer:</strong></p>
            <ul style="margin: 5px 0; padding-left: 20px; line-height: 1.6;">
              <li>Click "Install Lumino Learning App" above</li>
              <li>Look for the install icon in your browser address bar</li>
              <li>Click "Install" when Chrome or Edge asks</li>
              <li>Find Lumino Learning in your applications!</li>
            </ul>
          </div>
        </div>
        
        <!-- Important Security Notice -->
        <div style="background-color: #FED7D7; padding: 20px; border-radius: 8px; border-left: 4px solid #E53E3E; margin: 25px 0;">
          <h3 style="color: #C53030; margin-top: 0; font-size: 16px;">⏰ Important Security Notice</h3>
          <p style="color: #C53030; margin: 10px 0; line-height: 1.6;">
            <strong>The password setup link expires in 1 hour</strong> for security reasons. 
            If it expires, please contact your teacher for a new setup link.
          </p>
        </div>
        
        <!-- What You Can Do -->
        <div style="background-color: #E6FFFA; padding: 20px; border-radius: 8px; border-left: 4px solid #38B2AC; margin: 25px 0;">
          <h3 style="color: #2C7A7B; margin-top: 0; font-size: 18px;">🎯 Once You're Set Up, You Can:</h3>
          <div style="color: #2C7A7B;">
            <ul style="margin: 10px 0; padding-left: 20px; line-height: 1.8;">
              <li>🎮 <strong>Play Learning Games:</strong> Access fun educational activities</li>
              <li>📚 <strong>Complete Assignments:</strong> Work on tasks sent by your teacher</li>
              <li>📊 <strong>Track Your Progress:</strong> See how you're doing and celebrate achievements</li>
              <li>⚡ <strong>Fast Access:</strong> Open assignments instantly from your home screen</li>
              <li>🏆 <strong>Earn High Scores:</strong> Compete with yourself and improve over time</li>
            </ul>
          </div>
        </div>
        
        <!-- Setup Flow -->
        <div style="background-color: #EDF2F7; padding: 20px; border-radius: 8px; margin: 25px 0;">
          <h3 style="color: #4A5568; margin-top: 0; font-size: 18px;">🚀 Quick Setup Guide:</h3>
          <div style="color: #4A5568;">
            <ol style="margin: 10px 0; padding-left: 20px; line-height: 1.8; font-size: 15px;">
              <li><strong>Install App:</strong> Click "Install Lumino Learning App" → Follow prompts</li>
              <li><strong>Set Password:</strong> Click "Set Your Password" → Create secure password</li>
              <li><strong>Start Learning:</strong> Open app → Sign in → Access your assignments!</li>
            </ol>
            
            <p style="margin: 15px 0 5px 0; font-style: italic; font-size: 14px;">
              💡 <strong>Pro Tip:</strong> Installing the app first ensures the best experience when setting up your password!
            </p>
          </div>
        </div>
        
        <!-- Need Help -->
        <div style="background-color: #F7FAFC; padding: 20px; border-radius: 8px; margin: 25px 0; text-align: center;">
          <h3 style="color: #4A5568; margin-top: 0; font-size: 16px;">❓ Need Help?</h3>
          <p style="color: #4A5568; margin: 10px 0;">
            If you have any questions about installation or setup, please contact your teacher. 
            They're here to help you get started with Lumino Learning!
          </p>
        </div>
        
        <!-- Footer -->
        <div style="font-size: 12px; color: #718096; text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #E2E8F0;">
          <p style="margin: 10px 0;"><strong>📱 App Installation Link:</strong></p>
          <p style="word-break: break-all; background-color: #F7FAFC; padding: 8px; border-radius: 4px; margin: 10px 0; font-size: 11px;">${pwaInstallUrl}</p>
          
          <p style="margin: 15px 0 5px 0;"><strong>🔑 Password Setup Link:</strong></p>
          <p style="word-break: break-all; background-color: #F7FAFC; padding: 8px; border-radius: 4px; margin: 10px 0; font-size: 11px;">${passwordResetLink}</p>
          
          <hr style="border: none; border-top: 1px solid #E2E8F0; margin: 25px 0;">
          <p style="margin: 0; color: #9CA3AF;">
            This email was sent from Lumino Learning Platform<br>
            <span style="font-size: 10px;">🚀 Enhanced with PWA Technology for the Best Learning Experience</span>
          </p>
        </div>
        
      </div>
    </div>
  `;
};
exports.createPWAPasswordSetupTemplate = createPWAPasswordSetupTemplate;
/**
 * Utility function to detect user's device for personalized installation instructions
 */
const getPersonalizedInstallInstructions = (userAgent) => {
    if (!userAgent)
        return 'Follow your browser\'s installation prompts';
    const ua = userAgent.toLowerCase();
    if (ua.includes('iphone') || ua.includes('ipad')) {
        return 'Tap the Share button in Safari, then "Add to Home Screen"';
    }
    else if (ua.includes('android')) {
        return 'Tap the menu in Chrome, then "Add to Home Screen" or look for the install prompt';
    }
    else if (ua.includes('chrome') || ua.includes('edge')) {
        return 'Look for the install icon in your address bar, or check the browser menu for "Install Lumino Learning"';
    }
    else {
        return 'Use Chrome, Edge, or Safari for the best installation experience';
    }
};
exports.getPersonalizedInstallInstructions = getPersonalizedInstallInstructions;
exports.default = {
    createAssignmentEmailTemplate: exports.createAssignmentEmailTemplate,
    createPWAEmailLinkTemplate: exports.createPWAEmailLinkTemplate,
    createPWAPasswordSetupTemplate: exports.createPWAPasswordSetupTemplate,
    getPersonalizedInstallInstructions: exports.getPersonalizedInstallInstructions
};
//# sourceMappingURL=emailTemplates.js.map