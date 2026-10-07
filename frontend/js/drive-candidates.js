/**
 * Drive Candidates Screening Controller
 * Displays complete cohort screening roster for any selected placement drive.
 */

let allDrives = [];
let currentReport = null;
let currentTabFilter = 'all'; // 'all', 'eligible', 'ineligible'

document.addEventListener("DOMContentLoaded", async () => {
  await window.updateBackendStatus();
  await loadDrivesDropdown();

  // URL query parameter support: ?drive_id=1
  const urlParams = new URLSearchParams(window.location.search);
  const driveParam = urlParams.get("drive_id");

  if (driveParam) {
    const select = document.getElementById("select-screening-drive");
    if (select) {
      select.value = driveParam;
      await loadDriveReport(parseInt(driveParam));
    }
  } else if (allDrives.length > 0) {
    // Default to the first drive
    const select = document.getElementById("select-screening-drive");
    if (select) {
      select.value = allDrives[0].id;
      await loadDriveReport(allDrives[0].id);
    }
  }

  // Drive select change listener
  document.getElementById("select-screening-drive")?.addEventListener("change", (e) => {
    const val = parseInt(e.target.value);
    if (val) {
      loadDriveReport(val);
    }
  });

  // Search input live filtering
  document.getElementById("roster-search")?.addEventListener("input", () => {
    renderCandidatesTable();
  });

  // Scorecard modal close
  document.getElementById("closeScorecardModal")?.addEventListener("click", () => {
    document.getElementById("scorecardModal")?.classList.remove("active");
  });
});

async function loadDrivesDropdown() {
  try {
    const drives = await API.getPlacementDrives();
    allDrives = drives || [];

    const select = document.getElementById("select-screening-drive");
    if (select) {
      select.innerHTML = `<option value="">-- Choose Placement Drive (${allDrives.length} Drives Available) --</option>`;
      allDrives.forEach(d => {
        const opt = document.createElement("option");
        opt.value = d.id;
        opt.textContent = `${d.company_name} — ${d.job_role} (${d.package_lpa} LPA) • ${d.status}`;
        select.appendChild(opt);
      });
    }
  } catch (err) {
    console.error("Failed to load drives:", err);
  }
}

async function loadDriveReport(driveId) {
  const tbody = document.getElementById("drive-candidates-tbody");
  if (tbody) {
    tbody.innerHTML = `
      <tr>
        <td colspan="12" style="text-align: center; color: var(--text-muted); padding: 2rem;">
          Evaluating student cohort against drive criteria...
        </td>
      </tr>
    `;
  }

  try {
    const report = await API.getDriveEligibilityReport(driveId);
    currentReport = report;

    // Update Criteria Strip
    renderDriveCriteriaStrip(report.drive);

    // Update KPIs
    document.getElementById("kpi-total-evaluated").textContent = report.total_evaluated;
    document.getElementById("kpi-eligible-count").textContent = report.eligible_count;
    document.getElementById("kpi-ineligible-count").textContent = report.ineligible_count;
    document.getElementById("kpi-eligibility-rate").textContent = `${report.eligibility_rate_percentage}%`;

    // Update Tab Counts
    document.getElementById("cnt-tab-all").textContent = report.total_evaluated;
    document.getElementById("cnt-tab-eligible").textContent = report.eligible_count;
    document.getElementById("cnt-tab-ineligible").textContent = report.ineligible_count;

    renderCandidatesTable();

  } catch (err) {
    if (tbody) {
      tbody.innerHTML = `
        <tr>
          <td colspan="12" style="text-align: center; color: var(--accent-rose); padding: 2rem;">
            Failed to load drive screening report: ${err.message}
          </td>
        </tr>
      `;
    }
  }
}

