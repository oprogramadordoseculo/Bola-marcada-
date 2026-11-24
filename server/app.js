// Logica HTTP do servidor de geracao. As dependencias (Firebase, dados) sao injetadas
// para poder testar sem credenciais.
import fs from "node:fs";
import * as G from "./gerador.js";

// Fechamentos pre-calculados (posicoes 0..n-1), gerados e conferidos por gerar_fechamentos.js.
const FECHAMENTOS = JSON.parse(fs.readFileSync(new URL("./fechamentos.json", import.meta.url), "utf8"));

export const LIM_GRATIS = 3;
export const FECH_OK = ["17-14", "18-13", "18-14", "19-12", "19-13", "20-12", "20-13"];
const PLF = 3.5, MAX_JOGOS = 500;

export function hojeSP(d = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(d);
}

// Converte os JSON de data/ ({"concurso": ["dezenas"...]}) nas estruturas usadas pelos geradores.
export function prepararDados(lf, mega, dupla) {
  const ord = (o, q) => Object.entries(o).filter(([, v]) => Array.isArray(v) && v.length === q)
    .sort((a, b) => Number(b[0]) - Number(a[0]));
  const lfE = ord(lf, 15), megaE = ord(mega, 6), duplaE = ord(dupla, 12);
  const cs = lfE.map(([k, v]) => ({ numero: Number(k), dezenas: v }));
  const { d1, d2 } = G.sepDupla(duplaE.map(([, v]) => v.map(Number)));
  return {
    lf: { an: G.anLFH(cs), ultimo: Number(lfE[0][0]) },
    mega: { dl: megaE.map(([, v]) => v.map(Number)), ultimo: Number(megaE[0][0]) },
    dupla: { d1, d2, ultimo: Number(duplaE[0][0]) },
  };
}

function erro(status, msg) { const e = new Error(msg); e.status = status; return e; }
const inteiro = (v, min, max) => { const n = Math.floor(Number(v)); if (!Number.isFinite(n) || n < min || n > max) throw erro(400, "Valor invalido."); return n; };

// Executa a acao pedida. perfil = {premium, admin}; consumir() gasta 1 geracao gratis.
export async function executar(acao, p, dados, perfil, consumir) {
  const prem = perfil.premium || perfil.admin;
  const precisaPrem = () => { if (!prem) throw erro(403, "Funcao Premium. Veja os planos na aba Conta."); };
  const { lf, mega, dupla } = dados;
  const an = lf.an;
  let combos, tipo, titulo, lot = "lf", concurso = lf.ultimo + 1, restantes = null;

  switch (acao) {
    case "lf10": {
      if (!prem) restantes = await consumir(); // lanca 429 se acabou
      combos = G.gerarLF(an, 10); tipo = "10 Combinacoes"; titulo = "10 Combinacoes";
      break;
    }
    case "lfTodos": {
      precisaPrem();
      combos = G.gerarPorPadroes(an, G.todPad(an), 1);
      tipo = "Todos os Padroes"; titulo = "Todos os Padroes (1 combo/padrao)";
      break;
    }
    case "lfPads": {
      precisaPrem();
      combos = G.gerarPorPadroes(an, G.padLF(an, 3), 10);
      tipo = "3 Padroes 30 Combos"; titulo = "3 Padroes — 30 Combinacoes";
      break;
    }
    case "lfPts": {
      precisaPrem();
      const mp = inteiro(p.mp, 11, 14);
      const pads = G.padPts(an, mp);
      if (!pads.length) throw erro(404, "Nenhum padrao para " + mp + " pts.");
      combos = G.gerarPorPadroes(an, pads, 10);
      tipo = "Padroes " + mp + " Pts"; titulo = "Padroes " + mp + " Pontos — 30 Combinacoes";
      break;
    }
    case "lf16": {
      precisaPrem();
      combos = G.gerar16(an, 30); tipo = "16 Numeros 30 Combos"; titulo = "16 Numeros — 30 Combinacoes";
      break;
    }
    case "lfFech": {
      precisaPrem();
      const op = String(p.op || "");
      if (!FECH_OK.includes(op)) throw erro(400, "Opcao de fechamento invalida.");
      const [n, t] = op.split("-").map(Number);
      let dez = Array.isArray(p.dez) && p.dez.length ? [...new Set(p.dez.map(Number))].filter((x) => x >= 1 && x <= 25) : null;
      if (dez && dez.length !== n) throw erro(400, `Escolha exatamente ${n} dezenas (de 1 a 25).`);
      if (!dez) {
        const f = {}; for (let i = 1; i <= 25; i++) f[i] = 0;
        an.dl.slice(0, 30).forEach((d) => d.forEach((x) => f[x]++));
        dez = Object.keys(f).map(Number).sort((a, b) => f[b] - f[a] || a - b).slice(0, n);
      }
      // Embaralha as dezenas antes de encaixar: cada pedido sai diferente, com a mesma garantia.
      for (let i = dez.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [dez[i], dez[j]] = [dez[j], dez[i]]; }
      combos = FECHAMENTOS[op].map((jg) => jg.map((i) => dez[i]).sort((a, b) => a - b));
      tipo = `Fechamento ${n}d/${t}pts`;
      titulo = `Fechamento ${n} dezenas — garante ${t} pts — ${combos.length} jogos (R$ ${(combos.length * PLF).toFixed(2).replace(".", ",")})`;
      break;
    }
    case "lfOrc": {
      precisaPrem();
      const nums = inteiro(p.nums, 15, 16), q = inteiro(p.qtd, 1, MAX_JOGOS);
      combos = nums === 16 ? G.gerar16(an, q) : G.gerarLF(an, q);
      tipo = `Orcamento ${q} jogos`; titulo = `Por Orcamento — ${q} jogo(s) de ${nums} dezenas`;
      break;
    }
    case "megaOrc": {
      const q = inteiro(p.qtd, 1, MAX_JOGOS);
      combos = G.gerarMega(mega.dl, mega.dl[0] || [], q);
      lot = "mega"; concurso = mega.ultimo + 1; tipo = `Mega ${q} jogos`; titulo = `Por Orcamento — ${q} jogo(s)`;
      break;
    }
    case "duplaOrc": {
      const q = inteiro(p.qtd, 1, MAX_JOGOS);
      // Cada aposta concorre nos dois sorteios: usa o historico dos dois juntos.
      const todos = []; for (let i = 0; i < dupla.d1.length; i++) { todos.push(dupla.d1[i]); if (dupla.d2[i]) todos.push(dupla.d2[i]); }
      combos = G.gerarDupla(todos, dupla.d1[0] || [], q);
      lot = "dupla"; concurso = dupla.ultimo + 1; tipo = `Dupla ${q} jogos`; titulo = `Por Orcamento — ${q} jogo(s)`;
      break;
    }
    case "dupla8": {
      combos = G.gerar8Dupla(dupla.d1, dupla.d2).combos;
      lot = "dupla"; concurso = dupla.ultimo + 1; tipo = "Dupla Sena 8 Dezenas"; titulo = "12 Combinacoes de 8 Dezenas";
      break;
    }
    default: throw erro(400, "Acao desconhecida.");
  }
  return { combos, tipo, titulo, lot, concurso, restantes };
}

