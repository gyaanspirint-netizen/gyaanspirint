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
      attendance: {
        Row: {
          batch: string
          created_at: string
          date: string
          id: string
          marked_by: string | null
          owner_id: string
          status: Database["public"]["Enums"]["attendance_status"]
          student_id: string
          updated_at: string
        }
        Insert: {
          batch?: string
          created_at?: string
          date?: string
          id?: string
          marked_by?: string | null
          owner_id: string
          status: Database["public"]["Enums"]["attendance_status"]
          student_id: string
          updated_at?: string
        }
        Update: {
          batch?: string
          created_at?: string
          date?: string
          id?: string
          marked_by?: string | null
          owner_id?: string
          status?: Database["public"]["Enums"]["attendance_status"]
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      batch_teachers: {
        Row: {
          batch_id: string
          created_at: string
          email: string
          id: string
          owner_id: string
          subject: string
          teacher_name: string
          updated_at: string
        }
        Insert: {
          batch_id: string
          created_at?: string
          email?: string
          id?: string
          owner_id: string
          subject?: string
          teacher_name: string
          updated_at?: string
        }
        Update: {
          batch_id?: string
          created_at?: string
          email?: string
          id?: string
          owner_id?: string
          subject?: string
          teacher_name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "batch_teachers_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batches"
            referencedColumns: ["id"]
          },
        ]
      }
      batches: {
        Row: {
          course_name: string | null
          created_at: string
          created_by: string | null
          end_date: string | null
          end_time: string
          id: string
          name: string
          owner_id: string
          schedule_days: string[]
          schedule_type: string
          start_date: string | null
          start_time: string
          status: string
          updated_at: string
        }
        Insert: {
          course_name?: string | null
          created_at?: string
          created_by?: string | null
          end_date?: string | null
          end_time: string
          id?: string
          name: string
          owner_id: string
          schedule_days?: string[]
          schedule_type?: string
          start_date?: string | null
          start_time: string
          status?: string
          updated_at?: string
        }
        Update: {
          course_name?: string | null
          created_at?: string
          created_by?: string | null
          end_date?: string | null
          end_time?: string
          id?: string
          name?: string
          owner_id?: string
          schedule_days?: string[]
          schedule_type?: string
          start_date?: string | null
          start_time?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      fees: {
        Row: {
          created_at: string
          created_by: string | null
          due_date: string
          id: string
          notes: string | null
          owner_id: string
          paid_amount: number
          reset_interval: string
          student_id: string
          total_amount: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          due_date: string
          id?: string
          notes?: string | null
          owner_id: string
          paid_amount?: number
          reset_interval?: string
          student_id: string
          total_amount?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          due_date?: string
          id?: string
          notes?: string | null
          owner_id?: string
          paid_amount?: number
          reset_interval?: string
          student_id?: string
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fees_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      homework: {
        Row: {
          assigned_date: string
          created_at: string
          done: boolean
          id: string
          note: string
          owner_id: string
          student_id: string
          updated_at: string
        }
        Insert: {
          assigned_date?: string
          created_at?: string
          done?: boolean
          id?: string
          note: string
          owner_id: string
          student_id: string
          updated_at?: string
        }
        Update: {
          assigned_date?: string
          created_at?: string
          done?: boolean
          id?: string
          note?: string
          owner_id?: string
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "homework_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      institutes: {
        Row: {
          activated_at: string | null
          activation_code: string | null
          activation_code_generated_at: string | null
          approved_at: string | null
          approved_by: string | null
          auto_generate_id: boolean
          auto_generate_password: boolean
          city: string
          created_at: string
          email: string
          id: string
          mobile: string
          name: string
          owner_id: string | null
          owner_name: string
          registration_enabled: boolean
          registration_token: string | null
          rejection_reason: string | null
          require_approval: boolean
          status: string
          updated_at: string
        }
        Insert: {
          activated_at?: string | null
          activation_code?: string | null
          activation_code_generated_at?: string | null
          approved_at?: string | null
          approved_by?: string | null
          auto_generate_id?: boolean
          auto_generate_password?: boolean
          city: string
          created_at?: string
          email: string
          id?: string
          mobile: string
          name: string
          owner_id?: string | null
          owner_name: string
          registration_enabled?: boolean
          registration_token?: string | null
          rejection_reason?: string | null
          require_approval?: boolean
          status?: string
          updated_at?: string
        }
        Update: {
          activated_at?: string | null
          activation_code?: string | null
          activation_code_generated_at?: string | null
          approved_at?: string | null
          approved_by?: string | null
          auto_generate_id?: boolean
          auto_generate_password?: boolean
          city?: string
          created_at?: string
          email?: string
          id?: string
          mobile?: string
          name?: string
          owner_id?: string | null
          owner_name?: string
          registration_enabled?: boolean
          registration_token?: string | null
          rejection_reason?: string | null
          require_approval?: boolean
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      pending_registrations: {
        Row: {
          batch: string
          created_at: string
          id: string
          notes: string
          owner_id: string
          parent_name: string
          parent_phone: string
          processed_at: string | null
          status: string
          student_name: string
          student_phone: string
          submitted_at: string
          updated_at: string
        }
        Insert: {
          batch?: string
          created_at?: string
          id?: string
          notes?: string
          owner_id: string
          parent_name: string
          parent_phone: string
          processed_at?: string | null
          status?: string
          student_name: string
          student_phone?: string
          submitted_at?: string
          updated_at?: string
        }
        Update: {
          batch?: string
          created_at?: string
          id?: string
          notes?: string
          owner_id?: string
          parent_name?: string
          parent_phone?: string
          processed_at?: string | null
          status?: string
          student_name?: string
          student_phone?: string
          submitted_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      schedule: {
        Row: {
          batch_id: string | null
          created_at: string
          end_time: string
          id: string
          notes: string | null
          owner_id: string
          schedule_date: string
          start_time: string
          title: string
          updated_at: string
        }
        Insert: {
          batch_id?: string | null
          created_at?: string
          end_time: string
          id?: string
          notes?: string | null
          owner_id: string
          schedule_date: string
          start_time: string
          title: string
          updated_at?: string
        }
        Update: {
          batch_id?: string | null
          created_at?: string
          end_time?: string
          id?: string
          notes?: string | null
          owner_id?: string
          schedule_date?: string
          start_time?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "schedule_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batches"
            referencedColumns: ["id"]
          },
        ]
      }
      students: {
        Row: {
          admission_date: string
          batch: string
          created_at: string
          created_by: string | null
          cuid: string | null
          father_name: string
          id: string
          name: string
          owner_id: string
          parent_phone: string
          student_phone: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          admission_date: string
          batch: string
          created_at?: string
          created_by?: string | null
          cuid?: string | null
          father_name: string
          id?: string
          name: string
          owner_id: string
          parent_phone: string
          student_phone: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          admission_date?: string
          batch?: string
          created_at?: string
          created_by?: string | null
          cuid?: string | null
          father_name?: string
          id?: string
          name?: string
          owner_id?: string
          parent_phone?: string
          student_phone?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      support_tickets: {
        Row: {
          created_at: string
          created_by: string
          id: string
          message: string
          owner_id: string
          status: string
          subject: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          message: string
          owner_id: string
          status?: string
          subject: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          message?: string
          owner_id?: string
          status?: string
          subject?: string
          updated_at?: string
        }
        Relationships: []
      }
      test_marks: {
        Row: {
          created_at: string
          id: string
          marks: number | null
          max_marks: number | null
          owner_id: string
          student_id: string
          test_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          marks?: number | null
          max_marks?: number | null
          owner_id: string
          student_id: string
          test_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          marks?: number | null
          max_marks?: number | null
          owner_id?: string
          student_id?: string
          test_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "test_marks_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "test_marks_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "tests"
            referencedColumns: ["id"]
          },
        ]
      }
      tests: {
        Row: {
          batch: string
          created_at: string
          created_by: string | null
          id: string
          owner_id: string
          subject: string
          test_date: string
          test_name: string
          updated_at: string
        }
        Insert: {
          batch: string
          created_at?: string
          created_by?: string | null
          id?: string
          owner_id: string
          subject: string
          test_date: string
          test_name: string
          updated_at?: string
        }
        Update: {
          batch?: string
          created_at?: string
          created_by?: string | null
          id?: string
          owner_id?: string
          subject?: string
          test_date?: string
          test_name?: string
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
      claim_admin_role: { Args: never; Returns: undefined }
      current_institute_status: { Args: never; Returns: string }
      current_owner_id: { Args: never; Returns: string }
      current_student_batch_ids: { Args: never; Returns: string[] }
      generate_activation_code: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_super_admin: { Args: never; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "student" | "super_admin"
      attendance_status: "present" | "absent"
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
      app_role: ["admin", "student", "super_admin"],
      attendance_status: ["present", "absent"],
    },
  },
} as const
