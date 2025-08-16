import { ref, uploadString, getDownloadURL } from 'firebase/storage'
import { doc, setDoc, getDoc, collection, query, where, getDocs, serverTimestamp, orderBy } from 'firebase/firestore'
import { storage, db, auth } from '@/firebase'
import { v4 as uuidv4 } from 'uuid'
import CryptoJS from 'crypto-js'

class SecurePdfHandler {
  constructor() {
    // In production, this key should come from environment variables
    this.encryptionKey = import.meta.env.VITE_PDF_ENCRYPTION_KEY || 'your-dev-key-here';
  }

  async encryptAndUploadPdf(file, studentId) {
    try {
      console.log('🔒 Starting PDF encryption for student:', studentId);
      console.log('📁 File details:', { name: file.name, size: file.size, type: file.type });
      
      // Check if encryption key is available
      if (!this.encryptionKey || this.encryptionKey === 'your-dev-key-here') {
        console.warn('⚠️ Using default encryption key - set VITE_PDF_ENCRYPTION_KEY in production');
      }
      
      // Check if user is authenticated
      if (!auth.currentUser) {
        throw new Error('User not authenticated');
      }
      
      console.log('👤 Current user:', auth.currentUser.uid);
      
      // Check if student exists and user has access
      if (studentId) {
        console.log('🔍 Checking student access for:', studentId);
        try {
          const studentDoc = await getDoc(doc(db, 'students', studentId));
          if (!studentDoc.exists()) {
            throw new Error(`Student ${studentId} not found`);
          }
          console.log('✅ Student document exists');
        } catch (error) {
          console.error('❌ Student access check failed:', error);
          throw new Error(`Student access check failed: ${error.message}`);
        }
      }
      
      // Read PDF as ArrayBuffer
      console.log('📖 Reading file as ArrayBuffer...');
      const arrayBuffer = await file.arrayBuffer();
      console.log('✅ ArrayBuffer read, size:', arrayBuffer.byteLength);
      
      // Convert to Base64 for encryption
      console.log('🔄 Converting to Base64...');
      const base64 = btoa(
        new Uint8Array(arrayBuffer)
          .reduce((data, byte) => data + String.fromCharCode(byte), '')
      );
      console.log('✅ Base64 conversion complete, length:', base64.length);
      
      // Encrypt the PDF content
      console.log('🔐 Encrypting content...');
      const encrypted = CryptoJS.AES.encrypt(base64, this.encryptionKey).toString();
      console.log('✅ Encryption complete, length:', encrypted.length);
      
      // Generate a unique filename
      const secureFileName = `${uuidv4()}.enc`;
      console.log('📝 Generated filename:', secureFileName);
      
      // Upload encrypted content
      console.log('📤 Uploading to storage...');
      const storageRef = ref(storage, `students/${studentId}/${secureFileName}`);
      console.log('📍 Storage path:', `students/${studentId}/${secureFileName}`);
      
      await uploadString(storageRef, encrypted);
      console.log('✅ Upload to storage successful');
      
      // Store metadata in Firestore
      console.log('💾 Storing metadata in Firestore...');
      await setDoc(doc(db, 'pdfMetadata', secureFileName), {
        originalName: file.name,
        studentId: studentId,
        uploadedBy: auth.currentUser.uid,
        uploadedAt: serverTimestamp(),
        accessCount: 0,
        lastAccessed: null,
        encryptionVersion: '1.0',
        fileSize: file.size,
        mimeType: file.type
      });
      console.log('✅ Metadata stored successfully');

      return secureFileName;
    } catch (error) {
      console.error('❌ PDF encryption failed:', error);
      console.error('❌ Error details:', {
        message: error.message,
        code: error.code,
        stack: error.stack
      });
      throw new Error(`Failed to securely store PDF: ${error.message}`);
    }
  }

