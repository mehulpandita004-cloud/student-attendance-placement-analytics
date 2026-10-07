/**
 * Attendance Analytics & Subject-wise Monitoring Controller
 * Powered by Chart.js & Rule-based Risk Classification
 */

let subjectChartInstance = null;
let distributionChartInstance = null;
let trendChartInstance = null;
let studentsListCache = [];

document.addEventListener("DOMContentLoaded", async () => {
  await window.updateBackendStatus();
  await populateStudentDropdowns();
  
  // Set default date to today
  const dateInput = document.getElementById("form-att-date");
  if (dateInput) {
    dateInput.value = new Date().toISOString().split("T")[0];
  }

  // Filter event listeners
  document.getElementById("student-scope-select")?.addEventListener("change", (e) => {
    updateScopeDisplay();
    loadAttendanceModule();
  });
  document.getElementById("subject-filter-select")?.addEventListener("change", loadAttendanceModule);
  document.getElementById("risk-filter-select")?.addEventListener("change", loadAttendanceModule);

  // Live calculation listeners in Modal
  document.getElementById("form-att-total")?.addEventListener("input", updateModalPreview);
  document.getElementById("form-att-attended")?.addEventListener("input", updateModalPreview);

  // Modal open/close listeners
  document.getElementById("openAddAttendanceModal")?.addEventListener("click", openAddAttendanceModal);
  document.getElementById("closeAttendanceModal")?.addEventListener("click", closeAttendanceModal);

  // Form submit handler
  document.getElementById("attendanceForm")?.addEventListener("submit", handleAttendanceFormSubmit);

  // Initial load
  await loadAttendanceModule();
});

// Update the scope text indicator
function updateScopeDisplay() {
  const select = document.getElementById("student-scope-select");
  const display = document.getElementById("active-student-display");
  if (!select || !display) return;

  const val = select.value;
  if (!val) {
    display.innerHTML = `Scope: <strong style="color: var(--accent-cyan);">College-wide (All Students)</strong>`;
  } else {
    const text = select.options[select.selectedIndex]?.text || "Selected Student";
    display.innerHTML = `Scope: <strong style="color: #34d399;">${text}</strong>`;
  }
}

// Fetch all students to populate student dropdown filters and modal
async function populateStudentDropdowns() {
  try {
    const students = await API.getStudents();
    studentsListCache = students || [];

    const scopeSelect = document.getElementById("student-scope-select");
    const modalSelect = document.getElementById("form-att-student");

    if (scopeSelect) {
      scopeSelect.innerHTML = `<option value="">🏫 All Students (College-wide Aggregate)</option>`;
      studentsListCache.forEach(s => {
        scopeSelect.innerHTML += `<option value="${s.id}">${s.student_id} - ${s.name} (${s.branch})</option>`;
      });
    }

    if (modalSelect) {
      modalSelect.innerHTML = `<option value="">-- Choose Student --</option>`;
      studentsListCache.forEach(s => {
        modalSelect.innerHTML += `<option value="${s.id}">${s.student_id} - ${s.name}</option>`;
      });
    }
  } catch (err) {
    console.error("Error loading students for attendance select:", err);
  }
}

// Main Loader: Fetches Analytics and Ledger Records
async function loadAttendanceModule() {
  const scopeStudentId = document.getElementById("student-scope-select")?.value || null;
  const filterSubject = document.getElementById("subject-filter-select")?.value || null;
  const filterRisk = document.getElementById("risk-filter-select")?.value || null;

  try {
    // 1. Fetch Analytics Summary
    const analytics = await API.getAttendanceAnalytics(scopeStudentId ? parseInt(scopeStudentId) : null);
    if (analytics) {
      renderKPICards(analytics);
      renderSubjectWiseChart(analytics.subject_wise);
      renderDistributionChart(analytics.distribution);
      renderTrendChart(analytics.trend);
      renderBelow75Table(analytics.below_75_subjects);
    }

    // 2. Fetch Ledger Records
    const records = await API.getAttendance({
      student_id: scopeStudentId ? parseInt(scopeStudentId) : null,
      subject: filterSubject,
      risk_level: filterRisk
    });
    renderAttendanceLedger(records || []);
  } catch (err) {
    console.error("Failed to load attendance module data:", err);
  }
}

