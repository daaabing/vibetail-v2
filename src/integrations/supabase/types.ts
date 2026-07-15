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
      cocktails: {
        Row: {
          category: string
          cocktail_name: string
          created_at: string
          custom_preference: string
          flavor_profile: string
          id: number
          image_data: string | null
          image_url: string | null
          ingredients: string[]
          lang: string
          original_mood: string
          public_id: string
          recipe: string
          roast: string
          selected_flavors: string[]
          tastes_like: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          category?: string
          cocktail_name: string
          created_at?: string
          custom_preference?: string
          flavor_profile?: string
          id?: number
          image_data?: string | null
          image_url?: string | null
          ingredients?: string[]
          lang?: string
          original_mood?: string
          public_id?: string
          recipe?: string
          roast?: string
          selected_flavors?: string[]
          tastes_like?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          category?: string
          cocktail_name?: string
          created_at?: string
          custom_preference?: string
          flavor_profile?: string
          id?: number
          image_data?: string | null
          image_url?: string | null
          ingredients?: string[]
          lang?: string
          original_mood?: string
          public_id?: string
          recipe?: string
          roast?: string
          selected_flavors?: string[]
          tastes_like?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      game_results: {
        Row: {
          created_at: string
          display_result: Json
          game_session_id: string
          id: string
          match_profile: Json
        }
        Insert: {
          created_at?: string
          display_result?: Json
          game_session_id: string
          id?: string
          match_profile?: Json
        }
        Update: {
          created_at?: string
          display_result?: Json
          game_session_id?: string
          id?: string
          match_profile?: Json
        }
        Relationships: [
          {
            foreignKeyName: "game_results_game_session_id_fkey"
            columns: ["game_session_id"]
            isOneToOne: false
            referencedRelation: "game_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      game_sessions: {
        Row: {
          anonymous_session_id: string
          created_at: string
          game_id: string
          game_version: string
          id: string
          is_preview: boolean
          menu_id: string | null
          menu_version_id: string | null
          merchant_id: string | null
        }
        Insert: {
          anonymous_session_id: string
          created_at?: string
          game_id: string
          game_version: string
          id?: string
          is_preview?: boolean
          menu_id?: string | null
          menu_version_id?: string | null
          merchant_id?: string | null
        }
        Update: {
          anonymous_session_id?: string
          created_at?: string
          game_id?: string
          game_version?: string
          id?: string
          is_preview?: boolean
          menu_id?: string | null
          menu_version_id?: string | null
          merchant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "game_sessions_menu_id_fkey"
            columns: ["menu_id"]
            isOneToOne: false
            referencedRelation: "menus"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_sessions_menu_version_id_fkey"
            columns: ["menu_version_id"]
            isOneToOne: false
            referencedRelation: "menu_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_sessions_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
        ]
      }
      menu_items: {
        Row: {
          alcoholic: boolean
          allergens: string[]
          availability_status: Database["public"]["Enums"]["menu_item_availability"]
          base_spirit: string | null
          created_at: string
          description: string
          dimensions: Json
          flavor_tags: string[]
          id: string
          image_url: string | null
          ingredients: string[]
          menu_id: string
          mood_tags: string[]
          name: string
          original_language: string
          recommendation_priority: number
          section: string | null
          sort_order: number
          translations: Json
          updated_at: string
        }
        Insert: {
          alcoholic?: boolean
          allergens?: string[]
          availability_status?: Database["public"]["Enums"]["menu_item_availability"]
          base_spirit?: string | null
          created_at?: string
          description?: string
          dimensions?: Json
          flavor_tags?: string[]
          id?: string
          image_url?: string | null
          ingredients?: string[]
          menu_id: string
          mood_tags?: string[]
          name: string
          original_language?: string
          recommendation_priority?: number
          section?: string | null
          sort_order?: number
          translations?: Json
          updated_at?: string
        }
        Update: {
          alcoholic?: boolean
          allergens?: string[]
          availability_status?: Database["public"]["Enums"]["menu_item_availability"]
          base_spirit?: string | null
          created_at?: string
          description?: string
          dimensions?: Json
          flavor_tags?: string[]
          id?: string
          image_url?: string | null
          ingredients?: string[]
          menu_id?: string
          mood_tags?: string[]
          name?: string
          original_language?: string
          recommendation_priority?: number
          section?: string | null
          sort_order?: number
          translations?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "menu_items_menu_id_fkey"
            columns: ["menu_id"]
            isOneToOne: false
            referencedRelation: "menus"
            referencedColumns: ["id"]
          },
        ]
      }
      menu_versions: {
        Row: {
          id: string
          menu_id: string
          published_at: string
          snapshot: Json
          version_number: number
        }
        Insert: {
          id?: string
          menu_id: string
          published_at?: string
          snapshot: Json
          version_number: number
        }
        Update: {
          id?: string
          menu_id?: string
          published_at?: string
          snapshot?: Json
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "menu_versions_menu_id_fkey"
            columns: ["menu_id"]
            isOneToOne: false
            referencedRelation: "menus"
            referencedColumns: ["id"]
          },
        ]
      }
      menus: {
        Row: {
          cover_image_url: string | null
          created_at: string
          enabled_game_ids: string[]
          game_display_order: string[]
          id: string
          merchant_id: string
          name: string
          published_version_id: string | null
          short_intro: string | null
          slug: string
          status: Database["public"]["Enums"]["menu_status"]
          updated_at: string
        }
        Insert: {
          cover_image_url?: string | null
          created_at?: string
          enabled_game_ids?: string[]
          game_display_order?: string[]
          id?: string
          merchant_id: string
          name: string
          published_version_id?: string | null
          short_intro?: string | null
          slug: string
          status?: Database["public"]["Enums"]["menu_status"]
          updated_at?: string
        }
        Update: {
          cover_image_url?: string | null
          created_at?: string
          enabled_game_ids?: string[]
          game_display_order?: string[]
          id?: string
          merchant_id?: string
          name?: string
          published_version_id?: string | null
          short_intro?: string | null
          slug?: string
          status?: Database["public"]["Enums"]["menu_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "menus_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "menus_published_version_fk"
            columns: ["published_version_id"]
            isOneToOne: false
            referencedRelation: "menu_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      merchant_access_tokens: {
        Row: {
          created_at: string
          id: string
          label: string | null
          merchant_id: string
          revoked_at: string | null
          token_hash: string
        }
        Insert: {
          created_at?: string
          id?: string
          label?: string | null
          merchant_id: string
          revoked_at?: string | null
          token_hash: string
        }
        Update: {
          created_at?: string
          id?: string
          label?: string | null
          merchant_id?: string
          revoked_at?: string | null
          token_hash?: string
        }
        Relationships: [
          {
            foreignKeyName: "merchant_access_tokens_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
        ]
      }
      merchants: {
        Row: {
          cover_image_url: string | null
          created_at: string
          id: string
          is_active: boolean
          logo_url: string | null
          name: string
          short_intro: string | null
          slug: string
          updated_at: string
        }
        Insert: {
          cover_image_url?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name: string
          short_intro?: string | null
          slug: string
          updated_at?: string
        }
        Update: {
          cover_image_url?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name?: string
          short_intro?: string | null
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      newsletter_subscribers: {
        Row: {
          created_at: string
          email: string
          id: number
          source: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: number
          source?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: number
          source?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      recommendations: {
        Row: {
          created_at: string
          game_result_id: string
          id: string
          matched_menu_item_id: string | null
          menu_id: string
          menu_version_id: string | null
          no_match_reason: string | null
          recommendation_reason: string | null
          score: number | null
          score_breakdown: Json | null
        }
        Insert: {
          created_at?: string
          game_result_id: string
          id?: string
          matched_menu_item_id?: string | null
          menu_id: string
          menu_version_id?: string | null
          no_match_reason?: string | null
          recommendation_reason?: string | null
          score?: number | null
          score_breakdown?: Json | null
        }
        Update: {
          created_at?: string
          game_result_id?: string
          id?: string
          matched_menu_item_id?: string | null
          menu_id?: string
          menu_version_id?: string | null
          no_match_reason?: string | null
          recommendation_reason?: string | null
          score?: number | null
          score_breakdown?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "recommendations_game_result_id_fkey"
            columns: ["game_result_id"]
            isOneToOne: false
            referencedRelation: "game_results"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendations_matched_menu_item_id_fkey"
            columns: ["matched_menu_item_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendations_menu_id_fkey"
            columns: ["menu_id"]
            isOneToOne: false
            referencedRelation: "menus"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendations_menu_version_id_fkey"
            columns: ["menu_version_id"]
            isOneToOne: false
            referencedRelation: "menu_versions"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      gen_cocktail_public_id: { Args: never; Returns: string }
    }
    Enums: {
      menu_item_availability: "active" | "sold_out" | "hidden"
      menu_status: "draft" | "published" | "paused"
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
      menu_item_availability: ["active", "sold_out", "hidden"],
      menu_status: ["draft", "published", "paused"],
    },
  },
} as const
