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
      memberships: {
        Row: {
          brand_id: string | null
          created_at: string
          created_by: string | null
          id: string
          role: Database["public"]["Enums"]["member_role"]
          user_id: string
          workspace_id: string | null
        }
        Insert: {
          brand_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          role: Database["public"]["Enums"]["member_role"]
          user_id: string
          workspace_id?: string | null
        }
        Update: {
          brand_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          role?: Database["public"]["Enums"]["member_role"]
          user_id?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "memberships_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "memberships_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "memberships_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "memberships_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      part_orders: {
        Row: {
          created_at: string
          created_by: string | null
          expected_at: string | null
          id: string
          note: string | null
          ordered_at: string
          part_id: string
          qty: number
          received_at: string | null
          stock_movement_id: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          expected_at?: string | null
          id?: string
          note?: string | null
          ordered_at?: string
          part_id: string
          qty: number
          received_at?: string | null
          stock_movement_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          expected_at?: string | null
          id?: string
          note?: string | null
          ordered_at?: string
          part_id?: string
          qty?: number
          received_at?: string | null
          stock_movement_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "part_orders_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "part_orders_part_id_fkey"
            columns: ["part_id"]
            isOneToOne: false
            referencedRelation: "parts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "part_orders_part_id_fkey"
            columns: ["part_id"]
            isOneToOne: false
            referencedRelation: "parts_for_bench"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "part_orders_stock_movement_id_fkey"
            columns: ["stock_movement_id"]
            isOneToOne: false
            referencedRelation: "stock_movements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "part_orders_stock_movement_id_fkey"
            columns: ["stock_movement_id"]
            isOneToOne: false
            referencedRelation: "stock_movements_for_bench"
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
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_name: string
          email: string
          id: string
          is_active?: boolean
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_name?: string
          email?: string
          id?: string
          is_active?: boolean
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
            foreignKeyName: "ticket_parts_stock_movement_id_fkey"
            columns: ["stock_movement_id"]
            isOneToOne: false
            referencedRelation: "stock_movements_for_bench"
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
          customer_watch_description: string | null
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
          watch_id: string
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
          customer_watch_description?: string | null
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
          watch_id: string
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
          customer_watch_description?: string | null
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
          watch_id?: string
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
          reorder_at: number | null
          sku: string | null
          workspace_id: string | null
        }
        Insert: {
          component?: Database["public"]["Enums"]["component"] | null
          id?: string | null
          is_active?: boolean | null
          name?: string | null
          reorder_at?: number | null
          sku?: string | null
          workspace_id?: string | null
        }
        Update: {
          component?: Database["public"]["Enums"]["component"] | null
          id?: string | null
          is_active?: boolean | null
          name?: string | null
          reorder_at?: number | null
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
      stock_movements_for_bench: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string | null
          note: string | null
          part_id: string | null
          qty_delta: number | null
          reason: string | null
          ticket_id: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string | null
          note?: string | null
          part_id?: string | null
          qty_delta?: number | null
          reason?: string | null
          ticket_id?: never
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string | null
          note?: string | null
          part_id?: string | null
          qty_delta?: number | null
          reason?: string | null
          ticket_id?: never
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
        ]
      }
    }
    Functions: {
      admin_update_profile: {
        Args: { p_display_name: string; p_is_active: boolean; p_user: string }
        Returns: undefined
      }
      consume_ticket_part: { Args: { p_row: string }; Returns: undefined }
      part_demand: {
        Args: { p_workspace: string }
        Returns: {
          part_id: string
          ticket_count: number
          waiting_qty: number
        }[]
      }
      receive_part_order: {
        Args: {
          p_note?: string
          p_order: string
          p_qty: number
          p_unit_cost?: number
        }
        Returns: undefined
      }
      release_ticket_part: { Args: { p_row: string }; Returns: undefined }
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
      member_role: "owner" | "admin" | "brand_rep" | "watchmaker"
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
      member_role: ["owner", "admin", "brand_rep", "watchmaker"],
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
    },
  },
} as const
