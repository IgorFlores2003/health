# Ritmo

Acompanhamento de saúde para Android e web, em React, TypeScript, Tailwind e Capacitor, com Supabase (conta, banco, fotos) e Gemini (IA). Interface em português.

## Executar

```sh
npm install
npm run dev        # web em modo de desenvolvimento
npm test           # testes de domínio, energia, sincronização e relatório
npm run build
npm run android:sync && npm run android:open
```

## Funcionalidades

- Conta com e-mail confirmado, aceite dos Termos e consentimento LGPD no cadastro.
- Peso, pressão, exercícios (hh:mm:ss), alimentação (g ou ml) e água, com fotos e preenchimento por foto ou áudio com IA.
- Meta de calorias sempre automática (emagrecer, ganhar ou manter, nunca abaixo do mínimo seguro) e meta de água de 35 ml/kg com lembretes no Android.
- Gráficos de peso, exercício, calorias, água e pressão; relatório em PDF por período.
- Assistente com respostas na hora para perguntas comuns e Gemini para o resto.
- Vídeos educativos, metas com aviso (confete na água, foguete no peso), modo escuro e cor do app.
- Sincronização automática entre aparelhos, juntando alterações registro por registro.

Nenhuma fórmula arredonda; todas estão em Perfil → Privacidade → Fórmulas e cálculos e em [docs/energy.md](docs/energy.md). As estimativas não são diagnóstico nem prescrição.

## Estrutura

- `supabase/functions/_shared`: domínio e cálculos, usados pelo app e pela função de IA.
- `supabase/functions/coach`: Edge Function do Gemini (leitura de foto/áudio, estimativas, perguntas), com limite de uso por pessoa.
- `supabase/migrations`: tabelas, regras de acesso (RLS), bucket de fotos e limites.
- `src/App.tsx`: navegação, abas e formulários de registro; `src/Records.tsx`, `src/DailyDiary.tsx` e os demais componentes de cada tela.
- `src/ui.tsx`, `src/Choice.tsx`, `src/NumberField.tsx`: peças de interface reutilizadas.

## Supabase

1. Copie `.env.example` para `.env` com a URL e a chave pública. Nunca use `VITE_` para segredos.
2. Aplique as migrações e publique a função (nesta ordem):

   ```sh
   npm run db:login
   npm run db:link -- --project-ref SEU_PROJECT_REF
   npm run db:migrate
   npx supabase secrets set GEMINI_API_KEY=SUA_CHAVE GEMINI_MODEL=modelo1,modelo2
   npm run ai:deploy
   ```

   `GEMINI_MODEL` aceita uma lista: se um modelo falhar ou demorar, a função tenta o próximo.

3. E-mails de cadastro e recuperação por código (SMTP Gmail): crie uma senha de app em https://myaccount.google.com/apppasswords, preencha `.env.smtp` (veja `.env.smtp.example`) com ela e um token pessoal de https://supabase.com/dashboard/account/tokens, e rode `npm run auth:check` e `npm run auth:configure`. O script também aplica a senha mínima de 8 caracteres.

## Segurança e privacidade

- Cada conta só acessa os próprios dados e fotos (RLS); o bucket de fotos é privado, com URLs temporárias.
- A IA exige login com e-mail confirmado e tem limite de 20 pedidos por minuto e 200 por dia por pessoa.
- Nome, e-mail e fotos de registros não são enviados ao Gemini nas perguntas; fotos e áudios lidos pela IA não são guardados.
- No Android, o backup automático está desligado para os dados de saúde não saírem do aparelho.
- Termos e Política de Privacidade ficam em `src/Legal.tsx` (controlador e contato do encarregado no topo).

## Referências

- Mifflin–St Jeor: https://pubmed.ncbi.nlm.nih.gov/2305711/
- Compêndio de Atividades Físicas 2024: https://pacompendium.com/
- Supabase RLS: https://supabase.com/docs/guides/database/postgres/row-level-security
- Gemini: https://ai.google.dev/gemini-api/docs
- Capacitor: https://capacitorjs.com/docs
