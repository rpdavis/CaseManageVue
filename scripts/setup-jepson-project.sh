#!/bin/bash

# Setup script to replicate casemangervue configuration for casemanagevue-jepson-prod
echo "🚀 Setting up Jepson project to match original CaseManageVue configuration..."

# Set the new project
gcloud config set project casemanagevue-jepson-prod

echo "📋 Enabling APIs from original project..."

# Core Firebase APIs
gcloud services enable firebase.googleapis.com
gcloud services enable firebasehosting.googleapis.com
gcloud services enable firestore.googleapis.com
gcloud services enable firebasestorage.googleapis.com
gcloud services enable cloudfunctions.googleapis.com
gcloud services enable firebaserules.googleapis.com
gcloud services enable identitytoolkit.googleapis.com
gcloud services enable securetoken.googleapis.com

# Google Workspace APIs (for your integrations)
gcloud services enable sheets.googleapis.com
gcloud services enable drive.googleapis.com
gcloud services enable gmail.googleapis.com
gcloud services enable docs.googleapis.com
gcloud services enable forms.googleapis.com

# Cloud infrastructure
gcloud services enable cloudresourcemanager.googleapis.com
gcloud services enable iam.googleapis.com
gcloud services enable iamcredentials.googleapis.com
gcloud services enable storage.googleapis.com
gcloud services enable pubsub.googleapis.com
gcloud services enable logging.googleapis.com
gcloud services enable monitoring.googleapis.com

# Build and deployment
gcloud services enable cloudbuild.googleapis.com
gcloud services enable run.googleapis.com
gcloud services enable eventarc.googleapis.com

echo "🔑 Creating service accounts..."

# Create main service account (matches your casemanagevue@casemangervue pattern)
gcloud iam service-accounts create casemanagevue-jepson \
  --display-name="CaseManageVue Jepson" \
  --description="Main service account for CaseManageVue Jepson"

echo "✅ Project setup complete!"
echo "🔗 Next steps:"
echo "1. Go to Firebase Console: https://console.firebase.google.com/project/casemanagevue-jepson-prod"
echo "2. Enable Authentication, Firestore, Functions, Hosting, Storage"
echo "3. Configure OAuth consent screen in Google Cloud Console"
echo "4. Get the Firebase config values and update src/firebase.js"






