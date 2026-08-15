// Tipos do banco escritos à mão a partir de supabase/migrations/0001_init.sql
// (formato do `supabase gen types typescript`). Atualizar junto com as migrations.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      activities: {
        Row: {
          assignee_id: string | null;
          canal: Database["public"]["Enums"]["canal_comunicacao"] | null;
          cat: string | null;
          client_id: string;
          created_at: string;
          criticidade: Database["public"]["Enums"]["criticidade"] | null;
          cumulative_days: number | null;
          depends_on_cat: string | null;
          description: string | null;
          due_date: string | null;
          duration_days: number | null;
          id: string;
          modelo_mensagem: string | null;
          parallel_with_cat: string | null;
          position: number;
          responsavel:
            | Database["public"]["Enums"]["responsavel_categoria"]
            | null;
          setor_responsavel: string | null;
          stage: Database["public"]["Enums"]["workflow_stage"];
          status: Database["public"]["Enums"]["activity_status"];
          subatividades: Json;
          tipo: Database["public"]["Enums"]["atividade_tipo"] | null;
          title: string;
          updated_at: string;
          week: number | null;
        };
        Insert: {
          assignee_id?: string | null;
          canal?: Database["public"]["Enums"]["canal_comunicacao"] | null;
          cat?: string | null;
          client_id: string;
          created_at?: string;
          criticidade?: Database["public"]["Enums"]["criticidade"] | null;
          cumulative_days?: number | null;
          depends_on_cat?: string | null;
          description?: string | null;
          due_date?: string | null;
          duration_days?: number | null;
          id?: string;
          modelo_mensagem?: string | null;
          parallel_with_cat?: string | null;
          position?: number;
          responsavel?:
            | Database["public"]["Enums"]["responsavel_categoria"]
            | null;
          setor_responsavel?: string | null;
          stage: Database["public"]["Enums"]["workflow_stage"];
          status?: Database["public"]["Enums"]["activity_status"];
          subatividades?: Json;
          tipo?: Database["public"]["Enums"]["atividade_tipo"] | null;
          title: string;
          updated_at?: string;
          week?: number | null;
        };
        Update: {
          assignee_id?: string | null;
          canal?: Database["public"]["Enums"]["canal_comunicacao"] | null;
          cat?: string | null;
          client_id?: string;
          created_at?: string;
          criticidade?: Database["public"]["Enums"]["criticidade"] | null;
          cumulative_days?: number | null;
          depends_on_cat?: string | null;
          description?: string | null;
          due_date?: string | null;
          duration_days?: number | null;
          id?: string;
          modelo_mensagem?: string | null;
          parallel_with_cat?: string | null;
          position?: number;
          responsavel?:
            | Database["public"]["Enums"]["responsavel_categoria"]
            | null;
          setor_responsavel?: string | null;
          stage?: Database["public"]["Enums"]["workflow_stage"];
          status?: Database["public"]["Enums"]["activity_status"];
          subatividades?: Json;
          tipo?: Database["public"]["Enums"]["atividade_tipo"] | null;
          title?: string;
          updated_at?: string;
          week?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "activities_assignee_id_fkey";
            columns: ["assignee_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "activities_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "clients";
            referencedColumns: ["id"];
          },
        ];
      };
      client_files: {
        Row: {
          activity_id: string | null;
          client_id: string;
          created_at: string;
          id: string;
          mime_type: string | null;
          name: string;
          size_bytes: number | null;
          storage_path: string;
          uploaded_by: string | null;
        };
        Insert: {
          activity_id?: string | null;
          client_id: string;
          created_at?: string;
          id?: string;
          mime_type?: string | null;
          name: string;
          size_bytes?: number | null;
          storage_path: string;
          uploaded_by?: string | null;
        };
        Update: {
          activity_id?: string | null;
          client_id?: string;
          created_at?: string;
          id?: string;
          mime_type?: string | null;
          name?: string;
          size_bytes?: number | null;
          storage_path?: string;
          uploaded_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "client_files_activity_id_fkey";
            columns: ["activity_id"];
            isOneToOne: false;
            referencedRelation: "activities";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "client_files_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "clients";
            referencedColumns: ["id"];
          },
        ];
      };
      clients: {
        Row: {
          company: string | null;
          created_at: string;
          created_by: string | null;
          email: string | null;
          id: string;
          name: string;
          notes: string | null;
          phone: string | null;
          stage: Database["public"]["Enums"]["workflow_stage"];
          stage_entered_at: string;
          status: Database["public"]["Enums"]["client_status"];
          updated_at: string;
        };
        Insert: {
          company?: string | null;
          created_at?: string;
          created_by?: string | null;
          email?: string | null;
          id?: string;
          name: string;
          notes?: string | null;
          phone?: string | null;
          stage?: Database["public"]["Enums"]["workflow_stage"];
          stage_entered_at?: string;
          status?: Database["public"]["Enums"]["client_status"];
          updated_at?: string;
        };
        Update: {
          company?: string | null;
          created_at?: string;
          created_by?: string | null;
          email?: string | null;
          id?: string;
          name?: string;
          notes?: string | null;
          phone?: string | null;
          stage?: Database["public"]["Enums"]["workflow_stage"];
          stage_entered_at?: string;
          status?: Database["public"]["Enums"]["client_status"];
          updated_at?: string;
        };
        Relationships: [];
      };
      events: {
        Row: {
          actor_id: string | null;
          client_id: string | null;
          created_at: string;
          id: string;
          payload: Json;
          type: string;
        };
        Insert: {
          actor_id?: string | null;
          client_id?: string | null;
          created_at?: string;
          id?: string;
          payload?: Json;
          type: string;
        };
        Update: {
          actor_id?: string | null;
          client_id?: string | null;
          created_at?: string;
          id?: string;
          payload?: Json;
          type?: string;
        };
        Relationships: [
          {
            foreignKeyName: "events_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "clients";
            referencedColumns: ["id"];
          },
        ];
      };
      marketing_funnel_versions: {
        Row: {
          created_at: string;
          funnel_id: string;
          id: string;
          published_by: string | null;
          questions: Json;
          score_max: number;
          thresholds: Json;
          version: number;
        };
        Insert: {
          created_at?: string;
          funnel_id: string;
          id?: string;
          published_by?: string | null;
          questions: Json;
          score_max?: number;
          thresholds: Json;
          version: number;
        };
        Update: {
          created_at?: string;
          funnel_id?: string;
          id?: string;
          published_by?: string | null;
          questions?: Json;
          score_max?: number;
          thresholds?: Json;
          version?: number;
        };
        Relationships: [
          {
            foreignKeyName: "marketing_funnel_versions_funnel_id_fkey";
            columns: ["funnel_id"];
            isOneToOne: false;
            referencedRelation: "marketing_funnels";
            referencedColumns: ["id"];
          },
        ];
      };
      marketing_funnels: {
        Row: {
          created_at: string;
          created_by: string | null;
          description: string | null;
          id: string;
          name: string;
          published_version_id: string | null;
          questions: Json;
          redirect_url: string | null;
          score_thresholds: Json;
          slug: string;
          status: Database["public"]["Enums"]["funnel_status"];
          submit_label: string;
          success_message: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          description?: string | null;
          id?: string;
          name: string;
          published_version_id?: string | null;
          questions?: Json;
          redirect_url?: string | null;
          score_thresholds?: Json;
          slug: string;
          status?: Database["public"]["Enums"]["funnel_status"];
          submit_label?: string;
          success_message?: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          description?: string | null;
          id?: string;
          name?: string;
          published_version_id?: string | null;
          questions?: Json;
          redirect_url?: string | null;
          score_thresholds?: Json;
          slug?: string;
          status?: Database["public"]["Enums"]["funnel_status"];
          submit_label?: string;
          success_message?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "marketing_funnels_published_version_id_fkey";
            columns: ["published_version_id"];
            isOneToOne: false;
            referencedRelation: "marketing_funnel_versions";
            referencedColumns: ["id"];
          },
        ];
      };
      marketing_leads: {
        Row: {
          answers: Json;
          client_id: string | null;
          company: string | null;
          created_at: string;
          email: string | null;
          funnel_id: string;
          funnel_version_id: string | null;
          id: string;
          ip_hash: string | null;
          name: string | null;
          notes: string | null;
          phone: string | null;
          qualificacao: Database["public"]["Enums"]["lead_qualificacao"];
          role_title: string | null;
          score: number;
          score_max: number;
          score_pct: number;
          source_url: string | null;
          status: Database["public"]["Enums"]["lead_status"];
          updated_at: string;
          user_agent: string | null;
          utm: Json;
        };
        Insert: {
          answers?: Json;
          client_id?: string | null;
          company?: string | null;
          created_at?: string;
          email?: string | null;
          funnel_id: string;
          funnel_version_id?: string | null;
          id?: string;
          ip_hash?: string | null;
          name?: string | null;
          notes?: string | null;
          phone?: string | null;
          qualificacao?: Database["public"]["Enums"]["lead_qualificacao"];
          role_title?: string | null;
          score?: number;
          score_max?: number;
          score_pct?: number;
          source_url?: string | null;
          status?: Database["public"]["Enums"]["lead_status"];
          updated_at?: string;
          user_agent?: string | null;
          utm?: Json;
        };
        Update: {
          answers?: Json;
          client_id?: string | null;
          company?: string | null;
          created_at?: string;
          email?: string | null;
          funnel_id?: string;
          funnel_version_id?: string | null;
          id?: string;
          ip_hash?: string | null;
          name?: string | null;
          notes?: string | null;
          phone?: string | null;
          qualificacao?: Database["public"]["Enums"]["lead_qualificacao"];
          role_title?: string | null;
          score?: number;
          score_max?: number;
          score_pct?: number;
          source_url?: string | null;
          status?: Database["public"]["Enums"]["lead_status"];
          updated_at?: string;
          user_agent?: string | null;
          utm?: Json;
        };
        Relationships: [
          {
            foreignKeyName: "marketing_leads_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "clients";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "marketing_leads_funnel_id_fkey";
            columns: ["funnel_id"];
            isOneToOne: false;
            referencedRelation: "marketing_funnels";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "marketing_leads_funnel_version_id_fkey";
            columns: ["funnel_version_id"];
            isOneToOne: false;
            referencedRelation: "marketing_funnel_versions";
            referencedColumns: ["id"];
          },
        ];
      };
      marketing_posts: {
        Row: {
          author_id: string | null;
          body_md: string;
          canonical_url: string | null;
          cover_alt: string | null;
          cover_path: string | null;
          created_at: string;
          excerpt: string | null;
          id: string;
          noindex: boolean;
          published_at: string | null;
          reading_minutes: number;
          seo_description: string | null;
          seo_title: string | null;
          slug: string;
          status: Database["public"]["Enums"]["post_status"];
          tags: string[];
          title: string;
          updated_at: string;
        };
        Insert: {
          author_id?: string | null;
          body_md?: string;
          canonical_url?: string | null;
          cover_alt?: string | null;
          cover_path?: string | null;
          created_at?: string;
          excerpt?: string | null;
          id?: string;
          noindex?: boolean;
          published_at?: string | null;
          reading_minutes?: number;
          seo_description?: string | null;
          seo_title?: string | null;
          slug: string;
          status?: Database["public"]["Enums"]["post_status"];
          tags?: string[];
          title: string;
          updated_at?: string;
        };
        Update: {
          author_id?: string | null;
          body_md?: string;
          canonical_url?: string | null;
          cover_alt?: string | null;
          cover_path?: string | null;
          created_at?: string;
          excerpt?: string | null;
          id?: string;
          noindex?: boolean;
          published_at?: string | null;
          reading_minutes?: number;
          seo_description?: string | null;
          seo_title?: string | null;
          slug?: string;
          status?: Database["public"]["Enums"]["post_status"];
          tags?: string[];
          title?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          avatar_url: string | null;
          client_id: string | null;
          created_at: string;
          full_name: string | null;
          id: string;
          preferences: Json;
          role: Database["public"]["Enums"]["user_role"];
        };
        Insert: {
          avatar_url?: string | null;
          client_id?: string | null;
          created_at?: string;
          full_name?: string | null;
          id: string;
          preferences?: Json;
          role?: Database["public"]["Enums"]["user_role"];
        };
        Update: {
          avatar_url?: string | null;
          client_id?: string | null;
          created_at?: string;
          full_name?: string | null;
          id?: string;
          preferences?: Json;
          role?: Database["public"]["Enums"]["user_role"];
        };
        Relationships: [
          {
            foreignKeyName: "profiles_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "clients";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      is_interno: {
        Args: Record<PropertyKey, never>;
        Returns: boolean;
      };
      my_client_id: {
        Args: Record<PropertyKey, never>;
        Returns: string | null;
      };
    };
    Enums: {
      activity_status: "pendente" | "em_andamento" | "bloqueada" | "concluida";
      atividade_tipo: "sincrono" | "assincrono";
      canal_comunicacao: "email" | "whatsapp" | "os" | "meet" | "presencial";
      client_status: "ativo" | "em_risco" | "pausado" | "encerrado";
      criticidade: "baixa" | "media" | "alta";
      funnel_status: "rascunho" | "publicado" | "arquivado";
      lead_qualificacao: "frio" | "morno" | "quente";
      lead_status:
        | "novo"
        | "em_contato"
        | "qualificado"
        | "descartado"
        | "convertido";
      post_status: "rascunho" | "publicado" | "arquivado";
      responsavel_categoria: "cliente" | "perfecting" | "ambos";
      user_role: "interno" | "cliente";
      workflow_stage:
        | "diagnosticar"
        | "priorizar"
        | "construir"
        | "calibrar"
        | "executar"
        | "medir";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];
export type TablesInsert<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Insert"];
export type TablesUpdate<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Update"];
export type Enums<T extends keyof Database["public"]["Enums"]> =
  Database["public"]["Enums"][T];
