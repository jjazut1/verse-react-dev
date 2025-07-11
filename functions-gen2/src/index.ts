import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { onCall } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import { logger } from "firebase-functions";
import * as admin from "firebase-admin";
import { setupSendGrid, sendEmail } from './sendgridHelper';
// Import the new PWA-aware email templates
import { createAssignmentEmailTemplate } from "./emailTemplates";
import * as functions from "firebase-functions";

// Define the secrets
export const SENDGRID_API_KEY = defineSecret("SENDGRID_API_KEY");
export const SENDER_EMAIL = defineSecret("SENDER_EMAIL");
export const APP_URL = defineSecret("APP_URL");

// Get environment
const isProduction = process.env.NODE_ENV === 'production';

// Configuration flag to use untrackable email templates


// Helper function to get the appropriate base URL
function getBaseUrl(): string {
  // First try to get from secrets
  if (APP_URL.value() && APP_URL.value().trim() !== '') {
    console.log("Using base URL from APP_URL secret");
    return APP_URL.value().trim();
  }
  
  // Fallback based on environment
  if (isProduction) {
    console.log("Fallback to production URL");
    return 'https://r2process.com';
  } else {
    console.log("Fallback to development URL");
    return 'https://verse-dev-central.web.app';
  }
}

// Initialize Firebase Admin
admin.initializeApp();

interface Assignment {
  id: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  gameId: string;
  gameTitle: string;
  gameName: string;
  gameType: string;
  deadline: admin.firestore.Timestamp;
  dueDate: admin.firestore.Timestamp;
  completed: boolean;
  score?: number;
  linkToken: string;
  emailSent?: boolean;
  timesRequired: number;
  completedCount: number;
  status: string;
  teacherId: string;
}

export const sendAssignmentEmail = onDocumentCreated(
  {
    document: "assignments/{assignmentId}",
    secrets: [SENDGRID_API_KEY, SENDER_EMAIL, APP_URL],
  },
  async (event) => {
    const snapshot = event.data;
    const assignment = snapshot?.data() as Assignment;
    const assignmentId = event.params.assignmentId;

    // Skip if already sent (regardless of useEmailLinkAuth flag since both functions now do the same thing)
    if (!assignment || assignment.emailSent === true) {
      console.log("Skipping email: already sent", { assignmentId });
      return;
    }

    if (!assignment.studentEmail) {
      console.error("Missing student email");
      return;
    }

    const studentEmail = assignment.studentEmail.toLowerCase();
    const baseUrl = getBaseUrl();
    console.log(`Using base URL: ${baseUrl}`);

    // Fetch the student's name from the users collection
    let studentName = assignment.studentName || 'Student';
    try {
      const usersQuery = await admin.firestore()
        .collection('users')
        .where('email', '==', studentEmail)
        .limit(1)
        .get();
      
      if (!usersQuery.empty) {
        const userData = usersQuery.docs[0].data();
        if (userData.name) {
          studentName = userData.name;
          console.log(`Found student name in users collection: ${studentName}`);
        }
      } else {
        console.log(`No user found in users collection for email: ${studentEmail}, using fallback name`);
      }
    } catch (error) {
      console.error(`Error fetching student name from users collection:`, error);
      // Continue with fallback name
    }

    let formattedDate = "No due date set";
    try {
      const dueDate = assignment.dueDate?.toDate() || assignment.deadline?.toDate();
      if (dueDate) {
        formattedDate = dueDate.toLocaleDateString("en-US", {
          weekday: "long", year: "numeric", month: "long", day: "numeric"
        });
      }
    } catch (e) {
      console.error("Date formatting error", e);
    }

    // Use the helper function to set up SendGrid
    const isSetupSuccessful = setupSendGrid(SENDGRID_API_KEY.value());
    if (!isSetupSuccessful) {
      console.error("Failed to set up SendGrid properly");
      return;
    }

    // Use the enhanced 3-link dashboard email template for all assignments
    const emailHtml = createAssignmentEmailTemplate(
      studentName,
      assignment.gameTitle || assignment.gameName,
      formattedDate,
      assignment.linkToken,
      baseUrl,
      studentEmail,
      {
        gameType: assignment.gameType,
        timesRequired: assignment.timesRequired,
        completedCount: assignment.completedCount || 0,
        status: assignment.status
      }
    );

    const msg: any = {
      to: studentEmail,
      from: {
        email: SENDER_EMAIL.value().trim(),
        name: "LuminateLearn"
      },
      subject: `📱 New Assignment: ${assignment.gameTitle || assignment.gameName}`,
      html: emailHtml,
      // Explicitly disable all SendGrid tracking
      trackingSettings: {
        clickTracking: {
          enable: false
        },
        openTracking: {
          enable: false
        },
        subscriptionTracking: {
          enable: false
        },
        ganalytics: {
          enable: false
        }
      }
    };

    // Use the helper function to send the email
    const isEmailSent = await sendEmail(msg);
    if (isEmailSent) {
      await admin.firestore().collection("assignments").doc(assignmentId).update({ emailSent: true });
      console.log(`Assignment email sent successfully for ${assignmentId}`);
    } else {
      console.error(`Failed to send assignment email for ${assignmentId}`);
    }
  }
);

