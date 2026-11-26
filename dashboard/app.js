/* Momentum Launch Radar — the page. No framework, no network: it reads window.RADAR
   from data.js beside this page (written by main.ts) and renders the board, a detail
   view for every protocol, the live-token comparables and the model. Hash routes:
   #board (default), #detail=<slug>, #category=<name>, #live, #model. */

var R = window.RADAR;
var main = document.getElementById('main');
var meta = document.getElementById('meta');
var footNote = document.getElementById('footNote');
var sideNote = document.getElementById('sideNote');

function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
}

function fmtUsd(n) {
  if (n == null) return '—';
  if (n >= 1e9) return '$' + (n / 1e9).toFixed(2) + 'B';
  if (n >= 1e6) return '$' + (n / 1e6).toFixed(1) + 'M';
  if (n >= 1e3) return '$' + (n / 1e3).toFixed(1) + 'K';
  return '$' + Math.round(n);
}

function fmtPct(n) {
  if (n == null) return '—';
  return (n >= 0 ? '+' : '') + n.toFixed(1) + '%';
}

/* Heat class for a seven-day TVL move: hot green when it is surging, cold red when it is falling. */
function heatClass(chg) {
  if (chg == null) return 'heat-flat';
  if (chg >= 50) return 'heat-hot';
  if (chg >= 10) return 'heat-warm';
  if (chg <= -20) return 'heat-cold';
  if (chg <= -10) return 'heat-cool';
  return 'heat-flat';
}

function heatLabel(chg) {
  if (chg == null) return 'no 7d data';
  if (chg >= 50) return 'surging';
  if (chg >= 10) return 'heating up';
  if (chg <= -20) return 'cooling fast';
  if (chg <= -10) return 'cooling';
  return 'flat';
}

function fmtDays(age) {
  if (age == null) return 'unknown age';
  if (age < 30) return age + 'd old';
  if (age < 365) return Math.round(age / 30) + 'mo old';
  return (age / 365).toFixed(1) + 'y old';
}

if (!R) {
  main.innerHTML = '<div class="empty">No radar data loaded. Run main.ts to write data.js beside this page.</div>';
} else {
  meta.innerHTML = 'Snapshot <b>' + esc(R.as_of) + '</b> · ' + R.board_size + ' rows · ' +
    R.watchlist_size + ' on the watchlist · model <b>' + esc(R.model_version) + '</b>';
  footNote.textContent = 'Source: ' + R.source + '. Implied values are this entry’s own claim, never make.fun’s. ' +
    'A protocol “records no token” when the snapshot records none for it; the record is not proof.';
  sideNote.textContent = 'Momentum ranks by implied value: the leaders’ multiple, times the full seven-day move, times maturity, times chain breadth.';
  buildFilters();
  render();
  window.addEventListener('hashchange', render);
}

function buildFilters() {
  var cats = {};
  var chains = {};
  R.rows.forEach(function (r) {
    if (r.category) cats[r.category] = true;
    r.chains.forEach(function (c) { chains[c] = true; });
  });
  var catSel = document.getElementById('cat');
  Object.keys(cats).sort().forEach(function (c) {
    var o = document.createElement('option');
    o.value = c; o.textContent = c;
    catSel.appendChild(o);
  });
  var chainSel = document.getElementById('chain');
  Object.keys(chains).sort().forEach(function (c) {
    var o = document.createElement('option');
    o.value = c; o.textContent = c;
    chainSel.appendChild(o);
  });
  ['q', 'cat', 'chain', 'minTvl', 'watchOnly', 'sort'].forEach(function (id) {
    document.getElementById(id).addEventListener('input', function () {
      if (location.hash !== '#board' && location.hash !== '') history.replaceState(null, '', '#board');
      renderBoard();
    });
  });
  document.getElementById('reset').addEventListener('click', function () {
    document.getElementById('q').value = '';
    document.getElementById('cat').value = '';
    document.getElementById('chain').value = '';
    document.getElementById('minTvl').value = '';
    document.getElementById('watchOnly').checked = false;
    document.getElementById('sort').value = 'implied';
    renderBoard();
  });
}

function currentFilters() {
  return {
    q: document.getElementById('q').value.trim().toLowerCase(),
    cat: document.getElementById('cat').value,
    chain: document.getElementById('chain').value,
    minTvl: parseFloat(document.getElementById('minTvl').value) || 0,
    watchOnly: document.getElementById('watchOnly').checked,
    sort: document.getElementById('sort').value,
  };
}

