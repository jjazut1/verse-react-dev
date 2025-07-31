/**
 * PWA-Enhanced Email Templates for Lumino Learning
 * Step 3: Five-Link Smart Routing System
 */



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
  studentEmail: string = 'student', // Add actual student email parameter
  assignmentDetails?: {
    gameType?: string;
    timesRequired?: number;
    completedCount?: number;
    status?: string;
  }
) => {
  // Use the provided student email instead of extracting from token
  
  // RESTORED: Use the previously working SmartRouter system
  // This link will:
  // - Open in PWA if installed
  // - Open in browser if PWA not installed
  // - Always route to student dashboard with assignment ready
  const smartDashboardLink = `${baseUrl}/smart-route/dashboard?studentEmail=${studentEmail}&from=email`;

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
        
        /* Single Smart Button */
        .primary-actions {
            margin: 30px 0;
            text-align: center;
            background: linear-gradient(135deg, #10b981 0%, #059669 100%);
            padding: 30px;
            border-radius: 12px;
            color: white;
        }
        .smart-button {
            display: inline-block;
            background: rgba(255,255,255,0.95);
            color: #059669;
            padding: 18px 36px;
            margin: 8px;
            text-decoration: none;
            border-radius: 10px;
            font-weight: bold;
            font-size: 20px;
            transition: all 0.3s ease;
            box-shadow: 0 4px 12px rgba(0,0,0,0.2);
            border: 2px solid rgba(255,255,255,0.3);
        }
        .smart-button:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 16px rgba(0,0,0,0.3);
        }
        
        .explanation {
            background: #f0f9ff;
            padding: 20px;
            border-radius: 8px;
            margin: 25px 0;
            border-left: 4px solid #0ea5e9;
        }
        
        .how-it-works {
            background: #ecfdf5;
            padding: 20px;
            border-radius: 8px;
            margin: 25px 0;
            border-left: 4px solid #10b981;
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
            ${assignmentDetails?.gameType ? `<p><strong>Game Type:</strong> ${assignmentDetails.gameType}</p>` : ''}
            ${assignmentDetails?.timesRequired ? `<p><strong>Required Completions:</strong> ${assignmentDetails.timesRequired} time${assignmentDetails.timesRequired > 1 ? 's' : ''}</p>` : ''}
        </div>

        <!-- Single Smart Link -->
        <div class="primary-actions">
            <h2 style="margin-top: 0; font-size: 24px; margin-bottom: 15px;">Access Your Assignment</h2>
            <p style="margin: 0 0 25px 0; font-size: 16px; opacity: 0.9;">
                Click the button below to access your Student Dashboard:
            </p>
            <a href="${smartDashboardLink}" class="smart-button">
                Open Student Dashboard
            </a>
        </div>

        <!-- How It Works -->
        <div class="how-it-works">
            <h3 style="color: #047857; margin-top: 0; font-size: 18px;">How This Works:</h3>
            <div style="color: #047857;">
                <ul style="margin: 10px 0; padding-left: 20px; line-height: 1.8;">
                    <li><strong>📱 If you have the app installed:</strong> Opens directly in your Lumino Learning app</li>
                    <li><strong>🌐 If you don't have the app:</strong> Opens in your browser with install options</li>
                    <li><strong>🎯 Either way:</strong> Your assignment will be ready and waiting on your dashboard!</li>
                </ul>
            </div>
        </div>

        <!-- PWA Installation Guide -->
        <div class="pwa-install-guide" style="background: #f0f9ff; border: 2px solid #0ea5e9; border-radius: 12px; padding: 20px; margin: 25px 0;">
            <h3 style="color: #0369a1; margin-top: 0; font-size: 18px;">📱 Want to Install the Lumino Learning App?</h3>
            <div style="color: #0369a1;">
                <p style="margin: 10px 0; line-height: 1.6; font-weight: bold;">
                    Installing our app makes accessing assignments faster and easier! Here's how:
                </p>
                
                <div style="background: white; border-radius: 8px; padding: 15px; margin: 15px 0;">
                    <h4 style="color: #0369a1; margin-top: 0; font-size: 16px;">🔧 Step-by-Step Installation:</h4>
                    <ol style="margin: 10px 0; padding-left: 20px; line-height: 1.8;">
                        <li><strong>Click the link above</strong> - Opens Lumino Learning in your browser</li>
                        <li><strong>Look for the install icon</strong> - Check your browser's address bar for a small download or install icon</li>
                        <li><strong>Click "Install"</strong> - Select the install option when prompted</li>
                        <li><strong>Important!</strong> The next time you click an email link, you'll see an "Open in app" icon in the address bar - click it!</li>
                        <li><strong>Choose "Always use"</strong> - When you see the banner asking about opening links in the app, select "Always use"</li>
            </ol>
        </div>

                <div style="background: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 12px; margin: 15px 0;">
                    <p style="margin: 0; color: #92400e; font-size: 14px;">
                        <strong>💡 Pro Tip:</strong> After installation, future email links will open directly in the app - no more browser steps needed!
                    </p>
                </div>
            </div>
        </div>

        <!-- Browser Option -->
        <div class="explanation">
            <h3 style="color: #6b7280; margin-top: 0; font-size: 16px;">🌐 Prefer Using Your Browser?</h3>
            <div style="color: #6b7280;">
                <p style="margin: 10px 0; line-height: 1.6;">
                    No problem! The link above works perfectly in your browser too. You can always access 
                    your assignments whether you install the app or not.
                </p>
        </div>
        </div>

        <div class="footer">
            <p><strong>This link is unique to you. Please do not share it with others.</strong></p>
            <p style="margin-top: 10px; font-size: 12px; color: #9ca3af;">
                Need help? Contact your teacher or visit our support page.
            </p>
        </div>
    </div>
</body>
</html>
  `.trim();
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
  createPWAPasswordSetupTemplate,
  getPersonalizedInstallInstructions
}; 