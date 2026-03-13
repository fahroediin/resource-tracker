import { supabase } from '../lib/supabase.js';
import { showToast, getCurrentUserProfile } from '../lib/ui.js';
import { fetchTasksByAssignment, createTask, toggleTask, deleteTask } from '../lib/store.js';

let currentPage = 1;
const itemsPerPage = 8;

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

// Render task list for a specific assignment card
async function renderTaskSection(cardEl, assignmentId) {
    const taskContainer = cardEl.querySelector('.task-section-body');
    if (!taskContainer) return;

    taskContainer.innerHTML = `<div style="display:flex;justify-content:center;padding:12px"><div class="loading-spinner" style="width:18px;height:18px;border-width:2px;"></div></div>`;

    try {
        const tasks = await fetchTasksByAssignment(assignmentId);
        const completedCount = tasks.filter(t => t.is_completed).length;
        const totalCount = tasks.length;
        const allDone = totalCount > 0 && completedCount === totalCount;
        const progressPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

        // Update progress header
        const progressEl = cardEl.querySelector('.task-progress-info');
        if (progressEl) {
            progressEl.innerHTML = totalCount > 0
                ? `<span class="task-count ${allDone ? 'all-done' : ''}">${completedCount}/${totalCount}</span>
                   <div class="task-progress-bar"><div class="task-progress-fill ${allDone ? 'all-done' : ''}" style="width:${progressPct}%"></div></div>
                   ${allDone ? '<span class="task-done-badge"><i class="icon-check-circle"></i> Semua selesai!</span>' : ''}`
                : `<span class="task-count">0 task</span>`;
        }

        // Show completion hint
        const hintEl = cardEl.querySelector('.task-completion-hint');
        if (hintEl) {
            hintEl.style.display = allDone && totalCount > 0 ? 'flex' : 'none';
        }

        taskContainer.innerHTML = `
            <div class="task-list">
                ${tasks.map(t => `
                    <div class="task-item ${t.is_completed ? 'completed' : ''}" data-task-id="${t.id}">
                        <label class="task-checkbox-label">
                            <input type="checkbox" class="task-checkbox" ${t.is_completed ? 'checked' : ''} data-task-id="${t.id}">
                            <span class="task-checkmark"><i class="icon-check"></i></span>
                        </label>
                        <span class="task-content">${escapeHtml(t.content)}</span>
                        <button class="task-delete-btn" data-task-id="${t.id}" title="Hapus task">
                            <i class="icon-trash-2"></i>
                        </button>
                    </div>
                `).join('')}
            </div>
            <div class="task-input-row">
                <input type="text" class="task-input" placeholder="Tambah task baru..." data-assignment-id="${assignmentId}">
                <button class="btn btn-sm task-add-btn" data-assignment-id="${assignmentId}">
                    <i class="icon-plus"></i>
                </button>
            </div>
        `;

        // Wire checkbox toggles
        taskContainer.querySelectorAll('.task-checkbox').forEach(cb => {
            cb.addEventListener('change', async () => {
                const taskId = cb.dataset.taskId;
                try {
                    await toggleTask(taskId, cb.checked);
                    await renderTaskSection(cardEl, assignmentId);
                } catch (err) {
                    showToast(err.message || 'Gagal mengubah status task', 'error');
                    cb.checked = !cb.checked;
                }
            });
        });

        // Wire delete buttons
        taskContainer.querySelectorAll('.task-delete-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                const taskId = btn.dataset.taskId;
                try {
                    await deleteTask(taskId);
                    await renderTaskSection(cardEl, assignmentId);
                    showToast('Task dihapus');
                } catch (err) {
                    showToast(err.message || 'Gagal menghapus task', 'error');
                }
            });
        });

        // Wire add task
        const input = taskContainer.querySelector('.task-input');
        const addBtn = taskContainer.querySelector('.task-add-btn');

        const handleAdd = async () => {
            const content = input.value.trim();
            if (!content) return;
            input.disabled = true;
            addBtn.disabled = true;
            try {
                await createTask(assignmentId, content);
                await renderTaskSection(cardEl, assignmentId);
                showToast('Task ditambahkan');
            } catch (err) {
                showToast(err.message || 'Gagal menambah task', 'error');
                input.disabled = false;
                addBtn.disabled = false;
            }
        };

        addBtn.addEventListener('click', handleAdd);
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') handleAdd();
        });

    } catch (err) {
        taskContainer.innerHTML = `<div style="color:var(--text-muted);font-size:12px;padding:8px;">Gagal memuat task: ${err.message}</div>`;
    }
}

