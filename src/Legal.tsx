import { useState, type ReactNode } from "react";
import Sheet from "./Sheet";

/** Versão dos termos aceita no cadastro (gravada nos metadados da conta). */
export const TERMS_VERSION = "2026-10-26";
// Preencha antes de publicar: quem é o controlador dos dados e o contato do
// encarregado (DPO), exigidos pela LGPD (art. 9º e art. 41).
const CONTROLLER = "[NOME OU RAZÃO SOCIAL DO RESPONSÁVEL PELO APP, CPF/CNPJ]";
const CONTACT = "[E-MAIL DO ENCARREGADO DE DADOS]";
const UPDATED = "26 de outubro de 2026";

export type LegalDoc = "terms" | "privacy";

function H({ children }: { children: ReactNode }) {
  return <h3 className="mt-5 mb-1.5 font-semibold text-ink-900">{children}</h3>;
}

function Terms() {
  return (
    <>
      <p>Última atualização: {UPDATED}.</p>
      <H>1. O que é o Ritmo</H>
      <p>
        O Ritmo é um aplicativo para você registrar e acompanhar peso,
        alimentação, água, exercícios e pressão arterial. Ele é oferecido por{" "}
        {CONTROLLER}. Ao criar a conta, você concorda com estes Termos e com a
        Política de Privacidade.
      </p>
      <H>2. Não substitui profissional de saúde</H>
      <p>
        Os cálculos (basal, gasto diário, meta de consumo, meta de água,
        calorias de alimentos e exercícios) são estimativas populacionais e
        podem não refletir o seu caso. O app não faz diagnóstico, não prescreve
        dieta, tratamento ou medicamento e não é um dispositivo médico. As
        respostas e leituras da inteligência artificial podem conter erros:
        confira sempre antes de salvar. Em caso de sintomas, pressão alta ou
        qualquer dúvida de saúde, procure um profissional. Em emergência,
        ligue 192 (SAMU).
      </p>
      <H>3. Quem pode usar</H>
      <p>
        O app é destinado a pessoas com 18 anos ou mais. As estimativas não são
        adequadas para gestantes, lactantes ou pessoas com condições clínicas
        sem acompanhamento profissional.
      </p>
      <H>4. Sua conta</H>
      <p>
        Você é responsável pela veracidade dos dados que informa e por manter
        sua senha em sigilo. Não use o app em aparelhos compartilhados para
        guardar dados sensíveis. Podemos suspender contas usadas de forma
        abusiva, ilegal ou que prejudique o serviço.
      </p>
      <H>5. Inteligência artificial, fotos e áudios</H>
      <p>
        Recursos opcionais enviam fotos, áudios ou descrições ao serviço de IA
        para preencher campos ou responder perguntas. Só envie conteúdo seu e
        evite incluir dados de outras pessoas.
      </p>
      <H>6. Conteúdo de terceiros</H>
      <p>
        A aba de vídeos exibe vídeos públicos do YouTube produzidos por
        terceiros. O conteúdo é de responsabilidade dos autores, e o YouTube
        tem termos e política de privacidade próprios.
      </p>
      <H>7. Disponibilidade e responsabilidade</H>
      <p>
        O serviço é oferecido como está e pode ficar indisponível para
        manutenção ou por falhas de terceiros. Mantenha cópias dos dados
        importantes. Na medida permitida pela lei, não respondemos por
        decisões tomadas apenas com base nas estimativas do app.
      </p>
      <H>8. Mudanças e contato</H>
      <p>
        Podemos atualizar estes Termos; mudanças relevantes serão avisadas no
        app. Dúvidas: {CONTACT}. Estes Termos seguem a lei brasileira.
      </p>
    </>
  );
}

