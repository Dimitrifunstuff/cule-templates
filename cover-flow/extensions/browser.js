// Cover Flow — horizontal 3D carousel of tab groups, one per domain.
//
// Center cover is face-on; neighbours are rotated and pushed back in
// 3D. Mouse wheel / arrow keys / drag move through the stack with a
// smooth ease. Click the center cover (or press Enter) to flip it
// over and reveal a grid of all tabs in that domain. Click a tab in
// the grid to activate it. Esc / outside click closes the carousel.
//
// No real thumbnail API is exposed, so each cover renders a
// stylised "album art" panel: a per-domain gradient + the first
// letter of the domain. The aesthetic is a nod to iTunes/iPod.
(function () {
  'use strict';
  if (document.body.dataset.buildMode === "on") return;

  // ---- launcher pill (replaces the hidden tab strip) ----------------
  const pill = document.createElement('button');
  pill.className = 'cf-pill';
  pill.type = 'button';
  pill.innerHTML = [
    '<span class="cf-pill__icon">▦</span>',
    '<span class="cf-pill__domain" data-domain>—</span>',
    '<span class="cf-pill__sep">·</span>',
    '<span class="cf-pill__count" data-count>0 tabs</span>'
  ].join('');
  pill.title = 'Open Cover Flow';
  // macOS fix: the pill floats over the window's title-bar drag region.
  // A no-drag set via a CSS *class* on a dynamically-injected element is
  // unreliable on macOS (the OS keeps treating the spot as draggable and
  // eats the click, so the menu never opens — Windows isn't affected).
  // Setting -webkit-app-region inline at creation is honoured reliably.
  pill.style.setProperty('-webkit-app-region', 'no-drag');
  document.body.appendChild(pill);
  // Nudge a reflow so macOS recomputes the draggable regions now that the
  // no-drag pill exists, instead of from the pre-injection layout.
  void pill.offsetWidth;

  // Refresh pill label whenever the tab set or active tab changes.
  // Shows the active tab's domain (or "Other" for non-http schemes)
  // and the total tab count so the user always sees what they have.
  function refreshPill() {
    api.tabs.list().then((tabs) => {
      const total = tabs.length;
      const active = tabs.find((t) => t.isActive);
      let label = '—';
      if (active) {
        const h = getHost(active.url);
        label = h || 'Other';
      }
      const dEl = pill.querySelector('[data-domain]');
      const cEl = pill.querySelector('[data-count]');
      if (dEl) dEl.textContent = label;
      if (cEl) cEl.textContent = total + (total === 1 ? ' tab' : ' tabs');
    }).catch(() => {});
  }
  refreshPill();
  api.on('tabs-changed', refreshPill);
  api.on('tabswitch', refreshPill);
  api.on('navigate', refreshPill);
  api.on('pageload', refreshPill);

  // ---- custom welcome / newtab overlay ------------------------------
  // Instead of redirecting the webview to a giant data:text/html URL
  // (which dumps the whole HTML into the address bar and lets Cule
  // submit it as a Google search if the user hits Enter there), we
  // render our own welcome UI as an overlay in the sandbox div that
  // sits ON TOP of the actual webview area. The webview stays on
  // browser://welcome or browser://newtab, so Cule's address bar
  // correctly shows it as empty.
  //
  // Click handlers use api.navigation.goTo / api.tabs.create instead
  // of location.href so navigation flows through Cule, not the
  // sandbox doc.
  const welcomeOverlay = document.createElement('div');
  welcomeOverlay.setAttribute('data-cf-welcome', '');
  welcomeOverlay.style.cssText = [
    'position:absolute', 'inset:0',
    'background:linear-gradient(180deg,#dadada 0%,#b6b6b6 100%)',
    'display:none',
    'pointer-events:auto',
    'overflow:auto',
    'z-index:1000',
    'font:13px/1.4 "Lucida Grande","Segoe UI",sans-serif',
    'color:#1a1a1a'
  ].join(';') + ';';
  welcomeOverlay.innerHTML = `
    <style>
      [data-cf-welcome] *{margin:0;padding:0;box-sizing:border-box}
      [data-cf-welcome] .wc-container{max-width:740px;margin:0 auto;padding:80px 24px 40px}
      [data-cf-welcome] .wc-hero{text-align:center;margin-bottom:36px}
      [data-cf-welcome] .wc-hero__title{font:200 56px/1 "Lucida Grande","Helvetica Neue",sans-serif;letter-spacing:-1.5px;color:#1a1a1a;text-shadow:0 1px 0 rgba(255,255,255,0.55);margin-bottom:6px}
      [data-cf-welcome] .wc-hero__sub{font-size:12px;color:#555;letter-spacing:0.03em}
      [data-cf-welcome] form.wc-search{position:relative;display:flex;align-items:center;background:#fff;border:1px solid #888;border-radius:999px;padding:0 16px 0 38px;height:36px;box-shadow:inset 0 1px 3px rgba(0,0,0,0.18),0 1px 0 rgba(255,255,255,0.8);transition:border-color 120ms ease,box-shadow 120ms ease}
      [data-cf-welcome] form.wc-search:focus-within{border-color:#4a90e2;box-shadow:inset 0 1px 3px rgba(0,0,0,0.12),0 0 0 3px rgba(74,144,226,0.35)}
      [data-cf-welcome] form.wc-search svg{position:absolute;left:14px;top:50%;transform:translateY(-50%);opacity:0.55}
      [data-cf-welcome] form.wc-search input{flex:1;border:none;outline:none;background:transparent;font:14px/1 inherit;color:#1a1a1a}
      [data-cf-welcome] form.wc-search input::placeholder{color:#888}
      [data-cf-welcome] form.wc-search button{border:1px solid rgba(0,0,0,0.25);background:linear-gradient(180deg,#fbfbfb 0%,#e2e2e2 48%,#c8c8c8 100%);box-shadow:inset 0 1px 0 rgba(255,255,255,0.9),inset 0 -1px 0 rgba(0,0,0,0.05);padding:4px 12px;border-radius:8px;font:600 12px/1 inherit;color:#1c1c1c;cursor:pointer;margin-left:8px}
      [data-cf-welcome] form.wc-search button:hover{background:linear-gradient(180deg,#fff 0%,#ececec 48%,#d2d2d2 100%)}
      [data-cf-welcome] form.wc-search button:active{background:linear-gradient(180deg,#c0c0c0 0%,#b0b0b0 50%,#c0c0c0 100%);box-shadow:inset 0 2px 4px rgba(0,0,0,0.2)}
      [data-cf-welcome] .wc-panel{margin-top:42px;background:linear-gradient(180deg,#fafafa 0%,#ececec 100%);border:1px solid #7e7e7e;border-radius:6px;box-shadow:0 1px 4px rgba(0,0,0,0.12),inset 0 1px 0 rgba(255,255,255,0.8);overflow:hidden}
      [data-cf-welcome] .wc-panel__head{background:linear-gradient(180deg,#e4e4e4 0%,#c8c8c8 100%);border-bottom:1px solid #888;padding:7px 14px;font-weight:600;font-size:11px;letter-spacing:0.04em;text-transform:uppercase;color:#3a3a3a;text-shadow:0 1px 0 rgba(255,255,255,0.6);display:flex;gap:12px;align-items:center}
      [data-cf-welcome] .wc-panel__head span:nth-child(1){flex:0 0 100px}
      [data-cf-welcome] .wc-panel__head span:nth-child(2){flex:1}
      [data-cf-welcome] .wc-panel__head span:nth-child(3){flex:1;color:#555}
      [data-cf-welcome] ul.wc-rows{list-style:none}
      [data-cf-welcome] .wc-row{display:flex;gap:12px;align-items:center;padding:7px 14px;cursor:default;border-bottom:1px solid rgba(0,0,0,0.05);transition:background 80ms ease,color 80ms ease}
      [data-cf-welcome] .wc-row:nth-child(odd){background:rgba(0,0,0,0.022)}
      [data-cf-welcome] .wc-row:hover{background:linear-gradient(180deg,#5da3e8 0%,#2670c4 100%);color:#fff;border-bottom-color:#2670c4}
      [data-cf-welcome] .wc-row:hover .wc-row__time,[data-cf-welcome] .wc-row:hover .wc-row__url{color:rgba(255,255,255,0.85)}
      [data-cf-welcome] .wc-row__time{flex:0 0 100px;font-variant-numeric:tabular-nums;color:#666;font-size:11px}
      [data-cf-welcome] .wc-row__title{flex:1;font-weight:500;overflow:hidden;white-space:nowrap;text-overflow:ellipsis}
      [data-cf-welcome] .wc-row__url{flex:1;color:#555;font-size:11px;overflow:hidden;white-space:nowrap;text-overflow:ellipsis}
      [data-cf-welcome] .wc-foot{margin-top:28px;text-align:center;color:#666;font-size:11px;letter-spacing:0.04em}
    </style>
    <div class="wc-container">
      <div class="wc-hero">
        <div class="wc-hero__title">Cover Flow</div>
        <div class="wc-hero__sub">browse like it's 2006</div>
      </div>
      <form class="wc-search" data-wc-search>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2"><circle cx="7" cy="7" r="5"/><line x1="11" y1="11" x2="15" y2="15"/></svg>
        <input data-wc-input type="text" placeholder="Search Google or enter a URL" autocomplete="off">
        <button type="submit">Search</button>
      </form>
      <div class="wc-panel">
        <div class="wc-panel__head"><span>Visited</span><span>Title</span><span>URL</span></div>
        <ul class="wc-rows">
          <li class="wc-row" data-wc-url="https://news.ycombinator.com"><span class="wc-row__time">Today</span><span class="wc-row__title">Hacker News</span><span class="wc-row__url">news.ycombinator.com</span></li>
          <li class="wc-row" data-wc-url="https://reddit.com"><span class="wc-row__time">Today</span><span class="wc-row__title">reddit: the front page of the internet</span><span class="wc-row__url">reddit.com</span></li>
          <li class="wc-row" data-wc-url="https://github.com"><span class="wc-row__time">Yesterday</span><span class="wc-row__title">GitHub</span><span class="wc-row__url">github.com</span></li>
          <li class="wc-row" data-wc-url="https://youtube.com"><span class="wc-row__time">Yesterday</span><span class="wc-row__title">YouTube</span><span class="wc-row__url">youtube.com</span></li>
          <li class="wc-row" data-wc-url="https://x.com"><span class="wc-row__time">Mon</span><span class="wc-row__title">X</span><span class="wc-row__url">x.com</span></li>
          <li class="wc-row" data-wc-url="https://en.wikipedia.org"><span class="wc-row__time">Sun</span><span class="wc-row__title">Wikipedia</span><span class="wc-row__url">en.wikipedia.org</span></li>
        </ul>
      </div>
      <div class="wc-foot">Cover Flow · Cule</div>
    </div>
  `;
  document.body.appendChild(welcomeOverlay);

  // Search form: parse URL vs query, navigate active tab via Cule.
  const wcSearchForm = welcomeOverlay.querySelector('[data-wc-search]');
  const wcSearchInput = welcomeOverlay.querySelector('[data-wc-input]');
  function isLikelyUrl(s) {
    if (/^https?:\/\//i.test(s)) return true;
    if (/\s/.test(s)) return false;
    return /^[\w.-]+\.[a-z]{2,}/i.test(s);
  }
  wcSearchForm.addEventListener('submit', (ev) => {
    ev.preventDefault();
    const q = wcSearchInput.value.trim();
    if (!q) return;
    const url = isLikelyUrl(q)
      ? (q.startsWith('http') ? q : 'https://' + q)
      : 'https://www.google.com/search?q=' + encodeURIComponent(q);
    api.navigation.goTo(url).catch(() => {});
  });

  // Row clicks → navigate active tab.
  welcomeOverlay.addEventListener('click', (ev) => {
    const row = ev.target.closest('[data-wc-url]');
    if (!row) return;
    const url = row.getAttribute('data-wc-url');
    if (url) api.navigation.goTo(url).catch(() => {});
  });

  // Decide whether the welcome overlay should be visible. We always
  // read from api.tabs.current() rather than the event payload, because
  // navigate/pageload events fire with the resolved webview URL (a big
  // data:text/html URL for internal pages), whereas tab.url preserves
  // the alias (browser://welcome / browser://newtab) Cule sets for
  // internal landing pages. If we keyed off the event URL the overlay
  // would briefly show then disappear the moment Cule's real welcome
  // page finished loading inside the webview.
  function isWelcomeUrl(url) {
    return typeof url === 'string' && /^browser:\/\/(welcome|newtab)\b/i.test(url);
  }
  function syncFromCurrentTab() {
    api.tabs.current().then((t) => {
      const show = t && isWelcomeUrl(t.url);
      welcomeOverlay.style.display = show ? 'block' : 'none';
      if (show && wcSearchInput) {
        setTimeout(() => { try { wcSearchInput.focus(); } catch {} }, 0);
      }
    }).catch(() => {});
  }
  // Initial + on every relevant chrome event.
  syncFromCurrentTab();
  api.on('navigate', syncFromCurrentTab);
  api.on('pageload', syncFromCurrentTab);
  api.on('tabswitch', syncFromCurrentTab);
  api.on('tabs-changed', syncFromCurrentTab);

  // Tracks open state via a JS flag instead of computed style — the
  // visibility flips with the CSS transition so reading display/
  // opacity mid-animation is unreliable.
  let isOpen = false;

  // ---- overlay root -------------------------------------------------
  // Always mounted, visibility controlled via opacity + pointer-events
  // so we can transition open/close smoothly. data-cf-open flips on
  // when the user opens the carousel.
  const overlay = document.createElement('div');
  overlay.setAttribute('data-cf-overlay', '');
  overlay.style.cssText = [
    'position:fixed', 'inset:0',
    'background:linear-gradient(180deg,#0a0a0c 0%,#15151a 50%,#0a0a0c 100%)',
    'opacity:0',
    'visibility:hidden',
    'pointer-events:none',
    'transform:scale(1.04)',
    'transition:opacity 260ms cubic-bezier(0.2,0.8,0.2,1), transform 320ms cubic-bezier(0.2,0.8,0.2,1), visibility 0s linear 260ms',
    'z-index:99999',
    'overflow:hidden',
    'perspective:1400px',
    'font:14px/1.4 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif',
    'color:#e8e8ec',
    'user-select:none',
    '-webkit-user-select:none'
  ].join(';') + ';';
  document.body.appendChild(overlay);

  // Helpers that flip the open/close visual state. Visibility is
  // delayed when closing so the fade-out can complete; on open it
  // switches instantly so transitions fire. We also stamp a
  // data-cf-open attribute on <html> so the chrome's pill + "+"
  // button can restyle themselves while the carousel is up (the pill
  // hides, the + slides to dead-centre and rises above the overlay).
  function setOpenVisuals(open) {
    if (open) {
      document.documentElement.setAttribute('data-cf-open', '');
      // Belt-and-braces: hide pill directly via inline style so the
      // CSS attribute selector isn't the only thing keeping it down.
      // If a chrome re-render swaps out the html attribute we don't
      // want the pill to flash back during the open transition.
      pill.style.display = 'none';
      overlay.style.visibility = 'visible';
      overlay.style.pointerEvents = 'auto';
      overlay.style.transition = 'opacity 260ms cubic-bezier(0.2,0.8,0.2,1), transform 320ms cubic-bezier(0.2,0.8,0.2,1), visibility 0s';
      // Force a reflow so the upcoming opacity/transform changes are
      // animated rather than applied instantly with the visibility flip.
      void overlay.offsetWidth;
      overlay.style.opacity = '1';
      overlay.style.transform = 'scale(1)';
    } else {
      document.documentElement.removeAttribute('data-cf-open');
      // Restore the pill explicitly. Clearing the inline display lets
      // it fall back to whatever browser.css defines (inline-flex).
      pill.style.display = '';
      overlay.style.transition = 'opacity 220ms cubic-bezier(0.4,0,0.6,1), transform 240ms cubic-bezier(0.4,0,0.6,1), visibility 0s linear 240ms';
      overlay.style.opacity = '0';
      overlay.style.transform = 'scale(1.04)';
      overlay.style.visibility = 'hidden';
      overlay.style.pointerEvents = 'none';
    }
  }

  // Stage: holds the row of covers, transformed left/right as user
  // scrolls. translate3d so the GPU handles it.
  const stage = document.createElement('div');
  stage.style.cssText = [
    'position:absolute', 'top:0', 'left:50%', 'bottom:120px',
    'width:0', 'height:auto',
    'transform-style:preserve-3d',
    'transition:transform 320ms cubic-bezier(0.2,0.8,0.2,1)'
  ].join(';') + ';';
  overlay.appendChild(stage);

  // Label under the center cover ("reddit.com — 4 tabs").
  const label = document.createElement('div');
  label.style.cssText = [
    'position:absolute', 'left:0', 'right:0', 'bottom:60px',
    'text-align:center', 'font-size:18px', 'letter-spacing:0.02em',
    'color:#f5f5f7', 'pointer-events:none'
  ].join(';') + ';';
  overlay.appendChild(label);

  // Sub-label (tab count).
  const sublabel = document.createElement('div');
  sublabel.style.cssText = [
    'position:absolute', 'left:0', 'right:0', 'bottom:36px',
    'text-align:center', 'font-size:13px', 'color:rgba(255,255,255,0.55)',
    'pointer-events:none'
  ].join(';') + ';';
  overlay.appendChild(sublabel);

  // Close hint (top-right of overlay).
  const closeHint = document.createElement('div');
  closeHint.style.cssText = [
    'position:absolute', 'top:18px', 'right:24px',
    'font-size:12px', 'color:rgba(255,255,255,0.45)', 'pointer-events:none'
  ].join(';') + ';';
  closeHint.textContent = 'Esc to close';
  overlay.appendChild(closeHint);

  // ---- audio preview (iPod-style domain clips) ---------------------
  // Drop mp3 files named after the domain stem (google.mp3, openai.mp3,
  // youtube.mp3, …) into  extensions/cover-flow/audio/  in your
  // workspace. Whenever the centered cover changes we play a short
  // clip for that domain, mimicking iPod's "preview a song while you
  // scroll Cover Flow" behaviour. Silently no-ops if the file is
  // missing or the chrome's CSP blocks file:// media.
  //
  // CSP heads-up: by default Cule's chrome HTML doesn't declare a
  // `media-src` directive, so the audio request falls back to
  // `default-src 'self'` and cross-file:// loads are blocked. Add
  // `media-src 'self' file: data:` to ui/index.html's CSP to enable.
  let currentAudio = null;
  let isMuted = false;
  function audioUrlForHost(host) {
    if (!host || host === 'Other') return null;
    // Strip "www." and take the first label of the host (reddit.com →
    // "reddit"). Matches the user's "google.mp3 / openai.mp3" naming.
    const stem = host.toLowerCase().replace(/^www\./, '').split('.')[0];
    if (!stem) return null;
    // Build file:// URL pointing at workspace/extensions/cover-flow/audio/.
    // We derive the workspace path by walking up from the chrome HTML
    // (typically file:///.../prompt-browser/ui/index.html). If the
    // user's CULE_WORKSPACE override points elsewhere this will need
    // manual adjustment.
    const base = location.href.replace(
      /\/prompt-browser\/ui\/[^/]+$/,
      '/Cule-workspace/extensions/cover-flow/audio/'
    );
    return base + stem + '.mp3';
  }
  function playForHost(host) {
    // Stop any previous clip first.
    if (currentAudio) {
      try { currentAudio.pause(); } catch {}
      currentAudio = null;
    }
    if (isMuted) return;
    const url = audioUrlForHost(host);
    if (!url) return;
    try {
      const a = new Audio(url);
      a.volume = 0.6;
      // Silent fail if the file is missing or CSP blocks it.
      a.addEventListener('error', () => { currentAudio = null; });
      const playPromise = a.play();
      if (playPromise && playPromise.catch) playPromise.catch(() => {});
      currentAudio = a;
    } catch { /* never throw from a UI scroll */ }
  }
  function stopAudio() {
    if (currentAudio) {
      try { currentAudio.pause(); } catch {}
      currentAudio = null;
    }
  }

  // Mute toggle — top-left of the carousel overlay, mirrors the
  // closeHint position. Icon flips between 🔊 and 🔇.
  const muteBtn = document.createElement('button');
  muteBtn.type = 'button';
  muteBtn.title = 'Mute (M)';
  muteBtn.style.cssText = [
    'position:absolute', 'top:14px', 'left:24px',
    'width:34px', 'height:34px',
    'border-radius:50%',
    'background:linear-gradient(180deg,#fbfbfb 0%,#e2e2e2 48%,#c8c8c8 100%)',
    'border:1px solid rgba(0,0,0,0.32)',
    'color:#1c1c1c',
    'font:600 16px/1 "Lucida Grande","Segoe UI",sans-serif',
    'box-shadow:' +
      'inset 0 1px 0 rgba(255,255,255,0.9),' +
      'inset 0 -1px 0 rgba(0,0,0,0.05),' +
      '0 2px 8px rgba(0,0,0,0.25)',
    'cursor:pointer',
    'display:flex','align-items:center','justify-content:center',
    'padding:0',
    'pointer-events:auto',
    'z-index:6',
    'transition:background 80ms ease, transform 60ms ease, box-shadow 80ms ease'
  ].join(';') + ';';
  function refreshMuteIcon() {
    muteBtn.textContent = isMuted ? '🔇' : '🔊';
    muteBtn.setAttribute('aria-label', isMuted ? 'Unmute' : 'Mute');
    muteBtn.title = (isMuted ? 'Unmute' : 'Mute') + ' (M)';
  }
  refreshMuteIcon();
  muteBtn.addEventListener('click', (ev) => {
    ev.stopPropagation();
    isMuted = !isMuted;
    refreshMuteIcon();
    if (isMuted) {
      stopAudio();
    } else if (isOpen && covers[centerIndex]) {
      playForHost(covers[centerIndex].host);
    }
  });
  overlay.appendChild(muteBtn);

  // ---- domain grouping ---------------------------------------------
  function getHost(url) {
    try {
      if (!url) return null;
      const u = new URL(url);
      if (['about:', 'chrome:', 'data:', 'file:', 'browser:'].includes(u.protocol)) return null;
      let h = u.hostname.replace(/^www\./, '');
      if (!h || h === 'localhost' || /^\d+\.\d+\.\d+\.\d+$/.test(h)) return null;
      return h;
    } catch { return null; }
  }

  // Deterministic hue from a string so the same domain always gets
  // the same colour scheme across sessions.
  function hashHue(str) {
    let h = 0;
    for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0;
    return Math.abs(h) % 360;
  }

  // Build covers array from current tab list.
  function buildCovers(tabs) {
    const groups = new Map();
    const other = [];
    for (const t of tabs) {
      const h = getHost(t.url);
      if (!h) { other.push(t); continue; }
      if (!groups.has(h)) groups.set(h, []);
      groups.get(h).push(t);
    }
    const covers = Array.from(groups.entries())
      .sort((a, b) => b[1].length - a[1].length)
      .map(([host, ts]) => ({ host, tabs: ts }));
    if (other.length) covers.push({ host: 'Other', tabs: other });
    return covers;
  }

  // ---- render -------------------------------------------------------
  // State
  let covers = [];
  let centerIndex = 0;
  let flipped = false;
  let coverEls = [];        // DOM nodes for each cover
  const COVER_SIZE = 280;   // px square
  const STEP_X = 220;       // px between cover centers
  const SIDE_ROT = 60;      // deg rotation for side covers
  const SIDE_Z = -120;      // px back-push for side covers

  function makeCoverEl(cover, idx) {
    const wrap = document.createElement('div');
    wrap.setAttribute('data-cf-cover', String(idx));
    wrap.style.cssText = [
      'position:absolute',
      'top:50%', 'left:0',
      'width:' + COVER_SIZE + 'px',
      'height:' + COVER_SIZE + 'px',
      'margin-left:' + (-COVER_SIZE / 2) + 'px',
      'margin-top:' + (-COVER_SIZE / 2) + 'px',
      'transform-style:preserve-3d',
      'transition:transform 320ms cubic-bezier(0.2,0.8,0.2,1), opacity 320ms ease',
      'cursor:pointer'
    ].join(';') + ';';

    // Front face (cover art).
    const front = document.createElement('div');
    const hue = cover.host === 'Other' ? 0 : hashHue(cover.host);
    const sat = cover.host === 'Other' ? 0 : 60;
    front.style.cssText = [
      'position:absolute', 'inset:0',
      'border-radius:8px',
      'background:linear-gradient(135deg,hsl(' + hue + ',' + sat + '%,42%) 0%,hsl(' + ((hue + 30) % 360) + ',' + sat + '%,22%) 100%)',
      'box-shadow:0 16px 40px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.12)',
      'backface-visibility:hidden',
      '-webkit-backface-visibility:hidden',
      'display:flex', 'align-items:center', 'justify-content:center',
      'overflow:hidden'
    ].join(';') + ';';

    const letter = document.createElement('div');
    letter.textContent = (cover.host[0] || '?').toUpperCase();
    letter.style.cssText = [
      'font:600 128px/1 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif',
      'color:rgba(255,255,255,0.92)',
      'text-shadow:0 4px 16px rgba(0,0,0,0.4)',
      'transition:opacity 180ms ease'
    ].join(';') + ';';
    front.appendChild(letter);

    // Favicon overlay. We use Google's favicon service at 128px so we
    // get a reasonably crisp icon for most sites. If the image loads
    // and is big enough (Google returns a 16px globe for unknown
    // domains), we fade it in over the letter; otherwise the letter
    // stays as the fallback. CSP allows https: img-src so no special
    // permissions needed.
    if (cover.host && cover.host !== 'Other') {
      const favicon = document.createElement('img');
      favicon.alt = '';
      favicon.referrerPolicy = 'no-referrer';
      favicon.src = 'https://www.google.com/s2/favicons?domain=' +
        encodeURIComponent(cover.host) + '&sz=128';
      favicon.style.cssText = [
        'position:absolute',
        'top:50%', 'left:50%',
        'width:55%', 'height:55%',
        'transform:translate(-50%,-50%)',
        'object-fit:contain',
        'opacity:0',
        'transition:opacity 220ms ease',
        'filter:drop-shadow(0 6px 18px rgba(0,0,0,0.4))',
        'pointer-events:none',
        'image-rendering:auto'
      ].join(';') + ';';
      favicon.addEventListener('load', () => {
        // Google's fallback "globe" is 16px. Real favicons return at
        // least 32px when sz=128 is requested. Skip the fallback so
        // the letter remains the better default for unknown sites.
        if (favicon.naturalWidth >= 32) {
          favicon.style.opacity = '1';
          letter.style.opacity = '0';
        }
      });
      front.appendChild(favicon);
    }

    const badge = document.createElement('div');
    badge.textContent = cover.tabs.length + (cover.tabs.length === 1 ? ' TAB' : ' TABS');
    badge.style.cssText = [
      'position:absolute', 'top:14px', 'right:14px',
      'background:rgba(0,0,0,0.55)', 'color:rgba(255,255,255,0.9)',
      'padding:4px 8px', 'border-radius:10px',
      'font-size:10px', 'letter-spacing:0.08em', 'font-weight:600'
    ].join(';') + ';';
    front.appendChild(badge);

    // Reflection beneath the cover (a flipped, faded copy).
    const reflection = document.createElement('div');
    reflection.style.cssText = [
      'position:absolute', 'left:0', 'right:0',
      'top:100%', 'height:' + COVER_SIZE + 'px',
      'border-radius:8px',
      'background:linear-gradient(135deg,hsl(' + hue + ',' + sat + '%,42%) 0%,hsl(' + ((hue + 30) % 360) + ',' + sat + '%,22%) 100%)',
      'transform:scaleY(-1)',
      'transform-origin:top center',
      '-webkit-mask-image:linear-gradient(180deg,rgba(0,0,0,0.35) 0%,rgba(0,0,0,0) 50%)',
      'mask-image:linear-gradient(180deg,rgba(0,0,0,0.35) 0%,rgba(0,0,0,0) 50%)',
      'pointer-events:none',
      'opacity:0.5'
    ].join(';') + ';';

    // Back face (grid of tabs in this domain).
    const back = document.createElement('div');
    back.style.cssText = [
      'position:absolute', 'inset:0',
      'border-radius:8px',
      'background:#1c1c20',
      'box-shadow:0 16px 40px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.06)',
      'backface-visibility:hidden',
      '-webkit-backface-visibility:hidden',
      'transform:rotateY(180deg)',
      'overflow:auto',
      'padding:12px',
      'display:grid', 'grid-template-columns:1fr 1fr', 'gap:8px',
      'align-content:start'
    ].join(';') + ';';
    for (const t of cover.tabs) {
      const tile = document.createElement('button');
      tile.type = 'button';
      tile.style.cssText = [
        'position:relative',
        'background:rgba(255,255,255,0.04)',
        'border:1px solid ' + (t.isActive ? 'rgba(125,211,252,0.5)' : 'rgba(255,255,255,0.06)'),
        'border-radius:6px',
        'color:#e8e8ec',
        'text-align:left',
        'padding:8px 24px 8px 8px',
        'cursor:pointer',
        'font:inherit', 'font-size:11px',
        'display:flex', 'flex-direction:column', 'gap:4px',
        'overflow:hidden'
      ].join(';') + ';';
      const title = document.createElement('div');
      title.textContent = t.title || t.url || '(untitled)';
      title.style.cssText = 'font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;';
      const sub = document.createElement('div');
      sub.textContent = t.url || '';
      sub.style.cssText = 'color:rgba(255,255,255,0.5);font-size:10px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;';
      tile.appendChild(title);
      tile.appendChild(sub);

      // Close (×) — sits in the top-right of each tile, fades in on
      // hover. Click closes the tab via api.tabs.close; the
      // 'tabs-changed' event then re-renders the carousel.
      const closeBtn = document.createElement('span');
      closeBtn.setAttribute('role', 'button');
      closeBtn.setAttribute('aria-label', 'Close tab');
      closeBtn.title = 'Close tab';
      closeBtn.textContent = '×';
      closeBtn.style.cssText = [
        'position:absolute',
        'top:4px', 'right:4px',
        'width:18px', 'height:18px',
        'border-radius:50%',
        'background:rgba(0,0,0,0.35)',
        'color:rgba(255,255,255,0.78)',
        'font:16px/1 "Lucida Grande","Segoe UI",sans-serif',
        'display:flex', 'align-items:center', 'justify-content:center',
        'cursor:pointer',
        'opacity:0',
        'transition:opacity 100ms ease, background 100ms ease, color 100ms ease',
        'pointer-events:auto'
      ].join(';') + ';';
      tile.addEventListener('mouseenter', () => { closeBtn.style.opacity = '1'; });
      tile.addEventListener('mouseleave', () => { closeBtn.style.opacity = '0'; });
      closeBtn.addEventListener('mouseenter', (ev) => {
        ev.stopPropagation();
        closeBtn.style.background = 'rgba(214,48,49,0.85)';
        closeBtn.style.color = '#ffffff';
      });
      closeBtn.addEventListener('mouseleave', (ev) => {
        ev.stopPropagation();
        closeBtn.style.background = 'rgba(0,0,0,0.35)';
        closeBtn.style.color = 'rgba(255,255,255,0.78)';
      });
      closeBtn.addEventListener('click', (ev) => {
        ev.stopPropagation();
        ev.preventDefault();
        api.tabs.close(t.id).catch(() => {});
      });
      tile.appendChild(closeBtn);

      tile.addEventListener('click', (ev) => {
        ev.stopPropagation();
        api.tabs.activate(t.id).then(close).catch(() => {});
      });
      back.appendChild(tile);
    }

    // Floating "+" action — opens a fresh tab pointing at the domain's
    // root. Sits in the bottom-right of the back panel, iTunes glossy
    // convex like the rest of the chrome. Skipped for the "Other"
    // cover since it has no single domain to open.
    if (cover.host && cover.host !== 'Other') {
      const addTab = document.createElement('button');
      addTab.type = 'button';
      addTab.title = 'New tab on ' + cover.host;
      addTab.setAttribute('aria-label', 'New tab on ' + cover.host);
      addTab.textContent = '+';
      addTab.style.cssText = [
        'position:absolute',
        'bottom:14px', 'right:14px',
        'width:38px', 'height:38px',
        'border-radius:50%',
        'background:linear-gradient(180deg,#fbfbfb 0%,#e2e2e2 48%,#c8c8c8 100%)',
        'border:1px solid rgba(0,0,0,0.32)',
        'color:#1c1c1c',
        'font:600 22px/1 "Lucida Grande","Segoe UI",sans-serif',
        'box-shadow:' +
          'inset 0 1px 0 rgba(255,255,255,0.9),' +
          'inset 0 -1px 0 rgba(0,0,0,0.05),' +
          '0 4px 12px rgba(0,0,0,0.35)',
        'cursor:pointer',
        'display:flex', 'align-items:center', 'justify-content:center',
        'padding:0',
        'transition:background 80ms ease, transform 60ms ease, box-shadow 80ms ease',
        'z-index:5'
      ].join(';') + ';';
      addTab.addEventListener('mouseenter', () => {
        addTab.style.background = 'linear-gradient(180deg,#ffffff 0%,#ececec 48%,#d2d2d2 100%)';
      });
      addTab.addEventListener('mouseleave', () => {
        addTab.style.background = 'linear-gradient(180deg,#fbfbfb 0%,#e2e2e2 48%,#c8c8c8 100%)';
      });
      addTab.addEventListener('mousedown', () => {
        addTab.style.transform = 'translateY(1px)';
        addTab.style.background = 'linear-gradient(180deg,#c0c0c0 0%,#b0b0b0 50%,#c0c0c0 100%)';
      });
      addTab.addEventListener('mouseup', () => {
        addTab.style.transform = 'translateY(0)';
      });
      addTab.addEventListener('click', (ev) => {
        ev.stopPropagation();
        ev.preventDefault();
        // Open the domain's root in a new tab. The tabs-changed event
        // will re-render the carousel; the new tab will appear as a
        // new tile in this same cover.
        api.tabs.create('https://' + cover.host).catch(() => {});
      });
      back.appendChild(addTab);
    }

    wrap.appendChild(reflection);
    wrap.appendChild(front);
    wrap.appendChild(back);
    return wrap;
  }

  function render() {
    stage.innerHTML = '';
    coverEls = covers.map(makeCoverEl);
    coverEls.forEach((el) => stage.appendChild(el));
    applyTransforms();
    updateLabel();
  }

  function applyTransforms() {
    const N = coverEls.length;
    if (!N) return;
    centerIndex = Math.max(0, Math.min(N - 1, centerIndex));
    for (let i = 0; i < N; i++) {
      const d = i - centerIndex;
      const ad = Math.abs(d);
      let tx, ry, tz, sc, op, zi;
      if (d === 0) {
        tx = 0; ry = flipped ? 180 : 0; tz = 0; sc = 1; op = 1; zi = 100;
      } else {
        tx = d * STEP_X;
        ry = d > 0 ? -SIDE_ROT : SIDE_ROT;
        tz = SIDE_Z - (ad - 1) * 60;
        sc = Math.max(0.55, 1 - ad * 0.08);
        op = Math.max(0.15, 1 - (ad - 1) * 0.35);
        zi = 50 - ad;
      }
      coverEls[i].style.transform =
        'translateX(' + tx + 'px) translateZ(' + tz + 'px) rotateY(' + ry + 'deg) scale(' + sc + ')';
      coverEls[i].style.opacity = String(op);
      coverEls[i].style.zIndex = String(zi);
    }
  }

  function updateLabel() {
    const c = covers[centerIndex];
    if (!c) { label.textContent = ''; sublabel.textContent = ''; return; }
    label.textContent = c.host;
    sublabel.textContent = c.tabs.length + (c.tabs.length === 1 ? ' tab' : ' tabs');
  }

  // ---- input --------------------------------------------------------
  function moveBy(delta) {
    if (flipped) return; // ignore navigation while flipped
    const next = centerIndex + delta;
    if (next < 0 || next >= covers.length) return;
    centerIndex = next;
    applyTransforms();
    updateLabel();
    playForHost(covers[next].host);
  }

  function flipCenter() {
    const c = covers[centerIndex];
    if (!c) return;
    // Always flip — even for a single-tab cover the user wants the
    // back-side grid (so they can see the tab + close it via the ×).
    flipped = true;
    applyTransforms();
  }

  function unflip() {
    flipped = false;
    applyTransforms();
  }

  // Wheel: horizontal or vertical, throttled.
  let wheelLock = false;
  overlay.addEventListener('wheel', (ev) => {
    ev.preventDefault();
    if (wheelLock || flipped) return;
    const delta = ev.deltaX !== 0 ? ev.deltaX : ev.deltaY;
    if (Math.abs(delta) < 8) return;
    moveBy(delta > 0 ? 1 : -1);
    wheelLock = true;
    setTimeout(() => { wheelLock = false; }, 200);
  }, { passive: false });

  // Click handling on overlay.
  overlay.addEventListener('click', (ev) => {
    // Click on a side cover → move to it. Click on the centered
    // cover toggles flip: forward when not flipped, back when flipped.
    // Tiles and the new-tab button inside the back panel use
    // stopPropagation, so only "background" clicks inside the centered
    // cover reach this handler.
    const coverEl = ev.target.closest('[data-cf-cover]');
    if (coverEl) {
      const idx = parseInt(coverEl.getAttribute('data-cf-cover'), 10);
      if (!Number.isNaN(idx)) {
        if (idx === centerIndex) {
          // Toggle: forward-flip if face-on, un-flip if showing the
          // grid. Either way the same click on the centered cover.
          if (flipped) unflip();
          else flipCenter();
        } else {
          // Side cover → make it the new centre.
          centerIndex = idx;
          flipped = false;
          applyTransforms();
          updateLabel();
          playForHost(covers[centerIndex].host);
        }
      }
      return;
    }
    // Click outside any cover → unflip first, then close.
    if (flipped) unflip();
    else close();
  });

  // Keyboard
  function onKey(ev) {
    if (!isOpen) return;
    if (ev.key === 'Escape') {
      if (flipped) unflip();
      else close();
      ev.preventDefault();
    } else if (ev.key === 'ArrowLeft')  { moveBy(-1); ev.preventDefault(); }
    else if (ev.key === 'ArrowRight') { moveBy(1); ev.preventDefault(); }
    else if (ev.key === 'Enter')      { if (!flipped) flipCenter(); ev.preventDefault(); }
    else if (ev.key === 'm' || ev.key === 'M') {
      // M toggles mute.
      isMuted = !isMuted;
      refreshMuteIcon();
      if (isMuted) stopAudio();
      else if (covers[centerIndex]) playForHost(covers[centerIndex].host);
      ev.preventDefault();
    }
  }
  document.addEventListener('keydown', onKey, true);

  // ---- open/close ---------------------------------------------------
  function open() {
    api.tabs.list().then((tabs) => {
      covers = buildCovers(tabs);
      if (!covers.length) return;
      // Pick the cover containing the active tab as the center, fall
      // back to first cover.
      const active = tabs.find((t) => t.isActive);
      const activeHost = active ? getHost(active.url) : null;
      const idx = activeHost ? covers.findIndex((c) => c.host === activeHost) : 0;
      centerIndex = idx >= 0 ? idx : 0;
      flipped = false;
      render();
      isOpen = true;
      setOpenVisuals(true);
      playForHost(covers[centerIndex].host);
    }).catch(() => {});
  }
  function close() {
    isOpen = false;
    flipped = false;
    setOpenVisuals(false);
    stopAudio();
  }

  pill.addEventListener('click', () => {
    if (isOpen) close();
    else open();
  });

  // Live-refresh the carousel while it's open. Triggered by tabs being
  // closed via our × button, or any other source that mutates tabs
  // (e.g. + tab, navigation, external close). Tries to keep the same
  // domain centered so the user doesn't lose context after a close.
  api.on('tabs-changed', () => {
    if (!isOpen) return;
    api.tabs.list().then((tabs) => {
      const oldHost = covers[centerIndex] && covers[centerIndex].host;
      const nextCovers = buildCovers(tabs);
      if (!nextCovers.length) {
        close();
        return;
      }
      covers = nextCovers;
      const newIdx = oldHost ? covers.findIndex((c) => c.host === oldHost) : -1;
      // If the cover we were on no longer exists (closed the last tab
      // in that domain), un-flip and clamp to a valid index.
      if (newIdx < 0) flipped = false;
      centerIndex = newIdx >= 0 ? newIdx : Math.min(centerIndex, covers.length - 1);
      render();
    }).catch(() => {});
  });

  // Optional global shortcut if permission granted (not declared here
  // by default — declare "global-shortcuts" in the manifest to enable).
  if (api.shortcuts && api.shortcuts.register) {
    api.shortcuts.register('CommandOrControl+Shift+Space').catch(() => {});
    api.on('shortcut-fired', (payload) => {
      if (payload && payload.accelerator === 'CommandOrControl+Shift+Space') {
        if (isOpen) close();
        else open();
      }
    });
  }

  // ---- cleanup ------------------------------------------------------
  return () => {
    try { stopAudio(); } catch {}
    try { document.documentElement.removeAttribute('data-cf-open'); } catch {}
    try { pill.remove(); } catch {}
    try { overlay.remove(); } catch {}
    try { welcomeOverlay.remove(); } catch {}
    try { document.removeEventListener('keydown', onKey, true); } catch {}
  };
})();
