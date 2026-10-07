/**
 * Machine Learning Predictive Intelligence Dashboard Controller
 * Loads real scikit-learn evaluation metrics, renders confusion matrices,
 * model comparison tables, and handles live student predictions.
 */

let mlSummaryData = null;
let allStudentsList = [];
let attChartInstance = null;
let placeChartInstance = null;

document.addEventListener("DOMContentLoaded", async () => {
  await window.updateBackendStatus();
  await loadMLDashboardData();
  await loadStudentsForSandbox();

  // Listen for student select in sandbox
  document.getElementById("sandbox-student-select")?.addEventListener("change", handleStudentSandboxSelect);
});

async function loadMLDashboardData() {
  try {
    const data = await API.getMLMetrics();
    if (!data) return;
    mlSummaryData = data;

    // 1. Top KPI Summary Cards
    const totalPreds = data.prediction_counts.total_predictions || 0;
    document.getElementById("stat-predictions-count").textContent = totalPreds;

    const attBest = data.attendance.best_model_metrics;
    document.getElementById("stat-att-f1").textContent = `${attBest.f1_macro}%`;
    document.getElementById("stat-att-model-name").textContent = `Best: ${data.attendance.best_model_name}`;

    const placeBest = data.placement.best_model_metrics;
    document.getElementById("stat-place-f1").textContent = `${placeBest.f1_macro}%`;
    document.getElementById("stat-place-model-name").textContent = `Best: ${data.placement.best_model_name}`;

    // 2. Render Tab 1: Attendance Risk Model
    renderAttendanceModelTab(data.attendance);

    // 3. Render Tab 2: Placement Readiness Model
    renderPlacementModelTab(data.placement);

  } catch (err) {
    console.error("Failed to load ML metrics:", err);
  }
}

async function loadStudentsForSandbox() {
  try {
    const students = await API.getStudents();
    allStudentsList = students || [];

    const select = document.getElementById("sandbox-student-select");
    if (!select) return;

    select.innerHTML = `<option value="">-- Choose Enrolled Student (${allStudentsList.length} Candidates) --</option>`;
    allStudentsList.forEach(s => {
      const opt = document.createElement("option");
      opt.value = s.id;
      opt.textContent = `${s.student_id} - ${s.name} (${s.branch}) | CGPA: ${s.cgpa} | Att: ${s.attendance_percentage}%`;
      select.appendChild(opt);
    });

    // Default select first student if available
    if (allStudentsList.length > 0) {
      select.value = allStudentsList[0].id;
      handleStudentSandboxSelect();
    }
  } catch (err) {
    console.error("Failed to load students for sandbox:", err);
  }
}

function handleStudentSandboxSelect() {
  const select = document.getElementById("sandbox-student-select");
  const studentId = parseInt(select?.value);
  if (!studentId) return;

  const s = allStudentsList.find(item => item.id === studentId);
  if (!s) return;

  // Attendance inputs
  const totalClasses = 60;
  const attended = Math.round((s.attendance_percentage / 100.0) * totalClasses);
  document.getElementById("input-att-total").value = totalClasses;
  document.getElementById("input-att-attended").value = attended;
  document.getElementById("input-att-prev").value = s.attendance_percentage;
  document.getElementById("input-att-recent").value = s.attendance_percentage;

  // Placement inputs
  document.getElementById("input-place-cgpa").value = s.cgpa;
  document.getElementById("input-place-att").value = s.attendance_percentage;
  document.getElementById("input-place-projects").value = s.number_of_projects;
  document.getElementById("input-place-certs").value = s.certifications;
  
  const internStr = (s.internship || "").toLowerCase();
  const hasIntern = internStr.includes("yes") || internStr.includes("intern");
  document.getElementById("input-place-intern").value = hasIntern ? "Yes" : "No";

  const skillsList = (s.technical_skills || "").split(",").filter(Boolean);
  document.getElementById("input-place-skills").value = skillsList.length || 3;
  document.getElementById("input-place-backlogs").value = s.backlogs;

  let profilesScore = 0;
  if (s.github_profile && s.github_profile.trim()) profilesScore += 1;
  if (s.portfolio_profile && s.portfolio_profile.trim()) profilesScore += 1;
  document.getElementById("input-place-profiles").value = profilesScore;

  // Auto run prediction
  runComprehensivePrediction();
}

