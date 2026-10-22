import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
}

serve(async request => {
  if (request.method === 'OPTIONS')
    return new Response('ok', { headers: corsHeaders })
  if (request.method !== 'GET')
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  try {
    const authorization = request.headers.get('Authorization')
    const userClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authorization ?? '' } } },
    )
    const { data: { user }, error: authError } = await userClient.auth.getUser()
    if (authError || !user)
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })

    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )
    const [{ data: pin, error: pinError }, { data: questions, error: questionError }] = await Promise.all([
      adminClient.from('user_pins').select('locked_until').eq('user_id', user.id).maybeSingle(),
      adminClient.from('security_questions').select('question1_id, question2_id').eq('user_id', user.id).maybeSingle(),
    ])
    if (pinError || questionError) {
      console.error('PIN status lookup failed:', pinError?.code ?? questionError?.code ?? 'unknown')
      return new Response(JSON.stringify({ error: 'PIN status is unavailable' }), {
        status: 503,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    return new Response(JSON.stringify({
      configured: Boolean(pin && questions),
      questionIds: questions ? [questions.question1_id, questions.question2_id] : [],
      lockedUntil: pin?.locked_until ?? null,
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    })
  } catch {
    return new Response(JSON.stringify({ error: 'PIN status is unavailable' }), {
      status: 503,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
