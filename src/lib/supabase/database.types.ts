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
      ai_models: {
        Row: {
          created_at: string
          display_name: string
          id: string
          is_active: boolean
          model_key: string
          provider_id: string
        }
        Insert: {
          created_at?: string
          display_name: string
          id?: string
          is_active?: boolean
          model_key: string
          provider_id: string
        }
        Update: {
          created_at?: string
          display_name?: string
          id?: string
          is_active?: boolean
          model_key?: string
          provider_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_models_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "ai_providers"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_providers: {
        Row: {
          code: string
          created_at: string
          display_name: string
          id: string
          is_active: boolean
        }
        Insert: {
          code: string
          created_at?: string
          display_name: string
          id?: string
          is_active?: boolean
        }
        Update: {
          code?: string
          created_at?: string
          display_name?: string
          id?: string
          is_active?: boolean
        }
        Relationships: []
      }
      attendance_records: {
        Row: {
          captain_id: string
          created_at: string
          id: string
          import_batch_id: string | null
          operating_day_id: string
          recorded_by: string | null
          status: Database["public"]["Enums"]["attendance_status"]
          tenant_id: string
          updated_at: string
        }
        Insert: {
          captain_id: string
          created_at?: string
          id?: string
          import_batch_id?: string | null
          operating_day_id: string
          recorded_by?: string | null
          status: Database["public"]["Enums"]["attendance_status"]
          tenant_id: string
          updated_at?: string
        }
        Update: {
          captain_id?: string
          created_at?: string
          id?: string
          import_batch_id?: string | null
          operating_day_id?: string
          recorded_by?: string | null
          status?: Database["public"]["Enums"]["attendance_status"]
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_records_captain_id_fkey"
            columns: ["captain_id"]
            isOneToOne: false
            referencedRelation: "captains"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_records_import_batch_id_fkey"
            columns: ["import_batch_id"]
            isOneToOne: false
            referencedRelation: "import_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_records_operating_day_id_fkey"
            columns: ["operating_day_id"]
            isOneToOne: false
            referencedRelation: "operating_days"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_records_recorded_by_fkey"
            columns: ["recorded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_records_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          actor_user_id: string | null
          after_data: Json | null
          before_data: Json | null
          created_at: string
          entity_id: string | null
          entity_type: string
          id: number
          module: Database["public"]["Enums"]["audit_module"]
          operation_context: Database["public"]["Enums"]["operation_context"]
          request_id: string | null
          tenant_id: string | null
        }
        Insert: {
          action: string
          actor_user_id?: string | null
          after_data?: Json | null
          before_data?: Json | null
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: never
          module?: Database["public"]["Enums"]["audit_module"]
          operation_context?: Database["public"]["Enums"]["operation_context"]
          request_id?: string | null
          tenant_id?: string | null
        }
        Update: {
          action?: string
          actor_user_id?: string | null
          after_data?: Json | null
          before_data?: Json | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: never
          module?: Database["public"]["Enums"]["audit_module"]
          operation_context?: Database["public"]["Enums"]["operation_context"]
          request_id?: string | null
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_actor_user_id_fkey"
            columns: ["actor_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      captains: {
        Row: {
          archived_at: string | null
          city_id: string | null
          created_at: string
          external_user_id: string | null
          full_name: string
          group_label: string | null
          id: string
          metadata: Json
          phone: string
          service_center_name: string | null
          status: Database["public"]["Enums"]["captain_status"]
          team_id: string | null
          team_leader_name: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          city_id?: string | null
          created_at?: string
          external_user_id?: string | null
          full_name: string
          group_label?: string | null
          id?: string
          metadata?: Json
          phone: string
          service_center_name?: string | null
          status?: Database["public"]["Enums"]["captain_status"]
          team_id?: string | null
          team_leader_name?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          city_id?: string | null
          created_at?: string
          external_user_id?: string | null
          full_name?: string
          group_label?: string | null
          id?: string
          metadata?: Json
          phone?: string
          service_center_name?: string | null
          status?: Database["public"]["Enums"]["captain_status"]
          team_id?: string | null
          team_leader_name?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "captains_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "captains_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "captains_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      cities: {
        Row: {
          code: string | null
          id: string
          is_active: boolean
          name: string
          tenant_id: string
        }
        Insert: {
          code?: string | null
          id?: string
          is_active?: boolean
          name: string
          tenant_id: string
        }
        Update: {
          code?: string | null
          id?: string
          is_active?: boolean
          name?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cities_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      cod_records: {
        Row: {
          actual_amount: number | null
          captain_id: string
          created_at: string
          id: string
          import_batch_id: string | null
          operating_day_id: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          actual_amount?: number | null
          captain_id: string
          created_at?: string
          id?: string
          import_batch_id?: string | null
          operating_day_id: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          actual_amount?: number | null
          captain_id?: string
          created_at?: string
          id?: string
          import_batch_id?: string | null
          operating_day_id?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cod_records_captain_id_fkey"
            columns: ["captain_id"]
            isOneToOne: false
            referencedRelation: "captains"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cod_records_import_batch_id_fkey"
            columns: ["import_batch_id"]
            isOneToOne: false
            referencedRelation: "import_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cod_records_operating_day_id_fkey"
            columns: ["operating_day_id"]
            isOneToOne: false
            referencedRelation: "operating_days"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cod_records_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      deposit_cases: {
        Row: {
          captain_id: string
          collected_amount: number | null
          completed_deliveries: number | null
          created_at: string
          deposited_amount: number | null
          distance_km: number | null
          finalized_at: string | null
          finalized_by: string | null
          id: string
          is_late: boolean
          notes: string | null
          operating_day_id: string
          original_operating_day_id: string | null
          payment_method: Database["public"]["Enums"]["payment_method"]
          status: Database["public"]["Enums"]["deposit_status"]
          tenant_id: string
          updated_at: string
          variance_amount: number | null
        }
        Insert: {
          captain_id: string
          collected_amount?: number | null
          completed_deliveries?: number | null
          created_at?: string
          deposited_amount?: number | null
          distance_km?: number | null
          finalized_at?: string | null
          finalized_by?: string | null
          id?: string
          is_late?: boolean
          notes?: string | null
          operating_day_id: string
          original_operating_day_id?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"]
          status?: Database["public"]["Enums"]["deposit_status"]
          tenant_id: string
          updated_at?: string
          variance_amount?: number | null
        }
        Update: {
          captain_id?: string
          collected_amount?: number | null
          completed_deliveries?: number | null
          created_at?: string
          deposited_amount?: number | null
          distance_km?: number | null
          finalized_at?: string | null
          finalized_by?: string | null
          id?: string
          is_late?: boolean
          notes?: string | null
          operating_day_id?: string
          original_operating_day_id?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"]
          status?: Database["public"]["Enums"]["deposit_status"]
          tenant_id?: string
          updated_at?: string
          variance_amount?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "deposit_cases_captain_id_fkey"
            columns: ["captain_id"]
            isOneToOne: false
            referencedRelation: "captains"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deposit_cases_finalized_by_fkey"
            columns: ["finalized_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deposit_cases_operating_day_id_fkey"
            columns: ["operating_day_id"]
            isOneToOne: false
            referencedRelation: "operating_days"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deposit_cases_original_operating_day_id_fkey"
            columns: ["original_operating_day_id"]
            isOneToOne: false
            referencedRelation: "operating_days"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deposit_cases_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      deposit_events: {
        Row: {
          actor_user_id: string | null
          deposit_case_id: string
          event_type: string
          evidence_id: string | null
          id: string
          occurred_at: string
          payload: Json
          tenant_id: string
        }
        Insert: {
          actor_user_id?: string | null
          deposit_case_id: string
          event_type: string
          evidence_id?: string | null
          id?: string
          occurred_at?: string
          payload?: Json
          tenant_id: string
        }
        Update: {
          actor_user_id?: string | null
          deposit_case_id?: string
          event_type?: string
          evidence_id?: string | null
          id?: string
          occurred_at?: string
          payload?: Json
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "deposit_events_actor_user_id_fkey"
            columns: ["actor_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deposit_events_deposit_case_id_fkey"
            columns: ["deposit_case_id"]
            isOneToOne: false
            referencedRelation: "deposit_cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deposit_events_evidence_id_fkey"
            columns: ["evidence_id"]
            isOneToOne: false
            referencedRelation: "deposit_evidence"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deposit_events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      deposit_evidence: {
        Row: {
          archive_reason: string | null
          archived_at: string | null
          archived_by: string | null
          captain_id: string | null
          created_at: string
          deposit_case_id: string | null
          evidence_type: Database["public"]["Enums"]["evidence_type"]
          id: string
          media_asset_id: string | null
          message_id: string | null
          processed_at: string | null
          received_at: string
          rejection_reason: string | null
          status: Database["public"]["Enums"]["evidence_status"]
          tenant_id: string
        }
        Insert: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          captain_id?: string | null
          created_at?: string
          deposit_case_id?: string | null
          evidence_type: Database["public"]["Enums"]["evidence_type"]
          id?: string
          media_asset_id?: string | null
          message_id?: string | null
          processed_at?: string | null
          received_at?: string
          rejection_reason?: string | null
          status?: Database["public"]["Enums"]["evidence_status"]
          tenant_id: string
        }
        Update: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          captain_id?: string | null
          created_at?: string
          deposit_case_id?: string | null
          evidence_type?: Database["public"]["Enums"]["evidence_type"]
          id?: string
          media_asset_id?: string | null
          message_id?: string | null
          processed_at?: string | null
          received_at?: string
          rejection_reason?: string | null
          status?: Database["public"]["Enums"]["evidence_status"]
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "deposit_evidence_archived_by_fkey"
            columns: ["archived_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deposit_evidence_captain_id_fkey"
            columns: ["captain_id"]
            isOneToOne: false
            referencedRelation: "captains"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deposit_evidence_deposit_case_id_fkey"
            columns: ["deposit_case_id"]
            isOneToOne: false
            referencedRelation: "deposit_cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deposit_evidence_media_asset_id_fkey"
            columns: ["media_asset_id"]
            isOneToOne: false
            referencedRelation: "media_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deposit_evidence_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "incoming_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deposit_evidence_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      evidence_extractions: {
        Row: {
          ai_model_id: string | null
          completed_at: string | null
          confidence: number | null
          created_at: string
          evidence_id: string
          extracted_amount: number | null
          extracted_business_date: string | null
          extracted_collected_amount: number | null
          extracted_deliveries: number | null
          extracted_distance_km: number | null
          extracted_payment_method:
            | Database["public"]["Enums"]["payment_method"]
            | null
          extraction_schema_version: string
          failure_reason: string | null
          id: string
          normalized_output: Json
          raw_response: Json
          started_at: string | null
          status: Database["public"]["Enums"]["extraction_status"]
        }
        Insert: {
          ai_model_id?: string | null
          completed_at?: string | null
          confidence?: number | null
          created_at?: string
          evidence_id: string
          extracted_amount?: number | null
          extracted_business_date?: string | null
          extracted_collected_amount?: number | null
          extracted_deliveries?: number | null
          extracted_distance_km?: number | null
          extracted_payment_method?:
            | Database["public"]["Enums"]["payment_method"]
            | null
          extraction_schema_version?: string
          failure_reason?: string | null
          id?: string
          normalized_output?: Json
          raw_response?: Json
          started_at?: string | null
          status?: Database["public"]["Enums"]["extraction_status"]
        }
        Update: {
          ai_model_id?: string | null
          completed_at?: string | null
          confidence?: number | null
          created_at?: string
          evidence_id?: string
          extracted_amount?: number | null
          extracted_business_date?: string | null
          extracted_collected_amount?: number | null
          extracted_deliveries?: number | null
          extracted_distance_km?: number | null
          extracted_payment_method?:
            | Database["public"]["Enums"]["payment_method"]
            | null
          extraction_schema_version?: string
          failure_reason?: string | null
          id?: string
          normalized_output?: Json
          raw_response?: Json
          started_at?: string | null
          status?: Database["public"]["Enums"]["extraction_status"]
        }
        Relationships: [
          {
            foreignKeyName: "evidence_extractions_ai_model_id_fkey"
            columns: ["ai_model_id"]
            isOneToOne: false
            referencedRelation: "ai_models"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evidence_extractions_evidence_id_fkey"
            columns: ["evidence_id"]
            isOneToOne: false
            referencedRelation: "deposit_evidence"
            referencedColumns: ["id"]
          },
        ]
      }
      import_batches: {
        Row: {
          accepted_rows: number
          applied_at: string | null
          checksum: string | null
          created_at: string
          error_summary: string | null
          id: string
          kind: Database["public"]["Enums"]["import_kind"]
          operating_day_id: string | null
          original_filename: string
          rejected_rows: number
          source_rows: number
          status: Database["public"]["Enums"]["import_status"]
          storage_path: string
          tenant_id: string
          uploaded_by: string | null
        }
        Insert: {
          accepted_rows?: number
          applied_at?: string | null
          checksum?: string | null
          created_at?: string
          error_summary?: string | null
          id?: string
          kind: Database["public"]["Enums"]["import_kind"]
          operating_day_id?: string | null
          original_filename: string
          rejected_rows?: number
          source_rows?: number
          status?: Database["public"]["Enums"]["import_status"]
          storage_path: string
          tenant_id: string
          uploaded_by?: string | null
        }
        Update: {
          accepted_rows?: number
          applied_at?: string | null
          checksum?: string | null
          created_at?: string
          error_summary?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["import_kind"]
          operating_day_id?: string | null
          original_filename?: string
          rejected_rows?: number
          source_rows?: number
          status?: Database["public"]["Enums"]["import_status"]
          storage_path?: string
          tenant_id?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "import_batches_operating_day_id_fkey"
            columns: ["operating_day_id"]
            isOneToOne: false
            referencedRelation: "operating_days"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "import_batches_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "import_batches_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      import_rows: {
        Row: {
          batch_id: string
          error_messages: Json
          id: string
          is_valid: boolean
          normalized_data: Json | null
          raw_data: Json
          row_number: number
        }
        Insert: {
          batch_id: string
          error_messages?: Json
          id?: string
          is_valid?: boolean
          normalized_data?: Json | null
          raw_data: Json
          row_number: number
        }
        Update: {
          batch_id?: string
          error_messages?: Json
          id?: string
          is_valid?: boolean
          normalized_data?: Json | null
          raw_data?: Json
          row_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "import_rows_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "import_batches"
            referencedColumns: ["id"]
          },
        ]
      }
      incoming_messages: {
        Row: {
          captain_id: string | null
          created_at: string
          id: string
          provider: string
          provider_message_id: string
          raw_payload: Json
          received_at: string
          sender_phone: string
          tenant_id: string
          text_body: string | null
        }
        Insert: {
          captain_id?: string | null
          created_at?: string
          id?: string
          provider: string
          provider_message_id: string
          raw_payload?: Json
          received_at: string
          sender_phone: string
          tenant_id: string
          text_body?: string | null
        }
        Update: {
          captain_id?: string | null
          created_at?: string
          id?: string
          provider?: string
          provider_message_id?: string
          raw_payload?: Json
          received_at?: string
          sender_phone?: string
          tenant_id?: string
          text_body?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "incoming_messages_captain_id_fkey"
            columns: ["captain_id"]
            isOneToOne: false
            referencedRelation: "captains"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incoming_messages_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      media_assets: {
        Row: {
          created_at: string
          id: string
          message_id: string | null
          mime_type: string
          original_filename: string | null
          sha256: string | null
          size_bytes: number | null
          storage_path: string
          tenant_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message_id?: string | null
          mime_type: string
          original_filename?: string | null
          sha256?: string | null
          size_bytes?: number | null
          storage_path: string
          tenant_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message_id?: string | null
          mime_type?: string
          original_filename?: string | null
          sha256?: string | null
          size_bytes?: number | null
          storage_path?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "media_assets_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "incoming_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "media_assets_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      operating_days: {
        Row: {
          business_date: string
          closed_at: string | null
          closed_by: string | null
          created_at: string
          id: string
          locked_at: string | null
          status: Database["public"]["Enums"]["operating_day_status"]
          tenant_id: string
        }
        Insert: {
          business_date: string
          closed_at?: string | null
          closed_by?: string | null
          created_at?: string
          id?: string
          locked_at?: string | null
          status?: Database["public"]["Enums"]["operating_day_status"]
          tenant_id: string
        }
        Update: {
          business_date?: string
          closed_at?: string | null
          closed_by?: string | null
          created_at?: string
          id?: string
          locked_at?: string | null
          status?: Database["public"]["Enums"]["operating_day_status"]
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "operating_days_closed_by_fkey"
            columns: ["closed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operating_days_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string | null
          id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          full_name?: string | null
          id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      review_tasks: {
        Row: {
          assigned_to: string | null
          created_at: string
          description: string | null
          id: string
          priority: number
          reason_code: string
          resolution_note: string | null
          resolved_at: string | null
          resolved_by: string | null
          status: Database["public"]["Enums"]["review_status"]
          subject_id: string | null
          subject_type: Database["public"]["Enums"]["review_subject_type"]
          tenant_id: string
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string
          description?: string | null
          id?: string
          priority?: number
          reason_code: string
          resolution_note?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: Database["public"]["Enums"]["review_status"]
          subject_id?: string | null
          subject_type?: Database["public"]["Enums"]["review_subject_type"]
          tenant_id: string
        }
        Update: {
          assigned_to?: string | null
          created_at?: string
          description?: string | null
          id?: string
          priority?: number
          reason_code?: string
          resolution_note?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: Database["public"]["Enums"]["review_status"]
          subject_id?: string | null
          subject_type?: Database["public"]["Enums"]["review_subject_type"]
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "review_tasks_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "review_tasks_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "review_tasks_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          city_id: string | null
          code: string | null
          created_at: string
          id: string
          is_active: boolean
          name: string
          supervisor_membership_id: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          city_id?: string | null
          code?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          supervisor_membership_id?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          city_id?: string | null
          code?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          supervisor_membership_id?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "teams_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teams_supervisor_membership_id_fkey"
            columns: ["supervisor_membership_id"]
            isOneToOne: false
            referencedRelation: "tenant_memberships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teams_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_memberships: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          role: Database["public"]["Enums"]["app_role"]
          tenant_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          role: Database["public"]["Enums"]["app_role"]
          tenant_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          role?: Database["public"]["Enums"]["app_role"]
          tenant_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_memberships_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenant_memberships_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          business_day_cutoff: string
          created_at: string
          currency_code: string
          id: string
          is_active: boolean
          name: string
          slug: string
          timezone: string
          updated_at: string
        }
        Insert: {
          business_day_cutoff?: string
          created_at?: string
          currency_code?: string
          id?: string
          is_active?: boolean
          name: string
          slug: string
          timezone?: string
          updated_at?: string
        }
        Update: {
          business_day_cutoff?: string
          created_at?: string
          currency_code?: string
          id?: string
          is_active?: boolean
          name?: string
          slug?: string
          timezone?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      apply_captains_batch: {
        Args: { p_actor: string; p_batch_id: string }
        Returns: Json
      }
    }
    Enums: {
      app_role:
        | "owner"
        | "admin"
        | "accountant"
        | "supervisor"
        | "reviewer"
        | "operator"
        | "viewer"
      attendance_status: "present" | "absent" | "leave"
      audit_module:
        | "system"
        | "tenancy"
        | "captains"
        | "imports"
        | "deposits"
        | "reviews"
        | "reports"
        | "integrations"
      captain_status: "active" | "inactive" | "suspended"
      deposit_status:
        | "awaiting_sijil"
        | "awaiting_receipt"
        | "matched"
        | "review_required"
        | "approved"
        | "rejected"
        | "late"
        | "cancelled"
      evidence_status:
        | "received"
        | "processed"
        | "linked"
        | "rejected"
        | "review_required"
      evidence_type:
        | "sijil"
        | "receipt"
        | "pdf_receipt"
        | "text_deposit"
        | "unknown"
      extraction_status:
        | "queued"
        | "processing"
        | "succeeded"
        | "failed"
        | "needs_review"
      import_kind: "captains" | "attendance" | "cod"
      import_status:
        | "uploaded"
        | "validating"
        | "needs_review"
        | "applied"
        | "failed"
        | "cancelled"
      operating_day_status: "open" | "locked" | "closed"
      operation_context:
        | "system"
        | "dashboard"
        | "backend_api"
        | "rpc"
        | "whatsapp_webhook"
        | "file_import"
        | "scheduled_job"
        | "migration"
      payment_method: "cash" | "visa" | "none" | "unknown"
      review_status: "open" | "in_progress" | "resolved" | "dismissed"
      review_subject_type:
        | "general"
        | "deposit_case"
        | "deposit_evidence"
        | "captain"
        | "import_batch"
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
        "owner",
        "admin",
        "accountant",
        "supervisor",
        "reviewer",
        "operator",
        "viewer",
      ],
      attendance_status: ["present", "absent", "leave"],
      audit_module: [
        "system",
        "tenancy",
        "captains",
        "imports",
        "deposits",
        "reviews",
        "reports",
        "integrations",
      ],
      captain_status: ["active", "inactive", "suspended"],
      deposit_status: [
        "awaiting_sijil",
        "awaiting_receipt",
        "matched",
        "review_required",
        "approved",
        "rejected",
        "late",
        "cancelled",
      ],
      evidence_status: [
        "received",
        "processed",
        "linked",
        "rejected",
        "review_required",
      ],
      evidence_type: [
        "sijil",
        "receipt",
        "pdf_receipt",
        "text_deposit",
        "unknown",
      ],
      extraction_status: [
        "queued",
        "processing",
        "succeeded",
        "failed",
        "needs_review",
      ],
      import_kind: ["captains", "attendance", "cod"],
      import_status: [
        "uploaded",
        "validating",
        "needs_review",
        "applied",
        "failed",
        "cancelled",
      ],
      operating_day_status: ["open", "locked", "closed"],
      operation_context: [
        "system",
        "dashboard",
        "backend_api",
        "rpc",
        "whatsapp_webhook",
        "file_import",
        "scheduled_job",
        "migration",
      ],
      payment_method: ["cash", "visa", "none", "unknown"],
      review_status: ["open", "in_progress", "resolved", "dismissed"],
      review_subject_type: [
        "general",
        "deposit_case",
        "deposit_evidence",
        "captain",
        "import_batch",
      ],
    },
  },
} as const
