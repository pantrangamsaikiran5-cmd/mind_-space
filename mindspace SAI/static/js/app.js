/* ============================================================
   MindSpace — app.js
   Vanilla JS, no build step. Talks to the FastAPI backend in
   app.py via the /api/* routes.
   ============================================================ */
(() => {
  "use strict";

  const MOODS = ["Venting", "SmallWins", "Gratitude", "Advice", "NightThoughts", "Anxious", "Hopeful"];

  const state = {
    view: "public",
    token: localStorage.getItem("mindspace_token") || null,
    alias: localStorage.getItem("mindspace_alias") || null,
    composerTarget: "public", // 'public' | 'private'
  };

  /* ---------------- helpers ---------------- */
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  async function api(path, { method = "GET", body, auth = false } = {}) {
    const headers = { "Content-Type": "application/json" };
    if (auth && state.token) headers["Authorization"] = `Bearer ${state.token}`;
    const res = await fetch(`/api${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
    let data = null;
    try { data = await res.json(); } catch (_) { /* no body */ }
    return { ok: res.ok, status: res.status, data };
  }

  function timeAgo(iso) {
    const diffMs = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  }

  function toast(message, type = "default") {
    const stack = $("#toastStack");
    const el = document.createElement("div");
    el.className = `toast ${type === "error" ? "toast-error" : type === "success" ? "toast-success" : ""}`;
    el.textContent = message;
    stack.appendChild(el);
    setTimeout(() => el.remove(), 4200);
  }

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  /* ---------------- view routing ---------------- */
  function showView(name) {
    state.view = name;
    $$(".view").forEach(v => v.classList.toggle("active", v.dataset.view === name));
    $$("[data-view-link]").forEach(a => a.classList.toggle("active", a.dataset.viewLink === name));
    if (name === "public") loadPublicFeed();
    if (name === "private") refreshPrivateGate();
  }

  $$("[data-view-link]").forEach(a => {
    a.addEventListener("click", (e) => {
      e.preventDefault();
      showView(a.dataset.viewLink);
      $("#navLinks").classList.remove("open");
    });
  });

  $("#navBurger").addEventListener("click", () => $("#navLinks").classList.toggle("open"));

  /* ---------------- mood filter + select ---------------- */
  function renderMoodFilter() {
    const wrap = $("#moodFilter");
    wrap.innerHTML = "";
    const allBtn = document.createElement("button");
    allBtn.textContent = "All moods";
    allBtn.className = "active";
    allBtn.dataset.mood = "";
    wrap.appendChild(allBtn);
    MOODS.forEach(m => {
      const b = document.createElement("button");
      b.textContent = m.replace(/([A-Z])/g, " $1").trim();
      b.dataset.mood = m;
      wrap.appendChild(b);
    });
    wrap.addEventListener("click", (e) => {
      const btn = e.target.closest("button");
      if (!btn) return;
      $$("button", wrap).forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      renderFeed("publicFeed", publicPosts.filter(p => !btn.dataset.mood || p.mood_tag === btn.dataset.mood));
    });
  }

  function fillMoodSelect() {
    const sel = $("#moodSelect");
    sel.innerHTML = MOODS.map(m => `<option value="${m}">${m.replace(/([A-Z])/g, " $1").trim()}</option>`).join("");
  }

  /* ---------------- feed rendering ---------------- */
  let publicPosts = [];

  function postCard(post) {
    const el = document.createElement("div");
    el.className = "post-card";
    el.innerHTML = `
      <div class="post-top">
        <span class="mood-chip">${escapeHtml(post.mood_tag || "Venting")}</span>
        <span class="post-author">${escapeHtml(post.author_alias)}</span>
      </div>
      <p class="post-content">${escapeHtml(post.content)}</p>
      <div class="post-bottom">
        <span class="post-time">${timeAgo(post.created_at)}</span>
        <div class="reactions">
          <button class="react-btn" data-react="hug" data-id="${post.id}">🤍 <span>${post.hugs_count}</span></button>
          <button class="react-btn" data-react="feel" data-id="${post.id}">✨ <span>${post.feels_count}</span></button>
        </div>
      </div>
    `;
    return el;
  }

  function renderFeed(containerId, posts) {
    const container = $(`#${containerId}`);
    container.innerHTML = "";
    if (!posts.length) {
      container.innerHTML = `
        <div class="empty-state">
          <span class="orb orb-sm breathing"></span>
          <p>Nothing here yet. Be the first to say something.</p>
        </div>`;
      return;
    }
    posts.forEach(p => container.appendChild(postCard(p)));
  }

  async function loadPublicFeed() {
    const { ok, data } = await api("/posts/public");
    if (!ok) { toast("Couldn't load the community feed.", "error"); return; }
    publicPosts = data;
    renderFeed("publicFeed", publicPosts);
    updateHeroStats();
  }

  async function loadPrivateFeed() {
    const { ok, data, status } = await api("/posts/private", { auth: true });
    if (status === 401) { logout(); return; }
    if (!ok) { toast("Couldn't load the Private Sector feed.", "error"); return; }
    renderFeed("privateFeed", data);
  }

  function updateHeroStats() {
    $("#statPosts").textContent = publicPosts.length;
    $("#statHugs").textContent = publicPosts.reduce((sum, p) => sum + (p.hugs_count || 0), 0);
  }

  /* reactions (event delegation on document) */
  document.addEventListener("click", async (e) => {
    const btn = e.target.closest(".react-btn");
    if (!btn) return;
    const id = btn.dataset.id;
    const reaction = btn.dataset.react;
    btn.classList.add("pulsed");
    setTimeout(() => btn.classList.remove("pulsed"), 300);
    const { ok, data } = await api(`/posts/${id}/react?reaction=${reaction}`, { method: "POST" });
    if (ok) {
      const span = btn.querySelector("span");
      span.textContent = reaction === "hug" ? data.hugs : data.feels;
    }
  });

  /* ---------------- auth / private sector ---------------- */
  function refreshPrivateGate() {
    if (state.token && state.alias) {
      $("#authGate").classList.add("hidden");
      $("#privateContent").classList.remove("hidden");
      $("#privateAlias").textContent = state.alias;
      loadPrivateFeed();
    } else {
      $("#authGate").classList.remove("hidden");
      $("#privateContent").classList.add("hidden");
    }
  }

  $$(".auth-tab").forEach(tab => {
    tab.addEventListener("click", () => {
      $$(".auth-tab").forEach(t => t.classList.remove("active"));
      tab.classList.add("active");
      $("#loginForm").classList.toggle("hidden", tab.dataset.tab !== "login");
      $("#registerForm").classList.toggle("hidden", tab.dataset.tab !== "register");
    });
  });

  function setSession(alias, token) {
    state.alias = alias;
    state.token = token;
    localStorage.setItem("mindspace_alias", alias);
    localStorage.setItem("mindspace_token", token);
  }

  function logout() {
    state.alias = null;
    state.token = null;
    localStorage.removeItem("mindspace_alias");
    localStorage.removeItem("mindspace_token");
    refreshPrivateGate();
    toast("You've been logged out.");
  }
  $("#logoutBtn").addEventListener("click", logout);

  $("#loginForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const errEl = $('[data-error="login"]');
    errEl.textContent = "";
    const fd = new FormData(e.target);
    const { ok, data } = await api("/auth/login", {
      method: "POST",
      body: { alias: fd.get("alias"), password: fd.get("password") },
    });
    if (!ok) { errEl.textContent = data?.detail || "Login failed."; return; }
    setSession(data.alias, data.token);
    e.target.reset();
    refreshPrivateGate();
    toast(`Welcome back, ${data.alias}.`, "success");
  });

  $("#registerForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const errEl = $('[data-error="register"]');
    errEl.textContent = "";
    const fd = new FormData(e.target);
    const { ok, data } = await api("/auth/register", {
      method: "POST",
      body: { alias: fd.get("alias"), password: fd.get("password") },
    });
    if (!ok) { errEl.textContent = data?.detail || "Registration failed."; return; }
    setSession(data.alias, data.token);
    e.target.reset();
    refreshPrivateGate();
    toast(`Your alias "${data.alias}" is ready.`, "success");
  });

  /* ---------------- post composer ---------------- */
  function openPostModal(target) {
    state.composerTarget = target;
    $("#postModalEyebrow").textContent = target === "private" ? "Private Sector" : "Public feed";
    $("#postModal").classList.remove("hidden");
  }
  $("#newPostBtn-public").addEventListener("click", () => openPostModal("public"));
  $("#newPostBtn-private").addEventListener("click", () => openPostModal("private"));

  $("#postForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const errEl = $('[data-error="post"]');
    errEl.textContent = "";
    const fd = new FormData(e.target);
    const isPrivate = state.composerTarget === "private";
    const payload = {
      content: fd.get("content"),
      mood_tag: fd.get("mood_tag"),
      alias: fd.get("alias") || "Anonymous Friend",
    };
    const { ok, status, data } = await api(isPrivate ? "/posts/private" : "/posts/public", {
      method: "POST",
      body: payload,
      auth: isPrivate,
    });
    if (status === 400 && data?.blocked) {
      if (data.reason === "crisis_detected") {
        closeModal("postModal");
        showCrisisModal(data);
      } else {
        errEl.textContent = data.message || "That message can't be posted here.";
      }
      return;
    }
    if (!ok) { errEl.textContent = data?.detail || "Something went wrong posting that."; return; }
    e.target.reset();
    closeModal("postModal");
    toast("Posted. Thank you for sharing.", "success");
    if (isPrivate) loadPrivateFeed(); else loadPublicFeed();
  });

  function closeModal(id) { $(`#${id}`).classList.add("hidden"); }
  $$("[data-close]").forEach(btn => btn.addEventListener("click", () => closeModal(btn.dataset.close)));
  $$(".modal-overlay").forEach(ov => ov.addEventListener("click", (e) => { if (e.target === ov) ov.classList.add("hidden"); }));

  /* ---------------- crisis modal ---------------- */
  function showCrisisModal(analysis) {
    const res = analysis.resources || {};
    $("#crisisTitle").textContent = res.title || "You are not alone";
    $("#crisisDescription").textContent = res.description || analysis.message || "";
    $("#crisisContacts").innerHTML = (res.contacts || []).map(c => `
      <div class="crisis-contact">
        <strong>${escapeHtml(c.name)}</strong>
        <span>${escapeHtml(c.number || c.website || "")}</span>
      </div>`).join("");
    $("#crisisTips").innerHTML = (res.immediate_tips || []).length
      ? `<ul>${res.immediate_tips.map(t => `<li>${escapeHtml(t)}</li>`).join("")}</ul>` : "";
    $("#crisisModal").classList.remove("hidden");
  }

  /* ---------------- breathing exercise ---------------- */
  let breatheTimer = null;
  function runBreathingCycle(orb, label, onTick) {
    const phases = [
      { name: "Breathe in…", cls: "inhale", ms: 4000 },
      { name: "Hold…", cls: "hold", ms: 4000 },
      { name: "Let it go…", cls: "exhale", ms: 6000 },
    ];
    let i = 0;
    function step() {
      const phase = phases[i % phases.length];
      orb.classList.remove("inhale", "hold", "exhale");
      void orb.offsetWidth; // restart transition
      orb.classList.add(phase.cls);
      label.textContent = phase.name;
      i++;
      breatheTimer = setTimeout(step, phase.ms);
    }
    step();
  }
  function stopBreathing(orb, label, idleText) {
    clearTimeout(breatheTimer);
    orb.classList.remove("inhale", "hold", "exhale");
    label.textContent = idleText;
  }

  $("#breatheStartBtn").addEventListener("click", () => {
    runBreathingCycle($("#breatheOrb"), $("#breatheLabel"));
    $("#breatheStartBtn").classList.add("hidden");
    $("#breatheStopBtn").classList.remove("hidden");
  });
  $("#breatheStopBtn").addEventListener("click", () => {
    stopBreathing($("#breatheOrb"), $("#breatheLabel"), "Press start when you're ready");
    $("#breatheStartBtn").classList.remove("hidden");
    $("#breatheStopBtn").classList.add("hidden");
  });
  $("#heroBreatheBtn").addEventListener("click", () => {
    showView("breathe");
    location.hash = "#breathe";
    $("#breatheStartBtn").click();
  });

  /* ---------------- feedback ---------------- */
  let starValue = 0;
  $$(".star", $("#starRating")).forEach(star => {
    star.addEventListener("click", () => {
      starValue = Number(star.dataset.star);
      $("#starRating").dataset.value = starValue;
      $$(".star", $("#starRating")).forEach(s => s.classList.toggle("filled", Number(s.dataset.star) <= starValue));
    });
  });

  $("#feedbackForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const errEl = $('[data-error="feedback"]');
    errEl.textContent = "";
    if (starValue === 0) { errEl.textContent = "Pick a star rating first."; return; }
    const fd = new FormData(e.target);
    const { ok, data } = await api("/feedback", {
      method: "POST",
      body: { rating: starValue, message: fd.get("message"), alias: fd.get("alias") || "Anonymous Guest" },
    });
    if (!ok) { errEl.textContent = data?.detail || "Couldn't send feedback."; return; }
    e.target.reset();
    starValue = 0;
    $("#starRating").dataset.value = 0;
    $$(".star", $("#starRating")).forEach(s => s.classList.remove("filled"));
    toast(data.message || "Thank you for your feedback.", "success");
  });

  /* ---------------- MindBot chat ---------------- */
  function openChat() { $("#chatPanel").classList.remove("hidden"); }
  function closeChat() { $("#chatPanel").classList.add("hidden"); }
  $("#chatBubbleBtn").addEventListener("click", () => {
    $("#chatPanel").classList.toggle("hidden");
  });
  $("#closeChatBtn").addEventListener("click", closeChat);
  $("#openChatBtn").addEventListener("click", openChat);

  function addChatMsg(text, cls) {
    const messages = $("#chatMessages");
    const el = document.createElement("div");
    el.className = `chat-msg ${cls}`;
    el.textContent = text;
    messages.appendChild(el);
    messages.scrollTop = messages.scrollHeight;
    return el;
  }

  function addTyping() {
    const messages = $("#chatMessages");
    const el = document.createElement("div");
    el.className = "chat-msg-typing";
    el.id = "typingIndicator";
    el.innerHTML = "<span></span><span></span><span></span>";
    messages.appendChild(el);
    messages.scrollTop = messages.scrollHeight;
  }
  function removeTyping() { $("#typingIndicator")?.remove(); }

  $("#chatForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const input = e.target.elements.message;
    const message = input.value.trim();
    if (!message) return;
    addChatMsg(message, "chat-msg-user");
    input.value = "";
    addTyping();
    const { ok, data } = await api("/chat/mindbot", { method: "POST", body: { message } });
    removeTyping();
    if (!ok) { addChatMsg("MindBot is having trouble responding right now. Please try again in a moment.", "chat-msg-bot"); return; }
    if (data.analysis?.status === "crisis") {
      addChatMsg(data.reply, "chat-msg-crisis");
      showCrisisModal(data.analysis);
    } else {
      addChatMsg(data.reply, "chat-msg-bot");
    }
  });

  /* ---------------- init ---------------- */
  function initFromHash() {
    const hash = location.hash.replace("#", "");
    const valid = ["community", "private", "breathe", "feedback"];
    const map = { community: "public", private: "private", breathe: "breathe", feedback: "feedback" };
    if (valid.includes(hash)) showView(map[hash]);
    else showView("public");
  }

  renderMoodFilter();
  fillMoodSelect();
  refreshPrivateGate();
  initFromHash();
})();
