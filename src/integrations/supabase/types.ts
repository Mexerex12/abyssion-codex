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
      consequencias: {
        Row: {
          created_at: string
          criado_por: string | null
          descricao: string | null
          dominios_afetados: string[] | null
          escopo_conhecimento: Database["public"]["Enums"]["knowledge_scope"]
          evento_id: string | null
          fatos_gerados: string[] | null
          id: string
          misterios_gerados: string[] | null
          npcs_afetados: string[] | null
          tipo: string | null
          titulo: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          criado_por?: string | null
          descricao?: string | null
          dominios_afetados?: string[] | null
          escopo_conhecimento?: Database["public"]["Enums"]["knowledge_scope"]
          evento_id?: string | null
          fatos_gerados?: string[] | null
          id?: string
          misterios_gerados?: string[] | null
          npcs_afetados?: string[] | null
          tipo?: string | null
          titulo: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          criado_por?: string | null
          descricao?: string | null
          dominios_afetados?: string[] | null
          escopo_conhecimento?: Database["public"]["Enums"]["knowledge_scope"]
          evento_id?: string | null
          fatos_gerados?: string[] | null
          id?: string
          misterios_gerados?: string[] | null
          npcs_afetados?: string[] | null
          tipo?: string | null
          titulo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "consequencias_evento_id_fkey"
            columns: ["evento_id"]
            isOneToOne: false
            referencedRelation: "eventos_operacionais"
            referencedColumns: ["id"]
          },
        ]
      }
      documento_revisoes: {
        Row: {
          conteudo: string | null
          criado_em: string
          documento_id: string
          editor_id: string | null
          id: string
          titulo: string | null
        }
        Insert: {
          conteudo?: string | null
          criado_em?: string
          documento_id: string
          editor_id?: string | null
          id?: string
          titulo?: string | null
        }
        Update: {
          conteudo?: string | null
          criado_em?: string
          documento_id?: string
          editor_id?: string | null
          id?: string
          titulo?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "documento_revisoes_documento_id_fkey"
            columns: ["documento_id"]
            isOneToOne: false
            referencedRelation: "documentos"
            referencedColumns: ["id"]
          },
        ]
      }
      documentos: {
        Row: {
          anexos: string[]
          categoria: string | null
          clearance: Database["public"]["Enums"]["clearance_level"]
          conteudo: string | null
          created_at: string
          created_by: string | null
          id: string
          slug: string
          titulo: string
          updated_at: string
        }
        Insert: {
          anexos?: string[]
          categoria?: string | null
          clearance?: Database["public"]["Enums"]["clearance_level"]
          conteudo?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          slug: string
          titulo: string
          updated_at?: string
        }
        Update: {
          anexos?: string[]
          categoria?: string | null
          clearance?: Database["public"]["Enums"]["clearance_level"]
          conteudo?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          slug?: string
          titulo?: string
          updated_at?: string
        }
        Relationships: []
      }
      dominios: {
        Row: {
          arquiteto_npc_id: string | null
          classe: string | null
          created_at: string
          dificuldade: number | null
          historico: string | null
          id: string
          lore_entry_id: string | null
          nome: string
          proxima_abertura: string | null
          recompensas: string[]
          regente_npc_id: string | null
          status: Database["public"]["Enums"]["dominio_status"]
          ultima_abertura: string | null
          updated_at: string
        }
        Insert: {
          arquiteto_npc_id?: string | null
          classe?: string | null
          created_at?: string
          dificuldade?: number | null
          historico?: string | null
          id?: string
          lore_entry_id?: string | null
          nome: string
          proxima_abertura?: string | null
          recompensas?: string[]
          regente_npc_id?: string | null
          status?: Database["public"]["Enums"]["dominio_status"]
          ultima_abertura?: string | null
          updated_at?: string
        }
        Update: {
          arquiteto_npc_id?: string | null
          classe?: string | null
          created_at?: string
          dificuldade?: number | null
          historico?: string | null
          id?: string
          lore_entry_id?: string | null
          nome?: string
          proxima_abertura?: string | null
          recompensas?: string[]
          regente_npc_id?: string | null
          status?: Database["public"]["Enums"]["dominio_status"]
          ultima_abertura?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "dominios_arquiteto_npc_id_fkey"
            columns: ["arquiteto_npc_id"]
            isOneToOne: false
            referencedRelation: "npcs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dominios_lore_entry_id_fkey"
            columns: ["lore_entry_id"]
            isOneToOne: false
            referencedRelation: "lore_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dominios_regente_npc_id_fkey"
            columns: ["regente_npc_id"]
            isOneToOne: false
            referencedRelation: "npcs"
            referencedColumns: ["id"]
          },
        ]
      }
      eventos_operacionais: {
        Row: {
          clearance: Database["public"]["Enums"]["clearance_level"]
          consequencias: string | null
          created_at: string
          data: string | null
          dominio_id: string | null
          esquadroes: string[]
          id: string
          lore_entry_id: string | null
          narrador_id: string | null
          nome: string
          npcs_envolvidos: string[]
          relatorio: string | null
          resumo: string | null
          status: Database["public"]["Enums"]["evento_status"]
          tipo: Database["public"]["Enums"]["evento_tipo"]
          updated_at: string
        }
        Insert: {
          clearance?: Database["public"]["Enums"]["clearance_level"]
          consequencias?: string | null
          created_at?: string
          data?: string | null
          dominio_id?: string | null
          esquadroes?: string[]
          id?: string
          lore_entry_id?: string | null
          narrador_id?: string | null
          nome: string
          npcs_envolvidos?: string[]
          relatorio?: string | null
          resumo?: string | null
          status?: Database["public"]["Enums"]["evento_status"]
          tipo?: Database["public"]["Enums"]["evento_tipo"]
          updated_at?: string
        }
        Update: {
          clearance?: Database["public"]["Enums"]["clearance_level"]
          consequencias?: string | null
          created_at?: string
          data?: string | null
          dominio_id?: string | null
          esquadroes?: string[]
          id?: string
          lore_entry_id?: string | null
          narrador_id?: string | null
          nome?: string
          npcs_envolvidos?: string[]
          relatorio?: string | null
          resumo?: string | null
          status?: Database["public"]["Enums"]["evento_status"]
          tipo?: Database["public"]["Enums"]["evento_tipo"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "eventos_operacionais_dominio_id_fkey"
            columns: ["dominio_id"]
            isOneToOne: false
            referencedRelation: "dominios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "eventos_operacionais_lore_entry_id_fkey"
            columns: ["lore_entry_id"]
            isOneToOne: false
            referencedRelation: "lore_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      fatos_canonicos: {
        Row: {
          categoria: string
          created_at: string
          criado_por: string | null
          descricao: string
          escopo_conhecimento: Database["public"]["Enums"]["knowledge_scope"]
          eventos_relacionados: string[] | null
          faccoes_relacionadas: string[] | null
          fonte: string | null
          id: string
          notas: string | null
          npcs_relacionados: string[] | null
          palavras_chave: string[] | null
          status: Database["public"]["Enums"]["fact_status"]
          titulo: string
          updated_at: string
        }
        Insert: {
          categoria: string
          created_at?: string
          criado_por?: string | null
          descricao: string
          escopo_conhecimento?: Database["public"]["Enums"]["knowledge_scope"]
          eventos_relacionados?: string[] | null
          faccoes_relacionadas?: string[] | null
          fonte?: string | null
          id?: string
          notas?: string | null
          npcs_relacionados?: string[] | null
          palavras_chave?: string[] | null
          status?: Database["public"]["Enums"]["fact_status"]
          titulo: string
          updated_at?: string
        }
        Update: {
          categoria?: string
          created_at?: string
          criado_por?: string | null
          descricao?: string
          escopo_conhecimento?: Database["public"]["Enums"]["knowledge_scope"]
          eventos_relacionados?: string[] | null
          faccoes_relacionadas?: string[] | null
          fonte?: string | null
          id?: string
          notas?: string | null
          npcs_relacionados?: string[] | null
          palavras_chave?: string[] | null
          status?: Database["public"]["Enums"]["fact_status"]
          titulo?: string
          updated_at?: string
        }
        Relationships: []
      }
      ganchos_narrativos: {
        Row: {
          created_at: string
          faccao: string | null
          id: string
          narrador_id: string | null
          npcs_envolvidos: string[]
          prioridade: Database["public"]["Enums"]["gancho_prioridade"]
          resumo: string | null
          status: Database["public"]["Enums"]["gancho_status"]
          titulo: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          faccao?: string | null
          id?: string
          narrador_id?: string | null
          npcs_envolvidos?: string[]
          prioridade?: Database["public"]["Enums"]["gancho_prioridade"]
          resumo?: string | null
          status?: Database["public"]["Enums"]["gancho_status"]
          titulo: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          faccao?: string | null
          id?: string
          narrador_id?: string | null
          npcs_envolvidos?: string[]
          prioridade?: Database["public"]["Enums"]["gancho_prioridade"]
          resumo?: string | null
          status?: Database["public"]["Enums"]["gancho_status"]
          titulo?: string
          updated_at?: string
        }
        Relationships: []
      }
      lore_entries: {
        Row: {
          banner_image_url: string | null
          body: string | null
          category: Database["public"]["Enums"]["lore_category"]
          clearance: Database["public"]["Enums"]["clearance_level"]
          cover_image_url: string | null
          created_at: string
          created_by: string | null
          id: string
          metadata: Json
          slug: string
          status: Database["public"]["Enums"]["entry_status"]
          subtitle: string | null
          summary: string | null
          tags: string[]
          timeline_date: string | null
          timeline_order: number | null
          title: string
          updated_at: string
        }
        Insert: {
          banner_image_url?: string | null
          body?: string | null
          category: Database["public"]["Enums"]["lore_category"]
          clearance?: Database["public"]["Enums"]["clearance_level"]
          cover_image_url?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          metadata?: Json
          slug: string
          status?: Database["public"]["Enums"]["entry_status"]
          subtitle?: string | null
          summary?: string | null
          tags?: string[]
          timeline_date?: string | null
          timeline_order?: number | null
          title: string
          updated_at?: string
        }
        Update: {
          banner_image_url?: string | null
          body?: string | null
          category?: Database["public"]["Enums"]["lore_category"]
          clearance?: Database["public"]["Enums"]["clearance_level"]
          cover_image_url?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          metadata?: Json
          slug?: string
          status?: Database["public"]["Enums"]["entry_status"]
          subtitle?: string | null
          summary?: string | null
          tags?: string[]
          timeline_date?: string | null
          timeline_order?: number | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      lore_index: {
        Row: {
          category: string | null
          chunk_index: number
          clearance: string | null
          content: string
          created_at: string
          embedding: string
          id: string
          metadata: Json
          slug: string | null
          source_id: string
          source_type: string
          term: string
        }
        Insert: {
          category?: string | null
          chunk_index?: number
          clearance?: string | null
          content: string
          created_at?: string
          embedding: string
          id?: string
          metadata?: Json
          slug?: string | null
          source_id: string
          source_type: string
          term: string
        }
        Update: {
          category?: string | null
          chunk_index?: number
          clearance?: string | null
          content?: string
          created_at?: string
          embedding?: string
          id?: string
          metadata?: Json
          slug?: string | null
          source_id?: string
          source_type?: string
          term?: string
        }
        Relationships: []
      }
      lore_relations: {
        Row: {
          created_at: string
          from_entry: string
          id: string
          notes: string | null
          relation_type: string
          to_entry: string
        }
        Insert: {
          created_at?: string
          from_entry: string
          id?: string
          notes?: string | null
          relation_type: string
          to_entry: string
        }
        Update: {
          created_at?: string
          from_entry?: string
          id?: string
          notes?: string | null
          relation_type?: string
          to_entry?: string
        }
        Relationships: [
          {
            foreignKeyName: "lore_relations_from_entry_fkey"
            columns: ["from_entry"]
            isOneToOne: false
            referencedRelation: "lore_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lore_relations_to_entry_fkey"
            columns: ["to_entry"]
            isOneToOne: false
            referencedRelation: "lore_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      misterios: {
        Row: {
          contexto: string | null
          created_at: string
          criado_por: string | null
          escopo_conhecimento: Database["public"]["Enums"]["knowledge_scope"]
          eventos_envolvidos: string[] | null
          faccoes_envolvidas: string[] | null
          id: string
          npcs_envolvidos: string[] | null
          pergunta: string
          possiveis_respostas: Json | null
          resolucao_planejada: string | null
          resolvido_em: string | null
          status: Database["public"]["Enums"]["mystery_status"]
          updated_at: string
        }
        Insert: {
          contexto?: string | null
          created_at?: string
          criado_por?: string | null
          escopo_conhecimento?: Database["public"]["Enums"]["knowledge_scope"]
          eventos_envolvidos?: string[] | null
          faccoes_envolvidas?: string[] | null
          id?: string
          npcs_envolvidos?: string[] | null
          pergunta: string
          possiveis_respostas?: Json | null
          resolucao_planejada?: string | null
          resolvido_em?: string | null
          status?: Database["public"]["Enums"]["mystery_status"]
          updated_at?: string
        }
        Update: {
          contexto?: string | null
          created_at?: string
          criado_por?: string | null
          escopo_conhecimento?: Database["public"]["Enums"]["knowledge_scope"]
          eventos_envolvidos?: string[] | null
          faccoes_envolvidas?: string[] | null
          id?: string
          npcs_envolvidos?: string[] | null
          pergunta?: string
          possiveis_respostas?: Json | null
          resolucao_planejada?: string | null
          resolvido_em?: string | null
          status?: Database["public"]["Enums"]["mystery_status"]
          updated_at?: string
        }
        Relationships: []
      }
      npc_relations: {
        Row: {
          created_at: string
          from_npc_id: string
          id: string
          notas: string | null
          tipo: string
          to_npc_id: string
        }
        Insert: {
          created_at?: string
          from_npc_id: string
          id?: string
          notas?: string | null
          tipo: string
          to_npc_id: string
        }
        Update: {
          created_at?: string
          from_npc_id?: string
          id?: string
          notas?: string | null
          tipo?: string
          to_npc_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "npc_relations_from_npc_id_fkey"
            columns: ["from_npc_id"]
            isOneToOne: false
            referencedRelation: "npcs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "npc_relations_to_npc_id_fkey"
            columns: ["to_npc_id"]
            isOneToOne: false
            referencedRelation: "npcs"
            referencedColumns: ["id"]
          },
        ]
      }
      npcs: {
        Row: {
          cargo: string | null
          created_at: string
          created_by: string | null
          faccao: string | null
          id: string
          imagem_url: string | null
          localizacao: string | null
          lore_entry_id: string | null
          nome: string
          objetivos: string[]
          observacoes_staff: string | null
          segredos: string | null
          segredos_clearance: Database["public"]["Enums"]["clearance_level"]
          status: Database["public"]["Enums"]["npc_status"]
          ultima_aparicao: string | null
          updated_at: string
        }
        Insert: {
          cargo?: string | null
          created_at?: string
          created_by?: string | null
          faccao?: string | null
          id?: string
          imagem_url?: string | null
          localizacao?: string | null
          lore_entry_id?: string | null
          nome: string
          objetivos?: string[]
          observacoes_staff?: string | null
          segredos?: string | null
          segredos_clearance?: Database["public"]["Enums"]["clearance_level"]
          status?: Database["public"]["Enums"]["npc_status"]
          ultima_aparicao?: string | null
          updated_at?: string
        }
        Update: {
          cargo?: string | null
          created_at?: string
          created_by?: string | null
          faccao?: string | null
          id?: string
          imagem_url?: string | null
          localizacao?: string | null
          lore_entry_id?: string | null
          nome?: string
          objetivos?: string[]
          observacoes_staff?: string | null
          segredos?: string | null
          segredos_clearance?: Database["public"]["Enums"]["clearance_level"]
          status?: Database["public"]["Enums"]["npc_status"]
          ultima_aparicao?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "npcs_lore_entry_id_fkey"
            columns: ["lore_entry_id"]
            isOneToOne: false
            referencedRelation: "lore_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      plots: {
        Row: {
          created_at: string
          criado_por: string | null
          data_prevista: string | null
          dependencias: string[] | null
          faccoes_envolvidas: string[] | null
          fatos_relacionados: string[] | null
          id: string
          misterios_relacionados: string[] | null
          narrador_id: string | null
          notas: string | null
          npcs_envolvidos: string[] | null
          objetivo: string | null
          resumo: string | null
          status: Database["public"]["Enums"]["plot_status"]
          titulo: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          criado_por?: string | null
          data_prevista?: string | null
          dependencias?: string[] | null
          faccoes_envolvidas?: string[] | null
          fatos_relacionados?: string[] | null
          id?: string
          misterios_relacionados?: string[] | null
          narrador_id?: string | null
          notas?: string | null
          npcs_envolvidos?: string[] | null
          objetivo?: string | null
          resumo?: string | null
          status?: Database["public"]["Enums"]["plot_status"]
          titulo: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          criado_por?: string | null
          data_prevista?: string | null
          dependencias?: string[] | null
          faccoes_envolvidas?: string[] | null
          fatos_relacionados?: string[] | null
          id?: string
          misterios_relacionados?: string[] | null
          narrador_id?: string | null
          notas?: string | null
          npcs_envolvidos?: string[] | null
          objetivo?: string | null
          resumo?: string | null
          status?: Database["public"]["Enums"]["plot_status"]
          titulo?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          display_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      rupturas: {
        Row: {
          aberta_em: string
          created_at: string
          descricao: string | null
          dominio_id: string | null
          estado: Database["public"]["Enums"]["ruptura_estado"]
          fechada_em: string | null
          id: string
          nome: string
          updated_at: string
        }
        Insert: {
          aberta_em?: string
          created_at?: string
          descricao?: string | null
          dominio_id?: string | null
          estado?: Database["public"]["Enums"]["ruptura_estado"]
          fechada_em?: string | null
          id?: string
          nome: string
          updated_at?: string
        }
        Update: {
          aberta_em?: string
          created_at?: string
          descricao?: string | null
          dominio_id?: string | null
          estado?: Database["public"]["Enums"]["ruptura_estado"]
          fechada_em?: string | null
          id?: string
          nome?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rupturas_dominio_id_fkey"
            columns: ["dominio_id"]
            isOneToOne: false
            referencedRelation: "dominios"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          granted_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          granted_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          granted_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      vestigios: {
        Row: {
          created_at: string
          esquadrao: string | null
          estado: Database["public"]["Enums"]["vestigio_estado"]
          historico: Json
          id: string
          nome: string
          notas: string | null
          numero: number | null
          ultima_aparicao: string | null
          updated_at: string
          vidas_atuais: number
          vidas_limite: number
        }
        Insert: {
          created_at?: string
          esquadrao?: string | null
          estado?: Database["public"]["Enums"]["vestigio_estado"]
          historico?: Json
          id?: string
          nome: string
          notas?: string | null
          numero?: number | null
          ultima_aparicao?: string | null
          updated_at?: string
          vidas_atuais?: number
          vidas_limite?: number
        }
        Update: {
          created_at?: string
          esquadrao?: string | null
          estado?: Database["public"]["Enums"]["vestigio_estado"]
          historico?: Json
          id?: string
          nome?: string
          notas?: string | null
          numero?: number | null
          ultima_aparicao?: string | null
          updated_at?: string
          vidas_atuais?: number
          vidas_limite?: number
        }
        Relationships: []
      }
      world_state: {
        Row: {
          assimilacao_media: number
          evento_global_atual_id: string | null
          id: boolean
          nivel_ameaca: Database["public"]["Enums"]["threat_level"]
          notas: string | null
          peregrino_ultimo_em: string | null
          peregrino_ultimo_local: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          assimilacao_media?: number
          evento_global_atual_id?: string | null
          id?: boolean
          nivel_ameaca?: Database["public"]["Enums"]["threat_level"]
          notas?: string | null
          peregrino_ultimo_em?: string | null
          peregrino_ultimo_local?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          assimilacao_media?: number
          evento_global_atual_id?: string | null
          id?: boolean
          nivel_ameaca?: Database["public"]["Enums"]["threat_level"]
          notas?: string | null
          peregrino_ultimo_em?: string | null
          peregrino_ultimo_local?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_view_clearance: {
        Args: {
          _clearance: Database["public"]["Enums"]["clearance_level"]
          _user_id: string
        }
        Returns: boolean
      }
      check_contradictions: {
        Args: { _text: string }
        Returns: {
          categoria: string
          descricao: string
          id: string
          matched_keyword: string
          status: Database["public"]["Enums"]["fact_status"]
          titulo: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      is_staff: { Args: { _user_id: string }; Returns: boolean }
      match_lore_index: {
        Args: {
          match_count?: number
          min_similarity?: number
          query_embedding: string
        }
        Returns: {
          category: string
          clearance: string
          content: string
          id: string
          similarity: number
          slug: string
          source_id: string
          source_type: string
          term: string
        }[]
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
    }
    Enums: {
      app_role: "visitante" | "narrador" | "administrador"
      clearance_level:
        | "publico"
        | "nivel_1"
        | "nivel_2"
        | "nivel_3"
        | "nivel_4"
        | "nivel_diretor"
        | "uniao"
        | "instrutores"
        | "diretores"
        | "curadores"
        | "restrito"
        | "verdade_absoluta"
      dominio_status: "ativo" | "encerrado" | "selado" | "instavel"
      entry_status: "rascunho" | "publicado" | "arquivado"
      evento_status: "planejado" | "em_andamento" | "concluido" | "cancelado"
      evento_tipo: "global" | "faccao" | "esquadrao" | "secreto"
      fact_status:
        | "canonico"
        | "provavel"
        | "rumor"
        | "descartado"
        | "retconado"
      gancho_prioridade: "baixa" | "media" | "alta" | "critica"
      gancho_status:
        | "nao_iniciado"
        | "planejado"
        | "em_andamento"
        | "executado"
        | "arquivado"
      knowledge_scope:
        | "players"
        | "uniao"
        | "diretores"
        | "curadores"
        | "staff_apenas"
      lore_category:
        | "universo"
        | "historia"
        | "npc"
        | "faccao"
        | "vestigio"
        | "regente"
        | "curador"
        | "dominio"
        | "evento"
        | "bastiao"
        | "esquadrao"
        | "personagem_historico"
        | "documento_restrito"
        | "classe"
        | "ruptura"
      mystery_status:
        | "sem_resposta"
        | "parcial"
        | "em_revelacao"
        | "resolvido"
        | "arquivado"
      npc_status: "ativo" | "morto" | "desaparecido" | "oculto" | "corrompido"
      plot_status:
        | "rascunho"
        | "planejado"
        | "em_andamento"
        | "executado"
        | "arquivado"
        | "cancelado"
      ruptura_estado: "aberta" | "contida" | "critica" | "fechada"
      threat_level: "baixo" | "medio" | "alto" | "critico" | "catastrofico"
      vestigio_estado: "ativo" | "morto" | "instavel" | "desaparecido"
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
      app_role: ["visitante", "narrador", "administrador"],
      clearance_level: [
        "publico",
        "nivel_1",
        "nivel_2",
        "nivel_3",
        "nivel_4",
        "nivel_diretor",
        "uniao",
        "instrutores",
        "diretores",
        "curadores",
        "restrito",
        "verdade_absoluta",
      ],
      dominio_status: ["ativo", "encerrado", "selado", "instavel"],
      entry_status: ["rascunho", "publicado", "arquivado"],
      evento_status: ["planejado", "em_andamento", "concluido", "cancelado"],
      evento_tipo: ["global", "faccao", "esquadrao", "secreto"],
      fact_status: ["canonico", "provavel", "rumor", "descartado", "retconado"],
      gancho_prioridade: ["baixa", "media", "alta", "critica"],
      gancho_status: [
        "nao_iniciado",
        "planejado",
        "em_andamento",
        "executado",
        "arquivado",
      ],
      knowledge_scope: [
        "players",
        "uniao",
        "diretores",
        "curadores",
        "staff_apenas",
      ],
      lore_category: [
        "universo",
        "historia",
        "npc",
        "faccao",
        "vestigio",
        "regente",
        "curador",
        "dominio",
        "evento",
        "bastiao",
        "esquadrao",
        "personagem_historico",
        "documento_restrito",
        "classe",
        "ruptura",
      ],
      mystery_status: [
        "sem_resposta",
        "parcial",
        "em_revelacao",
        "resolvido",
        "arquivado",
      ],
      npc_status: ["ativo", "morto", "desaparecido", "oculto", "corrompido"],
      plot_status: [
        "rascunho",
        "planejado",
        "em_andamento",
        "executado",
        "arquivado",
        "cancelado",
      ],
      ruptura_estado: ["aberta", "contida", "critica", "fechada"],
      threat_level: ["baixo", "medio", "alto", "critico", "catastrofico"],
      vestigio_estado: ["ativo", "morto", "instavel", "desaparecido"],
    },
  },
} as const