function renderAttendanceModelTab(attData) {
  const best = attData.best_model_metrics;
  document.getElementById("badge-best-att").textContent = `🏆 Selected: ${attData.best_model_name}`;

  document.getElementById("att-metric-acc").textContent = `${best.accuracy}%`;
  document.getElementById("att-metric-prec").textContent = `${best.precision_macro}%`;
  document.getElementById("att-metric-rec").textContent = `${best.recall_macro}%`;
  document.getElementById("att-metric-f1").textContent = `${best.f1_macro}%`;

  // Comparison Table
  const tbody = document.getElementById("att-comparison-tbody");
  if (tbody) {
    tbody.innerHTML = attData.models_comparison.map(m => {
      const isBest = m.model_name === attData.best_model_name;
      return `
        <tr style="${isBest ? 'background: rgba(16, 185, 129, 0.08); font-weight: 600;' : ''}">
          <td>
            <strong style="color: #fff;">${m.model_name}</strong>
          </td>
          <td>${m.accuracy}%</td>
          <td>${m.precision_macro}%</td>
          <td>${m.recall_macro}%</td>
          <td><strong style="color: var(--accent-amber);">${m.f1_macro}%</strong></td>
          <td>${m.f1_weighted}%</td>
          <td>
            ${isBest 
              ? `<span class="pill-sm pill-eligible">🏆 Selected Best</span>`
              : `<span class="badge-tag">Evaluated</span>`
            }
          </td>
        </tr>
      `;
    }).join("");
  }

  // Render Confusion Matrix
  renderConfusionMatrixHtml("att-cm-container", best.confusion_matrix, best.classes, "Attendance Risk");

  // Render Per-Class Chart
  renderAttendanceClassChart(best.classification_report, best.classes);
}

function renderPlacementModelTab(placeData) {
  const best = placeData.best_model_metrics;
  document.getElementById("badge-best-place").textContent = `🏆 Selected: ${placeData.best_model_name}`;

  document.getElementById("place-metric-acc").textContent = `${best.accuracy}%`;
  document.getElementById("place-metric-prec").textContent = `${best.precision_macro}%`;
  document.getElementById("place-metric-rec").textContent = `${best.recall_macro}%`;
  document.getElementById("place-metric-f1").textContent = `${best.f1_macro}%`;

  // Comparison Table
  const tbody = document.getElementById("place-comparison-tbody");
  if (tbody) {
    tbody.innerHTML = placeData.models_comparison.map(m => {
      const isBest = m.model_name === placeData.best_model_name;
      return `
        <tr style="${isBest ? 'background: rgba(16, 185, 129, 0.08); font-weight: 600;' : ''}">
          <td>
            <strong style="color: #fff;">${m.model_name}</strong>
          </td>
          <td>${m.accuracy}%</td>
          <td>${m.precision_macro}%</td>
          <td>${m.recall_macro}%</td>
          <td><strong style="color: var(--accent-amber);">${m.f1_macro}%</strong></td>
          <td>${m.f1_weighted}%</td>
          <td>
            ${isBest 
              ? `<span class="pill-sm pill-eligible">🏆 Selected Best</span>`
              : `<span class="badge-tag">Evaluated</span>`
            }
          </td>
        </tr>
      `;
    }).join("");
  }

  // Render Confusion Matrix
  renderConfusionMatrixHtml("place-cm-container", best.confusion_matrix, best.classes, "Placement Readiness");

  // Render Per-Class Chart
  renderPlacementClassChart(best.classification_report, best.classes);
}

