import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { defineSecret } from "firebase-functions/params";
import { logger } from "firebase-functions";
import * as admin from "firebase-admin";
import { setupSendGrid, sendEmail } from './sendgridHelper';

// Define the secrets
export const SENDGRID_API_KEY = defineSecret("SENDGRID_API_KEY");
export const SENDER_EMAIL = defineSecret("SENDER_EMAIL");
export const APP_URL = defineSecret("APP_URL");

// Get environment
const isProduction = process.env.NODE_ENV === 'production';

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
  deadline: admin.firestore.Timestamp;
  dueDate: admin.firestore.Timestamp;
  completed: boolean;
  score?: number;
  linkToken: string;
  emailSent?: boolean;
  useEmailLinkAuth?: boolean;
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

    if (!assignment || assignment.emailSent === true || assignment.useEmailLinkAuth === true) {
      console.log("Skipping email: already sent or uses email link auth", { assignmentId });
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

    // Create both links
    const assignmentLink = `${baseUrl}/play?token=${assignment.linkToken}`;
    const studentPortalLink = `${baseUrl}/student`;

    const msg = {
      to: studentEmail,
      from: {
        email: SENDER_EMAIL.value().trim(),
        name: "Verse Learning"
      },
      subject: `New Assignment: ${assignment.gameTitle || assignment.gameName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f8f9fa; padding: 20px; border-radius: 8px;">
          <div style="background-color: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <h2 style="color: #2D3748; text-align: center; margin-bottom: 20px;">New Assignment from Verse Learning</h2>
            
            <p style="font-size: 16px; color: #4A5568;">Hello ${studentName},</p>
            
            <p style="font-size: 16px; color: #4A5568;">You have been assigned a new learning activity:</p>
            
            <div style="background-color: #EDF2F7; padding: 20px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #4299E1;">
              <p style="margin: 0; font-size: 18px;"><strong>Activity:</strong> ${assignment.gameTitle || assignment.gameName}</p>
              <p style="margin: 10px 0 0 0; font-size: 16px;"><strong>Due Date:</strong> ${formattedDate}</p>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <div style="margin-bottom: 15px;">
                <a href="${assignmentLink}" style="display: inline-block; background-color: #4299E1; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-size: 18px; font-weight: bold; box-shadow: 0 2px 4px rgba(0,0,0,0.2); margin-bottom: 10px;">
                  🎮 Start Activity
                </a>
              </div>
              <div style="margin-top: 15px;">
                <a href="${studentPortalLink}" style="display: inline-block; background-color: #38B2AC; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-size: 18px; font-weight: bold; box-shadow: 0 2px 4px rgba(0,0,0,0.2);">
                  📚 Visit Student Portal
                </a>
              </div>
            </div>
            
            <div style="background-color: #FFF5E6; padding: 20px; border-radius: 8px; border-left: 4px solid #ED8936; margin: 25px 0;">
              <h3 style="color: #C05621; margin-top: 0; font-size: 16px;">⚡ Quick Access:</h3>
              <p style="color: #C05621; margin: 10px 0;">Click the "Start Activity" button above to begin your assignment immediately - no login required!</p>
            </div>
            
            <div style="background-color: #E6FFFA; padding: 20px; border-radius: 8px; border-left: 4px solid #38B2AC; margin: 25px 0;">
              <h3 style="color: #2C7A7B; margin-top: 0; font-size: 16px;">🔐 Two Ways to Access:</h3>
              <div style="color: #2C7A7B; margin: 10px 0;">
                <p style="margin: 5px 0;"><strong>Option 1 - Direct to Assignment:</strong></p>
                <ul style="margin: 5px 0; padding-left: 20px;">
                  <li>Click "Start Activity" above</li>
                  <li>Begin your assignment immediately</li>
                  <li>No login required</li>
                </ul>
                
                <p style="margin: 15px 0 5px 0;"><strong>Option 2 - Student Portal:</strong></p>
                <ul style="margin: 5px 0; padding-left: 20px;">
                  <li>Click "Visit Student Portal" above</li>
                  <li>Sign in with your email and password</li>
                  <li>View all your assignments and progress</li>
                  <li>Access this and other assignments</li>
                </ul>
              </div>
            </div>
            
            <div style="font-size: 14px; color: #718096; text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #E2E8F0;">
              <p><strong>Direct Assignment Link:</strong></p>
              <p style="word-break: break-all; background-color: #F7FAFC; padding: 10px; border-radius: 4px; margin: 10px 0;">${assignmentLink}</p>
              
              <p><strong>Student Portal Link:</strong></p>
              <p style="word-break: break-all; background-color: #F7FAFC; padding: 10px; border-radius: 4px; margin: 10px 0;">${studentPortalLink}</p>
              
              <p><strong>These links are unique to you. Please do not share them with others.</strong></p>
            </div>
          </div>
        </div>
      `,
    };

    // Use the helper function to send the email
    const isEmailSent = await sendEmail(msg);
    if (isEmailSent) {
      await admin.firestore().collection("assignments").doc(assignmentId).update({ emailSent: true });
      console.log(`Email sent and marked for assignment ${assignmentId}`);
    } else {
      console.error(`Failed to send email for assignment ${assignmentId}`);
    }
  }
);

