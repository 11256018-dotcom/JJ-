import {
    createUserWithEmailAndPassword,
    EmailAuthProvider,
    reauthenticateWithCredential,
    signInWithEmailAndPassword,
    signOut,
    updatePassword,
    updateProfile
} from 'firebase/auth';
import {
    doc,
    getDoc,
    serverTimestamp,
    setDoc,
    updateDoc,
} from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { auth, db, storage } from '../config/firebaseConfig';

export interface UserProfile {
  uid: string;
  email: string;
  emailLower?: string;
  name: string;
  nameLower?: string;
  avatarURL: string;
  friendIds?: string[];
  createdAt: any;
  updatedAt: any;
}

// Helper function: Convert avatar URI to blob with timeout
async function fetchAvatarWithTimeout(uri: string, timeoutMs: number = 10000): Promise<Blob | null> {
  console.log('[AVATAR_FETCH] Starting avatar fetch from:', uri);
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      console.log('[AVATAR_FETCH] Timeout triggered, aborting fetch');
      controller.abort();
    }, timeoutMs);

    console.log('[AVATAR_FETCH] Sending fetch request...');
    const response = await fetch(uri, { signal: controller.signal });
    clearTimeout(timeoutId);

    console.log('[AVATAR_FETCH] Response status:', response.status);
    if (!response.ok) {
      console.warn(`[AVATAR_FETCH] Avatar fetch failed with status ${response.status}`);
      return null;
    }

    console.log('[AVATAR_FETCH] Converting response to blob...');
    const blob = await response.blob();
    console.log('[AVATAR_FETCH] Avatar blob created successfully, size:', blob.size);
    return blob;
  } catch (error: any) {
    console.warn('[AVATAR_FETCH] Avatar fetch error:', error?.message);
    return null;
  }
}

async function setDocWithTimeout(docRef: any, data: any, timeoutMs: number = 15000) {
  console.log('[FIRESTORE] Writing document with timeout', timeoutMs, 'ms');
  return Promise.race([
    setDoc(docRef, data),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Firestore write timeout')), timeoutMs)
    ),
  ]);
}

