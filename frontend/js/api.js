/**
 * API Client for Student Attendance, Performance & Placement Analytics System
 */

// Dynamically determine API Base URL:
const API_BASE_URL = (window.location.protocol === 'http:' || window.location.protocol === 'https:') 
  && window.location.port === '8000'
    ? window.location.origin
    : 'http://127.0.0.1:8000';

const API = {
  baseUrl: API_BASE_URL,

  async checkHealth() {
    try {
      const res = await fetch(`${this.baseUrl}/api/health`);
      if (!res.ok) throw new Error("Health check failed");
      return await res.json();
    } catch (err) {
      console.warn("Backend API unavailable:", err.message);
      return null;
    }
  },

  async getDashboardOverview() {
    const res = await fetch(`${this.baseUrl}/api/analytics/overview`);
    if (!res.ok) throw new Error("Failed to fetch dashboard overview");
    return await res.json();
  },

  async getChartsData() {
    const res = await fetch(`${this.baseUrl}/api/analytics/charts`);
    if (!res.ok) throw new Error("Failed to fetch charts data");
    return await res.json();
  },

  async getAtRiskStudents() {
    const res = await fetch(`${this.baseUrl}/api/analytics/at-risk`);
    if (!res.ok) throw new Error("Failed to fetch at-risk students");
    return await res.json();
  },

  // ----------------- Student CRUD Operations -----------------
  async getStudents(filters = {}) {
    const params = new URLSearchParams();
    if (filters.branch && filters.branch !== 'All') params.append('branch', filters.branch);
    if (filters.year) params.append('year', filters.year);
    if (filters.search) params.append('search', filters.search);
    if (filters.placement_status && filters.placement_status !== 'All') params.append('placement_status', filters.placement_status);

    const res = await fetch(`${this.baseUrl}/students?${params.toString()}`, {
      headers: { 'Accept': 'application/json' }
    });
    if (!res.ok) throw new Error("Failed to fetch students list");
    return await res.json();
  },

  async getStudentById(id) {
    const res = await fetch(`${this.baseUrl}/students/${id}`, {
      headers: { 'Accept': 'application/json' }
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || "Student not found");
    }
    return await res.json();
  },

  async createStudent(studentData) {
    const res = await fetch(`${this.baseUrl}/students`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(studentData),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || "Failed to create student");
    }
    return await res.json();
  },

  async updateStudent(id, studentData) {
    const res = await fetch(`${this.baseUrl}/students/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(studentData),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || "Failed to update student");
    }
    return await res.json();
  },

  async deleteStudent(studentId) {
    const res = await fetch(`${this.baseUrl}/students/${studentId}`, {
      method: 'DELETE',
      headers: { 'Accept': 'application/json' }
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || "Failed to delete student");
    }
    return await res.json();
  },

  // ----------------- Attendance Operations -----------------
  async getAttendance(params = {}) {
    const q = new URLSearchParams();
    if (params.student_id) q.append('student_id', params.student_id);
    if (params.subject && params.subject !== 'All') q.append('subject', params.subject);
    if (params.risk_level && params.risk_level !== 'All') q.append('risk_level', params.risk_level);

    const res = await fetch(`${this.baseUrl}/attendance?${q.toString()}`, {
      headers: { 'Accept': 'application/json' }
    });
    if (!res.ok) throw new Error("Failed to fetch attendance records");
    return await res.json();
  },

  async getAttendanceByStudent(studentId) {
    const res = await fetch(`${this.baseUrl}/attendance/student/${studentId}`, {
      headers: { 'Accept': 'application/json' }
    });
    if (!res.ok) throw new Error("Failed to fetch student attendance");
    return await res.json();
  },

  async getAttendanceBySubject(subjectName) {
    const res = await fetch(`${this.baseUrl}/attendance/subject/${encodeURIComponent(subjectName)}`, {
      headers: { 'Accept': 'application/json' }
    });
    if (!res.ok) throw new Error("Failed to fetch subject attendance");
    return await res.json();
  },

  async getAttendanceAnalytics(studentId = null) {
    const url = studentId 
      ? `${this.baseUrl}/attendance/analytics?student_id=${studentId}`
      : `${this.baseUrl}/attendance/analytics`;
    const res = await fetch(url, {
      headers: { 'Accept': 'application/json' }
    });
    if (!res.ok) throw new Error("Failed to fetch attendance analytics");
    return await res.json();
  },

  async createAttendance(data) {
    const res = await fetch(`${this.baseUrl}/attendance`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || "Failed to add attendance record");
    }
    return await res.json();
  },

  async updateAttendance(id, data) {
    const res = await fetch(`${this.baseUrl}/attendance/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || "Failed to update attendance record");
    }
    return await res.json();
  },

  async deleteAttendance(id) {
    const res = await fetch(`${this.baseUrl}/attendance/${id}`, {
      method: 'DELETE',
      headers: { 'Accept': 'application/json' }
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || "Failed to delete attendance record");
    }
    return await res.json();
  },

  // ----------------- Placement Operations -----------------
  async getPlacementDrives() {
    const res = await fetch(`${this.baseUrl}/api/placements/drives`);
    if (!res.ok) throw new Error("Failed to fetch placement drives");
    return await res.json();
  },

  async createPlacementDrive(driveData) {
    const res = await fetch(`${this.baseUrl}/api/placements/drives`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(driveData),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || "Failed to create placement drive");
    }
    return await res.json();
  },

  async getPlacementDriveById(driveId) {
    const res = await fetch(`${this.baseUrl}/api/placements/drives/${driveId}`);
    if (!res.ok) throw new Error("Failed to fetch placement drive details");
    return await res.json();
  },

  async updatePlacementDrive(driveId, driveData) {
    const res = await fetch(`${this.baseUrl}/api/placements/drives/${driveId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(driveData),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || "Failed to update placement drive");
    }
    return await res.json();
  },

  async deletePlacementDrive(driveId) {
    const res = await fetch(`${this.baseUrl}/api/placements/drives/${driveId}`, {
      method: 'DELETE',
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || "Failed to delete placement drive");
    }
    return await res.json();
  },

  async evaluateEligibility(studentId, driveId) {
    const res = await fetch(`${this.baseUrl}/api/placements/evaluate?student_id=${studentId}&drive_id=${driveId}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || "Failed to evaluate eligibility");
    }
    return await res.json();
  },

  async getDriveEligibilityReport(driveId) {
    const res = await fetch(`${this.baseUrl}/api/placements/drives/${driveId}/eligible-report`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || "Failed to fetch drive eligibility report");
    }
    return await res.json();
  },

  async getStudentDrivesEvaluation(studentId) {
    const res = await fetch(`${this.baseUrl}/api/placements/students/${studentId}/drives-evaluation`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || "Failed to fetch student drives evaluation");
    }
    return await res.json();
  },

  async getEligibleStudents(driveId) {
    const res = await fetch(`${this.baseUrl}/api/placements/drives/${driveId}/eligible`);
    if (!res.ok) throw new Error("Failed to fetch eligible students");
    return await res.json();
  },

  // ----------------- Performance & Profile Operations -----------------
  async getPerformanceAnalytics(params = {}) {
    const q = new URLSearchParams();
    if (params.branch && params.branch !== 'All') q.append('branch', params.branch);
    if (params.year) q.append('year', params.year);

    const res = await fetch(`${this.baseUrl}/performance/analytics?${q.toString()}`, {
      headers: { 'Accept': 'application/json' }
    });
    if (!res.ok) throw new Error("Failed to fetch performance analytics");
    return await res.json();
  },

  async getStudentFullProfile(studentId) {
    const res = await fetch(`${this.baseUrl}/performance/student/${studentId}`, {
      headers: { 'Accept': 'application/json' }
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || "Failed to fetch student full profile");
    }
    return await res.json();
  },

  // ----------------- Machine Learning Predictive Operations -----------------
  async predictAttendanceRisk(data) {
    const res = await fetch(`${this.baseUrl}/predict/attendance-risk`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || "Failed to predict attendance risk");
    }
    return await res.json();
  },

  async predictPlacementReadiness(data) {
    const res = await fetch(`${this.baseUrl}/predict/placement-readiness`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || "Failed to predict placement readiness");
    }
    return await res.json();
  },

  async getMLMetrics() {
    const res = await fetch(`${this.baseUrl}/ml/metrics`);
    if (!res.ok) throw new Error("Failed to fetch ML evaluation metrics");
    return await res.json();
  },

  async predictStudentComprehensive(studentId) {
    const res = await fetch(`${this.baseUrl}/predict/student/${studentId}`, {
      method: 'POST',
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || "Failed to predict student comprehensive metrics");
    }
    return await res.json();
  },

  async getStudentDashboard(studentId) {
    const res = await fetch(`${this.baseUrl}/api/student-dashboard/${studentId}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || "Failed to load student dashboard");
    }
    return await res.json();
  },

  async getStudentRecommendations(studentId) {
    const res = await fetch(`${this.baseUrl}/api/recommendations/student/${studentId}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || "Failed to load student recommendations");
    }
    return await res.json();
  }
};

// Global helper to verify backend connectivity in top bar
window.updateBackendStatus = async function() {
  const pill = document.getElementById("backend-status-pill");
  const text = document.getElementById("backend-status-text");
  if (!pill || !text) return;

  const health = await API.checkHealth();
  if (health && health.status === "healthy") {
    pill.classList.remove("error");
    text.textContent = "Backend API: Online";
  } else {
    pill.classList.add("error");
    text.textContent = "Backend API: Offline";
  }
};
