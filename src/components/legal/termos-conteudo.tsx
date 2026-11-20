import { Link } from "@tanstack/react-router";
import { LegalSecao } from "@/components/legal/legal-layout";
import {
  LGPD_CNPJ,
  LGPD_EMAIL_DPO,
  LGPD_RAZAO_SOCIAL,
  LGPD_VERSAO,
} from "@/lib/lgpd";

export function TermosConteudo() {
  return (
    <>
      <p>
        Estes Termos de Uso regulam o acesso e a utilização da plataforma GooTable,
        operada por {LGPD_RAZAO_SOCIAL}, CNPJ {LGPD_CNPJ} ("nós"). Ao criar uma
        conta, ler o QR Code de uma mesa ou realizar um pedido, você concorda
        com as condições abaixo.
      </p>

      <LegalSecao titulo="1. O que a plataforma faz">
        <p>
          A Mesa disponibiliza cardápio digital acessível por QR Code, envio de
          pedidos para cozinha e bar, controle de comandas, cashback, cupons,
          delivery e registro de pagamentos. O restaurante é responsável pelos
          produtos, preços, preparo, entrega e atendimento.
        </p>
      </LegalSecao>

      <LegalSecao titulo="2. Contas de restaurante">
        <p>
          O restaurante é responsável pela veracidade dos dados cadastrados
          (razão social, CNPJ, endereço, telefone e chave PIX), pela guarda das
          credenciais de acesso e pelos atos praticados por sua equipe dentro do
          sistema. Cada usuário deve ter credenciais próprias.
        </p>
      </LegalSecao>

      <LegalSecao titulo="3. Uso pelo cliente final">
        <p>
          Para acompanhar pedidos e acumular cashback, o cliente informa nome e
          telefone ao ler o QR Code da mesa. A sessão da mesa pode ser encerrada
          automaticamente após período de inatividade; nesse caso é necessário
          ler o QR Code novamente para novos pedidos. É proibido usar dados de
          terceiros para se identificar.
        </p>
      </LegalSecao>

      <LegalSecao titulo="4. Pedidos, valores e pagamentos">
        <p>
          Os valores exibidos incluem os acréscimos configurados pelo
          restaurante, como taxa de serviço, couvert e taxa de entrega. A
          confirmação do pagamento é feita pelo restaurante. A Mesa não é
          intermediadora financeira e não retém valores das vendas.
        </p>
      </LegalSecao>

      <LegalSecao titulo="5. Cashback e cupons">
        <p>
          Regras de cashback, percentual máximo de resgate, validade e cupons
          são definidas pelo restaurante e podem ser alteradas a qualquer
          momento. Saldos não são conversíveis em dinheiro.
        </p>
      </LegalSecao>

      <LegalSecao titulo="6. Condutas vedadas">
        <p>
          É vedado tentar acessar dados de outros usuários, burlar limites de
          identificação, automatizar pedidos, sobrecarregar a plataforma ou
          utilizá-la para fins ilícitos. Contas envolvidas em abuso podem ser
          suspensas.
        </p>
      </LegalSecao>

      <LegalSecao titulo="7. Disponibilidade e limitação de responsabilidade">
        <p>
          A plataforma é fornecida "no estado em que se encontra". Podem ocorrer
          interrupções por manutenção, falhas de rede ou de terceiros. Não
          respondemos por lucros cessantes ou danos indiretos decorrentes da
          indisponibilidade ou de informações cadastradas pelo restaurante.
        </p>
      </LegalSecao>

      <LegalSecao titulo="8. Dados pessoais">
        <p>
          O tratamento de dados pessoais está descrito na{" "}
          <Link to="/privacidade" className="font-medium text-primary hover:underline">
            Política de Privacidade
          </Link>
          . Solicitações de titulares podem ser abertas em{" "}
          <Link to="/direitos" className="font-medium text-primary hover:underline">
            Direitos do titular
          </Link>
          .
        </p>
      </LegalSecao>

      <LegalSecao titulo="9. Alterações">
        <p>
          Estes Termos podem ser atualizados. Alterações relevantes geram nova
          versão e novo aceite. A versão vigente é a {LGPD_VERSAO}.
        </p>
      </LegalSecao>

      <LegalSecao titulo="10. Foro e contato">
        <p>
          Aplica-se a legislação brasileira. Contato: {LGPD_EMAIL_DPO}.
        </p>
      </LegalSecao>
    </>
  );
}
