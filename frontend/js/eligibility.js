/**
 * Placement Eligibility Engine Controller
 * Evaluates individual student against company placement criteria across 7 metrics.
 */

let allStudents = [];
let allDrives = [];
let currentEvaluation = null;
let currentFilter = 'all'; // 'all', 'passed', 'failed'

document.addEventListener("DOMContentLoaded", async () => {
  await window.updateBackendStatus();
  await loadDropdownData();

  // URL Query Parameters support: ?student_id=1&drive_id=2
  const urlParams = new URLSearchParams(window.location.search);
  const studentParam = urlParams.get("student_id");
  const driveParam = urlParams.get("drive_id");

  if (studentParam) {
    const studentSelect = document.getElementById("select-student");
    if (studentSelect) studentSelect.value = studentParam;
  }

  if (driveParam) {
    const driveSelect = document.getElementById("select-drive");
    if (driveSelect) driveSelect.value = driveParam;
  }

  updateStudentPreview();
  updateDrivePreview();

  // If both are present, auto run evaluation
  if (document.getElementById("select-student")?.value && document.getElementById("select-drive")?.value) {
    runEvaluation();
  }

  // Event Listeners
  document.getElementById("select-student")?.addEventListener("change", () => {
    updateStudentPreview();
    if (document.getElementById("select-drive")?.value) {
      runEvaluation();
    }
  });

  document.getElementById("select-drive")?.addEventListener("change", () => {
    updateDrivePreview();
    if (document.getElementById("select-student")?.value) {
      runEvaluation();
    }
  });

  document.getElementById("btn-run-evaluation")?.addEventListener("click", runEvaluation);

  // Modal close handlers
  document.getElementById("closeAllDrivesModal")?.addEventListener("click", () => {
    document.getElementById("allDrivesModal")?.classList.remove("active");
  });
});

async function loadDropdownData() {
  try {
    const [students, drives] = await Promise.all([
      API.getStudents(),
      API.getPlacementDrives()
    ]);

    allStudents = students || [];
    allDrives = drives || [];

    // Populate Students Dropdown
    const studentSelect = document.getElementById("select-student");
    if (studentSelect) {
      studentSelect.innerHTML = `<option value="">-- Choose Candidate (${allStudents.length} Students) --</option>`;
      allStudents.forEach(s => {
        const opt = document.createElement("option");
        opt.value = s.id;
        opt.textContent = `${s.student_id} - ${s.name} (${s.branch}) | CGPA: ${s.cgpa} | Att: ${s.attendance_percentage}%`;
        studentSelect.appendChild(opt);
      });
    }

    // Populate Drives Dropdown
    const driveSelect = document.getElementById("select-drive");
    if (driveSelect) {
      driveSelect.innerHTML = `<option value="">-- Choose Placement Drive (${allDrives.length} Drives) --</option>`;
      allDrives.forEach(d => {
        const opt = document.createElement("option");
        opt.value = d.id;
        opt.textContent = `${d.company_name} - ${d.job_role} | ${d.package_lpa} LPA | Min CGPA: ${d.min_cgpa}`;
        driveSelect.appendChild(opt);
      });
    }

  } catch (err) {
    console.error("Failed to load initial dropdown data:", err);
  }
}

function updateStudentPreview() {
  const select = document.getElementById("select-student");
  const preview = document.getElementById("student-preview");
  if (!select || !preview) return;

  const studentId = parseInt(select.value);
  if (!studentId) {
    preview.innerHTML = `<div style="font-size: 0.8rem; color: var(--text-muted); text-align: center;">Select a student to view academic profile</div>`;
    return;
  }

  const s = allStudents.find(item => item.id === studentId);
  if (!s) return;

  preview.innerHTML = `
    <div style="font-weight: 700; color: #fff; margin-bottom: 0.4rem; display: flex; justify-content: space-between; align-items: center;">
      <span>${s.name} <small style="color: var(--accent-cyan);">(${s.student_id})</small></span>
      <span class="pill-sm" style="background: rgba(79, 70, 229, 0.2); color: #a5b4fc;">${s.branch}</span>
    </div>
    <div class="preview-detail-row">
      <span>CGPA & Attendance:</span>
      <span>${s.cgpa.toFixed(2)} CGPA • ${s.attendance_percentage}%</span>
    </div>
    <div class="preview-detail-row">
      <span>Active Backlogs:</span>
      <span style="color: ${s.backlogs > 0 ? 'var(--accent-rose)' : 'var(--accent-emerald)'}; font-weight: 700;">
        ${s.backlogs === 0 ? '0 (Clean Record)' : `${s.backlogs} Active`}
      </span>
    </div>
    <div class="preview-detail-row">
      <span>Projects & Certs:</span>
      <span>${s.number_of_projects} Projects • ${s.certifications} Certs</span>
    </div>
    <div class="preview-detail-row">
      <span>Internship:</span>
      <span>${s.internship || 'None'}</span>
    </div>
    <div class="preview-detail-row" style="border-bottom: none;">
      <span>Technical Skills:</span>
      <span style="color: #cbd5e1; font-size: 0.8rem; max-width: 60%; text-align: right; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
        ${s.technical_skills || 'None'}
      </span>
    </div>
  `;
}

