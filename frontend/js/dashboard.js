/**
 * Admin Intelligence Dashboard Controller
 * Displays the 7 core administrative KPIs, 4 Chart.js analytics graphs,
 * and academic intervention alerts with direct links to personalized student dashboards.
 */

let attendanceChartInstance = null;
let readinessChartInstance = null;
let departmentChartInstance = null;
let driveEligibilityChartInstance = null;

document.addEventListener("DOMContentLoaded", async () => {
  await window.updateBackendStatus();
  await loadDashboardMetrics();
  await loadDashboardCharts();
  await loadAtRiskStudents();
});

async function loadDashboardMetrics() {
  try {
    const stats = await API.getDashboardOverview();
    if (!stats) return;

    // 1. Total Students
    document.getElementById("stat-total-students").textContent = stats.total_students;

    // 2. Average Attendance
    document.getElementById("stat-avg-attendance").textContent = `${stats.average_attendance}%`;

    // 3. Students Below 75%
    const below75El = document.getElementById("stat-students-below-75");
    if (below75El) {
      below75El.textContent = stats.students_below_75 !== undefined ? stats.students_below_75 : stats.at_risk_count;
    }

    // 4. Average CGPA
    document.getElementById("stat-avg-cgpa").textContent = stats.average_cgpa.toFixed(2);

    // 5. Placement Drives
    const drivesEl = document.getElementById("stat-placement-drives");
    if (drivesEl) {
      drivesEl.textContent = stats.active_placement_drives;
    }

    // 6. Eligible Students
    const eligibleEl = document.getElementById("stat-eligible-students");
    if (eligibleEl) {
      eligibleEl.textContent = stats.eligible_count;
    }

    // 7. ML Readiness Distribution KPI
    if (stats.readiness_distribution) {
      const highEl = document.getElementById("readiness-high-cnt");
      const medEl = document.getElementById("readiness-med-cnt");
      const lowEl = document.getElementById("readiness-low-cnt");
      if (highEl) highEl.textContent = `H: ${stats.readiness_distribution["High Readiness"] || 0}`;
      if (medEl) medEl.textContent = `M: ${stats.readiness_distribution["Medium Readiness"] || 0}`;
      if (lowEl) lowEl.textContent = `L: ${stats.readiness_distribution["Low Readiness"] || 0}`;
    }
  } catch (err) {
    console.error("Error loading admin metrics:", err);
  }
}

async function loadDashboardCharts() {
  try {
    const data = await API.getChartsData();
    if (!data) return;

    // 1. Attendance Distribution
    renderAttendanceChart(data.attendance_distribution);

    // 2. ML Placement Readiness Distribution
    renderReadinessChart(data.readiness_distribution);

    // 3. Department Comparison
    renderDepartmentChart(data.department_analysis);

    // 4. Placement Drives Screening Status Breakdown
    renderDriveEligibilityChart(data.drive_eligibility_breakdown);

  } catch (err) {
    console.error("Error loading admin charts:", err);
  }
}

function renderAttendanceChart(chartData) {
  const ctx = document.getElementById("attendanceChart");
  if (!ctx || !chartData) return;

  if (attendanceChartInstance) attendanceChartInstance.destroy();

  attendanceChartInstance = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: chartData.labels,
      datasets: [{
        data: chartData.data,
        backgroundColor: [
          '#ef4444', // Danger: Below 75%
          '#f59e0b', // Warning: 75% - 85%
          '#10b981'  // Success: > 85%
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
      cutout: '68%'
    }
  });
}

function renderReadinessChart(chartData) {
  const ctx = document.getElementById("readinessChart");
  if (!ctx || !chartData) return;

  if (readinessChartInstance) readinessChartInstance.destroy();

  readinessChartInstance = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: chartData.labels,
      datasets: [{
        data: chartData.data,
        backgroundColor: [
          '#10b981', // High Readiness
          '#f59e0b', // Medium Readiness
          '#ef4444'  // Low Readiness
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
      cutout: '68%'
    }
  });
}

