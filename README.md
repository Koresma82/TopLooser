# TopLooser

Aplicação para acompanhar desafios de perda de peso entre amigos: cada participante
regista as pesagens (foto do talão da farmácia ou à mão), a app faz as contas e, na
data final, revela os vencedores de cada categoria.

React + Vite + Firebase (Auth, Firestore, Storage) + Netlify. Interface em português.

> **Primeira vez?** Segue o [`GUIA.md`](GUIA.md) — tem a sequência ordenada, do
> `npm install` até ao site em produção. Este README é a referência; o guia é a ordem.

---

## O que a app faz

- **Eventos** criados só pelo administrador (`koresma@gmail.com`), com data de início,
  data final, categorias a acompanhar e critério de vitória.
- **Entrada com conta Google.** Qualquer pessoa autenticada vê a lista de eventos e
  pode inscrever-se enquanto as inscrições estiverem abertas — **mesmo depois de o
  desafio já ter começado**.
- **Cor por participante.** Cada inscrito escolhe uma cor; as cores já usadas por
  outros aparecem bloqueadas. É por ela que se identifica nos gráficos e nas tabelas.
- **Pesagens com leitura automática do talão.** Fotografa-se o talão da balança e a
  app lê os campos todos com IA — peso, altura, índice de gordura, massa de gordura,
  massa sem gordura, IMC e a **data e hora da pesagem** — e pré-preenche o formulário.
  Os campos lidos ficam marcados com um selo `IA`; o que o talão não tiver preenche-se
  à mão. Nada é gravado sem passar pela confirmação de quem regista.
- **Estatísticas e gráficos** filtráveis por categoria (peso, IMC, massa gorda em % e
  em kg, massa magra em % e em kg, água, gordura visceral, perímetro abdominal) e por
  vista (valor medido ou variação desde o início).
- **Classificação provisória** durante o desafio, por percentagem ou por valor absoluto.
- **Quem vai em primeiro ao dia de hoje**, numa faixa no topo da página de evolução. Como
  os registos são lidos em tempo real, muda sozinha assim que alguém regista uma pesagem.
- **Vencedor do mês**, mês a mês, que pode mudar de dono todos os meses. Conta a
  diferença entre a última pesagem do mês anterior e a última do próprio mês — assim
  quem só se pesa uma vez por mês também entra. O mês em curso aparece como provisório.
- **Galeria** partilhada entre os participantes do evento.
- **Documentos**: o contrato assinado, o regulamento — PDF ou foto.
- **Pódio** revelado na data final, categoria a categoria: primeiro, segundo e terceiro,
  com a primeira e a última pesagem do vencedor lado a lado (e a foto do talão de cada
  uma, se existir).

### Quem vê o quê

| | Espectador | Participante | Admin |
|---|---|---|---|
| Lista de eventos | sim | sim | sim |
| Gráficos de evolução e classificação | sim | sim | sim |
| Pesagens com foto do talão, notas | não | sim | sim |
| Galeria e documentos | não | sim | sim |
| Registar as suas pesagens | não | sim | sim |
| Inscrever-se (com inscrições abertas) | sim | — | sim |
| Abrir e fechar inscrições | não | não | sim |
| Remover participantes | não | não | sim |
| Criar / editar / apagar eventos | não | não | sim |
| Apagar registos e fotos de outros | não | não | sim |
| Ver estatísticas de utilização | não | não | sim |
| Ver o registo de auditoria | não | não | sim |

**Espectador** é qualquer pessoa autenticada que não esteja inscrita no evento: vê os
números e os gráficos, não escreve nada e não vê as fotos nem os documentos.

O administrador é definido pelo email em `VITE_ADMIN_EMAIL` **e** está escrito nas
regras do Firestore e do Storage. Para mudar de administrador é preciso alterar os dois.

---

## Instalação

```bash
npm install
```

### 1. Projetos Firebase

Cria um projeto por ambiente (ou só um, se preferires começar simples):
`toplooser-test` e `toplooser-prod`. Os ramos `dev` e `test` partilham o de teste.

Em cada um:

1. **Authentication → Sign-in method → Google**: ativar.
2. **Authentication → Settings → Authorized domains**: juntar o domínio do Netlify
   (e `localhost` já lá está).
