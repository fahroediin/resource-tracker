import { supabase } from './supabase.js';

const SKILL_LIST = [
    'Requirements Gathering',
    'Stakeholder Management',
    'Data Analysis',
    'Process Modeling',
    'Agile/Scrum',
    'SQL',
    'API Documentation',
    'UI/UX',
    'Testing',
    'Technical Writing',
];

export { SKILL_LIST };

// ===== MEMBERS =====

export async function fetchMembers() {
    const { data, error } = await supabase
        .from('members')
        .select('*')
        .order('created_at', { ascending: true });
    if (error) throw error;
    return data;
}

export async function createMember(member) {
    const { data, error } = await supabase
        .from('members')
        .insert(member)
        .select()
        .single();
    if (error) throw error;
    return data;
}

export async function updateMember(id, updates) {
    const { data, error } = await supabase
        .from('members')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
    if (error) throw error;
    return data;
}

export async function deleteMember(id) {
    const { error } = await supabase
        .from('members')
        .delete()
        .eq('id', id);
    if (error) throw error;
}

// ===== PROJECTS =====

export async function fetchProjects() {
    const { data, error } = await supabase
        .from('projects')
        .select(`
      *,
      project_assignments (
        id,
        member_id,
        allocation
      )
    `)
        .order('created_at', { ascending: true });
    if (error) throw error;
    return data;
}

export async function createProject(project, assignments) {
    const { data, error } = await supabase
        .from('projects')
        .insert(project)
        .select()
        .single();
    if (error) throw error;

    if (assignments?.length > 0) {
        const rows = assignments.map(a => ({
            project_id: data.id,
            member_id: a.memberId,
            allocation: a.allocation,
        }));
        const { error: assignError } = await supabase
            .from('project_assignments')
            .insert(rows);
        if (assignError) throw assignError;
    }

    return data;
}

export async function updateProject(id, updates, assignments) {
    const { data, error } = await supabase
        .from('projects')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
    if (error) throw error;

    // Replace assignments: delete existing, insert new
    const { error: delError } = await supabase
        .from('project_assignments')
        .delete()
        .eq('project_id', id);
    if (delError) throw delError;

    if (assignments?.length > 0) {
        const rows = assignments.map(a => ({
            project_id: id,
            member_id: a.memberId,
            allocation: a.allocation,
        }));
        const { error: insertError } = await supabase
            .from('project_assignments')
            .insert(rows);
        if (insertError) throw insertError;
    }

    return data;
}

export async function deleteProject(id) {
    const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', id);
    if (error) throw error;
}

// ===== SKILLS =====

export async function fetchSkills() {
    const { data, error } = await supabase
        .from('member_skills')
        .select('*');
    if (error) throw error;

    // Transform to { memberId: { skillName: level } }
    const map = {};
    for (const row of data) {
        if (!map[row.member_id]) map[row.member_id] = {};
        map[row.member_id][row.skill_name] = row.level;
    }
    return map;
}

export async function upsertSkill(memberId, skillName, level) {
    const { error } = await supabase
        .from('member_skills')
        .upsert(
            { member_id: memberId, skill_name: skillName, level },
            { onConflict: 'member_id,skill_name' }
        );
    if (error) throw error;
}

// ===== PROFILES (User Management) =====

export async function fetchProfiles() {
    const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: true });
    if (error) throw error;
    return data;
}

export async function updateProfile(id, updates) {
    const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
    if (error) throw error;
    return data;
}

export async function deleteProfile(id) {
    const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', id);
    if (error) throw error;
}

// ===== ACTIVITY LOG =====

export async function logActivity(userId, action, entityType, entityId) {
    await supabase
        .from('activity_log')
        .insert({ user_id: userId, action, entity_type: entityType, entity_id: entityId });
}

// ===== SEED DATA =====

