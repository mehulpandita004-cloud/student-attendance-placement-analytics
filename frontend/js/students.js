/**
 * Student Management Controller
 * Handles View all, Search, Filter, Add, Edit, Delete, and View Details
 */

let allStudentsCache = [];
let currentViewMode = "table"; // 'table' or 'cards'

document.addEventListener("DOMContentLoaded", async () => {
  await window.updateBackendStatus();
  await loadStudents();

  // Search input debouncing
  const searchInput = document.getElementById("search-student");
  if (searchInput) {
    let debounceTimer;
    searchInput.addEventListener("input", () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        loadStudents();
      }, 250);
    });
  }

  // Filter dropdown listeners
  document.getElementById("branch-filter")?.addEventListener("change", loadStudents);
  document.getElementById("year-filter")?.addEventListener("change", loadStudents);
  document.getElementById("status-filter")?.addEventListener("change", loadStudents);

  // View toggle listeners
  document.getElementById("btn-view-table")?.addEventListener("click", () => switchView("table"));
  document.getElementById("btn-view-cards")?.addEventListener("click", () => switchView("cards"));

  // Add Student button
  document.getElementById("openAddStudentModal")?.addEventListener("click", openAddModal);
  document.getElementById("closeStudentModal")?.addEventListener("click", closeModal);
  document.getElementById("closeDetailsModal")?.addEventListener("click", closeDetailsModal);

  // Form submit handler (handles both Add and Edit)
  document.getElementById("studentForm")?.addEventListener("submit", handleFormSubmit);
});

// Switch between Table and Card View
function switchView(mode) {
  currentViewMode = mode;
  const tableContainer = document.getElementById("table-view-container");
  const cardsContainer = document.getElementById("cards-view-container");
  const btnTable = document.getElementById("btn-view-table");
  const btnCards = document.getElementById("btn-view-cards");

  if (mode === "table") {
    tableContainer.style.display = "block";
    cardsContainer.style.display = "none";
    btnTable.classList.add("active");
    btnCards.classList.remove("active");
  } else {
    tableContainer.style.display = "none";
    cardsContainer.style.display = "grid";
    btnTable.classList.remove("active");
    btnCards.classList.add("active");
  }
}

// Fetch and render students
async function loadStudents() {
  const searchVal = document.getElementById("search-student")?.value.trim() || "";
  const branchVal = document.getElementById("branch-filter")?.value || "";
  const yearVal = document.getElementById("year-filter")?.value || "";
  const statusVal = document.getElementById("status-filter")?.value || "";

  try {
    const students = await API.getStudents({
      search: searchVal,
      branch: branchVal,
      year: yearVal ? parseInt(yearVal) : null,
      placement_status: statusVal
    });

    allStudentsCache = students || [];
    
    // Update count badge
    const countBadge = document.getElementById("student-count-badge");
    if (countBadge) countBadge.textContent = allStudentsCache.length;

    renderTableView(allStudentsCache);
    renderCardsView(allStudentsCache);
  } catch (err) {
    console.error("Failed to load students:", err);
    document.getElementById("students-tbody").innerHTML = `
      <tr>
        <td colspan="9" style="text-align: center; color: var(--accent-rose); padding: 2.5rem;">
          ⚠️ Error connecting to database: ${err.message}. Please verify the FastAPI backend is running.
        </td>
      </tr>
    `;
  }
}