// Render Top KPI Metric Cards
function renderKPICards(analytics) {
  // Overall percentage
  const pctEl = document.getElementById("kpi-overall-percentage");
  const badgeContainer = document.getElementById("kpi-risk-badge-container");
  if (pctEl && badgeContainer) {
    const pct = analytics.overall_attendance_percentage;
    pctEl.textContent = `${pct}%`;

    let badgeClass = "risk-low";
    let riskLabel = "Low Risk (Safe)";
    if (pct < 75.0) {
      badgeClass = "risk-high";
      riskLabel = "High Risk (Critical)";
    } else if (pct < 85.0) {
      badgeClass = "risk-medium";
      riskLabel = "Medium Risk (Warning)";
    }
    badgeContainer.innerHTML = `<span class="risk-pill ${badgeClass}">${riskLabel}</span>`;
  }

  // Classes Tracked Ratio
  const ratioEl = document.getElementById("kpi-classes-ratio");
  const missedEl = document.getElementById("kpi-classes-missed");
  if (ratioEl && missedEl) {
    ratioEl.textContent = `${analytics.classes_attended} / ${analytics.total_classes}`;
    missedEl.textContent = `${analytics.classes_missed} total classes missed`;
  }

  // Count below 75%
  const below75El = document.getElementById("kpi-below-75-count");
  if (below75El) {
    below75El.textContent = analytics.below_75_subjects.length;
  }

  // Total Classes needed for 75%
  const neededEl = document.getElementById("kpi-classes-needed");
  if (neededEl) {
    neededEl.textContent = analytics.classes_required_for_75 > 0 
      ? `+${analytics.classes_required_for_75} classes` 
      : `0 (Safe ≥ 75%)`;
  }
}

// Render Graph 1: Subject-wise Attendance Bar Chart
function renderSubjectWiseChart(subjects) {
  const ctx = document.getElementById("subjectWiseChart");
  if (!ctx) return;

  if (subjectChartInstance) subjectChartInstance.destroy();

  const labels = subjects.map(s => s.subject);
  const data = subjects.map(s => s.attendance_percentage);
  const colors = subjects.map(s => {
    if (s.attendance_percentage >= 85.0) return "#10b981"; // Low Risk
    if (s.attendance_percentage >= 75.0) return "#f59e0b"; // Medium Risk
    return "#ef4444"; // High Risk
  });

  subjectChartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: 'Attendance %',
        data: data,
        backgroundColor: colors,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: '#1e293b'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (item) => `Attendance: ${item.raw}% (${subjects[item.dataIndex].risk_level})`
          }
        }
      },
      scales: {
        x: {
          ticks: { color: '#94a3b8', font: { family: 'Inter', size: 11 } },
          grid: { color: 'rgba(255, 255, 255, 0.05)' }
        },
        y: {
          max: 100,
          min: 0,
          ticks: { color: '#94a3b8', stepSize: 20 },
          grid: { color: 'rgba(255, 255, 255, 0.05)' }
        }
      }
    }
  });
}

// Render Graph 2: Risk Distribution Doughnut Chart
function renderDistributionChart(distribution) {
  const ctx = document.getElementById("distributionChart");
  if (!ctx) return;

  if (distributionChartInstance) distributionChartInstance.destroy();

  const labels = Object.keys(distribution);
  const data = Object.values(distribution);

  distributionChartInstance = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: labels,
      datasets: [{
        data: data,
        backgroundColor: [
          '#10b981', // Low Risk (>=85%)
          '#f59e0b', // Medium Risk (75-84%)
          '#ef4444'  // High Risk (<75%)
        ],
        borderWidth: 2,
        borderColor: '#1e293b'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom',
          labels: { color: '#94a3b8', font: { family: 'Inter', size: 11 } }
        }
      },
      cutout: '65%'
    }
  });
}

// Render Graph 3: Chronological Trend Over Time
function renderTrendChart(trend) {
  const ctx = document.getElementById("trendChart");
  if (!ctx) return;

  if (trendChartInstance) trendChartInstance.destroy();

  trendChartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: trend.labels,
      datasets: [{
        label: 'Attendance Rate (%)',
        data: trend.percentages,
        borderColor: '#06b6d4',
        backgroundColor: 'rgba(6, 182, 212, 0.1)',
        tension: 0.35,
        fill: true,
        pointBackgroundColor: '#06b6d4',
        pointRadius: 4,
        pointHoverRadius: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false }
      },
      scales: {
        x: {
          ticks: { color: '#94a3b8' },
          grid: { color: 'rgba(255, 255, 255, 0.05)' }
        },
        y: {
          max: 100,
          min: 50,
          ticks: { color: '#94a3b8' },
          grid: { color: 'rgba(255, 255, 255, 0.05)' }
        }
      }
    }
  });
}

