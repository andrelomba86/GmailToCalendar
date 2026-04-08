# Gmail To Calendar

Extensao Chrome Manifest V3 para detectar prazos em emails do Gmail e criar eventos em uma agenda especifica do Google Calendar.

## Estado atual

Esta primeira implementacao entrega:

- pagina de opcoes com autenticacao Google e selecao de agenda fixa
- service worker com integracao basica na Google Calendar API
- content script no Gmail com botao manual para analisar o email aberto
- parser inicial para datas explicitas em portugues e expressoes simples como amanha, proxima semana e ate sexta
- painel de revisao com selecao dos prazos antes da criacao dos eventos

## Configuracao OAuth

Para nao versionar o `client_id` real, este repositorio deve manter apenas [manifest.example.json](manifest.example.json) com placeholder e deixar [manifest.json](manifest.json) fora do Git.

Fluxo recomendado:

1. Copie [manifest.example.json](manifest.example.json) para `manifest.json` localmente.
2. Preencha o `client_id` real no seu `manifest.json` local.
3. Carregue a extensao no Chrome usando esse arquivo local, que fica ignorado pelo Git.

Escopo necessario:

- `https://www.googleapis.com/auth/calendar`

### Como criar o Client ID OAuth

1. Acesse o Google Cloud Console: `https://console.cloud.google.com/`.
2. Crie um projeto novo ou selecione um projeto existente para a extensao.
3. No menu lateral, abra `APIs e servicos` > `Biblioteca`.
4. Procure por `Google Calendar API` e clique em `Ativar`.
5. Volte para `APIs e servicos` > `Tela de consentimento OAuth`.
6. Escolha o tipo de usuario:
   - `Externo`, se for testar com contas Google comuns.
   - `Interno`, se sua conta estiver em um Google Workspace e isso fizer sentido para seu ambiente.
7. Preencha o basico da tela de consentimento, pelo menos:
   - nome do app
   - email de suporte
   - email do desenvolvedor
8. Em `Escopos`, adicione o escopo do Calendar usado pela extensao:
   - `https://www.googleapis.com/auth/calendar`
9. Em `Usuarios de teste`, adicione as contas Google que vao usar a extensao enquanto o app estiver em teste.
10. Abra `APIs e servicos` > `Credenciais`.
11. Clique em `Criar credenciais` > `ID do cliente OAuth`.
12. Selecione o tipo `Extensao do Chrome`.
13. Preencha:
    - nome da credencial, por exemplo `Gmail To Calendar Dev`
    - `Application ID` da extensao Chrome (ver abaixo)

### Como obter o Application ID da extensao

O Google pede o ID da extensao para criar uma credencial do tipo `Extensao do Chrome`. Para obter esse valor:

1. Abra `chrome://extensions`.
2. Ative `Modo do desenvolvedor`.
3. Use `Carregar sem compactacao` e selecione esta pasta do projeto.
4. O Chrome vai exibir o ID da extensao no card da extensao carregada.
5. Copie esse valor e volte ao Google Cloud Console para concluir a criacao da credencial.

### Onde colocar o client_id

Depois que o Google Cloud gerar a credencial, copie o `Client ID` para o seu [manifest.json](manifest.json) local. O arquivo versionado de referencia e [manifest.example.json](manifest.example.json):

```json
"oauth2": {
  "client_id": "YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com",
  "scopes": ["https://www.googleapis.com/auth/calendar"]
}
```

### Observacoes importantes

- Enquanto a tela de consentimento estiver em modo de teste, apenas os usuarios listados em `Usuarios de teste` poderao autenticar.
- Se voce remover e recarregar a extensao, o `Application ID` pode mudar se o empacotamento nao estiver estabilizado com chave propria. Para desenvolvimento local isso costuma ser aceitavel, mas se o ID mudar voce precisa atualizar a credencial no Google Cloud.
- Se o login falhar mesmo com o `client_id` correto, verifique se a `Google Calendar API` esta ativada no mesmo projeto do OAuth.
- Esta extensao usa o fluxo OAuth nativo do Chrome via permissao `identity`, entao o `client_id` precisa ser da categoria `Extensao do Chrome`, nao `Aplicativo da Web`.

## Como testar localmente

1. Abra o Chrome em `chrome://extensions`.
2. Ative o modo de desenvolvedor.
3. Se ainda nao existir, crie `manifest.json` local a partir de [manifest.example.json](manifest.example.json).
4. Clique em `Carregar sem compactacao` e selecione esta pasta.
5. Abra as opcoes da extensao.
6. Faça login com Google e selecione a agenda fixa.
7. Abra um email no Gmail e clique em `Detectar prazos e enviar para agenda`.

## Scripts

- `npm run check`: valida a sintaxe dos arquivos JavaScript principais.

## Limitacoes atuais

- o parser ainda nao cobre linguagem natural complexa
- a injecao no Gmail usa seletores defensivos, mas pode precisar ajuste conforme mudancas de DOM do Gmail
- a extensao depende de configurar manualmente o `manifest.json` local antes do primeiro uso
