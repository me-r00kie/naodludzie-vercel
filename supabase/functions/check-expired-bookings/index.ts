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
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Starting expired booking requests check...");
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Find pending booking requests older than 24 hours
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    
    const { data: expiredRequests, error: fetchError } = await supabase
      .from("booking_requests")
      .select(`
        id,
        cabin_id,
        guest_id,
        host_id,
        start_date,
        end_date,
        guests_count,
        message,
        created_at
      `)
      .eq("status", "pending")
      .lt("created_at", twentyFourHoursAgo);

    if (fetchError) {
      console.error("Error fetching expired booking requests:", fetchError);
      throw fetchError;
    }

    console.log(`Found ${expiredRequests?.length || 0} expired booking requests`);

    if (!expiredRequests || expiredRequests.length === 0) {
      return new Response(
        JSON.stringify({ message: "No expired booking requests found", count: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const results = [];

    for (const request of expiredRequests) {
      try {
        // Update request status to rejected
        const { error: updateError } = await supabase
          .from("booking_requests")
          .update({ status: "rejected" })
          .eq("id", request.id);

        if (updateError) {
          console.error(`Error updating booking request ${request.id}:`, updateError);
          results.push({ requestId: request.id, success: false, error: updateError.message });
          continue;
        }

        // Get cabin details
        const { data: cabin } = await supabase
          .from("cabins")
          .select("title")
          .eq("id", request.cabin_id)
          .single();

        // Get guest's profile for email
        const { data: guestProfile } = await supabase
          .from("profiles")
          .select("email, name")
          .eq("id", request.guest_id)
          .single();

        // Get host's profile for email
        const { data: hostProfile } = await supabase
          .from("profiles")
          .select("email, name")
          .eq("id", request.host_id)
          .single();

        const cabinTitle = escapeHtml(cabin?.title || "Domek");
        const guestName = escapeHtml(guestProfile?.name);
        const hostName = escapeHtml(hostProfile?.name);

        // Send email to guest about expired request
        if (guestProfile?.email) {
          const guestEmailHtml = `
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="utf-8">
              <style>
                body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; padding: 30px; border-radius: 12px 12px 0 0; }
                .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 12px 12px; }
                .footer { text-align: center; color: #999; font-size: 12px; margin-top: 20px; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1 style="margin: 0;">⏰ Zapytanie wygasło</h1>
                  <p style="margin: 10px 0 0 0; opacity: 0.9;">${cabinTitle}</p>
                </div>
                <div class="content">
                  <p>Cześć${guestName ? ` ${guestName}` : ''}!</p>
                  <p>Niestety, Twoje zapytanie o rezerwację domku <strong>"${cabinTitle}"</strong> wygasło.</p>
                  <p>Host nie odpowiedział na Twoje zapytanie w ciągu 24 godzin, dlatego zostało ono automatycznie anulowane.</p>
                  <p>Zachęcamy do przeglądania innych dostępnych domków na naszej stronie!</p>
                  <div class="footer">
                    <p>Ta wiadomość została wysłana automatycznie przez NaOdludzie.</p>
                  </div>
                </div>
              </div>
            </body>
            </html>
          `;

          const guestEmailResult = await resend.emails.send({
            from: "NaOdludzie <noreply@naodludzie.pl>",
            to: [guestProfile.email],
            subject: `⏰ Twoje zapytanie o "${cabinTitle}" wygasło`,
            html: guestEmailHtml,
          });

          if (guestEmailResult.error) {
            console.error(`Error sending expiration email to guest ${guestProfile.email}:`, guestEmailResult.error);
          } else {
            console.log(`Expiration email sent to guest ${guestProfile.email}:`, guestEmailResult.data?.id);
          }
        }

        // Send email to host about missed request
        if (hostProfile?.email) {
          const hostEmailHtml = `
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="utf-8">
              <style>
                body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: white; padding: 30px; border-radius: 12px 12px 0 0; }
                .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 12px 12px; }
                .footer { text-align: center; color: #999; font-size: 12px; margin-top: 20px; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1 style="margin: 0;">⚠️ Przegapione zapytanie</h1>
                  <p style="margin: 10px 0 0 0; opacity: 0.9;">${cabinTitle}</p>
                </div>
                <div class="content">
                  <p>Cześć${hostName ? ` ${hostName}` : ''}!</p>
                  <p>Zapytanie o rezerwację domku <strong>"${cabinTitle}"</strong> zostało automatycznie anulowane.</p>
                  <p>Powodem jest brak odpowiedzi w ciągu 24 godzin od otrzymania zapytania.</p>
                  <p style="color: #666; font-size: 14px;">Pamiętaj, aby regularnie sprawdzać panel hosta i odpowiadać na zapytania!</p>
                  <div class="footer">
                    <p>Ta wiadomość została wysłana automatycznie przez NaOdludzie.</p>
                  </div>
                </div>
              </div>
            </body>
            </html>
          `;

          const hostEmailResult = await resend.emails.send({
            from: "NaOdludzie <noreply@naodludzie.pl>",
            to: [hostProfile.email],
            subject: `⚠️ Przegapione zapytanie o "${cabinTitle}"`,
            html: hostEmailHtml,
          });

          if (hostEmailResult.error) {
            console.error(`Error sending missed request email to host ${hostProfile.email}:`, hostEmailResult.error);
          } else {
            console.log(`Missed request email sent to host ${hostProfile.email}:`, hostEmailResult.data?.id);
          }
        }

        results.push({ requestId: request.id, success: true, cabinTitle: cabin?.title });
        console.log(`Booking request ${request.id} for ${cabin?.title} auto-rejected successfully`);

      } catch (requestError) {
        console.error(`Error processing booking request ${request.id}:`, requestError);
        results.push({ requestId: request.id, success: false, error: String(requestError) });
      }
    }

    return new Response(
      JSON.stringify({ 
        message: "Expired booking requests check completed", 
        processed: results.length,
        results 
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Error in check-expired-bookings function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
