import { signIn, signUp } from '../lib/auth.js';
import { showToast } from '../lib/ui.js';

let isLoginMode = true;

export function initAuthView() {
    const toggleLink = document.getElementById('authToggleLink');
    const form = document.getElementById('authForm');

    toggleLink?.addEventListener('click', (e) => {
        e.preventDefault();
        isLoginMode = !isLoginMode;
        updateAuthUI();
    });

    form?.addEventListener('submit', handleAuthSubmit);
}

function updateAuthUI() {
    const title = document.getElementById('authTitle');
    const subtitle = document.getElementById('authSubtitle');
    const nameGroup = document.getElementById('authNameGroup');
    const submitBtn = document.getElementById('authSubmitBtn');
    const toggleText = document.getElementById('authToggleText');
    const toggleLink = document.getElementById('authToggleLink');
    const errorEl = document.getElementById('authError');

    errorEl.classList.remove('visible');

    if (isLoginMode) {
        title.textContent = 'Welcome Back';
        subtitle.textContent = 'Sign in to your account';
        nameGroup.classList.add('hidden');
        submitBtn.textContent = 'Sign In';
        toggleText.textContent = "Don't have an account? ";
        toggleLink.textContent = 'Sign Up';
    } else {
        title.textContent = 'Create Account';
        subtitle.textContent = 'Your account will need admin approval to edit data';
        nameGroup.classList.remove('hidden');
        submitBtn.textContent = 'Sign Up';
        toggleText.textContent = 'Already have an account? ';
        toggleLink.textContent = 'Sign In';
    }
}

async function handleAuthSubmit(e) {
    e.preventDefault();
    const email = document.getElementById('authEmail').value.trim();
    const password = document.getElementById('authPassword').value;
    const fullName = document.getElementById('authFullName')?.value?.trim() || '';
    const submitBtn = document.getElementById('authSubmitBtn');
    const errorEl = document.getElementById('authError');

    if (!email || !password) {
        showAuthError('Email and password are required');
        return;
    }

    if (!isLoginMode && !fullName) {
        showAuthError('Full name is required');
        return;
    }

    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="loading-spinner"></span> Processing...';
    errorEl.classList.remove('visible');

    try {
        if (isLoginMode) {
            await signIn(email, password);
        } else {
            await signUp(email, password, fullName);
            showToast('Account created! You can now sign in.', 'success');
        }
    } catch (err) {
        showAuthError(err.message || 'Authentication failed');
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = isLoginMode ? 'Sign In' : 'Sign Up';
    }
}

function showAuthError(message) {
    const errorEl = document.getElementById('authError');
    errorEl.textContent = message;
    errorEl.classList.add('visible');
}
