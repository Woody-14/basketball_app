/**
 * Navigation — Defines all the screens and how they connect.
 *
 * REACT NAVIGATION CONCEPTS:
 * - Stack Navigator: Screens that push on top of each other (like a deck of cards)
 * - Bottom Tab Navigator: The tab bar at the bottom of the screen
 * - Nesting: We put stacks INSIDE tabs so each tab can have sub-screens
 */

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS } from '../constants/theme';

// Auth screens
import LoginScreen from '../screens/LoginScreen';

// Main tab screens
import HomeScreen from '../screens/HomeScreen';
import ScheduleScreen from '../screens/ScheduleScreen';
import DrillLibraryScreen from '../screens/DrillLibraryScreen';
import ProgressScreen from '../screens/ProgressScreen';
import ProfileScreen from '../screens/ProfileScreen';

// Sub-screens (pushed on top of tabs)
import WorkoutDetailScreen from '../screens/WorkoutDetailScreen';
import ActiveWorkoutScreen from '../screens/ActiveWorkoutScreen';
import DrillDetailScreen from '../screens/DrillDetailScreen';
import WorkoutCompleteScreen from '../screens/WorkoutCompleteScreen';
import MessagesScreen from '../screens/MessagesScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();


// ---------- BOTTOM TABS ----------

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: COLORS.accent,
        tabBarInactiveTintColor: COLORS.textLight,
        tabBarLabelStyle: {
          fontSize: FONTS.sizes.xs,
          fontWeight: '600',
        },
        tabBarStyle: {
          backgroundColor: COLORS.surface,
          borderTopColor: COLORS.border,
          borderTopWidth: 1,
          paddingTop: 4,
          height: 88,
        },
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;
          switch (route.name) {
            case 'Home':
              iconName = focused ? 'home' : 'home-outline';
              break;
            case 'Schedule':
              iconName = focused ? 'calendar' : 'calendar-outline';
              break;
            case 'Progress':
              iconName = focused ? 'stats-chart' : 'stats-chart-outline';
              break;
            case 'Profile':
              iconName = focused ? 'person' : 'person-outline';
              break;
          }
          return <Ionicons name={iconName} size={24} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Schedule" component={ScheduleScreen} />
      <Tab.Screen name="Progress" component={ProgressScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}


// ---------- AUTH STACK ----------

export function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
    </Stack.Navigator>
  );
}


// ---------- APP STACK ----------
// Wraps the tab navigator and adds screens that push on top of tabs

export function AppStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: COLORS.surface },
        headerTintColor: COLORS.text,
        headerTitleStyle: { fontWeight: '600', fontSize: FONTS.sizes.md },
        headerShadowVisible: false,
        headerBackTitleVisible: false,
      }}
    >
      <Stack.Screen
        name="MainTabs"
        component={MainTabs}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="WorkoutDetail"
        component={WorkoutDetailScreen}
        options={{ title: 'Workout' }}
      />
      <Stack.Screen
        name="ActiveWorkout"
        component={ActiveWorkoutScreen}
        options={{
          title: 'Workout In Progress',
          headerBackVisible: false,  // Prevent accidental back during workout
          gestureEnabled: false,
        }}
      />
      <Stack.Screen
        name="DrillDetail"
        component={DrillDetailScreen}
        options={{ title: 'Drill' }}
      />
      <Stack.Screen
        name="WorkoutComplete"
        component={WorkoutCompleteScreen}
        options={{
          headerShown: false,
          gestureEnabled: false,
        }}
      />
      <Stack.Screen
        name="Messages"
        component={MessagesScreen}
        options={{ title: 'Coach' }}
      />
    </Stack.Navigator>
  );
}