function renderDriveCriteriaStrip(drive) {
  const container = document.getElementById("selected-drive-criteria-strip");
  if (!container || !drive) return;

  const internReq = (drive.internship_required || "No").toLowerCase() === "yes" ? "Mandatory (Yes)" : "Not Required";

  container.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.75rem; margin-bottom: 0.75rem;">
      <div>
        <strong style="font-size: 1.1rem; color: #fff;">${drive.company_name}</strong>
        <span style="color: var(--accent-cyan); font-weight: 600;"> — ${drive.job_role}</span>
        <span class="pill-sm" style="background: rgba(16, 185, 129, 0.2); color: #34d399; margin-left: 0.5rem;">${drive.package_lpa} LPA</span>
        <span class="badge-tag" style="margin-left: 0.4rem;">${drive.status}</span>
      </div>

      <div style="font-size: 0.8rem; color: var(--text-muted);">
        Drive Date: <strong style="color: #fff;">${drive.drive_date}</strong>
      </div>
    </div>

    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 0.5rem; font-size: 0.8rem;">
      <div style="background: rgba(30, 41, 59, 0.6); padding: 0.5rem 0.75rem; border-radius: var(--radius-sm); border: 1px solid var(--border-color);">
        <span style="color: var(--text-muted); display: block;">1. Min CGPA:</span>
        <strong style="color: #fff;">≥ ${drive.min_cgpa.toFixed(2)}</strong>
      </div>

      <div style="background: rgba(30, 41, 59, 0.6); padding: 0.5rem 0.75rem; border-radius: var(--radius-sm); border: 1px solid var(--border-color);">
        <span style="color: var(--text-muted); display: block;">2. Min Attendance:</span>
        <strong style="color: #fff;">≥ ${drive.min_attendance}%</strong>
      </div>

      <div style="background: rgba(30, 41, 59, 0.6); padding: 0.5rem 0.75rem; border-radius: var(--radius-sm); border: 1px solid var(--border-color);">
        <span style="color: var(--text-muted); display: block;">3. Required Skills:</span>
        <strong style="color: #fff; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; display: block;" title="${drive.required_skills || 'None'}">
          ${drive.required_skills || 'None'}
        </strong>
      </div>

      <div style="background: rgba(30, 41, 59, 0.6); padding: 0.5rem 0.75rem; border-radius: var(--radius-sm); border: 1px solid var(--border-color);">
        <span style="color: var(--text-muted); display: block;">4. Min Projects:</span>
        <strong style="color: #fff;">≥ ${drive.min_projects || 0}</strong>
      </div>

      <div style="background: rgba(30, 41, 59, 0.6); padding: 0.5rem 0.75rem; border-radius: var(--radius-sm); border: 1px solid var(--border-color);">
        <span style="color: var(--text-muted); display: block;">5. Min Certs:</span>
        <strong style="color: #fff;">≥ ${drive.min_certifications || 0}</strong>
      </div>

      <div style="background: rgba(30, 41, 59, 0.6); padding: 0.5rem 0.75rem; border-radius: var(--radius-sm); border: 1px solid var(--border-color);">
        <span style="color: var(--text-muted); display: block;">6. Internship:</span>
        <strong style="color: #fff;">${internReq}</strong>
      </div>

      <div style="background: rgba(30, 41, 59, 0.6); padding: 0.5rem 0.75rem; border-radius: var(--radius-sm); border: 1px solid var(--border-color);">
        <span style="color: var(--text-muted); display: block;">7. Max Backlogs:</span>
        <strong style="color: #fff;">≤ ${drive.max_backlogs}</strong>
      </div>
    </div>
  `;
}

window.filterCandidates = function(tab) {
  currentTabFilter = tab;

  // Toggle active tab class
  document.querySelectorAll(".filter-tabs .filter-tab-btn").forEach(btn => btn.classList.remove("active"));
  const activeBtn = document.getElementById(`tab-${tab}`);
  if (activeBtn) activeBtn.classList.add("active");

  renderCandidatesTable();
};

function renderCandidatesTable() {
  const tbody = document.getElementById("drive-candidates-tbody");
  if (!tbody || !currentReport) return;

  const searchTerm = (document.getElementById("roster-search")?.value || "").toLowerCase().trim();

  let list = currentReport.students;

  // Tab Filtering
  if (currentTabFilter === 'eligible') {
    list = list.filter(s => s.is_eligible);
  } else if (currentTabFilter === 'ineligible') {
    list = list.filter(s => !s.is_eligible);
  }

  // Keyword Search
  if (searchTerm) {
    list = list.filter(s => 
      s.name.toLowerCase().includes(searchTerm) ||
      s.student_id.toLowerCase().includes(searchTerm) ||
      s.branch.toLowerCase().includes(searchTerm) ||
      s.technical_skills.toLowerCase().includes(searchTerm)
    );
  }

  if (list.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="12" style="text-align: center; color: var(--text-muted); padding: 2rem;">
          No candidates found matching current filter criteria.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = list.map(s => {
    const isElig = s.is_eligible;
    const statusPill = isElig 
      ? `<span class="pill-sm pill-eligible">✅ ELIGIBLE</span>`
      : `<span class="pill-sm pill-ineligible">❌ NOT ELIGIBLE</span>`;

    let reasonsSnippet = "";
    if (isElig) {
      reasonsSnippet = `<span style="color: #34d399; font-size: 0.8rem; font-weight: 600;">✅ Satisfies all 7 criteria</span>`;
    } else {
      const topReasons = s.failed_reasons.slice(0, 2).map(r => r.replace("❌", "").trim()).join(" • ");
      const extraCount = s.failed_reasons.length > 2 ? ` (+${s.failed_reasons.length - 2} more)` : "";
      reasonsSnippet = `
        <div style="color: #fca5a5; font-size: 0.78rem; line-height: 1.3;" title="${s.failed_reasons.join('\n')}">
          ${topReasons}${extraCount}
        </div>
      `;
    }

    return `
      <tr>
        <td><strong style="color: #fff; font-size: 0.82rem;">${s.student_id}</strong></td>
        <td>
          <div style="font-weight: 600; color: #fff;">${s.name}</div>
        </td>
        <td><span style="font-size: 0.8rem; color: var(--text-secondary);">${s.branch}</span></td>
        <td><strong>${s.cgpa.toFixed(2)}</strong></td>
        <td>
          <span style="color: ${s.attendance_percentage < 75 ? 'var(--accent-rose)' : 'var(--accent-emerald)'}; font-weight: 600;">
            ${s.attendance_percentage}%
          </span>
        </td>
        <td>${s.number_of_projects}</td>
        <td>${s.certifications}</td>
        <td>
          <span style="font-size: 0.78rem;">${s.internship && s.internship.toLowerCase().includes('yes') ? '✅ Yes' : 'None'}</span>
        </td>
        <td>
          <span style="color: ${s.backlogs > 0 ? 'var(--accent-rose)' : 'var(--accent-emerald)'}; font-weight: 600;">
            ${s.backlogs}
          </span>
        </td>
        <td>${statusPill}</td>
        <td style="max-width: 250px;">${reasonsSnippet}</td>
        <td style="text-align: right;">
          <div style="display: flex; gap: 0.35rem; justify-content: flex-end;">
            <button class="btn btn-secondary btn-sm" style="padding: 0.25rem 0.5rem; font-size: 0.75rem;" 
              onclick="openScorecardModal(${s.id}, ${currentReport.drive.id})">
              🔍 Scorecard
            </button>
            <a href="eligibility.html?student_id=${s.id}&drive_id=${currentReport.drive.id}" class="btn btn-primary btn-sm" style="padding: 0.25rem 0.5rem; font-size: 0.75rem;" title="Open in 1-on-1 Evaluator">
              🎯
            </a>
          </div>
        </td>
      </tr>
    `;
  }).join("");
}

// Open individual scorecard modal
window.openScorecardModal = async function(studentId, driveId) {
  const modal = document.getElementById("scorecardModal");
  const modalBody = document.getElementById("scorecard-modal-body");
  const modalTitle = document.getElementById("scorecard-modal-title");
  const modalSub = document.getElementById("scorecard-modal-subtitle");
  if (!modal || !modalBody) return;

  modal.classList.add("active");
  modalBody.innerHTML = `<div style="text-align: center; padding: 2rem; color: var(--text-muted);">Loading evaluation...</div>`;

  try {
    const data = await API.evaluateEligibility(studentId, driveId);

    if (modalTitle) modalTitle.textContent = `${data.student_name} vs. ${data.company_name}`;
    if (modalSub) modalSub.textContent = `Status: ${data.status} • ${data.verdict_badge}`;

    const reasonsHtml = data.reasons.map(r => {
      const isPassed = r.includes("✅") && !r.includes("❌");
      return `
        <li style="display: flex; align-items: center; gap: 0.5rem; font-size: 0.85rem; color: ${isPassed ? '#a7f3d0' : '#fca5a5'}; padding: 0.35rem 0;">
          <span>${isPassed ? '✅' : '❌'}</span>
          <span>${r}</span>
        </li>
      `;
    }).join("");

    modalBody.innerHTML = `
      <div style="margin-bottom: 1rem; padding: 0.85rem; border-radius: var(--radius-sm); background: ${data.is_eligible ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)'}; border: 1px solid ${data.is_eligible ? 'rgba(16, 185, 129, 0.4)' : 'rgba(239, 68, 68, 0.4)'};">
        <div style="font-size: 1.1rem; font-weight: 800; color: ${data.is_eligible ? '#34d399' : '#f87171'};">
          ${data.verdict_badge}
        </div>
        <div style="font-size: 0.82rem; color: var(--text-secondary); margin-top: 0.2rem;">
          ${data.student_name} (${data.student_roll}) meets ${data.passed_criteria.length} of 7 mandatory recruitment criteria for ${data.company_name} (${data.job_role}).
        </div>
      </div>

      <div style="background: rgba(15, 23, 42, 0.8); border: 1px solid var(--border-color); border-radius: var(--radius-sm); padding: 1rem; margin-bottom: 1.25rem;">
        <strong style="color: #fff; font-size: 0.88rem; display: block; margin-bottom: 0.5rem;">Criteria Verification Ledger:</strong>
        <ul style="list-style: none; padding: 0; margin: 0;">
          ${reasonsHtml}
        </ul>
      </div>

      <div class="disclaimer-banner">
        <div class="icon">⚠️</div>
        <div style="font-size: 0.78rem;">${data.disclaimer}</div>
      </div>
    `;

  } catch (err) {
    modalBody.innerHTML = `<div style="text-align: center; color: var(--accent-rose); padding: 2rem;">Error: ${err.message}</div>`;
  }
};

// Export CSV of eligible candidates
window.exportEligibleCSV = function() {
  if (!currentReport || !currentReport.students) {
    alert("No drive report available to export.");
    return;
  }

  const eligibleList = currentReport.students.filter(s => s.is_eligible);
  if (eligibleList.length === 0) {
    alert("No eligible candidates found for this drive to export.");
    return;
  }

  const drive = currentReport.drive;
  const headers = ["Roll_Number", "Name", "Branch", "CGPA", "Attendance_Pct", "Projects", "Certifications", "Internship", "Backlogs", "Company", "Job_Role", "Package_LPA", "Status"];
  
  const rows = eligibleList.map(s => [
    `"${s.student_id}"`,
    `"${s.name}"`,
    `"${s.branch}"`,
    s.cgpa,
    s.attendance_percentage,
    s.number_of_projects,
    s.certifications,
    `"${s.internship}"`,
    s.backlogs,
    `"${drive.company_name}"`,
    `"${drive.job_role}"`,
    drive.package_lpa,
    "ELIGIBLE"
  ]);

  const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `Eligible_Candidates_${drive.company_name.replace(/\s+/g, "_")}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
