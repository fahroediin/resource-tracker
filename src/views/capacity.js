import { fetchMembers, fetchProjects } from '../lib/store.js';
import { getInitials, getAvatarColor, getMemberUtilization, getUtilClass, getCapacityStatus, getBarColor, currentDivisionSettings } from '../lib/ui.js';

export async function renderCapacity() {
    try {
        const members = await fetchMembers();
        const projects = await fetchProjects();
        const grid = document.getElementById('capacityGrid');
        const empty = document.getElementById('capacityEmpty');
        const searchInput = document.getElementById('capacitySearch');

        if (members.length === 0) {
            grid.innerHTML = '';
            empty.style.display = 'block';
            if (searchInput) searchInput.parentElement.style.display = 'none';
            return;
        }

        if (searchInput) searchInput.parentElement.style.display = 'flex';

        // Apply search filter
        const searchTerm = searchInput ? searchInput.value.toLowerCase() : '';
        const filteredMembers = members.filter(m => m.name.toLowerCase().includes(searchTerm) || m.role.toLowerCase().includes(searchTerm));

        if (filteredMembers.length === 0) {
            grid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 40px; color: var(--text-muted); font-size: 14px;">No members match your search.</div>';
            empty.style.display = 'none';
            return;
        }

        empty.style.display = 'none';
        grid.innerHTML = filteredMembers.map((m) => {
            // Find actual index in original array for consistent avatar colors
            const originalIndex = members.findIndex(orig => orig.id === m.id);
            const util = getMemberUtilization(m.id, projects);
            const status = getCapacityStatus(util);
            const barColor = getBarColor(util);

            const activePhases = currentDivisionSettings?.capacity_active_phases || ['Doc Creation', 'Design Review', 'Development'];
            const assignedProjects = projects
                .filter(p => p.status === 'Active' && activePhases.includes(p.phase) && (p.project_assignments || []).some(a => a.member_id === m.id))
                .map(p => {
                    const a = p.project_assignments.find(a => a.member_id === m.id);
                    return `<div class="capacity-project-tag">${p.name} <span class="alloc">${a.allocation}%</span></div>`;
                }).join('');

            return `
        <div class="capacity-card">
          <div class="capacity-header">
            <div class="capacity-member">
              <div class="capacity-avatar" style="background:${getAvatarColor(originalIndex)}">${getInitials(m.name)}</div>
              <div>
                <div class="capacity-name">${m.name}</div>
                <div class="capacity-role">${m.role}</div>
              </div>
            </div>
            <div>
              <span class="capacity-status ${status.cls}">${status.label}</span>
              <span style="margin-left:8px;font-size:20px;font-weight:800;color:var(--text-primary);">${util}%</span>
            </div>
          </div>
          <div class="capacity-bar-container">
            <div class="capacity-bar-fill" style="width:${Math.min(util, 100)}%;background:${barColor}"></div>
          </div>
          <div class="capacity-projects">${assignedProjects || '<span style="color:var(--text-muted);font-size:12px">No project assignments</span>'}</div>
        </div>
      `;
        }).join('');
    } catch (err) {
        console.error('Capacity render error:', err);
    }
}

export function initCapacityView() {
    const searchInput = document.getElementById('capacitySearch');
    if (searchInput) {
        searchInput.addEventListener('input', () => {
            renderCapacity();
        });
    }
}
