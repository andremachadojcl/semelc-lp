/* ==========================================================
   CENTRAL SEMELC — mural de câmeras gamificado (Canvas 2D)
   - Modo "ao vivo": câmeras rodando, a central verifica eventos sozinha
   - Modo "plantão": o visitante verifica as ocorrências (clique ou teclas 1–6)
   ========================================================== */
(function () {
  "use strict";

  const FEEDS = [
    { src: "assets/img/hero-casa.webp",          name: "RESIDÊNCIA · ENTRADA",  ground: 0.80, h: 0.30, zone: [0.20, 0.80] },
    { src: "assets/img/residencial-camera.webp", name: "RESIDÊNCIA · JARDIM",   ground: 0.86, h: 0.30, zone: [0.05, 0.55] },
    { src: "assets/img/empresa-fachada.webp",    name: "EMPRESA · PÁTIO",       ground: 0.86, h: 0.22, zone: [0.05, 0.90] },
    { src: "assets/img/empresarial-acesso.webp", name: "EMPRESA · DOCA",        ground: 0.86, h: 0.40, zone: [0.05, 0.60] },
    { src: "assets/img/rural-porteira.webp",     name: "RURAL · PORTEIRA",      ground: 0.86, h: 0.26, zone: [0.05, 0.95] },
    { src: "assets/img/rural-camera.webp",       name: "RURAL · ESTRADA",       ground: 0.84, h: 0.24, zone: [0.30, 0.80] },
  ];

  const $ = (s) => document.querySelector(s);
  const pad = (n) => String(n).padStart(2, "0");
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const rand = (a, b) => a + Math.random() * (b - a);
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Texturas pré-geradas (ruído e scanlines)
  function makeNoise(size) {
    const c = document.createElement("canvas");
    c.width = c.height = size;
    const x = c.getContext("2d");
    const d = x.createImageData(size, size);
    for (let i = 0; i < d.data.length; i += 4) {
      const v = Math.random() * 255;
      d.data[i] = d.data[i + 1] = d.data[i + 2] = v;
      d.data[i + 3] = Math.random() * 90;
    }
    x.putImageData(d, 0, 0);
    return c;
  }

  class Feed {
    constructor(cfg, idx, wall, game) {
      this.cfg = cfg;
      this.idx = idx;
      this.game = game;
      this.el = document.createElement("div");
      this.el.className = "feed";
      this.el.setAttribute("role", "button");
      this.el.setAttribute("tabindex", "0");
      this.el.setAttribute("aria-label", `Câmera ${idx + 1}: ${cfg.name}`);
      this.el.dataset.cursor = "verificar";
      this.canvas = document.createElement("canvas");
      this.el.appendChild(this.canvas);
      wall.appendChild(this.el);
      this.ctx = this.canvas.getContext("2d");
      this.img = new Image();
      this.img.decoding = "async";
      this.img.src = cfg.src;
      this.pan = { x: 0, y: 0, tx: 0, ty: 0 };
      this.walkers = [];
      this.flash = 0;
      this.glitch = 0;

      this.el.addEventListener("pointermove", (e) => {
        const r = this.el.getBoundingClientRect();
        this.pan.tx = ((e.clientX - r.left) / r.width - 0.5) * 2;
        this.pan.ty = ((e.clientY - r.top) / r.height - 0.5) * 2;
      });
      this.el.addEventListener("pointerleave", () => { this.pan.tx = 0; this.pan.ty = 0; });
      this.el.addEventListener("click", () => game.hit(this));
      this.el.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); game.hit(this); }
      });
      this.resize();
    }

    resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      const r = this.el.getBoundingClientRect();
      this.w = Math.max(1, Math.round(r.width * dpr));
      this.h = Math.max(1, Math.round(r.height * dpr));
      this.canvas.width = this.w;
      this.canvas.height = this.h;
      this.dpr = dpr;
    }

    spawn(alert) {
      const [z0, z1] = this.cfg.zone;
      const dir = Math.random() < 0.5 ? 1 : -1;
      const w = {
        x: dir > 0 ? z0 : z1,
        dir,
        speed: rand(0.035, 0.06),
        phase: rand(0, 6),
        scale: rand(0.9, 1.1),
        born: performance.now(),
        alert,
        ttl: alert ? this.game.ttl() : 0,
        state: "walk",
      };
      this.walkers.push(w);
      return w;
    }

    activeAlert() {
      return this.walkers.find((w) => w.alert && w.state === "walk");
    }

    // ---------- desenho ----------
    drawCover(ctx, img, ox, oy, zoom) {
      const iw = img.naturalWidth, ih = img.naturalHeight;
      const s = Math.max(this.w / iw, this.h / ih) * zoom;
      const dw = iw * s, dh = ih * s;
      const x = (this.w - dw) / 2 + ox * (dw - this.w) / 2;
      const y = (this.h - dh) / 2 + oy * (dh - this.h) / 2;
      ctx.drawImage(img, x, y, dw, dh);
    }

    drawPerson(ctx, w, now, light, ir) {
      const { w: W, h: H } = this;
      const zone = this.cfg.zone;
      const px = w.x * W;
      const gy = this.cfg.ground * H;
      const ph = this.cfg.h * H * w.scale;
      const t = now / 1000 * 6 + w.phase;
      const step = w.state === "walk" ? Math.sin(t) : 0;
      const bob = w.state === "walk" ? Math.abs(Math.cos(t)) * ph * 0.015 : 0;
      const head = ph * 0.085;
      const shoulderY = gy - ph * 0.78 - bob;
      const hipY = gy - ph * 0.45 - bob;
      const legLen = ph * 0.45;
      const armLen = ph * 0.34;

      const fill = ir ? "rgba(225,255,232,.92)" : `rgba(${12 + light * 20},${14 + light * 20},${20 + light * 20},.93)`;
      ctx.save();
      ctx.strokeStyle = fill;
      ctx.fillStyle = fill;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      // sombra no chão
      ctx.globalAlpha = 0.25 * (0.4 + light);
      ctx.beginPath();
      ctx.ellipse(px, gy, ph * 0.16, ph * 0.03, 0, 0, Math.PI * 2);
      ctx.fillStyle = "#000";
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.fillStyle = fill;

      // pernas
      ctx.lineWidth = ph * 0.085;
      for (const s of [1, -1]) {
        const a = step * 0.45 * s;
        const kx = px + Math.sin(a) * legLen * 0.5;
        const ky = hipY + Math.cos(a) * legLen * 0.5;
        const fx = kx + Math.sin(a * 0.6 - 0.15 * w.dir) * legLen * 0.5;
        const fy = ky + Math.cos(a * 0.6) * legLen * 0.5;
        ctx.beginPath(); ctx.moveTo(px, hipY); ctx.lineTo(kx, ky); ctx.lineTo(fx, fy); ctx.stroke();
      }
      // tronco
      ctx.lineWidth = ph * 0.16;
      ctx.beginPath(); ctx.moveTo(px, shoulderY + ph * 0.03); ctx.lineTo(px, hipY - ph * 0.02); ctx.stroke();
      // braços
      ctx.lineWidth = ph * 0.065;
      for (const s of [1, -1]) {
        const a = -step * 0.5 * s;
        ctx.beginPath();
        ctx.moveTo(px, shoulderY + ph * 0.02);
        ctx.lineTo(px + Math.sin(a) * armLen, shoulderY + Math.cos(a) * armLen);
        ctx.stroke();
      }
      // cabeça
      ctx.beginPath(); ctx.arc(px, shoulderY - head * 1.25, head, 0, Math.PI * 2); ctx.fill();
      ctx.restore();

      return { x: px - ph * 0.2, y: shoulderY - head * 2.4, w: ph * 0.4, h: gy - (shoulderY - head * 2.4) + ph * 0.02, zone };
    }

    drawBox(ctx, b, w, now) {
      const d = this.dpr;
      const k = Math.min(b.w, b.h) * 0.28;
      const elapsed = (now - w.born) / 1000;
      const left = clamp(1 - elapsed / w.ttl, 0, 1);
      const blink = Math.sin(now / 90) > -0.3;
      const col = w.state === "ok" ? "#2fe39a" : w.state === "lost" ? "#ff3b3b" : (blink ? "#ff3b3b" : "#ffb02e");
      ctx.save();
      ctx.strokeStyle = col;
      ctx.lineWidth = 2 * d;
      const { x, y, w: bw, h: bh } = b;
      ctx.beginPath();
      ctx.moveTo(x, y + k); ctx.lineTo(x, y); ctx.lineTo(x + k, y);
      ctx.moveTo(x + bw - k, y); ctx.lineTo(x + bw, y); ctx.lineTo(x + bw, y + k);
      ctx.moveTo(x + bw, y + bh - k); ctx.lineTo(x + bw, y + bh); ctx.lineTo(x + bw - k, y + bh);
      ctx.moveTo(x + k, y + bh); ctx.lineTo(x, y + bh); ctx.lineTo(x, y + bh - k);
      ctx.stroke();
      // etiqueta
      const fs = Math.max(8, 9 * d);
      ctx.font = `600 ${fs}px "JetBrains Mono", monospace`;
      const label = w.state === "ok" ? "VERIFICADO" : w.state === "lost" ? "NÃO VERIFICADO" : "MOVIMENTO";
      const tw = ctx.measureText(label).width + 8 * d;
      let lx = clamp(x, 2, this.w - tw - 2), ly = y - fs - 6 * d;
      if (ly < 2) ly = y + bh + 4 * d;
      ctx.fillStyle = col;
      ctx.fillRect(lx, ly, tw, fs + 5 * d);
      ctx.fillStyle = w.state === "ok" ? "#03140c" : "#fff";
      ctx.fillText(label, lx + 4 * d, ly + fs);
      // tempo restante
      if (w.state === "walk" && this.game.mode === "play") {
        ctx.fillStyle = "rgba(0,0,0,.5)";
        ctx.fillRect(x, y + bh + 3 * d, bw, 3 * d);
        ctx.fillStyle = col;
        ctx.fillRect(x, y + bh + 3 * d, bw * left, 3 * d);
      }
      ctx.restore();
    }

    render(now, dt, env) {
      const ctx = this.ctx;
      const { w: W, h: H } = this;
      if (!this.img.complete || !this.img.naturalWidth) {
        ctx.fillStyle = "#05080d"; ctx.fillRect(0, 0, W, H);
        return;
      }
      const { light, ir, noise, scan, clockText } = env;

      // PTZ: pan suave + movimento lento "patrulha"
      this.pan.x += (this.pan.tx - this.pan.x) * 0.08;
      this.pan.y += (this.pan.ty - this.pan.y) * 0.08;
      const patrol = reduced ? 0 : Math.sin(now / 9000 + this.idx * 1.7) * 0.35;
      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = 1;
      this.drawCover(ctx, this.img, clamp(patrol + this.pan.x * 0.6, -1, 1), this.pan.y * 0.5, 1.12);

      // Noite / IR
      const night = 1 - light;
      if (ir) {
        ctx.globalCompositeOperation = "saturation";
        ctx.fillStyle = "hsl(0,0%,50%)";
        ctx.fillRect(0, 0, W, H);
        ctx.globalCompositeOperation = "multiply";
        ctx.fillStyle = "#b8f5c8";
        ctx.fillRect(0, 0, W, H);
        ctx.globalCompositeOperation = "screen";
        ctx.fillStyle = "rgba(40,70,50,.35)";
        ctx.fillRect(0, 0, W, H);
      } else if (night > 0.02) {
        ctx.globalCompositeOperation = "saturation";
        ctx.globalAlpha = night * 0.6;
        ctx.fillStyle = "hsl(0,0%,50%)";
        ctx.fillRect(0, 0, W, H);
        ctx.globalAlpha = night * 0.8;
        ctx.globalCompositeOperation = "multiply";
        ctx.fillStyle = "#16233d";
        ctx.fillRect(0, 0, W, H);
      }
      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = 1;

      // Pessoas
      const boxes = [];
      for (const w of this.walkers) {
        if (w.state === "walk") w.x += w.dir * w.speed * dt;
        const b = this.drawPerson(ctx, w, now, light, ir);
        if (w.alert) boxes.push([b, w]);
      }
      this.walkers = this.walkers.filter((w) => {
        const out = w.x < this.cfg.zone[0] - 0.08 || w.x > this.cfg.zone[1] + 0.08;
        const done = w.doneAt && now - w.doneAt > 900;
        return !(out && !w.alert) && !done && !(out && w.state !== "walk");
      });
      for (const [b, w] of boxes) this.drawBox(ctx, b, w, now);

      // Flash de verificação
      if (this.flash > 0) {
        ctx.fillStyle = `rgba(47,227,154,${this.flash * 0.25})`;
        ctx.fillRect(0, 0, W, H);
        this.flash = Math.max(0, this.flash - dt * 2.5);
      }

      // Ruído + scanlines + vinheta
      ctx.globalAlpha = ir ? 0.22 : 0.08 + night * 0.12;
      ctx.drawImage(noise, (Math.random() * -128) | 0, (Math.random() * -128) | 0, W + 128, H + 128);
      ctx.globalAlpha = 1;
      ctx.fillStyle = scan;
      ctx.fillRect(0, 0, W, H);
      if (this.glitch > 0) {
        const gy = Math.random() * H;
        ctx.drawImage(this.canvas, 0, gy, W, 8 * this.dpr, rand(-12, 12) * this.dpr, gy, W, 8 * this.dpr);
        this.glitch -= dt;
      } else if (Math.random() < 0.002) this.glitch = 0.15;
      const g = ctx.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, W * 0.75);
      g.addColorStop(0, "rgba(0,0,0,0)");
      g.addColorStop(1, "rgba(0,0,0,.55)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);

      // HUD
      const d = this.dpr;
      const compact = W / d < 340;
      const fs = Math.max(8, Math.round(W / (compact ? 22 : 34)));
      ctx.font = `600 ${fs}px "JetBrains Mono", monospace`;
      ctx.textBaseline = "top";
      ctx.fillStyle = "rgba(255,255,255,.92)";
      ctx.shadowColor = "rgba(0,0,0,.8)";
      ctx.shadowBlur = 4;
      const m = 8 * d;
      ctx.fillText(compact ? `CAM ${pad(this.idx + 1)}` : `CAM ${pad(this.idx + 1)} · ${this.cfg.name}`, m + fs * 1.1, m);
      const ct = compact ? clockText.slice(0, 5) : clockText;
      const tw = ctx.measureText(ct).width;
      ctx.fillText(ct, W - m - tw, m);
      ctx.textBaseline = "bottom";
      ctx.fillStyle = ir ? "#9dffb5" : "rgba(255,255,255,.7)";
      ctx.fillText(ir ? "IR ON" : "COLOR", m, H - m);
      ctx.shadowBlur = 0;
      if (Math.floor(now / 600) % 2 === 0) {
        ctx.fillStyle = "#ff3b3b";
        ctx.beginPath(); ctx.arc(m + fs * 0.4, m + fs * 0.55, fs * 0.32, 0, Math.PI * 2); ctx.fill();
      }
      ctx.textBaseline = "alphabetic";

      this.el.classList.toggle("is-alert", !!this.activeAlert() && this.game.mode === "play");
    }

    pop(text, kind) {
      const p = document.createElement("div");
      p.className = `feed__pop ${kind}`;
      p.textContent = text;
      this.el.appendChild(p);
      if (window.gsap) {
        gsap.fromTo(p, { scale: 0.6, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.25, ease: "back.out(2)" });
        gsap.to(p, { y: -24, opacity: 0, delay: 0.7, duration: 0.4, onComplete: () => p.remove() });
      } else setTimeout(() => p.remove(), 1000);
    }
  }

  const Game = {
    mode: "idle",
    feeds: [],
    init() {
      const root = $("#console");
      if (!root) return;
      this.root = root;
      this.wall = $("#gWall");
      this.ui = {
        clock: $("#gClock"), score: $("#gScore"), miss: $("#gMiss"), avg: $("#gAvg"), combo: $("#gCombo"),
        time: $("#gTime"), mode: $("#gMode"), ticker: $("#gTicker"), ir: $("#gIR"),
        start: $("#gStart"), end: $("#gEnd"),
      };
      this.noise = makeNoise(256);
      const sc = document.createElement("canvas");
      sc.width = 1; sc.height = 3;
      const sx = sc.getContext("2d");
      sx.fillStyle = "rgba(0,0,0,.22)"; sx.fillRect(0, 0, 1, 1);
      this.scanCanvas = sc;

      FEEDS.forEach((cfg, i) => this.feeds.push(new Feed(cfg, i, this.wall, this)));
      this.scan = this.feeds[0].ctx.createPattern(sc, "repeat");
      this.irForced = false;

      new ResizeObserver(() => this.feeds.forEach((f) => f.resize())).observe(this.wall);
      this.visible = false;
      new IntersectionObserver((e) => {
        this.visible = e[0].isIntersecting;
        if (this.visible && !this.raf) this.loop(performance.now());
      }, { rootMargin: "100px" }).observe(root);

      $("#gPlay").addEventListener("click", () => this.start());
      $("#gAgain").addEventListener("click", () => this.start());
      $("#gWatch").addEventListener("click", () => this.watch());
      this.ui.ir.addEventListener("click", () => {
        this.irForced = !this.irForced;
        this.ui.ir.setAttribute("aria-pressed", String(this.irForced));
      });
      window.addEventListener("keydown", (e) => {
        if (this.mode !== "play") return;
        const n = parseInt(e.key, 10);
        if (n >= 1 && n <= 6) this.hit(this.feeds[n - 1]);
      });

      this.nextIdle = performance.now() + 1500;
      this.last = performance.now();
    },

    ttl() {
      const p = this.progress || 0;
      return 4.6 - p * 1.6; // fica mais difícil ao longo do plantão
    },

    log(html) {
      this.ui.ticker.innerHTML = `<span>${html}</span>`;
    },

    clockHours(now) {
      if (this.mode === "play") return (18 + this.progress * 24) % 24; // começa ao entardecer
      const d = new Date();
      return d.getHours() + d.getMinutes() / 60 + d.getSeconds() / 3600;
    },

    watch() {
      this.ui.start.classList.remove("is-open");
      this.mode = "idle";
      this.ui.mode.textContent = "AO VIVO";
    },

    start() {
      this.ui.start.classList.remove("is-open");
      this.ui.end.classList.remove("is-open");
      this.feeds.forEach((f) => (f.walkers = []));
      this.mode = "play";
      this.ui.mode.textContent = "PLANTÃO";
      this.t0 = performance.now();
      this.dur = (window.SEMELC && SEMELC.gameSeconds || 30) * 1000;
      this.progress = 0;
      this.stats = { ok: 0, miss: 0, times: [], combo: 0, best: 0, total: 0 };
      this.nextSpawn = this.t0 + 900;
      this.updateUI();
      this.log(`<b class="t-ok">Plantão iniciado.</b> Fique de olho nas 6 câmeras.`);
      this.root.scrollIntoView({ behavior: "smooth", block: "center" });
    },

    finish() {
      this.mode = "end";
      this.ui.mode.textContent = "AO VIVO";
      this.feeds.forEach((f) => f.walkers.forEach((w) => { if (w.state === "walk") w.alert = false; }));
      const s = this.stats;
      const avg = s.times.length ? s.times.reduce((a, b) => a + b, 0) / s.times.length : 0;
      const ratio = s.total ? s.ok / s.total : 0;
      let rank = "Operador em treinamento";
      if (ratio >= 0.9 && avg && avg < 1.6) rank = "Nível Central Semelc";
      else if (ratio >= 0.75) rank = "Operador atento";
      else if (ratio >= 0.5) rank = "Bom começo, operador";
      $("#gRank").textContent = rank;
      $("#rScore").textContent = `${s.ok}/${s.total}`;
      $("#rAvg").textContent = avg ? `${avg.toFixed(1).replace(".", ",")}s` : "—";
      $("#rBest").textContent = `x${s.best}`;
      this.ui.end.classList.add("is-open");
      this.nextIdle = performance.now() + 2500;
    },

    hit(feed) {
      const now = performance.now();
      const w = feed.activeAlert();
      if (this.mode !== "play") {
        if (w) this.verify(feed, w, now, true);
        return;
      }
      if (!w) {
        this.stats.combo = 0;
        feed.pop("SEM OCORRÊNCIA", "bad");
        this.updateUI();
        return;
      }
      this.verify(feed, w, now, false);
    },

    verify(feed, w, now, auto) {
      const rt = (now - w.born) / 1000;
      w.state = "ok";
      w.doneAt = now;
      feed.flash = 1;
      const hhmm = this.ui.clock.textContent;
      if (this.mode === "play" && !auto) {
        const s = this.stats;
        s.ok++; s.combo++; s.best = Math.max(s.best, s.combo); s.times.push(rt);
        feed.pop(`✓ ${rt.toFixed(1).replace(".", ",")}s${s.combo >= 3 ? `  ·  x${s.combo}` : ""}`, "ok");
        this.log(`[${hhmm}] CAM ${pad(feed.idx + 1)} · ${feed.cfg.name} — <span class="t-ok">ocorrência verificada em ${rt.toFixed(1).replace(".", ",")}s</span>`);
        this.updateUI();
      } else {
        feed.pop("✓ VERIFICADO PELA CENTRAL", "ok");
        this.log(`[${hhmm}] CAM ${pad(feed.idx + 1)} · ${feed.cfg.name} — <span class="t-ok">verificado pela central</span>`);
      }
    },

    updateUI() {
      const s = this.stats;
      if (!s) return;
      this.ui.score.textContent = s.ok;
      this.ui.miss.textContent = s.miss;
      this.ui.combo.textContent = `x${s.combo}`;
      const avg = s.times.length ? s.times.reduce((a, b) => a + b, 0) / s.times.length : 0;
      this.ui.avg.textContent = avg ? `${avg.toFixed(1).replace(".", ",")}s` : "—";
    },

    spawnAlert(now) {
      const free = this.feeds.filter((f) => !f.activeAlert());
      if (!free.length) return;
      const f = free[(Math.random() * free.length) | 0];
      const w = f.spawn(true);
      w.born = now;
      if (this.mode === "play") this.stats.total++;
      this.log(`[${this.ui.clock.textContent}] CAM ${pad(f.idx + 1)} · ${f.cfg.name} — <span class="t-alert">movimento detectado</span>`);
      if (window.gsap) gsap.fromTo(f.el, { scale: 0.98 }, { scale: 1, duration: 0.4, ease: "elastic.out(1,.5)" });
    },

    loop(now) {
      if (!this.visible) { this.raf = null; return; }
      this.raf = requestAnimationFrame((t) => this.loop(t));
      const dt = Math.min(0.05, (now - this.last) / 1000);
      if (dt < 1 / 40) return; // ~30fps é suficiente para "CFTV"
      this.last = now;

      if (this.mode === "play") {
        this.progress = clamp((now - this.t0) / this.dur, 0, 1);
        this.ui.time.style.transform = `scaleX(${this.progress})`;
        if (now >= this.nextSpawn && this.progress < 0.96) {
          this.spawnAlert(now);
          const gap = 1900 - this.progress * 1050;
          this.nextSpawn = now + rand(gap * 0.7, gap * 1.2);
          if (this.progress > 0.45 && Math.random() < 0.35) setTimeout(() => this.mode === "play" && this.spawnAlert(performance.now()), 350);
        }
        // alertas expirados
        for (const f of this.feeds) for (const w of f.walkers) {
          if (w.alert && w.state === "walk" && (now - w.born) / 1000 > w.ttl) {
            w.state = "lost"; w.doneAt = now;
            this.stats.miss++; this.stats.combo = 0;
            f.pop("✕ NÃO VERIFICADO", "bad");
            this.log(`[${this.ui.clock.textContent}] CAM ${pad(f.idx + 1)} · ${f.cfg.name} — <span class="t-bad">ocorrência não verificada</span>`);
            this.updateUI();
          }
        }
        if (this.progress >= 1) this.finish();
      } else {
        this.ui.time.style.transform = "scaleX(0)";
        // modo ao vivo: movimento ambiente + verificação automática
        if (now >= this.nextIdle) {
          const f = this.feeds[(Math.random() * 6) | 0];
          if (!f.walkers.length) {
            const w = f.spawn(true);
            w.ttl = 99;
            setTimeout(() => { if (w.state === "walk") this.verify(f, w, performance.now(), true); }, rand(1400, 2200));
          }
          this.nextIdle = now + rand(2600, 4200);
        }
      }

      const hrs = this.clockHours(now);
      const hh = Math.floor(hrs), mm = Math.floor((hrs % 1) * 60), ss = Math.floor(((hrs * 60) % 1) * 60);
      this.ui.clock.textContent = `${pad(hh)}:${pad(mm)}`;
      // luz do dia: 1 ao meio-dia, 0 de madrugada
      const light = clamp(Math.cos(((hrs - 13) / 12) * Math.PI) * 1.3 + 0.35, 0, 1);
      const ir = this.irForced || light < 0.28;
      const env = { light, ir, noise: this.noise, scan: this.scan, clockText: `${pad(hh)}:${pad(mm)}:${pad(ss)}` };
      for (const f of this.feeds) f.render(now, dt, env);
    },
  };

  window.Central = Game;
})();
