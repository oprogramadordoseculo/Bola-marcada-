// Graficos de frequencia e atraso das dezenas (SVG puro, sem biblioteca).
// Uso: Graficos.render(elemento, {sorteios, max, nome, chave})
//   sorteios = lista de concursos do MAIS RECENTE para o mais antigo; cada concurso = lista de
//              sorteios (Lotofacil/Mega: [[...]]; Dupla Sena: [[1o sorteio],[2o sorteio]]).
(function () {
  "use strict";
  const JANELAS = [20, 50, 100, 0]; // 0 = todos
  const NS = "http://www.w3.org/2000/svg";
  const dd = (n) => String(n).padStart(2, "0");
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  function calcular(sorteios, max, janela) {
    const lista = janela ? sorteios.slice(0, janela) : sorteios;
    const freq = new Array(max + 1).fill(0), atraso = new Array(max + 1).fill(null);
    let bolas = 0;
    lista.forEach((conc, i) => conc.forEach((s) => s.forEach((n) => { freq[n]++; bolas++; })));
    // Atraso: conta sobre TODO o historico (nao so a janela)
    for (let n = 1; n <= max; n++) {
      const i = sorteios.findIndex((conc) => conc.some((s) => s.includes(n)));
      atraso[n] = i < 0 ? sorteios.length : i;
    }
    return { freq, atraso, concursos: lista.length, media: bolas / max };
  }

  // Desenha um grafico de barras (uma serie) no elemento.
  function barras(el, valores, max, opt) {
    el.innerHTML = "";
    const W = Math.max(280, el.clientWidth || 320), H = 170;
    const m = { t: 14, r: 8, b: 22, l: 30 };
    const pw = W - m.l - m.r, ph = H - m.t - m.b;
    const vmax = Math.max(1, ...valores.slice(1)) * 1.08;
    const passo = pw / max, bw = Math.max(2, Math.min(18, passo - 2));
    const y = (v) => m.t + ph - (v / vmax) * ph;
    const svg = document.createElementNS(NS, "svg");
    svg.setAttribute("width", W); svg.setAttribute("height", H); svg.setAttribute("role", "img");
    svg.setAttribute("aria-label", opt.titulo);
    svg.style.display = "block";
    const add = (tag, at, txt) => { const e = document.createElementNS(NS, tag); for (const k in at) e.setAttribute(k, at[k]); if (txt != null) e.textContent = txt; svg.appendChild(e); return e; };
    // grade (recessiva) com 3 linhas
    const ticks = [0, 0.5, 1].map((f) => Math.round((vmax / 1.08) * f));
    for (const t of [...new Set(ticks)]) {
      add("line", { x1: m.l, x2: W - m.r, y1: y(t), y2: y(t), stroke: "var(--g-grade)", "stroke-width": 1 });
      add("text", { x: m.l - 5, y: y(t) + 3, "text-anchor": "end", "font-size": 10, fill: "var(--g-texto)" }, t);
    }
    // barras com topo arredondado, ancoradas na base
    const rects = [];
    for (let n = 1; n <= max; n++) {
      const v = valores[n], cx = m.l + (n - 0.5) * passo, x = cx - bw / 2, top = y(v), h = Math.max(0, m.t + ph - top);
      const r = Math.min(2, bw / 2, h);
      const d = h <= 0 ? "" : `M${x},${m.t + ph}V${top + r}Q${x},${top} ${x + r},${top}H${x + bw - r}Q${x + bw},${top} ${x + bw},${top + r}V${m.t + ph}Z`;
      rects[n] = add("path", { d, fill: "var(--g-barra)" });
      const rotulo = passo >= 17 || n === 1 || n % 5 === 0;
      if (rotulo) add("text", { x: cx, y: H - 7, "text-anchor": "middle", "font-size": 10, fill: "var(--g-texto)" }, dd(n));
    }
    // linha de referencia (media)
    if (opt.referencia != null) {
      const yr = y(opt.referencia);
      add("line", { x1: m.l, x2: W - m.r, y1: yr, y2: yr, stroke: "var(--g-ref)", "stroke-width": 1.5, "stroke-dasharray": "4 3" });
      add("text", { x: W - m.r, y: yr - 4, "text-anchor": "end", "font-size": 10, fill: "var(--g-ref-txt)" }, opt.refRotulo);
    }
    // camada de toque/hover: faixa inteira de cada dezena (maior que a barra)
    const dica = document.createElement("div");
    dica.className = "g-dica"; dica.style.display = "none";
    const mostrar = (n) => {
      rects.forEach((r, i) => r && r.setAttribute("fill", i === n ? "var(--g-barra-ativa)" : "var(--g-barra)"));
      dica.innerHTML = opt.dica(n, valores[n]);
      dica.style.display = "block";
      const cx = m.l + (n - 0.5) * passo, dw = dica.offsetWidth;
      dica.style.left = Math.min(W - dw - 2, Math.max(2, cx - dw / 2)) + "px";
      dica.style.top = Math.max(0, y(valores[n]) - dica.offsetHeight - 8) + "px";
    };
    const esconder = () => { dica.style.display = "none"; rects.forEach((r) => r && r.setAttribute("fill", "var(--g-barra)")); };
    const alvo = add("rect", { x: m.l, y: 0, width: pw, height: H, fill: "transparent" });
    const pegar = (ev) => { const b = svg.getBoundingClientRect(); const n = Math.floor((ev.clientX - b.left - m.l) / passo) + 1; if (n >= 1 && n <= max) mostrar(n); };
    alvo.addEventListener("pointermove", pegar); alvo.addEventListener("pointerdown", pegar);
    alvo.addEventListener("pointerleave", (ev) => { if (ev.pointerType === "mouse") esconder(); });
    const caixa = document.createElement("div");
    caixa.style.position = "relative";
    caixa.appendChild(svg); caixa.appendChild(dica);
    el.appendChild(caixa);
  }

  function chips(titulo, nums) {
    return `<div class="g-chips"><span class="g-chips-tit">${esc(titulo)}</span>${nums.map((n) => `<span class="g-chip">${dd(n)}</span>`).join("")}</div>`;
  }

  function render(el, cfg) {
    const { sorteios, max, nome, chave } = cfg;
    let janela = 100;
    try { const v = localStorage.getItem("g_janela_" + chave); if (v !== null && JANELAS.includes(Number(v))) janela = Number(v); } catch { /* */ }
    const porConc = sorteios[0] ? sorteios[0].length : 1;

    const desenhar = () => {
      const r = calcular(sorteios, max, janela);
      const nums = Array.from({ length: max }, (_, i) => i + 1);
      const topN = max <= 25 ? 5 : 6;
      const mais = [...nums].sort((a, b) => r.freq[b] - r.freq[a] || a - b).slice(0, topN);
      const menos = [...nums].sort((a, b) => r.freq[a] - r.freq[b] || a - b).slice(0, topN);
      const atras = [...nums].sort((a, b) => r.atraso[b] - r.atraso[a] || a - b).slice(0, topN);
      const vezes = r.concursos * porConc;
      el.innerHTML = `
        <div class="stit">&#128202; Estatisticas — ${esc(nome)}</div>
        <div class="g-filtros"><span class="g-filtro-tit">Concursos:</span>${JANELAS.map((j) => `<button data-j="${j}" class="${j === janela ? "ativo" : ""}" aria-label="${j ? "Ultimos " + j + " concursos" : "Todos os concursos"}">${j || "Todos"}</button>`).join("")}</div>
        <div class="g-sub">Frequencia ${janela ? "nos ultimos " + r.concursos : "em todos os " + r.concursos} concursos${porConc > 1 ? " (2 sorteios por concurso)" : ""}</div>
        <div class="g-graf" data-g="freq"></div>
        <div class="g-sub">Atraso — ha quantos concursos cada dezena nao sai</div>
        <div class="g-graf" data-g="atraso"></div>
        ${chips("Mais sorteadas:", mais)}${chips("Menos sorteadas:", menos)}${chips("Mais atrasadas:", atras)}
        <div class="g-aviso">Estatistica do passado: cada sorteio e independente e todas as dezenas tem a mesma chance.</div>
        <button class="btn btn-cin btn-sm g-tab-bt">&#128203;  Ver tabela</button>
        <div class="g-tab" style="display:none"></div>`;
      barras(el.querySelector('[data-g="freq"]'), r.freq, max, {
        titulo: "Frequencia das dezenas", referencia: r.media, refRotulo: "media " + r.media.toFixed(1),
        dica: (n, v) => `<b>Dezena ${dd(n)}</b><br>saiu ${v}x (${(v / vezes * 100).toFixed(0)}% dos sorteios)<br>media: ${r.media.toFixed(1)}`,
      });
      barras(el.querySelector('[data-g="atraso"]'), r.atraso, max, {
        titulo: "Atraso das dezenas",
        dica: (n, v) => `<b>Dezena ${dd(n)}</b><br>${v === 0 ? "saiu no ultimo concurso" : "nao sai ha " + v + " concurso(s)"}`,
      });
      el.querySelectorAll(".g-filtros button").forEach((b) => b.onclick = () => {
        janela = Number(b.dataset.j); try { localStorage.setItem("g_janela_" + chave, janela); } catch { /* */ }
        desenhar();
      });
      const bt = el.querySelector(".g-tab-bt"), tab = el.querySelector(".g-tab");
      bt.onclick = () => {
        const abrir = tab.style.display === "none";
        if (abrir && !tab.innerHTML) tab.innerHTML = `<table><thead><tr><th>Dezena</th><th>Vezes</th><th>%</th><th>Atraso</th></tr></thead><tbody>${nums.map((n) => `<tr><td>${dd(n)}</td><td>${r.freq[n]}</td><td>${(r.freq[n] / vezes * 100).toFixed(0)}%</td><td>${r.atraso[n]}</td></tr>`).join("")}</tbody></table>`;
        tab.style.display = abrir ? "block" : "none";
        bt.innerHTML = abrir ? "&#10005;  Fechar tabela" : "&#128203;  Ver tabela";
      };
    };
    desenhar();
    el.style.display = "block";
    // Redesenha se a largura mudar (girar o celular, redimensionar a janela)
    let w = el.clientWidth, t = null;
    if (el._g_obs) el._g_obs.disconnect();
    if (window.ResizeObserver) {
      el._g_obs = new ResizeObserver(() => { if (Math.abs(el.clientWidth - w) > 20) { w = el.clientWidth; clearTimeout(t); t = setTimeout(desenhar, 150); } });
      el._g_obs.observe(el);
    }
  }

  window.Graficos = { render, calcular };
})();
