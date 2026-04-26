export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      client_template_assignments: {
        Row: {
          assigned_at: string
          assigned_template_id: string
          client_id: string
          created_at: string
          macrocycle_ends_at: string | null
          position: Database["public"]["Enums"]["template_position"]
          updated_at: string
        }
        Insert: {
          assigned_at?: string
          assigned_template_id: string
          client_id: string
          created_at?: string
          macrocycle_ends_at?: string | null
          position: Database["public"]["Enums"]["template_position"]
          updated_at?: string
        }
        Update: {
          assigned_at?: string
          assigned_template_id?: string
          client_id?: string
          created_at?: string
          macrocycle_ends_at?: string | null
          position?: Database["public"]["Enums"]["template_position"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_template_assignments_assigned_template_id_fkey"
            columns: ["assigned_template_id"]
            isOneToOne: false
            referencedRelation: "session_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_template_assignments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_check_ins: {
        Row: {
          created_at: string
          cycle_day: number | null
          date: string
          energy_level: number | null
          id: string
          notes: string | null
          sleep_hours: number | null
          stress_level: number | null
          updated_at: string
          user_id: string
          water_intake_ml: number | null
        }
        Insert: {
          created_at?: string
          cycle_day?: number | null
          date: string
          energy_level?: number | null
          id?: string
          notes?: string | null
          sleep_hours?: number | null
          stress_level?: number | null
          updated_at?: string
          user_id: string
          water_intake_ml?: number | null
        }
        Update: {
          created_at?: string
          cycle_day?: number | null
          date?: string
          energy_level?: number | null
          id?: string
          notes?: string | null
          sleep_hours?: number | null
          stress_level?: number | null
          updated_at?: string
          user_id?: string
          water_intake_ml?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "daily_check_ins_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      exercise_progress: {
        Row: {
          completed_at: string
          created_at: string
          exercise_id: string
          id: string
          reps: number
          rir: number | null
          set_number: number
          user_id: string
          weight_kg: number
          workout_session_id: string | null
        }
        Insert: {
          completed_at?: string
          created_at?: string
          exercise_id: string
          id?: string
          reps: number
          rir?: number | null
          set_number: number
          user_id: string
          weight_kg: number
          workout_session_id?: string | null
        }
        Update: {
          completed_at?: string
          created_at?: string
          exercise_id?: string
          id?: string
          reps?: number
          rir?: number | null
          set_number?: number
          user_id?: string
          weight_kg?: number
          workout_session_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "exercise_progress_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exercise_progress_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      exercises: {
        Row: {
          cns_load: number
          contraindications: string[]
          created_at: string
          created_by_trainer_id: string | null
          difficulty: string
          equipment: string[]
          fatigue_index: number
          gentle_on: string[]
          id: string
          instructions: string
          is_bilateral: boolean
          is_compound: boolean
          is_finisher_eligible: boolean
          is_glute_builder: boolean
          is_system_exercise: boolean
          movement_pattern: string
          name: string
          name_sr: string
          primary_muscle: string
          requires_stabilization: boolean
          secondary_muscles: string[]
          tension_profile: string
          updated_at: string
          video_url: string | null
          weight_increment: number
        }
        Insert: {
          cns_load: number
          contraindications?: string[]
          created_at?: string
          created_by_trainer_id?: string | null
          difficulty: string
          equipment?: string[]
          fatigue_index: number
          gentle_on?: string[]
          id?: string
          instructions?: string
          is_bilateral?: boolean
          is_compound?: boolean
          is_finisher_eligible?: boolean
          is_glute_builder?: boolean
          is_system_exercise?: boolean
          movement_pattern: string
          name: string
          name_sr: string
          primary_muscle: string
          requires_stabilization?: boolean
          secondary_muscles?: string[]
          tension_profile?: string
          updated_at?: string
          video_url?: string | null
          weight_increment?: number
        }
        Update: {
          cns_load?: number
          contraindications?: string[]
          created_at?: string
          created_by_trainer_id?: string | null
          difficulty?: string
          equipment?: string[]
          fatigue_index?: number
          gentle_on?: string[]
          id?: string
          instructions?: string
          is_bilateral?: boolean
          is_compound?: boolean
          is_finisher_eligible?: boolean
          is_glute_builder?: boolean
          is_system_exercise?: boolean
          movement_pattern?: string
          name?: string
          name_sr?: string
          primary_muscle?: string
          requires_stabilization?: boolean
          secondary_muscles?: string[]
          tension_profile?: string
          updated_at?: string
          video_url?: string | null
          weight_increment?: number
        }
        Relationships: [
          {
            foreignKeyName: "exercises_created_by_trainer_id_fkey"
            columns: ["created_by_trainer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      food_items: {
        Row: {
          allergens: string[]
          calories: number
          carbs_g: number
          created_at: string
          created_by_trainer_id: string | null
          fat_g: number
          fiber_g: number | null
          glycemic_index: string
          id: string
          ingredients: string[]
          is_system: boolean
          meal_slots: string[]
          name_en: string
          name_sr: string
          protein_g: number
          tags: string[]
          updated_at: string
        }
        Insert: {
          allergens?: string[]
          calories: number
          carbs_g: number
          created_at?: string
          created_by_trainer_id?: string | null
          fat_g: number
          fiber_g?: number | null
          glycemic_index: string
          id?: string
          ingredients?: string[]
          is_system?: boolean
          meal_slots?: string[]
          name_en: string
          name_sr: string
          protein_g: number
          tags?: string[]
          updated_at?: string
        }
        Update: {
          allergens?: string[]
          calories?: number
          carbs_g?: number
          created_at?: string
          created_by_trainer_id?: string | null
          fat_g?: number
          fiber_g?: number | null
          glycemic_index?: string
          id?: string
          ingredients?: string[]
          is_system?: boolean
          meal_slots?: string[]
          name_en?: string
          name_sr?: string
          protein_g?: number
          tags?: string[]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "food_items_created_by_trainer_id_fkey"
            columns: ["created_by_trainer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      meal_logs: {
        Row: {
          calories_actual: number
          carbs_actual: number
          created_at: string
          fat_actual: number
          id: string
          logged_at: string
          meal_id: string
          meal_slot_index: number
          notes: string | null
          protein_actual: number
          replacement_meal_id: string | null
          status: Database["public"]["Enums"]["meal_log_status"]
          updated_at: string
          user_id: string
          was_liquid_calories: boolean
        }
        Insert: {
          calories_actual?: number
          carbs_actual?: number
          created_at?: string
          fat_actual?: number
          id?: string
          logged_at?: string
          meal_id: string
          meal_slot_index: number
          notes?: string | null
          protein_actual?: number
          replacement_meal_id?: string | null
          status: Database["public"]["Enums"]["meal_log_status"]
          updated_at?: string
          user_id: string
          was_liquid_calories?: boolean
        }
        Update: {
          calories_actual?: number
          carbs_actual?: number
          created_at?: string
          fat_actual?: number
          id?: string
          logged_at?: string
          meal_id?: string
          meal_slot_index?: number
          notes?: string | null
          protein_actual?: number
          replacement_meal_id?: string | null
          status?: Database["public"]["Enums"]["meal_log_status"]
          updated_at?: string
          user_id?: string
          was_liquid_calories?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "meal_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      packages: {
        Row: {
          created_at: string
          default_workout_frequency: number | null
          description: string | null
          features: Json
          id: string
          is_active: boolean
          is_archived: boolean
          name: string
          nutrition_template_id: string | null
          program_template_id: string | null
          target_experience: Database["public"]["Enums"]["package_target_experience"]
          tier: Database["public"]["Enums"]["package_tier"]
          trainer_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          default_workout_frequency?: number | null
          description?: string | null
          features?: Json
          id?: string
          is_active?: boolean
          is_archived?: boolean
          name: string
          nutrition_template_id?: string | null
          program_template_id?: string | null
          target_experience?: Database["public"]["Enums"]["package_target_experience"]
          tier: Database["public"]["Enums"]["package_tier"]
          trainer_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          default_workout_frequency?: number | null
          description?: string | null
          features?: Json
          id?: string
          is_active?: boolean
          is_archived?: boolean
          name?: string
          nutrition_template_id?: string | null
          program_template_id?: string | null
          target_experience?: Database["public"]["Enums"]["package_target_experience"]
          tier?: Database["public"]["Enums"]["package_tier"]
          trainer_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "packages_program_template_id_fkey"
            columns: ["program_template_id"]
            isOneToOne: false
            referencedRelation: "session_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "packages_trainer_id_fkey"
            columns: ["trainer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      pause_events: {
        Row: {
          created_at: string
          end_date: string | null
          id: string
          is_active: boolean
          notes: string | null
          pause_type: Database["public"]["Enums"]["pause_type"]
          penalty_sessions_remaining: number
          recovery_penalty: number
          start_date: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          end_date?: string | null
          id?: string
          is_active?: boolean
          notes?: string | null
          pause_type: Database["public"]["Enums"]["pause_type"]
          penalty_sessions_remaining?: number
          recovery_penalty?: number
          start_date: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          end_date?: string | null
          id?: string
          is_active?: boolean
          notes?: string | null
          pause_type?: Database["public"]["Enums"]["pause_type"]
          penalty_sessions_remaining?: number
          recovery_penalty?: number
          start_date?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pause_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          allergies: string[] | null
          assigned_at: string | null
          assigned_package_id: string | null
          assigned_tier: Database["public"]["Enums"]["package_tier"] | null
          avatar_url: string | null
          created_at: string
          current_weight: number | null
          cycle_tracking_enabled: boolean | null
          date_of_birth: string | null
          email: string | null
          experience_level:
            | Database["public"]["Enums"]["experience_level"]
            | null
          first_name: string | null
          food_dislikes: string[] | null
          goal: string | null
          height: number | null
          id: string
          injuries: string[] | null
          job_physicality: Database["public"]["Enums"]["job_physicality"] | null
          job_type: string | null
          last_name: string | null
          last_period_start: string | null
          level: number | null
          metabolic_conditions: string[] | null
          primary_goal: Database["public"]["Enums"]["primary_goal"] | null
          role: string | null
          sleep_hours_avg: number | null
          stress_level: number | null
          training_days: number | null
          updated_at: string
          work_schedule: string | null
        }
        Insert: {
          allergies?: string[] | null
          assigned_at?: string | null
          assigned_package_id?: string | null
          assigned_tier?: Database["public"]["Enums"]["package_tier"] | null
          avatar_url?: string | null
          created_at?: string
          current_weight?: number | null
          cycle_tracking_enabled?: boolean | null
          date_of_birth?: string | null
          email?: string | null
          experience_level?:
            | Database["public"]["Enums"]["experience_level"]
            | null
          first_name?: string | null
          food_dislikes?: string[] | null
          goal?: string | null
          height?: number | null
          id: string
          injuries?: string[] | null
          job_physicality?:
            | Database["public"]["Enums"]["job_physicality"]
            | null
          job_type?: string | null
          last_name?: string | null
          last_period_start?: string | null
          level?: number | null
          metabolic_conditions?: string[] | null
          primary_goal?: Database["public"]["Enums"]["primary_goal"] | null
          role?: string | null
          sleep_hours_avg?: number | null
          stress_level?: number | null
          training_days?: number | null
          updated_at?: string
          work_schedule?: string | null
        }
        Update: {
          allergies?: string[] | null
          assigned_at?: string | null
          assigned_package_id?: string | null
          assigned_tier?: Database["public"]["Enums"]["package_tier"] | null
          avatar_url?: string | null
          created_at?: string
          current_weight?: number | null
          cycle_tracking_enabled?: boolean | null
          date_of_birth?: string | null
          email?: string | null
          experience_level?:
            | Database["public"]["Enums"]["experience_level"]
            | null
          first_name?: string | null
          food_dislikes?: string[] | null
          goal?: string | null
          height?: number | null
          id?: string
          injuries?: string[] | null
          job_physicality?:
            | Database["public"]["Enums"]["job_physicality"]
            | null
          job_type?: string | null
          last_name?: string | null
          last_period_start?: string | null
          level?: number | null
          metabolic_conditions?: string[] | null
          primary_goal?: Database["public"]["Enums"]["primary_goal"] | null
          role?: string | null
          sleep_hours_avg?: number | null
          stress_level?: number | null
          training_days?: number | null
          updated_at?: string
          work_schedule?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_assigned_package_id_fkey"
            columns: ["assigned_package_id"]
            isOneToOne: false
            referencedRelation: "packages"
            referencedColumns: ["id"]
          },
        ]
      }
      session_templates: {
        Row: {
          activated_at: string | null
          compatible_overlays: Database["public"]["Enums"]["goal_overlay"][]
          created_at: string
          deactivated_at: string | null
          id: string
          is_system_default: boolean
          name: string
          position: Database["public"]["Enums"]["template_position"]
          skeleton: Json
          status: Database["public"]["Enums"]["template_status"]
          trainer_id: string | null
          updated_at: string
        }
        Insert: {
          activated_at?: string | null
          compatible_overlays?: Database["public"]["Enums"]["goal_overlay"][]
          created_at?: string
          deactivated_at?: string | null
          id?: string
          is_system_default?: boolean
          name: string
          position: Database["public"]["Enums"]["template_position"]
          skeleton: Json
          status?: Database["public"]["Enums"]["template_status"]
          trainer_id?: string | null
          updated_at?: string
        }
        Update: {
          activated_at?: string | null
          compatible_overlays?: Database["public"]["Enums"]["goal_overlay"][]
          created_at?: string
          deactivated_at?: string | null
          id?: string
          is_system_default?: boolean
          name?: string
          position?: Database["public"]["Enums"]["template_position"]
          skeleton?: Json
          status?: Database["public"]["Enums"]["template_status"]
          trainer_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_templates_trainer_id_fkey"
            columns: ["trainer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_status: {
        Row: {
          client_id: string
          created_at: string
          cycle_phase: string | null
          is_at_risk: boolean | null
          is_in_deload: boolean | null
          last_updated_at: string
          status_json: Json
        }
        Insert: {
          client_id: string
          created_at?: string
          cycle_phase?: string | null
          is_at_risk?: boolean | null
          is_in_deload?: boolean | null
          last_updated_at?: string
          status_json: Json
        }
        Update: {
          client_id?: string
          created_at?: string
          cycle_phase?: string | null
          is_at_risk?: boolean | null
          is_in_deload?: boolean | null
          last_updated_at?: string
          status_json?: Json
        }
        Relationships: [
          {
            foreignKeyName: "user_status_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      water_logs: {
        Row: {
          created_at: string
          id: string
          logged_at: string
          ml_added: number
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          logged_at?: string
          ml_added: number
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          logged_at?: string
          ml_added?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "water_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      weekly_check_ins: {
        Row: {
          created_at: string
          energy_avg: number | null
          hip_cm: number | null
          id: string
          identity_score: number | null
          notes: string | null
          thigh_cm: number | null
          updated_at: string
          user_id: string
          waist_cm: number | null
          week_start_date: string
          weight_avg_kg: number | null
        }
        Insert: {
          created_at?: string
          energy_avg?: number | null
          hip_cm?: number | null
          id?: string
          identity_score?: number | null
          notes?: string | null
          thigh_cm?: number | null
          updated_at?: string
          user_id: string
          waist_cm?: number | null
          week_start_date: string
          weight_avg_kg?: number | null
        }
        Update: {
          created_at?: string
          energy_avg?: number | null
          hip_cm?: number | null
          id?: string
          identity_score?: number | null
          notes?: string | null
          thigh_cm?: number | null
          updated_at?: string
          user_id?: string
          waist_cm?: number | null
          week_start_date?: string
          weight_avg_kg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "weekly_check_ins_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      weight_logs: {
        Row: {
          created_at: string
          id: string
          logged_at: string
          source: string
          updated_at: string
          user_id: string
          weight_kg: number
        }
        Insert: {
          created_at?: string
          id?: string
          logged_at?: string
          source?: string
          updated_at?: string
          user_id: string
          weight_kg: number
        }
        Update: {
          created_at?: string
          id?: string
          logged_at?: string
          source?: string
          updated_at?: string
          user_id?: string
          weight_kg?: number
        }
        Relationships: [
          {
            foreignKeyName: "weight_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      experience_level: "beginner" | "intermediate"
      goal_overlay: "GLUTE_FOCUS" | "TONE" | "FAT_LOSS"
      job_physicality: "sedentary" | "moderate" | "active"
      meal_log_status: "logged" | "skipped" | "replaced"
      package_target_experience: "beginner" | "intermediate" | "any"
      package_tier: "entry" | "mid" | "high"
      pause_type: "illness" | "travel"
      primary_goal: "glute_focus" | "tone" | "fat_loss"
      template_position:
        | "beginner_3"
        | "beginner_4"
        | "intermediate_4"
        | "intermediate_5"
      template_status: "active" | "inactive"
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
      experience_level: ["beginner", "intermediate"],
      goal_overlay: ["GLUTE_FOCUS", "TONE", "FAT_LOSS"],
      job_physicality: ["sedentary", "moderate", "active"],
      meal_log_status: ["logged", "skipped", "replaced"],
      package_target_experience: ["beginner", "intermediate", "any"],
      package_tier: ["entry", "mid", "high"],
      pause_type: ["illness", "travel"],
      primary_goal: ["glute_focus", "tone", "fat_loss"],
      template_position: [
        "beginner_3",
        "beginner_4",
        "intermediate_4",
        "intermediate_5",
      ],
      template_status: ["active", "inactive"],
    },
  },
} as const
