const AVATAR_COLORS = [
    'linear-gradient(135deg, #A2CB8B, #7fb366)',
    'linear-gradient(135deg, #6bc5d2, #4da8b5)',
    'linear-gradient(135deg, #a87fd4, #8b5fbf)',
    'linear-gradient(135deg, #f0c050, #d4a030)',
    'linear-gradient(135deg, #e8636f, #c5404c)',
    'linear-gradient(135deg, #7fb366, #5a9a40)',
    'linear-gradient(135deg, #4da8b5, #3690a0)',
    'linear-gradient(135deg, #8b5fbf, #7040a0)',
];

export function getInitials(name) {
    return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

export function getAvatarColor(index) {
    return AVATAR_COLORS[index % AVATAR_COLORS.length];
}

export function getUtilClass(pct) {
    if (pct <= 50) return 'low';
    if (pct <= 80) return 'optimal';
    if (pct <= 100) return 'high';
    return 'over';
}

export function getCapacityStatus(pct) {
    if (pct < 50) return { label: 'Under-allocated', cls: 'status-under' };
    if (pct <= 80) return { label: 'Optimal', cls: 'status-optimal' };
    if (pct <= 100) return { label: 'High Load', cls: 'status-high' };
    return { label: 'Over-allocated', cls: 'status-over' };
}

export function getBarColor(pct) {
    if (pct <= 50) return 'linear-gradient(90deg, #6bc5d2, #88d8e0)';
    if (pct <= 80) return 'linear-gradient(90deg, #A2CB8B, #b8d9a5)';
    if (pct <= 100) return 'linear-gradient(90deg, #f0c050, #f5d280)';
    return 'linear-gradient(90deg, #e8636f, #f09da5)';
}

export function getMemberUtilization(memberId, projects) {
    let total = 0;
    for (const p of projects) {
        if (p.status === 'Completed' || p.status === 'On Hold') continue;
        const assignment = (p.project_assignments || []).find(a => a.member_id === memberId);
        if (assignment) total += assignment.allocation;
    }
    return total;
}

// ===== TOAST =====

export function showToast(message, type = 'success') {
    const container = document.getElementById('toastContainer');
    const icons = { success: 'icon-check-circle', error: 'icon-alert-circle', info: 'icon-info' };
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<i class="${icons[type] || icons.info}"></i> ${message}`;
    container.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
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
    return currentUserProfile?.role === 'admin';
}
