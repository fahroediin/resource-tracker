import { fetchProfiles, updateProfile, deleteProfile } from '../lib/store.js';
import { getInitials, getAvatarColor, showToast, showConfirm, openModal, closeModal, isAdmin, getCurrentUserProfile } from '../lib/ui.js';
import { supabase } from '../lib/supabase.js';

let currentPage = 1;
const itemsPerPage = 8;

// Check if the current user can reset password for a target profile
function canResetPassword(targetProfile) {
    const currentUser = getCurrentUserProfile();
    if (!currentUser || !targetProfile) return false;
    if (currentUser.id === targetProfile.id) return false;

    // Superadmin can reset admin/head in any division
    if (currentUser.role === 'superadmin') {
        return ['admin', 'head', 'member'].includes(targetProfile.role);
    }

    // Admin can reset member/head in their division
    if (currentUser.role === 'admin') {
        return targetProfile.role === 'member' &&
            currentUser.division_id &&
            currentUser.division_id === targetProfile.division_id;
    }

    // Head can reset member in their division
    if (currentUser.role === 'head') {
        return targetProfile.role === 'member' &&
            currentUser.division_id &&
            currentUser.division_id === targetProfile.division_id;
    }

    return false;
}

export async function renderUsers() {
    try {
        const profiles = await fetchProfiles();
        const tbody = document.getElementById('usersTableBody');
        const empty = document.getElementById('usersEmpty');
        const pagination = document.getElementById('usersPagination');

        if (profiles.length === 0) {
            tbody.innerHTML = '';
            empty.style.display = 'block';
            if (pagination) pagination.style.display = 'none';
            return;
        }

        empty.style.display = 'none';
        if (pagination) pagination.style.display = 'flex';

        // Pagination calculations
        const totalItems = profiles.length;
        const totalPages = Math.ceil(totalItems / itemsPerPage);
        
        if (currentPage > totalPages) currentPage = totalPages;
        if (currentPage < 1) currentPage = 1;

        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = Math.min(startIndex + itemsPerPage, totalItems);
        const paginatedProfiles = profiles.slice(startIndex, endIndex);

        const currentUser = getCurrentUserProfile();

        tbody.innerHTML = paginatedProfiles.map((p, i) => {
            const actualIndex = startIndex + i;
            const roleBadge = {
                superadmin: 'badge-superadmin',
                admin: 'badge-admin',
                head: 'badge-head',
                member: 'badge-member',
            };
            const isSelf = currentUser?.id === p.id;

            const resetBtn = canResetPassword(p) ? `
              <button title="Reset Password" data-action="reset-password" data-id="${p.id}" data-email="${p.email || ''}" data-name="${p.full_name || 'Unknown'}"><i class="icon-key-round"></i></button>
            ` : '';

            const editDeleteBtns = isAdmin() && !isSelf ? `
              <button title="Change Role" data-action="edit-user" data-id="${p.id}"><i class="icon-shield"></i></button>
              <button title="Delete" class="delete" data-action="delete-user" data-id="${p.id}"><i class="icon-trash-2"></i></button>
            ` : '';

            const actions = (resetBtn || editDeleteBtns)
                ? `<div class="row-actions">${resetBtn}${editDeleteBtns}</div>`
                : (isSelf ? '<span style="font-size:11px;color:var(--text-muted)">You</span>' : '');

            return `
        <tr>
          <td>
            <div class="member-inline">
              <div class="member-inline-avatar" style="background:${getAvatarColor(actualIndex)}">${getInitials(p.full_name || 'U')}</div>
              <div>
                <div style="font-weight:600">${p.full_name || 'Unknown'}</div>
                <div style="font-size:11px;color:var(--text-muted)">${p.email || ''}</div>
              </div>
            </div>
          </td>
          <td><span class="badge ${roleBadge[p.role] || ''}">${p.role}</span></td>
          <td style="font-size:12px;color:var(--text-muted)">${new Date(p.created_at).toLocaleDateString()}</td>
          <td>${actions}</td>
        </tr>
      `;
        }).join('');
        
        // Render pagination controls
        renderPaginationControls(totalItems, totalPages, startIndex, endIndex);

    } catch (err) {
        console.error('Users render error:', err);
    }
}

function renderPaginationControls(totalItems, totalPages, startIndex, endIndex) {
    const pageInfo = document.getElementById('usersPageInfo');
    if (!pageInfo) return;

    pageInfo.textContent = `Showing ${startIndex + 1}-${endIndex} of ${totalItems} users`;

    const prevBtn = document.getElementById('usersPrevBtn');
    const nextBtn = document.getElementById('usersNextBtn');
    const pageNumbers = document.getElementById('usersPageNumbers');

    prevBtn.disabled = currentPage === 1;
    nextBtn.disabled = currentPage === totalPages;

    let pagesHTML = '';
    for (let i = 1; i <= totalPages; i++) {
        if (totalPages <= 7 || (i === 1 || i === totalPages || (i >= currentPage - 1 && i <= currentPage + 1))) {
            pagesHTML += `<button class="pagination-btn ${i === currentPage ? 'active' : ''}" data-page="${i}">${i}</button>`;
        } else if (i === currentPage - 2 || i === currentPage + 2) {
            pagesHTML += `<span style="color:var(--text-muted);align-self:end;padding-bottom:4px">...</span>`;
        }
    }
    pageNumbers.innerHTML = pagesHTML;
}

export function initUsersView() {
    document.getElementById('usersTableBody')?.addEventListener('click', async (e) => {
        const btn = e.target.closest('[data-action]');
        if (!btn) return;
        const action = btn.dataset.action;
        const id = btn.dataset.id;

        if (action === 'edit-user') await openRoleModal(id);
        if (action === 'delete-user') await handleDeleteUser(id);
        if (action === 'reset-password') await handleResetPassword(btn.dataset.email, btn.dataset.name);
    });

    document.getElementById('saveUserRoleBtn')?.addEventListener('click', saveUserRole);

    // Pagination events
    document.getElementById('usersPrevBtn')?.addEventListener('click', () => {
        if (currentPage > 1) { currentPage--; renderUsers(); }
    });
    
    document.getElementById('usersNextBtn')?.addEventListener('click', () => {
        currentPage++; renderUsers();
    });

    document.getElementById('usersPageNumbers')?.addEventListener('click', (e) => {
        const btn = e.target.closest('.pagination-btn');
        if (!btn || btn.classList.contains('active')) return;
        currentPage = parseInt(btn.dataset.page, 10);
        renderUsers();
    });
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
    const confirmed = await showConfirm({
        title: 'Delete User?',
        text: 'This action cannot be undone.',
        confirmText: 'Delete',
    });
    if (!confirmed) return;

    try {
        await deleteProfile(id);
        showToast('User deleted');
        await renderUsers();
    } catch (err) {
        showToast(err.message || 'Failed to delete user', 'error');
    }
}

async function handleResetPassword(email, name) {
    if (!email) {
        showToast('Email tidak ditemukan untuk user ini. Jalankan migration_reset_password.sql terlebih dahulu.', 'error');
        return;
    }

    const confirmed = await showConfirm({
        title: 'Reset Password?',
        text: `Kirim email reset password ke ${name} (${email})?`,
        icon: 'question',
        confirmText: 'Kirim Reset Email',
    });
    if (!confirmed) return;

    try {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: window.location.origin,
        });
        if (error) throw error;
        showToast(`Email reset password telah dikirim ke ${email}`);
    } catch (err) {
        showToast(err.message || 'Gagal mengirim reset password', 'error');
    }
}
