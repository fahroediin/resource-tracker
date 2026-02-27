import './styles/index.css';
import { getCurrentUser, onAuthStateChange, signOut } from './lib/auth.js';
import { seedIfEmpty } from './lib/store.js';
import { switchView, registerViewRenderer, setCurrentUserProfile, getInitials, showToast, toggleSidebar, closeModal } from './lib/ui.js';
import { initAuthView } from './views/auth.js';
import { renderDashboard } from './views/dashboard.js';
import { renderMembers, initMembersView } from './views/members.js';
import { renderProjects, initProjectsView } from './views/projects.js';
import { renderCapacity } from './views/capacity.js';
import { renderSkillsMatrix, initSkillsView } from './views/skills.js';
import { renderUsers, initUsersView } from './views/users.js';

// Register view renderers
registerViewRenderer('dashboard', renderDashboard);
registerViewRenderer('members', renderMembers);
registerViewRenderer('projects', renderProjects);
registerViewRenderer('capacity', renderCapacity);
registerViewRenderer('skills', renderSkillsMatrix);
registerViewRenderer('users', renderUsers);

// ===== APP INIT =====

async function initApp() {
    // Init view event handlers
    initAuthView();
    initMembersView();
    initProjectsView();
    initSkillsView();
    initUsersView();

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
    onAuthStateChange(async (session) => {
        if (session) {
            await showApp();
        } else {
            showAuth();
        }
    });

    // Initial check
    const user = await getCurrentUser();
    if (user) {
        await showApp();
    } else {
        showAuth();
    }
}

async function showApp() {
    const user = await getCurrentUser();
    if (!user) return showAuth();

    setCurrentUserProfile(user.profile);

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

    document.getElementById('authSection').classList.add('hidden');
    document.getElementById('appSection').classList.remove('hidden');

    // Seed data if needed
    try {
        await seedIfEmpty();
    } catch (err) {
        console.warn('Seed skipped:', err.message);
    }

    // Render dashboard
    switchView('dashboard');
}

function showAuth() {
    setCurrentUserProfile(null);
    document.getElementById('authSection').classList.remove('hidden');
    document.getElementById('appSection').classList.add('hidden');
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
