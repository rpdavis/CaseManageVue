# CaseManageVue - Jepson Production Environment

This is a production-only deployment of the CaseManageVue application, configured specifically for the **casemanage-jepson-prod** Firebase project.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- Firebase CLI installed globally: `npm install -g firebase-tools`
- Access to the `casemanagevue-jepson` Firebase project

### Setup

1. **Install dependencies:**
   ```bash
   npm install --legacy-peer-deps
   ```

2. **Configure Firebase:**
   - Update `src/firebase.js` with your Jepson Firebase project configuration values
   - Get these values from: [Firebase Console](https://console.firebase.google.com/) > casemanage-jepson-prod > Project Settings > General > Your apps

3. **Login to Firebase:**
   ```bash
   firebase login
   ```

4. **Deploy to production:**
   ```bash
   npm run deploy
   ```

## 🔧 Available Scripts

- `npm run build` - Build for production
- `npm run deploy` - Build and deploy everything to Firebase
- `npm run deploy:hosting` - Deploy only hosting (faster for frontend changes)
- `npm run deploy:functions` - Deploy only Cloud Functions
- `npm run preview` - Preview the built app locally

## 📋 Configuration Checklist

- [ ] Update Firebase config values in `src/firebase.js`
- [ ] Verify `.firebaserc` points to `casemanage-jepson-prod`
- [ ] Test deployment with `npm run deploy`
- [ ] Configure users in Firebase Auth console
- [ ] Set up Firestore security rules if needed
- [ ] Configure storage permissions

## 🌐 Production URLs

- **Web App:** https://casemanage-jepson-prod.web.app
- **Firebase Console:** https://console.firebase.google.com/project/casemanage-jepson-prod

## 🔒 Security

This is a production-only environment with:
- No emulator configurations
- No development test users
- No debugging components
- Production-only Firebase configuration
- Secure authentication and authorization

## 📁 Key Files

- `src/firebase.js` - Firebase configuration (UPDATE REQUIRED)
- `.firebaserc` - Firebase project reference
- `firebase.json` - Firebase hosting/functions configuration
- `firestore.rules` - Database security rules
- `storage.rules` - Storage security rules

## 🆘 Support

For technical support or deployment issues, contact the development team.

---

**Note:** This is a clean production deployment. For development work, use the main CaseManageVue project with emulator support.