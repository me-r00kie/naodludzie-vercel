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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      booking_requests: {
        Row: {
          cabin_id: string
          created_at: string
          end_date: string
          guest_id: string
          guests_count: number
          host_id: string
          id: string
          message: string | null
          start_date: string
          status: Database["public"]["Enums"]["booking_request_status"]
          updated_at: string
        }
        Insert: {
          cabin_id: string
          created_at?: string
          end_date: string
          guest_id: string
          guests_count?: number
          host_id: string
          id?: string
          message?: string | null
          start_date: string
          status?: Database["public"]["Enums"]["booking_request_status"]
          updated_at?: string
        }
        Update: {
          cabin_id?: string
          created_at?: string
          end_date?: string
          guest_id?: string
          guests_count?: number
          host_id?: string
          id?: string
          message?: string | null
          start_date?: string
          status?: Database["public"]["Enums"]["booking_request_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "booking_requests_cabin_id_fkey"
            columns: ["cabin_id"]
            isOneToOne: false
            referencedRelation: "cabins"
            referencedColumns: ["id"]
          },
        ]
      }
      cabins: {
        Row: {
          address: string
          amenities: string[] | null
          area_sqm: number | null
          bathrooms: number
          bedrooms: number
          category: string
          created_at: string
          description: string | null
          expires_at: string
          external_calendar_details: string | null
          external_calendar_needed: boolean | null
          extra_fees: Json | null
          ical_url: string | null
          id: string
          images: Json | null
          is_featured: boolean
          last_ical_sync: string | null
          last_minute_dates: string[] | null
          latitude: number
          longitude: number
          manual_payment_verified: boolean | null
          max_guests: number
          min_nights: number
          off_grid_score: Json | null
          online_payments_enabled: boolean | null
          owner_id: string
          pets_allowed: boolean
          price_per_night: number
          slug: string
          status: Database["public"]["Enums"]["cabin_status"]
          title: string
          updated_at: string
          verification_transfer_sent: boolean | null
          voivodeship: string | null
        }
        Insert: {
          address: string
          amenities?: string[] | null
          area_sqm?: number | null
          bathrooms?: number
          bedrooms?: number
          category?: string
          created_at?: string
          description?: string | null
          expires_at?: string
          external_calendar_details?: string | null
          external_calendar_needed?: boolean | null
          extra_fees?: Json | null
          ical_url?: string | null
          id?: string
          images?: Json | null
          is_featured?: boolean
          last_ical_sync?: string | null
          last_minute_dates?: string[] | null
          latitude: number
          longitude: number
          manual_payment_verified?: boolean | null
          max_guests?: number
          min_nights?: number
          off_grid_score?: Json | null
          online_payments_enabled?: boolean | null
          owner_id: string
          pets_allowed?: boolean
          price_per_night: number
          slug: string
          status?: Database["public"]["Enums"]["cabin_status"]
          title: string
          updated_at?: string
          verification_transfer_sent?: boolean | null
          voivodeship?: string | null
        }
        Update: {
          address?: string
          amenities?: string[] | null
          area_sqm?: number | null
          bathrooms?: number
          bedrooms?: number
          category?: string
          created_at?: string
          description?: string | null
          expires_at?: string
          external_calendar_details?: string | null
          external_calendar_needed?: boolean | null
          extra_fees?: Json | null
          ical_url?: string | null
          id?: string
          images?: Json | null
          is_featured?: boolean
          last_ical_sync?: string | null
          last_minute_dates?: string[] | null
          latitude?: number
          longitude?: number
          manual_payment_verified?: boolean | null
          max_guests?: number
          min_nights?: number
          off_grid_score?: Json | null
          online_payments_enabled?: boolean | null
          owner_id?: string
          pets_allowed?: boolean
          price_per_night?: number
          slug?: string
          status?: Database["public"]["Enums"]["cabin_status"]
          title?: string
          updated_at?: string
          verification_transfer_sent?: boolean | null
          voivodeship?: string | null
        }
        Relationships: []
      }
      cached_calendar_dates: {
        Row: {
          blocked_date: string
          cabin_id: string
          id: string
          source: string
          synced_at: string
        }
        Insert: {
          blocked_date: string
          cabin_id: string
          id?: string
          source?: string
          synced_at?: string
        }
        Update: {
          blocked_date?: string
          cabin_id?: string
          id?: string
          source?: string
          synced_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cached_calendar_dates_cabin_id_fkey"
            columns: ["cabin_id"]
            isOneToOne: false
            referencedRelation: "cabins"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          booking_request_id: string
          created_at: string
          id: string
          message: string
          sender_id: string
        }
        Insert: {
          booking_request_id: string
          created_at?: string
          id?: string
          message: string
          sender_id: string
        }
        Update: {
          booking_request_id?: string
          created_at?: string
          id?: string
          message?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_booking_request_id_fkey"
            columns: ["booking_request_id"]
            isOneToOne: false
            referencedRelation: "booking_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      host_stripe_accounts: {
        Row: {
          account_type: string | null
          business_name: string | null
          charges_enabled: boolean | null
          created_at: string
          id: string
          onboarding_completed: boolean | null
          payouts_enabled: boolean | null
          stripe_account_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          account_type?: string | null
          business_name?: string | null
          charges_enabled?: boolean | null
          created_at?: string
          id?: string
          onboarding_completed?: boolean | null
          payouts_enabled?: boolean | null
          stripe_account_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          account_type?: string | null
          business_name?: string | null
          charges_enabled?: boolean | null
          created_at?: string
          id?: string
          onboarding_completed?: boolean | null
          payouts_enabled?: boolean | null
          stripe_account_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      newsletter_subscribers: {
        Row: {
          cabin_slug: string | null
          email: string
          id: string
          is_active: boolean
          source: string | null
          subscribed_at: string
          unsubscribed_at: string | null
        }
        Insert: {
          cabin_slug?: string | null
          email: string
          id?: string
          is_active?: boolean
          source?: string | null
          subscribed_at?: string
          unsubscribed_at?: string | null
        }
        Update: {
          cabin_slug?: string | null
          email?: string
          id?: string
          is_active?: boolean
          source?: string | null
          subscribed_at?: string
          unsubscribed_at?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          address: string | null
          business_name: string | null
          city: string | null
          created_at: string
          email: string
          id: string
          name: string | null
          nip: string | null
          phone: string | null
          postal_code: string | null
          terms_accepted_at: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          business_name?: string | null
          city?: string | null
          created_at?: string
          email: string
          id: string
          name?: string | null
          nip?: string | null
          phone?: string | null
          postal_code?: string | null
          terms_accepted_at?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          business_name?: string | null
          city?: string | null
          created_at?: string
          email?: string
          id?: string
          name?: string | null
          nip?: string | null
          phone?: string | null
          postal_code?: string | null
          terms_accepted_at?: string | null
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
      generate_slug: { Args: { title: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "host" | "guest"
      booking_request_status: "pending" | "approved" | "rejected"
      cabin_status: "pending" | "active" | "rejected"
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
      app_role: ["admin", "host", "guest"],
      booking_request_status: ["pending", "approved", "rejected"],
      cabin_status: ["pending", "active", "rejected"],
    },
  },
} as const
