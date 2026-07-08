const { getStore } = require('@netlify/blobs');

const KEY = 'trj-dashboard';

exports.handler = async (event) => {
  const store = getStore('dashboard-data');

  if (event.httpMethod === 'GET') {
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
      const payload = {
        notes: typeof body.notes === 'string' ? body.notes : '',
        todo: typeof body.todo === 'string' ? body.todo : '',
        updatedAt: new Date().toISOString()
      };
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
