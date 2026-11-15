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
    };
    Views: {
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
      attach_standard_triggers: {
        Args: { p_table: unknown };
        Returns: undefined;
      };
      can_read_storage_path: { Args: { p_name: string }; Returns: boolean };
      can_see_costs: { Args: { p_company_id: string }; Returns: boolean };
      can_see_finance: { Args: { p_company_id: string }; Returns: boolean };
      can_write_storage_path: { Args: { p_name: string }; Returns: boolean };
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
        Args: {
          p_company_id: string;
          p_email: string;
          p_project_ids?: string[];
          p_role: Database["public"]["Enums"]["app_role"];
        };
        Returns: string;
      };
      current_company_role: {
        Args: { p_company_id: string };
        Returns: Database["public"]["Enums"]["app_role"];
      };
      decline_invitation: {
        Args: { p_invitation_id: string };
        Returns: undefined;
      };
      has_company_role: {
        Args: {
          p_company_id: string;
          p_roles: Database["public"]["Enums"]["app_role"][];
        };
        Returns: boolean;
      };
      has_project_access: { Args: { p_project_id: string }; Returns: boolean };
      has_project_role: {
        Args: {
          p_project_id: string;
          p_roles: Database["public"]["Enums"]["app_role"][];
        };
        Returns: boolean;
      };
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
      set_member_projects: {
        Args: {
          p_company_id: string;
          p_project_ids: string[];
          p_user_id: string;
        };
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
      app_role:
        | "owner"
        | "admin"
        | "project_manager"
        | "estimator"
        | "site_foreman"
        | "storekeeper"
        | "accountant"
        | "client_viewer";
      country_code: "DJ" | "ET";
      currency_code: "DJF" | "ETB" | "USD";
      member_status: "active" | "disabled";
      project_status:
        "draft" | "tender" | "active" | "on_hold" | "completed" | "cancelled";
      theme_mode: "light" | "dark" | "system";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  "public"
>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
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
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
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
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      app_language: ["fr", "en", "ar", "so"],
      app_role: [
        "owner",
        "admin",
        "project_manager",
        "estimator",
        "site_foreman",
        "storekeeper",
        "accountant",
        "client_viewer",
      ],
      country_code: ["DJ", "ET"],
      currency_code: ["DJF", "ETB", "USD"],
      member_status: ["active", "disabled"],
      project_status: [
        "draft",
        "tender",
        "active",
        "on_hold",
        "completed",
        "cancelled",
      ],
      theme_mode: ["light", "dark", "system"],
    },
  },
} as const;
