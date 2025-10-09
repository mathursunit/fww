
(function(){
  const $ = sel => document.querySelector(sel);
  const $$ = sel => Array.from(document.querySelectorAll(sel));
  const ls = window.localStorage;

  // Theme toggle
  const themeBtn = $("#btn-theme");
  function applyTheme(mode){
    document.documentElement.dataset.theme = mode;
    ls.setItem("ss_theme", mode);
    if(themeBtn){ themeBtn.textContent = mode === "dark" ? "Light" : "Dark"; themeBtn.setAttribute("aria-pressed", mode==="dark"); }
  }
  const savedTheme = ls.getItem("ss_theme") || "dark";
  applyTheme(savedTheme);
  themeBtn?.addEventListener("click", ()=> applyTheme(document.documentElement.dataset.theme === "dark" ? "light":"dark"));

  // High contrast
  const optContrast = $("#opt-contrast");
  function applyContrast(on){
    document.body.classList.toggle("high-contrast", !!on);
    ls.setItem("ss_contrast", on ? "1":"0");
  }
  applyContrast(ls.getItem("ss_contrast")==="1");
  optContrast?.addEventListener("change", e=> applyContrast(e.target.checked));

  // Menu dialog
  const dlgMenu = $("#dlg-menu");
  $("#btn-menu")?.addEventListener("click", ()=> dlgMenu?.showModal());
  dlgMenu?.addEventListener("click", (e)=> { if(e.target === dlgMenu) dlgMenu.close(); });

  // Stats (basic schema)
  const stats = JSON.parse(ls.getItem("ss_stats") || '{"played":0,"wins":0,"streak":0,"maxStreak":0,"dist":[0,0,0,0,0,0]}');

  function saveStats(){ ls.setItem("ss_stats", JSON.stringify(stats)); }

  // Hook into existing game functions if available
  // We try to detect a global publish function or events
  window.SS_WORDLE = window.SS_WORDLE || {};
  window.SS_WORDLE.onGameEnd = function({won, guesses}){
    stats.played += 1;
    if(won){
      stats.wins += 1;
      stats.streak += 1;
      stats.maxStreak = Math.max(stats.maxStreak, stats.streak);
      const idx = Math.min(Math.max(guesses-1,0), 5);
      stats.dist[idx] += 1;
    } else {
      stats.streak = 0;
    }
    saveStats();
    renderStats();
  };

  // Stats modal
  const dlgStats = $("#dlg-stats");
  $("#btn-stats")?.addEventListener("click", ()=> { renderStats(); dlgStats?.showModal(); });
  $("#btn-stats-close")?.addEventListener("click", ()=> dlgStats?.close());
  dlgStats?.addEventListener("click", (e)=> { if(e.target === dlgStats) dlgStats.close(); });

  function renderStats(){
    $("#stat-played").textContent = stats.played;
    const winpct = stats.played ? Math.round((stats.wins/stats.played)*100) : 0;
    $("#stat-winpct").textContent = winpct;
    $("#stat-streak").textContent = stats.streak;
    $("#stat-maxstreak").textContent = stats.maxStreak;
    // Draw simple bar chart
    const c = $("#guess-dist");
    if(!c) return;
    const ctx = c.getContext("2d");
    ctx.clearRect(0,0,c.width,c.height);
    const maxv = Math.max(...stats.dist, 1);
    const w = 40, gap = 25, base = c.height - 20;
    stats.dist.forEach((v,i)=>{
      const h = Math.round((v/maxv) * (c.height-60));
      ctx.fillRect(30 + i*(w+gap), base-h, w, h);
      ctx.fillText(String(i+1), 30 + i*(w+gap) + 14, base+14);
      ctx.fillText(String(v), 30 + i*(w+gap) + 12, base-h-6);
    });
  }

  // Share
  $("#btn-share")?.addEventListener("click", async ()=>{
    try {
      // We try to read current emoji board if the game exposes it
      const board = window.SS_WORDLE?.exportResult ? window.SS_WORDLE.exportResult() : null;
      const text = board || "Fun with words — I played today!";
      if(navigator.share){
        await navigator.share({ text });
      } else {
        await navigator.clipboard.writeText(text);
        toast("Copied results to clipboard");
      }
    } catch(e){ console.error(e); toast("Couldn't share"); }
  });

  // Hard mode
  const hardBtn = $("#btn-hard");
  function applyHard(on){
    ls.setItem("ss_hard", on ? "1":"0");
    hardBtn?.setAttribute("aria-pressed", on ? "true":"false");
    window.SS_WORDLE.setHardMode?.(on);
    toast(on ? "Hard mode ON" : "Hard mode OFF");
  }
  applyHard(ls.getItem("ss_hard")==="1");
  hardBtn?.addEventListener("click", ()=> applyHard(!(ls.getItem("ss_hard")==="1")));

  // Toast helper (non-invasive; falls back to existing if present)
  function toast(msg){
    const cont = document.getElementById("toast-container") || (function(){
      const d = document.createElement("div"); d.id="toast-container"; document.body.appendChild(d); return d;
    
  // === Passive bridge to detect game-end without touching script.js ===
  (function setupPassiveBridge(){
    const st = { lastRowReported: -1, gameOver: false };
    function rowToString(r){
      try{
        return (window.rows?.[r] || []).map(t=> t.textContent || "").join("");
      }catch{return "";}
    }
    function isRowFull(r){
      const arr = window.rows?.[r] || [];
      return arr.length===5 && arr.every(t=> (t.textContent||"").length===1);
    }
    function classesOf(r){
      const arr = window.rows?.[r] || [];
      return arr.map(t=> t.className || "");
    }
    function toEmojiRow(cls){
      // Map contains 'correct','present','absent' tokens
      const has = (s,k)=> s.indexOf(k)>=0;
      return cls.map(c => has(c,"correct") ? "🟩" : has(c,"present") ? "🟨" : "⬛").join("");
    }
    function exportBoard(){
      const rowsEl = Array.from(document.querySelectorAll(".row"));
      const lines = rowsEl.map((row,i)=>{
        const arr = Array.from(row.children || []);
        const cls = arr.map(td => td.className || "");
        return toEmojiRow(cls);
      }).filter(l=> l && l.length===5);
      const day = (typeof getDailyIndex === "function") ? getDailyIndex() : undefined;
      const title = day!=null ? `SunSar Wordle ${day}` : "SunSar Wordle";
      return `${title}\n${lines.join("\n")}`;
    }
    // Public export hook
    window.SS_WORDLE.exportResult = exportBoard;

    function tick(){
      try{
        if(st.gameOver) return;
        if(typeof window.currentRow === "number" && typeof window.solution === "string"){
          // If the previous row just got finalized
          const prev = window.currentRow - 1;
          if(prev >= 0 && prev !== st.lastRowReported && isRowFull(prev)){
            // Determine win/lose
            const guess = rowToString(prev);
            if(guess.length===5){
              const won = (guess === window.solution);
              const guesses = prev + 1;
              if((won) || (!won && window.currentRow >= 6)){
                st.gameOver = true;
                window.SS_WORDLE.onGameEnd?.({ won, guesses });
              }
              st.lastRowReported = prev;
            }
          }
        }
      }catch(e){ /* ignore */ }
    }
    setInterval(tick, 250);
  })();

})();
    const t = document.createElement("div");
    t.className = "toast";
    t.textContent = msg;
    cont.appendChild(t);
    setTimeout(()=>{ t.remove(); }, 2200);
  }

  // PWA SW
  if("serviceWorker" in navigator){
    navigator.serviceWorker.register("./sw.js").catch(()=>{});
  }

  // === Passive bridge to detect game-end without touching script.js ===
  (function setupPassiveBridge(){
    const st = { lastRowReported: -1, gameOver: false };
    function rowToString(r){
      try{
        return (window.rows?.[r] || []).map(t=> t.textContent || "").join("");
      }catch{return "";}
    }
    function isRowFull(r){
      const arr = window.rows?.[r] || [];
      return arr.length===5 && arr.every(t=> (t.textContent||"").length===1);
    }
    function classesOf(r){
      const arr = window.rows?.[r] || [];
      return arr.map(t=> t.className || "");
    }
    function toEmojiRow(cls){
      // Map contains 'correct','present','absent' tokens
      const has = (s,k)=> s.indexOf(k)>=0;
      return cls.map(c => has(c,"correct") ? "🟩" : has(c,"present") ? "🟨" : "⬛").join("");
    }
    function exportBoard(){
      const rowsEl = Array.from(document.querySelectorAll(".row"));
      const lines = rowsEl.map((row,i)=>{
        const arr = Array.from(row.children || []);
        const cls = arr.map(td => td.className || "");
        return toEmojiRow(cls);
      }).filter(l=> l && l.length===5);
      const day = (typeof getDailyIndex === "function") ? getDailyIndex() : undefined;
      const title = day!=null ? `SunSar Wordle ${day}` : "SunSar Wordle";
      return `${title}\n${lines.join("\n")}`;
    }
    // Public export hook
    window.SS_WORDLE.exportResult = exportBoard;

    function tick(){
      try{
        if(st.gameOver) return;
        if(typeof window.currentRow === "number" && typeof window.solution === "string"){
          // If the previous row just got finalized
          const prev = window.currentRow - 1;
          if(prev >= 0 && prev !== st.lastRowReported && isRowFull(prev)){
            // Determine win/lose
            const guess = rowToString(prev);
            if(guess.length===5){
              const won = (guess === window.solution);
              const guesses = prev + 1;
              if((won) || (!won && window.currentRow >= 6)){
                st.gameOver = true;
                window.SS_WORDLE.onGameEnd?.({ won, guesses });
              }
              st.lastRowReported = prev;
            }
          }
        }
      }catch(e){ /* ignore */ }
    }
    setInterval(tick, 250);
  })();

})(); 