3. **Firestore Database**: criar em modo de produção, região `europe-west1`.
4. **Storage**: criar, mesma região.
5. **Project settings → Your apps → Web**: registar uma app e copiar as credenciais.

### 2. Variáveis de ambiente

Um ficheiro por ambiente, com o nome do modo do build. Vêm por preencher e estão no
`.gitignore`, para não irem parar ao GitHub:

| Ramo | Modo | Ficheiro | Projeto Firebase |
|---|---|---|---|
| `dev` | `dev` | `.env.dev` | `toplooser-test` (partilhado) |
| `test` | `test` | `.env.test` | `toplooser-test` |
| `main` | `prod` | `.env.prod` | `toplooser-prod` |


```
VITE_FB_API_KEY=...
VITE_FB_AUTH_DOMAIN=toplooser-test.firebaseapp.com
VITE_FB_PROJECT_ID=toplooser-test
VITE_FB_STORAGE_BUCKET=toplooser-test.firebasestorage.app
VITE_FB_MESSAGING_SENDER_ID=...
VITE_FB_APP_ID=...

VITE_ADMIN_EMAIL=koresma@gmail.com
```

A etiqueta do ambiente no cabeçalho vem do modo com que se constrói, não de uma
variável. Não há `VITE_AMBIENTE` para definir.

Se faltar a configuração, a app arranca na mesma e mostra um aviso a dizer o que falta.

### 3. Leitura do talão com IA

A leitura corre numa função serverless (`netlify/functions/ler-talao.js`) e não no
browser — é essa a única forma de a chave da API não ficar exposta a quem abrir o
código-fonte da página.

Serve uma chave da **Anthropic** ou do **Google AI Studio** — basta uma. Com as duas
definidas, a da Anthropic é a usada; `FORNECEDOR_TALAO` força uma delas.

No Netlify, em **Site settings → Environment variables**:

```
ANTHROPIC_API_KEY=sk-ant-...
ANTHROPIC_MODELO=claude-haiku-4-5-20251001   # opcional
```

ou

```
GEMINI_API_KEY=a-tua-chave
GEMINI_MODELO=gemini-2.0-flash               # opcional
```

> Repara que estas **não** levam o prefixo `VITE_`. Tudo o que começa por `VITE_` é
> embutido no JavaScript que vai para o browser. A chave nunca pode ir por aí.

Para testar localmente precisas do Netlify CLI, porque o `vite` sozinho não serve
funções:

```bash
npm i -g netlify-cli
npm run dev:funcoes        # netlify dev
```

Põe a chave num ficheiro `.env` na raiz (já está no `.gitignore`). Com `npm run dev`
normal a app funciona à mesma — só a leitura automática é que fica indisponível, e o
formulário diz isso mesmo em vez de rebentar.

**Se não quiseres usar IA de todo**, não definas a chave: o botão da foto continua a
funcionar, a imagem é guardada como comprovativo e os valores escrevem-se à mão.

### 4. Regras de segurança

Em `.firebaserc` troca os ids dos projetos pelos teus e publica as regras:

```bash
npm run regras:todos
```

(ou `npm run regras:test` e `npm run regras:prod`, um a um)

Isto publica `firestore.rules`, `firestore.indexes.json` e `storage.rules`.

> O `firestore.indexes.json` traz o índice de grupo de coleções em `participantes.uid`,
> necessário para a app saber em que eventos cada pessoa está inscrita.

### 5. Arrancar

```bash
npm run dev          # modo dev, sem leitura do talão
npm run dev:funcoes  # modo dev com a função de leitura, via netlify dev (porto 8888)
npm run dev:test     # modo test, contra o projeto de teste
```

---

## Netlify

| Ramo | Comando | Modo | Endereço |
|---|---|---|---|
| `main` | `npm run build` | `prod` | `toplooser.netlify.app` |
| `test` | `npm run build:test` | `test` | `test--toplooser.netlify.app` |
| `dev` | `npm run build:dev` | `dev` | `dev--toplooser.netlify.app` |
| deploy previews | `npm run build:dev` | `dev` | endereço próprio por PR |

Os deploys por ramo têm de ser ligados em **Build & deploy → Branches and deploy
contexts**; por omissão o Netlify só publica o ramo de produção.

O `netlify.toml` já tem isto configurado, além do redirect de SPA (todas as rotas para
`index.html`) e dos cabeçalhos de cache.