// Render Table View
function renderTableView(students) {
  const tbody = document.getElementById("students-tbody");
  if (!tbody) return;

  if (students.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="9" style="text-align: center; color: var(--text-muted); padding: 2.5rem;">
          No students found matching your criteria. Try adjusting the search or filters.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = "";
  students.forEach((s) => {
    let attBadge = "badge-success";
    if (s.attendance_percentage < 75) attBadge = "badge-danger";
    else if (s.attendance_percentage < 85) attBadge = "badge-warning";

    let statusBadge = "badge-info";
    if (s.placement_status === "Placed") statusBadge = "badge-success";
    else if (s.placement_status === "Not Eligible") statusBadge = "badge-danger";

    // Format skills preview (first 2-3 skills)
    const skillsList = s.technical_skills ? s.technical_skills.split(",").map(sk => sk.trim()) : [];
    const skillsPreview = skillsList.slice(0, 2).map(sk => `<span class="skill-chip">${sk}</span>`).join(" ");
    const moreSkills = skillsList.length > 2 ? `<span style="font-size: 0.7rem; color: var(--text-muted);">+${skillsList.length - 2}</span>` : "";

    const row = document.createElement("tr");
    row.innerHTML = `
      <td><strong style="color: var(--accent-cyan);">${s.student_id}</strong></td>
      <td>
        <div style="font-weight: 700; cursor: pointer; color: #fff;" onclick="viewStudentDetails(${s.id})">
          ${s.name}
        </div>
        <div style="font-size: 0.75rem; color: var(--text-muted);">${s.email}</div>
      </td>
      <td>
        <div>${s.branch}</div>
        <div style="font-size: 0.72rem; color: var(--text-muted);">Year ${s.year}</div>
      </td>
      <td><strong style="font-size: 0.95rem;">${s.cgpa.toFixed(2)}</strong></td>
      <td><span class="badge ${attBadge}">${s.attendance_percentage}%</span></td>
      <td>
        <div style="display: flex; align-items: center; gap: 0.35rem; flex-wrap: wrap;">
          <span style="font-size: 0.75rem; font-weight: 600; color: #fff;">${s.number_of_projects} proj</span>
          ${skillsPreview} ${moreSkills}
        </div>
      </td>
      <td>
        ${s.backlogs > 0 
          ? `<span class="badge badge-danger">${s.backlogs} Backlog(s)</span>` 
          : `<span class="badge badge-success">0 (Clear)</span>`}
      </td>
      <td><span class="badge ${statusBadge}">${s.placement_status}</span></td>
      <td style="text-align: right;">
        <div style="display: inline-flex; gap: 0.35rem;">
          <button class="btn btn-secondary btn-sm" onclick="viewStudentDetails(${s.id})" title="View Details">
            👁️
          </button>
          <button class="btn btn-secondary btn-sm" onclick="openEditModal(${s.id})" title="Edit">
            ✏️
          </button>
          <button class="btn btn-danger btn-sm" onclick="handleDeleteStudent(${s.id}, '${s.name.replace(/'/g, "\\'")}')" title="Delete">
            🗑️
          </button>
        </div>
      </td>
    `;
    tbody.appendChild(row);
  });
}

// Render Card Grid View
function renderCardsView(students) {
  const container = document.getElementById("cards-view-container");
  if (!container) return;

  if (students.length === 0) {
    container.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; color: var(--text-muted); padding: 3rem;">
        No students found matching your search.
      </div>
    `;
    return;
  }

  container.innerHTML = "";
  students.forEach((s) => {
    let attBadge = "badge-success";
    if (s.attendance_percentage < 75) attBadge = "badge-danger";
    else if (s.attendance_percentage < 85) attBadge = "badge-warning";

    let statusBadge = "badge-info";
    if (s.placement_status === "Placed") statusBadge = "badge-success";
    else if (s.placement_status === "Not Eligible") statusBadge = "badge-danger";

    // Extract initials
    const initials = s.name.split(" ").map(n => n[0]).join("").substring(0, 2).toUpperCase();

    // Skills
    const skillsList = s.technical_skills ? s.technical_skills.split(",").map(sk => sk.trim()) : [];
    const skillsHtml = skillsList.map(sk => `<span class="skill-chip">${sk}</span>`).join("");

    const card = document.createElement("div");
    card.className = "student-card-item";
    card.innerHTML = `
      <div>
        <div class="student-card-header">
          <div class="avatar-circle">${initials}</div>
          <div class="student-card-meta">
            <div class="student-card-name" title="${s.name}">${s.name}</div>
            <div class="student-card-id">${s.student_id} • Year ${s.year}</div>
            <div class="student-card-sub">${s.branch}</div>
          </div>
          <span class="badge ${statusBadge}" style="font-size: 0.7rem;">${s.placement_status}</span>
        </div>

        <div class="student-stat-row">
          <div class="stat-unit">
            <h5>CGPA</h5>
            <span>${s.cgpa.toFixed(2)}</span>
          </div>
          <div class="stat-unit">
            <h5>Attendance</h5>
            <span style="color: ${s.attendance_percentage < 75 ? 'var(--accent-rose)' : 'var(--accent-emerald)'};">
              ${s.attendance_percentage}%
            </span>
          </div>
          <div class="stat-unit">
            <h5>Backlogs</h5>
            <span style="color: ${s.backlogs > 0 ? 'var(--accent-rose)' : '#fff'};">
              ${s.backlogs}
            </span>
          </div>
        </div>

        <div class="skills-wrapper">
          ${skillsHtml || '<span style="font-size: 0.72rem; color: var(--text-muted);">No skills recorded</span>'}
        </div>
      </div>

      <div class="card-actions-row">
        <button class="btn btn-secondary btn-sm" style="flex: 1; justify-content: center;" onclick="viewStudentDetails(${s.id})">
          👁️ Details
        </button>
        <button class="btn btn-secondary btn-sm" onclick="openEditModal(${s.id})">
          ✏️ Edit
        </button>
        <button class="btn btn-danger btn-sm" onclick="handleDeleteStudent(${s.id}, '${s.name.replace(/'/g, "\\'")}')">
          🗑️
        </button>
      </div>
    `;
    container.appendChild(card);
  });
}

// Modal open/close functions
function openAddModal() {
  document.getElementById("modalTitle").textContent = "Add New Student Record";
  document.getElementById("submitBtn").textContent = "Save Student";
  document.getElementById("studentForm").reset();
  document.getElementById("form-db-id").value = "";
  document.getElementById("studentModal").classList.add("active");
}

function closeModal() {
  document.getElementById("studentModal").classList.remove("active");
}

function closeDetailsModal() {
  document.getElementById("detailsModal").classList.remove("active");
}

// Open Edit Modal
window.openEditModal = async function(id) {
  try {
    const student = await API.getStudentById(id);
    if (!student) return;

    document.getElementById("modalTitle").textContent = `Edit Student: ${student.name}`;
    document.getElementById("submitBtn").textContent = "Update Student";
    document.getElementById("form-db-id").value = student.id;

    document.getElementById("form-student-id").value = student.student_id;
    document.getElementById("form-name").value = student.name;
    document.getElementById("form-email").value = student.email;
    document.getElementById("form-branch").value = student.branch;
    document.getElementById("form-year").value = student.year;
    document.getElementById("form-cgpa").value = student.cgpa;
    document.getElementById("form-attendance").value = student.attendance_percentage;
    document.getElementById("form-skills").value = student.technical_skills || "";
    document.getElementById("form-projects").value = student.number_of_projects;
    document.getElementById("form-certifications").value = student.certifications;
    document.getElementById("form-internship").value = student.internship || "No";
    document.getElementById("form-backlogs").value = student.backlogs;
    document.getElementById("form-github").value = student.github_profile || "";
    document.getElementById("form-portfolio").value = student.portfolio_profile || "";
    document.getElementById("form-status").value = student.placement_status || "Eligible";

    document.getElementById("studentModal").classList.add("active");
  } catch (err) {
    alert("Error fetching student details: " + err.message);
  }
};

// Handle Form Submission (Add or Update)
async function handleFormSubmit(e) {
  e.preventDefault();

  const dbId = document.getElementById("form-db-id").value;
  const isEdit = Boolean(dbId);

  // Field values
  const cgpa = parseFloat(document.getElementById("form-cgpa").value);
  const attendance = parseFloat(document.getElementById("form-attendance").value);
  const projects = parseInt(document.getElementById("form-projects").value);
  const certs = parseInt(document.getElementById("form-certifications").value);
  const backlogs = parseInt(document.getElementById("form-backlogs").value);

  // Strict Validation checks required by user prompt:
  if (isNaN(cgpa) || cgpa < 0 || cgpa > 10) {
    alert("Validation Error: CGPA must be between 0.0 and 10.0");
    return;
  }
  if (isNaN(attendance) || attendance < 0 || attendance > 100) {
    alert("Validation Error: Attendance must be between 0.0% and 100.0%");
    return;
  }
  if (isNaN(projects) || projects < 0) {
    alert("Validation Error: Number of projects cannot be negative");
    return;
  }
  if (isNaN(certs) || certs < 0) {
    alert("Validation Error: Certifications cannot be negative");
    return;
  }
  if (isNaN(backlogs) || backlogs < 0) {
    alert("Validation Error: Backlogs cannot be negative");
    return;
  }

  const payload = {
    student_id: document.getElementById("form-student-id").value.trim(),
    name: document.getElementById("form-name").value.trim(),
    email: document.getElementById("form-email").value.trim(),
    branch: document.getElementById("form-branch").value,
    year: parseInt(document.getElementById("form-year").value),
    cgpa: cgpa,
    attendance_percentage: attendance,
    technical_skills: document.getElementById("form-skills").value.trim(),
    number_of_projects: projects,
    certifications: certs,
    internship: document.getElementById("form-internship").value.trim() || "No",
    backlogs: backlogs,
    github_profile: document.getElementById("form-github").value.trim(),
    portfolio_profile: document.getElementById("form-portfolio").value.trim(),
    placement_status: document.getElementById("form-status").value,
  };

  const submitBtn = document.getElementById("submitBtn");
  submitBtn.disabled = true;
  submitBtn.textContent = isEdit ? "Updating..." : "Saving...";

  try {
    if (isEdit) {
      await API.updateStudent(parseInt(dbId), payload);
      alert(`Student '${payload.name}' updated successfully!`);
    } else {
      await API.createStudent(payload);
      alert(`Student '${payload.name}' created successfully!`);
    }
    closeModal();
    await loadStudents();
  } catch (err) {
    alert("Operation failed: " + err.message);
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = isEdit ? "Update Student" : "Save Student";
  }
}

// View Student Details in Modal
window.viewStudentDetails = async function(id) {
  const container = document.getElementById("detailsModalContent");
  const modal = document.getElementById("detailsModal");
  if (!container || !modal) return;

  container.innerHTML = `<div style="text-align: center; padding: 2rem; color: var(--text-muted);">Loading profile...</div>`;
  modal.classList.add("active");

  try {
    const s = await API.getStudentById(id);
    if (!s) return;

    const initials = s.name.split(" ").map(n => n[0]).join("").substring(0, 2).toUpperCase();
    const skillsList = s.technical_skills ? s.technical_skills.split(",").map(sk => sk.trim()) : [];
    const skillsHtml = skillsList.map(sk => `<span class="skill-chip">${sk}</span>`).join(" ");

    let attBadge = "badge-success";
    if (s.attendance_percentage < 75) attBadge = "badge-danger";
    else if (s.attendance_percentage < 85) attBadge = "badge-warning";

    container.innerHTML = `
      <!-- Header -->
      <div style="display: flex; gap: 1rem; align-items: center; margin-bottom: 1.5rem; background: rgba(15, 23, 42, 0.6); padding: 1rem; border-radius: var(--radius-md);">
        <div class="avatar-circle" style="width: 56px; height: 56px; font-size: 1.3rem;">${initials}</div>
        <div style="flex: 1;">
          <h3 style="font-size: 1.25rem; font-weight: 700; color: #fff;">${s.name}</h3>
          <div style="color: var(--accent-cyan); font-weight: 600; font-size: 0.88rem;">${s.student_id} • Year ${s.year}</div>
          <div style="color: var(--text-muted); font-size: 0.8rem;">${s.email} • ${s.branch}</div>
        </div>
        <span class="badge ${s.placement_status === 'Placed' ? 'badge-success' : 'badge-info'}">
          ${s.placement_status}
        </span>
      </div>

      <!-- Academic KPI Grid -->
      <div class="detail-section-title">Academic Metrics</div>
      <div class="detail-kpi-grid">
        <div class="detail-kpi-box">
          <small>CGPA</small>
          <strong>${s.cgpa.toFixed(2)}</strong>
        </div>
        <div class="detail-kpi-box">
          <small>Attendance</small>
          <strong style="color: ${s.attendance_percentage < 75 ? 'var(--accent-rose)' : 'var(--accent-emerald)'};">
            ${s.attendance_percentage}%
          </strong>
        </div>
        <div class="detail-kpi-box">
          <small>Backlogs</small>
          <strong style="color: ${s.backlogs > 0 ? 'var(--accent-rose)' : 'var(--accent-emerald)'};">
            ${s.backlogs}
          </strong>
        </div>
        <div class="detail-kpi-box">
          <small>Year</small>
          <strong>${s.year}</strong>
        </div>
      </div>

      <!-- Technical Portfolio -->
      <div class="detail-section-title">Technical Portfolio & Skills</div>
      <div style="margin-bottom: 0.85rem;">
        <div style="font-size: 0.78rem; color: var(--text-muted); margin-bottom: 0.35rem;">Technical Skills:</div>
        <div class="skills-wrapper">
          ${skillsHtml || '<span style="color: var(--text-muted); font-size: 0.8rem;">No skills added</span>'}
        </div>
      </div>

      <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.75rem; margin-bottom: 1rem;">
        <div style="background: rgba(15, 23, 42, 0.5); padding: 0.75rem; border-radius: var(--radius-sm); border: 1px solid var(--border-color);">
          <div style="font-size: 0.7rem; color: var(--text-muted);">Projects Completed</div>
          <div style="font-size: 1.1rem; font-weight: 700; color: #fff;">${s.number_of_projects}</div>
        </div>
        <div style="background: rgba(15, 23, 42, 0.5); padding: 0.75rem; border-radius: var(--radius-sm); border: 1px solid var(--border-color);">
          <div style="font-size: 0.7rem; color: var(--text-muted);">Certifications</div>
          <div style="font-size: 1.1rem; font-weight: 700; color: #fff;">${s.certifications}</div>
        </div>
        <div style="background: rgba(15, 23, 42, 0.5); padding: 0.75rem; border-radius: var(--radius-sm); border: 1px solid var(--border-color);">
          <div style="font-size: 0.7rem; color: var(--text-muted);">Internship</div>
          <div style="font-size: 0.88rem; font-weight: 600; color: #fff;">${s.internship || 'None'}</div>
        </div>
      </div>

      <!-- Profile Links -->
      <div class="detail-section-title">Online Profiles</div>
      <div style="display: flex; gap: 0.75rem; flex-wrap: wrap; margin-bottom: 1.5rem;">
        ${s.github_profile 
          ? `<a href="${s.github_profile}" target="_blank" rel="noopener noreferrer" class="link-btn">
               <span>🐙</span> GitHub: ${s.github_profile}
             </a>`
          : '<span style="font-size: 0.8rem; color: var(--text-muted);">No GitHub profile linked</span>'
        }
        ${s.portfolio_profile 
          ? `<a href="${s.portfolio_profile}" target="_blank" rel="noopener noreferrer" class="link-btn">
               <span>🌐</span> Portfolio: ${s.portfolio_profile}
             </a>`
          : '<span style="font-size: 0.8rem; color: var(--text-muted); margin-left: 0.5rem;">No Portfolio linked</span>'
        }
      </div>

      <!-- Modal Footer Actions -->
      <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid var(--border-color); padding-top: 1rem;">
        <button class="btn btn-danger btn-sm" onclick="closeDetailsModal(); handleDeleteStudent(${s.id}, '${s.name.replace(/'/g, "\\'")}')">
          🗑️ Delete Record
        </button>
        <div style="display: flex; gap: 0.5rem;">
          <button class="btn btn-secondary btn-sm" onclick="closeDetailsModal(); openEditModal(${s.id})">
            ✏️ Edit Profile
          </button>
          <button class="btn btn-primary btn-sm" onclick="closeDetailsModal()">
            Close
          </button>
        </div>
      </div>
    `;
  } catch (err) {
    container.innerHTML = `<div style="text-align: center; color: var(--accent-rose); padding: 2rem;">Error: ${err.message}</div>`;
  }
};

// Delete student with confirmation
window.handleDeleteStudent = async function(id, name) {
  if (confirm(`Are you sure you want to delete student "${name}"? This action cannot be undone.`)) {
    try {
      await API.deleteStudent(id);
      alert(`Student "${name}" deleted successfully.`);
      await loadStudents();
    } catch (err) {
      alert("Failed to delete student: " + err.message);
    }
  }
};
