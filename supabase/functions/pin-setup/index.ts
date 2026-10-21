// Supabase Edge Function: pin-setup
// Sets up user's two PINs and security questions

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import * as bcrypt from "https://deno.land/x/bcrypt@v0.4.1/mod.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface SetupRequest {
  pin1: string
  pin2: string
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

    if (body.question1_answer.trim().length < 8 || body.question2_answer.trim().length < 8) {
      return new Response(
        JSON.stringify({ error: 'Security answers must be at least 8 characters' }),
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

    // Upsert PIN hashes
    const { error: pinError } = await supabaseAdmin
      .from('user_pins')
      .upsert({
        user_id: user.id,
        pin1_hash: pin1Hash,
        pin2_hash: pin2Hash,
        failed_attempts: 0,
        locked_until: null,
      }, { onConflict: 'user_id' })

    if (pinError) {
      console.error('PIN upsert error:', pinError)
      return new Response(
        JSON.stringify({ error: 'Failed to save PINs' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Upsert security questions
    const { error: securityError } = await supabaseAdmin
      .from('security_questions')
      .upsert({
        user_id: user.id,
        question1_id: body.question1_id,
        question1_answer_hash: answer1Hash,
        question2_id: body.question2_id,
        question2_answer_hash: answer2Hash,
      }, { onConflict: 'user_id' })

    if (securityError) {
      console.error('Security questions upsert error:', securityError)
      return new Response(
        JSON.stringify({ error: 'Failed to save security questions' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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
