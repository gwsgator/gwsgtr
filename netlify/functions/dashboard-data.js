const { getStore } = require('@netlify/blobs');

const KEY = 'trj-dashboard';
const HISTORY_KEY = 'trj-dashboard-history';
const MAX_HISTORY = 5;

function getBlobsStore() {
  return getStore({
    name: 'dashboard-data',
    siteID: process.env.BLOBS_SITE_ID,
    token: process.env.BLOBS_TOKEN
  });
}

exports.handler = async (event) => {
  const store = getBlobsStore();
  const params = event.queryStringParameters || {};

  if (event.httpMethod === 'GET') {
    if (params.history === '1') {
      try {
        const history = await store.get(HISTORY_KEY, { type: 'json' });
        return {
          statusCode: 200,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(history || [])
        };
      } catch (err) {
        return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
      }
    }
    try {
      const data = await store.get(KEY, { type: 'json' });
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data || { notes: '', todo: '' })
      };
    } catch (err) {
      return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
    }
  }

  if (event.httpMethod === 'POST') {
    try {
      const body = JSON.parse(event.body || '{}');

      if (body.action === 'restore') {
        const history = (await store.get(HISTORY_KEY, { type: 'json' })) || [];
        const entry = history[body.index];
        if (!entry) {
          return { statusCode: 400, body: JSON.stringify({ error: 'Invalid history index' }) };
        }
        const payload = {
          notes: entry.notes,
          todo: entry.todo,
          updatedAt: new Date().toISOString()
        };
        await store.setJSON(KEY, payload);
        return {
          statusCode: 200,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ok: true, updatedAt: payload.updatedAt, notes: payload.notes, todo: payload.todo })
        };
      }

      const payload = {
        notes: typeof body.notes === 'string' ? body.notes : '',
        todo: typeof body.todo === 'string' ? body.todo : '',
        updatedAt: new Date().toISOString()
      };

      const previous = await store.get(KEY, { type: 'json' });
      if (previous && (previous.notes !== payload.notes || previous.todo !== payload.todo)) {
        const history = (await store.get(HISTORY_KEY, { type: 'json' })) || [];
        history.unshift(previous);
        while (history.length > MAX_HISTORY) history.pop();
        await store.setJSON(HISTORY_KEY, history);
      }

      await store.setJSON(KEY, payload);
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ok: true, updatedAt: payload.updatedAt })
      };
    } catch (err) {
      return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
    }
  }

  return { statusCode: 405, body: 'Method Not Allowed' };
};
