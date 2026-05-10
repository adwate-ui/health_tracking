/**
 * Database types
 *
 * Generated to match supabase/migrations/. To regenerate against the live
 * project, run:  npx supabase gen types typescript --project-id <id> > src/types/database.ts
 *
 * Hand-maintained for now since the schema is small and stable.
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          display_name: string | null;
          sex: 'male' | 'female' | 'other' | 'prefer_not_to_say' | null;
          height_cm: number | null;
          dob: string | null;
          timezone: string;
          units_metric: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          display_name?: string | null;
          sex?: 'male' | 'female' | 'other' | 'prefer_not_to_say' | null;
          height_cm?: number | null;
          dob?: string | null;
          timezone?: string;
          units_metric?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          display_name?: string | null;
          sex?: 'male' | 'female' | 'other' | 'prefer_not_to_say' | null;
          height_cm?: number | null;
          dob?: string | null;
          timezone?: string;
          units_metric?: boolean;
          updated_at?: string;
        };
        Relationships: [];
      };
      targets: {
        Row: {
          id: string;
          user_id: string;
          daily_calories: number | null;
          daily_protein_g: number | null;
          daily_fibre_g: number | null;
          daily_water_ml: number | null;
          daily_steps: number | null;
          weekly_gym_sessions: number | null;
          goal_weight_kg: number | null;
          goal_date: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          daily_calories?: number | null;
          daily_protein_g?: number | null;
          daily_fibre_g?: number | null;
          daily_water_ml?: number | null;
          daily_steps?: number | null;
          weekly_gym_sessions?: number | null;
          goal_weight_kg?: number | null;
          goal_date?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          daily_calories?: number | null;
          daily_protein_g?: number | null;
          daily_fibre_g?: number | null;
          daily_water_ml?: number | null;
          daily_steps?: number | null;
          weekly_gym_sessions?: number | null;
          goal_weight_kg?: number | null;
          goal_date?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      daily_logs: {
        Row: {
          id: string;
          user_id: string;
          log_date: string;
          calories: number | null;
          protein_g: number | null;
          fibre_g: number | null;
          water_ml: number | null;
          steps: number | null;
          gym_session: boolean;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          log_date: string;
          calories?: number | null;
          protein_g?: number | null;
          fibre_g?: number | null;
          water_ml?: number | null;
          steps?: number | null;
          gym_session?: boolean;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          log_date?: string;
          calories?: number | null;
          protein_g?: number | null;
          fibre_g?: number | null;
          water_ml?: number | null;
          steps?: number | null;
          gym_session?: boolean;
          notes?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      food_entries: {
        Row: {
          id: string;
          user_id: string;
          log_id: string;
          source: 'off' | 'usda' | 'manual';
          source_id: string | null;
          name: string;
          grams: number;
          calories: number | null;
          protein_g: number | null;
          fibre_g: number | null;
          fat_g: number | null;
          carbs_g: number | null;
          consumed_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          log_id: string;
          source: 'off' | 'usda' | 'manual';
          source_id?: string | null;
          name: string;
          grams: number;
          calories?: number | null;
          protein_g?: number | null;
          fibre_g?: number | null;
          fat_g?: number | null;
          carbs_g?: number | null;
          consumed_at?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          log_id?: string;
          source?: 'off' | 'usda' | 'manual';
          source_id?: string | null;
          name?: string;
          grams?: number;
          calories?: number | null;
          protein_g?: number | null;
          fibre_g?: number | null;
          fat_g?: number | null;
          carbs_g?: number | null;
          consumed_at?: string;
        };
        Relationships: [];
      };
      weekly_checkins: {
        Row: {
          id: string;
          user_id: string;
          week_start: string;
          weight_kg: number | null;
          neck_cm: number | null;
          chest_cm: number | null;
          waist_cm: number | null;
          hips_cm: number | null;
          body_fat_pct: number | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          week_start: string;
          weight_kg?: number | null;
          neck_cm?: number | null;
          chest_cm?: number | null;
          waist_cm?: number | null;
          hips_cm?: number | null;
          body_fat_pct?: number | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          week_start?: string;
          weight_kg?: number | null;
          neck_cm?: number | null;
          chest_cm?: number | null;
          waist_cm?: number | null;
          hips_cm?: number | null;
          body_fat_pct?: number | null;
          notes?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
