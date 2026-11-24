// Servidor de geracao de jogos — 15 Pontos (roda no Render, plano gratis).
// Variaveis de ambiente:
//   FIREBASE_SA  = conteudo do JSON da conta de servico do Firebase (obrigatorio)
//   DATA_BASE    = de onde baixar os resultados (padrao: o proprio site no GitHub Pages)
//   ORIGENS      = sites autorizados a chamar o servidor, separados por virgula
//   PORT         = porta (o Render define sozinho)
import http from "node:http";
import { initializeApp, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { criarHandler, prepararDados, hojeSP, LIM_GRATIS } from "./app.js";

const sa = JSON.parse(process.env.FIREBASE_SA || "null");
if (!sa) { console.error("Falta a variavel FIREBASE_SA."); process.exit(1); }
initializeApp({ credential: cert(sa) });
const auth = getAuth(), db = getFirestore();

const DATA_BASE = process.env.DATA_BASE || "https://oprogramadordoseculo.github.io/Bola-marcada-/data/";
const ORIGENS = (process.env.ORIGENS || "https://oprogramadordoseculo.github.io").split(",").map((s) => s.trim());

// Resultados: baixa do site e guarda por 10 minutos.
let cache = null, cacheEm = 0;
async function dados() {
  if (cache && Date.now() - cacheEm < 10 * 60000) return cache;
  const pega = async (n) => { const r = await fetch(DATA_BASE + n + ".json?t=" + Date.now()); if (!r.ok) throw new Error(n + " HTTP " + r.status); return r.json(); };
  try {
    const [lf, mega, dupla] = await Promise.all([pega("lotofacil"), pega("megasena"), pega("duplasena")]);
    cache = prepararDados(lf, mega, dupla); cacheEm = Date.now();
  } catch (e) { if (!cache) throw e; console.warn("Usando resultados em cache:", e.message); }
  return cache;
}

async function perfil(uid) {
  const [u, a] = await Promise.all([db.doc(`usuarios/${uid}`).get(), db.doc(`admins/${uid}`).get()]);
  const d = u.exists ? u.data() : {};
  const ate = d.premiumAte && d.premiumAte.toDate ? d.premiumAte.toDate() : null;
  return { premium: d.premium === true && (!ate || ate > new Date()), admin: a.exists };
}

// Gasta 1 geracao gratis do dia (horario de Brasilia). Lanca 429 quando acabou.
async function consumir(uid) {
  const ref = db.doc(`usuarios/${uid}`), hoje = hojeSP();
  return db.runTransaction(async (tx) => {
    const sn = await tx.get(ref), d = sn.exists ? sn.data() : {};
    const usadas = d.dataHoje === hoje ? Math.max(0, Number(d.geracoesHoje) || 0) : 0;
    if (usadas >= LIM_GRATIS) { const e = new Error("Limite diario atingido! Faca upgrade Premium."); e.status = 429; throw e; }
    tx.set(ref, { geracoesHoje: usadas + 1, dataHoje: hoje }, { merge: true });
    return LIM_GRATIS - usadas - 1;
  });
}

const handler = criarHandler({ origens: ORIGENS, verificarToken: async (t) => (await auth.verifyIdToken(t)).uid, perfil, consumir, dados });
const porta = Number(process.env.PORT) || 3000;
http.createServer(handler).listen(porta, () => console.log("Servidor no ar na porta", porta));
dados().catch((e) => console.warn("Primeira carga dos resultados falhou:", e.message));
