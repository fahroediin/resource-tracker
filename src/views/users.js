import { fetchProfiles, updateProfile, deleteProfile } from '../lib/store.js';
import { getInitials, getAvatarColor, showToast, openModal, closeModal, isAdmin, getCurrentUserProfile } from '../lib/ui.js';

export async function renderUsers() {
    try {
        const profiles = await fetchProfiles();
        const tbody = document.getElementById('usersTableBody');
        const empty = document.getElementById('usersEmpty');

        if (profiles.length === 0) {
            tbody.innerHTML = '';
            empty.style.display = 'block';
            return;
        }

        empty.style.display = 'none';
        const currentUser = getCurrentUserProfile();

        tbody.innerHTML = profiles.map((p, i) => {
            const roleBadge = {
                admin: 'badge-admin',
                head: 'badge-head',
                member: 'badge-member',
            };
            const isSelf = currentUser?.id === p.id;

            const actions = isAdmin() && !isSelf ? `
        <div class="row-actions">
          <button title="Change Role" data-action="edit-user" data-id="${p.id}"><i class="icon-shield"></i></button>
          <button title="Delete" class="delete" data-action="delete-user" data-id="${p.id}"><i class="icon-trash-2"></i></button>
        </div>
      ` : (isSelf ? '<span style="font-size:11px;color:var(--text-muted)">You</span>' : '');

            return `
        <tr>
          <td>
            <div class="member-inline">
              <div class="member-inline-avatar" style="background:${getAvatarColor(i)}">${getInitials(p.full_name || 'U')}</div>
              <div>
                <div style="font-weight:600">${p.full_name || 'Unknown'}</div>
              </div>
            </div>
          </td>
          <td><span class="badge ${roleBadge[p.role] || ''}">${p.role}</span></td>
          <td style="font-size:12px;color:var(--text-muted)">${new Date(p.created_at).toLocaleDateString()}</td>
          <td>${actions}</td>
        </tr>
      `;
        }).join('');
    } catch (err) {
        console.error('Users render error:', err);
    }
}

export function initUsersView() {
    document.getElementById('usersTableBody')?.addEventListener('click', async (e) => {
        const btn = e.target.closest('[data-action]');
        if (!btn) return;
        const action = btn.dataset.action;
        const id = btn.dataset.id;

        if (action === 'edit-user') await openRoleModal(id);
        if (action === 'delete-user') await handleDeleteUser(id);
    });

    document.getElementById('saveUserRoleBtn')?.addEventListener('click', saveUserRole);
}

async function openRoleModal(id) {
    const profiles = await fetchProfiles();
    const profile = profiles.find(p => p.id === id);
    if (!profile) return;

    document.getElementById('userRoleId').value = id;
    document.getElementById('userRoleName').textContent = profile.full_name || 'Unknown';
    document.getElementById('userRoleSelect').value = profile.role;
    openModal('userRoleModal');
}

async function saveUserRole() {
    const id = document.getElementById('userRoleId').value;
    const role = document.getElementById('userRoleSelect').value;

    try {
        await updateProfile(id, { role });
        showToast('User role updated');
        closeModal('userRoleModal');
        await renderUsers();
    } catch (err) {
        showToast(err.message || 'Failed to update role', 'error');
    }
}

async function handleDeleteUser(id) {
    if (!confirm('Delete this user profile? This action cannot be undone.')) return;
    try {
        await deleteProfile(id);
        showToast('User deleted');
        await renderUsers();
    } catch (err) {
        showToast(err.message || 'Failed to delete user', 'error');
    }
}
