#!/usr/bin/env python3
"""Atualiza data/*.json com os resultados oficiais da Caixa.

Formato dos arquivos (compatível com o app):
  { "numero_do_concurso": ["01", "02", ...], ... }
Dupla Sena: 12 dezenas por concurso (6 do 1º sorteio + 6 do 2º).

Uso: python3 scripts/atualizar_resultados.py
Roda sozinho todo dia pelo GitHub Actions (.github/workflows/atualizar-resultados.yml).
"""
import json
import os
import sys
import time
import urllib.request

API = "https://servicebus2.caixa.gov.br/portaldeloterias/api/{jogo}{sufixo}"
JOGOS = {"lotofacil": 15, "megasena": 6, "duplasena": 12}
PASTA = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "data")
HEADERS = {"User-Agent": "Mozilla/5.0 (atualizador-resultados)", "Accept": "application/json"}


def buscar(jogo, numero=None, tentativas=4):
    url = API.format(jogo=jogo, sufixo=f"/{numero}" if numero else "")
    for i in range(tentativas):
        try:
            req = urllib.request.Request(url, headers=HEADERS)
            with urllib.request.urlopen(req, timeout=20) as r:
                return json.load(r)
        except Exception as e:  # noqa: BLE001
            if i == tentativas - 1:
                raise RuntimeError(f"{url}: {e}") from e
            time.sleep(2 * (i + 1))


def dezenas(jogo, d):
    ns = list(d.get("listaDezenas") or d.get("dezenasSorteadasOrdemSorteio") or [])
    if jogo == "duplasena":
        ns += list(d.get("listaDezenasSegundoSorteio") or [])
    return [str(n).zfill(2) for n in ns]


def atualizar(jogo, qtd):
    caminho = os.path.join(PASTA, f"{jogo}.json")
    dados = {}
    if os.path.exists(caminho):
        with open(caminho, encoding="utf-8") as f:
            dados = json.load(f)
    ultimo_local = max(map(int, dados), default=0)
    atual = buscar(jogo)
    ultimo = int(atual["numero"])
    novos = 0
    for n in range(ultimo_local + 1, ultimo + 1):
        d = atual if n == ultimo else buscar(jogo, n)
        ds = dezenas(jogo, d)
        if len(ds) != qtd:
            print(f"  ! {jogo} {n}: {len(ds)} dezenas, ignorado", file=sys.stderr)
            continue
        dados[str(n)] = ds
        novos += 1
        if n != ultimo:
            time.sleep(0.25)
    ordenado = {k: dados[k] for k in sorted(dados, key=int)}
    with open(caminho, "w", encoding="utf-8") as f:
        json.dump(ordenado, f, separators=(",", ":"))
    print(f"{jogo}: {novos} novo(s), último concurso {ultimo}, total {len(ordenado)}")
    return novos


def main():
    os.makedirs(PASTA, exist_ok=True)
    erros = 0
    for jogo, qtd in JOGOS.items():
        try:
            atualizar(jogo, qtd)
        except Exception as e:  # noqa: BLE001
            erros += 1
            print(f"ERRO em {jogo}: {e}", file=sys.stderr)
    sys.exit(1 if erros == len(JOGOS) else 0)


if __name__ == "__main__":
    main()