function filteredRows() {
  var f = currentFilters();
  var rows = R.rows.filter(function (r) {
    if (f.q && (r.name.toLowerCase().indexOf(f.q) < 0 && r.slug.toLowerCase().indexOf(f.q) < 0)) return false;
    if (f.cat && r.category !== f.cat) return false;
    if (f.chain && r.chains.indexOf(f.chain) < 0) return false;
    if (f.minTvl && r.tvl_usd < f.minTvl * 1e6) return false;
    if (f.watchOnly && !r.watchlist) return false;
    return true;
  });
  if (f.sort === 'tvl') rows.sort(function (a, b) { return b.tvl_usd - a.tvl_usd; });
  else if (f.sort === 'chg') rows.sort(function (a, b) { return (b.change_7d == null ? -Infinity : b.change_7d) - (a.change_7d == null ? -Infinity : a.change_7d); });
  else if (f.sort === 'age') rows.sort(function (a, b) { return (b.age_days == null ? -1 : b.age_days) - (a.age_days == null ? -1 : a.age_days); });
  else rows.sort(function (a, b) { return a.rank - b.rank; });
  return rows;
}

function setActiveView(name) {
  var links = document.querySelectorAll('.views a');
  links.forEach(function (a) { a.classList.toggle('active', a.getAttribute('data-view') === name); });
}

function render() {
  var h = location.hash || '#board';
  if (h.indexOf('#detail=') === 0) { setActiveView('board'); renderDetail(decodeURIComponent(h.slice(8))); return; }
  if (h.indexOf('#category=') === 0) {
    var cat = decodeURIComponent(h.slice(10));
    document.getElementById('cat').value = cat;
    setActiveView('board');
    renderBoard();
    return;
  }
  if (h === '#live') { setActiveView('live'); renderLive(); return; }
  if (h === '#model') { setActiveView('model'); renderModel(); return; }
  setActiveView('board');
  renderBoard();
}

function rowHtml(r) {
  return '<tr>' +
    '<td class="rank num">' + r.rank + '</td>' +
    '<td class="namecell"><a href="#detail=' + encodeURIComponent(r.slug) + '"><b>' + esc(r.name) + '</b></a>' +
    '<span class="slug">' + esc(r.slug) + '</span>' +
    (r.watchlist ? '<span class="badge">watchlist</span>' : '') + '</td>' +
    '<td>' + esc(r.category || '—') + '</td>' +
    '<td class="num">' + fmtUsd(r.tvl_usd) + '</td>' +
    '<td class="num"><span class="heat ' + heatClass(r.change_7d) + '" title="' + esc(heatLabel(r.change_7d)) + '">' + fmtPct(r.change_7d) + '</span></td>' +
    '<td class="num">' + fmtUsd(r.implied_value_usd) + '</td>' +
    '<td class="num">×' + r.growth_multiplier.toFixed(2) + '</td>' +
    '</tr>';
}

function renderBoard() {
  var rows = filteredRows();
  var movers = R.rows.slice().sort(function (a, b) {
    return (b.change_7d == null ? -Infinity : b.change_7d) - (a.change_7d == null ? -Infinity : a.change_7d);
  }).slice(0, 3);
  var moverHtml = movers.map(function (r) {
    return '<a href="#detail=' + encodeURIComponent(r.slug) + '"><b>' + esc(r.name) + '</b></a> ' +
      '<span class="heat ' + heatClass(r.change_7d) + '">' + fmtPct(r.change_7d) + '</span>';
  }).join(' · ');
  var html = '<div class="card"><h2>The board</h2>' +
    '<p class="sub">' + rows.length + ' of ' + R.rows.length + ' protocols, ranked by implied value. ' +
    'The momentum column is the seven-day TVL move, heat-colored: green is surging, red is cooling. ' +
    'The × column is the growth multiplier the move sets (weight 1.0 — the full move counts).</p>' +
    '<div class="movers">Fastest movers this week: ' + moverHtml + '</div>' +
    '<table><thead><tr><th class="num">#</th><th>Protocol</th><th>Category</th>' +
    '<th class="num">TVL</th><th class="num">7-day</th><th class="num">Implied value</th><th class="num">Growth ×</th></tr></thead><tbody>';
  if (rows.length === 0) html += '<tr><td colspan="7" class="empty">No protocol matches these filters.</td></tr>';
  rows.forEach(function (r) { html += rowHtml(r); });
  html += '</tbody></table></div>';
  main.innerHTML = html;
}

