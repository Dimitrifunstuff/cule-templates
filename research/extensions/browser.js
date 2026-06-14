/* ============================================================
   Research — Cule's research overlay. A passthrough chrome
   overlay that captures the
   open tabs of the current workspace into tidy research
   sessions: pick sources, annotate them, group them by site,
   and export the session as Markdown / CSV / JSON.

   Scope: chrome overlay (browser.js) because it needs the
   real-tab API (api.tabs.*). Mounted passthrough, so the
   launcher floats over the page and clicks elsewhere fall
   through. State persists in the overlay's localStorage.
   ============================================================ */
(function () {
  // Never render over Cule's editing UI while the user is in build mode.
  if (document.body.dataset.buildMode === "on") return;

  try {

  // ----------------------------------------------------------
  // STORAGE
  // ----------------------------------------------------------
  const STORE_KEY = "cule.research.state.v1";

  function uid() {
    try {
      if (crypto && crypto.randomUUID) return crypto.randomUUID();
    } catch (e) {}
    return "id-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8);
  }

  function nowISO() { return new Date().toISOString(); }

  function blankSession() {
    const t = nowISO();
    return { id: uid(), title: "", note: "", sources: [], openTabs: [], createdAt: t, updatedAt: t };
  }

  function loadState() {
    let parsed = null;
    try { parsed = JSON.parse(localStorage.getItem(STORE_KEY)); } catch (e) {}
    if (!parsed || !Array.isArray(parsed.sessions) || parsed.sessions.length === 0) {
      const s = blankSession();
      return { currentSessionId: s.id, sessions: [s] };
    }
    // normalise
    parsed.sessions.forEach((s) => {
      if (!s.id) s.id = uid();
      if (!Array.isArray(s.sources)) s.sources = [];
      if (!Array.isArray(s.openTabs)) s.openTabs = [];
      s.sources.forEach((src) => {
        if (!src.id) src.id = uid();
        if (typeof src.note !== "string") src.note = "";
      });
    });
    if (!parsed.sessions.some((s) => s.id === parsed.currentSessionId)) {
      parsed.currentSessionId = parsed.sessions[0].id;
    }
    return parsed;
  }

  let state = loadState();

  let saveTimer = null;
  function persist() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (e) {}
  }
  function persistDebounced() {
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(persist, 400);
  }

  function currentSession() {
    return state.sessions.find((s) => s.id === state.currentSessionId) || state.sessions[0];
  }
  function touchSession() {
    const s = currentSession();
    if (s) s.updatedAt = nowISO();
  }

  // ----------------------------------------------------------
  // URL / DISPLAY HELPERS
  // ----------------------------------------------------------
  function isResearchable(url) {
    return typeof url === "string" && /^https?:\/\//i.test(url);
  }
  function hostOf(url) {
    try { return new URL(url).hostname.replace(/^www\./i, ""); }
    catch (e) { return "other"; }
  }
  function prettyUrl(url) {
    try {
      const u = new URL(url);
      return (u.hostname.replace(/^www\./i, "") + u.pathname).replace(/\/$/, "") || u.hostname;
    } catch (e) { return url; }
  }
  function avatarColor(host) {
    let h = 0;
    for (let i = 0; i < host.length; i++) h = (h * 31 + host.charCodeAt(i)) % 360;
    return `hsl(${h}, 62%, 64%)`;
  }
  // Site icon: the real favicon via Google's S2 service. No extra permission
  // needed — it's just an <img>, and the chrome CSP allows https images. Falls
  // back to the coloured initial (below) if it fails to load.
  function faviconUrl(host) {
    return `https://www.google.com/s2/favicons?sz=32&domain=${encodeURIComponent(host)}`;
  }
  function initials(host) {
    const core = host.replace(/\.(com|net|org|io|co|dev|app|gg|wiki)$/i, "");
    return (core[0] || "?").toUpperCase();
  }
  function fmtDate(iso) {
    try {
      return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
    } catch (e) { return ""; }
  }
  function sessionLabel(s) {
    const title = (s.title || "").trim();
    const base = title || "Untitled session";
    return `${base} · ${s.sources.length} source${s.sources.length === 1 ? "" : "s"}`;
  }

  // ----------------------------------------------------------
  // TINY DOM HELPER
  // ----------------------------------------------------------
  function el(tag, props, kids) {
    const n = document.createElement(tag);
    if (props) {
      for (const k in props) {
        const v = props[k];
        if (v == null) continue;
        if (k === "class") n.className = v;
        else if (k === "style") n.style.cssText = v;
        else if (k === "text") n.textContent = v;
        else if (k === "html") n.innerHTML = v;
        else if (k.slice(0, 2) === "on" && typeof v === "function") n.addEventListener(k.slice(2), v);
        else n.setAttribute(k, v);
      }
    }
    if (kids != null) {
      (Array.isArray(kids) ? kids : [kids]).forEach((kid) => {
        if (kid == null) return;
        n.appendChild(typeof kid === "string" ? document.createTextNode(kid) : kid);
      });
    }
    return n;
  }

  // ----------------------------------------------------------
  // TAB ACCESS
  // ----------------------------------------------------------
  function listOpenTabs() {
    let tabs = [];
    try { tabs = api.tabs.list() || []; } catch (e) { tabs = []; }
    return tabs.filter((t) => t && isResearchable(t.url));
  }

  const selectedUrls = new Set();
  // Hosts collapsed in the saved-sources tree (UI state; survives re-renders).
  const collapsedHosts = new Set();
  let tabSearch = "";
  let tabSort = "order";
  const drag = { active: false, mode: "add", pointerId: null, touched: null };

  function visibleOpenTabs() {
    let tabs = listOpenTabs();
    const q = tabSearch.trim().toLowerCase();
    if (q) {
      tabs = tabs.filter((t) =>
        (t.title || "").toLowerCase().includes(q) || (t.url || "").toLowerCase().includes(q));
    }
    if (tabSort === "site") {
      tabs = tabs.slice().sort((a, b) => hostOf(a.url).localeCompare(hostOf(b.url)) || (a.title || "").localeCompare(b.title || ""));
    } else if (tabSort === "title") {
      tabs = tabs.slice().sort((a, b) => (a.title || "").localeCompare(b.title || ""));
    }
    return tabs;
  }

  // ----------------------------------------------------------
  // EXPORT BUILDERS
  // ----------------------------------------------------------
  function groupedSources(session) {
    const map = new Map();
    session.sources.forEach((src) => {
      const host = src.host || hostOf(src.url);
      if (!map.has(host)) map.set(host, []);
      map.get(host).push(src);
    });
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }

  function buildMarkdown(session) {
    const lines = [];
    lines.push(`# ${session.title || "Research session"}`);
    lines.push("");
    if (session.note) { lines.push(session.note); lines.push(""); }
    lines.push(`_${session.sources.length} source${session.sources.length === 1 ? "" : "s"} · exported ${fmtDate(nowISO())}_`);
    lines.push("");
    groupedSources(session).forEach(([host, sources]) => {
      lines.push(`## ${host}`);
      lines.push("");
      sources.forEach((src) => {
        lines.push(`- [${src.title || src.url}](${src.url})`);
        if (src.note && src.note.trim()) {
          src.note.trim().split(/\n+/).forEach((ln) => lines.push(`  - ${ln}`));
        }
        // Legacy standalone quote sources kept their text on src.text.
        if (src.type === "quote" && src.text) {
          String(src.text).trim().split(/\n+/).forEach((ln) => lines.push(`  - > ${ln}`));
        }
        (Array.isArray(src.quotes) ? src.quotes : []).forEach((q) => {
          const qt = String(q.text || "").trim();
          if (qt) qt.split(/\n+/).forEach((ln) => lines.push(`  - > ${ln}`));
          if (q.note && q.note.trim()) lines.push(`    - ${q.note.trim()}`);
        });
        (Array.isArray(src.clips) ? src.clips : []).forEach((clip) => {
          lines.push(`  - ![${(clip.note || "clip").replace(/\n+/g, " ")}](${clip.image})`);
        });
      });
      lines.push("");
    });
    return lines.join("\n").trim() + "\n";
  }

  function csvCell(v) {
    const s = String(v == null ? "" : v);
    return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  }
  function buildCsv(session) {
    const rows = [["Site", "Title", "URL", "Note"]];
    session.sources.forEach((src) => {
      rows.push([src.host || hostOf(src.url), src.title || "", src.url, src.note || ""]);
    });
    return rows.map((r) => r.map(csvCell).join(",")).join("\r\n") + "\r\n";
  }

  function buildJson(session) {
    return JSON.stringify({
      title: session.title || "",
      note: session.note || "",
      exportedAt: nowISO(),
      sources: session.sources.map((s) => ({
        title: s.title || "", url: s.url, site: s.host || hostOf(s.url), note: s.note || ""
      }))
    }, null, 2);
  }

  function buildWhatsApp(session) {
    const parts = [];
    parts.push(`*${session.title || "Research session"}*`);
    if (session.note) parts.push(session.note);
    session.sources.forEach((src) => {
      parts.push(`• ${src.title || src.url}\n${src.url}`);
    });
    return parts.join("\n\n");
  }

  // ----------------------------------------------------------
  // OUTPUT: download + clipboard
  // ----------------------------------------------------------
  function slug(session) {
    return (session.title || "research-session").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 50) || "research-session";
  }
  function download(filename, text, mime) {
    try {
      const blob = new Blob([text], { type: mime || "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = el("a", { href: url, download: filename });
      document.body.appendChild(a);
      a.click();
      setTimeout(() => { a.remove(); URL.revokeObjectURL(url); }, 1000);
      return true;
    } catch (e) { return false; }
  }
  async function copyText(text) {
    try {
      if (api.clipboard && api.clipboard.write) { await api.clipboard.write(text); return true; }
    } catch (e) {}
    try {
      const ta = el("textarea", { style: "position:fixed;opacity:0;left:-9999px;" });
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand("copy");
      ta.remove();
      return ok;
    } catch (e) { return false; }
  }

  // ----------------------------------------------------------
  // OVERLAY DOM
  // ----------------------------------------------------------
  // The launcher lives in one of two places depending on the host:
  //  • New Cule builds expose api.actions and render a declarative
  //    top-bar button (browser.chrome.actions in the mode JSON). We use
  //    that — the trigger sits in the navbar next to the mode button —
  //    and skip the floating pill entirely.
  //  • Older builds have neither, so we fall back to the floating pill.
  // The fab element is always created (so the rest of the code can poke
  // it without guards) but only mounted in the fallback case.
  const hasToolbar = !!(api && api.actions && typeof api.actions.set === "function");
  // Newer Cule builds also expose per-tab action buttons: a "+"/"✓"
  // capture control rendered inside every tab (browser.chrome.tabActions
  // + api.tabs.setActionState). When present, people can drop a tab into
  // the session straight from the tab strip — no panel needed. On older
  // hosts the event never fires and the panel checklist stays the only
  // way in, so everything below still works unchanged.
  const hasTabActions = !!(api && api.tabs && typeof api.tabs.setActionState === "function");
  const root = el("div", { class: "rt-root" });
  const fab = el("button", { class: "rt-fab", type: "button", title: "Research sessions" }, [
    el("span", { class: "rt-fab__dot" }),
    el("span", { class: "rt-fab__label", text: "Research" }),
    el("span", { class: "rt-fab__count rt-js-fabcount", text: "0" }),
    el("span", { class: "rt-fab__chev", text: "›" })
  ]);
  root.appendChild(fab);
  if (!hasToolbar) document.body.appendChild(root);

  const panel = el("div", { class: "rt-panel" });
  panel.hidden = true;
  document.body.appendChild(panel);

  // Research home — a full-content-area "start page" shown when the
  // active tab is on browser://newtab (reach it via the Home button, an
  // empty address-bar Enter, or by typing the URL). It lives here in the
  // chrome sandbox — NOT as a static internalPages document — precisely
  // so it can show LIVE session data; a page loaded in a webview has no
  // access to this store. Mounted absolute+inset:0 so it fills exactly
  // the page area: the native tab strip and address bar stay visible and
  // usable above it (the overlay root is confined to .browser-content).
  const home = el("div", { class: "rt-home" });
  home.hidden = true;
  document.body.appendChild(home);

  let panelOpen = false;
  const refs = {};

  function buildPanel() {
    panel.innerHTML = "";

    // Header
    const head = el("div", { class: "rt-head" }, [
      el("div", { class: "rt-head__brand" }, [
        el("div", { class: "rt-head__logo", text: "✦" }),
        el("div", {}, [
          el("h2", { class: "rt-head__title", text: "Research" }),
          el("p", { class: "rt-head__sub", text: "Capture tabs into tidy sessions" })
        ])
      ]),
      el("div", { class: "rt-head__actions" }, [
        el("button", { class: "rt-iconbtn", type: "button", title: "Close", onclick: closePanel, text: "×" })
      ])
    ]);
    panel.appendChild(head);

    const scroll = el("div", { class: "rt-panel__scroll" });
    panel.appendChild(scroll);

    // (The mini "how it works" handbook was removed — the panel is small
    // enough now to be self-explanatory.)

    // --- Session bar ---
    const sessionBar = el("div", { class: "rt-sessionbar" });
    const sessionSelect = el("select", { class: "rt-select", onchange: (e) => switchSession(e.target.value) });
    refs.sessionSelect = sessionSelect;
    sessionBar.appendChild(el("div", { class: "rt-sessionbar__row" }, [
      sessionSelect,
      el("button", { class: "rt-btn rt-btn--ghost rt-btn--tiny", type: "button", text: "New", onclick: newSession }),
      el("button", { class: "rt-btn rt-btn--ghost rt-btn--tiny", type: "button", text: "Delete", onclick: deleteSession })
    ]));

    const titleInput = el("input", {
      class: "rt-input", type: "text", placeholder: "Session title",
      oninput: (e) => { currentSession().title = e.target.value; touchSession(); refreshSessionLabels(); persistDebounced(); }
    });
    refs.titleInput = titleInput;
    sessionBar.appendChild(el("div", { class: "rt-field" }, [titleInput]));

    const noteInput = el("textarea", {
      class: "rt-textarea", placeholder: "What is this session about?",
      oninput: (e) => { currentSession().note = e.target.value; touchSession(); persistDebounced(); }
    });
    refs.noteInput = noteInput;
    sessionBar.appendChild(noteInput);
    scroll.appendChild(sessionBar);

    // Primary capture: one click saves the current tab. (You can also click
    // the "+" on any tab in the tab strip.)
    scroll.appendChild(el("div", { class: "rt-capturebar" }, [
      el("button", { class: "rt-btn rt-btn--primary rt-btn--block", type: "button", text: "＋  Save this tab", onclick: captureActiveTab })
    ]));

    // (The old "Open tabs" picker — search / sort / multi-select / drag — was
    // removed. Capture is now just "Save this tab" above + the tab-strip "+".
    // renderTabs / addSelected / the drag helpers remain defined but unused;
    // they all guard on refs.tabsList, so they're harmless no-ops now.)

    scroll.appendChild(el("hr", { class: "rt-divider" }));

    // --- Saved sources section ---
    const savedSec = el("div", { class: "rt-section" });
    savedSec.appendChild(el("div", { class: "rt-section__head" }, [
      el("p", { class: "rt-eyebrow", text: "Saved sources" }),
      el("span", { class: "rt-badge rt-js-savedcount", text: "0" })
    ]));
    const savedList = el("div", { class: "rt-list" });
    refs.savedList = savedList;
    savedSec.appendChild(savedList);

    savedSec.appendChild(el("div", { class: "rt-btnrow", style: "margin-top:12px;" }, [
      el("button", { class: "rt-btn rt-btn--ghost rt-btn--tiny", type: "button", text: "Open all in tabs", onclick: openAllSources }),
      el("button", { class: "rt-btn rt-btn--ghost rt-btn--tiny", type: "button", text: "Copy as Markdown", onclick: () => doCopy(buildMarkdown(currentSession()), "Markdown copied to clipboard") })
    ]));
    scroll.appendChild(savedSec);

    scroll.appendChild(el("hr", { class: "rt-divider" }));

    // --- Export section ---
    const exportSec = el("div", { class: "rt-section" });
    exportSec.appendChild(el("p", { class: "rt-eyebrow", style: "margin-bottom:10px;", text: "Export session" }));
    exportSec.appendChild(el("div", { class: "rt-btnrow" }, [
      el("button", { class: "rt-btn rt-btn--light rt-btn--tiny", type: "button", text: "Markdown", onclick: () => doDownload(slug(currentSession()) + ".md", buildMarkdown(currentSession()), "text/markdown") }),
      el("button", { class: "rt-btn rt-btn--light rt-btn--tiny", type: "button", text: "CSV", onclick: () => doDownload(slug(currentSession()) + ".csv", buildCsv(currentSession()), "text/csv") }),
      el("button", { class: "rt-btn rt-btn--light rt-btn--tiny", type: "button", text: "JSON", onclick: () => doDownload(slug(currentSession()) + ".json", buildJson(currentSession()), "application/json") })
    ]));
    exportSec.appendChild(el("div", { class: "rt-btnrow", style: "margin-top:8px;" }, [
      el("button", { class: "rt-btn rt-btn--ghost rt-btn--tiny", type: "button", text: "Google Docs", onclick: shareDocs }),
      el("button", { class: "rt-btn rt-btn--ghost rt-btn--tiny", type: "button", text: "Google Sheets", onclick: shareSheets }),
      el("button", { class: "rt-btn rt-btn--ghost rt-btn--tiny", type: "button", text: "WhatsApp", onclick: shareWhatsApp })
    ]));
    refs.status = el("p", { class: "rt-status" });
    exportSec.appendChild(refs.status);
    scroll.appendChild(exportSec);
  }

  // ----------------------------------------------------------
  // RENDER
  // ----------------------------------------------------------
  function refreshSessionLabels() {
    if (!refs.sessionSelect) return;
    [...refs.sessionSelect.options].forEach((opt) => {
      const s = state.sessions.find((x) => x.id === opt.value);
      if (s) opt.textContent = sessionLabel(s);
    });
  }

  function renderSessionBar() {
    const s = currentSession();
    refs.sessionSelect.innerHTML = "";
    state.sessions.forEach((sess) => {
      refs.sessionSelect.appendChild(el("option", { value: sess.id, text: sessionLabel(sess) }));
    });
    refs.sessionSelect.value = s.id;
    refs.titleInput.value = s.title || "";
    refs.noteInput.value = s.note || "";
  }

  function renderTabs() {
    if (!refs.tabsList) return;
    const tabs = visibleOpenTabs();
    refs.tabsList.innerHTML = "";
    if (tabs.length === 0) {
      refs.tabsList.appendChild(el("div", { class: "rt-empty", text: "No matching open tabs in this workspace." }));
    } else {
      tabs.forEach((t) => {
        const host = hostOf(t.url);
        const selected = selectedUrls.has(t.url);
        const row = el("div", {
          class: "rt-row" + (selected ? " rt-row--selected" : ""),
          "data-url": t.url
        }, [
          el("input", { class: "rt-row__check", type: "checkbox", ...(selected ? { checked: "checked" } : {}) }),
          el("span", { class: "rt-ava", style: `background:${avatarColor(host)}`, text: initials(host) }),
          el("div", { class: "rt-row__body" }, [
            el("div", { class: "rt-row__title", text: t.title || prettyUrl(t.url) }),
            el("div", { class: "rt-row__url", text: prettyUrl(t.url) })
          ])
        ]);
        refs.tabsList.appendChild(row);
      });
    }
    updateCounts();
  }

  function renderSaved() {
    if (!refs.savedList) return;
    const s = currentSession();
    refs.savedList.innerHTML = "";
    if (s.sources.length === 0) {
      refs.savedList.appendChild(el("div", { class: "rt-empty", text: "No saved sources yet. Select open tabs above and add them." }));
    } else {
      groupedSources(s).forEach(([host, sources]) => {
        const body = el("div", { class: "rt-group__body" });
        sources.forEach((src) => {
          const note = el("textarea", {
            class: "rt-textarea rt-source__note", placeholder: "Notes on this source…",
            oninput: (e) => { src.note = e.target.value; touchSession(); persistDebounced(); }
          });
          note.value = src.note || "";
          // Clips (region snips) saved on this page, each with its own note.
          const clipsWrap = el("div", { class: "rt-clips" });
          (Array.isArray(src.clips) ? src.clips : []).forEach((clip) => {
            const cnote = el("input", {
              class: "rt-input rt-clip__note", type: "text", placeholder: "Note for this clip…",
              oninput: (e) => { clip.note = e.target.value; touchSession(); persistDebounced(); }
            });
            cnote.value = clip.note || "";
            clipsWrap.appendChild(el("div", { class: "rt-clip" }, [
              el("img", { class: "rt-clip__img", src: clip.image, alt: "", title: "Click to enlarge", onclick: () => openClip(clip.image) }),
              el("div", { class: "rt-clip__body" }, [cnote]),
              el("button", { class: "rt-clip__remove", type: "button", title: "Remove clip", text: "×", onclick: () => removeClip(src, clip.id) })
            ]));
          });
          // Quotes (clipped text) saved on this page, each with its own note.
          const quotesWrap = el("div", { class: "rt-quotes" });
          (Array.isArray(src.quotes) ? src.quotes : []).forEach((q) => {
            const qnote = el("input", {
              class: "rt-input rt-quote__note", type: "text", placeholder: "Note for this quote…",
              oninput: (e) => { q.note = e.target.value; touchSession(); persistDebounced(); }
            });
            qnote.value = q.note || "";
            quotesWrap.appendChild(el("div", { class: "rt-quote" }, [
              el("blockquote", { class: "rt-quote__text", text: q.text }),
              el("div", { class: "rt-quote__body" }, [qnote]),
              el("button", { class: "rt-quote__remove", type: "button", title: "Remove quote", text: "×", onclick: () => removeQuote(src, q.id) })
            ]));
          });
          body.appendChild(el("div", { class: "rt-source" }, [
            el("div", { class: "rt-source__top" }, [
              el("div", { class: "rt-source__main" }, [
                src.url
                  ? el("div", { class: "rt-source__title", title: "Open in a new tab", text: src.title || prettyUrl(src.url), onclick: () => openOne(src.url) })
                  : el("div", { class: "rt-source__title rt-source__title--plain", text: src.title || "Clipped text" }),
                ...(src.type === "quote" && src.text ? [el("blockquote", { class: "rt-source__quote", text: src.text })] : []),
                ...(src.url ? [el("span", { class: "rt-source__url", text: prettyUrl(src.url) })] : [])
              ]),
              el("button", { class: "rt-source__remove", type: "button", title: "Remove source", text: "×", onclick: () => removeSource(src.id) })
            ]),
            note,
            quotesWrap,
            clipsWrap
          ]));
        });
        const collapsed = collapsedHosts.has(host);
        // Real favicon, falling back to the coloured initial if it 404s.
        const fav = el("img", { class: "rt-fav", src: faviconUrl(host), alt: "" });
        fav.addEventListener("error", () => {
          try { fav.replaceWith(el("span", { class: "rt-ava", style: `background:${avatarColor(host)}`, text: initials(host) })); } catch (_) {}
        });
        const head = el("div", { class: "rt-group__head", title: collapsed ? "Show sources" : "Hide sources" }, [
          el("span", { class: "rt-group__chev", text: "▾" }),
          fav,
          el("span", { class: "rt-group__name", text: host }),
          el("span", { class: "rt-group__count", text: String(sources.length) })
        ]);
        head.addEventListener("click", () => {
          if (collapsedHosts.has(host)) collapsedHosts.delete(host); else collapsedHosts.add(host);
          renderSaved();
        });
        refs.savedList.appendChild(el("div", {
          class: "rt-group" + (collapsed ? " rt-group--collapsed" : ""),
          style: `--rt-site:${avatarColor(host)}`
        }, [head, body]));
      });
    }
    updateCounts();
  }

  function updateCounts() {
    const s = currentSession();
    const fabCount = root.querySelector(".rt-js-fabcount");
    if (fabCount) fabCount.textContent = String(s.sources.length);
    if (hasToolbar) {
      // Mirror the source count onto the top-bar button. Empty string
      // hides the badge (the host treats "" / "0" as no badge).
      try { api.actions.set("research", { badge: s.sources.length ? String(s.sources.length) : "" }); }
      catch (_) {}
    }
    const savedCount = panel.querySelector(".rt-js-savedcount");
    if (savedCount) savedCount.textContent = String(s.sources.length);
    if (refs.addBtn) {
      refs.addBtn.disabled = selectedUrls.size === 0;
      refs.addBtn.textContent = selectedUrls.size > 0 ? `Add ${selectedUrls.size} to sources` : "Add selected to sources";
    }
  }

  function setStatus(msg) {
    if (!refs.status) return;
    refs.status.textContent = msg || "";
    if (msg) {
      clearTimeout(setStatus._t);
      setStatus._t = setTimeout(() => { if (refs.status) refs.status.textContent = ""; }, 3200);
    }
  }

  // ----------------------------------------------------------
  // ACTIONS
  // ----------------------------------------------------------
  function toggleSelect(url) {
    if (selectedUrls.has(url)) selectedUrls.delete(url);
    else selectedUrls.add(url);
    renderTabs();
  }
  function selectAllVisible() {
    visibleOpenTabs().forEach((t) => selectedUrls.add(t.url));
    renderTabs();
  }
  function clearSelection() {
    selectedUrls.clear();
    renderTabs();
  }

  function addSelected() {
    if (selectedUrls.size === 0) return;
    const s = currentSession();
    const existing = new Set(s.sources.map((src) => src.url));
    let added = 0;
    listOpenTabs().forEach((t) => {
      if (selectedUrls.has(t.url) && !existing.has(t.url)) {
        s.sources.push({ id: uid(), url: t.url, title: t.title || prettyUrl(t.url), host: hostOf(t.url), note: "" });
        existing.add(t.url);
        added++;
      }
    });
    selectedUrls.clear();
    touchSession();
    persist();
    renderTabs();
    renderSaved();
    decorateOpenTabs();
    setStatus(added > 0 ? `Added ${added} source${added === 1 ? "" : "s"}.` : "Those tabs are already saved.");
  }

  function removeSource(id) {
    const s = currentSession();
    s.sources = s.sources.filter((src) => src.id !== id);
    touchSession();
    persist();
    renderSaved();
    refreshSessionLabels();
    decorateOpenTabs();
  }

  // ----------------------------------------------------------
  // DIRECT CAPTURE FROM THE TAB STRIP (browser.chrome.tabActions)
  // ----------------------------------------------------------
  // The "+" button on each tab toggles that one tab in/out of the
  // current session without opening the panel. captureUrlSet is the
  // source of truth for "is this tab captured"; decorateOpenTabs reflects
  // it onto every tab's button; toggleCaptureTab handles a click.
  function captureUrlSet() {
    return new Set(currentSession().sources.map((src) => src.url));
  }
  async function decorateOpenTabs() {
    if (!hasTabActions) return;
    const captured = captureUrlSet();
    let tabs = [];
    try { tabs = (await api.tabs.list()) || []; } catch (_) { tabs = []; }
    tabs.forEach((t) => {
      if (!t || !t.id) return;
      try { api.tabs.setActionState(t.id, "capture", captured.has(t.url)); } catch (_) {}
    });
  }
  // A chrome re-render rebuilds the tab strip and resets every action
  // button to its resting look, and the host fires its tab events just
  // BEFORE it re-renders — so we re-apply on the next tick, once the new
  // tab strip DOM exists, rather than synchronously.
  function scheduleDecorate() {
    if (!hasTabActions) return;
    setTimeout(() => { try { decorateOpenTabs(); } catch (_) {} }, 0);
  }
  // Save the CURRENT tab to the session in one click. api.tabs.current() is
  // ASYNC (returns a Promise), so it must be awaited — the old code treated
  // tab reads as synchronous, which is the core reason saving did nothing.
  async function captureActiveTab() {
    let t = null;
    try { t = await api.tabs.current(); } catch (_) {}
    if (!t || !isResearchable(t.url)) { setStatus("This page can't be saved."); return; }
    const s = currentSession();
    if (s.sources.some((src) => src.url === t.url)) { setStatus("Already in this session."); return; }
    s.sources.push({ id: uid(), url: t.url, title: t.title || prettyUrl(t.url), host: hostOf(t.url), note: "" });
    touchSession();
    persist();
    decorateOpenTabs();
    renderSaved();
    updateCounts();
    refreshSessionLabels();
    setStatus("Saved this tab to your session.");
  }

  // Snip a region of the current page. The drag-to-select overlay AND the
  // preview-with-note popup both run INSIDE the page (api.tabs.snipRegion),
  // because a chrome-side overlay can't catch the mouse/Esc over a <webview>.
  // The host captures + crops and returns { image, note }.
  async function doSnip() {
    let t = null;
    try { t = await api.tabs.current(); } catch (_) {}
    if (!t || !isResearchable(t.url)) { setStatus("Open a normal web page to snip."); return; }
    setStatus("Drag a box on the page to snip… (Esc to cancel)");
    let res = null;
    try { res = await api.tabs.snipRegion(); } catch (_) {}
    if (!res || !res.image) { setStatus("Snip cancelled."); return; }
    const s = currentSession();
    let src = s.sources.find((x) => x.url === t.url && x.type !== "quote");
    if (!src) {
      src = { id: uid(), url: t.url, title: t.title || prettyUrl(t.url), host: hostOf(t.url), note: "", clips: [], quotes: [] };
      s.sources.push(src);
    }
    if (!Array.isArray(src.clips)) src.clips = [];
    src.clips.push({ id: uid(), image: res.image, note: (res.note || "").slice(0, 2000) });
    touchSession();
    persist();
    decorateOpenTabs();
    renderSaved();
    updateCounts();
    refreshSessionLabels();
    toast("Snipped ✓");
    setStatus("Clip saved under its page — add a note if you like.");
  }

  function removeClip(src, clipId) {
    if (!src) return;
    src.clips = (Array.isArray(src.clips) ? src.clips : []).filter((c) => c.id !== clipId);
    touchSession(); persist(); renderSaved(); updateCounts();
  }
  function removeQuote(src, quoteId) {
    if (!src) return;
    src.quotes = (Array.isArray(src.quotes) ? src.quotes : []).filter((q) => q.id !== quoteId);
    touchSession(); persist(); renderSaved(); updateCounts();
  }
  // Small success cue — a pill that slides in at the top, then fades out.
  function toast(msg) {
    try {
      const t = el("div", { class: "rt-toast" });
      t.textContent = msg;
      document.body.appendChild(t);
      setTimeout(() => { try { t.classList.add("rt-toast--show"); } catch (_) {} }, 10);
      setTimeout(() => {
        try { t.classList.remove("rt-toast--show"); } catch (_) {}
        setTimeout(() => { try { t.remove(); } catch (_) {} }, 260);
      }, 1500);
    } catch (_) {}
  }
  function openClip(image) {
    const o = el("div", { class: "rt-snip", onclick: () => { try { o.remove(); } catch (_) {} } });
    o.appendChild(el("img", { class: "rt-snip__img", src: image, draggable: "false" }));
    o.appendChild(el("div", { class: "rt-snip__hint", text: "Click to close" }));
    document.body.appendChild(o);
  }
  async function toggleCaptureTab(tabId) {
    let tab = null;
    // api.tabs.list() is ASYNC (a Promise) — await it, or the lookup runs on a
    // Promise and the "+" silently does nothing. tabId is a DOM string while
    // ids are numbers, so compare as strings.
    try {
      const tabs = (await api.tabs.list()) || [];
      tab = tabs.find((t) => t && String(t.id) === String(tabId));
    } catch (_) {}
    if (!tab || !isResearchable(tab.url)) return;
    const s = currentSession();
    const idx = s.sources.findIndex((src) => src.url === tab.url);
    let added;
    if (idx >= 0) {
      s.sources.splice(idx, 1);
      added = false;
    } else {
      s.sources.push({ id: uid(), url: tab.url, title: tab.title || prettyUrl(tab.url), host: hostOf(tab.url), note: "" });
      added = true;
    }
    touchSession();
    persist();
    // The clicked tab is still in the live DOM (no re-render happened),
    // so flip it immediately for instant feedback, then sync the rest.
    decorateOpenTabs();
    updateCounts();
    refreshSessionLabels();
    if (panelOpen) { try { renderSaved(); } catch (_) {} }
    setStatus(added ? "Added to your session." : "Removed from your session.");
  }

  // Zero-source capture: the user copies text on the page (Ctrl+C),
  // then clicks the top-bar "Clip" button. We read the clipboard here
  // in the chrome sandbox and store it as a quote card in the active
  // session, attributing it to whatever tab is active. No page
  // injection or host bridge needed — just the existing clipboard verb.
  async function addQuoteFromClipboard() {
    // Grab whatever the user has highlighted on the page. (Falls back to the
    // clipboard for hosts that don't expose a selection.)
    let text = "";
    try { text = (await api.tabs.getSelection()) || ""; } catch (_) { text = ""; }
    text = String(text).trim();
    if (!text && api.clipboard && api.clipboard.read) {
      try { text = String((await api.clipboard.read()) || "").trim(); } catch (_) { text = ""; }
    }
    if (!text) {
      setStatus("Highlight some text on the page first, then click Clip.");
      return;
    }
    // api.tabs.current() is ASYNC — without await, url is empty and the quote
    // lands on a stray "Clipped text" card instead of attaching to its page.
    let tab = null;
    try { tab = await api.tabs.current(); } catch (_) {}
    const url = tab && tab.url ? tab.url : "";
    const title = (tab && tab.title) ? tab.title : (url ? prettyUrl(url) : "Clipped text");
    const s = currentSession();
    // Attach the quote to the page it came from (nested), creating that page
    // source if it isn't saved yet — so quotes land on the right source.
    let src = url ? s.sources.find((x) => x.url === url && x.type !== "quote") : null;
    if (!src) {
      src = { id: uid(), url: url, title: title, host: hostOf(url), note: "", clips: [], quotes: [] };
      s.sources.push(src);
    }
    if (!Array.isArray(src.quotes)) src.quotes = [];
    src.quotes.push({ id: uid(), text: text.slice(0, 4000), note: "" });
    touchSession();
    persist();
    updateCounts();          // bumps the top-bar badge → visible even when the panel is closed
    refreshSessionLabels();
    if (panelOpen) { try { renderSaved(); } catch (_) {} }
    toast("Clipped ✓");
    setStatus("Saved quote under its page ✓");
  }

  function openOne(url) {
    try { api.tabs.create(url); } catch (e) {}
  }
  function openAllSources() {
    const s = currentSession();
    if (s.sources.length === 0) { setStatus("No sources to open."); return; }
    s.sources.forEach((src) => { try { api.tabs.create(src.url); } catch (e) {} });
    setStatus(`Opened ${s.sources.length} tab${s.sources.length === 1 ? "" : "s"}.`);
  }

  // Snapshot the currently-open (researchable) tabs onto the current session so
  // they can be restored later. Returns the raw tab list (with ids) for closing.
  async function snapshotOpenTabs() {
    let tabs = [];
    try { tabs = (await api.tabs.list()) || []; } catch (_) { tabs = []; }
    const cur = currentSession();
    if (cur) {
      cur.openTabs = tabs
        .filter((t) => t && isResearchable(t.url))
        .map((t) => ({ url: t.url, title: t.title || prettyUrl(t.url) }));
    }
    return tabs;
  }
  // Open a session's stored tabs (or one fresh tab), then close the tabs that
  // were open before. Opening first guarantees the window never hits zero tabs.
  async function reopenSessionTabs(session, prevTabs) {
    const list = (session && Array.isArray(session.openTabs)) ? session.openTabs.filter((t) => t && t.url) : [];
    if (list.length) {
      list.forEach((t) => { try { api.tabs.create(t.url); } catch (_) {} });
    } else {
      try { api.tabs.create(); } catch (_) {}
    }
    (prevTabs || []).forEach((t) => { if (t && t.id != null) { try { api.tabs.close(t.id); } catch (_) {} } });
  }

  async function switchSession(id) {
    if (!state.sessions.some((s) => s.id === id)) return;
    if (id === state.currentSessionId) return;
    const prevTabs = await snapshotOpenTabs();   // save the leaving session's tabs
    state.currentSessionId = id;
    selectedUrls.clear();
    persist();
    renderSessionBar();
    renderTabs();
    renderSaved();
    decorateOpenTabs();
    await reopenSessionTabs(currentSession(), prevTabs);  // restore this session's tabs
    setStatus("Switched session.");
  }
  // New session: stash the current session's open tabs, then clear the
  // workspace (open one fresh tab, close the rest). The previous session keeps
  // its tabs — selecting it again re-opens them.
  async function newSession() {
    const prevTabs = await snapshotOpenTabs();
    const s = blankSession();
    state.sessions.push(s);
    state.currentSessionId = s.id;
    selectedUrls.clear();
    persist();
    renderSessionBar();
    renderTabs();
    renderSaved();
    decorateOpenTabs();
    await reopenSessionTabs(s, prevTabs);   // fresh tab + close the old ones
    setStatus("New session — your previous tabs are saved in the last session.");
    setTimeout(() => { if (refs.titleInput) refs.titleInput.focus(); }, 60);
  }
  function deleteSession() {
    if (state.sessions.length <= 1) {
      // reset the only session instead of leaving none
      const fresh = blankSession();
      state.sessions = [fresh];
      state.currentSessionId = fresh.id;
    } else {
      const id = state.currentSessionId;
      state.sessions = state.sessions.filter((s) => s.id !== id);
      state.currentSessionId = state.sessions[0].id;
    }
    selectedUrls.clear();
    persist();
    renderSessionBar();
    renderTabs();
    renderSaved();
    decorateOpenTabs();
    setStatus("Session deleted.");
  }

  function doDownload(name, text, mime) {
    const ok = download(name, text, mime);
    setStatus(ok ? `Downloaded ${name}.` : "Download blocked — try Copy instead.");
  }
  async function doCopy(text, okMsg) {
    const ok = await copyText(text);
    setStatus(ok ? okMsg : "Could not access the clipboard.");
  }
  async function shareDocs() {
    await copyText(buildMarkdown(currentSession()));
    try { api.tabs.create("https://docs.new"); } catch (e) {}
    setStatus("Markdown copied — paste it into the new Google Doc.");
  }
  async function shareSheets() {
    await copyText(buildCsv(currentSession()).replace(/,/g, "\t"));
    try { api.tabs.create("https://sheets.new"); } catch (e) {}
    setStatus("Rows copied — paste them into the new Google Sheet.");
  }
  function shareWhatsApp() {
    const msg = buildWhatsApp(currentSession());
    try { api.tabs.create("https://wa.me/?text=" + encodeURIComponent(msg)); } catch (e) {}
    setStatus("Opened WhatsApp with your sources.");
  }

  // ----------------------------------------------------------
  // DRAG-SELECT (open tabs) + HELP
  // ----------------------------------------------------------
  function rowAt(x, y) {
    const n = document.elementFromPoint(x, y);
    return n && n.closest ? n.closest(".rt-row") : null;
  }
  // Toggle one row's selection exactly once per drag, following the mode the
  // drag started in (add vs remove), and reflect it without a full re-render.
  function applyDragTo(rowEl) {
    if (!rowEl || !rowEl.dataset) return;
    const url = rowEl.dataset.url;
    if (!url || !drag.touched || drag.touched.has(url)) return;
    drag.touched.add(url);
    if (drag.mode === "remove") selectedUrls.delete(url);
    else selectedUrls.add(url);
    const on = selectedUrls.has(url);
    rowEl.classList.toggle("rt-row--selected", on);
    const cb = rowEl.querySelector(".rt-row__check");
    if (cb) cb.checked = on;
    updateCounts();
  }
  function onTabsPointerDown(e) {
    const rowEl = e.target && e.target.closest ? e.target.closest(".rt-row") : null;
    if (!rowEl || !rowEl.dataset || !rowEl.dataset.url) return;
    drag.active = true;
    drag.pointerId = e.pointerId;
    drag.touched = new Set();
    // If the first row is already selected we're de-selecting the range.
    drag.mode = selectedUrls.has(rowEl.dataset.url) ? "remove" : "add";
    try { refs.tabsList.setPointerCapture(e.pointerId); } catch (_) {}
    applyDragTo(rowEl);
  }
  function onTabsPointerMove(e) {
    if (!drag.active || e.pointerId !== drag.pointerId) return;
    applyDragTo(rowAt(e.clientX, e.clientY));
  }
  function onTabsPointerUp(e) {
    if (!drag.active || e.pointerId !== drag.pointerId) return;
    drag.active = false;
    drag.pointerId = null;
    drag.touched = null;
    try { if (refs.tabsList.hasPointerCapture(e.pointerId)) refs.tabsList.releasePointerCapture(e.pointerId); } catch (_) {}
  }
  function toggleHelp() {
    if (refs.help) refs.help.hidden = !refs.help.hidden;
  }

  // ----------------------------------------------------------
  // OPEN / CLOSE
  // ----------------------------------------------------------
  // Reflect open/closed on whichever launcher is showing: the top-bar
  // button (active state) on new hosts, or the floating pill on old ones.
  function setLauncherOpen(open) {
    if (hasToolbar) {
      try { api.actions.set("research", { active: !!open }); } catch (_) {}
    } else {
      fab.classList.toggle("rt-fab--open", !!open);
    }
  }
  function openPanel() {
    // Show the panel FIRST so nothing below can keep it closed, then fill it
    // in. Each render is isolated: if one throws, the panel still opens and
    // the failure is logged instead of silently swallowing the click.
    panel.hidden = false;
    panelOpen = true;
    setLauncherOpen(true);
    try { renderSessionBar(); } catch (e) { try { console.warn("[Research] renderSessionBar failed", e); } catch (_) {} }
    try { renderTabs(); } catch (e) { try { console.warn("[Research] renderTabs failed", e); } catch (_) {} }
    try { renderSaved(); } catch (e) { try { console.warn("[Research] renderSaved failed", e); } catch (_) {} }
  }
  function closePanel() {
    panelOpen = false;
    setLauncherOpen(false);
    panel.hidden = true;
  }
  // Toggle on EITHER click or pointerup. In a passthrough overlay the chrome
  // behind can swallow the mousedown, so a plain "click" (which needs the
  // press AND release on the same target) sometimes never fires — pointerup
  // still does. A short time-guard stops the paired events double-toggling.
  let lastToggle = 0;
  function togglePanel() {
    const now = Date.now();
    if (now - lastToggle < 250) return;
    lastToggle = now;
    try { if (panelOpen) closePanel(); else openPanel(); }
    catch (e) { try { console.warn("[Research] toggle failed", e); } catch (_) {} }
  }
  fab.addEventListener("click", togglePanel);
  fab.addEventListener("pointerup", togglePanel);
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && panelOpen) closePanel(); });

  // ----------------------------------------------------------
  // RESEARCH HOME (start page on browser://newtab)
  // ----------------------------------------------------------
  function isHomeSurface(url) {
    if (typeof url !== "string") return false;
    const u = url.trim().toLowerCase();
    if (!u) return false;
    if (u.indexOf("browser://newtab") === 0) return true;
    if (u.indexOf("browser://welcome") === 0) return true; // welcome is the research home too
    if (u.indexOf("rt-research-home") !== -1) return true; // our data: underlay marker
    return false;
  }
  function activeUrl() {
    try { const t = api.tabs.current(); return t && t.url ? t.url : ""; }
    catch (_) { return ""; }
  }
  // Turn whatever the user typed into a destination, the way an address
  // bar would: keep explicit schemes, treat a dotted token as a domain,
  // otherwise run a web search.
  function resolveQuery(raw) {
    const s = (raw || "").trim();
    if (!s) return null;
    if (/^[a-z][a-z0-9+.\-]*:\/\//i.test(s)) return s;
    if (!/\s/.test(s) && /\.[a-z]{2,}/i.test(s)) return "https://" + s;
    return "https://www.google.com/search?q=" + encodeURIComponent(s);
  }
  function goSearch(raw) {
    const target = resolveQuery(raw);
    if (!target) return;
    try { api.navigation.goTo(target); } catch (_) {}
  }
  // Newest-first captures across ALL sessions, each tagged with its
  // session, so the home doubles as a "what was I just looking at" list.
  function recentSources(limit) {
    const out = [];
    state.sessions.forEach((sess) => {
      (sess.sources || []).forEach((src) => out.push({ src: src, session: sess }));
    });
    out.reverse();
    return typeof limit === "number" ? out.slice(0, limit) : out;
  }
  // Hop into a session: switch to it (which restores its tabs) and open the
  // panel so you land right in its sources.
  function hopInto(id) {
    Promise.resolve(switchSession(id)).then(() => { try { openPanel(); } catch (_) {} });
  }
  function renderHome() {
    home.innerHTML = "";
    const cur = currentSession();
    const inner = el("div", { class: "rt-home__inner" });

    // Search the web / paste a link
    const input = el("input", {
      class: "rt-home__search", type: "text", autocomplete: "off", spellcheck: "false",
      placeholder: "Search the web or paste a link…",
      onkeydown: (e) => { if (e.key === "Enter") { e.preventDefault(); goSearch(input.value); } }
    });
    inner.appendChild(el("form", {
      class: "rt-home__searchwrap",
      onsubmit: (e) => { e.preventDefault(); goSearch(input.value); }
    }, [
      input,
      el("button", { class: "rt-home__go", type: "submit", title: "Go", text: "→" })
    ]));

    // Sessions, most recently used first.
    const byRecent = state.sessions.slice().sort((a, b) =>
      String(b.updatedAt || "").localeCompare(String(a.updatedAt || "")));

    // Jump back into the most recent session.
    const recent = byRecent[0];
    if (recent) {
      const n = (recent.sources || []).length;
      inner.appendChild(el("button", {
        class: "rt-continue", type: "button", title: "Open this session",
        onclick: () => hopInto(recent.id)
      }, [
        el("div", { class: "rt-continue__icon", text: "▸" }),
        el("div", { class: "rt-continue__body" }, [
          el("div", { class: "rt-continue__label", text: "Jump back into" }),
          el("div", { class: "rt-continue__title", text: sessionLabel(recent) })
        ]),
        el("div", { class: "rt-continue__meta", text: n + (n === 1 ? " source" : " sources") })
      ]));
    }

    // Sessions — each one a clickable group with its captures nested under it.
    const sec = el("div", { class: "rt-home__section" });
    sec.appendChild(el("div", { class: "rt-home__sechead" }, [
      el("span", { class: "rt-home__eyebrow", text: "Sessions" }),
      el("button", {
        class: "rt-btn rt-btn--ghost rt-btn--tiny", type: "button", text: "+ New session",
        onclick: () => { Promise.resolve(newSession()).then(() => { try { renderHome(); } catch (_) {} }); }
      })
    ]));

    byRecent.forEach((sess) => {
      const isCur = sess.id === cur.id;
      const srcs = (sess.sources || []).slice().reverse();
      const grp = el("div", { class: "rt-shome" + (isCur ? " rt-shome--current" : "") });
      grp.appendChild(el("button", {
        class: "rt-shome__head", type: "button", title: "Open this session",
        onclick: () => hopInto(sess.id)
      }, [
        el("span", { class: "rt-shome__name", text: sessionLabel(sess) }),
        ...(isCur ? [el("span", { class: "rt-shome__badge", text: "current" })] : []),
        el("span", { class: "rt-shome__count", text: String(srcs.length) }),
        el("span", { class: "rt-shome__open", text: "Open →" })
      ]));
      if (srcs.length === 0) {
        grp.appendChild(el("div", { class: "rt-shome__empty", text: "Nothing captured yet." }));
      } else {
        const list = el("div", { class: "rt-shome__items" });
        srcs.slice(0, 5).forEach((src) => {
          list.appendChild(el("button", {
            class: "rt-shome__item", type: "button",
            title: src.url ? "Open in a new tab" : "Open this session",
            onclick: () => { if (src.url) openOne(src.url); else hopInto(sess.id); }
          }, [
            el("span", { class: "rt-ava rt-shome__ava", style: `background:${avatarColor(src.host || "other")}`, text: initials(src.host || "?") }),
            el("span", { class: "rt-shome__itemtitle", text: src.title || prettyUrl(src.url) || "Untitled" })
          ]));
        });
        if (srcs.length > 5) {
          list.appendChild(el("button", {
            class: "rt-shome__more", type: "button",
            text: "+ " + (srcs.length - 5) + " more in this session",
            onclick: () => hopInto(sess.id)
          }));
        }
        grp.appendChild(list);
      }
      sec.appendChild(grp);
    });

    inner.appendChild(sec);
    home.appendChild(inner);
  }
  function showHome() {
    try { renderHome(); }
    catch (e) { try { console.warn("[Research] renderHome failed", e); } catch (_) {} }
    home.hidden = false;
  }
  function hideHome() { home.hidden = true; }
  // Only act on a TRANSITION (hidden↔shown). Re-rendering an already-open
  // home on every background chrome event would wipe a half-typed search.
  function syncHome(url) {
    const u = (typeof url === "string" && url) ? url : activeUrl();
    const onHome = isHomeSurface(u);
    if (onHome && home.hidden) showHome();
    else if (!onHome && !home.hidden) hideHome();
  }

  buildPanel();
  updateCounts();
  scheduleDecorate();
  syncHome();

  // Top-bar button clicks arrive as an `action-clicked` event from the
  // host. No-op on older hosts where the event never fires.
  try {
    api.on("action-clicked", (e) => {
      if (!e) return;
      if (e.id === "research") togglePanel();
      else if (e.id === "snip") doSnip();
      else if (e.id === "clip") addQuoteFromClipboard();
      else if (e.id === "home") {
        // New tabs are routed to the search engine by the host (it ignores
        // homeUrl), so the surest way to reach the research home is to send
        // the active tab to browser://newtab. syncHome then paints it; the
        // short delay lets the navigation settle in case no event fires.
        try { api.navigation.goTo("browser://newtab"); } catch (_) {}
        setTimeout(() => { try { syncHome(); } catch (_) {} }, 80);
      }
    });
  } catch (_) {}

  // Show / hide the research home as the active tab enters or leaves the
  // browser://newtab surface. Multiple handlers per event are supported,
  // so these sit alongside onChromeChange without clobbering it. The
  // event payload's url is authoritative (current() can lag a navigation).
  try { api.on("navigate", (e) => syncHome(e && e.url)); } catch (_) {}
  try { api.on("pageload", (e) => syncHome(e && e.url)); } catch (_) {}

  // Tab-strip "+" clicks arrive as `tab-action-clicked` ({actionId, tabId}).
  // No-op on older hosts where the event never fires.
  try {
    api.on("tab-action-clicked", (e) => {
      if (e && e.actionId === "capture" && e.tabId) toggleCaptureTab(e.tabId);
    });
  } catch (_) {}

  // Keep things fresh on any chrome change. A full chrome re-render also
  // repaints the declarative top-bar button from the mode JSON (its
  // badge resets to empty), so re-apply our live source count here too.
  function onChromeChange() {
    if (hasToolbar) { try { updateCounts(); } catch (_) {} }
    if (panelOpen) { try { renderTabs(); } catch (_) {} }
    // Re-stamp the per-tab capture buttons: a re-render wiped them, and
    // tabs may have opened / closed / navigated.
    scheduleDecorate();
    // Backstop for the home toggle on tab switches / tab-list changes.
    try { syncHome(); } catch (_) {}
  }
  try { api.on("tabs-changed", onChromeChange); } catch (e) {}
  try { api.on("tabswitch", onChromeChange); } catch (e) {}
  try { api.on("navigate", onChromeChange); } catch (e) {}

  // ----------------------------------------------------------
  // CLEANUP
  // ----------------------------------------------------------
  return () => {
    if (saveTimer) clearTimeout(saveTimer);
    try { persist(); } catch (e) {}
    try { root.remove(); } catch (e) {}
    try { panel.remove(); } catch (e) {}
    try { home.remove(); } catch (e) {}
  };

  } catch (err) {
    // Never let a failure here break Cule's chrome — tear down anything
    // we managed to mount and bail out quietly.
    try { console.warn("[Research] failed to start:", err); } catch (e) {}
    try {
      document.querySelectorAll(".rt-root, .rt-panel, .rt-home").forEach(function (n) { n.remove(); });
    } catch (e) {}
    return;
  }
})();
