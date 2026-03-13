import { fetchDivisionSettings } from './store.js';

const AVATAR_COLORS = [
    'linear-gradient(135deg, #FFFFFF, #C0C0C0)',
    'linear-gradient(135deg, #D0D0D0, #A0A0A0)',
    'linear-gradient(135deg, #B0B0B0, #808080)',
    'linear-gradient(135deg, #909090, #606060)',
    'linear-gradient(135deg, #E0E0E0, #B0B0B0)',
    'linear-gradient(135deg, #C8C8C8, #989898)',
    'linear-gradient(135deg, #A8A8A8, #787878)',
    'linear-gradient(135deg, #DADADA, #AAAAAA)',
];

export function getInitials(name) {
    return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

export function getAvatarColor(index) {
    return AVATAR_COLORS[index % AVATAR_COLORS.length];
}

export function getUtilClass(blocks) {
    if (blocks <= 1) return 'low';
    if (blocks <= 3) return 'optimal';
    if (blocks === 4) return 'high';
    return 'over';
}

export function getCapacityStatus(blocks) {
    if (blocks === 0) return { label: 'Unallocated', cls: 'status-under' };
    if (blocks <= 2) return { label: 'Available', cls: 'status-under' };
    if (blocks <= 3) return { label: 'Optimal', cls: 'status-optimal' };
    if (blocks === 4) return { label: 'Full', cls: 'status-high' };
    return { label: 'Over-allocated', cls: 'status-over' };
}

export function getBarColor(blocksCount) {
    if (blocksCount <= 1) return 'linear-gradient(90deg, #606060, #808080)';
    if (blocksCount <= 2) return 'linear-gradient(90deg, #A0A0A0, #C0C0C0)';
    if (blocksCount <= 3) return 'linear-gradient(90deg, #D0D0D0, #E8E8E8)';
    return 'linear-gradient(90deg, #FFFFFF, #E0E0E0)';
}

export function getMemberUtilization(memberId, projects) {
    let total = 0;
    const activePhases = currentDivisionSettings?.capacity_active_phases || ['Doc Creation', 'Design Review', 'Development'];
    for (const p of projects) {
        if (p.status !== 'Active' || !activePhases.includes(p.phase)) continue;
        const assignment = (p.project_assignments || []).find(a => a.member_id === memberId);
        if (assignment) {
            // Check for new allocated_blocks array, fallback to old allocation integer
            if (Array.isArray(assignment.allocated_blocks)) {
                total += assignment.allocated_blocks.length;
            } else if (typeof assignment.allocation === 'number') {
                total += assignment.allocation;
            }
        }
    }
    return total; // Returns total blocks (0-N), max ideal is 4
}

// Generate block indicator HTML (4 specific time slots)
export function renderBlockIndicator(allocatedBlocksArray = []) {
    let html = '<div class="block-indicator">';
    for (let i = 1; i <= 4; i++) {
        const isFilled = allocatedBlocksArray.includes(i);
        let timeLabel = '';
        if (i === 1) timeLabel = '08:30 - 10:30';
        else if (i === 2) timeLabel = '10:30 - 12:30';
        else if (i === 3) timeLabel = '12:30 - 14:30';
        else if (i === 4) timeLabel = '14:30 - 16:30';
        
        html += `<div class="block-cell ${isFilled ? 'filled' : 'empty'}" title="Block ${i}: ${timeLabel}"></div>`;
    }
    html += '</div>';
    return html;
}

// ===== SWEET ALERT =====
import Swal from 'sweetalert2';

const Toast = Swal.mixin({
    toast: true,
    position: 'top-end',
    showConfirmButton: false,
    timer: 3000,
    timerProgressBar: true,
    didOpen: (toast) => {
        toast.onmouseenter = Swal.stopTimer;
        toast.onmouseleave = Swal.resumeTimer;
    }
});

export function showToast(message, type = 'success') {
    Toast.fire({
        icon: type === 'error' ? 'error' : type === 'info' ? 'info' : 'success',
        title: message,
    });
}

export async function showConfirm({ title, text, icon = 'warning', confirmText = 'Yes', cancelText = 'Cancel' } = {}) {
    const result = await Swal.fire({
        title,
        text,
        icon,
        showCancelButton: true,
        confirmButtonText: confirmText,
        cancelButtonText: cancelText,
        background: 'var(--bg-secondary)',
        color: 'var(--text-primary)',
        confirmButtonColor: '#4a4a4a',
        cancelButtonColor: 'transparent',
        customClass: {
            cancelButton: 'swal-cancel-btn',
        }
    });
    return result.isConfirmed;
}

export async function showPromptInput({ title, text, placeholder = '', inputType = 'text' } = {}) {
    const result = await Swal.fire({
        title,
        text,
        input: inputType,
        inputPlaceholder: placeholder,
        showCancelButton: true,
        confirmButtonText: 'OK',
        background: 'var(--bg-secondary)',
        color: 'var(--text-primary)',
        confirmButtonColor: '#4a4a4a',
        inputAttributes: { style: 'background:var(--bg-primary);color:var(--text-primary);border:1px solid var(--glass-border);border-radius:6px;padding:8px 12px;' },
    });
    return result.isConfirmed ? result.value : null;
}

// ===== MODAL =====

export function openModal(id) {
    document.getElementById(id).classList.add('active');
}

export function closeModal(id) {
    document.getElementById(id).classList.remove('active');
}

// ===== NAVIGATION =====

let currentView = 'dashboard';
let viewRenderers = {};

export function registerViewRenderer(name, renderer) {
    viewRenderers[name] = renderer;
}

export function switchView(view) {
    currentView = view;
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    const el = document.getElementById(`view-${view}`);
    if (el) el.classList.add('active');

    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    const navEl = document.querySelector(`.nav-item[data-view="${view}"]`);
    if (navEl) navEl.classList.add('active');

    const sidebar = document.getElementById('sidebar');
    if (sidebar?.classList.contains('open')) sidebar.classList.remove('open');

    if (viewRenderers[view]) viewRenderers[view]();
}

export function getCurrentView() { return currentView; }

export function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('open');
}

// ===== ROLE CHECKS =====

let currentUserProfile = null;

export function setCurrentUserProfile(profile) {
    currentUserProfile = profile;
}

export function getCurrentUserProfile() {
    return currentUserProfile;
}

export function canEdit() {
    return currentUserProfile && (currentUserProfile.role === 'admin' || currentUserProfile.role === 'head');
}

export function isAdmin() {
    return currentUserProfile?.role === 'admin' || currentUserProfile?.role === 'superadmin';
}

export let currentDivisionSettings = null;

export async function loadDivisionSettings() {
    if (!currentUserProfile || currentUserProfile.role === 'superadmin') {
        currentDivisionSettings = null;
        return;
    }
    if (currentUserProfile.division_id) {
        currentDivisionSettings = await fetchDivisionSettings(currentUserProfile.division_id);
    }
}
