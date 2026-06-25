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
      activities: {
        Row: {
          created_at: string
          descricao: string | null
          id: string
          lead_id: string | null
          ocorreu_em: string
          profile_id: string | null
          tipo: Database["public"]["Enums"]["activity_type"]
        }
        Insert: {
          created_at?: string
          descricao?: string | null
          id?: string
          lead_id?: string | null
          ocorreu_em?: string
          profile_id?: string | null
          tipo: Database["public"]["Enums"]["activity_type"]
        }
        Update: {
          created_at?: string
          descricao?: string | null
          id?: string
          lead_id?: string | null
          ocorreu_em?: string
          profile_id?: string | null
          tipo?: Database["public"]["Enums"]["activity_type"]
        }
        Relationships: [
          {
            foreignKeyName: "activities_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      behavior_profiles: {
        Row: {
          arquivo_nome: string | null
          arquivo_url: string | null
          como_cobrar: string | null
          como_conduzir_feedback: string | null
          como_liderar: string | null
          como_reconhecer: string | null
          conformidade: number | null
          created_at: string
          dominancia: number | null
          estabilidade: number | null
          gatilhos_desmotivacao: string | null
          gatilhos_motivacionais: string | null
          id: string
          influencia: number | null
          perfil_resumido: string | null
          pontos_atencao: string | null
          pontos_fortes: string | null
          profile_id: string
          updated_at: string
        }
        Insert: {
          arquivo_nome?: string | null
          arquivo_url?: string | null
          como_cobrar?: string | null
          como_conduzir_feedback?: string | null
          como_liderar?: string | null
          como_reconhecer?: string | null
          conformidade?: number | null
          created_at?: string
          dominancia?: number | null
          estabilidade?: number | null
          gatilhos_desmotivacao?: string | null
          gatilhos_motivacionais?: string | null
          id?: string
          influencia?: number | null
          perfil_resumido?: string | null
          pontos_atencao?: string | null
          pontos_fortes?: string | null
          profile_id: string
          updated_at?: string
        }
        Update: {
          arquivo_nome?: string | null
          arquivo_url?: string | null
          como_cobrar?: string | null
          como_conduzir_feedback?: string | null
          como_liderar?: string | null
          como_reconhecer?: string | null
          conformidade?: number | null
          created_at?: string
          dominancia?: number | null
          estabilidade?: number | null
          gatilhos_desmotivacao?: string | null
          gatilhos_motivacionais?: string | null
          id?: string
          influencia?: number | null
          perfil_resumido?: string | null
          pontos_atencao?: string | null
          pontos_fortes?: string | null
          profile_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "behavior_profiles_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      cancellations: {
        Row: {
          created_at: string
          external_id: string | null
          external_source: string | null
          id: string
          metadata: Json | null
          motivo: string | null
          ocorreu_em: string
          pais: string | null
          produto: string | null
          produto_grupo: string | null
          profile_id: string | null
          sale_id: string | null
          valor: number
        }
        Insert: {
          created_at?: string
          external_id?: string | null
          external_source?: string | null
          id?: string
          metadata?: Json | null
          motivo?: string | null
          ocorreu_em?: string
          pais?: string | null
          produto?: string | null
          produto_grupo?: string | null
          profile_id?: string | null
          sale_id?: string | null
          valor?: number
        }
        Update: {
          created_at?: string
          external_id?: string | null
          external_source?: string | null
          id?: string
          metadata?: Json | null
          motivo?: string | null
          ocorreu_em?: string
          pais?: string | null
          produto?: string | null
          produto_grupo?: string | null
          profile_id?: string | null
          sale_id?: string | null
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "cancellations_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cancellations_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      clint_funil_snapshots: {
        Row: {
          capturado_em: string
          created_at: string
          dados: Json
          id: string
          tipo: string
        }
        Insert: {
          capturado_em?: string
          created_at?: string
          dados: Json
          id?: string
          tipo: string
        }
        Update: {
          capturado_em?: string
          created_at?: string
          dados?: Json
          id?: string
          tipo?: string
        }
        Relationships: []
      }
      clint_vendedor_metricas: {
        Row: {
          capturado_em: string
          created_at: string
          emails: number
          id: string
          ligacoes: number
          metadata: Json | null
          negocios_ganhos: number
          negocios_perdidos: number
          negocios_total: number
          no_show: number
          profile_id: string | null
          reunioes_agendadas: number
          reunioes_realizadas: number
          tarefas: number
          taxa_conversao: number | null
          user_name: string
          whatsapp: number
        }
        Insert: {
          capturado_em?: string
          created_at?: string
          emails?: number
          id?: string
          ligacoes?: number
          metadata?: Json | null
          negocios_ganhos?: number
          negocios_perdidos?: number
          negocios_total?: number
          no_show?: number
          profile_id?: string | null
          reunioes_agendadas?: number
          reunioes_realizadas?: number
          tarefas?: number
          taxa_conversao?: number | null
          user_name: string
          whatsapp?: number
        }
        Update: {
          capturado_em?: string
          created_at?: string
          emails?: number
          id?: string
          ligacoes?: number
          metadata?: Json | null
          negocios_ganhos?: number
          negocios_perdidos?: number
          negocios_total?: number
          no_show?: number
          profile_id?: string | null
          reunioes_agendadas?: number
          reunioes_realizadas?: number
          tarefas?: number
          taxa_conversao?: number | null
          user_name?: string
          whatsapp?: number
        }
        Relationships: [
          {
            foreignKeyName: "clint_vendedor_metricas_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      coaching_actions: {
        Row: {
          created_at: string
          created_by: string | null
          descricao: string | null
          id: string
          ocorreu_em: string
          profile_id: string
          tipo: Database["public"]["Enums"]["coaching_action_type"]
          titulo: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          descricao?: string | null
          id?: string
          ocorreu_em?: string
          profile_id: string
          tipo: Database["public"]["Enums"]["coaching_action_type"]
          titulo: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          descricao?: string | null
          id?: string
          ocorreu_em?: string
          profile_id?: string
          tipo?: Database["public"]["Enums"]["coaching_action_type"]
          titulo?: string
        }
        Relationships: [
          {
            foreignKeyName: "coaching_actions_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      commission_rates: {
        Row: {
          created_at: string
          id: string
          percentual: number
          produto_grupo: string
          profile_id: string
          vigente_desde: string
        }
        Insert: {
          created_at?: string
          id?: string
          percentual: number
          produto_grupo: string
          profile_id: string
          vigente_desde?: string
        }
        Update: {
          created_at?: string
          id?: string
          percentual?: number
          produto_grupo?: string
          profile_id?: string
          vigente_desde?: string
        }
        Relationships: [
          {
            foreignKeyName: "commission_rates_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_insights: {
        Row: {
          acao_sugerida: string | null
          created_at: string
          data: string
          descricao: string | null
          id: string
          prioridade: Database["public"]["Enums"]["priority_level"]
          profile_id: string | null
          titulo: string
        }
        Insert: {
          acao_sugerida?: string | null
          created_at?: string
          data: string
          descricao?: string | null
          id?: string
          prioridade: Database["public"]["Enums"]["priority_level"]
          profile_id?: string | null
          titulo: string
        }
        Update: {
          acao_sugerida?: string | null
          created_at?: string
          data?: string
          descricao?: string | null
          id?: string
          prioridade?: Database["public"]["Enums"]["priority_level"]
          profile_id?: string | null
          titulo?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_insights_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_reports: {
        Row: {
          calls_realizadas: number
          created_at: string
          data: string
          follow_ups: number
          id: string
          leads_atendidos: number
          leads_recebidos: number
          observacoes: string | null
          precisa_ajuda: boolean
          principais_dificuldades: string | null
          principais_objecoes: string | null
          profile_id: string
          propostas_enviadas: number
          proximas_oportunidades: string | null
          updated_at: string
          valor_vendido: number
          vendas_fechadas: number
        }
        Insert: {
          calls_realizadas?: number
          created_at?: string
          data?: string
          follow_ups?: number
          id?: string
          leads_atendidos?: number
          leads_recebidos?: number
          observacoes?: string | null
          precisa_ajuda?: boolean
          principais_dificuldades?: string | null
          principais_objecoes?: string | null
          profile_id: string
          propostas_enviadas?: number
          proximas_oportunidades?: string | null
          updated_at?: string
          valor_vendido?: number
          vendas_fechadas?: number
        }
        Update: {
          calls_realizadas?: number
          created_at?: string
          data?: string
          follow_ups?: number
          id?: string
          leads_atendidos?: number
          leads_recebidos?: number
          observacoes?: string | null
          precisa_ajuda?: boolean
          principais_dificuldades?: string | null
          principais_objecoes?: string | null
          profile_id?: string
          propostas_enviadas?: number
          proximas_oportunidades?: string | null
          updated_at?: string
          valor_vendido?: number
          vendas_fechadas?: number
        }
        Relationships: [
          {
            foreignKeyName: "daily_reports_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_summaries: {
        Row: {
          conversao: number
          created_at: string
          data: string
          gap: number
          id: string
          melhor_vendedor: string | null
          meta_diaria: number
          plano_acao: string | null
          ponto_atencao: string | null
          receita: number
          resumo_ia: string | null
        }
        Insert: {
          conversao?: number
          created_at?: string
          data: string
          gap?: number
          id?: string
          melhor_vendedor?: string | null
          meta_diaria?: number
          plano_acao?: string | null
          ponto_atencao?: string | null
          receita?: number
          resumo_ia?: string | null
        }
        Update: {
          conversao?: number
          created_at?: string
          data?: string
          gap?: number
          id?: string
          melhor_vendedor?: string | null
          meta_diaria?: number
          plano_acao?: string | null
          ponto_atencao?: string | null
          receita?: number
          resumo_ia?: string | null
        }
        Relationships: []
      }
      goals: {
        Row: {
          ano: number
          created_at: string
          id: string
          mes: number
          observacao: string | null
          profile_id: string | null
          updated_at: string
          valor_meta: number
        }
        Insert: {
          ano: number
          created_at?: string
          id?: string
          mes: number
          observacao?: string | null
          profile_id?: string | null
          updated_at?: string
          valor_meta?: number
        }
        Update: {
          ano?: number
          created_at?: string
          id?: string
          mes?: number
          observacao?: string | null
          profile_id?: string | null
          updated_at?: string
          valor_meta?: number
        }
        Relationships: [
          {
            foreignKeyName: "goals_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          created_at: string
          email: string | null
          external_id: string | null
          external_source: string | null
          fechado_em: string | null
          id: string
          metadata: Json | null
          nome: string | null
          origem: string | null
          pais: string | null
          profile_id: string | null
          qualificado_em: string | null
          recebido_em: string
          status: Database["public"]["Enums"]["lead_status"]
          telefone: string | null
          tempo_resposta_min: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          external_id?: string | null
          external_source?: string | null
          fechado_em?: string | null
          id?: string
          metadata?: Json | null
          nome?: string | null
          origem?: string | null
          pais?: string | null
          profile_id?: string | null
          qualificado_em?: string | null
          recebido_em?: string
          status?: Database["public"]["Enums"]["lead_status"]
          telefone?: string | null
          tempo_resposta_min?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          external_id?: string | null
          external_source?: string | null
          fechado_em?: string | null
          id?: string
          metadata?: Json | null
          nome?: string | null
          origem?: string | null
          pais?: string | null
          profile_id?: string | null
          qualificado_em?: string | null
          recebido_em?: string
          status?: Database["public"]["Enums"]["lead_status"]
          telefone?: string | null
          tempo_resposta_min?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "leads_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      manager_commission_config: {
        Row: {
          created_at: string
          id: string
          manager_profile_id: string
          percentual_sobre_equipe: number
          salario_fixo_brl: number
          vigente_desde: string
        }
        Insert: {
          created_at?: string
          id?: string
          manager_profile_id: string
          percentual_sobre_equipe?: number
          salario_fixo_brl?: number
          vigente_desde?: string
        }
        Update: {
          created_at?: string
          id?: string
          manager_profile_id?: string
          percentual_sobre_equipe?: number
          salario_fixo_brl?: number
          vigente_desde?: string
        }
        Relationships: [
          {
            foreignKeyName: "manager_commission_config_manager_profile_id_fkey"
            columns: ["manager_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      manual_revenue_entries: {
        Row: {
          created_at: string
          data_venda: string
          id: string
          lancado_por: string | null
          mes_referencia: string
          moeda: string
          motivo: string | null
          produto_grupo: string
          profile_id: string
          valor: number
        }
        Insert: {
          created_at?: string
          data_venda: string
          id?: string
          lancado_por?: string | null
          mes_referencia: string
          moeda?: string
          motivo?: string | null
          produto_grupo: string
          profile_id: string
          valor: number
        }
        Update: {
          created_at?: string
          data_venda?: string
          id?: string
          lancado_por?: string | null
          mes_referencia?: string
          moeda?: string
          motivo?: string | null
          produto_grupo?: string
          profile_id?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "manual_revenue_entries_lancado_por_fkey"
            columns: ["lancado_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "manual_revenue_entries_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      metas_mensais: {
        Row: {
          created_at: string
          id: string
          mes_ano: string
          meta_geral_eur: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          mes_ano: string
          meta_geral_eur?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          mes_ano?: string
          meta_geral_eur?: number
          updated_at?: string
        }
        Relationships: []
      }
      metas_produtos: {
        Row: {
          created_at: string
          id: string
          mes_ano: string
          meta_eur: number
          meta_vendas: number
          produto_grupo: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          mes_ano: string
          meta_eur?: number
          meta_vendas?: number
          produto_grupo: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          mes_ano?: string
          meta_eur?: number
          meta_vendas?: number
          produto_grupo?: string
          updated_at?: string
        }
        Relationships: []
      }
      objections: {
        Row: {
          created_at: string
          frequencia: number
          id: string
          pais: string | null
          produto: string | null
          profile_id: string | null
          registrada_em: string
          resposta_sugerida: string | null
          texto: string
        }
        Insert: {
          created_at?: string
          frequencia?: number
          id?: string
          pais?: string | null
          produto?: string | null
          profile_id?: string | null
          registrada_em?: string
          resposta_sugerida?: string | null
          texto: string
        }
        Update: {
          created_at?: string
          frequencia?: number
          id?: string
          pais?: string | null
          produto?: string | null
          profile_id?: string | null
          registrada_em?: string
          resposta_sugerida?: string | null
          texto?: string
        }
        Relationships: [
          {
            foreignKeyName: "objections_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      performance_scores: {
        Row: {
          conversao: number
          created_at: string
          data: string
          id: string
          leads: number
          pontuacao: number
          profile_id: string
          receita: number
          vendas: number
        }
        Insert: {
          conversao?: number
          created_at?: string
          data: string
          id?: string
          leads?: number
          pontuacao?: number
          profile_id: string
          receita?: number
          vendas?: number
        }
        Update: {
          conversao?: number
          created_at?: string
          data?: string
          id?: string
          leads?: number
          pontuacao?: number
          profile_id?: string
          receita?: number
          vendas?: number
        }
        Relationships: [
          {
            foreignKeyName: "performance_scores_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          ativo: boolean
          avatar_url: string | null
          cargo: string | null
          created_at: string
          data_entrada: string | null
          email: string | null
          full_name: string
          id: string
          observacoes: string | null
          telefone: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          ativo?: boolean
          avatar_url?: string | null
          cargo?: string | null
          created_at?: string
          data_entrada?: string | null
          email?: string | null
          full_name: string
          id: string
          observacoes?: string | null
          telefone?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          ativo?: boolean
          avatar_url?: string | null
          cargo?: string | null
          created_at?: string
          data_entrada?: string | null
          email?: string | null
          full_name?: string
          id?: string
          observacoes?: string | null
          telefone?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      refunds: {
        Row: {
          created_at: string
          data_evento: string | null
          email: string | null
          external_id: string | null
          external_source: string | null
          hotmart_transaction: string | null
          id: string
          mes_referencia: string | null
          metadata: Json | null
          moeda: string | null
          motivo: string | null
          ocorreu_em: string
          pais: string | null
          produto: string | null
          produto_grupo: string | null
          produto_nome: string | null
          profile_id: string | null
          sale_id: string | null
          tipo: string | null
          valor: number
        }
        Insert: {
          created_at?: string
          data_evento?: string | null
          email?: string | null
          external_id?: string | null
          external_source?: string | null
          hotmart_transaction?: string | null
          id?: string
          mes_referencia?: string | null
          metadata?: Json | null
          moeda?: string | null
          motivo?: string | null
          ocorreu_em?: string
          pais?: string | null
          produto?: string | null
          produto_grupo?: string | null
          produto_nome?: string | null
          profile_id?: string | null
          sale_id?: string | null
          tipo?: string | null
          valor: number
        }
        Update: {
          created_at?: string
          data_evento?: string | null
          email?: string | null
          external_id?: string | null
          external_source?: string | null
          hotmart_transaction?: string | null
          id?: string
          mes_referencia?: string | null
          metadata?: Json | null
          moeda?: string | null
          motivo?: string | null
          ocorreu_em?: string
          pais?: string | null
          produto?: string | null
          produto_grupo?: string | null
          produto_nome?: string | null
          profile_id?: string | null
          sale_id?: string | null
          tipo?: string | null
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "refunds_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "refunds_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      renewal_settings: {
        Row: {
          duracao_dias: number
          produto_grupo: string
          renovacao_produto_grupo: string
          updated_at: string
        }
        Insert: {
          duracao_dias?: number
          produto_grupo: string
          renovacao_produto_grupo?: string
          updated_at?: string
        }
        Update: {
          duracao_dias?: number
          produto_grupo?: string
          renovacao_produto_grupo?: string
          updated_at?: string
        }
        Relationships: []
      }
      renewal_status: {
        Row: {
          id: string
          sale_id: string
          status: string
          ultimo_contato_em: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          id?: string
          sale_id: string
          status?: string
          ultimo_contato_em?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          id?: string
          sale_id?: string
          status?: string
          ultimo_contato_em?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "renewal_status_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: true
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "renewal_status_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      roleta_config: {
        Row: {
          elegivel: boolean
          produto_grupo: string
          updated_at: string
        }
        Insert: {
          elegivel?: boolean
          produto_grupo: string
          updated_at?: string
        }
        Update: {
          elegivel?: boolean
          produto_grupo?: string
          updated_at?: string
        }
        Relationships: []
      }
      roleta_prizes: {
        Row: {
          ativo: boolean
          created_at: string
          id: string
          nome: string
          peso: number
          tipo: string
          valor: number | null
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          id?: string
          nome: string
          peso?: number
          tipo?: string
          valor?: number | null
        }
        Update: {
          ativo?: boolean
          created_at?: string
          id?: string
          nome?: string
          peso?: number
          tipo?: string
          valor?: number | null
        }
        Relationships: []
      }
      roleta_spins: {
        Row: {
          created_at: string
          id: string
          mes_referencia: string
          observacao: string | null
          pago: boolean
          premio_nome: string
          premio_valor: number | null
          prize_id: string | null
          profile_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          mes_referencia: string
          observacao?: string | null
          pago?: boolean
          premio_nome: string
          premio_valor?: number | null
          prize_id?: string | null
          profile_id: string
        }
        Update: {
          created_at?: string
          id?: string
          mes_referencia?: string
          observacao?: string | null
          pago?: boolean
          premio_nome?: string
          premio_valor?: number | null
          prize_id?: string | null
          profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "roleta_spins_prize_id_fkey"
            columns: ["prize_id"]
            isOneToOne: false
            referencedRelation: "roleta_prizes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "roleta_spins_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      sales: {
        Row: {
          comprador_email: string | null
          comprador_telefone: string | null
          created_at: string
          duplicate_of: string | null
          duplicate_reason: string | null
          external_id: string | null
          external_source: string | null
          fonte: Database["public"]["Enums"]["sale_source"]
          id: string
          metadata: Json | null
          moeda: string
          pais: string | null
          possible_duplicate: boolean
          produto: string
          produto_grupo: string | null
          profile_id: string | null
          valor: number
          vendido_em: string
        }
        Insert: {
          comprador_email?: string | null
          comprador_telefone?: string | null
          created_at?: string
          duplicate_of?: string | null
          duplicate_reason?: string | null
          external_id?: string | null
          external_source?: string | null
          fonte?: Database["public"]["Enums"]["sale_source"]
          id?: string
          metadata?: Json | null
          moeda?: string
          pais?: string | null
          possible_duplicate?: boolean
          produto: string
          produto_grupo?: string | null
          profile_id?: string | null
          valor: number
          vendido_em?: string
        }
        Update: {
          comprador_email?: string | null
          comprador_telefone?: string | null
          created_at?: string
          duplicate_of?: string | null
          duplicate_reason?: string | null
          external_id?: string | null
          external_source?: string | null
          fonte?: Database["public"]["Enums"]["sale_source"]
          id?: string
          metadata?: Json | null
          moeda?: string
          pais?: string | null
          possible_duplicate?: boolean
          produto?: string
          produto_grupo?: string | null
          profile_id?: string | null
          valor?: number
          vendido_em?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_duplicate_of_fkey"
            columns: ["duplicate_of"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      weekly_bonus_config: {
        Row: {
          created_at: string
          id: string
          meta_semanal_eur: number
          moeda: string
          profile_id: string
          valor_bonus: number
          vigente_desde: string
        }
        Insert: {
          created_at?: string
          id?: string
          meta_semanal_eur: number
          moeda?: string
          profile_id: string
          valor_bonus?: number
          vigente_desde?: string
        }
        Update: {
          created_at?: string
          id?: string
          meta_semanal_eur?: number
          moeda?: string
          profile_id?: string
          valor_bonus?: number
          vigente_desde?: string
        }
        Relationships: [
          {
            foreignKeyName: "weekly_bonus_config_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      v_daily_metrics: {
        Row: {
          cancelamentos_hoje: number | null
          conversao_pct: number | null
          leads_hoje: number | null
          receita_hoje: number | null
          reembolsos_hoje: number | null
          vendas_hoje: number | null
        }
        Relationships: []
      }
      v_meta_mes: {
        Row: {
          meta_total: number | null
          pct_meta: number | null
          receita_mes: number | null
        }
        Relationships: []
      }
      v_top_performer_hoje: {
        Row: {
          nome: string | null
          receita: number | null
          ticket_medio: number | null
          vendas: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      dashboard_leads_summary: {
        Args: { p_start: string }
        Returns: {
          c: number
          profile_id: string
          status: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_head: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      activity_type: "call" | "follow_up" | "proposta"
      app_role: "head" | "vendedor"
      coaching_action_type:
        | "cobranca"
        | "parabens"
        | "alinhamento_1x1"
        | "feedback"
        | "outro"
      lead_status:
        | "novo"
        | "qualificado"
        | "em_negociacao"
        | "ganho"
        | "perdido"
      priority_level: "alta" | "media" | "reconhecimento"
      sale_source: "hotmart" | "clint" | "manual" | "outro"
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
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
      activity_type: ["call", "follow_up", "proposta"],
      app_role: ["head", "vendedor"],
      coaching_action_type: [
        "cobranca",
        "parabens",
        "alinhamento_1x1",
        "feedback",
        "outro",
      ],
      lead_status: ["novo", "qualificado", "em_negociacao", "ganho", "perdido"],
      priority_level: ["alta", "media", "reconhecimento"],
      sale_source: ["hotmart", "clint", "manual", "outro"],
    },
  },
} as const
