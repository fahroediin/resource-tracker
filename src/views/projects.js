import { fetchMembers, fetchProjects, createProject, updateProject, deleteProject as deleteProjectStore } from '../lib/store.js';
import { showToast, openModal, closeModal, canEdit } from '../lib/ui.js';

export async function renderProjects() {
    try {
        const projects = await fetchProjects();
        const members = await fetchMembers();
        const search = (document.getElementById('projectSearch')?.value || '').toLowerCase();
        const filtered = projects.filter(p => p.name.toLowerCase().includes(search));
        const tbody = document.getElementById('projectsTableBody');
        const empty = document.getElementById('projectsEmpty');
        const addBtn = document.getElementById('addProjectBtn');

        if (addBtn) addBtn.style.display = canEdit() ? '' : 'none';

        if (filtered.length === 0) {
            tbody.innerHTML = '';
            empty.style.display = 'block';
            return;
        }

        empty.style.display = 'none';
        tbody.innerHTML = filtered.map(p => {
            const priorityCls = p.priority === 'High' ? 'priority-high' : p.priority === 'Medium' ? 'priority-medium' : 'priority-low';
            const statusMap = { 'Active': 'badge-active', 'Planning': 'badge-planning', 'On Hold': 'badge-onhold', 'Completed': 'badge-completed' };
            const assignedMembers = (p.project_assignments || []).map(a => {
                const m = members.find(mm => mm.id === a.member_id);
                return m ? `${m.name} (${a.allocation}%)` : null;
            }).filter(Boolean);

            const actions = canEdit() ? `
        <div class="row-actions">
          <button title="Edit" data-action="edit-project" data-id="${p.id}"><i class="icon-pencil"></i></button>
          <button title="Delete" class="delete" data-action="delete-project" data-id="${p.id}"><i class="icon-trash-2"></i></button>
        </div>
      ` : '';

            return `
        <tr>
          <td style="font-weight:600">${p.name}</td>
          <td><div style="display:flex;align-items:center;gap:8px"><div class="project-priority ${priorityCls}"></div>${p.priority}</div></td>
          <td><span class="badge ${statusMap[p.status] || ''}">${p.status}</span></td>
          <td>
            <div class="skill-tags">${assignedMembers.map(n => `<span class="skill-tag">${n}</span>`).join('') || '<span style="color:var(--text-muted);font-size:11px">Unassigned</span>'}</div>
          </td>
          <td style="white-space:nowrap">${p.start_date || '—'}</td>
          <td style="white-space:nowrap">${p.end_date || '—'}</td>
          <td>${actions}</td>
        </tr>
      `;
        }).join('');
    } catch (err) {
        console.error('Projects render error:', err);
    }
}

export function initProjectsView() {
    document.getElementById('addProjectBtn')?.addEventListener('click', () => openProjectModal());
    document.getElementById('projectSearch')?.addEventListener('input', () => renderProjects());

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
    document.getElementById('projectPriority').value = project ? project.priority : 'Medium';
    document.getElementById('projectStatus').value = project ? project.status : 'Active';
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
    const allocInputs = document.querySelectorAll('#allocationInputs input[type="number"]');
    const assignments = Array.from(allocInputs).map(input => ({
        memberId: input.dataset.memberId,
        allocation: Math.max(0, Math.min(100, parseInt(input.value, 10) || 0)),
    }));

    const data = {
        name,
        priority: document.getElementById('projectPriority').value,
        status: document.getElementById('projectStatus').value,
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
