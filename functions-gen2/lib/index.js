"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.processEmailLinkAuth = exports.authenticateEmailLinkUser = exports.sendPasswordSetupEmail = exports.sendAssignmentEmail = exports.APP_URL = exports.SENDER_EMAIL = exports.SENDGRID_API_KEY = void 0;
const firestore_1 = require("firebase-functions/v2/firestore");
const https_1 = require("firebase-functions/v2/https");
const params_1 = require("firebase-functions/params");
const firebase_functions_1 = require("firebase-functions");
const admin = require("firebase-admin");
const sendgridHelper_1 = require("./sendgridHelper");
// Import the new PWA-aware email templates
const emailTemplates_1 = require("./emailTemplates");
// Define the secrets
exports.SENDGRID_API_KEY = (0, params_1.defineSecret)("SENDGRID_API_KEY");
exports.SENDER_EMAIL = (0, params_1.defineSecret)("SENDER_EMAIL");
exports.APP_URL = (0, params_1.defineSecret)("APP_URL");
// Get environment
const isProduction = process.env.NODE_ENV === 'production';
// Configuration flag to use untrackable email templates
// Helper function to get the appropriate base URL
function getBaseUrl() {
    // First try to get from secrets
    if (exports.APP_URL.value() && exports.APP_URL.value().trim() !== '') {
        console.log("Using base URL from APP_URL secret");
        return exports.APP_URL.value().trim();
    }
    // Fallback based on environment
    if (isProduction) {
        console.log("Fallback to production URL");
        return 'https://r2process.com';
    }
    else {
        console.log("Fallback to development URL");
        return 'https://verse-dev-central.web.app';
    }
}
// Initialize Firebase Admin
admin.initializeApp();
exports.sendAssignmentEmail = (0, firestore_1.onDocumentCreated)({
    document: "assignments/{assignmentId}",
    secrets: [exports.SENDGRID_API_KEY, exports.SENDER_EMAIL, exports.APP_URL],
}, async (event) => {
    var _a, _b;
    const snapshot = event.data;
    const assignment = snapshot === null || snapshot === void 0 ? void 0 : snapshot.data();
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
        }
        else {
            console.log(`No user found in users collection for email: ${studentEmail}, using fallback name`);
        }
    }
    catch (error) {
        console.error(`Error fetching student name from users collection:`, error);
        // Continue with fallback name
    }
    let formattedDate = "No due date set";
    try {
        const dueDate = ((_a = assignment.dueDate) === null || _a === void 0 ? void 0 : _a.toDate()) || ((_b = assignment.deadline) === null || _b === void 0 ? void 0 : _b.toDate());
        if (dueDate) {
            formattedDate = dueDate.toLocaleDateString("en-US", {
                weekday: "long", year: "numeric", month: "long", day: "numeric"
            });
        }
    }
    catch (e) {
        console.error("Date formatting error", e);
    }
    // Use the helper function to set up SendGrid
    const isSetupSuccessful = (0, sendgridHelper_1.setupSendGrid)(exports.SENDGRID_API_KEY.value());
    if (!isSetupSuccessful) {
        console.error("Failed to set up SendGrid properly");
        return;
    }
    // Use the enhanced 3-link dashboard email template for all assignments
    const emailHtml = (0, emailTemplates_1.createAssignmentEmailTemplate)(studentName, assignment.gameTitle || assignment.gameName, formattedDate, assignment.linkToken, baseUrl, studentEmail, {
        gameType: assignment.gameType,
        timesRequired: assignment.timesRequired,
        completedCount: assignment.completedCount || 0,
        status: assignment.status
    });
    const msg = {
        to: studentEmail,
        from: {
            email: exports.SENDER_EMAIL.value().trim(),
            name: "Lumino Learning"
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
    const isEmailSent = await (0, sendgridHelper_1.sendEmail)(msg);
    if (isEmailSent) {
        await admin.firestore().collection("assignments").doc(assignmentId).update({ emailSent: true });
        console.log(`Assignment email sent successfully for ${assignmentId}`);
    }
    else {
        console.error(`Failed to send assignment email for ${assignmentId}`);
    }
});
// Send password setup email when a new student is created
exports.sendPasswordSetupEmail = (0, firestore_1.onDocumentCreated)({
    document: "users/{userId}",
    secrets: [exports.SENDGRID_API_KEY, exports.SENDER_EMAIL],
}, async (event) => {
    const snapshot = event.data;
    const userData = snapshot === null || snapshot === void 0 ? void 0 : snapshot.data();
    const userId = event.params.userId;
    // Only process if this is a new student and no password setup email has been sent
    if (!userData || userData.role !== 'student' || userData.passwordSetupSent === true) {
        console.log("Skipping password setup email: not a new student or already sent", { userId });
        return;
    }
    const { email: studentEmail, name: studentName } = userData;
    firebase_functions_1.logger.info('🔵 sendPasswordSetupEmail triggered for new student:', studentEmail);
    if (!studentEmail || !studentName) {
        firebase_functions_1.logger.error('Missing required student data:', { studentEmail, studentName });
        return;
    }
    try {
        // First, create or get the Firebase Auth user
        try {
            // Try to get existing user
            await admin.auth().getUserByEmail(studentEmail);
            firebase_functions_1.logger.info('Found existing Firebase Auth user for:', studentEmail);
        }
        catch (error) {
            if (error.code === 'auth/user-not-found') {
                // Create new Firebase Auth user with the same UID as the Firestore document
                await admin.auth().createUser({
                    uid: userId,
                    email: studentEmail,
                    displayName: studentName,
                    emailVerified: false
                });
                firebase_functions_1.logger.info('✅ Created Firebase Auth user for:', studentEmail);
            }
            else {
                throw error;
            }
        }
        // Generate a password reset link using Firebase Auth
        const passwordResetLink = await admin.auth().generatePasswordResetLink(studentEmail);
        firebase_functions_1.logger.info('Generated password reset link for:', studentEmail);
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
        const isSetupSuccessful = (0, sendgridHelper_1.setupSendGrid)(exports.SENDGRID_API_KEY.value());
        if (!isSetupSuccessful) {
            firebase_functions_1.logger.error("Failed to set up SendGrid properly");
            return;
        }
        // Send email using the helper function
        const msg = {
            to: studentEmail,
            from: {
                email: exports.SENDER_EMAIL.value().trim(),
                name: "Verse Learning"
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
        const isEmailSent = await (0, sendgridHelper_1.sendEmail)(msg);
        if (!isEmailSent) {
            firebase_functions_1.logger.error('Failed to send password setup email to:', studentEmail);
            return;
        }
        firebase_functions_1.logger.info('✅ Password setup email sent successfully to:', studentEmail);
        // Mark as sent in the user document
        await admin.firestore().collection("users").doc(userId).update({
            passwordSetupSent: true,
            passwordSetupEmailSentAt: admin.firestore.FieldValue.serverTimestamp()
        });
    }
    catch (error) {
        firebase_functions_1.logger.error('❌ Error sending password setup email:', error);
    }
});
// New function to authenticate email link users
exports.authenticateEmailLinkUser = (0, https_1.onCall)({
    cors: true,
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
        firebase_functions_1.logger.info(`Generated custom token for email link user: ${studentEmail}`);
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
    }
    catch (error) {
        firebase_functions_1.logger.error('Error authenticating email link user:', error);
        throw error;
    }
});
// Alternative approach: Firestore-triggered authentication
exports.processEmailLinkAuth = (0, firestore_1.onDocumentCreated)({
    document: "emailLinkAuthRequests/{requestId}",
}, async (event) => {
    const snapshot = event.data;
    const requestData = snapshot === null || snapshot === void 0 ? void 0 : snapshot.data();
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
    }
    catch (error) {
        console.error('Error processing email link auth request:', error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        await admin.firestore().collection('emailLinkAuthRequests').doc(requestId).update({
            status: 'error',
            error: errorMessage,
            processedAt: admin.firestore.FieldValue.serverTimestamp()
        });
    }
});
//# sourceMappingURL=index.js.map