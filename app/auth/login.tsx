import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
    Alert,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { loginWithEmail } from '../../services/authService';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async () => {
    console.log('[LOGIN_PAGE] handleLogin called');
    console.log('[LOGIN_PAGE] Form data - Email:', email, 'Password length:', password.length);

    // Validation
    console.log('[LOGIN_PAGE] Starting validation...');
    
    if (!email.trim()) {
      console.log('[LOGIN_PAGE] Validation failed: Empty email');
      Alert.alert('Error', 'Please enter your email');
      return;
    }

    if (!password) {
      console.log('[LOGIN_PAGE] Validation failed: Empty password');
      Alert.alert('Error', 'Please enter your password');
      return;
    }

    // Email validation (basic)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      console.log('[LOGIN_PAGE] Validation failed: Invalid email format');
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    console.log('[LOGIN_PAGE] All validations passed');
    console.log('[LOGIN_PAGE] Setting loading state to true...');
    setLoading(true);

    try {
      console.log('[LOGIN_PAGE] Calling loginWithEmail...');
      const result = await loginWithEmail(email, password);
      console.log('[LOGIN_PAGE] loginWithEmail completed successfully, user UID:', result.uid);

      console.log('[LOGIN_PAGE] Login successful, navigating to chats...');
      router.replace('/(tabs)/chats');
    } catch (error: any) {
      console.error('[LOGIN_PAGE] Login error caught:', error);
      console.error('[LOGIN_PAGE] Error object:', error);
      console.error('[LOGIN_PAGE] Error type:', error?.constructor?.name);
      console.error('[LOGIN_PAGE] Error message:', error?.message);
      
      const errorMessage = error?.message || error?.toString?.() || 'Login failed. Please check your email and password.';
      console.log('[LOGIN_PAGE] Showing error alert with message:', errorMessage);
      Alert.alert('Login Failed', errorMessage);
      if (typeof window !== 'undefined' && typeof window.alert === 'function') {
        window.alert(`Login Failed: ${errorMessage}`);
      }
    } finally {
      console.log('[LOGIN_PAGE] Setting loading state to false');
      setLoading(false);
    }
  };

  const handleRegisterNav = () => {
    router.push('/auth/register');
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.content}>
          <Text style={styles.title}>Message App</Text>
          <Text style={styles.subtitle}>Login to Your Account</Text>

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
            placeholder="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            editable={!loading}
          />

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={loading}
          >
            <Text style={styles.buttonText}>{loading ? 'Logging in...' : 'Login'}</Text>
          </TouchableOpacity>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Don't have an account? </Text>
            <TouchableOpacity onPress={handleRegisterNav} disabled={loading}>
              <Text style={styles.linkText}>Register</Text>
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
    justifyContent: 'center',
  },
  content: {
    paddingHorizontal: 20,
    paddingVertical: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
    color: '#007AFF',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 30,
    textAlign: 'center',
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
