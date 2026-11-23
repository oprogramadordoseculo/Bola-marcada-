# 15 Pontos — Bola Marcada

Estatísticas e gerador de jogos para Lotofácil, Mega-Sena e Dupla Sena.

**PWA instalável** — acesse pelo celular e adicione à tela inicial:
https://oprogramadordoseculo.github.io/Bola-marcada-/

## Estrutura

| Arquivo | Para que serve |
|---|---|
| `index.html` | O app inteiro (tela, Firebase, geradores) |
| `sw.js` | Service worker: instalação e uso sem internet. **Aumente `VERSAO` a cada publicação.** |
| `manifest.json` | Nome, ícones e cores do app instalado |
| `data/*.json` | Resultados oficiais (`{"concurso": ["dezenas", ...]}`) |
| `scripts/atualizar_resultados.py` | Busca os concursos novos na API da Caixa |
| `.github/workflows/atualizar-resultados.yml` | Roda o script acima todo dia, sozinho |
| `firestore.rules` | Regras de segurança do banco — colar no Firebase Console |

## Premium (como funciona)

1. O cliente paga o PIX e toca em **"Já paguei — solicitar ativação"** no app.
2. Você (admin) abre a aba **Conta** → **Painel do administrador** → **Aprovar 30 dias**.
   Também dá para ativar direto pelo e-mail do cliente.
3. O Premium vale 30 dias (renovar soma mais 30 a partir do vencimento).

O usuário **não consegue** se dar Premium sozinho: as regras do Firestore só deixam
o admin mexer nos campos `premium` e `premiumAte`.

### Virar admin (uma vez só)
1. Firebase Console → **Authentication → Users** → copie o **UID** da sua conta.
2. **Firestore Database → Dados → Iniciar coleção** `admins` → ID do documento = seu UID
   (pode deixar um campo qualquer, ex. `nome: "Edmar"`).

### Liberar Premium manualmente pelo Console (alternativa)
`usuarios/{uid}` → `premium: true` e `premiumAte: (timestamp da data de vencimento)`.

## Atualizar resultados na mão
```
python3 scripts/atualizar_resultados.py
```
Ou no GitHub: aba **Actions → Atualizar resultados das loterias → Run workflow**.

Desenvolvido por [@oprogramadordoseculo](https://github.com/oprogramadordoseculo)
