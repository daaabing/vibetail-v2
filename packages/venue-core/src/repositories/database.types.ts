export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      drinks: {
        Row: {
          alcoholic: boolean
          allergens: string[]
          availability_status: Database["public"]["Enums"]["menu_item_availability"]
          base_spirit: string | null
          created_at: string
          description: string | null
          flavor_tags: string[]
          id: string
          image_url: string | null
          ingredients: string[]
          merchant_id: string
          name: string
          price: string | null
          recommendation_note: string | null
          strength: string | null
          updated_at: string
        }
        Insert: {
          alcoholic?: boolean
          allergens?: string[]
          availability_status?: Database["public"]["Enums"]["menu_item_availability"]
          base_spirit?: string | null
          created_at?: string
          description?: string | null
          flavor_tags?: string[]
          id?: string
          image_url?: string | null
          ingredients?: string[]
          merchant_id: string
          name: string
          price?: string | null
          recommendation_note?: string | null
          strength?: string | null
          updated_at?: string
        }
        Update: {
          alcoholic?: boolean
          allergens?: string[]
          availability_status?: Database["public"]["Enums"]["menu_item_availability"]
          base_spirit?: string | null
          created_at?: string
          description?: string | null
          flavor_tags?: string[]
          id?: string
          image_url?: string | null
          ingredients?: string[]
          merchant_id?: string
          name?: string
          price?: string | null
          recommendation_note?: string | null
          strength?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "drinks_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
        ]
      }
      match_events: {
        Row: {
          account_id: string | null
          created_at: string
          id: string
          item_id: string
          item_name: string
          menu_id: string | null
          merchant_id: string
          trace_id: string
        }
        Insert: {
          account_id?: string | null
          created_at?: string
          id?: string
          item_id: string
          item_name: string
          menu_id?: string | null
          merchant_id: string
          trace_id: string
        }
        Update: {
          account_id?: string | null
          created_at?: string
          id?: string
          item_id?: string
          item_name?: string
          menu_id?: string | null
          merchant_id?: string
          trace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "match_events_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "venue_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_events_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
        ]
      }
      match_feedback: {
        Row: {
          account_id: string | null
          comment: string | null
          created_at: string
          id: string
          match_id: string
          merchant_id: string
          rating: number
        }
        Insert: {
          account_id?: string | null
          comment?: string | null
          created_at?: string
          id?: string
          match_id: string
          merchant_id: string
          rating: number
        }
        Update: {
          account_id?: string | null
          comment?: string | null
          created_at?: string
          id?: string
          match_id?: string
          merchant_id?: string
          rating?: number
        }
        Relationships: [
          {
            foreignKeyName: "match_feedback_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "venue_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_feedback_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: true
            referencedRelation: "match_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_feedback_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
        ]
      }
      menu_drinks: {
        Row: {
          drink_id: string
          menu_id: string
          sort_order: number
        }
        Insert: {
          drink_id: string
          menu_id: string
          sort_order?: number
        }
        Update: {
          drink_id?: string
          menu_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "menu_drinks_drink_id_fkey"
            columns: ["drink_id"]
            isOneToOne: false
            referencedRelation: "drinks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "menu_drinks_menu_id_fkey"
            columns: ["menu_id"]
            isOneToOne: false
            referencedRelation: "menus"
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
      menu_views: {
        Row: {
          created_at: string
          id: number
          menu_id: string | null
          merchant_id: string
        }
        Insert: {
          created_at?: string
          id?: never
          menu_id?: string | null
          merchant_id: string
        }
        Update: {
          created_at?: string
          id?: never
          menu_id?: string | null
          merchant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "menu_views_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
        ]
      }
      menus: {
        Row: {
          cover_image_url: string | null
          created_at: string
          id: string
          menu_file_type: string | null
          menu_file_url: string | null
          menu_theme: string | null
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
          id?: string
          menu_file_type?: string | null
          menu_file_url?: string | null
          menu_theme?: string | null
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
          id?: string
          menu_file_type?: string | null
          menu_file_url?: string | null
          menu_theme?: string | null
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
          address: string | null
          cover_image_url: string | null
          created_at: string
          id: string
          is_active: boolean
          latitude: number | null
          logo_url: string | null
          longitude: number | null
          name: string
          short_intro: string | null
          slug: string
          updated_at: string
          venue_type: Database["public"]["Enums"]["venue_type"] | null
        }
        Insert: {
          address?: string | null
          cover_image_url?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          latitude?: number | null
          logo_url?: string | null
          longitude?: number | null
          name: string
          short_intro?: string | null
          slug: string
          updated_at?: string
          venue_type?: Database["public"]["Enums"]["venue_type"] | null
        }
        Update: {
          address?: string | null
          cover_image_url?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          latitude?: number | null
          logo_url?: string | null
          longitude?: number | null
          name?: string
          short_intro?: string | null
          slug?: string
          updated_at?: string
          venue_type?: Database["public"]["Enums"]["venue_type"] | null
        }
        Relationships: []
      }
      venue_accounts: {
        Row: {
          auth_user_id: string | null
          created_at: string
          display_name: string
          email: string | null
          id: string
          merchant_id: string | null
          name_normalized: string
        }
        Insert: {
          auth_user_id?: string | null
          created_at?: string
          display_name: string
          email?: string | null
          id?: string
          merchant_id?: string | null
          name_normalized: string
        }
        Update: {
          auth_user_id?: string | null
          created_at?: string
          display_name?: string
          email?: string | null
          id?: string
          merchant_id?: string | null
          name_normalized?: string
        }
        Relationships: [
          {
            foreignKeyName: "venue_accounts_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: true
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
        ]
      }
      venue_sessions: {
        Row: {
          account_id: string
          created_at: string
          id: string
          revoked_at: string | null
          token_hash: string
        }
        Insert: {
          account_id: string
          created_at?: string
          id?: string
          revoked_at?: string | null
          token_hash: string
        }
        Update: {
          account_id?: string
          created_at?: string
          id?: string
          revoked_at?: string | null
          token_hash?: string
        }
        Relationships: [
          {
            foreignKeyName: "venue_sessions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "venue_accounts"
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
      menu_item_availability: "active" | "sold_out" | "hidden"
      menu_status: "draft" | "published" | "paused" | "archived"
      venue_type: "cocktail_bar" | "restaurant" | "event" | "other"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      menu_item_availability: ["active", "sold_out", "hidden"],
      menu_status: ["draft", "published", "paused", "archived"],
      venue_type: ["cocktail_bar", "restaurant", "event", "other"],
    },
  },
} as const
