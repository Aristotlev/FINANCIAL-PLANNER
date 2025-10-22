// Database types for type-safe Supabase queries
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string | null
          name: string | null
          avatar_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email?: string | null
          name?: string | null
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string | null
          name?: string | null
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      cash_accounts: {
        Row: {
          id: string
          user_id: string
          name: string
          bank: string
          balance: number
          type: string
          apy: number
          color: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          bank: string
          balance?: number
          type: string
          apy?: number
          color?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          bank?: string
          balance?: number
          type?: string
          apy?: number
          color?: string
          created_at?: string
          updated_at?: string
        }
      }
      savings_accounts: {
        Row: {
          id: string
          user_id: string
          name: string
          bank: string
          balance: number
          apy: number
          goal_amount: number
          goal_date: string | null
          color: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          bank: string
          balance?: number
          apy?: number
          goal_amount?: number
          goal_date?: string | null
          color?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          bank?: string
          balance?: number
          apy?: number
          goal_amount?: number
          goal_date?: string | null
          color?: string
          created_at?: string
          updated_at?: string
        }
      }
      crypto_holdings: {
        Row: {
          id: string
          user_id: string
          symbol: string
          name: string
          amount: number
          purchase_price: number
          color: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          symbol: string
          name: string
          amount?: number
          purchase_price?: number
          color?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          symbol?: string
          name?: string
          amount?: number
          purchase_price?: number
          color?: string
          created_at?: string
          updated_at?: string
        }
      }
      stock_holdings: {
        Row: {
          id: string
          user_id: string
          symbol: string
          name: string
          shares: number
          purchase_price: number
          sector: string | null
          color: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          symbol: string
          name: string
          shares?: number
          purchase_price?: number
          sector?: string | null
          color?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          symbol?: string
          name?: string
          shares?: number
          purchase_price?: number
          sector?: string | null
          color?: string
          created_at?: string
          updated_at?: string
        }
      }
      expense_categories: {
        Row: {
          id: string
          user_id: string
          name: string
          amount: number
          budget: number
          icon: string | null
          color: string
          frequency: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          amount?: number
          budget?: number
          icon?: string | null
          color?: string
          frequency?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          amount?: number
          budget?: number
          icon?: string | null
          color?: string
          frequency?: string
          created_at?: string
          updated_at?: string
        }
      }
      trading_accounts: {
        Row: {
          id: string
          user_id: string
          name: string
          broker: string
          balance: number
          type: string
          instruments: Json
          color: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          broker: string
          balance?: number
          type: string
          instruments?: Json
          color?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          broker?: string
          balance?: number
          type?: string
          instruments?: Json
          color?: string
          created_at?: string
          updated_at?: string
        }
      }
      real_estate: {
        Row: {
          id: string
          user_id: string
          name: string
          address: string
          property_type: string
          purchase_price: number
          current_value: number
          mortgage_balance: number
          rental_income: number
          expenses: number
          latitude: number | null
          longitude: number | null
          color: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          address: string
          property_type: string
          purchase_price?: number
          current_value?: number
          mortgage_balance?: number
          rental_income?: number
          expenses?: number
          latitude?: number | null
          longitude?: number | null
          color?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          address?: string
          property_type?: string
          purchase_price?: number
          current_value?: number
          mortgage_balance?: number
          rental_income?: number
          expenses?: number
          latitude?: number | null
          longitude?: number | null
          color?: string
          created_at?: string
          updated_at?: string
        }
      }
      valuable_items: {
        Row: {
          id: string
          user_id: string
          name: string
          category: string
          purchase_price: number
          current_value: number
          purchase_date: string | null
          condition: string | null
          notes: string | null
          color: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          category: string
          purchase_price?: number
          current_value?: number
          purchase_date?: string | null
          condition?: string | null
          notes?: string | null
          color?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          category?: string
          purchase_price?: number
          current_value?: number
          purchase_date?: string | null
          condition?: string | null
          notes?: string | null
          color?: string
          created_at?: string
          updated_at?: string
        }
      }
      user_preferences: {
        Row: {
          user_id: string
          theme: string
          currency: string
          language: string
          notifications_enabled: boolean
          preferences: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          user_id: string
          theme?: string
          currency?: string
          language?: string
          notifications_enabled?: boolean
          preferences?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          user_id?: string
          theme?: string
          currency?: string
          language?: string
          notifications_enabled?: boolean
          preferences?: Json
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}
