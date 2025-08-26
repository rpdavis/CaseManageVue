<template>
  <div class="login-container">
    <div class="logo-container">
      <img src="@/assets/images/logo.png" alt="CaseManageVue Logo" class="logo" />
      <h1>Case Manager Portal</h1>
    </div>
    <p>Please sign in with your Google account:</p>
    <button @click="handleGoogleLogin" class="primary-btn">
      Sign in with Google
    </button>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router';
import { signInWithPopup } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';

// Import our centralized firebase services
import { auth, db, googleProvider } from '@/firebase';

const router = useRouter();

const handleGoogleLogin = async () => {
  try {
    const { user } = await signInWithPopup(auth, googleProvider);

    // Check if the user exists in Firestore
    const userRef = doc(db, 'users', user.uid);
    const snap = await getDoc(userRef);

    if (!snap.exists()) {
      // First-time sign-in, create a new user document with 'admin' role
      await setDoc(userRef, {
        name: user.displayName || '',
        email: user.email,
        role: 'admin',
      });
    }

    // Redirect to the home view after successful login
    router.push({ name: 'Home' });

  } catch (err) {
    console.error('Login failed:', err);
    alert('Login failed: ' + err.message);
  }
};
</script>

<style scoped>
.login-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100vh;
  text-align: center;
}

.logo-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 1rem;
}

.logo {
  width: 300px;
  height: auto;
  margin-bottom: 0.5rem;
}

.portal-text {
  font-size: 1.5rem;
  font-weight: 600;
  color: #1e40af;
  margin: 0;
  letter-spacing: 0.5px;
}

.primary-btn {
  background-color: #4285f4;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 5px;
  cursor: pointer;
  font-size: 16px;
  margin-top: 1rem;
}

.primary-btn:hover {
  background-color: #357ae8;
}
</style>