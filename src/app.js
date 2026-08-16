(function () {
  'use strict';

  /* ── Auth gate ── */
  var AUTH_HASH = '155554cd95295ef24831cc00fa514945e91524aada7e953a942a642c905a485a';
  var AUTH_KEY = 'gaas-hub:auth';

  function initAuthGate() {
    var gate = document.getElementById('authGate');
    if (!gate) return;
    if (sessionStorage.getItem(AUTH_KEY) === AUTH_HASH) {
      gate.classList.add('hidden');
      return;
    }
    document.getElementById('authForm').addEventListener('submit', function (e) {
      e.preventDefault();
      var user = document.getElementById('authUser').value.trim();
      var pass = document.getElementById('authPass').value;
      var raw = user + ':' + pass;
      var enc = new TextEncoder().encode(raw);
      crypto.subtle.digest('SHA-256', enc).then(function (buf) {
        var arr = Array.from(new Uint8Array(buf));
        var hex = arr.map(function (b) { return b.toString(16).padStart(2, '0'); }).join('');
        if (hex === AUTH_HASH) {
          sessionStorage.setItem(AUTH_KEY, AUTH_HASH);
          gate.classList.add('hidden');
        } else {
          document.getElementById('authErr').hidden = false;
          document.getElementById('authPass').value = '';
          document.getElementById('authPass').focus();
        }
      });
    });
  }
  initAuthGate();

  var TABS = window.__GAAS_TABS || [];
  var NAV = window.__GAAS_NAV || {};
  var INDEX = window.__GAAS_INDEX || [];
  var SOURCES = window.__GAAS_SOURCES || {};
  var CHECK_KEY = 'gaas-hub:check';

  var state = {
    activeTab: TABS[0] ? TABS[0].id : 'brand',
    scrollPositions: {},
    selectedResult: -1,
    results: []
  };

  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };

  /* ---------- Normalization for search ---------- */
  function normalize(text) {
    return text
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/đ/g, 'd')
      .replace(/Đ/g, 'd')
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .trim();
  }

  function stripTags(html) {
    var div = document.createElement('div');
    div.innerHTML = html;
    return div.textContent || '';
  }

  /* ---------- Tabs ---------- */
  function switchTab(tabId, opts) {
    opts = opts || {};
    var tab = TABS.filter(function (t) { return t.id === tabId; })[0];
    if (!tab) tabId = TABS[0].id;
    var previous = state.activeTab;
    if (previous !== tabId && state.scrollPositions[previous] !== undefined) {
      var oldPanel = document.getElementById('tab-' + previous);
      if (oldPanel) state.scrollPositions[previous] = oldPanel.scrollTop === 0 ? window.scrollY : oldPanel.scrollTop;
    }
    state.activeTab = tabId;
    state.selectedResult = -1;
    state.results = [];

    TABS.forEach(function (t) {
      var btn = $('#tabbtn-' + t.id);
      var panel = document.getElementById('tab-' + t.id);
      if (btn) btn.setAttribute('aria-selected', String(t.id === tabId));
      if (panel) {
        if (t.id === tabId) { panel.removeAttribute('hidden'); }
        else { panel.setAttribute('hidden', ''); }
      }
    });
    renderSidebar();

    if (opts.scrollTo) {
      scrollToSection(opts.scrollTo, opts.flash);
    } else {
      window.scrollTo(0, 0);
    }
    document.title = tab.label + ' · GAAS FOUNDATION Internal Hub';
  }

  function bindTabs() {
    $$('.nav-tab').forEach(function (btn) {
      btn.addEventListener('click', function () {
        switchTab(btn.dataset.tab);
        closeDrawer();
      });
    });
    // ARIA roving tabindex
    $$('.nav-tab').forEach(function (btn, i) {
      btn.addEventListener('keydown', function (e) {
        var tabs = $$('.nav-tab');
        var idx = tabs.indexOf(btn);
        var next = null;
        if (e.key === 'ArrowRight') next = tabs[(idx + 1) % tabs.length];
        else if (e.key === 'ArrowLeft') next = tabs[(idx - 1 + tabs.length) % tabs.length];
        else if (e.key === 'Home') next = tabs[0];
        else if (e.key === 'End') next = tabs[tabs.length - 1];
        if (next) {
          e.preventDefault();
          next.focus();
          next.click();
        }
      });
    });
  }

  /* ---------- Sidebar ---------- */
  function chevronSvg() {
    return '<svg width="11" height="11" viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M5 8l5 5 5-5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  }

  function renderSidebar() {
    var label = $('#sidebarTabLabel');
    var count = $('#sidebarCount');
    var list = $('#navList');
    if (!list) return;
    var tab = TABS.filter(function (t) { return t.id === state.activeTab; })[0];
    if (label) label.textContent = tab ? tab.label : '';
    var groups = NAV[state.activeTab] || [];
    var total = 0;
    var html = '';
    groups.forEach(function (group) {
      if (!group.items.length) return; // bỏ nhóm rỗng — không có gì để nhảy tới
      var kidsByParent = {};
      var l2 = 0, l3 = 0;
      group.items.forEach(function (item) {
        if (item.level === 3) { l3++; (kidsByParent[item.parent] = kidsByParent[item.parent] || []).push(item); }
        else l2++;
      });
      // Nhóm có nhiều mục chính + hầu như không có mục con (brand-guide viết theo
      // H2 phẳng) → nhóm label làm mục cha accordion, xổ mục con khi bấm mũi tên.
      // Tab Matrix/Handbook có level-3 nên giữ cấu trúc mục chính + mục con hiện tại.
      if (l2 >= 2 && l3 <= 1) {
        total++;
        html += '<div class="nav-group"><div class="nav-item has-sub">';
        html += '<div class="nav-item-row"><span class="nav-group-label nav-collapse">' + escapeHtml(group.group) + '</span>';
        html += '<button type="button" class="nav-toggle" aria-expanded="false" aria-label="Mở mục ' + escapeHtml(group.group) + '">' + chevronSvg() + '</button>';
        html += '</div><div class="nav-sub">';
        group.items.forEach(function (item) {
          html += '<a class="nav-link' + (item.level === 3 ? ' is-h3' : '') + '" href="#' + state.activeTab + '/' + item.id + '" data-id="' + item.id + '">' + escapeHtml(item.label) + '</a>';
        });
        html += '</div></div></div>';
        return;
      }
      html += '<div class="nav-group"><span class="nav-group-label">' + escapeHtml(group.group) + '</span>';
      group.items.forEach(function (item) {
        if (item.level === 3) return;
        total++;
        var kids = kidsByParent[item.id] || [];
        html += '<div class="nav-item' + (kids.length ? ' has-sub' : '') + '">';
        html += '<div class="nav-item-row"><a class="nav-link" href="#' + state.activeTab + '/' + item.id + '" data-id="' + item.id + '">' + escapeHtml(item.label) + '</a>';
        if (kids.length) {
          html += '<button type="button" class="nav-toggle" aria-expanded="false" aria-label="Mở mục ' + escapeHtml(item.label) + '">' + chevronSvg() + '</button>';
        }
        html += '</div>';
        if (kids.length) {
          html += '<div class="nav-sub">';
          kids.forEach(function (k) {
            html += '<a class="nav-link is-h3" href="#' + state.activeTab + '/' + k.id + '" data-id="' + k.id + '" data-parent="' + item.id + '">' + escapeHtml(k.label) + '</a>';
          });
          html += '</div>';
        }
        html += '</div>';
      });
      html += '</div>';
    });
    list.innerHTML = html;
    if (count) count.textContent = String(total);
    bindNavLinks();
  }

  function setNavOpen(item, open) {
    if (!item) return;
    var toggle = $('.nav-toggle', item);
    var sub = $('.nav-sub', item);
    if (!toggle || !sub) return;
    if (open) {
      toggle.setAttribute('aria-expanded', 'true');
      sub.classList.add('open');
      item.classList.add('open');
    } else {
      toggle.setAttribute('aria-expanded', 'false');
      sub.classList.remove('open');
      item.classList.remove('open');
    }
  }

  function bindNavLinks() {
    $$('#navList .nav-toggle').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        var item = btn.closest('.nav-item');
        var open = !$('.nav-sub', item).classList.contains('open');
        setNavOpen(item, open);
        // allow one open at a time within the same group
        if (open) {
          var group = item.closest('.nav-group');
          $$('.nav-item.open', group).forEach(function (other) {
            if (other !== item) setNavOpen(other, false);
          });
        }
      });
    });
    $$('#navList .nav-link').forEach(function (link) {
      link.addEventListener('click', function () {
        closeDrawer();
        setActiveNav(link.dataset.id);
      });
    });
  }

  function setActiveNav(id) {
    $$('#navList .nav-link').forEach(function (link) {
      link.classList.toggle('active', link.dataset.id === id);
    });
    // auto-open the accordion containing the active item
    var active = $('#navList .nav-link.active');
    if (active) {
      var item = active.closest('.nav-item');
      if (item) setNavOpen(item, true);
    }
  }

  /* ---------- Scroll spy ---------- */
  function initScrollSpy() {
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          var panel = entry.target.closest('.tab-panel');
          if (!panel || panel.id !== 'tab-' + state.activeTab) return;
          setActiveNav(entry.target.id);
        }
      });
    }, { rootMargin: '-15% 0px -70% 0px', threshold: 0 });
    $$('.content section[id]').forEach(function (sec) { observer.observe(sec); });
  }

  function scrollToSection(id, flash) {
    var el = document.getElementById(id);
    if (!el) return;
    setActiveNav(id);
    // Panel vừa được bỏ [hidden] ở cùng frame -> layout chưa cập nhật, scrollIntoView
    // sẽ tưởng đã ở đúng chỗ. Ép reflow rồi cuộn ở frame kế tiếp.
    void document.body.offsetHeight;
    var reduceMotion = window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    // Không bọc requestAnimationFrame: trong vài môi trường (WebDriver/headless)
    // rAF không fire -> scroll không bao giờ chạy. Ép reflow bằng offsetHeight
    // rồi cuộn ngay là đủ cho panel vừa un-hide.
    if (reduceMotion) {
      el.scrollIntoView(true);
    } else {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    if (flash) {
      el.style.transition = 'background-color .8s ease';
      el.style.backgroundColor = '#FFF3D6';
      setTimeout(function () { el.style.backgroundColor = ''; }, 1400);
    }
  }

  /* ---------- Hash routing ---------- */
  function parseHash(hash) {
    hash = hash.replace(/^#/, '');
    if (!hash) return null;
    var parts = hash.split('/');
    var tabId = parts[0];
    var sectionId = parts[1] || '';
    // legacy bare handbook anchor -> handbook tab
    if (TABS.every(function (t) { return t.id !== tabId; })) {
      if (NAV.handbook && NAV.handbook.some(function (g) { return g.items.some(function (i) { return i.id === tabId; }); })) {
        return { tab: 'handbook', section: tabId };
      }
      return null;
    }
    return { tab: tabId, section: sectionId };
  }

  function applyHash(hash) {
    var parsed = parseHash(hash);
    if (!parsed) { switchTab(state.activeTab); return; }
    if (parsed.tab !== state.activeTab) {
      switchTab(parsed.tab, { scrollTo: parsed.section, flash: true });
    } else if (parsed.section) {
      scrollToSection(parsed.section, true);
    }
  }

  function initHashRouting() {
    window.addEventListener('hashchange', function () {
      applyHash(location.hash);
    });
    applyHash(location.hash);
  }

  /* ---------- Drawer (mobile) ---------- */
  function initDrawer() {
    var toggle = $('#drawerToggle');
    var sidebar = $('#sidebar');
    var backdrop = $('#drawerBackdrop');
    if (!toggle || !sidebar) return;
    toggle.addEventListener('click', function () {
      var open = sidebar.classList.toggle('open');
      toggle.setAttribute('aria-expanded', String(open));
      backdrop.hidden = !open;
      if (open) { sidebar.focus && sidebar.focus(); }
    });
    if (backdrop) backdrop.addEventListener('click', closeDrawer);
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && sidebar.classList.contains('open')) closeDrawer();
    });
    document.addEventListener('click', function (e) {
      if (sidebar.classList.contains('open') && !sidebar.contains(e.target) && !toggle.contains(e.target)) closeDrawer();
    });
  }

  function closeDrawer() {
    var sidebar = $('#sidebar');
    var toggle = $('#drawerToggle');
    var backdrop = $('#drawerBackdrop');
    if (!sidebar) return;
    sidebar.classList.remove('open');
    if (toggle) toggle.setAttribute('aria-expanded', 'false');
    if (backdrop) backdrop.hidden = true;
  }

  /* ---------- Search ---------- */
  function initSearch() {
    var input = $('#globalSearch');
    var panel = $('#searchPanel');
    var results = $('#searchResults');
    if (!input || !panel || !results) return;
    var debounce;
    input.addEventListener('input', function () {
      clearTimeout(debounce);
      debounce = setTimeout(function () { runSearch(input.value); }, 120);
    });
    input.addEventListener('keydown', function (e) {
      if (e.key === '/' || (e.metaKey && e.key === 'k') || (e.ctrlKey && e.key === 'k')) {
        e.preventDefault(); input.focus();
      } else if (e.key === 'Escape') {
        closeSearch();
      } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        if (state.results.length === 0) return;
        e.preventDefault();
        var delta = e.key === 'ArrowDown' ? 1 : -1;
        state.selectedResult = (state.selectedResult + delta + state.results.length) % state.results.length;
        renderSearch();
      } else if (e.key === 'Enter') {
        if (state.selectedResult >= 0 && state.results[state.selectedResult]) {
          activateResult(state.results[state.selectedResult]);
        }
      }
    });
  }

  function runSearch(rawQuery) {
    var resultsBox = $('#searchResults');
    if (!resultsBox) return;
    var query = normalize(rawQuery).trim();
    if (!query) { closeSearch(); return; }
    var tokens = query.split(' ').filter(Boolean);
    var matches = [];
    INDEX.forEach(function (rec) {
      var norm = rec.norm;
      var ok = tokens.every(function (tok) { return norm.indexOf(tok) !== -1; });
      if (!ok) return;
      var score = 0;
      if (normalize(rec.title).indexOf(query) !== -1) score += 5;
      if (normalize(rec.trail).indexOf(query) !== -1) score += 2;
      var firstBody = -1;
      tokens.forEach(function (tok) { var i = norm.indexOf(tok); if (i !== -1 && (firstBody === -1 || i < firstBody)) firstBody = i; });
      if (firstBody !== -1) score += 1;
      matches.push({ rec: rec, score: score, firstBody: firstBody });
    });
    matches.sort(function (a, b) { return b.score - a.score; });
    matches = matches.slice(0, 30);
    state.results = matches;
    state.selectedResult = matches.length ? 0 : -1;
    renderSearch();
  }

  function renderSearch() {
    var resultsBox = $('#searchResults');
    var panel = $('#searchPanel');
    if (!resultsBox || !panel) return;
    panel.hidden = false;
    panel.removeAttribute('hidden');
    if (state.results.length === 0) {
      resultsBox.innerHTML = '<div class="search-empty">Không tìm thấy — thử từ khóa ngắn hơn hoặc bỏ dấu.</div>';
      return;
    }
    var byTab = {};
    state.results.forEach(function (m) {
      (byTab[m.rec.tab] = byTab[m.rec.tab] || []).push(m);
    });
    var html = '<div class="search-status">' + state.results.length + ' kết quả</div>';
    TABS.forEach(function (tab) {
      var list = byTab[tab.id];
      if (!list) return;
      html += '<div class="search-group-label">' + tab.label + ' · ' + list.length + '</div>';
      list.forEach(function (m, idx) {
        var rec = m.rec;
        var globalIdx = state.results.indexOf(m);
        html += '<button type="button" class="search-item" role="option" aria-selected="' + (globalIdx === state.selectedResult) + '" data-idx="' + globalIdx + '">' +
          '<div class="si-title">' + escapeHtml(rec.title) + '</div>' +
          '<div class="si-trail">' + escapeHtml(rec.trail) + '</div>' +
          (m.firstBody !== -1 ? '<div class="si-snippet">' + buildSnippet(rec, m.firstBody) + '</div>' : '') +
          '</button>';
      });
    });
    resultsBox.innerHTML = html;
    $$('.search-item', resultsBox).forEach(function (btn) {
      btn.addEventListener('click', function () {
        activateResult(state.results[parseInt(btn.dataset.idx, 10)]);
      });
      btn.addEventListener('mouseenter', function () {
        state.selectedResult = parseInt(btn.dataset.idx, 10);
        renderSearch();
      });
    });
  }

  function buildSnippet(rec, firstBody) {
    var body = rec.body;
    var start = Math.max(0, firstBody - 60);
    var end = Math.min(body.length, firstBody + 60);
    var snippet = (start > 0 ? '…' : '') + body.slice(start, end).replace(/\s+/g, ' ').trim() + (end < body.length ? '…' : '');
    return escapeHtml(snippet);
  }

  function activateResult(match) {
    var rec = match.rec;
    closeSearch();
    if (rec.tab !== state.activeTab) {
      switchTab(rec.tab, { scrollTo: rec.id, flash: true });
    } else {
      scrollToSection(rec.id, true);
    }
    var input = $('#globalSearch');
    if (input) input.blur();
  }

  function closeSearch() {
    var panel = $('#searchPanel');
    var input = $('#globalSearch');
    if (panel) { panel.setAttribute('hidden', ''); }
    if (input && input.value) { input.value = ''; }
    state.selectedResult = -1;
    state.results = [];
  }

  /* ---------- Checklists ---------- */
  function initChecklists() {
    $$('.checklist').forEach(function (list) {
      var section = list.closest('section[id]');
      var sectionId = section ? section.id : 'unknown';
      var inputs = $$('input[type=checkbox]', list);
      var count = inputs.length;
      var progress = document.createElement('div');
      progress.className = 'checklist-progress';
      var saved = loadChecks(sectionId, count);
      inputs.forEach(function (input, i) {
        var key = sectionId + ':' + i;
        input.checked = saved[i] === true;
        input.addEventListener('change', function () {
          saveChecks(sectionId, inputs);
          updateProgress();
          if (input.checked) {
            var li = input.closest('li');
            if (li) li.classList.add('checked');
          }
        });
        if (input.checked) {
          var li = input.closest('li');
          if (li) li.classList.add('checked');
        }
      });
      function updateProgress() {
        var done = inputs.filter(function (x) { return x.checked; }).length;
        progress.innerHTML = '<span>Đã đánh dấu ' + done + '/' + count + '</span>';
        var reset = document.createElement('button');
        reset.type = 'button';
        reset.className = 'reset';
        reset.textContent = 'Xóa đánh dấu';
        reset.addEventListener('click', function () {
          inputs.forEach(function (x) { x.checked = false; });
          $$('li', list).forEach(function (li) { li.classList.remove('checked'); });
          localStorage.removeItem(CHECK_KEY + ':' + sectionId);
          updateProgress();
        });
        progress.appendChild(reset);
      }
      updateProgress();
      list.parentNode.insertBefore(progress, list.nextSibling);
    });
  }

  function loadChecks(sectionId, count) {
    try {
      var raw = localStorage.getItem(CHECK_KEY + ':' + sectionId);
      if (!raw) return {};
      var arr = JSON.parse(raw);
      return arr;
    } catch (e) { return {}; }
  }

  function saveChecks(sectionId, inputs) {
    var arr = inputs.map(function (x) { return x.checked; });
    try { localStorage.setItem(CHECK_KEY + ':' + sectionId, JSON.stringify(arr)); } catch (e) {}
  }

  /* ---------- Helpers ---------- */
  function escapeHtml(str) {
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  /* ---------- Recommend widget (Tab 3 Handbook) ---------- */
  var REC = window.__GAAS_REC_DATA || null;

  function recFind(list, id) {
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return null;
  }

  var INDUSTRY_HINTS = {
    'retail': ['svc-01', 'svc-08', 'svc-09', 'svc-04', 'svc-06', 'svc-03'],
    'bds': ['svc-01', 'svc-10', 'svc-04', 'svc-05', 'svc-03', 'svc-08'],
    'travel': ['svc-01', 'svc-08', 'svc-09', 'svc-07', 'svc-04', 'svc-05', 'svc-06']
  };

  function buildRecForm() {
    var html = '';
    html += '<div class="rec-field"><label for="recIndustry">1 · Ngành của khách</label>' +
      '<select id="recIndustry" name="industry">' +
      REC.industries.map(function (o) {
        return '<option value="' + escapeHtml(o.id) + '">' + escapeHtml(o.label) + '</option>';
      }).join('') + '</select></div>';

    html += '<div class="rec-field"><label for="recNeed">2 · Nhu cầu chính của khách</label>' +
      '<select id="recNeed" name="need">' +
      REC.needs.map(function (o) {
        return '<option value="' + escapeHtml(o.id) + '">' + escapeHtml(o.label) + '</option>';
      }).join('') +
      '<option value="__other__">Khác — nhu cầu cụ thể khác</option>' +
      '</select>' +
      '<input type="text" id="recNeedOther" class="rec-need-other" placeholder="Mô tả nhu cầu cụ thể…" hidden></div>';

    html += '<fieldset class="rec-field"><legend>3 · Hiện trạng nền tảng khách đang có</legend><div class="rec-tick">' +
      REC.platforms.map(function (o) {
        return '<label class="rec-chip"><input type="checkbox" name="platform" value="' + escapeHtml(o.id) + '"><span>' + escapeHtml(o.label) + '</span></label>';
      }).join('') + '</div></fieldset>';

    html += '<fieldset class="rec-field"><legend>4 · Phạm vi dự kiến</legend><div class="rec-tick">' +
      REC.scopes.map(function (o) {
        return '<label class="rec-chip"><input type="checkbox" name="scope" value="' + escapeHtml(o.id) + '"><span>' + escapeHtml(o.label) + '</span></label>';
      }).join('') + '</div></fieldset>';

    html += '<div class="rec-field"><label for="recBudget">5 · Ngân sách dịch vụ (tháng / dự án)</label>' +
      '<select id="recBudget" name="budget">' +
      REC.budgets.map(function (o) {
        return '<option value="' + escapeHtml(o.id) + '">' + escapeHtml(o.label) + '</option>';
      }).join('') + '</select></div>';

    html += '<fieldset class="rec-field"><legend>6 · Hạ tầng khách</legend><div class="rec-tick">' +
      REC.infra.map(function (o) {
        return '<label class="rec-chip"><input type="checkbox" name="infra" value="' + escapeHtml(o.id) + '"><span>' + escapeHtml(o.label) + '</span></label>';
      }).join('') + '</div></fieldset>';

    html += '<div class="rec-actions"><button type="submit" class="rec-submit">Đề xuất gói</button>' +
      '<button type="reset" class="rec-reset">Làm lại</button></div>';
    html += '<p id="recError" class="rec-error" hidden></p>';
    return html;
  }

  function readRecForm(box) {
    var industry = $('#recIndustry', box) ? $('#recIndustry', box).value : '';
    var need = $('#recNeed', box) ? $('#recNeed', box).value : '';
    var needOther = $('#recNeedOther', box) ? $('#recNeedOther', box).value.trim() : '';
    var budget = $('#recBudget', box) ? $('#recBudget', box).value : '';
    var platforms = $$('input[name="platform"]:checked', box).map(function (x) { return x.value; });
    var scopes = $$('input[name="scope"]:checked', box).map(function (x) { return x.value; });
    var infra = $$('input[name="infra"]:checked', box).map(function (x) { return x.value; });
    if (need === '__other__' && !needOther) {
      return { ok: false, error: 'Anh chị chọn "Khác" — hãy mô tả nhu cầu cụ thể của khách.' };
    }
    if (scopes.length === 0) {
      return { ok: false, error: 'Chọn ít nhất 1 phạm vi (bước 4).' };
    }
    if (!budget) {
      return { ok: false, error: 'Chọn ngân sách (bước 5).' };
    }
    var needMeta = recFind(REC.needs, need);
    return {
      ok: true,
      industry: industry,
      need: need,
      needLabel: needMeta ? needMeta.label : needOther,
      needService: needMeta ? needMeta.service : null,
      needOther: need === '__other__' ? needOther : '',
      budget: budget,
      platforms: platforms,
      scopes: scopes,
      infra: infra
    };
  }

  function scoreService(svc, inputs) {
    var score = 0;
    var reasons = [];
    if (inputs.needService && svc.id === inputs.needService) { score += 4; reasons.push('Nhu cầu chính'); }
    if (svc.scopes.some(function (s) { return inputs.scopes.indexOf(s) !== -1; })) { score += 2; reasons.push('Phạm vi phù hợp'); }
    if (svc.budget.indexOf(inputs.budget) !== -1) { score += 2; reasons.push('Ngân sách phù hợp'); }
    if (inputs.infra.indexOf('db') !== -1 && svc.id === 'svc-08') { score += 1; reasons.push('Có database khách'); }
    if (inputs.infra.indexOf('team') !== -1 && (svc.id === 'svc-10' || svc.id === 'svc-01')) { score += 1; reasons.push('Có team sales'); }
    if (inputs.platforms.indexOf('zalo') !== -1 && svc.id === 'svc-08') { score += 1; }
    if (inputs.platforms.indexOf('ads') !== -1 && svc.id === 'svc-04') { score += 1; }
    if (inputs.platforms.indexOf('ecom') !== -1 && svc.id === 'svc-05') { score += 1; reasons.push('Bán online'); }
    if (inputs.platforms.indexOf('none') !== -1 && svc.id === 'svc-05') { score += 1; reasons.push('Chưa có nền tảng → cần nền tảng số'); }
    var hints = INDUSTRY_HINTS[inputs.industry] || [];
    if (hints.indexOf(svc.id) !== -1) { score += 1; reasons.push('Ngành ưu tiên'); }
    return { score: score, reasons: reasons };
  }

  function computeRecs(inputs) {
    var scored = REC.services.map(function (svc) {
      var r = scoreService(svc, inputs);
      return { svc: svc, score: r.score, reasons: r.reasons };
    });
    scored.sort(function (a, b) {
      return (b.score - a.score) || (a.svc.id < b.svc.id ? -1 : 1);
    });
    var threshold = inputs.needService ? 3 : 2;
    var top = scored.filter(function (s) { return s.score >= threshold; }).slice(0, 3);
    if (!top.length) top = scored.slice(0, 2);
    return top;
  }

  function platformLabel(id) {
    var p = recFind(REC.platforms, id);
    return p ? p.label : id;
  }

  function recCard(item, inputs, rank, isPrimary, nameById) {
    var svc = item.svc;
    var html = '<div class="rec-card' + (isPrimary ? ' is-primary' : '') + '">';
    html += '<div class="rec-card-head"><span class="rec-rank">' + rank + '</span>' +
      '<span class="rec-name">' + escapeHtml(svc.name) + '</span>' +
      '<span class="rec-tier">' + escapeHtml(svc.tier) + '</span>' +
      '<span class="rec-why">' + escapeHtml(item.reasons.join(' · ')) + '</span></div>';
    html += '<div class="rec-fit"><b>Khách phù hợp:</b> ' + escapeHtml(svc.fit) + '</div>';
    html += '<div class="rec-nonfit"><b>Cần thận trọng:</b> ' + escapeHtml(svc.nonFit) + '</div>';
    html += '<div class="rec-pkgs">';
    var shown = isPrimary ? svc.packages : svc.packages.slice(0, 2);
    shown.forEach(function (p) {
      html += '<div class="rec-pkg"><span class="rec-pkg-name">' + escapeHtml(p.name) +
        '</span><span class="rec-pkg-price">' + escapeHtml(p.price) + '</span>' +
        (isPrimary ? '<span class="rec-pkg-desc">' + escapeHtml(p.desc) + '</span>' : '') +
        '</div>';
    });
    if (!isPrimary && svc.packages.length > 2) {
      html += '<div class="rec-pkg rec-pkg-more">+ ' + (svc.packages.length - 2) + ' gói nữa — xem mục dịch vụ phía trên</div>';
    }
    html += '</div>';
    if (svc.crossSell && svc.crossSell.length) {
      html += '<div class="rec-cross"><b>Cross-sell:</b> ' +
        escapeHtml(svc.crossSell.map(function (id) { return nameById[id] || id; }).join(' · ')) + '</div>';
    }
    html += '</div>';
    return html;
  }

  function renderRecResults(inputs, top) {
    var nameById = {};
    REC.services.forEach(function (s) { nameById[s.id] = s.name; });
    var industryMeta = recFind(REC.industries, inputs.industry);
    var budgetMeta = recFind(REC.budgets, inputs.budget);
    var scopeLabels = inputs.scopes.map(function (s) {
      var m = recFind(REC.scopes, s);
      return m ? m.label : s;
    });
    var html = '<div class="rec-summary">Khách: <b>' + escapeHtml(inputs.needLabel) + '</b>' +
      (industryMeta ? ' · Ngành: ' + escapeHtml(industryMeta.label) : '') +
      ' · Phạm vi: ' + escapeHtml(scopeLabels.join(', ')) +
      (budgetMeta ? ' · Ngân sách: ' + escapeHtml(budgetMeta.label) : '') +
      (inputs.platforms.length ? ' · Nền tảng: ' + escapeHtml(inputs.platforms.map(platformLabel).join(', ')) : '') +
      '</div>';
    top.forEach(function (item, i) {
      html += recCard(item, inputs, i + 1, i === 0, nameById);
    });
    html += '<div class="rec-note">💡 Nên bắt đầu với <b>1 dịch vụ chính</b> — phần còn lại là cross-sell khi khách mở rộng.</div>';
    html += '<div class="rec-disclaimer">Giá định hướng theo <b>Service Matrix</b> · <b>Giá chính thức cần brief</b> trước khi báo giá.</div>';
    return html;
  }

  function initRecommendWidget() {
    if (!REC || !REC.services) return;
    var box = $('#rec-widget');
    if (!box) return;
    box.querySelector('.rec-form').innerHTML = buildRecForm();
    var form = $('#recForm', box);
    var needSel = $('#recNeed', box);
    var needOther = $('#recNeedOther', box);
    function syncNeedOther() {
      var other = needSel && needSel.value === '__other__';
      if (needOther) needOther.hidden = !other;
    }
    if (needSel) needSel.addEventListener('change', syncNeedOther);
    if (form) {
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        var err = $('#recError', box);
        var inputs = readRecForm(box);
        if (!inputs.ok) {
          if (err) { err.textContent = inputs.error; err.hidden = false; }
          return;
        }
        if (err) err.hidden = true;
        var out = $('#recResults', box);
        out.hidden = false;
        out.innerHTML = renderRecResults(inputs, computeRecs(inputs));
      });
      form.addEventListener('reset', function () {
        var out = $('#recResults', box);
        if (out) out.hidden = true;
        setTimeout(syncNeedOther, 0);
      });
    }
    syncNeedOther();
  }

  /* ---------- Init ---------- */
  function init() {
    bindTabs();
    initDrawer();
    initSearch();
    initScrollSpy();
    initHashRouting();
    initRecommendWidget();
    initChecklists();
    // brandLink on topbar -> brand tab
    var brandLink = $('#brandLink');
    if (brandLink) brandLink.addEventListener('click', function (e) {
      e.preventDefault();
      switchTab('brand');
      window.scrollTo(0, 0);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