function renderConfusionMatrixHtml(containerId, cm, classes, targetTitle) {
  const container = document.getElementById(containerId);
  if (!container || !cm) return;

  let tableHtml = `
    <div class="cm-table-container">
      <div style="font-size: 0.75rem; color: var(--text-muted); text-align: center; margin-bottom: 0.5rem; text-transform: uppercase; letter-spacing: 0.05em;">
        Horizontal: Predicted Class → | Vertical: Actual Ground Truth ↓
      </div>
      <table class="cm-matrix">
        <thead>
          <tr>
            <th class="cm-header-cell">Actual \\ Pred</th>
            ${classes.map(c => `<th class="cm-header-cell">${c}</th>`).join("")}
          </tr>
        </thead>
        <tbody>
  `;

  for (let r = 0; r < classes.length; r++) {
    tableHtml += `<tr><td class="cm-header-cell" style="text-align: right; padding-right: 0.75rem;">${classes[r]}</td>`;
    for (let c = 0; c < classes.length; c++) {
      const val = cm[r][c];
      const isDiag = r === c;
      const cellClass = isDiag 
        ? "cm-cell diagonal" 
        : (val > 0 ? "cm-cell misclassified" : "cm-cell off-diagonal");

      tableHtml += `
        <td>
          <div class="${cellClass}">
            <span>${val}</span>
            <small style="font-size: 0.65rem; font-weight: 500; opacity: 0.85;">${isDiag ? 'Correct' : (val > 0 ? 'Error' : '0')}</small>
          </div>
        </td>
      `;
    }
    tableHtml += `</tr>`;
  }

  tableHtml += `
        </tbody>
      </table>
    </div>
  `;

  container.innerHTML = tableHtml;
}

function renderAttendanceClassChart(report, classes) {
  const ctx = document.getElementById("attClassChart");
  if (!ctx || !report) return;
  if (attChartInstance) attChartInstance.destroy();

  const precisions = classes.map(c => Math.round((report[c]?.precision || 0) * 100));
  const recalls = classes.map(c => Math.round((report[c]?.recall || 0) * 100));
  const f1s = classes.map(c => Math.round((report[c]?.['f1-score'] || 0) * 100));

  attChartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: classes,
      datasets: [
        { label: 'Precision (%)', data: precisions, backgroundColor: '#06b6d4', borderRadius: 4 },
        { label: 'Recall (%)', data: recalls, backgroundColor: '#10b981', borderRadius: 4 },
        { label: 'F1-Score (%)', data: f1s, backgroundColor: '#f59e0b', borderRadius: 4 },
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { position: 'bottom', labels: { color: '#94a3b8' } } },
      scales: {
        y: { beginAtZero: true, max: 100, grid: { color: '#334155' }, ticks: { color: '#94a3b8' } },
        x: { grid: { display: false }, ticks: { color: '#94a3b8' } }
      }
    }
  });
}

function renderPlacementClassChart(report, classes) {
  const ctx = document.getElementById("placeClassChart");
  if (!ctx || !report) return;
  if (placeChartInstance) placeChartInstance.destroy();

  const precisions = classes.map(c => Math.round((report[c]?.precision || 0) * 100));
  const recalls = classes.map(c => Math.round((report[c]?.recall || 0) * 100));
  const f1s = classes.map(c => Math.round((report[c]?.['f1-score'] || 0) * 100));

  placeChartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: classes,
      datasets: [
        { label: 'Precision (%)', data: precisions, backgroundColor: '#06b6d4', borderRadius: 4 },
        { label: 'Recall (%)', data: recalls, backgroundColor: '#10b981', borderRadius: 4 },
        { label: 'F1-Score (%)', data: f1s, backgroundColor: '#f59e0b', borderRadius: 4 },
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { position: 'bottom', labels: { color: '#94a3b8' } } },
      scales: {
        y: { beginAtZero: true, max: 100, grid: { color: '#334155' }, ticks: { color: '#94a3b8' } },
        x: { grid: { display: false }, ticks: { color: '#94a3b8' } }
      }
    }
  });
}

