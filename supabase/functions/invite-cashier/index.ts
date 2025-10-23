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

    const { name, email, phone, has_discount_permission } = await req.json();

    // Invite the user to sign up, which sends them an email to set their password
    const { data: inviteData, error: inviteError } = await supabase.auth.admin.inviteUserByEmail(email);

    if (inviteError) {
      throw inviteError;
    }
    
    const newUser = inviteData.user;
    if (!newUser) {
      throw new Error("User could not be created from invitation.");
    }

    // Once the user is created in the auth system, add their details to the public cashiers table
    const { error: cashierError } = await supabase
      .from('cashiers')
      .insert({
        user_id: newUser.id,
        name,
        email,
        phone,
        has_discount_permission,
      });

    if (cashierError) {
      // If this fails, we should remove the invited user to avoid orphaned accounts
      await supabase.auth.admin.deleteUser(newUser.id);
      throw cashierError;
    }

    return new Response(JSON.stringify({ message: "Cashier invited successfully" }), {
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