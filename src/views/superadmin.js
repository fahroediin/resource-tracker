import { supabase } from '../lib/supabase.js';
import { fetchAllDivisions, createDivision } from '../lib/store.js';
import { showToast, showPromptInput } from '../lib/ui.js';

let currentPage = 1;
const itemsPerPage = 8;

export async function renderSuperadmin() {
    try {
        const divisions = await fetchAllDivisions();
        const tbody = document.getElementById('divisionsTableBody');
        const pagination = document.getElementById('divisionsPagination');
        if (!tbody) return;

        if (divisions.length === 0) {
            tbody.innerHTML = '<tr><td colspan="3" style="text-align:center;color:var(--text-muted)">No divisions found.</td></tr>';
            if (pagination) pagination.style.display = 'none';
            return;
        }

        if (pagination) pagination.style.display = 'flex';

        // Pagination calculations
        const totalItems = divisions.length;
        const totalPages = Math.ceil(totalItems / itemsPerPage);
        
        if (currentPage > totalPages) currentPage = totalPages;
        if (currentPage < 1) currentPage = 1;

        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = Math.min(startIndex + itemsPerPage, totalItems);
        const paginatedDivisions = divisions.slice(startIndex, endIndex);

        tbody.innerHTML = paginatedDivisions.map(d => `
            <tr>
                <td style="font-weight:600">${d.name}</td>
                <td>${new Date(d.created_at).toLocaleDateString()}</td>
                <td>
                    <span style="font-size:12px;color:var(--text-muted)">ID: ${d.id.split('-')[0]}...</span>
                </td>
            </tr>
        `).join('');
        
        // Render pagination controls
        renderPaginationControls(totalItems, totalPages, startIndex, endIndex);

    } catch (err) {
        showToast(err.message || 'Failed to load divisions', 'error');
    }
}

function renderPaginationControls(totalItems, totalPages, startIndex, endIndex) {
    const pageInfo = document.getElementById('divisionsPageInfo');
    if (!pageInfo) return;

    pageInfo.textContent = `Showing ${startIndex + 1}-${endIndex} of ${totalItems} divisions`;

    const prevBtn = document.getElementById('divisionsPrevBtn');
    const nextBtn = document.getElementById('divisionsNextBtn');
    const pageNumbers = document.getElementById('divisionsPageNumbers');

    prevBtn.disabled = currentPage === 1;
    nextBtn.disabled = currentPage === totalPages;

    let pagesHTML = '';
    for (let i = 1; i <= totalPages; i++) {
        if (totalPages <= 7 || (i === 1 || i === totalPages || (i >= currentPage - 1 && i <= currentPage + 1))) {
            pagesHTML += `<button class="pagination-btn ${i === currentPage ? 'active' : ''}" data-page="${i}">${i}</button>`;
        } else if (i === currentPage - 2 || i === currentPage + 2) {
            pagesHTML += `<span style="color:var(--text-muted);align-self:end;padding-bottom:4px">...</span>`;
        }
    }
    pageNumbers.innerHTML = pagesHTML;
}

export function initSuperadminView() {
    document.getElementById('createDivisionBtn')?.addEventListener('click', async () => {
        const name = await showPromptInput({
            title: 'New Division',
            text: 'Enter the name for the new division',
            placeholder: 'e.g. Quality Assurance',
        });
        if (!name || !name.trim()) return;

        try {
            await createDivision(name.trim());
            showToast(`Division "${name}" created.`, 'success');
            renderSuperadmin();
        } catch (err) {
            showToast(err.message || 'Failed to create division', 'error');
        }
    });

    // Pagination events
    document.getElementById('divisionsPrevBtn')?.addEventListener('click', () => {
        if (currentPage > 1) { currentPage--; renderSuperadmin(); }
    });
    
    document.getElementById('divisionsNextBtn')?.addEventListener('click', () => {
        currentPage++; renderSuperadmin();
    });

    document.getElementById('divisionsPageNumbers')?.addEventListener('click', (e) => {
        const btn = e.target.closest('.pagination-btn');
        if (!btn || btn.classList.contains('active')) return;
        currentPage = parseInt(btn.dataset.page, 10);
        renderSuperadmin();
    });
}
