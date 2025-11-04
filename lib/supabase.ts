import { createClient } from '@supabase/supabase-js'

// These will come from environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Database types (will be auto-generated later from Supabase CLI)
export type Bot = {
  id: string
  name: string
  description: string
  system_prompt: any // JSONB
  creator_id: string
  is_platform_bot: boolean
  is_public: boolean
  version: string
  created_at: string
  updated_at: string
}

export type BotPack = {
  id: string
  name: string
  description: string
  creator_id: string
  price: number // cents
  is_premium: boolean
  tags: string[]
  created_at: string
  updated_at: string
}

export type UserBot = {
  id: string
  user_id: string
  bot_id: string
  custom_config: any // JSONB - overrides
  installed_at: string
}

export type Workspace = {
  id: string
  name: string
  owner_id: string
  created_at: string
  updated_at: string
}
