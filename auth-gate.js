// Password gate for the TRJ Dashboard.
// Hides the page until this browser has a valid session, and exposes
// window.authFetch(url, options) which adds the session token to API calls.
// A session lasts 30 days per browser. LOCK (bottom-right) signs this browser out.
(function () {
  var TOKEN_KEY = 'dashToken';
  var EXP_KEY = 'dashTokenExp';
  var waiters = [];

  function getToken() {
    var t = localStorage.getItem(TOKEN_KEY);
    var exp = parseInt(localStorage.getItem(EXP_KEY) || '0', 10);
    return t && exp > Date.now() ? t : null;
  }

  function clearToken() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(EXP_KEY);
  }

  // Hide the page right away (before anything paints) when there is no session.
  var style = document.createElement('style');
  style.textContent =
    'html.dash-locked body > *:not(#dash-login){visibility:hidden}' +
    '#dash-login{position:fixed;inset:0;display:none;align-items:center;justify-content:center;background:var(--bg,#0a0e14);z-index:99999;font-family:var(--font,"Segoe UI",system-ui,sans-serif)}' +
    'html.dash-locked #dash-login{display:flex}' +
    '#dash-login form{border:1px solid var(--border-strong,#2a4458);border-radius:var(--radius,10px);padding:32px 40px;text-align:center;background:var(--panel,#0f1621);box-shadow:0 20px 60px rgba(0,0,0,.5)}' +
    '#dash-login h1{display:block;border:none;color:var(--heading,#e8f1f8);font-size:1.25em;margin:0 0 22px;padding:0;letter-spacing:var(--title-spacing,.02em)}' +
    '#dash-login input{display:block;margin:0 auto;background:var(--input-bg,#070b11);border:1px solid var(--border-strong,#2a4458);border-radius:6px;color:var(--text,#d6e2ee);padding:9px 10px;width:260px;font-family:inherit;font-size:1em}' +
    '#dash-login input:focus{outline:none;border-color:var(--accent,#2dd4bf)}' +
    '#dash-login button{display:block;margin:16px auto 0;background:var(--accent,#2dd4bf);color:var(--accent-text,#04201c);border:none;border-radius:6px;padding:9px 26px;font-weight:700;cursor:pointer;font-family:inherit;letter-spacing:.05em}' +
    '#dash-login .err{color:var(--danger,#f87171);min-height:1.2em;margin-top:10px;font-size:.9em}' +
    '#dash-lock{position:fixed;right:12px;bottom:10px;background:none;border:1px solid var(--border-strong,#2a4458);border-radius:6px;color:var(--muted,#7d91a6);font:600 11px var(--font,system-ui);padding:4px 9px;cursor:pointer;z-index:9999;letter-spacing:.06em}' +
    '#dash-lock:hover{color:var(--heading,#fff);border-color:var(--accent,#2dd4bf)}';
  document.head.appendChild(style);
  if (!getToken()) document.documentElement.classList.add('dash-locked');

  function buildLogin() {
    if (document.getElementById('dash-login')) return;
    var wrap = document.createElement('div');
    wrap.id = 'dash-login';
    wrap.innerHTML =
      '<form autocomplete="on"><h1>TRJ DASHBOARD</h1>' +
      '<input type="text" name="username" value="trj" autocomplete="username" style="display:none">' +
      '<input type="password" id="dash-pw" placeholder="Password" autocomplete="current-password" required>' +
      '<button type="submit">UNLOCK</button><div class="err" id="dash-err"></div></form>';
    document.body.appendChild(wrap);
    wrap.querySelector('form').addEventListener('submit', async function (e) {
      e.preventDefault();
      var err = document.getElementById('dash-err');
      var pw = document.getElementById('dash-pw');
      err.textContent = 'Checking...';
      try {
        var res = await fetch('/.netlify/functions/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ password: pw.value })
        });
        if (!res.ok) {
          err.textContent = res.status === 401 ? 'Wrong password' : 'Login unavailable (' + res.status + ')';
          pw.select();
          return;
        }
        var data = await res.json();
        localStorage.setItem(TOKEN_KEY, data.token);
        localStorage.setItem(EXP_KEY, String(data.exp));
        pw.value = '';
        err.textContent = '';
        document.documentElement.classList.remove('dash-locked');
        var w = waiters; waiters = [];
        w.forEach(function (fn) { fn(data.token); });
      } catch (ex) {
        err.textContent = 'Network error';
      }
    });
    if (document.documentElement.classList.contains('dash-locked')) {
      setTimeout(function () { var pw = document.getElementById('dash-pw'); if (pw) pw.focus(); }, 0);
    }
  }

  function buildLock() {
    if (document.getElementById('dash-lock')) return;
    var b = document.createElement('button');
    b.id = 'dash-lock';
    b.type = 'button';
    b.textContent = 'LOCK';
    b.title = 'Sign this browser out of the dashboard';
    b.onclick = function () { clearToken(); location.reload(); };
    document.body.appendChild(b);
  }

  function showLogin() {
    clearToken();
    document.documentElement.classList.add('dash-locked');
    buildLogin();
    var pw = document.getElementById('dash-pw');
    if (pw) pw.focus();
  }

  function ensureToken() {
    var t = getToken();
    if (t) return Promise.resolve(t);
    return new Promise(function (resolve) {
      waiters.push(resolve);
      if (document.body) showLogin();
      else document.addEventListener('DOMContentLoaded', showLogin);
    });
  }

  window.authFetch = async function (url, options) {
    options = options || {};
    for (var attempt = 0; attempt < 2; attempt++) {
      var token = await ensureToken();
      var headers = Object.assign({}, options.headers || {}, { Authorization: 'Bearer ' + token });
      var res = await fetch(url, Object.assign({}, options, { headers: headers }));
      if (res.status !== 401) return res;
      showLogin(); // session expired or revoked: ask again, then retry once
    }
    return res;
  };

  document.addEventListener('DOMContentLoaded', function () { buildLogin(); buildLock(); });
})();
