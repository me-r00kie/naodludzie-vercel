import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ADMIN_EMAIL = "kontakt.piotrkrol@gmail.com";

interface NewCabinNotification {
  cabinTitle: string;
  cabinAddress: string;
  hostEmail: string;
  hostName: string;
}

async function authenticateUser(req: Request): Promise<{ userId: string } | null> {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return null;

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
  
  if (!supabaseUrl || !supabaseAnonKey) return null;

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } }
  });

  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return null;

  return { userId: user.id };
}

const handler = async (req: Request): Promise<Response> => {
  console.log("Received new cabin notification request");

  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authenticate the request
    const auth = await authenticateUser(req);
    if (!auth) {
      console.error("Unauthorized request to notify-admin-new-cabin");
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    const { cabinTitle, cabinAddress, hostEmail, hostName }: NewCabinNotification = await req.json();

    console.log(`New cabin pending approval: "${cabinTitle}" by ${hostEmail} (user: ${auth.userId})`);

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; padding: 30px; border-radius: 12px 12px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 12px 12px; }
          .info-box { background: white; padding: 15px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #f59e0b; }
          .footer { text-align: center; color: #999; font-size: 12px; margin-top: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0;">🏠 Nowa oferta do akceptacji</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">Panel administracyjny NaOdludzie</p>
          </div>
          <div class="content">
            <p>Cześć Piotrze!</p>
            <p>Nowa oferta oczekuje na Twoją akceptację:</p>
            
            <div class="info-box">
              <p style="margin: 0;"><strong>Tytuł:</strong> ${cabinTitle || 'Brak tytułu'}</p>
              <p style="margin: 8px 0 0 0;"><strong>Adres:</strong> ${cabinAddress || 'Brak adresu'}</p>
              <p style="margin: 8px 0 0 0;"><strong>Dodane przez:</strong> ${hostName || hostEmail || 'Nieznany host'}</p>
              <p style="margin: 8px 0 0 0;"><strong>Email hosta:</strong> ${hostEmail || 'Brak email'}</p>
            </div>
            
            <p>Zaloguj się do panelu administracyjnego, aby zaakceptować lub odrzucić ofertę.</p>
            
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
      to: [ADMIN_EMAIL],
      subject: `🏠 Nowa oferta do akceptacji: "${cabinTitle}"`,
      html: htmlContent,
    });

    if (emailResult.error) {
      console.error("Error sending admin notification email:", emailResult.error);
      throw new Error(emailResult.error.message);
    }

    console.log("Admin notification email sent successfully:", emailResult.data?.id);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in notify-admin-new-cabin function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
