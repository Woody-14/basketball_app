/**
 * API Service
 * 
 * This file handles ALL communication between the admin dashboard
 * and the FastAPI backend. Every API call goes through here.
 * 
 * REACT CONCEPT: This isn't a React component — it's a plain JavaScript
 * module. Components will import functions from here to fetch/send data.
 */

const API_BASE = '/api';

// ---------- TOKEN MANAGEMENT ----------

// We store the JWT token in localStorage so it survives page refreshes
export function getToken() {
  return localStorage.getItem('auth_token');
}

export function setToken(token) {
  localStorage.setItem('auth_token', token);
}

export function clearToken() {
  localStorage.removeItem('auth_token');
}

export function isLoggedIn() {
  return !!getToken();
}


// ---------- HTTP HELPERS ----------

/**
 * Makes an authenticated API request.
 * Automatically adds the JWT token to the headers.
 * Automatically parses JSON responses.
 * Throws an error with the server's message if the request fails.
 */
async function request(endpoint, options = {}) {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  // Handle 204 No Content (e.g., successful DELETE)
  if (response.status === 204) return null;

  const data = await response.json();

  if (response.status === 401) {
    clearToken();
    window.location.href = '/login';
    throw new Error('Session expired. Please log in again.');
  }

  if (!response.ok) {
    throw new Error(data.detail || 'Something went wrong');
  }

  return data;
}


// ---------- AUTH ----------

export async function login(email, password) {
  const data = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  setToken(data.access_token);
  return data;
}

export function logout() {
  clearToken();
}

export async function createStudent(studentData) {
  return request('/auth/students', {
    method: 'POST',
    body: JSON.stringify(studentData),
  });
}


// ---------- DRILLS ----------

export async function getDrills(filters = {}) {
  const params = new URLSearchParams();
  if (filters.category) params.append('category', filters.category);
  if (filters.difficulty) params.append('difficulty', filters.difficulty);
  if (filters.search) params.append('search', filters.search);
  if (filters.tag) params.append('tag', filters.tag);

  const query = params.toString();
  return request(`/drills${query ? `?${query}` : ''}`);
}

export async function getDrill(id) {
  return request(`/drills/${id}`);
}

export async function createDrill(drillData) {
  return request('/drills', {
    method: 'POST',
    body: JSON.stringify(drillData),
  });
}

export async function updateDrill(id, drillData) {
  return request(`/drills/${id}`, {
    method: 'PUT',
    body: JSON.stringify(drillData),
  });
}

export async function deleteDrill(id) {
  return request(`/drills/${id}`, { method: 'DELETE' });
}

export async function getTags() {
  return request('/drills/tags');
}

export async function createTag(name) {
  return request('/drills/tags', {
    method: 'POST',
    body: JSON.stringify({ name }),
  });
}

// ---------- WORKOUTS ----------

export async function getWorkouts(templatesOnly = false) {
  const query = templatesOnly ? '?templates_only=true' : '';
  return request(`/workouts${query}`);
}

export async function getWorkout(id) {
  return request(`/workouts/${id}`);
}

export async function createWorkout(workoutData) {
  return request('/workouts', {
    method: 'POST',
    body: JSON.stringify(workoutData),
  });
}

export async function updateWorkout(id, workoutData) {
  return request(`/workouts/${id}`, {
    method: 'PUT',
    body: JSON.stringify(workoutData),
  });
}

export async function deleteWorkout(id) {
  return request(`/workouts/${id}`, { method: 'DELETE' });
}


// ---------- ASSIGNMENTS ----------

export async function createAssignment(assignmentData) {
  return request('/assignments', {
    method: 'POST',
    body: JSON.stringify(assignmentData),
  });
}

export async function createBulkAssignments(bulkData) {
  return request('/assignments/bulk', {
    method: 'POST',
    body: JSON.stringify(bulkData),
  });
}

export async function getStudentAssignments(studentId, startDate, endDate) {
  const params = new URLSearchParams();
  if (startDate) params.append('start_date', startDate);
  if (endDate) params.append('end_date', endDate);
  const query = params.toString();
  return request(`/assignments/student/${studentId}${query ? `?${query}` : ''}`);
}


// ---------- STUDENTS ----------

export async function getStudents() {
  return request('/students');
}

export async function getStudent(id) {
  return request(`/students/${id}`);
}

export async function updateStudent(id, data) {
  return request(`/students/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}


// ---------- MESSAGES ----------

export async function getConversation(studentId) {
  return request(`/messages?student_id=${studentId}`);
}

export async function sendMessageToStudent(studentId, content) {
  return request('/messages', {
    method: 'POST',
    body: JSON.stringify({ content, recipient_id: studentId }),
  });
}

export async function markConversationRead(studentId) {
  return request(`/messages/read?student_id=${studentId}`, { method: 'PATCH' });
}