function categoryLeaders(category) {
  if (!category) return null;
  for (var i = 0; i < R.categories.length; i++) {
    if (R.categories[i].category === category) return R.categories[i];
  }
  return null;
}

function renderDetail(slug) {
  var r = null;
  R.rows.forEach(function (x) { if (x.slug === slug) r = x; });
  if (!r) {
    main.innerHTML = '<div class="card"><h2>Not on the board</h2><p class="sub">No ranked protocol has the slug “' + esc(slug) + '”.</p><p><a href="#board">← Back to the board</a></p></div>';
    return;
  }
  var leaders = categoryLeaders(r.category);
  var html = '<div class="card"><p><a class="back" href="#board">← Back to the board</a></p>' +
    '<h2>#' + r.rank + ' ' + esc(r.name) + (r.watchlist ? '<span class="badge">watchlist</span>' : '') + '</h2>' +
    '<p class="sub">' + esc(r.slug) + ' · ' + esc(r.category || 'no category') + ' · ' + esc(r.chains.join(', ') || 'no chain listed') +
    ' · ' + fmtDays(r.age_days) + ' · snapshot ' + esc(R.as_of) + '</p>' +
    '<div class="kv">' +
    '<div><div class="k">Implied value</div><div class="v">' + fmtUsd(r.implied_value_usd) + '</div></div>' +
    '<div><div class="k">TVL</div><div class="v">' + fmtUsd(r.tvl_usd) + '</div></div>' +
    '<div><div class="k">7-day TVL change</div><div class="v"><span class="heat ' + heatClass(r.change_7d) + '">' + fmtPct(r.change_7d) + '</span></div></div>' +
    '<div><div class="k">Growth multiplier</div><div class="v">×' + r.growth_multiplier.toFixed(2) + '</div></div>' +
    '</div>' +
    '<h3>Momentum breakdown</h3>' +
    '<p class="equation">' + fmtUsd(r.tvl_usd) + ' TVL × <b>' + r.leaders_multiple.toFixed(3) + '</b> leaders’ multiple' +
    ' × <b>×' + r.growth_multiplier.toFixed(2) + '</b> growth' +
    ' × <b>×' + r.maturity_multiplier.toFixed(2) + '</b> maturity' +
    ' × <b>×' + r.chain_multiplier.toFixed(2) + '</b> chains' +
    ' = <b>' + fmtUsd(r.implied_value_usd) + '</b></p>' +
    '<p class="sub">The growth multiplier is the full seven-day move (weight 1.0): a protocol up 50% in a week scores 1.5× its base, ' +
    'one down 50% scores 0.5×. Maturity peaks at 365 days with no token recorded, then fades to 0.50 by 1,200 days.</p>';
  if (leaders) {
    html += '<h3>Who set the multiple: the top ' + leaders.leaders.length + ' leaders of ' + esc(r.category) + '</h3>' +
      '<p class="sub">' + (leaders.fallback
        ? 'This category has fewer than 3 live-token protocols, so the multiple falls back to the global top-5 median.'
        : 'The multiple is the median market-cap-to-TVL of these leaders, the biggest live-token protocols in the category by TVL.') + '</p>' +
      '<table><thead><tr><th>Leader</th><th class="num">TVL</th><th class="num">Market cap</th><th class="num">mcap / TVL</th></tr></thead><tbody>';
    leaders.leaders.forEach(function (l) {
      html += '<tr><td><b>' + esc(l.name) + '</b> <span class="slug">' + esc(l.slug) + '</span></td>' +
        '<td class="num">' + fmtUsd(l.tvl_usd) + '</td><td class="num">' + fmtUsd(l.mcap_usd) + '</td>' +
        '<td class="num">' + l.multiple.toFixed(3) + '×</td></tr>';
    });
    html += '</tbody></table><p class="sub">Median of the leaders: <b>' + leaders.median_multiple.toFixed(3) + '×</b> · multiple used: <b>' +
      leaders.used_multiple.toFixed(3) + '×</b> · comparables in category: ' + leaders.comps + '</p>';
  }
  html += '<h3>Farm plan — 8 steps</h3><ol class="steps">';
  r.farm_steps.forEach(function (s) {
    var m = s.match(/^(.*?)( Cost: .*)$/);
    html += '<li>' + esc(m ? m[1] : s) + (m ? '<div class="cost">' + esc(m[2].trim()) + '</div>' : '') + '</li>';
  });
  html += '</ol></div>';
  main.innerHTML = html;
  window.scrollTo(0, 0);
}

