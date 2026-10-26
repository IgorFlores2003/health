# Diário de alimentação e energia

A aba Alimentação agrupa alimentos e exercícios por data. Os mesmos cálculos são usados pelo app e pela Edge Function coach em `supabase/functions/_shared/energy.ts`.

## Alimentação

- Nome/preparo, gramas, kcal por 100 g, origem da energia (informada, estimada pela IA ou pendente).
- Porção: gramas × kcal/100 g ÷ 100, arredondada para kcal inteiras por registro.
- Sem densidade calórica, o alimento permanece pendente; nunca é interpretado como zero kcal.
- O botão Estimar calorias com IA envia apenas a descrição ao Gemini. A estimativa é identificada como tal, com hipóteses de preparo; não é consulta verificada a uma tabela nutricional. A pessoa pode corrigir ou substituir pelo rótulo antes de salvar.
- Editar a descrição invalida estimativas da IA. Alterar os gramas recalcula a porção.

## Exercícios

Duas entradas alternativas: calorias **ativas** informadas, ou estimativa por tipo/duração e, opcionalmente, distância. Calorias ativas substituem completamente o cálculo automático. Não use gasto diário do relógio nem gasto bruto que inclui repouso.

Estimativa ativa = (MET − 1) × peso em kg × horas. A parcela de repouso é removida porque já faz parte da base diária. A distância e o tempo determinam a velocidade para faixas simplificadas de caminhada, corrida e ciclismo em terreno plano; outros ambientes não são modelados. A duração é necessária quando as calorias não são informadas. Musculação usa 3,5 MET para leve/moderada e 6 para intensa; yoga geral 2,3 e pilates geral 2,8. Natação, dança e tipos desconhecidos ficam pendentes sem calorias informadas. Não são estimados a partir de um valor genérico inventado.

Referências: Compêndio de Atividades Físicas 2024:
- https://pacompendium.com/walking/
- https://pacompendium.com/running/
- https://pacompendium.com/bicycling/
- https://pacompendium.com/conditioning-exercise/

São aproximações populacionais, não medições individuais. As faixas por velocidade simplificam atividades específicas do compêndio; inclinação, terreno, pausas, carga, técnica e condicionamento podem mudar o resultado.

## Saldo

Base diária = Mifflin–St Jeor × 1,2, assumindo rotina leve fora dos treinos. Gasto do dia = base + calorias ativas dos exercícios. Saldo = consumo − gasto. O fator habitual do perfil continua sendo usado apenas na simulação de prazo da aba Meta; nunca é somado ao exercício no diário.

O usuário precisa revisar/salvar o perfil, registrar peso nessa data ou antes, resolver calorias pendentes e marcar que registrou tudo no dia. Só então o status pode ser déficit, superávit ou próximo do equilíbrio. A faixa de ±100 kcal é uma tolerância operacional, não clínica. Sem fechamento ou com dados faltantes, o resultado é incompleto, mesmo que o saldo parcial seja negativo. Um dia sem alimentos não é assumido como jejum. Ausência de exercícios após o fechamento é interpretada como dia sem treino.

A estimativa de rotina leve pode subestimar trabalhos fisicamente ativos e não prevê perda de peso. Calorias de relógios, rótulos e IA também têm incerteza. Não há prescrição de déficit, dieta ou tratamento.

## Persistência e compatibilidade

Alimentos e fechamento diário seguem no JSON da tabela health_snapshots: não é necessária nova migração SQL. Backups anteriores continuam válidos; campos novos são opcionais e nenhum histórico é descartado. Os dados continuam sendo salvos localmente e copiados para a conta pela opção Salvar na conta.

## IA

O app envia o dia selecionado com perfil numérico (sem nome/gênero), último peso anterior ou da data, alimentos, exercícios e indicação de completude. O servidor valida os dados e recalcula tudo antes de consultar o Gemini; não aceita um saldo pronto do cliente. As instruções proíbem afirmar déficit em dias incompletos e diferenciam calorias informadas/estimadas.

Publique a atualização com `npm run ai:deploy` depois de autenticar e vincular a CLI. A função precisa dos secrets GEMINI_API_KEY e GEMINI_MODEL. Sem isso, os registros, cálculos locais e dados de rótulos funcionam, mas as duas operações de IA mostram indisponibilidade. O cadastro de alimentos sem kcal é permitido como pendente.

Teste de entrega: registrar 150 g de alimento com 130 kcal/100 g deve produzir 195 kcal; caminhada de 5 km em 60 minutos para 80 kg produz estimativa de 224 kcal ativas; um valor informado de 250 kcal deve substituí-la. Reabra o dia ao editar/excluir alimento ou exercício. Revise a análise em outro dia para confirmar que os registros não se misturam.
