import { fetchMembers, fetchProjects } from '../lib/store.js';
import { getInitials, getAvatarColor, getMemberUtilization, getUtilClass, renderBlockIndicator, currentDivisionSettings } from '../lib/ui.js';

let currentDashFilter = 'all';
let currentUtilFilter = 'highest';

export async function renderDashboard() {
    try {
        const members = await fetchMembers();
        const projects = await fetchProjects();
        // Planning is no longer a status, it's a phase
        const activeProjects = projects.filter(p => p.status === 'Active');
        const onLeave = members.filter(m => m.status === 'On Leave').length;

        const avgBlocks = members.length
            ? +(members.reduce((acc, m) => acc + getMemberUtilization(m.id, projects), 0) / members.length).toFixed(1)
            : 0;

        // Project type breakdown
        const internalCount = projects.filter(p => p.type === 'Internal').length;
        const externalCount = projects.filter(p => p.type === 'External').length;
        const pocCount = projects.filter(p => p.type === 'POC').length;

        document.getElementById('statsGrid').innerHTML = `
      <div class="stat-card mono-1">
        <div class="stat-icon mono-1"><i class="icon-users"></i></div>
        <div class="stat-content">
          <span class="stat-label">Team Members</span>
          <span class="stat-value">${members.length}</span>
          <span class="stat-change">${members.filter(m => m.status !== 'On Leave').length} active</span>
        </div>
      </div>
      <div class="stat-card mono-2">
        <div class="stat-icon mono-2"><i class="icon-folder-kanban"></i></div>
        <div class="stat-content">
          <span class="stat-label">Active Projects</span>
          <span class="stat-value">${activeProjects.length}</span>
          <span class="stat-change">${projects.length} total</span>
        </div>
      </div>
      <div class="stat-card mono-3">
        <div class="stat-icon mono-3"><i class="icon-activity"></i></div>
        <div class="stat-content">
          <span class="stat-label">Avg Blocks Used</span>
          <span class="stat-value">${avgBlocks}/4</span>
          <span class="stat-change">${avgBlocks <= 3 ? 'Healthy' : 'Attention needed'}</span>
        </div>
      </div>
      <div class="stat-card mono-4">
        <div class="stat-icon mono-4"><i class="icon-layers"></i></div>
        <div class="stat-content">
          <span class="stat-label">Project Types</span>
          <span class="stat-value">${projects.length}</span>
          <span class="stat-change">${internalCount} Int · ${externalCount} Ext · ${pocCount} POC</span>
        </div>
      </div>
    `;

        const utilList = document.getElementById('utilizationList');
        if (members.length === 0) {
            utilList.innerHTML = '<p style="color:var(--text-muted);font-size:13px;">No members yet</p>';
        } else {
            // Calculate utilization, sort depending on current filter, and take the top 5
            const topUtilMembers = members
                .map(m => ({
                    ...m,
                    blocks: getMemberUtilization(m.id, projects)
                }))
                .sort((a, b) => currentUtilFilter === 'highest' ? b.blocks - a.blocks : a.blocks - b.blocks)
                .slice(0, 5);

            utilList.innerHTML = topUtilMembers.map((m, i) => {
                const cls = getUtilClass(m.blocks);
                return `
          <div class="utilization-item">
            <div class="util-avatar" style="background:${getAvatarColor(i)}">${getInitials(m.name)}</div>
            <div class="util-info">
              <div class="util-name"><span>${m.name}</span><span class="util-pct">${m.blocks}/4</span></div>
              <div class="util-bar">
                ${renderBlockIndicator(
                    // Extract allocated block arrays from active projects
                    projects
                        .filter(p => p.status === 'Active' && (currentDivisionSettings?.capacity_active_phases || ['Doc Creation', 'Design Review', 'Development']).includes(p.phase))
                        .map(p => (p.project_assignments || []).find(a => a.member_id === m.id)?.allocated_blocks || [])
                        .flat()
                )}
              </div>
            </div>
          </div>
        `;
            }).join('');
        }

        const projectList = document.getElementById('activeProjectList');
        
        // Filter visible projects by type
        let filteredProjects = activeProjects;
        if (currentDashFilter !== 'all') {
            filteredProjects = filteredProjects.filter(p => p.type === currentDashFilter);
        }
        
        const visibleProjects = filteredProjects.slice(0, 5);
        if (visibleProjects.length === 0) {
            projectList.innerHTML = '<p style="color:var(--text-muted);font-size:13px;">No active projects</p>';
        } else {
            projectList.innerHTML = visibleProjects.map(p => {
                const priorityCls = p.priority === 'High' ? 'priority-high' : p.priority === 'Medium' ? 'priority-medium' : 'priority-low';
                const typeMap = { 'Internal': 'badge-internal', 'External': 'badge-external', 'POC': 'badge-poc' };
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
              <div class="project-meta">
                <span class="badge ${typeMap[p.type] || 'badge-internal'}" style="font-size:9px;padding:2px 6px;">${p.type || 'Internal'}</span> 
                · <span style="font-size:10px;font-weight:500;">${p.phase || 'Doc Creation'}</span> 
                · ${p.priority}
              </div>
            </div>
            <div class="project-members">
              ${memberAvatars}
              ${extraCount > 0 ? `<div class="project-member-avatar" style="background:rgba(255,255,255,0.08);color:var(--text-muted);font-size:9px;">+${extraCount}</div>` : ''}
            </div>
          </div>
        `;
            }).join('');
        }

        // Initialize dashboard filter events only once
        const filterContainer = document.getElementById('dashProjectFilterTabs');
        if (filterContainer && !filterContainer.dataset.bound) {
            filterContainer.dataset.bound = 'true';
            filterContainer.addEventListener('click', (e) => {
                const tab = e.target.closest('.filter-tab');
                if (!tab) return;
                currentDashFilter = tab.dataset.filter;
                filterContainer.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                renderDashboard();
            });
        }

        // Initialize dashboard utilization filter events only once
        const utilFilterContainer = document.getElementById('dashUtilFilterTabs');
        if (utilFilterContainer && !utilFilterContainer.dataset.bound) {
            utilFilterContainer.dataset.bound = 'true';
            utilFilterContainer.addEventListener('click', (e) => {
                const tab = e.target.closest('.filter-tab');
                if (!tab) return;
                currentUtilFilter = tab.dataset.filter;
                utilFilterContainer.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                renderDashboard();
            });
        }

    } catch (err) {
        console.error('Dashboard render error:', err);
    }
}
