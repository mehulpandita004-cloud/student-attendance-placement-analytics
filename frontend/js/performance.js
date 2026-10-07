/**
 * Performance Analytics Controller
 * Renders CGPA distributions, skill frequencies, branch benchmarks, and student leaderboard.
 */

let cgpaChart = null;
let skillsChart = null;
let branchChart = null;
let readinessChart = null;

document.addEventListener("DOMContentLoaded", async () => {
  await window.updateBackendStatus();
  await loadPerformanceAnalytics();

  document.getElementById("perf-branch-filter")?.addEventListener("change", loadPerformanceAnalytics);
  document.getElementById("perf-year-filter")?.addEventListener("change", loadPerformanceAnalytics);
});

async function loadPerformanceAnalytics() {
  const branch = document.getElementById("perf-branch-filter")?.value || "";
  const year = document.getElementById("perf-year-filter")?.value || "";

  try {
    const data = await API.getPerformanceAnalytics({ branch, year });
    if (!data) return;

    // Update cohort count
    const cohortEl = document.getElementById("cohort-count");
    if (cohortEl) cohortEl.textContent = data.total_students;

    // 1. CGPA KPI
    document.getElementById("kpi-avg-cgpa").textContent = data.cgpa_stats.average.toFixed(2);
    document.getElementById("kpi-cgpa-range").textContent = `Range: ${data.cgpa_stats.min} to ${data.cgpa_stats.max}`;

    // 2. Projects KPI
    document.getElementById("kpi-total-projects").textContent = data.projects_stats.total;
    document.getElementById("kpi-avg-projects").textContent = `${data.projects_stats.average} avg / student`;

    // 3. Certifications KPI
    document.getElementById("kpi-total-certs").textContent = data.certifications_stats.total;
    document.getElementById("kpi-avg-certs").textContent = `${data.certifications_stats.average} avg / student`;

    // 4. Skills KPI
    document.getElementById("kpi-unique-skills").textContent = data.skills_stats.total_unique_skills;
    const topSkill = data.skills_stats.top_skills[0]?.skill || "N/A";
    document.getElementById("kpi-top-skill").textContent = `Top: ${topSkill}`;

    // 5. Internship KPI
    document.getElementById("kpi-internship-rate").textContent = `${data.internship_stats.rate_percentage}%`;
    document.getElementById("kpi-internship-count").textContent = `${data.internship_stats.with_internship} students interned`;

    // 6. Profiles KPI
    document.getElementById("kpi-profiles-presence").textContent = `${data.profiles_stats.github_percentage}%`;
    document.getElementById("kpi-profiles-count").textContent = `${data.profiles_stats.with_github} with GitHub linked`;

    // 7. Backlogs KPI
    document.getElementById("kpi-clear-backlogs").textContent = `${data.backlogs_stats.clear_rate_percentage}%`;
    document.getElementById("kpi-backlogs-count").textContent = `${data.backlogs_stats.zero_backlogs} students clear`;

    // Render Charts
    renderCgpaTiersChart(data.cgpa_stats.brackets);
    renderSkillsChart(data.skills_stats.top_skills);
    renderBranchChart(data.branch_performance);
    renderReadinessChart(data.internship_stats, data.profiles_stats, data.backlogs_stats);

    // Render Benchmarks & Leaderboard
    renderBranchBenchmarks(data.branch_performance);
    renderLeaderboard(data.leaderboard);

  } catch (err) {
    console.error("Error loading performance analytics:", err);
  }
}

function renderCgpaTiersChart(brackets) {
  const ctx = document.getElementById("cgpaTiersChart");
  if (!ctx || !brackets) return;
  if (cgpaChart) cgpaChart.destroy();

  cgpaChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: Object.keys(brackets),
      datasets: [{
        label: 'Number of Students',
        data: Object.values(brackets),
        backgroundColor: ['#4f46e5', '#06b6d4', '#10b981', '#f59e0b'],
        borderRadius: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        y: { beginAtZero: true, grid: { color: '#334155' }, ticks: { color: '#94a3b8' } },
        x: { grid: { display: false }, ticks: { color: '#94a3b8' } }
      }
    }
  });
}

function renderSkillsChart(topSkills) {
  const ctx = document.getElementById("skillsFrequencyChart");
  if (!ctx || !topSkills) return;
  if (skillsChart) skillsChart.destroy();

  const labels = topSkills.slice(0, 7).map(s => s.skill);
  const data = topSkills.slice(0, 7).map(s => s.count);

  skillsChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: 'Students Knowing Skill',
        data: data,
        backgroundColor: '#06b6d4',
        borderRadius: 6
      }]
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { beginAtZero: true, grid: { color: '#334155' }, ticks: { color: '#94a3b8', stepSize: 1 } },
        y: { grid: { display: false }, ticks: { color: '#94a3b8' } }
      }
    }
  });
}

