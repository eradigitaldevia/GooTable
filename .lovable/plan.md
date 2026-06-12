# Plano de Trabalho: Reorganização Visual do Sidebar em Grupos

Este plano descreve as alterações necessárias para reorganizar os itens do menu lateral (sidebar) em grupos visuais com cabeçalhos (headers) simples e não colapsáveis, conforme especificado na proposta de agrupamento.

---

## 1. Escopo das Alterações

### Arquivos Afetados
- `src/components/admin/admin-sidebar.tsx`: Arquivo principal que renderiza a barra lateral.

### O que NÃO será feito (para segurança e controle de escopo)
- Nenhuma rota, permissão ou redirecionamento será alterado.
- Nenhuma fusão de páginas será realizada nesta etapa.
- Não haverá adição de botões colapsáveis ou interações de colapso nos grupos.
- Nenhuma alteração de cores, tipografia global ou comportamento de autenticação/superadmin.

---

## 2. Detalhes Técnicos da Implementação

### Modificação em `src/components/admin/admin-sidebar.tsx`

1. **Definição da estrutura de grupos**:
   Substituiremos a lista plana `NAV` por uma estrutura de dados agrupada ou adaptaremos o mapeamento do renderizador para processar grupos definidos.

   A estrutura de grupos definida é:
   - **OPERAÇÃO**
     - Dashboard (`/admin`)
     - Pedidos (`/admin/pedidos`)
     - Chamados (`/admin/chamados`)
     - Caixa (`/caixa`)
   - **MESAS & CARDÁPIO**
     - Mesas (`/admin/mesas`)
     - Cardápio (`/admin/cardapio`)
     - Prévia do cardápio (`/admin/cardapio-preview`)
     - Destinos de preparo (`/admin/destinos-preparo`)
   - **CLIENTES**
     - Clientes (`/admin/clientes`)
     - Fidelidade (`/admin/fidelidade`)
     - Cupons (`/admin/cupons`)
   - **SHOW & EVENTOS**
     - Couvert artístico (`/admin/couvert-artistico`)
   - **DISPLAYS**
     - Display de cozinha (`/cozinha`)
     - Display do bar (`/bar`)
   - **EQUIPE & AJUSTES**
     - Equipe (`/admin/equipe`)
     - Garçons (`/admin/garcons`)
     - Cumim (`/admin/cumim`)
     - Configurações (`/admin/configuracoes`)

2. **Renderização de Headers**:
   - Quando o sidebar estiver **expandido** (`collapsed = false`), cada grupo exibirá um cabeçalho de texto simples (ex: `text-[10px] font-bold tracking-wider text-muted-foreground uppercase px-3 pt-4 pb-1.5`).
   - Quando o sidebar estiver **minimizado** (`collapsed = true`), os cabeçalhos simples não serão renderizados ou serão substituídos por um divisor sutil (`border-t my-2`) para separar visualmente as seções de ícones, preservando a compactação do layout.
   - O espaçamento interno (`space-y-1`) será mantido em cada grupo.

3. **Manutenção de Regras e Permissões Existentes**:
   - A filtragem de itens baseada em `podeVerEquipe`, `podeAcessarCaixa` e `restaurante.couvert_artistico_habilitado` continuará funcionando da mesma forma. Se um grupo ficar vazio devido às permissões do usuário logado, o cabeçalho desse grupo não será exibido.
