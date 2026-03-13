import './styles/index.css';
import { getCurrentUser, onAuthStateChange, signOut } from './lib/auth.js';
import { supabase } from './lib/supabase.js';
import { seedIfEmpty } from './lib/store.js';
import { switchView, registerViewRenderer, setCurrentUserProfile, getInitials, showToast, toggleSidebar, closeModal, loadDivisionSettings } from './lib/ui.js';
import { initAuthView } from './views/auth.js';
import { renderDashboard } from './views/dashboard.js';
import { renderMembers, initMembersView } from './views/members.js';
import { renderProjects, initProjectsView } from './views/projects.js';
import { renderCapacity, initCapacityView } from './views/capacity.js';
import { renderSkillsMatrix, initSkillsView } from './views/skills.js';
import { renderUsers, initUsersView } from './views/users.js';
import { renderSettings, initSettingsView } from './views/settings.js';
import { renderSuperadmin, initSuperadminView } from './views/superadmin.js';
import { renderMyProjects, initMyProjectsView } from './views/myprojects.js';
import { renderReports, initReportsView } from './views/reports.js';

// Register view renderers
registerViewRenderer('dashboard', renderDashboard);
registerViewRenderer('members', renderMembers);
registerViewRenderer('projects', renderProjects);
registerViewRenderer('capacity', renderCapacity);
registerViewRenderer('skills', renderSkillsMatrix);
registerViewRenderer('users', renderUsers);
registerViewRenderer('settings', renderSettings);
registerViewRenderer('superadmin', renderSuperadmin);
registerViewRenderer('myprojects', renderMyProjects);
registerViewRenderer('reports', renderReports);

// Password recovery lock — persists across page refreshes via sessionStorage
function setRecoveryMode(val) { val ? sessionStorage.setItem('recovery_mode', '1') : sessionStorage.removeItem('recovery_mode'); }
function isRecoveryMode() { return sessionStorage.getItem('recovery_mode') === '1'; }

// ===== APP INIT =====

async function initApp() {
    // Init view event handlers
    initAuthView();
    initMembersView();
    initProjectsView();
    initCapacityView();
    initSkillsView();
    initUsersView();
    initSettingsView();
    initSuperadminView();
    initMyProjectsView();
    initReportsView();

    // Bind sidebar nav
    document.querySelectorAll('.nav-item[data-view]').forEach(item => {
        item.addEventListener('click', () => switchView(item.dataset.view));
    });

    // Bind mobile toggle
    document.getElementById('mobileToggle')?.addEventListener('click', toggleSidebar);

    // Bind modal close on escape
    document.addEventListener('keydown', e => {
        if (e.key === 'Escape') {
            document.querySelectorAll('.modal-overlay.active').forEach(m => m.classList.remove('active'));
        }
    });

    // Bind modal close on overlay click
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
        overlay.addEventListener('click', e => {
            if (e.target === overlay) overlay.classList.remove('active');
        });
    });

    // Bind logout
    document.getElementById('logoutBtn')?.addEventListener('click', async () => {
        try {
            await signOut();
        } catch (err) {
            showToast('Logout failed', 'error');
        }
    });

    // Handle URL hash errors (e.g. expired email links)
    handleAuthRedirectErrors();

    // Auth state listener
    onAuthStateChange(async (session, event) => {
        if (event === 'PASSWORD_RECOVERY') {
            setRecoveryMode(true);
            showResetPassword();
        } else if (session && !isRecoveryMode()) {
            await showApp();
        } else if (session && isRecoveryMode()) {
            showResetPassword();
        } else if (!session) {
            setRecoveryMode(false);
            showAuth();
        }
    });

    // Reset password form handler
    document.getElementById('resetPasswordForm')?.addEventListener('submit', handleResetPassword);
    // Theme Toggle Logic
    const themeBtn = document.getElementById('themeToggleBtn');
    if (themeBtn) {
        const savedTheme = localStorage.getItem('ba-theme') || 'dark';
        if (savedTheme === 'light') {
            document.documentElement.setAttribute('data-theme', 'light');
            themeBtn.innerHTML = '<i class="icon-sun"></i>';
        }

        themeBtn.addEventListener('click', () => {
            const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
            const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
            document.documentElement.setAttribute('data-theme', newTheme);
            localStorage.setItem('ba-theme', newTheme);
            themeBtn.innerHTML = newTheme === 'light' ? '<i class="icon-sun"></i>' : '<i class="icon-moon"></i>';
        });
    }

    // Initial check
    const user = await getCurrentUser();
    if (user) {
        await showApp();
    } else {
        showAuth();
    }
}

