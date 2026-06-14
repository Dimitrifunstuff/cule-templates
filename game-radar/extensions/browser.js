(function () {
  if (document.body.dataset.buildMode === "on") return;

  // ============================================================
  // GAME DATABASE — appid is Steam's app id (null = non-Steam)
  // ============================================================
  const GAMES = [
    { id: "elden-ring",     appid: "1245620", name: "Elden Ring",            wiki: "https://eldenring.wiki.fextralife.com/Elden+Ring+Wiki",                   icon: "⚔",  color: "#c9a45f" },
    { id: "witcher-3",      appid: "292030",  name: "The Witcher 3",         wiki: "https://witcher.fandom.com/wiki/The_Witcher_3:_Wild_Hunt",               icon: "🐺", color: "#7a1f1f" },
    { id: "cyberpunk",      appid: "1091500", name: "Cyberpunk 2077",        wiki: "https://cyberpunk.fandom.com/wiki/Cyberpunk_2077_(video_game)",         icon: "📡", color: "#fcee0a" },
    { id: "skyrim",         appid: "489830",  name: "Skyrim SE",             wiki: "https://elderscrolls.fandom.com/wiki/The_Elder_Scrolls_V:_Skyrim",       icon: "🐉", color: "#5b8db5" },
    { id: "stardew",        appid: "413150",  name: "Stardew Valley",        wiki: "https://stardewvalleywiki.com/",                                          icon: "🌾", color: "#8bc34a" },
    { id: "hollow-knight",  appid: "367520",  name: "Hollow Knight",         wiki: "https://hollowknight.fandom.com/wiki/Hollow_Knight_Wiki",                 icon: "🗡", color: "#5e35b1" },
    { id: "silksong",       appid: "1030300", name: "Hollow Knight: Silksong", wiki: "https://hollowknight.fandom.com/wiki/Hollow_Knight:_Silksong",         icon: "🕷", color: "#dc143c" },
    { id: "hades",          appid: "1145360", name: "Hades",                 wiki: "https://hades.fandom.com/wiki/Hades_Wiki",                                icon: "🔥", color: "#e63946" },
    { id: "hades-2",        appid: "1145350", name: "Hades II",              wiki: "https://wiki.hades2.com/",                                                icon: "🌙", color: "#9a4c95" },
    { id: "ds3",            appid: "374320",  name: "Dark Souls III",        wiki: "https://darksouls3.wiki.fextralife.com/",                                 icon: "🕯", color: "#8b0000" },
    { id: "ds-remastered",  appid: "570940",  name: "Dark Souls Remastered", wiki: "https://darksouls.wiki.fextralife.com/",                                  icon: "🕯", color: "#cd853f" },
    { id: "sekiro",         appid: "814380",  name: "Sekiro",                wiki: "https://sekiroshadowsdietwice.wiki.fextralife.com/",                       icon: "🗡", color: "#8b4513" },
    { id: "bg3",            appid: "1086940", name: "Baldur's Gate 3",       wiki: "https://bg3.wiki/wiki/Main_Page",                                         icon: "🎲", color: "#722f37" },
    { id: "terraria",       appid: "105600",  name: "Terraria",              wiki: "https://terraria.fandom.com/wiki/Terraria_Wiki",                          icon: "⛏", color: "#76b455" },
    { id: "poe",            appid: "238960",  name: "Path of Exile",         wiki: "https://www.poewiki.net/wiki/Path_of_Exile_Wiki",                         icon: "💎", color: "#aa6633" },
    { id: "cs2",            appid: "730",     name: "Counter-Strike 2",      wiki: "https://liquipedia.net/counterstrike/Main_Page",                          icon: "🎯", color: "#f7941d" },
    { id: "dota2",          appid: "570",     name: "Dota 2",                wiki: "https://dota2.fandom.com/wiki/Dota_2_Wiki",                                icon: "🛡", color: "#c4302b" },
    { id: "tf2",            appid: "440",     name: "Team Fortress 2",       wiki: "https://wiki.teamfortress.com/",                                          icon: "🎩", color: "#cf7336" },
    { id: "rust",           appid: "252490",  name: "Rust",                  wiki: "https://rust.fandom.com/wiki/Rust_Wiki",                                  icon: "🔨", color: "#cd412b" },
    { id: "valheim",        appid: "892970",  name: "Valheim",               wiki: "https://valheim.fandom.com/wiki/Valheim_Wiki",                            icon: "⚒", color: "#3a7d44" },
    { id: "factorio",       appid: "427520",  name: "Factorio",              wiki: "https://wiki.factorio.com/",                                              icon: "⚙", color: "#e88a1a" },
    { id: "rimworld",       appid: "294100",  name: "RimWorld",              wiki: "https://rimworldwiki.com/wiki/RimWorld_Wiki",                             icon: "🪐", color: "#b87333" },
    { id: "sea-of-thieves", appid: "1172620", name: "Sea of Thieves",        wiki: "https://seaofthieves.fandom.com/wiki/Sea_of_Thieves_Wiki",                icon: "🏴", color: "#1c4e80" },
    { id: "rdr2",           appid: "1174180", name: "Red Dead Redemption 2", wiki: "https://reddead.fandom.com/wiki/Red_Dead_Redemption_2",                   icon: "🤠", color: "#a04030" },
    { id: "gta5",           appid: "271590",  name: "Grand Theft Auto V",    wiki: "https://gta.fandom.com/wiki/Grand_Theft_Auto_V",                          icon: "🚗", color: "#fed925" },
    { id: "mhw",            appid: "582010",  name: "Monster Hunter: World", wiki: "https://monsterhunterworld.wiki.fextralife.com/",                          icon: "🐲", color: "#c9923c" },
    { id: "nms",            appid: "275850",  name: "No Man's Sky",          wiki: "https://nomanssky.fandom.com/wiki/No_Man%27s_Sky_Wiki",                   icon: "🚀", color: "#ff6f00" },
    { id: "subnautica",     appid: "264710",  name: "Subnautica",            wiki: "https://subnautica.fandom.com/wiki/Subnautica_Wiki",                       icon: "🐠", color: "#00bcd4" },
    { id: "dst",            appid: "322330",  name: "Don't Starve Together", wiki: "https://dontstarve.fandom.com/wiki/Don%27t_Starve_Together",              icon: "🌑", color: "#5a5a5a" },
    { id: "ror2",           appid: "632360",  name: "Risk of Rain 2",        wiki: "https://riskofrain2.fandom.com/wiki/Risk_of_Rain_2_Wiki",                 icon: "☔", color: "#5a4fcf" },
    { id: "helldivers-2",   appid: "553850",  name: "Helldivers 2",          wiki: "https://helldivers.fandom.com/wiki/Helldivers_2",                          icon: "🛡", color: "#fdc500" },
    { id: "palworld",       appid: "1623730", name: "Palworld",              wiki: "https://palworld.fandom.com/wiki/Palworld_Wiki",                          icon: "🐾", color: "#62b5e5" },
    { id: "satisfactory",   appid: "526870",  name: "Satisfactory",          wiki: "https://satisfactory.wiki.gg/wiki/Satisfactory_Wiki",                     icon: "🏭", color: "#fa9549" },
    { id: "deep-rock",      appid: "548430",  name: "Deep Rock Galactic",    wiki: "https://deeprockgalactic.fandom.com/wiki/Deep_Rock_Galactic_Wiki",        icon: "💎", color: "#ff9c00" },
    { id: "minecraft",      appid: null,      name: "Minecraft",             wiki: "https://minecraft.fandom.com/wiki/Minecraft_Wiki",                        icon: "🟩", color: "#5d8a3a" },
    { id: "lol",            appid: null,      name: "League of Legends",     wiki: "https://leagueoflegends.fandom.com/wiki/League_of_Legends",                icon: "👑", color: "#c8aa6e" },
    { id: "valorant",       appid: null,      name: "Valorant",              wiki: "https://valorant.fandom.com/wiki/Valorant",                                icon: "🎯", color: "#ff4655" },
    { id: "wow",            appid: null,      name: "World of Warcraft",     wiki: "https://wowpedia.fandom.com/wiki/Portal:Main",                             icon: "🏰", color: "#f8b700" },
    { id: "fortnite",       appid: null,      name: "Fortnite",              wiki: "https://fortnite.fandom.com/wiki/Fortnite_Wiki",                          icon: "💜", color: "#9d4dbb" }
  ];

  function gameById(id)    { return GAMES.find(g => g.id === id) || null; }
  function gameByAppId(id) { return GAMES.find(g => g.appid === id) || null; }

  // ============================================================
  // STORAGE
  // ============================================================
  const SESSIONS_KEY = "cule.gameRadar.sessions.v1";
  const SETTINGS_KEY = "cule.gameRadar.settings.v1";
  // Session bucket for the "no game" state, so the tabs you had open before a
  // game is detected are saved and restored when you go back to no game.
  const NONE_KEY = "__none__";
  const LOCK_KEY      = "cule.gameRadar.lockUntil.v1";    // switch-in-progress guard (timestamp ms)
  const DETECT_AT_KEY = "cule.gameRadar.lastDetectAt.v1"; // throttles the rebuild-storm detect burst

  function safeRead(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
    catch (e) { return fallback; }
  }
  function safeWrite(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) {}
  }
  function loadSessions() { return safeRead(SESSIONS_KEY, {}); }
  function saveSessions(s) { safeWrite(SESSIONS_KEY, s); }

  const defaults = { autoDetect: true, currentGameId: null };
  let settings = Object.assign({}, defaults, safeRead(SETTINGS_KEY, {}));
  function saveSettings() { safeWrite(SETTINGS_KEY, settings); }

  // ============================================================
  // URL / SEARCH UTILITIES
  // ============================================================
  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }

  // ============================================================
  // STEAM DETECTION (live, via Steam's "running app id")
  //   Windows  : HKCU\Software\Valve\Steam\RunningAppID  (registry)
  //   mac/linux: ~/.../Steam/registry.vdf — Steam mirrors the same
  //              "registry" into this file, RunningAppID included.
  // RunningAppID is the appid of the game running RIGHT NOW, and 0
  // when nothing is running. So a game appears the instant it launches
  // and clears the instant it closes — no 10-minute "last played"
  // guessing and no per-machine hardcoded Steam folders.
  // ============================================================
  let detectionStatus = "idle"; // idle | scanning | ok | steam-not-found | denied | error
  let lastDetectedGame = null;

  function gameFromAppId(appid) {
    if (appid == null || appid === "0" || appid === 0) return null; // nothing running
    const known = gameByAppId(String(appid));
    if (known) return known;
    return {
      id: `steam-${appid}`,
      appid: String(appid),
      name: `Steam App ${appid}`,
      wiki: `https://store.steampowered.com/app/${appid}/`,
      icon: "🎮",
      color: "#465670",
      unknown: true
    };
  }

  // mac/linux: Steam stores the live RunningAppID inside registry.vdf.
  async function readRunningAppIdFromFile() {
    const candidates = (api.platform === "darwin")
      ? ["~/Library/Application Support/Steam/registry.vdf"]
      : ["~/.steam/registry.vdf", "~/.steam/steam/registry.vdf", "~/.local/share/Steam/registry.vdf"];
    for (const p of candidates) {
      let content = "";
      try { content = await api.fs.read(p); } catch (e) { continue; }
      if (!content) continue;
      const m = content.match(/"RunningAppID"\s+"(\d+)"/i);
      if (m) return m[1];
    }
    return null; // Steam files not found
  }

  async function detectRunningGame() {
    detectionStatus = "scanning";
    try {
      let appid = null;
      if (api.platform === "win32") {
        if (!api.registry) { detectionStatus = "denied"; return null; }
        try { appid = await api.registry.read("HKCU/Software/Valve/Steam", "RunningAppID"); }
        catch (e) { detectionStatus = "denied"; return null; }
        if (appid == null) { detectionStatus = "steam-not-found"; return null; }
      } else {
        if (!api.fs) { detectionStatus = "denied"; return null; }
        appid = await readRunningAppIdFromFile();
        if (appid == null) { detectionStatus = "steam-not-found"; return null; }
      }
      detectionStatus = "ok";
      return gameFromAppId(appid); // null when appid === 0 (Steam open, no game)
    } catch (e) {
      console.warn("[GameRadar] detection error", e);
      detectionStatus = "error";
      return null;
    }
  }

  // ============================================================
  // TAB SESSION MANAGEMENT
  //
  // Cule rebuilds this whole overlay from scratch on EVERY tab
  // open/close (renderState -> applyExtensionRuntime). So in-memory
  // state and setTimeout timers do NOT survive a tab change — only
  // localStorage does. We therefore SAVE the active game's session
  // synchronously from the `tabs-changed` snapshot the runtime hands
  // us (see CHROME EVENTS), and use a localStorage "switch lock" to
  // suppress saving / auto-switching while a deliberate game switch
  // is mid-flight (tabs churning, overlay rebuilding repeatedly).
  // ============================================================
  function isRealUrl(u) {
    u = (u || "").toLowerCase();
    if (!u) return false;
    if (u === "about:blank") return false;
    if (u.startsWith("browser://")) return false;
    if (u.startsWith("cule://")) return false;
    if (u.startsWith("data:")) return false;
    return true;
  }

  function isLocked()  { return Date.now() < (safeRead(LOCK_KEY, 0) || 0); }
  function lockFor(ms) { safeWrite(LOCK_KEY, Date.now() + ms); }

  // Persist a tab snapshot under the current bucket — a game id, OR the
  // "no game" bucket. Saving the no-game tabs too is what lets us restore the
  // tabs you originally had after you leave a game. Synchronous + idempotent
  // so it survives the rebuild storm. Skips empty/locked.
  function saveSnapshot(tabsSnapshot) {
    if (isLocked()) return;
    const key = settings.currentGameId || NONE_KEY;
    const snap = (Array.isArray(tabsSnapshot) ? tabsSnapshot : [])
      .filter(t => t && isRealUrl(t.url))
      .map(t => ({ url: t.url, title: t.title || "" }));
    if (snap.length === 0) return; // don't clobber a real session with an empty one
    const sessions = loadSessions();
    sessions[key] = snap;
    saveSessions(sessions);
  }

  // For events that don't carry a snapshot (navigate / pageload):
  // read the live tab list, then save.
  async function saveCurrentTabs() {
    if (isLocked()) return;
    let tabs = [];
    try { tabs = (await api.tabs.list()) || []; } catch (e) { return; }
    saveSnapshot(tabs);
  }

  // Switch the active game: open that game's saved tabs (or its wiki
  // the first time) and close the previous game's tabs. The previous
  // game's session is already kept up-to-date by saveSnapshot, so we
  // don't re-snapshot it here.
  async function switchToGame(nextGame) {
    const nextId = nextGame ? nextGame.id : null;
    if (nextId === settings.currentGameId) return;

    lockFor(3000); // suppress saves + auto-switch while tabs churn

    let oldTabs = [];
    try { oldTabs = (await api.tabs.list()) || []; } catch (e) {}

    const sessions = loadSessions();

    // Snapshot the tabs we're leaving under their bucket (current game, or the
    // "no game" bucket) so we can return to them later. This is what makes
    // leaving a game restore the tabs you originally had.
    const prevKey = settings.currentGameId || NONE_KEY;
    const prevSnap = oldTabs
      .filter(t => t && isRealUrl(t.url))
      .map(t => ({ url: t.url, title: t.title || "" }));
    if (prevSnap.length > 0) sessions[prevKey] = prevSnap;

    if (!nextGame) {
      // Back to "no game": reopen the tabs you had before any game, then
      // close the game's tabs.
      settings.currentGameId = null;
      saveSettings();
      const noneSaved = sessions[NONE_KEY];
      const noneUrls = (Array.isArray(noneSaved) ? noneSaved.map(t => t.url) : []).filter(Boolean);
      for (const url of noneUrls) { try { api.tabs.create(url); } catch (e) {} }
      for (const t of oldTabs) { try { api.tabs.close(t.id); } catch (e) {} }
      saveSessions(sessions);
      updateUI();
      return;
    }

    const saved = sessions[nextGame.id];
    const hasSaved = Array.isArray(saved) && saved.length > 0;
    const urls = hasSaved ? saved.map(t => t.url).filter(Boolean) : [nextGame.wiki];

    // Open the next game's tabs, then close the leaving tabs. Fire-and-forget:
    // each create/close rebuilds the overlay, so we must NOT await them, and we
    // set currentGameId synchronously (below) BEFORE the microtask-deferred
    // rebuilds run — otherwise the rebuilt overlay would read the old game id.
    for (const url of urls) { try { api.tabs.create(url); } catch (e) {} }
    for (const t of oldTabs) { try { api.tabs.close(t.id); } catch (e) {} }

    // First visit to this game: seed its session immediately so it round-trips
    // (and shows a tab count) even before the next tabs-changed fires.
    if (!hasSaved) sessions[nextGame.id] = urls.map(u => ({ url: u, title: "" }));
    saveSessions(sessions);

    settings.currentGameId = nextGame.id;
    saveSettings();
    updateUI();
  }

  // ============================================================
  // WIDGET (pill + drop-up panel) — bottom-right
  // ============================================================
  const root = document.createElement("div");
  root.className = "gr-root";
  document.body.appendChild(root);

  const pill = document.createElement("button");
  pill.className = "gr-pill";
  pill.type = "button";
  root.appendChild(pill);

  const panel = document.createElement("div");
  panel.className = "gr-panel";
  panel.hidden = true;
  root.appendChild(panel);

  let panelOpen = false;

  function statusBadge() {
    switch (detectionStatus) {
      case "ok":              return { label: "Steam: connected",  tone: "ok"   };
      case "scanning":        return { label: "Steam: checking…",  tone: "neu"  };
      case "steam-not-found": return { label: "Steam not found",   tone: "warn" };
      case "denied":          return { label: "Permission off",    tone: "warn" };
      case "error":           return { label: "Detection error",   tone: "warn" };
      default:                return { label: "Auto-detect idle",  tone: "neu"  };
    }
  }

  function updateUI() {
    const g = gameById(settings.currentGameId);
    pill.innerHTML = "";
    pill.style.setProperty("--accent", g ? g.color : "#00f5ff");

    const dot = document.createElement("span");
    dot.className = "gr-dot" + (g ? " on" : "");
    pill.appendChild(dot);

    const icon = document.createElement("span");
    icon.className = "gr-icon";
    icon.textContent = g ? g.icon : "🎮";
    pill.appendChild(icon);

    const labels = document.createElement("span");
    labels.className = "gr-labels";

    const small = document.createElement("span");
    small.className = "gr-status";
    small.textContent = g ? "NOW PLAYING" : "NO GAME";
    labels.appendChild(small);

    const big = document.createElement("span");
    big.className = "gr-name";
    big.textContent = g ? g.name : "Select a game";
    labels.appendChild(big);
    pill.appendChild(labels);

    const chev = document.createElement("span");
    chev.className = "gr-chev" + (panelOpen ? " open" : "");
    chev.textContent = "▾";
    pill.appendChild(chev);

    if (panelOpen) renderPanel();
  }

  function renderPanel() {
    panel.innerHTML = "";

    const head = document.createElement("div");
    head.className = "gr-head";
    head.innerHTML = `
      <div class="gr-head-title">GAME LIBRARY</div>
      <div class="gr-head-sub">Switch sessions · override detection</div>
    `;
    panel.appendChild(head);

    const auto = document.createElement("div");
    auto.className = "gr-auto";
    const badge = statusBadge();

    const left = document.createElement("div");
    left.className = "gr-auto-left";
    left.innerHTML = `
      <div class="gr-auto-title">Auto-detect from Steam</div>
      <div class="gr-auto-sub gr-tone-${badge.tone}">${badge.label}</div>
    `;
    auto.appendChild(left);

    const toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "gr-toggle" + (settings.autoDetect ? " on" : "");
    toggle.innerHTML = `<span class="gr-knob"></span>`;
    toggle.onclick = (e) => {
      e.stopPropagation();
      settings.autoDetect = !settings.autoDetect;
      saveSettings();
      if (settings.autoDetect) kickDetection();
      renderPanel();
    };
    auto.appendChild(toggle);
    panel.appendChild(auto);

    const searchRow = document.createElement("div");
    searchRow.className = "gr-search-row";
    const search = document.createElement("input");
    search.type = "text";
    search.placeholder = "Search games…";
    search.className = "gr-search";
    searchRow.appendChild(search);
    panel.appendChild(searchRow);

    const list = document.createElement("div");
    list.className = "gr-list";
    panel.appendChild(list);

    function renderList(filter) {
      list.innerHTML = "";
      const sessions = loadSessions();
      const f = (filter || "").trim().toLowerCase();

      const none = document.createElement("button");
      none.type = "button";
      none.className = "gr-row" + (settings.currentGameId === null ? " active" : "");
      none.innerHTML = `
        <span class="gr-row-icon" style="background:#1a2030;border:1px solid #2a3344;color:#6c7689">—</span>
        <span class="gr-row-name">No game</span>
        <span class="gr-row-meta">neutral</span>
      `;
      none.onclick = (e) => {
        e.stopPropagation();
        settings.autoDetect = false;
        saveSettings();
        switchToGame(null);
        closePanel();
      };
      list.appendChild(none);

      if (lastDetectedGame && lastDetectedGame.id !== settings.currentGameId) {
        const sug = document.createElement("button");
        sug.type = "button";
        sug.className = "gr-row gr-row-sug";
        sug.innerHTML = `
          <span class="gr-row-icon" style="background:${lastDetectedGame.color}22;border:1px solid ${lastDetectedGame.color}55">${lastDetectedGame.icon}</span>
          <span class="gr-row-name">${escapeHtml(lastDetectedGame.name)}</span>
          <span class="gr-row-meta gr-row-meta-hot">detected</span>
        `;
        sug.onclick = (e) => {
          e.stopPropagation();
          switchToGame(lastDetectedGame);
          closePanel();
        };
        list.appendChild(sug);
      }

      const filtered = GAMES.filter(g => !f || g.name.toLowerCase().includes(f));
      filtered.sort((a, b) => {
        const aHas = !!sessions[a.id];
        const bHas = !!sessions[b.id];
        if (aHas !== bHas) return aHas ? -1 : 1;
        return a.name.localeCompare(b.name);
      });

      if (filtered.length === 0) {
        const empty = document.createElement("div");
        empty.className = "gr-empty";
        empty.textContent = "No matches.";
        list.appendChild(empty);
        return;
      }

      for (const g of filtered) {
        const row = document.createElement("button");
        row.type = "button";
        row.className = "gr-row" + (settings.currentGameId === g.id ? " active" : "");
        const has = sessions[g.id];
        const meta = has ? `${has.length} tab${has.length === 1 ? "" : "s"}` : "new";
        row.innerHTML = `
          <span class="gr-row-icon" style="background:${g.color}22;border:1px solid ${g.color}55;color:${g.color}">${g.icon}</span>
          <span class="gr-row-name">${escapeHtml(g.name)}</span>
          <span class="gr-row-meta">${meta}</span>
        `;
        row.onclick = (e) => {
          e.stopPropagation();
          settings.autoDetect = false;
          saveSettings();
          switchToGame(g);
          closePanel();
        };
        list.appendChild(row);
      }
    }

    renderList("");
    search.oninput = () => renderList(search.value);
    setTimeout(() => search.focus(), 50);
  }

  function openPanel()  { panelOpen = true;  panel.hidden = false; updateUI(); }
  function closePanel() { panelOpen = false; panel.hidden = true;  updateUI(); }

  pill.onclick = (e) => {
    e.stopPropagation();
    panelOpen ? closePanel() : openPanel();
  };

  document.addEventListener("click", (e) => {
    if (!panelOpen) return;
    if (!root.contains(e.target)) closePanel();
  });

  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    if (panelOpen) { closePanel(); return; }
  });

  // ============================================================
  // DETECTION LOOP
  // ============================================================
  let detectTimer = null;
  let startupTimer = null;

  async function kickDetection() {
    if (!settings.autoDetect) return;
    if (isLocked()) return;                              // a switch is mid-flight
    const last = safeRead(DETECT_AT_KEY, 0) || 0;
    if (Date.now() - last < 2000) return;                // throttle the rebuild-storm burst
    safeWrite(DETECT_AT_KEY, Date.now());

    const game = await detectRunningGame();              // null when nothing is running
    lastDetectedGame = game;
    const detectedId = game ? game.id : null;
    if (detectedId !== settings.currentGameId) {
      // Game launched, switched, or closed (null) — swap sessions to match.
      await switchToGame(game);
    } else {
      if (panelOpen) renderPanel();
      updateUI();
    }
  }

  function startDetectionLoop() {
    if (detectTimer) clearInterval(detectTimer);
    detectTimer = setInterval(kickDetection, 4000);
  }

  // ============================================================
  // STARTUP
  // ============================================================
  updateUI(); // render the pill immediately on every (re)build

  // Cule restores the workspace's own tabs natively, so we do NOT
  // re-open a saved session on cold launch (that would duplicate
  // tabs). We only (re)establish the detection poll. The poll is
  // re-created after each rebuild and torn down in cleanup, so
  // exactly one interval is ever alive — no leaks, no duplicates.
  startupTimer = setTimeout(async () => {
    startupTimer = null;
    if (settings.autoDetect) {
      startDetectionLoop();
      if (!isLocked()) await kickDetection();
    }
  }, 1500);

  // ============================================================
  // CHROME EVENTS — keep sessions in sync
  // ============================================================
  // `tabs-changed` carries a full snapshot (rebuild-proof — fires on
  // the freshly-rebuilt overlay right after each tab open/close).
  // navigate/pageload don't carry one, so we read the live list.
  try { api.on("tabs-changed", (snapshot) => saveSnapshot(snapshot)); } catch (e) {}
  try { api.on("navigate",     () => saveCurrentTabs()); } catch (e) {}
  try { api.on("pageload",     () => saveCurrentTabs()); } catch (e) {}

  // ============================================================
  // CLEANUP
  // ============================================================
  return () => {
    if (detectTimer)  clearInterval(detectTimer);
    if (startupTimer) clearTimeout(startupTimer);
    root.remove();
  };
})();
