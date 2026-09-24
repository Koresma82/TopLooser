# Guia de arranque — três ambientes, do zero até produção

Montagem com os ramos **`dev`**, **`test`** e **`main`**, cada um com o seu projeto
Firebase e o seu endereço no Netlify.

| Ramo   | Modo do build | Ficheiro local | Projeto Firebase  | Endereço                            |
|--------|---------------|----------------|-------------------|-------------------------------------|
| `dev`  | `dev`         | `.env.dev`     | `toplooser-test`  | `dev--toplooser.netlify.app`        |
| `test` | `test`        | `.env.test`    | `toplooser-test`  | `test--toplooser.netlify.app`       |
| `main` | `prod`        | `.env.prod`    | `toplooser-prod`  | `toplooser.netlify.app`             |

Um site Netlify só, com deploys por ramo. **Dois** projetos Firebase: o `dev` e o
`test` partilham a mesma base de dados, o `main` tem a sua. O que separa mesmo é o
que interessa — os dados reais do desafio nunca são tocados por experiências.

> A etiqueta do ambiente que aparece no cabeçalho (`dev`, `test`) é derivada do modo
> com que se constrói. Não há `VITE_AMBIENTE` para definir em lado nenhum, e não pode
> dizer uma coisa enquanto o build é outra. Em `prod` não aparece etiqueta.

Tempo estimado: hora e meia, quase toda à espera do Firebase (são três projetos).

---

## Parte 1 — Confirmar que arranca (5 min)

```bash
cd toplooser
npm install
npm run dev
```

<http://localhost:5173> mostra o ecrã a dizer que falta configurar o Firebase. É o
esperado — ainda não há credenciais. Precisas de **Node 20+** (`node -v`).

---

## Parte 2 — Os dois projetos Firebase (30 min)

Repete isto **duas vezes**, para `toplooser-test` e `toplooser-prod`. Começa pelo de
teste, que é contra o qual vais trabalhar.

### 2.1 Criar

<https://console.firebase.google.com> → **Adicionar projeto** → nome
`toplooser-test` → desliga o Google Analytics.

### 2.2 Ligar os serviços

No menu da esquerda:

- **Authentication** → Começar → **Sign-in method** → **Google** → ativar, escolher
  email de suporte, gravar.
- **Firestore Database** → Criar → **Iniciar em modo de produção** → localização
  **eur3 (europe-west)**.
- **Storage** → Começar → mesma localização.

> Modo de produção é o certo: as regras do projeto substituem as predefinidas no
> passo 2.5. E o Storage pode pedir o plano Blaze (cartão associado) — com este
> volume ficas dentro do nível gratuito.

### 2.3 Registar a app web

**Definições do projeto** (roda dentada) → fundo da página → ícone **`</>`** →
alcunha `TopLooser` → **não** marcar Firebase Hosting (quem serve é o Netlify).

Copia o `firebaseConfig` que aparece.

### 2.4 Preencher o ficheiro do ambiente

Do `toplooser-test` para o `.env.test` — **e os mesmos valores no `.env.dev`**, que
partilha o projeto:

```
VITE_FB_API_KEY=AIza...
VITE_FB_AUTH_DOMAIN=toplooser-test.firebaseapp.com
VITE_FB_PROJECT_ID=toplooser-test
VITE_FB_STORAGE_BUCKET=toplooser-test.firebasestorage.app
VITE_FB_MESSAGING_SENDER_ID=123456789
VITE_FB_APP_ID=1:123456789:web:abc123

VITE_ADMIN_EMAIL=koresma@gmail.com
```

E os valores do `toplooser-prod` no `.env.prod`.

> Confere o `VITE_FB_STORAGE_BUCKET`. Projetos recentes usam `.firebasestorage.app`,
> antigos `.appspot.com`. Copia exatamente o que o Firebase deu — errado aqui, os
> uploads falham sem dizer porquê.

### 2.5 Publicar as regras nos três

```bash
npm i -g firebase-tools
firebase login
```

Põe os ids verdadeiros no `.firebaserc`:

```json
{
  "projects": {
    "default": "toplooser-test",
    "test": "toplooser-test",
    "prod": "toplooser-prod"
  }
}
```

E publica nos dois:

```bash
npm run regras:todos
```

(ou `npm run regras:test` e `npm run regras:prod`, um a um)

**Sem isto não há leituras nem escritas.** Vai também o índice de grupo de coleções
que a app precisa para saber em que eventos cada pessoa está inscrita.

### 2.6 Testar

```bash
npm run dev
```