export const sendEmailLinkWithAssignment = onDocumentCreated(
  {
    document: "assignments/{assignmentId}",
    secrets: [SENDGRID_API_KEY, SENDER_EMAIL, APP_URL],
  },
  async (event) => {
    const snapshot = event.data;
    const assignment = snapshot?.data() as Assignment;
    const assignmentId = event.params.assignmentId;

    // Only process assignments that require password authentication
    if (!assignment || assignment.emailSent === true || assignment.useEmailLinkAuth !== true) {
      console.log("Skipping password-required auth flow", { assignmentId });
      return;
    }

    if (!assignment.studentEmail) {
      console.error("Missing student email");
      return;
    }

    const studentEmail = assignment.studentEmail.toLowerCase();
    const baseUrl = getBaseUrl();
    console.log(`Using base URL: ${baseUrl} for password-required auth`);

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

    // Format date for use in both success and fallback emails
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
    
    // Create both links
    const assignmentLink = `${baseUrl}/play?token=${assignment.linkToken}&requireAuth=true`;
    const studentPortalLink = `${baseUrl}/student`;
    
    console.log(`Generated password-required assignment link for assignment ${assignmentId}`);

    const isSetupSuccessful = setupSendGrid(SENDGRID_API_KEY.value());
    if (!isSetupSuccessful) {
      console.error("Failed to set up SendGrid properly");
      return;
    }

    const msg = {
      to: studentEmail,
      from: {
        email: SENDER_EMAIL.value().trim(),
        name: "Verse Learning"
      },
      subject: `New Assignment: ${assignment.gameTitle || assignment.gameName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f8f9fa; padding: 20px; border-radius: 8px;">
          <div style="background-color: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <h2 style="color: #2D3748; text-align: center; margin-bottom: 20px;">New Assignment from Verse Learning</h2>
            
            <p style="font-size: 16px; color: #4A5568;">Hello ${studentName},</p>
            
            <p style="font-size: 16px; color: #4A5568;">You have been assigned a new learning activity:</p>
            
            <div style="background-color: #EDF2F7; padding: 20px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #4299E1;">
              <p style="margin: 0; font-size: 18px;"><strong>Activity:</strong> ${assignment.gameTitle || assignment.gameName}</p>
              <p style="margin: 10px 0 0 0; font-size: 16px;"><strong>Due Date:</strong> ${formattedDate}</p>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <div style="margin-bottom: 15px;">
                <a href="${assignmentLink}" style="display: inline-block; background-color: #4299E1; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-size: 18px; font-weight: bold; box-shadow: 0 2px 4px rgba(0,0,0,0.2); margin-bottom: 10px;">
                  🎮 Start This Assignment
                </a>
              </div>
              <div style="margin-top: 15px;">
                <a href="${studentPortalLink}" style="display: inline-block; background-color: #38B2AC; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-size: 18px; font-weight: bold; box-shadow: 0 2px 4px rgba(0,0,0,0.2);">
                  📚 Visit Student Portal
                </a>
              </div>
            </div>
            
            <div style="background-color: #E6FFFA; padding: 20px; border-radius: 8px; border-left: 4px solid #38B2AC; margin: 25px 0;">
              <h3 style="color: #2C7A7B; margin-top: 0; font-size: 16px;">🔐 Two Ways to Access:</h3>
              <div style="color: #2C7A7B; margin: 10px 0;">
                <p style="margin: 5px 0;"><strong>Option 1 - Direct to Assignment:</strong></p>
                <ul style="margin: 5px 0; padding-left: 20px;">
                  <li>Click "Start This Assignment" above</li>
                  <li>Sign in with your email and password</li>
                  <li>Complete your assignment immediately</li>
                </ul>
                
                <p style="margin: 15px 0 5px 0;"><strong>Option 2 - Student Portal:</strong></p>
                <ul style="margin: 5px 0; padding-left: 20px;">
                  <li>Click "Visit Student Portal" above</li>
                  <li>Sign in with your email and password</li>
                  <li>View all your assignments and progress</li>
                  <li>Access this and other assignments</li>
                </ul>
              </div>
            </div>
            
            <div style="font-size: 14px; color: #718096; text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #E2E8F0;">
              <p><strong>Direct Assignment Link:</strong></p>
              <p style="word-break: break-all; background-color: #F7FAFC; padding: 10px; border-radius: 4px; margin: 10px 0;">${assignmentLink}</p>
              
              <p><strong>Student Portal Link:</strong></p>
              <p style="word-break: break-all; background-color: #F7FAFC; padding: 10px; border-radius: 4px; margin: 10px 0;">${studentPortalLink}</p>
              
              <p><strong>These links are unique to you. Please do not share them with others.</strong></p>
            </div>
          </div>
        </div>
      `,
    };

    const isEmailSent = await sendEmail(msg);
    if (isEmailSent) {
      await admin.firestore().collection("assignments").doc(assignmentId).update({ emailSent: true });
      console.log(`Password-required email sent for assignment ${assignmentId}`);
    } else {
      console.error(`Failed to send password-required email for assignment ${assignmentId}`);
    }
  }
);

