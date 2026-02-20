/**
 * App.jsx — Root of the entire mobile app.
 *
 * This file:
 * 1. Wraps everything in NavigationContainer (required by React Navigation)
 * 2. Wraps everything in AuthProvider (so any screen can check login state)
 * 3. Shows either the Login screen or the main app based on auth state
 */

import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, View } from 'react-native';
import { AuthProvider, useAuth } from './src/hooks/useAuth';
import { AuthStack, AppStack } from './src/navigation';
import { COLORS } from './src/constants/theme';


function RootNavigator() {
  const { isAuthenticated, loading } = useAuth();

  // Show a loading spinner while checking if the user has a stored token
  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.dark }}>
        <ActivityIndicator size="large" color={COLORS.accent} />
      </View>
    );
  }

  return isAuthenticated ? <AppStack /> : <AuthStack />;
}


export default function App() {
  return (
    <AuthProvider>
      <NavigationContainer>
        <StatusBar style="auto" />
        <RootNavigator />
      </NavigationContainer>
    </AuthProvider>
  );
}
