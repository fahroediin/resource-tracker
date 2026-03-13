import { fetchMembers, fetchProjects, createProject, updateProject, deleteProject as deleteProjectStore } from '../lib/store.js';
import { showToast, showConfirm, openModal, closeModal, canEdit, currentDivisionSettings } from '../lib/ui.js';

let currentTypeFilter = 'all';
let currentStatusFilter = 'all';
let currentMemberFilter = 'all';
let currentPage = 1;
const itemsPerPage = 8;

export async function renderProjects() {
    try {
        const projects = await fetchProjects();
        const members = await fetchMembers();
        const search = (document.getElementById('projectSearch')?.value || '').toLowerCase();
        let filtered = projects.filter(p => p.name.toLowerCase().includes(search));

        // Apply type filter
        if (currentTypeFilter !== 'all') {
            filtered = filtered.filter(p => p.type === currentTypeFilter);
        }

        // Apply status filter
        if (currentStatusFilter !== 'all') {
            filtered = filtered.filter(p => p.status === currentStatusFilter);
        }

        // Apply member filter
        if (currentMemberFilter !== 'all') {
            filtered = filtered.filter(p => 
                (p.project_assignments || []).some(a => a.member_id === currentMemberFilter)
            );
        }

        const tbody = document.getElementById('projectsTableBody');
        const empty = document.getElementById('projectsEmpty');
        const addBtn = document.getElementById('addProjectBtn');
        const pagination = document.getElementById('projectsPagination');

        if (addBtn) addBtn.style.display = canEdit() ? '' : 'none';

        if (filtered.length === 0) {
            tbody.innerHTML = '';
            empty.style.display = 'flex';
            pagination.style.display = 'none';
            return;
        }

        // Pagination calculations
        const totalItems = filtered.length;
        const totalPages = Math.ceil(totalItems / itemsPerPage);
        
        // Ensure current page is valid after filtering/deleting
        if (currentPage > totalPages) currentPage = totalPages;
        if (currentPage < 1) currentPage = 1;

        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = Math.min(startIndex + itemsPerPage, totalItems);
        const paginatedProjects = filtered.slice(startIndex, endIndex);

        empty.style.display = 'none';
        pagination.style.display = 'flex';
        
        // Render table rows
        tbody.innerHTML = paginatedProjects.map(p => {
            const priorityCls = p.priority === 'High' ? 'priority-high' : p.priority === 'Medium' ? 'priority-medium' : 'priority-low';
            const typeMap = { 'Internal': 'badge-internal', 'External': 'badge-external', 'POC': 'badge-poc' };
            
            // Dynamic Status
            const statuses = currentDivisionSettings?.statuses || [];
            const statusObj = statuses.find(s => s.name === p.status);
            // Fallback to a generic badge style if color not matching a CSS class
            const statusBadgeCls = statusObj ? `badge-${statusObj.name.toLowerCase().replace(/\s+/g, '')}` : 'badge-planning';

            const assignedMembers = (p.project_assignments || []).map(a => {
                const m = members.find(mm => mm.id === a.member_id);
                return m ? `${m.name} (${a.allocation}%)` : null;
            }).filter(Boolean);

            // Check if Internal & Active & > 14 days AND Phase is 'Doc Creation'
            let warningHtml = '';
            if (p.type === 'Internal' && p.status === 'Active' && p.phase === 'Doc Creation' && p.start_date) {
                const startDate = new Date(p.start_date);
                const today = new Date();
                const diffTime = Math.abs(today - startDate);
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                
                if (diffDays > 14) {
                    warningHtml = `<span title="Project Internal at Doc Creation for > 14 days (${diffDays} days)" style="color:#d9534f; margin-left: 6px; font-size: 14px;"><i class="icon-alert-triangle"></i></span>`;
                }
            }

            const actions = canEdit() ? `
        <div class="row-actions">
           <button title="Edit" data-action="edit-project" data-id="${p.id}"><i class="icon-pencil"></i></button>
           <button title="Delete" class="delete" data-action="delete-project" data-id="${p.id}"><i class="icon-trash-2"></i></button>
        </div>
      ` : '';

            return `
        <tr>
          <td style="font-weight:600">${p.name} ${warningHtml}</td>
          <td style="color:var(--text-secondary);font-size:12px;">${p.client_name || '—'}</td>
          <td><span class="badge ${typeMap[p.type] || 'badge-internal'}">${p.type || 'Internal'}</span></td>
          <td><span class="badge" style="background:var(--bg-secondary);color:var(--text-primary);border:1px solid var(--glass-border);">${p.phase || 'Planning'}</span></td>
          <td><div style="display:flex;align-items:center;gap:8px"><div class="project-priority ${priorityCls}"></div>${p.priority}</div></td>
          <td><span class="badge ${statusBadgeCls}" style="${!statusObj ? 'background:var(--bg-secondary);color:var(--text-primary);' : ''}">${p.status}</span></td>
          <td>
            <div class="skill-tags">${assignedMembers.map(n => `<span class="skill-tag">${n}</span>`).join('') || '<span style="color:var(--text-muted);font-size:11px">Unassigned</span>'}</div>
          </td>
          <td style="white-space:nowrap">${p.start_date || '—'}</td>
          <td style="white-space:nowrap">${p.end_date || '—'}</td>
          <td>${actions}</td>
        </tr>
      `;
        }).join('');

        // Render pagination controls
        renderPaginationControls(totalItems, totalPages, startIndex, endIndex);

    } catch (err) {
        console.error('Projects render error:', err);
    }
}

