/**
 * Student Comprehensive Dashboard & Personalized Recommendations Controller
 * Coordinates profile data, subject-wise attendance, ML inferences, drive eligibility,
 * and actionable improvement suggestions.
 */

let currentStudentId = null;
let allRecommendations = [];
let allStudents = [];

document.addEventListener("DOMContentLoaded", async () => {
  await window.updateBackendStatus();
  await loadStudentsList();

  // Read student ID from URL query parameters (e.g., ?id=8)
  const urlParams = new URLSearchParams(window.location.search);
  const paramId = parseInt(urlParams.get("id"));

  if (paramId && allStudents.some(s => s.id === paramId)) {
    currentStudentId = paramId;
  } else if (allStudents.length > 0) {
    currentStudentId = allStudents[0].id;
  }

  const selector = document.getElementById("student-selector");
  if (selector && currentStudentId) {
    selector.value = currentStudentId;
  }

  if (currentStudentId) {
    await loadStudentDashboardData(currentStudentId);
  }
});

async function loadStudentsList() {
  try {
    const students = await API.getStudents();
    allStudents = students || [];

    const selector = document.getElementById("student-selector");
    if (!selector) return;

    selector.innerHTML = "";
    allStudents.forEach(s => {
      const opt = document.createElement("option");
      opt.value = s.id;
      opt.textContent = `${s.student_id} - ${s.name} (${s.branch}) | CGPA: ${s.cgpa} | Att: ${s.attendance_percentage}%`;
      selector.appendChild(opt);
    });
  } catch (err) {
    console.error("Failed to load students list:", err);
  }
}

function handleStudentChange() {
  const selector = document.getElementById("student-selector");
  const selectedId = parseInt(selector.value);
  if (!selectedId) return;

  currentStudentId = selectedId;
  // Update browser URL query parameter without full reload
  const newUrl = `${window.location.pathname}?id=${selectedId}`;
  window.history.replaceState({ path: newUrl }, "", newUrl);

  loadStudentDashboardData(selectedId);
}

async function loadStudentDashboardData(studentId) {
  try {
    const data = await API.getStudentDashboard(studentId);
    if (!data) return;

    // 1. Render Student Profile Hero
    renderStudentProfile(data.student, data.attendance, data.academic_performance, data.ml_predictions);

    // 2. Render Attendance & Subject Breakdown
    renderAttendanceSection(data.attendance);

    // 3. Render Academic & Portfolio Card
    renderAcademicSection(data.academic_performance, data.student);

    // 4. Render Machine Learning Predictions
    renderMLPredictions(data.ml_predictions);

    // 5. Render Recommendations
    allRecommendations = data.recommendations.items || [];
    renderRecommendations(allRecommendations);

    // 6. Render Placement Drives (Eligible & Ineligible)
    renderPlacementDrives(data.placement);

  } catch (err) {
    console.error("Error loading student dashboard:", err);
  }
}

function renderStudentProfile(student, attendance, academics, ml) {
  // Avatar initials
  const initials = student.name.split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase();
  document.getElementById("stu-avatar").textContent = initials || "ST";

  document.getElementById("stu-name").textContent = student.name;
  document.getElementById("stu-roll").textContent = student.student_id;
  document.getElementById("stu-branch-year").textContent = `${student.branch} • Year ${student.year}`;
  document.getElementById("stu-email").textContent = student.email;

  // Placement status badge
  const statusBadge = document.getElementById("stu-placement-status-badge");
  statusBadge.textContent = student.placement_status || "Eligible";
  statusBadge.className = student.placement_status === "Placed" ? "pill-sm pill-placed" : "badge-tag";

  // Badges
  const githubBadge = document.getElementById("stu-github-badge");
  if (student.github_profile && student.github_profile.trim()) {
    githubBadge.className = "pill-sm pill-eligible";
    githubBadge.textContent = "🐙 GitHub Verified";
  } else {
    githubBadge.className = "pill-sm pill-ineligible";
    githubBadge.textContent = "🐙 GitHub Missing";
  }

  const portBadge = document.getElementById("stu-portfolio-badge");
  if (student.portfolio_profile && student.portfolio_profile.trim()) {
    portBadge.className = "pill-sm pill-eligible";
    portBadge.textContent = "🌐 Live Portfolio";
  } else {
    portBadge.className = "pill-sm pill-ineligible";
    portBadge.textContent = "🌐 Portfolio Missing";
  }

  const backlogsBadge = document.getElementById("stu-backlogs-badge");
  if (student.backlogs === 0) {
    backlogsBadge.className = "pill-sm pill-eligible";
    backlogsBadge.textContent = "✅ 0 Backlogs";
  } else {
    backlogsBadge.className = "pill-sm pill-ineligible";
    backlogsBadge.textContent = `⚠️ ${student.backlogs} Active Backlog(s)`;
  }

  // Hero Quick Stats
  const attPct = attendance.overall_percentage;
  const heroAtt = document.getElementById("hero-stat-att");
  heroAtt.textContent = `${attPct}%`;
  heroAtt.style.color = attPct >= 75 ? "var(--accent-emerald)" : "var(--accent-rose)";

  document.getElementById("hero-stat-cgpa").textContent = student.cgpa.toFixed(2);
  document.getElementById("hero-stat-proj").textContent = academics.number_of_projects;
  document.getElementById("hero-stat-certs").textContent = academics.certifications;

  const readiness = ml.placement_readiness.readiness_category || "Medium Readiness";
  const heroReadiness = document.getElementById("hero-stat-readiness");
  heroReadiness.textContent = readiness;
  heroReadiness.style.color = readiness === "High Readiness" ? "var(--accent-emerald)" : (readiness === "Medium Readiness" ? "var(--accent-amber)" : "var(--accent-rose)");
}