// Send password setup email when a new student is created
export const sendPasswordSetupEmail = onDocumentCreated(
  {
    document: "users/{userId}",
    secrets: [SENDGRID_API_KEY, SENDER_EMAIL],
  },
  async (event) => {
    const snapshot = event.data;
    const userData = snapshot?.data();
    const userId = event.params.userId;

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
      try {
        // Try to get existing user
        await admin.auth().getUserByEmail(studentEmail);
        logger.info('Found existing Firebase Auth user for:', studentEmail);
      } catch (error: any) {
        if (error.code === 'auth/user-not-found') {
          // Create new Firebase Auth user with the same UID as the Firestore document
          await admin.auth().createUser({
            uid: userId,
            email: studentEmail,
            displayName: studentName,
            emailVerified: false
          });
          logger.info('✅ Created Firebase Auth user for:', studentEmail);
        } else {
          throw error;
        }
      }
      
      // Generate a password reset link using Firebase Auth
      const passwordResetLink = await admin.auth().generatePasswordResetLink(studentEmail);
      
      logger.info('Generated password reset link for:', studentEmail);

      // Create email content
      const subject = `Set Your Password for Verse Educational Games`;
      
      const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #2D3748; text-align: center;">Welcome to Verse Educational Games!</h1>
          
          <p>Hi ${studentName},</p>
          
          <p>Your teacher has created an account for you on our educational gaming platform. To get started, you'll need to set up your password.</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${passwordResetLink}" 
               style="background-color: #4299E1; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">
              Set Your Password
            </a>
          </div>
          
          <p><strong>Important:</strong> This link will expire in 1 hour for security reasons. If it expires, please contact your teacher for a new setup link.</p>
          
          <p>Once you've set your password, you can:</p>
          <ul>
            <li>Access assignments sent by your teacher</li>
            <li>Play educational games</li>
            <li>Track your progress</li>
          </ul>
          
          <p>If you have any questions, please contact your teacher.</p>
          
          <hr style="border: none; border-top: 1px solid #E2E8F0; margin: 30px 0;">
          <p style="font-size: 12px; color: #718096; text-align: center;">
            This email was sent from Verse Educational Games Platform
          </p>
        </div>
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
          name: "Verse Learning"
        },
        subject: subject,
        html: htmlContent
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