export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      advances: {
        Row: {
          advance_date: string;
          amount: number;
          company_id: string;
          created_at: string;
          created_by: string | null;
          deleted_at: string | null;
          id: string;
          note: string | null;
          updated_at: string;
          worker_id: string;
        };
        ComputedFields: never;
        Insert: {
          advance_date: string;
          amount: number;
          company_id: string;
          created_at?: string;
          created_by?: string | null;
          deleted_at?: string | null;
          id?: string;
          note?: string | null;
          updated_at?: string;
          worker_id: string;
        };
        Update: {
          advance_date?: string;
          amount?: number;
          company_id?: string;
          created_at?: string;
          created_by?: string | null;
          deleted_at?: string | null;
          id?: string;
          note?: string | null;
          updated_at?: string;
          worker_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "advances_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "advances_worker_id_fkey";
            columns: ["worker_id"];
            isOneToOne: false;
            referencedRelation: "workers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "advances_worker_id_fkey";
            columns: ["worker_id"];
            isOneToOne: false;
            referencedRelation: "workers_site";
            referencedColumns: ["id"];
          },
        ];
      };
      attendance: {
        Row: {
          client_updated_at: string | null;
          company_id: string;
          created_at: string;
          created_by: string | null;
          days: number;
          deleted_at: string | null;
          id: string;
          note: string | null;
          overtime_hours: number;
          project_id: string;
          updated_at: string;
          work_date: string;
          worker_id: string;
        };
        ComputedFields: never;
        Insert: {
          client_updated_at?: string | null;
          company_id: string;
          created_at?: string;
          created_by?: string | null;
          days?: number;
          deleted_at?: string | null;
          id?: string;
          note?: string | null;
          overtime_hours?: number;
          project_id: string;
          updated_at?: string;
          work_date: string;
          worker_id: string;
        };
        Update: {
          client_updated_at?: string | null;
          company_id?: string;
          created_at?: string;
          created_by?: string | null;
          days?: number;
          deleted_at?: string | null;
          id?: string;
          note?: string | null;
          overtime_hours?: number;
          project_id?: string;
          updated_at?: string;
          work_date?: string;
          worker_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "attendance_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "attendance_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "client_project_overview";
            referencedColumns: ["project_id"];
          },
          {
            foreignKeyName: "attendance_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "project_financials";
            referencedColumns: ["project_id"];
          },
          {
            foreignKeyName: "attendance_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "project_list";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "attendance_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "attendance_worker_id_fkey";
            columns: ["worker_id"];
            isOneToOne: false;
            referencedRelation: "workers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "attendance_worker_id_fkey";
            columns: ["worker_id"];
            isOneToOne: false;
            referencedRelation: "workers_site";
            referencedColumns: ["id"];
          },
        ];
      };
      audit_log: {
        Row: {
          action: string;
          company_id: string | null;
          created_at: string;
          created_by: string | null;
          deleted_at: string | null;
          id: string;
          new_data: Json | null;
          old_data: Json | null;
          project_id: string | null;
          record_id: string | null;
          table_name: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          action: string;
          company_id?: string | null;
          created_at?: string;
          created_by?: string | null;
          deleted_at?: string | null;
          id?: string;
          new_data?: Json | null;
          old_data?: Json | null;
          project_id?: string | null;
          record_id?: string | null;
          table_name: string;
          updated_at?: string;
        };
        Update: {
          action?: string;
          company_id?: string | null;
          created_at?: string;
          created_by?: string | null;
          deleted_at?: string | null;
          id?: string;
          new_data?: Json | null;
          old_data?: Json | null;
          project_id?: string | null;
          record_id?: string | null;
          table_name?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "audit_log_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "audit_log_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "client_project_overview";
            referencedColumns: ["project_id"];
          },
          {
            foreignKeyName: "audit_log_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "project_financials";
            referencedColumns: ["project_id"];
          },
          {
            foreignKeyName: "audit_log_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "project_list";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "audit_log_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
        ];
      };
      baseline_tasks: {
        Row: {
          baseline_id: string;
          company_id: string;
          created_at: string;
          created_by: string | null;
          deleted_at: string | null;
          duration: number;
          end_date: string;
          id: string;
          project_id: string;
          start_date: string;
          task_id: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          baseline_id: string;
          company_id: string;
          created_at?: string;
          created_by?: string | null;
          deleted_at?: string | null;
          duration: number;
          end_date: string;
          id?: string;
          project_id: string;
          start_date: string;
          task_id: string;
          updated_at?: string;
        };
        Update: {
          baseline_id?: string;
          company_id?: string;
          created_at?: string;
          created_by?: string | null;
          deleted_at?: string | null;
          duration?: number;
          end_date?: string;
          id?: string;
          project_id?: string;
          start_date?: string;
          task_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "baseline_tasks_baseline_id_fkey";
            columns: ["baseline_id"];
            isOneToOne: false;
            referencedRelation: "baselines";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "baseline_tasks_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "baseline_tasks_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "client_project_overview";
            referencedColumns: ["project_id"];
          },
          {
            foreignKeyName: "baseline_tasks_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "project_financials";
            referencedColumns: ["project_id"];
          },
          {
            foreignKeyName: "baseline_tasks_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "project_list";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "baseline_tasks_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "baseline_tasks_task_id_fkey";
            columns: ["task_id"];
            isOneToOne: false;
            referencedRelation: "task_progress";
            referencedColumns: ["task_id"];
          },
          {
            foreignKeyName: "baseline_tasks_task_id_fkey";
            columns: ["task_id"];
            isOneToOne: false;
            referencedRelation: "tasks";
            referencedColumns: ["id"];
          },
        ];
      };
      baselines: {
        Row: {
          company_id: string;
          created_at: string;
          created_by: string | null;
          deleted_at: string | null;
          id: string;
          is_active: boolean;
          name: string;
          project_id: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          company_id: string;
          created_at?: string;
          created_by?: string | null;
          deleted_at?: string | null;
          id?: string;
          is_active?: boolean;
          name: string;
          project_id: string;
          updated_at?: string;
        };
        Update: {
          company_id?: string;
          created_at?: string;
          created_by?: string | null;
          deleted_at?: string | null;
          id?: string;
          is_active?: boolean;
          name?: string;
          project_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "baselines_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "baselines_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "client_project_overview";
            referencedColumns: ["project_id"];
          },
          {
            foreignKeyName: "baselines_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "project_financials";
            referencedColumns: ["project_id"];
          },
          {
            foreignKeyName: "baselines_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "project_list";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "baselines_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
        ];
      };
      boq_items: {
        Row: {
          code: string;
          company_id: string;
          created_at: string;
          created_by: string | null;
          deleted_at: string | null;
          description: string;
          id: string;
          notes: string | null;
          origin_id: string | null;
          position: number;
          project_id: string;
          quantity: number;
          quantity_source: Database["public"]["Enums"]["quantity_source"];
          section_id: string;
          unit: Database["public"]["Enums"]["unit_code"];
          unit_cost: number | null;
          unit_price: number | null;
          upa_id: string | null;
          updated_at: string;
          version_id: string;
        };
        ComputedFields: never;
        Insert: {
          code?: string;
          company_id: string;
          created_at?: string;
          created_by?: string | null;
          deleted_at?: string | null;
          description: string;
          id?: string;
          notes?: string | null;
          origin_id?: string | null;
          position?: number;
          project_id: string;
          quantity?: number;
          quantity_source?: Database["public"]["Enums"]["quantity_source"];
          section_id: string;
          unit: Database["public"]["Enums"]["unit_code"];
          unit_cost?: number | null;
          unit_price?: number | null;
          upa_id?: string | null;
          updated_at?: string;
          version_id: string;
        };
        Update: {
          code?: string;
          company_id?: string;
          created_at?: string;
          created_by?: string | null;
          deleted_at?: string | null;
          description?: string;
          id?: string;
          notes?: string | null;
          origin_id?: string | null;
          position?: number;
          project_id?: string;
          quantity?: number;
          quantity_source?: Database["public"]["Enums"]["quantity_source"];
          section_id?: string;
          unit?: Database["public"]["Enums"]["unit_code"];
          unit_cost?: number | null;
          unit_price?: number | null;
          upa_id?: string | null;
          updated_at?: string;
          version_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "boq_items_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "boq_items_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "client_project_overview";
            referencedColumns: ["project_id"];
          },
          {
            foreignKeyName: "boq_items_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "project_financials";
            referencedColumns: ["project_id"];
          },
          {
            foreignKeyName: "boq_items_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "project_list";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "boq_items_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "boq_items_section_id_fkey";
            columns: ["section_id"];
            isOneToOne: false;
            referencedRelation: "boq_section_totals";
            referencedColumns: ["section_id"];
          },
          {
            foreignKeyName: "boq_items_section_id_fkey";
            columns: ["section_id"];
            isOneToOne: false;
            referencedRelation: "boq_sections";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "boq_items_section_id_fkey";
            columns: ["section_id"];
            isOneToOne: false;
            referencedRelation: "boq_sections_site";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "boq_items_upa_id_fkey";
            columns: ["upa_id"];
            isOneToOne: false;
            referencedRelation: "unit_price_analyses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "boq_items_upa_id_fkey";
            columns: ["upa_id"];
            isOneToOne: false;
            referencedRelation: "upa_values";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "boq_items_version_id_fkey";
            columns: ["version_id"];
            isOneToOne: false;
            referencedRelation: "boq_version_totals";
            referencedColumns: ["version_id"];
          },
          {
            foreignKeyName: "boq_items_version_id_fkey";
            columns: ["version_id"];
            isOneToOne: false;
            referencedRelation: "boq_versions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "boq_items_version_id_fkey";
            columns: ["version_id"];
            isOneToOne: false;
            referencedRelation: "boq_versions_site";
            referencedColumns: ["id"];
          },
        ];
      };
      boq_sections: {
        Row: {
          code: string;
          company_id: string;
          created_at: string;
          created_by: string | null;
          deleted_at: string | null;
          id: string;
          position: number;
          project_id: string;
          title: string;
          updated_at: string;
          version_id: string;
        };
        ComputedFields: never;
        Insert: {
          code?: string;
          company_id: string;
          created_at?: string;
          created_by?: string | null;
          deleted_at?: string | null;
          id?: string;
          position?: number;
          project_id: string;
          title: string;
          updated_at?: string;
          version_id: string;
        };
        Update: {
          code?: string;
          company_id?: string;
          created_at?: string;
          created_by?: string | null;
          deleted_at?: string | null;
          id?: string;
          position?: number;
          project_id?: string;
          title?: string;
          updated_at?: string;
          version_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "boq_sections_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "boq_sections_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "client_project_overview";
            referencedColumns: ["project_id"];
          },
          {
            foreignKeyName: "boq_sections_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "project_financials";
            referencedColumns: ["project_id"];
          },
          {
            foreignKeyName: "boq_sections_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "project_list";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "boq_sections_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "boq_sections_version_id_fkey";
            columns: ["version_id"];
            isOneToOne: false;
            referencedRelation: "boq_version_totals";
            referencedColumns: ["version_id"];
          },
          {
            foreignKeyName: "boq_sections_version_id_fkey";
            columns: ["version_id"];
            isOneToOne: false;
            referencedRelation: "boq_versions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "boq_sections_version_id_fkey";
            columns: ["version_id"];
            isOneToOne: false;
            referencedRelation: "boq_versions_site";
            referencedColumns: ["id"];
          },
        ];
      };
      boq_versions: {
        Row: {
          based_on_id: string | null;
          coefficient: number;
          company_id: string;
          created_at: string;
          created_by: string | null;
          deleted_at: string | null;
          id: string;
          is_current: boolean;
          name: string;
          notes: string | null;
          number: number;
          project_id: string;
          status: Database["public"]["Enums"]["boq_status"];
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          based_on_id?: string | null;
          coefficient?: number;
          company_id: string;
          created_at?: string;
          created_by?: string | null;
          deleted_at?: string | null;
          id?: string;
          is_current?: boolean;
          name: string;
          notes?: string | null;
          number: number;
          project_id: string;
          status?: Database["public"]["Enums"]["boq_status"];
          updated_at?: string;
        };
        Update: {
          based_on_id?: string | null;
          coefficient?: number;
          company_id?: string;
          created_at?: string;
          created_by?: string | null;
          deleted_at?: string | null;
          id?: string;
          is_current?: boolean;
          name?: string;
          notes?: string | null;
          number?: number;
          project_id?: string;
          status?: Database["public"]["Enums"]["boq_status"];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "boq_versions_based_on_id_fkey";
            columns: ["based_on_id"];
            isOneToOne: false;
            referencedRelation: "boq_version_totals";
            referencedColumns: ["version_id"];
          },
          {
            foreignKeyName: "boq_versions_based_on_id_fkey";
            columns: ["based_on_id"];
            isOneToOne: false;
            referencedRelation: "boq_versions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "boq_versions_based_on_id_fkey";
            columns: ["based_on_id"];
            isOneToOne: false;
            referencedRelation: "boq_versions_site";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "boq_versions_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "boq_versions_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "client_project_overview";
            referencedColumns: ["project_id"];
          },
          {
            foreignKeyName: "boq_versions_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "project_financials";
            referencedColumns: ["project_id"];
          },
          {
            foreignKeyName: "boq_versions_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "project_list";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "boq_versions_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
        ];
      };
      calendars: {
        Row: {
          company_id: string;
          created_at: string;
          created_by: string | null;
          deleted_at: string | null;
          hours_per_day: number;
          id: string;
          is_default: boolean;
          name: string;
          updated_at: string;
          working_days: number[];
        };
        ComputedFields: never;
        Insert: {
          company_id: string;
          created_at?: string;
          created_by?: string | null;
          deleted_at?: string | null;
          hours_per_day?: number;
          id?: string;
          is_default?: boolean;
          name: string;
          updated_at?: string;
          working_days?: number[];
        };
        Update: {
          company_id?: string;
          created_at?: string;
          created_by?: string | null;
          deleted_at?: string | null;
          hours_per_day?: number;
          id?: string;
          is_default?: boolean;
          name?: string;
          updated_at?: string;
          working_days?: number[];
        };
        Relationships: [
          {
            foreignKeyName: "calendars_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
        ];
      };
      checklist_templates: {
        Row: {
          category: string | null;
          company_id: string;
          created_at: string;
          created_by: string | null;
          deleted_at: string | null;
          id: string;
          items: NonNullable<Json>;
          name: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          category?: string | null;
          company_id: string;
          created_at?: string;
          created_by?: string | null;
          deleted_at?: string | null;
          id?: string;
          items?: NonNullable<Json>;
          name: string;
          updated_at?: string;
        };
        Update: {
          category?: string | null;
          company_id?: string;
          created_at?: string;
          created_by?: string | null;
          deleted_at?: string | null;
          id?: string;
          items?: NonNullable<Json>;
          name?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "checklist_templates_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
        ];
      };
      client_payments: {
        Row: {
          amount: number;
          claim_id: string | null;
          company_id: string;
          created_at: string;
          created_by: string | null;
          deleted_at: string | null;
          id: string;
          method: string | null;
          notes: string | null;
          payment_date: string;
          project_id: string;
          reference: string | null;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          amount: number;
          claim_id?: string | null;
          company_id: string;
          created_at?: string;
          created_by?: string | null;
          deleted_at?: string | null;
          id?: string;
          method?: string | null;
          notes?: string | null;
          payment_date: string;
          project_id: string;
          reference?: string | null;
          updated_at?: string;
        };
        Update: {
          amount?: number;
          claim_id?: string | null;
          company_id?: string;
          created_at?: string;
          created_by?: string | null;
          deleted_at?: string | null;
          id?: string;
          method?: string | null;
          notes?: string | null;
          payment_date?: string;
          project_id?: string;
          reference?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "client_payments_claim_id_fkey";
            columns: ["claim_id"];
            isOneToOne: false;
            referencedRelation: "progress_claim_values";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "client_payments_claim_id_fkey";
            columns: ["claim_id"];
            isOneToOne: false;
            referencedRelation: "progress_claims";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "client_payments_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "client_payments_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "client_project_overview";
            referencedColumns: ["project_id"];
          },
          {
            foreignKeyName: "client_payments_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "project_financials";
            referencedColumns: ["project_id"];
          },
          {
            foreignKeyName: "client_payments_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "project_list";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "client_payments_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
        ];
      };
      clients: {
        Row: {
          address: string | null;
          company_id: string;
          contact_name: string | null;
          created_at: string;
          created_by: string | null;
          deleted_at: string | null;
          email: string | null;
          id: string;
          name: string;
          notes: string | null;
          phone: string | null;
          tax_id: string | null;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          address?: string | null;
          company_id: string;
          contact_name?: string | null;
          created_at?: string;
          created_by?: string | null;
          deleted_at?: string | null;
          email?: string | null;
          id?: string;
          name: string;
          notes?: string | null;
          phone?: string | null;
          tax_id?: string | null;
          updated_at?: string;
        };
        Update: {
          address?: string | null;
          company_id?: string;
          contact_name?: string | null;
          created_at?: string;
          created_by?: string | null;
          deleted_at?: string | null;
          email?: string | null;
          id?: string;
          name?: string;
          notes?: string | null;
          phone?: string | null;
          tax_id?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "clients_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
        ];
      };
      companies: {
        Row: {
          address: string | null;
          city: string | null;
          country: Database["public"]["Enums"]["country_code"];
          created_at: string;
          created_by: string | null;
          default_currency: Database["public"]["Enums"]["currency_code"];
          default_language: Database["public"]["Enums"]["app_language"];
          deleted_at: string | null;
          email: string | null;
          id: string;
          legal_name: string | null;
          logo_path: string | null;
          name: string;
          phone: string | null;
          tax_id: string | null;
          timezone: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          address?: string | null;
          city?: string | null;
          country?: Database["public"]["Enums"]["country_code"];
          created_at?: string;
          created_by?: string | null;
          default_currency?: Database["public"]["Enums"]["currency_code"];
          default_language?: Database["public"]["Enums"]["app_language"];
          deleted_at?: string | null;
          email?: string | null;
          id?: string;
          legal_name?: string | null;
          logo_path?: string | null;
          name: string;
          phone?: string | null;
          tax_id?: string | null;
          timezone?: string;
          updated_at?: string;
        };
        Update: {
          address?: string | null;
          city?: string | null;
          country?: Database["public"]["Enums"]["country_code"];
          created_at?: string;
          created_by?: string | null;
          default_currency?: Database["public"]["Enums"]["currency_code"];
          default_language?: Database["public"]["Enums"]["app_language"];
          deleted_at?: string | null;
          email?: string | null;
          id?: string;
          legal_name?: string | null;
          logo_path?: string | null;
          name?: string;
          phone?: string | null;
          tax_id?: string | null;
          timezone?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      company_invitations: {
        Row: {
          accepted_at: string | null;
          accepted_by: string | null;
          company_id: string;
          created_at: string;
          created_by: string | null;
          deleted_at: string | null;
          email: string;
          expires_at: string;
          id: string;
          project_ids: string[];
          role: Database["public"]["Enums"]["app_role"];
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          accepted_at?: string | null;
          accepted_by?: string | null;
          company_id: string;
          created_at?: string;
          created_by?: string | null;
          deleted_at?: string | null;
          email: string;
          expires_at?: string;
          id?: string;
          project_ids?: string[];
          role: Database["public"]["Enums"]["app_role"];
          updated_at?: string;
        };
        Update: {
          accepted_at?: string | null;
          accepted_by?: string | null;
          company_id?: string;
          created_at?: string;
          created_by?: string | null;
          deleted_at?: string | null;
          email?: string;
          expires_at?: string;
          id?: string;
          project_ids?: string[];
          role?: Database["public"]["Enums"]["app_role"];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "company_invitations_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
        ];
      };
      company_members: {
        Row: {
          company_id: string;
          created_at: string;
          created_by: string | null;
          deleted_at: string | null;
          id: string;
          role: Database["public"]["Enums"]["app_role"];
          status: Database["public"]["Enums"]["member_status"];
          updated_at: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          company_id: string;
          created_at?: string;
          created_by?: string | null;
          deleted_at?: string | null;
          id?: string;
          role: Database["public"]["Enums"]["app_role"];
          status?: Database["public"]["Enums"]["member_status"];
          updated_at?: string;
          user_id: string;
        };
        Update: {
          company_id?: string;
          created_at?: string;
          created_by?: string | null;
          deleted_at?: string | null;
          id?: string;
          role?: Database["public"]["Enums"]["app_role"];
          status?: Database["public"]["Enums"]["member_status"];
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "company_members_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
        ];
      };
      company_settings: {
        Row: {
          advance_recovery_rate: number;
          company_id: string;
          created_at: string;
          created_by: string | null;
          deleted_at: string | null;
          fuel_unit_cost: number;
          id: string;
          low_stock_alerts: boolean;
          maintenance_alert_days: number;
          overtime_multiplier: number;
          price_coefficient: number;
          retention_rate: number;
          updated_at: string;
          vat_rate: number;
          working_hours_per_day: number;
        };
        ComputedFields: never;
        Insert: {
          advance_recovery_rate?: number;
          company_id: string;
          created_at?: string;
          created_by?: string | null;
          deleted_at?: string | null;
          fuel_unit_cost?: number;
          id?: string;
          low_stock_alerts?: boolean;
          maintenance_alert_days?: number;
          overtime_multiplier?: number;
          price_coefficient?: number;
          retention_rate?: number;
          updated_at?: string;
          vat_rate?: number;
          working_hours_per_day?: number;
        };
        Update: {
          advance_recovery_rate?: number;
          company_id?: string;
          created_at?: string;
          created_by?: string | null;
          deleted_at?: string | null;
          fuel_unit_cost?: number;
          id?: string;
          low_stock_alerts?: boolean;
          maintenance_alert_days?: number;
          overtime_multiplier?: number;
          price_coefficient?: number;
          retention_rate?: number;
          updated_at?: string;
          vat_rate?: number;
          working_hours_per_day?: number;
        };
        Relationships: [
          {
            foreignKeyName: "company_settings_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: true;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
        ];
      };
      daily_report_equipment: {
        Row: {
          client_updated_at: string | null;
          company_id: string;
          created_at: string;
          created_by: string | null;
          daily_report_id: string;
          deleted_at: string | null;
          equipment_name: string;
          hours: number;
          id: string;
          project_id: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          client_updated_at?: string | null;
          company_id: string;
          created_at?: string;
          created_by?: string | null;
          daily_report_id: string;
          deleted_at?: string | null;
          equipment_name: string;
          hours?: number;
          id?: string;
          project_id: string;
          updated_at?: string;
        };
        Update: {
          client_updated_at?: string | null;
          company_id?: string;
          created_at?: string;
          created_by?: string | null;
          daily_report_id?: string;
          deleted_at?: string | null;
          equipment_name?: string;
          hours?: number;
          id?: string;
          project_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "daily_report_equipment_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "daily_report_equipment_daily_report_id_fkey";
            columns: ["daily_report_id"];
            isOneToOne: false;
            referencedRelation: "daily_report_list";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "daily_report_equipment_daily_report_id_fkey";
            columns: ["daily_report_id"];
            isOneToOne: false;
            referencedRelation: "daily_reports";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "daily_report_equipment_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "client_project_overview";
            referencedColumns: ["project_id"];
          },
          {
            foreignKeyName: "daily_report_equipment_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "project_financials";
            referencedColumns: ["project_id"];
          },
          {
            foreignKeyName: "daily_report_equipment_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "project_list";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "daily_report_equipment_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
        ];
      };
      daily_report_labour: {
        Row: {
          client_updated_at: string | null;
          company_id: string;
          created_at: string;
          created_by: string | null;
          daily_report_id: string;
          deleted_at: string | null;
          headcount: number;
          hours: number;
          id: string;
          project_id: string;
          trade: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          client_updated_at?: string | null;
          company_id: string;
          created_at?: string;
          created_by?: string | null;
          daily_report_id: string;
          deleted_at?: string | null;
          headcount?: number;
          hours?: number;
          id?: string;
          project_id: string;
          trade: string;
          updated_at?: string;
        };
        Update: {
          client_updated_at?: string | null;
          company_id?: string;
          created_at?: string;
          created_by?: string | null;
          daily_report_id?: string;
          deleted_at?: string | null;
          headcount?: number;
          hours?: number;
          id?: string;
          project_id?: string;
          trade?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "daily_report_labour_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "daily_report_labour_daily_report_id_fkey";
            columns: ["daily_report_id"];
            isOneToOne: false;
            referencedRelation: "daily_report_list";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "daily_report_labour_daily_report_id_fkey";
            columns: ["daily_report_id"];
            isOneToOne: false;
            referencedRelation: "daily_reports";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "daily_report_labour_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "client_project_overview";
            referencedColumns: ["project_id"];
          },
          {
            foreignKeyName: "daily_report_labour_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "project_financials";
            referencedColumns: ["project_id"];
          },
          {
            foreignKeyName: "daily_report_labour_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "project_list";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "daily_report_labour_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
        ];
      };
      daily_report_materials: {
        Row: {
          client_updated_at: string | null;
          company_id: string;
          created_at: string;
          created_by: string | null;
          daily_report_id: string;
          deleted_at: string | null;
          id: string;
          material_name: string;
          project_id: string;
          quantity: number;
          resource_id: string | null;
          unit: Database["public"]["Enums"]["unit_code"];
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          client_updated_at?: string | null;
          company_id: string;
          created_at?: string;
          created_by?: string | null;
          daily_report_id: string;
          deleted_at?: string | null;
          id?: string;
          material_name: string;
          project_id: string;
          quantity?: number;
          resource_id?: string | null;
          unit?: Database["public"]["Enums"]["unit_code"];
          updated_at?: string;
        };
        Update: {
          client_updated_at?: string | null;
          company_id?: string;
          created_at?: string;
          created_by?: string | null;
          daily_report_id?: string;
          deleted_at?: string | null;
          id?: string;
          material_name?: string;
          project_id?: string;
          quantity?: number;
          resource_id?: string | null;
          unit?: Database["public"]["Enums"]["unit_code"];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "daily_report_materials_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "daily_report_materials_daily_report_id_fkey";
            columns: ["daily_report_id"];
            isOneToOne: false;
            referencedRelation: "daily_report_list";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "daily_report_materials_daily_report_id_fkey";
            columns: ["daily_report_id"];
            isOneToOne: false;
            referencedRelation: "daily_reports";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "daily_report_materials_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "client_project_overview";
            referencedColumns: ["project_id"];
          },
          {
            foreignKeyName: "daily_report_materials_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "project_financials";
            referencedColumns: ["project_id"];
          },
          {
            foreignKeyName: "daily_report_materials_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "project_list";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "daily_report_materials_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "daily_report_materials_resource_id_fkey";
            columns: ["resource_id"];
            isOneToOne: false;
            referencedRelation: "price_resources";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "daily_report_materials_resource_id_fkey";
            columns: ["resource_id"];
            isOneToOne: false;
            referencedRelation: "resources_site";
            referencedColumns: ["id"];
          },
        ];
      };
      daily_reports: {
        Row: {
          client_updated_at: string | null;
          company_id: string;
          created_at: string;
          created_by: string | null;
          deleted_at: string | null;
          id: string;
          project_id: string;
          report_date: string;
          status: Database["public"]["Enums"]["report_status"];
          summary: string;
          temperature_c: number | null;
          updated_at: string;
          weather: Database["public"]["Enums"]["weather_kind"] | null;
        };
        ComputedFields: never;
        Insert: {
          client_updated_at?: string | null;
          company_id: string;
          created_at?: string;
          created_by?: string | null;
          deleted_at?: string | null;
          id?: string;
          project_id: string;
          report_date: string;
          status?: Database["public"]["Enums"]["report_status"];
          summary?: string;
          temperature_c?: number | null;
          updated_at?: string;
          weather?: Database["public"]["Enums"]["weather_kind"] | null;
        };
        Update: {
          client_updated_at?: string | null;
          company_id?: string;
          created_at?: string;
          created_by?: string | null;
          deleted_at?: string | null;
          id?: string;
          project_id?: string;
          report_date?: string;
          status?: Database["public"]["Enums"]["report_status"];
          summary?: string;
          temperature_c?: number | null;
          updated_at?: string;
          weather?: Database["public"]["Enums"]["weather_kind"] | null;
        };
        Relationships: [
          {
            foreignKeyName: "daily_reports_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "daily_reports_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "client_project_overview";
            referencedColumns: ["project_id"];
          },
          {
            foreignKeyName: "daily_reports_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "project_financials";
            referencedColumns: ["project_id"];
          },
          {
            foreignKeyName: "daily_reports_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "project_list";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "daily_reports_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
        ];
      };
      deliveries: {
        Row: {
          client_updated_at: string | null;
          company_id: string;
          created_at: string;
          created_by: string | null;
          deleted_at: string | null;
          delivery_date: string;
          delivery_note: string | null;
          id: string;
          location_id: string | null;
          notes: string | null;
          project_id: string;
          purchase_order_id: string | null;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          client_updated_at?: string | null;
          company_id: string;
          created_at?: string;
          created_by?: string | null;
          deleted_at?: string | null;
          delivery_date: string;
          delivery_note?: string | null;
          id?: string;
          location_id?: string | null;
          notes?: string | null;
          project_id: string;
          purchase_order_id?: string | null;
          updated_at?: string;
        };
        Update: {
          client_updated_at?: string | null;
          company_id?: string;
          created_at?: string;
          created_by?: string | null;
          deleted_at?: string | null;
          delivery_date?: string;
          delivery_note?: string | null;
          id?: string;
          location_id?: string | null;
          notes?: string | null;
          project_id?: string;
          purchase_order_id?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "deliveries_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "deliveries_location_id_fkey";
            columns: ["location_id"];
            isOneToOne: false;
            referencedRelation: "stock_locations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "deliveries_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "client_project_overview";
            referencedColumns: ["project_id"];
          },
          {
            foreignKeyName: "deliveries_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "project_financials";
            referencedColumns: ["project_id"];
          },
          {
            foreignKeyName: "deliveries_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "project_list";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "deliveries_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "deliveries_purchase_order_id_fkey";
            columns: ["purchase_order_id"];
            isOneToOne: false;
            referencedRelation: "purchase_order_values";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "deliveries_purchase_order_id_fkey";
            columns: ["purchase_order_id"];
            isOneToOne: false;
            referencedRelation: "purchase_orders";
            referencedColumns: ["id"];
          },
        ];
      };
      delivery_lines: {
        Row: {
          client_updated_at: string | null;
          company_id: string;
          created_at: string;
          created_by: string | null;
          deleted_at: string | null;
          delivery_id: string;
          description: string;
          id: string;
          project_id: string;
          purchase_order_line_id: string | null;
          quantity_received: number;
          quantity_rejected: number;
          resource_id: string | null;
          unit: Database["public"]["Enums"]["unit_code"];
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          client_updated_at?: string | null;
          company_id: string;
          created_at?: string;
          created_by?: string | null;
          deleted_at?: string | null;
          delivery_id: string;
          description: string;
          id?: string;
          project_id: string;
          purchase_order_line_id?: string | null;
          quantity_received?: number;
          quantity_rejected?: number;
          resource_id?: string | null;
          unit?: Database["public"]["Enums"]["unit_code"];
          updated_at?: string;
        };
        Update: {
          client_updated_at?: string | null;
          company_id?: string;
          created_at?: string;
          created_by?: string | null;
          deleted_at?: string | null;
          delivery_id?: string;
          description?: string;
          id?: string;
          project_id?: string;
          purchase_order_line_id?: string | null;
          quantity_received?: number;
          quantity_rejected?: number;
          resource_id?: string | null;
          unit?: Database["public"]["Enums"]["unit_code"];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "delivery_lines_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "delivery_lines_delivery_id_fkey";
            columns: ["delivery_id"];
            isOneToOne: false;
            referencedRelation: "deliveries";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "delivery_lines_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "client_project_overview";
            referencedColumns: ["project_id"];
          },
          {
            foreignKeyName: "delivery_lines_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "project_financials";
            referencedColumns: ["project_id"];
          },
          {
            foreignKeyName: "delivery_lines_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "project_list";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "delivery_lines_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "delivery_lines_purchase_order_line_id_fkey";
            columns: ["purchase_order_line_id"];
            isOneToOne: false;
            referencedRelation: "purchase_order_lines";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "delivery_lines_purchase_order_line_id_fkey";
            columns: ["purchase_order_line_id"];
            isOneToOne: false;
            referencedRelation: "purchase_order_lines_site";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "delivery_lines_resource_id_fkey";
            columns: ["resource_id"];
            isOneToOne: false;
            referencedRelation: "price_resources";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "delivery_lines_resource_id_fkey";
            columns: ["resource_id"];
            isOneToOne: false;
            referencedRelation: "resources_site";
            referencedColumns: ["id"];
          },
        ];
      };
      documents: {
        Row: {
          company_id: string;
          created_at: string;
          created_by: string | null;
          deleted_at: string | null;
          document_key: string;
          file_name: string;
          file_path: string;
          folder: string;
          id: string;
          notes: string | null;
          project_id: string;
          shared_with_client: boolean;
          title: string;
          updated_at: string;
          version: number;
        };
        ComputedFields: never;
        Insert: {
          company_id: string;
          created_at?: string;
          created_by?: string | null;
          deleted_at?: string | null;
          document_key?: string;
          file_name?: string;
          file_path: string;
          folder?: string;
          id?: string;
          notes?: string | null;
          project_id: string;
          shared_with_client?: boolean;
          title: string;
          updated_at?: string;
          version?: number;
        };
        Update: {
          company_id?: string;
          created_at?: string;
          created_by?: string | null;
          deleted_at?: string | null;
          document_key?: string;
          file_name?: string;
          file_path?: string;
          folder?: string;
          id?: string;
          notes?: string | null;
          project_id?: string;
          shared_with_client?: boolean;
          title?: string;
          updated_at?: string;
          version?: number;
        };
        Relationships: [
          {
            foreignKeyName: "documents_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "documents_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "client_project_overview";
            referencedColumns: ["project_id"];
          },
          {
            foreignKeyName: "documents_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "project_financials";
            referencedColumns: ["project_id"];
          },
          {
            foreignKeyName: "documents_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "project_list";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "documents_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
        ];
      };
      drawing_revisions: {
        Row: {
          company_id: string;
          created_at: string;
          created_by: string | null;
          deleted_at: string | null;
          discipline: string | null;
          drawing_number: string;
          file_path: string | null;
          id: string;
          issued_date: string;
          notes: string | null;
          project_id: string;
          revision: string;
          title: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          company_id: string;
          created_at?: string;
          created_by?: string | null;
          deleted_at?: string | null;
          discipline?: string | null;
          drawing_number: string;
          file_path?: string | null;
          id?: string;
          issued_date: string;
          notes?: string | null;
          project_id: string;
          revision: string;
          title: string;
          updated_at?: string;
        };
        Update: {
          company_id?: string;
          created_at?: string;
          created_by?: string | null;
          deleted_at?: string | null;
          discipline?: string | null;
          drawing_number?: string;
          file_path?: string | null;
          id?: string;
          issued_date?: string;
          notes?: string | null;
          project_id?: string;
          revision?: string;
          title?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "drawing_revisions_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "drawing_revisions_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "client_project_overview";
            referencedColumns: ["project_id"];
          },
          {
            foreignKeyName: "drawing_revisions_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "project_financials";
            referencedColumns: ["project_id"];
          },
          {
            foreignKeyName: "drawing_revisions_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "project_list";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "drawing_revisions_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
        ];
      };
      equipment: {
        Row: {
          category: string | null;
          code: string;
          company_id: string;
          created_at: string;
          created_by: string | null;
          currency: Database["public"]["Enums"]["currency_code"];
          deleted_at: string | null;
          hourly_rate: number;
          id: string;
          name: string;
          notes: string | null;
          ownership: Database["public"]["Enums"]["equipment_ownership"];
          registration: string | null;
          status: Database["public"]["Enums"]["equipment_status"];
          supplier_id: string | null;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          category?: string | null;
          code: string;
          company_id: string;
          created_at?: string;
          created_by?: string | null;
          currency?: Database["public"]["Enums"]["currency_code"];
          deleted_at?: string | null;
          hourly_rate?: number;
          id?: string;
          name: string;
          notes?: string | null;
          ownership?: Database["public"]["Enums"]["equipment_ownership"];
          registration?: string | null;
          status?: Database["public"]["Enums"]["equipment_status"];
          supplier_id?: string | null;
          updated_at?: string;
        };
        Update: {
          category?: string | null;
          code?: string;
          company_id?: string;
          created_at?: string;
          created_by?: string | null;
          currency?: Database["public"]["Enums"]["currency_code"];
          deleted_at?: string | null;
          hourly_rate?: number;
          id?: string;
          name?: string;
          notes?: string | null;
          ownership?: Database["public"]["Enums"]["equipment_ownership"];
          registration?: string | null;
          status?: Database["public"]["Enums"]["equipment_status"];
          supplier_id?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "equipment_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "equipment_supplier_id_fkey";
            columns: ["supplier_id"];
            isOneToOne: false;
            referencedRelation: "suppliers";
            referencedColumns: ["id"];
          },
        ];
      };
      equipment_logs: {
        Row: {
          client_updated_at: string | null;
          company_id: string;
          created_at: string;
          created_by: string | null;
          deleted_at: string | null;
          equipment_id: string;
          fuel_litres: number;
          hours: number;
          id: string;
          log_date: string;
          notes: string | null;
          operator_name: string | null;
          project_id: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          client_updated_at?: string | null;
          company_id: string;
          created_at?: string;
          created_by?: string | null;
          deleted_at?: string | null;
          equipment_id: string;
          fuel_litres?: number;
          hours?: number;
          id?: string;
          log_date: string;
          notes?: string | null;
          operator_name?: string | null;
          project_id: string;
          updated_at?: string;
        };
        Update: {
          client_updated_at?: string | null;
          company_id?: string;
          created_at?: string;
          created_by?: string | null;
          deleted_at?: string | null;
          equipment_id?: string;
          fuel_litres?: number;
          hours?: number;
          id?: string;
          log_date?: string;
          notes?: string | null;
          operator_name?: string | null;
          project_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "equipment_logs_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "equipment_logs_equipment_id_fkey";
            columns: ["equipment_id"];
            isOneToOne: false;
            referencedRelation: "equipment";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "equipment_logs_equipment_id_fkey";
            columns: ["equipment_id"];
            isOneToOne: false;
            referencedRelation: "equipment_site";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "equipment_logs_equipment_id_fkey";
            columns: ["equipment_id"];
            isOneToOne: false;
            referencedRelation: "equipment_status_view";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "equipment_logs_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "client_project_overview";
            referencedColumns: ["project_id"];
          },
          {
            foreignKeyName: "equipment_logs_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "project_financials";
            referencedColumns: ["project_id"];
          },
          {
            foreignKeyName: "equipment_logs_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "project_list";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "equipment_logs_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
        ];
      };
      expenses: {
        Row: {
          amount: number;
          boq_item_id: string | null;
          category: Database["public"]["Enums"]["expense_category"];
          company_id: string;
          created_at: string;
          created_by: string | null;
          deleted_at: string | null;
          description: string;
          expense_date: string;
          id: string;
          project_id: string;
          receipt_path: string | null;
          reference: string | null;
          supplier_id: string | null;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          amount: number;
          boq_item_id?: string | null;
          category?: Database["public"]["Enums"]["expense_category"];
          company_id: string;
          created_at?: string;
          created_by?: string | null;
          deleted_at?: string | null;
          description: string;
          expense_date: string;
          id?: string;
          project_id: string;
          receipt_path?: string | null;
          reference?: string | null;
          supplier_id?: string | null;
          updated_at?: string;
        };
        Update: {
          amount?: number;
          boq_item_id?: string | null;
          category?: Database["public"]["Enums"]["expense_category"];
          company_id?: string;
          created_at?: string;
          created_by?: string | null;
          deleted_at?: string | null;
          description?: string;
          expense_date?: string;
          id?: string;
          project_id?: string;
          receipt_path?: string | null;
          reference?: string | null;
          supplier_id?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "expenses_boq_item_id_fkey";
            columns: ["boq_item_id"];
            isOneToOne: false;
            referencedRelation: "boq_item_progress";
            referencedColumns: ["boq_item_id"];
          },
          {
            foreignKeyName: "expenses_boq_item_id_fkey";
            columns: ["boq_item_id"];
            isOneToOne: false;
            referencedRelation: "boq_item_values";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "expenses_boq_item_id_fkey";
            columns: ["boq_item_id"];
            isOneToOne: false;
            referencedRelation: "boq_items";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "expenses_boq_item_id_fkey";
            columns: ["boq_item_id"];
            isOneToOne: false;
            referencedRelation: "boq_items_site";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "expenses_boq_item_id_fkey";
            columns: ["boq_item_id"];
            isOneToOne: false;
            referencedRelation: "current_boq_items_site";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "expenses_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "expenses_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "client_project_overview";
            referencedColumns: ["project_id"];
          },
          {
            foreignKeyName: "expenses_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "project_financials";
            referencedColumns: ["project_id"];
          },
          {
            foreignKeyName: "expenses_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "project_list";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "expenses_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "expenses_supplier_id_fkey";
            columns: ["supplier_id"];
            isOneToOne: false;
            referencedRelation: "suppliers";
            referencedColumns: ["id"];
          },
        ];
      };
      holidays: {
        Row: {
          calendar_id: string;
          company_id: string;
          created_at: string;
          created_by: string | null;
          date: string;
          deleted_at: string | null;
          id: string;
          name: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          calendar_id: string;
          company_id: string;
          created_at?: string;
          created_by?: string | null;
          date: string;
          deleted_at?: string | null;
          id?: string;
          name: string;
          updated_at?: string;
        };
        Update: {
          calendar_id?: string;
          company_id?: string;
          created_at?: string;
          created_by?: string | null;
          date?: string;
          deleted_at?: string | null;
          id?: string;
          name?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "holidays_calendar_id_fkey";
            columns: ["calendar_id"];
            isOneToOne: false;
            referencedRelation: "calendars";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "holidays_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
        ];
      };
      incidents: {
        Row: {
          action_taken: string | null;
          client_updated_at: string | null;
          company_id: string;
          created_at: string;
          created_by: string | null;
          daily_report_id: string | null;
          deleted_at: string | null;
          description: string;
          id: string;
          kind: Database["public"]["Enums"]["incident_kind"];
          occurred_at: string;
          project_id: string;
          severity: Database["public"]["Enums"]["severity_level"];
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          action_taken?: string | null;
          client_updated_at?: string | null;
          company_id: string;
          created_at?: string;
          created_by?: string | null;
          daily_report_id?: string | null;
          deleted_at?: string | null;
          description: string;
          id?: string;
          kind?: Database["public"]["Enums"]["incident_kind"];
          occurred_at?: string;
          project_id: string;
          severity?: Database["public"]["Enums"]["severity_level"];
          updated_at?: string;
        };
        Update: {
          action_taken?: string | null;
          client_updated_at?: string | null;
          company_id?: string;
          created_at?: string;
          created_by?: string | null;
          daily_report_id?: string | null;
          deleted_at?: string | null;
          description?: string;
          id?: string;
          kind?: Database["public"]["Enums"]["incident_kind"];
          occurred_at?: string;
          project_id?: string;
          severity?: Database["public"]["Enums"]["severity_level"];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "incidents_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "incidents_daily_report_id_fkey";
            columns: ["daily_report_id"];
            isOneToOne: false;
            referencedRelation: "daily_report_list";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "incidents_daily_report_id_fkey";
            columns: ["daily_report_id"];
            isOneToOne: false;
            referencedRelation: "daily_reports";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "incidents_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "client_project_overview";
            referencedColumns: ["project_id"];
          },
          {
            foreignKeyName: "incidents_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "project_financials";
            referencedColumns: ["project_id"];
          },
          {
            foreignKeyName: "incidents_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "project_list";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "incidents_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
        ];
      };
      inspections: {
        Row: {
          company_id: string;
          created_at: string;
          created_by: string | null;
          deleted_at: string | null;
          id: string;
          inspection_date: string;
          location: string | null;
          notes: string | null;
          project_id: string;
          results: NonNullable<Json>;
          status: Database["public"]["Enums"]["inspection_status"];
          template_id: string | null;
          title: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          company_id: string;
          created_at?: string;
          created_by?: string | null;
          deleted_at?: string | null;
          id?: string;
          inspection_date: string;
          location?: string | null;
          notes?: string | null;
          project_id: string;
          results?: NonNullable<Json>;
          status?: Database["public"]["Enums"]["inspection_status"];
          template_id?: string | null;
          title: string;
          updated_at?: string;
        };
        Update: {
          company_id?: string;
          created_at?: string;
          created_by?: string | null;
          deleted_at?: string | null;
          id?: string;
          inspection_date?: string;
          location?: string | null;
          notes?: string | null;
          project_id?: string;
          results?: NonNullable<Json>;
          status?: Database["public"]["Enums"]["inspection_status"];
          template_id?: string | null;
          title?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "inspections_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "inspections_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "client_project_overview";
            referencedColumns: ["project_id"];
          },
          {
            foreignKeyName: "inspections_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "project_financials";
            referencedColumns: ["project_id"];
          },
          {
            foreignKeyName: "inspections_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "project_list";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "inspections_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "inspections_template_id_fkey";
            columns: ["template_id"];
            isOneToOne: false;
            referencedRelation: "checklist_templates";
            referencedColumns: ["id"];
          },
        ];
      };
      maintenance_records: {
        Row: {
          company_id: string;
          cost: number;
          created_at: string;
          created_by: string | null;
          deleted_at: string | null;
          done_date: string | null;
          due_date: string | null;
          due_hours: number | null;
          equipment_id: string;
          id: string;
          notes: string | null;
          status: Database["public"]["Enums"]["maintenance_status"];
          title: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          company_id: string;
          cost?: number;
          created_at?: string;
          created_by?: string | null;
          deleted_at?: string | null;
          done_date?: string | null;
          due_date?: string | null;
          due_hours?: number | null;
          equipment_id: string;
          id?: string;
          notes?: string | null;
          status?: Database["public"]["Enums"]["maintenance_status"];
          title: string;
          updated_at?: string;
        };
        Update: {
          company_id?: string;
          cost?: number;
          created_at?: string;
          created_by?: string | null;
          deleted_at?: string | null;
          done_date?: string | null;
          due_date?: string | null;
          due_hours?: number | null;
          equipment_id?: string;
          id?: string;
          notes?: string | null;
          status?: Database["public"]["Enums"]["maintenance_status"];
          title?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "maintenance_records_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "maintenance_records_equipment_id_fkey";
            columns: ["equipment_id"];
            isOneToOne: false;
            referencedRelation: "equipment";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "maintenance_records_equipment_id_fkey";
            columns: ["equipment_id"];
            isOneToOne: false;
            referencedRelation: "equipment_site";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "maintenance_records_equipment_id_fkey";
            columns: ["equipment_id"];
            isOneToOne: false;
            referencedRelation: "equipment_status_view";
            referencedColumns: ["id"];
          },
        ];
      };
      notifications: {
        Row: {
          company_id: string;
          created_at: string;
          created_by: string | null;
          deleted_at: string | null;
          id: string;
          kind: string;
          link: string | null;
          payload: NonNullable<Json>;
          project_id: string | null;
          read_at: string | null;
          updated_at: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          company_id: string;
          created_at?: string;
          created_by?: string | null;
          deleted_at?: string | null;
          id?: string;
          kind: string;
          link?: string | null;
          payload?: NonNullable<Json>;
          project_id?: string | null;
          read_at?: string | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          company_id?: string;
          created_at?: string;
          created_by?: string | null;
          deleted_at?: string | null;
          id?: string;
          kind?: string;
          link?: string | null;
          payload?: NonNullable<Json>;
          project_id?: string | null;
          read_at?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "notifications_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "notifications_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "client_project_overview";
            referencedColumns: ["project_id"];
          },
          {
            foreignKeyName: "notifications_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "project_financials";
            referencedColumns: ["project_id"];
          },
          {
            foreignKeyName: "notifications_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "project_list";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "notifications_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
        ];
      };
      payroll_lines: {
        Row: {
          bonus: number;
          company_id: string;
          created_at: string;
          created_by: string | null;
          daily_rate: number;
          deduction: number;
          deleted_at: string | null;
          id: string;
          note: string | null;
          payroll_period_id: string;
          updated_at: string;
          worker_id: string;
        };
        ComputedFields: never;
        Insert: {
          bonus?: number;
          company_id: string;
          created_at?: string;
          created_by?: string | null;
          daily_rate: number;
          deduction?: number;
          deleted_at?: string | null;
          id?: string;
          note?: string | null;
          payroll_period_id: string;
          updated_at?: string;
          worker_id: string;
        };
        Update: {
          bonus?: number;
          company_id?: string;
          created_at?: string;
          created_by?: string | null;
          daily_rate?: number;
          deduction?: number;
          deleted_at?: string | null;
          id?: string;
          note?: string | null;
          payroll_period_id?: string;
          updated_at?: string;
          worker_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "payroll_lines_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "payroll_lines_payroll_period_id_fkey";
            columns: ["payroll_period_id"];
            isOneToOne: false;
            referencedRelation: "payroll_periods";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "payroll_lines_worker_id_fkey";
            columns: ["worker_id"];
            isOneToOne: false;
            referencedRelation: "workers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "payroll_lines_worker_id_fkey";
            columns: ["worker_id"];
            isOneToOne: false;
            referencedRelation: "workers_site";
            referencedColumns: ["id"];
          },
        ];
      };
      payroll_periods: {
        Row: {
          company_id: string;
          created_at: string;
          created_by: string | null;
          currency: Database["public"]["Enums"]["currency_code"];
          deleted_at: string | null;
          end_date: string;
          id: string;
          name: string;
          start_date: string;
          status: Database["public"]["Enums"]["payroll_status"];
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          company_id: string;
          created_at?: string;
          created_by?: string | null;
          currency?: Database["public"]["Enums"]["currency_code"];
          deleted_at?: string | null;
          end_date: string;
          id?: string;
          name: string;
          start_date: string;
          status?: Database["public"]["Enums"]["payroll_status"];
          updated_at?: string;
        };
        Update: {
          company_id?: string;
          created_at?: string;
          created_by?: string | null;
          currency?: Database["public"]["Enums"]["currency_code"];
          deleted_at?: string | null;
          end_date?: string;
          id?: string;
          name?: string;
          start_date?: string;
          status?: Database["public"]["Enums"]["payroll_status"];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "payroll_periods_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
        ];
      };
      photos: {
        Row: {
          caption: string | null;
          client_updated_at: string | null;
          company_id: string;
          created_at: string;
          created_by: string | null;
          daily_report_id: string | null;
          deleted_at: string | null;
          id: string;
          project_id: string;
          shared_with_client: boolean;
          site_issue_id: string | null;
          storage_path: string;
          taken_at: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          caption?: string | null;
          client_updated_at?: string | null;
          company_id: string;
          created_at?: string;
          created_by?: string | null;
          daily_report_id?: string | null;
          deleted_at?: string | null;
          id?: string;
          project_id: string;
          shared_with_client?: boolean;
          site_issue_id?: string | null;
          storage_path: string;
          taken_at?: string;
          updated_at?: string;
        };
        Update: {
          caption?: string | null;
          client_updated_at?: string | null;
          company_id?: string;
          created_at?: string;
          created_by?: string | null;
          daily_report_id?: string | null;
          deleted_at?: string | null;
          id?: string;
          project_id?: string;
          shared_with_client?: boolean;
          site_issue_id?: string | null;
          storage_path?: string;
          taken_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "photos_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "photos_daily_report_id_fkey";
            columns: ["daily_report_id"];
            isOneToOne: false;
            referencedRelation: "daily_report_list";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "photos_daily_report_id_fkey";
            columns: ["daily_report_id"];
            isOneToOne: false;
            referencedRelation: "daily_reports";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "photos_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "client_project_overview";
            referencedColumns: ["project_id"];
          },
          {
            foreignKeyName: "photos_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "project_financials";
            referencedColumns: ["project_id"];
          },
          {
            foreignKeyName: "photos_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "project_list";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "photos_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "photos_site_issue_id_fkey";
            columns: ["site_issue_id"];
            isOneToOne: false;
            referencedRelation: "site_issues";
            referencedColumns: ["id"];
          },
        ];
      };
      price_resources: {
        Row: {
          code: string;
          company_id: string;
          created_at: string;
          created_by: string | null;
          currency: Database["public"]["Enums"]["currency_code"];
          deleted_at: string | null;
          id: string;
          kind: Database["public"]["Enums"]["resource_kind"];
          name: string;
          notes: string | null;
          supplier_name: string | null;
          unit: Database["public"]["Enums"]["unit_code"];
          unit_cost: number;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          code: string;
          company_id: string;
          created_at?: string;
          created_by?: string | null;
          currency: Database["public"]["Enums"]["currency_code"];
          deleted_at?: string | null;
          id?: string;
          kind: Database["public"]["Enums"]["resource_kind"];
          name: string;
          notes?: string | null;
          supplier_name?: string | null;
          unit: Database["public"]["Enums"]["unit_code"];
          unit_cost?: number;
          updated_at?: string;
        };
        Update: {
          code?: string;
          company_id?: string;
          created_at?: string;
          created_by?: string | null;
          currency?: Database["public"]["Enums"]["currency_code"];
          deleted_at?: string | null;
          id?: string;
          kind?: Database["public"]["Enums"]["resource_kind"];
          name?: string;
          notes?: string | null;
          supplier_name?: string | null;
          unit?: Database["public"]["Enums"]["unit_code"];
          unit_cost?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "price_resources_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          created_at: string;
          created_by: string | null;
          deleted_at: string | null;
          email: string | null;
          full_name: string;
          id: string;
          language: Database["public"]["Enums"]["app_language"] | null;
          last_company_id: string | null;
          phone: string | null;
          theme: Database["public"]["Enums"]["theme_mode"];
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          created_by?: string | null;
          deleted_at?: string | null;
          email?: string | null;
          full_name?: string;
          id: string;
          language?: Database["public"]["Enums"]["app_language"] | null;
          last_company_id?: string | null;
          phone?: string | null;
          theme?: Database["public"]["Enums"]["theme_mode"];
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          deleted_at?: string | null;
          email?: string | null;
          full_name?: string;
          id?: string;
          language?: Database["public"]["Enums"]["app_language"] | null;
          last_company_id?: string | null;
          phone?: string | null;
          theme?: Database["public"]["Enums"]["theme_mode"];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "profiles_last_company_id_fkey";
            columns: ["last_company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
        ];
      };
      progress_claim_lines: {
        Row: {
          boq_item_id: string;
          claim_id: string;
          company_id: string;
          created_at: string;
          created_by: string | null;
          cumulative_quantity: number;
          deleted_at: string | null;
          id: string;
          previous_quantity: number;
          project_id: string;
          unit_price: number;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          boq_item_id: string;
          claim_id: string;
          company_id: string;
          created_at?: string;
          created_by?: string | null;
          cumulative_quantity?: number;
          deleted_at?: string | null;
          id?: string;
          previous_quantity?: number;
          project_id: string;
          unit_price?: number;
          updated_at?: string;
        };
        Update: {
          boq_item_id?: string;
          claim_id?: string;
          company_id?: string;
          created_at?: string;
          created_by?: string | null;
          cumulative_quantity?: number;
          deleted_at?: string | null;
          id?: string;
          previous_quantity?: number;
          project_id?: string;
          unit_price?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "progress_claim_lines_boq_item_id_fkey";
            columns: ["boq_item_id"];
            isOneToOne: false;
            referencedRelation: "boq_item_progress";
            referencedColumns: ["boq_item_id"];
          },
          {
            foreignKeyName: "progress_claim_lines_boq_item_id_fkey";
            columns: ["boq_item_id"];
            isOneToOne: false;
            referencedRelation: "boq_item_values";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "progress_claim_lines_boq_item_id_fkey";
            columns: ["boq_item_id"];
            isOneToOne: false;
            referencedRelation: "boq_items";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "progress_claim_lines_boq_item_id_fkey";
            columns: ["boq_item_id"];
            isOneToOne: false;
            referencedRelation: "boq_items_site";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "progress_claim_lines_boq_item_id_fkey";
            columns: ["boq_item_id"];
            isOneToOne: false;
            referencedRelation: "current_boq_items_site";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "progress_claim_lines_claim_id_fkey";
            columns: ["claim_id"];
            isOneToOne: false;
            referencedRelation: "progress_claim_values";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "progress_claim_lines_claim_id_fkey";
            columns: ["claim_id"];
            isOneToOne: false;
            referencedRelation: "progress_claims";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "progress_claim_lines_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "progress_claim_lines_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "client_project_overview";
            referencedColumns: ["project_id"];
          },
          {
            foreignKeyName: "progress_claim_lines_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "project_financials";
            referencedColumns: ["project_id"];
          },
          {
            foreignKeyName: "progress_claim_lines_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "project_list";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "progress_claim_lines_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
        ];
      };
      progress_claims: {
        Row: {
          advance_recovery_rate: number;
          client_comment: string | null;
          company_id: string;
          created_at: string;
          created_by: string | null;
          decided_at: string | null;
          decided_by: string | null;
          deleted_at: string | null;
          id: string;
          notes: string | null;
          number: number;
          period_end: string;
          period_start: string | null;
          project_id: string;
          retention_rate: number;
          status: Database["public"]["Enums"]["claim_status"];
          submitted_at: string | null;
          updated_at: string;
          vat_rate: number;
        };
        ComputedFields: never;
        Insert: {
          advance_recovery_rate?: number;
          client_comment?: string | null;
          company_id: string;
          created_at?: string;
          created_by?: string | null;
          decided_at?: string | null;
          decided_by?: string | null;
          deleted_at?: string | null;
          id?: string;
          notes?: string | null;
          number: number;
          period_end: string;
          period_start?: string | null;
          project_id: string;
          retention_rate?: number;
          status?: Database["public"]["Enums"]["claim_status"];
          submitted_at?: string | null;
          updated_at?: string;
          vat_rate?: number;
        };
        Update: {
          advance_recovery_rate?: number;
          client_comment?: string | null;
          company_id?: string;
          created_at?: string;
          created_by?: string | null;
          decided_at?: string | null;
          decided_by?: string | null;
          deleted_at?: string | null;
          id?: string;
          notes?: string | null;
          number?: number;
          period_end?: string;
          period_start?: string | null;
          project_id?: string;
          retention_rate?: number;
          status?: Database["public"]["Enums"]["claim_status"];
          submitted_at?: string | null;
          updated_at?: string;
          vat_rate?: number;
        };
        Relationships: [
          {
            foreignKeyName: "progress_claims_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "progress_claims_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "client_project_overview";
            referencedColumns: ["project_id"];
          },
          {
            foreignKeyName: "progress_claims_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "project_financials";
            referencedColumns: ["project_id"];
          },
          {
            foreignKeyName: "progress_claims_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "project_list";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "progress_claims_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
        ];
      };
      progress_entries: {
        Row: {
          boq_item_id: string;
          client_updated_at: string | null;
          company_id: string;
          created_at: string;
          created_by: string | null;
          daily_report_id: string | null;
          deleted_at: string | null;
          entry_date: string;
          id: string;
          note: string | null;
          project_id: string;
          quantity: number;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          boq_item_id: string;
          client_updated_at?: string | null;
          company_id: string;
          created_at?: string;
          created_by?: string | null;
          daily_report_id?: string | null;
          deleted_at?: string | null;
          entry_date: string;
          id?: string;
          note?: string | null;
          project_id: string;
          quantity: number;
          updated_at?: string;
        };
        Update: {
          boq_item_id?: string;
          client_updated_at?: string | null;
          company_id?: string;
          created_at?: string;
          created_by?: string | null;
          daily_report_id?: string | null;
          deleted_at?: string | null;
          entry_date?: string;
          id?: string;
          note?: string | null;
          project_id?: string;
          quantity?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "progress_entries_boq_item_id_fkey";
            columns: ["boq_item_id"];
            isOneToOne: false;
            referencedRelation: "boq_item_progress";
            referencedColumns: ["boq_item_id"];
          },
          {
            foreignKeyName: "progress_entries_boq_item_id_fkey";
            columns: ["boq_item_id"];
            isOneToOne: false;
            referencedRelation: "boq_item_values";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "progress_entries_boq_item_id_fkey";
            columns: ["boq_item_id"];
            isOneToOne: false;
            referencedRelation: "boq_items";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "progress_entries_boq_item_id_fkey";
            columns: ["boq_item_id"];
            isOneToOne: false;
            referencedRelation: "boq_items_site";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "progress_entries_boq_item_id_fkey";
            columns: ["boq_item_id"];
            isOneToOne: false;
            referencedRelation: "current_boq_items_site";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "progress_entries_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "progress_entries_daily_report_id_fkey";
            columns: ["daily_report_id"];
            isOneToOne: false;
            referencedRelation: "daily_report_list";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "progress_entries_daily_report_id_fkey";
            columns: ["daily_report_id"];
            isOneToOne: false;
            referencedRelation: "daily_reports";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "progress_entries_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "client_project_overview";
            referencedColumns: ["project_id"];
          },
          {
            foreignKeyName: "progress_entries_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "project_financials";
            referencedColumns: ["project_id"];
          },
          {
            foreignKeyName: "progress_entries_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "project_list";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "progress_entries_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
        ];
      };
      project_members: {
        Row: {
          company_id: string;
          created_at: string;
          created_by: string | null;
          deleted_at: string | null;
          id: string;
          project_id: string;
          updated_at: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          company_id: string;
          created_at?: string;
          created_by?: string | null;
          deleted_at?: string | null;
          id?: string;
          project_id: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          company_id?: string;
          created_at?: string;
          created_by?: string | null;
          deleted_at?: string | null;
          id?: string;
          project_id?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "project_members_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "project_members_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "client_project_overview";
            referencedColumns: ["project_id"];
          },
          {
            foreignKeyName: "project_members_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "project_financials";
            referencedColumns: ["project_id"];
          },
          {
            foreignKeyName: "project_members_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "project_list";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "project_members_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
        ];
      };
      project_settings: {
        Row: {
          advance_amount: number;
          advance_recovery_rate: number;
          calendar_id: string | null;
          company_id: string;
          created_at: string;
          created_by: string | null;
          deleted_at: string | null;
          id: string;
          price_coefficient: number;
          project_id: string;
          retention_cap_rate: number | null;
          retention_rate: number;
          updated_at: string;
          vat_rate: number;
        };
        ComputedFields: never;
        Insert: {
          advance_amount?: number;
          advance_recovery_rate?: number;
          calendar_id?: string | null;
          company_id: string;
          created_at?: string;
          created_by?: string | null;
          deleted_at?: string | null;
          id?: string;
          price_coefficient?: number;
          project_id: string;
          retention_cap_rate?: number | null;
          retention_rate?: number;
          updated_at?: string;
          vat_rate?: number;
        };
        Update: {
          advance_amount?: number;
          advance_recovery_rate?: number;
          calendar_id?: string | null;
          company_id?: string;
          created_at?: string;
          created_by?: string | null;
          deleted_at?: string | null;
          id?: string;
          price_coefficient?: number;
          project_id?: string;
          retention_cap_rate?: number | null;
          retention_rate?: number;
          updated_at?: string;
          vat_rate?: number;
        };
        Relationships: [
          {
            foreignKeyName: "project_settings_calendar_id_fkey";
            columns: ["calendar_id"];
            isOneToOne: false;
            referencedRelation: "calendars";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "project_settings_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "project_settings_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: true;
            referencedRelation: "client_project_overview";
            referencedColumns: ["project_id"];
          },
          {
            foreignKeyName: "project_settings_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: true;
            referencedRelation: "project_financials";
            referencedColumns: ["project_id"];
          },
          {
            foreignKeyName: "project_settings_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: true;
            referencedRelation: "project_list";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "project_settings_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: true;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
        ];
      };
      projects: {
        Row: {
          city: string | null;
          client_id: string | null;
          code: string;
          company_id: string;
          country: Database["public"]["Enums"]["country_code"];
          created_at: string;
          created_by: string | null;
          currency: Database["public"]["Enums"]["currency_code"];
          deleted_at: string | null;
          description: string | null;
          end_date: string | null;
          id: string;
          name: string;
          site_address: string | null;
          start_date: string | null;
          status: Database["public"]["Enums"]["project_status"];
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          city?: string | null;
          client_id?: string | null;
          code: string;
          company_id: string;
          country?: Database["public"]["Enums"]["country_code"];
          created_at?: string;
          created_by?: string | null;
          currency: Database["public"]["Enums"]["currency_code"];
          deleted_at?: string | null;
          description?: string | null;
          end_date?: string | null;
          id?: string;
          name: string;
          site_address?: string | null;
          start_date?: string | null;
          status?: Database["public"]["Enums"]["project_status"];
          updated_at?: string;
        };
        Update: {
          city?: string | null;
          client_id?: string | null;
          code?: string;
          company_id?: string;
          country?: Database["public"]["Enums"]["country_code"];
          created_at?: string;
          created_by?: string | null;
          currency?: Database["public"]["Enums"]["currency_code"];
          deleted_at?: string | null;
          description?: string | null;
          end_date?: string | null;
          id?: string;
          name?: string;
          site_address?: string | null;
          start_date?: string | null;
          status?: Database["public"]["Enums"]["project_status"];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "projects_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "clients";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "projects_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
        ];
      };
      purchase_order_lines: {
        Row: {
          boq_item_id: string | null;
          company_id: string;
          created_at: string;
          created_by: string | null;
          deleted_at: string | null;
          description: string;
          id: string;
          project_id: string;
          purchase_order_id: string;
          quantity: number;
          resource_id: string | null;
          unit: Database["public"]["Enums"]["unit_code"];
          unit_price: number;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          boq_item_id?: string | null;
          company_id: string;
          created_at?: string;
          created_by?: string | null;
          deleted_at?: string | null;
          description: string;
          id?: string;
          project_id: string;
          purchase_order_id: string;
          quantity: number;
          resource_id?: string | null;
          unit?: Database["public"]["Enums"]["unit_code"];
          unit_price?: number;
          updated_at?: string;
        };
        Update: {
          boq_item_id?: string | null;
          company_id?: string;
          created_at?: string;
          created_by?: string | null;
          deleted_at?: string | null;
          description?: string;
          id?: string;
          project_id?: string;
          purchase_order_id?: string;
          quantity?: number;
          resource_id?: string | null;
          unit?: Database["public"]["Enums"]["unit_code"];
          unit_price?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "purchase_order_lines_boq_item_id_fkey";
            columns: ["boq_item_id"];
            isOneToOne: false;
            referencedRelation: "boq_item_progress";
            referencedColumns: ["boq_item_id"];
          },
          {
            foreignKeyName: "purchase_order_lines_boq_item_id_fkey";
            columns: ["boq_item_id"];
            isOneToOne: false;
            referencedRelation: "boq_item_values";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "purchase_order_lines_boq_item_id_fkey";
            columns: ["boq_item_id"];
            isOneToOne: false;
            referencedRelation: "boq_items";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "purchase_order_lines_boq_item_id_fkey";
            columns: ["boq_item_id"];
            isOneToOne: false;
            referencedRelation: "boq_items_site";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "purchase_order_lines_boq_item_id_fkey";
            columns: ["boq_item_id"];
            isOneToOne: false;
            referencedRelation: "current_boq_items_site";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "purchase_order_lines_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "purchase_order_lines_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "client_project_overview";
            referencedColumns: ["project_id"];
          },
          {
            foreignKeyName: "purchase_order_lines_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "project_financials";
            referencedColumns: ["project_id"];
          },
          {
            foreignKeyName: "purchase_order_lines_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "project_list";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "purchase_order_lines_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "purchase_order_lines_purchase_order_id_fkey";
            columns: ["purchase_order_id"];
            isOneToOne: false;
            referencedRelation: "purchase_order_values";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "purchase_order_lines_purchase_order_id_fkey";
            columns: ["purchase_order_id"];
            isOneToOne: false;
            referencedRelation: "purchase_orders";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "purchase_order_lines_resource_id_fkey";
            columns: ["resource_id"];
            isOneToOne: false;
            referencedRelation: "price_resources";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "purchase_order_lines_resource_id_fkey";
            columns: ["resource_id"];
            isOneToOne: false;
            referencedRelation: "resources_site";
            referencedColumns: ["id"];
          },
        ];
      };
      purchase_orders: {
        Row: {
          company_id: string;
          created_at: string;
          created_by: string | null;
          deleted_at: string | null;
          expected_date: string | null;
          id: string;
          notes: string | null;
          number: number;
          order_date: string;
          project_id: string;
          purchase_request_id: string | null;
          status: Database["public"]["Enums"]["po_status"];
          supplier_id: string | null;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          company_id: string;
          created_at?: string;
          created_by?: string | null;
          deleted_at?: string | null;
          expected_date?: string | null;
          id?: string;
          notes?: string | null;
          number?: number;
          order_date: string;
          project_id: string;
          purchase_request_id?: string | null;
          status?: Database["public"]["Enums"]["po_status"];
          supplier_id?: string | null;
          updated_at?: string;
        };
        Update: {
          company_id?: string;
          created_at?: string;
          created_by?: string | null;
          deleted_at?: string | null;
          expected_date?: string | null;
          id?: string;
          notes?: string | null;
          number?: number;
          order_date?: string;
          project_id?: string;
          purchase_request_id?: string | null;
          status?: Database["public"]["Enums"]["po_status"];
          supplier_id?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "purchase_orders_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "purchase_orders_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "client_project_overview";
            referencedColumns: ["project_id"];
          },
          {
            foreignKeyName: "purchase_orders_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "project_financials";
            referencedColumns: ["project_id"];
          },
          {
            foreignKeyName: "purchase_orders_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "project_list";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "purchase_orders_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "purchase_orders_purchase_request_id_fkey";
            columns: ["purchase_request_id"];
            isOneToOne: false;
            referencedRelation: "purchase_requests";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "purchase_orders_supplier_id_fkey";
            columns: ["supplier_id"];
            isOneToOne: false;
            referencedRelation: "suppliers";
            referencedColumns: ["id"];
          },
        ];
      };
      purchase_request_lines: {
        Row: {
          company_id: string;
          created_at: string;
          created_by: string | null;
          deleted_at: string | null;
          description: string;
          id: string;
          project_id: string;
          purchase_request_id: string;
          quantity: number;
          resource_id: string | null;
          unit: Database["public"]["Enums"]["unit_code"];
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          company_id: string;
          created_at?: string;
          created_by?: string | null;
          deleted_at?: string | null;
          description: string;
          id?: string;
          project_id: string;
          purchase_request_id: string;
          quantity: number;
          resource_id?: string | null;
          unit?: Database["public"]["Enums"]["unit_code"];
          updated_at?: string;
        };
        Update: {
          company_id?: string;
          created_at?: string;
          created_by?: string | null;
          deleted_at?: string | null;
          description?: string;
          id?: string;
          project_id?: string;
          purchase_request_id?: string;
          quantity?: number;
          resource_id?: string | null;
          unit?: Database["public"]["Enums"]["unit_code"];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "purchase_request_lines_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "purchase_request_lines_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "client_project_overview";
            referencedColumns: ["project_id"];
          },
          {
            foreignKeyName: "purchase_request_lines_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "project_financials";
            referencedColumns: ["project_id"];
          },
          {
            foreignKeyName: "purchase_request_lines_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "project_list";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "purchase_request_lines_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "purchase_request_lines_purchase_request_id_fkey";
            columns: ["purchase_request_id"];
            isOneToOne: false;
            referencedRelation: "purchase_requests";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "purchase_request_lines_resource_id_fkey";
            columns: ["resource_id"];
            isOneToOne: false;
            referencedRelation: "price_resources";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "purchase_request_lines_resource_id_fkey";
            columns: ["resource_id"];
            isOneToOne: false;
            referencedRelation: "resources_site";
            referencedColumns: ["id"];
          },
        ];
      };
      purchase_requests: {
        Row: {
          company_id: string;
          created_at: string;
          created_by: string | null;
          decided_at: string | null;
          decided_by: string | null;
          deleted_at: string | null;
          id: string;
          needed_by: string | null;
          notes: string | null;
          number: number;
          project_id: string;
          status: Database["public"]["Enums"]["pr_status"];
          title: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          company_id: string;
          created_at?: string;
          created_by?: string | null;
          decided_at?: string | null;
          decided_by?: string | null;
          deleted_at?: string | null;
          id?: string;
          needed_by?: string | null;
          notes?: string | null;
          number?: number;
          project_id: string;
          status?: Database["public"]["Enums"]["pr_status"];
          title: string;
          updated_at?: string;
        };
        Update: {
          company_id?: string;
          created_at?: string;
          created_by?: string | null;
          decided_at?: string | null;
          decided_by?: string | null;
          deleted_at?: string | null;
          id?: string;
          needed_by?: string | null;
          notes?: string | null;
          number?: number;
          project_id?: string;
          status?: Database["public"]["Enums"]["pr_status"];
          title?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "purchase_requests_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "purchase_requests_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "client_project_overview";
            referencedColumns: ["project_id"];
          },
          {
            foreignKeyName: "purchase_requests_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "project_financials";
            referencedColumns: ["project_id"];
          },
          {
            foreignKeyName: "purchase_requests_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "project_list";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "purchase_requests_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
        ];
      };
      rfis: {
        Row: {
          addressed_to: string | null;
          assigned_to: string | null;
          attachment_path: string | null;
          company_id: string;
          created_at: string;
          created_by: string | null;
          deleted_at: string | null;
          due_date: string | null;
          id: string;
          number: number;
          project_id: string;
          question: string;
          responded_at: string | null;
          response: string | null;
          status: Database["public"]["Enums"]["rfi_status"];
          subject: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          addressed_to?: string | null;
          assigned_to?: string | null;
          attachment_path?: string | null;
          company_id: string;
          created_at?: string;
          created_by?: string | null;
          deleted_at?: string | null;
          due_date?: string | null;
          id?: string;
          number?: number;
          project_id: string;
          question: string;
          responded_at?: string | null;
          response?: string | null;
          status?: Database["public"]["Enums"]["rfi_status"];
          subject: string;
          updated_at?: string;
        };
        Update: {
          addressed_to?: string | null;
          assigned_to?: string | null;
          attachment_path?: string | null;
          company_id?: string;
          created_at?: string;
          created_by?: string | null;
          deleted_at?: string | null;
          due_date?: string | null;
          id?: string;
          number?: number;
          project_id?: string;
          question?: string;
          responded_at?: string | null;
          response?: string | null;
          status?: Database["public"]["Enums"]["rfi_status"];
          subject?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "rfis_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "rfis_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "client_project_overview";
            referencedColumns: ["project_id"];
          },
          {
            foreignKeyName: "rfis_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "project_financials";
            referencedColumns: ["project_id"];
          },
          {
            foreignKeyName: "rfis_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "project_list";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "rfis_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
        ];
      };
      safety_observations: {
        Row: {
          action: string | null;
          company_id: string;
          created_at: string;
          created_by: string | null;
          deleted_at: string | null;
          description: string;
          id: string;
          kind: Database["public"]["Enums"]["safety_kind"];
          observed_on: string;
          photo_path: string | null;
          project_id: string;
          severity: Database["public"]["Enums"]["severity_level"];
          status: Database["public"]["Enums"]["issue_status"];
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          action?: string | null;
          company_id: string;
          created_at?: string;
          created_by?: string | null;
          deleted_at?: string | null;
          description: string;
          id?: string;
          kind: Database["public"]["Enums"]["safety_kind"];
          observed_on: string;
          photo_path?: string | null;
          project_id: string;
          severity?: Database["public"]["Enums"]["severity_level"];
          status?: Database["public"]["Enums"]["issue_status"];
          updated_at?: string;
        };
        Update: {
          action?: string | null;
          company_id?: string;
          created_at?: string;
          created_by?: string | null;
          deleted_at?: string | null;
          description?: string;
          id?: string;
          kind?: Database["public"]["Enums"]["safety_kind"];
          observed_on?: string;
          photo_path?: string | null;
          project_id?: string;
          severity?: Database["public"]["Enums"]["severity_level"];
          status?: Database["public"]["Enums"]["issue_status"];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "safety_observations_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "safety_observations_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "client_project_overview";
            referencedColumns: ["project_id"];
          },
          {
            foreignKeyName: "safety_observations_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "project_financials";
            referencedColumns: ["project_id"];
          },
          {
            foreignKeyName: "safety_observations_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "project_list";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "safety_observations_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
        ];
      };
      site_issues: {
        Row: {
          assignee_id: string | null;
          client_updated_at: string | null;
          company_id: string;
          created_at: string;
          created_by: string | null;
          deleted_at: string | null;
          description: string | null;
          due_date: string | null;
          id: string;
          location: string | null;
          photo_path: string | null;
          priority: Database["public"]["Enums"]["severity_level"];
          project_id: string;
          resolved_at: string | null;
          status: Database["public"]["Enums"]["issue_status"];
          title: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          assignee_id?: string | null;
          client_updated_at?: string | null;
          company_id: string;
          created_at?: string;
          created_by?: string | null;
          deleted_at?: string | null;
          description?: string | null;
          due_date?: string | null;
          id?: string;
          location?: string | null;
          photo_path?: string | null;
          priority?: Database["public"]["Enums"]["severity_level"];
          project_id: string;
          resolved_at?: string | null;
          status?: Database["public"]["Enums"]["issue_status"];
          title: string;
          updated_at?: string;
        };
        Update: {
          assignee_id?: string | null;
          client_updated_at?: string | null;
          company_id?: string;
          created_at?: string;
          created_by?: string | null;
          deleted_at?: string | null;
          description?: string | null;
          due_date?: string | null;
          id?: string;
          location?: string | null;
          photo_path?: string | null;
          priority?: Database["public"]["Enums"]["severity_level"];
          project_id?: string;
          resolved_at?: string | null;
          status?: Database["public"]["Enums"]["issue_status"];
          title?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "site_issues_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "site_issues_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "client_project_overview";
            referencedColumns: ["project_id"];
          },
          {
            foreignKeyName: "site_issues_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "project_financials";
            referencedColumns: ["project_id"];
          },
          {
            foreignKeyName: "site_issues_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "project_list";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "site_issues_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
        ];
      };
      stock_locations: {
        Row: {
          company_id: string;
          created_at: string;
          created_by: string | null;
          deleted_at: string | null;
          id: string;
          name: string;
          project_id: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          company_id: string;
          created_at?: string;
          created_by?: string | null;
          deleted_at?: string | null;
          id?: string;
          name: string;
          project_id: string;
          updated_at?: string;
        };
        Update: {
          company_id?: string;
          created_at?: string;
          created_by?: string | null;
          deleted_at?: string | null;
          id?: string;
          name?: string;
          project_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "stock_locations_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "stock_locations_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "client_project_overview";
            referencedColumns: ["project_id"];
          },
          {
            foreignKeyName: "stock_locations_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "project_financials";
            referencedColumns: ["project_id"];
          },
          {
            foreignKeyName: "stock_locations_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "project_list";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "stock_locations_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
        ];
      };
      stock_movements: {
        Row: {
          boq_item_id: string | null;
          client_updated_at: string | null;
          company_id: string;
          created_at: string;
          created_by: string | null;
          deleted_at: string | null;
          delivery_line_id: string | null;
          id: string;
          item_name: string;
          kind: Database["public"]["Enums"]["movement_kind"];
          location_id: string;
          movement_date: string;
          project_id: string;
          quantity: number;
          reference: string | null;
          resource_id: string | null;
          to_location_id: string | null;
          unit: Database["public"]["Enums"]["unit_code"];
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          boq_item_id?: string | null;
          client_updated_at?: string | null;
          company_id: string;
          created_at?: string;
          created_by?: string | null;
          deleted_at?: string | null;
          delivery_line_id?: string | null;
          id?: string;
          item_name: string;
          kind: Database["public"]["Enums"]["movement_kind"];
          location_id: string;
          movement_date: string;
          project_id: string;
          quantity: number;
          reference?: string | null;
          resource_id?: string | null;
          to_location_id?: string | null;
          unit?: Database["public"]["Enums"]["unit_code"];
          updated_at?: string;
        };
        Update: {
          boq_item_id?: string | null;
          client_updated_at?: string | null;
          company_id?: string;
          created_at?: string;
          created_by?: string | null;
          deleted_at?: string | null;
          delivery_line_id?: string | null;
          id?: string;
          item_name?: string;
          kind?: Database["public"]["Enums"]["movement_kind"];
          location_id?: string;
          movement_date?: string;
          project_id?: string;
          quantity?: number;
          reference?: string | null;
          resource_id?: string | null;
          to_location_id?: string | null;
          unit?: Database["public"]["Enums"]["unit_code"];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "stock_movements_boq_item_id_fkey";
            columns: ["boq_item_id"];
            isOneToOne: false;
            referencedRelation: "boq_item_progress";
            referencedColumns: ["boq_item_id"];
          },
          {
            foreignKeyName: "stock_movements_boq_item_id_fkey";
            columns: ["boq_item_id"];
            isOneToOne: false;
            referencedRelation: "boq_item_values";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "stock_movements_boq_item_id_fkey";
            columns: ["boq_item_id"];
            isOneToOne: false;
            referencedRelation: "boq_items";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "stock_movements_boq_item_id_fkey";
            columns: ["boq_item_id"];
            isOneToOne: false;
            referencedRelation: "boq_items_site";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "stock_movements_boq_item_id_fkey";
            columns: ["boq_item_id"];
            isOneToOne: false;
            referencedRelation: "current_boq_items_site";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "stock_movements_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "stock_movements_delivery_line_id_fkey";
            columns: ["delivery_line_id"];
            isOneToOne: true;
            referencedRelation: "delivery_lines";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "stock_movements_location_id_fkey";
            columns: ["location_id"];
            isOneToOne: false;
            referencedRelation: "stock_locations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "stock_movements_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "client_project_overview";
            referencedColumns: ["project_id"];
          },
          {
            foreignKeyName: "stock_movements_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "project_financials";
            referencedColumns: ["project_id"];
          },
          {
            foreignKeyName: "stock_movements_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "project_list";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "stock_movements_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "stock_movements_resource_id_fkey";
            columns: ["resource_id"];
            isOneToOne: false;
            referencedRelation: "price_resources";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "stock_movements_resource_id_fkey";
            columns: ["resource_id"];
            isOneToOne: false;
            referencedRelation: "resources_site";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "stock_movements_to_location_id_fkey";
            columns: ["to_location_id"];
            isOneToOne: false;
            referencedRelation: "stock_locations";
            referencedColumns: ["id"];
          },
        ];
      };
      stock_thresholds: {
        Row: {
          company_id: string;
          created_at: string;
          created_by: string | null;
          deleted_at: string | null;
          id: string;
          item_name: string;
          location_id: string;
          min_quantity: number;
          project_id: string;
          unit: Database["public"]["Enums"]["unit_code"];
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          company_id: string;
          created_at?: string;
          created_by?: string | null;
          deleted_at?: string | null;
          id?: string;
          item_name: string;
          location_id: string;
          min_quantity: number;
          project_id: string;
          unit?: Database["public"]["Enums"]["unit_code"];
          updated_at?: string;
        };
        Update: {
          company_id?: string;
          created_at?: string;
          created_by?: string | null;
          deleted_at?: string | null;
          id?: string;
          item_name?: string;
          location_id?: string;
          min_quantity?: number;
          project_id?: string;
          unit?: Database["public"]["Enums"]["unit_code"];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "stock_thresholds_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "stock_thresholds_location_id_fkey";
            columns: ["location_id"];
            isOneToOne: false;
            referencedRelation: "stock_locations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "stock_thresholds_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "client_project_overview";
            referencedColumns: ["project_id"];
          },
          {
            foreignKeyName: "stock_thresholds_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "project_financials";
            referencedColumns: ["project_id"];
          },
          {
            foreignKeyName: "stock_thresholds_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "project_list";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "stock_thresholds_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
        ];
      };
      subcontractor_claims: {
        Row: {
          amount: number;
          claim_date: string;
          company_id: string;
          created_at: string;
          created_by: string | null;
          deleted_at: string | null;
          id: string;
          notes: string | null;
          number: number;
          project_id: string;
          status: Database["public"]["Enums"]["subclaim_status"];
          subcontract_id: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          amount: number;
          claim_date: string;
          company_id: string;
          created_at?: string;
          created_by?: string | null;
          deleted_at?: string | null;
          id?: string;
          notes?: string | null;
          number?: number;
          project_id: string;
          status?: Database["public"]["Enums"]["subclaim_status"];
          subcontract_id: string;
          updated_at?: string;
        };
        Update: {
          amount?: number;
          claim_date?: string;
          company_id?: string;
          created_at?: string;
          created_by?: string | null;
          deleted_at?: string | null;
          id?: string;
          notes?: string | null;
          number?: number;
          project_id?: string;
          status?: Database["public"]["Enums"]["subclaim_status"];
          subcontract_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "subcontractor_claims_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "subcontractor_claims_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "client_project_overview";
            referencedColumns: ["project_id"];
          },
          {
            foreignKeyName: "subcontractor_claims_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "project_financials";
            referencedColumns: ["project_id"];
          },
          {
            foreignKeyName: "subcontractor_claims_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "project_list";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "subcontractor_claims_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "subcontractor_claims_subcontract_id_fkey";
            columns: ["subcontract_id"];
            isOneToOne: false;
            referencedRelation: "subcontract_values";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "subcontractor_claims_subcontract_id_fkey";
            columns: ["subcontract_id"];
            isOneToOne: false;
            referencedRelation: "subcontracts";
            referencedColumns: ["id"];
          },
        ];
      };
      subcontracts: {
        Row: {
          amount: number;
          boq_item_id: string | null;
          company_id: string;
          created_at: string;
          created_by: string | null;
          deleted_at: string | null;
          end_date: string | null;
          id: string;
          project_id: string;
          retention_rate: number;
          scope: string | null;
          start_date: string | null;
          status: Database["public"]["Enums"]["subcontract_status"];
          supplier_id: string | null;
          title: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          amount?: number;
          boq_item_id?: string | null;
          company_id: string;
          created_at?: string;
          created_by?: string | null;
          deleted_at?: string | null;
          end_date?: string | null;
          id?: string;
          project_id: string;
          retention_rate?: number;
          scope?: string | null;
          start_date?: string | null;
          status?: Database["public"]["Enums"]["subcontract_status"];
          supplier_id?: string | null;
          title: string;
          updated_at?: string;
        };
        Update: {
          amount?: number;
          boq_item_id?: string | null;
          company_id?: string;
          created_at?: string;
          created_by?: string | null;
          deleted_at?: string | null;
          end_date?: string | null;
          id?: string;
          project_id?: string;
          retention_rate?: number;
          scope?: string | null;
          start_date?: string | null;
          status?: Database["public"]["Enums"]["subcontract_status"];
          supplier_id?: string | null;
          title?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "subcontracts_boq_item_id_fkey";
            columns: ["boq_item_id"];
            isOneToOne: false;
            referencedRelation: "boq_item_progress";
            referencedColumns: ["boq_item_id"];
          },
          {
            foreignKeyName: "subcontracts_boq_item_id_fkey";
            columns: ["boq_item_id"];
            isOneToOne: false;
            referencedRelation: "boq_item_values";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "subcontracts_boq_item_id_fkey";
            columns: ["boq_item_id"];
            isOneToOne: false;
            referencedRelation: "boq_items";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "subcontracts_boq_item_id_fkey";
            columns: ["boq_item_id"];
            isOneToOne: false;
            referencedRelation: "boq_items_site";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "subcontracts_boq_item_id_fkey";
            columns: ["boq_item_id"];
            isOneToOne: false;
            referencedRelation: "current_boq_items_site";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "subcontracts_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "subcontracts_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "client_project_overview";
            referencedColumns: ["project_id"];
          },
          {
            foreignKeyName: "subcontracts_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "project_financials";
            referencedColumns: ["project_id"];
          },
          {
            foreignKeyName: "subcontracts_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "project_list";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "subcontracts_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "subcontracts_supplier_id_fkey";
            columns: ["supplier_id"];
            isOneToOne: false;
            referencedRelation: "suppliers";
            referencedColumns: ["id"];
          },
        ];
      };
      suppliers: {
        Row: {
          address: string | null;
          company_id: string;
          contact_name: string | null;
          created_at: string;
          created_by: string | null;
          deleted_at: string | null;
          email: string | null;
          id: string;
          kind: Database["public"]["Enums"]["supplier_kind"];
          name: string;
          notes: string | null;
          phone: string | null;
          tax_id: string | null;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          address?: string | null;
          company_id: string;
          contact_name?: string | null;
          created_at?: string;
          created_by?: string | null;
          deleted_at?: string | null;
          email?: string | null;
          id?: string;
          kind?: Database["public"]["Enums"]["supplier_kind"];
          name: string;
          notes?: string | null;
          phone?: string | null;
          tax_id?: string | null;
          updated_at?: string;
        };
        Update: {
          address?: string | null;
          company_id?: string;
          contact_name?: string | null;
          created_at?: string;
          created_by?: string | null;
          deleted_at?: string | null;
          email?: string | null;
          id?: string;
          kind?: Database["public"]["Enums"]["supplier_kind"];
          name?: string;
          notes?: string | null;
          phone?: string | null;
          tax_id?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "suppliers_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
        ];
      };
      takeoff_lines: {
        Row: {
          company_id: string;
          count: number;
          created_at: string;
          created_by: string | null;
          deleted_at: string | null;
          height: number | null;
          id: string;
          item_id: string;
          label: string;
          length: number | null;
          position: number;
          project_id: string;
          result: number | null;
          updated_at: string;
          version_id: string;
          width: number | null;
        };
        ComputedFields: never;
        Insert: {
          company_id: string;
          count?: number;
          created_at?: string;
          created_by?: string | null;
          deleted_at?: string | null;
          height?: number | null;
          id?: string;
          item_id: string;
          label?: string;
          length?: number | null;
          position?: number;
          project_id: string;
          result?: never;
          updated_at?: string;
          version_id: string;
          width?: number | null;
        };
        Update: {
          company_id?: string;
          count?: number;
          created_at?: string;
          created_by?: string | null;
          deleted_at?: string | null;
          height?: number | null;
          id?: string;
          item_id?: string;
          label?: string;
          length?: number | null;
          position?: number;
          project_id?: string;
          result?: never;
          updated_at?: string;
          version_id?: string;
          width?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "takeoff_lines_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "takeoff_lines_item_id_fkey";
            columns: ["item_id"];
            isOneToOne: false;
            referencedRelation: "boq_item_progress";
            referencedColumns: ["boq_item_id"];
          },
          {
            foreignKeyName: "takeoff_lines_item_id_fkey";
            columns: ["item_id"];
            isOneToOne: false;
            referencedRelation: "boq_item_values";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "takeoff_lines_item_id_fkey";
            columns: ["item_id"];
            isOneToOne: false;
            referencedRelation: "boq_items";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "takeoff_lines_item_id_fkey";
            columns: ["item_id"];
            isOneToOne: false;
            referencedRelation: "boq_items_site";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "takeoff_lines_item_id_fkey";
            columns: ["item_id"];
            isOneToOne: false;
            referencedRelation: "current_boq_items_site";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "takeoff_lines_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "client_project_overview";
            referencedColumns: ["project_id"];
          },
          {
            foreignKeyName: "takeoff_lines_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "project_financials";
            referencedColumns: ["project_id"];
          },
          {
            foreignKeyName: "takeoff_lines_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "project_list";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "takeoff_lines_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "takeoff_lines_version_id_fkey";
            columns: ["version_id"];
            isOneToOne: false;
            referencedRelation: "boq_version_totals";
            referencedColumns: ["version_id"];
          },
          {
            foreignKeyName: "takeoff_lines_version_id_fkey";
            columns: ["version_id"];
            isOneToOne: false;
            referencedRelation: "boq_versions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "takeoff_lines_version_id_fkey";
            columns: ["version_id"];
            isOneToOne: false;
            referencedRelation: "boq_versions_site";
            referencedColumns: ["id"];
          },
        ];
      };
      task_boq_links: {
        Row: {
          boq_item_id: string;
          company_id: string;
          created_at: string;
          created_by: string | null;
          deleted_at: string | null;
          id: string;
          project_id: string;
          task_id: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          boq_item_id: string;
          company_id: string;
          created_at?: string;
          created_by?: string | null;
          deleted_at?: string | null;
          id?: string;
          project_id: string;
          task_id: string;
          updated_at?: string;
        };
        Update: {
          boq_item_id?: string;
          company_id?: string;
          created_at?: string;
          created_by?: string | null;
          deleted_at?: string | null;
          id?: string;
          project_id?: string;
          task_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "task_boq_links_boq_item_id_fkey";
            columns: ["boq_item_id"];
            isOneToOne: false;
            referencedRelation: "boq_item_progress";
            referencedColumns: ["boq_item_id"];
          },
          {
            foreignKeyName: "task_boq_links_boq_item_id_fkey";
            columns: ["boq_item_id"];
            isOneToOne: false;
            referencedRelation: "boq_item_values";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "task_boq_links_boq_item_id_fkey";
            columns: ["boq_item_id"];
            isOneToOne: false;
            referencedRelation: "boq_items";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "task_boq_links_boq_item_id_fkey";
            columns: ["boq_item_id"];
            isOneToOne: false;
            referencedRelation: "boq_items_site";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "task_boq_links_boq_item_id_fkey";
            columns: ["boq_item_id"];
            isOneToOne: false;
            referencedRelation: "current_boq_items_site";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "task_boq_links_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "task_boq_links_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "client_project_overview";
            referencedColumns: ["project_id"];
          },
          {
            foreignKeyName: "task_boq_links_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "project_financials";
            referencedColumns: ["project_id"];
          },
          {
            foreignKeyName: "task_boq_links_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "project_list";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "task_boq_links_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "task_boq_links_task_id_fkey";
            columns: ["task_id"];
            isOneToOne: false;
            referencedRelation: "task_progress";
            referencedColumns: ["task_id"];
          },
          {
            foreignKeyName: "task_boq_links_task_id_fkey";
            columns: ["task_id"];
            isOneToOne: false;
            referencedRelation: "tasks";
            referencedColumns: ["id"];
          },
        ];
      };
      task_dependencies: {
        Row: {
          company_id: string;
          created_at: string;
          created_by: string | null;
          deleted_at: string | null;
          id: string;
          lag_days: number;
          predecessor_id: string;
          project_id: string;
          successor_id: string;
          type: Database["public"]["Enums"]["dependency_type"];
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          company_id: string;
          created_at?: string;
          created_by?: string | null;
          deleted_at?: string | null;
          id?: string;
          lag_days?: number;
          predecessor_id: string;
          project_id: string;
          successor_id: string;
          type?: Database["public"]["Enums"]["dependency_type"];
          updated_at?: string;
        };
        Update: {
          company_id?: string;
          created_at?: string;
          created_by?: string | null;
          deleted_at?: string | null;
          id?: string;
          lag_days?: number;
          predecessor_id?: string;
          project_id?: string;
          successor_id?: string;
          type?: Database["public"]["Enums"]["dependency_type"];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "task_dependencies_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "task_dependencies_predecessor_id_fkey";
            columns: ["predecessor_id"];
            isOneToOne: false;
            referencedRelation: "task_progress";
            referencedColumns: ["task_id"];
          },
          {
            foreignKeyName: "task_dependencies_predecessor_id_fkey";
            columns: ["predecessor_id"];
            isOneToOne: false;
            referencedRelation: "tasks";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "task_dependencies_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "client_project_overview";
            referencedColumns: ["project_id"];
          },
          {
            foreignKeyName: "task_dependencies_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "project_financials";
            referencedColumns: ["project_id"];
          },
          {
            foreignKeyName: "task_dependencies_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "project_list";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "task_dependencies_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "task_dependencies_successor_id_fkey";
            columns: ["successor_id"];
            isOneToOne: false;
            referencedRelation: "task_progress";
            referencedColumns: ["task_id"];
          },
          {
            foreignKeyName: "task_dependencies_successor_id_fkey";
            columns: ["successor_id"];
            isOneToOne: false;
            referencedRelation: "tasks";
            referencedColumns: ["id"];
          },
        ];
      };
      tasks: {
        Row: {
          company_id: string;
          created_at: string;
          created_by: string | null;
          deleted_at: string | null;
          duration: number;
          end_date: string;
          id: string;
          name: string;
          notes: string | null;
          parent_id: string | null;
          position: number;
          progress: number;
          progress_source: Database["public"]["Enums"]["progress_source"];
          project_id: string;
          start_date: string;
          updated_at: string;
          wbs_code: string;
        };
        ComputedFields: never;
        Insert: {
          company_id: string;
          created_at?: string;
          created_by?: string | null;
          deleted_at?: string | null;
          duration?: number;
          end_date: string;
          id?: string;
          name: string;
          notes?: string | null;
          parent_id?: string | null;
          position?: number;
          progress?: number;
          progress_source?: Database["public"]["Enums"]["progress_source"];
          project_id: string;
          start_date: string;
          updated_at?: string;
          wbs_code?: string;
        };
        Update: {
          company_id?: string;
          created_at?: string;
          created_by?: string | null;
          deleted_at?: string | null;
          duration?: number;
          end_date?: string;
          id?: string;
          name?: string;
          notes?: string | null;
          parent_id?: string | null;
          position?: number;
          progress?: number;
          progress_source?: Database["public"]["Enums"]["progress_source"];
          project_id?: string;
          start_date?: string;
          updated_at?: string;
          wbs_code?: string;
        };
        Relationships: [
          {
            foreignKeyName: "tasks_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tasks_parent_id_fkey";
            columns: ["parent_id"];
            isOneToOne: false;
            referencedRelation: "task_progress";
            referencedColumns: ["task_id"];
          },
          {
            foreignKeyName: "tasks_parent_id_fkey";
            columns: ["parent_id"];
            isOneToOne: false;
            referencedRelation: "tasks";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tasks_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "client_project_overview";
            referencedColumns: ["project_id"];
          },
          {
            foreignKeyName: "tasks_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "project_financials";
            referencedColumns: ["project_id"];
          },
          {
            foreignKeyName: "tasks_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "project_list";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tasks_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
        ];
      };
      unit_price_analyses: {
        Row: {
          code: string;
          coefficient: number | null;
          company_id: string;
          created_at: string;
          created_by: string | null;
          deleted_at: string | null;
          id: string;
          notes: string | null;
          project_id: string;
          title: string;
          unit: Database["public"]["Enums"]["unit_code"];
          updated_at: string;
          version_id: string;
        };
        ComputedFields: never;
        Insert: {
          code: string;
          coefficient?: number | null;
          company_id: string;
          created_at?: string;
          created_by?: string | null;
          deleted_at?: string | null;
          id?: string;
          notes?: string | null;
          project_id: string;
          title: string;
          unit: Database["public"]["Enums"]["unit_code"];
          updated_at?: string;
          version_id: string;
        };
        Update: {
          code?: string;
          coefficient?: number | null;
          company_id?: string;
          created_at?: string;
          created_by?: string | null;
          deleted_at?: string | null;
          id?: string;
          notes?: string | null;
          project_id?: string;
          title?: string;
          unit?: Database["public"]["Enums"]["unit_code"];
          updated_at?: string;
          version_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "unit_price_analyses_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "unit_price_analyses_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "client_project_overview";
            referencedColumns: ["project_id"];
          },
          {
            foreignKeyName: "unit_price_analyses_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "project_financials";
            referencedColumns: ["project_id"];
          },
          {
            foreignKeyName: "unit_price_analyses_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "project_list";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "unit_price_analyses_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "unit_price_analyses_version_id_fkey";
            columns: ["version_id"];
            isOneToOne: false;
            referencedRelation: "boq_version_totals";
            referencedColumns: ["version_id"];
          },
          {
            foreignKeyName: "unit_price_analyses_version_id_fkey";
            columns: ["version_id"];
            isOneToOne: false;
            referencedRelation: "boq_versions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "unit_price_analyses_version_id_fkey";
            columns: ["version_id"];
            isOneToOne: false;
            referencedRelation: "boq_versions_site";
            referencedColumns: ["id"];
          },
        ];
      };
      unit_price_components: {
        Row: {
          company_id: string;
          created_at: string;
          created_by: string | null;
          deleted_at: string | null;
          designation: string;
          id: string;
          kind: Database["public"]["Enums"]["resource_kind"];
          position: number;
          project_id: string;
          quantity: number;
          resource_id: string | null;
          unit: Database["public"]["Enums"]["unit_code"];
          unit_cost: number;
          upa_id: string;
          updated_at: string;
          version_id: string;
          waste_rate: number;
        };
        ComputedFields: never;
        Insert: {
          company_id: string;
          created_at?: string;
          created_by?: string | null;
          deleted_at?: string | null;
          designation: string;
          id?: string;
          kind: Database["public"]["Enums"]["resource_kind"];
          position?: number;
          project_id: string;
          quantity?: number;
          resource_id?: string | null;
          unit: Database["public"]["Enums"]["unit_code"];
          unit_cost?: number;
          upa_id: string;
          updated_at?: string;
          version_id: string;
          waste_rate?: number;
        };
        Update: {
          company_id?: string;
          created_at?: string;
          created_by?: string | null;
          deleted_at?: string | null;
          designation?: string;
          id?: string;
          kind?: Database["public"]["Enums"]["resource_kind"];
          position?: number;
          project_id?: string;
          quantity?: number;
          resource_id?: string | null;
          unit?: Database["public"]["Enums"]["unit_code"];
          unit_cost?: number;
          upa_id?: string;
          updated_at?: string;
          version_id?: string;
          waste_rate?: number;
        };
        Relationships: [
          {
            foreignKeyName: "unit_price_components_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "unit_price_components_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "client_project_overview";
            referencedColumns: ["project_id"];
          },
          {
            foreignKeyName: "unit_price_components_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "project_financials";
            referencedColumns: ["project_id"];
          },
          {
            foreignKeyName: "unit_price_components_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "project_list";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "unit_price_components_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "unit_price_components_resource_id_fkey";
            columns: ["resource_id"];
            isOneToOne: false;
            referencedRelation: "price_resources";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "unit_price_components_resource_id_fkey";
            columns: ["resource_id"];
            isOneToOne: false;
            referencedRelation: "resources_site";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "unit_price_components_upa_id_fkey";
            columns: ["upa_id"];
            isOneToOne: false;
            referencedRelation: "unit_price_analyses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "unit_price_components_upa_id_fkey";
            columns: ["upa_id"];
            isOneToOne: false;
            referencedRelation: "upa_values";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "unit_price_components_version_id_fkey";
            columns: ["version_id"];
            isOneToOne: false;
            referencedRelation: "boq_version_totals";
            referencedColumns: ["version_id"];
          },
          {
            foreignKeyName: "unit_price_components_version_id_fkey";
            columns: ["version_id"];
            isOneToOne: false;
            referencedRelation: "boq_versions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "unit_price_components_version_id_fkey";
            columns: ["version_id"];
            isOneToOne: false;
            referencedRelation: "boq_versions_site";
            referencedColumns: ["id"];
          },
        ];
      };
      workers: {
        Row: {
          active: boolean;
          company_id: string;
          created_at: string;
          created_by: string | null;
          currency: Database["public"]["Enums"]["currency_code"];
          daily_rate: number;
          deleted_at: string | null;
          full_name: string;
          id: string;
          notes: string | null;
          phone: string | null;
          trade: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          active?: boolean;
          company_id: string;
          created_at?: string;
          created_by?: string | null;
          currency?: Database["public"]["Enums"]["currency_code"];
          daily_rate?: number;
          deleted_at?: string | null;
          full_name: string;
          id?: string;
          notes?: string | null;
          phone?: string | null;
          trade?: string;
          updated_at?: string;
        };
        Update: {
          active?: boolean;
          company_id?: string;
          created_at?: string;
          created_by?: string | null;
          currency?: Database["public"]["Enums"]["currency_code"];
          daily_rate?: number;
          deleted_at?: string | null;
          full_name?: string;
          id?: string;
          notes?: string | null;
          phone?: string | null;
          trade?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "workers_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      boq_item_progress: {
        Row: {
          boq_item_id: string;
          code: string;
          company_id: string;
          description: string;
          done_quantity: number | null;
          last_date: string | null;
          percent_complete: number | null;
          planned_quantity: number | null;
          project_id: string;
          unit: Database["public"]["Enums"]["unit_code"];
          version_id: string;
        };
        ComputedFields: never;
        Relationships: [
          {
            foreignKeyName: "boq_items_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "boq_items_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "client_project_overview";
            referencedColumns: ["project_id"];
          },
          {
            foreignKeyName: "boq_items_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "project_financials";
            referencedColumns: ["project_id"];
          },
          {
            foreignKeyName: "boq_items_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "project_list";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "boq_items_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "boq_items_version_id_fkey";
            columns: ["version_id"];
            isOneToOne: false;
            referencedRelation: "boq_version_totals";
            referencedColumns: ["version_id"];
          },
          {
            foreignKeyName: "boq_items_version_id_fkey";
            columns: ["version_id"];
            isOneToOne: false;
            referencedRelation: "boq_versions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "boq_items_version_id_fkey";
            columns: ["version_id"];
            isOneToOne: false;
            referencedRelation: "boq_versions_site";
            referencedColumns: ["id"];
          },
        ];
      };
      boq_item_values: {
        Row: {
          code: string;
          company_id: string;
          created_at: string;
          created_by: string | null;
          currency: Database["public"]["Enums"]["currency_code"];
          deleted_at: string | null;
          description: string;
          dry_unit_cost: number | null;
          effective_quantity: number | null;
          effective_unit_price: number | null;
          id: string;
          notes: string | null;
          position: number;
          project_id: string;
          quantity: number;
          quantity_source: Database["public"]["Enums"]["quantity_source"];
          section_id: string;
          takeoff_line_count: number | null;
          takeoff_quantity: number | null;
          total_dry_cost: number | null;
          total_price: number | null;
          unit: Database["public"]["Enums"]["unit_code"];
          unit_cost: number | null;
          unit_price: number | null;
          upa_code: string | null;
          upa_id: string | null;
          updated_at: string;
          version_coefficient: number;
          version_id: string;
        };
        ComputedFields: never;
        Relationships: [
          {
            foreignKeyName: "boq_items_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "boq_items_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "client_project_overview";
            referencedColumns: ["project_id"];
          },
          {
            foreignKeyName: "boq_items_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "project_financials";
            referencedColumns: ["project_id"];
          },
          {
            foreignKeyName: "boq_items_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "project_list";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "boq_items_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "boq_items_section_id_fkey";
            columns: ["section_id"];
            isOneToOne: false;
            referencedRelation: "boq_section_totals";
            referencedColumns: ["section_id"];
          },
          {
            foreignKeyName: "boq_items_section_id_fkey";
            columns: ["section_id"];
            isOneToOne: false;
            referencedRelation: "boq_sections";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "boq_items_section_id_fkey";
            columns: ["section_id"];
            isOneToOne: false;
            referencedRelation: "boq_sections_site";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "boq_items_upa_id_fkey";
            columns: ["upa_id"];
            isOneToOne: false;
            referencedRelation: "unit_price_analyses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "boq_items_upa_id_fkey";
            columns: ["upa_id"];
            isOneToOne: false;
            referencedRelation: "upa_values";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "boq_items_version_id_fkey";
            columns: ["version_id"];
            isOneToOne: false;
            referencedRelation: "boq_version_totals";
            referencedColumns: ["version_id"];
          },
          {
            foreignKeyName: "boq_items_version_id_fkey";
            columns: ["version_id"];
            isOneToOne: false;
            referencedRelation: "boq_versions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "boq_items_version_id_fkey";
            columns: ["version_id"];
            isOneToOne: false;
            referencedRelation: "boq_versions_site";
            referencedColumns: ["id"];
          },
        ];
      };
      boq_items_site: {
        Row: {
          code: string;
          company_id: string;
          description: string;
          id: string;
          origin_id: string | null;
          position: number;
          project_id: string;
          quantity: number | null;
          section_id: string;
          unit: Database["public"]["Enums"]["unit_code"];
          version_id: string;
        };
        ComputedFields: never;
        Relationships: [
          {
            foreignKeyName: "boq_items_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "boq_items_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "client_project_overview";
            referencedColumns: ["project_id"];
          },
          {
            foreignKeyName: "boq_items_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "project_financials";
            referencedColumns: ["project_id"];
          },
          {
            foreignKeyName: "boq_items_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "project_list";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "boq_items_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "boq_items_section_id_fkey";
            columns: ["section_id"];
            isOneToOne: false;
            referencedRelation: "boq_section_totals";
            referencedColumns: ["section_id"];
          },
          {
            foreignKeyName: "boq_items_section_id_fkey";
            columns: ["section_id"];
            isOneToOne: false;
            referencedRelation: "boq_sections";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "boq_items_section_id_fkey";
            columns: ["section_id"];
            isOneToOne: false;
            referencedRelation: "boq_sections_site";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "boq_items_version_id_fkey";
            columns: ["version_id"];
            isOneToOne: false;
            referencedRelation: "boq_version_totals";
            referencedColumns: ["version_id"];
          },
          {
            foreignKeyName: "boq_items_version_id_fkey";
            columns: ["version_id"];
            isOneToOne: false;
            referencedRelation: "boq_versions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "boq_items_version_id_fkey";
            columns: ["version_id"];
            isOneToOne: false;
            referencedRelation: "boq_versions_site";
            referencedColumns: ["id"];
          },
        ];
      };
      boq_section_totals: {
        Row: {
          company_id: string;
          item_count: number | null;
          project_id: string;
          section_id: string;
          total_dry_cost: number | null;
          total_price: number | null;
          version_id: string;
        };
        ComputedFields: never;
        Relationships: [
          {
            foreignKeyName: "boq_sections_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "boq_sections_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "client_project_overview";
            referencedColumns: ["project_id"];
          },
          {
            foreignKeyName: "boq_sections_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "project_financials";
            referencedColumns: ["project_id"];
          },
          {
            foreignKeyName: "boq_sections_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "project_list";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "boq_sections_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "boq_sections_version_id_fkey";
            columns: ["version_id"];
            isOneToOne: false;
            referencedRelation: "boq_version_totals";
            referencedColumns: ["version_id"];
          },
          {
            foreignKeyName: "boq_sections_version_id_fkey";
            columns: ["version_id"];
            isOneToOne: false;
            referencedRelation: "boq_versions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "boq_sections_version_id_fkey";
            columns: ["version_id"];
            isOneToOne: false;
            referencedRelation: "boq_versions_site";
            referencedColumns: ["id"];
          },
        ];
      };
      boq_sections_site: {
        Row: {
          code: string;
          company_id: string;
          id: string;
          position: number;
          project_id: string;
          title: string;
          version_id: string;
        };
        ComputedFields: never;
        Insert: {
          code?: string | null;
          company_id?: string | null;
          id?: string | null;
          position?: number | null;
          project_id?: string | null;
          title?: string | null;
          version_id?: string | null;
        };
        Update: {
          code?: string | null;
          company_id?: string | null;
          id?: string | null;
          position?: number | null;
          project_id?: string | null;
          title?: string | null;
          version_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "boq_sections_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "boq_sections_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "client_project_overview";
            referencedColumns: ["project_id"];
          },
          {
            foreignKeyName: "boq_sections_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "project_financials";
            referencedColumns: ["project_id"];
          },
          {
            foreignKeyName: "boq_sections_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "project_list";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "boq_sections_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "boq_sections_version_id_fkey";
            columns: ["version_id"];
            isOneToOne: false;
            referencedRelation: "boq_version_totals";
            referencedColumns: ["version_id"];
          },
          {
            foreignKeyName: "boq_sections_version_id_fkey";
            columns: ["version_id"];
            isOneToOne: false;
            referencedRelation: "boq_versions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "boq_sections_version_id_fkey";
            columns: ["version_id"];
            isOneToOne: false;
            referencedRelation: "boq_versions_site";
            referencedColumns: ["id"];
          },
        ];
      };
      boq_version_totals: {
        Row: {
          company_id: string;
          currency: Database["public"]["Enums"]["currency_code"];
          item_count: number | null;
          margin: number | null;
          project_id: string;
          total_dry_cost: number | null;
          total_ht: number | null;
          total_ttc: number | null;
          vat_amount: number | null;
          vat_rate: number | null;
          version_id: string;
        };
        ComputedFields: never;
        Relationships: [
          {
            foreignKeyName: "boq_versions_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "boq_versions_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "client_project_overview";
            referencedColumns: ["project_id"];
          },
          {
            foreignKeyName: "boq_versions_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "project_financials";
            referencedColumns: ["project_id"];
          },
          {
            foreignKeyName: "boq_versions_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "project_list";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "boq_versions_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
        ];
      };
      boq_versions_site: {
        Row: {
          company_id: string;
          created_at: string;
          id: string;
          is_current: boolean;
          name: string;
          number: number;
          project_id: string;
          status: Database["public"]["Enums"]["boq_status"];
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          company_id?: string | null;
          created_at?: string | null;
          id?: string | null;
          is_current?: boolean | null;
          name?: string | null;
          number?: number | null;
          project_id?: string | null;
          status?: Database["public"]["Enums"]["boq_status"] | null;
          updated_at?: string | null;
        };
        Update: {
          company_id?: string | null;
          created_at?: string | null;
          id?: string | null;
          is_current?: boolean | null;
          name?: string | null;
          number?: number | null;
          project_id?: string | null;
          status?: Database["public"]["Enums"]["boq_status"] | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "boq_versions_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "boq_versions_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "client_project_overview";
            referencedColumns: ["project_id"];
          },
          {
            foreignKeyName: "boq_versions_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "project_financials";
            referencedColumns: ["project_id"];
          },
          {
            foreignKeyName: "boq_versions_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "project_list";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "boq_versions_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
        ];
      };
      client_project_overview: {
        Row: {
          city: string | null;
          claims_to_approve: number | null;
          code: string;
          company_id: string;
          end_date: string | null;
          last_report_date: string | null;
          name: string;
          progress: number | null;
          project_id: string;
          shared_documents: number | null;
          shared_photos: number | null;
          start_date: string | null;
          status: Database["public"]["Enums"]["project_status"];
        };
        ComputedFields: never;
        Insert: {
          city?: string | null;
          claims_to_approve?: never;
          code?: string | null;
          company_id?: string | null;
          end_date?: string | null;
          last_report_date?: never;
          name?: string | null;
          progress?: never;
          project_id?: string | null;
          shared_documents?: never;
          shared_photos?: never;
          start_date?: string | null;
          status?: Database["public"]["Enums"]["project_status"] | null;
        };
        Update: {
          city?: string | null;
          claims_to_approve?: never;
          code?: string | null;
          company_id?: string | null;
          end_date?: string | null;
          last_report_date?: never;
          name?: string | null;
          progress?: never;
          project_id?: string | null;
          shared_documents?: never;
          shared_photos?: never;
          start_date?: string | null;
          status?: Database["public"]["Enums"]["project_status"] | null;
        };
        Relationships: [
          {
            foreignKeyName: "projects_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
        ];
      };
      company_member_directory: {
        Row: {
          company_id: string;
          created_at: string;
          deleted_at: string | null;
          email: string | null;
          full_name: string | null;
          id: string;
          phone: string | null;
          project_count: number | null;
          project_ids: string[] | null;
          role: Database["public"]["Enums"]["app_role"];
          status: Database["public"]["Enums"]["member_status"];
          updated_at: string;
          user_id: string;
        };
        ComputedFields: never;
        Relationships: [
          {
            foreignKeyName: "company_members_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
        ];
      };
      current_boq_items_site: {
        Row: {
          code: string;
          company_id: string;
          description: string;
          id: string;
          origin_id: string | null;
          position: number;
          project_id: string;
          quantity: number | null;
          section_id: string;
          unit: Database["public"]["Enums"]["unit_code"];
          version_id: string;
        };
        ComputedFields: never;
        Relationships: [
          {
            foreignKeyName: "boq_items_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "boq_items_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "client_project_overview";
            referencedColumns: ["project_id"];
          },
          {
            foreignKeyName: "boq_items_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "project_financials";
            referencedColumns: ["project_id"];
          },
          {
            foreignKeyName: "boq_items_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "project_list";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "boq_items_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "boq_items_section_id_fkey";
            columns: ["section_id"];
            isOneToOne: false;
            referencedRelation: "boq_section_totals";
            referencedColumns: ["section_id"];
          },
          {
            foreignKeyName: "boq_items_section_id_fkey";
            columns: ["section_id"];
            isOneToOne: false;
            referencedRelation: "boq_sections";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "boq_items_section_id_fkey";
            columns: ["section_id"];
            isOneToOne: false;
            referencedRelation: "boq_sections_site";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "boq_items_version_id_fkey";
            columns: ["version_id"];
            isOneToOne: false;
            referencedRelation: "boq_version_totals";
            referencedColumns: ["version_id"];
          },
          {
            foreignKeyName: "boq_items_version_id_fkey";
            columns: ["version_id"];
            isOneToOne: false;
            referencedRelation: "boq_versions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "boq_items_version_id_fkey";
            columns: ["version_id"];
            isOneToOne: false;
            referencedRelation: "boq_versions_site";
            referencedColumns: ["id"];
          },
        ];
      };
      daily_report_list: {
        Row: {
          author_name: string | null;
          client_updated_at: string | null;
          company_id: string;
          created_at: string;
          created_by: string | null;
          deleted_at: string | null;
          id: string;
          incident_count: number | null;
          labour_count: number | null;
          photo_count: number | null;
          progress_count: number | null;
          project_id: string;
          report_date: string;
          status: Database["public"]["Enums"]["report_status"];
          summary: string;
          temperature_c: number | null;
          updated_at: string;
          weather: Database["public"]["Enums"]["weather_kind"] | null;
        };
        ComputedFields: never;
        Relationships: [
          {
            foreignKeyName: "daily_reports_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "daily_reports_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "client_project_overview";
            referencedColumns: ["project_id"];
          },
          {
            foreignKeyName: "daily_reports_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "project_financials";
            referencedColumns: ["project_id"];
          },
          {
            foreignKeyName: "daily_reports_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "project_list";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "daily_reports_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
        ];
      };
      documents_current: {
        Row: {
          company_id: string;
          created_at: string;
          created_by: string | null;
          deleted_at: string | null;
          document_key: string;
          file_name: string;
          file_path: string;
          folder: string;
          id: string;
          notes: string | null;
          project_id: string;
          shared_with_client: boolean;
          title: string;
          updated_at: string;
          version: number;
          version_count: number | null;
        };
        ComputedFields: never;
        Insert: {
          company_id?: string | null;
          created_at?: string | null;
          created_by?: string | null;
          deleted_at?: string | null;
          document_key?: string | null;
          file_name?: string | null;
          file_path?: string | null;
          folder?: string | null;
          id?: string | null;
          notes?: string | null;
          project_id?: string | null;
          shared_with_client?: boolean | null;
          title?: string | null;
          updated_at?: string | null;
          version?: number | null;
          version_count?: never;
        };
        Update: {
          company_id?: string | null;
          created_at?: string | null;
          created_by?: string | null;
          deleted_at?: string | null;
          document_key?: string | null;
          file_name?: string | null;
          file_path?: string | null;
          folder?: string | null;
          id?: string | null;
          notes?: string | null;
          project_id?: string | null;
          shared_with_client?: boolean | null;
          title?: string | null;
          updated_at?: string | null;
          version?: number | null;
          version_count?: never;
        };
        Relationships: [
          {
            foreignKeyName: "documents_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "documents_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "client_project_overview";
            referencedColumns: ["project_id"];
          },
          {
            foreignKeyName: "documents_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "project_financials";
            referencedColumns: ["project_id"];
          },
          {
            foreignKeyName: "documents_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "project_list";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "documents_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
        ];
      };
      drawing_revision_list: {
        Row: {
          company_id: string;
          created_at: string;
          created_by: string | null;
          deleted_at: string | null;
          discipline: string | null;
          drawing_number: string;
          file_path: string | null;
          id: string;
          is_current: boolean | null;
          issued_date: string;
          notes: string | null;
          project_id: string;
          revision: string;
          title: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          company_id?: string | null;
          created_at?: string | null;
          created_by?: string | null;
          deleted_at?: string | null;
          discipline?: string | null;
          drawing_number?: string | null;
          file_path?: string | null;
          id?: string | null;
          is_current?: never;
          issued_date?: string | null;
          notes?: string | null;
          project_id?: string | null;
          revision?: string | null;
          title?: string | null;
          updated_at?: string | null;
        };
        Update: {
          company_id?: string | null;
          created_at?: string | null;
          created_by?: string | null;
          deleted_at?: string | null;
          discipline?: string | null;
          drawing_number?: string | null;
          file_path?: string | null;
          id?: string | null;
          is_current?: never;
          issued_date?: string | null;
          notes?: string | null;
          project_id?: string | null;
          revision?: string | null;
          title?: string | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "drawing_revisions_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "drawing_revisions_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "client_project_overview";
            referencedColumns: ["project_id"];
          },
          {
            foreignKeyName: "drawing_revisions_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "project_financials";
            referencedColumns: ["project_id"];
          },
          {
            foreignKeyName: "drawing_revisions_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "project_list";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "drawing_revisions_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
        ];
      };
      equipment_site: {
        Row: {
          category: string | null;
          code: string;
          company_id: string;
          id: string;
          name: string;
          ownership: Database["public"]["Enums"]["equipment_ownership"];
          registration: string | null;
          status: Database["public"]["Enums"]["equipment_status"];
        };
        ComputedFields: never;
        Insert: {
          category?: string | null;
          code?: string | null;
          company_id?: string | null;
          id?: string | null;
          name?: string | null;
          ownership?: Database["public"]["Enums"]["equipment_ownership"] | null;
          registration?: string | null;
          status?: Database["public"]["Enums"]["equipment_status"] | null;
        };
        Update: {
          category?: string | null;
          code?: string | null;
          company_id?: string | null;
          id?: string | null;
          name?: string | null;
          ownership?: Database["public"]["Enums"]["equipment_ownership"] | null;
          registration?: string | null;
          status?: Database["public"]["Enums"]["equipment_status"] | null;
        };
        Relationships: [
          {
            foreignKeyName: "equipment_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
        ];
      };
      equipment_status_view: {
        Row: {
          code: string;
          company_id: string;
          due_date: string | null;
          due_hours: number | null;
          id: string;
          maintenance_due: boolean | null;
          name: string;
          next_maintenance: string | null;
          next_maintenance_id: string | null;
          ownership: Database["public"]["Enums"]["equipment_ownership"];
          status: Database["public"]["Enums"]["equipment_status"];
          total_hours: number | null;
        };
        ComputedFields: never;
        Relationships: [
          {
            foreignKeyName: "equipment_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
        ];
      };
      payroll_line_values: {
        Row: {
          advances: number | null;
          base_pay: number | null;
          bonus: number;
          company_id: string;
          created_at: string;
          created_by: string | null;
          currency: Database["public"]["Enums"]["currency_code"];
          daily_rate: number;
          days_worked: number | null;
          deduction: number;
          deleted_at: string | null;
          end_date: string;
          full_name: string;
          gross_pay: number | null;
          id: string;
          net_pay: number | null;
          note: string | null;
          overtime_hours: number | null;
          overtime_pay: number | null;
          payroll_period_id: string;
          period_status: Database["public"]["Enums"]["payroll_status"];
          phone: string | null;
          start_date: string;
          trade: string;
          updated_at: string;
          worker_id: string;
        };
        ComputedFields: never;
        Relationships: [
          {
            foreignKeyName: "payroll_lines_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "payroll_lines_payroll_period_id_fkey";
            columns: ["payroll_period_id"];
            isOneToOne: false;
            referencedRelation: "payroll_periods";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "payroll_lines_worker_id_fkey";
            columns: ["worker_id"];
            isOneToOne: false;
            referencedRelation: "workers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "payroll_lines_worker_id_fkey";
            columns: ["worker_id"];
            isOneToOne: false;
            referencedRelation: "workers_site";
            referencedColumns: ["id"];
          },
        ];
      };
      progress_claim_lines_client: {
        Row: {
          claim_id: string;
          code: string;
          company_id: string;
          cumulative_quantity: number;
          description: string;
          id: string;
          position: number;
          previous_quantity: number;
          project_id: string;
          unit: Database["public"]["Enums"]["unit_code"];
          unit_price: number;
        };
        ComputedFields: never;
        Relationships: [
          {
            foreignKeyName: "progress_claim_lines_claim_id_fkey";
            columns: ["claim_id"];
            isOneToOne: false;
            referencedRelation: "progress_claim_values";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "progress_claim_lines_claim_id_fkey";
            columns: ["claim_id"];
            isOneToOne: false;
            referencedRelation: "progress_claims";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "progress_claim_lines_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "progress_claim_lines_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "client_project_overview";
            referencedColumns: ["project_id"];
          },
          {
            foreignKeyName: "progress_claim_lines_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "project_financials";
            referencedColumns: ["project_id"];
          },
          {
            foreignKeyName: "progress_claim_lines_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "project_list";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "progress_claim_lines_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
        ];
      };
      progress_claim_values: {
        Row: {
          advance_recovered_to_date: number | null;
          advance_recovery: number | null;
          advance_recovery_rate: number;
          client_comment: string | null;
          company_id: string;
          created_at: string;
          created_by: string | null;
          currency: Database["public"]["Enums"]["currency_code"];
          decided_at: string | null;
          decided_by: string | null;
          deleted_at: string | null;
          gross_cumulative: number | null;
          id: string;
          net_payable: number | null;
          notes: string | null;
          number: number;
          paid_amount: number | null;
          period_end: string;
          period_start: string | null;
          previous_cumulative: number | null;
          project_id: string;
          retention: number | null;
          retention_rate: number;
          retention_to_date: number | null;
          status: Database["public"]["Enums"]["claim_status"];
          submitted_at: string | null;
          this_period: number | null;
          updated_at: string;
          vat: number | null;
          vat_rate: number;
        };
        ComputedFields: never;
        Relationships: [
          {
            foreignKeyName: "progress_claims_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "progress_claims_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "client_project_overview";
            referencedColumns: ["project_id"];
          },
          {
            foreignKeyName: "progress_claims_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "project_financials";
            referencedColumns: ["project_id"];
          },
          {
            foreignKeyName: "progress_claims_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "project_list";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "progress_claims_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
        ];
      };
      project_cost_entries: {
        Row: {
          amount: number | null;
          boq_item_id: string | null;
          category: string | null;
          company_id: string | null;
          description: string | null;
          entry_date: string | null;
          project_id: string | null;
          source: string | null;
          source_id: string | null;
        };
        ComputedFields: never;
        Relationships: [];
      };
      project_financials: {
        Row: {
          actual_cost: number | null;
          budget_cost: number | null;
          claimed_net: number | null;
          code: string;
          company_id: string;
          contract_total: number | null;
          currency: Database["public"]["Enums"]["currency_code"];
          earned_value: number | null;
          end_date: string | null;
          name: string;
          project_id: string;
          received: number | null;
          start_date: string | null;
          status: Database["public"]["Enums"]["project_status"];
        };
        ComputedFields: never;
        Relationships: [
          {
            foreignKeyName: "projects_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
        ];
      };
      project_list: {
        Row: {
          city: string | null;
          client_id: string | null;
          client_name: string | null;
          code: string;
          company_id: string;
          country: Database["public"]["Enums"]["country_code"];
          created_at: string;
          created_by: string | null;
          currency: Database["public"]["Enums"]["currency_code"];
          deleted_at: string | null;
          description: string | null;
          end_date: string | null;
          id: string;
          member_count: number | null;
          name: string;
          site_address: string | null;
          start_date: string | null;
          status: Database["public"]["Enums"]["project_status"];
          updated_at: string;
        };
        ComputedFields: never;
        Relationships: [
          {
            foreignKeyName: "projects_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "clients";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "projects_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
        ];
      };
      purchase_order_lines_site: {
        Row: {
          company_id: string;
          description: string;
          id: string;
          order_date: string;
          order_number: number;
          order_status: Database["public"]["Enums"]["po_status"];
          ordered_quantity: number;
          over_delivered: boolean | null;
          project_id: string;
          purchase_order_id: string;
          received_quantity: number | null;
          remaining_quantity: number | null;
          resource_id: string | null;
          supplier_name: string | null;
          unit: Database["public"]["Enums"]["unit_code"];
        };
        ComputedFields: never;
        Relationships: [
          {
            foreignKeyName: "purchase_order_lines_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "purchase_order_lines_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "client_project_overview";
            referencedColumns: ["project_id"];
          },
          {
            foreignKeyName: "purchase_order_lines_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "project_financials";
            referencedColumns: ["project_id"];
          },
          {
            foreignKeyName: "purchase_order_lines_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "project_list";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "purchase_order_lines_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "purchase_order_lines_purchase_order_id_fkey";
            columns: ["purchase_order_id"];
            isOneToOne: false;
            referencedRelation: "purchase_order_values";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "purchase_order_lines_purchase_order_id_fkey";
            columns: ["purchase_order_id"];
            isOneToOne: false;
            referencedRelation: "purchase_orders";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "purchase_order_lines_resource_id_fkey";
            columns: ["resource_id"];
            isOneToOne: false;
            referencedRelation: "price_resources";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "purchase_order_lines_resource_id_fkey";
            columns: ["resource_id"];
            isOneToOne: false;
            referencedRelation: "resources_site";
            referencedColumns: ["id"];
          },
        ];
      };
      purchase_order_values: {
        Row: {
          company_id: string;
          created_at: string;
          created_by: string | null;
          currency: Database["public"]["Enums"]["currency_code"];
          deleted_at: string | null;
          expected_date: string | null;
          id: string;
          notes: string | null;
          number: number;
          order_date: string;
          ordered_quantity: number | null;
          project_id: string;
          purchase_request_id: string | null;
          received_quantity: number | null;
          status: Database["public"]["Enums"]["po_status"];
          supplier_id: string | null;
          supplier_name: string | null;
          total_amount: number | null;
          updated_at: string;
        };
        ComputedFields: never;
        Relationships: [
          {
            foreignKeyName: "purchase_orders_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "purchase_orders_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "client_project_overview";
            referencedColumns: ["project_id"];
          },
          {
            foreignKeyName: "purchase_orders_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "project_financials";
            referencedColumns: ["project_id"];
          },
          {
            foreignKeyName: "purchase_orders_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "project_list";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "purchase_orders_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "purchase_orders_purchase_request_id_fkey";
            columns: ["purchase_request_id"];
            isOneToOne: false;
            referencedRelation: "purchase_requests";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "purchase_orders_supplier_id_fkey";
            columns: ["supplier_id"];
            isOneToOne: false;
            referencedRelation: "suppliers";
            referencedColumns: ["id"];
          },
        ];
      };
      resources_site: {
        Row: {
          code: string;
          company_id: string;
          id: string;
          kind: Database["public"]["Enums"]["resource_kind"];
          name: string;
          unit: Database["public"]["Enums"]["unit_code"];
        };
        ComputedFields: never;
        Insert: {
          code?: string | null;
          company_id?: string | null;
          id?: string | null;
          kind?: Database["public"]["Enums"]["resource_kind"] | null;
          name?: string | null;
          unit?: Database["public"]["Enums"]["unit_code"] | null;
        };
        Update: {
          code?: string | null;
          company_id?: string | null;
          id?: string | null;
          kind?: Database["public"]["Enums"]["resource_kind"] | null;
          name?: string | null;
          unit?: Database["public"]["Enums"]["unit_code"] | null;
        };
        Relationships: [
          {
            foreignKeyName: "price_resources_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
        ];
      };
      stock_balances: {
        Row: {
          balance: number | null;
          company_id: string | null;
          item_name: string | null;
          last_movement: string | null;
          location_id: string | null;
          location_name: string | null;
          low_stock: boolean | null;
          min_quantity: number | null;
          project_id: string | null;
          unit: Database["public"]["Enums"]["unit_code"] | null;
        };
        ComputedFields: never;
        Relationships: [];
      };
      subcontract_values: {
        Row: {
          amount: number;
          boq_item_id: string | null;
          claimed_amount: number | null;
          company_id: string;
          created_at: string;
          created_by: string | null;
          deleted_at: string | null;
          end_date: string | null;
          id: string;
          paid_amount: number | null;
          project_id: string;
          retention_rate: number;
          scope: string | null;
          start_date: string | null;
          status: Database["public"]["Enums"]["subcontract_status"];
          supplier_id: string | null;
          supplier_name: string | null;
          title: string;
          updated_at: string;
        };
        ComputedFields: never;
        Relationships: [
          {
            foreignKeyName: "subcontracts_boq_item_id_fkey";
            columns: ["boq_item_id"];
            isOneToOne: false;
            referencedRelation: "boq_item_progress";
            referencedColumns: ["boq_item_id"];
          },
          {
            foreignKeyName: "subcontracts_boq_item_id_fkey";
            columns: ["boq_item_id"];
            isOneToOne: false;
            referencedRelation: "boq_item_values";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "subcontracts_boq_item_id_fkey";
            columns: ["boq_item_id"];
            isOneToOne: false;
            referencedRelation: "boq_items";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "subcontracts_boq_item_id_fkey";
            columns: ["boq_item_id"];
            isOneToOne: false;
            referencedRelation: "boq_items_site";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "subcontracts_boq_item_id_fkey";
            columns: ["boq_item_id"];
            isOneToOne: false;
            referencedRelation: "current_boq_items_site";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "subcontracts_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "subcontracts_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "client_project_overview";
            referencedColumns: ["project_id"];
          },
          {
            foreignKeyName: "subcontracts_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "project_financials";
            referencedColumns: ["project_id"];
          },
          {
            foreignKeyName: "subcontracts_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "project_list";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "subcontracts_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "subcontracts_supplier_id_fkey";
            columns: ["supplier_id"];
            isOneToOne: false;
            referencedRelation: "suppliers";
            referencedColumns: ["id"];
          },
        ];
      };
      task_progress: {
        Row: {
          company_id: string;
          progress: number | null;
          project_id: string;
          task_id: string;
        };
        ComputedFields: never;
        Relationships: [
          {
            foreignKeyName: "tasks_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tasks_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "client_project_overview";
            referencedColumns: ["project_id"];
          },
          {
            foreignKeyName: "tasks_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "project_financials";
            referencedColumns: ["project_id"];
          },
          {
            foreignKeyName: "tasks_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "project_list";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tasks_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
        ];
      };
      upa_component_values: {
        Row: {
          amount: number | null;
          company_id: string;
          created_at: string;
          created_by: string | null;
          currency: Database["public"]["Enums"]["currency_code"];
          deleted_at: string | null;
          designation: string;
          id: string;
          kind: Database["public"]["Enums"]["resource_kind"];
          position: number;
          project_id: string;
          quantity: number;
          resource_id: string | null;
          unit: Database["public"]["Enums"]["unit_code"];
          unit_cost: number;
          upa_id: string;
          updated_at: string;
          version_id: string;
          waste_rate: number;
        };
        ComputedFields: never;
        Relationships: [
          {
            foreignKeyName: "unit_price_components_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "unit_price_components_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "client_project_overview";
            referencedColumns: ["project_id"];
          },
          {
            foreignKeyName: "unit_price_components_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "project_financials";
            referencedColumns: ["project_id"];
          },
          {
            foreignKeyName: "unit_price_components_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "project_list";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "unit_price_components_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "unit_price_components_resource_id_fkey";
            columns: ["resource_id"];
            isOneToOne: false;
            referencedRelation: "price_resources";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "unit_price_components_resource_id_fkey";
            columns: ["resource_id"];
            isOneToOne: false;
            referencedRelation: "resources_site";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "unit_price_components_upa_id_fkey";
            columns: ["upa_id"];
            isOneToOne: false;
            referencedRelation: "unit_price_analyses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "unit_price_components_upa_id_fkey";
            columns: ["upa_id"];
            isOneToOne: false;
            referencedRelation: "upa_values";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "unit_price_components_version_id_fkey";
            columns: ["version_id"];
            isOneToOne: false;
            referencedRelation: "boq_version_totals";
            referencedColumns: ["version_id"];
          },
          {
            foreignKeyName: "unit_price_components_version_id_fkey";
            columns: ["version_id"];
            isOneToOne: false;
            referencedRelation: "boq_versions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "unit_price_components_version_id_fkey";
            columns: ["version_id"];
            isOneToOne: false;
            referencedRelation: "boq_versions_site";
            referencedColumns: ["id"];
          },
        ];
      };
      upa_values: {
        Row: {
          code: string;
          coefficient: number | null;
          company_id: string;
          component_count: number | null;
          created_at: string;
          created_by: string | null;
          currency: Database["public"]["Enums"]["currency_code"];
          deleted_at: string | null;
          dry_cost: number | null;
          effective_coefficient: number | null;
          id: string;
          notes: string | null;
          project_id: string;
          selling_price: number | null;
          title: string;
          unit: Database["public"]["Enums"]["unit_code"];
          updated_at: string;
          version_id: string;
        };
        ComputedFields: never;
        Relationships: [
          {
            foreignKeyName: "unit_price_analyses_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "unit_price_analyses_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "client_project_overview";
            referencedColumns: ["project_id"];
          },
          {
            foreignKeyName: "unit_price_analyses_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "project_financials";
            referencedColumns: ["project_id"];
          },
          {
            foreignKeyName: "unit_price_analyses_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "project_list";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "unit_price_analyses_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "unit_price_analyses_version_id_fkey";
            columns: ["version_id"];
            isOneToOne: false;
            referencedRelation: "boq_version_totals";
            referencedColumns: ["version_id"];
          },
          {
            foreignKeyName: "unit_price_analyses_version_id_fkey";
            columns: ["version_id"];
            isOneToOne: false;
            referencedRelation: "boq_versions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "unit_price_analyses_version_id_fkey";
            columns: ["version_id"];
            isOneToOne: false;
            referencedRelation: "boq_versions_site";
            referencedColumns: ["id"];
          },
        ];
      };
      workers_site: {
        Row: {
          active: boolean;
          company_id: string;
          full_name: string;
          id: string;
          phone: string | null;
          trade: string;
        };
        ComputedFields: never;
        Insert: {
          active?: boolean | null;
          company_id?: string | null;
          full_name?: string | null;
          id?: string | null;
          phone?: string | null;
          trade?: string | null;
        };
        Update: {
          active?: boolean | null;
          company_id?: string | null;
          full_name?: string | null;
          id?: string | null;
          phone?: string | null;
          trade?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "workers_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Functions: {
      _create_company_for: {
        Args: {
          p_country: Database["public"]["Enums"]["country_code"];
          p_currency: Database["public"]["Enums"]["currency_code"];
          p_language: Database["public"]["Enums"]["app_language"];
          p_name: string;
          p_user_id: string;
        };
        Returns: string;
      };
      accept_invitation: { Args: { p_invitation_id: string }; Returns: string };
      add_last_write_wins: { Args: { p_table: string }; Returns: undefined };
      add_same_project_check: { Args: { p_col?: string; p_fk: string; p_parent: string; p_table: string }; Returns: undefined };
      attach_standard_triggers: { Args: { p_table: unknown }; Returns: undefined };
      can_edit_estimate: { Args: { p_project_id: string }; Returns: boolean };
      can_read_estimate: { Args: { p_project_id: string }; Returns: boolean };
      can_read_storage_path: { Args: { p_name: string }; Returns: boolean };
      can_see_costs: { Args: { p_company_id: string }; Returns: boolean };
      can_see_finance: { Args: { p_company_id: string }; Returns: boolean };
      can_write_storage_path: { Args: { p_name: string }; Returns: boolean };
      create_baseline: { Args: { p_name: string; p_project_id: string }; Returns: string };
      create_boq_version: { Args: { p_name: string; p_project_id: string; p_source_id?: string }; Returns: string };
      create_company: {
        Args: {
          p_country?: Database["public"]["Enums"]["country_code"];
          p_currency?: Database["public"]["Enums"]["currency_code"];
          p_language?: Database["public"]["Enums"]["app_language"];
          p_name: string;
        };
        Returns: string;
      };
      create_invitation: {
        Args: { p_company_id: string; p_email: string; p_project_ids?: string[]; p_role: Database["public"]["Enums"]["app_role"] };
        Returns: string;
      };
      create_progress_claim: { Args: { p_period_end: string; p_project_id: string }; Returns: string };
      currency_decimals: { Args: { p_currency: Database["public"]["Enums"]["currency_code"] }; Returns: number };
      current_company_role: { Args: { p_company_id: string }; Returns: Database["public"]["Enums"]["app_role"] };
      decide_progress_claim: { Args: { p_approve: boolean; p_claim_id: string; p_comment?: string }; Returns: undefined };
      decline_invitation: { Args: { p_invitation_id: string }; Returns: undefined };
      generate_payroll: { Args: { p_period_id: string }; Returns: number };
      has_company_role: { Args: { p_company_id: string; p_roles: Database["public"]["Enums"]["app_role"][] }; Returns: boolean };
      has_project_access: { Args: { p_project_id: string }; Returns: boolean };
      has_project_role: { Args: { p_project_id: string; p_roles: Database["public"]["Enums"]["app_role"][] }; Returns: boolean };
      import_price_resources: { Args: { p_company_id: string; p_rows: Json }; Returns: Json };
      is_company_member: { Args: { p_company_id: string }; Returns: boolean };
      my_invitations: {
        Args: Record<PropertyKey, never>;
        Returns: {
          company_id: string;
          company_name: string;
          created_at: string;
          expires_at: string;
          id: string;
          invited_by_name: string;
          role: Database["public"]["Enums"]["app_role"];
        }[];
      };
      next_number: { Args: { p_project_id: string; p_table: string }; Returns: number };
      order_from_request: { Args: { p_request_id: string; p_supplier_id?: string }; Returns: string };
      progress_claim_amounts: {
        Args: { p_project_id: string };
        Returns: {
          advance_recovered_to_date: number;
          advance_recovery: number;
          claim_id: string;
          gross_cumulative: number;
          net_payable: number;
          previous_cumulative: number;
          retention: number;
          retention_to_date: number;
          this_period: number;
          vat: number;
        }[];
      };
      project_contract_total: { Args: { p_project_id: string }; Returns: number };
      project_physical_progress: { Args: { p_project_id: string }; Returns: number };
      refresh_upa_prices: { Args: { p_upa_id: string }; Returns: number };
      renumber_boq: { Args: { p_version_id: string }; Returns: undefined };
      reorder_boq_items: { Args: { p_item_ids: string[]; p_section_id: string }; Returns: undefined };
      reorder_boq_sections: { Args: { p_section_ids: string[]; p_version_id: string }; Returns: undefined };
      round_money: { Args: { p_amount: number; p_currency: Database["public"]["Enums"]["currency_code"] }; Returns: number };
      save_task_schedule: { Args: { p_project_id: string; p_rows: Json }; Returns: number };
      set_current_boq_version: { Args: { p_version_id: string }; Returns: undefined };
      set_member_projects: { Args: { p_company_id: string; p_project_ids: string[]; p_user_id: string }; Returns: undefined };
      setup_table: {
        Args: { p_audit?: boolean; p_read_roles: string; p_scope: string; p_table: string; p_write_roles: string };
        Returns: undefined;
      };
      shares_company_with: { Args: { p_user_id: string }; Returns: boolean };
      storage_company_id: { Args: { p_name: string }; Returns: string };
      storage_module: { Args: { p_name: string }; Returns: string };
      storage_project_id: { Args: { p_name: string }; Returns: string };
      try_uuid: { Args: { p: string }; Returns: string };
    };
    Enums: {
      app_language: "fr" | "en" | "ar" | "so";
      app_role: "owner" | "admin" | "project_manager" | "estimator" | "site_foreman" | "storekeeper" | "accountant" | "client_viewer";
      boq_status: "draft" | "submitted" | "approved";
      claim_status: "draft" | "submitted" | "approved" | "rejected" | "paid";
      country_code: "DJ" | "ET";
      currency_code: "DJF" | "ETB" | "USD";
      dependency_type: "FS" | "SS" | "FF" | "SF";
      equipment_ownership: "owned" | "rented";
      equipment_status: "active" | "maintenance" | "retired";
      expense_category: "materials" | "labour" | "equipment" | "subcontract" | "transport" | "fuel" | "site_overheads" | "fees" | "other";
      incident_kind: "injury" | "near_miss" | "damage" | "theft" | "environment" | "other";
      inspection_status: "draft" | "passed" | "failed";
      issue_status: "open" | "in_progress" | "resolved" | "closed";
      maintenance_status: "planned" | "done" | "cancelled";
      member_status: "active" | "disabled";
      movement_kind: "in" | "out" | "transfer" | "adjustment";
      payroll_status: "draft" | "approved" | "paid";
      po_status: "draft" | "sent" | "closed" | "cancelled";
      pr_status: "draft" | "submitted" | "approved" | "rejected" | "ordered";
      progress_source: "manual" | "boq";
      project_status: "draft" | "tender" | "active" | "on_hold" | "completed" | "cancelled";
      quantity_source: "manual" | "takeoff";
      report_status: "draft" | "submitted";
      resource_kind: "material" | "labour" | "equipment" | "subcontract";
      rfi_status: "open" | "answered" | "closed";
      safety_kind: "unsafe_act" | "unsafe_condition" | "near_miss" | "good_practice";
      severity_level: "low" | "medium" | "high" | "critical";
      subclaim_status: "submitted" | "approved" | "rejected" | "paid";
      subcontract_status: "active" | "completed" | "cancelled";
      supplier_kind: "supplier" | "subcontractor" | "both";
      theme_mode: "light" | "dark" | "system";
      unit_code: "m" | "m2" | "m3" | "kg" | "t" | "u" | "ml" | "ff" | "h" | "day" | "l";
      weather_kind: "sunny" | "cloudy" | "windy" | "rain" | "storm" | "sandstorm" | "heat";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    keyof (DefaultSchema["Tables"] & DefaultSchema["Views"]) | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      app_language: ["fr", "en", "ar", "so"],
      app_role: ["owner", "admin", "project_manager", "estimator", "site_foreman", "storekeeper", "accountant", "client_viewer"],
      boq_status: ["draft", "submitted", "approved"],
      claim_status: ["draft", "submitted", "approved", "rejected", "paid"],
      country_code: ["DJ", "ET"],
      currency_code: ["DJF", "ETB", "USD"],
      dependency_type: ["FS", "SS", "FF", "SF"],
      equipment_ownership: ["owned", "rented"],
      equipment_status: ["active", "maintenance", "retired"],
      expense_category: ["materials", "labour", "equipment", "subcontract", "transport", "fuel", "site_overheads", "fees", "other"],
      incident_kind: ["injury", "near_miss", "damage", "theft", "environment", "other"],
      inspection_status: ["draft", "passed", "failed"],
      issue_status: ["open", "in_progress", "resolved", "closed"],
      maintenance_status: ["planned", "done", "cancelled"],
      member_status: ["active", "disabled"],
      movement_kind: ["in", "out", "transfer", "adjustment"],
      payroll_status: ["draft", "approved", "paid"],
      po_status: ["draft", "sent", "closed", "cancelled"],
      pr_status: ["draft", "submitted", "approved", "rejected", "ordered"],
      progress_source: ["manual", "boq"],
      project_status: ["draft", "tender", "active", "on_hold", "completed", "cancelled"],
      quantity_source: ["manual", "takeoff"],
      report_status: ["draft", "submitted"],
      resource_kind: ["material", "labour", "equipment", "subcontract"],
      rfi_status: ["open", "answered", "closed"],
      safety_kind: ["unsafe_act", "unsafe_condition", "near_miss", "good_practice"],
      severity_level: ["low", "medium", "high", "critical"],
      subclaim_status: ["submitted", "approved", "rejected", "paid"],
      subcontract_status: ["active", "completed", "cancelled"],
      supplier_kind: ["supplier", "subcontractor", "both"],
      theme_mode: ["light", "dark", "system"],
      unit_code: ["m", "m2", "m3", "kg", "t", "u", "ml", "ff", "h", "day", "l"],
      weather_kind: ["sunny", "cloudy", "windy", "rain", "storm", "sandstorm", "heat"],
    },
  },
} as const;
