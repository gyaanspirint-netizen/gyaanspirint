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
      activity_log: {
        Row: {
          action: string
          actor_name: string | null
          actor_role: string | null
          actor_user_id: string | null
          created_at: string
          entity_id: string | null
          entity_type: string | null
          id: string
          metadata: Json
          owner_id: string
        }
        Insert: {
          action: string
          actor_name?: string | null
          actor_role?: string | null
          actor_user_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          metadata?: Json
          owner_id: string
        }
        Update: {
          action?: string
          actor_name?: string | null
          actor_role?: string | null
          actor_user_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          metadata?: Json
          owner_id?: string
        }
        Relationships: []
      }
      announcements: {
        Row: {
          audience_ids: string[]
          audience_labels: string[]
          audience_type: string
          body: string
          created_at: string
          created_by: string | null
          id: string
          owner_id: string
          teacher_id: string | null
          title: string
        }
        Insert: {
          audience_ids?: string[]
          audience_labels?: string[]
          audience_type?: string
          body?: string
          created_at?: string
          created_by?: string | null
          id?: string
          owner_id: string
          teacher_id?: string | null
          title: string
        }
        Update: {
          audience_ids?: string[]
          audience_labels?: string[]
          audience_type?: string
          body?: string
          created_at?: string
          created_by?: string | null
          id?: string
          owner_id?: string
          teacher_id?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcements_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
        ]
      }
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
      class_update_completions: {
        Row: {
          created_at: string
          id: string
          marked_at: string
          owner_id: string
          status: Database["public"]["Enums"]["completion_status"]
          student_id: string
          update_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          marked_at?: string
          owner_id: string
          status: Database["public"]["Enums"]["completion_status"]
          student_id: string
          update_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          marked_at?: string
          owner_id?: string
          status?: Database["public"]["Enums"]["completion_status"]
          student_id?: string
          update_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "class_update_completions_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_update_completions_update_id_fkey"
            columns: ["update_id"]
            isOneToOne: false
            referencedRelation: "class_updates"
            referencedColumns: ["id"]
          },
        ]
      }
      class_update_reads: {
        Row: {
          read_at: string
          student_user_id: string
          update_id: string
        }
        Insert: {
          read_at?: string
          student_user_id: string
          update_id: string
        }
        Update: {
          read_at?: string
          student_user_id?: string
          update_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "class_update_reads_update_id_fkey"
            columns: ["update_id"]
            isOneToOne: false
            referencedRelation: "class_updates"
            referencedColumns: ["id"]
          },
        ]
      }
      class_update_templates: {
        Row: {
          attachments: Json
          created_at: string
          homework: string | null
          id: string
          name: string
          notice: string | null
          owner_id: string
          priority: Database["public"]["Enums"]["update_priority"]
          subject: string | null
          topic: string | null
          updated_at: string
        }
        Insert: {
          attachments?: Json
          created_at?: string
          homework?: string | null
          id?: string
          name: string
          notice?: string | null
          owner_id: string
          priority?: Database["public"]["Enums"]["update_priority"]
          subject?: string | null
          topic?: string | null
          updated_at?: string
        }
        Update: {
          attachments?: Json
          created_at?: string
          homework?: string | null
          id?: string
          name?: string
          notice?: string | null
          owner_id?: string
          priority?: Database["public"]["Enums"]["update_priority"]
          subject?: string | null
          topic?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      class_updates: {
        Row: {
          attachments: Json
          audience_ids: string[]
          audience_type: Database["public"]["Enums"]["update_audience"]
          batch: string
          class_name: string
          created_at: string
          created_by: string
          due_date: string | null
          homework: string
          id: string
          notice: string | null
          owner_id: string
          priority: Database["public"]["Enums"]["update_priority"]
          published_at: string
          subject: string
          topic: string
          updated_at: string
        }
        Insert: {
          attachments?: Json
          audience_ids?: string[]
          audience_type?: Database["public"]["Enums"]["update_audience"]
          batch?: string
          class_name?: string
          created_at?: string
          created_by?: string
          due_date?: string | null
          homework?: string
          id?: string
          notice?: string | null
          owner_id: string
          priority?: Database["public"]["Enums"]["update_priority"]
          published_at?: string
          subject: string
          topic: string
          updated_at?: string
        }
        Update: {
          attachments?: Json
          audience_ids?: string[]
          audience_type?: Database["public"]["Enums"]["update_audience"]
          batch?: string
          class_name?: string
          created_at?: string
          created_by?: string
          due_date?: string | null
          homework?: string
          id?: string
          notice?: string | null
          owner_id?: string
          priority?: Database["public"]["Enums"]["update_priority"]
          published_at?: string
          subject?: string
          topic?: string
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
      teacher_assignments: {
        Row: {
          batch_id: string
          class_name: string | null
          created_at: string
          id: string
          owner_id: string
          subject: string | null
          teacher_id: string
        }
        Insert: {
          batch_id: string
          class_name?: string | null
          created_at?: string
          id?: string
          owner_id: string
          subject?: string | null
          teacher_id: string
        }
        Update: {
          batch_id?: string
          class_name?: string | null
          created_at?: string
          id?: string
          owner_id?: string
          subject?: string | null
          teacher_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "teacher_assignments_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_assignments_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
        ]
      }
      teacher_remarks: {
        Row: {
          created_at: string
          id: string
          owner_id: string
          remark: string
          student_id: string
          tag: string | null
          teacher_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          owner_id: string
          remark: string
          student_id: string
          tag?: string | null
          teacher_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          owner_id?: string
          remark?: string
          student_id?: string
          tag?: string | null
          teacher_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "teacher_remarks_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_remarks_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
        ]
      }
      teachers: {
        Row: {
          created_at: string
          email: string | null
          experience: string | null
          full_name: string
          id: string
          last_login_at: string | null
          mobile: string
          must_change_password: boolean
          owner_id: string
          photo_url: string | null
          qualification: string | null
          status: string
          subject: string | null
          teacher_code: string
          temp_password: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          experience?: string | null
          full_name: string
          id?: string
          last_login_at?: string | null
          mobile: string
          must_change_password?: boolean
          owner_id: string
          photo_url?: string | null
          qualification?: string | null
          status?: string
          subject?: string | null
          teacher_code: string
          temp_password?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          experience?: string | null
          full_name?: string
          id?: string
          last_login_at?: string | null
          mobile?: string
          must_change_password?: boolean
          owner_id?: string
          photo_url?: string | null
          qualification?: string | null
          status?: string
          subject?: string | null
          teacher_code?: string
          temp_password?: string | null
          updated_at?: string
          user_id?: string | null
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
      current_teacher_id: { Args: never; Returns: string }
      current_teacher_owner_id: { Args: never; Returns: string }
      generate_activation_code: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_super_admin: { Args: never; Returns: boolean }
      is_teacher: { Args: never; Returns: boolean }
      is_teacher_of_batch: { Args: { _batch_id: string }; Returns: boolean }
      is_teacher_of_batch_name: {
        Args: { _batch_name: string }
        Returns: boolean
      }
      next_teacher_code: { Args: { _owner_id: string }; Returns: string }
    }
    Enums: {
      app_role: "admin" | "student" | "super_admin"
      attendance_status: "present" | "absent"
      completion_status: "completed" | "partial" | "not_completed"
      update_audience: "class" | "batch" | "students"
      update_priority: "normal" | "important" | "urgent"
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
      completion_status: ["completed", "partial", "not_completed"],
      update_audience: ["class", "batch", "students"],
      update_priority: ["normal", "important", "urgent"],
    },
  },
} as const
