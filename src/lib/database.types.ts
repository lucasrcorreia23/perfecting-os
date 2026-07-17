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
