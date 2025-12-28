import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ContactEmailRequest {
  name: string;
  email: string;
  subject: string;
  message: string;
}

// HTML escape function to prevent XSS in email content
function escapeHtml(unsafe: string | undefined | null): string {
  if (!unsafe) return '';
  return String(unsafe)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

const handler = async (req: Request): Promise<Response> => {
  console.log("Received contact email request");

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { name, email, subject, message }: ContactEmailRequest = await req.json();

    console.log("Contact form data:", { name, email, subject });

    // Escape all user inputs to prevent XSS
    const safeName = escapeHtml(name);
    const safeEmail = escapeHtml(email);
    const safeSubject = escapeHtml(subject);
    const safeMessage = escapeHtml(message);

    // Send notification email to admin
    const adminEmailResult = await resend.emails.send({
      from: "NaOdludzie <noreply@naodludzie.pl>",
      to: ["kontakt@naodludzie.pl"],
      reply_to: email,
      subject: `[Kontakt] ${safeSubject}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #2d5a3c; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background: #f9f9f9; }
            .field { margin-bottom: 15px; }
            .label { font-weight: bold; color: #2d5a3c; }
            .message-box { background: white; padding: 15px; border-left: 4px solid #2d5a3c; margin-top: 10px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Nowa wiadomość z formularza kontaktowego</h1>
            </div>
            <div class="content">
              <div class="field">
                <p class="label">Od:</p>
                <p>${safeName} (${safeEmail})</p>
              </div>
              <div class="field">
                <p class="label">Temat:</p>
                <p>${safeSubject}</p>
              </div>
              <div class="field">
                <p class="label">Wiadomość:</p>
                <div class="message-box">
                  <p>${safeMessage.replace(/\n/g, "<br>")}</p>
                </div>
              </div>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    if (adminEmailResult.error) {
      console.error("Error sending admin email:", adminEmailResult.error);
      throw new Error(adminEmailResult.error.message);
    }

    console.log("Admin email sent:", adminEmailResult.data?.id);

    // Send confirmation email to user
    const userEmailResult = await resend.emails.send({
      from: "NaOdludzie <noreply@naodludzie.pl>",
      to: [email],
      subject: "Potwierdzenie otrzymania wiadomości - NaOdludzie.pl",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #2d5a3c; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background: #f9f9f9; }
            .footer { padding: 15px; text-align: center; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>NaOdludzie.pl</h1>
            </div>
            <div class="content">
              <p>Cześć ${safeName}!</p>
              <p>Dziękujemy za kontakt z NaOdludzie.pl. Otrzymaliśmy Twoją wiadomość i odpowiemy najszybciej jak to możliwe.</p>
              <p><strong>Temat:</strong> ${safeSubject}</p>
              <p>Pozdrawiamy,<br>Zespół NaOdludzie.pl</p>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} NaOdludzie.pl Wszystkie prawa zastrzeżone.</p>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    if (userEmailResult.error) {
      console.error("Error sending user confirmation email:", userEmailResult.error);
      // Don't throw here - admin email was sent successfully
    } else {
      console.log("User confirmation email sent:", userEmailResult.data?.id);
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in send-contact-email function:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
};

serve(handler);
