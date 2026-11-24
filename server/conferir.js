// Conferencia automatica dos jogos salvos — roda no GitHub Actions depois de baixar os resultados.
// Para cada jogo ainda nao conferido (pontos == null) que tenha `lot` e `concurso`,
// se o resultado daquele concurso ja existe em data/, grava os pontos.
// Tambem grava em usuarios/{uid}.ultimaConferencia um resumo para o app avisar o usuario.
//
// Uso: FIREBASE_SA='{...json...}' node conferir.js [pasta_data]
import fs from "node:fs";
import path from "node:path";
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

const ARQ = { lf: "lotofacil", mega: "megasena", dupla: "duplasena" };

// Calcula acertos. Dupla: melhor dos dois sorteios (e guarda os dois).
export function acertos(lot, numeros, resultado) {
  const conta = (r) => numeros.filter((n) => r.includes(n)).length;
  if (lot === "dupla") { const a = conta(resultado.slice(0, 6)), b = conta(resultado.slice(6, 12)); return { pontos: Math.max(a, b), pontos1: a, pontos2: b }; }
  return { pontos: conta(resultado) };
}

export async function conferir(db, pastaData) {
  const res = {};
  for (const [lot, nome] of Object.entries(ARQ)) {
    const j = JSON.parse(fs.readFileSync(path.join(pastaData, nome + ".json"), "utf8"));
    res[lot] = Object.fromEntries(Object.entries(j).map(([k, v]) => [k, v.map(Number)]));
  }
  let usuarios = 0, jogos = 0;
  for (const userRef of await db.collection("combinacoes").listDocuments()) {
    const sn = await userRef.collection("jogos").where("pontos", "==", null).get();
    const resumo = {}; // por lot+concurso
    let batch = db.batch(), nb = 0;
    for (const d of sn.docs) {
      const g = d.data(), conc = Number(g.concurso);
      if (!ARQ[g.lot] || !conc) continue;               // jogos antigos sem concurso: ignora
      const r = res[g.lot][String(conc)];
      if (!r) continue;                                 // concurso ainda nao sorteado
      const nums = String(g.numeros || "").trim().split(/\s+/).map(Number);
      const a = acertos(g.lot, nums, r);
      batch.update(d.ref, { ...a, conferidoEm: FieldValue.serverTimestamp(), resultado: r.map((n) => String(n).padStart(2, "0")).join(" ") });
      if (++nb >= 450) { await batch.commit(); batch = db.batch(); nb = 0; }
      const k = g.lot + "-" + conc;
      resumo[k] = resumo[k] || { lot: g.lot, concurso: conc, qtd: 0, melhor: 0 };
      resumo[k].qtd++; resumo[k].melhor = Math.max(resumo[k].melhor, a.pontos);
      jogos++;
    }
    if (nb) await batch.commit();
    const lista = Object.values(resumo).sort((x, y) => y.concurso - x.concurso);
    if (lista.length) {
      usuarios++;
      await db.doc(`usuarios/${userRef.id}`).set({ ultimaConferencia: { ...lista[0], outros: lista.slice(1, 5), em: FieldValue.serverTimestamp() } }, { merge: true });
    }
  }
  return { usuarios, jogos };
}

if (process.argv[1] && import.meta.url === "file://" + path.resolve(process.argv[1])) {
  const sa = JSON.parse(process.env.FIREBASE_SA || "null");
  if (!sa) { console.log("FIREBASE_SA nao configurado — conferencia pulada."); process.exit(0); }
  initializeApp({ credential: cert(sa) });
  const pasta = process.argv[2] || path.join(path.dirname(new URL(import.meta.url).pathname), "..", "data");
  const r = await conferir(getFirestore(), pasta);
  console.log(`Conferencia: ${r.jogos} jogo(s) de ${r.usuarios} usuario(s).`);
}
