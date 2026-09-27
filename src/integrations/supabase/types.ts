export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      apresentacao_artistas: {
        Row: {
          apresentacao_id: string
          artista_id: string
          criado_em: string
          id: string
          peso: number
        }
        Insert: {
          apresentacao_id: string
          artista_id: string
          criado_em?: string
          id?: string
          peso?: number
        }
        Update: {
          apresentacao_id?: string
          artista_id?: string
          criado_em?: string
          id?: string
          peso?: number
        }
        Relationships: [
          {
            foreignKeyName: "apresentacao_artistas_apresentacao_id_fkey"
            columns: ["apresentacao_id"]
            isOneToOne: false
            referencedRelation: "apresentacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "apresentacao_artistas_artista_id_fkey"
            columns: ["artista_id"]
            isOneToOne: false
            referencedRelation: "artistas"
            referencedColumns: ["id"]
          },
        ]
      }
      apresentacoes: {
        Row: {
          atualizado_em: string
          criada_por: string | null
          criado_em: string
          encerrada_por: string | null
          fim_em: string | null
          id: string
          inicio_em: string
          nome: string
          restaurante_id: string
        }
        Insert: {
          atualizado_em?: string
          criada_por?: string | null
          criado_em?: string
          encerrada_por?: string | null
          fim_em?: string | null
          id?: string
          inicio_em?: string
          nome: string
          restaurante_id: string
        }
        Update: {
          atualizado_em?: string
          criada_por?: string | null
          criado_em?: string
          encerrada_por?: string | null
          fim_em?: string | null
          id?: string
          inicio_em?: string
          nome?: string
          restaurante_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "apresentacoes_restaurante_id_fkey"
            columns: ["restaurante_id"]
            isOneToOne: false
            referencedRelation: "restaurantes"
            referencedColumns: ["id"]
          },
        ]
      }
      artistas: {
        Row: {
          ativo: boolean
          atualizado_em: string
          chave_pix: string | null
          criado_em: string
          documento: string | null
          id: string
          nome: string
          observacao: string | null
          restaurante_id: string
          tipo_chave_pix: string | null
        }
        Insert: {
          ativo?: boolean
          atualizado_em?: string
          chave_pix?: string | null
          criado_em?: string
          documento?: string | null
          id?: string
          nome: string
          observacao?: string | null
          restaurante_id: string
          tipo_chave_pix?: string | null
        }
        Update: {
          ativo?: boolean
          atualizado_em?: string
          chave_pix?: string | null
          criado_em?: string
          documento?: string | null
          id?: string
          nome?: string
          observacao?: string | null
          restaurante_id?: string
          tipo_chave_pix?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "artistas_restaurante_id_fkey"
            columns: ["restaurante_id"]
            isOneToOne: false
            referencedRelation: "restaurantes"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          acao: string
          actor_user_id: string | null
          criado_em: string
          entidade: string
          entidade_id: string | null
          id: string
          metadata: Json | null
        }
        Insert: {
          acao: string
          actor_user_id?: string | null
          criado_em?: string
          entidade: string
          entidade_id?: string | null
          id?: string
          metadata?: Json | null
        }
        Update: {
          acao?: string
          actor_user_id?: string | null
          criado_em?: string
          entidade?: string
          entidade_id?: string | null
          id?: string
          metadata?: Json | null
        }
        Relationships: []
      }
      banners_cardapio: {
        Row: {
          alt_text: string
          ativo: boolean
          atualizado_em: string
          criado_em: string
          destino_tipo: string
          destino_valor: string | null
          exibir_em: string
          id: string
          imagem_url: string
          ordem: number
          restaurante_id: string
          vigencia_fim: string | null
          vigencia_inicio: string | null
        }
        Insert: {
          alt_text?: string
          ativo?: boolean
          atualizado_em?: string
          criado_em?: string
          destino_tipo?: string
          destino_valor?: string | null
          exibir_em?: string
          id?: string
          imagem_url: string
          ordem?: number
          restaurante_id: string
          vigencia_fim?: string | null
          vigencia_inicio?: string | null
        }
        Update: {
          alt_text?: string
          ativo?: boolean
          atualizado_em?: string
          criado_em?: string
          destino_tipo?: string
          destino_valor?: string | null
          exibir_em?: string
          id?: string
          imagem_url?: string
          ordem?: number
          restaurante_id?: string
          vigencia_fim?: string | null
          vigencia_inicio?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "banners_cardapio_restaurante_id_fkey"
            columns: ["restaurante_id"]
            isOneToOne: false
            referencedRelation: "restaurantes"
            referencedColumns: ["id"]
          },
        ]
      }
      caixa_eventos: {
        Row: {
          ator_nome: string | null
          ator_user_id: string | null
          criado_em: string
          id: string
          payload: Json
          restaurante_id: string
          tipo: string
          turno_id: string
        }
        Insert: {
          ator_nome?: string | null
          ator_user_id?: string | null
          criado_em?: string
          id?: string
          payload?: Json
          restaurante_id: string
          tipo: string
          turno_id: string
        }
        Update: {
          ator_nome?: string | null
          ator_user_id?: string | null
          criado_em?: string
          id?: string
          payload?: Json
          restaurante_id?: string
          tipo?: string
          turno_id?: string
        }
        Relationships: []
      }
      campanhas: {
        Row: {
          agendada_para: string | null
          atualizado_em: string
          canal: Database["public"]["Enums"]["campanha_canal"]
          conteudo_json: Json
          criado_em: string
          enviada_em: string | null
          id: string
          nome: string
          restaurante_id: string
          segmento_json: Json
          status: Database["public"]["Enums"]["campanha_status"]
          template_id: string | null
        }
        Insert: {
          agendada_para?: string | null
          atualizado_em?: string
          canal: Database["public"]["Enums"]["campanha_canal"]
          conteudo_json?: Json
          criado_em?: string
          enviada_em?: string | null
          id?: string
          nome: string
          restaurante_id: string
          segmento_json?: Json
          status?: Database["public"]["Enums"]["campanha_status"]
          template_id?: string | null
        }
        Update: {
          agendada_para?: string | null
          atualizado_em?: string
          canal?: Database["public"]["Enums"]["campanha_canal"]
          conteudo_json?: Json
          criado_em?: string
          enviada_em?: string | null
          id?: string
          nome?: string
          restaurante_id?: string
          segmento_json?: Json
          status?: Database["public"]["Enums"]["campanha_status"]
          template_id?: string | null
        }
        Relationships: []
      }
      cashback_movimentos: {
        Row: {
          cliente_id: string
          comanda_id: string | null
          criado_em: string
          id: string
          observacao: string | null
          pedido_id: string | null
          restaurante_id: string
          tipo: Database["public"]["Enums"]["cashback_movimento_tipo"]
          valor: number
        }
        Insert: {
          cliente_id: string
          comanda_id?: string | null
          criado_em?: string
          id?: string
          observacao?: string | null
          pedido_id?: string | null
          restaurante_id: string
          tipo: Database["public"]["Enums"]["cashback_movimento_tipo"]
          valor: number
        }
        Update: {
          cliente_id?: string
          comanda_id?: string | null
          criado_em?: string
          id?: string
          observacao?: string | null
          pedido_id?: string | null
          restaurante_id?: string
          tipo?: Database["public"]["Enums"]["cashback_movimento_tipo"]
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "cashback_movimentos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cashback_movimentos_comanda_id_fkey"
            columns: ["comanda_id"]
            isOneToOne: false
            referencedRelation: "comandas"
            referencedColumns: ["id"]
          },
        ]
      }
      categorias: {
        Row: {
          criado_em: string
          destino: Database["public"]["Enums"]["destino_preparo"]
          id: string
          nome: string
          ordem: number
          restaurante_id: string
        }
        Insert: {
          criado_em?: string
          destino?: Database["public"]["Enums"]["destino_preparo"]
          id?: string
          nome: string
          ordem?: number
          restaurante_id: string
        }
        Update: {
          criado_em?: string
          destino?: Database["public"]["Enums"]["destino_preparo"]
          id?: string
          nome?: string
          ordem?: number
          restaurante_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "categorias_restaurante_id_fkey"
            columns: ["restaurante_id"]
            isOneToOne: false
            referencedRelation: "restaurantes"
            referencedColumns: ["id"]
          },
        ]
      }
      categorias_financeiras: {
        Row: {
          atualizado_em: string
          cor: string | null
          criado_em: string
          icone: string | null
          id: string
          nome: string
          padrao: boolean
          restaurante_id: string
          tipo: string
        }
        Insert: {
          atualizado_em?: string
          cor?: string | null
          criado_em?: string
          icone?: string | null
          id?: string
          nome: string
          padrao?: boolean
          restaurante_id: string
          tipo: string
        }
        Update: {
          atualizado_em?: string
          cor?: string | null
          criado_em?: string
          icone?: string | null
          id?: string
          nome?: string
          padrao?: boolean
          restaurante_id?: string
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "categorias_financeiras_restaurante_id_fkey"
            columns: ["restaurante_id"]
            isOneToOne: false
            referencedRelation: "restaurantes"
            referencedColumns: ["id"]
          },
        ]
      }
      chamados_garcom: {
        Row: {
          atendido_em: string | null
          atendido_por: string | null
          atualizado_em: string
          cliente_id: string | null
          comanda_id: string | null
          criado_em: string
          id: string
          mesa_id: string
          restaurante_id: string
          sessao_id: string | null
          status: Database["public"]["Enums"]["chamado_status"]
          tempo_atendimento_segundos: number | null
          tipo_chamado_id: string
        }
        Insert: {
          atendido_em?: string | null
          atendido_por?: string | null
          atualizado_em?: string
          cliente_id?: string | null
          comanda_id?: string | null
          criado_em?: string
          id?: string
          mesa_id: string
          restaurante_id: string
          sessao_id?: string | null
          status?: Database["public"]["Enums"]["chamado_status"]
          tempo_atendimento_segundos?: number | null
          tipo_chamado_id: string
        }
        Update: {
          atendido_em?: string | null
          atendido_por?: string | null
          atualizado_em?: string
          cliente_id?: string | null
          comanda_id?: string | null
          criado_em?: string
          id?: string
          mesa_id?: string
          restaurante_id?: string
          sessao_id?: string | null
          status?: Database["public"]["Enums"]["chamado_status"]
          tempo_atendimento_segundos?: number | null
          tipo_chamado_id?: string
        }
        Relationships: []
      }
      clientes: {
        Row: {
          atualizado_em: string
          cashback_saldo: number
          criado_em: string
          enderecos: Json
          id: string
          nome: string
          pedidos_count: number
          restaurante_id: string
          telefone: string
          ticket_medio: number
          total_gasto: number
          ultima_visita: string | null
        }
        Insert: {
          atualizado_em?: string
          cashback_saldo?: number
          criado_em?: string
          enderecos?: Json
          id?: string
          nome: string
          pedidos_count?: number
          restaurante_id: string
          telefone: string
          ticket_medio?: number
          total_gasto?: number
          ultima_visita?: string | null
        }
        Update: {
          atualizado_em?: string
          cashback_saldo?: number
          criado_em?: string
          enderecos?: Json
          id?: string
          nome?: string
          pedidos_count?: number
          restaurante_id?: string
          telefone?: string
          ticket_medio?: number
          total_gasto?: number
          ultima_visita?: string | null
        }
        Relationships: []
      }
      comanda_couverts: {
        Row: {
          apresentacao_id: string | null
          comanda_id: string
          criado_em: string
          descricao: string | null
          id: string
          lancado_por: string | null
          quantidade: number
          restaurante_id: string
          tipo: string
          valor_unitario: number
        }
        Insert: {
          apresentacao_id?: string | null
          comanda_id: string
          criado_em?: string
          descricao?: string | null
          id?: string
          lancado_por?: string | null
          quantidade?: number
          restaurante_id: string
          tipo: string
          valor_unitario: number
        }
        Update: {
          apresentacao_id?: string | null
          comanda_id?: string
          criado_em?: string
          descricao?: string | null
          id?: string
          lancado_por?: string | null
          quantidade?: number
          restaurante_id?: string
          tipo?: string
          valor_unitario?: number
        }
        Relationships: [
          {
            foreignKeyName: "comanda_couverts_apresentacao_id_fkey"
            columns: ["apresentacao_id"]
            isOneToOne: false
            referencedRelation: "apresentacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comanda_couverts_comanda_id_fkey"
            columns: ["comanda_id"]
            isOneToOne: false
            referencedRelation: "comandas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comanda_couverts_restaurante_id_fkey"
            columns: ["restaurante_id"]
            isOneToOne: false
            referencedRelation: "restaurantes"
            referencedColumns: ["id"]
          },
        ]
      }
      comandas: {
        Row: {
          atualizado_em: string
          cashback_resgatado: number
          criado_em: string
          cupom_id: string | null
          desconto_cupom: number
          fechada_em: string | null
          id: string
          restaurante_id: string
          sessao_id: string
          status: Database["public"]["Enums"]["comanda_status"]
          subtotal: number
          taxa_servico_valor: number
          tipo: Database["public"]["Enums"]["comanda_tipo"]
          titular_cliente_id: string | null
          total: number
          total_pago: number
        }
        Insert: {
          atualizado_em?: string
          cashback_resgatado?: number
          criado_em?: string
          cupom_id?: string | null
          desconto_cupom?: number
          fechada_em?: string | null
          id?: string
          restaurante_id: string
          sessao_id: string
          status?: Database["public"]["Enums"]["comanda_status"]
          subtotal?: number
          taxa_servico_valor?: number
          tipo?: Database["public"]["Enums"]["comanda_tipo"]
          titular_cliente_id?: string | null
          total?: number
          total_pago?: number
        }
        Update: {
          atualizado_em?: string
          cashback_resgatado?: number
          criado_em?: string
          cupom_id?: string | null
          desconto_cupom?: number
          fechada_em?: string | null
          id?: string
          restaurante_id?: string
          sessao_id?: string
          status?: Database["public"]["Enums"]["comanda_status"]
          subtotal?: number
          taxa_servico_valor?: number
          tipo?: Database["public"]["Enums"]["comanda_tipo"]
          titular_cliente_id?: string | null
          total?: number
          total_pago?: number
        }
        Relationships: [
          {
            foreignKeyName: "comandas_sessao_id_fkey"
            columns: ["sessao_id"]
            isOneToOne: false
            referencedRelation: "mesa_sessoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comandas_titular_cliente_id_fkey"
            columns: ["titular_cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      comissoes: {
        Row: {
          calculado_em: string
          garcom_id: string
          id: string
          pago_em: string | null
          pago_por: string | null
          pedido_id: string
          percentual: number
          peso: number
          restaurante_id: string
          status: string
          valor_comissao: number
          valor_pedido: number
        }
        Insert: {
          calculado_em?: string
          garcom_id: string
          id?: string
          pago_em?: string | null
          pago_por?: string | null
          pedido_id: string
          percentual: number
          peso?: number
          restaurante_id: string
          status?: string
          valor_comissao: number
          valor_pedido: number
        }
        Update: {
          calculado_em?: string
          garcom_id?: string
          id?: string
          pago_em?: string | null
          pago_por?: string | null
          pedido_id?: string
          percentual?: number
          peso?: number
          restaurante_id?: string
          status?: string
          valor_comissao?: number
          valor_pedido?: number
        }
        Relationships: [
          {
            foreignKeyName: "comissoes_garcom_id_fkey"
            columns: ["garcom_id"]
            isOneToOne: false
            referencedRelation: "garcons"
            referencedColumns: ["id"]
          },
        ]
      }
      comissoes_taxa_servico: {
        Row: {
          calculado_em: string
          comanda_id: string
          garcom_id: string
          id: string
          pago_em: string | null
          pago_por: string | null
          percentual_repasse: number
          peso: number
          restaurante_id: string
          status: string
          valor_repasse: number
          valor_taxa_total: number
        }
        Insert: {
          calculado_em?: string
          comanda_id: string
          garcom_id: string
          id?: string
          pago_em?: string | null
          pago_por?: string | null
          percentual_repasse: number
          peso: number
          restaurante_id: string
          status?: string
          valor_repasse: number
          valor_taxa_total: number
        }
        Update: {
          calculado_em?: string
          comanda_id?: string
          garcom_id?: string
          id?: string
          pago_em?: string | null
          pago_por?: string | null
          percentual_repasse?: number
          peso?: number
          restaurante_id?: string
          status?: string
          valor_repasse?: number
          valor_taxa_total?: number
        }
        Relationships: [
          {
            foreignKeyName: "comissoes_taxa_servico_comanda_id_fkey"
            columns: ["comanda_id"]
            isOneToOne: false
            referencedRelation: "comandas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comissoes_taxa_servico_garcom_id_fkey"
            columns: ["garcom_id"]
            isOneToOne: false
            referencedRelation: "garcons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comissoes_taxa_servico_restaurante_id_fkey"
            columns: ["restaurante_id"]
            isOneToOne: false
            referencedRelation: "restaurantes"
            referencedColumns: ["id"]
          },
        ]
      }
      cumins: {
        Row: {
          ativo: boolean
          atualizado_em: string
          criado_em: string
          id: string
          nome: string
          restaurante_id: string
          telefone: string | null
          user_id: string | null
        }
        Insert: {
          ativo?: boolean
          atualizado_em?: string
          criado_em?: string
          id?: string
          nome: string
          restaurante_id: string
          telefone?: string | null
          user_id?: string | null
        }
        Update: {
          ativo?: boolean
          atualizado_em?: string
          criado_em?: string
          id?: string
          nome?: string
          restaurante_id?: string
          telefone?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cumins_restaurante_id_fkey"
            columns: ["restaurante_id"]
            isOneToOne: false
            referencedRelation: "restaurantes"
            referencedColumns: ["id"]
          },
        ]
      }
      cupons: {
        Row: {
          ativo: boolean
          atualizado_em: string
          codigo: string
          criado_em: string
          id: string
          regras_json: Json
          restaurante_id: string
          tipo: string
          uso_atual: number
          uso_max: number | null
          validade_fim: string | null
          validade_inicio: string | null
          valor: number
        }
        Insert: {
          ativo?: boolean
          atualizado_em?: string
          codigo: string
          criado_em?: string
          id?: string
          regras_json?: Json
          restaurante_id: string
          tipo?: string
          uso_atual?: number
          uso_max?: number | null
          validade_fim?: string | null
          validade_inicio?: string | null
          valor?: number
        }
        Update: {
          ativo?: boolean
          atualizado_em?: string
          codigo?: string
          criado_em?: string
          id?: string
          regras_json?: Json
          restaurante_id?: string
          tipo?: string
          uso_atual?: number
          uso_max?: number | null
          validade_fim?: string | null
          validade_inicio?: string | null
          valor?: number
        }
        Relationships: []
      }
      estoque_fichas: {
        Row: {
          criado_em: string
          id: string
          insumo_id: string
          preparo_id: string | null
          produto_id: string | null
          quantidade: number
          restaurante_id: string
        }
        Insert: {
          criado_em?: string
          id?: string
          insumo_id: string
          preparo_id?: string | null
          produto_id?: string | null
          quantidade: number
          restaurante_id: string
        }
        Update: {
          criado_em?: string
          id?: string
          insumo_id?: string
          preparo_id?: string | null
          produto_id?: string | null
          quantidade?: number
          restaurante_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "estoque_fichas_insumo_id_fkey"
            columns: ["insumo_id"]
            isOneToOne: false
            referencedRelation: "estoque_insumos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estoque_fichas_preparo_id_fkey"
            columns: ["preparo_id"]
            isOneToOne: false
            referencedRelation: "estoque_insumos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estoque_fichas_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estoque_fichas_restaurante_id_fkey"
            columns: ["restaurante_id"]
            isOneToOne: false
            referencedRelation: "restaurantes"
            referencedColumns: ["id"]
          },
        ]
      }
      estoque_insumos: {
        Row: {
          ativo: boolean
          atualizado_em: string
          bloquear_ao_zerar: boolean
          criado_em: string
          custo_medio: number
          estoque_minimo: number
          id: string
          is_preparo: boolean
          nome: string
          restaurante_id: string
          saldo: number
          unidade: string
        }
        Insert: {
          ativo?: boolean
          atualizado_em?: string
          bloquear_ao_zerar?: boolean
          criado_em?: string
          custo_medio?: number
          estoque_minimo?: number
          id?: string
          is_preparo?: boolean
          nome: string
          restaurante_id: string
          saldo?: number
          unidade?: string
        }
        Update: {
          ativo?: boolean
          atualizado_em?: string
          bloquear_ao_zerar?: boolean
          criado_em?: string
          custo_medio?: number
          estoque_minimo?: number
          id?: string
          is_preparo?: boolean
          nome?: string
          restaurante_id?: string
          saldo?: number
          unidade?: string
        }
        Relationships: [
          {
            foreignKeyName: "estoque_insumos_restaurante_id_fkey"
            columns: ["restaurante_id"]
            isOneToOne: false
            referencedRelation: "restaurantes"
            referencedColumns: ["id"]
          },
        ]
      }
      estoque_movimentos: {
        Row: {
          criado_em: string
          criado_por: string | null
          custo_unit: number | null
          fornecedor_id: string | null
          id: string
          insumo_id: string
          lancamento_id: string | null
          observacao: string | null
          pedido_id: string | null
          pedido_item_id: string | null
          quantidade: number
          restaurante_id: string
          saldo_apos: number
          tipo: string
        }
        Insert: {
          criado_em?: string
          criado_por?: string | null
          custo_unit?: number | null
          fornecedor_id?: string | null
          id?: string
          insumo_id: string
          lancamento_id?: string | null
          observacao?: string | null
          pedido_id?: string | null
          pedido_item_id?: string | null
          quantidade: number
          restaurante_id: string
          saldo_apos: number
          tipo: string
        }
        Update: {
          criado_em?: string
          criado_por?: string | null
          custo_unit?: number | null
          fornecedor_id?: string | null
          id?: string
          insumo_id?: string
          lancamento_id?: string | null
          observacao?: string | null
          pedido_id?: string | null
          pedido_item_id?: string | null
          quantidade?: number
          restaurante_id?: string
          saldo_apos?: number
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "estoque_movimentos_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "fornecedores_financeiro"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estoque_movimentos_insumo_id_fkey"
            columns: ["insumo_id"]
            isOneToOne: false
            referencedRelation: "estoque_insumos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estoque_movimentos_lancamento_id_fkey"
            columns: ["lancamento_id"]
            isOneToOne: false
            referencedRelation: "lancamentos_financeiros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estoque_movimentos_restaurante_id_fkey"
            columns: ["restaurante_id"]
            isOneToOne: false
            referencedRelation: "restaurantes"
            referencedColumns: ["id"]
          },
        ]
      }
      fornecedores_financeiro: {
        Row: {
          atualizado_em: string
          cnpj_cpf: string | null
          criado_em: string
          email: string | null
          id: string
          nome: string
          restaurante_id: string
          telefone: string | null
        }
        Insert: {
          atualizado_em?: string
          cnpj_cpf?: string | null
          criado_em?: string
          email?: string | null
          id?: string
          nome: string
          restaurante_id: string
          telefone?: string | null
        }
        Update: {
          atualizado_em?: string
          cnpj_cpf?: string | null
          criado_em?: string
          email?: string | null
          id?: string
          nome?: string
          restaurante_id?: string
          telefone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fornecedores_financeiro_restaurante_id_fkey"
            columns: ["restaurante_id"]
            isOneToOne: false
            referencedRelation: "restaurantes"
            referencedColumns: ["id"]
          },
        ]
      }
      garcom_bonus: {
        Row: {
          calculado_em: string
          detalhe_json: Json
          garcom_id: string
          id: string
          meta_id: string
          pago_em: string | null
          pago_por: string | null
          periodo_ref: string
          restaurante_id: string
          status: Database["public"]["Enums"]["garcom_bonus_status"]
          valor: number
        }
        Insert: {
          calculado_em?: string
          detalhe_json?: Json
          garcom_id: string
          id?: string
          meta_id: string
          pago_em?: string | null
          pago_por?: string | null
          periodo_ref: string
          restaurante_id: string
          status?: Database["public"]["Enums"]["garcom_bonus_status"]
          valor?: number
        }
        Update: {
          calculado_em?: string
          detalhe_json?: Json
          garcom_id?: string
          id?: string
          meta_id?: string
          pago_em?: string | null
          pago_por?: string | null
          periodo_ref?: string
          restaurante_id?: string
          status?: Database["public"]["Enums"]["garcom_bonus_status"]
          valor?: number
        }
        Relationships: []
      }
      garcom_metas: {
        Row: {
          alvo: number
          ativo: boolean
          atualizado_em: string
          bonus_percentual: number
          bonus_valor: number
          criado_em: string
          garcom_id: string
          id: string
          nome: string
          periodo: Database["public"]["Enums"]["garcom_meta_periodo"]
          regras_json: Json
          restaurante_id: string
          tipo: Database["public"]["Enums"]["garcom_meta_tipo"]
          vigencia_fim: string | null
          vigencia_inicio: string | null
        }
        Insert: {
          alvo?: number
          ativo?: boolean
          atualizado_em?: string
          bonus_percentual?: number
          bonus_valor?: number
          criado_em?: string
          garcom_id: string
          id?: string
          nome: string
          periodo?: Database["public"]["Enums"]["garcom_meta_periodo"]
          regras_json?: Json
          restaurante_id: string
          tipo: Database["public"]["Enums"]["garcom_meta_tipo"]
          vigencia_fim?: string | null
          vigencia_inicio?: string | null
        }
        Update: {
          alvo?: number
          ativo?: boolean
          atualizado_em?: string
          bonus_percentual?: number
          bonus_valor?: number
          criado_em?: string
          garcom_id?: string
          id?: string
          nome?: string
          periodo?: Database["public"]["Enums"]["garcom_meta_periodo"]
          regras_json?: Json
          restaurante_id?: string
          tipo?: Database["public"]["Enums"]["garcom_meta_tipo"]
          vigencia_fim?: string | null
          vigencia_inicio?: string | null
        }
        Relationships: []
      }
      garcom_turnos: {
        Row: {
          criado_em: string
          encerrado_auto: boolean
          encerrado_em: string | null
          encerrado_por: string | null
          garcom_id: string
          id: string
          iniciado_em: string
          iniciado_por: string | null
          restaurante_id: string
        }
        Insert: {
          criado_em?: string
          encerrado_auto?: boolean
          encerrado_em?: string | null
          encerrado_por?: string | null
          garcom_id: string
          id?: string
          iniciado_em?: string
          iniciado_por?: string | null
          restaurante_id: string
        }
        Update: {
          criado_em?: string
          encerrado_auto?: boolean
          encerrado_em?: string | null
          encerrado_por?: string | null
          garcom_id?: string
          id?: string
          iniciado_em?: string
          iniciado_por?: string | null
          restaurante_id?: string
        }
        Relationships: []
      }
      garcons: {
        Row: {
          ativo: boolean
          atualizado_em: string
          criado_em: string
          id: string
          nome: string
          percentual_comissao: number
          restaurante_id: string
          telefone: string | null
          user_id: string | null
        }
        Insert: {
          ativo?: boolean
          atualizado_em?: string
          criado_em?: string
          id?: string
          nome: string
          percentual_comissao?: number
          restaurante_id: string
          telefone?: string | null
          user_id?: string | null
        }
        Update: {
          ativo?: boolean
          atualizado_em?: string
          criado_em?: string
          id?: string
          nome?: string
          percentual_comissao?: number
          restaurante_id?: string
          telefone?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      ia_eventos: {
        Row: {
          cliente_id: string | null
          criado_em: string
          id: string
          payload_jsonb: Json
          restaurante_id: string
          tipo: string
        }
        Insert: {
          cliente_id?: string | null
          criado_em?: string
          id?: string
          payload_jsonb?: Json
          restaurante_id: string
          tipo: string
        }
        Update: {
          cliente_id?: string | null
          criado_em?: string
          id?: string
          payload_jsonb?: Json
          restaurante_id?: string
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "ia_eventos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      identificacao_tentativas: {
        Row: {
          criado_em: string
          escopo: string
          id: string
          ip_hash: string | null
          qr_token: string
          restaurante_id: string
          sucesso: boolean
          telefone_hash: string
        }
        Insert: {
          criado_em?: string
          escopo?: string
          id?: string
          ip_hash?: string | null
          qr_token: string
          restaurante_id: string
          sucesso?: boolean
          telefone_hash: string
        }
        Update: {
          criado_em?: string
          escopo?: string
          id?: string
          ip_hash?: string | null
          qr_token?: string
          restaurante_id?: string
          sucesso?: boolean
          telefone_hash?: string
        }
        Relationships: [
          {
            foreignKeyName: "identificacao_tentativas_restaurante_id_fkey"
            columns: ["restaurante_id"]
            isOneToOne: false
            referencedRelation: "restaurantes"
            referencedColumns: ["id"]
          },
        ]
      }
      lancamentos_financeiros: {
        Row: {
          atualizado_em: string
          categoria_id: string | null
          comprovante_url: string | null
          criado_em: string
          criado_por: string | null
          data_competencia: string
          data_pagamento: string | null
          data_vencimento: string
          descricao: string
          forma_pagamento: string | null
          fornecedor_id: string | null
          id: string
          observacao: string | null
          origem: string
          referencia_id: string | null
          restaurante_id: string
          status: string
          tipo: string
          valor: number
        }
        Insert: {
          atualizado_em?: string
          categoria_id?: string | null
          comprovante_url?: string | null
          criado_em?: string
          criado_por?: string | null
          data_competencia: string
          data_pagamento?: string | null
          data_vencimento: string
          descricao: string
          forma_pagamento?: string | null
          fornecedor_id?: string | null
          id?: string
          observacao?: string | null
          origem?: string
          referencia_id?: string | null
          restaurante_id: string
          status?: string
          tipo: string
          valor: number
        }
        Update: {
          atualizado_em?: string
          categoria_id?: string | null
          comprovante_url?: string | null
          criado_em?: string
          criado_por?: string | null
          data_competencia?: string
          data_pagamento?: string | null
          data_vencimento?: string
          descricao?: string
          forma_pagamento?: string | null
          fornecedor_id?: string | null
          id?: string
          observacao?: string | null
          origem?: string
          referencia_id?: string | null
          restaurante_id?: string
          status?: string
          tipo?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "lancamentos_financeiros_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "categorias_financeiras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lancamentos_financeiros_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "fornecedores_financeiro"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lancamentos_financeiros_restaurante_id_fkey"
            columns: ["restaurante_id"]
            isOneToOne: false
            referencedRelation: "restaurantes"
            referencedColumns: ["id"]
          },
        ]
      }
      lgpd_consentimentos: {
        Row: {
          aceito_em: string
          entidade_id: string
          entidade_tipo: string
          escopo: string
          id: string
          versao: string
        }
        Insert: {
          aceito_em?: string
          entidade_id: string
          entidade_tipo: string
          escopo: string
          id?: string
          versao?: string
        }
        Update: {
          aceito_em?: string
          entidade_id?: string
          entidade_tipo?: string
          escopo?: string
          id?: string
          versao?: string
        }
        Relationships: []
      }
      lgpd_cookies_consentimentos: {
        Row: {
          analise: boolean
          criado_em: string
          essenciais: boolean
          funcionais: boolean
          id: string
          origem: string
          versao: string
          visitante_id: string
        }
        Insert: {
          analise?: boolean
          criado_em?: string
          essenciais?: boolean
          funcionais?: boolean
          id?: string
          origem?: string
          versao: string
          visitante_id: string
        }
        Update: {
          analise?: boolean
          criado_em?: string
          essenciais?: boolean
          funcionais?: boolean
          id?: string
          origem?: string
          versao?: string
          visitante_id?: string
        }
        Relationships: []
      }
      lgpd_solicitacoes: {
        Row: {
          atualizado_em: string
          criado_em: string
          email: string
          id: string
          mensagem: string | null
          nome: string
          status: string
          telefone: string | null
          tipo: string
        }
        Insert: {
          atualizado_em?: string
          criado_em?: string
          email: string
          id?: string
          mensagem?: string | null
          nome: string
          status?: string
          telefone?: string | null
          tipo: string
        }
        Update: {
          atualizado_em?: string
          criado_em?: string
          email?: string
          id?: string
          mensagem?: string | null
          nome?: string
          status?: string
          telefone?: string | null
          tipo?: string
        }
        Relationships: []
      }
      mesa_garcom: {
        Row: {
          atribuido_em: string
          atribuido_por: string | null
          garcom_id: string
          id: string
          liberado_em: string | null
          liberado_por: string | null
          mesa_id: string
          restaurante_id: string
          sessao_id: string | null
        }
        Insert: {
          atribuido_em?: string
          atribuido_por?: string | null
          garcom_id: string
          id?: string
          liberado_em?: string | null
          liberado_por?: string | null
          mesa_id: string
          restaurante_id: string
          sessao_id?: string | null
        }
        Update: {
          atribuido_em?: string
          atribuido_por?: string | null
          garcom_id?: string
          id?: string
          liberado_em?: string | null
          liberado_por?: string | null
          mesa_id?: string
          restaurante_id?: string
          sessao_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mesa_garcom_garcom_id_fkey"
            columns: ["garcom_id"]
            isOneToOne: false
            referencedRelation: "garcons"
            referencedColumns: ["id"]
          },
        ]
      }
      mesa_sessao_clientes: {
        Row: {
          cliente_id: string
          comanda_id: string | null
          entrou_em: string
          id: string
          saiu_em: string | null
          sessao_id: string
        }
        Insert: {
          cliente_id: string
          comanda_id?: string | null
          entrou_em?: string
          id?: string
          saiu_em?: string | null
          sessao_id: string
        }
        Update: {
          cliente_id?: string
          comanda_id?: string | null
          entrou_em?: string
          id?: string
          saiu_em?: string | null
          sessao_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mesa_sessao_clientes_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mesa_sessao_clientes_comanda_id_fkey"
            columns: ["comanda_id"]
            isOneToOne: false
            referencedRelation: "comandas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mesa_sessao_clientes_sessao_id_fkey"
            columns: ["sessao_id"]
            isOneToOne: false
            referencedRelation: "mesa_sessoes"
            referencedColumns: ["id"]
          },
        ]
      }
      mesa_sessoes: {
        Row: {
          aberta_em: string
          atualizado_em: string
          criado_em: string
          fechada_em: string | null
          id: string
          mesa_id: string
          restaurante_id: string
          status: Database["public"]["Enums"]["mesa_sessao_status"]
        }
        Insert: {
          aberta_em?: string
          atualizado_em?: string
          criado_em?: string
          fechada_em?: string | null
          id?: string
          mesa_id: string
          restaurante_id: string
          status?: Database["public"]["Enums"]["mesa_sessao_status"]
        }
        Update: {
          aberta_em?: string
          atualizado_em?: string
          criado_em?: string
          fechada_em?: string | null
          id?: string
          mesa_id?: string
          restaurante_id?: string
          status?: Database["public"]["Enums"]["mesa_sessao_status"]
        }
        Relationships: []
      }
      mesas: {
        Row: {
          ativa: boolean
          criado_em: string
          id: string
          is_virtual: boolean
          numero: string
          qr_token: string
          restaurante_id: string
        }
        Insert: {
          ativa?: boolean
          criado_em?: string
          id?: string
          is_virtual?: boolean
          numero: string
          qr_token?: string
          restaurante_id: string
        }
        Update: {
          ativa?: boolean
          criado_em?: string
          id?: string
          is_virtual?: boolean
          numero?: string
          qr_token?: string
          restaurante_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mesas_restaurante_id_fkey"
            columns: ["restaurante_id"]
            isOneToOne: false
            referencedRelation: "restaurantes"
            referencedColumns: ["id"]
          },
        ]
      }
      movimentos_caixa: {
        Row: {
          criado_em: string
          id: string
          motivo: string | null
          operador_user_id: string
          restaurante_id: string
          tipo: Database["public"]["Enums"]["movimento_caixa_tipo"]
          turno_id: string
          valor: number
        }
        Insert: {
          criado_em?: string
          id?: string
          motivo?: string | null
          operador_user_id: string
          restaurante_id: string
          tipo: Database["public"]["Enums"]["movimento_caixa_tipo"]
          turno_id: string
          valor: number
        }
        Update: {
          criado_em?: string
          id?: string
          motivo?: string | null
          operador_user_id?: string
          restaurante_id?: string
          tipo?: Database["public"]["Enums"]["movimento_caixa_tipo"]
          turno_id?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "movimentos_caixa_turno_id_fkey"
            columns: ["turno_id"]
            isOneToOne: false
            referencedRelation: "turnos_caixa"
            referencedColumns: ["id"]
          },
        ]
      }
      pagamentos: {
        Row: {
          atualizado_em: string
          cliente_id: string | null
          comanda_id: string
          confirmado_em: string | null
          confirmado_por: string | null
          criado_em: string
          id: string
          metodo: Database["public"]["Enums"]["pagamento_metodo"]
          observacao: string | null
          restaurante_id: string
          sessao_id: string | null
          status: Database["public"]["Enums"]["pagamento_status"]
          valor: number
        }
        Insert: {
          atualizado_em?: string
          cliente_id?: string | null
          comanda_id: string
          confirmado_em?: string | null
          confirmado_por?: string | null
          criado_em?: string
          id?: string
          metodo: Database["public"]["Enums"]["pagamento_metodo"]
          observacao?: string | null
          restaurante_id: string
          sessao_id?: string | null
          status?: Database["public"]["Enums"]["pagamento_status"]
          valor: number
        }
        Update: {
          atualizado_em?: string
          cliente_id?: string | null
          comanda_id?: string
          confirmado_em?: string | null
          confirmado_por?: string | null
          criado_em?: string
          id?: string
          metodo?: Database["public"]["Enums"]["pagamento_metodo"]
          observacao?: string | null
          restaurante_id?: string
          sessao_id?: string | null
          status?: Database["public"]["Enums"]["pagamento_status"]
          valor?: number
        }
        Relationships: []
      }
      pedido_destino_status: {
        Row: {
          atualizado_em: string
          destino: Database["public"]["Enums"]["destino_preparo"]
          pedido_id: string
          status: Database["public"]["Enums"]["pedido_status"]
        }
        Insert: {
          atualizado_em?: string
          destino: Database["public"]["Enums"]["destino_preparo"]
          pedido_id: string
          status?: Database["public"]["Enums"]["pedido_status"]
        }
        Update: {
          atualizado_em?: string
          destino?: Database["public"]["Enums"]["destino_preparo"]
          pedido_id?: string
          status?: Database["public"]["Enums"]["pedido_status"]
        }
        Relationships: []
      }
      pedido_garcons: {
        Row: {
          criado_em: string
          garcom_id: string
          pedido_id: string
          peso: number
          restaurante_id: string
        }
        Insert: {
          criado_em?: string
          garcom_id: string
          pedido_id: string
          peso: number
          restaurante_id: string
        }
        Update: {
          criado_em?: string
          garcom_id?: string
          pedido_id?: string
          peso?: number
          restaurante_id?: string
        }
        Relationships: []
      }
      pedido_itens: {
        Row: {
          cliente_id: string | null
          cliente_nome: string | null
          criado_em: string
          destino: Database["public"]["Enums"]["destino_preparo"]
          id: string
          nome_produto: string
          observacao: string | null
          pedido_id: string
          preco_unit: number
          produto_id: string
          quantidade: number
          quantidade_pronta: number
          status: Database["public"]["Enums"]["pedido_item_status"]
        }
        Insert: {
          cliente_id?: string | null
          cliente_nome?: string | null
          criado_em?: string
          destino?: Database["public"]["Enums"]["destino_preparo"]
          id?: string
          nome_produto: string
          observacao?: string | null
          pedido_id: string
          preco_unit: number
          produto_id: string
          quantidade: number
          quantidade_pronta?: number
          status?: Database["public"]["Enums"]["pedido_item_status"]
        }
        Update: {
          cliente_id?: string | null
          cliente_nome?: string | null
          criado_em?: string
          destino?: Database["public"]["Enums"]["destino_preparo"]
          id?: string
          nome_produto?: string
          observacao?: string | null
          pedido_id?: string
          preco_unit?: number
          produto_id?: string
          quantidade?: number
          quantidade_pronta?: number
          status?: Database["public"]["Enums"]["pedido_item_status"]
        }
        Relationships: [
          {
            foreignKeyName: "pedido_itens_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pedido_itens_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "pedidos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pedido_itens_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
        ]
      }
      pedido_status_historico: {
        Row: {
          id: string
          mudou_em: string
          pedido_id: string
          restaurante_id: string
          status_anterior: Database["public"]["Enums"]["pedido_status"] | null
          status_novo: Database["public"]["Enums"]["pedido_status"]
        }
        Insert: {
          id?: string
          mudou_em?: string
          pedido_id: string
          restaurante_id: string
          status_anterior?: Database["public"]["Enums"]["pedido_status"] | null
          status_novo: Database["public"]["Enums"]["pedido_status"]
        }
        Update: {
          id?: string
          mudou_em?: string
          pedido_id?: string
          restaurante_id?: string
          status_anterior?: Database["public"]["Enums"]["pedido_status"] | null
          status_novo?: Database["public"]["Enums"]["pedido_status"]
        }
        Relationships: []
      }
      pedidos: {
        Row: {
          atualizado_em: string
          canal: string
          cashback_gerado: number
          cashback_resgatado: number
          cliente_id: string | null
          cliente_nome: string | null
          cliente_telefone: string | null
          comanda_id: string | null
          criado_em: string
          endereco_bairro: string | null
          endereco_cep: string | null
          endereco_cidade: string | null
          endereco_complemento: string | null
          endereco_numero: string | null
          endereco_referencia: string | null
          endereco_rua: string | null
          endereco_uf: string | null
          entregue_em: string | null
          entregue_por_cumim_id: string | null
          entregue_por_garcom_id: string | null
          garcom_id: string | null
          id: string
          mesa_id: string
          observacao: string | null
          origem: string
          previsao_entrega_min: number | null
          restaurante_id: string
          sessao_id: string | null
          status: Database["public"]["Enums"]["pedido_status"]
          taxa_entrega: number
          total: number
        }
        Insert: {
          atualizado_em?: string
          canal?: string
          cashback_gerado?: number
          cashback_resgatado?: number
          cliente_id?: string | null
          cliente_nome?: string | null
          cliente_telefone?: string | null
          comanda_id?: string | null
          criado_em?: string
          endereco_bairro?: string | null
          endereco_cep?: string | null
          endereco_cidade?: string | null
          endereco_complemento?: string | null
          endereco_numero?: string | null
          endereco_referencia?: string | null
          endereco_rua?: string | null
          endereco_uf?: string | null
          entregue_em?: string | null
          entregue_por_cumim_id?: string | null
          entregue_por_garcom_id?: string | null
          garcom_id?: string | null
          id?: string
          mesa_id: string
          observacao?: string | null
          origem?: string
          previsao_entrega_min?: number | null
          restaurante_id: string
          sessao_id?: string | null
          status?: Database["public"]["Enums"]["pedido_status"]
          taxa_entrega?: number
          total?: number
        }
        Update: {
          atualizado_em?: string
          canal?: string
          cashback_gerado?: number
          cashback_resgatado?: number
          cliente_id?: string | null
          cliente_nome?: string | null
          cliente_telefone?: string | null
          comanda_id?: string | null
          criado_em?: string
          endereco_bairro?: string | null
          endereco_cep?: string | null
          endereco_cidade?: string | null
          endereco_complemento?: string | null
          endereco_numero?: string | null
          endereco_referencia?: string | null
          endereco_rua?: string | null
          endereco_uf?: string | null
          entregue_em?: string | null
          entregue_por_cumim_id?: string | null
          entregue_por_garcom_id?: string | null
          garcom_id?: string | null
          id?: string
          mesa_id?: string
          observacao?: string | null
          origem?: string
          previsao_entrega_min?: number | null
          restaurante_id?: string
          sessao_id?: string | null
          status?: Database["public"]["Enums"]["pedido_status"]
          taxa_entrega?: number
          total?: number
        }
        Relationships: [
          {
            foreignKeyName: "pedidos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pedidos_comanda_id_fkey"
            columns: ["comanda_id"]
            isOneToOne: false
            referencedRelation: "comandas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pedidos_entregue_por_cumim_id_fkey"
            columns: ["entregue_por_cumim_id"]
            isOneToOne: false
            referencedRelation: "cumins"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pedidos_entregue_por_garcom_id_fkey"
            columns: ["entregue_por_garcom_id"]
            isOneToOne: false
            referencedRelation: "garcons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pedidos_garcom_id_fkey"
            columns: ["garcom_id"]
            isOneToOne: false
            referencedRelation: "garcons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pedidos_mesa_id_fkey"
            columns: ["mesa_id"]
            isOneToOne: false
            referencedRelation: "mesas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pedidos_restaurante_id_fkey"
            columns: ["restaurante_id"]
            isOneToOne: false
            referencedRelation: "restaurantes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pedidos_sessao_id_fkey"
            columns: ["sessao_id"]
            isOneToOne: false
            referencedRelation: "mesa_sessoes"
            referencedColumns: ["id"]
          },
        ]
      }
      plataforma_config: {
        Row: {
          atualizado_em: string
          criado_em: string
          id: string
          social_facebook: string | null
          social_facebook_ativo: boolean
          social_instagram: string | null
          social_instagram_ativo: boolean
          social_linkedin: string | null
          social_linkedin_ativo: boolean
          social_tiktok: string | null
          social_tiktok_ativo: boolean
          social_x: string | null
          social_x_ativo: boolean
          social_youtube: string | null
          social_youtube_ativo: boolean
          vendas_link: string | null
          vendas_mensagem: string | null
          vendas_whatsapp: string | null
        }
        Insert: {
          atualizado_em?: string
          criado_em?: string
          id?: string
          social_facebook?: string | null
          social_facebook_ativo?: boolean
          social_instagram?: string | null
          social_instagram_ativo?: boolean
          social_linkedin?: string | null
          social_linkedin_ativo?: boolean
          social_tiktok?: string | null
          social_tiktok_ativo?: boolean
          social_x?: string | null
          social_x_ativo?: boolean
          social_youtube?: string | null
          social_youtube_ativo?: boolean
          vendas_link?: string | null
          vendas_mensagem?: string | null
          vendas_whatsapp?: string | null
        }
        Update: {
          atualizado_em?: string
          criado_em?: string
          id?: string
          social_facebook?: string | null
          social_facebook_ativo?: boolean
          social_instagram?: string | null
          social_instagram_ativo?: boolean
          social_linkedin?: string | null
          social_linkedin_ativo?: boolean
          social_tiktok?: string | null
          social_tiktok_ativo?: boolean
          social_x?: string | null
          social_x_ativo?: boolean
          social_youtube?: string | null
          social_youtube_ativo?: boolean
          vendas_link?: string | null
          vendas_mensagem?: string | null
          vendas_whatsapp?: string | null
        }
        Relationships: []
      }
      platform_admins: {
        Row: {
          criado_em: string
          user_id: string
        }
        Insert: {
          criado_em?: string
          user_id: string
        }
        Update: {
          criado_em?: string
          user_id?: string
        }
        Relationships: []
      }
      produtos: {
        Row: {
          categoria_id: string | null
          comissao_aplicavel: boolean
          criado_em: string
          descricao: string | null
          destaque_upsell: boolean
          destino_override:
            | Database["public"]["Enums"]["destino_preparo"]
            | null
          disponivel: boolean
          estoque_bloqueado: boolean
          id: string
          imagem_url: string | null
          nome: string
          ordem: number
          percentual_comissao: number | null
          preco: number
          restaurante_id: string
        }
        Insert: {
          categoria_id?: string | null
          comissao_aplicavel?: boolean
          criado_em?: string
          descricao?: string | null
          destaque_upsell?: boolean
          destino_override?:
            | Database["public"]["Enums"]["destino_preparo"]
            | null
          disponivel?: boolean
          estoque_bloqueado?: boolean
          id?: string
          imagem_url?: string | null
          nome: string
          ordem?: number
          percentual_comissao?: number | null
          preco: number
          restaurante_id: string
        }
        Update: {
          categoria_id?: string | null
          comissao_aplicavel?: boolean
          criado_em?: string
          descricao?: string | null
          destaque_upsell?: boolean
          destino_override?:
            | Database["public"]["Enums"]["destino_preparo"]
            | null
          disponivel?: boolean
          estoque_bloqueado?: boolean
          id?: string
          imagem_url?: string | null
          nome?: string
          ordem?: number
          percentual_comissao?: number | null
          preco?: number
          restaurante_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "produtos_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "categorias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "produtos_restaurante_id_fkey"
            columns: ["restaurante_id"]
            isOneToOne: false
            referencedRelation: "restaurantes"
            referencedColumns: ["id"]
          },
        ]
      }
      programa_fidelidade: {
        Row: {
          ativo: boolean
          atualizado_em: string
          criado_em: string
          id: string
          percentual_cashback: number
          percentual_max_resgate: number
          regras_json: Json
          restaurante_id: string
          validade_dias: number
          valor_minimo_pedido: number
        }
        Insert: {
          ativo?: boolean
          atualizado_em?: string
          criado_em?: string
          id?: string
          percentual_cashback?: number
          percentual_max_resgate?: number
          regras_json?: Json
          restaurante_id: string
          validade_dias?: number
          valor_minimo_pedido?: number
        }
        Update: {
          ativo?: boolean
          atualizado_em?: string
          criado_em?: string
          id?: string
          percentual_cashback?: number
          percentual_max_resgate?: number
          regras_json?: Json
          restaurante_id?: string
          validade_dias?: number
          valor_minimo_pedido?: number
        }
        Relationships: []
      }
      repasses_couvert_artistico: {
        Row: {
          apresentacao_id: string
          artista_id: string
          calculado_em: string
          id: string
          pago_em: string | null
          pago_por: string | null
          percentual_repasse: number
          peso: number
          restaurante_id: string
          status: string
          valor_couvert_total: number
          valor_repasse: number
        }
        Insert: {
          apresentacao_id: string
          artista_id: string
          calculado_em?: string
          id?: string
          pago_em?: string | null
          pago_por?: string | null
          percentual_repasse?: number
          peso?: number
          restaurante_id: string
          status?: string
          valor_couvert_total?: number
          valor_repasse?: number
        }
        Update: {
          apresentacao_id?: string
          artista_id?: string
          calculado_em?: string
          id?: string
          pago_em?: string | null
          pago_por?: string | null
          percentual_repasse?: number
          peso?: number
          restaurante_id?: string
          status?: string
          valor_couvert_total?: number
          valor_repasse?: number
        }
        Relationships: [
          {
            foreignKeyName: "repasses_couvert_artistico_apresentacao_id_fkey"
            columns: ["apresentacao_id"]
            isOneToOne: false
            referencedRelation: "apresentacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "repasses_couvert_artistico_artista_id_fkey"
            columns: ["artista_id"]
            isOneToOne: false
            referencedRelation: "artistas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "repasses_couvert_artistico_restaurante_id_fkey"
            columns: ["restaurante_id"]
            isOneToOne: false
            referencedRelation: "restaurantes"
            referencedColumns: ["id"]
          },
        ]
      }
      restaurante_membros: {
        Row: {
          criado_em: string
          id: string
          papel: Database["public"]["Enums"]["app_role"]
          restaurante_id: string
          user_id: string
        }
        Insert: {
          criado_em?: string
          id?: string
          papel?: Database["public"]["Enums"]["app_role"]
          restaurante_id: string
          user_id: string
        }
        Update: {
          criado_em?: string
          id?: string
          papel?: Database["public"]["Enums"]["app_role"]
          restaurante_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "restaurante_membros_restaurante_id_fkey"
            columns: ["restaurante_id"]
            isOneToOne: false
            referencedRelation: "restaurantes"
            referencedColumns: ["id"]
          },
        ]
      }
      restaurantes: {
        Row: {
          ativo: boolean
          banners_habilitados: boolean
          caixa_alerta_horas: number
          caixa_conferencia_cega: boolean
          caixa_obrigatorio_para_pagamento: boolean
          caixa_teto_dinheiro: number | null
          cnpj: string | null
          comissao_ativa: boolean
          comissao_modo: string
          comissao_pedido_cliente: boolean
          comissao_pedido_cliente_percentual: number | null
          comissao_rateio_troca_turno: boolean
          contrato_bloqueio_automatico: boolean
          contrato_notas: string | null
          contrato_vencimento_em: string | null
          cor_acento: string | null
          cor_primaria: string | null
          cor_secundaria: string | null
          couvert_artistico_descricao: string | null
          couvert_artistico_habilitado: boolean
          couvert_artistico_repasse_habilitado: boolean
          couvert_artistico_repasse_percentual: number | null
          couvert_artistico_valor: number | null
          couvert_mesa_descricao: string | null
          couvert_mesa_habilitado: boolean
          couvert_mesa_valor: number | null
          criado_em: string
          delivery_aceita_cartao_entrega: boolean
          delivery_aceita_dinheiro: boolean
          delivery_aceita_pix: boolean
          delivery_ativo: boolean
          delivery_pedido_minimo: number
          delivery_raio_km: number | null
          delivery_retirada_ativa: boolean
          delivery_slug: string | null
          delivery_taxa_entrega: number
          delivery_tempo_estimado_min: number
          delivery_whatsapp: string | null
          endereco: string | null
          estoque_ativo: boolean
          horario_funcionamento: Json
          id: string
          impressao_auto_bar: boolean
          impressao_auto_cozinha: boolean
          logo_url: string | null
          nome: string
          permitir_atendimento_cruzado: boolean
          pix_chave: string | null
          pix_habilitado: boolean
          pix_nome_titular: string | null
          sessao_ociosa_horas: number
          slug: string
          taxa_servico_descricao: string | null
          taxa_servico_habilitada: boolean
          taxa_servico_percentual: number | null
          taxa_servico_repasse_habilitado: boolean
          taxa_servico_repasse_percentual: number | null
          telefone: string | null
          tema_cardapio: string
          upsell_habilitado: boolean
          url_publica_cardapio: string | null
          usa_cumim: boolean
        }
        Insert: {
          ativo?: boolean
          banners_habilitados?: boolean
          caixa_alerta_horas?: number
          caixa_conferencia_cega?: boolean
          caixa_obrigatorio_para_pagamento?: boolean
          caixa_teto_dinheiro?: number | null
          cnpj?: string | null
          comissao_ativa?: boolean
          comissao_modo?: string
          comissao_pedido_cliente?: boolean
          comissao_pedido_cliente_percentual?: number | null
          comissao_rateio_troca_turno?: boolean
          contrato_bloqueio_automatico?: boolean
          contrato_notas?: string | null
          contrato_vencimento_em?: string | null
          cor_acento?: string | null
          cor_primaria?: string | null
          cor_secundaria?: string | null
          couvert_artistico_descricao?: string | null
          couvert_artistico_habilitado?: boolean
          couvert_artistico_repasse_habilitado?: boolean
          couvert_artistico_repasse_percentual?: number | null
          couvert_artistico_valor?: number | null
          couvert_mesa_descricao?: string | null
          couvert_mesa_habilitado?: boolean
          couvert_mesa_valor?: number | null
          criado_em?: string
          delivery_aceita_cartao_entrega?: boolean
          delivery_aceita_dinheiro?: boolean
          delivery_aceita_pix?: boolean
          delivery_ativo?: boolean
          delivery_pedido_minimo?: number
          delivery_raio_km?: number | null
          delivery_retirada_ativa?: boolean
          delivery_slug?: string | null
          delivery_taxa_entrega?: number
          delivery_tempo_estimado_min?: number
          delivery_whatsapp?: string | null
          endereco?: string | null
          estoque_ativo?: boolean
          horario_funcionamento?: Json
          id?: string
          impressao_auto_bar?: boolean
          impressao_auto_cozinha?: boolean
          logo_url?: string | null
          nome: string
          permitir_atendimento_cruzado?: boolean
          pix_chave?: string | null
          pix_habilitado?: boolean
          pix_nome_titular?: string | null
          sessao_ociosa_horas?: number
          slug: string
          taxa_servico_descricao?: string | null
          taxa_servico_habilitada?: boolean
          taxa_servico_percentual?: number | null
          taxa_servico_repasse_habilitado?: boolean
          taxa_servico_repasse_percentual?: number | null
          telefone?: string | null
          tema_cardapio?: string
          upsell_habilitado?: boolean
          url_publica_cardapio?: string | null
          usa_cumim?: boolean
        }
        Update: {
          ativo?: boolean
          banners_habilitados?: boolean
          caixa_alerta_horas?: number
          caixa_conferencia_cega?: boolean
          caixa_obrigatorio_para_pagamento?: boolean
          caixa_teto_dinheiro?: number | null
          cnpj?: string | null
          comissao_ativa?: boolean
          comissao_modo?: string
          comissao_pedido_cliente?: boolean
          comissao_pedido_cliente_percentual?: number | null
          comissao_rateio_troca_turno?: boolean
          contrato_bloqueio_automatico?: boolean
          contrato_notas?: string | null
          contrato_vencimento_em?: string | null
          cor_acento?: string | null
          cor_primaria?: string | null
          cor_secundaria?: string | null
          couvert_artistico_descricao?: string | null
          couvert_artistico_habilitado?: boolean
          couvert_artistico_repasse_habilitado?: boolean
          couvert_artistico_repasse_percentual?: number | null
          couvert_artistico_valor?: number | null
          couvert_mesa_descricao?: string | null
          couvert_mesa_habilitado?: boolean
          couvert_mesa_valor?: number | null
          criado_em?: string
          delivery_aceita_cartao_entrega?: boolean
          delivery_aceita_dinheiro?: boolean
          delivery_aceita_pix?: boolean
          delivery_ativo?: boolean
          delivery_pedido_minimo?: number
          delivery_raio_km?: number | null
          delivery_retirada_ativa?: boolean
          delivery_slug?: string | null
          delivery_taxa_entrega?: number
          delivery_tempo_estimado_min?: number
          delivery_whatsapp?: string | null
          endereco?: string | null
          estoque_ativo?: boolean
          horario_funcionamento?: Json
          id?: string
          impressao_auto_bar?: boolean
          impressao_auto_cozinha?: boolean
          logo_url?: string | null
          nome?: string
          permitir_atendimento_cruzado?: boolean
          pix_chave?: string | null
          pix_habilitado?: boolean
          pix_nome_titular?: string | null
          sessao_ociosa_horas?: number
          slug?: string
          taxa_servico_descricao?: string | null
          taxa_servico_habilitada?: boolean
          taxa_servico_percentual?: number | null
          taxa_servico_repasse_habilitado?: boolean
          taxa_servico_repasse_percentual?: number | null
          telefone?: string | null
          tema_cardapio?: string
          upsell_habilitado?: boolean
          url_publica_cardapio?: string | null
          usa_cumim?: boolean
        }
        Relationships: []
      }
      tipos_chamado: {
        Row: {
          ativo: boolean
          atualizado_em: string
          criado_em: string
          icone: string
          id: string
          nome: string
          ordem: number
          restaurante_id: string
        }
        Insert: {
          ativo?: boolean
          atualizado_em?: string
          criado_em?: string
          icone?: string
          id?: string
          nome: string
          ordem?: number
          restaurante_id: string
        }
        Update: {
          ativo?: boolean
          atualizado_em?: string
          criado_em?: string
          icone?: string
          id?: string
          nome?: string
          ordem?: number
          restaurante_id?: string
        }
        Relationships: []
      }
      turnos_caixa: {
        Row: {
          aberto_em: string
          atualizado_em: string
          contagem_fisica: number | null
          criado_em: string
          diferenca: number | null
          fechado_em: string | null
          fundo_final: number | null
          fundo_inicial: number
          id: string
          obs_fechamento: string | null
          operador_nome: string
          operador_user_id: string
          restaurante_id: string
          snapshot_qtd_pedidos: number | null
          snapshot_total_cartao: number | null
          snapshot_total_dinheiro: number | null
          snapshot_total_fiado: number | null
          snapshot_total_outro: number | null
          snapshot_total_pix: number | null
          snapshot_total_sangrias: number | null
          snapshot_total_suprimentos: number | null
          snapshot_total_vendas: number | null
          status: Database["public"]["Enums"]["turno_caixa_status"]
        }
        Insert: {
          aberto_em?: string
          atualizado_em?: string
          contagem_fisica?: number | null
          criado_em?: string
          diferenca?: number | null
          fechado_em?: string | null
          fundo_final?: number | null
          fundo_inicial?: number
          id?: string
          obs_fechamento?: string | null
          operador_nome: string
          operador_user_id: string
          restaurante_id: string
          snapshot_qtd_pedidos?: number | null
          snapshot_total_cartao?: number | null
          snapshot_total_dinheiro?: number | null
          snapshot_total_fiado?: number | null
          snapshot_total_outro?: number | null
          snapshot_total_pix?: number | null
          snapshot_total_sangrias?: number | null
          snapshot_total_suprimentos?: number | null
          snapshot_total_vendas?: number | null
          status?: Database["public"]["Enums"]["turno_caixa_status"]
        }
        Update: {
          aberto_em?: string
          atualizado_em?: string
          contagem_fisica?: number | null
          criado_em?: string
          diferenca?: number | null
          fechado_em?: string | null
          fundo_final?: number | null
          fundo_inicial?: number
          id?: string
          obs_fechamento?: string | null
          operador_nome?: string
          operador_user_id?: string
          restaurante_id?: string
          snapshot_qtd_pedidos?: number | null
          snapshot_total_cartao?: number | null
          snapshot_total_dinheiro?: number | null
          snapshot_total_fiado?: number | null
          snapshot_total_outro?: number | null
          snapshot_total_pix?: number | null
          snapshot_total_sangrias?: number | null
          snapshot_total_suprimentos?: number | null
          snapshot_total_vendas?: number | null
          status?: Database["public"]["Enums"]["turno_caixa_status"]
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      abrir_turno_caixa: {
        Args: {
          _fundo_inicial: number
          _operador_nome: string
          _restaurante_id: string
        }
        Returns: string
      }
      abrir_turno_garcom: { Args: { _garcom_id: string }; Returns: string }
      ajustar_descontos_comanda: {
        Args: { _comanda_id: string }
        Returns: undefined
      }
      aplicar_bloqueio_contratos: { Args: never; Returns: number }
      aplicar_cashback: {
        Args: { _cliente_id: string; _comanda_id: string; _valor: number }
        Returns: Json
      }
      aplicar_cupom_comanda: {
        Args: { _cliente_id?: string; _codigo: string; _comanda_id: string }
        Returns: Json
      }
      atribuir_garcom_mesa: {
        Args: { _garcom_id: string; _mesa_id: string; _sessao_id?: string }
        Returns: string
      }
      atualizar_status_destino: {
        Args: {
          _destino: Database["public"]["Enums"]["destino_preparo"]
          _pedido_id: string
          _status: Database["public"]["Enums"]["pedido_status"]
        }
        Returns: undefined
      }
      calcular_bonus_garcom: {
        Args: { _meta_id: string; _periodo_ref: string }
        Returns: number
      }
      calcular_bonus_restaurante: {
        Args: { _periodo_ref?: string; _restaurante_id: string }
        Returns: number
      }
      cancelar_item_pedido: {
        Args: { _item_id: string; _motivo?: string }
        Returns: undefined
      }
      cancelar_pedido: {
        Args: { _motivo?: string; _pedido_id: string }
        Returns: undefined
      }
      confirmar_pagamento: {
        Args: { _pagamento_id: string }
        Returns: undefined
      }
      creditar_cashback_pedido: {
        Args: { _pedido_id: string }
        Returns: number
      }
      criar_pedido_garcom: {
        Args: {
          _cliente_id: string
          _comanda_id: string
          _garcom_id: string
          _itens: Json
          _mesa_id: string
          _observacao: string
          _restaurante_id: string
          _total: number
        }
        Returns: Json
      }
      criar_pedido_publico: {
        Args: {
          _cliente_id: string
          _comanda_id: string
          _itens: Json
          _mesa_id: string
          _observacao: string
          _restaurante_id: string
          _sessao_id: string
          _total: number
        }
        Returns: string
      }
      dashboard_admin_resumo: {
        Args: { _restaurante_id: string }
        Returns: Json
      }
      dashboard_metricas_operacionais: {
        Args: { _periodo?: string; _restaurante_id: string }
        Returns: Json
      }
      dashboard_produtos_top: {
        Args: { _limit?: number; _periodo?: string; _restaurante_id: string }
        Returns: Json
      }
      dashboard_superadmin_resumo: { Args: never; Returns: Json }
      dashboard_ticket_medio_mesa: {
        Args: { _periodo?: string; _restaurante_id: string }
        Returns: Json
      }
      definir_garcons_pedido: {
        Args: { _items: Json; _pedido_id: string }
        Returns: undefined
      }
      derivar_pedido_status: {
        Args: { _pedido_id: string }
        Returns: undefined
      }
      encerrar_sessoes_ociosas: { Args: never; Returns: number }
      encerrar_turno_garcom: { Args: { _garcom_id: string }; Returns: number }
      encerrar_turnos_expirados: { Args: never; Returns: number }
      estoque_aplicar_inventario: {
        Args: { _itens: Json; _observacao?: string; _restaurante_id: string }
        Returns: number
      }
      estoque_assert_acesso: {
        Args: { _restaurante_id: string }
        Returns: undefined
      }
      estoque_custo_produtos: {
        Args: { _restaurante_id: string }
        Returns: Json
      }
      estoque_estornar_item: { Args: { _item_id: string }; Returns: undefined }
      estoque_mov_interno: {
        Args: {
          _custo_unit: number
          _fornecedor_id: string
          _insumo_id: string
          _item_id: string
          _lancamento_id: string
          _obs: string
          _pedido_id: string
          _qtd: number
          _tipo: string
        }
        Returns: string
      }
      estoque_produzir_preparo: {
        Args: { _observacao?: string; _preparo_id: string; _quantidade: number }
        Returns: undefined
      }
      estoque_recalc_bloqueio: {
        Args: { _restaurante_id: string }
        Returns: undefined
      }
      estoque_registrar_movimento: {
        Args: {
          _custo_unit?: number
          _fornecedor_id?: string
          _gerar_conta?: boolean
          _insumo_id: string
          _observacao?: string
          _quantidade: number
          _tipo: string
          _vencimento?: string
        }
        Returns: string
      }
      estoque_resumo: { Args: { _restaurante_id: string }; Returns: Json }
      fechar_comanda_se_quitada: {
        Args: { _comanda_id: string }
        Returns: boolean
      }
      fechar_turno_caixa: {
        Args: {
          _contagem_fisica: number
          _fundo_final: number
          _obs: string
          _turno_id: string
        }
        Returns: Json
      }
      fin_assert_acesso: {
        Args: { _restaurante_id: string }
        Returns: undefined
      }
      gerar_comissao_comanda: {
        Args: { _comanda_id: string }
        Returns: undefined
      }
      gerar_pedido_garcons: {
        Args: { _mesa_id: string; _pedido_id: string; _restaurante_id: string }
        Returns: number
      }
      gerar_repasse_couvert_artistico: {
        Args: { p_apresentacao_id: string }
        Returns: number
      }
      gerar_repasse_taxa_servico: {
        Args: { p_comanda_id: string }
        Returns: undefined
      }
      integrar_repasses_caixa_financeiro: {
        Args: { _restaurante_id: string }
        Returns: number
      }
      is_platform_admin: { Args: { _user_id: string }; Returns: boolean }
      is_restaurante_membro: {
        Args: { _restaurante_id: string; _user_id: string }
        Returns: boolean
      }
      liberar_garcom_mesa: { Args: { _mesa_id: string }; Returns: undefined }
      limpar_identificacao_tentativas: { Args: never; Returns: number }
      metricas_chamados: { Args: { _restaurante_id: string }; Returns: Json }
      obter_dre_gerencial: {
        Args: { _fim: string; _inicio: string; _restaurante_id: string }
        Returns: Json
      }
      obter_fluxo_caixa: {
        Args: {
          _agrupamento?: string
          _fim: string
          _inicio: string
          _restaurante_id: string
        }
        Returns: Json
      }
      obter_resumo_financeiro: {
        Args: { _fim: string; _inicio: string; _restaurante_id: string }
        Returns: Json
      }
      pagar_bonus: { Args: { _ids: string[] }; Returns: number }
      pagar_comissoes: { Args: { _ids: string[] }; Returns: number }
      pagar_repasses_couvert_artistico: {
        Args: { _ids: string[] }
        Returns: number
      }
      periodo_range: {
        Args: {
          _periodo: Database["public"]["Enums"]["garcom_meta_periodo"]
          _ref: string
        }
        Returns: {
          fim: string
          inicio: string
        }[]
      }
      pode_operar_caixa: {
        Args: { _restaurante_id: string; _user_id: string }
        Returns: boolean
      }
      recalcular_couvert_comanda: {
        Args: { _comanda_id: string }
        Returns: undefined
      }
      recalcular_total_comanda: {
        Args: { _comanda_id: string }
        Returns: undefined
      }
      recomputar_destino_status: {
        Args: {
          _destino: Database["public"]["Enums"]["destino_preparo"]
          _pedido_id: string
        }
        Returns: undefined
      }
      registrar_movimento_caixa: {
        Args: {
          _motivo: string
          _tipo: Database["public"]["Enums"]["movimento_caixa_tipo"]
          _turno_id: string
          _valor: number
        }
        Returns: string
      }
      registrar_pagamento: {
        Args: {
          _comanda_id: string
          _metodo: Database["public"]["Enums"]["pagamento_metodo"]
          _observacao?: string
          _valor: number
        }
        Returns: string
      }
      remover_cupom_comanda: {
        Args: { _comanda_id: string }
        Returns: undefined
      }
      remover_garcom_mesa: {
        Args: { _garcom_id: string; _mesa_id: string }
        Returns: number
      }
      restaurante_aberto_agora: {
        Args: { _restaurante_id: string }
        Returns: boolean
      }
      resumo_comissoes: { Args: { _restaurante_id: string }; Returns: Json }
      seed_categorias_financeiras: {
        Args: { _restaurante_id: string }
        Returns: undefined
      }
      totais_turno_caixa: { Args: { _turno_id: string }; Returns: Json }
      unaccent: { Args: { "": string }; Returns: string }
      validar_cupom: {
        Args: {
          _cliente_id?: string
          _codigo: string
          _restaurante_id: string
          _subtotal: number
        }
        Returns: Json
      }
    }
    Enums: {
      app_role:
        | "admin"
        | "staff"
        | "cozinheiro"
        | "garcom"
        | "bar"
        | "caixa"
        | "cumim"
      campanha_canal: "whatsapp" | "email" | "sms"
      campanha_status:
        | "rascunho"
        | "agendada"
        | "enviando"
        | "enviada"
        | "cancelada"
      cashback_movimento_tipo: "credito" | "resgate" | "ajuste" | "expiracao"
      chamado_status: "pendente" | "atendido" | "cancelado"
      comanda_status: "aberta" | "fechada"
      comanda_tipo: "individual" | "compartilhada"
      destino_preparo: "cozinha" | "bar"
      garcom_bonus_status: "pendente" | "pago"
      garcom_meta_periodo: "diario" | "semanal" | "mensal"
      garcom_meta_tipo: "faturamento" | "pedidos" | "horario"
      mesa_sessao_status: "aberta" | "fechada"
      movimento_caixa_tipo: "abertura" | "sangria" | "suprimento" | "fechamento"
      pagamento_metodo: "pix" | "dinheiro" | "outro" | "cartao" | "fiado"
      pagamento_status: "pendente" | "confirmado" | "cancelado"
      pedido_item_status: "pendente" | "em_preparo" | "pronto"
      pedido_status:
        | "recebido"
        | "em_preparo"
        | "pronto"
        | "entregue"
        | "cancelado"
      turno_caixa_status: "aberto" | "fechado"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: [
        "admin",
        "staff",
        "cozinheiro",
        "garcom",
        "bar",
        "caixa",
        "cumim",
      ],
      campanha_canal: ["whatsapp", "email", "sms"],
      campanha_status: [
        "rascunho",
        "agendada",
        "enviando",
        "enviada",
        "cancelada",
      ],
      cashback_movimento_tipo: ["credito", "resgate", "ajuste", "expiracao"],
      chamado_status: ["pendente", "atendido", "cancelado"],
      comanda_status: ["aberta", "fechada"],
      comanda_tipo: ["individual", "compartilhada"],
      destino_preparo: ["cozinha", "bar"],
      garcom_bonus_status: ["pendente", "pago"],
      garcom_meta_periodo: ["diario", "semanal", "mensal"],
      garcom_meta_tipo: ["faturamento", "pedidos", "horario"],
      mesa_sessao_status: ["aberta", "fechada"],
      movimento_caixa_tipo: ["abertura", "sangria", "suprimento", "fechamento"],
      pagamento_metodo: ["pix", "dinheiro", "outro", "cartao", "fiado"],
      pagamento_status: ["pendente", "confirmado", "cancelado"],
      pedido_item_status: ["pendente", "em_preparo", "pronto"],
      pedido_status: [
        "recebido",
        "em_preparo",
        "pronto",
        "entregue",
        "cancelado",
      ],
      turno_caixa_status: ["aberto", "fechado"],
    },
  },
} as const
