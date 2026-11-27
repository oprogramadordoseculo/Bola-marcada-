// Impressao de volantes da Lotofacil em folha A4 comum (recortar depois).
// Imprime SOMENTE: marcas de alinhamento (sincronismo), numeros marcados e a quantidade.
//
// MEDIDAS PROVISORIAS — tiradas do modelo desenhado pelo usuario (escaneado a 278 dpi).
// Quando chegar o scan do volante oficial a 300 dpi / medidas com regua, trocar SO a tabela VOLANTE_LF.
// Todas as medidas em milimetros, a partir do canto superior esquerdo do volante (em pe).
(function () {
  "use strict";

  const VOLANTE_LF = {
    nome: "Lotofacil",
    largura: 82.9,
    altura: 182.7,
    // Marcas pretas fixas: [centro_x, centro_y, largura, altura]
    marcas: [
      // 4 marcas do topo (identificam o tipo de volante)
      [20.88, 40.43, 3.65, 2.19], [27.27, 40.43, 3.65, 2.19], [33.76, 40.43, 3.65, 2.19], [40.43, 40.20, 4.02, 2.65],
      // coluna da lateral esquerda
      [3.15, 40.66, 3.11, 2.65], [3.15, 45.77, 3.11, 2.65], [3.15, 50.21, 3.11, 2.56], [3.15, 54.68, 3.11, 2.56],
      [3.15, 59.16, 3.11, 2.56], [3.15, 63.64, 3.11, 2.56], [3.15, 71.17, 3.11, 2.65], [3.15, 75.61, 3.11, 2.56],
      [3.15, 80.08, 3.11, 2.56], [3.15, 84.60, 3.11, 2.65], [3.15, 89.08, 3.11, 2.65], [3.79, 96.76, 3.11, 2.65],
      [3.79, 101.28, 3.11, 2.56], [3.79, 105.76, 3.11, 2.56], [3.79, 110.23, 3.11, 2.56], [3.79, 114.71, 3.11, 2.56],
      [3.79, 122.34, 3.11, 2.65], [3.79, 130.06, 3.11, 2.56], [3.97, 138.33, 2.74, 2.47], [4.34, 144.36, 3.47, 1.55],
      [4.16, 148.52, 3.84, 1.83], [4.66, 152.17, 3.75, 1.83],
    ],
    // Centro x das 5 colunas, da esquerda para a direita: 21-25 | 16-20 | 11-15 | 06-10 | 01-05
    colunasX: [15.44, 27.55, 40.63, 53.89, 66.40],
    // Centro y das linhas: jogo 1 (5 linhas), jogo 2, jogo 3
    linhasY: [
      [45.03, 49.55, 53.88, 58.57, 63.11],
      [70.28, 74.78, 79.10, 83.79, 88.33],
      [95.68, 100.35, 104.77, 109.57, 114.24],
    ],
    caixa: [5.12, 3.56],          // tamanho da caixinha do numero (largura, altura)
    // Quantidade de numeros (15 a 20): centro x de cada caixa e o y da fileira.
    // 15 e 16 medidos; 17 a 20 ESTIMADOS (mesmo espacamento) — confirmar com o volante real.
    qtdX: { 15: 15.08, 16: 21.88, 17: 28.68, 18: 35.48, 19: 42.28, 20: 49.08 },
    qtdY: 121.93,
    qtdCaixa: [3.98, 2.74],
    preenchimento: 0.85,          // marca preta = 85% da caixinha (folga para pequenos desvios)
    jogosPorVolante: 3,
  };

  const A4 = { largura: 210, altura: 297 };
  const MARGEM = 6, ESPACO = 4;   // mm (jato de tinta nao imprime colado na borda)

  // ---------- Ajuste da impressora (salvo no aparelho) ----------
  const CHAVE_CAL = "volante_calibracao_v1";
  function lerCal() {
    try { const c = JSON.parse(localStorage.getItem(CHAVE_CAL) || "{}"); return { dx: +c.dx || 0, dy: +c.dy || 0, escX: +c.escX || 100, escY: +c.escY || 100 }; }
    catch { return { dx: 0, dy: 0, escX: 100, escY: 100 }; }
  }
  function salvarCal(c) { try { localStorage.setItem(CHAVE_CAL, JSON.stringify(c)); } catch { /* sem armazenamento */ } }

  // ---------- Posicao de cada numero ----------
  function posNumero(V, jogo, n) {
    const col = 4 - Math.floor((n - 1) / 5), lin = (n - 1) % 5;
    return [V.colunasX[col], V.linhasY[jogo][lin]];
  }

  // ---------- Encaixe dos volantes na A4 ----------
  // Testa em pe e deitado; usa o que couber mais. Deitado: topo do volante fica a esquerda
  // e a lateral das marcas fica embaixo (como no modelo do usuario).
  function encaixe(V) {
    const util = (tam) => tam - 2 * MARGEM + ESPACO;
    const emPe = { girado: false, cols: Math.floor(util(A4.largura) / (V.largura + ESPACO)), lins: Math.floor(util(A4.altura) / (V.altura + ESPACO)) };
    const deitado = { girado: true, cols: Math.floor(util(A4.largura) / (V.altura + ESPACO)), lins: Math.floor(util(A4.altura) / (V.largura + ESPACO)) };
    const e = emPe.cols * emPe.lins >= deitado.cols * deitado.lins ? emPe : deitado;
    const w = e.girado ? V.altura : V.largura, h = e.girado ? V.largura : V.altura;
    const totalW = e.cols * w + (e.cols - 1) * ESPACO, totalH = e.lins * h + (e.lins - 1) * ESPACO;
    const x0 = (A4.largura - totalW) / 2, y0 = (A4.altura - totalH) / 2;
    const vagas = [];
    for (let l = 0; l < e.lins; l++) for (let c = 0; c < e.cols; c++) vagas.push({ x: x0 + c * (w + ESPACO), y: y0 + l * (h + ESPACO), w, h, girado: e.girado });
    return vagas;
  }

  // Converte (x,y) do volante em pe -> coordenada na folha, aplicando o ajuste da impressora.
  function paraFolha(V, vaga, cal, x, y) {
    x = x * cal.escX / 100 + cal.dx; y = y * cal.escY / 100 + cal.dy;
    return vaga.girado ? [vaga.x + y, vaga.y + (V.largura - x)] : [vaga.x + x, vaga.y + y];
  }
  // Retangulo centrado em (cx,cy) com tamanho (w,h) no volante -> desenha na folha.
  function ret(doc, V, vaga, cal, cx, cy, w, h, estilo) {
    const [px, py] = paraFolha(V, vaga, cal, cx, cy);
    const [rw, rh] = vaga.girado ? [h, w] : [w, h];
    doc.rect(px - rw / 2, py - rh / 2, rw, rh, estilo);
  }
  // Marcas de corte nos cantos (fora do volante, para nao atrapalhar a leitora).
  function marcasCorte(doc, vaga) {
    doc.setDrawColor(150); doc.setLineWidth(0.15);
    const L = 2.5, G = 0.8;
    for (const [cx, cy, sx, sy] of [[vaga.x, vaga.y, -1, -1], [vaga.x + vaga.w, vaga.y, 1, -1], [vaga.x, vaga.y + vaga.h, -1, 1], [vaga.x + vaga.w, vaga.y + vaga.h, 1, 1]]) {
      doc.line(cx + sx * G, cy, cx + sx * (G + L), cy);
      doc.line(cx, cy + sy * G, cx, cy + sy * (G + L));
    }
    doc.setDrawColor(0);
  }

  function desenharVolante(doc, V, vaga, cal, jogos, modoCalibracao) {
    marcasCorte(doc, vaga);
    doc.setFillColor(0); doc.setDrawColor(0);
    for (const [cx, cy, w, h] of V.marcas) ret(doc, V, vaga, cal, cx, cy, w, h, "F");
    const f = V.preenchimento;
    if (modoCalibracao) {
      // Contorno de TODAS as caixas, para conferir no contraluz com o volante oficial.
      doc.setLineWidth(0.2);
      for (let j = 0; j < 3; j++) for (let n = 1; n <= 25; n++) { const [x, y] = posNumero(V, j, n); ret(doc, V, vaga, cal, x, y, V.caixa[0], V.caixa[1], "S"); }
      for (const q of Object.keys(V.qtdX)) ret(doc, V, vaga, cal, V.qtdX[q], V.qtdY, V.qtdCaixa[0], V.qtdCaixa[1], "S");
      return;
    }
    jogos.forEach((jogo, j) => {
      for (const n of jogo) { const [x, y] = posNumero(V, j, n); ret(doc, V, vaga, cal, x, y, V.caixa[0] * f, V.caixa[1] * f, "F"); }
    });
    const q = jogos[0].length;
    ret(doc, V, vaga, cal, V.qtdX[q], V.qtdY, V.qtdCaixa[0] * f, V.qtdCaixa[1] * f, "F");
  }

  // Agrupa os jogos em volantes de 3, separando por quantidade de numeros.
  function montarVolantes(jogos) {
    const porQtd = {};
    for (const j of jogos) {
      const ns = [...new Set(j.map(Number))].filter((n) => n >= 1 && n <= 25).sort((a, b) => a - b);
      if (!VOLANTE_LF.qtdX[ns.length]) continue; // ignora jogos fora de 15..20
      (porQtd[ns.length] = porQtd[ns.length] || []).push(ns);
    }
    const vols = [];
    for (const q of Object.keys(porQtd).sort((a, b) => a - b))
      for (let i = 0; i < porQtd[q].length; i += VOLANTE_LF.jogosPorVolante) vols.push(porQtd[q].slice(i, i + VOLANTE_LF.jogosPorVolante));
    return vols;
  }

  function resumo(jogos) {
    const vols = montarVolantes(jogos), porFolha = encaixe(VOLANTE_LF).length;
    const ignorados = jogos.length - vols.reduce((s, v) => s + v.length, 0);
    return { jogos: jogos.length - ignorados, ignorados, volantes: vols.length, folhas: Math.ceil(vols.length / porFolha), porFolha };
  }

  let _jspdf = null;
  function carregarJsPDF() {
    if (window.jspdf) return Promise.resolve(window.jspdf);
    if (_jspdf) return _jspdf;
    _jspdf = new Promise((ok, falha) => {
      const s = document.createElement("script");
      s.src = "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";
      s.onload = () => ok(window.jspdf); s.onerror = () => { _jspdf = null; falha(new Error("Nao foi possivel carregar o gerador de PDF. Verifique a internet.")); };
      document.head.appendChild(s);
    });
    return _jspdf;
  }

  function cabecalho(doc, texto) {
    doc.setFontSize(7); doc.setTextColor(120); doc.text(texto, MARGEM, 4); doc.setTextColor(0);
  }

  // Gera o PDF dos jogos (lista de arrays de numeros) e baixa o arquivo.
  async function gerarPDF(jogos, nomeArquivo = "volantes-lotofacil.pdf") {
    const { jsPDF } = await carregarJsPDF();
    const V = VOLANTE_LF, cal = lerCal(), vagas = encaixe(V), vols = montarVolantes(jogos);
    if (!vols.length) throw new Error("Nenhum jogo de 15 a 20 numeros para imprimir.");
    const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
    const folhas = Math.ceil(vols.length / vagas.length);
    vols.forEach((jogosVol, i) => {
      const k = i % vagas.length;
      if (i > 0 && k === 0) doc.addPage();
      if (k === 0) cabecalho(doc, `15 Pontos - volantes Lotofacil - folha ${Math.floor(i / vagas.length) + 1}/${folhas} - imprimir em 100% (tamanho real)`);
      desenharVolante(doc, V, vagas[k], cal, jogosVol, false);
    });
    doc.save(nomeArquivo);
    return { volantes: vols.length, folhas };
  }

  // Folha de calibracao: contorno de todas as caixas + regua de 100 mm para conferir a escala.
  async function gerarCalibracao() {
    const { jsPDF } = await carregarJsPDF();
    const V = VOLANTE_LF, cal = lerCal(), vagas = encaixe(V);
    const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
    cabecalho(doc, "15 Pontos - FOLHA DE CALIBRACAO - imprimir em 100% (tamanho real), sem 'ajustar a pagina'");
    desenharVolante(doc, V, vagas[0], cal, null, true);
    // Regua de 100 mm abaixo/ao lado do 1o volante
    const ult = vagas[vagas.length - 1], ry = Math.min(A4.altura - 8, ult.y + ult.h + 6), rx = (A4.largura - 100) / 2;
    doc.setLineWidth(0.3); doc.line(rx, ry, rx + 100, ry);
    for (let i = 0; i <= 10; i++) doc.line(rx + i * 10, ry - (i % 5 ? 1.5 : 3), rx + i * 10, ry);
    doc.setFontSize(8);
    doc.text("Esta linha deve medir exatamente 10,0 cm. Se nao medir, a impressora esta ampliando/reduzindo.", A4.largura / 2, ry + 4, { align: "center" });
    doc.text(`Ajuste atual: horizontal ${cal.dx} mm, vertical ${cal.dy} mm, escala ${cal.escX}% x ${cal.escY}%`, A4.largura / 2, ry + 8, { align: "center" });
    doc.save("calibracao-volante-lotofacil.pdf");
  }

  window.Volante = { VOLANTE_LF, encaixe, montarVolantes, resumo, gerarPDF, gerarCalibracao, lerCal, salvarCal };
})();
