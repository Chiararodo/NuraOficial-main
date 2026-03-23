import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Método no permitido' }), {
        status: 405,
        headers: corsHeaders,
      })
    }

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Falta Authorization header' }), {
        status: 401,
        headers: corsHeaders,
      })
    }

    const supabaseUser = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      {
        global: {
          headers: {
            Authorization: authHeader,
          },
        },
      }
    )

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const {
      data: { user },
      error: userError,
    } = await supabaseUser.auth.getUser()

    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'No autenticado' }), {
        status: 401,
        headers: corsHeaders,
      })
    }

    const { data: adminProfile, error: adminError } = await supabaseAdmin
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single()

    if (adminError || !adminProfile?.is_admin) {
      return new Response(JSON.stringify({ error: 'No autorizado' }), {
        status: 403,
        headers: corsHeaders,
      })
    }

    const { targetUserId } = await req.json()

    if (!targetUserId) {
      return new Response(JSON.stringify({ error: 'Falta targetUserId' }), {
        status: 400,
        headers: corsHeaders,
      })
    }

    if (targetUserId === user.id) {
      return new Response(JSON.stringify({ error: 'No podés eliminar tu propia cuenta desde este panel.' }), {
        status: 400,
        headers: corsHeaders,
      })
    }

    // 1) borrar comentarios
    await supabaseAdmin.from('forum_comments').delete().eq('user_id', targetUserId)

    // 2) borrar foros
    await supabaseAdmin.from('forums').delete().eq('user_id', targetUserId)

    // 3) borrar perfil
    await supabaseAdmin.from('profiles').delete().eq('id', targetUserId)

    // 4) borrar usuario auth
    const { error: deleteAuthError } = await supabaseAdmin.auth.admin.deleteUser(targetUserId)

    if (deleteAuthError) {
      return new Response(JSON.stringify({ error: deleteAuthError.message }), {
        status: 400,
        headers: corsHeaders,
      })
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: corsHeaders,
    })
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || 'Error inesperado' }), {
      status: 500,
      headers: corsHeaders,
    })
  }
})