function renderAttendanceSection(attendance) {
  const overallPct = attendance.overall_percentage;
  const overallBadge = document.getElementById("att-overall-badge");
  if (overallPct >= 85.0) {
    overallBadge.className = "pill-sm pill-eligible";
    overallBadge.textContent = `✅ ${overallPct}% (Good Standing)`;
  } else if (overallPct >= 75.0) {
    overallBadge.className = "pill-sm";
    overallBadge.style.background = "rgba(245, 158, 11, 0.2)";
    overallBadge.style.color = "#fbbf24";
    overallBadge.textContent = `⚠️ ${overallPct}% (Borderline Compliant)`;
  } else {
    overallBadge.className = "pill-sm pill-ineligible";
    overallBadge.textContent = `❌ ${overallPct}% (Defaulter <75%)`;
  }

  const tbody = document.getElementById("subject-attendance-tbody");
  if (!tbody) return;

  const subjects = attendance.subject_wise || [];
  if (subjects.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--text-muted); padding: 1.5rem;">No subject-specific attendance records found. Overall attendance: ${overallPct}%.</td></tr>`;
    return;
  }

  tbody.innerHTML = subjects.map(s => {
    const isDefaulter = s.attendance_percentage < 75.0;
    const progressColor = isDefaulter ? "#ef4444" : (s.attendance_percentage >= 85 ? "#10b981" : "#f59e0b");
    const needed = s.classes_required_for_75 || 0;

    return `
      <tr>
        <td>
          <strong style="color: #fff;">${s.subject}</strong>
        </td>
        <td>
          <span style="font-weight: 600;">${s.classes_attended}</span> / ${s.total_classes}
          <small style="color: var(--text-muted); display: block; font-size: 0.72rem;">${s.classes_missed} missed</small>
        </td>
        <td style="min-width: 130px;">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.25rem; font-size: 0.8rem;">
            <strong style="color: ${progressColor};">${s.attendance_percentage}%</strong>
          </div>
          <div class="prob-bar-track" style="height: 6px;">
            <div class="prob-bar-fill" style="width: ${Math.min(100, s.attendance_percentage)}%; background: ${progressColor};"></div>
          </div>
        </td>
        <td>
          <span class="pill-sm ${isDefaulter ? 'pill-ineligible' : 'pill-eligible'}">
            ${s.risk_level}
          </span>
        </td>
        <td>
          ${needed > 0
            ? `<span class="needed-classes-chip">⚠️ Attend next ${needed} classes</span>`
            : `<span class="needed-classes-chip safe">✅ Compliant (0 needed)</span>`
          }
        </td>
      </tr>
    `;
  }).join("");
}

function renderAcademicSection(academics, student) {
  document.getElementById("acad-cgpa-val").textContent = student.cgpa.toFixed(2);
  document.getElementById("acad-standing-text").textContent = academics.performance_standing;

  const internVal = document.getElementById("acad-intern-val");
  const isIntern = "yes" in (student.internship || "").toLowerCase() || (student.internship || "").toLowerCase().includes("yes") || (student.internship || "").toLowerCase().includes("intern");
  internVal.textContent = isIntern ? "Completed ✅" : "None ❌";
  internVal.style.color = isIntern ? "var(--accent-emerald)" : "var(--accent-rose)";

  document.getElementById("acad-proj-val").textContent = academics.number_of_projects;
  document.getElementById("acad-certs-val").textContent = academics.certifications;

  const skillsContainer = document.getElementById("acad-skills-container");
  const skills = student.technical_skills || [];
  if (skills.length > 0) {
    skillsContainer.innerHTML = skills.map(skill => `
      <span class="badge-tag" style="background: rgba(79, 70, 229, 0.15); border-color: rgba(79, 70, 229, 0.3); color: #c7d2fe;">
        ⚡ ${skill}
      </span>
    `).join("");
  } else {
    skillsContainer.innerHTML = `<span style="font-size: 0.8rem; color: var(--text-muted);">No technical skills added yet.</span>`;
  }
}

