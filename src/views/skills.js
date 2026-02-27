import { fetchMembers, fetchSkills, upsertSkill, SKILL_LIST } from '../lib/store.js';
import { getInitials, getAvatarColor, showToast, canEdit } from '../lib/ui.js';

export async function renderSkillsMatrix() {
    try {
        const members = await fetchMembers();
        const skills = await fetchSkills();
        const head = document.getElementById('skillsMatrixHead');
        const body = document.getElementById('skillsMatrixBody');
        const empty = document.getElementById('skillsEmpty');

        if (members.length === 0) {
            head.innerHTML = '';
            body.innerHTML = '';
            empty.style.display = 'block';
            return;
        }

        empty.style.display = 'none';
        head.innerHTML = `<tr><th>Member</th>${SKILL_LIST.map(s => `<th>${s}</th>`).join('')}</tr>`;

        const isEditable = canEdit();

        body.innerHTML = members.map((m, i) => {
            const memberSkills = skills[m.id] || {};
            return `
        <tr>
          <td>
            <div class="member-inline">
              <div class="member-inline-avatar" style="background:${getAvatarColor(i)}">${getInitials(m.name)}</div>
              <span style="font-weight:600;font-size:12px">${m.name}</span>
            </div>
          </td>
          ${SKILL_LIST.map(s => {
                const level = memberSkills[s] || 0;
                return `<td><div class="star-rating" data-member="${m.id}" data-skill="${s}">${renderStars(level)}</div></td>`;
            }).join('')}
        </tr>
      `;
        }).join('');

        if (isEditable) {
            document.querySelectorAll('.star-rating').forEach(container => {
                bindStarEvents(container);
            });
        }
    } catch (err) {
        console.error('Skills render error:', err);
    }
}

function renderStars(level) {
    return Array.from({ length: 5 }, (_, i) =>
        `<i class="icon-star ${i < level ? 'filled' : ''}"></i>`
    ).join('');
}

function bindStarEvents(container) {
    container.querySelectorAll('i').forEach((star, idx) => {
        star.addEventListener('mouseenter', () => {
            container.querySelectorAll('i').forEach((s, j) => {
                s.classList.toggle('hovered', j <= idx);
            });
        });

        star.addEventListener('mouseleave', () => {
            container.querySelectorAll('i').forEach(s => s.classList.remove('hovered'));
        });

        star.addEventListener('click', async () => {
            const memberId = container.dataset.member;
            const skill = container.dataset.skill;
            const newLevel = idx + 1;

            try {
                await upsertSkill(memberId, skill, newLevel);
                container.innerHTML = renderStars(newLevel);
                bindStarEvents(container);
            } catch (err) {
                showToast('Failed to update skill', 'error');
            }
        });
    });
}

export function initSkillsView() {
    document.getElementById('saveSkillsBtn')?.addEventListener('click', () => {
        showToast('Skills are auto-saved on click');
    });
}
