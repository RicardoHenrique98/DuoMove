# Duo Move

App de treino (PWA) para iPhone e Android: rotinas, treino em andamento com timer de descanso, histórico, recordes e gráficos de evolução.

- Sem build: HTML, CSS e JavaScript (módulos ES). Basta servir a pasta por HTTPS (ex.: GitHub Pages).
- Dados ficam no aparelho (localStorage), com backup por exportação/importação em JSON.
- Imagens de demonstração: [Free Exercise DB](https://github.com/yuhonas/free-exercise-db) (domínio público).

Para testar localmente: `python3 -m http.server` na pasta e abrir `http://localhost:8000`.

## Vozes do treinador (Gemini Live)

As falas do treinador são geradas uma vez e ficam em `data/voz/`. O app baixa o pacote e toca offline.
Para gerar ou refazer, **no PC** (a nuvem do Claude bloqueia a conexão ao vivo), com Node 22+:

```
git pull
set GEMINI_API_KEY=<a mesma chave do Juca>
node tools/gerar-vozes-live.mjs --vozes Charon,Leda
git add data/voz && git commit -m "Vozes do treinador geradas pela Gemini Live" && git push
```

Cada fala é conferida por transcrição e refeita se vier diferente. Retomável: se parar, rode de novo.
