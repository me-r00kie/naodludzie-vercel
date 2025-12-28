import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[VERIFY-BOOKING-PAYMENT] ${step}${detailsStr}`);
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

    const { sessionId, bookingRequestId } = await req.json();
    logStep("Request parsed", { sessionId, bookingRequestId });

    if (!sessionId) {
      throw new Error("Session ID is required");
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Retrieve the checkout session
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    logStep("Session retrieved", { 
      status: session.status, 
      paymentStatus: session.payment_status 
    });

    if (session.payment_status === "paid") {
      // Update booking request status to approved
      const bookingId = session.metadata?.booking_request_id || bookingRequestId;
      
      if (bookingId) {
        const { error: updateError } = await supabaseClient
          .from("booking_requests")
          .update({ 
            status: "approved",
            updated_at: new Date().toISOString()
          })
          .eq("id", bookingId);

        if (updateError) {
          logStep("Failed to update booking status", { error: updateError.message });
        } else {
          logStep("Booking status updated to approved", { bookingId });
        }
      }

      return new Response(JSON.stringify({ 
        success: true,
        paid: true,
        bookingId: session.metadata?.booking_request_id,
        platformFee: session.metadata?.platform_fee,
        hostAmount: session.metadata?.host_amount,
        totalAmount: session.metadata?.total_amount,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    return new Response(JSON.stringify({ 
      success: false,
      paid: false,
      status: session.payment_status
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
