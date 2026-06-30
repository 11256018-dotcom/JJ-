import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
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
import { registerWithEmail } from '../../services/authService';

export default function RegisterScreen() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled) {
        setAvatarUri(result.assets[0].uri);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const handleRegister = async () => {
    console.log('[REGISTER_PAGE] handleRegister called');
    console.log('[REGISTER_PAGE] Form data - Name:', name, 'Email:', email, 'Password length:', password.length);

    // Validation
    console.log('[REGISTER_PAGE] Starting validation...');
    
    if (!name.trim()) {
      console.log('[REGISTER_PAGE] Validation failed: Empty name');
      Alert.alert('Error', 'Please enter your name');
      return;
    }

    if (!email.trim()) {
      console.log('[REGISTER_PAGE] Validation failed: Empty email');
      Alert.alert('Error', 'Please enter your email');
      return;
    }

    if (!password) {
      console.log('[REGISTER_PAGE] Validation failed: Empty password');
      Alert.alert('Error', 'Please enter your password');
      return;
    }

    if (!confirmPassword) {
      console.log('[REGISTER_PAGE] Validation failed: Empty confirm password');
      Alert.alert('Error', 'Please confirm your password');
      return;
    }

    if (password !== confirmPassword) {
      console.log('[REGISTER_PAGE] Validation failed: Passwords do not match');
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    if (password.length < 6) {
      console.log('[REGISTER_PAGE] Validation failed: Password too short');
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }

    // Email validation (basic)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      console.log('[REGISTER_PAGE] Validation failed: Invalid email format');
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    console.log('[REGISTER_PAGE] All validations passed successfully');
    console.log('[REGISTER_PAGE] Setting loading state to true...');
    setLoading(true);

    try {
      console.log('[REGISTER_PAGE] Calling registerWithEmail with avatar:', avatarUri);
      const result = await registerWithEmail(name, email, password, avatarUri || undefined);
      console.log('[REGISTER_PAGE] registerWithEmail completed successfully, user UID:', result.uid);

      console.log('[REGISTER_PAGE] Registration successful, redirecting to chats...');
      await router.replace('/(tabs)/chats');
      return;
    } catch (error: any) {
      console.error('[REGISTER_PAGE] Registration error caught:', error);
      console.error('[REGISTER_PAGE] Error type:', error?.constructor?.name);
      console.error('[REGISTER_PAGE] Error message:', error?.message);
      
      const errorMessage = error?.message || error?.toString?.() || 'Registration failed. Please try again.';
      console.log('[REGISTER_PAGE] Showing error alert with message:', errorMessage);
      Alert.alert('Registration Failed', errorMessage);
      if (typeof window !== 'undefined' && typeof window.alert === 'function') {
        window.alert('註冊失敗原因: ' + errorMessage);
      }
      setLoading(false);
    } finally {
      console.log('[REGISTER_PAGE] Setting loading state to false');
      setLoading(false);
    }
  };

  const handleBackToLogin = () => {
    router.replace('/auth/login');
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.content}>
          <Text style={styles.title}>Create Account</Text>

          <TouchableOpacity style={styles.avatarPicker} onPress={pickImage} disabled={loading}>
            {avatarUri ? (
              <Image source={{ uri: avatarUri }} style={styles.avatar} resizeMode="cover" />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarPlaceholderText}>+</Text>
              </View>
            )}
          </TouchableOpacity>
          <Text style={styles.avatarLabel}>Tap to select avatar (optional)</Text>

          <TextInput
            style={styles.input}
            placeholder="Full Name"
            value={name}
            onChangeText={setName}
            editable={!loading}
          />

          <TextInput
            style={styles.input}
            placeholder="Email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            editable={!loading}
          />

          <TextInput
            style={styles.input}
            placeholder="Password (min 6 characters)"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            editable={!loading}
          />

          <TextInput
            style={styles.input}
            placeholder="Confirm Password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
            editable={!loading}
          />

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleRegister}
            disabled={loading}
          >
            <Text style={styles.buttonText}>{loading ? 'Creating Account...' : 'Register'}</Text>
          </TouchableOpacity>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Already have an account? </Text>
            <TouchableOpacity onPress={handleBackToLogin} disabled={loading}>
              <Text style={styles.linkText}>Login</Text>
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
    paddingTop: 20,
  },
  content: {
    paddingHorizontal: 20,
    paddingVertical: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 30,
    textAlign: 'center',
    color: '#007AFF',
  },
  avatarPicker: {
    alignItems: 'center',
    marginBottom: 10,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarPlaceholderText: {
    fontSize: 40,
    color: '#999',
  },
  avatarLabel: {
    textAlign: 'center',
    color: '#666',
    fontSize: 12,
    marginBottom: 20,
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 12,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    fontSize: 14,
  },
  button: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
  },
  footerText: {
    color: '#666',
    fontSize: 14,
  },
  linkText: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
});
