// Theme switcher + command bar for the TRJ Dashboard.
// Loaded in <head> so the saved theme is applied before the page paints.
(function () {
  var THEME_KEY = 'dashTheme';
  var THEMES = ['pdtc', 'terminal'];
  var LABELS = { pdtc: 'PDTC', terminal: 'TERMINAL' };

  function getTheme() {
    try { var t = localStorage.getItem(THEME_KEY); if (THEMES.indexOf(t) >= 0) return t; } catch (e) {}
    return 'pdtc';
  }
  function applyTheme(t) {
    document.documentElement.setAttribute('data-theme', t);
    var b = document.getElementById('theme-toggle');
    if (b) b.textContent = 'THEME: ' + LABELS[t];
  }
  applyTheme(getTheme());

  window.toggleTheme = function () {
    var next = THEMES[(THEMES.indexOf(getTheme()) + 1) % THEMES.length];
    try { localStorage.setItem(THEME_KEY, next); } catch (e) {}
    applyTheme(next);
  };

  // ---------------- command bar ----------------
  function collectItems() {
    var items = [];
    document.querySelectorAll('.grid > section, .news-card').forEach(function (sec) {
      var h = sec.querySelector('h2');
      var secName = h ? h.textContent.trim() : '';
      sec.querySelectorAll('a[href]').forEach(function (a) {
        items.push({ name: a.textContent.trim(), section: secName, url: a.href });
      });
    });
    document.querySelectorAll('.nav-buttons button').forEach(function (b) {
      if (b.id === 'theme-toggle') return;
      items.push({ name: b.textContent.trim(), section: 'Button', button: b });
    });
    return items;
  }

  function setupCommandBar() {
    var input = document.getElementById('main-search');
    if (!input) return;
    input.removeAttribute('onkeydown');
    input.placeholder = "Search or jump to a link (press 's')";
    input.setAttribute('autocomplete', 'off');

    var wrap = document.createElement('div');
    wrap.className = 'cmd-wrap';
    input.parentNode.insertBefore(wrap, input);
    wrap.appendChild(input);
    var box = document.createElement('div');
    box.id = 'cmd-results';
    wrap.appendChild(box);

    var items = collectItems();
    var results = [];
    var active = 0;

    function close() { box.classList.remove('open'); }

    function run(r) {
      close();
      if (r.google) {
        if (typeof launchSearch === 'function') launchSearch();
        else window.open('https://www.google.com/search?q=' + encodeURIComponent(input.value), '_blank');
        return;
      }
      if (r.button) r.button.click();
      else window.open(r.url, '_blank');
      input.value = '';
    }

    function render() {
      box.innerHTML = '';
      results.forEach(function (r, i) {
        var row = document.createElement('div');
        row.className = 'cmd-item' + (i === active ? ' active' : '');
        var n = document.createElement('span');
        n.textContent = r.google ? 'Search Google for “' + input.value.trim() + '”' : r.name;
        var s = document.createElement('span');
        s.className = 'cmd-sec';
        s.textContent = r.google ? 'Enter' : r.section;
        row.appendChild(n); row.appendChild(s);
        row.addEventListener('mousedown', function (e) { e.preventDefault(); run(r); });
        box.appendChild(row);
      });
      var hint = document.createElement('div');
      hint.className = 'cmd-hint';
      hint.textContent = '↑↓ choose · Enter open · Shift+Enter Google · Esc clear';
      box.appendChild(hint);
      box.classList.add('open');
    }

    function update() {
      var q = input.value.trim().toLowerCase();
      if (!q) { close(); return; }
      var words = q.split(/\s+/);
      var scored = [];
      items.forEach(function (it) {
        var hay = (it.name + ' ' + it.section).toLowerCase();
        if (!words.every(function (w) { return hay.indexOf(w) >= 0; })) return;
        var name = it.name.toLowerCase();
        var score = name.indexOf(q) === 0 ? 0 : name.indexOf(q) >= 0 ? 1 : 2;
        scored.push({ it: it, score: score });
      });
      scored.sort(function (a, b) { return a.score - b.score || a.it.name.localeCompare(b.it.name); });
      results = scored.slice(0, 8).map(function (s) { return s.it; });
      results.push({ google: true });
      active = 0;
      render();
    }

    input.addEventListener('input', update);
    input.addEventListener('focus', update);
    input.addEventListener('blur', function () { setTimeout(close, 120); });
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        if (e.shiftKey || !box.classList.contains('open')) { run({ google: true }); return; }
        if (results[active]) run(results[active]);
      } else if (e.key === 'ArrowDown' && box.classList.contains('open')) {
        e.preventDefault(); active = (active + 1) % results.length; render();
      } else if (e.key === 'ArrowUp' && box.classList.contains('open')) {
        e.preventDefault(); active = (active - 1 + results.length) % results.length; render();
      } else if (e.key === 'Escape') {
        close();
      }
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    applyTheme(getTheme());
    setupCommandBar();
    // Load the PIN for the PIN button (only after sign-in; never stored in the page source).
    if (window.authFetch && document.querySelector('[onclick="pinAction()"]')) {
      window.authFetch('/.netlify/functions/pin').then(function (r) { return r.ok ? r.json() : {}; })
        .then(function (d) { window.dashPin = d.pin || ''; }).catch(function () {});
    }
  });
})();
