import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CHECK-CONNECT-STATUS] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");
    
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user) throw new Error("User not authenticated");
    logStep("User authenticated", { userId: user.id });

    // Get user's Stripe account from DB
    const { data: accountData, error: accountError } = await supabaseClient
      .from("host_stripe_accounts")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (accountError || !accountData) {
      logStep("No Stripe account found");
      return new Response(JSON.stringify({ 
        hasAccount: false,
        onboardingCompleted: false,
        chargesEnabled: false,
        payoutsEnabled: false
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    if (!accountData.stripe_account_id) {
      logStep("Stripe account ID not set");
      return new Response(JSON.stringify({ 
        hasAccount: true,
        onboardingCompleted: false,
        chargesEnabled: false,
        payoutsEnabled: false,
        accountType: accountData.account_type,
        businessName: accountData.business_name
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Get latest status from Stripe
    const account = await stripe.accounts.retrieve(accountData.stripe_account_id);
    logStep("Stripe account retrieved", { 
      chargesEnabled: account.charges_enabled,
      payoutsEnabled: account.payouts_enabled,
      detailsSubmitted: account.details_submitted
    });

    // Update database with latest status
    const { error: updateError } = await supabaseClient
      .from("host_stripe_accounts")
      .update({
        onboarding_completed: account.details_submitted,
        charges_enabled: account.charges_enabled,
        payouts_enabled: account.payouts_enabled,
        updated_at: new Date().toISOString()
      })
      .eq("user_id", user.id);

    if (updateError) {
      logStep("Failed to update account status", { error: updateError.message });
    }

    return new Response(JSON.stringify({ 
      hasAccount: true,
      stripeAccountId: accountData.stripe_account_id,
      onboardingCompleted: account.details_submitted,
      chargesEnabled: account.charges_enabled,
      payoutsEnabled: account.payouts_enabled,
      accountType: accountData.account_type,
      businessName: accountData.business_name
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