function renderMLPredictions(ml) {
  // 1. Attendance Risk
  const att = ml.attendance_risk;
  const attBadge = document.getElementById("ml-att-badge");
  attBadge.textContent = `${att.predicted_risk} Risk`;
  attBadge.className = att.predicted_risk === "High" ? "pill-sm pill-ineligible" : (att.predicted_risk === "Medium" ? "pill-sm" : "pill-sm pill-eligible");
  if (att.predicted_risk === "Medium") {
    attBadge.style.background = "rgba(245, 158, 11, 0.2)";
    attBadge.style.color = "#fbbf24";
  }

  document.getElementById("ml-att-confidence").textContent = `${Math.round(att.confidence * 100)}%`;

  const attProbsContainer = document.getElementById("ml-att-probs-container");
  attProbsContainer.innerHTML = Object.entries(att.class_probabilities || {}).map(([cls, prob]) => {
    const pct = Math.round(prob * 100);
    const col = cls === "Low" ? "#10b981" : (cls === "Medium" ? "#f59e0b" : "#ef4444");
    return `
      <div class="prob-item">
        <div class="prob-header" style="font-size: 0.78rem;">
          <span>${cls} Risk</span>
          <strong>${pct}%</strong>
        </div>
        <div class="prob-bar-track">
          <div class="prob-bar-fill" style="width: ${pct}%; background: ${col};"></div>
        </div>
      </div>
    `;
  }).join("");

  const attFactorsList = document.getElementById("ml-att-factors-list");
  attFactorsList.innerHTML = (att.key_factors || []).map(f => `<li>${f}</li>`).join("");

  // 2. Placement Readiness
  const place = ml.placement_readiness;
  const placeBadge = document.getElementById("ml-place-badge");
  placeBadge.textContent = place.readiness_category;
  placeBadge.className = place.readiness_category === "High Readiness" ? "pill-sm pill-eligible" : (place.readiness_category === "Medium Readiness" ? "pill-sm" : "pill-sm pill-ineligible");
  if (place.readiness_category === "Medium Readiness") {
    placeBadge.style.background = "rgba(245, 158, 11, 0.2)";
    placeBadge.style.color = "#fbbf24";
  }

  document.getElementById("ml-place-confidence").textContent = `${Math.round(place.confidence * 100)}%`;

  const placeProbsContainer = document.getElementById("ml-place-probs-container");
  placeProbsContainer.innerHTML = Object.entries(place.class_probabilities || {}).map(([cls, prob]) => {
    const pct = Math.round(prob * 100);
    const col = cls === "High Readiness" ? "#10b981" : (cls === "Medium Readiness" ? "#f59e0b" : "#ef4444");
    return `
      <div class="prob-item">
        <div class="prob-header" style="font-size: 0.78rem;">
          <span>${cls}</span>
          <strong>${pct}%</strong>
        </div>
        <div class="prob-bar-track">
          <div class="prob-bar-fill" style="width: ${pct}%; background: ${col};"></div>
        </div>
      </div>
    `;
  }).join("");

  const placeFactorsList = document.getElementById("ml-place-factors-list");
  placeFactorsList.innerHTML = (place.key_factors || []).map(f => `<li>${f}</li>`).join("");
}