function updateDrivePreview() {
  const select = document.getElementById("select-drive");
  const preview = document.getElementById("drive-preview");
  if (!select || !preview) return;

  const driveId = parseInt(select.value);
  if (!driveId) {
    preview.innerHTML = `<div style="font-size: 0.8rem; color: var(--text-muted); text-align: center;">Select a drive to view criteria thresholds</div>`;
    return;
  }

  const d = allDrives.find(item => item.id === driveId);
  if (!d) return;

  preview.innerHTML = `
    <div style="font-weight: 700; color: #fff; margin-bottom: 0.4rem; display: flex; justify-content: space-between; align-items: center;">
      <span>${d.company_name} <small style="color: var(--accent-amber);">(${d.job_role})</small></span>
      <span class="pill-sm" style="background: rgba(16, 185, 129, 0.2); color: #34d399;">${d.package_lpa} LPA</span>
    </div>
    <div class="preview-detail-row">
      <span>Min CGPA & Attendance:</span>
      <span>≥ ${d.min_cgpa.toFixed(2)} CGPA • ≥ ${d.min_attendance}% Att.</span>
    </div>
    <div class="preview-detail-row">
      <span>Max Backlogs Allowed:</span>
      <span>≤ ${d.max_backlogs}</span>
    </div>
    <div class="preview-detail-row">
      <span>Required Skills:</span>
      <span style="color: #cbd5e1;">${d.required_skills || 'None specified'}</span>
    </div>
    <div class="preview-detail-row">
      <span>Min Projects & Certs:</span>
      <span>≥ ${d.min_projects || 0} Projects • ≥ ${d.min_certifications || 0} Certs</span>
    </div>
    <div class="preview-detail-row" style="border-bottom: none;">
      <span>Internship Prerequisite:</span>
      <span>${(d.internship_required || 'No').toLowerCase() === 'yes' ? 'Mandatory (Yes)' : 'Not Required'}</span>
    </div>
  `;
}

async function runEvaluation() {
  const studentSelect = document.getElementById("select-student");
  const driveSelect = document.getElementById("select-drive");
  const studentId = parseInt(studentSelect?.value);
  const driveId = parseInt(driveSelect?.value);

  if (!studentId || !driveId) {
    alert("Please select both a student candidate and a placement drive.");
    return;
  }

  const loadingEl = document.getElementById("evaluation-loading");
  const placeholderEl = document.getElementById("evaluation-placeholder");
  const resultContainer = document.getElementById("evaluation-result");

  if (placeholderEl) placeholderEl.style.display = "none";
  if (resultContainer) resultContainer.style.display = "none";
  if (loadingEl) loadingEl.style.display = "block";

  try {
    const evalData = await API.evaluateEligibility(studentId, driveId);
    currentEvaluation = evalData;
    currentFilter = 'all';

    renderEvaluationResult(evalData);

    if (loadingEl) loadingEl.style.display = "none";
    if (resultContainer) resultContainer.style.display = "block";

  } catch (err) {
    if (loadingEl) loadingEl.style.display = "none";
    if (placeholderEl) placeholderEl.style.display = "block";
    alert("Evaluation failed: " + err.message);
  }
}

