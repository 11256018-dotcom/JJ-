import { Stack } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AuthProvider, useAuth } from '../context/AuthContext';

function RootLayoutContent() {
  const { isLoggedIn, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
      {isLoggedIn ? (
        <Stack.Screen
          name="(tabs)"
          options={{
            headerShown: false,
          }}
        />
      ) : (
        <Stack.Screen
          name="auth"
          options={{
            headerShown: false,
          }}
        />
      )}
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider>
        <RootLayoutContent />
      </AuthProvider>
    </GestureHandlerRootView>
  );
}

