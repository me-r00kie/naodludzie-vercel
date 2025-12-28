import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import { Resend } from "https://esm.sh/resend@2.0.0";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// HTML escape function to prevent XSS/injection in emails
function escapeHtml(unsafe: string | undefined | null): string {
  if (!unsafe) return '';
  return String(unsafe)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Starting expired cabins check...");
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Find cabins that have expired and are still active
    const { data: expiredCabins, error: fetchError } = await supabase
      .from("cabins")
      .select(`
        id,
        title,
        owner_id,
        expires_at
      `)
      .eq("status", "active")
      .lt("expires_at", new Date().toISOString());

    if (fetchError) {
      console.error("Error fetching expired cabins:", fetchError);
      throw fetchError;
    }

    console.log(`Found ${expiredCabins?.length || 0} expired cabins`);

    if (!expiredCabins || expiredCabins.length === 0) {
      return new Response(
        JSON.stringify({ message: "No expired cabins found", count: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const results = [];

    for (const cabin of expiredCabins) {
      try {
        // Update cabin status to pending (deactivated)
        const { error: updateError } = await supabase
          .from("cabins")
          .update({ status: "pending" })
          .eq("id", cabin.id);

        if (updateError) {
          console.error(`Error updating cabin ${cabin.id}:`, updateError);
          results.push({ cabinId: cabin.id, success: false, error: updateError.message });
          continue;
        }

        // Get owner's profile for email
        const { data: profile } = await supabase
          .from("profiles")
          .select("email, name")
          .eq("id", cabin.owner_id)
          .single();

        if (profile?.email) {
          // Send expiration notification email with escaped user content
          const escapedCabinTitle = escapeHtml(cabin.title);
          const escapedProfileName = escapeHtml(profile.name);
          
          const emailHtml = `
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="utf-8">
              <style>
                body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; padding: 30px; border-radius: 12px 12px 0 0; }
                .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 12px 12px; }
                .cta-button { display: inline-block; background: #22c55e; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; margin-top: 15px; }
                .footer { text-align: center; color: #999; font-size: 12px; margin-top: 20px; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1 style="margin: 0;">⏰ Twoja oferta wygasła</h1>
                  <p style="margin: 10px 0 0 0; opacity: 0.9;">${escapedCabinTitle}</p>
                </div>
                <div class="content">
                  <p>Cześć${escapedProfileName ? ` ${escapedProfileName}` : ''}!</p>
                  <p>Twoja oferta domku <strong>"${escapedCabinTitle}"</strong> wygasła po 60 dniach.</p>
                  <p>Oferta została automatycznie dezaktywowana. Aby ponownie ją opublikować, zaloguj się do panelu hosta i wznów ofertę.</p>
                  <p style="color: #666; font-size: 14px;">Jeśli nie chcesz odnawiać oferty, nie musisz podejmować żadnych działań.</p>
                  <div class="footer">
                    <p>Ta wiadomość została wysłana automatycznie przez NaOdludzie.</p>
                  </div>
                </div>
              </div>
            </body>
            </html>
          `;

          const emailResult = await resend.emails.send({
            from: "NaOdludzie <noreply@naodludzie.pl>",
            to: [profile.email],
            subject: `⏰ Twoja oferta "${escapedCabinTitle}" wygasła`,
            html: emailHtml,
          });

          if (emailResult.error) {
            console.error(`Error sending expiration email to ${profile.email}:`, emailResult.error);
          } else {
            console.log(`Expiration email sent to ${profile.email}:`, emailResult.data?.id);
          }
        }

        results.push({ cabinId: cabin.id, success: true, title: cabin.title });
        console.log(`Cabin ${cabin.id} (${cabin.title}) deactivated successfully`);

      } catch (cabinError) {
        console.error(`Error processing cabin ${cabin.id}:`, cabinError);
        results.push({ cabinId: cabin.id, success: false, error: String(cabinError) });
      }
    }

    return new Response(
      JSON.stringify({ 
        message: "Expired cabins check completed", 
        processed: results.length,
        results 
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Error in check-expired-cabins function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
