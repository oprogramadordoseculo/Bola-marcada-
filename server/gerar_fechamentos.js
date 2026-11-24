// Gera server/fechamentos.json: para cada opcao (n dezenas, garantia t), a lista de jogos
// em POSICOES (0..n-1). Na hora de gerar, o servidor so troca posicao -> dezena escolhida.
// Roda varias tentativas e guarda a menor; confere a garantia por forca bruta.
// Uso: node gerar_fechamentos.js   (demora alguns minutos)
import fs from "node:fs";
import { fechamentoLF } from "./gerador.js";
import { FECH_OK } from "./app.js";

function* combs(n, k, s = 0, cur = []) {
  if (cur.length === k) { yield cur.slice(); return; }
  for (let i = s; i <= n - (k - cur.length); i++) { cur.push(i); yield* combs(n, k, i + 1, cur); cur.pop(); }
}
function confere(n, t, jogos) {
  const masks = jogos.map((j) => j.reduce((m, i) => m | (1 << i), 0));
  for (const d of combs(n, 15)) {
    const md = d.reduce((m, i) => m | (1 << i), 0);
    let ok = false;
    for (const m of masks) { let x = m & md, c = 0; while (x) { x &= x - 1; c++; } if (c >= t) { ok = true; break; } }
    if (!ok) return false;
  }
  return true;
}

const tentativas = { 17: 30, 18: 30, 19: 12, 20: 4 };
const saida = {};
for (const op of FECH_OK) {
  const [n, t] = op.split("-").map(Number);
  const pos = Array.from({ length: n }, (_, i) => i);
  let melhor = null;
  for (let k = 0; k < tentativas[n]; k++) {
    const j = fechamentoLF(pos, t);
    if (!melhor || j.length < melhor.length) melhor = j;
  }
  if (!confere(n, t, melhor)) throw new Error("Garantia falhou em " + op);
  saida[op] = melhor;
  console.log(op, melhor.length, "jogos (garantia conferida)");
}
fs.writeFileSync(new URL("./fechamentos.json", import.meta.url), JSON.stringify(saida));
