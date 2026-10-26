# Ritmo

Aplicativo de acompanhamento de peso para Android e web, em React, TypeScript, Tailwind e Capacitor. Interface em português, responsiva e sem dados fictícios.

## Executar

```sh
npm install
npm run dev
npm test
npm run build
```

O aplicativo exige uma conta com e-mail confirmado antes de abrir o painel. A sessão é validada no Supabase ao entrar; sem conexão não é possível validar o acesso. Depois da autenticação, os registros são mantidos localmente por ID de usuário. Abra Perfil e conexões e atualize os valores iniciais antes de interpretar as estimativas. Dados locais ficam no localStorage deste dispositivo (não é armazenamento criptografado); exporte um backup antes de limpar os dados do app. Não use aparelhos compartilhados para armazenar dados sensíveis.

## Funcionalidades

- Perfil adulto, peso diário (um por data), pressão e exercícios com tipo, duração e intensidade.
- Gráficos de peso por período e atividade nos últimos sete dias.
- Estimativa basal Mifflin–St Jeor, gasto diário por fator de atividade e cenário estático de prazo.
- Meta, exportação/importação JSON com validação e exclusão local.
- Login Supabase por e-mail/senha e backup manual por usuário, protegido por RLS.
- Assistente Gemini via Edge Function autenticada; apenas resumo numérico e pergunta são enviados.

O gasto diário já inclui o fator de atividade. Exercícios não são somados outra vez. O cenário usa 7.700 kcal/kg com gasto constante e NÃO modela adaptação metabólica nem garante uma data. Não há prescrição alimentar ou diagnóstico. As estimativas não são apropriadas para menores, gestantes ou situações clínicas sem avaliação profissional.

## Supabase

1. Crie um projeto e aplique `supabase/migrations/202610260001_health.sql` no SQL Editor (uma vez) ou por migrations da CLI.
2. Copie `.env.example` para `.env`, informe URL e chave pública/anon. Nunca inclua service-role ou chave Gemini no frontend.
3. Use Criar conta na tela inicial; o aplicativo oferece cadastro, confirmação de e-mail e recuperação por código (configure os templates e SMTP abaixo).
4. Reinicie o Vite. Entre pelo perfil. O backup é manual: Salvar na conta substitui a cópia remota; Carregar da conta substitui os dados locais após confirmação.
5. Sair da conta mantém os dados locais. Apague-os pelo perfil se necessário. A exclusão local não remove a cópia remota; remova o usuário no Supabase para excluir sua cópia em cascata.

## Gemini

Configure uma versão de modelo disponível em sua conta conforme a documentação oficial e publique a função:

```sh
supabase login
supabase link --project-ref SEU_PROJECT_REF
supabase secrets set GEMINI_API_KEY=SUA_CHAVE GEMINI_MODEL=SEU_MODELO
supabase functions deploy coach
```

A função valida o usuário com Supabase Auth, limita o tamanho da pergunta e evita enviar nome e pressão ao Gemini. Antes de abrir ao público, acrescente quotas por usuário, política de privacidade, consentimentos e monitoração de custos. Integrações externas não foram validadas com contas reais nesta entrega.

## Android

```sh
npm run android:sync
npm run android:open
```

O diretório `android` é o projeto nativo do Capacitor. Caso ainda não exista, execute `npx cap add android` após o build. Android Studio e o SDK Android são necessários para compilar/assinar o APK ou AAB. Não há APK assinado nem publicação na Play Store nesta entrega. Backup em nuvem requer internet.

## Próximas etapas

- Strava: ainda NÃO implementado. Registrar aplicação, OAuth com callback validado, tokens somente no backend, atualização de tokens, webhooks, deduplicação e revisão dos termos e limites antes de implementar. Não enviar dados do Strava ao Gemini sem verificar permissões e regras aplicáveis.
- Quotas do assistente e sincronização automática com resolução de conflitos.
- Gráficos de pressão, relatórios PDF e projeção dinâmica validada.
- Auditoria de acessibilidade, armazenamento seguro e testes em dispositivos reais antes de distribuição.

## Referências

- Capacitor: https://capacitorjs.com/docs
- Equação Mifflin–St Jeor: https://pubmed.ncbi.nlm.nih.gov/2305711/
- Limites de projeções de peso: https://www.niddk.nih.gov/bwp
- Supabase RLS: https://supabase.com/docs/guides/database/postgres/row-level-security
- Gemini: https://ai.google.dev/gemini-api/docs
- Strava: https://developers.strava.com/docs/getting-started/

## Validação desta entrega

Os cinco testes de domínio e a compilação TypeScript/Vite passaram. Como o ambiente não resolveu registry.npmjs.org, a compilação utilizou dependências locais já instaladas, ligadas por symlinks em node_modules (ignorados no projeto). Em outra máquina, execute npm install normalmente; ainda não foi gerado um lockfile por uma instalação limpa.

O projeto nativo foi gerado, mas o Gradle não sincronizou devido à restrição de escrita em ~/.gradle. O servidor de desenvolvimento também teve abertura da porta bloqueada (EPERM). Não houve validação visual no navegador, compilação de APK nem teste em dispositivo.

## Migrações pelo terminal (CLI oficial)

Na pasta do projeto, com acesso à internet e Node.js 22 ou superior:

```sh
npm run db:init
npm run db:login
npm run db:link -- --project-ref SEU_PROJECT_REF
npm run db:migrate -- --dry-run
npm run db:migrate
npm run db:status
```