window.switchMLTab = function(tab) {
  document.querySelectorAll(".filter-tabs .filter-tab-btn").forEach(btn => btn.classList.remove("active"));
  document.querySelectorAll(".ml-tab-content").forEach(c => c.style.display = "none");

  const activeBtn = document.getElementById(`tab-btn-${tab}`);
  if (activeBtn) activeBtn.classList.add("active");

  const activeContent = document.getElementById(`tab-content-${tab}`);
  if (activeContent) activeContent.style.display = "block";
};

// ----------------- LIVE PREDICTION ACTIONS -----------------
window.runComprehensivePrediction = async function() {
  await Promise.all([
    runAttendancePredictionOnly(),
    runPlacementPredictionOnly()
  ]);
  // Increment counter in UI
  const currentCount = parseInt(document.getElementById("stat-predictions-count").textContent) || 0;
  document.getElementById("stat-predictions-count").textContent = currentCount + 2;
};

window.runAttendancePredictionOnly = async function() {
  const tc = parseInt(document.getElementById("input-att-total").value);
  const ca = parseInt(document.getElementById("input-att-attended").value);
  const prev = parseFloat(document.getElementById("input-att-prev").value);
  const recent = parseFloat(document.getElementById("input-att-recent").value);

  const payload = {
    total_classes: tc,
    classes_attended: ca,
    previous_attendance: prev,
    recent_attendance: recent
  };

  try {
    const res = await API.predictAttendanceRisk(payload);
    renderAttendanceOutputCard(res);
  } catch (err) {
    alert("Attendance risk prediction failed: " + err.message);
  }
};

window.runPlacementPredictionOnly = async function() {
  const cgpa = parseFloat(document.getElementById("input-place-cgpa").value);
  const att = parseFloat(document.getElementById("input-place-att").value);
  const proj = parseInt(document.getElementById("input-place-projects").value);
  const certs = parseInt(document.getElementById("input-place-certs").value);
  const intern = document.getElementById("input-place-intern").value;
  const skills = parseInt(document.getElementById("input-place-skills").value);
  const backlogs = parseInt(document.getElementById("input-place-backlogs").value);
  const profiles = parseInt(document.getElementById("input-place-profiles").value);

  const payload = {
    attendance: att,
    cgpa: cgpa,
    number_of_projects: proj,
    certifications: certs,
    internship: intern,
    technical_skills_count: skills,
    backlog_count: backlogs,
    github_portfolio_availability: profiles
  };

  try {
    const res = await API.predictPlacementReadiness(payload);
    renderPlacementOutputCard(res);
  } catch (err) {
    alert("Placement readiness prediction failed: " + err.message);
  }
};

