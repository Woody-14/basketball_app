/**
 * API Service for the mobile app.
 *
 * IMPORTANT: Change API_BASE to your computer's local IP address
 * when testing on a physical device (localhost won't work from a phone).
 * Find your IP: open Command Prompt → ipconfig → look for IPv4 Address.
 * Example: const API_BASE = 'http://192.168.1.42:8000/api';
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

// Derive the backend host from Expo's dev server host so the URL is always
// correct — works on iOS simulator, physical device (LAN), and Android emulator.
function getApiBase() {
  if (__DEV__) {
    // hostUri looks like "192.168.1.x:8081" — grab just the IP portion
    const raw =
      Constants.expoConfig?.hostUri ??
      Constants.manifest2?.extra?.expoGo?.debuggerHost ??
      Constants.manifest?.debuggerHost ??
      '';
    const host = raw.split(':')[0] || 'localhost';
    const url = `http://${host}:8000/api`;
    console.log('[API] base URL:', url);
    return url;
  }
  // ⚠️  BEFORE SUBMITTING TO APP STORES:
  // Replace this with your real backend URL, e.g. 'https://api.summithoops.com/api'
  // The app will not work in production until this is set.
  return 'https://basketball-app-production.up.railway.app/api';
}

const API_BASE = getApiBase();

const TOKEN_KEY = 'auth_token';
const USER_KEY = 'user_data';


// ---------- TOKEN MANAGEMENT ----------
// AsyncStorage stores data as key-value strings (safe for tokens on mobile)

export async function getToken() {
  return await AsyncStorage.getItem(TOKEN_KEY);
}

export async function setToken(token) {
  await AsyncStorage.setItem(TOKEN_KEY, token);
}

export async function clearToken() {
  await AsyncStorage.removeItem(TOKEN_KEY);
  await AsyncStorage.removeItem(USER_KEY);
}

export async function isLoggedIn() {
  const token = await getToken();
  return !!token;
}

// Cache user data locally so we don't need to fetch it every time
export async function getCachedUser() {
  const data = await AsyncStorage.getItem(USER_KEY);
  return data ? JSON.parse(data) : null;
}

export async function setCachedUser(user) {
  await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
}


// ---------- HTTP HELPERS ----------

async function request(endpoint, options = {}) {
  const token = await getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  let response;
  try {
    response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeoutId);
  }

  if (response.status === 204) return null;

  const data = await response.json();

  if (response.status === 401) {
    await clearToken();
    throw new Error('Invalid or expired token. Please log in again.');
  }

  if (!response.ok) {
    throw new Error(data.detail || 'Something went wrong');
  }

  return data;
}

// For file uploads (video form checks)
async function uploadRequest(endpoint, formData) {
  const token = await getToken();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 60000); // 60s for video uploads

  let response;
  try {
    response = await fetch(`${API_BASE}${endpoint}`, {
      method: 'POST',
      headers: {
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        // Don't set Content-Type — fetch sets it automatically with boundary for FormData
      },
      body: formData,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeoutId);
  }

  const data = await response.json();

  if (response.status === 401) {
    await clearToken();
    throw new Error('Invalid or expired token. Please log in again.');
  }

  if (!response.ok) {
    throw new Error(data.detail || 'Upload failed');
  }
  return data;
}


// ---------- AUTH ----------

export async function login(email, password) {
  const data = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  await setToken(data.access_token);
  return data;
}

export async function logout() {
  await clearToken();
}


// ---------- ASSIGNMENTS (Student's workouts) ----------

export async function getMyAssignments(startDate, endDate) {
  const params = new URLSearchParams();
  if (startDate) params.append('start_date', startDate);
  if (endDate) params.append('end_date', endDate);
  const query = params.toString();
  return request(`/assignments/me${query ? `?${query}` : ''}`);
}


// ---------- WORKOUTS ----------

export async function getWorkout(id) {
  return request(`/workouts/${id}`);
}


// ---------- CONTENT FEED ----------

export async function getFeed() {
  return request('/feed');
}


// ---------- DRILLS ----------

export async function getDrill(id) {
  return request(`/drills/${id}`);
}

export async function getDrills(filters = {}) {
  const params = new URLSearchParams();
  if (filters.category) params.append('category', filters.category);
  if (filters.difficulty) params.append('difficulty', filters.difficulty);
  if (filters.search) params.append('search', filters.search);
  if (filters.phase) params.append('phase', filters.phase);
  const query = params.toString();
  return request(`/drills${query ? `?${query}` : ''}`);
}


// ---------- PROFILE ----------

export async function getMyProfile() {
  return request('/auth/me');
}


// ---------- WORKOUT COMPLETION ----------

export async function completeWorkout(assignmentId, completionData) {
  return request(`/assignments/${assignmentId}/complete`, {
    method: 'PATCH',
    body: JSON.stringify(completionData),
  });
}

// Creates a WorkoutCompletion record after marking the assignment done.
// Returns { id } — pass this id to submitFormCheck for each drill video.
export async function createCompletion(assignmentId, totalSeconds) {
  return request('/completions', {
    method: 'POST',
    body: JSON.stringify({ assignment_id: assignmentId, total_seconds: totalSeconds }),
  });
}


// ---------- FORM CHECKS ----------

// Upload a form check video for a specific drill. Uses multipart form upload.
export async function submitFormCheck(completionId, workoutDrillId, videoUri) {
  const ext = videoUri.split('.').pop()?.toLowerCase() || 'mp4';
  const mimeMap = { mov: 'video/quicktime', mp4: 'video/mp4', m4v: 'video/x-m4v', avi: 'video/x-msvideo', webm: 'video/webm' };
  const type = mimeMap[ext] || 'video/mp4';

  const formData = new FormData();
  formData.append('completion_id', String(completionId));
  formData.append('workout_drill_id', String(workoutDrillId));
  formData.append('video', { uri: videoUri, type, name: `form_check.${ext}` });
  return uploadRequest('/form-checks', formData);
}

// Student: get own form check history with coach feedback
export async function getMyFormChecks() {
  return request('/form-checks/mine');
}


// ---------- MESSAGES ----------

export async function getMessages() {
  return request('/messages');
}

export async function sendMessage(content) {
  return request('/messages', {
    method: 'POST',
    body: JSON.stringify({ content }),
  });
}

export async function markMessagesRead() {
  return request('/messages/read', { method: 'PATCH' });
}


// ---------- SKILL ASSESSMENTS ----------

export async function getMySkillAssessment() {
  return request('/skill-assessments/mine');
}

export async function registerPushToken(token) {
  return request('/auth/push-token', {
    method: 'PUT',
    body: JSON.stringify({ token }),
  });
}

export async function changePassword(currentPassword, newPassword) {
  return request('/auth/change-password', {
    method: 'POST',
    body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
  });
}

export async function deleteMyAccount() {
  return request('/auth/me', { method: 'DELETE' });
}