function renderDepartmentChart(chartData) {
  const ctx = document.getElementById("departmentChart");
  if (!ctx || !chartData) return;

  if (departmentChartInstance) departmentChartInstance.destroy();

  departmentChartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: chartData.labels,
      datasets: [
        {
          label: 'Avg CGPA (Scale 10)',
          data: chartData.avg_cgpa,
          backgroundColor: '#4f46e5',
          borderRadius: 6,
          yAxisID: 'y'
        },
        {
          label: 'Avg Attendance (%)',
          data: chartData.avg_attendance,
          backgroundColor: '#06b6d4',
          borderRadius: 6,
          yAxisID: 'y1'
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'top',
          labels: { color: '#94a3b8', font: { family: 'Inter', size: 11 } }
        }
      },
      scales: {
        x: {
          ticks: { color: '#94a3b8' },
          grid: { color: 'rgba(255, 255, 255, 0.05)' }
        },
        y: {
          type: 'linear',
          display: true,
          position: 'left',
          max: 10,
          ticks: { color: '#94a3b8' },
          grid: { color: 'rgba(255, 255, 255, 0.05)' }
        },
        y1: {
          type: 'linear',
          display: true,
          position: 'right',
          max: 100,
          ticks: { color: '#94a3b8' },
          grid: { drawOnChartArea: false }
        }
      }
    }
  });
}

function renderDriveEligibilityChart(chartData) {
  const ctx = document.getElementById("driveEligibilityChart");
  if (!ctx || !chartData) return;

  if (driveEligibilityChartInstance) driveEligibilityChartInstance.destroy();

  driveEligibilityChartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: chartData.labels,
      datasets: [
        {
          label: 'Eligible Candidates',
          data: chartData.eligible,
          backgroundColor: '#10b981',
          borderRadius: 4
        },
        {
          label: 'Ineligible Candidates',
          data: chartData.ineligible,
          backgroundColor: '#ef4444',
          borderRadius: 4
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          ticks: { color: '#94a3b8', font: { size: 10 } },
          grid: { display: false }
        },
        y: {
          beginAtZero: true,
          ticks: { color: '#94a3b8', stepSize: 2 },
          grid: { color: 'rgba(255, 255, 255, 0.05)' }
        }
      },
      plugins: {
        legend: {
          position: 'top',
          labels: { color: '#94a3b8', font: { family: 'Inter', size: 11 } }
        }
      }
    }
  });
}

async function loadAtRiskStudents() {
  const tbody = document.getElementById("at-risk-tbody");
  if (!tbody) return;

  try {
    const list = await API.getAtRiskStudents();
    tbody.innerHTML = "";

    if (!list || list.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="8" style="text-align: center; color: var(--accent-emerald); padding: 1.5rem;">
            ✓ Great news: No students are currently in the critical defaulter zone!
          </td>
        </tr>
      `;
      return;
    }

    list.forEach(s => {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td><strong style="color: var(--accent-cyan);">${s.roll_number || s.student_id}</strong></td>
        <td><strong>${s.name}</strong></td>
        <td>${s.department}</td>
        <td>
          <span class="pill-sm ${s.attendance_percentage < 75 ? 'pill-ineligible' : 'pill-eligible'}">
            ${s.attendance_percentage}%
          </span>
        </td>
        <td><strong>${s.cgpa.toFixed(2)}</strong></td>
        <td>
          <span class="pill-sm ${s.backlogs > 0 ? 'pill-ineligible' : 'pill-eligible'}">
            ${s.backlogs} Backlogs
          </span>
        </td>
        <td>
          <span style="color: #fca5a5; font-size: 0.8rem; font-weight: 500;">
            ${s.reason}
          </span>
        </td>
        <td>
          <a href="student-dashboard.html?id=${s.id}" class="btn btn-secondary btn-sm" style="font-size: 0.75rem; padding: 0.25rem 0.6rem;">
            🎓 Personalized Plan →
          </a>
        </td>
      `;
      tbody.appendChild(row);
    });
  } catch (err) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8" style="text-align: center; color: var(--text-muted); padding: 1.5rem;">
          Could not load at-risk records. Ensure the backend server is active.
        </td>
      </tr>
    `;
  }
}