function renderBranchChart(branchPerf) {
  const ctx = document.getElementById("branchComparisonChart");
  if (!ctx || !branchPerf) return;
  if (branchChart) branchChart.destroy();

  branchChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: branchPerf.map(b => b.branch),
      datasets: [
        {
          label: 'Avg Projects',
          data: branchPerf.map(b => b.avg_projects),
          backgroundColor: '#4f46e5',
          borderRadius: 4
        },
        {
          label: 'Avg Certifications',
          data: branchPerf.map(b => b.avg_certifications),
          backgroundColor: '#10b981',
          borderRadius: 4
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { position: 'bottom', labels: { color: '#94a3b8' } } },
      scales: {
        y: { beginAtZero: true, grid: { color: '#334155' }, ticks: { color: '#94a3b8' } },
        x: { grid: { display: false }, ticks: { color: '#94a3b8' } }
      }
    }
  });
}

function renderReadinessChart(internship, profiles, backlogs) {
  const ctx = document.getElementById("readinessSplitChart");
  if (!ctx) return;
  if (readinessChart) readinessChart.destroy();

  readinessChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Internship Done', 'GitHub Live', 'Clean Backlogs'],
      datasets: [{
        data: [internship.rate_percentage, profiles.github_percentage, backlogs.clear_rate_percentage],
        backgroundColor: ['#06b6d4', '#4f46e5', '#10b981'],
        borderWidth: 2,
        borderColor: '#1e293b'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { position: 'bottom', labels: { color: '#94a3b8' } } },
      cutout: '65%'
    }
  });
}

function renderBranchBenchmarks(branchPerf) {
  const tbody = document.getElementById("branch-benchmarking-tbody");
  if (!tbody || !branchPerf) return;

  tbody.innerHTML = branchPerf.map(b => `
    <tr>
      <td><strong style="color: #fff;">${b.branch}</strong></td>
      <td>${b.student_count}</td>
      <td><strong style="color: var(--accent-cyan);">${b.avg_cgpa.toFixed(2)}</strong></td>
      <td>${b.avg_projects}</td>
      <td>${b.avg_certifications}</td>
      <td><span class="badge badge-success">${b.internship_rate}%</span></td>
    </tr>
  `).join("");
}

function renderLeaderboard(leaderboard) {
  const tbody = document.getElementById("leaderboard-tbody");
  if (!tbody || !leaderboard) return;

  tbody.innerHTML = leaderboard.map((s, idx) => `
    <tr>
      <td><strong style="color: #fff;">#${idx + 1}</strong></td>
      <td>
        <div style="font-weight: 600; color: #fff;">${s.name}</div>
        <div style="font-size: 0.75rem; color: var(--text-muted);">${s.student_id}</div>
      </td>
      <td><span style="font-size: 0.82rem; color: var(--text-secondary);">${s.branch}</span></td>
      <td><strong style="color: var(--accent-cyan);">${s.cgpa.toFixed(2)}</strong></td>
      <td>${s.number_of_projects}</td>
      <td>${s.certifications}</td>
      <td><span style="font-size: 0.8rem;">${s.internship && s.internship.toLowerCase().includes('yes') ? '✅ Yes' : 'No'}</span></td>
      <td><span style="color: ${s.backlogs > 0 ? 'var(--accent-rose)' : 'var(--accent-emerald)'}; font-weight: 600;">${s.backlogs}</span></td>
      <td>
        <div style="display: flex; gap: 0.35rem;">
          ${s.has_github ? '🐙' : ''} ${s.has_portfolio ? '🌐' : ''}
          ${!s.has_github && !s.has_portfolio ? '<span style="color: var(--text-muted); font-size: 0.75rem;">None</span>' : ''}
        </div>
      </td>
      <td>
        <span class="pill-sm" style="background: rgba(79, 70, 229, 0.2); color: #a5b4fc; font-weight: 700;">
          ${s.readiness_score} / 100
        </span>
      </td>
      <td style="text-align: right;">
        <a href="eligibility.html?student_id=${s.id}" class="btn btn-secondary btn-sm" style="padding: 0.2rem 0.5rem; font-size: 0.75rem;">
          🎯 Screen
        </a>
      </td>
    </tr>
  `).join("");
}
