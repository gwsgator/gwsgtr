const { configured, issueToken, sameString, json } = require('../lib/auth');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };
  if (!configured()) return json(503, { error: 'Auth not configured' });

  let password = '';
  try {
    password = JSON.parse(event.body || '{}').password || '';
  } catch (e) {
    return json(400, { error: 'Bad request' });
  }

  if (!sameString(password, process.env.DASH_PASSWORD)) {
    await sleep(1500); // slow down guessing
    return json(401, { error: 'Wrong password' });
  }
  return json(200, issueToken());
};
