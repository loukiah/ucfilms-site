/* undercurrent films — interactions */
(function () {
  "use strict";

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var saveData = navigator.connection && navigator.connection.saveData;

  /* ---------- Hero waves: drift on their own, part around the cursor or finger ---------- */
  function initWaves(canvas) {
    var ctx = canvas.getContext("2d");
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var w = 0, h = 0, visible = true, raf = 0;
    var css = getComputedStyle(document.documentElement);
    var accent = css.getPropertyValue("--accent").trim() || "#c9d6c3";
    var lines = [
      { y: 0.30, amp: 16, len: 340, speed: 0.00042, color: accent, alpha: 1, width: 1.6, seed: 0.3 },
      { y: 0.52, amp: 13, len: 420, speed: -0.00031, color: "#edeae3", alpha: 0.55, width: 1.1, seed: 1.7 },
      { y: 0.74, amp: 11, len: 520, speed: 0.00024, color: "#edeae3", alpha: 0.3, width: 1.1, seed: 3.1 }
    ];
    var ptr = { x: -9999, y: -9999, tx: -9999, ty: -9999, s: 0, on: 0 };

    function resize() {
      var r = canvas.getBoundingClientRect();
      w = r.width; h = r.height;
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (reduceMotion) draw(0);
    }

    function yAt(l, x, t) {
      var base = l.y * h;
      var k = (Math.PI * 2) / l.len;
      // a few slow, unrelated sines so the motion never quite repeats
      var drift = Math.sin(t * 0.00011 + l.seed) * 0.6 + Math.sin(t * 0.00007 + l.seed * 2.3) * 0.4;
      var y = base
        + l.amp * (1 + 0.45 * drift) * Math.sin(x * k + t * l.speed * 6 + l.seed)
        + l.amp * 0.45 * Math.sin(x * k * 2.3 - t * l.speed * 4 + l.seed * 1.9)
        + 6 * Math.sin(x * 0.0021 + t * 0.00023 + l.seed * 4);
      if (ptr.s > 0.001) {
        var dx = x - ptr.x, dy = y - ptr.y;
        var fall = Math.exp(-(dx * dx) / 26000) * Math.exp(-(dy * dy) / 5200);
        y += (dy >= 0 ? 1 : -1) * 46 * fall * ptr.s;
      }
      return y;
    }

    function draw(t) {
      ctx.clearRect(0, 0, w, h);
      for (var i = 0; i < lines.length; i++) {
        var l = lines[i];
        ctx.beginPath();
        for (var x = -10; x <= w + 10; x += 6) {
          var y = yAt(l, x, t);
          if (x === -10) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.strokeStyle = l.color;
        ctx.globalAlpha = l.alpha;
        ctx.lineWidth = l.width;
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }

    function loop(t) {
      ptr.x += (ptr.tx - ptr.x) * 0.14;
      ptr.y += (ptr.ty - ptr.y) * 0.14;
      ptr.s += (ptr.on - ptr.s) * 0.06;
      draw(t);
      raf = visible ? requestAnimationFrame(loop) : 0;
    }

    function point(e) {
      var r = canvas.getBoundingClientRect();
      ptr.tx = e.clientX - r.left; ptr.ty = e.clientY - r.top; ptr.on = 1;
      if (ptr.x < -1000) { ptr.x = ptr.tx; ptr.y = ptr.ty; }
    }
    var hero = canvas.closest("[data-hero]") || canvas;
    hero.addEventListener("pointermove", point, { passive: true });
    hero.addEventListener("pointerdown", point, { passive: true });
    hero.addEventListener("pointerleave", function () { ptr.on = 0; });
    hero.addEventListener("pointerup", function (e) { if (e.pointerType !== "mouse") ptr.on = 0; });
    hero.addEventListener("pointercancel", function () { ptr.on = 0; });

    if ("ResizeObserver" in window) new ResizeObserver(resize).observe(canvas); else window.addEventListener("resize", resize);
    resize();
    if (reduceMotion) return;
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (es) {
        visible = es[0].isIntersecting;
        if (visible && !raf) raf = requestAnimationFrame(loop);
      }).observe(canvas);
    }
    raf = requestAnimationFrame(loop);
  }
  var wavesEl = document.querySelector("[data-waves]");
  if (wavesEl && wavesEl.getContext) initWaves(wavesEl);

  /* ---------- Rotating words ---------- */
  document.querySelectorAll("[data-rotate]").forEach(function (el) {
    var words;
    try { words = JSON.parse(el.getAttribute("data-rotate")); } catch (e) { return; }
    if (!words || words.length < 2 || reduceMotion) return;
    // Reserve room for the longest word so nothing below jumps when it changes.
    function reserve() {
      var current = el.textContent, max = 0;
      el.style.minHeight = "";
      words.forEach(function (w) { el.textContent = w; max = Math.max(max, el.getBoundingClientRect().height); });
      el.textContent = current;
      el.style.minHeight = Math.ceil(max) + "px";
    }
    reserve();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(reserve);
    var rt; window.addEventListener("resize", function () { clearTimeout(rt); rt = setTimeout(reserve, 150); });
    var i = 0, every = parseInt(el.getAttribute("data-interval"), 10) || 2800;
    setInterval(function () {
      el.classList.add("is-out");
      setTimeout(function () {
        i = (i + 1) % words.length;
        el.textContent = words[i];
        el.classList.remove("is-out");
      }, 450);
    }, every);
  });

  /* ---------- Silent looping clips: load and play only while on screen ---------- */
  var loops = document.querySelectorAll("video[data-loop]");
  function prepare(v) {
    if (v.dataset.ready) return;
    v.dataset.ready = "1";
    var start = parseFloat(v.dataset.start || "0");
    var len = parseFloat(v.dataset.length || "0");
    if (start || len) {
      v.loop = false;
      v.addEventListener("loadedmetadata", function () { v.currentTime = start; });
      v.addEventListener("timeupdate", function () {
        if (len && v.currentTime >= start + len) v.currentTime = start;
      });
      v.addEventListener("ended", function () { v.currentTime = start; v.play().catch(function () {}); });
    }
    v.src = v.dataset.loop;
    v.load();
  }
  if (!reduceMotion && !saveData && "IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        var v = en.target;
        if (en.isIntersecting) {
          prepare(v);
          var p = v.play(); if (p && p.catch) p.catch(function () {});
        } else if (!v.paused) {
          v.pause();
        }
      });
    }, { rootMargin: "200px 0px", threshold: 0.15 });
    loops.forEach(function (v) { if (v.dataset.loop) io.observe(v); });
  }

  /* ---------- More work ---------- */
  var more = document.querySelector("[data-more]");
  if (more) more.addEventListener("click", function () {
    document.querySelectorAll(".tiles .is-extra").forEach(function (li) {
      li.hidden = false;
      var v = li.querySelector("video[data-loop]");
      if (v && io) io.observe(v);
    });
    var item = more.closest("li");
    var firstNew = document.querySelector(".tiles .is-extra a");
    if (item) item.remove();
    if (firstNew) firstNew.focus();
  });

  /* ---------- Full film: load the player only on click ---------- */
  document.querySelectorAll("[data-film]").forEach(function (film) {
    var btn = film.querySelector("[data-play]");
    if (!btn) return;
    btn.addEventListener("click", function () {
      var src = film.dataset.embed, kind = film.dataset.kind, el;
      if (kind === "file") {
        el = document.createElement("video");
        el.className = "film-full"; el.src = src; el.controls = true; el.autoplay = true; el.playsInline = true;
      } else {
        el = document.createElement("iframe");
        el.src = src;
        el.title = btn.getAttribute("aria-label") || "Film";
        el.allow = "autoplay; fullscreen; picture-in-picture; encrypted-media";
        el.allowFullscreen = true;
      }
      var bg = film.querySelector("video[data-loop]");
      if (bg) bg.pause();
      film.appendChild(el);
      film.classList.add("is-playing");
      el.focus && el.focus();
    });
  });

  /* ---------- Case study ---------- */
  document.querySelectorAll("[data-story]").forEach(function (btn) {
    var panel = document.getElementById(btn.getAttribute("aria-controls"));
    btn.addEventListener("click", function () {
      var open = btn.getAttribute("aria-expanded") === "true";
      btn.setAttribute("aria-expanded", String(!open));
      panel.hidden = open;
      btn.textContent = open ? btn.dataset.openLabel : btn.dataset.closeLabel;
    });
  });

  /* ---------- Reels: sound on/off ---------- */
  var soundBtns = document.querySelectorAll("[data-sound]");
  soundBtns.forEach(function (btn) {
    btn.setAttribute("aria-pressed", "false");
    btn.addEventListener("click", function () {
      var v = btn.parentElement.querySelector("video");
      var on = btn.getAttribute("aria-pressed") !== "true";
      soundBtns.forEach(function (b) {
        if (b === btn) return;
        b.setAttribute("aria-pressed", "false"); b.textContent = b.dataset.on;
        var ov = b.parentElement.querySelector("video"); if (ov) ov.muted = true;
      });
      prepare(v);
      v.muted = !on;
      if (on) { v.currentTime = 0; v.play().catch(function () {}); }
      btn.setAttribute("aria-pressed", String(on));
      btn.textContent = on ? btn.dataset.off : btn.dataset.on;
    });
  });

  /* ---------- Team bios ---------- */
  var teamList = document.querySelector(".team-list");
  var people = document.querySelectorAll("[data-person]");
  people.forEach(function (btn) {
    btn.addEventListener("click", function () {
      var open = btn.getAttribute("aria-expanded") === "true";
      people.forEach(function (b) {
        b.setAttribute("aria-expanded", "false");
        var pnl = document.getElementById(b.getAttribute("aria-controls"));
        if (pnl) pnl.hidden = true;
      });
      if (!open) {
        btn.setAttribute("aria-expanded", "true");
        var panel = document.getElementById(btn.getAttribute("aria-controls"));
        if (panel) panel.hidden = false;
      }
      if (teamList) teamList.classList.toggle("is-open", !open);
    });
  });

  /* ---------- Contact: one question at a time ---------- */
  var contact = document.querySelector("[data-contact]");
  if (contact) {
    var cfg = {};
    try { cfg = JSON.parse(contact.querySelector("[data-contact-config]").textContent); } catch (e) {}
    var steps = cfg.steps || [];
    var input = contact.querySelector("[data-input]");
    var lead = contact.querySelector("[data-lead]");
    var tail = contact.querySelector("[data-tail]");
    var nextBtn = contact.querySelector("[data-next]");
    var backBtn = contact.querySelector("[data-back]");
    var send = contact.querySelector("[data-send]");
    var ideas = contact.querySelector("[data-ideas]");
    var progress = contact.querySelector("[data-progress]");
    var answers = ["", "", ""], step = 0;
    var ex = 0, pos = 0, hold = 0;

    function mailto() {
      var body = cfg.intro + "\n\n" + cfg.need + ": " + (answers[0] || "-") + "\n" + cfg.from + ": " + (answers[1] || "-") + "\n" + cfg.reach + ": " + (answers[2] || "-") + "\n";
      return "mailto:" + cfg.email + "?subject=" + encodeURIComponent(cfg.subject + " " + (answers[1] || "ucfilms.de")) + "&body=" + encodeURIComponent(body);
    }
    function render(focus) {
      var s = steps[step];
      lead.textContent = s.lead; tail.textContent = s.tail;
      input.type = s.type; input.value = answers[step];
      input.placeholder = step === 0 ? "" : s.placeholder;
      input.autocomplete = s.type === "email" ? "email" : (step === 1 ? "name" : "off");
      nextBtn.hidden = step === steps.length - 1;
      send.hidden = step !== steps.length - 1;
      backBtn.hidden = step === 0;
      ideas.hidden = step !== 0;
      progress.style.width = Math.round(((step + 1) / steps.length) * 100) + "%";
      send.href = mailto();
      if (focus) input.focus();
    }
    function go(d) { answers[step] = input.value.trim(); step = Math.max(0, Math.min(steps.length - 1, step + d)); render(true); }
    input.addEventListener("input", function () { answers[step] = input.value; send.href = mailto(); });
    input.addEventListener("keydown", function (e) {
      if (e.key !== "Enter") return;
      e.preventDefault();
      if (step < steps.length - 1) go(1); else { answers[step] = input.value.trim(); window.location.href = mailto(); }
    });
    nextBtn.addEventListener("click", function () { go(1); });
    backBtn.addEventListener("click", function () { go(-1); });
    send.addEventListener("click", function () { answers[step] = input.value.trim(); send.href = mailto(); });
    ideas.querySelectorAll("[data-idea]").forEach(function (b) {
      b.addEventListener("click", function () { input.value = b.dataset.idea; answers[0] = b.dataset.idea; input.focus(); });
    });
    // typed examples as the first placeholder
    if (!reduceMotion && cfg.examples && cfg.examples.length) {
      setInterval(function () {
        if (step !== 0 || input.value) return;
        var full = cfg.examples[ex % cfg.examples.length];
        if (pos < full.length) { pos++; }
        else if (hold < 16) { hold++; return; }
        else { hold = 0; ex++; pos = 0; }
        input.placeholder = cfg.examples[ex % cfg.examples.length].slice(0, pos);
      }, 90);
    } else if (cfg.examples && cfg.examples.length) {
      input.placeholder = cfg.examples[0];
    }
    render(false);
  }

  // Phone menu
  (function () {
    var btn = document.querySelector("[data-menu]");
    if (!btn) return;
    function set(open) {
      document.body.classList.toggle("menu-open", open);
      btn.setAttribute("aria-expanded", open ? "true" : "false");
    }
    btn.addEventListener("click", function () { set(!document.body.classList.contains("menu-open")); });
    document.querySelectorAll("#site-nav a").forEach(function (a) { a.addEventListener("click", function () { set(false); }); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") set(false); });
  })();
})();
