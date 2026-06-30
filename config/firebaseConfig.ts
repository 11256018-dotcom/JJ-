import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApp, getApps, initializeApp } from 'firebase/app';
import { browserLocalPersistence, getReactNativePersistence, initializeAuth } from 'firebase/auth';
import { initializeFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { Platform } from 'react-native';

// 直接使用實體字串，確保 Web 端絕對讀得到
const firebaseConfig = {
  apiKey: 'AIzaSyBM2W1-hnRvxE8YEgPxQjBBh7Ez13m-RFA',
  authDomain: 'project-8083233281877689188.firebaseapp.com',
  projectId: 'project-8083233281877689188',
  storageBucket: 'project-8083233281877689188.firebasestorage.app',
  messagingSenderId: '414499154424',
  appId: '1:414499154424:web:159cfd93bd42e2f5298e0d',
  measurementId: 'G-EYSTPCPVJT',
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

let auth;
if (Platform.OS === 'web') {
  auth = initializeAuth(app, { persistence: browserLocalPersistence });
} else {
  auth = initializeAuth(app, { persistence: getReactNativePersistence(AsyncStorage) });
}

const db = initializeFirestore(app, { experimentalForceLongPolling: true });
const storage = getStorage(app);

export { app, auth, db, storage };
