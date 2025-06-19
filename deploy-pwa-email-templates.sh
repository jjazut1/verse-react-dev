#!/bin/bash

# Deploy PWA-Enhanced Email Templates Script
# Step 2: Deploy PWA-Aware Email Templates

echo "🚀 Deploying PWA-Enhanced Email Templates to Firebase Functions..."
echo "================================================="

# Check if we're in the correct directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Please run this script from the project root directory"
    exit 1
fi

# Check Firebase CLI
if ! command -v firebase &> /dev/null; then
    echo "❌ Error: Firebase CLI not found. Please install it first:"
    echo "npm install -g firebase-tools"
    exit 1
fi

# Compile TypeScript in functions-gen2
echo "📦 Compiling TypeScript functions..."
cd functions-gen2
npm run build
if [ $? -ne 0 ]; then
    echo "❌ Error: TypeScript compilation failed"
    exit 1
fi
cd ..

# Deploy Firebase Functions with the new PWA email templates
echo "🔥 Deploying Firebase Functions with PWA email templates..."
firebase deploy --only functions:sendAssignmentEmail,functions:sendEmailLinkWithAssignment,functions:sendPasswordSetupEmail

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ PWA-Enhanced Email Templates Successfully Deployed!"
    echo "================================================="
    echo ""
    echo "📱 New Features Deployed:"
    echo "  • PWA installation prompts in assignment emails"
    echo "  • Enhanced email templates with installation guidance"
    echo "  • Smart deep linking for PWA and browser access"
    echo "  • Platform-specific installation instructions"
    echo "  • Student Dashboard PWA integration"
    echo ""
    echo "🔗 Email Link Features:"
    echo "  • Assignment links with PWA parameter support"
    echo "  • Student Portal links: /student?pwa=install"
    echo "  • Automatic PWA prompt from email clicks"
    echo ""
    echo "🧪 Test the deployment:"
    echo "  1. Create a new assignment as a teacher"
    echo "  2. Check that the student receives the enhanced PWA-aware email"
    echo "  3. Click the 'Install Lumino Learning App' link from email"
    echo "  4. Verify PWA installation prompt appears"
    echo "  5. Test assignment access from both PWA and browser"
    echo ""
    echo "📊 Monitor deployment:"
    echo "  • Check Firebase Console for function logs"
    echo "  • Verify SendGrid email delivery"
    echo "  • Test PWA installation flow end-to-end"
    echo ""
else
    echo "❌ Deployment failed. Check the error messages above."
    echo ""
    echo "🔧 Troubleshooting steps:"
    echo "  1. Check Firebase authentication: firebase login"
    echo "  2. Verify project selection: firebase use --list"
    echo "  3. Check functions-gen2/src/emailTemplates.ts exists"
    echo "  4. Ensure TypeScript compiles without errors"
    echo "  5. Check SendGrid API key is configured"
    exit 1
fi

echo "🎉 PWA Email Template Enhancement Complete!"
echo "Students will now receive PWA-ready assignment emails with installation guidance." 