Entra com a tua conta Google. Como o teu email é o `VITE_ADMIN_EMAIL`, deves ver
**Criar evento**. No canto superior esquerdo, ao lado do logótipo, deve aparecer a
etiqueta **`dev`**.

Cria um desafio, inscreve-te, regista uma pesagem à mão.

Para experimentar contra o ambiente de teste sem mudar de ramo:

```bash
npm run dev:test
```

---

## Parte 3 — Leitura do talão com IA (10 min)

Podes saltar e voltar depois: sem chave, a app guarda a foto na mesma e os valores
escrevem-se à mão.

### 3.1 A chave

Já tens da **Anthropic** — serve. (<https://console.anthropic.com> → API keys.)
Em alternativa, Google AI Studio. Basta uma; com as duas, a da Anthropic é a usada.

### 3.2 Local

Um ficheiro `.env` **na raiz** (já está no `.gitignore`):

```
ANTHROPIC_API_KEY=sk-ant-...
ANTHROPIC_MODELO=claude-haiku-4-5-20251001
```

> **Não** leva prefixo `VITE_`. Tudo o que começa por `VITE_` é embutido no
> JavaScript que vai para o browser — a chave ficaria à vista de quem abrisse o
> código-fonte da página.

Este `.env` é único e serve os três ambientes locais: a chave da IA não tem nada que
ver com o projeto Firebase.

### 3.3 Correr com as funções

O `npm run dev` só corre o Vite, que não serve funções:

```bash
npm i -g netlify-cli
npm run dev:funcoes
```

Abre <http://localhost:8888> — **este porto, não o 5173**. O 8888 é o que tem as
funções à frente do Vite.

---

## Parte 4 — Git, com os três ramos (10 min)

```bash
cd toplooser
git init -b main
git add .
git commit -m "TopLooser: versão inicial"
```

Confirma que **nenhum `.env` entrou**:

```powershell
git ls-files | Select-String "\.env"
```

Só deve aparecer `.env.example`. Se aparecer outro, corrige o `.gitignore` antes do
push — uma chave que chega ao GitHub tem de ser revogada.

Repositório **privado** em <https://github.com/new>, nome `toplooser`, sem README nem
.gitignore. Depois:

```bash
git remote add origin https://github.com/Koresma82/toplooser.git
git push -u origin main

git switch -c test
git push -u origin test

git switch -c dev
git push -u origin dev
```

Ficas em `dev`, que é onde se trabalha.

### O fluxo depois

```bash
# trabalhar
git switch dev
# ... alterações ...
git add .
git commit -m "o que mudou"
git push

# quando estiver pronto para testar a sério
git switch test
git merge dev
git push

# quando estiver validado
git switch main
git merge test
git push
```

Cada push publica no ambiente do ramo respetivo, sozinho.

---

## Parte 5 — Netlify, um site com três contextos (20 min)

### 5.1 Criar o site

<https://app.netlify.com> → **Add new site** → **Import an existing project** →
**GitHub** → escolher `toplooser`.

Em **Branch to deploy**, escolhe **`main`**. O resto vem do `netlify.toml`:

| Campo | Valor |
|---|---|
| Build command | `npm run build` |
| Publish directory | `dist` |
| Functions directory | `netlify/functions` |

Não faças deploy ainda.

Muda o nome do site em **Site configuration → Site details → Change site name** para
`toplooser`, porque os endereços dos ramos derivam dele.

### 5.2 Ligar os deploys por ramo

Por omissão o Netlify só publica o ramo de produção. Para os outros dois:

**Site configuration → Build & deploy → Branches and deploy contexts → Configure**

- **Production branch**: `main`
- **Branch deploys**: escolhe **Let me add individual branches** e acrescenta `dev`
  e `test`.

O `netlify.toml` já manda cada um construir com o seu modo:

```toml
[context.production]  command = "npm run build"       # main -> modo prod
[context.test]        command = "npm run build:test"  # test -> modo test
[context.dev]         command = "npm run build:dev"   # dev  -> modo dev
```

Os nomes `[context.dev]` e `[context.test]` correspondem aos ramos com esses nomes.

### 5.3 Variáveis, com valor por contexto

É aqui que está o trabalho todo, e é aqui que se engana.

**Site configuration → Environment variables → Add a variable → Add a single
variable**. Em cada uma escolhe **Different value for each deploy context** e
preenche:

| Contexto | Valor |
|---|---|
| **Production** | o do `toplooser-prod` |
| **Branch deploys → `test`** | o do `toplooser-test` |
| **Branch deploys → `dev`** | o do `toplooser-test` (o mesmo) |
| **Deploy Previews** | o do `toplooser-test` |

Assim para as seis do Firebase:

```
VITE_FB_API_KEY
VITE_FB_AUTH_DOMAIN
VITE_FB_PROJECT_ID
VITE_FB_STORAGE_BUCKET
VITE_FB_MESSAGING_SENDER_ID
VITE_FB_APP_ID
```

E com o mesmo valor em todos os contextos:

```
VITE_ADMIN_EMAIL        koresma@gmail.com
ANTHROPIC_API_KEY       sk-ant-...
ANTHROPIC_MODELO        claude-haiku-4-5-20251001
```

Não há `VITE_AMBIENTE` — vem do modo do build.

> Os ficheiros `.env.*` não vão no Git. Se estas variáveis não estiverem aqui, o
> site constrói à mesma e mostra o aviso de configuração em falta.

### 5.4 Deploy dos três

**Deploys → Trigger deploy → Deploy site** publica o `main`. Os outros dois saem no
próximo push para `dev` e `test` — ou força-os já com um commit vazio:

```bash
git switch dev && git commit --allow-empty -m "primeiro deploy" && git push
git switch test && git commit --allow-empty -m "primeiro deploy" && git push
```

Ficas com:

- `https://toplooser.netlify.app`
- `https://test--toplooser.netlify.app`
- `https://dev--toplooser.netlify.app`

### 5.5 O passo que toda a gente se esquece — e aqui são três

Cada projeto Firebase só aceita login dos domínios que conhece. Em **cada um dos
três**, vai a **Authentication → Settings → Authorized domains → Add domain**:

| Projeto Firebase | Domínios a acrescentar |
|---|---|
| `toplooser-prod` | `toplooser.netlify.app` |
| `toplooser-test` | `test--toplooser.netlify.app` **e** `dev--toplooser.netlify.app` |

O projeto de teste leva os dois domínios, por servir os dois ramos.

**Sem isto o login com Google é recusado**, com tudo o resto bem configurado. É o
erro mais comum desta montagem.

`localhost` já lá está de origem, por isso o desenvolvimento local não precisa de
nada.

### 5.6 Confirmar

Em `dev--toplooser.netlify.app`:

1. Entrar com o Google.
2. Ver a etiqueta **`dev`** no cabeçalho.
3. Criar um evento, inscrever-te, registar uma pesagem com foto do talão — é isto que
   prova que a função e a chave da IA estão bem.

Repete em `test--` — vais ver os mesmos dados, porque partilham o projeto Firebase.
Em produção, confirma que **não** aparece etiqueta nenhuma e que os eventos de teste
não estão lá. Se estiverem, alguma variável do contexto de produção ficou a apontar
ao projeto de teste.

---

## Quando mexeres nas regras

As regras do Firestore e do Storage **não vão com o push** — o Netlify não sabe do
Firebase. Publica à mão, no projeto certo:

```bash
npm run regras:test    # afeta os ramos dev e test
npm run regras:prod    # só depois de validado
```

---

## Quando alguma coisa corre mal

| Sintoma | Causa quase certa |
|---|---|
| Ecrã "Falta configurar o Firebase" | Variáveis `VITE_*` em falta nesse contexto do Netlify. Confirma que preencheste o contexto do ramo, e não só o de produção. |
| `auth/unauthorized-domain` | Falta o domínio desse ramo nos Authorized domains **desse** projeto Firebase (passo 5.5). |
| `Missing or insufficient permissions` | Regras não publicadas nesse projeto. Corre o `npm run regras:<ambiente>`. |
| Dados de teste aparecem em produção | Alguma variável `VITE_FB_*` ficou com o valor do projeto de teste no contexto de produção. |
| Dados iguais em `dev` e `test` | É de propósito: partilham o `toplooser-test`. |
| Lista de eventos vazia e a consola fala em índice | O `firebase deploy` desse projeto não correu, ou correu com erro. |
| Não aparece "Criar evento" | O email com que entraste não é o `VITE_ADMIN_EMAIL`. Confirma também `firestore.rules`, onde está escrito. |
| Etiqueta errada no cabeçalho | O ramo está a construir com o modo errado. Confirma os `[context.*]` do `netlify.toml`. |
| Upload de fotos falha | `VITE_FB_STORAGE_BUCKET` errado, ou Storage não ativado nesse projeto. |
| "A leitura automática não está disponível neste ambiente" | Estás no porto 5173 em vez do 8888, ou falta a chave da API. |
| "A chave da API foi recusada" | Chave errada, revogada, ou conta sem saldo. |
| A leitura falha só em produção | A chave não foi definida nesse contexto, ou foi definida com prefixo `VITE_`. |
