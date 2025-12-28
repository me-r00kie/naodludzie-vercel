import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-CONNECT-ACCOUNT] ${step}${detailsStr}`);
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
    if (!user?.email) throw new Error("User not authenticated");
    logStep("User authenticated", { userId: user.id, email: user.email });

    const { accountType, businessName } = await req.json();
    logStep("Request body", { accountType, businessName });

    if (!accountType || !['individual', 'company'].includes(accountType)) {
      throw new Error("Invalid account type");
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Check if user already has a Stripe account
    const { data: existingAccount } = await supabaseClient
      .from("host_stripe_accounts")
      .select("*")
      .eq("user_id", user.id)
      .single();

    let stripeAccountId: string;

    if (existingAccount?.stripe_account_id) {
      stripeAccountId = existingAccount.stripe_account_id;
      logStep("Using existing Stripe account", { stripeAccountId });
    } else {
      // Create new Stripe Connect account
      const account = await stripe.accounts.create({
        type: "express",
        country: "PL",
        email: user.email,
        business_type: accountType === 'company' ? 'company' : 'individual',
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        business_profile: {
          name: businessName || undefined,
          url: "https://naodludzie.pl",
        },
      });

      stripeAccountId = account.id;
      logStep("Created new Stripe account", { stripeAccountId });

      // Save to database
      const { error: insertError } = await supabaseClient
        .from("host_stripe_accounts")
        .upsert({
          user_id: user.id,
          stripe_account_id: stripeAccountId,
          account_type: accountType,
          business_name: businessName || null,
          onboarding_completed: false,
          charges_enabled: false,
          payouts_enabled: false,
        });

      if (insertError) {
        logStep("Failed to save account to DB", { error: insertError.message });
        throw new Error("Failed to save Stripe account");
      }
    }

    // Create account link for onboarding
    const origin = req.headers.get("origin") || "https://naodludzie.pl";
    
    const accountLink = await stripe.accountLinks.create({
      account: stripeAccountId,
      refresh_url: `${origin}/host/dashboard?stripe_refresh=true`,
      return_url: `${origin}/host/dashboard?stripe_onboarding=complete`,
      type: "account_onboarding",
    });

    logStep("Account link created", { url: accountLink.url });

    return new Response(JSON.stringify({ 
      url: accountLink.url,
      accountId: stripeAccountId
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
