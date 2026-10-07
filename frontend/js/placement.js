/**
 * Placement Drives Controller
 */

document.addEventListener("DOMContentLoaded", async () => {
  await window.updateBackendStatus();
  await loadPlacementDrives();

  // Modal setup for adding drive
  const addDriveModal = document.getElementById("addDriveModal");
  const openDriveModalBtn = document.getElementById("openAddDriveModal");
  const closeDriveModalBtn = document.getElementById("closeAddDriveModal");
  const addDriveForm = document.getElementById("addDriveForm");

  if (openDriveModalBtn && addDriveModal) {
    openDriveModalBtn.addEventListener("click", () => {
      addDriveModal.classList.add("active");
    });
  }

  if (closeDriveModalBtn && addDriveModal) {
    closeDriveModalBtn.addEventListener("click", () => {
      addDriveModal.classList.remove("active");
    });
  }

  if (addDriveForm) {
    addDriveForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const driveData = {
        company_name: document.getElementById("drive-company").value.trim(),
        job_role: document.getElementById("drive-role").value.trim(),
        package_lpa: parseFloat(document.getElementById("drive-package").value),
        min_cgpa: parseFloat(document.getElementById("drive-min-cgpa").value),
        min_attendance: parseFloat(document.getElementById("drive-min-attendance").value),
        required_skills: document.getElementById("drive-skills")?.value.trim() || "",
        min_projects: parseInt(document.getElementById("drive-min-projects")?.value || 0),
        min_certifications: parseInt(document.getElementById("drive-min-certs")?.value || 0),
        internship_required: document.getElementById("drive-internship")?.value || "No",
        max_backlogs: parseInt(document.getElementById("drive-max-backlogs").value),
        drive_date: document.getElementById("drive-date").value,
        status: document.getElementById("drive-status").value,
      };

      try {
        await API.createPlacementDrive(driveData);
        alert("Placement drive scheduled successfully!");
        addDriveModal.classList.remove("active");
        addDriveForm.reset();
        await loadPlacementDrives();
      } catch (err) {
        alert("Error scheduling drive: " + err.message);
      }
    });
  }

  // Close eligible students modal
  const closeEligibleModalBtn = document.getElementById("closeEligibleModal");
  const eligibleModal = document.getElementById("eligibleStudentsModal");
  if (closeEligibleModalBtn && eligibleModal) {
    closeEligibleModalBtn.addEventListener("click", () => {
      eligibleModal.classList.remove("active");
    });
  }
});

async function loadPlacementDrives() {
  const container = document.getElementById("drives-container");
  if (!container) return;

  try {
    const drives = await API.getPlacementDrives();
    container.innerHTML = "";

    if (!drives || drives.length === 0) {
      container.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; color: var(--text-muted); padding: 2rem;">
          No placement drives scheduled currently.
        </div>
      `;
      return;
    }

    drives.forEach((d) => {
      let statusBadge = "badge-info";
      if (d.status === "Ongoing") statusBadge = "badge-warning";
      else if (d.status === "Completed") statusBadge = "badge-success";

      const internReq = (d.internship_required || "No").toLowerCase() === "yes" ? "Mandatory (Yes)" : "Not Required";

      const card = document.createElement("div");
      card.className = "drive-card";
      card.innerHTML = `
        <div>
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.5rem;">
            <div class="drive-company">${d.company_name}</div>
            <span class="badge ${statusBadge}">${d.status}</span>
          </div>
          <div class="drive-role">${d.job_role} • ₹${d.package_lpa} LPA</div>
          <div class="drive-criteria" style="margin-bottom: 1rem;">
            <span>1. Min CGPA: <b>≥ ${d.min_cgpa.toFixed(1)}</b></span>
            <span>2. Min Attendance: <b>≥ ${d.min_attendance}%</b></span>
            <span>3. Required Skills: <b>${d.required_skills || 'None'}</b></span>
            <span>4. Min Projects: <b>≥ ${d.min_projects || 0}</b></span>
            <span>5. Min Certs: <b>≥ ${d.min_certifications || 0}</b></span>
            <span>6. Internship: <b>${internReq}</b></span>
            <span>7. Max Backlogs: <b>≤ ${d.max_backlogs}</b></span>
            <span>Drive Date: <b>${d.drive_date}</b></span>
          </div>
        </div>

        <div style="display: flex; flex-direction: column; gap: 0.5rem; margin-top: auto;">
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem;">
            <a href="drive-candidates.html?drive_id=${d.id}" class="btn btn-primary btn-sm" style="justify-content: center; font-size: 0.78rem;">
              👥 Candidate Roster
            </a>
            <a href="eligibility.html?drive_id=${d.id}" class="btn btn-secondary btn-sm" style="justify-content: center; font-size: 0.78rem;">
              🎯 1-on-1 Checker
            </a>
          </div>
          <button class="btn btn-secondary btn-sm" style="width: 100%; justify-content: center; font-size: 0.78rem;" onclick="viewEligibleStudents(${d.id}, '${d.company_name}')">
            ⚡ Quick Modal View
          </button>
        </div>
      `;
      container.appendChild(card);
    });
  } catch (err) {
    container.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; color: var(--text-muted); padding: 2rem;">
        Could not load placement drives. Ensure the backend is running.
      </div>
    `;
  }
}

window.viewEligibleStudents = async function(driveId, companyName) {
  const modal = document.getElementById("eligibleStudentsModal");
  const title = document.getElementById("eligibleModalTitle");
  const tbody = document.getElementById("eligible-students-tbody");
  if (!modal || !tbody) return;

  title.textContent = `Eligible Students for ${companyName}`;
  tbody.innerHTML = `
    <tr>
      <td colspan="5" style="text-align: center; padding: 1.5rem; color: var(--text-muted);">
        Calculating eligibility criteria...
      </td>
    </tr>
  `;
  modal.classList.add("active");

  try {
    const students = await API.getEligibleStudents(driveId);
    tbody.innerHTML = "";

    if (!students || students.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="5" style="text-align: center; padding: 1.5rem; color: var(--accent-rose);">
            No students currently satisfy all eligibility requirements for this drive.
          </td>
        </tr>
      `;
      return;
    }

    students.forEach((s) => {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td><strong style="color: var(--accent-cyan);">${s.student_id || s.roll_number}</strong></td>
        <td>${s.name}</td>
        <td>${s.branch || s.department}</td>
        <td><strong>${s.cgpa.toFixed(2)}</strong></td>
        <td><span class="badge badge-success">${s.attendance_percentage}%</span></td>
      `;
      tbody.appendChild(row);
    });
  } catch (err) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5" style="text-align: center; padding: 1.5rem; color: var(--text-muted);">
          Failed to fetch eligible students: ${err.message}
        </td>
      </tr>
    `;
  }
};
