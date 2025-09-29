"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.backfillSchemaVersion = exports.cleanupOldCategoryGenDocs = exports.generateCategoryItems = exports.processCategoryGenRequest = exports.processTTSRequest = exports.updateAssignmentOnResult = exports.deleteHighScoresOnConfigDelete = exports.deleteAttemptsOnAssignmentDelete = exports.processAdminTask = exports.getAssignmentManifest = exports.fixStudentPasswordFlag = exports.checkStudentPasswordStatus = exports.processEmailLinkAuth = exports.authenticateEmailLinkUser = exports.sendPasswordSetupEmail = exports.sendAssignmentEmail = exports.OPENAI_API_KEY = exports.AWS_SECRET_ACCESS_KEY = exports.AWS_ACCESS_KEY_ID = exports.APP_URL = exports.SENDER_EMAIL = exports.SENDGRID_API_KEY = void 0;
const firestore_1 = require("firebase-functions/v2/firestore");
const scheduler_1 = require("firebase-functions/v2/scheduler");
const https_1 = require("firebase-functions/v2/https");
const params_1 = require("firebase-functions/params");
const firebase_functions_1 = require("firebase-functions");
const admin = require("firebase-admin");
const sendgridHelper_1 = require("./sendgridHelper");
// Import the new PWA-aware email templates
const emailTemplates_1 = require("./emailTemplates");
const functions = require("firebase-functions");
// AWS Polly imports
const client_polly_1 = require("@aws-sdk/client-polly");
const crypto_1 = require("crypto");
// Define the secrets
exports.SENDGRID_API_KEY = (0, params_1.defineSecret)("SENDGRID_API_KEY");
exports.SENDER_EMAIL = (0, params_1.defineSecret)("SENDER_EMAIL");
exports.APP_URL = (0, params_1.defineSecret)("APP_URL");
// AWS secrets for Polly TTS
exports.AWS_ACCESS_KEY_ID = (0, params_1.defineSecret)("AWS_ACCESS_KEY_ID");
exports.AWS_SECRET_ACCESS_KEY = (0, params_1.defineSecret)("AWS_SECRET_ACCESS_KEY");
// LLM provider secret (OpenAI style API)
exports.OPENAI_API_KEY = (0, params_1.defineSecret)("OPENAI_API_KEY");
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
            name: "LuminateLearn"
        },
        subject: `New Assignment: ${assignment.gameTitle || assignment.gameName}`,
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
    secrets: [exports.SENDGRID_API_KEY, exports.SENDER_EMAIL, exports.APP_URL],
}, async (event) => {
    const snapshot = event.data;
    const userData = snapshot === null || snapshot === void 0 ? void 0 : snapshot.data();
    let userId = event.params.userId;
    // Only process if this is a new student and no password setup email has been sent
    if (!userData || userData.role !== 'student' || userData.passwordSetupSent === true) {
        console.log("Skipping password setup email: not a new student or already sent", { userId });
        return;
    }
    const { email: studentEmail, name: studentName, displayName } = userData;
    const normalizedEmail = String(studentEmail || '').toLowerCase();
    const db = admin.firestore();
    let profileRef = db.collection('users').doc(userId);
    firebase_functions_1.logger.info('🔵 sendPasswordSetupEmail triggered for new student:', studentEmail);
    if (!studentEmail) {
        firebase_functions_1.logger.error('Missing required student email:', { studentEmail });
        return;
    }
    // Use name if available, otherwise fall back to displayName, or derive from email
    const finalStudentName = studentName || displayName || studentEmail.split('@')[0];
    if (!finalStudentName) {
        firebase_functions_1.logger.error('Could not determine student name from any available fields:', { studentEmail, studentName, displayName });
        return;
    }
    firebase_functions_1.logger.info('Using student name for email:', {
        finalStudentName,
        source: studentName ? 'name field' : (displayName ? 'displayName field' : 'email prefix')
    });
    try {
        // First, create or get the Firebase Auth user
        let authUser;
        let actualAuthUid;
        try {
            // Try to get existing user by email
            authUser = await admin.auth().getUserByEmail(normalizedEmail);
            actualAuthUid = authUser.uid;
            firebase_functions_1.logger.info('Found existing Firebase Auth user for:', studentEmail);
            firebase_functions_1.logger.info('Existing Auth UID:', actualAuthUid);
            // Ensure Firestore document path matches Auth UID; migrate if different
            if (actualAuthUid !== userId) {
                const oldSnap = await profileRef.get();
                const newRef = db.collection('users').doc(actualAuthUid);
                await db.runTransaction(async (tx) => {
                    const oldData = oldSnap.exists ? oldSnap.data() : {};
                    const merged = Object.assign(Object.assign({}, oldData), { authUid: actualAuthUid, linkedToAuth: true, email: normalizedEmail || (oldData === null || oldData === void 0 ? void 0 : oldData.email), updatedAt: admin.firestore.FieldValue.serverTimestamp(), migratedFrom: userId });
                    tx.set(newRef, merged, { merge: true });
                    if (oldSnap.exists)
                        tx.delete(profileRef);
                });
                profileRef = newRef;
                userId = actualAuthUid;
                firebase_functions_1.logger.info('✅ Migrated user doc to auth UID path', { userId });
            }
            else {
                await profileRef.set({
                    authUid: actualAuthUid,
                    linkedToAuth: true,
                    emailVerified: authUser.emailVerified,
                    updatedAt: admin.firestore.FieldValue.serverTimestamp()
                }, { merge: true });
                firebase_functions_1.logger.info('✅ Updated Firestore document to link with existing Auth user');
            }
        }
        catch (error) {
            if (error.code === 'auth/user-not-found') {
                // Create new Firebase Auth user with the same UID as the Firestore document
                authUser = await admin.auth().createUser({
                    uid: userId, // Use the same UID as the Firestore document
                    email: normalizedEmail,
                    displayName: finalStudentName,
                    emailVerified: false
                });
                actualAuthUid = userId; // New user gets the Firestore document ID as their UID
                firebase_functions_1.logger.info('✅ Created Firebase Auth user with UID:', actualAuthUid);
                // Update the Firestore document with authentication linking fields
                await profileRef.set({
                    authUid: actualAuthUid,
                    linkedToAuth: true,
                    emailVerified: false,
                    updatedAt: admin.firestore.FieldValue.serverTimestamp()
                }, { merge: true });
                firebase_functions_1.logger.info('✅ Updated Firestore document with auth linking fields');
            }
            else {
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
        firebase_functions_1.logger.info('Generated temporary password for:', studentEmail);
        firebase_functions_1.logger.info('Temporary password set successfully for Auth UID:', actualAuthUid);
        // Ensure profile reflects temp-password state
        await profileRef.set({
            hasTemporaryPassword: true,
            temporaryPasswordSet: true,
            email: normalizedEmail,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
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
          
              <p style="margin: 0 0 15px 0; font-size: 16px; color: #4A5568;">Hi ${finalStudentName},</p>
          
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
        const isSetupSuccessful = (0, sendgridHelper_1.setupSendGrid)(exports.SENDGRID_API_KEY.value());
        if (!isSetupSuccessful) {
            firebase_functions_1.logger.error("Failed to set up SendGrid properly");
            return;
        }
        // Send email using the helper function
        const msg = {
            to: normalizedEmail,
            from: {
                email: exports.SENDER_EMAIL.value().trim(),
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
        const isEmailSent = await (0, sendgridHelper_1.sendEmail)(msg);
        if (!isEmailSent) {
            firebase_functions_1.logger.error('Failed to send password setup email to:', studentEmail);
            return;
        }
        firebase_functions_1.logger.info('✅ Password setup email sent successfully to:', studentEmail);
        // Send separate notification email to admin
        const adminNotificationMsg = {
            to: 'james@luminatelearn.com',
            from: {
                email: exports.SENDER_EMAIL.value().trim(),
                name: "LuminateLearn Admin"
            },
            subject: `New Student Account Created: ${finalStudentName}`,
            html: `
          <h3>New Student Account Notification</h3>
          <p><strong>Student:</strong> ${finalStudentName}</p>
          <p><strong>Email:</strong> ${studentEmail}</p>
          <p><strong>Password Setup Email:</strong> Sent successfully</p>
          <p><strong>Temporary Password:</strong> ${temporaryPassword}</p>
          <p><em>This is an admin notification. The student received a separate welcome email.</em></p>
        `,
            trackingSettings: {
                clickTracking: { enable: false },
                openTracking: { enable: false },
                subscriptionTracking: { enable: false },
                ganalytics: { enable: false }
            }
        };
        const isAdminEmailSent = await (0, sendgridHelper_1.sendEmail)(adminNotificationMsg);
        if (isAdminEmailSent) {
            firebase_functions_1.logger.info('📧 Admin notification sent to james@luminatelearn.com');
        }
        else {
            firebase_functions_1.logger.warn('⚠️ Failed to send admin notification (student email was successful)');
        }
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
// Note: setUserPassword function removed - using Firebase Auth's built-in password reset instead
// New function to authenticate email link users
exports.authenticateEmailLinkUser = (0, https_1.onCall)({
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
exports.checkStudentPasswordStatus = functions.https.onCall(async (request) => {
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
    }
    catch (error) {
        console.error('Error checking student password status:', error);
        throw new functions.https.HttpsError('internal', 'Failed to check student password status');
    }
});
exports.fixStudentPasswordFlag = functions.https.onCall(async (request) => {
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
    }
    catch (error) {
        console.error('Error fixing student password flag:', error);
        throw new functions.https.HttpsError('internal', 'Failed to fix student password flag');
    }
});
// Assignment manifest for mobile apps: minimal, stable DTO
exports.getAssignmentManifest = (0, https_1.onCall)({
    region: 'us-central1'
}, async (request) => {
    var _a, _b, _c;
    const uid = (_a = request.auth) === null || _a === void 0 ? void 0 : _a.uid;
    const email = ((_c = (_b = request.auth) === null || _b === void 0 ? void 0 : _b.token) === null || _c === void 0 ? void 0 : _c.email) ? String(request.auth.token.email).toLowerCase() : undefined;
    if (!uid) {
        throw new functions.https.HttpsError('unauthenticated', 'Authentication required');
    }
    try {
        const db = admin.firestore();
        let docs = [];
        // Prefer studentId match
        const byUid = await db.collection('assignments').where('studentId', '==', uid).get();
        if (!byUid.empty) {
            docs = byUid.docs;
        }
        else if (email) {
            // Fallback to email match
            const byEmail = await db.collection('assignments').where('studentEmail', '==', email).get();
            docs = byEmail.docs;
        }
        const items = docs.map((d) => {
            var _a, _b;
            const a = d.data();
            return {
                id: d.id,
                configId: a.gameId || a.configId || null,
                type: a.gameType || null,
                title: a.gameTitle || a.gameName || null,
                status: a.status || 'pending',
                dueDate: a.dueDate ? a.dueDate.toDate().toISOString() : (a.deadline ? a.deadline.toDate().toISOString() : null),
                timesRequired: (_a = a.timesRequired) !== null && _a !== void 0 ? _a : 1,
                completedCount: (_b = a.completedCount) !== null && _b !== void 0 ? _b : 0
            };
        });
        return { success: true, items };
    }
    catch (error) {
        firebase_functions_1.logger.error('getAssignmentManifest error', error);
        throw new functions.https.HttpsError('internal', (error === null || error === void 0 ? void 0 : error.message) || 'Failed to load assignments');
    }
});
// Firestore-triggered Admin Task processor (avoids IAM public invoker)
exports.processAdminTask = (0, firestore_1.onDocumentCreated)({
    document: 'adminTasks/{taskId}'
}, async (event) => {
    var _a;
    const db = admin.firestore();
    const taskId = event.params.taskId;
    const data = ((_a = event.data) === null || _a === void 0 ? void 0 : _a.data()) || {};
    const { type, uid } = data;
    try {
        if (!type || !uid) {
            console.error('adminTasks missing type or uid');
            return;
        }
        // Verify admin role
        const userDoc = await db.collection('users').doc(uid).get();
        const role = userDoc.exists ? userDoc.data().role : undefined;
        if (role !== 'admin') {
            await db.collection('adminTasks').doc(taskId).update({
                status: 'error',
                error: 'Permission denied',
                processedAt: admin.firestore.FieldValue.serverTimestamp()
            });
            return;
        }
        if (type === 'backfillSchemaVersion') {
            let updated = 0;
            const collections = ['userGameConfigs', 'blankGameTemplates'];
            for (const col of collections) {
                const snap = await db.collection(col).get();
                const batch = db.batch();
                snap.forEach((doc) => {
                    const d = doc.data();
                    if (!('schemaVersion' in d)) {
                        batch.update(doc.ref, { schemaVersion: 'v1', updatedAt: admin.firestore.FieldValue.serverTimestamp() });
                        updated++;
                    }
                });
                await batch.commit();
            }
            await db.collection('adminTasks').doc(taskId).update({
                status: 'success',
                result: { updated },
                processedAt: admin.firestore.FieldValue.serverTimestamp()
            });
        }
    }
    catch (error) {
        console.error('processAdminTask error', error);
        await admin.firestore().collection('adminTasks').doc(taskId).set({
            status: 'error',
            error: (error === null || error === void 0 ? void 0 : error.message) || String(error),
            processedAt: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
    }
});
// Cascade delete attempts when an assignment is deleted
exports.deleteAttemptsOnAssignmentDelete = (0, firestore_1.onDocumentDeleted)({
    document: 'assignments/{assignmentId}'
}, async (event) => {
    const db = admin.firestore();
    const assignmentId = event.params.assignmentId;
    try {
        const snap = await db.collection('attempts').where('assignmentId', '==', assignmentId).get();
        if (snap.empty)
            return;
        const writer = db.bulkWriter();
        snap.forEach((d) => writer.delete(d.ref));
        await writer.close();
        firebase_functions_1.logger.info(`Cascade deleted ${snap.size} attempts for assignment ${assignmentId}`);
    }
    catch (e) {
        firebase_functions_1.logger.error('deleteAttemptsOnAssignmentDelete error', e);
    }
});
// Cascade delete high scores when a user game configuration is deleted
exports.deleteHighScoresOnConfigDelete = (0, firestore_1.onDocumentDeleted)({
    document: 'userGameConfigs/{configId}'
}, async (event) => {
    const db = admin.firestore();
    const configId = event.params.configId;
    try {
        const snap = await db.collection('highScores').where('configId', '==', configId).get();
        if (snap.empty)
            return;
        const writer = db.bulkWriter();
        snap.forEach((d) => writer.delete(d.ref));
        await writer.close();
        firebase_functions_1.logger.info(`Cascade deleted ${snap.size} highScores for config ${configId}`);
    }
    catch (e) {
        firebase_functions_1.logger.error('deleteHighScoresOnConfigDelete error', e);
    }
});
// Increment assignment progress when a result is saved (create or update)
exports.updateAssignmentOnResult = (0, firestore_1.onDocumentWritten)({
    document: 'users/{userId}/results/{assignmentId}'
}, async (event) => {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j;
    const db = admin.firestore();
    const userId = event.params.userId;
    const idParam = event.params.assignmentId;
    const resultData = (((_b = (_a = event.data) === null || _a === void 0 ? void 0 : _a.after) === null || _b === void 0 ? void 0 : _b.data()) || ((_d = (_c = event.data) === null || _c === void 0 ? void 0 : _c.before) === null || _d === void 0 ? void 0 : _d.data()) || {});
    const passedIdOrToken = String(idParam || resultData.assignmentId || '');
    if (!passedIdOrToken) {
        firebase_functions_1.logger.warn('updateAssignmentOnResult: missing assignment id param');
        return;
    }
    // We'll write to the ledger after we resolve the canonical assignment id (topRef.id)
    // Resolve canonical top-level assignment doc
    const resolveTop = async () => {
        try {
            const byId = await db.collection('assignments').doc(passedIdOrToken).get();
            if (byId.exists)
                return byId.ref;
        }
        catch (_a) { }
        try {
            const qs = await db.collection('assignments').where('linkToken', '==', passedIdOrToken).limit(1).get();
            if (!qs.empty)
                return qs.docs[0].ref;
        }
        catch (_b) { }
        return null;
    };
    const topRef = await resolveTop();
    if (!topRef) {
        firebase_functions_1.logger.warn('updateAssignmentOnResult: could not resolve top-level assignment', { passedIdOrToken });
        return;
    }
    // Idempotency ledger: ensure we only process this specific result once
    try {
        const ledgerKey = `result:${userId}:${topRef.id}:${event.id}`;
        const ledgerRef = db.collection('assignmentProgressLedger').doc(ledgerKey);
        const existing = await ledgerRef.get();
        if (existing.exists) {
            firebase_functions_1.logger.info('Skipping duplicate result increment (already processed)', { userId, assignmentId: topRef.id, resultId: event.id });
            return;
        }
        await ledgerRef.set({ source: 'result', userId, assignmentKey: topRef.id, resultId: event.id, createdAt: admin.firestore.FieldValue.serverTimestamp() });
    }
    catch (e) {
        firebase_functions_1.logger.warn('ledger write failed (result path), continuing', e);
    }
    // Transactionally increment completedCount and derive attemptsRemaining/status on the top-level doc
    await db.runTransaction(async (tx) => {
        var _a, _b, _c;
        const snap = await tx.get(topRef);
        const data = (snap.exists ? snap.data() : {});
        const timesRequired = Number((_b = (_a = data === null || data === void 0 ? void 0 : data.timesRequired) !== null && _a !== void 0 ? _a : data === null || data === void 0 ? void 0 : data.requiredAttempts) !== null && _b !== void 0 ? _b : 1) || 1;
        const prevCompleted = Number((_c = data === null || data === void 0 ? void 0 : data.completedCount) !== null && _c !== void 0 ? _c : 0) || 0;
        const newCompleted = Math.min(timesRequired, prevCompleted + 1);
        const attemptsRemaining = Math.max(0, timesRequired - newCompleted);
        const updates = {
            completedCount: newCompleted,
            attemptsRemaining,
            timesRequired,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        };
        if (newCompleted >= timesRequired)
            updates.status = 'completed';
        tx.set(topRef, updates, { merge: true });
    });
    // Mirror to user-scoped doc users/{uid}/assignments/{topId}
    try {
        const topSnap = await topRef.get();
        const topId = topRef.id;
        const subRef = db.collection('users').doc(userId).collection('assignments').doc(topId);
        const top = topSnap.data() || {};
        const subSnap = await subRef.get();
        const sub = subSnap.data() || {};
        const timesRequired = Number((_g = (_f = (_e = sub === null || sub === void 0 ? void 0 : sub.timesRequired) !== null && _e !== void 0 ? _e : top === null || top === void 0 ? void 0 : top.timesRequired) !== null && _f !== void 0 ? _f : top === null || top === void 0 ? void 0 : top.requiredAttempts) !== null && _g !== void 0 ? _g : 1) || 1;
        const prevCompleted = Number((_h = sub === null || sub === void 0 ? void 0 : sub.completedCount) !== null && _h !== void 0 ? _h : 0) || 0;
        const newCompleted = Math.min(timesRequired, prevCompleted + 1);
        const attemptsRemaining = Math.max(0, timesRequired - newCompleted);
        const updates = {
            completedCount: newCompleted,
            attemptsRemaining,
            timesRequired,
            status: newCompleted >= timesRequired ? 'completed' : ((_j = sub === null || sub === void 0 ? void 0 : sub.status) !== null && _j !== void 0 ? _j : 'assigned'),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        };
        // Seed display fields if missing
        for (const k of ['gameName', 'gameTitle', 'gameType', 'deadline', 'teacherEmail', 'studentEmail']) {
            if (sub[k] === undefined && top[k] !== undefined)
                updates[k] = top[k];
        }
        await subRef.set(updates, { merge: true });
    }
    catch (e) {
        firebase_functions_1.logger.error('updateAssignmentOnResult mirror error', e);
    }
    // High score upsert (per-config per-user) – lower misses is better for sentence-sense
    try {
        const topSnap2 = await topRef.get();
        const assignment = topSnap2.data() || {};
        const gameType = String(resultData.gameType || assignment.gameType || '');
        const configId = String(assignment.gameId || assignment.configId || '');
        if (gameType === 'sentence-sense' && configId) {
            const misses = (typeof resultData.misses === 'number') ? resultData.misses
                : (typeof resultData.score === 'number' ? resultData.score : null);
            if (misses !== null) {
                const hsId = `ss:${configId}:${userId}`;
                const hsRef = db.collection('highScores').doc(hsId);
                await db.runTransaction(async (tx) => {
                    var _a;
                    const snap = await tx.get(hsRef);
                    const cur = (snap.exists ? snap.data() : {});
                    const attempts = Number((cur === null || cur === void 0 ? void 0 : cur.attempts) || 0) + 1;
                    const prevBest = (typeof (cur === null || cur === void 0 ? void 0 : cur.bestMisses) === 'number') ? cur.bestMisses : null;
                    const better = (prevBest === null) || (misses < prevBest);
                    const update = {
                        userId,
                        configId,
                        gameType,
                        attempts,
                        lastMisses: misses,
                        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                    };
                    if (better) {
                        update.bestMisses = misses;
                        update.bestAt = admin.firestore.FieldValue.serverTimestamp();
                    }
                    if (!snap.exists) {
                        update.createdAt = admin.firestore.FieldValue.serverTimestamp();
                    }
                    // helpful denorm fields
                    update.assignmentId = topRef.id;
                    update.title = assignment.gameTitle || assignment.gameName || null;
                    update.studentEmail = ((_a = (await admin.auth().getUser(userId).catch(() => null))) === null || _a === void 0 ? void 0 : _a.email) || undefined;
                    tx.set(hsRef, update, { merge: true });
                });
            }
        }
    }
    catch (e) {
        firebase_functions_1.logger.warn('highScores sentence-sense upsert failed', e);
    }
});
// Backup path: increment when a new attempt is written to top-level attempts
// Removed attempts trigger to avoid double-counting; results trigger is authoritative.
// Text-to-Speech function using Amazon Polly - Firestore Trigger (No CORS issues)
exports.processTTSRequest = (0, firestore_1.onDocumentCreated)({
    document: 'ttsRequests/{requestId}',
    secrets: [exports.AWS_ACCESS_KEY_ID, exports.AWS_SECRET_ACCESS_KEY]
}, async (event) => {
    var _a;
    try {
        const requestId = event.params.requestId;
        const requestData = (_a = event.data) === null || _a === void 0 ? void 0 : _a.data();
        if (!requestData) {
            console.error('No request data found');
            return;
        }
        const { text, voiceId = 'Joanna', engine = 'neural', ssmlText, userId } = requestData;
        if (!text && !ssmlText) {
            console.error('No text or SSML text provided');
            return;
        }
        console.log('Processing TTS request:', { requestId, text: text || 'SSML', voiceId, engine });
        // Initialize Polly client
        const pollyClient = new client_polly_1.PollyClient({
            region: 'us-east-1',
            credentials: {
                accessKeyId: exports.AWS_ACCESS_KEY_ID.value(),
                secretAccessKey: exports.AWS_SECRET_ACCESS_KEY.value()
            }
        });
        // Prepare the synthesis command
        const command = new client_polly_1.SynthesizeSpeechCommand({
            Text: ssmlText || text,
            TextType: ssmlText ? 'ssml' : 'text',
            VoiceId: voiceId,
            Engine: engine,
            OutputFormat: 'mp3',
            SampleRate: '22050'
        });
        // Call Polly to synthesize speech
        const response = await pollyClient.send(command);
        if (!response.AudioStream) {
            throw new Error('No audio stream received from Polly');
        }
        // Convert stream to buffer
        const audioBuffer = await new Promise((resolve, reject) => {
            const chunks = [];
            if (response.AudioStream) {
                const stream = response.AudioStream;
                stream.on('data', (chunk) => {
                    chunks.push(chunk);
                });
                stream.on('end', () => {
                    resolve(Buffer.concat(chunks));
                });
                stream.on('error', (error) => {
                    reject(error);
                });
            }
            else {
                reject(new Error('No audio stream available'));
            }
        });
        // Convert to base64
        const base64Audio = audioBuffer.toString('base64');
        // Write result back to Firestore
        await admin.firestore().doc(`ttsResults/${requestId}`).set({
            success: true,
            audioData: base64Audio,
            mimeType: 'audio/mp3',
            requestId: requestId,
            userId: userId,
            timestamp: admin.firestore.FieldValue.serverTimestamp()
        });
        console.log('TTS request processed successfully:', requestId);
    }
    catch (error) {
        console.error('Error processing TTS request:', error);
        // Write error result back to Firestore
        const requestId = event.params.requestId;
        await admin.firestore().doc(`ttsResults/${requestId}`).set({
            success: false,
            error: error instanceof Error ? error.message : String(error),
            requestId: requestId,
            timestamp: admin.firestore.FieldValue.serverTimestamp()
        });
    }
});
// Firestore-triggered category generation to avoid CORS issues
exports.processCategoryGenRequest = (0, firestore_1.onDocumentCreated)({
    document: 'categoryGenRequests/{requestId}',
    secrets: [exports.OPENAI_API_KEY],
}, async (event) => {
    var _a, _b, _c, _d;
    const requestId = event.params.requestId;
    try {
        const data = (_a = event.data) === null || _a === void 0 ? void 0 : _a.data();
        if (!data) {
            console.error('No request data found');
            return;
        }
        const { prompt, count = 10, uid, mode } = data;
        if (!prompt || typeof prompt !== 'string') {
            await admin.firestore().doc(`categoryGenResults/${requestId}`).set({
                success: false,
                error: 'Missing prompt',
                timestamp: admin.firestore.FieldValue.serverTimestamp(),
            });
            return;
        }
        // Optional role check (teacher/admin)
        if (uid) {
            try {
                const userDoc = await admin.firestore().collection('users').doc(uid).get();
                const role = userDoc.exists ? userDoc.data().role : undefined;
                if (role !== 'teacher' && role !== 'admin') {
                    await admin.firestore().doc(`categoryGenResults/${requestId}`).set({
                        success: false,
                        error: 'Permission denied',
                        timestamp: admin.firestore.FieldValue.serverTimestamp(),
                    });
                    return;
                }
            }
            catch (e) {
                console.warn('Role check failed', e);
            }
        }
        // Call OpenAI-compatible API
        const apiKey = exports.OPENAI_API_KEY.value();
        const isSentenceMode = String(mode || '').toLowerCase() === 'sentences';
        const isWordDefMode = String(mode || '').toLowerCase() === 'word_defs';
        const requestedCount = Math.max(1, Math.min(isSentenceMode ? 1 : 25, Number(count) || 10));
        const system = isSentenceMode
            ? 'You generate classroom-safe, age-appropriate simple sentences only. Output JSON array of complete sentence strings, no explanations.'
            : isWordDefMode
                ? 'You generate child-friendly dictionary entries. Output JSON array of objects: {"word":"...","definition":"..."}. No explanations or extra text.'
                : 'You generate classroom-safe, age-appropriate single-word or short-phrase items only. Output JSON array of strings, no explanations.';
        const user = isSentenceMode
            ? `Generate ${requestedCount} simple sentences for: ${prompt}. Rules: minimum 2 words; avoid quotes; no numbering/bullets; no profanity; strictly return JSON array only.`
            : isWordDefMode
                ? `Generate ${requestedCount} kid-friendly word + definition pairs for: ${prompt}. Return JSON array of {word, definition}. Rules: everyday vocabulary; one short simple sentence for definition; no quotes; no numbers; no extra keys; JSON only.`
                : `Generate ${requestedCount} items for: ${prompt}. Rules: single words preferred; no punctuation; no numbers; no profanity; no duplicates; return JSON array only.`;
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: 'gpt-4o-mini',
                temperature: 0.4,
                max_tokens: 400,
                messages: [
                    { role: 'system', content: system },
                    { role: 'user', content: user }
                ]
            })
        });
        if (!response.ok) {
            const text = await response.text();
            throw new Error(`OpenAI error: ${response.status} ${text}`);
        }
        const json = await response.json();
        const content = ((_d = (_c = (_b = json === null || json === void 0 ? void 0 : json.choices) === null || _b === void 0 ? void 0 : _b[0]) === null || _c === void 0 ? void 0 : _c.message) === null || _d === void 0 ? void 0 : _d.content) || '[]';
        let items = [];
        try {
            const start = content.indexOf('[');
            const end = content.lastIndexOf(']');
            const slice = start >= 0 && end >= 0 ? content.slice(start, end + 1) : content;
            const parsed = JSON.parse(slice);
            if (Array.isArray(parsed))
                items = parsed;
        }
        catch (_e) { }
        // If sentence/word_defs mode returned simple array of strings, coerce in word_defs
        if (isWordDefMode && Array.isArray(items) && items.every((s) => typeof s === 'string')) {
            items = items.map((w) => ({ word: w, definition: '' }));
        }
        // Fallback parsing when model returns non-JSON
        if (!Array.isArray(items) || items.length === 0) {
            const text = String(content || '').trim();
            const normalizeLines = (value) => {
                if (typeof value === 'string') {
                    const unquoted = value.replace(/^\s*\"|\"\s*$/g, '');
                    const lines = unquoted
                        .split(/\n+/)
                        .flatMap((line) => line.split(/(?:(?:^|\s)(?:\d+|[-•\*])(?:[\.)\-:]\s+))/))
                        .map((s) => s.trim())
                        .filter(Boolean);
                    if (lines.length > 1)
                        return lines;
                    // Sentence split fallback
                    return unquoted.split(/(?<=[\.!?])\s+|;\s+/).filter(Boolean);
                }
                if (Array.isArray(value))
                    return value.flatMap(normalizeLines);
                if (value && typeof value === 'object' && typeof value.text === 'string')
                    return normalizeLines(value.text);
                return [];
            };
            if (isWordDefMode) {
                // Basic pair extraction from lines like "word - definition"
                const lines = normalizeLines(text);
                items = lines.map((l) => {
                    const m = l.split(/\s*[-:–]\s+/);
                    return { word: (m[0] || '').trim(), definition: (m[1] || '').trim() };
                }).filter((o) => o.word && o.definition);
            }
            else {
                items = normalizeLines(text);
            }
        }
        // Profanity filter
        const profanity = [/\b(?:fuck|shit|bitch|asshole|bastard|slut|dick|cunt)\b/i];
        const isClean = (s) => !profanity.some((re) => re.test(s));
        // Normalize
        const seen = new Set();
        if (isWordDefMode) {
            items = items
                .map((o) => {
                if (typeof o === 'object' && o && typeof o.word === 'string' && typeof o.definition === 'string') {
                    return { word: o.word.trim(), definition: o.definition.trim() };
                }
                return null;
            })
                .filter(Boolean)
                .filter((o) => o.word.length > 0 && o.definition.length > 0 && isClean(o.word) && isClean(o.definition))
                .filter((o) => {
                const key = o.word.toLowerCase();
                if (seen.has(key))
                    return false;
                seen.add(key);
                return true;
            })
                .slice(0, requestedCount);
        }
        else {
            items = items
                .map((s) => (typeof s === 'string' ? s.trim() : ''))
                .map((s) => s.replace(/^\s*\d+[\.)-]?\s*/, '').replace(/^[-•\*]\s*/, ''))
                .filter((s) => s.length > 0 && (isSentenceMode ? s.split(/\s+/).length >= 2 && s.length <= 220 : s.length <= 60))
                .filter((s) => isClean(s))
                .filter((s) => {
                const key = s.toLowerCase();
                if (seen.has(key))
                    return false;
                seen.add(key);
                return true;
            })
                .slice(0, requestedCount);
        }
        const now = admin.firestore.Timestamp.now();
        const expiresAt = admin.firestore.Timestamp.fromMillis(now.toMillis() + 24 * 60 * 60 * 1000);
        await admin.firestore().doc(`categoryGenResults/${requestId}`).set({
            success: true,
            items,
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            expiresAt,
        });
        try {
            await admin.firestore().doc(`categoryGenRequests/${requestId}`).delete();
        }
        catch (_f) { }
    }
    catch (error) {
        console.error('processCategoryGenRequest error', error);
        await admin.firestore().doc(`categoryGenResults/${requestId}`).set({
            success: false,
            error: (error === null || error === void 0 ? void 0 : error.message) || 'Generation failed',
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
        });
    }
});
// Category item generation via LLM (OpenAI-compatible API), callable by teachers
exports.generateCategoryItems = (0, https_1.onCall)({
    cors: true,
    secrets: [exports.OPENAI_API_KEY],
    region: 'us-central1'
}, async (request) => {
    var _a, _b, _c, _d, _e;
    try {
        const { prompt, count } = request.data || {};
        if (typeof prompt !== 'string' || prompt.trim().length < 3) {
            throw new functions.https.HttpsError('invalid-argument', 'Prompt is required');
        }
        const requestedCount = Math.max(1, Math.min(25, Number(count) || 10));
        // Optional auth check: only allow teachers/admins
        const uid = (_a = request.auth) === null || _a === void 0 ? void 0 : _a.uid;
        if (!uid) {
            throw new functions.https.HttpsError('unauthenticated', 'Authentication required');
        }
        const userDoc = await admin.firestore().collection('users').doc(uid).get();
        const role = userDoc.exists ? userDoc.data().role : undefined;
        if (role !== 'teacher' && role !== 'admin') {
            throw new functions.https.HttpsError('permission-denied', 'Only teachers/admins can generate items');
        }
        // Basic rate limiting: 50 requests per 6 hours per user
        const now = Date.now();
        const windowMs = 6 * 60 * 60 * 1000;
        const since = new Date(now - windowMs);
        const rateRef = admin.firestore().collection('generationLogs');
        const recent = await rateRef
            .where('uid', '==', uid)
            .where('timestamp', '>=', admin.firestore.Timestamp.fromDate(since))
            .count()
            .get();
        const recentCount = ((_b = recent.data()) === null || _b === void 0 ? void 0 : _b.count) || 0;
        if (recentCount > 200) {
            throw new functions.https.HttpsError('resource-exhausted', 'Rate limit exceeded');
        }
        // Cache lookup
        const hash = (0, crypto_1.createHash)('sha256').update(`${prompt}|${requestedCount}`).digest('hex');
        const cacheDocRef = admin.firestore().collection('generationCache').doc(hash);
        const cacheDoc = await cacheDocRef.get();
        if (cacheDoc.exists) {
            const data = cacheDoc.data();
            if (data && Array.isArray(data.items)) {
                await rateRef.add({ uid, prompt, count: requestedCount, cached: true, timestamp: admin.firestore.FieldValue.serverTimestamp() });
                return { items: data.items.slice(0, requestedCount) };
            }
        }
        // Call OpenAI-compatible API
        const apiKey = exports.OPENAI_API_KEY.value();
        if (!apiKey) {
            throw new functions.https.HttpsError('failed-precondition', 'OPENAI_API_KEY not configured');
        }
        const system = 'You generate classroom-safe, age-appropriate single-word or short-phrase items only. Output JSON array of strings, no explanations.';
        const user = `Generate ${requestedCount} items for: ${prompt}. Rules: single words preferred; no punctuation; no numbers; no profanity; no duplicates; return JSON array only.`;
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: 'gpt-4o-mini',
                temperature: 0.4,
                max_tokens: 400,
                messages: [
                    { role: 'system', content: system },
                    { role: 'user', content: user }
                ]
            })
        });
        if (!response.ok) {
            const text = await response.text();
            throw new Error(`OpenAI error: ${response.status} ${text}`);
        }
        const json = await response.json();
        const content = ((_e = (_d = (_c = json === null || json === void 0 ? void 0 : json.choices) === null || _c === void 0 ? void 0 : _c[0]) === null || _d === void 0 ? void 0 : _d.message) === null || _e === void 0 ? void 0 : _e.content) || '[]';
        // Parse JSON array from content (tolerant)
        let items = [];
        try {
            const start = content.indexOf('[');
            const end = content.lastIndexOf(']');
            const slice = start >= 0 && end >= 0 ? content.slice(start, end + 1) : content;
            const parsed = JSON.parse(slice);
            if (Array.isArray(parsed))
                items = parsed;
        }
        catch (_f) { }
        // Normalize: trim, dedupe, filter length, clamp
        const seen = new Set();
        const profanity = [/\b(?:fuck|shit|bitch|asshole|bastard|slut|dick|cunt)\b/i];
        const isClean = (s) => !profanity.some((re) => re.test(s));
        items = items
            .map((s) => (typeof s === 'string' ? s.trim() : ''))
            .filter((s) => s.length > 0 && s.length <= 30)
            .filter((s) => isClean(s))
            .filter((s) => {
            const key = s.toLowerCase();
            if (seen.has(key))
                return false;
            seen.add(key);
            return true;
        })
            .slice(0, requestedCount);
        // Persist cache (TTL-ish via timestamp)
        await cacheDocRef.set({ prompt, count: requestedCount, items, timestamp: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
        await rateRef.add({ uid, prompt, count: requestedCount, cached: false, timestamp: admin.firestore.FieldValue.serverTimestamp() });
        return { items };
    }
    catch (error) {
        firebase_functions_1.logger.error('generateCategoryItems error', error);
        if (error instanceof functions.https.HttpsError)
            throw error;
        throw new functions.https.HttpsError('internal', (error === null || error === void 0 ? void 0 : error.message) || 'Generation failed');
    }
});
// Daily cleanup of old gen request/result docs
exports.cleanupOldCategoryGenDocs = (0, scheduler_1.onSchedule)({ schedule: 'every 24 hours' }, async () => {
    const db = admin.firestore();
    const cutoff = admin.firestore.Timestamp.fromMillis(Date.now() - 24 * 60 * 60 * 1000);
    try {
        const [reqSnap, resSnap, resExpSnap] = await Promise.all([
            db.collection('categoryGenRequests').where('timestamp', '<', cutoff).get(),
            db.collection('categoryGenResults').where('timestamp', '<', cutoff).get(),
            db.collection('categoryGenResults').where('expiresAt', '<', admin.firestore.Timestamp.now()).get(),
        ]);
        const batch = db.batch();
        reqSnap.forEach((d) => batch.delete(d.ref));
        resSnap.forEach((d) => batch.delete(d.ref));
        resExpSnap.forEach((d) => batch.delete(d.ref));
        await batch.commit();
    }
    catch (e) {
        console.error('cleanupOldCategoryGenDocs error', e);
    }
});
// Admin-only backfill to add schemaVersion to existing configs
exports.backfillSchemaVersion = (0, https_1.onCall)({
    region: 'us-central1'
}, async (request) => {
    var _a, _b;
    const uid = (_a = request.auth) === null || _a === void 0 ? void 0 : _a.uid;
    if (!uid) {
        throw new functions.https.HttpsError('unauthenticated', 'Auth required');
    }
    const userDoc = await admin.firestore().collection('users').doc(uid).get();
    const role = userDoc.exists ? userDoc.data().role : undefined;
    if (role !== 'admin') {
        throw new functions.https.HttpsError('permission-denied', 'Admin only');
    }
    const db = admin.firestore();
    const collections = ['userGameConfigs', 'blankGameTemplates'];
    let updated = 0;
    for (const col of collections) {
        const snap = await db.collection(col).get();
        const batch = db.batch();
        snap.forEach((doc) => {
            const data = doc.data();
            if (!('schemaVersion' in data)) {
                batch.update(doc.ref, { schemaVersion: 'v1', updatedAt: admin.firestore.FieldValue.serverTimestamp() });
                updated++;
            }
        });
        if (((_b = batch._ops) === null || _b === void 0 ? void 0 : _b.length) || updated > 0) {
            await batch.commit();
        }
    }
    return { success: true, updated };
});
//# sourceMappingURL=index.js.map