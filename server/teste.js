// Testes do servidor sem Firebase de verdade: node teste.js
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { criarHandler, prepararDados, executar, LIM_GRATIS, FECH_OK } from "./app.js";
import { conferir, acertos } from "./conferir.js";

const DATA = path.join(path.dirname(new URL(import.meta.url).pathname), "..", "data");
const ler = (n) => JSON.parse(fs.readFileSync(path.join(DATA, n + ".json"), "utf8"));
const dados = prepararDados(ler("lotofacil"), ler("megasena"), ler("duplasena"));
let ok = 0;
const t = async (nome, f) => { await f(); ok++; console.log("ok ", nome); };

// ---------- servidor HTTP com dependencias falsas ----------
const usados = {};
const perfis = { gratis: { premium: false, admin: false }, prem: { premium: true, admin: false }, adm: { premium: false, admin: true } };
const handler = criarHandler({
  origens: ["https://site.teste"],
  verificarToken: async (tk) => { if (!perfis[tk]) throw new Error("token"); return tk; },
  perfil: async (uid) => perfis[uid],
  consumir: async (uid) => { usados[uid] = (usados[uid] || 0) + 1; if (usados[uid] > LIM_GRATIS) { const e = new Error("Limite diario atingido! Faca upgrade Premium."); e.status = 429; throw e; } return LIM_GRATIS - usados[uid]; },
  dados: async () => dados,
});
const srv = http.createServer(handler); await new Promise((r) => srv.listen(0, r));
const base = `http://127.0.0.1:${srv.address().port}`;
const gerar = async (tk, corpo) => { const r = await fetch(base + "/gerar", { method: "POST", headers: { Authorization: "Bearer " + tk, "Content-Type": "application/json", Origin: "https://site.teste" }, body: JSON.stringify(corpo) }); return { st: r.status, j: await r.json(), cors: r.headers.get("access-control-allow-origin") }; };

await t("saude", async () => { const r = await fetch(base + "/saude"); assert.equal(r.status, 200); });
await t("sem login -> 401", async () => { const r = await fetch(base + "/gerar", { method: "POST", body: "{}" }); assert.equal(r.status, 401); });
await t("token invalido -> 401", async () => { assert.equal((await gerar("xx", { acao: "lf10" })).st, 401); });
await t("CORS so para o site autorizado", async () => { assert.equal((await gerar("gratis", { acao: "lf10" })).cors, "https://site.teste"); usados.gratis = 0; });
await t("gratis: 3 geracoes e depois 429", async () => {
  for (let i = 0; i < 3; i++) { const r = await gerar("gratis", { acao: "lf10" }); assert.equal(r.st, 200); assert.equal(r.j.combos.length, 10); assert.equal(r.j.restantes, 2 - i); assert.equal(r.j.concurso, dados.lf.ultimo + 1); }
  const r = await gerar("gratis", { acao: "lf10" }); assert.equal(r.st, 429); assert.match(r.j.erro, /Limite/);
});
await t("gratis: funcoes Premium -> 403", async () => {
  for (const acao of ["lfTodos", "lfPads", "lf16", "lfFech", "lfOrc"]) assert.equal((await gerar("gratis", { acao, op: "17-14", qtd: 2, nums: 15, mp: 13 })).st, 403, acao);
});
await t("premium nao gasta geracao", async () => { for (let i = 0; i < 5; i++) assert.equal((await gerar("prem", { acao: "lf10" })).st, 200); assert.equal(usados.prem, undefined); });
await t("admin tem acesso Premium", async () => { assert.equal((await gerar("adm", { acao: "lf16" })).st, 200); });
await t("16 numeros: 30 jogos de 16", async () => { const r = await gerar("prem", { acao: "lf16" }); assert.equal(r.j.combos.length, 30); assert.ok(r.j.combos.every((c) => c.length === 16)); });
await t("padroes / todos / pts", async () => {
  assert.ok((await gerar("prem", { acao: "lfTodos" })).j.combos.length > 5);
  assert.equal((await gerar("prem", { acao: "lfPads" })).j.combos.length, 30);
  const r = await gerar("prem", { acao: "lfPts", mp: 11 }); assert.ok(r.st === 200 || r.st === 404);
  assert.equal((await gerar("prem", { acao: "lfPts", mp: 99 })).st, 400);
});
await t("fechamento: opcoes validas e invalidas", async () => {
  assert.equal((await gerar("prem", { acao: "lfFech", op: "20-14" })).st, 400);
  assert.equal((await gerar("prem", { acao: "lfFech", op: "17-14", dez: [1, 2, 3] })).st, 400);
  const dez = Array.from({ length: 17 }, (_, i) => i + 1);
  const r = await gerar("prem", { acao: "lfFech", op: "17-14", dez }); assert.equal(r.st, 200);
  assert.ok(r.j.combos.every((c) => c.length === 15 && c.every((x) => dez.includes(x))));
  const a = await gerar("prem", { acao: "lfFech", op: "18-13" }); assert.equal(a.st, 200); assert.ok(a.j.titulo.includes("garante 13"));
});
await t("orcamento: limites", async () => {
  assert.equal((await gerar("prem", { acao: "lfOrc", nums: 16, qtd: 3 })).j.combos[0].length, 16);
  assert.equal((await gerar("prem", { acao: "lfOrc", nums: 15, qtd: 9999 })).st, 400);
  assert.equal((await gerar("prem", { acao: "lfOrc", nums: 17, qtd: 2 })).st, 400);
});
await t("mega e dupla (so login)", async () => {
  const m = await gerar("gratis", { acao: "megaOrc", qtd: 5 }); assert.equal(m.st, 200); assert.equal(m.j.lot, "mega"); assert.ok(m.j.combos.every((c) => c.length === 6 && c.every((x) => x >= 1 && x <= 60)));
  const d = await gerar("gratis", { acao: "duplaOrc", qtd: 4 }); assert.equal(d.j.combos.length, 4); assert.equal(d.j.concurso, dados.dupla.ultimo + 1);
  const e = await gerar("gratis", { acao: "dupla8" }); assert.equal(e.j.combos.length, 12); assert.ok(e.j.combos.every((c) => c.length === 8));
});
await t("acao desconhecida -> 400", async () => { assert.equal((await gerar("prem", { acao: "hack" })).st, 400); });
await t("todas as opcoes de fechamento rodam", async () => { for (const op of FECH_OK) { const r = await executar("lfFech", { op }, dados, perfis.prem, null); assert.ok(r.combos.length >= 1, op); } });
srv.close();

