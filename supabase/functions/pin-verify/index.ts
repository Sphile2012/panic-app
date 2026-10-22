// Supabase Edge Function: pin-verify
// Verifies user's two PINs for login

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import * as bcrypt from "https://deno.land/x/bcrypt@v0.4.1/mod.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const MAX_FAILED_ATTEMPTS = 5
const LOCKOUT_DURATION_MINUTES = 15

interface VerifyRequest {
  pin1: string
  pin2: string
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
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
        JSON.stringify({ error: 'Unauthorized', success: false }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Parse request body
    const body: VerifyRequest = await req.json()

    // Validate input
    if (!body.pin1 || !body.pin2) {
      return new Response(
        JSON.stringify({ error: 'Both PINs are required', success: false }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!/^\d{4,6}$/.test(body.pin1) || !/^\d{4,6}$/.test(body.pin2)) {
      return new Response(
        JSON.stringify({ error: 'PINs must be 4-6 digits', success: false }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Use service role client for database operations
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Fetch user's PIN hashes
    const { data: pinData, error: fetchError } = await supabaseAdmin
      .from('user_pins')
      .select('pin1_hash, pin2_hash, failed_attempts, locked_until')
      .eq('user_id', user.id)
      .single()

    if (fetchError || !pinData) {
      return new Response(
        JSON.stringify({ error: 'PINs not set up for this user', success: false }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if account is locked
    if (pinData.locked_until) {
      const lockedUntil = new Date(pinData.locked_until)
      const now = new Date()
      
      if (now < lockedUntil) {
        const minutesRemaining = Math.ceil((lockedUntil.getTime() - now.getTime()) / 60000)
        return new Response(
          JSON.stringify({ 
            error: `Account temporarily locked. Try again in ${minutesRemaining} minute(s)`, 
            success: false,
            locked: true,
            minutesRemaining
          }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    // Verify PINs
    const pin1Valid = await bcrypt.compare(body.pin1, pinData.pin1_hash)
    const pin2Valid = await bcrypt.compare(body.pin2, pinData.pin2_hash)

    if (pin1Valid && pin2Valid) {
      // Reset failed attempts on successful login
      await supabaseAdmin.rpc('clear_pin_failures', { p_user_id: user.id })

      return new Response(
        JSON.stringify({ success: true, message: 'PINs verified successfully' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    } else {
      const { data: failureState, error: failureError } = await supabaseAdmin
        .rpc('record_pin_failure', { p_user_id: user.id })

      if (failureError || !failureState) {
        console.error('PIN failure counter update failed:', failureError?.code ?? 'unknown')
        return new Response(
          JSON.stringify({ error: 'PIN verification is temporarily unavailable', success: false }),
          { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const newFailedAttempts = failureState.failedAttempts
      const locked = Boolean(failureState.lockedUntil && new Date(failureState.lockedUntil) > new Date())

      const remainingAttempts = Math.max(0, MAX_FAILED_ATTEMPTS - newFailedAttempts)
      const message = remainingAttempts > 0
        ? `Incorrect PINs. ${remainingAttempts} attempt(s) remaining before lockout`
        : `Account locked for ${LOCKOUT_DURATION_MINUTES} minutes due to too many failed attempts`

      return new Response(
        JSON.stringify({ 
          error: message, 
          success: false,
          remainingAttempts: Math.max(0, remainingAttempts),
          locked
        }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
  } catch (error) {
    console.error('Unexpected error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error', success: false }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
