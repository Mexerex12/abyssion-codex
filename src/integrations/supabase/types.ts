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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      is_staff: { Args: { _user_id: string }; Returns: boolean }
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
      entry_status: "rascunho" | "publicado" | "arquivado"
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
      entry_status: ["rascunho", "publicado", "arquivado"],
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
    },
  },
} as const