function renderEvaluationResult(data) {
  const container = document.getElementById("result-card-container");
  if (!container) return;

  const isEligible = data.is_eligible;
  const cardClass = isEligible ? "eligible" : "ineligible";
  const badgeClass = isEligible ? "status-badge-lg eligible" : "status-badge-lg ineligible";
  const headlineClass = isEligible ? "result-headline headline-eligible" : "result-headline headline-ineligible";

  // Reasons list HTML (formatted exactly per prompt specification)
  const reasonsHtml = data.reasons.map(r => {
    const isPassed = r.includes("✅") && !r.includes("❌");
    const itemClass = isPassed ? "reason-item passed" : "reason-item failed";
    return `<li class="${itemClass}"><span>${isPassed ? '✅' : '❌'}</span> <span>${r}</span></li>`;
  }).join("");

  container.innerHTML = `
    <div class="result-card ${cardClass}">
      
      <!-- Top Banner -->
      <div class="result-banner">
        <div>
          <div style="font-size: 0.85rem; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.05em; font-weight: 700;">
            Evaluation Outcome • ${data.student_roll}
          </div>
          <div class="${headlineClass}">
            ${data.verdict_badge}
          </div>
          <div style="font-size: 1.05rem; color: var(--text-primary); font-weight: 600;">
            Candidate: <strong style="color: #fff;">${data.student_name}</strong> (${data.student_branch})
            <span style="color: var(--text-muted); margin: 0 0.5rem;">|</span>
            Company: <strong style="color: var(--accent-cyan);">${data.company_name}</strong> — ${data.job_role} (${data.package_lpa} LPA)
          </div>
        </div>

        <div>
          <div class="${badgeClass}">
            <span>${isEligible ? '✅' : '❌'}</span>
            <span>${data.status}</span>
          </div>
        </div>
      </div>

      <!-- Itemized Reasons Section (User Prompt Specification) -->
      <div class="reasons-box">
        <div class="reasons-title">
          <span>📋</span>
          <span>Screening Breakdown:</span>
        </div>
        <ul class="reasons-list">
          ${reasonsHtml}
        </ul>
      </div>

      <!-- Criteria Matrix Controls & Filter Tabs -->
      <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.75rem; margin-bottom: 1rem;">
        <div>
          <h3 style="font-size: 1.05rem; font-weight: 700; color: #fff;">Detailed 7-Point Criteria Scorecard</h3>
          <p style="font-size: 0.8rem; color: var(--text-secondary);">Direct comparison of student record against company cutoff requirements</p>
        </div>

        <div class="filter-tabs" style="margin-bottom: 0;">
          <button class="filter-tab-btn ${currentFilter === 'all' ? 'active' : ''}" onclick="setCriteriaFilter('all')">
            All Criteria (${data.all_criteria.length})
          </button>
          <button class="filter-tab-btn ${currentFilter === 'passed' ? 'active' : ''}" onclick="setCriteriaFilter('passed')">
            Passed (${data.passed_criteria.length} ✅)
          </button>
          <button class="filter-tab-btn ${currentFilter === 'failed' ? 'active' : ''}" onclick="setCriteriaFilter('failed')">
            Failed (${data.failed_criteria.length} ❌)
          </button>
        </div>
      </div>

      <!-- 7 Criteria Cards Grid -->
      <div id="criteria-grid-container" class="criteria-grid">
        <!-- Injected via renderCriteriaCards -->
      </div>

      <!-- Quick Action Buttons -->
      <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem; margin-top: 1.5rem; padding-top: 1.25rem; border-top: 1px solid rgba(255, 255, 255, 0.08);">
        <div style="display: flex; gap: 0.75rem; flex-wrap: wrap;">
          <a href="drive-candidates.html?drive_id=${data.drive_id}" class="btn btn-primary btn-sm">
            👥 View All Candidates for ${data.company_name}
          </a>
          <button class="btn btn-secondary btn-sm" onclick="openStudentAllDrivesModal(${data.student_id})">
            📋 Check ${data.student_name} Across All Drives
          </button>
        </div>

        <div style="font-size: 0.8rem; color: var(--text-muted);">
          Drive Screening Rule: <strong>100% of Mandatory Thresholds Required</strong>
        </div>
      </div>

      <!-- Mandatory Selection Disclaimer Banner -->
      <div class="disclaimer-banner" style="margin-top: 1.5rem;">
        <div class="icon">⚠️</div>
        <div>
          <strong>Mandatory Recruitment Disclaimer:</strong>
          ${data.disclaimer}
        </div>
      </div>

    </div>
  `;

  renderCriteriaCards();
}

window.setCriteriaFilter = function(filter) {
  currentFilter = filter;
  // Update button active state
  document.querySelectorAll(".filter-tabs .filter-tab-btn").forEach(btn => {
    btn.classList.remove("active");
  });
  const activeBtn = Array.from(document.querySelectorAll(".filter-tabs .filter-tab-btn"))
    .find(b => b.textContent.toLowerCase().includes(filter));
  if (activeBtn) activeBtn.classList.add("active");

  renderCriteriaCards();
};

