import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { doc, updateDoc } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { auth, db } from '../../../config/firebaseConfig';
import { useAuth } from '../../../context/AuthContext';
import {
    changePassword,
    logout,
} from '../../../services/authService';

const DEFAULT_AVATAR = 'https://i.pravatar.cc/150?img=10';


export default function SettingsScreen() {
  const router = useRouter();
  const { user, userProfile, loading: authLoading } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [updateLoading, setUpdateLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      console.log('[SETTINGS_PAGE] No user detected, redirecting to login');
      router.replace('/auth/login');
    }
  }, [authLoading, router, user]);

  useEffect(() => {
    if (user && userProfile) {
      setName(userProfile.name);
      setEmail(userProfile.email);
      if (userProfile.avatarURL) {
        setSelectedImage(userProfile.avatarURL);
      }
    }
  }, [user, userProfile]);

  if (authLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  if (!user) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Not logged in</Text>
        <TouchableOpacity
          style={styles.button}
          onPress={() => router.replace('/auth/login')}
        >
          <Text style={styles.buttonText}>Go to Login</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const handlePickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('需要相本權限才能換頭像！');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.2,
        base64: true,
      });

      if (!result.canceled && result.assets[0]) {
        const base64Image = `data:image/jpeg;base64,${result.assets[0].base64}`;
        setSelectedImage(base64Image);
      }
    } catch (error: any) {
      Alert.alert('Error', 'Failed to pick image');
      console.error('[SETTINGS_PAGE] pick image failed:', error?.message || error);
    }
  };

  const handleUpdateProfile = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Name cannot be empty');
      return;
    }

    if (!auth.currentUser) {
      Alert.alert('Error', 'User is not authenticated');
      return;
    }

    setUpdateLoading(true);
    try {
      const uid = auth.currentUser.uid;
      const userRef = doc(db, 'users', uid);

      await updateDoc(userRef, {
        name: name.trim(),
        avatarURL: selectedImage || '',
      });

      Alert.alert('Success', '個人頭像已成功儲存至雲端資料庫！');
    } catch (error: any) {
      Alert.alert('儲存失敗: ' + (error.message || String(error)));
    } finally {
      setUpdateLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (!oldPassword || !newPassword || !confirmNewPassword) {
      Alert.alert('Error', 'Please fill in all password fields');
      return;
    }

    if (newPassword !== confirmNewPassword) {
      Alert.alert('Error', 'New passwords do not match');
      return;
    }

    if (newPassword.length < 6) {
      Alert.alert('Error', 'New password must be at least 6 characters');
      return;
    }

    setPasswordLoading(true);
    try {
      await changePassword(oldPassword, newPassword);
      Alert.alert('Success', 'Password changed successfully!');
      setOldPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setPasswordLoading(false);
    }
  };

  const confirmLogout = async () => {
    if (typeof window !== 'undefined' && typeof window.confirm === 'function') {
      return window.confirm('Are you sure you want to logout?');
    }

    return new Promise<boolean>((resolve) => {
      Alert.alert(
        'Logout',
        'Are you sure you want to logout?',
        [
          {
            text: 'Cancel',
            style: 'cancel',
            onPress: () => resolve(false),
          },
          {
            text: 'Logout',
            style: 'destructive',
            onPress: () => resolve(true),
          },
        ],
        { cancelable: true }
      );
    });
  };

  const handleLogout = async () => {
    const confirmed = await confirmLogout();
    if (!confirmed) return;

    try {
      console.log('[SETTINGS_PAGE] Logging out...');
      await logout();
      console.log('[SETTINGS_PAGE] Logout successful, redirecting to login');
      router.replace('/auth/login');
    } catch (error: any) {
      console.error('[SETTINGS_PAGE] Logout error caught:', error);
      const message = error?.message || 'Logout failed';
      Alert.alert('Logout Failed', message);
      if (typeof window !== 'undefined' && typeof window.alert === 'function') {
        window.alert('登出失敗原因: ' + message);
      }
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.content}>
          <Text style={styles.title}>Account Settings</Text>

          {/* Profile Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Profile</Text>

            <TouchableOpacity style={styles.avatarPicker} onPress={handlePickImage} disabled={updateLoading}>
              {selectedImage ? (
                <Image source={{ uri: selectedImage }} style={styles.avatar} resizeMode="cover" />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Text style={styles.avatarPlaceholderText}>📷</Text>
                </View>
              )}
            </TouchableOpacity>

            <TextInput
              style={styles.input}
              placeholder="Full Name"
              value={name}
              onChangeText={setName}
              editable={!updateLoading}
            />

            <TextInput
              style={[styles.input, styles.disabledInput]}
              placeholder="Email"
              value={email}
              editable={false}
            />

            <TouchableOpacity
              style={[styles.button, updateLoading && styles.buttonDisabled]}
              onPress={handleUpdateProfile}
              disabled={updateLoading}
            >
              <Text style={styles.buttonText}>
                {updateLoading ? 'Updating...' : 'Update Profile'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Password Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Change Password</Text>

            <TextInput
              style={styles.input}
              placeholder="Current Password"
              value={oldPassword}
              onChangeText={setOldPassword}
              secureTextEntry
              editable={!passwordLoading}
            />

            <TextInput
              style={styles.input}
              placeholder="New Password"
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry
              editable={!passwordLoading}
            />

            <TextInput
              style={styles.input}
              placeholder="Confirm New Password"
              value={confirmNewPassword}
              onChangeText={setConfirmNewPassword}
              secureTextEntry
              editable={!passwordLoading}
            />

            <TouchableOpacity
              style={[styles.button, passwordLoading && styles.buttonDisabled]}
              onPress={handleChangePassword}
              disabled={passwordLoading}
            >
              <Text style={styles.buttonText}>
                {passwordLoading ? 'Changing...' : 'Change Password'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Logout Section */}
          <View style={styles.section}>
            <TouchableOpacity
              style={[styles.button, styles.logoutButton]}
              onPress={handleLogout}
            >
              <Text style={styles.logoutButtonText}>Logout</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 20,
  },
  content: {
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#333',
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 15,
    color: '#333',
  },
  avatarPicker: {
    alignItems: 'center',
    marginBottom: 15,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  avatarPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarPlaceholderText: {
    fontSize: 48,
  },
  input: {
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    fontSize: 14,
  },
  disabledInput: {
    backgroundColor: '#f0f0f0',
    color: '#999',
  },
  button: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 5,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  logoutButton: {
    backgroundColor: '#FF3B30',
  },
  logoutButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  errorText: {
    fontSize: 18,
    color: '#FF3B30',
    marginBottom: 20,
    textAlign: 'center',
  },
});

