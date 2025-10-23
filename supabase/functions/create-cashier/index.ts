import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    const { name, email, phone, has_discount_permission, password } = await req.json();

    if (!password) {
      throw new Error("Password is required.");
    }

    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true,
    });

    if (authError) {
      throw authError;
    }
    
    const newUser = authData.user;
    if (!newUser) {
      throw new Error("User could not be created.");
    }

    const { error: cashierError } = await supabase
      .from('cashiers')
      .insert({
        user_id: newUser.id,
        name,
        email,
        phone,
        has_discount_permission,
        password_change_required: true,
      });

    if (cashierError) {
      await supabase.auth.admin.deleteUser(newUser.id);
      throw cashierError;
    }

    return new Response(JSON.stringify({ message: "Cashier created successfully" }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})