function renderCriteriaCards() {
  const gridContainer = document.getElementById("criteria-grid-container");
  if (!gridContainer || !currentEvaluation) return;

  let list = currentEvaluation.all_criteria;
  if (currentFilter === 'passed') {
    list = currentEvaluation.passed_criteria;
  } else if (currentFilter === 'failed') {
    list = currentEvaluation.failed_criteria;
  }

  if (list.length === 0) {
    gridContainer.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 2rem; color: var(--text-muted); background: rgba(15, 23, 42, 0.5); border-radius: var(--radius-md);">
        No criteria in this category.
      </div>
    `;
    return;
  }

  gridContainer.innerHTML = list.map(c => {
    const cardClass = c.passed ? "criteria-card passed" : "criteria-card failed";
    const statusText = c.passed ? "Criteria Satisfied" : "Requirement Not Met";
    const statusColor = c.passed ? "#34d399" : "#f87171";

    return `
      <div class="${cardClass}">
        <div class="criteria-top">
          <span class="criteria-name">${c.criterion}</span>
          <span class="criteria-icon">${c.icon}</span>
        </div>
        <div class="criteria-stat">${c.student_value}</div>
        <div class="criteria-req">Cutoff Requirement: <strong>${c.required_value}</strong></div>
        <div style="font-size: 0.74rem; font-weight: 700; color: ${statusColor}; margin-top: 0.65rem; padding-top: 0.5rem; border-top: 1px solid rgba(255, 255, 255, 0.05);">
          ${statusText}
        </div>
      </div>
    `;
  }).join("");
}

// Open modal showing one student's evaluation across all placement drives
window.openStudentAllDrivesModal = async function(studentId) {
  const modal = document.getElementById("allDrivesModal");
  const modalBody = document.getElementById("all-drives-modal-body");
  const modalSub = document.getElementById("all-drives-modal-subtitle");
  if (!modal || !modalBody) return;

  modal.classList.add("active");
  modalBody.innerHTML = `<div style="text-align: center; padding: 2rem; color: var(--text-muted);">Evaluating candidate across all drives...</div>`;

  try {
    const report = await API.getStudentDrivesEvaluation(studentId);
    if (modalSub) {
      modalSub.textContent = `${report.student.name} (${report.student.student_id}) • Eligible for ${report.eligible_drives_count} of ${report.total_drives} Drives`;
    }

    modalBody.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 1rem;">
        ${report.evaluations.map(ev => {
          const isElig = ev.is_eligible;
          const borderCol = isElig ? 'rgba(16, 185, 129, 0.4)' : 'rgba(239, 68, 68, 0.4)';
          const bgCol = isElig ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.08)';

          return `
            <div style="background: ${bgCol}; border: 1px solid ${borderCol}; border-radius: var(--radius-md); padding: 1rem;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                <div>
                  <strong style="font-size: 1rem; color: #fff;">${ev.company_name}</strong>
                  <span style="color: var(--text-secondary); font-size: 0.85rem;"> — ${ev.job_role} (${ev.package_lpa} LPA)</span>
                </div>
                <span class="pill-sm ${isElig ? 'pill-eligible' : 'pill-ineligible'}">
                  ${isElig ? '✅ ELIGIBLE' : '❌ NOT ELIGIBLE'}
                </span>
              </div>

              <div style="font-size: 0.82rem; color: var(--text-secondary); margin-bottom: 0.5rem;">
                ${ev.verdict_badge}
              </div>

              <!-- Compact Reasons -->
              <div style="background: rgba(15, 23, 42, 0.7); padding: 0.5rem 0.75rem; border-radius: var(--radius-sm); font-size: 0.8rem; display: flex; flex-direction: column; gap: 0.25rem;">
                ${ev.reasons.map(r => `<div>${r}</div>`).join("")}
              </div>
            </div>
          `;
        }).join("")}
      </div>

      <div class="disclaimer-banner" style="margin-top: 1.25rem;">
        <div class="icon">⚠️</div>
        <div style="font-size: 0.78rem;">${report.disclaimer}</div>
      </div>
    `;

  } catch (err) {
    modalBody.innerHTML = `<div style="text-align: center; color: var(--accent-rose); padding: 2rem;">Error: ${err.message}</div>`;
  }
};
