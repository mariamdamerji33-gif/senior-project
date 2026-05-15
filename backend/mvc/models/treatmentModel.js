const { db } = require('../../config/database');

function mapPlan(r) {
  return {
    id: r.id,
    childId: r.child_id,
    therapistId: r.therapist_id,
    title: r.title,
    notes: r.notes ?? null,
    status: r.status,
    startDate: r.start_date ?? null,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

function mapGoal(r) {
  return {
    id: r.id,
    planId: r.plan_id,
    childId: r.child_id,
    therapistId: r.therapist_id,
    title: r.title,
    target: r.target ?? null,
    baseline: r.baseline ?? null,
    status: r.status,
    dueDate: r.due_date ?? null,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

async function listPlansByChild(childId) {
  const { data, error } = await db()
    .from('treatment_plans')
    .select('id,child_id,therapist_id,title,notes,status,start_date,created_at,updated_at')
    .eq('child_id', childId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []).map(mapPlan);
}

async function listGoalsByPlan(planId) {
  const { data, error } = await db()
    .from('treatment_goals')
    .select('id,plan_id,child_id,therapist_id,title,target,baseline,status,due_date,created_at,updated_at')
    .eq('plan_id', planId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []).map(mapGoal);
}

async function findPlanById(planId) {
  const { data, error } = await db()
    .from('treatment_plans')
    .select('id,child_id,therapist_id,title,notes,status,start_date,created_at,updated_at')
    .eq('id', planId)
    .maybeSingle();
  if (error) throw error;
  return data ? mapPlan(data) : null;
}

async function findGoalById(goalId) {
  const { data, error } = await db()
    .from('treatment_goals')
    .select('id,plan_id,child_id,therapist_id,title,target,baseline,status,due_date,created_at,updated_at')
    .eq('id', goalId)
    .maybeSingle();
  if (error) throw error;
  return data ? mapGoal(data) : null;
}

async function createPlan(payload) {
  const { data, error } = await db()
    .from('treatment_plans')
    .insert({
      child_id: payload.childId,
      therapist_id: payload.therapistId,
      title: payload.title,
      notes: payload.notes ?? null,
      status: payload.status ?? 'active',
      start_date: payload.startDate ?? null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select('id,child_id,therapist_id,title,notes,status,start_date,created_at,updated_at')
    .maybeSingle();
  if (error) throw error;
  return data ? mapPlan(data) : null;
}

async function updatePlan(planId, patch) {
  const { data, error } = await db()
    .from('treatment_plans')
    .update({
      ...(patch.title !== undefined ? { title: patch.title } : {}),
      ...(patch.notes !== undefined ? { notes: patch.notes } : {}),
      ...(patch.status !== undefined ? { status: patch.status } : {}),
      ...(patch.startDate !== undefined ? { start_date: patch.startDate } : {}),
      updated_at: new Date().toISOString(),
    })
    .eq('id', planId)
    .select('id,child_id,therapist_id,title,notes,status,start_date,created_at,updated_at')
    .maybeSingle();
  if (error) throw error;
  return data ? mapPlan(data) : null;
}

async function deletePlan(planId) {
  const { error } = await db().from('treatment_plans').delete().eq('id', planId);
  if (error) throw error;
  return true;
}

async function createGoal(payload) {
  const { data, error } = await db()
    .from('treatment_goals')
    .insert({
      plan_id: payload.planId,
      child_id: payload.childId,
      therapist_id: payload.therapistId,
      title: payload.title,
      target: payload.target ?? null,
      baseline: payload.baseline ?? null,
      status: payload.status ?? 'active',
      due_date: payload.dueDate ?? null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select('id,plan_id,child_id,therapist_id,title,target,baseline,status,due_date,created_at,updated_at')
    .maybeSingle();
  if (error) throw error;
  return data ? mapGoal(data) : null;
}

async function updateGoal(goalId, patch) {
  const { data, error } = await db()
    .from('treatment_goals')
    .update({
      ...(patch.title !== undefined ? { title: patch.title } : {}),
      ...(patch.target !== undefined ? { target: patch.target } : {}),
      ...(patch.baseline !== undefined ? { baseline: patch.baseline } : {}),
      ...(patch.status !== undefined ? { status: patch.status } : {}),
      ...(patch.dueDate !== undefined ? { due_date: patch.dueDate } : {}),
      updated_at: new Date().toISOString(),
    })
    .eq('id', goalId)
    .select('id,plan_id,child_id,therapist_id,title,target,baseline,status,due_date,created_at,updated_at')
    .maybeSingle();
  if (error) throw error;
  return data ? mapGoal(data) : null;
}

async function deleteGoal(goalId) {
  const { error } = await db().from('treatment_goals').delete().eq('id', goalId);
  if (error) throw error;
  return true;
}

module.exports = {
  listPlansByChild,
  listGoalsByPlan,
  findPlanById,
  findGoalById,
  createPlan,
  updatePlan,
  deletePlan,
  createGoal,
  updateGoal,
  deleteGoal,
};

