// Supabase Edge Function: pin-change
// Changes user's PINs after verifying security questions

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

interface ChangeRequest {
  answer1: string
  answer2: string
  new_pin1: string
  confirm_pin1: string
  new_pin2: string
  confirm_pin2: string
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed', success: false }),
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
        JSON.stringify({ error: 'Unauthorized', success: false }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!hasRecentAuthentication(req.headers.get('Authorization'))) {
      return new Response(
        JSON.stringify({ error: 'Please reauthenticate before changing your PINs', success: false }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Parse request body
    const body: ChangeRequest = await req.json()

    // Validate security answers
    if (!body.answer1 || !body.answer2) {
      return new Response(
        JSON.stringify({ error: 'Both security answers are required', success: false }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate new PINs
    if (!body.new_pin1 || !body.new_pin2) {
      return new Response(
        JSON.stringify({ error: 'Both new PINs are required', success: false }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!/^\d{4,6}$/.test(body.new_pin1) || !/^\d{4,6}$/.test(body.new_pin2)) {
      return new Response(
        JSON.stringify({ error: 'New PINs must be 4-6 digits', success: false }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (body.new_pin1 === body.new_pin2) {
      return new Response(
        JSON.stringify({ error: 'New PINs must be different', success: false }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (body.new_pin1 !== body.confirm_pin1 || body.new_pin2 !== body.confirm_pin2) {
      return new Response(
        JSON.stringify({ error: 'PIN confirmations do not match', success: false }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Use service role client for database operations
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { data: pinStatus, error: pinStatusError } = await supabaseAdmin
      .from('user_pins')
      .select('failed_attempts, locked_until')
      .eq('user_id', user.id)
      .single()

    if (pinStatusError || !pinStatus) {
      return new Response(
        JSON.stringify({ error: 'PINs are not configured', success: false }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (pinStatus.locked_until && new Date(pinStatus.locked_until) > new Date()) {
      const minutesRemaining = Math.ceil((new Date(pinStatus.locked_until).getTime() - Date.now()) / 60000)
      return new Response(
        JSON.stringify({ error: `Account temporarily locked. Try again in ${minutesRemaining} minute(s)`, success: false, locked: true, minutesRemaining }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Fetch security questions
    const { data: securityData, error: fetchError } = await supabaseAdmin
      .from('security_questions')
      .select('question1_answer_hash, question2_answer_hash')
      .eq('user_id', user.id)
      .single()

    if (fetchError || !securityData) {
      return new Response(
        JSON.stringify({ error: 'Security questions not set up', success: false }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Normalize answers for comparison
    const normalizeAnswer = (answer: string) => 
      answer.normalize('NFKC').trim().toLowerCase().replace(/\s+/g, ' ')

    // Verify security answers
    const answer1Valid = await bcrypt.compare(
      normalizeAnswer(body.answer1), 
      securityData.question1_answer_hash
    )
    const answer2Valid = await bcrypt.compare(
      normalizeAnswer(body.answer2), 
      securityData.question2_answer_hash
    )

    if (!answer1Valid || !answer2Valid) {
      const { data: failureState, error: failureError } = await supabaseAdmin
        .rpc('record_pin_failure', { p_user_id: user.id })
      if (failureError || !failureState) {
        console.error('PIN change failure counter update failed:', failureError?.code ?? 'unknown')
        return new Response(
          JSON.stringify({ error: 'PIN change is temporarily unavailable', success: false }),
          { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      return new Response(
        JSON.stringify({ 
          error: failureState.failedAttempts >= 5
            ? 'Account locked for 15 minutes due to too many failed attempts'
            : 'Incorrect security answers. Please try again.',
          success: false,
          locked: Boolean(failureState.lockedUntil && new Date(failureState.lockedUntil) > new Date()),
        }),
        { status: failureState.failedAttempts >= 5 ? 429 : 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Hash new PINs
    const newPin1Hash = await bcrypt.hash(body.new_pin1, 12)
    const newPin2Hash = await bcrypt.hash(body.new_pin2, 12)

    // Update PINs and reset failed attempts
    const { error: updateError } = await supabaseAdmin
      .from('user_pins')
      .update({
        pin1_hash: newPin1Hash,
        pin2_hash: newPin2Hash,
        failed_attempts: 0,
        locked_until: null,
      })
      .eq('user_id', user.id)

    if (updateError) {
      console.error('PIN update error:', updateError)
      return new Response(
        JSON.stringify({ error: 'Failed to update PINs', success: false }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ success: true, message: 'PINs updated successfully' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Unexpected error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error', success: false }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
