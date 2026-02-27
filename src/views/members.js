import { fetchMembers, fetchProjects, fetchSkills, createMember, updateMember, deleteMember as deleteMemberStore } from '../lib/store.js';
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

            const actions = canEdit() ? `
        <div class="row-actions">
          <button title="Edit" data-action="edit-member" data-id="${m.id}"><i class="icon-pencil"></i></button>
          <button title="Delete" class="delete" data-action="delete-member" data-id="${m.id}"><i class="icon-trash-2"></i></button>
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
