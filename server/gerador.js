// Geradores de jogos — roda SOMENTE no servidor (o navegador nao tem mais este codigo).
// Extraido do index.html original; mesma logica.

// ── MATH ──
function rng(a,b){const r=[];for(let i=a;i<b;i++)r.push(i);return r;}
function soma(a){return a.reduce((s,n)=>s+n,0);}
function cnt(a,s){return a.filter(n=>s.has(n)).length;}
function pares(a){return a.filter(n=>n%2===0).length;}
function shuf(a){for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
function comb(n,k){if(k>n)return 0;let r=1;for(let i=0;i<k;i++){r=r*(n-i)/(i+1);}return Math.round(r);}
function pesado(univ,pesos,k){
  const ch=univ.map((_,i)=>({i,v:Math.random()**(1/pesos[i])}));
  ch.sort((a,b)=>b.v-a.v);
  return ch.slice(0,k).map(x=>univ[x.i]);
}
function quentes(dl,max=25,jan=15){
  const f={};for(let i=1;i<=max;i++)f[i]=0;
  dl.slice(0,jan).forEach(d=>d.forEach(n=>f[n]++));
  const ord=Object.entries(f).sort((a,b)=>b[1]-a[1]).map(([n])=>Number(n));
  return{q:new Set(ord.slice(0,10)),fr:new Set(ord.slice(-10))};
}

// ── ANALISE LF ──
function perfLF(ns){return{pares:pares(ns),impares:ns.length-pares(ns),primos:cnt(ns,PRI),fibonacci:cnt(ns,FIB),moldura:cnt(ns,MOL),centro:cnt(ns,CEN),triangulares:cnt(ns,TRI),multiplos3:cnt(ns,M3)};}
function anLFH(cs){
  const freq={};for(let i=1;i<=25;i++)freq[i]=0;
  const perfis=[],dl=[];
  for(const c of cs){const ns=c.dezenas.map(Number);ns.forEach(n=>freq[n]++);perfis.push(perfLF(ns));dl.push(ns);}
  const n=perfis.length,med={};
  for(const k of Object.keys(perfis[0]))med[k]=perfis.reduce((s,p)=>s+p[k],0)/n;
  return{freq,med,perfis,dl,ultimoSet:new Set(dl[0]),ul:dl[0],total:n};
}

// ── FILTROS E GERACAO LF ──
function filtLF(c,uS){
  const p=pares(c);
  if(!((p===8&&c.length-p===7)||(p===7&&c.length-p===8)))return false;
  if(cnt(c,PRI)<5||cnt(c,PRI)>6)return false;
  const rep=[...new Set(c)].filter(n=>uS.has(n)).length;
  if(rep<8||rep>10)return false;
  const s=soma(c);if(s<180||s>220)return false;
  return true;
}
function pontLF(c,q,fr){
  const s=new Set(c);let p=0;
  p+=Math.abs(cnt(c,MOL)-9.6);p+=Math.abs(cnt(c,CEN)-5.4);
  p+=Math.max(0,5-[...s].filter(n=>q.has(n)).length)*0.8;
  p+=Math.max(0,[...s].filter(n=>fr.has(n)).length-3)*1.2;
  for(const col of COLS)p+=Math.abs([...s].filter(n=>col.has(n)).length-3)*0.5;
  return p;
}
function gerarLF(an,qtd=10,chave=null,valor=0){
  const{q,fr}=quentes(an.dl);
  const uni=rng(1,26),pesos=uni.map(n=>q.has(n)?3.0:fr.has(n)?0.6:1.5);
  const cands=[],vis=new Set();let t=0;
  while(cands.length<qtd*8&&t<80000){
    t++;
    const c=pesado(uni,pesos,15).sort((a,b)=>a-b);
    const tk=c.join(",");if(vis.has(tk))continue;vis.add(tk);
    if(chave){const v=perfLF(c)[chave];if(Math.abs(v-valor)>1)continue;}
    if(!filtLF(c,an.ultimoSet))continue;
    cands.push(c);
  }
  if(!cands.length)for(let i=0;i<qtd*3;i++)cands.push(shuf(rng(1,26)).slice(0,15).sort((a,b)=>a-b));
  cands.sort((a,b)=>pontLF(a,q,fr)-pontLF(b,q,fr));
  const esc=[];
  for(const c of cands){
    if(!esc.some(e=>e.filter(n=>c.includes(n)).length>=14))esc.push(c);
    if(esc.length>=qtd)break;
  }
  while(esc.length<qtd)esc.push(cands[esc.length%cands.length]||cands[0]);
  return esc.slice(0,qtd);
}
function padLF(an,n=3,jan=15){
  const ps=an.perfis.slice(0,jan),rep={};
  for(let i=0;i<ps.length-1;i++)for(const k of["pares","moldura","primos","centro","fibonacci"])
    if(ps[i][k]===ps[i+1][k]){const kk=k+"_"+ps[i][k];rep[kk]=(rep[kk]||{chave:k,valor:ps[i][k],cont:0});rep[kk].cont++;}
  const tot=Math.max(1,ps.length-1);
  return Object.values(rep).sort((a,b)=>b.cont-a.cont).slice(0,n).map((p,i)=>({...p,nome:"Padrao "+["A","B","C"][i],pct:+(p.cont/tot*100).toFixed(1)}));
}
function todPad(an){
  const ps=an.perfis,rep={};
  const labs={pares:"pares",moldura:"moldura",primos:"primos",centro:"centro",fibonacci:"fibonacci",triangulares:"triangulares",multiplos3:"mult.3"};
  for(let i=0;i<ps.length-1;i++)for(const k of Object.keys(labs))
    if(ps[i][k]===ps[i+1][k]){const kk=k+"_"+ps[i][k];rep[kk]=(rep[kk]||{chave:k,valor:ps[i][k],cont:0,lab:labs[k]});rep[kk].cont++;}
  const tot=Math.max(1,ps.length-1);
  return Object.values(rep).sort((a,b)=>b.cont-a.cont).map((p,i)=>({...p,nome:"P"+(i+1).toString().padStart(2,"0"),pct:+(p.cont/tot*100).toFixed(1)}));
}
function padPts(an,mp){
  const dl=an.dl.slice(0,15),ps=an.perfis.slice(0,15),ok=[];
  for(let i=0;i<dl.length-1;i++){const rep=[...new Set(dl[i])].filter(n=>dl[i+1].includes(n)).length;if(rep>=mp)ok.push(ps[i+1]);}
  if(!ok.length)return[];
  const n=ok.length,med={};
  for(const k of Object.keys(ok[0]))med[k]=ok.reduce((s,p)=>s+p[k],0)/n;
  const v={};for(const k of Object.keys(ok[0])){const m=med[k];v[k]=ok.reduce((s,p)=>s+(p[k]-m)**2,0)/n;}
  return Object.keys(v).sort((a,b)=>v[a]-v[b]).slice(0,3).map((k,i)=>({nome:"Padrao "+["A","B","C"][i],chave:k,valor:Math.round(med[k]),pct:+(n/Math.max(1,dl.length-1)*100).toFixed(1)}));
}

// ── FILTROS E GERACAO MEGA ──
function filtMega(c,uS){
  const s=new Set(c),p=pares(c);
  if(p===0||p===6)return false;
  const sm=soma(c);if(sm<150||sm>230)return false;
  for(const q of QM)if([...s].filter(n=>q.has(n)).length>3)return false;
  const o=c.slice().sort((a,b)=>a-b);let sq=1;
  for(let i=1;i<o.length;i++){if(o[i]===o[i-1]+1){sq++;if(sq>3)return false;}else sq=1;}
  if(cnt(c,PRIMM)<1||cnt(c,PRIMM)>3)return false;
  if(cnt(c,FIBM)>2)return false;
  if(cnt(c,GEMM)>2)return false;
  const term={};c.forEach(n=>{const t=n%10;term[t]=(term[t]||0)+1;});
  if(Math.max(...Object.values(term))>2)return false;
  return true;
}
function gerarMega(dl,ul,qtd=10){
  const{q,fr}=quentes(dl,60,15);
  const uni=rng(1,61),pesos=uni.map(n=>q.has(n)?2.5:fr.has(n)?0.6:1.3);
  const uS=new Set(ul||[]),cands=[],vis=new Set();let t=0;
  while(cands.length<qtd*8&&t<80000){
    t++;
    const c=pesado(uni,pesos,6).sort((a,b)=>a-b);
    const tk=c.join(",");if(vis.has(tk))continue;vis.add(tk);
    if(!filtMega(c,uS))continue;cands.push(c);
  }
  if(!cands.length)for(let i=0;i<qtd*3;i++)cands.push(shuf(rng(1,61)).slice(0,6).sort((a,b)=>a-b));
  cands.sort((a,b)=>{const pa=Math.abs([...new Set(a)].filter(n=>q.has(n)).length-3);const pb=Math.abs([...new Set(b)].filter(n=>q.has(n)).length-3);return pa-pb;});
  const esc=[];
  for(const c of cands){if(!esc.some(e=>e.filter(n=>c.includes(n)).length>=5))esc.push(c);if(esc.length>=qtd)break;}
  while(esc.length<qtd)esc.push(cands[esc.length%cands.length]||cands[0]);
  return esc.slice(0,qtd);
}

// ── FILTROS E GERACAO DUPLA ──
function filtDupla(c){
  const p=pares(c);if(p<2||p>4)return false;
  const s=soma(c);if(s<110||s>190)return false;
  const sc=new Set(c);
  for(const q of QD)if([...sc].filter(n=>q.has(n)).length>3)return false;
  return true;
}
function gerarDupla(dl,ul,qtd=10){
  const{q,fr}=quentes(dl,50,15);
  const uni=rng(1,51),pesos=uni.map(n=>q.has(n)?2.5:fr.has(n)?0.6:1.3);
  const cands=[],vis=new Set();let t=0;
  while(cands.length<qtd*8&&t<80000){
    t++;
    const c=pesado(uni,pesos,6).sort((a,b)=>a-b);
    const tk=c.join(",");if(vis.has(tk))continue;vis.add(tk);
    if(!filtDupla(c))continue;cands.push(c);
  }
  if(!cands.length)for(let i=0;i<qtd*3;i++)cands.push(shuf(rng(1,51)).slice(0,6).sort((a,b)=>a-b));
  const esc=[];
  for(const c of cands){if(!esc.some(e=>e.filter(n=>c.includes(n)).length>=5))esc.push(c);if(esc.length>=qtd)break;}
  while(esc.length<qtd)esc.push(cands[esc.length%cands.length]||cands[0]);
  return esc.slice(0,qtd);
}
function gerar8Dupla(d1,d2){
  const todas=[...d1,...d2];
  const{q,fr}=quentes(todas,50,15);
  const uni=rng(1,51),pesos=uni.map(n=>q.has(n)?2.5:fr.has(n)?0.6:1.3);
  const cands=[],vis=new Set();let t=0;
  while(cands.length<120&&t<300000){
    t++;
    const c=pesado(uni,pesos,8).sort((a,b)=>a-b);
    const tk=c.join(",");if(vis.has(tk))continue;vis.add(tk);
    const p=pares(c),s=soma(c);
    if(p<3||p>5||s<180||s>320)continue;
    const sc=new Set(c);if(QD.some(qd=>[...sc].filter(n=>qd.has(n)).length>4))continue;
    cands.push(c);
  }
  if(!cands.length)for(let i=0;i<24;i++)cands.push(shuf(rng(1,51)).slice(0,8).sort((a,b)=>a-b));
  cands.sort((a,b)=>{const pa=Math.max(0,2-[...new Set(a)].filter(n=>q.has(n)).length)*0.8;const pb=Math.max(0,2-[...new Set(b)].filter(n=>q.has(n)).length)*0.8;return pa-pb;});
  const esc=[];
  for(const c of cands){if(!esc.some(e=>e.filter(n=>c.includes(n)).length>=7))esc.push(c);if(esc.length>=12)break;}
  while(esc.length<12)esc.push(cands[esc.length%cands.length]||cands[0]);
  return{combos:esc.slice(0,12),q,fr};
}
function sepDupla(raw){
  const d1=[],d2=[];
  for(const r of raw)if(r.length>=12){d1.push(r.slice(0,6).map(Number).sort((a,b)=>a-b));d2.push(r.slice(6,12).map(Number).sort((a,b)=>a-b));}
  return{d1,d2};
}

// ── CONSTANTES ──
const MOL=new Set([1,2,3,4,5,6,10,11,15,16,20,21,22,23,24,25]);
const CEN=new Set([7,8,9,12,13,14,17,18,19]);
const PRI=new Set([2,3,5,7,11,13,17,19,23]);
const FIB=new Set([1,2,3,5,8,13,21]);
const TRI=new Set([1,3,6,10,15,21]);
const M3=new Set([3,6,9,12,15,18,21,24]);
const COLS=[new Set([21,22,23,24,25]),new Set([16,17,18,19,20]),new Set([11,12,13,14,15]),new Set([6,7,8,9,10]),new Set([1,2,3,4,5])];
// MEGA
const PRIMM=new Set([2,3,5,7,11,13,17,19,23,29,31,37,41,43,47,53,59]);
const FIBM=new Set([1,2,3,5,8,13,21,34,55]);
const GEMM=new Set([11,22,33,44,55]);
const QM=[new Set(rng(1,16)),new Set(rng(16,31)),new Set(rng(31,46)),new Set(rng(46,61))];
// DUPLA
const QD=[new Set(rng(1,13)),new Set(rng(13,25)),new Set(rng(25,38)),new Set(rng(38,51))];

// Filtro para jogos de 16 dezenas (faixas equivalentes as de 15, ajustadas para 16).
function filtLF16(c,uS){
  const p=pares(c);if(p<7||p>9)return false;
  const pr=cnt(c,PRI);if(pr<5||pr>7)return false;
  const rep=c.filter(n=>uS.has(n)).length;if(rep<9||rep>11)return false;
  const s=soma(c);if(s<190||s>226)return false;
  return true;
}
function gerar16(an,qtd){
  const{q,fr}=quentes(an.dl);
  const uni=rng(1,26),pesos=uni.map(n=>q.has(n)?3.0:fr.has(n)?0.6:1.5);
  const cands=[],vis=new Set();let t=0;
  while(cands.length<qtd*3&&t<80000){t++;const c=pesado(uni,pesos,16).sort((a,b)=>a-b);const tk=c.join(",");if(vis.has(tk))continue;vis.add(tk);if(!filtLF16(c,an.ultimoSet))continue;cands.push(c);}
  while(cands.length<qtd)cands.push(pesado(uni,pesos,16).sort((a,b)=>a-b));
  cands.sort((a,b)=>pontLF(a,q,fr)-pontLF(b,q,fr));
  return cands.slice(0,qtd);
}

// Fechamento (cobertura gulosa). Cada jogo e representado pelas m=n-15 dezenas que ficam de fora (g).
// Se o sorteio D esta dentro das n dezenas (de fora: d), acertos = 15-m+|g∩d|.
// Garantir t pontos => todo d precisa ter algum g com |g∩d| >= t-15+m.
// Garantia conferida por forca bruta para todas as opcoes do menu.
function fechamentoLF(dez,garantia){
  const n=dez.length,m=n-15,r=garantia-15+m;
  const subs=[];
  (function rec(st,k,mask){if(k===0){subs.push(mask);return;}for(let i=st;i<=n-k;i++)rec(i+1,k-1,mask|(1<<i));})(0,m,0);
  const jogo=mask=>{const g=[];for(let i=0;i<n;i++)if(!(mask&(1<<i)))g.push(dez[i]);return g.sort((a,b)=>a-b);};
  if(m<1||r<=0)return[jogo(subs[0]||0)];
  const pc=x=>{x-=(x>>>1)&0x55555555;x=(x&0x33333333)+((x>>>2)&0x33333333);return(((x+(x>>>4))&0xF0F0F0F)*0x1010101)>>>24;};
  const N=subs.length,viz=new Array(N);
  for(let i=0;i<N;i++){const v=[];for(let j=0;j<N;j++)if(pc(subs[i]&subs[j])>=r)v.push(j);viz[i]=v;}
  const cob=new Uint8Array(N),ganho=viz.map(v=>v.length),esc=[];let falta=N;
  while(falta>0){
    let best=-1,bg=-1;
    for(let i=0;i<N;i++){const g=ganho[i]+Math.random()*0.5;if(g>bg){bg=g;best=i;}}
    esc.push(best);
    for(const j of viz[best])if(!cob[j]){cob[j]=1;falta--;for(const k of viz[j])ganho[k]--;}
  }
  return esc.map(i=>jogo(subs[i]));
}

// Varios padroes de uma vez: gera UM lote de candidatos e escolhe o melhor para cada padrao
// (antes eram dezenas de buscas separadas, lento em servidor fraco).
function gerarPorPadroes(an,pads,porPadrao=1){
  const{q,fr}=quentes(an.dl);
  const uni=rng(1,26),pesos=uni.map(n=>q.has(n)?3.0:fr.has(n)?0.6:1.5);
  const pool=[],vis=new Set();let t=0;
  while(pool.length<4000&&t<60000){
    t++;const c=pesado(uni,pesos,15).sort((a,b)=>a-b);const tk=c.join(",");
    if(vis.has(tk))continue;vis.add(tk);if(!filtLF(c,an.ultimoSet))continue;
    pool.push({c,perf:perfLF(c),pt:pontLF(c,q,fr)});
  }
  pool.sort((a,b)=>a.pt-b.pt);
  const usados=new Set(),out=[];
  for(const pd of pads){
    let n=0;
    for(const x of pool){
      if(n>=porPadrao)break;
      const tk=x.c.join(",");if(usados.has(tk))continue;
      if(Math.abs(x.perf[pd.chave]-pd.valor)>1)continue;
      usados.add(tk);out.push(x.c);n++;
    }
    if(n<porPadrao){
      // Padrao incompativel com os filtros: usa os candidatos mais proximos dele.
      const prox=pool.filter(x=>!usados.has(x.c.join(","))).sort((a,b)=>Math.abs(a.perf[pd.chave]-pd.valor)-Math.abs(b.perf[pd.chave]-pd.valor)||a.pt-b.pt);
      for(const x of prox.slice(0,porPadrao-n)){usados.add(x.c.join(","));out.push(x.c);}
    }
  }
  return out;
}

export {gerarPorPadroes,pesado,filtLF,pontLF,rng,soma,cnt,pares,comb,quentes,perfLF,anLFH,gerarLF,padLF,todPad,padPts,gerarMega,gerarDupla,gerar8Dupla,sepDupla,gerar16,fechamentoLF};