function renderAttendanceOutputCard(data) {
  const card = document.getElementById("output-att-card");
  const tierEl = document.getElementById("output-att-tier");
  const confEl = document.getElementById("output-att-confidence");
  const probsContainer = document.getElementById("output-att-probs");
  const factorsContainer = document.getElementById("output-att-factors");

  if (!card) return;

  const risk = data.predicted_risk;
  let color = "#34d399";
  let borderCol = "rgba(16, 185, 129, 0.4)";
  let bgCol = "rgba(16, 185, 129, 0.1)";

  if (risk === "High") {
    color = "#f87171";
    borderCol = "rgba(239, 68, 68, 0.4)";
    bgCol = "rgba(239, 68, 68, 0.1)";
  } else if (risk === "Medium") {
    color = "#fbbf24";
    borderCol = "rgba(245, 158, 11, 0.4)";
    bgCol = "rgba(245, 158, 11, 0.1)";
  }

  card.style.borderColor = borderCol;
  card.style.background = bgCol;

  tierEl.textContent = `${risk} Risk`;
  tierEl.style.color = color;

  confEl.innerHTML = `Model: <strong>${data.model_used}</strong> • Confidence: <strong style="color: #fff;">${(data.confidence * 100).toFixed(1)}%</strong>`;

  // Render Probabilities
  let probsHtml = `<strong style="font-size: 0.82rem; color: #fff; display: block; margin-bottom: 0.4rem;">Class Probabilities:</strong>`;
  for (const [cls, prob] of Object.entries(data.class_probabilities || {})) {
    const pct = Math.round(prob * 100);
    let barColor = cls === 'Low' ? '#10b981' : (cls === 'Medium' ? '#f59e0b' : '#ef4444');
    probsHtml += `
      <div class="prob-item">
        <div class="prob-header">
          <span>${cls} Risk</span>
          <strong>${pct}%</strong>
        </div>
        <div class="prob-bar-track">
          <div class="prob-bar-fill" style="width: ${pct}%; background: ${barColor};"></div>
        </div>
      </div>
    `;
  }
  probsContainer.innerHTML = probsHtml;

  // Render Factors
  let factorsHtml = `<strong style="font-size: 0.82rem; color: #fff; display: block; margin-bottom: 0.35rem;">Key Driving Factors:</strong><ul style="padding-left: 1.25rem;">`;
  (data.key_factors || []).forEach(f => {
    factorsHtml += `<li>${f}</li>`;
  });
  factorsHtml += `</ul>`;
  factorsContainer.innerHTML = factorsHtml;
}

function renderPlacementOutputCard(data) {
  const card = document.getElementById("output-place-card");
  const tierEl = document.getElementById("output-place-tier");
  const confEl = document.getElementById("output-place-confidence");
  const probsContainer = document.getElementById("output-place-probs");
  const factorsContainer = document.getElementById("output-place-factors");

  if (!card) return;

  const tier = data.readiness_category;
  let color = "#34d399";
  let borderCol = "rgba(16, 185, 129, 0.4)";
  let bgCol = "rgba(16, 185, 129, 0.1)";

  if (tier === "Low Readiness") {
    color = "#f87171";
    borderCol = "rgba(239, 68, 68, 0.4)";
    bgCol = "rgba(239, 68, 68, 0.1)";
  } else if (tier === "Medium Readiness") {
    color = "#fbbf24";
    borderCol = "rgba(245, 158, 11, 0.4)";
    bgCol = "rgba(245, 158, 11, 0.1)";
  }

  card.style.borderColor = borderCol;
  card.style.background = bgCol;

  tierEl.textContent = tier;
  tierEl.style.color = color;

  confEl.innerHTML = `Model: <strong>${data.model_used}</strong> • Confidence: <strong style="color: #fff;">${(data.confidence * 100).toFixed(1)}%</strong>`;

  // Render Probabilities
  let probsHtml = `<strong style="font-size: 0.82rem; color: #fff; display: block; margin-bottom: 0.4rem;">Class Probabilities:</strong>`;
  for (const [cls, prob] of Object.entries(data.class_probabilities || {})) {
    const pct = Math.round(prob * 100);
    let barColor = cls === 'High Readiness' ? '#10b981' : (cls === 'Medium Readiness' ? '#f59e0b' : '#ef4444');
    probsHtml += `
      <div class="prob-item">
        <div class="prob-header">
          <span>${cls}</span>
          <strong>${pct}%</strong>
        </div>
        <div class="prob-bar-track">
          <div class="prob-bar-fill" style="width: ${pct}%; background: ${barColor};"></div>
        </div>
      </div>
    `;
  }
  probsContainer.innerHTML = probsHtml;

  // Render Factors
  let factorsHtml = `<strong style="font-size: 0.82rem; color: #fff; display: block; margin-bottom: 0.35rem;">Key Factors:</strong><ul style="padding-left: 1.25rem;">`;
  (data.key_factors || []).forEach(f => {
    factorsHtml += `<li>${f}</li>`;
  });
  factorsHtml += `</ul>`;
  factorsContainer.innerHTML = factorsHtml;
}