As variáveis `VITE_*` têm de ser definidas em **Site configuration → Environment
variables**, com **valor diferente por contexto** — cada ramo aponta ao seu projeto
Firebase. Não basta terem ficado nos ficheiros `.env`,
que não são committados. O mesmo para a `GEMINI_API_KEY`, que é lida do lado do servidor.

A função de leitura é publicada automaticamente a partir de `netlify/functions/` e fica
em `/.netlify/functions/ler-talao`.

Depois do primeiro deploy, junta o domínio do Netlify aos **Authorized domains** do
Firebase Authentication, senão o login com Google é recusado.

---

## Estrutura

```
netlify/functions/
  ler-talao.js               leitura do talão com IA (corre no servidor, guarda a chave)

public/marca/                peças da marca, recortadas da folha de identidade
  icone-app-512/192/180.png  ícone da aplicação (telemóvel, ecrã de entrada)
  favicon-64/32.png          versão compacta, sem o nome
  logotipo.png               o nome em branco e verde, para o cabeçalho
  icone-*.png                troféu, gráfico, balança, calendário, grupo e chama

src/
  firebase/config.js         ligação ao Firebase e leitura das variáveis de ambiente
  lib/marca.js               caminhos das peças da marca
  lib/ocr.js                 redimensiona a foto, chama a função e valida o que volta
  contexts/AuthContext.jsx   login Google, perfil, deteção de administrador
  contexts/ToastContext.jsx  avisos no canto do ecrã
  hooks/useEventos.js        leitura em tempo real de eventos e subcoleções
  lib/categorias.js          catálogo de categorias (peso, IMC, massa gorda, …)
  lib/calculos.js            IMC, séries, variações, classificação, vencedores
  lib/cores.js               paleta dos participantes, traços e formas
  lib/formato.js             datas e números em português
  lib/servicos.js            escritas no Firestore e no Storage
  pages/                     Entrar, Eventos, EventoDetalhe, Admin
  components/evento/         separadores do evento, gráficos e modais
```

### Modelo de dados

```
utilizadores/{uid}
  uid, nome, email, fotoURL

eventos/{eventoId}
  nome, descricao, dataInicio, dataFim, categorias[], modoRanking,
  inscricoesAbertas, estado, premio, criadoPor

  participantes/{uid}
    uid, nome, email, fotoURL, cor, alturaCm, entrouEm

  utilizadores/{uid}            <- cada um vê o seu; o admin vê todos
    uid, nome, email, fotoURL,
    entradas, primeiraEntrada, ultimaEntrada, ultimaVisita,
    ultimaAutenticacao (para não contar recarregamentos como entradas)

  auditoria/{id}                <- só o admin lê; ninguém altera nem apaga
    uid, email, nome, acao, detalhe, dia, quando, eventoId

  registos/{registoId}          <- leitura aberta a qualquer autenticado
    uid, data, valores{peso, imc, massaGorda, …}, alturaCm,
    origem ('manual' | 'talao' | 'talao-ia'), temAnexo

  anexos/{registoId}            <- só participantes e admin; mesmo id do registo
    uid, notas, ficheiroURL, ficheiroPath,
    leituraIA{modelo, confianca, farmacia, hora, campos[]}

  galeria/{fotoId}
    uid, nome, legenda, ficheiroURL, ficheiroPath

  documentos/{docId}
    uid, nome, titulo, tipo, tamanho, ficheiroURL, ficheiroPath
```

As datas (`dataInicio`, `dataFim`, `data`) são texto `AAAA-MM-DD`, o que evita
problemas de fuso horário e mantém a ordenação correta.

---

## Notas de implementação

**A leitura do talão nunca grava sozinha.** Os valores lidos são pré-preenchidos no
formulário e marcados com o selo `IA`; quem regista confirma ou corrige antes de
gravar. Assim que um campo é editado à mão, perde a marca.

Há três travões, porque um modelo pode enganar-se:

1. As instruções dizem-lhe explicitamente para ignorar as linhas de referência do
   talão ("Peso normal entre: 56,7 kg-76,3 kg", "índice normal gordura...17-23 %"),
   que não são medições. O formato da resposta é imposto — pela definição de uma
   ferramenta, no caso da Anthropic, ou por um esquema de resposta, no do Gemini —
   por isso o que volta nunca é texto solto a ter de ser interpretado.
