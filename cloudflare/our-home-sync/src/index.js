function cors(extra = {}) {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, PUT, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Household-Key',
    'Access-Control-Max-Age': '86400',
    ...extra,
  };
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: cors({ 'Content-Type': 'application/json' }),
  });
}

function empty() {
  return { chores: [], meals: {}, shopping: [], tasks: [], note: { text: '', updatedAt: 0 }, checklists: [] };
}

function byId(local = [], remote = []) {
  const map = new Map();
  for (const item of [...remote, ...local]) {
    if (!item?.id) continue;
    const prev = map.get(item.id);
    if (!prev || (item.updatedAt || 0) >= (prev.updatedAt || 0)) map.set(item.id, item);
  }
  return [...map.values()];
}

function merge(current, incoming) {
  const base = current || empty();
  const next = incoming || empty();
  const meals = { ...(base.meals || {}) };
  for (const [day, meal] of Object.entries(next.meals || {})) {
    const other = meals[day];
    if (!other || (meal.updatedAt || 0) >= (other.updatedAt || 0)) meals[day] = meal;
  }
  const note = (next.note?.updatedAt || 0) >= (base.note?.updatedAt || 0) ? next.note || base.note : base.note;
  return {
    chores: byId(next.chores, base.chores),
    shopping: byId(next.shopping, base.shopping),
    tasks: byId(next.tasks, base.tasks),
    checklists: byId(next.checklists, base.checklists),
    meals,
    note: note || { text: '', updatedAt: 0 },
  };
}

async function load(env) {
  const raw = await env.HOME.get('state');
  return raw ? JSON.parse(raw) : empty();
}

async function save(env, state) {
  await env.HOME.put('state', JSON.stringify(state));
  return state;
}

async function todoist(env, path, options = {}) {
  const response = await fetch(`https://api.todoist.com/rest/v2${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${env.TODOIST_TOKEN}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  if (response.status === 204) return null;
  const text = await response.text();
  if (!response.ok) throw new Error(`Todoist ${response.status}: ${text.slice(0, 180)}`);
  return text ? JSON.parse(text) : null;
}

async function ourHomeProject(env) {
  const projects = await todoist(env, '/projects');
  const found = (projects || []).find((project) => project.name === 'Our Home');
  if (found) return found.id;
  const created = await todoist(env, '/projects', { method: 'POST', body: JSON.stringify({ name: 'Our Home' }) });
  return created.id;
}

async function syncTodoist(env) {
  if (!env.TODOIST_TOKEN) return load(env);
  const state = await load(env);
  const projectId = await ourHomeProject(env);
  const remote = (await todoist(env, `/tasks?project_id=${projectId}`)) || [];
  const remoteById = new Map(remote.map((task) => [String(task.id), task]));
  const seen = new Set();
  const now = Date.now();
  for (const task of state.tasks || []) {
    if (task.deletedAt) continue;
    const body = {
      content: task.title,
      description: task.nextStep || '',
      due_date: task.dueDate || null,
      project_id: projectId,
    };
    if (!task.todoistId) {
      const created = await todoist(env, '/tasks', { method: 'POST', body: JSON.stringify(body) });
      task.todoistId = String(created.id);
      task.todoistSyncedAt = task.updatedAt || now;
      if (task.status === 'done') await todoist(env, `/tasks/${task.todoistId}/close`, { method: 'POST' });
      seen.add(task.todoistId);
      continue;
    }
    seen.add(String(task.todoistId));
    const live = remoteById.get(String(task.todoistId));
    const localNewer = (task.updatedAt || 0) > (task.todoistSyncedAt || 0);
    if (!live) {
      if (localNewer && task.status !== 'done') {
        await todoist(env, `/tasks/${task.todoistId}/reopen`, { method: 'POST' });
        task.todoistSyncedAt = task.updatedAt;
      } else if (task.status !== 'done') {
        task.status = 'done';
        task.updatedAt = now;
        task.todoistSyncedAt = now;
      }
      continue;
    }
    if (localNewer) {
      await todoist(env, `/tasks/${task.todoistId}`, {
        method: 'POST',
        body: JSON.stringify({ content: body.content, description: body.description, due_date: body.due_date }),
      });
      if (task.status === 'done') await todoist(env, `/tasks/${task.todoistId}/close`, { method: 'POST' });
      task.todoistSyncedAt = task.updatedAt;
    }
  }
  for (const task of remote) {
    if (seen.has(String(task.id))) continue;
    state.tasks.push({
      id: `td-${task.id}`,
      title: task.content,
      nextStep: task.description || '',
      dueDate: task.due?.date || null,
      status: 'waiting',
      updatedAt: now,
      todoistId: String(task.id),
    });
  }
  return save(env, state);
}

async function refreshFromGitHub(env, state) {
  if (!env.GITHUB_TOKEN) return state;
  const response = await fetch('https://raw.githubusercontent.com/siansari11/status-board/main/status.json', {
    headers: { Authorization: `Bearer ${env.GITHUB_TOKEN}`, Accept: 'application/vnd.github.raw' },
  });
  if (!response.ok) return state;
  const data = await response.json();
  const items = Array.isArray(data) ? data : data.items || data.tasks || [];
  const now = Date.now();
  for (const item of items) {
    if (item.lane !== 'mine' || item.category === 'code') continue;
    const id = String(item.id || item.title || '').slice(0, 80);
    if (!id) continue;
    const existing = (state.tasks || []).find((task) => task.id === id || task.title === item.title);
    if (existing) continue;
    const category = ['deadline', 'process', 'email', 'ask'].includes(item.category) ? item.category : 'process';
    const status = ['waiting', 'in_progress', 'done', 'blocked'].includes(item.status) ? item.status : 'waiting';
    state.tasks.push({
      id,
      title: item.title || id,
      status,
      category,
      nextStep: item.next_step || item.nextStep || '',
      dueDate: item.due_date || item.dueDate || null,
      updatedAt: now,
    });
  }
  return state;
}

async function sha256(text) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

async function authorized(request, env) {
  const key = request.headers.get('X-Household-Key') || '';
  if (!key) return false;
  if (env.HOUSEHOLD_KEY_HASH) return (await sha256(key)) === String(env.HOUSEHOLD_KEY_HASH).toLowerCase();
  return Boolean(env.HOUSEHOLD_KEY) && key === env.HOUSEHOLD_KEY;
}

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors() });
    if (!(await authorized(request, env))) return json({ error: 'Household key was rejected.' }, 401);
    const url = new URL(request.url);
    if (url.pathname === '/v1/state' && request.method === 'GET') return json(await load(env));
    if (url.pathname === '/v1/state' && request.method === 'PUT') {
      const merged = merge(await load(env), await request.json());
      return json(await save(env, merged));
    }
    if (url.pathname === '/v1/todoist' && request.method === 'POST') {
      try {
        let state = await load(env);
        state = await refreshFromGitHub(env, state);
        await save(env, state);
        return json(await syncTodoist(env));
      } catch (error) {
        return json({ error: error instanceof Error ? error.message : 'Todoist sync failed.' }, 502);
      }
    }
    return json({ error: 'Not found.' }, 404);
  },
  async scheduled(_event, env, ctx) {
    ctx.waitUntil(syncTodoist(env).catch(() => undefined));
  },
};
