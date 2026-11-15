export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
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
          id: string;
          low_stock_alerts: boolean;
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
          id?: string;
          low_stock_alerts?: boolean;
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
          id?: string;
          low_stock_alerts?: boolean;
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
    };
    Views: {
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
      attach_standard_triggers: { Args: { p_table: unknown }; Returns: undefined };
      can_edit_estimate: { Args: { p_project_id: string }; Returns: boolean };
      can_read_estimate: { Args: { p_project_id: string }; Returns: boolean };
      can_read_storage_path: { Args: { p_name: string }; Returns: boolean };
      can_see_costs: { Args: { p_company_id: string }; Returns: boolean };
      can_see_finance: { Args: { p_company_id: string }; Returns: boolean };
      can_write_storage_path: { Args: { p_name: string }; Returns: boolean };
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
      currency_decimals: { Args: { p_currency: Database["public"]["Enums"]["currency_code"] }; Returns: number };
      current_company_role: { Args: { p_company_id: string }; Returns: Database["public"]["Enums"]["app_role"] };
      decline_invitation: { Args: { p_invitation_id: string }; Returns: undefined };
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
      refresh_upa_prices: { Args: { p_upa_id: string }; Returns: number };
      renumber_boq: { Args: { p_version_id: string }; Returns: undefined };
      reorder_boq_items: { Args: { p_item_ids: string[]; p_section_id: string }; Returns: undefined };
      reorder_boq_sections: { Args: { p_section_ids: string[]; p_version_id: string }; Returns: undefined };
      round_money: { Args: { p_amount: number; p_currency: Database["public"]["Enums"]["currency_code"] }; Returns: number };
      set_current_boq_version: { Args: { p_version_id: string }; Returns: undefined };
      set_member_projects: { Args: { p_company_id: string; p_project_ids: string[]; p_user_id: string }; Returns: undefined };
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
      country_code: "DJ" | "ET";
      currency_code: "DJF" | "ETB" | "USD";
      member_status: "active" | "disabled";
      project_status: "draft" | "tender" | "active" | "on_hold" | "completed" | "cancelled";
      quantity_source: "manual" | "takeoff";
      resource_kind: "material" | "labour" | "equipment" | "subcontract";
      theme_mode: "light" | "dark" | "system";
      unit_code: "m" | "m2" | "m3" | "kg" | "t" | "u" | "ml" | "ff" | "h" | "day" | "l";
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
      country_code: ["DJ", "ET"],
      currency_code: ["DJF", "ETB", "USD"],
      member_status: ["active", "disabled"],
      project_status: ["draft", "tender", "active", "on_hold", "completed", "cancelled"],
      quantity_source: ["manual", "takeoff"],
      resource_kind: ["material", "labour", "equipment", "subcontract"],
      theme_mode: ["light", "dark", "system"],
      unit_code: ["m", "m2", "m3", "kg", "t", "u", "ml", "ff", "h", "day", "l"],
    },
  },
} as const;
