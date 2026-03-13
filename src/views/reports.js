import { fetchMembers, fetchProjects, fetchTasksByMember } from '../lib/store.js';
import { getMemberUtilization, showToast, canEdit, currentDivisionSettings } from '../lib/ui.js';
import { supabase } from '../lib/supabase.js';

// ===== CSV UTILITY =====

function escapeCsv(value) {
    if (value == null) return '';
    const str = String(value);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return '"' + str.replace(/"/g, '""') + '"';
    }
    return str;
}

function downloadCsv(filename, headers, rows) {
    const csvContent = [
        headers.map(escapeCsv).join(','),
        ...rows.map(row => row.map(escapeCsv).join(','))
    ].join('\n');

    const BOM = '\uFEFF'; // UTF-8 BOM for Excel compatibility
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
}

function getDateString() {
    const d = new Date();
    return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
}

// ===== REPORT GENERATORS =====

async function generateTeamSummary() {
    const members = await fetchMembers();
    const projects = await fetchProjects();

    const headers = ['Name', 'Role', 'Status', 'Email', 'Blocks Used'];
    const rows = members.map(m => {
        const blocks = getMemberUtilization(m.id, projects);
        return [m.name, m.role, m.status, m.email || '', `${blocks}/4`];
    });

    return { headers, rows, filename: `team_summary_${getDateString()}.csv` };
}

async function generateProjectAssignments() {
    const projects = await fetchProjects();
    const members = await fetchMembers();
    const memberMap = Object.fromEntries(members.map(m => [m.id, m.name]));

    const headers = ['Project', 'Client', 'Type', 'Phase', 'Status', 'Start Date', 'End Date', 'Member', 'Blocks'];
    const rows = [];

    for (const p of projects) {
        const assignments = p.project_assignments || [];
        if (assignments.length === 0) {
            rows.push([p.name, p.client_name || '', p.type, p.phase, p.status, p.start_date || '', p.end_date || '', '(none)', '']);
        } else {
            for (const a of assignments) {
                const blocksArr = a.allocated_blocks || [];
                const blockStr = blocksArr.length > 0 ? blocksArr.map(b => `B${b}`).join(' & ') : '0';
                rows.push([p.name, p.client_name || '', p.type, p.phase, p.status, p.start_date || '', p.end_date || '', memberMap[a.member_id] || 'Unknown', blockStr]);
            }
        }
    }

    return { headers, rows, filename: `project_assignments_${getDateString()}.csv` };
}

async function generateCapacityOverview() {
    const members = await fetchMembers();
    const projects = await fetchProjects();
    const activePhases = currentDivisionSettings?.capacity_active_phases || ['Doc Creation', 'Design Review', 'Development'];

    const headers = ['Member', 'Role', 'Total Blocks', 'Project Breakdown'];
    const rows = members.map(m => {
        const blocks = getMemberUtilization(m.id, projects);
        // Build breakdown
        const breakdown = [];
        for (const p of projects) {
            if (p.status !== 'Active' || !activePhases.includes(p.phase)) continue;
            const assignment = (p.project_assignments || []).find(a => a.member_id === m.id);
            if (assignment) {
                const blocksArr = assignment.allocated_blocks || [];
                const blockStr = blocksArr.length > 0 ? blocksArr.map(b => `B${b}`).join(',') : '0';
                breakdown.push(`${p.name} (${blockStr} blok)`);
            }
        }
        return [m.name, m.role, `${blocks}/4`, breakdown.join('; ') || '—'];
    });

    return { headers, rows, filename: `capacity_overview_${getDateString()}.csv` };
}

async function generateTaskProgress() {
    const members = await fetchMembers();
    const headers = ['Member', 'Project', 'Task', 'Status'];
    const rows = [];

    for (const m of members) {
        try {
            const groups = await fetchTasksByMember(m.id);
            for (const group of groups) {
                for (const t of group.tasks) {
                    rows.push([m.name, group.projectName, t.content, t.is_completed ? 'Done' : 'Pending']);
                }
            }
        } catch {
            // skip if no access
        }
    }

    if (rows.length === 0) {
        rows.push(['(no tasks found)', '', '', '']);
    }

    return { headers, rows, filename: `task_progress_${getDateString()}.csv` };
}

// ===== REPORT CONFIG =====