function renderPaginationControls(totalItems, totalPages, startIndex, endIndex) {
    document.getElementById('projectsPageInfo').textContent = 
        `Showing ${startIndex + 1}-${endIndex} of ${totalItems} projects`;

    const prevBtn = document.getElementById('projectsPrevBtn');
    const nextBtn = document.getElementById('projectsNextBtn');
    const pageNumbers = document.getElementById('projectsPageNumbers');

    prevBtn.disabled = currentPage === 1;
    nextBtn.disabled = currentPage === totalPages;

    let pagesHTML = '';
    for (let i = 1; i <= totalPages; i++) {
        // Simple logic to show logic around current page to avoid huge lists
        if (totalPages <= 7 || (i === 1 || i === totalPages || (i >= currentPage - 1 && i <= currentPage + 1))) {
            pagesHTML += `<button class="pagination-btn ${i === currentPage ? 'active' : ''}" data-page="${i}">${i}</button>`;
        } else if (i === currentPage - 2 || i === currentPage + 2) {
            pagesHTML += `<span style="color:var(--text-muted);align-self:end;padding-bottom:4px">...</span>`;
        }
    }
    pageNumbers.innerHTML = pagesHTML;
}

export async function initProjectsView() {
    // Populate member dropdown for filter
    try {
        const members = await fetchMembers();
        const memberFilter = document.getElementById('projectMemberFilter');
        if (memberFilter) {
            // Keep the default "All Members" option
            let optionsHtml = '<option value="all" style="background: var(--bg-secondary); color: var(--text-primary);">All Members</option>';
            members.forEach(m => {
                optionsHtml += `<option value="${m.id}" style="background: var(--bg-secondary); color: var(--text-primary);">${m.name}</option>`;
            });
            memberFilter.innerHTML = optionsHtml;

            // Add change listener
            memberFilter.addEventListener('change', (e) => {
                currentMemberFilter = e.target.value;
                currentPage = 1; // Reset to page 1
                renderProjects();
            });
        }
    } catch (err) {
        console.error('Failed to populate member filter:', err);
    }

    document.getElementById('addProjectBtn')?.addEventListener('click', () => openProjectModal());
    document.getElementById('projectSearch')?.addEventListener('input', () => renderProjects());

    // Type Filter Dropdown
    document.getElementById('projectTypeFilterDropdown')?.addEventListener('change', (e) => {
        currentTypeFilter = e.target.value;
        currentPage = 1; // Reset to page 1 on filter
        renderProjects();
    });

    // Status Filter Dropdown Setup
    const statusDropdown = document.getElementById('projectStatusFilterDropdown');
    if (statusDropdown) {
        let statusHtml = '<option value="all">All Statuses</option>';
        const statuses = currentDivisionSettings?.statuses || [];
        statuses.forEach(s => {
            statusHtml += `<option value="${s.name}">${s.name}</option>`;
        });
        statusDropdown.innerHTML = statusHtml;

        statusDropdown.addEventListener('change', (e) => {
            currentStatusFilter = e.target.value;
            currentPage = 1; // Reset to page 1 on filter
            renderProjects();
        });
    }

    // Search input
    document.getElementById('projectSearch')?.addEventListener('input', () => {
        currentPage = 1; // Reset to page 1 on search
        renderProjects();
    });

    // Pagination clicks
    document.getElementById('projectsPrevBtn')?.addEventListener('click', () => {
        if (currentPage > 1) { currentPage--; renderProjects(); }
    });
    
    document.getElementById('projectsNextBtn')?.addEventListener('click', () => {
        currentPage++; renderProjects();
    });

    document.getElementById('projectsPageNumbers')?.addEventListener('click', (e) => {
        const btn = e.target.closest('.pagination-btn');
        if (!btn || btn.classList.contains('active')) return;
        currentPage = parseInt(btn.dataset.page, 10);
        renderProjects();
    });

    document.getElementById('projectsTableBody')?.addEventListener('click', async (e) => {
        const btn = e.target.closest('[data-action]');
        if (!btn) return;
        const action = btn.dataset.action;
        const id = btn.dataset.id;

        if (action === 'edit-project') await editProject(id);
        if (action === 'delete-project') await handleDeleteProject(id);
    });

    document.getElementById('saveProjectBtn')?.addEventListener('click', saveProject);
}

