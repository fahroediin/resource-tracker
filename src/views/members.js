import { fetchMembers, fetchProjects, fetchSkills, createMember, updateMember, deleteMember as deleteMemberStore, fetchTasksByMember } from '../lib/store.js';
import { getInitials, getAvatarColor, getMemberUtilization, getUtilClass, getBarColor, showToast, openModal, closeModal, canEdit } from '../lib/ui.js';

export async function renderMembers() {
    try {
        const members = await fetchMembers();
        const projects = await fetchProjects();
        const skills = await fetchSkills();
        const search = (document.getElementById('memberSearch')?.value || '').toLowerCase();
        const filtered = members.filter(m => m.name.toLowerCase().includes(search) || m.role.toLowerCase().includes(search));
        const tbody = document.getElementById('membersTableBody');
        const empty = document.getElementById('membersEmpty');
        const addBtn = document.getElementById('addMemberBtn');

        if (addBtn) addBtn.style.display = canEdit() ? '' : 'none';

        if (filtered.length === 0) {
            tbody.innerHTML = '';
            empty.style.display = 'block';
            return;
        }

        empty.style.display = 'none';
        tbody.innerHTML = filtered.map((m, i) => {
            const util = getMemberUtilization(m.id, projects);
            const utilCls = getUtilClass(util);
            const statusMap = { 'Available': 'badge-available', 'Assigned': 'badge-assigned', 'On Leave': 'badge-leave', 'Training': 'badge-training' };

            const memberSkills = skills[m.id] || {};
            const topSkills = Object.entries(memberSkills)
                .filter(([, v]) => v >= 4)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 3)
                .map(([k]) => `<span class="skill-tag">${k}</span>`).join('');

            const editActions = canEdit() ? `
              <button title="Edit" data-action="edit-member" data-id="${m.id}"><i class="icon-pencil"></i></button>
              <button title="Delete" class="delete" data-action="delete-member" data-id="${m.id}"><i class="icon-trash-2"></i></button>
            ` : '';

            const viewTasksBtn = canEdit() ? `
              <button title="View Tasks" data-action="view-tasks" data-id="${m.id}" data-name="${m.name}" style="color:var(--text-muted);"><i class="icon-list-checks"></i></button>
            ` : '';

            const actions = (editActions || viewTasksBtn) ? `
              <div class="row-actions">
                ${viewTasksBtn}${editActions}
              </div>
            ` : '';

            return `
        <tr>
          <td>
            <div class="member-inline">
              <div class="member-inline-avatar" style="background:${getAvatarColor(i)}">${getInitials(m.name)}</div>
              <div>
                <div style="font-weight:600">${m.name}</div>
                <div style="font-size:11px;color:var(--text-muted)">${m.email || ''}</div>
              </div>
            </div>
          </td>
          <td>${m.role}</td>
          <td><span class="badge ${statusMap[m.status] || ''}">${m.status}</span></td>
          <td>
            <span style="font-weight:600;color:${util > 100 ? 'var(--accent-rose)' : 'var(--text-primary)'}">${util}%</span>
            <div class="pct-bar-inline"><div class="pct-bar-inline-fill" style="width:${Math.min(util, 100)}%;background:${getBarColor(util)}"></div></div>
          </td>
          <td><div class="skill-tags">${topSkills || '<span style="color:var(--text-muted);font-size:11px">—</span>'}</div></td>
          <td>${actions}</td>
        </tr>
      `;
        }).join('');
    } catch (err) {
        console.error('Members render error:', err);
    }
}

// ===== VIEW MEMBER TASKS MODAL =====