// Send password setup email when a new student is created
export const sendPasswordSetupEmail = onDocumentCreated(
  {
    document: "users/{userId}",
    secrets: [SENDGRID_API_KEY, SENDER_EMAIL, APP_URL],
  },
  async (event) => {
    const snapshot = event.data;
    const userData = snapshot?.data();
    let userId = event.params.userId;

    // Only process if this is a new student and no password setup email has been sent
    if (!userData || userData.role !== 'student' || userData.passwordSetupSent === true) {
      console.log("Skipping password setup email: not a new student or already sent", { userId });
      return;
    }

    const { email: studentEmail, name: studentName } = userData;
    
    logger.info('🔵 sendPasswordSetupEmail triggered for new student:', studentEmail);

    if (!studentEmail || !studentName) {
      logger.error('Missing required student data:', { studentEmail, studentName });
      return;
    }

    try {
      // First, create or get the Firebase Auth user
      let authUser;
      let actualAuthUid;
      
      try {
        // Try to get existing user by email
        authUser = await admin.auth().getUserByEmail(studentEmail);
        actualAuthUid = authUser.uid;
        logger.info('Found existing Firebase Auth user for:', studentEmail);
        logger.info('Existing Auth UID:', actualAuthUid);
        
        // Update Firestore document to link to existing Auth user
        await admin.firestore().collection('users').doc(userId).update({
          authUid: actualAuthUid,
          linkedToAuth: true,
          emailVerified: authUser.emailVerified,
          hasTemporaryPassword: true,
          temporaryPasswordSet: true,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        logger.info('✅ Updated Firestore document to link with existing Auth user');
        
      } catch (error: any) {
        if (error.code === 'auth/user-not-found') {
          // Create new Firebase Auth user with the same UID as the Firestore document
          authUser = await admin.auth().createUser({
            uid: userId,  // Use the same UID as the Firestore document
            email: studentEmail,
            displayName: studentName,
            emailVerified: false
          });
          actualAuthUid = userId; // New user gets the Firestore document ID as their UID
          logger.info('✅ Created Firebase Auth user with UID:', actualAuthUid);
          
          // Update the Firestore document with authentication linking fields
          await admin.firestore().collection('users').doc(userId).update({
            authUid: actualAuthUid,
            linkedToAuth: true,
            emailVerified: false,
            hasTemporaryPassword: true,
            temporaryPasswordSet: true,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
          });
          logger.info('✅ Updated Firestore document with auth linking fields');
        } else {
          throw error;
        }
      }
      
      // Generate random password for the student
      const generateRandomPassword = () => {
        const adjectives = ['Bright', 'Happy', 'Swift', 'Calm', 'Bold', 'Smart', 'Kind', 'Cool', 'Warm', 'Quick'];
        const nouns = ['Tiger', 'Ocean', 'Mountain', 'Star', 'River', 'Eagle', 'Lion', 'Phoenix', 'Wolf', 'Bear'];
        const randomAdjective = adjectives[Math.floor(Math.random() * adjectives.length)];
        const randomNoun = nouns[Math.floor(Math.random() * nouns.length)];
        const randomNumber = Math.floor(Math.random() * 9000) + 1000; // 4-digit number
        return `${randomAdjective}-${randomNoun}-${randomNumber}`;
      };
      
      const temporaryPassword = generateRandomPassword();
      
      // Set the temporary password on the Firebase Auth user using the ACTUAL Auth UID
      await admin.auth().updateUser(actualAuthUid, {
        password: temporaryPassword
      });
      
      logger.info('Generated temporary password for:', studentEmail);
      logger.info('Temporary password set successfully for Auth UID:', actualAuthUid);

      // Create email content
      const subject = `Your LuminateLearn Account - Sign In Information`;
      
      const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to LuminateLearn!</title>
</head>
<body>
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8f9fa; padding: 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: white; border-radius: 8px; padding: 30px; font-family: Arial, sans-serif;">
          
          <tr>
            <td>
              <h1 style="color: #2D3748; text-align: center; margin: 0 0 20px 0;">Welcome to LuminateLearn!</h1>
              
              <p style="margin: 0 0 15px 0; font-size: 16px; color: #4A5568;">Hi ${studentName},</p>
              
              <p style="margin: 0 0 20px 0; font-size: 16px; color: #4A5568;">Your teacher has created an account for you on our educational gaming platform. Here are your login credentials:</p>
              
              <table width="100%" cellpadding="20" cellspacing="0" style="background: #f8f9fa; border: 2px solid #4299E1; border-radius: 8px; margin: 20px 0;">
                <tr>
                  <td align="center">
                    <p style="margin: 0 0 10px 0; font-size: 14px; color: #666;">Your Login Details:</p>
                    <p style="margin: 5px 0; font-size: 16px;"><strong>Email:</strong> <a href="mailto:${studentEmail}" style="color: #4299E1; text-decoration: underline;">${studentEmail}</a></p>
                    <p style="margin: 5px 0; font-size: 16px;"><strong>Temporary Password:</strong> <span style="background: #e2e8f0; padding: 4px 8px; border-radius: 4px; font-family: monospace; font-size: 18px; color: #2d3748;">${temporaryPassword}</span></p>
                  </td>
                </tr>
              </table>
              
              <table width="100%" cellpadding="15" cellspacing="0" style="background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 5px; margin: 20px 0;">
                <tr>
                  <td>
                    <p style="margin: 0; font-size: 14px; color: #856404;">
                      <strong>⚠️ Important:</strong> Please use EMAIL and PASSWORD login (not Google Sign-In) for your first login.
                    </p>
                  </td>
                </tr>
              </table>
              
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                <tr>
                  <td align="center">
                    <a href="${getBaseUrl()}/login?email=${encodeURIComponent(studentEmail)}&temp=true" 
                       style="background-color: #4299E1; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
                      Sign In Now
                    </a>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 20px 0 10px 0; font-size: 16px; color: #4A5568;"><strong>What happens next:</strong></p>
              <ol style="margin: 0 0 20px 0; padding-left: 20px; color: #4A5568;">
                <li>Click the "Sign In Now" button above</li>
                <li>Use your email and the temporary password provided</li>
                <li>You'll be asked to create a new password of your choice</li>
                <li>After that, you can use either email/password or Google Sign-In</li>
              </ol>
              
              <p style="margin: 20px 0 10px 0; font-size: 16px; color: #4A5568;">Once you've signed in, you can:</p>
              <ul style="margin: 0 0 20px 0; padding-left: 20px; color: #4A5568;">
                <li>Access assignments sent by your teacher</li>
                <li>Play educational games</li>
              </ul>
              
              <p style="margin: 20px 0; font-size: 16px; color: #4A5568;">If you have any questions, please contact your teacher.</p>
              
              <hr style="border: none; border-top: 1px solid #E2E8F0; margin: 30px 0;">
              <p style="font-size: 12px; color: #718096; text-align: center; margin: 0;">
                This email was sent from LuminateLearn Platform
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
      `;

      // Use the helper function to set up SendGrid
      const isSetupSuccessful = setupSendGrid(SENDGRID_API_KEY.value());
      if (!isSetupSuccessful) {
        logger.error("Failed to set up SendGrid properly");
        return;
      }

      // Send email using the helper function
      const msg = {
        to: studentEmail,
        from: {
          email: SENDER_EMAIL.value().trim(),
          name: "LuminateLearn"
        },
        subject: subject,
        html: htmlContent,
        // Explicitly disable all SendGrid tracking
        trackingSettings: {
          clickTracking: {
            enable: false
          },
          openTracking: {
            enable: false
          },
          subscriptionTracking: {
            enable: false
          },
          ganalytics: {
            enable: false
          }
        }
      };

      const isEmailSent = await sendEmail(msg);
      if (!isEmailSent) {
        logger.error('Failed to send password setup email to:', studentEmail);
        return;
      }
      
      logger.info('✅ Password setup email sent successfully to:', studentEmail);

      // Mark as sent in the user document
      await admin.firestore().collection("users").doc(userId).update({ 
        passwordSetupSent: true,
        passwordSetupEmailSentAt: admin.firestore.FieldValue.serverTimestamp()
      });

    } catch (error) {
      logger.error('❌ Error sending password setup email:', error);
    }
  }
);

// Note: setUserPassword function removed - using Firebase Auth's built-in password reset instead

// New function to authenticate email link users
export const authenticateEmailLinkUser = onCall({
  cors: true,
  region: 'us-central1'
}, async (request) => {
  const { studentEmail } = request.data;
  
  if (!studentEmail) {
    throw new Error('Student email is required');
  }

  try {
    // Look up the user in Firestore by email
    const usersQuery = await admin.firestore()
      .collection('users')
      .where('email', '==', studentEmail.toLowerCase())
      .limit(1)
      .get();
    
    if (usersQuery.empty) {
      throw new Error(`No user found with email: ${studentEmail}`);
    }
    
    const userData = usersQuery.docs[0].data();
    
    // Check if user is linked to auth and get their authUid
    if (!userData.linkedToAuth || !userData.authUid) {
      throw new Error(`User ${studentEmail} is not linked to Firebase Auth`);
    }
    
    // Generate a custom token for this user
    const customToken = await admin.auth().createCustomToken(userData.authUid);
    
    logger.info(`Generated custom token for email link user: ${studentEmail}`);
    
    return {
      success: true,
      customToken,
      user: {
        uid: userData.authUid,
        email: userData.email,
        name: userData.name,
        role: userData.role
      }
    };
    
  } catch (error) {
    logger.error('Error authenticating email link user:', error);
    throw error;
  }
});

// Alternative approach: Firestore-triggered authentication
export const processEmailLinkAuth = onDocumentCreated(
  {
    document: "emailLinkAuthRequests/{requestId}",
  },
  async (event) => {
    const snapshot = event.data;
    const requestData = snapshot?.data();
    const requestId = event.params.requestId;

    if (!requestData || !requestData.email) {
      console.error('Invalid email link auth request:', requestId);
      return;
    }

    try {
      const studentEmail = requestData.email.toLowerCase();
      
      // Look up the user in Firestore by email
      const usersQuery = await admin.firestore()
        .collection('users')
        .where('email', '==', studentEmail)
        .limit(1)
        .get();
      
      if (usersQuery.empty) {
        console.error(`No user found with email: ${studentEmail}`);
        await admin.firestore().collection('emailLinkAuthRequests').doc(requestId).update({
          status: 'error',
          error: `No user found with email: ${studentEmail}`,
          processedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        return;
      }
      
      const userData = usersQuery.docs[0].data();
      
      // Check if user is linked to auth and get their authUid
      if (!userData.linkedToAuth || !userData.authUid) {
        console.error(`User ${studentEmail} is not linked to Firebase Auth`);
        await admin.firestore().collection('emailLinkAuthRequests').doc(requestId).update({
          status: 'error',
          error: `User ${studentEmail} is not linked to Firebase Auth`,
          processedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        return;
      }
      
      // Generate a custom token for this user
      const customToken = await admin.auth().createCustomToken(userData.authUid);
      
      // Update the request document with the token
      await admin.firestore().collection('emailLinkAuthRequests').doc(requestId).update({
        status: 'success',
        customToken: customToken,
        user: {
          uid: userData.authUid,
          email: userData.email,
          name: userData.name,
          role: userData.role
        },
        processedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      
      console.log(`Generated custom token for email link user: ${studentEmail}`);
      
    } catch (error) {
      console.error('Error processing email link auth request:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      await admin.firestore().collection('emailLinkAuthRequests').doc(requestId).update({
        status: 'error',
        error: errorMessage,
        processedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    }
  }
);

export const checkStudentPasswordStatus = functions.https.onCall(async (request) => {
  try {
    const { email } = request.data;
    
    if (!email) {
      throw new Error('Email is required');
    }
    
    // Query for user by email
    const usersRef = admin.firestore().collection('users');
    const querySnapshot = await usersRef.where('email', '==', email.toLowerCase()).get();
    
    if (querySnapshot.empty) {
      return { 
        found: false, 
        message: `No user found with email: ${email}` 
      };
    }
    
    const userDoc = querySnapshot.docs[0];
    const userData = userDoc.data();
    
    return {
      found: true,
      email: userData.email,
      hasTemporaryPassword: userData.hasTemporaryPassword,
      passwordSetupComplete: userData.passwordSetupComplete,
      role: userData.role,
      userId: userDoc.id,
      authUid: userData.authUid || userData.userId,
      linkedToAuth: userData.linkedToAuth
    };
  } catch (error) {
    console.error('Error checking student password status:', error);
    throw new functions.https.HttpsError('internal', 'Failed to check student password status');
  }
});

export const fixStudentPasswordFlag = functions.https.onCall(async (request) => {
  try {
    const { email } = request.data;
    
    if (!email) {
      throw new Error('Email is required');
    }
    
    // Query for user by email
    const usersRef = admin.firestore().collection('users');
    const querySnapshot = await usersRef.where('email', '==', email.toLowerCase()).get();
    
    if (querySnapshot.empty) {
      return { 
        success: false, 
        message: `No user found with email: ${email}` 
      };
    }
    
    const userDoc = querySnapshot.docs[0];
    const userData = userDoc.data();
    
    // Update the user document to clear temporary password flag
    await userDoc.ref.update({
      hasTemporaryPassword: false,
      passwordSetupComplete: true,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    return {
      success: true,
      message: `Fixed password flag for ${email}`,
      previousState: {
        hasTemporaryPassword: userData.hasTemporaryPassword,
        passwordSetupComplete: userData.passwordSetupComplete
      },
      newState: {
        hasTemporaryPassword: false,
        passwordSetupComplete: true
      }
    };
  } catch (error) {
    console.error('Error fixing student password flag:', error);
    throw new functions.https.HttpsError('internal', 'Failed to fix student password flag');
  }
});