function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
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

        // Pagination calculations
        const totalItems = assignments.length;
        const totalPages = Math.ceil(totalItems / itemsPerPage);
        
        if (currentPage > totalPages) currentPage = totalPages;
        if (currentPage < 1) currentPage = 1;

        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = Math.min(startIndex + itemsPerPage, totalItems);
        const paginatedAssignments = assignments.slice(startIndex, endIndex);

        container.innerHTML = `
            <div class="glass-card" style="margin-bottom:20px;padding:16px 20px;display:flex;align-items:center;gap:12px;">
                <i class="icon-info" style="color:var(--text-muted);font-size:18px;flex-shrink:0;"></i>
                <p style="font-size:13px;color:var(--text-secondary);margin:0;">
                    Setiap project dialokasikan dalam <strong>blok</strong> (1 blok = 2 jam kerja). Maksimal 4 blok per hari.
                    Gunakan <strong>task to-do</strong> untuk tracking pekerjaan. Setelah semua task selesai, set alokasi ke <strong>0 blok</strong>.
                </p>
            </div>
            <div class="my-projects-grid" id="myProjectsList">
                ${paginatedAssignments.map(a => {
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
                            <label style="font-size:12px;color:var(--text-muted);display:block;margin-bottom:8px;">Alokasi Blok Waktu</label>
                            <div class="block-selector-specific" data-assignment-id="${a.id}">
                                ${[
                                    {val: 1, label: '08:30-10:30'},
                                    {val: 2, label: '10:30-12:30'},
                                    {val: 3, label: '12:30-14:30'},
                                    {val: 4, label: '14:30-16:30'}
                                ].map(b => {
                                    const isChecked = (a.allocated_blocks || []).includes(b.val);
                                    return `
                                    <label style="display:inline-flex;align-items:center;gap:6px;margin-right:12px;font-size:13px;opacity:${isChecked ? '1' : '0.6'};cursor:pointer;">
                                        <input type="checkbox" value="${b.val}" class="block-cb" ${isChecked ? 'checked' : ''}>
                                        Block ${b.val} <span style="font-size:11px;color:var(--text-muted)">(${b.label})</span>
                                    </label>
                                    `;
                                }).join('')}
                            </div>
                        </div>
                        <div style="margin-top:16px;display:flex;justify-content:flex-end;">
                            <button class="btn btn-primary btn-sm save-allocation-btn" data-assignment-id="${a.id}" style="font-size:12px;">
                                <i class="icon-save"></i> Save Blocks
                            </button>
                        </div>

                        <!-- Task To-Do Section -->
                        <div class="task-section">
                            <div class="task-section-header">
                                <div class="task-section-title">
                                    <i class="icon-list-checks"></i>
                                    <span>Task To-Do</span>
                                </div>
                                <div class="task-progress-info">
                                    <span class="task-count">Loading...</span>
                                </div>
                            </div>
                            <div class="task-section-body"></div>
                            <div class="task-completion-hint" style="display:none;">
                                <i class="icon-info"></i>
                                <span>Semua task sudah selesai! Anda bisa mengubah alokasi menjadi <strong>0 blok</strong>.</span>
                            </div>
                        </div>
                    </div>`;
                }).join('')}
            </div>
            <!-- Pagination Controls -->
            <div class="pagination-container" id="myprojectsPagination" style="display:${totalPages > 1 ? 'flex' : 'none'}; justify-content: space-between; align-items: center; padding: 16px; border-top: 1px solid var(--glass-border); margin-top: 16px;">
                <div class="pagination-info" id="myprojectsPageInfo" style="font-size: 13px; color: var(--text-muted);">
                    Showing ${startIndex + 1}-${endIndex} of ${totalItems} projects
                </div>
                <div class="pagination-buttons" style="display: flex; gap: 8px;">
                    <button class="btn btn-secondary btn-sm" id="myprojectsPrevBtn" ${currentPage === 1 ? 'disabled' : ''}>
                        <i class="icon-chevron-left"></i> Prev
                    </button>
                    <div id="myprojectsPageNumbers" style="display: flex; gap: 4px;">
                        ${generatePageNumbers(currentPage, totalPages)}
                    </div>
                    <button class="btn btn-secondary btn-sm" id="myprojectsNextBtn" ${currentPage === totalPages ? 'disabled' : ''}>
                        Next <i class="icon-chevron-right"></i>
                    </button>
                </div>
            </div>`;

        // Wire up event listeners for newly rendered pagination
        container.querySelector('#myprojectsPrevBtn')?.addEventListener('click', () => {
            if (currentPage > 1) { currentPage--; renderMyProjects(); }
        });

        container.querySelector('#myprojectsNextBtn')?.addEventListener('click', () => {
            currentPage++; renderMyProjects();
        });

        container.querySelector('#myprojectsPageNumbers')?.addEventListener('click', (e) => {
            const btn = e.target.closest('.pagination-btn');
            if (!btn || btn.classList.contains('active')) return;
            currentPage = parseInt(btn.dataset.page, 10);
            renderMyProjects();
        });

        // Wire up specific block checkboxes to change opacity
        container.querySelectorAll('.block-selector-specific').forEach(selector => {
            selector.querySelectorAll('.block-cb').forEach(cb => {
                cb.addEventListener('change', (e) => {
                    e.target.parentElement.style.opacity = e.target.checked ? '1' : '0.6';
                });
            });
        });

        // Wire up save buttons
        container.querySelectorAll('.save-allocation-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                const assignmentId = btn.dataset.assignmentId;
                const selector = container.querySelector(`.block-selector-specific[data-assignment-id="${assignmentId}"]`);
                
                const checkedBoxes = Array.from(selector.querySelectorAll('.block-cb:checked'));
                const newAllocatedBlocks = checkedBoxes.map(cb => parseInt(cb.value, 10));

                if (newAllocatedBlocks.length === 0 && !confirm('Are you sure you want to set your allocation to 0 blocks for this project?')) {
                    return;
                }

                // Check Database directly for overlaps!
                btn.disabled = true;
                btn.innerHTML = '<i class="icon-loader-circle"></i> Val...';
                
                try {
                    let hasOverlapErr = false;
                    let conflictMsg = '';
                    
                    // Fetch all assignments for this member to do an airtight overlap check
                    const member = await getMyMemberRecord();
                    const { data: existingAssignments, error: eCycle } = await supabase
                        .from('project_assignments')
                        .select('id, project_id, allocated_blocks, projects(name)')
                        .eq('member_id', member.id);
                        
                    if (!eCycle && existingAssignments) {
                        const otherAssignments = existingAssignments.filter(a => String(a.id) !== String(assignmentId));
                        
                        newAllocatedBlocks.forEach(block => {
                            otherAssignments.forEach(otherA => {
                                const otherBlocks = Array.isArray(otherA.allocated_blocks) ? otherA.allocated_blocks : [];
                                if (otherBlocks.includes(block)) {
                                    hasOverlapErr = true;
                                    const projName = otherA.projects?.name || 'Unknown Project';
                                    conflictMsg = `Overlap Error: Block ${block} is already selected in project "${projName}". Please uncheck it there first.`;
                                }
                            });
                        });
                    }

                    if (hasOverlapErr) {
                        showToast(conflictMsg, 'error');
                        btn.disabled = false;
                        btn.innerHTML = '<i class="icon-save"></i> Save Blocks';
                        return;
                    }

                    btn.innerHTML = '<i class="icon-loader-circle"></i> Saving...';

                    const { error } = await supabase
                        .from('project_assignments')
                        .update({ allocated_blocks: newAllocatedBlocks })
                        .eq('id', assignmentId);

                    if (error) throw error;
                    showToast('Blocks saved!');
                } catch (err) {
                    showToast(err.message || 'Failed to save', 'error');
                } finally {
                    btn.disabled = false;
                    btn.innerHTML = '<i class="icon-save"></i> Save Blocks';
                }
            });
        });

        // Load tasks for each project card
        container.querySelectorAll('.my-project-card').forEach(card => {
            const assignmentId = card.dataset.assignmentId;
            renderTaskSection(card, assignmentId);
        });

    } catch (err) {
        console.error('My Projects error:', err);
        container.innerHTML = `<div style="text-align:center;padding:40px;color:var(--text-muted);">Failed to load projects: ${err.message}</div>`;
    }
}

function generatePageNumbers(current, total) {
    let html = '';
    for (let i = 1; i <= total; i++) {
        if (total <= 7 || (i === 1 || i === total || (i >= current - 1 && i <= current + 1))) {
            html += `<button class="pagination-btn ${i === current ? 'active' : ''}" data-page="${i}">${i}</button>`;
        } else if (i === current - 2 || i === current + 2) {
            html += `<span style="color:var(--text-muted);align-self:end;padding-bottom:4px">...</span>`;
        }
    }
    return html;
}

export function initMyProjectsView() {
    // No persistent event bindings needed — sliders/buttons are bound on render
}
