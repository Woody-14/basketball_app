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

  if (response.status === 401) {
    clearToken();
    window.location.href = '/login';
    throw new Error('Session expired. Please log in again.');
  }

  // Parse JSON — fall back gracefully if server returns plain text (e.g., 500 proxy errors)
  let data;
  try {
    data = await response.json();
  } catch {
    if (!response.ok) {
      throw new Error(`Server error (${response.status})`);
    }
    return null;
  }

  if (!response.ok) {
    throw new Error(data.detail || 'Something went wrong');
  }

  return data;
}


// ---------- AUTH ----------

export async function login(email, password) {
  // Clear any cached role from a previous session before logging in as a new user
  localStorage.removeItem('user_role');
  const data = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  setToken(data.access_token);
  return data;
}

export function logout() {
  clearToken();
  localStorage.removeItem('user_role');
}

export async function getMe() {
  return request('/auth/me');
}

export async function createStudent(studentData) {
  return request('/auth/students', {
    method: 'POST',
    body: JSON.stringify(studentData),
  });
}

export async function changePassword(currentPassword, newPassword) {
  return request('/auth/change-password', {
    method: 'POST',
    body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
  });
}


// ---------- DRILLS ----------

export async function getDrills(filters = {}) {
  const params = new URLSearchParams();
  if (filters.category) params.append('category', filters.category);
  if (filters.difficulty) params.append('difficulty', filters.difficulty);
  if (filters.search) params.append('search', filters.search);
  if (filters.tag) params.append('tag', filters.tag);
  if (filters.phase) params.append('phase', filters.phase);

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

export async function deleteStudent(id) {
  return request(`/students/${id}`, { method: 'DELETE' });
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


// ---------- FORM CHECKS (Video Review) ----------

export async function getPendingReviews() {
  return request('/form-checks/pending');
}

export async function submitFeedback(formCheckId, feedback) {
  return request(`/form-checks/${formCheckId}/feedback`, {
    method: 'PATCH',
    body: JSON.stringify({ feedback }),
  });
}


// ---------- SKILL ASSESSMENTS ----------

export async function getStudentSkillAssessments(studentId) {
  return request(`/students/${studentId}/skill-assessments`);
}

export async function createSkillAssessment(studentId, data) {
  return request(`/students/${studentId}/skill-assessments`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}


// ---------- CONTENT FEED ----------

export async function getFeedPosts() {
  return request('/feed');
}

export async function getScheduledDrills() {
  return request('/feed/scheduled');
}

export async function createFeedPost(data) {
  return request('/feed', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function deleteFeedPost(id) {
  return request(`/feed/${id}`, { method: 'DELETE' });
}


// ---------- ANALYTICS ----------

export async function getAnalyticsOverview() {
  return request('/analytics/overview');
}

export async function getComplianceTrend() {
  return request('/analytics/compliance-trend');
}

export async function getDrillAnalytics() {
  return request('/analytics/drills');
}


// ---------- PARENT PORTAL ----------

export async function createParentAccount(studentId, data) {
  return request('/auth/parents', {
    method: 'POST',
    body: JSON.stringify({ ...data, student_id: studentId }),
  });
}

export async function getParentChild() {
  return request('/parent/child');
}

export async function getParentChildAssignments() {
  return request('/parent/child/assignments');
}

export async function getParentChildSkillAssessment() {
  return request('/parent/child/skill-assessment');
}

export async function getParentChildFormChecks() {
  return request('/parent/child/form-checks');
}
