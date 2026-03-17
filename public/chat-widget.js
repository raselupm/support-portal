(function () {
  'use strict';

  // Get portal URL from script tag
  var script = document.currentScript || (function () {
    var scripts = document.getElementsByTagName('script');
    return scripts[scripts.length - 1];
  })();
  var PORTAL_URL = (script.getAttribute('data-portal-url') || '').replace(/\/$/, '');
  if (!PORTAL_URL) return;

  // Inject spin keyframes
  var styleEl = document.createElement('style');
  styleEl.textContent = '@keyframes sp-spin { to { transform: rotate(360deg); } } @keyframes sp-pulse { 0%,100%{opacity:1} 50%{opacity:.5} } @keyframes sp-bounce { 0%,80%,100%{transform:translateY(0)} 40%{transform:translateY(-4px)} }';
  document.head.appendChild(styleEl);

  // Colors
  var C = {
    primary: '#2563eb',
    primaryHover: '#1d4ed8',
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
    boxShadow: '0 4px 12px rgba(37,99,235,0.4)',
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
    overflow: 'hidden', border: '1px solid ' + C.border,
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

  var headerBtns = el('div', { display: 'flex', alignItems: 'center', gap: '2px' });
  headerBtns.appendChild(minimizeBtn);
  headerBtns.appendChild(closeWinBtn);
  winHeader.appendChild(winTitle);
  winHeader.appendChild(headerBtns);
  win.appendChild(winHeader);

  // Window body
  var winBody = el('div', { flex: '1', overflow: 'hidden', display: 'flex', flexDirection: 'column' });
  win.appendChild(winBody);

  // ---- Step renderers ----
  function clearBody() {
    while (winBody.firstChild) winBody.removeChild(winBody.firstChild);
    minimizeBtn.style.display = state.step === 'active' ? 'block' : 'none';
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
      inp.addEventListener('focus', function () { inp.style.borderColor = C.primary; inp.style.boxShadow = '0 0 0 3px rgba(37,99,235,0.15)'; });
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
        padding: '8px 12px', borderRadius: '14px', fontSize: '13px',
        maxWidth: '75%', lineHeight: '1.5', wordBreak: 'break-word',
        background: isVisitor ? C.primary : C.surface,
        color: isVisitor ? 'white' : C.textPrimary,
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
      display: 'flex', gap: '8px', padding: '12px 12px 14px',
      borderTop: '1px solid ' + C.border, background: C.bg, flexShrink: '0',
    });

    var textInput = el('textarea', {
      flex: '1', padding: '8px 10px', border: '1px solid ' + C.border,
      borderRadius: '10px', fontSize: '13px', resize: 'none',
      fontFamily: 'inherit', outline: 'none', color: C.textPrimary,
      lineHeight: '1.4',
    });
    textInput.setAttribute('placeholder', 'Type a message...');
    textInput.setAttribute('rows', '2');

    var sendBtn = el('button', {
      padding: '8px 14px', background: C.primary, color: 'white',
      border: 'none', borderRadius: '10px', fontSize: '13px',
      fontWeight: '600', cursor: 'pointer', alignSelf: 'flex-end',
      transition: 'background 0.2s', flexShrink: '0',
    }, { textContent: 'Send' });
    sendBtn.addEventListener('mouseover', function () { sendBtn.style.background = C.primaryHover; });
    sendBtn.addEventListener('mouseout', function () { sendBtn.style.background = C.primary; });

    function doSend() {
      var content = textInput.value.trim();
      if (!content) return;
      sendBtn.disabled = true;
      textInput.value = '';

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
    function showTyping(name) {
      typingText.textContent = name + ' is typing';
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
    textInput.addEventListener('input', sendTypingEvent);
    textInput.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); doSend(); }
    });

    inputRow.appendChild(textInput);
    inputRow.appendChild(sendBtn);
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

        if (state.step === 'active' && state.open && state._appendMessage && state._msgList) {
          state._appendMessage(msg);
          state._msgList.scrollTop = state._msgList.scrollHeight;
        } else if (!state.open) {
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
        if (data.sender !== 'staff') return;
        if (state._suppressTypingUntil && Date.now() < state._suppressTypingUntil) return;
        if (state.step === 'active' && state.open && state._showTyping) {
          state._showTyping(data.name);
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
              state.messages = allData.messages || [];
              state.step = 'active';
              if (state.open) renderActive();
            });
        }
      });
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
        showCurrentStep();
      })
      .catch(function () {
        // On network error default to showing email form
        if (state.step === 'button' || state.step === 'offline') state.step = 'email';
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

    if (state.step === 'button') {
      checkAvailabilityAndOpen();
    } else {
      sendPresence('maximize');
      showCurrentStep();
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
