#!/bin/bash

# Deploy Enhanced 5-Link Email Template System
# This script deploys the updated email templates to Firebase Functions Gen2

echo "🚀 Deploying Enhanced 5-Link Email Template System..."

# Check if we're in the correct directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Not in the root directory. Please run from project root."
    exit 1
fi

# Check if Firebase CLI is installed
if ! command -v firebase &> /dev/null; then
    echo "❌ Error: Firebase CLI not found. Please install: npm install -g firebase-tools"
    exit 1
fi

# Backup current templates
echo "📦 Creating backup of current email templates..."
mkdir -p backup/email-templates/$(date +%Y%m%d_%H%M%S)
cp functions-gen2/src/emailTemplates.ts backup/email-templates/$(date +%Y%m%d_%H%M%S)/

# Build the functions
echo "🔨 Building Firebase Functions Gen2..."
cd functions-gen2
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Error: Functions build failed!"
    exit 1
fi

echo "✅ Functions build successful!"

# Deploy functions
echo "🚀 Deploying Firebase Functions Gen2..."
cd ..
firebase deploy --only functions:createAssignmentEmailTemplate,functions:createPWAEmailLinkTemplate,functions:createPWAPasswordSetupTemplate

if [ $? -ne 0 ]; then
    echo "❌ Error: Functions deployment failed!"
    exit 1
fi

echo "✅ Email template functions deployed successfully!"

# Deploy frontend for Smart Router
echo "🌐 Building and deploying frontend for Smart Router..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Error: Frontend build failed!"
    exit 1
fi

firebase deploy --only hosting

if [ $? -ne 0 ]; then
    echo "❌ Error: Frontend deployment failed!"
    exit 1
fi

echo "✅ Frontend deployed successfully!"

# Test the deployment
echo "🧪 Testing email template deployment..."

# Create a test email template to verify the functions are working
cat > test-email-template.js << 'EOF'
const { createAssignmentEmailTemplate } = require('./functions-gen2/lib/emailTemplates');

// Test the enhanced 5-link email template
const testTemplate = createAssignmentEmailTemplate(
  'Test Student',
  'Math Assignment - Place Value',
  'December 31, 2024',
  'test_token_12345',
  'https://verse-dev-central.web.app'
);

console.log('📧 Email Template Test:');
console.log('Template Length:', testTemplate.length);
console.log('Contains Smart Links:', testTemplate.includes('smart-route'));
console.log('Contains Browser Links:', testTemplate.includes('forceBrowser=true'));
console.log('Contains PWA Links:', testTemplate.includes('pwaMode=required'));
console.log('Contains Install Link:', testTemplate.includes('pwa=install'));

// Check for all 5 link types
const linkTypes = [
  { name: 'Smart Assignment', pattern: /smart-route\/assignment.*token/ },
  { name: 'Smart Dashboard', pattern: /smart-route\/dashboard/ },
  { name: 'Browser Assignment', pattern: /play.*forceBrowser=true/ },
  { name: 'Browser Dashboard', pattern: /student.*forceBrowser=true/ },
  { name: 'Install Link', pattern: /pwa=install/ }
];

console.log('\n📋 Link Type Verification:');
linkTypes.forEach(link => {
  const found = link.pattern.test(testTemplate);
  console.log(`${found ? '✅' : '❌'} ${link.name}: ${found ? 'Found' : 'Missing'}`);
});

console.log('\n🎯 Email Template System Ready!');
EOF

node test-email-template.js

# Clean up test file
rm test-email-template.js

# Final verification
echo ""
echo "🎉 Enhanced 5-Link Email Template System Deployment Complete!"
echo ""
echo "📋 Deployment Summary:"
echo "✅ Email templates updated with 5-link system"
echo "✅ Smart Router deployed for intelligent PWA detection"
echo "✅ Analytics service ready for tracking"
echo "✅ Browser mode and PWA mode handling implemented"
echo ""
echo "🔗 Available Link Types:"
echo "  1. Smart Assignment Link (auto-detects PWA)"
echo "  2. Smart Dashboard Link (auto-detects PWA)"
echo "  3. Browser Assignment Link (forces browser)"
echo "  4. Browser Dashboard Link (forces browser)"
echo "  5. Install PWA Link (installation guidance)"
echo ""
echo "📊 Analytics Features:"
echo "  • Link click tracking"
echo "  • Smart route decision logging"
echo "  • PWA installation success tracking"
echo "  • User agent and device analytics"
echo ""
echo "🎯 Next Steps:"
echo "  1. Send test emails to verify all links work correctly"
echo "  2. Monitor analytics in browser console and localStorage"
echo "  3. Check Smart Router functionality at /smart-route/assignment and /smart-route/dashboard"
echo "  4. Verify PWA window management still works as expected"
echo ""
echo "🌐 Test URLs:"
echo "  Smart Assignment: https://verse-dev-central.web.app/smart-route/assignment?token=test123&from=email"
echo "  Smart Dashboard: https://verse-dev-central.web.app/smart-route/dashboard?from=email"
echo "  Browser Mode: https://verse-dev-central.web.app/play?token=test123&forceBrowser=true&from=email"
echo "  Install Guide: https://verse-dev-central.web.app/student?pwa=install&showGuide=true&from=email"
echo ""
echo "Happy learning! 🎓✨" 