// Render 5 & 6: Subjects Below 75% & Classes Required Table
function renderBelow75Table(belowSubjects) {
  const tbody = document.getElementById("below-75-tbody");
  if (!tbody) return;

  if (!belowSubjects || belowSubjects.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8" style="text-align: center; color: var(--accent-emerald); padding: 1.75rem;">
          ✓ Excellent: No subjects are currently below the mandatory 75% benchmark!
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = "";
  belowSubjects.forEach(s => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td><strong>${s.subject}</strong></td>
      <td><span style="color: var(--text-secondary); font-size: 0.8rem;">Cohort / Selected</span></td>
      <td>${s.total_classes}</td>
      <td>${s.classes_attended}</td>
      <td><strong style="color: #f87171;">${s.attendance_percentage}%</strong></td>
      <td><span class="risk-pill risk-high">High Risk</span></td>
      <td>
        <strong style="color: #fbbf24; font-size: 1.05rem;">
          +${s.classes_required_for_75} lectures
        </strong>
      </td>
      <td>
        <span style="font-size: 0.78rem; color: #fca5a5;">
          Must attend next <strong>${s.classes_required_for_75}</strong> consecutive lectures without absence to reach 75.0%
        </span>
      </td>
    `;
    tbody.appendChild(row);
  });
}

// Render Full Attendance Ledger Table
function renderAttendanceLedger(records) {
  const tbody = document.getElementById("attendance-tbody");
  if (!tbody) return;

  if (records.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="9" style="text-align: center; color: var(--text-muted); padding: 2rem;">
          No attendance records found matching filters.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = "";
  records.forEach(r => {
    let riskPillClass = "risk-low";
    if (r.attendance_percentage < 75.0) riskPillClass = "risk-high";
    else if (r.attendance_percentage < 85.0) riskPillClass = "risk-medium";

    const row = document.createElement("tr");
    row.innerHTML = `
      <td>
        <strong>${r.student_name || 'Student #' + r.student_id}</strong>
        <div style="font-size: 0.75rem; color: var(--accent-cyan);">${r.student_roll || ''}</div>
      </td>
      <td><strong>${r.subject}</strong></td>
      <td>${r.total_classes}</td>
      <td>${r.classes_attended}</td>
      <td style="color: ${r.classes_missed > 0 ? '#f87171' : 'var(--text-muted)'};">${r.classes_missed}</td>
      <td>
        <strong>${r.attendance_percentage}%</strong>
        <div class="progress-track" style="width: 70px;">
          <div class="progress-fill ${r.attendance_percentage >= 85 ? 'fill-low-risk' : (r.attendance_percentage >= 75 ? 'fill-medium-risk' : 'fill-high-risk')}" 
               style="width: ${r.attendance_percentage}%;"></div>
        </div>
      </td>
      <td><span class="risk-pill ${riskPillClass}">${r.risk_level}</span></td>
      <td><span style="font-size: 0.8rem; color: var(--text-muted);">${r.date}</span></td>
      <td style="text-align: right;">
        <div style="display: inline-flex; gap: 0.35rem;">
          <button class="btn btn-secondary btn-sm" onclick="openEditAttendanceModal(${r.id})" title="Edit">
            ✏️
          </button>
          <button class="btn btn-danger btn-sm" onclick="handleDeleteAttendance(${r.id}, '${r.subject.replace(/'/g, "\\'")}')" title="Delete">
            🗑️
          </button>
        </div>
      </td>
    `;
    tbody.appendChild(row);
  });
}

// Live calculation preview in Modal as user types
function updateModalPreview() {
  const total = parseInt(document.getElementById("form-att-total")?.value) || 0;
  const attended = parseInt(document.getElementById("form-att-attended")?.value) || 0;

  const pctEl = document.getElementById("preview-percentage");
  const missedEl = document.getElementById("preview-missed");
  const pillEl = document.getElementById("preview-risk-pill");
  const fillEl = document.getElementById("preview-progress-fill");

  if (!pctEl || !missedEl || !pillEl || !fillEl) return;

  if (total <= 0) {
    pctEl.textContent = "0.0%";
    missedEl.textContent = "(0 Missed)";
    return;
  }

  const missed = Math.max(0, total - attended);
  const pct = Math.min(100, Math.max(0, roundTo((attended / total) * 100, 1)));

  pctEl.textContent = `${pct}%`;
  missedEl.textContent = `(${missed} Missed)`;
  fillEl.style.width = `${pct}%`;

  if (pct >= 85.0) {
    pillEl.className = "risk-pill risk-low";
    pillEl.textContent = "Low Risk (≥ 85%)";
    fillEl.className = "progress-fill fill-low-risk";
  } else if (pct >= 75.0) {
    pillEl.className = "risk-pill risk-medium";
    pillEl.textContent = "Medium Risk (75–84%)";
    fillEl.className = "progress-fill fill-medium-risk";
  } else {
    pillEl.className = "risk-pill risk-high";
    pillEl.textContent = "High Risk (< 75%)";
    fillEl.className = "progress-fill fill-high-risk";
  }
}

function roundTo(num, dec) {
  const factor = Math.pow(10, dec);
  return Math.round(num * factor) / factor;
}

// Modal open/close functions
function openAddAttendanceModal() {
  document.getElementById("attModalTitle").textContent = "Record Subject Attendance";
  document.getElementById("saveAttBtn").textContent = "Save Attendance";
  document.getElementById("attendanceForm").reset();
  document.getElementById("form-att-id").value = "";
  document.getElementById("form-att-date").value = new Date().toISOString().split("T")[0];
  document.getElementById("form-att-total").value = 40;
  document.getElementById("form-att-attended").value = 32;
  updateModalPreview();
  document.getElementById("attendanceModal").classList.add("active");
}

function closeAttendanceModal() {
  document.getElementById("attendanceModal").classList.remove("active");
}

// Open Edit Attendance Modal
window.openEditAttendanceModal = async function(id) {
  try {
    const records = await API.getAttendance();
    const record = records.find(r => r.id === id);
    if (!record) {
      alert("Record not found");
      return;
    }

    document.getElementById("attModalTitle").textContent = `Edit Attendance: ${record.subject}`;
    document.getElementById("saveAttBtn").textContent = "Update Attendance";
    document.getElementById("form-att-id").value = record.id;
    document.getElementById("form-att-student").value = record.student_id;
    document.getElementById("form-att-subject").value = record.subject;
    document.getElementById("form-att-total").value = record.total_classes;
    document.getElementById("form-att-attended").value = record.classes_attended;
    document.getElementById("form-att-date").value = record.date;

    updateModalPreview();
    document.getElementById("attendanceModal").classList.add("active");
  } catch (err) {
    alert("Error loading attendance record: " + err.message);
  }
};

// Handle Form Submission (Add or Update)
async function handleAttendanceFormSubmit(e) {
  e.preventDefault();

  const id = document.getElementById("form-att-id").value;
  const isEdit = Boolean(id);

  const studentId = parseInt(document.getElementById("form-att-student").value);
  const subject = document.getElementById("form-att-subject").value.trim();
  const total = parseInt(document.getElementById("form-att-total").value);
  const attended = parseInt(document.getElementById("form-att-attended").value);
  const date = document.getElementById("form-att-date").value.trim();

  // Validation
  if (isNaN(studentId)) {
    alert("Please select a valid student");
    return;
  }
  if (!subject) {
    alert("Please enter subject name");
    return;
  }
  if (isNaN(total) || total <= 0) {
    alert("Total classes must be at least 1");
    return;
  }
  if (isNaN(attended) || attended < 0) {
    alert("Classes attended cannot be negative");
    return;
  }
  if (attended > total) {
    alert("Classes attended cannot exceed total classes conducted");
    return;
  }

  const payload = {
    student_id: studentId,
    subject: subject,
    total_classes: total,
    classes_attended: attended,
    date: date
  };

  const saveBtn = document.getElementById("saveAttBtn");
  saveBtn.disabled = true;
  saveBtn.textContent = isEdit ? "Updating..." : "Saving...";

  try {
    if (isEdit) {
      await API.updateAttendance(parseInt(id), payload);
      alert("Attendance record updated successfully!");
    } else {
      await API.createAttendance(payload);
      alert("Attendance record added successfully!");
    }
    closeAttendanceModal();
    await loadAttendanceModule();
  } catch (err) {
    alert("Operation failed: " + err.message);
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = isEdit ? "Update Attendance" : "Save Attendance";
  }
}

// Delete Attendance Record
window.handleDeleteAttendance = async function(id, subjectName) {
  if (confirm(`Are you sure you want to delete the attendance record for "${subjectName}"?`)) {
    try {
      await API.deleteAttendance(id);
      alert("Attendance record deleted successfully.");
      await loadAttendanceModule();
    } catch (err) {
      alert("Failed to delete record: " + err.message);
    }
  }
};
