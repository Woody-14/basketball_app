/**
 * useNotifications — Push notification registration hook.
 *
 * Call this with `isAuthenticated` from useAuth. When the user is logged in,
 * it requests permission, gets the Expo push token, and registers it with
 * the backend so the coach can send notifications.
 *
 * Foreground notifications are shown as banners automatically via
 * setNotificationHandler (set at module level, outside the hook).
 *
 * iOS note: push notifications require a development build (not Expo Go).
 * Android with Expo Go works fine.
 */

import { useEffect } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { registerPushToken } from '../services/api';

// Show notifications as banners even when the app is open in the foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});


export function useNotifications(isAuthenticated) {
  useEffect(() => {
    if (!isAuthenticated) return;
    setupPushNotifications();
  }, [isAuthenticated]);
}


async function setupPushNotifications() {
  // Physical device only — simulators can't receive push notifications
  if (!Device.isDevice) return;

  // Request permission (shows system dialog the first time)
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== 'granted') return;

  // Android requires a notification channel (no-op on iOS)
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      sound: 'default',
    });
  }

  // Get the Expo push token and send it to the backend
  try {
    const { data: token } = await Notifications.getExpoPushTokenAsync();
    await registerPushToken(token);
  } catch (err) {
    // Non-fatal — app works fine without push notifications
    console.warn('Could not register push token:', err);
  }
}
