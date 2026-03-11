import { updateDivisionSettings } from '../lib/store.js';
import { showToast, getCurrentUserProfile, currentDivisionSettings, loadDivisionSettings } from '../lib/ui.js';

// Default fallbacks if no settings loaded yet
const DEFAULT_PHASES = ['Planning', 'Requirement Gathering', 'Design', 'Design Review', 'Doc Creation', 'Development', 'SIT', 'UAT', 'Go Live'];
const DEFAULT_STATUSES = [
    { name: 'Active', color: 'blue' },
    { name: 'On Hold', color: 'orange' },
    { name: 'Completed', color: 'green' }
];
const DEFAULT_CAPACITY_PHASES = ['Doc Creation', 'Design Review', 'Development'];
const DEFAULT_SKILLS = [
    'Requirements Gathering', 'Stakeholder Management', 'Process Modeling',
    'Data Analysis', 'User Story Writing', 'API Documentation',
    'SQL Proficiency', 'Wireframing', 'Communication', 'Agile/Scrum'
];

export async function renderSettings() {
    const container = document.getElementById('settingsContainer');
    if (!container) return;

    const settings = currentDivisionSettings || {};
    const phases = settings.phases || DEFAULT_PHASES;
    const statuses = settings.statuses || DEFAULT_STATUSES;
    const capacityPhases = settings.capacity_active_phases || DEFAULT_CAPACITY_PHASES;
    const skills = settings.skills || DEFAULT_SKILLS;

    container.innerHTML = `
        <div class="glass-card" style="margin-bottom:20px;">
            <div class="section-title" style="margin-bottom:16px;"><i class="icon-layers"></i> Project Phases</div>
            <p style="font-size:12px;color:var(--text-muted);margin-bottom:12px;">Define the phases for projects in this division. Drag to reorder (coming soon).</p>
            <div id="settingsPhasesList" class="settings-tags-list">
                ${phases.map(p => `
                    <div class="settings-tag-item">
                        <span>${p}</span>
                        <button class="settings-tag-remove" data-type="phase" data-value="${p}" title="Remove">&times;</button>
                    </div>
                `).join('')}
            </div>
            <div style="display:flex;gap:8px;margin-top:12px;">
                <input type="text" id="newPhaseInput" placeholder="New phase name..." style="flex:1;padding:8px 12px;background:var(--bg-secondary);border:1px solid var(--glass-border);border-radius:var(--radius-sm);color:var(--text-primary);font-size:13px;">
                <button class="btn btn-secondary btn-sm" id="addPhaseBtn"><i class="icon-plus"></i> Add</button>
            </div>
        </div>

        <div class="glass-card" style="margin-bottom:20px;">
            <div class="section-title" style="margin-bottom:16px;"><i class="icon-tag"></i> Project Statuses</div>
            <p style="font-size:12px;color:var(--text-muted);margin-bottom:12px;">Define the status options for projects.</p>
            <div id="settingsStatusesList" class="settings-tags-list">
                ${statuses.map(s => `
                    <div class="settings-tag-item">
                        <span>${s.name}</span>
                        <button class="settings-tag-remove" data-type="status" data-value="${s.name}" title="Remove">&times;</button>
                    </div>
                `).join('')}
            </div>
            <div style="display:flex;gap:8px;margin-top:12px;">
                <input type="text" id="newStatusInput" placeholder="New status name..." style="flex:1;padding:8px 12px;background:var(--bg-secondary);border:1px solid var(--glass-border);border-radius:var(--radius-sm);color:var(--text-primary);font-size:13px;">
                <button class="btn btn-secondary btn-sm" id="addStatusBtn"><i class="icon-plus"></i> Add</button>
            </div>
        </div>

        <div class="glass-card" style="margin-bottom:20px;">
            <div class="section-title" style="margin-bottom:16px;"><i class="icon-bar-chart-3"></i> Capacity Planner Phases</div>
            <p style="font-size:12px;color:var(--text-muted);margin-bottom:12px;">Select which phases count towards member utilization in the Capacity Planner.</p>
            <div id="settingsCapacityPhases" class="settings-checkbox-list">
                ${phases.map(p => `
                    <label class="checkbox-item" style="display:flex;align-items:center;gap:8px;padding:6px 0;">
                        <input type="checkbox" class="capacity-phase-cb" value="${p}" ${capacityPhases.includes(p) ? 'checked' : ''}>
                        <span style="font-size:13px;">${p}</span>
                    </label>
                `).join('')}
            </div>
        </div>

        <div class="glass-card">
            <div class="section-title" style="margin-bottom:16px;"><i class="icon-grid-3x3"></i> Skills Matrix Headers</div>
            <p style="font-size:12px;color:var(--text-muted);margin-bottom:12px;">Define the skills tracked in the Skills Matrix for this division.</p>
            <div id="settingsSkillsList" class="settings-tags-list">
                ${skills.map(s => `
                    <div class="settings-tag-item">
                        <span>${s}</span>
                        <button class="settings-tag-remove" data-type="skill" data-value="${s}" title="Remove">&times;</button>
                    </div>
                `).join('')}
            </div>
            <div style="display:flex;gap:8px;margin-top:12px;">
                <input type="text" id="newSkillInput" placeholder="New skill name..." style="flex:1;padding:8px 12px;background:var(--bg-secondary);border:1px solid var(--glass-border);border-radius:var(--radius-sm);color:var(--text-primary);font-size:13px;">
                <button class="btn btn-secondary btn-sm" id="addSkillBtn"><i class="icon-plus"></i> Add</button>
            </div>
        </div>
    `;

    // Bind remove buttons
    container.querySelectorAll('.settings-tag-remove').forEach(btn => {
        btn.addEventListener('click', () => {
            const type = btn.dataset.type;
            const value = btn.dataset.value;
            btn.closest('.settings-tag-item').remove();
        });
    });

    // Bind add buttons
    document.getElementById('addPhaseBtn')?.addEventListener('click', () => addTag('phase'));
    document.getElementById('addStatusBtn')?.addEventListener('click', () => addTag('status'));
    document.getElementById('addSkillBtn')?.addEventListener('click', () => addTag('skill'));
}

