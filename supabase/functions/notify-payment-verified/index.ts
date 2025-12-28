import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PaymentVerifiedNotification {
  hostEmail: string;
  hostName: string;
  cabinTitle: string;
}

async function authenticateAdmin(req: Request): Promise<boolean> {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return false;

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
  
  if (!supabaseUrl || !supabaseAnonKey) return false;

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } }
  });

  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return false;

  // Check if user is admin
  const { data: roles } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .eq('role', 'admin')
    .maybeSingle();

  return !!roles;
}

const handler = async (req: Request): Promise<Response> => {
  console.log("Received payment verified notification request");

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const isAdmin = await authenticateAdmin(req);
    if (!isAdmin) {
      console.error("Unauthorized: Only admins can send payment verified notifications");
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    const { hostEmail, hostName, cabinTitle }: PaymentVerifiedNotification = await req.json();

    console.log(`Sending payment verified notification to: ${hostEmail} for cabin: ${cabinTitle}`);

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 30px; border-radius: 12px 12px 0 0; text-align: center; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 12px 12px; }
          .success-box { background: #d1fae5; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10b981; text-align: center; }
          .info-box { background: white; padding: 15px; border-radius: 8px; margin: 15px 0; }
          .footer { text-align: center; color: #999; font-size: 12px; margin-top: 20px; }
          .check-icon { font-size: 48px; margin-bottom: 10px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="check-icon">✅</div>
            <h1 style="margin: 0;">Przelew weryfikacyjny potwierdzony!</h1>
          </div>
          <div class="content">
            <p>Cześć${hostName ? ` ${hostName}` : ''}!</p>
            
            <div class="success-box">
              <h2 style="margin: 0; color: #059669;">Gratulacje!</h2>
              <p style="margin: 10px 0 0 0;">Twój przelew weryfikacyjny został potwierdzony.</p>
            </div>
            
            <div class="info-box">
              <p style="margin: 0;"><strong>Oferta:</strong> ${cabinTitle}</p>
            </div>
            
            <p>Co to oznacza?</p>
            <ul>
              <li>Twoja oferta jest teraz gotowa do przyjmowania rezerwacji online</li>
              <li>Goście mogą płacić bezpośrednio przez naszą platformę</li>
              <li>Otrzymasz wypłaty bezpośrednio na swoje konto</li>
            </ul>
            
            <p>Dziękujemy za zaufanie! W razie pytań skontaktuj się z nami.</p>
            
            <div class="footer">
              <p>Ta wiadomość została wysłana automatycznie przez NaOdludzie.</p>
              <p>© 2024 NaOdludzie</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    const emailResult = await resend.emails.send({
      from: "NaOdludzie <noreply@naodludzie.pl>",
      to: [hostEmail],
      subject: `✅ Przelew weryfikacyjny potwierdzony - ${cabinTitle}`,
      html: htmlContent,
    });

    if (emailResult.error) {
      console.error("Error sending payment verified email:", emailResult.error);
      throw new Error(emailResult.error.message);
    }

    console.log("Payment verified email sent successfully:", emailResult.data?.id);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in notify-payment-verified function:", error);
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