Execute init apenas na primeira configuração, antes de existir supabase/config.toml. Login autentica a CLI na sua conta; link vincula este diretório ao projeto remoto e pode solicitar a senha do banco no terminal. O project ref aparece no endereço do painel: https://supabase.com/dashboard/project/PROJECT_REF. Confira o projeto antes de aplicar. Os comandos usam npx para baixar a CLI oficial v2 quando necessário. Não é necessário iniciar o Supabase local ou Docker para aplicar ao projeto remoto.

A CLI usa suas próprias credenciais administrativas; as variáveis VITE_* continuam sendo apenas para o aplicativo. db:migrate aplica migrations pendentes e mantém o histórico remoto; db:status lista esse histórico. Se já executou o SQL manualmente, não reaplique sem reconciliar o histórico: verifique a estrutura e as políticas antes de marcar a migration como aplicada.

Os comandos foram adicionados, mas não foram executados contra o banco nesta entrega: falta autenticação administrativa e o ambiente tem restrições de rede.

## Cadastro no aplicativo e SMTP Gmail

Em Perfil e conexões → Criar conta, o usuário informa nome, e-mail, senha e confirmação. A confirmação e a recuperação usam códigos recebidos por e-mail e digitados no próprio aplicativo; não exigem deep links no Android. Também há reenvio de código, login e alteração de senha. O nome do cadastro fica nos metadados da conta; o perfil de saúde continua sendo editado separadamente.

Para ativar o envio, o responsável configura o SMTP uma única vez pelo código:

1. Ative a verificação em duas etapas da conta Google e crie uma senha de app em https://myaccount.google.com/apppasswords . Use essa senha, não a senha normal do Gmail.
2. Preencha SMTP_PASSWORD no arquivo local .env.smtp. O host Gmail é smtp.gmail.com, porta 587. SMTP_USER e SMTP_FROM_EMAIL devem ser o seu Gmail.
3. Preencha SUPABASE_ACCESS_TOKEN com um token pessoal administrativo obtido em https://supabase.com/dashboard/account/tokens . Ele não é a chave pública nem a service_role. Nunca use prefixo VITE_ para esses segredos. O arquivo .env.smtp é ignorado pelo Git e não é importado pelo app.
4. Rode npm run auth:check e npm run auth:configure. O script lê a URL do projeto do .env, habilita o cadastro por e-mail e a confirmação obrigatória, configura SMTP e publica os templates em supabase/templates. Não altera tabelas ou desabilita a confirmação de e-mail.
5. Teste Criar conta no app, confirme o código recebido, saia, entre novamente e teste Esqueci minha senha. O teste de entrega precisa de credenciais reais; auth:check valida somente os campos locais.

A configuração é administrativa e não deve ser executada pelo navegador. Antes de executar o script, os templates existentes podem ainda enviar links em vez de códigos. As credenciais não são exibidas nos logs; o retorno do servidor também não é impresso para evitar expor segredos. O Gmail tem limites de envio e esta configuração básica é para o início do projeto.

## Acesso ao painel

A tela inicial exige login e confirmação do e-mail. O painel só é montado após getUser validar a sessão no Supabase; erros de rede mantêm a tela de acesso bloqueada com opção de tentar novamente. Sair encerra a sessão local e volta à entrada. Os registros locais usam uma chave por ID de conta, e o painel é reiniciado ao trocar de usuário. A RLS no banco continua sendo a proteção do acesso remoto.

Registros antigos do modo sem conta (`ritmo-local-v1`) são preservados no navegador, mas não são atribuídos automaticamente a nenhuma conta. Backups JSON exportados da versão anterior podem ser importados após entrar. Esta atualização não apaga esses registros antigos.

## Alimentação e saldo calórico diário

A aba Alimentação registra alimento/preparo, gramas e calorias por 100 g (rótulo ou estimativa Gemini). Exercícios aceitam calorias ativas informadas, ou tipo e duração com distância opcional. Os resultados distinguem dados pendentes, estimativas e valores informados. Use Analisar meu dia para consultar a IA com os registros da data selecionada.

Antes de concluir déficit ou superávit, revise o perfil, informe peso e marque todos os registros do dia como completos. O cálculo usa base de rotina leve e exercício ativo sem duplicação. A simulação de meta continua separada. Detalhes e fontes em [docs/energy.md](docs/energy.md).

Não é necessária nova migração SQL; os campos ficam no backup JSON existente. Publique a função atualizada com npm run ai:deploy. GEMINI_API_KEY e GEMINI_MODEL precisam estar configurados nos secrets do Supabase. A função verifica o JWT e o e-mail confirmado no código antes de chamar a IA. A entrega local não comprova que os secrets foram configurados ou que a função remota já foi publicada.

## Fotos (perfil e exercícios)

As fotos ficam no bucket privado `assets` do Supabase Storage, em `<user_id>/profile/...` e `<user_id>/exercises/<exercise_id>/...`. O snapshot no banco guarda apenas o caminho (`profile.photo` e `exercises[].photos`), nunca a imagem. As imagens são reduzidas no aparelho (até 1600 px, JPEG) antes do envio e exibidas por URLs assinadas temporárias. As políticas RLS só permitem que cada usuário leia e grave a própria pasta. Os caminhos não são enviados ao Gemini.

Publique o bucket e as políticas com `npm run db:migrate` (migração `202610260002_assets.sql`).