function renderLive() {
  var html = '<div class="card"><h2>Live tokens — the comparables</h2>' +
    '<p class="sub">The ' + R.live.length + ' biggest live-token protocols by market cap. Their market-cap-to-TVL ratios are the ' +
    'multiples the momentum model learns from; they are never ranked on this board, because they already trade.</p>' +
    '<table><thead><tr><th class="num">#</th><th>Protocol</th><th>Category</th><th class="num">TVL</th><th class="num">Market cap</th><th class="num">mcap / TVL</th></tr></thead><tbody>';
  R.live.forEach(function (p, i) {
    html += '<tr><td class="rank num">' + (i + 1) + '</td><td class="namecell"><b>' + esc(p.name) + '</b><span class="slug">' + esc(p.slug) + '</span></td>' +
      '<td>' + esc(p.category || '—') + '</td><td class="num">' + fmtUsd(p.tvl_usd) + '</td>' +
      '<td class="num">' + fmtUsd(p.mcap_usd) + '</td><td class="num">' + (p.multiple == null ? '—' : p.multiple.toFixed(3) + '×') + '</td></tr>';
  });
  html += '</tbody></table></div>';
  main.innerHTML = html;
}

function renderModel() {
  var m = R.model;
  var html = '<div class="card"><h2>The model — radar-momentum</h2>' +
    '<p class="sub">Implied value = TVL × leaders’ multiple × growth × maturity × chains. ' +
    'The leaders set the price, and the full seven-day move counts: momentum first, everything else second.</p>' +
    '<div class="kv">' +
    '<div><div class="k">Leaders’ multiple</div><div class="v">top-' + m.leaders_count + ' median</div></div>' +
    '<div><div class="k">Multiple clamp</div><div class="v">' + m.multiple_floor + '× – ' + m.multiple_cap + '×</div></div>' +
    '<div><div class="k">Growth weight</div><div class="v">×' + m.growth_weight.toFixed(2) + '</div></div>' +
    '<div><div class="k">Growth clamp</div><div class="v">' + m.growth_floor + '% – +' + m.growth_cap + '%</div></div>' +
    '<div><div class="k">Maturity peak</div><div class="v">' + m.maturity_peak_days + ' days</div></div>' +
    '<div><div class="k">Chain bonus</div><div class="v">+' + Math.round(m.chain_bonus * 100) + '% / chain, max ' + m.chain_bonus_cap + '</div></div>' +
    '<div><div class="k">Global multiple</div><div class="v">' + R.global_multiple.toFixed(3) + '×</div></div>' +
    '<div><div class="k">Rows</div><div class="v">' + R.board_size + ' (' + R.early_size + ' early)</div></div>' +
    '</div>' +
    '<h3>Leaders by category</h3>' +
    '<p class="sub">Each category’s multiple is the median of its top-' + m.leaders_count + ' live-token protocols by TVL. ' +
    'Categories with fewer than ' + m.category_min_comps + ' live-token protocols use the global top-' + m.leaders_count + ' median (' + R.global_multiple.toFixed(3) + '×).</p>' +
    '<table><thead><tr><th>Category</th><th class="num">Live comps</th><th>Leaders (top 5 by TVL)</th><th class="num">Used multiple</th></tr></thead><tbody>';
  R.categories.forEach(function (c) {
    var names = c.leaders.map(function (l) { return esc(l.name) + ' (' + l.multiple.toFixed(2) + '×)'; }).join(', ');
    html += '<tr><td><b>' + esc(c.category) + '</b>' + (c.fallback ? ' <span class="badge">fallback</span>' : '') + '</td>' +
      '<td class="num">' + c.comps + '</td><td>' + names + '</td><td class="num">' + c.used_multiple.toFixed(3) + '×</td></tr>';
  });
  html += '</tbody></table></div>';
  main.innerHTML = html;
}
