#!/bin/bash

echo "🔧 Firebase User Role Update Script"
echo "=================================="
echo ""

# Check if Node.js is available
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
fi

# Check if firebase-admin is installed
if ! node -e "require('firebase-admin')" 2>/dev/null; then
    echo "📦 Installing firebase-admin..."
    npm install firebase-admin
fi

echo "🔐 Make sure you're authenticated with Firebase:"
echo "   Option 1: Use gcloud CLI: gcloud auth application-default login"
echo "   Option 2: Set GOOGLE_APPLICATION_CREDENTIALS to your service account key file"
echo ""

read -p "Press Enter to continue when you're authenticated..."
echo ""

# Ask which project to use
echo "🎯 Which Firebase project do you want to update?"
echo "   1) verse-dev-central (development)"
echo "   2) verse-11f2d (production)"
echo ""
read -p "Choose (1 or 2): " project_choice

if [ "$project_choice" = "2" ]; then
    echo "📝 Updating script to use production project..."
    sed -i.bak 's/verse-dev-central/verse-11f2d/g' update-user-role.cjs
fi

echo ""
echo "🚀 Running the update script..."
echo ""

node update-user-role.cjs

# Restore the original if we modified it
if [ "$project_choice" = "2" ] && [ -f "update-user-role.cjs.bak" ]; then
    mv update-user-role.cjs.bak update-user-role.cjs
fi

echo ""
echo "✨ Script completed!"
echo ""
echo "⚠️  IMPORTANT: Monitor the Firebase Console to see if the Auth record gets deleted."
echo "   This is related to the issue you mentioned where changing roles causes Auth deletion." 