const REPORTS = [
    {
        id: 'team-summary',
        title: 'Team Summary',
        description: 'Daftar semua member beserta role, status, dan utilization saat ini.',
        icon: 'icon-users',
        generate: generateTeamSummary,
    },
    {
        id: 'project-assignments',
        title: 'Project Assignments',
        description: 'Detail semua project dengan assigned members dan alokasi masing-masing.',
        icon: 'icon-folder-kanban',
        generate: generateProjectAssignments,
    },
    {
        id: 'capacity-overview',
        title: 'Capacity Overview',
        description: 'Kapasitas tiap member dengan breakdown project yang sedang aktif.',
        icon: 'icon-bar-chart-3',
        generate: generateCapacityOverview,
    },
    {
        id: 'task-progress',
        title: 'Task Progress',
        description: 'Progress task to-do semua member di setiap project.',
        icon: 'icon-list-checks',
        generate: generateTaskProgress,
    },
];

// ===== RENDER =====

export async function renderReports() {
    const container = document.getElementById('reportsContainer');
    if (!container) return;

    container.innerHTML = `
        <div class="reports-grid">
            ${REPORTS.map(r => `
                <div class="report-card glass-card" data-report="${r.id}">
                    <div class="report-card-header">
                        <div class="report-card-icon"><i class="${r.icon}"></i></div>
                        <div class="report-card-info">
                            <div class="report-card-title">${r.title}</div>
                            <div class="report-card-desc">${r.description}</div>
                        </div>
                    </div>
                    <div class="report-card-preview" id="preview-${r.id}" style="display:none;">
                        <div class="report-preview-table-wrap">
                            <table class="report-preview-table">
                                <thead id="preview-head-${r.id}"></thead>
                                <tbody id="preview-body-${r.id}"></tbody>
                            </table>
                        </div>
                    </div>
                    <div class="report-card-actions">
                        <button class="btn btn-secondary btn-sm report-preview-btn" data-report="${r.id}">
                            <i class="icon-eye"></i> Preview
                        </button>
                        <button class="btn btn-primary btn-sm report-export-btn" data-report="${r.id}">
                            <i class="icon-download"></i> Export CSV
                        </button>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

// ===== EVENT HANDLERS =====

export function initReportsView() {
    const container = document.getElementById('reportsContainer');
    if (!container) return;

    container.addEventListener('click', async (e) => {
        const previewBtn = e.target.closest('.report-preview-btn');
        const exportBtn = e.target.closest('.report-export-btn');

        if (previewBtn) {
            const reportId = previewBtn.dataset.report;
            const report = REPORTS.find(r => r.id === reportId);
            if (!report) return;

            const previewEl = document.getElementById(`preview-${reportId}`);
            if (previewEl.style.display !== 'none') {
                previewEl.style.display = 'none';
                previewBtn.innerHTML = '<i class="icon-eye"></i> Preview';
                return;
            }

            previewBtn.disabled = true;
            previewBtn.innerHTML = '<i class="icon-loader-circle"></i> Loading...';

            try {
                const { headers, rows } = await report.generate();
                const headEl = document.getElementById(`preview-head-${reportId}`);
                const bodyEl = document.getElementById(`preview-body-${reportId}`);

                headEl.innerHTML = `<tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr>`;
                const displayRows = rows.slice(0, 20); // Show max 20 rows
                bodyEl.innerHTML = displayRows.map(row =>
                    `<tr>${row.map(cell => `<td>${escapeHtml(String(cell))}</td>`).join('')}</tr>`
                ).join('');

                if (rows.length > 20) {
                    bodyEl.innerHTML += `<tr><td colspan="${headers.length}" style="text-align:center;color:var(--text-muted);font-size:12px;padding:12px;">...dan ${rows.length - 20} baris lainnya (export untuk data lengkap)</td></tr>`;
                }

                previewEl.style.display = 'block';
                previewBtn.innerHTML = '<i class="icon-eye-off"></i> Hide';
            } catch (err) {
                showToast(err.message || 'Failed to load preview', 'error');
                previewBtn.innerHTML = '<i class="icon-eye"></i> Preview';
            } finally {
                previewBtn.disabled = false;
            }
        }

        if (exportBtn) {
            const reportId = exportBtn.dataset.report;
            const report = REPORTS.find(r => r.id === reportId);
            if (!report) return;

            exportBtn.disabled = true;
            exportBtn.innerHTML = '<i class="icon-loader-circle"></i> Exporting...';

            try {
                const { headers, rows, filename } = await report.generate();
                downloadCsv(filename, headers, rows);
                showToast(`${report.title} exported!`);
            } catch (err) {
                showToast(err.message || 'Export failed', 'error');
            } finally {
                exportBtn.disabled = false;
                exportBtn.innerHTML = '<i class="icon-download"></i> Export CSV';
            }
        }
    });
}

function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}
