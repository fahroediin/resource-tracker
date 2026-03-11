import { supabase } from '../lib/supabase.js';
import { fetchAllDivisions, createDivision } from '../lib/store.js';
import { showToast } from '../lib/ui.js';

export async function renderSuperadmin() {
    try {
        const divisions = await fetchAllDivisions();
        const tbody = document.getElementById('divisionsTableBody');
        if (!tbody) return;

        if (divisions.length === 0) {
            tbody.innerHTML = '<tr><td colspan="3" style="text-align:center;color:var(--text-muted)">No divisions found.</td></tr>';
            return;
        }

        tbody.innerHTML = divisions.map(d => `
            <tr>
                <td style="font-weight:600">${d.name}</td>
                <td>${new Date(d.created_at).toLocaleDateString()}</td>
                <td>
                    <!-- Future: mechanism to assign head, for now just show ID or edit name -->
                    <span style="font-size:12px;color:var(--text-muted)">ID: ${d.id.split('-')[0]}...</span>
                </td>
            </tr>
        `).join('');
    } catch (err) {
        showToast(err.message || 'Failed to load divisions', 'error');
    }
}

export function initSuperadminView() {
    document.getElementById('createDivisionBtn')?.addEventListener('click', async () => {
        const name = prompt('Enter new division name:');
        if (!name || !name.trim()) return;

        try {
            await createDivision(name.trim());
            showToast(`Division "${name}" created.`, 'success');
            renderSuperadmin();
        } catch (err) {
            showToast(err.message || 'Failed to create division', 'error');
        }
    });
}
