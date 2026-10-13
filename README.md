# Controlo de Indicações (PWA)

App pessoal para registar indicações de clientes, acompanhar o status e controlar comissões. Funciona offline e instala-se no ecrã principal do telemóvel.

## Publicar no GitHub Pages

1. Entra em github.com e cria um repositório novo (ex.: `indicacoes`). Pode ser público.
2. No repositório, toca em **Add file > Upload files** e arrasta **todo o conteúdo** desta pasta (index.html, sw.js, manifest.webmanifest e as pastas css, js, icons). Toca em **Commit changes**.
3. Vai a **Settings > Pages**. Em *Source* escolhe **Deploy from a branch**, branch **main**, pasta **/ (root)** e guarda.
4. Espera 1 a 2 minutos. O endereço fica: `https://O-TEU-UTILIZADOR.github.io/indicacoes/`

## Instalar no telemóvel

- **Android (Chrome):** abre o endereço, toca nos 3 pontos e em **Instalar app** (ou *Adicionar ao ecrã principal*).
- **iPhone (Safari):** abre o endereço, toca em **Partilhar** e depois em **Adicionar ao ecrã principal**. Abre sempre pelo ícone, senão as notificações não funcionam.

Na primeira vez, toca em **Ativar notificações** no Painel.

## Como funcionam os lembretes

- Com a app aberta ou usada recentemente, a notificação aparece à hora certa.
- Com a app fechada, o Android (Chrome, app instalada) verifica de tempos a tempos, por isso pode chegar com algum atraso. O iPhone não faz esta verificação em segundo plano.
- Para um alarme **garantido** à hora exata, usa **Pôr no calendário** no lembrete: cria um evento com alarme no calendário do telemóvel.

## Dados e cópia de segurança

- Tudo fica guardado só neste telemóvel (IndexedDB). Limpar os dados do navegador ou desinstalar a app apaga as indicações.
- Usa **Exportar CSV** no Painel com regularidade e guarda o ficheiro no Drive ou no e-mail. Abre direto no Excel.

## Atualizar a app

Ao alterar ficheiros, muda `VERSAO` no topo do `sw.js` (ex.: `v1` para `v2`) e envia de novo para o GitHub. A app atualiza ao ser reaberta.

## Estrutura

```
index.html              página principal
manifest.webmanifest    instalação (nome, ícones, cores)
sw.js                   offline + notificações
css/app.css             estilos
js/config.js            planos, comissões, status, prazos  ← mudar valores aqui
js/store.js             armazenamento local (trocar aqui para sincronizar com a nuvem)
js/calculos.js          totais, comissões e datas
js/lembretes.js         notificações e ficheiro de calendário
js/exportar.js          CSV
js/views.js             telas
js/app.js               navegação e botões
icons/                  ícones da app
```

Para testar no computador: `python3 -m http.server` dentro da pasta e abrir `http://localhost:8000`.
