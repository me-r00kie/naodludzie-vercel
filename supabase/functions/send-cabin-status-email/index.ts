import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

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

interface CabinStatusEmailData {
  hostEmail: string;
  hostName: string;
  cabinTitle: string;
  status: 'active' | 'rejected';
}

// Authenticate user and check admin role
async function authenticateAdmin(req: Request): Promise<{ userId: string; isAdmin: boolean } | null> {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    console.log('No authorization header');
    return null;
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
  
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } }
  });

  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error || !user) {
    console.log('Auth error:', error?.message);
    return null;
  }

  // Check admin role using service role to bypass RLS
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const adminSupabase = createClient(supabaseUrl, supabaseServiceKey);

  const { data: roles, error: rolesError } = await adminSupabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .eq('role', 'admin');

  if (rolesError) {
    console.log('Roles check error:', rolesError.message);
    return { userId: user.id, isAdmin: false };
  }

  const isAdmin = roles && roles.length > 0;
  console.log(`User ${user.id} admin check: ${isAdmin}`);

  return { userId: user.id, isAdmin };
}

const handler = async (req: Request): Promise<Response> => {
  console.log("Received cabin status email request");

  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authenticate and verify admin role
    const auth = await authenticateAdmin(req);
    if (!auth) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (!auth.isAdmin) {
      console.log(`User ${auth.userId} attempted admin action without admin role`);
      return new Response(
        JSON.stringify({ error: 'Forbidden: Admin access required' }),
        { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log(`Admin ${auth.userId} sending cabin status email`);

    const { hostEmail, hostName, cabinTitle, status }: CabinStatusEmailData = await req.json();

    // Validate required fields
    if (!hostEmail || !cabinTitle || !status) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: hostEmail, cabinTitle, status' }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(hostEmail)) {
      return new Response(
        JSON.stringify({ error: 'Invalid email format' }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Validate status
    if (status !== 'active' && status !== 'rejected') {
      return new Response(
        JSON.stringify({ error: 'Invalid status. Must be "active" or "rejected"' }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }
    
    console.log(`Sending ${status} notification to ${hostEmail} for cabin: ${cabinTitle}`);

    const isApproved = status === 'active';

    const safeSubjectCabinTitle = cabinTitle.replace(/[\r\n]/g, ' ').trim();
    const subject = isApproved
      ? `Twój domek "${safeSubjectCabinTitle}" został aktywowany!`
      : `Domek "${safeSubjectCabinTitle}" wymaga poprawek`;

    const escapedCabinTitle = escapeHtml(cabinTitle);
    const escapedHostName = escapeHtml(hostName);

    const headerBg = isApproved ? '#16a34a' : '#dc2626';
    const headerTitle = isApproved ? 'Domek aktywowany!' : 'Wymagane poprawki';

    const bodyIntro = `Cześć ${escapedHostName || 'Gospodarzu'}!`;

    const bodyHtml = isApproved
      ? `<p>Gratulacje! Twój domek <strong>„${escapedCabinTitle}"</strong> został zaakceptowany i jest teraz widoczny dla gości na platformie NaOdludzie.</p>
         <p>Możesz teraz oczekiwać zapytań rezerwacyjnych od zainteresowanych gości.</p>`
      : `<p>Niestety, Twój domek <strong>„${escapedCabinTitle}"</strong> nie został zaakceptowany.</p>
         <p>Prosimy o sprawdzenie i zaktualizowanie informacji o domku, a następnie ponowne przesłanie do weryfikacji.</p>
         <p>Jeśli masz pytania, skontaktuj się z nami.</p>`;

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="pl">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <style>
          body{font-family:Arial,sans-serif;line-height:1.6;color:#333}
          .c{max-width:600px;margin:0 auto;padding:20px}
          .h{background:${headerBg};color:#fff;padding:30px;border-radius:12px 12px 0 0}
          .b{background:#f9f9f9;padding:30px;border-radius:0 0 12px 12px}
          .f{text-align:center;color:#666;font-size:12px;margin-top:20px}
        </style>
      </head>
      <body>
        <div class="c">
          <div class="h">
            <h1 style="margin:0">${headerTitle}</h1>
            <p style="margin:10px 0 0 0;opacity:0.9">${escapedCabinTitle}</p>
          </div>
          <div class="b">
            <p>${bodyIntro}</p>
            ${bodyHtml}
            <div class="f"><p>Ta wiadomość została wysłana automatycznie przez NaOdludzie.</p></div>
          </div>
        </div>
      </body>
      </html>
    `;

    const emailResult = await resend.emails.send({
      from: "NaOdludzie <noreply@naodludzie.pl>",
      to: [hostEmail],
      subject: subject,
      html: htmlContent,
    });

    if (emailResult.error) {
      console.error("Error sending cabin status email:", emailResult.error);
      throw new Error(emailResult.error.message);
    }

    console.log("Cabin status email sent successfully:", emailResult.data?.id);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in send-cabin-status-email function:", error);
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