// Cria o handler HTTP. deps: {origens, verificarToken(token)->uid, perfil(uid), consumir(uid), dados()}
export function criarHandler(deps) {
  const ocupado = new Set(), janela = new Map();
  return async (req, res) => {
    const origem = req.headers.origin || "";
    const cors = deps.origens.includes(origem) ? {
      "Access-Control-Allow-Origin": origem, "Vary": "Origin",
      "Access-Control-Allow-Headers": "Authorization, Content-Type", "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
    } : {};
    const enviar = (st, obj) => { res.writeHead(st, { "Content-Type": "application/json; charset=utf-8", ...cors }); res.end(JSON.stringify(obj)); };
    if (req.method === "OPTIONS") { res.writeHead(204, cors); return res.end(); }
    const url = new URL(req.url, "http://x");
    if (req.method === "GET" && url.pathname === "/saude") return enviar(200, { ok: true });
    if (req.method !== "POST" || url.pathname !== "/gerar") return enviar(404, { erro: "Nao encontrado." });

    let uid = null;
    try {
      const tk = (req.headers.authorization || "").replace(/^Bearer /, "");
      if (!tk) throw erro(401, "Faca login novamente.");
      try { uid = await deps.verificarToken(tk); } catch { throw erro(401, "Sessao expirada. Faca login novamente."); }

      // Limites anti-abuso: 1 pedido por vez e 30 por minuto por usuario.
      if (ocupado.has(uid)) throw erro(429, "Aguarde a geracao anterior terminar.");
      const agora = Date.now(), lista = (janela.get(uid) || []).filter((t) => agora - t < 60000);
      if (lista.length >= 30) throw erro(429, "Muitos pedidos. Aguarde um minuto.");
      lista.push(agora); janela.set(uid, lista);
      ocupado.add(uid);

      let corpo = "";
      for await (const ch of req) { corpo += ch; if (corpo.length > 10000) throw erro(413, "Pedido grande demais."); }
      let p; try { p = JSON.parse(corpo || "{}"); } catch { throw erro(400, "JSON invalido."); }
      const [perfil, dados] = await Promise.all([deps.perfil(uid), deps.dados()]);
      const r = await executar(String(p.acao || ""), p, dados, perfil, () => deps.consumir(uid));
      enviar(200, r);
    } catch (e) {
      if (!e.status) console.error(e);
      enviar(e.status || 500, { erro: e.status ? e.message : "Erro no servidor. Tente de novo." });
    } finally { if (uid) ocupado.delete(uid); }
  };
}
