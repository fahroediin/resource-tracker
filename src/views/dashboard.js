import { fetchMembers, fetchProjects } from '../lib/store.js';
import { getInitials, getAvatarColor, getMemberUtilization, getUtilClass } from '../lib/ui.js';

export async function renderDashboard() {
    try {
        const members = await fetchMembers();
        const projects = await fetchProjects();
        const activeProjects = projects.filter(p => p.status === 'Active' || p.status === 'Planning');
        const onLeave = members.filter(m => m.status === 'On Leave').length;

        const avgUtil = members.length
            ? Math.round(members.reduce((acc, m) => acc + getMemberUtilization(m.id, projects), 0) / members.length)
            : 0;

        document.getElementById('statsGrid').innerHTML = `
      <div class="stat-card sage">
        <div class="stat-icon sage"><i class="icon-users"></i></div>
        <div class="stat-content">
          <span class="stat-label">Team Members</span>
          <span class="stat-value">${members.length}</span>
          <span class="stat-change">${members.filter(m => m.status !== 'On Leave').length} active</span>
        </div>
      </div>
      <div class="stat-card teal">
        <div class="stat-icon teal"><i class="icon-folder-kanban"></i></div>
        <div class="stat-content">
          <span class="stat-label">Active Projects</span>
          <span class="stat-value">${activeProjects.length}</span>
          <span class="stat-change">${projects.length} total</span>
        </div>
      </div>
      <div class="stat-card sage">
        <div class="stat-icon sage"><i class="icon-activity"></i></div>
        <div class="stat-content">
          <span class="stat-label">Avg Utilization</span>
          <span class="stat-value">${avgUtil}%</span>
          <span class="stat-change">${avgUtil <= 80 ? 'Healthy' : 'Attention needed'}</span>
        </div>
      </div>
      <div class="stat-card amber">
        <div class="stat-icon amber"><i class="icon-calendar-off"></i></div>
        <div class="stat-content">
          <span class="stat-label">On Leave</span>
          <span class="stat-value">${onLeave}</span>
          <span class="stat-change">${members.length - onLeave} available</span>
        </div>
      </div>
    `;

        const utilList = document.getElementById('utilizationList');
        if (members.length === 0) {
            utilList.innerHTML = '<p style="color:var(--text-muted);font-size:13px;">No members yet</p>';
        } else {
            utilList.innerHTML = members.map((m, i) => {
                const util = getMemberUtilization(m.id, projects);
                const cls = getUtilClass(util);
                return `
          <div class="utilization-item">
            <div class="util-avatar" style="background:${getAvatarColor(i)}">${getInitials(m.name)}</div>
            <div class="util-info">
              <div class="util-name"><span>${m.name}</span><span class="util-pct">${util}%</span></div>
              <div class="util-bar"><div class="util-fill ${cls}" style="width:${Math.min(util, 100)}%"></div></div>
            </div>
          </div>
        `;
            }).join('');
        }

        const projectList = document.getElementById('activeProjectList');
        const visibleProjects = activeProjects.slice(0, 5);
        if (visibleProjects.length === 0) {
            projectList.innerHTML = '<p style="color:var(--text-muted);font-size:13px;">No active projects</p>';
        } else {
            projectList.innerHTML = visibleProjects.map(p => {
                const priorityCls = p.priority === 'High' ? 'priority-high' : p.priority === 'Medium' ? 'priority-medium' : 'priority-low';
                const memberAvatars = (p.project_assignments || []).slice(0, 4).map((a, idx) => {
                    const member = members.find(m => m.id === a.member_id);
                    if (!member) return '';
                    return `<div class="project-member-avatar" style="background:${getAvatarColor(idx)}" title="${member.name}">${getInitials(member.name)}</div>`;
                }).join('');
                const extraCount = (p.project_assignments || []).length - 4;
                return `
          <div class="project-item">
            <div class="project-priority ${priorityCls}"></div>
            <div class="project-info">
              <div class="project-name">${p.name}</div>
              <div class="project-meta">${p.priority} &middot; ${p.status}</div>
            </div>
            <div class="project-members">
              ${memberAvatars}
              ${extraCount > 0 ? `<div class="project-member-avatar" style="background:rgba(255,251,241,0.1);color:var(--text-muted);font-size:9px;">+${extraCount}</div>` : ''}
            </div>
          </div>
        `;
            }).join('');
        }
    } catch (err) {
        console.error('Dashboard render error:', err);
    }
}
