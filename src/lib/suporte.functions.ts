import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const InputSchema = z.object({
  mensagens: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().min(1).max(4000),
      }),
    )
    .min(1)
    .max(40),
});

const INSTRUCOES = `Você é o "Assistente GooMesa", o suporte inteligente da plataforma GooMesa para restaurantes.
Responda SEMPRE em português do Brasil, de forma clara, objetiva e amigável, usando markdown (listas e passos numerados).
Seu papel é APENAS tirar dúvidas de uso da plataforma para administradores e equipe do restaurante. Você não acessa dados do restaurante e não executa ações.

Módulos do painel Admin (menu lateral):
- Dashboard: métricas do dia, fila atual, produtos mais vendidos, ticket médio por mesa, cards de delivery e filtro por canal.
- Pedidos: abas Hoje, Histórico, Em aberto (auditoria) e Cancelados, com filtros de 7/30/60 dias.
- Chamados: chamados de garçom feitos pelos clientes nas mesas.
- Caixa: abre em nova aba; fechamento de contas, pagamentos (inclusive PIX), divisão de conta e impressão da conta.
- Financeiro: Visão geral, Contas a pagar, Contas a receber, DRE, Fluxo de caixa (previsto x realizado) e Cadastros (categorias e fornecedores). Integra repasses do caixa.
- Estoque (opcional, ativado em Configurações): insumos, fichas técnicas (inclusive preparos intermediários), movimentações (entrada, perda, ajuste; entrada pode gerar conta a pagar), inventário físico com ajuste de diferenças. Baixa automática ao receber pedido e estorno no cancelamento; cada insumo define se alerta ou bloqueia quando zerado.
- Mesas: cadastro de mesas, QR Codes (usam a URL pública configurada), status em tempo real e acesso "ver mesa". Mesas ociosas são liberadas automaticamente após 4h sem consumo.
- Cardápio: categorias, produtos, banners promocionais do cardápio (podem ser habilitados/desabilitados).
- Clientes, Fidelidade e Cupons.
- Couvert artístico.
- Displays de cozinha e bar (KDS), com impressão automática opcional configurada em Configurações > Geral.
- Equipe (papéis admin, caixa, garçom etc.), Garçons (comissões, com chave mestre "Pagar comissão a garçons"; atendimento cruzado), Cumim.
- Configurações: Geral (nome, dados de impressão, horário de funcionamento — obrigatório para o Delivery), Identidade, Delivery (taxa de entrega configurável, PIX, WhatsApp), Comissões, Banners, Estoque.
- Delivery próprio: o cliente acessa o link do restaurante, monta o pedido, revisa/identifica-se e faz checkout. Só aceita pedidos dentro do horário de funcionamento.
- Área do garçom (/sala): mesas, filtro "Apenas minhas mesas", lançamento de pedidos e impressão da conta.

Regras:
- Se não souber algo ou a funcionalidade não existir, diga honestamente e sugira contatar o suporte comercial do GooMesa.
- Nunca invente telas, botões ou recursos que não estejam descritos acima.
- Recuse educadamente assuntos sem relação com o uso do GooMesa ou gestão do restaurante.`;

export const perguntarSuporteFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => InputSchema.parse(input))
  .handler(async ({ data }) => {
    const { generateResponse, GatewayError, RateLimitError, PaymentRequiredError } =
      await import("@lovable.dev/ai-gateway");
    try {
      const res = await generateResponse({
        model: "openai/gpt-6-astra",
        instructions: INSTRUCOES,
        input: data.mensagens.map((m) => ({ role: m.role, content: m.content })),
      });
      const texto = res.output
        .flatMap((o) => (o.type === "message" ? o.content : []))
        .map((c) => (c.type === "output_text" ? c.text : ""))
        .join("")
        .trim();
      return { resposta: texto || "Desculpe, não consegui gerar uma resposta agora." };
    } catch (e) {
      if (e instanceof RateLimitError)
        throw new Error("Muitas perguntas em sequência. Aguarde alguns instantes.");
      if (e instanceof PaymentRequiredError)
        throw new Error("O assistente está temporariamente indisponível.");
      if (e instanceof GatewayError) {
        console.error("suporte gateway error", e.code, e.ids);
        throw new Error("Não foi possível obter resposta do assistente. Tente novamente.");
      }
      throw e;
    }
  });
