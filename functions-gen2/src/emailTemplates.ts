/**
 * PWA-Enhanced Email Templates for Lumino Learning
 * Step 3: Five-Link Smart Routing System
 */

interface EmailTemplateData {
  studentName: string;
  gameTitle: string;
  formattedDate: string;
  assignmentLink: string;
  studentPortalLink: string;
  baseUrl: string;
  pwaInstallUrl?: string;
}

/**
 * Enhanced 3-Link Assignment Email Template
 * Uses Service Worker + BroadcastChannel for PWA window coordination
 */
export const createAssignmentEmailTemplate = (
  studentName: string,
  activityName: string,
  dueDate: string,
  assignmentToken: string,
  baseUrl: string = 'https://verse-dev-central.web.app',
  studentEmail: string = 'student' // Add actual student email parameter
) => {
  // Use the provided student email instead of extracting from token
  
  // TEMPORARY FIX: Use direct URLs to bypass SendGrid click tracking issues
  // Three distinct link types with clear, predictable behavior - all route to Student Dashboard
  const pwaLink = `${baseUrl}/student?studentEmail=${studentEmail}&source=email&pwa=true&from=email&emailAccess=true`;
  const browserLink = `${baseUrl}/student?studentEmail=${studentEmail}&source=email&forceBrowser=true&from=email&browserOnly=true&noPWA=true&emailLink=true&_t=${Date.now()}`;
  const installLink = `${baseUrl}/student?studentEmail=${studentEmail}&source=email&forceBrowser=true&from=email&showInstall=true`;

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
        
        /* Primary Smart Links */
        .primary-actions {
            margin: 30px 0;
            text-align: center;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            padding: 25px;
            border-radius: 12px;
            color: white;
        }
        .smart-button {
            display: inline-block;
            background: rgba(255,255,255,0.9);
            color: #333;
            padding: 16px 32px;
            margin: 8px;
            text-decoration: none;
            border-radius: 8px;
            font-weight: bold;
            font-size: 18px;
            transition: all 0.3s ease;
            box-shadow: 0 2px 8px rgba(0,0,0,0.2);
        }
        
        /* Explicit Mode Options */
        .explicit-options {
            background: #f8fafc;
            padding: 20px;
            border-radius: 8px;
            margin: 25px 0;
            border: 2px solid #e2e8f0;
        }
        .mode-button {
            display: inline-block;
            padding: 12px 24px;
            margin: 6px;
            text-decoration: none;
            border-radius: 6px;
            font-weight: 600;
            font-size: 14px;
            transition: all 0.3s ease;
            border: 2px solid transparent;
        }
        .browser-button {
            background: #3b82f6;
            color: white;
            border-color: #2563eb;
        }
        .pwa-button {
            background: #10b981;
            color: white;
            border-color: #059669;
        }
        .install-button {
            background: #f59e0b;
            color: white;
            border-color: #d97706;
        }
        
        .explanatory-text {
            font-size: 14px;
            color: #6b7280;
            margin: 15px 0;
            padding: 15px;
            background: #f9fafb;
            border-radius: 6px;
            border-left: 4px solid #9ca3af;
        }
        
        .footer {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
            font-size: 14px;
            color: #6b7280;
            text-align: center;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Hello ${studentName},</h1>
            <p>You have been assigned a new learning activity:</p>
        </div>

        <div class="assignment-info">
            <h2><strong>Activity:</strong> ${activityName}</h2>
            <p><strong>Due Date:</strong> ${dueDate}</p>
        </div>

        <!-- Three Clear Link Options -->
        <div class="primary-actions">
            <h2 style="margin-top: 0; font-size: 22px;">🎯 Choose How to Access Your Dashboard</h2>
            <p style="margin: 0 0 20px 0; font-size: 16px; opacity: 0.9;">
                Your assignment will be waiting for you on your Student Dashboard:
            </p>
        </div>

        <!-- Three Link Options -->
        <div class="explicit-options">
            <div style="margin: 25px 0; text-align: center;">
                <h3 style="color: #10b981; margin-bottom: 15px;">📱 PWA Link (Recommended)</h3>
                <a href="${pwaLink}" class="mode-button pwa-button" style="font-size: 16px; padding: 16px 32px;">
                    🚀 Open Student Dashboard
                </a>
                <p class="explanatory-text">
                    <strong>Best choice for most students!</strong> Opens your app if it's already running, 
                    launches the app if installed, or opens in browser with install option. Your assignment 
                    will be ready on your dashboard.
                </p>
            </div>

            <div style="margin: 25px 0; text-align: center;">
                <h3 style="color: #3b82f6; margin-bottom: 15px;">🌐 Browser Link</h3>
                <a href="${browserLink}" class="mode-button browser-button" style="font-size: 16px; padding: 16px 32px;">
                    🖥️ Open in Browser
                </a>
                <p class="explanatory-text">
                    <strong>For browser users:</strong> Always opens your dashboard in a new browser tab, 
                    even if you have the app installed. Good if you prefer working in your browser.
                </p>
            </div>

            <div style="margin: 25px 0; text-align: center;">
                <h3 style="color: #f59e0b; margin-bottom: 15px;">⬇️ Install App Link</h3>
                <a href="${installLink}" class="mode-button install-button" style="font-size: 16px; padding: 16px 32px;">
                    📲 Get the App
                </a>
                <p class="explanatory-text">
                    <strong>Don't have the app yet?</strong> This shows you how to install Lumino Learning as an app 
                    on your device for the best experience. Works on phones, tablets, and computers!
                </p>
            </div>
        </div>

        <div style="background: #ecfdf5; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10b981;">
            <h3 style="color: #047857; margin-top: 0;">💡 How These Links Work:</h3>
            <ul style="color: #047857; margin: 10px 0; padding-left: 20px;">
                <li><strong>PWA Link:</strong> Tries to focus your existing app, or opens the app if installed</li>
                <li><strong>Browser Link:</strong> Always opens in a new browser tab</li>
                <li><strong>Install Link:</strong> Shows you how to install the app on your device</li>
                <li><strong>Need help?</strong> Ask your teacher or use the install guide</li>
            </ul>
        </div>

        <div class="footer">
            <p><strong>These links are unique to you. Please do not share them with others.</strong></p>
        </div>
    </div>
</body>
</html>
  `.trim();
};

/**
 * PWA-Aware Email Link Authentication Template
 * For assignments requiring authentication with PWA guidance
 */
export const createPWAEmailLinkTemplate = (data: EmailTemplateData): string => {
  const {
    studentName,
    gameTitle,
    formattedDate,
    assignmentLink,
    baseUrl
  } = data;

  // Extract token from assignment link for EmailLinkRouter
  const tokenMatch = assignmentLink.match(/token=([^&]+)/);
  const token = tokenMatch ? tokenMatch[1] : '';
  
  // Build EmailLinkRouter URLs for enhanced 3-link system
  const pwaLinkUrl = `${baseUrl}/email-link?type=pwa&target=assignment&token=${token}`;
  // Use redirector.html for browser-only links to prevent PWA flash
  const browserLinkUrl = `${baseUrl}/redirector.html?target=/play&token=${token}&forceBrowser=true&from=email&emailAccess=true`;
  const installLinkUrl = `${baseUrl}/email-link?type=install&target=dashboard`;

  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f8f9fa; padding: 20px; border-radius: 8px;">
      <div style="background-color: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
        
        <!-- Header with Security Badge -->
        <div style="text-align: center; margin-bottom: 20px;">
          <h2 style="color: #2D3748; margin-bottom: 10px;">Assignment from Lumino Learning</h2>
          <div style="display: inline-flex; gap: 10px; justify-content: center;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 6px 12px; border-radius: 20px; font-size: 12px; font-weight: bold;">
              📱 SMART LINKS
            </div>
            <div style="background-color: #48BB78; color: white; padding: 6px 12px; border-radius: 20px; font-size: 12px; font-weight: bold;">
              🔐 SECURE ACCESS
            </div>
          </div>
        </div>
        
        <!-- Greeting -->
        <p style="font-size: 16px; color: #4A5568;">Hello ${studentName},</p>
        <p style="font-size: 16px; color: #4A5568;">You have a new learning assignment waiting for you:</p>
        
        <!-- Assignment Details -->
        <div style="background-color: #EDF2F7; padding: 20px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #4299E1;">
          <p style="margin: 0; font-size: 18px;"><strong>📚 Activity:</strong> ${gameTitle}</p>
          <p style="margin: 10px 0 0 0; font-size: 16px;"><strong>📅 Due Date:</strong> ${formattedDate}</p>
        </div>
        
        <!-- Enhanced 3-Link Access Options -->
        <div style="text-align: center; margin: 30px 0;">
          
          <!-- PWA Link (Recommended) -->
          <div style="margin-bottom: 20px;">
            <div style="background: linear-gradient(135deg, #4299E1 0%, #3182CE 100%); color: white; padding: 20px; border-radius: 12px; margin-bottom: 15px;">
              <h3 style="margin: 0 0 10px 0; font-size: 18px;">📱 App Link (Recommended)</h3>
              <p style="margin: 0 0 15px 0; font-size: 14px; opacity: 0.9;">
                Opens in the app if installed, or browser with app features
              </p>
              <a href="${pwaLinkUrl}" style="display: inline-block; background-color: rgba(255,255,255,0.2); color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: bold; border: 2px solid rgba(255,255,255,0.3);">
                🚀 Open Assignment
              </a>
            </div>
          </div>
          
          <!-- Browser Link -->
          <div style="margin-bottom: 20px;">
            <div style="background-color: #38B2AC; color: white; padding: 15px; border-radius: 8px;">
              <h3 style="margin: 0 0 8px 0; font-size: 16px;">🌐 Browser Link</h3>
              <p style="margin: 0 0 12px 0; font-size: 13px; opacity: 0.9;">
                Always opens in a browser tab
              </p>
              <a href="${browserLinkUrl}" style="display: inline-block; background-color: rgba(255,255,255,0.2); color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-size: 14px; font-weight: bold; border: 1px solid rgba(255,255,255,0.3);">
                📄 Open in Browser
              </a>
            </div>
          </div>
          
          <!-- Install App Link -->
          <div style="margin-bottom: 20px;">
            <div style="background-color: #9F7AEA; color: white; padding: 15px; border-radius: 8px;">
              <h3 style="margin: 0 0 8px 0; font-size: 16px;">📱 Install App</h3>
              <p style="margin: 0 0 12px 0; font-size: 13px; opacity: 0.9;">
                Get the app for faster access to all assignments
              </p>
              <a href="${installLinkUrl}" style="display: inline-block; background-color: rgba(255,255,255,0.2); color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-size: 14px; font-weight: bold; border: 1px solid rgba(255,255,255,0.3);">
                📲 Install Now
              </a>
            </div>
          </div>
          
        </div>
        
        <!-- Help Section -->
        <div style="background-color: #F0FFF4; padding: 20px; border-radius: 8px; border-left: 4px solid #48BB78; margin: 25px 0;">
          <h3 style="color: #2F855A; margin-top: 0; font-size: 16px;">💡 Which Link Should I Use?</h3>
          <div style="color: #2F855A; font-size: 14px; line-height: 1.6;">
            <p style="margin: 8px 0;"><strong>📱 App Link:</strong> Best choice! Works like magic - opens in app if you have it, browser if you don't.</p>
            <p style="margin: 8px 0;"><strong>🌐 Browser Link:</strong> Always opens in browser, good for shared computers.</p>
            <p style="margin: 8px 0;"><strong>📲 Install App:</strong> First time? Get the app for faster access to future assignments!</p>
          </div>
        </div>
        
        <!-- Footer Links -->
        <div style="font-size: 12px; color: #718096; text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #E2E8F0;">
          <p><strong>🔗 Smart Links (for troubleshooting):</strong></p>
          <p style="word-break: break-all; background-color: #F7FAFC; padding: 8px; border-radius: 4px; margin: 8px 0; font-size: 11px;">
            App: ${pwaLinkUrl}
          </p>
          <p style="word-break: break-all; background-color: #F7FAFC; padding: 8px; border-radius: 4px; margin: 8px 0; font-size: 11px;">
            Browser: ${browserLinkUrl}
          </p>
          <p style="word-break: break-all; background-color: #F7FAFC; padding: 8px; border-radius: 4px; margin: 8px 0; font-size: 11px;">
            Install: ${installLinkUrl}
          </p>
          
          <p style="margin-top: 15px; font-size: 11px;"><strong>These links are unique to you. Please do not share them with others.</strong></p>
        </div>
        
      </div>
    </div>
  `;
};

/**
 * PWA Password Setup Email Template
 * Enhanced version with PWA installation guidance for new students
 */
export const createPWAPasswordSetupTemplate = (data: {
  studentName: string;
  passwordResetLink: string;
  baseUrl: string;
}): string => {
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

/**
 * Utility function to detect user's device for personalized installation instructions
 */
export const getPersonalizedInstallInstructions = (userAgent?: string): string => {
  if (!userAgent) return 'Follow your browser\'s installation prompts';
  
  const ua = userAgent.toLowerCase();
  
  if (ua.includes('iphone') || ua.includes('ipad')) {
    return 'Tap the Share button in Safari, then "Add to Home Screen"';
  } else if (ua.includes('android')) {
    return 'Tap the menu in Chrome, then "Add to Home Screen" or look for the install prompt';
  } else if (ua.includes('chrome') || ua.includes('edge')) {
    return 'Look for the install icon in your address bar, or check the browser menu for "Install Lumino Learning"';
  } else {
    return 'Use Chrome, Edge, or Safari for the best installation experience';
  }
};



export default {
  createAssignmentEmailTemplate,
  createPWAEmailLinkTemplate,
  createPWAPasswordSetupTemplate,
  getPersonalizedInstallInstructions
}; 