# School Onboarding Guide

This guide explains how to onboard new schools to the CaseManageVue - Jepson Production system.

## 🏫 Single School Onboarding

### Interactive Onboarding
Run the interactive onboarding script:

```bash
npm run onboard:school
```

This will prompt you for:
- School information (ID, name, district, address, etc.)
- Primary administrator details (name, email, password)
- Basic configuration settings

### What Gets Created:
1. **School Record** - Main school document with settings
2. **Admin User** - Primary administrator with full permissions
3. **School Collections** - Settings, audit logs, and message collections
4. **Default Configuration** - Period labels, system settings, theme

## 📊 Batch School Onboarding

### CSV Format
Create a CSV file with the following columns:
```
schoolId,name,district,address,phone,principalEmail,adminName,adminEmail,adminPassword
```

### Example CSV:
```csv
jepson-elem,Jepson Elementary,Jepson USD,123 Main St,(555)123-4567,principal@elem.edu,John Smith,admin@elem.edu,SecurePass123
jepson-middle,Jepson Middle,Jepson USD,456 Oak Ave,(555)234-5678,principal@middle.edu,Jane Doe,admin@middle.edu,SecurePass456
```

### Run Batch Onboarding:
```bash
npm run onboard:batch data/your-schools.csv
```

## 📋 Pre-Onboarding Checklist

### Firebase Setup
- [ ] Ensure you have admin access to `casemanage-jepson-prod` Firebase project
- [ ] Set up Firebase Admin SDK service account
- [ ] Configure environment variables or service account key

### School Information Required
- [ ] Unique school ID (no spaces, lowercase recommended)
- [ ] Official school name
- [ ] District name
- [ ] Physical address
- [ ] Phone number
- [ ] Principal email address

### Administrator Account
- [ ] Admin full name
- [ ] Admin email address (must be unique)
- [ ] Secure password (minimum 6 characters)
- [ ] Admin title/position

## 🔧 Post-Onboarding Steps

After onboarding, each school admin should:

1. **Log in to the system:**
   - Visit: https://casemanage-jepson-prod.web.app
   - Use the admin credentials created during onboarding

2. **Configure school settings:**
   - Update school logo and branding
   - Set period labels and schedules
   - Configure allowed email domains
   - Set session timeout preferences

3. **Add staff users:**
   - Create accounts for teachers, case managers, service providers
   - Assign appropriate roles and permissions
   - Set up user groups and access levels

4. **Import student data:**
   - Use the bulk student importer
   - Configure student services and accommodations
   - Set up case management assignments

5. **Test system functionality:**
   - Verify role-based access controls
   - Test student data visibility
   - Confirm reporting capabilities

## 🔒 Security Considerations

### Password Requirements
- Minimum 6 characters (recommend 12+ for production)
- Include uppercase, lowercase, numbers, and symbols
- Avoid common passwords or school-related terms

### Access Control
- Each school is isolated by `schoolId`
- Administrators can only access their school's data
- Role-based permissions are enforced at the database level

### Data Privacy
- All school data is stored separately
- Audit logs track all user actions
- FERPA compliance is maintained through access controls

## 🚨 Troubleshooting

### Common Issues

**"School ID already exists"**
- Choose a different, unique school ID
- Check existing schools in Firebase Console

**"Email already in use"**
- Admin email must be unique across all schools
- Use school-specific email addresses

**"Permission denied"**
- Ensure Firebase Admin SDK is properly configured
- Check service account permissions

**"Invalid password"**
- Password must be at least 6 characters
- Cannot be empty or contain only spaces

### Getting Help
- Check Firebase Console for detailed error messages
- Review audit logs in Firestore
- Contact technical support with school ID and error details

## 📈 Scaling Considerations

### For Large Districts
- Use batch onboarding for multiple schools
- Consider standardized naming conventions
- Plan for centralized user management
- Set up monitoring and alerting

### Resource Planning
- Each school uses separate Firestore collections
- Plan for storage and bandwidth usage
- Consider Firebase project limits
- Monitor authentication usage

## 📝 Example Onboarding Session

```bash
$ npm run onboard:school

🏫 School Onboarding Script for CaseManageVue
==================================================

📋 School Information:
School ID (unique identifier): lincoln-elementary
School Name: Lincoln Elementary School
District Name: Springfield USD
School Address: 100 School Lane, Springfield, CA 95123
School Phone: (555) 123-4567
Principal Email: principal@lincoln-elem.edu
Timezone (default: America/Los_Angeles): 
School Year (default: 2024-2025): 

👤 Primary Administrator:
Admin Full Name: Sarah Johnson
Admin Email: admin@lincoln-elem.edu
Admin Password (min 6 chars): [hidden]
Admin Title (default: Administrator): School Administrator
Admin Phone (optional): (555) 123-4568

🚀 Starting school onboarding...
📝 Creating school record...
✅ School record created: Lincoln Elementary School
👤 Creating admin user...
✅ Created admin user: admin@lincoln-elem.edu
🗂️  Setting up school collections...
✅ Created school collections for: lincoln-elementary

🎉 School onboarding completed successfully!
==================================================
School ID: lincoln-elementary
School Name: Lincoln Elementary School
Admin User: admin@lincoln-elem.edu
Web App: https://casemanage-jepson-prod.web.app
```