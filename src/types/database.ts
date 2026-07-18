/**
 * Hand-written mirror of supabase/migrations/*.sql. Once a live Supabase
 * project exists, regenerate with:
 *   npx supabase gen types typescript --project-id <id> > src/types/database.ts
 * and reconcile any drift with this file's shape.
 */

export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          display_name: string | null;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["profiles"]["Row"]> & { id: string };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Row"]>;
        Relationships: [];
      };
      projects: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          project_type: string;
          description: string | null;
          thumbnail_url: string | null;
          status: "active" | "archived" | "deleted";
          target_aspect_ratio: string;
          target_platform: string | null;
          is_demo: boolean;
          metadata: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["projects"]["Row"]> & { user_id: string; name: string };
        Update: Partial<Database["public"]["Tables"]["projects"]["Row"]>;
        Relationships: [];
      };
      characters: {
        Row: {
          id: string;
          user_id: string;
          slot_key: string | null;
          name: string;
          main_image_url: string | null;
          front_view_url: string | null;
          side_view_url: string | null;
          back_view_url: string | null;
          description: string | null;
          personality: string | null;
          basketball_position: string | null;
          height_notes: string | null;
          body_proportions: string | null;
          skin_tone: string | null;
          hair: string | null;
          clothing_details: string | null;
          jersey_number: string | null;
          approved_color_palette: string | null;
          negative_instructions: string | null;
          default_voice_id: string | null;
          voice_settings: Json;
          notes: string | null;
          is_placeholder: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["characters"]["Row"]> & { user_id: string; name: string };
        Update: Partial<Database["public"]["Tables"]["characters"]["Row"]>;
        Relationships: [];
      };
      character_references: {
        Row: {
          id: string;
          user_id: string;
          character_id: string;
          reference_type: string;
          label: string | null;
          image_url: string;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["character_references"]["Row"]> & {
          user_id: string;
          character_id: string;
          image_url: string;
        };
        Update: Partial<Database["public"]["Tables"]["character_references"]["Row"]>;
        Relationships: [];
      };
      hoop_squad_scenes: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          category: string;
          main_image_url: string | null;
          wide_establishing_url: string | null;
          left_side_view_url: string | null;
          right_side_view_url: string | null;
          close_up_background_url: string | null;
          entrance_view_url: string | null;
          daytime_version_url: string | null;
          evening_version_url: string | null;
          empty_version_url: string | null;
          approved_props: string | null;
          lighting_description: string | null;
          color_palette: string | null;
          environment_description: string | null;
          required_objects: string | null;
          forbidden_objects: string | null;
          character_placement_zones: Json;
          basketball_hoop_location: Json | null;
          camera_direction_notes: string | null;
          consistency_instructions: string | null;
          negative_instructions: string | null;
          ambience_sound_tags: string[];
          is_placeholder: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["hoop_squad_scenes"]["Row"]> & { user_id: string; name: string };
        Update: Partial<Database["public"]["Tables"]["hoop_squad_scenes"]["Row"]>;
        Relationships: [];
      };
      scene_references: {
        Row: {
          id: string;
          user_id: string;
          hoop_squad_scene_id: string;
          view_label: string;
          image_url: string;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["scene_references"]["Row"]> & {
          user_id: string;
          hoop_squad_scene_id: string;
          view_label: string;
          image_url: string;
        };
        Update: Partial<Database["public"]["Tables"]["scene_references"]["Row"]>;
        Relationships: [];
      };
      scene_templates: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          hoop_squad_scene_id: string | null;
          camera_angle: string | null;
          character_ids: string[];
          character_placements: Json;
          props: string[];
          lighting: string | null;
          aspect_ratio: string | null;
          animation_preset: string | null;
          voice_settings: Json;
          sound_effects: string[];
          prompt_instructions: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["scene_templates"]["Row"]> & { user_id: string; name: string };
        Update: Partial<Database["public"]["Tables"]["scene_templates"]["Row"]>;
        Relationships: [];
      };
      scenes: {
        Row: {
          id: string;
          user_id: string;
          project_id: string;
          scene_number: number;
          name: string;
          hoop_squad_scene_id: string | null;
          camera_angle: string | null;
          time_of_day: string | null;
          character_ids: string[];
          character_placements: Json;
          hoop_target: Json | null;
          prompt: string | null;
          negative_prompt: string | null;
          casual_idea: string | null;
          prompt_sections: Json;
          duration_seconds: number;
          aspect_ratio: string;
          video_model_id: string | null;
          character_lock: boolean;
          character_lock_strength: "flexible" | "balanced" | "strong" | "maximum";
          scene_lock: boolean;
          scene_lock_strength: "flexible" | "balanced" | "strong" | "maximum";
          voice_settings: Json;
          generation_mode: "native_single" | "multi_shot_composite";
          style_mode: "basketball" | "everyday";
          ai_written_prompt: string | null;
          prompt_source: "guided" | "ai_written";
          selected_take_id: string | null;
          notes: string | null;
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["scenes"]["Row"]> & { user_id: string; project_id: string };
        Update: Partial<Database["public"]["Tables"]["scenes"]["Row"]>;
        Relationships: [];
      };
      uploaded_assets: {
        Row: {
          id: string;
          user_id: string;
          project_id: string | null;
          scene_id: string | null;
          character_id: string | null;
          hoop_squad_scene_id: string | null;
          storage_path: string;
          public_url: string | null;
          file_name: string;
          mime_type: string;
          file_size: number;
          role: string;
          crop_settings: Json | null;
          width: number | null;
          height: number | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["uploaded_assets"]["Row"]> & {
          user_id: string;
          storage_path: string;
          file_name: string;
          mime_type: string;
          file_size: number;
        };
        Update: Partial<Database["public"]["Tables"]["uploaded_assets"]["Row"]>;
        Relationships: [];
      };
      voices: {
        Row: {
          id: string;
          user_id: string;
          character_id: string | null;
          name: string;
          provider: "fal" | "elevenlabs_direct" | "uploaded";
          model_id: string | null;
          voice_id: string | null;
          reference_audio_url: string | null;
          description: string | null;
          default_emotion: string | null;
          default_speed: number | null;
          pronunciation_guide: string | null;
          age_appropriate_tone: string | null;
          is_cloned: boolean;
          consent_confirmed: boolean;
          consent_confirmed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["voices"]["Row"]> & { user_id: string; name: string };
        Update: Partial<Database["public"]["Tables"]["voices"]["Row"]>;
        Relationships: [];
      };
      voice_samples: {
        Row: {
          id: string;
          user_id: string;
          voice_id: string | null;
          sample_text: string;
          audio_url: string | null;
          generation_job_id: string | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["voice_samples"]["Row"]> & {
          user_id: string;
          sample_text: string;
        };
        Update: Partial<Database["public"]["Tables"]["voice_samples"]["Row"]>;
        Relationships: [];
      };
      dialogue_lines: {
        Row: {
          id: string;
          user_id: string;
          scene_id: string;
          speaker_character_id: string | null;
          line_order: number;
          text_content: string;
          emotion: string | null;
          performance_note: string | null;
          pause_after_ms: number;
          start_time_ms: number;
          estimated_duration_ms: number | null;
          reaction_character_id: string | null;
          audio_url: string | null;
          generation_job_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["dialogue_lines"]["Row"]> & {
          user_id: string;
          scene_id: string;
          text_content: string;
        };
        Update: Partial<Database["public"]["Tables"]["dialogue_lines"]["Row"]>;
        Relationships: [];
      };
      model_configs: {
        Row: {
          id: string;
          category: "video" | "voice" | "lipsync";
          fal_endpoint_id: string;
          display_name: string;
          capabilities: Json;
          pricing: Json;
          is_enabled: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["model_configs"]["Row"]> & {
          id: string;
          category: "video" | "voice" | "lipsync";
          fal_endpoint_id: string;
          display_name: string;
        };
        Update: Partial<Database["public"]["Tables"]["model_configs"]["Row"]>;
        Relationships: [];
      };
      generation_jobs: {
        Row: {
          id: string;
          user_id: string;
          project_id: string | null;
          scene_id: string | null;
          job_type: "video" | "voice" | "lipsync" | "multi_shot_composite";
          model_id: string;
          fal_request_id: string | null;
          status: "queued" | "processing" | "completed" | "failed" | "cancelled";
          input_payload: Json;
          error_message: string | null;
          error_code: string | null;
          retry_count: number;
          cost_estimate: number | null;
          cost_estimate_is_exact: boolean;
          queued_at: string;
          started_at: string | null;
          completed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["generation_jobs"]["Row"]> & {
          user_id: string;
          job_type: "video" | "voice" | "lipsync" | "multi_shot_composite";
          model_id: string;
        };
        Update: Partial<Database["public"]["Tables"]["generation_jobs"]["Row"]>;
        Relationships: [];
      };
      generation_takes: {
        Row: {
          id: string;
          user_id: string;
          scene_id: string;
          generation_job_id: string;
          take_number: number;
          prompt_used: string | null;
          model_id: string;
          input_image_urls: string[];
          seed: number | null;
          duration_seconds: number | null;
          aspect_ratio: string | null;
          cost_estimate: number | null;
          cost_estimate_is_exact: boolean;
          output_url: string | null;
          permanent_storage_path: string | null;
          thumbnail_url: string | null;
          is_favorite: boolean;
          approval_status: "pending" | "approved" | "rejected";
          notes: string | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["generation_takes"]["Row"]> & {
          user_id: string;
          scene_id: string;
          generation_job_id: string;
          model_id: string;
        };
        Update: Partial<Database["public"]["Tables"]["generation_takes"]["Row"]>;
        Relationships: [];
      };
      audio_tracks: {
        Row: {
          id: string;
          user_id: string;
          scene_id: string;
          track_type: "voiceover_generated" | "voiceover_uploaded" | "music" | "sfx" | "ambience";
          label: string | null;
          source_url: string;
          start_ms: number;
          trim_start_ms: number;
          trim_end_ms: number | null;
          volume_db: number;
          fade_in_ms: number;
          fade_out_ms: number;
          is_muted: boolean;
          is_solo: boolean;
          is_looped: boolean;
          duck_under_dialogue: boolean;
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["audio_tracks"]["Row"]> & {
          user_id: string;
          scene_id: string;
          track_type: "voiceover_generated" | "voiceover_uploaded" | "music" | "sfx" | "ambience";
          source_url: string;
        };
        Update: Partial<Database["public"]["Tables"]["audio_tracks"]["Row"]>;
        Relationships: [];
      };
      prompt_presets: {
        Row: {
          id: string;
          user_id: string | null;
          is_system_default: boolean;
          name: string;
          category: string;
          description: string | null;
          prompt_sections: Json;
          negative_instructions: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["prompt_presets"]["Row"]> & { name: string };
        Update: Partial<Database["public"]["Tables"]["prompt_presets"]["Row"]>;
        Relationships: [];
      };
      app_settings: {
        Row: {
          user_id: string;
          default_video_model_id: string | null;
          default_voice_model_id: string | null;
          default_aspect_ratio: string;
          default_output_quality: string;
          hoop_squad_style_instructions: string;
          global_negative_prompt: string;
          basketball_style_instructions: string;
          everyday_style_instructions: string;
          spending_warning_threshold: number | null;
          daily_spending_limit: number | null;
          auto_save: boolean;
          auto_download: boolean;
          default_export_location: string | null;
          advanced_mode: boolean;
          elevenlabs_direct_api_key_ciphertext: string | null;
          developer_diagnostics: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["app_settings"]["Row"]> & { user_id: string };
        Update: Partial<Database["public"]["Tables"]["app_settings"]["Row"]>;
        Relationships: [];
      };
      generation_rate_limits: {
        Row: {
          user_id: string;
          window_start: string;
          request_count: number;
        };
        Insert: Partial<Database["public"]["Tables"]["generation_rate_limits"]["Row"]> & { user_id: string };
        Update: Partial<Database["public"]["Tables"]["generation_rate_limits"]["Row"]>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