export async function seedIfEmpty() {
    const { count } = await supabase
        .from('members')
        .select('*', { count: 'exact', head: true });

    if (count > 0) return;

    // Team: 1 Head (Fahrudin) + 3 Members
    const members = [
        { name: 'Fahrudin', role: 'Head of BA', status: 'Assigned', email: 'fahrudin@company.com' },
        { name: 'Rina Wulandari', role: 'BA', status: 'Assigned', email: 'rina@company.com' },
        { name: 'Budi Santoso', role: 'BA', status: 'Assigned', email: 'budi@company.com' },
        { name: 'Dewi Permata', role: 'Junior BA', status: 'Available', email: 'dewi@company.com' },
    ];

    const { data: insertedMembers, error: membersError } = await supabase
        .from('members')
        .insert(members)
        .select();
    if (membersError) throw membersError;

    const projectsData = [
        { name: 'Core Banking Revamp', client_name: 'Internal Dev', type: 'Internal', phase: 'Development', priority: 'High', status: 'Active', start_date: '2026-01-15', end_date: '2026-06-30' },
        { name: 'Mobile App Enhancement', client_name: 'Bank Central Asia', type: 'External', phase: 'SIT', priority: 'Medium', status: 'Active', start_date: '2026-02-01', end_date: '2026-05-15' },
        { name: 'AI Chatbot Integration', client_name: 'Telkomsel', type: 'POC', phase: 'Pembuatan Dokumen', priority: 'High', status: 'Planning', start_date: '2026-03-01', end_date: '2026-04-30' },
        { name: 'Customer Onboarding Flow', client_name: 'Internal Dev', type: 'Internal', phase: 'Pembuatan Dokumen', priority: 'Medium', status: 'Active', start_date: '2026-01-10', end_date: '2026-04-30' },
        { name: 'Partner API Gateway', client_name: 'Gojek', type: 'External', phase: 'Pembuatan Dokumen', priority: 'Low', status: 'Planning', start_date: '2026-04-01', end_date: '2026-07-30' },
    ];

    const { data: insertedProjects, error: projError } = await supabase
        .from('projects')
        .insert(projectsData)
        .select();
    if (projError) throw projError;

    const m = insertedMembers;
    const p = insertedProjects;
    const assignments = [
        // Core Banking Revamp — Fahrudin + Rina + Budi
        { project_id: p[0].id, member_id: m[0].id, allocation: 40 },
        { project_id: p[0].id, member_id: m[1].id, allocation: 60 },
        { project_id: p[0].id, member_id: m[2].id, allocation: 50 },
        // Mobile App Enhancement — Fahrudin + Dewi
        { project_id: p[1].id, member_id: m[0].id, allocation: 30 },
        { project_id: p[1].id, member_id: m[3].id, allocation: 50 },
        // AI Chatbot POC — Budi
        { project_id: p[2].id, member_id: m[2].id, allocation: 30 },
        // Customer Onboarding — Rina + Dewi
        { project_id: p[3].id, member_id: m[1].id, allocation: 30 },
        { project_id: p[3].id, member_id: m[3].id, allocation: 40 },
        // Partner API Gateway — Fahrudin
        { project_id: p[4].id, member_id: m[0].id, allocation: 20 },
    ];

    await supabase.from('project_assignments').insert(assignments);

    const skillSeeds = [
        [5, 5, 4, 5, 4, 3, 4, 3, 4, 5], // Fahrudin (Head)
        [4, 3, 4, 4, 5, 4, 3, 2, 4, 3], // Rina
        [3, 3, 5, 3, 4, 5, 3, 2, 3, 3], // Budi
        [2, 2, 3, 2, 3, 2, 2, 3, 2, 2], // Dewi
    ];

    const skillRows = [];
    m.forEach((member, i) => {
        SKILL_LIST.forEach((skill, j) => {
            skillRows.push({ member_id: member.id, skill_name: skill, level: skillSeeds[i][j] });
        });
    });

    await supabase.from('member_skills').insert(skillRows);
}