2. Tudo o que volta passa por `normalizarLeitura` em `src/lib/ocr.js`, que descarta
   qualquer valor fora dos limites da categoria e qualquer data no futuro ou com mais
   de cinco anos. O que for descartado é listado no ecrã em vez de ser preenchido às
   escondidas.
3. Se a altura do talão não bater certo com a da ficha, a app avisa e oferece
   atualizar — não muda nada por iniciativa própria.

A foto é reduzida para 1600 px no browser antes de ser enviada, para a chamada ser
rápida e ficar dentro do limite de tamanho da função.

Fica gravado em cada registo qual o modelo usado, a confiança da leitura e que campos
vieram da IA — dá jeito se houver discussão sobre um valor no fim do desafio.

**Identificação nos gráficos.** Cada participante tem cor, tipo de traço e forma de
ponto próprios, e o nome aparece no fim da linha. Isto garante que se distinguem
mesmo quando duas pessoas escolhem cores parecidas ou quando alguém não distingue
bem as cores.

**Regras do Storage.** As regras do Storage não conseguem consultar o Firestore, por
isso não validam a inscrição no evento: a leitura está limitada a utilizadores
autenticados e a escrita à pasta do próprio utilizador. Para um grupo de amigos
chega bem; se um dia for preciso apertar, o caminho é passar por Cloud Functions ou
por custom claims.

**As peças da marca** foram recortadas da folha de identidade original e estão em
`public/marca/`. O ícone da aplicação e o favicon levaram uma máscara de cantos
redondos, senão apareceriam com quatro cantos brancos sobre fundo escuro. Os seis
ícones temáticos têm fundo transparente à volta do mosaico. Tudo somado, pesam cerca
de 84 KB.

O nome escrito no cabeçalho é a versão **branca e verde** que está dentro do ícone da
aplicação, e não a versão azul-escura da folha — essa seria ilegível sobre o fundo
escuro da interface.

**Vencedor do mês vs. vencedor do desafio.** São dois apuramentos independentes: o do
desafio compara a primeira pesagem com a última de todo o período; o mensal compara a
última pesagem do mês anterior com a última do próprio mês. O ponto de partida do mês
vem de trás de propósito — exigir duas pesagens dentro do mesmo mês deixava de fora
quem só vai à farmácia uma vez por mês. O primeiro mês do desafio não tem vencedor,
por não haver mês anterior com que comparar.

**Porque é que a pesagem está em dois documentos.** Os espectadores precisam de ler os
números para os gráficos funcionarem, mas não devem ver a foto do talão nem as notas.
O Firestore não tem regras ao nível do campo — quem pode ler um documento lê-o
inteiro — por isso os números ficam em `registos/{id}` (leitura aberta a quem tem
conta) e tudo o resto em `anexos/{id}` (só para quem está no evento). Têm o mesmo id e
a app junta-os em `useEvento`. Para um espectador os anexos vêm vazios, e o endereço
da foto nunca chega ao browser dele.

**Tudo o que se vê é em tempo real.** Todas as leituras usam `onSnapshot`, que é uma
escuta do Firestore e não uma leitura pontual: quando alguém regista uma pesagem, os
gráficos, a classificação e o líder do dia mudam sozinhos nos ecrãs de toda a gente,
sem ninguém ter de recarregar a página.

**Como se contam as entradas.** O `onAuthStateChanged` dispara em cada carregamento
da página, mesmo com a sessão já aberta — contar aí inflava o número a cada F5. O
Firebase diz quando foi a última autenticação de verdade
(`metadata.lastSignInTime`), e só se conta quando esse instante muda. Uma entrada é
uma autenticação nova, não uma visita.

**O que o registo de auditoria é, e o que não é.** É escrito pelo browser de cada
pessoa. As regras impedem escrever em nome de outro, alterar ou apagar — é só de
acrescentar — mas nada obriga o browser a escrever. Serve para acompanhar a
atividade do grupo, não para provar nada contra quem queira enganar o sistema. Para
isso seria preciso escrever do lado do servidor, com uma conta de serviço e uma
função que reagisse aos eventos de autenticação.

**Sair do evento** apaga os registos, anexos, fotos e documentos dessa pessoa nesse
evento.
A operação é feita a partir do cliente, documento a documento, o que serve para os
volumes desta app.