function addTag(type) {
    let input, listId;
    if (type === 'phase') { input = document.getElementById('newPhaseInput'); listId = 'settingsPhasesList'; }
    else if (type === 'status') { input = document.getElementById('newStatusInput'); listId = 'settingsStatusesList'; }
    else if (type === 'skill') { input = document.getElementById('newSkillInput'); listId = 'settingsSkillsList'; }

    const value = input?.value?.trim();
    if (!value) { showToast('Please enter a name', 'error'); return; }

    const list = document.getElementById(listId);
    const newTag = document.createElement('div');
    newTag.className = 'settings-tag-item';
    newTag.innerHTML = `<span>${value}</span><button class="settings-tag-remove" data-type="${type}" data-value="${value}" title="Remove">&times;</button>`;
    newTag.querySelector('.settings-tag-remove').addEventListener('click', () => newTag.remove());
    list.appendChild(newTag);
    input.value = '';
}

function collectCurrentSettings() {
    // Phases
    const phases = Array.from(document.querySelectorAll('#settingsPhasesList .settings-tag-item span')).map(el => el.textContent.trim());
    
    // Statuses
    const statuses = Array.from(document.querySelectorAll('#settingsStatusesList .settings-tag-item span')).map(el => ({
        name: el.textContent.trim(),
        color: 'gray' // Default color, can be extended later
    }));

    // Capacity phases
    const capacity_active_phases = Array.from(document.querySelectorAll('.capacity-phase-cb:checked')).map(cb => cb.value);

    // Skills
    const skills = Array.from(document.querySelectorAll('#settingsSkillsList .settings-tag-item span')).map(el => el.textContent.trim());

    return { phases, statuses, capacity_active_phases, skills };
}

export function initSettingsView() {
    document.getElementById('saveDivisionSettingsBtn')?.addEventListener('click', async () => {
        const profile = getCurrentUserProfile();
        if (!profile?.division_id) {
            showToast('No division assigned to your account', 'error');
            return;
        }

        const settings = collectCurrentSettings();
        try {
            await updateDivisionSettings(profile.division_id, settings);
            await loadDivisionSettings(); // Refresh cached settings
            showToast('Division settings saved!', 'success');
        } catch (err) {
            showToast(err.message || 'Failed to save settings', 'error');
        }
    });
}
