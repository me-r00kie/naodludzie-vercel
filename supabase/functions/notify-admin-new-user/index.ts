import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import { Resend } from "https://esm.sh/resend@2.0.0";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const ADMIN_EMAIL = "001krol@gmail.com";

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

interface NewUserNotification {
  userId: string;
  email: string;
  name?: string;
  phone?: string;
  role: 'guest' | 'host';
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId, email, name, phone, role }: NewUserNotification = await req.json();

    console.log(`New user registration notification: ${email} as ${role}`);

    const escapedEmail = escapeHtml(email);
    const escapedName = escapeHtml(name);
    const escapedPhone = escapeHtml(phone);
    const roleLabel = role === 'host' ? 'Gospodarz' : 'Gość';

    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); color: white; padding: 30px; border-radius: 12px 12px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 12px 12px; }
          .info-row { display: flex; padding: 10px 0; border-bottom: 1px solid #eee; }
          .info-label { font-weight: 600; width: 120px; color: #666; }
          .info-value { flex: 1; }
          .role-badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; }
          .role-host { background: #fef3c7; color: #d97706; }
          .role-guest { background: #dbeafe; color: #2563eb; }
          .footer { text-align: center; color: #999; font-size: 12px; margin-top: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0;">👤 Nowy użytkownik</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">Ktoś właśnie się zarejestrował!</p>
          </div>
          <div class="content">
            <div class="info-row">
              <span class="info-label">Email:</span>
              <span class="info-value">${escapedEmail}</span>
            </div>
            ${escapedName ? `
            <div class="info-row">
              <span class="info-label">Imię:</span>
              <span class="info-value">${escapedName}</span>
            </div>
            ` : ''}
            ${escapedPhone ? `
            <div class="info-row">
              <span class="info-label">Telefon:</span>
              <span class="info-value">${escapedPhone}</span>
            </div>
            ` : ''}
            <div class="info-row">
              <span class="info-label">Rola:</span>
              <span class="info-value">
                <span class="role-badge ${role === 'host' ? 'role-host' : 'role-guest'}">${roleLabel}</span>
              </span>
            </div>
            <div class="info-row">
              <span class="info-label">Data:</span>
              <span class="info-value">${new Date().toLocaleString('pl-PL', { timeZone: 'Europe/Warsaw' })}</span>
            </div>
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
      subject: `👤 Nowy ${roleLabel.toLowerCase()}: ${escapedName || escapedEmail}`,
      html: emailHtml,
    });

    if (emailResult.error) {
      console.error("Error sending admin notification:", emailResult.error);
      throw new Error(emailResult.error.message);
    }

    console.log("Admin notification email sent:", emailResult.data?.id);

    return new Response(
      JSON.stringify({ success: true, emailId: emailResult.data?.id }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Error in notify-admin-new-user function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