async function showApp() {
    // Block access during password recovery
    if (isRecoveryMode()) return showResetPassword();

    const user = await getCurrentUser();
    if (!user) return showAuth();

    setCurrentUserProfile(user.profile);
    await loadDivisionSettings();

    // Update sidebar user info
    const userName = document.getElementById('currentUserName');
    const userRole = document.getElementById('currentUserRole');
    const userAvatar = document.getElementById('currentUserAvatar');

    if (userName) userName.textContent = user.profile?.full_name || user.email;
    if (userRole) userRole.textContent = user.profile?.role || 'member';
    if (userAvatar) userAvatar.textContent = getInitials(user.profile?.full_name || user.email || 'U');

    // Show/hide Users nav based on role
    const usersNav = document.querySelector('.nav-item[data-view="users"]');
    if (usersNav) {
        const canSeeUsers = user.profile?.role === 'admin' || user.profile?.role === 'head';
        usersNav.style.display = canSeeUsers ? '' : 'none';
    }

    // Show/hide Settings nav based on role
    const settingsNav = document.querySelector('.nav-item[data-view="settings"]');
    if (settingsNav) {
        const canSeeSettings = user.profile?.role === 'admin' || user.profile?.role === 'head' || user.profile?.role === 'superadmin';
        settingsNav.style.display = canSeeSettings ? '' : 'none';
    }

    // Show/hide Superadmin nav based on role
    const superadminNav = document.querySelector('.nav-item[data-view="superadmin"]');
    if (superadminNav) {
        const canSeeSuperadmin = user.profile?.role === 'superadmin';
        superadminNav.style.display = canSeeSuperadmin ? '' : 'none';
    }

    // Show/hide My Projects nav — only for member role
    const myProjectsNav = document.querySelector('.nav-item[data-view="myprojects"]');
    if (myProjectsNav) {
        const canSeeMyProjects = user.profile?.role === 'member';
        myProjectsNav.style.display = canSeeMyProjects ? '' : 'none';
    }

    // Show/hide Reports nav — only for head/admin
    const reportsNav = document.querySelector('.nav-item[data-view="reports"]');
    if (reportsNav) {
        const canSeeReports = user.profile?.role === 'admin' || user.profile?.role === 'head';
        reportsNav.style.display = canSeeReports ? '' : 'none';
    }

    // Show/hide Cycles nav — only for head/admin
    const cyclesNav = document.querySelector('.nav-item[data-view="cycles"]');
    if (cyclesNav) {
        const canSeeCycles = user.profile?.role === 'admin' || user.profile?.role === 'head';
        cyclesNav.style.display = canSeeCycles ? '' : 'none';
    }

    const appSection = document.getElementById('appSection');
    const isFirstLoad = appSection.classList.contains('hidden');

    // Hide initial loader
    const loader = document.getElementById('globalLoader');
    if (loader) loader.style.display = 'none';

    document.getElementById('authSection').classList.add('hidden');
    appSection.classList.remove('hidden');

    // Show pending approval banner for member role
    const banner = document.getElementById('approvalBanner');
    if (banner) {
        banner.classList.toggle('hidden', user.profile?.role !== 'member');
    }

    // Seed data if needed (disabled — uncomment to auto-seed on first use)
    // try {
    //     await seedIfEmpty();
    // } catch (err) {
    //     console.warn('Seed skipped:', err.message);
    // }

    // Render dashboard only if we just loaded the app/logged in
    if (isFirstLoad) {
        switchView('dashboard');
    }
}

function showAuth() {
    setCurrentUserProfile(null);
    
    // Hide initial loader
    const loader = document.getElementById('globalLoader');
    if (loader) loader.style.display = 'none';

    document.getElementById('authSection').classList.remove('hidden');
    document.getElementById('appSection').classList.add('hidden');
    document.getElementById('resetPasswordSection').classList.add('hidden');
}

function showResetPassword() {
    // Hide initial loader
    const loader = document.getElementById('globalLoader');
    if (loader) loader.style.display = 'none';

    document.getElementById('authSection').classList.add('hidden');
    document.getElementById('appSection').classList.add('hidden');
    document.getElementById('resetPasswordSection').classList.remove('hidden');

    // Clear any previous inputs/errors
    document.getElementById('resetNewPassword').value = '';
    document.getElementById('resetConfirmPassword').value = '';
    document.getElementById('resetError').textContent = '';
    document.getElementById('resetError').style.display = 'none';
}

async function handleResetPassword(e) {
    e.preventDefault();

    const newPassword = document.getElementById('resetNewPassword').value;
    const confirmPassword = document.getElementById('resetConfirmPassword').value;
    const errorEl = document.getElementById('resetError');
    const submitBtn = document.getElementById('resetSubmitBtn');

    // Reset error
    errorEl.style.display = 'none';

    // Validation
    if (newPassword.length < 6) {
        errorEl.textContent = 'Password minimal 6 karakter';
        errorEl.style.display = 'block';
        return;
    }

    if (newPassword !== confirmPassword) {
        errorEl.textContent = 'Password tidak cocok';
        errorEl.style.display = 'block';
        return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Menyimpan...';

    try {
        const { error } = await supabase.auth.updateUser({ password: newPassword });
        if (error) throw error;

        showToast('Password berhasil diubah! Silakan login kembali.');

        // Sign out so user can login with new password
        await signOut();
    } catch (err) {
        errorEl.textContent = err.message || 'Gagal mengubah password';
        errorEl.style.display = 'block';
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Simpan Password Baru';
    }
}

function handleAuthRedirectErrors() {
    const hash = window.location.hash;
    if (!hash || !hash.includes('error')) return;

    const params = new URLSearchParams(hash.substring(1));
    const errorDescription = params.get('error_description');

    if (errorDescription) {
        const message = decodeURIComponent(errorDescription.replace(/\+/g, ' '));
        showToast(message, 'error');
    }

    // Clean up URL
    history.replaceState(null, '', window.location.pathname);
}

initApp();
