import { supabase } from '../lib/supabase.js';
import { showToast, getCurrentUserProfile } from '../lib/ui.js';

// Fetch the member record linked to the logged-in user by email
async function getMyMemberRecord() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.email) return null;

    const { data, error } = await supabase
        .from('members')
        .select('*')
        .ilike('email', user.email)
        .maybeSingle();

    return data || null;
}

// Fetch projects assigned to a specific member_id
async function getMyAssignments(memberId) {
    const { data, error } = await supabase
        .from('project_assignments')
        .select('*, projects(id, name, client_name, type, phase, status, start_date, end_date)')
        .eq('member_id', memberId);

    if (error) throw error;
    return data || [];
}

export async function renderMyProjects() {
    const container = document.getElementById('myProjectsContainer');
    if (!container) return;

    container.innerHTML = `<div style="display:flex;justify-content:center;padding:40px"><div class="loading-spinner"></div></div>`;

    try {
        const member = await getMyMemberRecord();

        if (!member) {
            container.innerHTML = `
                <div class="glass-card" style="text-align:center;padding:48px;">
                    <i class="icon-user-x" style="font-size:48px;color:var(--text-muted);display:block;margin-bottom:16px;"></i>
                    <h3 style="margin-bottom:8px;">No member record found</h3>
                    <p style="color:var(--text-muted);font-size:13px;">Your account email doesn't match any team member. Ask your Head/Admin to update your email in the Members list.</p>
                </div>`;
            return;
        }

        const assignments = await getMyAssignments(member.id);

        if (assignments.length === 0) {
            container.innerHTML = `
                <div class="glass-card" style="text-align:center;padding:48px;">
                    <i class="icon-folder-open" style="font-size:48px;color:var(--text-muted);display:block;margin-bottom:16px;"></i>
                    <h3 style="margin-bottom:8px;">No project assignments yet</h3>
                    <p style="color:var(--text-muted);font-size:13px;">You haven't been assigned to any projects yet.</p>
                </div>`;
            return;
        }

        container.innerHTML = `
            <div class="glass-card" style="margin-bottom:20px;padding:16px 20px;display:flex;align-items:center;gap:12px;">
                <i class="icon-info" style="color:var(--text-muted);font-size:18px;flex-shrink:0;"></i>
                <p style="font-size:13px;color:var(--text-secondary);margin:0;">
                    Update the <strong>allocation %</strong> to reflect how much of your working time is spent on each project. Click <strong>Save</strong> after editing.
                </p>
            </div>
            <div class="my-projects-grid" id="myProjectsList">
                ${assignments.map(a => {
                    const p = a.projects;
                    const typeMap = { 'Internal': 'badge-internal', 'External': 'badge-external', 'POC': 'badge-poc' };
                    return `
                    <div class="glass-card my-project-card" data-assignment-id="${a.id}">
                        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:16px;">
                            <div>
                                <div style="font-weight:700;font-size:15px;margin-bottom:4px;">${p.name}</div>
                                <div style="font-size:12px;color:var(--text-muted);">${p.client_name || '—'}</div>
                            </div>
                            <span class="badge ${typeMap[p.type] || 'badge-internal'}">${p.type}</span>
                        </div>
                        <div style="display:flex;gap:8px;margin-bottom:20px;flex-wrap:wrap;">
                            <span class="badge" style="background:var(--bg-secondary);border:1px solid var(--glass-border);font-size:11px;">${p.phase || '—'}</span>
                            <span class="badge" style="background:var(--bg-secondary);border:1px solid var(--glass-border);font-size:11px;">${p.status || '—'}</span>
                        </div>
                        <div>
                            <label style="font-size:12px;color:var(--text-muted);display:block;margin-bottom:8px;">My Allocation</label>
                            <div style="display:flex;align-items:center;gap:12px;">
                                <input 
                                    type="range" 
                                    min="0" max="100" step="5"
                                    value="${a.allocation}"
                                    class="allocation-slider"
                                    data-assignment-id="${a.id}"
                                    style="flex:1;"
                                >
                                <span class="allocation-display" style="font-size:20px;font-weight:800;min-width:52px;text-align:right;color:var(--text-primary);">${a.allocation}%</span>
                            </div>
                        </div>
                        <div style="margin-top:16px;display:flex;justify-content:flex-end;">
                            <button class="btn btn-primary btn-sm save-allocation-btn" data-assignment-id="${a.id}" style="font-size:12px;">
                                <i class="icon-save"></i> Save
                            </button>
                        </div>
                    </div>`;
                }).join('')}
            </div>`;

        // Wire up sliders → display
        container.querySelectorAll('.allocation-slider').forEach(slider => {
            const display = slider.parentElement.querySelector('.allocation-display');
            slider.addEventListener('input', () => {
                display.textContent = slider.value + '%';
            });
        });

        // Wire up save buttons
        container.querySelectorAll('.save-allocation-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                const assignmentId = btn.dataset.assignmentId;
                const slider = container.querySelector(`.allocation-slider[data-assignment-id="${assignmentId}"]`);
                const newAlloc = parseInt(slider.value, 10);

                btn.disabled = true;
                btn.innerHTML = '<i class="icon-loader-circle"></i> Saving...';

                try {
                    const { error } = await supabase
                        .from('project_assignments')
                        .update({ allocation: newAlloc })
                        .eq('id', assignmentId);

                    if (error) throw error;
                    showToast('Allocation saved!');
                } catch (err) {
                    showToast(err.message || 'Failed to save', 'error');
                } finally {
                    btn.disabled = false;
                    btn.innerHTML = '<i class="icon-save"></i> Save';
                }
            });
        });

    } catch (err) {
        console.error('My Projects error:', err);
        container.innerHTML = `<div style="text-align:center;padding:40px;color:var(--text-muted);">Failed to load projects: ${err.message}</div>`;
    }
}

export function initMyProjectsView() {
    // No persistent event bindings needed — sliders/buttons are bound on render
}
