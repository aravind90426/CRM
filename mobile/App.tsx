import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from './src/context/AuthContext';
import { AppNavigator } from './src/navigation/AppNavigator';
import { EmergencyCheckInModal } from './src/components/attendance/EmergencyCheckInModal';

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <AuthProvider>
        <EmergencyCheckInModal />
        <AppNavigator />
      </AuthProvider>
    </SafeAreaProvider>
  );
}

