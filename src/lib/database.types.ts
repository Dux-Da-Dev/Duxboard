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
      board_members: {
        Row: {
          board_id: string
          created_at: string
          role: string
          user_id: string
        }
        Insert: {
          board_id: string
          created_at?: string
          role?: string
          user_id: string
        }
        Update: {
          board_id?: string
          created_at?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "board_members_board_id_fkey"
            columns: ["board_id"]
            isOneToOne: false
            referencedRelation: "boards"
            referencedColumns: ["id"]
          },
        ]
      }
      boards: {
        Row: {
          created_at: string
          id: string
          name: string
          owner_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          name?: string
          owner_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          owner_id?: string | null
        }
        Relationships: []
      }
      connections: {
        Row: {
          created_at: string
          end_pin_id: string
          id: string
          start_pin_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          end_pin_id: string
          id?: string
          start_pin_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          end_pin_id?: string
          id?: string
          start_pin_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "connections_end_pin_id_fkey"
            columns: ["end_pin_id"]
            isOneToOne: false
            referencedRelation: "pins"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "connections_start_pin_id_fkey"
            columns: ["start_pin_id"]
            isOneToOne: false
            referencedRelation: "pins"
            referencedColumns: ["id"]
          },
        ]
      }
      files: {
        Row: {
          created_at: string
          file_name: string
          id: string
          pin_id: string
          storage_path: string
          user_id: string
        }
        Insert: {
          created_at?: string
          file_name: string
          id?: string
          pin_id: string
          storage_path: string
          user_id: string
        }
        Update: {
          created_at?: string
          file_name?: string
          id?: string
          pin_id?: string
          storage_path?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "files_pin_id_fkey"
            columns: ["pin_id"]
            isOneToOne: false
            referencedRelation: "pins"
            referencedColumns: ["id"]
          },
        ]
      }
      generation_jobs: {
        Row: {
          anchor_pin_id: string | null
          created_at: string
          error_message: string | null
          id: string
          job_type: string
          note_text: string | null
          pin_position: Json | null
          related_instruction_id: string | null
          source_content: string
          status: string
          user_id: string
        }
        Insert: {
          anchor_pin_id?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          job_type: string
          note_text?: string | null
          pin_position?: Json | null
          related_instruction_id?: string | null
          source_content: string
          status?: string
          user_id: string
        }
        Update: {
          anchor_pin_id?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          job_type?: string
          note_text?: string | null
          pin_position?: Json | null
          related_instruction_id?: string | null
          source_content?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "generation_jobs_anchor_pin_id_fkey"
            columns: ["anchor_pin_id"]
            isOneToOne: false
            referencedRelation: "pins"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "generation_jobs_related_instruction_id_fkey"
            columns: ["related_instruction_id"]
            isOneToOne: false
            referencedRelation: "model_instructions"
            referencedColumns: ["id"]
          },
        ]
      }
      model_instructions: {
        Row: {
          created_at: string
          id: string
          instructions: string
          profile_name: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          instructions: string
          profile_name: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          instructions?: string
          profile_name?: string
          user_id?: string
        }
        Relationships: []
      }
      pins: {
        Row: {
          board_id: string
          created_at: string
          id: string
          image_url: string
          is_deleted: boolean
          is_sub_board_hub: boolean | null
          notes: string | null
          parent_pin_id: string | null
          position: Json
          scale: number
          user_id: string
        }
        Insert: {
          board_id: string
          created_at?: string
          id?: string
          image_url: string
          is_deleted?: boolean
          is_sub_board_hub?: boolean | null
          notes?: string | null
          parent_pin_id?: string | null
          position?: Json
          scale?: number
          user_id: string
        }
        Update: {
          board_id?: string
          created_at?: string
          id?: string
          image_url?: string
          is_deleted?: boolean
          is_sub_board_hub?: boolean | null
          notes?: string | null
          parent_pin_id?: string | null
          position?: Json
          scale?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_pins_board_id"
            columns: ["board_id"]
            isOneToOne: false
            referencedRelation: "boards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pins_parent_pin_id_fkey"
            columns: ["parent_pin_id"]
            isOneToOne: false
            referencedRelation: "pins"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          full_name: string | null
          has_completed_storylines_tutorial: boolean
          has_completed_tutorial: boolean
          id: string
          image_generations_count: number
          role: string | null
          text_generations_count: number
          theme: string | null
          uploads_count: number
        }
        Insert: {
          avatar_url?: string | null
          full_name?: string | null
          has_completed_storylines_tutorial?: boolean
          has_completed_tutorial?: boolean
          id: string
          image_generations_count?: number
          role?: string | null
          text_generations_count?: number
          theme?: string | null
          uploads_count?: number
        }
        Update: {
          avatar_url?: string | null
          full_name?: string | null
          has_completed_storylines_tutorial?: boolean
          has_completed_tutorial?: boolean
          id?: string
          image_generations_count?: number
          role?: string | null
          text_generations_count?: number
          theme?: string | null
          uploads_count?: number
        }
        Relationships: []
      }
      storyline_pins: {
        Row: {
          id: number
          is_completed: boolean
          pin_id: string
          position: Json
          storyline_id: string
        }
        Insert: {
          id?: number
          is_completed?: boolean
          pin_id: string
          position?: Json
          storyline_id: string
        }
        Update: {
          id?: number
          is_completed?: boolean
          pin_id?: string
          position?: Json
          storyline_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "storyline_pins_pin_id_fkey"
            columns: ["pin_id"]
            isOneToOne: false
            referencedRelation: "pins"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "storyline_pins_storyline_id_fkey"
            columns: ["storyline_id"]
            isOneToOne: false
            referencedRelation: "storylines"
            referencedColumns: ["id"]
          },
        ]
      }
      storylines: {
        Row: {
          created_at: string
          id: string
          is_public: boolean
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_public?: boolean
          title: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_public?: boolean
          title?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_or_create_user_board: {
        Args: { p_user_id: string }
        Returns: string
      }
      increment_image_count: {
        Args: { user_id_param: string }
        Returns: undefined
      }
      increment_text_count: {
        Args: { user_id_param: string }
        Returns: undefined
      }
      increment_uploads_count: {
        Args: { user_id_param: string }
        Returns: undefined
      }
      is_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