async function showMemberTasksModal(memberId, memberName) {
    const modal = document.getElementById('memberTasksModal');
    const title = document.getElementById('memberTasksModalTitle');
    const body = document.getElementById('memberTasksModalBody');

    title.textContent = `Tasks — ${memberName}`;
    body.innerHTML = `<div style="display:flex;justify-content:center;padding:32px"><div class="loading-spinner" style="width:24px;height:24px;border-width:2px;"></div></div>`;
    modal.classList.add('active');

    try {
        const projectGroups = await fetchTasksByMember(memberId);

        if (projectGroups.length === 0) {
            body.innerHTML = `
                <div style="text-align:center;padding:32px;color:var(--text-muted);">
                    <i class="icon-list-checks" style="font-size:36px;display:block;margin-bottom:12px;opacity:0.4;"></i>
                    <p style="font-size:13px;">Belum ada task untuk member ini.</p>
                </div>`;
            return;
        }

        body.innerHTML = projectGroups.map(group => {
            const completed = group.tasks.filter(t => t.is_completed).length;
            const total = group.tasks.length;
            const allDone = completed === total;
            const pct = Math.round((completed / total) * 100);

            return `
                <div class="member-task-group">
                    <div class="member-task-group-header">
                        <div>
                            <div class="member-task-project-name">${escapeHtml(group.projectName)}</div>
                            <div class="member-task-project-meta">
                                <span class="badge" style="background:var(--bg-secondary);border:1px solid var(--glass-border);font-size:10px;">${group.projectStatus}</span>
                                <span style="font-size:11px;color:var(--text-muted);">Alokasi: ${group.allocation}%</span>
                            </div>
                        </div>
                        <div class="member-task-progress">
                            <span class="task-count ${allDone ? 'all-done' : ''}">${completed}/${total}</span>
                            <div class="task-progress-bar"><div class="task-progress-fill ${allDone ? 'all-done' : ''}" style="width:${pct}%"></div></div>
                        </div>
                    </div>
                    <div class="member-task-list">
                        ${group.tasks.map(t => `
                            <div class="member-task-item ${t.is_completed ? 'completed' : ''}">
                                <span class="member-task-check">${t.is_completed ? '<i class="icon-check-circle"></i>' : '<i class="icon-circle"></i>'}</span>
                                <span class="member-task-text">${escapeHtml(t.content)}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }).join('');

    } catch (err) {
        body.innerHTML = `<div style="text-align:center;padding:24px;color:var(--text-muted);">Gagal memuat tasks: ${err.message}</div>`;
    }
}

function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// ===== INIT & EVENTS =====

export function initMembersView() {
    document.getElementById('addMemberBtn')?.addEventListener('click', () => openMemberModal());

    document.getElementById('memberSearch')?.addEventListener('input', () => renderMembers());

    document.getElementById('membersTableBody')?.addEventListener('click', async (e) => {
        const btn = e.target.closest('[data-action]');
        if (!btn) return;
        const action = btn.dataset.action;
        const id = btn.dataset.id;

        if (action === 'edit-member') await editMember(id);
        if (action === 'delete-member') await handleDeleteMember(id);
        if (action === 'view-tasks') await showMemberTasksModal(id, btn.dataset.name);
    });

    document.getElementById('saveMemberBtn')?.addEventListener('click', saveMember);
}

async function openMemberModal(member = null) {
    document.getElementById('memberModalTitle').textContent = member ? 'Edit Member' : 'Add Member';
    document.getElementById('memberId').value = member ? member.id : '';
    document.getElementById('memberName').value = member ? member.name : '';
    document.getElementById('memberRole').value = member ? member.role : 'BA';
    document.getElementById('memberStatus').value = member ? member.status : 'Available';
    document.getElementById('memberEmail').value = member ? (member.email || '') : '';
    openModal('memberModal');
}

async function saveMember() {
    const name = document.getElementById('memberName').value.trim();
    if (!name) { showToast('Name is required', 'error'); return; }

    const id = document.getElementById('memberId').value;
    const data = {
        name,
        role: document.getElementById('memberRole').value,
        status: document.getElementById('memberStatus').value,
        email: document.getElementById('memberEmail').value.trim(),
    };

    try {
        if (id) {
            await updateMember(id, data);
            showToast('Member updated');
        } else {
            await createMember(data);
            showToast('Member added');
        }
        closeModal('memberModal');
        await renderMembers();
    } catch (err) {
        showToast(err.message || 'Failed to save member', 'error');
    }
}

async function editMember(id) {
    const members = await fetchMembers();
    const member = members.find(m => m.id === id);
    if (member) openMemberModal(member);
}

async function handleDeleteMember(id) {
    if (!confirm('Delete this member? This will also remove them from all project assignments.')) return;
    try {
        await deleteMemberStore(id);
        showToast('Member deleted');
        await renderMembers();
    } catch (err) {
        showToast(err.message || 'Failed to delete member', 'error');
    }
}
