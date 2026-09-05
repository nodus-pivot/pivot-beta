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
      brands: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          logo_path: string | null
          name: string
          slug: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          logo_path?: string | null
          name: string
          slug: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          logo_path?: string | null
          name?: string
          slug?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "brands_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          amount: number
          created_at: string
          created_by: string | null
          id: string
          paid_at: string | null
          paid_manually_reason: string | null
          reminder_sent_at: string | null
          sent_at: string | null
          stripe_session_id: string | null
          ticket_id: string
          url: string | null
          voided_at: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          created_by?: string | null
          id?: string
          paid_at?: string | null
          paid_manually_reason?: string | null
          reminder_sent_at?: string | null
          sent_at?: string | null
          stripe_session_id?: string | null
          ticket_id: string
          url?: string | null
          voided_at?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string | null
          id?: string
          paid_at?: string | null
          paid_manually_reason?: string | null
          reminder_sent_at?: string | null
          sent_at?: string | null
          stripe_session_id?: string | null
          ticket_id?: string
          url?: string | null
          voided_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      parts: {
        Row: {
          component: Database["public"]["Enums"]["component"]
          created_at: string
          id: string
          is_active: boolean
          name: string
          reorder_at: number
          sku: string
          supplier: string | null
          unit_cost: number | null
          updated_at: string
          workspace_id: string
        }
        Insert: {
          component: Database["public"]["Enums"]["component"]
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          reorder_at?: number
          sku: string
          supplier?: string | null
          unit_cost?: number | null
          updated_at?: string
          workspace_id: string
        }
        Update: {
          component?: Database["public"]["Enums"]["component"]
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          reorder_at?: number
          sku?: string
          supplier?: string | null
          unit_cost?: number | null
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "parts_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string
          email: string
          id: string
          is_active: boolean
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_name: string
          email: string
          id: string
          is_active?: boolean
          role: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_name?: string
          email?: string
          id?: string
          is_active?: boolean
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Relationships: []
      }
      shipments: {
        Row: {
          carrier_code: string | null
          cost: number | null
          created_at: string
          created_by: string | null
          delivered_at: string | null
          direction: string
          id: string
          label_path: string | null
          service_code: string | null
          ship_to: Json | null
          shipped_at: string | null
          shipstation_label_id: string | null
          signature_required: boolean
          source: string
          ticket_id: string
          tracking_number: string | null
          voided_at: string | null
        }
        Insert: {
          carrier_code?: string | null
          cost?: number | null
          created_at?: string
          created_by?: string | null
          delivered_at?: string | null
          direction: string
          id?: string
          label_path?: string | null
          service_code?: string | null
          ship_to?: Json | null
          shipped_at?: string | null
          shipstation_label_id?: string | null
          signature_required?: boolean
          source: string
          ticket_id: string
          tracking_number?: string | null
          voided_at?: string | null
        }
        Update: {
          carrier_code?: string | null
          cost?: number | null
          created_at?: string
          created_by?: string | null
          delivered_at?: string | null
          direction?: string
          id?: string
          label_path?: string | null
          service_code?: string | null
          ship_to?: Json | null
          shipped_at?: string | null
          shipstation_label_id?: string | null
          signature_required?: boolean
          source?: string
          ticket_id?: string
          tracking_number?: string | null
          voided_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shipments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipments_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_movements: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          note: string | null
          part_id: string
          qty_delta: number
          reason: string
          ticket_id: string | null
          unit_cost_at_time: number | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          note?: string | null
          part_id: string
          qty_delta: number
          reason: string
          ticket_id?: string | null
          unit_cost_at_time?: number | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          note?: string | null
          part_id?: string
          qty_delta?: number
          reason?: string
          ticket_id?: string | null
          unit_cost_at_time?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_movements_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_part_id_fkey"
            columns: ["part_id"]
            isOneToOne: false
            referencedRelation: "parts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_part_id_fkey"
            columns: ["part_id"]
            isOneToOne: false
            referencedRelation: "parts_for_bench"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_emails: {
        Row: {
          body_html: string
          created_at: string
          created_by: string | null
          id: string
          scheduled_at: string
          sent_at: string | null
          skipped_at: string | null
          subject: string
          template: string
          ticket_id: string
          to_email: string
        }
        Insert: {
          body_html: string
          created_at?: string
          created_by?: string | null
          id?: string
          scheduled_at?: string
          sent_at?: string | null
          skipped_at?: string | null
          subject: string
          template: string
          ticket_id: string
          to_email: string
        }
        Update: {
          body_html?: string
          created_at?: string
          created_by?: string | null
          id?: string
          scheduled_at?: string
          sent_at?: string | null
          skipped_at?: string | null
          subject?: string
          template?: string
          ticket_id?: string
          to_email?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_emails_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_emails_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_events: {
        Row: {
          actor_id: string | null
          body: string | null
          created_at: string
          from_stage: Database["public"]["Enums"]["stage"] | null
          id: string
          payload: Json | null
          ticket_id: string
          to_stage: Database["public"]["Enums"]["stage"] | null
          type: string
        }
        Insert: {
          actor_id?: string | null
          body?: string | null
          created_at?: string
          from_stage?: Database["public"]["Enums"]["stage"] | null
          id?: string
          payload?: Json | null
          ticket_id: string
          to_stage?: Database["public"]["Enums"]["stage"] | null
          type: string
        }
        Update: {
          actor_id?: string | null
          body?: string | null
          created_at?: string
          from_stage?: Database["public"]["Enums"]["stage"] | null
          id?: string
          payload?: Json | null
          ticket_id?: string
          to_stage?: Database["public"]["Enums"]["stage"] | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_events_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_events_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_parts: {
        Row: {
          component: Database["public"]["Enums"]["component"] | null
          created_at: string
          id: string
          name: string
          part_id: string | null
          qty: number
          requested_at: string | null
          requested_by: string | null
          sent_at: string | null
          sent_by: string | null
          sku: string | null
          source: string
          stock_movement_id: string | null
          ticket_id: string
          tracking_number: string | null
          updated_at: string
          used_at: string | null
        }
        Insert: {
          component?: Database["public"]["Enums"]["component"] | null
          created_at?: string
          id?: string
          name: string
          part_id?: string | null
          qty?: number
          requested_at?: string | null
          requested_by?: string | null
          sent_at?: string | null
          sent_by?: string | null
          sku?: string | null
          source: string
          stock_movement_id?: string | null
          ticket_id: string
          tracking_number?: string | null
          updated_at?: string
          used_at?: string | null
        }
        Update: {
          component?: Database["public"]["Enums"]["component"] | null
          created_at?: string
          id?: string
          name?: string
          part_id?: string | null
          qty?: number
          requested_at?: string | null
          requested_by?: string | null
          sent_at?: string | null
          sent_by?: string | null
          sku?: string | null
          source?: string
          stock_movement_id?: string | null
          ticket_id?: string
          tracking_number?: string | null
          updated_at?: string
          used_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ticket_parts_part_id_fkey"
            columns: ["part_id"]
            isOneToOne: false
            referencedRelation: "parts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_parts_part_id_fkey"
            columns: ["part_id"]
            isOneToOne: false
            referencedRelation: "parts_for_bench"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_parts_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_parts_sent_by_fkey"
            columns: ["sent_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_parts_stock_movement_id_fkey"
            columns: ["stock_movement_id"]
            isOneToOne: false
            referencedRelation: "stock_movements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_parts_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      tickets: {
        Row: {
          brand_id: string
          closed_at: string | null
          coverage: string | null
          created_at: string
          created_by: string | null
          customer_email: string | null
          customer_name: string | null
          customer_phone: string | null
          customer_photos: string[]
          estimated_done_at: string | null
          gmail_thread_id: string | null
          id: string
          in_person_handoff: boolean
          intake_components: Json
          intake_notes: string | null
          intake_photos: string[]
          issue_description: string | null
          parts_reminder_snoozed_until: string | null
          parts_requested_at: string | null
          payment_status: string
          pending_return_address: Json | null
          pending_return_address_at: string | null
          priority: boolean
          repair_categories: Json
          repair_complete: boolean
          repair_photos: string[]
          requires_payment: boolean
          return_address: Json | null
          search: unknown
          signature_required: boolean
          solution_notes: string | null
          stage: Database["public"]["Enums"]["stage"]
          tags: string[]
          testing_checks: Json
          testing_notes: string | null
          testing_photos: string[]
          ticket_number: string
          time_spent_minutes: number | null
          updated_at: string
          watch_id: string | null
          watch_model: string | null
          watch_received_at: string | null
          watch_serial: string | null
          workspace_id: string
        }
        Insert: {
          brand_id: string
          closed_at?: string | null
          coverage?: string | null
          created_at?: string
          created_by?: string | null
          customer_email?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          customer_photos?: string[]
          estimated_done_at?: string | null
          gmail_thread_id?: string | null
          id?: string
          in_person_handoff?: boolean
          intake_components?: Json
          intake_notes?: string | null
          intake_photos?: string[]
          issue_description?: string | null
          parts_reminder_snoozed_until?: string | null
          parts_requested_at?: string | null
          payment_status?: string
          pending_return_address?: Json | null
          pending_return_address_at?: string | null
          priority?: boolean
          repair_categories?: Json
          repair_complete?: boolean
          repair_photos?: string[]
          requires_payment?: boolean
          return_address?: Json | null
          search?: unknown
          signature_required?: boolean
          solution_notes?: string | null
          stage?: Database["public"]["Enums"]["stage"]
          tags?: string[]
          testing_checks?: Json
          testing_notes?: string | null
          testing_photos?: string[]
          ticket_number: string
          time_spent_minutes?: number | null
          updated_at?: string
          watch_id?: string | null
          watch_model?: string | null
          watch_received_at?: string | null
          watch_serial?: string | null
          workspace_id: string
        }
        Update: {
          brand_id?: string
          closed_at?: string | null
          coverage?: string | null
          created_at?: string
          created_by?: string | null
          customer_email?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          customer_photos?: string[]
          estimated_done_at?: string | null
          gmail_thread_id?: string | null
          id?: string
          in_person_handoff?: boolean
          intake_components?: Json
          intake_notes?: string | null
          intake_photos?: string[]
          issue_description?: string | null
          parts_reminder_snoozed_until?: string | null
          parts_requested_at?: string | null
          payment_status?: string
          pending_return_address?: Json | null
          pending_return_address_at?: string | null
          priority?: boolean
          repair_categories?: Json
          repair_complete?: boolean
          repair_photos?: string[]
          requires_payment?: boolean
          return_address?: Json | null
          search?: unknown
          signature_required?: boolean
          solution_notes?: string | null
          stage?: Database["public"]["Enums"]["stage"]
          tags?: string[]
          testing_checks?: Json
          testing_notes?: string | null
          testing_photos?: string[]
          ticket_number?: string
          time_spent_minutes?: number | null
          updated_at?: string
          watch_id?: string | null
          watch_model?: string | null
          watch_received_at?: string | null
          watch_serial?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tickets_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_watch_id_fkey"
            columns: ["watch_id"]
            isOneToOne: false
            referencedRelation: "watches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      user_brands: {
        Row: {
          brand_id: string
          created_at: string
          user_id: string
        }
        Insert: {
          brand_id: string
          created_at?: string
          user_id: string
        }
        Update: {
          brand_id?: string
          created_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_brands_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_brands_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_workspaces: {
        Row: {
          created_at: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          user_id: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_workspaces_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_workspaces_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      watch_brands: {
        Row: {
          brand_id: string
          is_primary: boolean
          watch_id: string
        }
        Insert: {
          brand_id: string
          is_primary?: boolean
          watch_id: string
        }
        Update: {
          brand_id?: string
          is_primary?: boolean
          watch_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "watch_brands_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "watch_brands_watch_id_fkey"
            columns: ["watch_id"]
            isOneToOne: false
            referencedRelation: "watches"
            referencedColumns: ["id"]
          },
        ]
      }
      watch_parts: {
        Row: {
          notes: string | null
          part_id: string
          watch_id: string
        }
        Insert: {
          notes?: string | null
          part_id: string
          watch_id: string
        }
        Update: {
          notes?: string | null
          part_id?: string
          watch_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "watch_parts_part_id_fkey"
            columns: ["part_id"]
            isOneToOne: false
            referencedRelation: "parts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "watch_parts_part_id_fkey"
            columns: ["part_id"]
            isOneToOne: false
            referencedRelation: "parts_for_bench"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "watch_parts_watch_id_fkey"
            columns: ["watch_id"]
            isOneToOne: false
            referencedRelation: "watches"
            referencedColumns: ["id"]
          },
        ]
      }
      watches: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          model: string
          notes: string | null
          reference: string | null
          updated_at: string
          warranty_months: number | null
          workspace_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          model: string
          notes?: string | null
          reference?: string | null
          updated_at?: string
          warranty_months?: number | null
          workspace_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          model?: string
          notes?: string | null
          reference?: string | null
          updated_at?: string
          warranty_months?: number | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "watches_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspaces: {
        Row: {
          bench_address: Json | null
          created_at: string
          id: string
          name: string
          send_from_email: string | null
          send_from_name: string | null
          send_return_label_enabled: boolean
          skip_stage_emails: boolean
          slug: string
          stage_order: Database["public"]["Enums"]["stage"][]
          ticket_prefix: string
          updated_at: string
        }
        Insert: {
          bench_address?: Json | null
          created_at?: string
          id?: string
          name: string
          send_from_email?: string | null
          send_from_name?: string | null
          send_return_label_enabled?: boolean
          skip_stage_emails?: boolean
          slug: string
          stage_order?: Database["public"]["Enums"]["stage"][]
          ticket_prefix: string
          updated_at?: string
        }
        Update: {
          bench_address?: Json | null
          created_at?: string
          id?: string
          name?: string
          send_from_email?: string | null
          send_from_name?: string | null
          send_return_label_enabled?: boolean
          skip_stage_emails?: boolean
          slug?: string
          stage_order?: Database["public"]["Enums"]["stage"][]
          ticket_prefix?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      parts_for_bench: {
        Row: {
          component: Database["public"]["Enums"]["component"] | null
          id: string | null
          is_active: boolean | null
          name: string | null
          sku: string | null
          workspace_id: string | null
        }
        Insert: {
          component?: Database["public"]["Enums"]["component"] | null
          id?: string | null
          is_active?: boolean | null
          name?: string | null
          sku?: string | null
          workspace_id?: string | null
        }
        Update: {
          component?: Database["public"]["Enums"]["component"] | null
          id?: string | null
          is_active?: boolean | null
          name?: string | null
          sku?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "parts_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      parts_stock: {
        Row: {
          part_id: string | null
          stock_qty: number | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_movements_part_id_fkey"
            columns: ["part_id"]
            isOneToOne: false
            referencedRelation: "parts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_part_id_fkey"
            columns: ["part_id"]
            isOneToOne: false
            referencedRelation: "parts_for_bench"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      set_stage: {
        Args: {
          p_kind?: string
          p_ticket: string
          p_to: Database["public"]["Enums"]["stage"]
        }
        Returns: undefined
      }
    }
    Enums: {
      component:
        | "bezel_insert"
        | "bracelet"
        | "case"
        | "caseback"
        | "clasp"
        | "crown_tube"
        | "crystal"
        | "dial"
        | "gaskets"
        | "hands"
        | "lume"
        | "movement"
      stage:
        | "intake"
        | "send_return_label"
        | "received"
        | "request_part"
        | "in_repair"
        | "testing"
        | "shipped_back"
        | "closed"
        | "submitted"
        | "cs_diagnosing"
        | "awaiting_arrival"
        | "confirming_address"
        | "shipped"
      user_role: "workspace_admin" | "watchmaker" | "brand_rep"
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
      component: [
        "bezel_insert",
        "bracelet",
        "case",
        "caseback",
        "clasp",
        "crown_tube",
        "crystal",
        "dial",
        "gaskets",
        "hands",
        "lume",
        "movement",
      ],
      stage: [
        "intake",
        "send_return_label",
        "received",
        "request_part",
        "in_repair",
        "testing",
        "shipped_back",
        "closed",
        "submitted",
        "cs_diagnosing",
        "awaiting_arrival",
        "confirming_address",
        "shipped",
      ],
      user_role: ["workspace_admin", "watchmaker", "brand_rep"],
    },
  },
} as const
