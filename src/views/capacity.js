import { fetchMembers, fetchProjects } from '../lib/store.js';
import { getInitials, getAvatarColor, getMemberUtilization, getCapacityStatus, getBarColor } from '../lib/ui.js';

export async function renderCapacity() {
    try {
        const members = await fetchMembers();
        const projects = await fetchProjects();
        const grid = document.getElementById('capacityGrid');
        const empty = document.getElementById('capacityEmpty');

        if (members.length === 0) {
            grid.innerHTML = '';
            empty.style.display = 'block';
            return;
        }

        empty.style.display = 'none';
        grid.innerHTML = members.map((m, i) => {
            const util = getMemberUtilization(m.id, projects);
            const status = getCapacityStatus(util);
            const barColor = getBarColor(util);

            const assignedProjects = projects
                .filter(p => (p.project_assignments || []).some(a => a.member_id === m.id) && p.status !== 'Completed')
                .map(p => {
                    const a = p.project_assignments.find(a => a.member_id === m.id);
                    return `<div class="capacity-project-tag">${p.name} <span class="alloc">${a.allocation}%</span></div>`;
                }).join('');

            return `
        <div class="capacity-card">
          <div class="capacity-header">
            <div class="capacity-member">
              <div class="capacity-avatar" style="background:${getAvatarColor(i)}">${getInitials(m.name)}</div>
              <div>
                <div class="capacity-name">${m.name}</div>
                <div class="capacity-role">${m.role}</div>
              </div>
            </div>
            <div>
              <span class="capacity-status ${status.cls}">${status.label}</span>
              <span style="margin-left:8px;font-size:20px;font-weight:800;color:${util > 100 ? 'var(--accent-rose)' : 'var(--text-primary)'}">${util}%</span>
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
