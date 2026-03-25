(function () {
  'use strict';

  // Get portal URL from script tag
  var script = document.currentScript || (function () {
    var scripts = document.getElementsByTagName('script');
    return scripts[scripts.length - 1];
  })();
  var PORTAL_URL = (script.getAttribute('data-portal-url') || '').replace(/\/$/, '');
  if (!PORTAL_URL) return;
  var PRODUCT_FILTER = script.getAttribute('data-product') || '';

  // Inject spin keyframes
  var styleEl = document.createElement('style');
  styleEl.textContent = '@keyframes sp-spin { to { transform: rotate(360deg); } } @keyframes sp-pulse { 0%,100%{opacity:1} 50%{opacity:.5} } @keyframes sp-bounce { 0%,80%,100%{transform:translateY(0)} 40%{transform:translateY(-4px)} }';
  document.head.appendChild(styleEl);

  // Color helpers
  function hexToHsl(hex) {
    var r = parseInt(hex.slice(1,3),16)/255, g = parseInt(hex.slice(3,5),16)/255, b = parseInt(hex.slice(5,7),16)/255;
    var max = Math.max(r,g,b), min = Math.min(r,g,b), h = 0, s = 0, l = (max+min)/2;
    if (max !== min) {
      var d = max - min;
      s = l > 0.5 ? d/(2-max-min) : d/(max+min);
      if (max === r) h = ((g-b)/d + (g<b?6:0))/6;
      else if (max === g) h = ((b-r)/d + 2)/6;
      else h = ((r-g)/d + 4)/6;
    }
    return [h*360, s*100, l*100];
  }
  function hslToHex(h, s, l) {
    h/=360; s/=100; l/=100;
    var r,g,b;
    if (s === 0) { r=g=b=l; }
    else {
      function hue2rgb(p,q,t) { if(t<0)t+=1; if(t>1)t-=1; if(t<1/6)return p+(q-p)*6*t; if(t<1/2)return q; if(t<2/3)return p+(q-p)*(2/3-t)*6; return p; }
      var q = l<0.5 ? l*(1+s) : l+s-l*s, p = 2*l-q;
      r=hue2rgb(p,q,h+1/3); g=hue2rgb(p,q,h); b=hue2rgb(p,q,h-1/3);
    }
    return '#'+[r,g,b].map(function(x){return ('0'+Math.round(x*255).toString(16)).slice(-2);}).join('');
  }
  function darkenColor(hex, pct) {
    var hsl = hexToHsl(hex);
    return hslToHex(hsl[0], hsl[1], Math.max(0, hsl[2] - pct));
  }
  function hexAlpha(hex, alpha) {
    var r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16);
    return 'rgba('+r+','+g+','+b+','+alpha+')';
  }

  // Colors
  var customColor = script.getAttribute('data-color') || '';
  var primary = /^#[0-9a-fA-F]{6}$/.test(customColor) ? customColor : '#2563eb';
  var isCustom = !!customColor;
  var C = {
    primary: primary,
    primaryHover:      isCustom ? darkenColor(primary, 8)  : '#1d4ed8',
    primaryDark:       isCustom ? darkenColor(primary, 15) : '#1d4ed8',
    primaryDarker:     isCustom ? darkenColor(primary, 35) : '#1e3a8a',
    primaryShadow:     hexAlpha(primary, 0.4),
    primaryFocusShadow: hexAlpha(primary, 0.15),
    bg: '#ffffff',
    surface: '#f9fafb',
    border: '#e5e7eb',
    textPrimary: '#111827',
    textSecondary: '#6b7280',
  };

  // ── Notification helpers ────────────────────────────────────────────────────
  function playNotificationSound() {
    try {
      var AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      var ctx = new AudioCtx();

      // Snapchat-style: two quick ascending tones (bloop-bloop)
      function playTone(startTime, freq) {
        var osc = ctx.createOscillator();
        var gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, startTime);
        osc.frequency.exponentialRampToValueAtTime(freq * 1.4, startTime + 0.06);
        gain.gain.setValueAtTime(0, startTime);
        gain.gain.linearRampToValueAtTime(0.45, startTime + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.12);
        osc.start(startTime);
        osc.stop(startTime + 0.12);
      }

      playTone(ctx.currentTime, 700);
      playTone(ctx.currentTime + 0.13, 950);
    } catch (e) { /* autoplay policy or unsupported */ }
  }

  function playSystemSound() {
    try {
      var AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      var ctx = new AudioCtx();
      // Soft single ping for join/system events
      var osc = ctx.createOscillator();
      var gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.35);
    } catch (e) { /* autoplay policy or unsupported */ }
  }

  function playCloseSound() {
    try {
      var AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      var ctx = new AudioCtx();
      // Two descending notes for chat close
      function playTone(startTime, freq) {
        var osc = ctx.createOscillator();
        var gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, startTime);
        gain.gain.setValueAtTime(0, startTime);
        gain.gain.linearRampToValueAtTime(0.3, startTime + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.3);
        osc.start(startTime);
        osc.stop(startTime + 0.3);
      }
      playTone(ctx.currentTime, 659);
      playTone(ctx.currentTime + 0.2, 523);
    } catch (e) { /* autoplay policy or unsupported */ }
  }

  var _blinkInterval = null;
  var _originalTitle = '';
  function startTitleBlink() {
    if (_blinkInterval) return;
    _originalTitle = document.title;
    var show = true;
    _blinkInterval = setInterval(function () {
      document.title = show ? '💬 New message!' : _originalTitle;
      show = !show;
    }, 900);
  }
  function stopTitleBlink() {
    if (_blinkInterval) { clearInterval(_blinkInterval); _blinkInterval = null; }
    if (_originalTitle) document.title = _originalTitle;
  }
  window.addEventListener('focus', function () {
    stopTitleBlink();
    if (state.step === 'active' && state.open && state.chatId && state.token) {
      markSeenAsVisitor();
    }
  });

  function markSeenAsVisitor() {
    if (!state.chatId || !state.token) return;
    fetch(PORTAL_URL + '/api/chat/' + state.chatId + '/seen', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: state.token }),
    }).catch(function () {});
  }

  // State
  var WIN_W = 360, WIN_H = 500;

  var state = {
    step: 'button', // button | offline | email | message | waiting | active | closed
    chatId: localStorage.getItem('sp_chat_id') || null,
    token: localStorage.getItem('sp_chat_token') || null,
    email: localStorage.getItem('sp_chat_email') || null,
    name: localStorage.getItem('sp_chat_name') || null,
    messages: [],
    pusher: null,
    pusherChannel: null,
    open: false,
    unread: 0,
    staffSeenAt: null, // ISO string — when staff last read messages
    activeTab: 'home',  // 'home' | 'ask'
    homeView: 'browse', // 'browse' | 'article'
    articleExpanded: false,
  };

  // ---- DOM helpers ----
  function el(tag, styles, attrs) {
    var e = document.createElement(tag);
    if (styles) Object.assign(e.style, styles);
    if (attrs) {
      for (var k in attrs) {
        if (k === 'textContent') e.textContent = attrs[k];
        else if (k === 'innerHTML') e.innerHTML = attrs[k];
        else e.setAttribute(k, attrs[k]);
      }
    }
    return e;
  }

  // ---- Root container ----
  var root = el('div', { position: 'fixed', bottom: '16px', right: '16px', zIndex: '2147483647', fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif' });
  document.body.appendChild(root);

  // ---- Floating button ----
  var floatBtn = el('button', {
    width: '52px', height: '52px', borderRadius: '50%',
    background: C.primary, border: 'none', cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    boxShadow: '0 4px 12px ' + C.primaryShadow,
    transition: 'background 0.2s', position: 'relative',
  });
  floatBtn.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>';
  floatBtn.addEventListener('mouseover', function () { floatBtn.style.background = C.primaryHover; });
  floatBtn.addEventListener('mouseout', function () { floatBtn.style.background = C.primary; });

  // Unread badge
  var badge = el('span', {
    position: 'absolute', top: '-2px', right: '-2px',
    width: '14px', height: '14px', borderRadius: '50%',
    background: '#ef4444', border: '2px solid white',
    display: 'none',
  });
  floatBtn.appendChild(badge);

  root.appendChild(floatBtn);

  // ---- Chat window ----
  var win = el('div', {
    position: 'fixed', bottom: '80px', right: '16px',
    width: '360px', height: '500px',
    background: C.bg, borderRadius: '16px',
    boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
    display: 'none', flexDirection: 'column',
    overflow: 'hidden',
    zIndex: '2147483646',
  });
  root.appendChild(win);

  // Window header
  var winHeader = el('div', {
    background: C.primary, padding: '14px 16px',
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    flexShrink: '0',
  });
  var winTitle = el('span', { color: 'white', fontWeight: '600', fontSize: '14px' }, { textContent: 'Support Chat' });
  var btnStyle = { background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.8)', padding: '4px', lineHeight: '1', borderRadius: '6px', transition: 'background 0.15s' };

  // Back button — shown when viewing an article
  var backBtn = el('button', Object.assign({}, btnStyle, { display: 'none', alignItems: 'center', gap: '4px', fontSize: '13px', fontWeight: '500' }));
  backBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>';
  backBtn.addEventListener('mouseover', function () { backBtn.style.background = 'rgba(255,255,255,0.15)'; });
  backBtn.addEventListener('mouseout',  function () { backBtn.style.background = 'none'; });
  backBtn.addEventListener('click', function () {
    state.homeView = 'browse';
    state.articleExpanded = false;
    collapseWin();
    winTitle.style.display = '';
    backBtn.style.display = 'none';
    expandBtn.style.display = 'none';
    closeWinBtn.style.display = '';
    tabBar.style.display = 'flex';
    renderHome();
  });

  // Maximize / restore button — shown only in article view
  var expandBtn = el('button', Object.assign({}, btnStyle, { display: 'none' }));
  expandBtn.title = 'Expand';
  expandBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>';
  expandBtn.addEventListener('mouseover', function () { expandBtn.style.background = 'rgba(255,255,255,0.15)'; });
  expandBtn.addEventListener('mouseout',  function () { expandBtn.style.background = 'none'; });
  expandBtn.addEventListener('click', function () {
    if (state.articleExpanded) {
      state.articleExpanded = false;
      collapseWin();
      expandBtn.title = 'Expand';
      expandBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>';
    } else {
      state.articleExpanded = true;
      expandWin();
      expandBtn.title = 'Restore';
      expandBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 14 10 14 10 20"/><polyline points="20 10 14 10 14 4"/><line x1="10" y1="14" x2="3" y2="21"/><line x1="21" y1="3" x2="14" y2="10"/></svg>';
    }
  });

  function expandWin() {
    var maxW = Math.floor(window.innerWidth * 0.9);
    var maxH = Math.floor(window.innerHeight * 0.8);
    var newW = Math.min(Math.round(WIN_W * 1.8), maxW);
    var newH = Math.min(Math.round(WIN_H * 1.5), maxH);
    win.style.width  = newW + 'px';
    win.style.height = newH + 'px';
    win.style.transition = 'width 0.25s ease, height 0.25s ease';
  }

  function collapseWin() {
    win.style.width  = WIN_W + 'px';
    win.style.height = WIN_H + 'px';
    win.style.transition = 'width 0.25s ease, height 0.25s ease';
  }

  var minimizeBtn = el('button', Object.assign({}, btnStyle, { display: 'none' }));
  minimizeBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="5" y1="12" x2="19" y2="12"/></svg>';
  minimizeBtn.title = 'Minimize';
  minimizeBtn.addEventListener('mouseover', function () { minimizeBtn.style.background = 'rgba(255,255,255,0.15)'; });
  minimizeBtn.addEventListener('mouseout',  function () { minimizeBtn.style.background = 'none'; });

  var closeWinBtn = el('button', Object.assign({}, btnStyle));
  closeWinBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
  closeWinBtn.title = 'End chat';
  closeWinBtn.addEventListener('mouseover', function () { closeWinBtn.style.background = 'rgba(255,255,255,0.15)'; });
  closeWinBtn.addEventListener('mouseout',  function () { closeWinBtn.style.background = 'none'; });

  var headerLeft = el('div', { display: 'flex', alignItems: 'center', gap: '4px' });
  headerLeft.appendChild(backBtn);
  headerLeft.appendChild(winTitle);

  var headerBtns = el('div', { display: 'flex', alignItems: 'center', gap: '2px' });
  headerBtns.appendChild(minimizeBtn);
  headerBtns.appendChild(expandBtn);
  headerBtns.appendChild(closeWinBtn);
  winHeader.appendChild(headerLeft);
  winHeader.appendChild(headerBtns);
  win.appendChild(winHeader);

  // Window body
  var winBody = el('div', { flex: '1', overflow: 'hidden', display: 'flex', flexDirection: 'column' });
  win.appendChild(winBody);

  // Tab bar
  var tabBar = el('div', {
    display: 'flex', borderTop: '1px solid ' + C.border, flexShrink: '0', background: C.bg,
  });

  function makeTabBtn(labelText, svgHtml, tabName) {
    var btn = el('button', {
      flex: '1', display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', gap: '3px', padding: '8px 0 6px', border: 'none',
      background: 'none', cursor: 'pointer', fontSize: '11px', fontWeight: '500',
      color: C.textSecondary, transition: 'color 0.15s', borderTop: '2px solid transparent',
    });
    var iconWrap = el('div', { lineHeight: '1' });
    iconWrap.innerHTML = svgHtml;
    var labelEl = el('span', {}, { textContent: labelText });
    btn.appendChild(iconWrap);
    btn.appendChild(labelEl);
    btn.addEventListener('click', function () {
      state.homeView = 'browse';
      state.articleExpanded = false;
      collapseWin();
      winTitle.style.display = '';
      backBtn.style.display = 'none';
      expandBtn.style.display = 'none';
      closeWinBtn.style.display = '';
      tabBar.style.display = 'flex';
      state.activeTab = tabName;
      updateTabBar();
      if (tabName === 'home') {
        renderHome();
      } else {
        state.unread = 0;
        badge.style.display = 'none';
        if (state.step === 'button' || state.step === 'offline') {
          checkAvailabilityAndOpen();
        } else {
          sendPresence('maximize');
          showCurrentStep();
        }
      }
    });
    return btn;
  }

  var homeTabBtn = makeTabBtn('Home',
    '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>',
    'home');
  var askTabBtn = makeTabBtn('Ask',
    '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>',
    'ask');

  tabBar.appendChild(homeTabBtn);
  tabBar.appendChild(askTabBtn);
  win.appendChild(tabBar);

  function updateTabBar() {
    [homeTabBtn, askTabBtn].forEach(function (btn) { btn.style.color = C.textSecondary; btn.style.borderTopColor = 'transparent'; });
    var active = state.activeTab === 'home' ? homeTabBtn : askTabBtn;
    active.style.color = C.primary;
    active.style.borderTopColor = C.primary;
  }

  // ---- Step renderers ----
  function clearBody() {
    while (winBody.firstChild) winBody.removeChild(winBody.firstChild);
    minimizeBtn.style.display = state.step === 'active' ? 'block' : 'none';
    // Reset header to normal when not in article view
    if (state.homeView !== 'article') {
      winTitle.style.display = '';
      backBtn.style.display = 'none';
    }
  }

  // ---- Home tab ----
  function renderHome() {
    state.homeView = 'browse';
    clearBody();
    winTitle.style.display = '';
    backBtn.style.display = 'none';

    // Hero (blue section)
    var hero = el('div', {
      background: C.primary, padding: '24px 16px 52px', position: 'relative', flexShrink: '0',
    });
    var h1 = el('h2', {
      color: 'white', fontSize: '20px', fontWeight: '700', margin: '0 0 6px', lineHeight: '1.3',
    }, { textContent: 'Here To Help' });
    var desc = el('p', {
      color: 'rgba(255,255,255,0.85)', fontSize: '13px', margin: '0', lineHeight: '1.5',
    }, { textContent: 'Looking for a quick solution? Get an instant answer at your fingertips.' });

    // Search bar — straddles blue/white boundary
    var searchWrap = el('div', {
      position: 'absolute', bottom: '-21px', left: '16px', right: '16px',
      background: 'white', borderRadius: '25px',
      boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
      display: 'flex', alignItems: 'center',
      border: '1px solid ' + C.border, overflow: 'hidden',
    });
    var searchInput = el('input', {
      flex: '1', padding: '10px 12px', border: 'none', outline: 'none',
      fontSize: '13px', background: 'transparent', color: C.textPrimary,
    });
    searchInput.setAttribute('placeholder', 'Search articles...');
    var searchBtn = el('button', {
      padding: '13px', background: C.primary, border: 'none',
      cursor: 'pointer', color: 'white', flexShrink: '0',
      display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '25px'
    });
    searchBtn.innerHTML = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>';
    searchWrap.appendChild(searchInput);
    searchWrap.appendChild(searchBtn);
    hero.appendChild(h1);
    hero.appendChild(desc);
    hero.appendChild(searchWrap);
    winBody.appendChild(hero);

    // Articles section
    var articlesSection = el('div', {
      flex: '1', overflowY: 'auto', paddingTop: '30px',
    });
    var docsHeading = el('div', {
      padding: '8px 16px 6px', fontSize: '11px', fontWeight: '600',
      color: C.textSecondary, textTransform: 'uppercase', letterSpacing: '0.06em',
    }, { textContent: 'Docs' });
    articlesSection.appendChild(docsHeading);

    var listEl = el('div', {});
    var spinnerEl = el('div', { padding: '24px 16px', display: 'flex', justifyContent: 'center' });
    spinnerEl.innerHTML = '<div style="width:22px;height:22px;border:2px solid ' + C.border + ';border-top-color:' + C.primary + ';border-radius:50%;animation:sp-spin 0.8s linear infinite"></div>';
    listEl.appendChild(spinnerEl);
    articlesSection.appendChild(listEl);
    winBody.appendChild(articlesSection);

    function loadArticles(q) {
      while (listEl.firstChild) listEl.removeChild(listEl.firstChild);
      var sp = el('div', { padding: '24px 16px', display: 'flex', justifyContent: 'center' });
      sp.innerHTML = '<div style="width:22px;height:22px;border:2px solid ' + C.border + ';border-top-color:' + C.primary + ';border-radius:50%;animation:sp-spin 0.8s linear infinite"></div>';
      listEl.appendChild(sp);
      var url = PORTAL_URL + '/api/docs/articles?limit=10' + (PRODUCT_FILTER ? '&product=' + encodeURIComponent(PRODUCT_FILTER) : '') + (q ? '&q=' + encodeURIComponent(q) : '');
      fetch(url)
        .then(function (r) { return r.json(); })
        .then(function (articles) {
          listEl.removeChild(sp);
          if (!articles || articles.length === 0) {
            var empty = el('div', { padding: '20px 16px', textAlign: 'center', color: C.textSecondary, fontSize: '13px' },
              { textContent: q ? 'No results found.' : 'No articles available.' });
            listEl.appendChild(empty);
            return;
          }
          articles.forEach(function (article) { listEl.appendChild(makeArticleCard(article)); });
        })
        .catch(function () {
          if (listEl.contains(sp)) listEl.removeChild(sp);
          var errEl = el('div', { padding: '20px 16px', textAlign: 'center', color: '#ef4444', fontSize: '13px' },
            { textContent: 'Failed to load articles.' });
          listEl.appendChild(errEl);
        });
    }

    loadArticles('');

    function doSearch() {
      var q = searchInput.value.trim();
      docsHeading.textContent = q ? 'Results' : 'Docs';
      loadArticles(q);
    }
    searchBtn.addEventListener('click', doSearch);
    searchInput.addEventListener('keydown', function (e) { if (e.key === 'Enter') doSearch(); });
  }

  function makeArticleCard(article) {
    var card = el('div', {
      display: 'flex', alignItems: 'center', padding: '11px 16px',
      borderBottom: '1px solid ' + C.border, cursor: 'pointer', gap: '10px',
      transition: 'background 0.15s',
    });
    var cardContent = el('div', { flex: '1', minWidth: '0' });
    var titleEl = el('div', {
      fontSize: '13px', fontWeight: '600', color: C.textPrimary, marginBottom: '3px',
      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
    }, { textContent: article.name });

    // Strip HTML for preview
    var tmpDiv = document.createElement('div');
    tmpDiv.innerHTML = article.content || '';
    var plainText = (tmpDiv.textContent || tmpDiv.innerText || '').replace(/\s+/g, ' ').trim();
    var previewEl = el('div', { fontSize: '12px', color: C.textSecondary, lineHeight: '1.4' });
    previewEl.textContent = plainText.length > 120 ? plainText.slice(0, 120) + '…' : plainText;
    previewEl.style.cssText += ';display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;';

    cardContent.appendChild(titleEl);
    cardContent.appendChild(previewEl);

    var arrow = el('div', { flexShrink: '0', color: C.textSecondary, lineHeight: '1' });
    arrow.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>';

    card.appendChild(cardContent);
    card.appendChild(arrow);
    card.addEventListener('mouseover', function () { card.style.background = C.surface; });
    card.addEventListener('mouseout',  function () { card.style.background = ''; });
    card.addEventListener('click', function () { openArticle(article.id); });
    return card;
  }

  function openArticle(id) {
    // Show spinner while loading
    while (winBody.firstChild) winBody.removeChild(winBody.firstChild);
    winTitle.style.display = 'none';
    backBtn.style.display = 'flex';
    expandBtn.style.display = 'none'; // hide until article loaded
    var spinWrap = el('div', { flex: '1', display: 'flex', alignItems: 'center', justifyContent: 'center' });
    spinWrap.innerHTML = '<div style="width:32px;height:32px;border:3px solid ' + C.border + ';border-top-color:' + C.primary + ';border-radius:50%;animation:sp-spin 0.8s linear infinite"></div>';
    winBody.appendChild(spinWrap);

    fetch(PORTAL_URL + '/api/docs/articles/' + encodeURIComponent(id))
      .then(function (r) { return r.json(); })
      .then(function (article) { renderArticle(article); })
      .catch(function () {
        if (winBody.contains(spinWrap)) winBody.removeChild(spinWrap);
        var errEl = el('div', { flex: '1', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', color: '#ef4444', fontSize: '13px', textAlign: 'center' },
          { textContent: 'Failed to load article.' });
        winBody.appendChild(errEl);
      });
  }

  function renderArticle(article) {
    while (winBody.firstChild) winBody.removeChild(winBody.firstChild);
    state.homeView = 'article';
    winTitle.style.display = 'none';
    backBtn.style.display = 'flex';
    closeWinBtn.style.display = 'none';
    tabBar.style.display = 'none';
    expandBtn.style.display = 'flex';
    // Reset expand icon to collapsed state
    expandBtn.title = 'Expand';
    expandBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>';

    var container = el('div', { flex: '1', overflowY: 'auto', padding: '16px 18px 24px' });
    var titleEl = el('h2', {
      fontSize: '17px', fontWeight: '700', color: C.textPrimary, margin: '0 0 14px', lineHeight: '1.35',
    }, { textContent: article.name });
    var contentEl = el('div', { fontSize: '14px', lineHeight: '1.75', color: C.textPrimary });
    contentEl.innerHTML = article.content || '';

    // Basic content styles via a <style> scoped to the content
    var styleTag = document.createElement('style');
    styleTag.textContent = '.sp-article-content p{margin:0 0 10px} .sp-article-content h1,.sp-article-content h2,.sp-article-content h3{margin:16px 0 6px;font-weight:600} .sp-article-content ul,.sp-article-content ol{padding-left:20px;margin:0 0 10px} .sp-article-content pre{background:#f3f4f6;padding:10px;border-radius:6px;overflow-x:auto;font-size:12px} .sp-article-content code{background:#f3f4f6;padding:1px 4px;border-radius:3px;font-size:12px} .sp-article-content figcaption{font-size:90%;color:#9ca3af;text-align:center;margin-top:4px}';
    contentEl.classList.add('sp-article-content');

    container.appendChild(titleEl);
    container.appendChild(contentEl);

    // ── Feedback section ──
    var REACTIONS = [
      { key: 'happy',
        svg: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><circle cx="9" cy="9.5" r="1.5" fill="currentColor" stroke="none"/><circle cx="15" cy="9.5" r="1.5" fill="currentColor" stroke="none"/></svg>' },
      { key: 'normal',
        svg: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="8" y1="15" x2="16" y2="15"/><circle cx="9" cy="9.5" r="1.5" fill="currentColor" stroke="none"/><circle cx="15" cy="9.5" r="1.5" fill="currentColor" stroke="none"/></svg>' },
      { key: 'sad',
        svg: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M8 17s1.5-2 4-2 4 2 4 2"/><circle cx="9" cy="9.5" r="1.5" fill="currentColor" stroke="none"/><circle cx="15" cy="9.5" r="1.5" fill="currentColor" stroke="none"/></svg>' },
    ];

    var feedbackState = { mine: null, loading: false };
    var reactionBtns = {};

    function renderReactionBtns() {
      REACTIONS.forEach(function (r) {
        var btn = reactionBtns[r.key];
        var active = feedbackState.mine === r.key;
        btn.style.background = active ? C.primaryDarker : C.primaryDark;
        btn.style.opacity    = feedbackState.loading ? '0.6' : '1';
      });
    }

    function doVote(reaction) {
      if (feedbackState.loading) return;
      feedbackState.loading = true;
      renderReactionBtns();
      fetch(PORTAL_URL + '/api/docs/articles/' + encodeURIComponent(article.id) + '/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reaction: reaction }),
        credentials: 'include',
      })
        .then(function (r) { return r.json(); })
        .then(function (data) {
          feedbackState.mine = data.mine;
          feedbackState.loading = false;
          renderReactionBtns();
        })
        .catch(function () { feedbackState.loading = false; renderReactionBtns(); });
    }

    var feedbackSection = el('div', {
      marginTop: '20px', background: C.primary, borderRadius: '12px',
      padding: '12px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px',
    });
    var feedbackLabel = el('p', {
      fontSize: '13px', fontWeight: '500', color: 'white', margin: '0', flexShrink: '0',
    }, { textContent: 'How did you feel?' });

    var feedbackRow = el('div', { display: 'flex', gap: '8px', flexShrink: '0' });

    REACTIONS.forEach(function (r) {
      var btn = el('button', {
        width: '36px', height: '36px', borderRadius: '50%',
        background: C.primaryDark, border: 'none', cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: 'white', transition: 'background 0.15s',
        flexShrink: '0',
      });
      btn.innerHTML = r.svg;
      btn.addEventListener('click', function () { doVote(r.key); });
      reactionBtns[r.key] = btn;
      feedbackRow.appendChild(btn);
    });

    feedbackSection.appendChild(feedbackLabel);
    feedbackSection.appendChild(feedbackRow);
    container.appendChild(feedbackSection);

    // ── Prev / Next navigation ──
    if (article.prev || article.next) {
      var navRow = el('div', { display: 'flex', gap: '8px', marginTop: '12px' });

      if (article.prev) {
        var prevId = article.prev.id;
        var prevName = article.prev.name;
        var prevBtn = el('button', {
          flex: '1', padding: '10px 12px', borderRadius: '10px',
          border: '1px solid ' + C.border, background: 'white',
          cursor: 'pointer', textAlign: 'left', transition: 'border-color 0.15s, background 0.15s',
          minWidth: '0',
        });
        var prevLabel = el('div', { fontSize: '11px', color: C.textSecondary, marginBottom: '3px', display: 'flex', alignItems: 'center', gap: '3px' });
        prevLabel.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg> Previous';
        var prevTitle = el('div', { fontSize: '12px', fontWeight: '600', color: C.textPrimary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' });
        prevTitle.textContent = prevName;
        prevBtn.appendChild(prevLabel);
        prevBtn.appendChild(prevTitle);
        prevBtn.addEventListener('mouseover', function () { prevBtn.style.borderColor = C.primary; prevBtn.style.background = '#f0f7ff'; });
        prevBtn.addEventListener('mouseout',  function () { prevBtn.style.borderColor = C.border;  prevBtn.style.background = 'white'; });
        prevBtn.addEventListener('click', function () { openArticle(prevId); });
        navRow.appendChild(prevBtn);
      }

      if (article.next) {
        var nextId = article.next.id;
        var nextName = article.next.name;
        var nextBtn = el('button', {
          flex: '1', padding: '10px 12px', borderRadius: '10px',
          border: '1px solid ' + C.border, background: 'white',
          cursor: 'pointer', textAlign: 'right', transition: 'border-color 0.15s, background 0.15s',
          minWidth: '0',
        });
        var nextLabel = el('div', { fontSize: '11px', color: C.textSecondary, marginBottom: '3px', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '3px' });
        nextLabel.innerHTML = 'Next <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>';
        var nextTitle = el('div', { fontSize: '12px', fontWeight: '600', color: C.textPrimary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' });
        nextTitle.textContent = nextName;
        nextBtn.appendChild(nextLabel);
        nextBtn.appendChild(nextTitle);
        nextBtn.addEventListener('mouseover', function () { nextBtn.style.borderColor = C.primary; nextBtn.style.background = '#f0f7ff'; });
        nextBtn.addEventListener('mouseout',  function () { nextBtn.style.borderColor = C.border;  nextBtn.style.background = 'white'; });
        nextBtn.addEventListener('click', function () { openArticle(nextId); });
        navRow.appendChild(nextBtn);
      }

      container.appendChild(navRow);
    }

    // Fetch current vote from server (cookie-backed)
    fetch(PORTAL_URL + '/api/docs/articles/' + encodeURIComponent(article.id) + '/feedback', {
      credentials: 'include',
    })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        feedbackState.mine = data.mine;
        renderReactionBtns();
      })
      .catch(function () {});

    winBody.appendChild(container);
    if (!document.querySelector('style[data-sp-article]')) {
      styleTag.setAttribute('data-sp-article', '1');
      document.head.appendChild(styleTag);
    }
  }

  // ---- Offline state ----
  function renderOffline() {
    clearBody();
    var wrap = el('div', {
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', flex: '1', padding: '32px 24px', gap: '20px', textAlign: 'center',
    });

    var iconWrap = el('div', {
      width: '56px', height: '56px', borderRadius: '50%',
      background: '#f3f4f6', display: 'flex', alignItems: 'center',
      justifyContent: 'center', margin: '0 auto', flexShrink: '0',
    });
    iconWrap.innerHTML = '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/><line x1="9" y1="10" x2="9" y2="10" stroke-width="3" stroke-linecap="round"/><line x1="12" y1="10" x2="12" y2="10" stroke-width="3" stroke-linecap="round"/><line x1="15" y1="10" x2="15" y2="10" stroke-width="3" stroke-linecap="round"/></svg>';

    var textWrap = el('div', { display: 'flex', flexDirection: 'column', gap: '8px' });

    var heading = el('p', {
      margin: '0', fontSize: '15px', fontWeight: '600', color: C.textPrimary,
    }, { textContent: "We aren't available right now" });

    var sub = el('p', {
      margin: '0', fontSize: '13px', color: C.textSecondary, lineHeight: '1.6',
    }, { textContent: 'Sorry, our support team is currently offline. Please open a support ticket from the link below and we’ll get back to you.' });

    textWrap.appendChild(heading);
    textWrap.appendChild(sub);

    var btn = el('a', {
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
      padding: '11px 22px', borderRadius: '8px', background: C.primary, color: '#fff',
      fontSize: '13px', fontWeight: '600', textDecoration: 'none',
      cursor: 'pointer', transition: 'background 0.2s', width: '100%', boxSizing: 'border-box',
    });
    btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg><span>Open a Support Ticket</span>';
    btn.href = PORTAL_URL + '/tickets/new';
    btn.target = '_blank';
    btn.rel = 'noopener noreferrer';
    btn.addEventListener('mouseover', function () { btn.style.background = C.primaryHover; });
    btn.addEventListener('mouseout',  function () { btn.style.background = C.primary; });

    wrap.appendChild(iconWrap);
    wrap.appendChild(textWrap);
    wrap.appendChild(btn);
    winBody.appendChild(wrap);
  }

  function renderEmail() {
    clearBody();
    var wrap = el('div', {
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', flex: '1', padding: '32px 24px', gap: '8px',
    });

    var heading = el('div', { fontSize: '22px', marginBottom: '4px' }, { textContent: '👋 Hi there!' });
    var sub = el('p', { fontSize: '13px', color: C.textSecondary, textAlign: 'center', margin: '0 0 16px' }, { textContent: 'Enter your details to start chatting' });

    var nameInput = el('input', {
      width: '100%', padding: '10px 12px', border: '1px solid ' + C.border,
      borderRadius: '10px', fontSize: '14px', boxSizing: 'border-box',
      outline: 'none', color: C.textPrimary,
    });
    nameInput.setAttribute('type', 'text');
    nameInput.setAttribute('placeholder', 'Your name');
    if (state.name) nameInput.value = state.name;

    var emailInput = el('input', {
      width: '100%', padding: '10px 12px', border: '1px solid ' + C.border,
      borderRadius: '10px', fontSize: '14px', boxSizing: 'border-box',
      outline: 'none', color: C.textPrimary, marginTop: '8px',
    });
    emailInput.setAttribute('type', 'email');
    emailInput.setAttribute('placeholder', 'your@email.com');
    if (state.email) emailInput.value = state.email;

    var startBtn = el('button', {
      width: '100%', padding: '10px', background: C.primary,
      color: 'white', border: 'none', borderRadius: '10px',
      fontSize: '14px', fontWeight: '600', cursor: 'pointer',
      marginTop: '8px', transition: 'background 0.2s',
    }, { textContent: 'Start Chat' });
    startBtn.addEventListener('mouseover', function () { startBtn.style.background = C.primaryHover; });
    startBtn.addEventListener('mouseout', function () { startBtn.style.background = C.primary; });

    var errMsg = el('p', { color: '#ef4444', fontSize: '12px', margin: '4px 0 0', display: 'none' });

    function proceed() {
      var n = nameInput.value.trim();
      if (!n) {
        errMsg.style.display = 'block';
        errMsg.textContent = 'Please enter your name.';
        nameInput.focus();
        return;
      }
      var v = emailInput.value.trim();
      if (!v || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) {
        errMsg.style.display = 'block';
        errMsg.textContent = 'Please enter a valid email.';
        emailInput.focus();
        return;
      }
      errMsg.style.display = 'none';
      state.name = n;
      state.email = v;
      renderMessage();
    }

    startBtn.addEventListener('click', proceed);
    nameInput.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); emailInput.focus(); } });
    emailInput.addEventListener('keydown', function (e) { if (e.key === 'Enter') proceed(); });

    // Focus ring effects
    [nameInput, emailInput].forEach(function (inp) {
      inp.addEventListener('focus', function () { inp.style.borderColor = C.primary; inp.style.boxShadow = '0 0 0 3px ' + C.primaryFocusShadow; });
      inp.addEventListener('blur', function () { inp.style.borderColor = C.border; inp.style.boxShadow = 'none'; });
    });

    wrap.appendChild(heading);
    wrap.appendChild(sub);
    wrap.appendChild(nameInput);
    wrap.appendChild(emailInput);
    wrap.appendChild(errMsg);
    wrap.appendChild(startBtn);
    winBody.appendChild(wrap);
    setTimeout(function () { nameInput.focus(); }, 50);
  }

  function renderMessage() {
    clearBody();
    var wrap = el('div', {
      display: 'flex', flexDirection: 'column',
      flex: '1', padding: '20px 20px 16px', gap: '12px',
    });

    var emailTag = el('div', {
      fontSize: '12px', color: C.textSecondary,
      background: C.surface, border: '1px solid ' + C.border,
      borderRadius: '8px', padding: '6px 10px', alignSelf: 'flex-start',
    }, { textContent: (state.name ? state.name + ' · ' : '') + (state.email || '') });

    var label = el('label', { fontSize: '13px', fontWeight: '600', color: C.textPrimary }, { textContent: 'What can we help you with?' });

    var textarea = el('textarea', {
      width: '100%', flex: '1', padding: '10px 12px',
      border: '1px solid ' + C.border, borderRadius: '10px',
      fontSize: '14px', boxSizing: 'border-box', resize: 'none',
      outline: 'none', color: C.textPrimary, fontFamily: 'inherit',
      minHeight: '90px',
    });
    textarea.setAttribute('placeholder', 'Describe your issue...');
    textarea.setAttribute('rows', '4');

    var sendBtn = el('button', {
      padding: '10px', background: C.primary,
      color: 'white', border: 'none', borderRadius: '10px',
      fontSize: '14px', fontWeight: '600', cursor: 'pointer',
      transition: 'background 0.2s',
    }, { textContent: 'Send Message' });
    sendBtn.addEventListener('mouseover', function () { sendBtn.style.background = C.primaryHover; });
    sendBtn.addEventListener('mouseout', function () { sendBtn.style.background = C.primary; });

    var errMsg = el('p', { color: '#ef4444', fontSize: '12px', margin: '0', display: 'none' });

    sendBtn.addEventListener('click', function () {
      var msg = textarea.value.trim();
      if (!msg) {
        errMsg.style.display = 'block';
        errMsg.textContent = 'Please enter a message.';
        return;
      }
      errMsg.style.display = 'none';
      sendBtn.disabled = true;
      sendBtn.textContent = 'Sending...';
      startChat(state.email, state.name || state.email, msg, function (err) {
        if (err) {
          sendBtn.disabled = false;
          sendBtn.textContent = 'Send Message';
          errMsg.style.display = 'block';
          errMsg.textContent = err;
        }
      });
    });

    wrap.appendChild(emailTag);
    wrap.appendChild(label);
    wrap.appendChild(textarea);
    wrap.appendChild(errMsg);
    wrap.appendChild(sendBtn);
    winBody.appendChild(wrap);
    setTimeout(function () { textarea.focus(); }, 50);
  }

  function renderWaiting() {
    clearBody();
    var wrap = el('div', {
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', flex: '1', padding: '32px 24px', gap: '16px',
    });

    var spinner = el('div', {
      width: '40px', height: '40px', border: '3px solid ' + C.border,
      borderTopColor: C.primary, borderRadius: '50%',
      animation: 'sp-spin 0.8s linear infinite',
    });

    var text = el('p', { fontSize: '15px', fontWeight: '600', color: C.textPrimary, margin: '0', textAlign: 'center' }, { textContent: 'Waiting for a support agent...' });
    var sub = el('p', { fontSize: '13px', color: C.textSecondary, margin: '0', textAlign: 'center' }, { textContent: "We'll be right with you." });

    wrap.appendChild(spinner);
    wrap.appendChild(text);
    wrap.appendChild(sub);
    winBody.appendChild(wrap);
  }

  // Single check SVG path (delivered)
  var singleCheckPath = 'M20 6 9 17 4 12';
  // Double check SVG paths (seen)
  var doubleCheckPath1 = 'M18 6 7 17 2 12';
  var doubleCheckPath2 = 'M22 6 13 15';

  function updateCheckIcon(svgEl, msgCreatedAt, seenAt) {
    // Clear existing paths
    while (svgEl.firstChild) svgEl.removeChild(svgEl.firstChild);
    var seen = seenAt && msgCreatedAt <= seenAt;
    svgEl.setAttribute('stroke', seen ? '#3b82f6' : '#9ca3af');
    var paths = seen ? [doubleCheckPath1, doubleCheckPath2] : [singleCheckPath];
    paths.forEach(function (d) {
      var p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      p.setAttribute('d', d);
      svgEl.appendChild(p);
    });
  }

  function renderActive() {
    clearBody();
    state.activeTab = 'ask';
    state.unread = 0;
    badge.style.display = 'none';
    state.displayedIds = null; // reset so messages re-render into the new DOM

    // Messages list
    var msgList = el('div', {
      flex: '1', overflowY: 'auto', padding: '12px 16px 30px',
      display: 'flex', flexDirection: 'column', gap: '10px',
    });

    function appendMessage(msg) {
      if (!state.displayedIds) state.displayedIds = new Set();
      if (state.displayedIds.has(msg.id)) return;
      state.displayedIds.add(msg.id);

      // System message — centered pill
      if (msg.sender === 'system') {
        var sysRow = el('div', { display: 'flex', justifyContent: 'center', margin: '4px 0' });
        var sysPill = el('span', {
          fontSize: '11px', color: '#9ca3af',
          background: '#f9fafb', border: '1px solid #e5e7eb',
          borderRadius: '999px', padding: '4px 12px',
        }, { textContent: msg.content });
        sysRow.appendChild(sysPill);
        msgList.appendChild(sysRow);
        return sysRow;
      }

      var isVisitor = msg.sender === 'visitor';
      var row = el('div', {
        display: 'flex', flexDirection: 'column',
        alignItems: isVisitor ? 'flex-end' : 'flex-start',
        gap: '2px',
      });

      var timeStr = msg.senderName + ' · ' + new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      var meta = el('span', { fontSize: '11px', color: C.textSecondary, display: 'flex', alignItems: 'center', gap: '3px' });
      meta.appendChild(document.createTextNode(timeStr));

      // Check icon for visitor messages
      var checkIconEl = null;
      if (isVisitor && !msg.id.startsWith('temp-')) {
        checkIconEl = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        checkIconEl.setAttribute('width', '13');
        checkIconEl.setAttribute('height', '13');
        checkIconEl.setAttribute('viewBox', '0 0 24 24');
        checkIconEl.setAttribute('fill', 'none');
        checkIconEl.setAttribute('stroke-width', '2.5');
        checkIconEl.setAttribute('stroke-linecap', 'round');
        checkIconEl.setAttribute('stroke-linejoin', 'round');
        checkIconEl.dataset.checkFor = msg.createdAt;
        updateCheckIcon(checkIconEl, msg.createdAt, state.staffSeenAt);
        meta.appendChild(checkIconEl);
      }

      var bubble = el('div', {
        padding: '8px 12px', borderRadius: '14px', fontSize: '15px',
        maxWidth: '75%', lineHeight: '1.5', wordBreak: 'break-word',
        whiteSpace: 'pre-wrap',
        background: isVisitor ? C.primary : C.surface,
        color: isVisitor ? '#fff' : C.textPrimary,
        borderBottomRightRadius: isVisitor ? '4px' : '14px',
        borderBottomLeftRadius: isVisitor ? '14px' : '4px',
        border: isVisitor ? 'none' : '1px solid ' + C.border,
      }, { textContent: msg.content });

      row.appendChild(meta);
      row.appendChild(bubble);
      msgList.appendChild(row);
      return row;
    }

    function markFailed(rowEl) {
      if (!rowEl) return;
      // Style the bubble red
      var bubble = rowEl.querySelector('[data-bubble]');
      if (bubble) {
        bubble.style.background = '#fef2f2';
        bubble.style.color = '#b91c1c';
        bubble.style.border = '1px solid #fecaca';
      }
      // Add "Not delivered" label
      var errLabel = document.createElement('span');
      errLabel.textContent = 'Not delivered';
      errLabel.style.cssText = 'font-size:11px;color:#ef4444;margin-top:2px;';
      rowEl.appendChild(errLabel);
    }

    state.messages.forEach(appendMessage);

    // Input area
    var inputRow = el('div', {
      display: 'flex', padding: '12px 12px 14px',
      borderTop: '1px solid ' + C.border, background: C.bg, flexShrink: '0',
    });

    var inputWrapper = el('div', {
      display: 'flex', flex: '1', alignItems: 'flex-end',
      border: '1px solid ' + C.border, borderRadius: '10px',
      overflow: 'hidden', background: C.bg,
    });

    var textInput = el('textarea', {
      flex: '1', padding: '8px 10px', border: 'none',
      fontSize: '15px', resize: 'none',
      fontFamily: 'inherit', outline: 'none', color: C.textPrimary,
      lineHeight: '1.4', background: 'transparent',
      maxHeight: '200px', overflowY: 'auto', boxSizing: 'border-box',
    });
    textInput.setAttribute('placeholder', 'Type a message...');
    textInput.setAttribute('rows', '1');

    var sendBtn = el('button', {
      background: 'none', border: 'none', cursor: 'pointer',
      padding: '0 10px', display: 'flex', alignItems: 'center',
      justifyContent: 'center', flexShrink: '0', alignSelf: 'stretch',
      opacity: '0.6', transition: 'opacity 0.2s',
    });
    sendBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="' + C.primary + '" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>';

    function doSend() {
      var content = textInput.value.trim();
      if (!content) return;
      sendBtn.disabled = true;
      sendBtn.style.opacity = '0.6';
      textInput.value = '';
      textInput.style.height = 'auto';
      textInput.style.overflowY = 'hidden';

      var tempId = 'temp-' + Date.now();
      var tempMsg = {
        id: tempId,
        chatId: state.chatId,
        sender: 'visitor',
        senderEmail: state.email,
        senderName: state.name || state.email,
        content: content,
        createdAt: new Date().toISOString(),
      };
      state.messages.push(tempMsg);
      var tempEl = appendMessage(tempMsg);
      if (tempEl) tempEl.style.opacity = '0.6';
      msgList.scrollTop = msgList.scrollHeight;

      fetch(PORTAL_URL + '/api/chat/' + state.chatId + '/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: content, token: state.token }),
      }).then(function (r) { return r.json(); }).then(function (data) {
        if (data.message) {
          var pusherAlreadyAdded = state.messages.some(function (m) { return m.id === data.message.id; });
          if (pusherAlreadyAdded) {
            // Pusher was faster — remove temp from state and DOM
            state.messages = state.messages.filter(function (m) { return m.id !== tempId; });
            if (tempEl && tempEl.parentNode) tempEl.parentNode.removeChild(tempEl);
            if (state.displayedIds) state.displayedIds.delete(tempId);
          } else {
            // Normal path — swap temp with real message
            state.messages = state.messages.map(function (m) { return m.id === tempId ? data.message : m; });
            if (state.displayedIds) {
              state.displayedIds.delete(tempId);
              state.displayedIds.add(data.message.id);
            }
            if (tempEl) {
              tempEl.style.opacity = '1';
              tempEl.dataset.msgId = data.message.id;
            }
          }
        } else {
          markFailed(tempEl);
          state.messages = state.messages.map(function (m) { return m.id === tempId ? Object.assign({}, m, { failed: true }) : m; });
        }
      }).catch(function () {
        markFailed(tempEl);
        state.messages = state.messages.map(function (m) { return m.id === tempId ? Object.assign({}, m, { failed: true }) : m; });
      }).finally(function () {
        sendBtn.disabled = false;
      });
    }

    // Typing indicator row (above input)
    var typingRow = el('div', {
      padding: '0 16px 6px', display: 'none', alignItems: 'center', gap: '6px', flexShrink: '0',
    });
    var typingText = el('span', { fontSize: '11px', color: C.textSecondary });
    var typingDots = el('span', { display: 'inline-flex', gap: '2px', alignItems: 'center' });
    for (var di = 0; di < 3; di++) {
      var dot = el('span', {
        width: '4px', height: '4px', borderRadius: '50%', background: C.textSecondary,
        display: 'inline-block',
        animation: 'sp-bounce 1.2s ease-in-out ' + (di * 0.2) + 's infinite',
      });
      typingDots.appendChild(dot);
    }
    typingRow.appendChild(typingText);
    typingRow.appendChild(typingDots);

    var _typingClearTimer = null;
    function showTyping(name, customText) {
      typingText.textContent = customText || (name + ' is typing');
      typingRow.style.display = 'flex';
      if (_typingClearTimer) clearTimeout(_typingClearTimer);
      _typingClearTimer = setTimeout(function () {
        typingRow.style.display = 'none';
      }, 3000);
    }
    function hideTyping() {
      typingRow.style.display = 'none';
      if (_typingClearTimer) { clearTimeout(_typingClearTimer); _typingClearTimer = null; }
    }

    // Send typing event (throttled to once per 2s)
    var _lastTypingSent = 0;
    function sendTypingEvent() {
      var now = Date.now();
      if (now - _lastTypingSent < 2000) return;
      _lastTypingSent = now;
      fetch(PORTAL_URL + '/api/chat/' + state.chatId + '/typing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: state.token }),
      }).catch(function () {});
    }

    sendBtn.addEventListener('click', doSend);
    function autoGrow() {
      textInput.style.height = 'auto';
      textInput.style.height = Math.min(textInput.scrollHeight, 200) + 'px';
      textInput.style.overflowY = textInput.scrollHeight > 200 ? 'auto' : 'hidden';
    }
    textInput.addEventListener('input', function () {
      autoGrow();
      sendBtn.style.opacity = textInput.value.trim() ? '1' : '0.6';
      sendTypingEvent();
    });
    textInput.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); doSend(); }
    });

    inputWrapper.appendChild(textInput);
    inputWrapper.appendChild(sendBtn);
    inputRow.appendChild(inputWrapper);
    winBody.appendChild(msgList);
    winBody.appendChild(typingRow);
    winBody.appendChild(inputRow);

    msgList.scrollTop = msgList.scrollHeight;

    // Expose msgList, appendMessage, showTyping, updateSeenIcons for Pusher
    state._msgList = msgList;
    state._appendMessage = appendMessage;
    state._showTyping = showTyping;
    state._hideTyping = hideTyping;
    state._updateSeenIcons = function (seenAt) {
      var icons = msgList.querySelectorAll('[data-check-for]');
      icons.forEach(function (icon) {
        updateCheckIcon(icon, icon.dataset.checkFor, seenAt);
      });
    };

    // Mark seen on open
    markSeenAsVisitor();

    setTimeout(function () { textInput.focus(); }, 50);
  }

  function renderEnding() {
    clearBody();
    var wrap = el('div', {
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', flex: '1', padding: '32px 24px', gap: '16px', textAlign: 'center',
    });

    var iconWrap = el('div', { fontSize: '28px' }, { textContent: '⚠️' });
    var heading = el('p', { margin: '0', fontSize: '15px', fontWeight: '600', color: C.textPrimary }, { textContent: 'End this chat?' });
    var sub = el('p', { margin: '0', fontSize: '13px', color: C.textSecondary, lineHeight: '1.5' }, { textContent: 'Your conversation will be closed. You can request a transcript afterwards.' });

    var endBtn = el('button', {
      padding: '10px 24px', background: '#dc2626', color: 'white',
      border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: '600',
      cursor: 'pointer', width: '100%', maxWidth: '200px', transition: 'background 0.2s',
    }, { textContent: 'End Chat' });
    endBtn.addEventListener('mouseover', function () { endBtn.style.background = '#b91c1c'; });
    endBtn.addEventListener('mouseout',  function () { endBtn.style.background = '#dc2626'; });
    endBtn.addEventListener('click', function () {
      endBtn.disabled = true;
      endBtn.textContent = 'Ending…';
      fetch(PORTAL_URL + '/api/chat/' + state.chatId + '/visitor-close', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: state.token }),
      }).then(function () {
        state.step = 'closed';
        unsubscribeChat();
        renderClosed();
      }).catch(function () {
        // Still transition locally even if request fails
        state.step = 'closed';
        unsubscribeChat();
        renderClosed();
      });
    });

    var cancelBtn = el('button', {
      padding: '10px 24px', background: 'none', color: C.textSecondary,
      border: '1px solid ' + C.border, borderRadius: '8px', fontSize: '13px',
      fontWeight: '500', cursor: 'pointer', width: '100%', maxWidth: '200px',
      transition: 'background 0.2s',
    }, { textContent: 'Cancel' });
    cancelBtn.addEventListener('mouseover', function () { cancelBtn.style.background = C.surface; });
    cancelBtn.addEventListener('mouseout',  function () { cancelBtn.style.background = 'none'; });
    cancelBtn.addEventListener('click', function () {
      state.step = 'active';
      renderActive();
    });

    var btnRow = el('div', { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', width: '100%' });
    btnRow.appendChild(endBtn);
    btnRow.appendChild(cancelBtn);

    wrap.appendChild(iconWrap);
    wrap.appendChild(heading);
    wrap.appendChild(sub);
    wrap.appendChild(btnRow);
    winBody.appendChild(wrap);
  }

  function renderClosed() {
    unsubscribeChat();
    clearBody();
    clearStorage();

    var wrap = el('div', {
      display: 'flex', flexDirection: 'column', flex: '1',
      padding: '24px 20px', gap: '0', overflowY: 'auto',
    });

    // ── Top: ended message ──
    var topSection = el('div', {
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      padding: '20px 0 20px', gap: '8px', textAlign: 'center',
    });
    var icon = el('div', { fontSize: '28px' }, { textContent: '✅' });
    var text = el('p', { fontSize: '15px', fontWeight: '600', color: C.textPrimary, margin: '0' }, { textContent: 'Chat ended' });
    var sub = el('p', { fontSize: '13px', color: C.textSecondary, margin: '0', lineHeight: '1.5' }, { textContent: 'Thank you for reaching out.' });
    topSection.appendChild(icon);
    topSection.appendChild(text);
    topSection.appendChild(sub);
    wrap.appendChild(topSection);

    // ── Divider ──
    var divider = el('div', { borderTop: '1px solid ' + C.border, margin: '4px 0' });
    wrap.appendChild(divider);

    // ── History request section ──
    var histSection = el('div', { display: 'flex', flexDirection: 'column', gap: '10px', padding: '16px 0' });

    var histHeading = el('p', { margin: '0', fontSize: '13px', fontWeight: '600', color: C.textPrimary }, { textContent: 'Want a copy of this conversation?' });

    var emailInput = el('input', {
      padding: '9px 12px', border: '1px solid ' + C.border, borderRadius: '8px',
      fontSize: '13px', color: C.textPrimary, background: C.bg, outline: 'none',
      width: '100%', boxSizing: 'border-box',
    });
    emailInput.type = 'email';
    emailInput.value = state.email || '';
    emailInput.placeholder = 'your@email.com';
    emailInput.addEventListener('focus', function () { emailInput.style.borderColor = C.primary; });
    emailInput.addEventListener('blur',  function () { emailInput.style.borderColor = C.border; });

    var sendHistBtn = el('button', {
      padding: '9px 16px', background: C.primary, color: 'white',
      border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: '600',
      cursor: 'pointer', transition: 'background 0.2s',
    }, { textContent: 'Send Chat History' });
    sendHistBtn.addEventListener('mouseover', function () { sendHistBtn.style.background = C.primaryHover; });
    sendHistBtn.addEventListener('mouseout',  function () { sendHistBtn.style.background = C.primary; });

    var histMsg = el('p', { margin: '0', fontSize: '12px', minHeight: '16px', color: 'transparent' }, { textContent: '.' });

    sendHistBtn.addEventListener('click', function () {
      var emailVal = emailInput.value.trim();
      if (!emailVal || !state.chatId || !state.token) return;
      sendHistBtn.disabled = true;
      sendHistBtn.textContent = 'Sending…';
      histMsg.style.color = C.textSecondary;
      histMsg.textContent = '';
      fetch(PORTAL_URL + '/api/chat/' + state.chatId + '/send-history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailVal, token: state.token }),
      }).then(function (r) { return r.json(); }).then(function (data) {
        if (data.success) {
          // Replace the whole history form with a one-time success message
          while (histSection.firstChild) histSection.removeChild(histSection.firstChild);
          var successWrap = el('div', {
            display: 'flex', alignItems: 'center', gap: '10px',
            padding: '12px 14px', background: '#f0fdf4',
            border: '1px solid #bbf7d0', borderRadius: '8px',
          });
          successWrap.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>';
          var successText = el('span', { fontSize: '13px', color: '#15803d', lineHeight: '1.4' });
          successText.textContent = 'Transcript sent to ' + emailVal;
          successWrap.appendChild(successText);
          histSection.appendChild(successWrap);
        } else {
          sendHistBtn.disabled = false;
          sendHistBtn.textContent = 'Send Chat History';
          histMsg.style.color = '#dc2626';
          histMsg.textContent = data.error || 'Failed to send. Try again.';
        }
      }).catch(function () {
        sendHistBtn.disabled = false;
        sendHistBtn.textContent = 'Send Chat History';
        histMsg.style.color = '#dc2626';
        histMsg.textContent = 'Network error. Try again.';
      });
    });

    histSection.appendChild(histHeading);
    histSection.appendChild(emailInput);
    histSection.appendChild(sendHistBtn);
    histSection.appendChild(histMsg);
    wrap.appendChild(histSection);

    // ── Divider ──
    var divider2 = el('div', { borderTop: '1px solid ' + C.border, margin: '4px 0' });
    wrap.appendChild(divider2);

    // ── New chat button ──
    var newBtn = el('button', {
      padding: '10px 20px', background: 'none', color: C.textSecondary,
      border: '1px solid ' + C.border, borderRadius: '8px', fontSize: '13px',
      fontWeight: '500', cursor: 'pointer', marginTop: '12px', transition: 'background 0.2s',
    }, { textContent: 'Start a new chat' });
    newBtn.addEventListener('mouseover', function () { newBtn.style.background = C.surface; });
    newBtn.addEventListener('mouseout',  function () { newBtn.style.background = 'none'; });
    newBtn.addEventListener('click', function () {
      state.step = 'email';
      state.chatId = null;
      state.token = null;
      state.email = null;
      state.name = null;
      state.messages = [];
      state.displayedIds = null;
      checkAvailabilityAndOpen();
    });
    wrap.appendChild(newBtn);

    winBody.appendChild(wrap);
  }

  // ---- Storage helpers ----
  function saveSession() {
    if (state.chatId) localStorage.setItem('sp_chat_id', state.chatId);
    if (state.token) localStorage.setItem('sp_chat_token', state.token);
    if (state.email) localStorage.setItem('sp_chat_email', state.email);
    if (state.name) localStorage.setItem('sp_chat_name', state.name);
  }

  function clearStorage() {
    localStorage.removeItem('sp_chat_id');
    localStorage.removeItem('sp_chat_token');
    localStorage.removeItem('sp_chat_email');
    localStorage.removeItem('sp_chat_name');
  }

  // ---- API calls ----
  function startChat(email, name, message, onError) {
    // Collect visitor metadata
    var meta = {
      currentPage: window.location.href,
      timezone: Intl && Intl.DateTimeFormat ? Intl.DateTimeFormat().resolvedOptions().timeZone : '',
      language: navigator.language || '',
      browser: (function () {
        var ua = navigator.userAgent;
        if (/Edg\//.test(ua)) return 'Edge';
        if (/OPR\//.test(ua)) return 'Opera';
        if (/Chrome\//.test(ua)) return 'Chrome';
        if (/Safari\//.test(ua)) return 'Safari';
        if (/Firefox\//.test(ua)) return 'Firefox';
        return 'Unknown';
      })(),
      os: (function () {
        var ua = navigator.userAgent;
        if (/Windows/.test(ua)) return 'Windows';
        if (/Mac OS/.test(ua)) return 'macOS';
        if (/Android/.test(ua)) return 'Android';
        if (/iPhone|iPad/.test(ua)) return 'iOS';
        if (/Linux/.test(ua)) return 'Linux';
        return 'Unknown';
      })(),
    };

    fetch(PORTAL_URL + '/api/chat/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email, name: name, message: message, meta: meta }),
    })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (data.chatId && data.token) {
          state.chatId = data.chatId;
          state.token = data.token;
          saveSession();
          state.messages = [{
            id: 'init',
            chatId: data.chatId,
            sender: 'visitor',
            senderEmail: email,
            senderName: name,
            content: message,
            createdAt: new Date().toISOString(),
          }];
          state.step = 'waiting';
          renderWaiting();
          subscribeChat(data.chatId);
        } else {
          onError(data.error || 'Failed to start chat.');
        }
      })
      .catch(function () { onError('Network error. Please try again.'); });
  }

  // Merge API messages with any already received via Pusher new-message events.
  // API result replaces the local 'init' placeholder; real Pusher messages
  // (non-init, non-temp) that haven't reached the API yet are preserved.
  function mergeMessages(apiMessages) {
    var extras = state.messages.filter(function (m) {
      if (m.id === 'init' || m.id.startsWith('temp-')) return false;
      return !apiMessages.some(function (am) { return am.id === m.id; });
    });
    var merged = apiMessages.concat(extras);
    merged.sort(function (a, b) { return a.createdAt < b.createdAt ? -1 : 1; });
    return merged;
  }

  // ---- Pusher real-time ----
  function subscribeChat(chatId) {
    if (state.pusherChannel) {
      state.pusherChannel.unbind_all();
      if (state.pusher) state.pusher.unsubscribe('chat-' + chatId);
    }
    function doSubscribe(P) {
      state.pusher = new P(state._pusherKey, { cluster: state._pusherCluster });
      state.pusherChannel = state.pusher.subscribe('chat-' + chatId);

      state.pusherChannel.bind('new-message', function (msg) {
        // Skip staff-only system messages (e.g. minimize/maximize events)
        if (msg.staffOnly) return;
        // Deduplicate
        var exists = state.messages.some(function (m) { return m.id === msg.id; });
        if (exists) return;
        state.messages.push(msg);

        if (state.step === 'active' && state.open && state.activeTab === 'ask' && state._appendMessage && state._msgList) {
          state._appendMessage(msg);
          state._msgList.scrollTop = state._msgList.scrollHeight;
        } else if (!state.open || state.activeTab !== 'ask') {
          state.unread++;
          badge.style.display = 'block';
        }

        // Notify for staff/system messages
        if (msg.sender === 'system') {
          playSystemSound();
        } else if (msg.sender === 'staff') {
          // Immediately hide typing indicator and suppress for 1 second
          if (state._hideTyping) state._hideTyping();
          state._suppressTypingUntil = Date.now() + 1000;
          if (state.open && document.hasFocus()) {
            markSeenAsVisitor();
          } else {
            playNotificationSound();
            startTitleBlink();
          }
        }
      });

      state.pusherChannel.bind('messages-seen', function (data) {
        if (data.seenBy !== 'staff') return;
        state.staffSeenAt = data.seenAt;
        // Re-render check icons on all visible visitor messages
        if (state._updateSeenIcons) state._updateSeenIcons(data.seenAt);
      });

      state.pusherChannel.bind('typing', function (data) {
        if (data.sender !== 'staff' && data.sender !== 'bot') return;
        if (state._suppressTypingUntil && Date.now() < state._suppressTypingUntil) return;
        if (state.step === 'active' && state.open && state._showTyping) {
          if (data.sender === 'bot') {
            state._showTyping(data.name, 'Bot is thinking...');
          } else {
            state._showTyping(data.name);
          }
        }
      });

      state.pusherChannel.bind('status-change', function (data) {
        if (data.status === 'closed') {
          playCloseSound();
          state.step = 'closed';
          if (state.open) renderClosed();
          return;
        }
        if (data.status === 'active' && state.step === 'waiting') {
          // Fetch full message history, then switch to active
          fetch(PORTAL_URL + '/api/chat/' + chatId + '/messages?after=0&token=' + encodeURIComponent(state.token))
            .then(function (r) { return r.json(); })
            .then(function (allData) {
              state.messages = mergeMessages(allData.messages || []);
              state.step = 'active';
              if (state.open) renderActive();
            });
        }
      });

      // Catch-up: events from the server (e.g. bot joining) may have fired before
      // Pusher finished subscribing. Poll once immediately after subscribing so we
      // never get stuck on the waiting screen.
      if (state.step === 'waiting') {
        fetch(PORTAL_URL + '/api/chat/' + chatId + '/messages?after=0&token=' + encodeURIComponent(state.token))
          .then(function (r) { return r.json(); })
          .then(function (allData) {
            if (!allData) return;
            if (allData.status === 'active' && state.step === 'waiting') {
              state.messages = mergeMessages(allData.messages || []);
              state.step = 'active';
              if (state.open) renderActive();
            } else if (allData.status === 'closed' && state.step === 'waiting') {
              state.step = 'closed';
              if (state.open) renderClosed();
            }
          })
          .catch(function () {});
      }
    }

    if (state._pusherKey) {
      doSubscribe(window.Pusher);
      return;
    }

    // Load config then Pusher JS from CDN
    fetch(PORTAL_URL + '/api/chat/config')
      .then(function (r) { return r.json(); })
      .then(function (cfg) {
        state._pusherKey = cfg.key;
        state._pusherCluster = cfg.cluster;
        if (window.Pusher) { doSubscribe(window.Pusher); return; }
        var s = document.createElement('script');
        s.src = 'https://js.pusher.com/8.4.0-rc2/pusher.min.js';
        s.onload = function () { doSubscribe(window.Pusher); };
        document.head.appendChild(s);
      })
      .catch(function () {});
  }

  function unsubscribeChat() {
    if (state.pusherChannel) {
      state.pusherChannel.unbind_all();
      state.pusherChannel = null;
    }
    if (state.pusher && state.chatId) {
      state.pusher.unsubscribe('chat-' + state.chatId);
      state.pusher.disconnect();
      state.pusher = null;
    }
  }

  // ---- Toggle window ----
  function showCurrentStep() {
    if (state.step === 'offline') renderOffline();
    else if (state.step === 'email') renderEmail();
    else if (state.step === 'message') renderMessage();
    else if (state.step === 'waiting') renderWaiting();
    else if (state.step === 'active') renderActive();
    else if (state.step === 'ending') renderEnding();
    else if (state.step === 'closed') renderClosed();
  }

  function checkAvailabilityAndOpen() {
    // If already in a live chat, skip availability check
    if (state.chatId && state.token) {
      state.activeTab = 'ask';
      updateTabBar();
      showCurrentStep();
      return;
    }
    fetch(PORTAL_URL + '/api/chat/availability')
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (data.online) {
          if (state.step === 'button' || state.step === 'offline') state.step = 'email';
        } else {
          state.step = 'offline';
        }
        state.activeTab = 'ask';
        updateTabBar();
        showCurrentStep();
      })
      .catch(function () {
        if (state.step === 'button' || state.step === 'offline') state.step = 'email';
        state.activeTab = 'ask';
        updateTabBar();
        showCurrentStep();
      });
  }

  function openWindow() {
    state.open = true;
    win.style.display = 'flex';
    state.unread = 0;
    badge.style.display = 'none';
    floatBtn.innerHTML = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
    floatBtn.appendChild(badge);

    updateTabBar();

    if (state.activeTab === 'home') {
      renderHome();
    } else {
      if (state.step === 'button' || state.step === 'offline') {
        checkAvailabilityAndOpen();
      } else {
        sendPresence('maximize');
        showCurrentStep();
      }
    }
  }

  function sendPresence(event) {
    if (!state.chatId || !state.token || state.step !== 'active') return;
    fetch(PORTAL_URL + '/api/chat/' + state.chatId + '/presence', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: state.token, event: event }),
    }).catch(function () {});
  }

  function minimizeWindow() {
    state.open = false;
    win.style.display = 'none';
    floatBtn.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>';
    floatBtn.appendChild(badge);
    sendPresence('minimize');
  }

  floatBtn.addEventListener('click', function () {
    if (state.open) minimizeWindow();
    else openWindow();
  });
  // Minus → minimize (preserve chat state, just hide window)
  minimizeBtn.addEventListener('click', minimizeWindow);
  // X → end chat (show confirmation for active/waiting, otherwise minimize)
  closeWinBtn.addEventListener('click', function () {
    if (state.step === 'active' || state.step === 'waiting') {
      state.step = 'ending';
      renderEnding();
    } else {
      minimizeWindow();
    }
  });

  // ---- Restore session on load ----
  if (state.chatId && state.token) {
    fetch(PORTAL_URL + '/api/chat/' + state.chatId + '/status?token=' + encodeURIComponent(state.token))
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (data.status === 'active') {
          // Load messages
          fetch(PORTAL_URL + '/api/chat/' + state.chatId + '/messages?after=0&token=' + encodeURIComponent(state.token))
            .then(function (r) { return r.json(); })
            .then(function (allData) {
              state.messages = allData.messages || [];
              state.step = 'active';
              if (state.open) renderActive();
              subscribeChat(state.chatId);
            });
        } else if (data.status === 'waiting') {
          state.step = 'waiting';
          if (state.open) renderWaiting();
          subscribeChat(state.chatId);
        } else {
          // closed or not found
          clearStorage();
          state.chatId = null;
          state.token = null;
          state.step = 'email';
        }
      })
      .catch(function () {
        clearStorage();
        state.chatId = null;
        state.token = null;
        state.step = 'email';
      });
  }
})();
