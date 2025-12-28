import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PLATFORM_FEE_PERCENT = 7; // 7% platform commission

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-BOOKING-PAYMENT] ${step}${detailsStr}`);
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

    // Get request body
    const { 
      bookingRequestId,
      cabinTitle,
      pricePerNight,
      nights,
      guestsCount,
      startDate,
      endDate,
      hostId
    } = await req.json();
    
    logStep("Request body parsed", { bookingRequestId, cabinTitle, pricePerNight, nights, hostId });

    if (!bookingRequestId || !pricePerNight || !nights || !hostId) {
      throw new Error("Missing required parameters");
    }

    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");
    
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id, email: user.email });

    // Get host's Stripe Connect account
    const { data: hostStripeAccount, error: hostError } = await supabaseClient
      .from("host_stripe_accounts")
      .select("*")
      .eq("user_id", hostId)
      .single();

    if (hostError || !hostStripeAccount?.stripe_account_id) {
      throw new Error("Host nie ma skonfigurowanych płatności online");
    }

    if (!hostStripeAccount.charges_enabled) {
      throw new Error("Konto hosta nie jest jeszcze aktywne do przyjmowania płatności");
    }

    logStep("Host Stripe account found", { 
      stripeAccountId: hostStripeAccount.stripe_account_id,
      chargesEnabled: hostStripeAccount.charges_enabled 
    });

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Check if customer exists
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      logStep("Existing customer found", { customerId });
    }

    // Calculate amounts (in grosze - Polish cents)
    const totalAmount = pricePerNight * nights;
    const totalAmountGrosze = totalAmount * 100;
    const platformFeeGrosze = Math.round(totalAmountGrosze * PLATFORM_FEE_PERCENT / 100);
    const hostAmountGrosze = totalAmountGrosze - platformFeeGrosze;
    
    logStep("Amounts calculated", { 
      totalAmount, 
      totalAmountGrosze,
      platformFeeGrosze,
      hostAmountGrosze,
      platformFeePercent: PLATFORM_FEE_PERCENT 
    });

    // Create checkout session with Stripe Connect
    const origin = req.headers.get("origin") || "https://naodludzie.pl";
    
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: [
        {
          price_data: {
            currency: "pln",
            product_data: {
              name: `Rezerwacja: ${cabinTitle}`,
              description: `${nights} nocy (${startDate} - ${endDate}), ${guestsCount} gości`,
            },
            unit_amount: totalAmountGrosze,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${origin}/booking-success?session_id={CHECKOUT_SESSION_ID}&booking_id=${bookingRequestId}`,
      cancel_url: `${origin}/booking-canceled?booking_id=${bookingRequestId}`,
      payment_intent_data: {
        application_fee_amount: platformFeeGrosze,
        transfer_data: {
          destination: hostStripeAccount.stripe_account_id,
        },
        metadata: {
          booking_request_id: bookingRequestId,
          host_id: hostId,
          guest_id: user.id,
          platform_fee_grosze: platformFeeGrosze.toString(),
          host_amount_grosze: hostAmountGrosze.toString(),
        },
      },
      metadata: {
        booking_request_id: bookingRequestId,
        host_id: hostId,
        guest_id: user.id,
        total_amount: totalAmount.toString(),
        platform_fee: (platformFeeGrosze / 100).toString(),
        host_amount: (hostAmountGrosze / 100).toString(),
        nights: nights.toString(),
        start_date: startDate,
        end_date: endDate,
      },
    });

    logStep("Checkout session created with Connect", { sessionId: session.id, url: session.url });

    return new Response(JSON.stringify({ 
      url: session.url,
      sessionId: session.id,
      totalAmount,
      platformFee: platformFeeGrosze / 100,
      hostAmount: hostAmountGrosze / 100
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