  async downloadAndDecryptPdf(secureFileName, studentId) {
    try {
      console.log('🔒 Starting secure PDF download process...')
      
      // Check access permissions
      console.log('🔍 Verifying user access permissions...')
      const userHasAccess = await this.verifyAccess(studentId);
      if (!userHasAccess) {
        throw new Error('Access denied');
      }
      console.log('✅ Access permissions verified')

      // Use HTTP streaming function (v1.1.6 approach - more secure, no CORS issues)
      console.log('🔑 Getting authentication token...')
      const { auth } = await import('@/firebase');
      const idToken = await auth.currentUser.getIdToken();
      
      // Use the HTTP streaming function instead of signed URLs
      const streamingUrl = `https://downloadstudentfile-zxuytv4xtq-uc.a.run.app/downloadStudentFile?studentId=${studentId}&fileName=${secureFileName}`;
      
      console.log('🌐 Downloading encrypted file via secure streaming...')
      
      const response = await fetch(streamingUrl, {
        headers: {
          'Authorization': `Bearer ${idToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch file: ${response.status} ${response.statusText}`);
      }
      
      const encrypted = await response.text();
      console.log('✅ Downloaded encrypted content, size:', encrypted.length, 'characters')

      // Decrypt content
      console.log('🔓 Decrypting PDF content...')
      const decrypted = CryptoJS.AES.decrypt(encrypted, this.encryptionKey).toString(CryptoJS.enc.Utf8);
      
      // Convert back to PDF
      console.log('📄 Converting to PDF format...')
      const pdfContent = atob(decrypted);
      
      // Create Blob for download
      const pdfBlob = new Blob(
        [new Uint8Array(pdfContent.split('').map(char => char.charCodeAt(0)))],
        { type: 'application/pdf' }
      );

      console.log('✅ PDF ready for viewing, size:', pdfBlob.size, 'bytes')
      return pdfBlob;

    } catch (error) {
      console.error('❌ Error in downloadAndDecryptPdf:', error);
      throw new Error(`PDF download failed: ${error.message}`);
    }
  }

  async verifyAccess(studentId) {
    try {
      const user = auth.currentUser;
      if (!user) return false;

      const userDoc = await getDoc(doc(db, 'users', user.uid));
      const userData = userDoc.data();

      // Check admin role access - all admin roles can access all documents
      if (['admin', 'school_admin', 'administrator', 'sped_chair', 'admin_504'].includes(userData.role)) {
        return true;
      }

      // Check staff view/edit roles - can access all documents (especially At-A-Glance)
      if (['staff_view', 'staff_edit'].includes(userData.role)) {
        return true;
      }

      // Check case manager access
      if (userData.role === 'case_manager') {
        const studentDoc = await getDoc(doc(db, 'students', studentId));
        return studentDoc.data()?.app?.studentData?.caseManagerId === user.uid;
      }

      // Check if teacher has this student
      if (userData.role === 'teacher') {
        const studentDoc = await getDoc(doc(db, 'students', studentId));
        const schedule = studentDoc.data()?.app?.schedule?.periods || {};
        return Object.values(schedule).includes(user.uid);
      }

      // Check service provider access
      if (userData.role === 'service_provider') {
        const studentDoc = await getDoc(doc(db, 'students', studentId));
        const staffIds = studentDoc.data()?.app?.staffIds || [];
        return staffIds.includes(user.uid);
      }

      // Check paraeducator access
      if (userData.role === 'paraeducator') {
        const studentDoc = await getDoc(doc(db, 'students', studentId));
        const staffIds = studentDoc.data()?.app?.staffIds || [];
        return staffIds.includes(user.uid);
      }

      return false;
    } catch (error) {
      console.error('Access verification failed:', error);
      return false;
    }
  }

  async logAccess(fileId, studentId) {
    try {
      await setDoc(doc(db, 'pdfAccessLogs', `${fileId}_${Date.now()}`), {
        fileId,
        studentId,
        userId: auth.currentUser.uid,
        userEmail: auth.currentUser.email,
        accessTime: serverTimestamp(),
        userAgent: navigator.userAgent,
        accessType: 'download'
      });
    } catch (error) {
      console.error('Failed to log access:', error);
      // Continue execution even if logging fails
    }
  }

  async updateAccessMetadata(fileId) {
    try {
      const metadataRef = doc(db, 'pdfMetadata', fileId);
      const metadata = await getDoc(metadataRef);
      
      if (metadata.exists()) {
        await setDoc(metadataRef, {
          ...metadata.data(),
          accessCount: (metadata.data().accessCount || 0) + 1,
          lastAccessed: serverTimestamp()
        }, { merge: true });
      }
    } catch (error) {
      console.error('Failed to update access metadata:', error);
    }
  }

  async getFileAccessHistory(fileId) {
    try {
      const q = query(
        collection(db, 'pdfAccessLogs'),
        where('fileId', '==', fileId),
        orderBy('accessTime', 'desc')
      );
      
      const logs = await getDocs(q);
      return logs.docs.map(doc => doc.data());
    } catch (error) {
      console.error('Failed to fetch access history:', error);
      return [];
    }
  }
}

export const securePdfHandler = new SecurePdfHandler(); 