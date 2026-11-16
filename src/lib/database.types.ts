// Gerado a partir de `supabase gen types typescript`, mas recortado à mão
// pra conter só as tabelas/funções do Talki — o projeto Supabase é
// compartilhado com outra plataforma (KPH OS, ~350 tabelas) e não faz
// sentido carregar o schema inteiro aqui. Ao alterar o schema do Talki,
// regenere e recorte de novo (não gere o arquivo completo por engano).
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          aceitou_termo_em: string | null
          avatar_url: string | null
          cargo: string | null
          criado_em: string | null
          email: string | null
          id: string
          nome: string | null
          role: string
        }
        Insert: {
          aceitou_termo_em?: string | null
          avatar_url?: string | null
          cargo?: string | null
          criado_em?: string | null
          email?: string | null
          id: string
          nome?: string | null
          role?: string
        }
        Update: {
          aceitou_termo_em?: string | null
          avatar_url?: string | null
          cargo?: string | null
          criado_em?: string | null
          email?: string | null
          id?: string
          nome?: string | null
          role?: string
        }
        Relationships: []
      }
      talki_notes: {
        Row: {
          conteudo: string
          created_at: string
          id: string
          owner_id: string
          titulo: string
          updated_at: string
        }
        Insert: {
          conteudo?: string
          created_at?: string
          id?: string
          owner_id?: string
          titulo: string
          updated_at?: string
        }
        Update: {
          conteudo?: string
          created_at?: string
          id?: string
          owner_id?: string
          titulo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "talki_notes_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      plans: {
        Row: {
          cor: string
          criado_em: string
          criado_por: string
          descricao: string | null
          id: string
          nome: string
        }
        Insert: {
          cor?: string
          criado_em?: string
          criado_por: string
          descricao?: string | null
          id?: string
          nome: string
        }
        Update: {
          cor?: string
          criado_em?: string
          criado_por?: string
          descricao?: string | null
          id?: string
          nome?: string
        }
        Relationships: [
          {
            foreignKeyName: "plans_criado_por_fkey"
            columns: ["criado_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      plan_members: {
        Row: {
          plan_id: string
          user_id: string
        }
        Insert: {
          plan_id: string
          user_id: string
        }
        Update: {
          plan_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "plan_members_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      buckets: {
        Row: {
          id: string
          nome: string
          ordem: number
          plan_id: string
        }
        Insert: {
          id?: string
          nome: string
          ordem?: number
          plan_id: string
        }
        Update: {
          id?: string
          nome?: string
          ordem?: number
          plan_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "buckets_project_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          inicio_hora: string | null
          prazo_hora: string | null
          bucket_id: string
          concluida_em: string | null
          cor: string | null
          criado_em: string
          criado_por: string
          descricao: string | null
          id: string
          inicio: string | null
          ordem: number
          plan_id: string
          prazo: string | null
          prioridade: string
          kanban_status: string | null
          status: string
          titulo: string
        }
        Insert: {
          inicio_hora?: string | null
          prazo_hora?: string | null
          bucket_id: string
          concluida_em?: string | null
          cor?: string | null
          criado_em?: string
          criado_por: string
          descricao?: string | null
          id?: string
          inicio?: string | null
          ordem?: number
          plan_id: string
          prazo?: string | null
          prioridade?: string
          kanban_status?: string | null
          status?: string
          titulo: string
        }
        Update: {
          inicio_hora?: string | null
          prazo_hora?: string | null
          bucket_id?: string
          concluida_em?: string | null
          cor?: string | null
          criado_em?: string
          criado_por?: string
          descricao?: string | null
          id?: string
          inicio?: string | null
          ordem?: number
          plan_id?: string
          prazo?: string | null
          prioridade?: string
          kanban_status?: string | null
          status?: string
          titulo?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_bucket_id_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_criado_por_fkey"
            columns: ["criado_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_project_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      task_assignees: {
        Row: {
          task_id: string
          user_id: string
          criado_em: string
          atribuido_por: string | null
        }
        Insert: {
          task_id: string
          user_id: string
          criado_em?: string
          atribuido_por?: string | null
        }
        Update: {
          task_id?: string
          user_id?: string
          criado_em?: string
          atribuido_por?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "task_assignees_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_assignees_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_assignees_atribuido_por_fkey"
            columns: ["atribuido_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      task_checklist: {
        Row: {
          inicio: string | null
          inicio_hora: string | null
          prazo: string | null
          prazo_hora: string | null
          concluida_em: string | null
          feito: boolean
          id: string
          ordem: number
          task_id: string
          texto: string
        }
        Insert: {
          inicio?: string | null
          inicio_hora?: string | null
          prazo?: string | null
          prazo_hora?: string | null
          concluida_em?: string | null
          feito?: boolean
          id?: string
          ordem?: number
          task_id: string
          texto: string
        }
        Update: {
          inicio?: string | null
          inicio_hora?: string | null
          prazo?: string | null
          prazo_hora?: string | null
          concluida_em?: string | null
          feito?: boolean
          id?: string
          ordem?: number
          task_id?: string
          texto?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_checklist_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_labels: {
        Row: {
          cor: string
          id: string
          nome: string
          plan_id: string
        }
        Insert: {
          cor?: string
          id?: string
          nome: string
          plan_id: string
        }
        Update: {
          cor?: string
          id?: string
          nome?: string
          plan_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_labels_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      task_label_links: {
        Row: {
          label_id: string
          task_id: string
        }
        Insert: {
          label_id: string
          task_id: string
        }
        Update: {
          label_id?: string
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_label_links_label_id_fkey"
            columns: ["label_id"]
            isOneToOne: false
            referencedRelation: "task_labels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_label_links_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_comments: {
        Row: {
          criado_em: string
          id: string
          task_id: string
          texto: string
          user_id: string
        }
        Insert: {
          criado_em?: string
          id?: string
          task_id: string
          texto: string
          user_id: string
        }
        Update: {
          criado_em?: string
          id?: string
          task_id?: string
          texto?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comments_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      plan_invites: {
        Row: {
          criado_em: string | null
          criado_por: string | null
          expires_at: string | null
          id: string
          plan_id: string | null
          token: string | null
        }
        Insert: {
          criado_em?: string | null
          criado_por?: string | null
          expires_at?: string | null
          id?: string
          plan_id?: string | null
          token?: string | null
        }
        Update: {
          criado_em?: string | null
          criado_por?: string | null
          expires_at?: string | null
          id?: string
          plan_id?: string | null
          token?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "plan_invites_criado_por_fkey"
            columns: ["criado_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_invites_project_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          criado_em: string
          id: string
          lida: boolean
          link: string | null
          mensagem: string | null
          tipo: string
          titulo: string
          user_id: string
        }
        Insert: {
          criado_em?: string
          id?: string
          lida?: boolean
          link?: string | null
          mensagem?: string | null
          tipo: string
          titulo: string
          user_id: string
        }
        Update: {
          criado_em?: string
          id?: string
          lida?: boolean
          link?: string | null
          mensagem?: string | null
          tipo?: string
          titulo?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      talki_set_task_kanban: { Args: { p_task_id: string; p_column: string | null }; Returns: undefined }
      talki_create_project_task: { Args: { p_bucket_id: string; p_titulo: string }; Returns: string }
      talki_set_project_active: { Args: { p_plan_id: string; p_ativo: boolean }; Returns: undefined }
      talki_mini_create_task: { Args: { p_id: string; p_bucket_id: string; p_titulo: string; p_inicio?: string | null; p_prazo?: string | null; p_prazo_hora?: string | null }; Returns: string }
      accept_plan_invite: { Args: { p_token: string }; Returns: string }
      get_plan_invite: {
        Args: { p_token: string }
        Returns: {
          expires_at: string
          plan_id: string
          plan_nome: string
        }[]
      }
      is_admin: { Args: never; Returns: boolean }
      is_plan_member: { Args: { p_plan_id: string }; Returns: boolean }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