async function openProjectModal(project = null) {
    document.getElementById('projectModalTitle').textContent = project ? 'Edit Project' : 'Add Project';
    document.getElementById('projectId').value = project ? project.id : '';
    document.getElementById('projectName').value = project ? project.name : '';
    document.getElementById('projectClient').value = project ? (project.client_name || '') : '';
    document.getElementById('projectType').value = project ? (project.type || 'Internal') : 'Internal';
    document.getElementById('projectPriority').value = project ? project.priority : 'Medium';

    // Populate Dynamic Options
    const phaseSelect = document.getElementById('projectPhase');
    const statusSelect = document.getElementById('projectStatus');
    const settings = currentDivisionSettings || { phases: [], statuses: [] };

    phaseSelect.innerHTML = settings.phases.map(p => `<option value="${p}">${p}</option>`).join('');
    statusSelect.innerHTML = settings.statuses.map(s => `<option value="${s.name}">${s.name}</option>`).join('');

    document.getElementById('projectStatus').value = project ? project.status : (settings.statuses[0]?.name || 'Active');
    document.getElementById('projectPhase').value = project ? (project.phase || '') : (settings.phases[0] || 'Planning');
    
    document.getElementById('projectStart').value = project ? (project.start_date || '') : '';
    document.getElementById('projectEnd').value = project ? (project.end_date || '') : '';

    const members = await fetchMembers();
    const currentAssignments = project ? (project.project_assignments || []) : [];

    const checkboxGroup = document.getElementById('memberCheckboxes');
    if (members.length === 0) {
        checkboxGroup.innerHTML = '<p style="color:var(--text-muted);font-size:12px;padding:8px">No members available. Add members first.</p>';
    } else {
        checkboxGroup.innerHTML = members.map(m => {
            const isChecked = currentAssignments.some(a => a.member_id === m.id);
            return `
        <label class="checkbox-item">
          <input type="checkbox" value="${m.id}" ${isChecked ? 'checked' : ''}>
          ${m.name} <span style="color:var(--text-muted);font-size:11px">(${m.role})</span>
        </label>
      `;
        }).join('');

        checkboxGroup.querySelectorAll('input[type="checkbox"]').forEach(cb => {
            cb.addEventListener('change', () => updateAllocationInputs(currentAssignments, members));
        });
    }

    updateAllocationInputs(currentAssignments, members);
    openModal('projectModal');
}

function updateAllocationInputs(existingAssignments, members) {
    const checkedBoxes = document.querySelectorAll('#memberCheckboxes input[type="checkbox"]:checked');
    const section = document.getElementById('allocationSection');
    const container = document.getElementById('allocationInputs');

    if (checkedBoxes.length === 0) {
        section.style.display = 'none';
        return;
    }

    section.style.display = 'block';
    container.innerHTML = Array.from(checkedBoxes).map(cb => {
        const member = members.find(m => m.id === cb.value);
        if (!member) return '';
        const prev = (existingAssignments || []).find(a => a.member_id === cb.value);
        return `
      <div class="allocation-row">
        <span class="member-label">${member.name}</span>
        <input type="number" min="0" max="100" value="${prev ? prev.allocation : 50}" data-member-id="${cb.value}"> %
      </div>
    `;
    }).join('');
}

async function saveProject() {
    const name = document.getElementById('projectName').value.trim();
    if (!name) { showToast('Project name is required', 'error'); return; }

    const id = document.getElementById('projectId').value;

    // Duplicate name check
    const existingProjects = await fetchProjects();
    const duplicate = existingProjects.find(p =>
        p.name.toLowerCase() === name.toLowerCase() && p.id !== id
    );
    if (duplicate) {
        const confirmed = await showConfirm({
            title: 'Duplicate Project Name',
            text: `A project named "${duplicate.name}" already exists. Do you still want to save?`,
            icon: 'warning',
            confirmText: 'Save Anyway',
            cancelText: 'Cancel',
        });
        if (!confirmed) return;
    }

    const allocInputs = document.querySelectorAll('#allocationInputs input[type="number"]');
    const assignments = Array.from(allocInputs).map(input => ({
        memberId: input.dataset.memberId,
        allocation: Math.max(0, Math.min(100, parseInt(input.value, 10) || 0)),
    }));

    const data = {
        name,
        client_name: document.getElementById('projectClient').value.trim() || null,
        type: document.getElementById('projectType').value,
        priority: document.getElementById('projectPriority').value,
        status: document.getElementById('projectStatus').value,
        phase: document.getElementById('projectPhase').value,
        start_date: document.getElementById('projectStart').value || null,
        end_date: document.getElementById('projectEnd').value || null,
    };

    try {
        if (id) {
            await updateProject(id, data, assignments);
            showToast('Project updated');
        } else {
            await createProject(data, assignments);
            showToast('Project added');
        }
        closeModal('projectModal');
        await renderProjects();
    } catch (err) {
        showToast(err.message || 'Failed to save project', 'error');
    }
}

async function editProject(id) {
    const projects = await fetchProjects();
    const project = projects.find(p => p.id === id);
    if (project) openProjectModal(project);
}

async function handleDeleteProject(id) {
    if (!confirm('Delete this project?')) return;
    try {
        await deleteProjectStore(id);
        showToast('Project deleted');
        await renderProjects();
    } catch (err) {
        showToast(err.message || 'Failed to delete project', 'error');
    }
}