// ---------- conferencia com Firestore falso ----------
await t("acertos (lotofacil e dupla)", async () => {
  assert.deepEqual(acertos("lf", [1, 2, 3], [1, 2, 9]), { pontos: 2 });
  assert.deepEqual(acertos("dupla", [1, 2, 3, 4, 5, 6], [1, 2, 3, 40, 41, 42, 1, 2, 3, 4, 50, 51]), { pontos: 4, pontos1: 3, pontos2: 4 });
});
await t("conferir grava pontos so dos concursos ja sorteados", async () => {
  const store = new Map();
  const ref = (p) => ({ id: p.split("/").pop(), path: p, collection: (c) => col(p + "/" + c), set: async (d, o) => store.set(p, { ...(o?.merge ? store.get(p) : {}), ...d }) });
  const col = (p) => ({
    listDocuments: async () => [...new Set([...store.keys()].filter((k) => k.startsWith(p + "/")).map((k) => k.split("/").slice(0, 2).join("/")))].map(ref),
    where: (f, op, v) => ({ get: async () => ({ docs: [...store.entries()].filter(([k, d]) => k.startsWith(p + "/") && k.split("/").length === p.split("/").length + 1 && d[f] === v).map(([k, d]) => ({ ref: ref(k), data: () => d })) }) }),
  });
  const db = { collection: col, doc: ref, batch: () => { const ops = []; return { update: (r, d) => ops.push(() => store.set(r.path, { ...store.get(r.path), ...d })), commit: async () => ops.forEach((f) => f()) }; } };
  const ul = dados.lf.ultimo, res = ler("lotofacil")[String(ul)].join(" ");
  store.set("combinacoes/u1/jogos/a", { lot: "lf", concurso: ul, numeros: res, pontos: null });          // 15 pontos
  store.set("combinacoes/u1/jogos/b", { lot: "lf", concurso: ul + 1, numeros: res, pontos: null });      // futuro
  store.set("combinacoes/u1/jogos/c", { numeros: res, pontos: null });                                   // antigo sem concurso
  store.set("combinacoes/u1/jogos/d", { lot: "dupla", concurso: dados.dupla.ultimo, numeros: "1 2 3 4 5 6", pontos: null });
  const r = await conferir(db, DATA);
  assert.equal(r.jogos, 2);
  assert.equal(store.get("combinacoes/u1/jogos/a").pontos, 15);
  assert.equal(store.get("combinacoes/u1/jogos/b").pontos, null);
  assert.equal(store.get("combinacoes/u1/jogos/c").pontos, null);
  assert.equal(typeof store.get("combinacoes/u1/jogos/d").pontos1, "number");
  const uc = store.get("usuarios/u1").ultimaConferencia; assert.ok(uc.concurso >= dados.dupla.ultimo); assert.ok(uc.qtd >= 1);
});
console.log(`\n${ok} testes passaram`);
