// Returns the seedbox PIN for the PIN button, only to signed-in browsers.
// Set SEEDBOX_PIN in Netlify env vars (secret, Functions scope, Production).
const { requireAuth, json } = require('../lib/auth');

exports.handler = async (event) => {
  const denied = requireAuth(event);
  if (denied) return denied;
  return json(200, { pin: process.env.SEEDBOX_PIN || '' });
};
