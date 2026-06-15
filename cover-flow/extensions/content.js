// Cover Flow — iTunes-style colour + chrome pass for Google.
//
// Touches:
//   • colours (links, titles, snippets, selection)
//   • gradients on chrome surfaces (page bg, header, footer, search bar wrapper)
//   • the two submit buttons (glossy convex)
//   • the search input (white capsule with inset shadow + aqua focus)
//   • border-radius softening
// Deliberately does NOT touch:
//   • padding / margin / height / font-family on results
//   • result-card borders or backgrounds (caused "blokken in blokken")
//   • [role="navigation"] tab strip (Google's class structure is fragile there)
(function () {
  'use strict';

  const host = (location.hostname || '').toLowerCase();
  if (!/^(www\.)?google\.[a-z.]{2,}$/.test(host)) return;

  const css = `
    /* ---- Page background: brushed silver ------------------------- */
    html, body {
      background: linear-gradient(180deg, #ececec 0%, #d4d4d4 100%) !important;
      color: #1a1a1a !important;
    }

    /* ---- Top header / search-region surface ---------------------- */
    /* Brushed silver on the search region containers. The dark
     * border-bottom that Google paints here is killed explicitly so
     * the strip blends into the page instead of cutting a hard line.
     */
    #searchform,
    #sfdiv,
    .sfbg,
    #appbar,
    #hdtbSum {
      background: linear-gradient(180deg, #e6e6e6 0%, #c4c4c4 100%) !important;
      box-shadow: inset 0 1px 0 rgba(255,255,255,0.7) !important;
      border-bottom: 0 !important;
      border-top: 0 !important;
    }

    /* ---- Second nav strip — filter pills (Inloggen / Tools / …) -- */
    /* Wrapper containers around the pill row. */
    div.rfiSsc.YNk70c,
    div.sBbkle.P3mIxe {
      background: linear-gradient(180deg, #e0e0e0 0%, #c8c8c8 100%) !important;
      box-shadow: inset 0 1px 0 rgba(255,255,255,0.6) !important;
      border: 0 !important;
    }
    /* The pill itself (.GKS7s). We KEEP Google's height/min-width/
     * border-radius — those define the pill shape — and only swap the
     * background + border into iTunes glossy convex.
     */
    [role="navigation"] .GKS7s,
    .GKS7s {
      background: linear-gradient(180deg, #fbfbfb 0%, #e2e2e2 48%, #c8c8c8 100%) !important;
      box-shadow:
        inset 0 1px 0 rgba(255,255,255,0.9),
        inset 0 -1px 0 rgba(0,0,0,0.05),
        inset 0 0 0 1px rgba(0,0,0,0.28),
        0 1px 0 rgba(255,255,255,0.55) !important;
      transition: background 80ms ease, box-shadow 80ms ease, transform 60ms ease !important;
    }
    [role="navigation"] .GKS7s:hover,
    .GKS7s:hover,
    .Ps6jAe:hover .GKS7s {
      background: linear-gradient(180deg, #ffffff 0%, #ececec 48%, #d2d2d2 100%) !important;
    }
    [role="navigation"] .GKS7s:active,
    .GKS7s:active {
      background: linear-gradient(180deg, #c0c0c0 0%, #b0b0b0 50%, #c0c0c0 100%) !important;
      box-shadow:
        inset 0 2px 4px rgba(0,0,0,0.2),
        inset 0 0 0 1px rgba(0,0,0,0.32) !important;
      transform: translateY(1px) !important;
    }
    /* Selected/active pill — iTunes pressed-in look in blue. */
    [role="navigation"] [selected].GKS7s,
    [selected].GKS7s {
      background: linear-gradient(180deg, #2670c4 0%, #1a4d80 100%) !important;
      box-shadow:
        inset 0 1px 0 rgba(255,255,255,0.25),
        inset 0 -1px 0 rgba(0,0,0,0.2),
        inset 0 0 0 1px rgba(0,0,0,0.35) !important;
      outline: 0 !important;
    }
    /* Pill text colour — dark on idle, white on selected. */
    [role="navigation"] .GKS7s .FMKtTb,
    [role="navigation"] .GKS7s .RWhoyd.mol54e,
    .GKS7s .FMKtTb,
    .GKS7s .RWhoyd.mol54e {
      color: #1c1c1c !important;
    }
    [role="navigation"] [selected].GKS7s .FMKtTb,
    [selected].GKS7s .FMKtTb,
    [selected].GKS7s .RWhoyd.mol54e {
      color: #ffffff !important;
    }

    /* ---- Tab navigation strip (AI-modus / Alle / Afbeeldingen / …) */
    /* Targets the wrapper div the user picked AND the role=navigation
     * inside it. Slightly darker silver than the page so the strip
     * reads as a distinct toolbar, but NO border-bottom — that's the
     * "donkere rand" the user wanted gone.
     */
    div.YNk70c.iFBYke,
    [role="navigation"] {
      background: linear-gradient(180deg, #e0e0e0 0%, #c8c8c8 100%) !important;
      box-shadow: inset 0 1px 0 rgba(255,255,255,0.6) !important;
      border-bottom: 0 !important;
      border-top: 0 !important;
    }
    /* Hard reset inside the strip: tabs themselves must stay flat —
     * no boxes, no per-item backgrounds (that's what caused the
     * "blokken in blokken" stack last time). They keep Google's
     * native layout and just sit on the silver bg.
     */
    [role="navigation"] [role="listitem"],
    [role="navigation"] [data-hveid],
    [role="navigation"] a,
    [role="navigation"] [role="link"] {
      background: transparent !important;
      background-image: none !important;
      border: 0 !important;
      box-shadow: none !important;
      border-radius: 0 !important;
    }
    /* Tab text colour — readable on the silver strip. */
    [role="navigation"] a,
    [role="navigation"] [role="link"],
    [role="navigation"] .R1QWuf {
      color: #2a2a2a !important;
    }
    /* Active tab (the one with aria-current="page" — "Alle" by default
     * — and the "AI-modus" pill which has its own class).
     */
    [role="navigation"] [aria-current="page"] .R1QWuf,
    [role="navigation"] .XVMlrc .R1QWuf {
      color: #1a4d80 !important;
      font-weight: 600 !important;
    }

    /* ---- Footer + bottom pagination row -------------------------- */
    #footcnt, #botstuff, #foot {
      background: linear-gradient(180deg, #d8d8d8 0%, #b6b6b6 100%) !important;
      box-shadow: inset 0 1px 0 rgba(255,255,255,0.5) !important;
      color: #2a2a2a !important;
    }

    /* ---- Homepage footer: country bar + links row ---------------- */
    /* google.com homepage has two stacked bars at the bottom: a thin
     * country indicator ("Nederland") and the row of footer links
     * (Adverteren / Bedrijf / Privacy / Voorwaarden / Instellingen).
     * Both get the iTunes brushed-silver treatment with dark text.
     */
    div.c93Gbe,
    div.uU7dJb,
    .KxwPGc,
    #fsettl,
    .Vebqub,
    .NKcBbd {
      background: linear-gradient(180deg, #d8d8d8 0%, #b8b8b8 100%) !important;
      color: #2a2a2a !important;
      box-shadow: inset 0 1px 0 rgba(255,255,255,0.55) !important;
      border-top: 1px solid rgba(0,0,0,0.1) !important;
      border-bottom: 0 !important;
    }
    /* The country label itself */
    div.uU7dJb {
      color: #2a2a2a !important;
      font: 500 13px/1.6 "Lucida Grande","Helvetica Neue","Segoe UI",sans-serif !important;
      text-shadow: 0 1px 0 rgba(255,255,255,0.55) !important;
      padding: 8px 16px !important;
    }
    /* Footer link text — pick the common class hooks */
    div.c93Gbe a,
    .KxwPGc a,
    #fsettl a,
    .Vebqub a,
    .NKcBbd a,
    div.c93Gbe a:visited,
    .KxwPGc a:visited {
      color: #1a4d80 !important;
      font: 500 13px/1.6 "Lucida Grande","Helvetica Neue","Segoe UI",sans-serif !important;
      text-shadow: 0 1px 0 rgba(255,255,255,0.45) !important;
    }
    div.c93Gbe a:hover,
    .KxwPGc a:hover,
    #fsettl a:hover,
    .Vebqub a:hover,
    .NKcBbd a:hover {
      color: #2670c4 !important;
      text-decoration: underline !important;
    }

    /* ---- Search input: white capsule with inset shadow ----------- */
    /* Border-radius + colour + depth + a touch of horizontal padding
     * so the text isn't flush against the left edge. Vertical padding
     * stays untouched to avoid relaying out the voice/lens icons.
     */
    input[name="q"],
    textarea[name="q"],
    input[role="combobox"],
    textarea[role="combobox"] {
      background: #ffffff !important;
      color: #1a1a1a !important;
      border: 1px solid #888 !important;
      border-radius: 999px !important;
      padding-left: 18px !important;
      padding-right: 18px !important;
      box-shadow:
        inset 0 1px 3px rgba(0,0,0,0.18),
        0 1px 0 rgba(255,255,255,0.8) !important;
      caret-color: #1a4d80 !important;
      transition: border-color 120ms ease, box-shadow 120ms ease !important;
    }
    input[name="q"]:focus,
    textarea[name="q"]:focus,
    input[role="combobox"]:focus,
    textarea[role="combobox"]:focus {
      border-color: #4a90e2 !important;
      box-shadow:
        inset 0 1px 3px rgba(0,0,0,0.12),
        0 0 0 3px rgba(74,144,226,0.35) !important;
      outline: none !important;
    }
    /* The wrapper Google draws around the input — let it be a clean
     * transparent shell so our capsule input is the visible thing.
     */
    form[role="search"] > div,
    .RNNXgb,
    .A8SBwf {
      background: transparent !important;
      border-radius: 999px !important;
      box-shadow: none !important;
    }

    /* ---- Icon buttons inside the search bar ---------------------- *
     * The voice mic, lens/camera and the clear-X. Google ships them
     * as transparent circular click targets with a hover halo. We
     * keep that pattern (no glossy convex — too heavy at this size)
     * but retint to iTunes: blue icon, light-aqua hover halo, soft
     * border-radius.
     */
    form[role="search"] button:not([type="submit"]),
    .A8SBwf button:not([type="submit"]),
    .RNNXgb button:not([type="submit"]),
    .gsst_a,
    .gsst_e,
    button.XDyW0e,
    button.nDcEnd,
    button.Tg7LZd {
      background: transparent !important;
      border: 0 !important;
      border-radius: 50% !important;
      box-shadow: none !important;
      transition: background 100ms ease !important;
    }
    form[role="search"] button:not([type="submit"]):hover,
    .A8SBwf button:not([type="submit"]):hover,
    .RNNXgb button:not([type="submit"]):hover,
    .gsst_a:hover,
    .gsst_e:hover,
    button.XDyW0e:hover,
    button.nDcEnd:hover,
    button.Tg7LZd:hover {
      background: rgba(74, 144, 226, 0.12) !important;
    }
    /* Icon colours — target the SVG paths and icon images directly. */
    form[role="search"] svg,
    form[role="search"] svg path,
    .A8SBwf svg,
    .A8SBwf svg path,
    .RNNXgb svg,
    .RNNXgb svg path,
    .gsst_a svg,
    .gsst_a svg path,
    button.XDyW0e svg,
    button.XDyW0e svg path,
    button.nDcEnd svg,
    button.nDcEnd svg path {
      fill: #1a4d80 !important;
      color: #1a4d80 !important;
    }
    /* The clear-X button (Google class .lXAaH on newer SERPs). */
    .lXAaH,
    .lXAaH:hover {
      color: #1a4d80 !important;
    }
    .lXAaH path,
    .lXAaH svg {
      fill: #1a4d80 !important;
    }

    /* ---- Glossy convex submit buttons ---------------------------- *
     * Homepage action buttons + form submits. Target by stable name
     * attributes (btnK / btnI) and class hooks (.gNO89b / .RNmpXc)
     * — the .lJ9FBc-scoped rule alone didn't catch them on the
     * default homepage because their wrapper class can vary.
     */
    .lJ9FBc input[type="submit"],
    input[name="btnK"],
    input[name="btnI"],
    input.gNO89b,
    input.RNmpXc,
    form[role="search"] button[type="submit"],
    form[action="/search"] button[type="submit"] {
      background: linear-gradient(180deg, #fbfbfb 0%, #e2e2e2 48%, #c8c8c8 100%) !important;
      border: 1px solid rgba(0,0,0,0.32) !important;
      border-radius: 6px !important;
      color: #1c1c1c !important;
      font: 500 13px/1 "Lucida Grande","Helvetica Neue","Segoe UI",sans-serif !important;
      padding: 7px 18px !important;
      margin: 11px 4px !important;
      box-shadow:
        inset 0 1px 0 rgba(255,255,255,0.9),
        inset 0 -1px 0 rgba(0,0,0,0.05),
        0 1px 0 rgba(255,255,255,0.55) !important;
      text-shadow: none !important;
      cursor: pointer !important;
      transition: background 80ms ease, transform 60ms ease, box-shadow 80ms ease !important;
    }
    .lJ9FBc input[type="submit"]:hover,
    input[name="btnK"]:hover,
    input[name="btnI"]:hover,
    input.gNO89b:hover,
    input.RNmpXc:hover,
    form[role="search"] button[type="submit"]:hover,
    form[action="/search"] button[type="submit"]:hover {
      background: linear-gradient(180deg, #ffffff 0%, #ececec 48%, #d2d2d2 100%) !important;
      border-color: rgba(0,0,0,0.4) !important;
    }
    .lJ9FBc input[type="submit"]:active,
    input[name="btnK"]:active,
    input[name="btnI"]:active,
    input.gNO89b:active,
    input.RNmpXc:active,
    form[role="search"] button[type="submit"]:active,
    form[action="/search"] button[type="submit"]:active {
      background: linear-gradient(180deg, #c0c0c0 0%, #b0b0b0 50%, #c0c0c0 100%) !important;
      box-shadow: inset 0 2px 4px rgba(0,0,0,0.2) !important;
      transform: translateY(1px) !important;
    }
    /* Focus ring — iTunes aqua */
    input[name="btnK"]:focus,
    input[name="btnI"]:focus,
    input.gNO89b:focus,
    input.RNmpXc:focus {
      outline: none !important;
      box-shadow:
        inset 0 1px 0 rgba(255,255,255,0.9),
        inset 0 -1px 0 rgba(0,0,0,0.05),
        0 0 0 3px rgba(74,144,226,0.35) !important;
    }

    /* ---- Soft corners on every button (colour-safe) -------------- */
    button, input[type="submit"], input[type="button"] {
      border-radius: 6px;
    }

    /* ---- Link colours: iTunes blue ------------------------------- */
    a, a:visited { color: #1a4d80 !important; }
    a:hover      { color: #2670c4 !important; }

    /* ---- Result titles ------------------------------------------ */
    h3, h3 a, a h3 { color: #1a4d80 !important; }
    a:hover h3, h3 a:hover { color: #2670c4 !important; }

    /* ---- Result URL (cite) → iTunes green ------------------------ */
    cite, [role="link"] cite { color: #2e7d32 !important; }

    /* ---- Readability: force Google's grey text classes darker ----
     * Google's default text-on-white is medium grey (#5f6368 / #70757a
     * area). On our silver bg those tones bleed into the background.
     * We bump the most common containers to a darker grey so snippets,
     * meta info and PAA text stay readable.
     */
    .VwiC3b,           /* result snippet body */
    .yXK7lf,           /* newer snippet class */
    .lyLwlc,           /* alt snippet */
    .aCOpRe,           /* span inside snippet */
    .aCOpRe span,
    .Y3iVZd,           /* description in carousels */
    .UMOHqf,           /* People-also-ask question text */
    .related-question-pair,
    .iUh30,            /* meta line under title */
    .byrV5b,           /* "·" separator + time */
    .fG8Fp,            /* "13 hours ago" etc. */
    .ylgVCe,
    .OSrXXb,           /* attribution */
    span.f,
    [data-content-feature] span,
    .kb0PBd .cHaqb,    /* knowledge card body */
    .kno-rdesc span,
    .yXK7lf em,
    .VwiC3b em {
      color: #2a2a2a !important;
    }
    /* The visited-result desaturated tint that Google sometimes applies */
    .fl, .gl, .S3Uucc, .MUxGbd { color: #3a3a3a !important; }
    /* Bullet/dot separators that Google paints in light grey */
    .csDOgf, .eFM0qc { color: #555 !important; }

    /* ---- Text selection ----------------------------------------- */
    ::selection {
      background: #4a90e2 !important;
      color: #ffffff !important;
    }

    /* ---- Force light when the user has system dark mode ---------- */
    @media (prefers-color-scheme: dark) {
      html, body {
        background: linear-gradient(180deg, #ececec 0%, #d4d4d4 100%) !important;
        color: #1a1a1a !important;
      }
    }

    /* ---- Google logo / doodle → plain "google" wordmark ---------
     * Hide the homepage logo (or the day's doodle) and drop in a
     * simple text wordmark instead — inserted by replaceLogo() below.
     * Scoped to the homepage logo area (#lga / #hplogo) so the small
     * results-page logo is left untouched.
     */
    #lga img, #lga svg, #hplogo, .lnXdpd {
      display: none !important;
    }
    [data-cf-wordmark] {
      font: 400 64px/1 "Lucida Grande","Helvetica Neue","Segoe UI",sans-serif !important;
      color: #3a3a3a !important;
      letter-spacing: -1px !important;
      text-align: center !important;
      text-shadow: 0 1px 0 rgba(255,255,255,0.6) !important;
      user-select: none !important;
      margin: 0 auto 6px !important;
    }

    /* ---- One-off: filter-pill row container transparent ---------- */
    div.zp6Lyf.FpfXM {
      background: transparent !important;
      background-image: none !important;
    }

    /* ---- #slim_appbar — empty placeholder, hide it --------------- */
    #slim_appbar {
      display: none !important;
      background: transparent !important;
      border: 0 !important;
      box-shadow: none !important;
    }

    /* ---- Search suggestions dropdown (autocomplete panel) -------- */
    /* The "Trending zoekopdrachten" + suggestion list that drops down
     * when you focus the search bar. We give the whole panel an iTunes
     * panel look (light gradient + soft border + rounded corners) and
     * each row gets a classic iTunes blue selection on hover.
     */
    div.aajZCb,
    div.gDtRnb,
    div.erkvQe,
    div.OBMEnb {
      background: linear-gradient(180deg, #fafafa 0%, #ececec 100%) !important;
      border: 1px solid #888 !important;
      border-radius: 6px !important;
      box-shadow:
        0 4px 16px rgba(0,0,0,0.18),
        inset 0 1px 0 rgba(255,255,255,0.8) !important;
      overflow: hidden !important;
    }
    /* If the panel is nested, only the outermost should keep the
     * border + shadow; the inner ones can be transparent so we don't
     * stack boxes. */
    div.gDtRnb,
    div.erkvQe,
    div.OBMEnb {
      background: transparent !important;
      border: 0 !important;
      box-shadow: none !important;
      border-radius: 0 !important;
    }
    /* The "Trending zoekopdrachten" header */
    .ynRric {
      background: linear-gradient(180deg, #e4e4e4 0%, #c8c8c8 100%) !important;
      color: #3a3a3a !important;
      font: 600 11px/1 "Lucida Grande","Helvetica Neue","Segoe UI",sans-serif !important;
      letter-spacing: 0.06em !important;
      text-transform: uppercase !important;
      padding: 7px 14px !important;
      border-bottom: 1px solid rgba(0,0,0,0.12) !important;
      text-shadow: 0 1px 0 rgba(255,255,255,0.55) !important;
    }
    /* Suggestion list */
    ul.G43f7e {
      list-style: none !important;
      margin: 0 !important;
      padding: 0 !important;
    }
    /* Each suggestion row */
    li.sbct.PZPZlf,
    li.sbct {
      background: transparent !important;
      border-bottom: 1px solid rgba(0,0,0,0.05) !important;
      transition: background 60ms ease, color 60ms ease !important;
    }
    /* Pinstripe alternating */
    li.sbct.PZPZlf:nth-child(odd) {
      background: rgba(0,0,0,0.022) !important;
    }
    /* iTunes blue gradient on hover/focus — classic list selection */
    li.sbct.PZPZlf:hover,
    li.sbct.PZPZlf:focus,
    li.sbct.PZPZlf[aria-selected="true"],
    li.sbct.PZPZlf.fsa {
      background: linear-gradient(180deg, #5da3e8 0%, #2670c4 100%) !important;
      color: #ffffff !important;
      border-bottom-color: #2670c4 !important;
    }
    li.sbct.PZPZlf:hover .wM6W7d span,
    li.sbct.PZPZlf:hover span,
    li.sbct.PZPZlf:focus .wM6W7d span,
    li.sbct.PZPZlf[aria-selected="true"] .wM6W7d span,
    li.sbct.PZPZlf.fsa .wM6W7d span {
      color: #ffffff !important;
    }
    /* The trending arrow icon next to each suggestion */
    .sbic.sb33 svg,
    .sbic.sb33 svg path,
    svg.x6vvNd,
    svg.x6vvNd path {
      fill: #1a4d80 !important;
    }
    /* On hover, flip icon to white so it pops on the blue selection */
    li.sbct.PZPZlf:hover .sbic.sb33 svg,
    li.sbct.PZPZlf:hover .sbic.sb33 svg path,
    li.sbct.PZPZlf:hover svg.x6vvNd,
    li.sbct.PZPZlf:hover svg.x6vvNd path,
    li.sbct.PZPZlf[aria-selected="true"] .sbic.sb33 svg path,
    li.sbct.PZPZlf.fsa .sbic.sb33 svg path {
      fill: #ffffff !important;
    }
    /* Suggestion text */
    .wM6W7d,
    .wM6W7d span,
    .lnnVSe {
      color: #1a1a1a !important;
      font-family: "Lucida Grande","Helvetica Neue","Segoe UI",sans-serif !important;
    }
    /* "Verwijderen" remove button if shown */
    .AQZ9Vd .sbai {
      color: #c62828 !important;
      font-size: 11px !important;
    }
    li.sbct.PZPZlf:hover .AQZ9Vd .sbai {
      color: #ffe082 !important;
    }

    /* ---- Top-right "Gmail" / "Afbeeldingen" links → iTunes pills - */
    /* By default Google renders these as plain text links in the top
     * bar. We promote them to small iTunes glossy convex pills, same
     * recipe as the Inloggen button below, so the whole top-right
     * cluster reads as a row of matching pills.
     */
    a.gb_4 {
      display: inline-flex !important;
      align-items: center !important;
      padding: 5px 14px !important;
      background: linear-gradient(180deg, #fbfbfb 0%, #e2e2e2 48%, #c8c8c8 100%) !important;
      color: #1a4d80 !important;
      border: 1px solid rgba(0,0,0,0.28) !important;
      border-radius: 999px !important;
      text-decoration: none !important;
      font: 500 12px/1 "Lucida Grande","Helvetica Neue","Segoe UI",sans-serif !important;
      box-shadow:
        inset 0 1px 0 rgba(255,255,255,0.9),
        inset 0 -1px 0 rgba(0,0,0,0.05),
        0 1px 0 rgba(255,255,255,0.55) !important;
      transition: background 80ms ease, box-shadow 80ms ease, transform 60ms ease !important;
    }
    a.gb_4:hover {
      background: linear-gradient(180deg, #ffffff 0%, #ececec 48%, #d2d2d2 100%) !important;
      color: #2670c4 !important;
      text-decoration: none !important;
    }
    a.gb_4:active {
      background: linear-gradient(180deg, #c0c0c0 0%, #b0b0b0 50%, #c0c0c0 100%) !important;
      box-shadow: inset 0 2px 4px rgba(0,0,0,0.2) !important;
      transform: translateY(1px) !important;
    }
    /* The wrappers around each link — give them a bit of breathing room. */
    div.gb_5.gb_6 {
      display: inline-flex !important;
      margin-right: 6px !important;
    }

    /* ---- Top-right "Inloggen" sign-in pill (a.gb_A) -------------- */
    /* Google ships this as a light-blue pill. Match the rest of the
     * template's iTunes glossy convex look, keep the pill shape.
     */
    a.gb_A {
      background: linear-gradient(180deg, #fbfbfb 0%, #e2e2e2 48%, #c8c8c8 100%) !important;
      color: #1a4d80 !important;
      border: 1px solid rgba(0,0,0,0.28) !important;
      border-radius: 999px !important;
      box-shadow:
        inset 0 1px 0 rgba(255,255,255,0.9),
        inset 0 -1px 0 rgba(0,0,0,0.05),
        0 1px 0 rgba(255,255,255,0.55) !important;
      transition: background 80ms ease, box-shadow 80ms ease, transform 60ms ease !important;
    }
    a.gb_A:hover {
      background: linear-gradient(180deg, #ffffff 0%, #ececec 48%, #d2d2d2 100%) !important;
    }
    a.gb_A:active {
      background: linear-gradient(180deg, #c0c0c0 0%, #b0b0b0 50%, #c0c0c0 100%) !important;
      box-shadow: inset 0 2px 4px rgba(0,0,0,0.2) !important;
      transform: translateY(1px) !important;
    }
    a.gb_A .gb_0 {
      color: #1a4d80 !important;
      font-weight: 500 !important;
    }

  `;

  function injectStyle() {
    if (document.querySelector('[data-cf-google-style]')) return;
    const style = document.createElement('style');
    style.setAttribute('data-cf-google-style', '');
    style.textContent = css;
    (document.head || document.documentElement).appendChild(style);
  }

  // Swap the homepage Google logo / doodle for a plain "google" wordmark.
  function replaceLogo() {
    const slot = document.querySelector('#lga')
      || (document.querySelector('#hplogo') && document.querySelector('#hplogo').parentElement);
    if (!slot || slot.querySelector('[data-cf-wordmark]')) return;
    const mark = document.createElement('div');
    mark.setAttribute('data-cf-wordmark', '');
    mark.textContent = 'google';
    slot.appendChild(mark);
  }

  function apply() { injectStyle(); replaceLogo(); }

  apply();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', apply, { once: true });
  }
  // A doodle can swap in after load — retry briefly, then stop.
  let tries = 0;
  const retry = setInterval(() => { replaceLogo(); if (++tries >= 6) clearInterval(retry); }, 400);
})();