function renderRecommendations(recs) {
  const container = document.getElementById("recommendations-container");
  const countBadge = document.getElementById("rec-count-badge");
  if (!container) return;

  countBadge.textContent = `${recs.length} Personalized Action Items`;

  if (recs.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; color: var(--text-muted); padding: 2rem;">
        🌟 Fantastic performance! No urgent recommendations at this time.
      </div>
    `;
    return;
  }

  container.innerHTML = recs.map(r => {
    let cardClass = "rec-card";
    let icon = "💡";
    if (r.type === "alert") {
      cardClass += " alert";
      icon = "⚠️";
    } else if (r.type === "warning") {
      cardClass += " warning";
      icon = "⚡";
    } else if (r.type === "success") {
      cardClass += " success";
      icon = "✅";
    } else if (r.type === "info") {
      cardClass += " info";
      icon = "ℹ️";
    }

    return `
      <div class="${cardClass}">
        <div class="rec-header">
          <div class="rec-title-wrap">
            <span>${icon}</span>
            <span>${r.title}</span>
          </div>
          <span class="rec-badge-cat">${r.category}</span>
        </div>
        <div class="rec-message">
          ${r.message}
        </div>
        <div class="rec-action-row">
          <span class="rec-metric-pill">${r.metric || ''}</span>
          <span class="rec-cta-btn">
            🎯 ${r.action_cta}
          </span>
        </div>
      </div>
    `;
  }).join("");
}

window.filterRecommendations = function(category, btn) {
  document.querySelectorAll(".filter-tabs .filter-tab-btn").forEach(b => b.classList.remove("active"));
  if (btn) btn.classList.add("active");

  if (category === "all") {
    renderRecommendations(allRecommendations);
  } else {
    const filtered = allRecommendations.filter(r => r.category === category);
    renderRecommendations(filtered);
  }
};

function renderPlacementDrives(placementData) {
  const eligible = placementData.eligible_drives || [];
  const ineligible = placementData.not_eligible_drives || [];

  document.getElementById("drives-eligible-pill").textContent = `✅ ${eligible.length} Eligible`;
  document.getElementById("drives-ineligible-pill").textContent = `❌ ${ineligible.length} Ineligible`;

  document.getElementById("count-tab-eligible").textContent = eligible.length;
  document.getElementById("count-tab-ineligible").textContent = ineligible.length;

  // 1. Eligible Drives
  const eligContainer = document.getElementById("eligible-drives-list");
  if (eligible.length === 0) {
    eligContainer.innerHTML = `
      <div style="text-align: center; color: var(--text-muted); padding: 2rem;">
        Currently not eligible for upcoming drives. Consult recommendations above to clear prerequisites.
      </div>
    `;
  } else {
    eligContainer.innerHTML = eligible.map(d => `
      <div class="student-drive-card eligible">
        <div class="drive-header-row">
          <div>
            <h3 style="font-size: 1.1rem; color: #fff; margin-bottom: 0.2rem;">
              ${d.company_name}
            </h3>
            <div style="font-size: 0.85rem; color: var(--text-secondary);">
              Role: <strong style="color: var(--accent-cyan);">${d.job_role}</strong> • Package: <strong style="color: var(--accent-emerald);">${d.package_lpa} LPA</strong> • Drive Date: ${d.drive_date}
            </div>
          </div>
          <span class="pill-sm pill-eligible">
            ✅ Eligible based on placement criteria
          </span>
        </div>

        <div style="margin-top: 0.75rem; border-top: 1px solid var(--border-color); padding-top: 0.6rem;">
          <div style="font-size: 0.78rem; font-weight: 700; color: #fff; margin-bottom: 0.35rem;">Passed Screening Requirements:</div>
          <div style="display: flex; flex-wrap: wrap; gap: 0.4rem;">
            ${(d.passed_criteria || []).map(c => `
              <span class="pill-sm pill-eligible" style="font-size: 0.72rem;">
                ${c.icon} ${c.criterion}: ${c.student_value} (${c.required_value})
              </span>
            `).join("")}
          </div>
        </div>
      </div>
    `).join("");
  }

  // 2. Not Eligible Drives
  const ineligContainer = document.getElementById("ineligible-drives-list");
  if (ineligible.length === 0) {
    ineligContainer.innerHTML = `
      <div style="text-align: center; color: var(--accent-emerald); padding: 2rem;">
        🎉 Outstanding! Student meets criteria for all registered placement drives!
      </div>
    `;
  } else {
    ineligContainer.innerHTML = ineligible.map(d => `
      <div class="student-drive-card ineligible">
        <div class="drive-header-row">
          <div>
            <h3 style="font-size: 1.1rem; color: #fff; margin-bottom: 0.2rem;">
              ${d.company_name}
            </h3>
            <div style="font-size: 0.85rem; color: var(--text-secondary);">
              Role: <strong style="color: var(--accent-cyan);">${d.job_role}</strong> • Package: <strong style="color: var(--accent-emerald);">${d.package_lpa} LPA</strong> • Drive Date: ${d.drive_date}
            </div>
          </div>
          <span class="pill-sm pill-ineligible">
            ❌ Not Eligible
          </span>
        </div>

        <div style="margin-top: 0.75rem; border-top: 1px solid var(--border-color); padding-top: 0.6rem;">
          <div style="font-size: 0.78rem; font-weight: 700; color: #f87171; margin-bottom: 0.35rem;">Failed Screening Criteria:</div>
          <ul class="drive-reasons-list">
            ${(d.failed_criteria || []).map(fc => `
              <li>
                <span style="color: #ef4444;">❌</span>
                <span><strong>${fc.criterion}</strong>: ${fc.message}</span>
              </li>
            `).join("")}
          </ul>
        </div>
      </div>
    `).join("");
  }
}

window.switchDrivesTab = function(type) {
  document.getElementById("tab-btn-eligible").classList.toggle("active", type === "eligible");
  document.getElementById("tab-btn-ineligible").classList.toggle("active", type === "ineligible");

  document.getElementById("drives-content-eligible").style.display = type === "eligible" ? "block" : "none";
  document.getElementById("drives-content-ineligible").style.display = type === "ineligible" ? "block" : "none";
};