function Privacy() {
  return (
    <>
      <p>Última atualização: {UPDATED}.</p>
      <p className="mt-2">
        Esta política explica como o Ritmo trata seus dados pessoais, conforme
        a Lei Geral de Proteção de Dados (Lei nº 13.709/2018, LGPD).
        Controlador: {CONTROLLER}. Encarregado de dados (DPO): {CONTACT}.
      </p>
      <H>1. Dados que coletamos</H>
      <ul className="list-disc space-y-1 pl-5">
        <li>Conta: nome, e-mail e senha (guardada de forma criptografada).</li>
        <li>
          Perfil: altura, idade, gênero, coeficiente da fórmula, nível de
          atividade, foto de perfil (opcional) e cor escolhida.
        </li>
        <li>
          Dados de saúde (dados pessoais sensíveis): peso, pressão arterial e
          pulso, alimentos e calorias, água, exercícios, metas e as fotos que
          você anexar aos registros.
        </li>
        <li>
          Áudios e fotos enviados para a IA: usados só para ler os valores e
          descartados em seguida; não ficam guardados pelo Ritmo.
        </li>
        <li>
          Preferências do aparelho (tela aberta, lembretes de água) ficam só
          no aparelho.
        </li>
      </ul>
      <H>2. Para que usamos</H>
      <p>
        Para criar e proteger sua conta, guardar e sincronizar seus registros,
        calcular as estimativas (basal, metas de calorias e de água), mostrar
        gráficos e relatórios, enviar os lembretes que você ativar e, quando
        você pedir, ler fotos e áudios ou responder perguntas com IA. Não
        vendemos seus dados, não os usamos para publicidade e não traçamos
        perfil para fins comerciais.
      </p>
      <H>3. Bases legais</H>
      <p>
        Dados de saúde: seu consentimento específico e destacado (art. 11, I,
        da LGPD), dado na caixa de aceite do cadastro. Dados da conta:
        execução do contrato de uso do app (art. 7º, V) e cumprimento de
        obrigação legal quando aplicável (art. 7º, II). Você pode revogar o
        consentimento a qualquer momento (art. 8º, § 5º); sem ele, não é
        possível continuar usando a conta.
      </p>
      <H>4. Com quem compartilhamos</H>
      <ul className="list-disc space-y-1 pl-5">
        <li>
          Supabase: hospedagem do banco de dados, autenticação e
          armazenamento das fotos.
        </li>
        <li>
          Google (Gemini API): recebe apenas o conteúdo necessário a cada
          pedido de IA (a foto, o áudio, a descrição do alimento ou a pergunta
          com o resumo numérico do dia). Nome e e-mail não são enviados.
        </li>
        <li>
          YouTube: ao assistir a um vídeo educativo, o player do YouTube é
          carregado no modo de privacidade aprimorada.
        </li>
        <li>Autoridades, quando houver obrigação legal ou ordem judicial.</li>
      </ul>
      <p className="mt-2">
        Esses fornecedores podem tratar dados fora do Brasil. A transferência
        internacional ocorre com base no seu consentimento específico e nas
        garantias contratuais dos fornecedores (art. 33 da LGPD).
      </p>
      <H>5. Por quanto tempo guardamos</H>
      <p>
        Enquanto a conta existir. Ao excluir a conta, os registros e fotos são
        apagados dos nossos sistemas, salvo o que a lei exigir guardar.
        Cópias de segurança dos fornecedores são sobrescritas nos prazos
        deles.
      </p>
      <H>6. Seus direitos</H>
      <p>
        Você pode pedir, a qualquer momento e sem custo: confirmação de que
        tratamos seus dados, acesso, correção, anonimização, bloqueio ou
        eliminação de dados desnecessários, portabilidade, informação sobre
        compartilhamentos, eliminação dos dados tratados com consentimento e
        revogação do consentimento (art. 18 da LGPD). Escreva para {CONTACT}.
        Você também pode reclamar à Autoridade Nacional de Proteção de Dados
        (ANPD, gov.br/anpd).
      </p>
      <H>7. Segurança</H>
      <p>
        A conexão é criptografada (HTTPS), cada conta só acessa os próprios
        dados (regras de acesso no banco) e as chaves da IA ficam só no
        servidor. Dados guardados no aparelho ficam no armazenamento do app,
        que não é criptografado: proteja o celular com senha.
      </p>
      <H>8. Menores de idade</H>
      <p>O Ritmo não é destinado a menores de 18 anos.</p>
      <H>9. Mudanças</H>
      <p>
        Avisaremos no app sobre mudanças relevantes nesta política e, quando a
        lei exigir, pediremos um novo consentimento.
      </p>
    </>
  );
}

export function LegalSheet({
  doc,
  onClose,
}: {
  doc: LegalDoc;
  onClose: () => void;
}) {
  return (
    <Sheet
      title={doc === "terms" ? "Termos de Uso" : "Política de Privacidade"}
      onClose={onClose}
    >
      <div className="text-sm leading-relaxed text-ink-700">
        {doc === "terms" ? <Terms /> : <Privacy />}
      </div>
    </Sheet>
  );
}

/** Links "Termos de Uso" e "Política de Privacidade" que abrem o texto. */
export function useLegal() {
  const [doc, setDoc] = useState<LegalDoc | null>(null);
  const link = (d: LegalDoc, text: string) => (
    <button
      type="button"
      className="font-medium text-brand-700 underline underline-offset-2"
      onClick={() => setDoc(d)}
    >
      {text}
    </button>
  );
  return {
    terms: link("terms", "Termos de Uso"),
    privacy: link("privacy", "Política de Privacidade"),
    sheet: doc && <LegalSheet doc={doc} onClose={() => setDoc(null)} />,
  };
}
