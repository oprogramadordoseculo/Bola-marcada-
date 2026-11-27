// Atalho para o Render: "node index.js" na raiz do projeto liga o servidor que fica em server/.
import("./server/index.js").catch((e) => { console.error(e); process.exit(1); });
