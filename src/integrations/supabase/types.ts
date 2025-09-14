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
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      activity: {
        Row: {
          created_at: string | null
          devid: string
          gnss: number | null
          id: string
          modem: number | null
          other: number | null
          sleep: number | null
          uplink_count: number | null
          wifi: number | null
        }
        Insert: {
          created_at?: string | null
          devid: string
          gnss?: number | null
          id?: string
          modem?: number | null
          other?: number | null
          sleep?: number | null
          uplink_count?: number | null
          wifi?: number | null
        }
        Update: {
          created_at?: string | null
          devid?: string
          gnss?: number | null
          id?: string
          modem?: number | null
          other?: number | null
          sleep?: number | null
          uplink_count?: number | null
          wifi?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "activity_devid_fkey"
            columns: ["devid"]
            isOneToOne: false
            referencedRelation: "device_config"
            referencedColumns: ["devid"]
          },
        ]
      }
      device_access: {
        Row: {
          created_at: string
          devid: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          devid: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          devid?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "device_access_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      device_config: {
        Row: {
          application_mode: string | null
          battery_level: number | null
          created_at: string | null
          device_data_updated_at: string | null
          devid: string
          heartbeat_interval: number | null
          hw_version: string | null
          iccid: string | null
          last_seen: string | null
          last_uplink_count: number | null
          name: string | null
          sensor_profile_id: string | null
          sw_version: string | null
        }
        Insert: {
          application_mode?: string | null
          battery_level?: number | null
          created_at?: string | null
          device_data_updated_at?: string | null
          devid: string
          heartbeat_interval?: number | null
          hw_version?: string | null
          iccid?: string | null
          last_seen?: string | null
          last_uplink_count?: number | null
          name?: string | null
          sensor_profile_id?: string | null
          sw_version?: string | null
        }
        Update: {
          application_mode?: string | null
          battery_level?: number | null
          created_at?: string | null
          device_data_updated_at?: string | null
          devid?: string
          heartbeat_interval?: number | null
          hw_version?: string | null
          iccid?: string | null
          last_seen?: string | null
          last_uplink_count?: number | null
          name?: string | null
          sensor_profile_id?: string | null
          sw_version?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "device_config_sensor_profile_id_fkey"
            columns: ["sensor_profile_id"]
            isOneToOne: false
            referencedRelation: "sensor_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      reboot: {
        Row: {
          created_at: string | null
          devid: string
          file: string | null
          id: string
          line: number | null
          reason: string
          uplink_count: number | null
        }
        Insert: {
          created_at?: string | null
          devid: string
          file?: string | null
          id?: string
          line?: number | null
          reason: string
          uplink_count?: number | null
        }
        Update: {
          created_at?: string | null
          devid?: string
          file?: string | null
          id?: string
          line?: number | null
          reason?: string
          uplink_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "reboot_devid_fkey"
            columns: ["devid"]
            isOneToOne: false
            referencedRelation: "device_config"
            referencedColumns: ["devid"]
          },
        ]
      }
      sensor_data: {
        Row: {
          created_at: string | null
          data: Json
          data_type: string
          devid: string
          id: string
          uplink_count: number | null
        }
        Insert: {
          created_at?: string | null
          data: Json
          data_type: string
          devid: string
          id?: string
          uplink_count?: number | null
        }
        Update: {
          created_at?: string | null
          data?: Json
          data_type?: string
          devid?: string
          id?: string
          uplink_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "sensor_data_devid_fkey"
            columns: ["devid"]
            isOneToOne: false
            referencedRelation: "device_config"
            referencedColumns: ["devid"]
          },
        ]
      }
      sensor_data_types: {
        Row: {
          created_at: string
          data_schema: Json
          description: string | null
          display_name: string
          id: string
          name: string
          unit: string | null
          visualization_config: Json
        }
        Insert: {
          created_at?: string
          data_schema?: Json
          description?: string | null
          display_name: string
          id?: string
          name: string
          unit?: string | null
          visualization_config?: Json
        }
        Update: {
          created_at?: string
          data_schema?: Json
          description?: string | null
          display_name?: string
          id?: string
          name?: string
          unit?: string | null
          visualization_config?: Json
        }
        Relationships: []
      }
      sensor_profiles: {
        Row: {
          application_type: Database["public"]["Enums"]["application_type"]
          config: Json
          created_at: string
          created_by: string | null
          dashboard_layout: Json
          description: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          application_type?: Database["public"]["Enums"]["application_type"]
          config?: Json
          created_at?: string
          created_by?: string | null
          dashboard_layout?: Json
          description?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          application_type?: Database["public"]["Enums"]["application_type"]
          config?: Json
          created_at?: string
          created_by?: string | null
          dashboard_layout?: Json
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user" | "developer"
      application_type:
        | "geotracking"
        | "agriculture"
        | "environmental"
        | "industrial"
        | "custom"
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
      app_role: ["admin", "moderator", "user", "developer"],
      application_type: [
        "geotracking",
        "agriculture",
        "environmental",
        "industrial",
        "custom",
      ],
    },
  },
} as const
