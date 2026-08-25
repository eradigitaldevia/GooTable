import { createFileRoute, Link } from "@tanstack/react-router";
import { LegalLayout, LegalSecao } from "@/components/legal/legal-layout";
import {
  LGPD_CNPJ,
  LGPD_EMAIL_DPO,
  LGPD_PRAZO_RESPOSTA_DIAS,
  LGPD_RAZAO_SOCIAL,
  LGPD_VERSAO,
} from "@/lib/lgpd";

const TITULO = "Política de Privacidade — Mesa";
const DESC =
  "Como a Mesa coleta, usa, compartilha e protege dados pessoais de restaurantes e clientes, conforme a LGPD.";

export const Route = createFileRoute("/privacidade")({
  head: () => ({
    meta: [
      { title: TITULO },
      { name: "description", content: DESC },
      { property: "og:title", content: TITULO },
      { property: "og:description", content: DESC },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PrivacidadePage,
});

function PrivacidadePage() {
  return (
    <LegalLayout titulo="Política de Privacidade" atualizadoEm={`versão ${LGPD_VERSAO}`}>
      <p>
        Esta Política explica como tratamos dados pessoais na plataforma Mesa,
        em conformidade com a Lei nº 13.709/2018 (LGPD). Controlador:{" "}
        {LGPD_RAZAO_SOCIAL}, CNPJ {LGPD_CNPJ}. Encarregado (DPO):{" "}
        {LGPD_EMAIL_DPO}.
      </p>

      <LegalSecao titulo="1. Papéis">
        <p>
          O restaurante é controlador dos dados dos seus clientes; a Mesa atua
          como operadora, tratando os dados conforme as instruções do
          restaurante. Para os dados de conta dos restaurantes, a Mesa é
          controladora.
        </p>
      </LegalSecao>

      <LegalSecao titulo="2. Dados que coletamos">
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <span className="font-medium text-foreground">Restaurante:</span>{" "}
            e-mail e senha de acesso, nome, CNPJ, endereço, telefone, horário de
            funcionamento e chave PIX.
          </li>
          <li>
            <span className="font-medium text-foreground">Cliente final:</span>{" "}
            nome e telefone informados na identificação da mesa ou no delivery,
            endereço de entrega quando aplicável, histórico de pedidos, saldo de
            cashback e cupons utilizados.
          </li>
          <li>
            <span className="font-medium text-foreground">Segurança:</span>{" "}
            registros técnicos de tentativas de identificação (telefone e IP em
            formato irreversível), logs de auditoria de operações e datas de
            aceite dos documentos legais.
          </li>
        </ul>
      </LegalSecao>

      <LegalSecao titulo="3. Finalidades e bases legais">
        <ul className="list-disc space-y-1 pl-5">
          <li>Executar o pedido, a comanda e o pagamento — execução de contrato.</li>
          <li>Programa de cashback, cupons e campanhas — consentimento e legítimo interesse.</li>
          <li>Prevenção a fraude e limitação de tentativas — legítimo interesse.</li>
          <li>Obrigações fiscais e contábeis — cumprimento de obrigação legal.</li>
        </ul>
      </LegalSecao>

      <LegalSecao titulo="4. Compartilhamento">
        <p>
          Compartilhamos dados com o restaurante em que o pedido foi feito e com
          fornecedores de infraestrutura (hospedagem e banco de dados) que atuam
          como operadores. Não vendemos dados pessoais.
        </p>
      </LegalSecao>

      <LegalSecao titulo="5. Retenção">
        <p>
          Dados de pedidos e pagamentos são mantidos pelo prazo necessário ao
          cumprimento de obrigações legais e à defesa de direitos. Registros de
          tentativas de identificação são expurgados periodicamente. Dados de
          cadastro são mantidos enquanto a conta estiver ativa.
        </p>
      </LegalSecao>

      <LegalSecao titulo="6. Segurança">
        <p>
          Adotamos controle de acesso por perfil, políticas de acesso a nível de
          registro no banco de dados, transporte criptografado, limitação de
          tentativas de identificação e registro de auditoria das operações
          sensíveis.
        </p>
      </LegalSecao>

      <LegalSecao titulo="7. Direitos do titular">
        <p>
          Você pode solicitar confirmação de tratamento, acesso, correção,
          anonimização, portabilidade, eliminação e revogação do consentimento.
          Responderemos em até {LGPD_PRAZO_RESPOSTA_DIAS} dias. Abra sua
          solicitação em{" "}
          <Link to="/direitos" className="font-medium text-primary hover:underline">
            Direitos do titular
          </Link>{" "}
          ou escreva para {LGPD_EMAIL_DPO}.
        </p>
      </LegalSecao>

      <LegalSecao titulo="8. Cookies e armazenamento local">
        <p>
          Utilizamos armazenamento local no navegador para manter sua sessão de
          mesa, o carrinho e as preferências de exibição. Não utilizamos cookies
          de publicidade de terceiros.
        </p>
      </LegalSecao>

      <LegalSecao titulo="9. Alterações">
        <p>
          Esta Política pode ser atualizada; alterações relevantes geram nova
          versão e novo aceite. Veja também os{" "}
          <Link to="/termos" className="font-medium text-primary hover:underline">
            Termos de Uso
          </Link>
          .
        </p>
      </LegalSecao>
    </LegalLayout>
  );
}