// Register: create auth user + create users doc
export async function registerWithEmail(
  name: string,
  email: string,
  password: string,
  avatarUri?: string
) {
  console.log('[REGISTER] Starting registration for:', email);

  try {
    // Step 1: Validate inputs
    console.log('[REGISTER] Validating inputs...');
    if (!name || !name.trim()) {
      throw new Error('Name is required');
    }
    if (!email || !email.trim()) {
      throw new Error('Email is required');
    }
    if (!password) {
      throw new Error('Password is required');
    }
    console.log('[REGISTER] Input validation passed');

    // Step 2: Create auth user
    console.log('[REGISTER] Creating Firebase Auth user...');
    let userCred;
    try {
      userCred = await createUserWithEmailAndPassword(auth, email, password);
      const uid = userCred.user.uid;
      console.log('[REGISTER] Auth user created successfully, UID:', uid);
    } catch (authError: any) {
      console.error('[REGISTER] Auth creation failed:', authError?.code, authError?.message);
      
      // Handle specific Firebase auth errors
      if (authError?.code === 'auth/email-already-in-use') {
        throw new Error('This email is already registered');
      } else if (authError?.code === 'auth/invalid-email') {
        throw new Error('Invalid email format');
      } else if (authError?.code === 'auth/weak-password') {
        throw new Error('Password is too weak (minimum 6 characters)');
      } else {
        throw new Error(authError?.message || 'Failed to create account');
      }
    }

    const uid = userCred.user.uid;
    let avatarURL = '';

    // Step 3: Upload avatar (optional, non-blocking)
    if (avatarUri) {
      console.log('[REGISTER] Avatar URI provided:', avatarUri);
      console.log('[REGISTER] Attempting avatar upload...');
      try {
        const blob = await fetchAvatarWithTimeout(avatarUri, 10000);

        if (blob) {
          console.log('[REGISTER] Avatar blob obtained successfully, uploading to storage...');
          try {
            const avatarRef = ref(storage, `avatars/${uid}/${Date.now()}.jpg`);
            console.log('[REGISTER] Uploading blob to Firebase Storage...');
            await uploadBytes(avatarRef, blob);
            console.log('[REGISTER] Avatar uploaded to storage');

            console.log('[REGISTER] Getting download URL...');
            avatarURL = await getDownloadURL(avatarRef);
            console.log('[REGISTER] Avatar download URL obtained:', avatarURL);

            console.log('[REGISTER] Updating user profile with avatar...');
            await updateProfile(userCred.user, { displayName: name, photoURL: avatarURL });
            console.log('[REGISTER] User profile updated with avatar');
          } catch (storageError: any) {
            console.error('[REGISTER] Storage operation failed:', storageError?.message);
            // Continue without avatar - don't block registration
            console.log('[REGISTER] Continuing without avatar due to storage error');
            await updateProfile(userCred.user, { displayName: name });
          }
        } else {
          console.log('[REGISTER] Avatar blob is null, updating profile without avatar');
          await updateProfile(userCred.user, { displayName: name });
        }
      } catch (avatarError: any) {
        console.error('[REGISTER] Avatar processing failed:', avatarError?.message);
        // Continue without avatar - don't block registration
        console.log('[REGISTER] Continuing without avatar due to fetch error');
        try {
          await updateProfile(userCred.user, { displayName: name });
          console.log('[REGISTER] Profile updated without avatar');
        } catch (profileError: any) {
          console.error('[REGISTER] Failed to update profile:', profileError?.message);
          throw new Error('Failed to update user profile');
        }
      }
    } else {
      console.log('[REGISTER] No avatar provided, updating profile with name only');
      try {
        await updateProfile(userCred.user, { displayName: name });
        console.log('[REGISTER] Profile updated successfully');
      } catch (profileError: any) {
        console.error('[REGISTER] Failed to update profile:', profileError?.message);
        throw new Error('Failed to update user profile');
      }
    }

    // Step 4: Create user document in Firestore
    console.log('[REGISTER] Creating Firestore user document...');
    try {
      const userDoc: UserProfile = {
        uid,
        email,
        emailLower: (email || '').toLowerCase(),
        name,
        nameLower: (name || '').toLowerCase(),
        avatarURL,
        friendIds: [],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      console.log('[REGISTER] Writing user document to Firestore...');
      await setDocWithTimeout(doc(db, 'users', uid), userDoc);
      console.log('[REGISTER] Firestore user document created successfully');
    } catch (firestoreError: any) {
      console.error('[REGISTER] Firestore operation failed:', firestoreError?.message || firestoreError);

      if (firestoreError?.code === 'permission-denied') {
        throw new Error('Firestore permission denied. Please check Firestore rules and ensure your auth user is allowed to write to /users/{uid}.');
      }
      throw new Error(firestoreError?.message || 'Failed to create user profile in database');
    }

    console.log('[REGISTER] Registration completed successfully for user:', uid);
    return userCred.user;
  } catch (error: any) {
    console.error('[REGISTER] Registration failed with error:', error?.message || String(error));
    // Re-throw the error so it propagates to the UI
    throw error instanceof Error ? error : new Error(String(error));
  }
}

// Login
export async function loginWithEmail(email: string, password: string) {
  console.log('[LOGIN] loginWithEmail called for:', email);

  try {
    console.log('[LOGIN] Validating inputs...');
    if (!email || !email.trim()) {
      throw new Error('Email is required');
    }
    if (!password) {
      throw new Error('Password is required');
    }
    console.log('[LOGIN] Input validation passed');

    console.log('[LOGIN] Attempting sign in with Firebase Auth...');
    const cred = await signInWithEmailAndPassword(auth, email, password);
    console.log('[LOGIN] Login successful, user UID:', cred.user.uid);
    return cred.user;
  } catch (error: any) {
    console.error('[LOGIN] Login error:', error?.code, error?.message);

    // Provide user-friendly error messages
    let userMessage = 'Login failed';
    if (error?.code === 'auth/user-not-found') {
      userMessage = 'No account found with this email';
      console.log('[LOGIN] Error type: User not found');
    } else if (error?.code === 'auth/wrong-password') {
      userMessage = 'Incorrect password';
      console.log('[LOGIN] Error type: Wrong password');
    } else if (error?.code === 'auth/invalid-email') {
      userMessage = 'Invalid email address';
      console.log('[LOGIN] Error type: Invalid email');
    } else if (error?.code === 'auth/too-many-requests') {
      userMessage = 'Too many failed login attempts. Please try again later.';
      console.log('[LOGIN] Error type: Too many requests');
    } else if (error?.code === 'auth/invalid-credential') {
      userMessage = 'Invalid email or password';
      console.log('[LOGIN] Error type: Invalid credential');
    } else {
      userMessage = error?.message || 'Login failed. Please try again.';
      console.log('[LOGIN] Error type: Other -', userMessage);
    }

    console.error('[LOGIN] Throwing user-friendly error:', userMessage);
    throw new Error(userMessage);
  }
}

// Logout
export async function logout() {
  try {
    await signOut(auth);
    console.log('[AUTH_SERVICE] signOut completed successfully');
  } catch (error: any) {
    console.error('[AUTH_SERVICE] Logout failed:', error);
    throw error instanceof Error ? error : new Error(String(error));
  }
}

// Get current user profile from Firestore
export async function getCurrentUserProfile(): Promise<UserProfile | null> {
  const user = auth.currentUser;
  if (!user) return null;

  try {
    const userDocSnap = await getDoc(doc(db, 'users', user.uid));
    if (userDocSnap.exists()) {
      return userDocSnap.data() as UserProfile;
    }
  } catch (error) {
    console.error('Error fetching user profile:', error);
  }
  return null;
}

// Update display name
export async function updateDisplayName(newName: string) {
  const user = auth.currentUser;
  if (!user) throw new Error('Not authenticated');

  await updateProfile(user, { displayName: newName });
  await updateDoc(doc(db, 'users', user.uid), {
    name: newName,
    updatedAt: serverTimestamp(),
  });
}

// Update avatar (upload + update profile + users doc)
export async function updateAvatar(avatarUri: string) {
  const user = auth.currentUser;
  if (!user) throw new Error('Not authenticated');

  try {
    const response = await fetch(avatarUri);
    const blob = await response.blob();
    const avatarRef = ref(storage, `avatars/${user.uid}/${Date.now()}.jpg`);
    await uploadBytes(avatarRef, blob);
    const avatarURL = await getDownloadURL(avatarRef);

    await updateProfile(user, { photoURL: avatarURL });
    await updateDoc(doc(db, 'users', user.uid), {
      avatarURL,
      updatedAt: serverTimestamp(),
    });

    return avatarURL;
  } catch (error) {
    console.error('Avatar update error:', error);
    throw error;
  }
}

// Update password (requires re-authentication)
export async function changePassword(currentPassword: string, newPassword: string) {
  const user = auth.currentUser;
  if (!user || !user.email) throw new Error('Not authenticated');

  const cred = EmailAuthProvider.credential(user.email, currentPassword);
  await reauthenticateWithCredential(user, cred);
  await updatePassword(user, newPassword);
  await updateDoc(doc(db, 'users', user.uid), {
    updatedAt: serverTimestamp(),
  });
}
