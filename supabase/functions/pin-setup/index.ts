// Supabase Edge Function: pin-setup
// Sets up user's two PINs and security questions

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import * as bcrypt from "https://deno.land/x/bcrypt@v0.4.1/mod.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function hasRecentAuthentication(authorization: string | null) {
  const token = authorization?.match(/^Bearer\s+([^\s]+)$/i)?.[1]
  if (!token)
    return false
  try {
    const encoded = token.split('.')[1]?.replace(/-/g, '+').replace(/_/g, '/')
    if (!encoded)
      return false
    const payload = JSON.parse(atob(encoded))
    const authenticatedAt = Number(payload.auth_time)
    return Number.isFinite(authenticatedAt) && authenticatedAt >= Date.now() / 1000 - 300
  } catch {
    return false
  }
}

interface SetupRequest {
  pin1: string
  confirm_pin1: string
  pin2: string
  confirm_pin2: string
  question1_id: string
  question1_answer: string
  question2_id: string
  question2_answer: string
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  try {
    // Get Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    // Verify user is authenticated
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser()
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!hasRecentAuthentication(req.headers.get('Authorization'))) {
      return new Response(
        JSON.stringify({ error: 'Please reauthenticate before setting up your PINs' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Parse request body
    const body: SetupRequest = await req.json()

    // Validate PINs
    if (!body.pin1 || !body.pin2) {
      return new Response(
        JSON.stringify({ error: 'Both PINs are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!/^\d{4,6}$/.test(body.pin1) || !/^\d{4,6}$/.test(body.pin2)) {
      return new Response(
        JSON.stringify({ error: 'PINs must be 4-6 digits' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (body.pin1 !== body.confirm_pin1 || body.pin2 !== body.confirm_pin2) {
      return new Response(
        JSON.stringify({ error: 'PIN confirmations do not match', success: false }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (body.pin1 === body.pin2) {
      return new Response(
        JSON.stringify({ error: 'PINs must be different' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate security questions
    if (!body.question1_id || !body.question2_id || !body.question1_answer || !body.question2_answer) {
      return new Response(
        JSON.stringify({ error: 'Both security questions and answers are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (body.question1_id === body.question2_id) {
      return new Response(
        JSON.stringify({ error: 'Security questions must be different' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!body.question1_answer.trim() || !body.question2_answer.trim()) {
      return new Response(
        JSON.stringify({ error: 'Both security answers are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Use service role client for database operations
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Hash PINs with bcrypt (cost factor 12 for added security)
    const pin1Hash = await bcrypt.hash(body.pin1, 12)
    const pin2Hash = await bcrypt.hash(body.pin2, 12)

    // Normalize and hash security answers
    const normalizeAnswer = (answer: string) => 
      answer.normalize('NFKC').trim().toLowerCase().replace(/\s+/g, ' ')
    
    const answer1Hash = await bcrypt.hash(normalizeAnswer(body.question1_answer), 12)
    const answer2Hash = await bcrypt.hash(normalizeAnswer(body.question2_answer), 12)

    const { error: setupError } = await supabaseAdmin.rpc('store_account_pin_setup', {
      p_user_id: user.id,
      p_pin1_hash: pin1Hash,
      p_pin2_hash: pin2Hash,
      p_question1_id: body.question1_id,
      p_question1_answer_hash: answer1Hash,
      p_question2_id: body.question2_id,
      p_question2_answer_hash: answer2Hash,
    })

    if (setupError) {
      console.error('PIN setup RPC failed:', setupError.code ?? 'unknown')
      return new Response(
        JSON.stringify({
          error: setupError.code === '23505' ? 'PINs are already configured' : 'Failed to save PINs',
          success: false,
        }),
        { status: setupError.code === '23505' ? 409 : 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ success: true, message: 'PINs and security questions saved successfully' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Unexpected error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
