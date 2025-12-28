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

// For notifying HOST about new booking request (logged user)
interface HostNotificationData {
  cabinTitle: string;
  hostId: string;
  guestId: string;
  guestName: string;
  startDate: string;
  endDate: string;
  guestsCount: number;
  message?: string;
  totalPrice: number;
}

// For notifying HOST about new booking request (anonymous user)
interface AnonymousHostNotificationData {
  cabinTitle: string;
  hostId: string;
  guestEmail: string;
  guestName: string;
  guestPhone: string;
  startDate: string;
  endDate: string;
  guestsCount: number;
  message?: string;
  totalPrice: number;
  isAnonymous: true;
}

// For notifying GUEST about approval/rejection
interface GuestNotificationData {
  guestEmail: string;
  guestName: string;
  cabinTitle: string;
  startDate: string;
  endDate: string;
  status: 'approved' | 'rejected';
  hostComment?: string;
}

// Authenticate user from request (returns null for anonymous requests)
async function authenticateUser(req: Request): Promise<{ userId: string; supabase: any } | null> {
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

  return { userId: user.id, supabase };
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const data = await req.json();
    console.log("Received notification data:", data);

    // Check if this is an anonymous booking request
    if (data.isAnonymous === true) {
      // Handle anonymous user booking request - no auth required
      return await sendAnonymousHostNotification(data as AnonymousHostNotificationData);
    }

    // For non-anonymous requests, authenticate user
    const auth = await authenticateUser(req);
    if (!auth) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log(`Authenticated user: ${auth.userId}`);

    // Determine if this is a host notification (new booking) or guest notification (approval/rejection)
    const isHostNotification = 'hostId' in data && !('status' in data);

    if (isHostNotification) {
      // Handle HOST notification about new booking request
      return await sendHostNotification(data as HostNotificationData, auth.userId);
    } else {
      // Handle GUEST notification about approval/rejection
      return await sendGuestNotification(data as GuestNotificationData, auth.userId);
    }
  } catch (error: any) {
    console.error("Error sending booking notification email:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

async function sendHostNotification(data: HostNotificationData, requesterId: string): Promise<Response> {
  // Get host email from database using service role
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // Fetch host profile
  const { data: hostProfile, error: hostProfileError } = await supabase
    .from('profiles')
    .select('email, name')
    .eq('id', data.hostId)
    .single();

  if (hostProfileError || !hostProfile?.email) {
    console.error("Failed to get host profile:", hostProfileError);
    throw new Error("Could not find host email");
  }

  // Fetch guest profile to get email and phone
  const { data: guestProfile, error: guestProfileError } = await supabase
    .from('profiles')
    .select('email, phone')
    .eq('id', data.guestId)
    .single();

  if (guestProfileError) {
    console.error("Failed to get guest profile:", guestProfileError);
  }

  const guestEmail = guestProfile?.email || 'Nie podano';
  const guestPhone = guestProfile?.phone || 'Nie podano';

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("pl-PL", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const emailHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #2d5a3d 0%, #3d7a52 100%); color: white; padding: 30px; border-radius: 12px 12px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 12px 12px; }
        .details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .detail-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #eee; }
        .detail-row:last-child { border-bottom: none; }
        .label { color: #666; }
        .value { font-weight: 600; }
        .message-box { background: #e8f4eb; padding: 15px; border-radius: 8px; margin: 20px 0; }
        .footer { text-align: center; color: #999; font-size: 12px; margin-top: 20px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 style="margin: 0;">🏕️ Nowa prośba o rezerwację!</h1>
          <p style="margin: 10px 0 0 0; opacity: 0.9;">${escapeHtml(data.cabinTitle)}</p>
        </div>
        <div class="content">
          <p>Cześć ${escapeHtml(hostProfile.name) || 'Gospodarzu'}!</p>
          <p>Otrzymałeś nową prośbę o rezerwację od <strong>${escapeHtml(data.guestName)}</strong>.</p>
          
          <div class="details">
            <div class="detail-row">
              <span class="label">👤 Gość</span>
              <span class="value">${escapeHtml(data.guestName)}</span>
            </div>
            <div class="detail-row">
              <span class="label">📧 Email gościa</span>
              <span class="value">${escapeHtml(guestEmail)}</span>
            </div>
            <div class="detail-row">
              <span class="label">📞 Telefon gościa</span>
              <span class="value">${escapeHtml(guestPhone)}</span>
            </div>
            <div class="detail-row">
              <span class="label">📅 Przyjazd</span>
              <span class="value">${formatDate(data.startDate)}</span>
            </div>
            <div class="detail-row">
              <span class="label">📅 Wyjazd</span>
              <span class="value">${formatDate(data.endDate)}</span>
            </div>
            <div class="detail-row">
              <span class="label">👥 Liczba gości</span>
              <span class="value">${data.guestsCount}</span>
            </div>
            <div class="detail-row">
              <span class="label">💰 Szacowana kwota</span>
              <span class="value">${data.totalPrice} zł</span>
            </div>
          </div>
          
          ${data.message ? `
            <div class="message-box">
              <strong>Wiadomość od gościa:</strong>
              <p style="margin: 10px 0 0 0;">${escapeHtml(data.message)}</p>
            </div>
          ` : ''}
          
          <p>Zaloguj się do panelu hosta, aby zaakceptować lub odrzucić rezerwację.</p>
          
          <div class="footer">
            <p>Ta wiadomość została wysłana automatycznie przez NaOdludzie.</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

  console.log("Sending email to host:", hostProfile.email);

  const emailResult = await resend.emails.send({
    from: "NaOdludzie <noreply@naodludzie.pl>",
    to: [hostProfile.email],
    subject: `Nowa prośba o rezerwację: ${data.cabinTitle}`,
    html: emailHtml,
  });

  if (emailResult.error) {
    console.error("Error sending host notification email:", emailResult.error);
    throw new Error(emailResult.error.message);
  }

  console.log("Email sent to host successfully:", emailResult.data?.id);

  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

async function sendAnonymousHostNotification(data: AnonymousHostNotificationData): Promise<Response> {
  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(data.guestEmail)) {
    throw new Error("Invalid guest email format");
  }

  // Get host email from database using service role
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // Fetch host profile
  const { data: hostProfile, error: hostProfileError } = await supabase
    .from('profiles')
    .select('email, name')
    .eq('id', data.hostId)
    .single();

  if (hostProfileError || !hostProfile?.email) {
    console.error("Failed to get host profile:", hostProfileError);
    throw new Error("Could not find host email");
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("pl-PL", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const emailHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #2d5a3d 0%, #3d7a52 100%); color: white; padding: 30px; border-radius: 12px 12px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 12px 12px; }
        .details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .detail-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #eee; }
        .detail-row:last-child { border-bottom: none; }
        .label { color: #666; }
        .value { font-weight: 600; }
        .message-box { background: #e8f4eb; padding: 15px; border-radius: 8px; margin: 20px 0; }
        .anonymous-badge { background: #fef3c7; color: #92400e; padding: 8px 12px; border-radius: 6px; font-size: 12px; display: inline-block; margin-bottom: 15px; }
        .footer { text-align: center; color: #999; font-size: 12px; margin-top: 20px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 style="margin: 0;">🏕️ Nowa prośba o rezerwację!</h1>
          <p style="margin: 10px 0 0 0; opacity: 0.9;">${escapeHtml(data.cabinTitle)}</p>
        </div>
        <div class="content">
          <p>Cześć ${escapeHtml(hostProfile.name) || 'Gospodarzu'}!</p>
          <span class="anonymous-badge">👤 Gość niezarejestrowany</span>
          <p>Otrzymałeś nową prośbę o rezerwację od <strong>${escapeHtml(data.guestName)}</strong>.</p>
          
          <div class="details">
            <div class="detail-row">
              <span class="label">👤 Gość</span>
              <span class="value">${escapeHtml(data.guestName)}</span>
            </div>
            <div class="detail-row">
              <span class="label">📧 Email gościa</span>
              <span class="value">${escapeHtml(data.guestEmail)}</span>
            </div>
            <div class="detail-row">
              <span class="label">📞 Telefon gościa</span>
              <span class="value">${escapeHtml(data.guestPhone) || 'Nie podano'}</span>
            </div>
            <div class="detail-row">
              <span class="label">📅 Przyjazd</span>
              <span class="value">${formatDate(data.startDate)}</span>
            </div>
            <div class="detail-row">
              <span class="label">📅 Wyjazd</span>
              <span class="value">${formatDate(data.endDate)}</span>
            </div>
            <div class="detail-row">
              <span class="label">👥 Liczba gości</span>
              <span class="value">${data.guestsCount}</span>
            </div>
            <div class="detail-row">
              <span class="label">💰 Szacowana kwota</span>
              <span class="value">${data.totalPrice} zł</span>
            </div>
          </div>
          
          ${data.message ? `
            <div class="message-box">
              <strong>Wiadomość od gościa:</strong>
              <p style="margin: 10px 0 0 0;">${escapeHtml(data.message)}</p>
            </div>
          ` : ''}
          
          <p>Odpowiedz bezpośrednio na email gościa: <a href="mailto:${escapeHtml(data.guestEmail)}">${escapeHtml(data.guestEmail)}</a></p>
          
          <div class="footer">
            <p>Ta wiadomość została wysłana automatycznie przez NaOdludzie.</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

  console.log("Sending anonymous booking email to host:", hostProfile.email);

  const emailResult = await resend.emails.send({
    from: "NaOdludzie <noreply@naodludzie.pl>",
    to: [hostProfile.email],
    reply_to: data.guestEmail,
    subject: `Nowa prośba o rezerwację: ${data.cabinTitle}`,
    html: emailHtml,
  });

  if (emailResult.error) {
    console.error("Error sending anonymous host notification email:", emailResult.error);
    throw new Error(emailResult.error.message);
  }

  console.log("Email sent to host successfully:", emailResult.data?.id);

  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

async function sendGuestNotification(data: GuestNotificationData, requesterId: string): Promise<Response> {
  if (!data.guestEmail) {
    console.error("Guest email is required");
    throw new Error("Guest email is required");
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(data.guestEmail)) {
    throw new Error("Invalid guest email format");
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("pl-PL", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const isApproved = data.status === 'approved';
  const subject = isApproved 
    ? `Twoja rezerwacja została zaakceptowana: ${data.cabinTitle}`
    : `Twoja rezerwacja została odrzucona: ${data.cabinTitle}`;

  const statusColor = isApproved ? '#2d5a3d' : '#dc2626';
  const statusText = isApproved ? 'Zaakceptowana' : 'Odrzucona';
  const statusEmoji = isApproved ? '✅' : '❌';
  const statusMessage = isApproved 
    ? 'Twoja rezerwacja została zaakceptowana! Właściciel domku potwierdził Twoją prośbę o rezerwację.'
    : 'Niestety, Twoja rezerwacja została odrzucona przez właściciela domku.';

  const emailHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, ${statusColor} 0%, ${isApproved ? '#3d7a52' : '#ef4444'} 100%); color: white; padding: 30px; border-radius: 12px 12px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 12px 12px; }
        .details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .detail-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #eee; }
        .detail-row:last-child { border-bottom: none; }
        .label { color: #666; }
        .value { font-weight: 600; }
        .status-box { background: ${isApproved ? '#e8f4eb' : '#fee2e2'}; padding: 15px; border-radius: 8px; margin: 20px 0; text-align: center; }
        .host-comment { background: #fff7ed; border: 1px solid #fed7aa; padding: 15px; border-radius: 8px; margin: 20px 0; }
        .footer { text-align: center; color: #999; font-size: 12px; margin-top: 20px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 style="margin: 0;">${statusEmoji} Status rezerwacji</h1>
          <p style="margin: 10px 0 0 0; opacity: 0.9;">${escapeHtml(data.cabinTitle)}</p>
        </div>
        <div class="content">
          <p>Cześć ${escapeHtml(data.guestName) || 'Gościu'}!</p>
          
          <div class="status-box">
            <strong style="font-size: 18px; color: ${statusColor};">${statusText}</strong>
            <p style="margin: 10px 0 0 0;">${statusMessage}</p>
          </div>
          
          <div class="details">
            <div class="detail-row">
              <span class="label">📅 Przyjazd</span>
              <span class="value">${formatDate(data.startDate)}</span>
            </div>
            <div class="detail-row">
              <span class="label">📅 Wyjazd</span>
              <span class="value">${formatDate(data.endDate)}</span>
            </div>
          </div>
          
          ${data.hostComment ? `
            <div class="host-comment">
              <strong>💬 Komentarz od gospodarza:</strong>
              <p style="margin: 10px 0 0 0;">${escapeHtml(data.hostComment)}</p>
            </div>
          ` : ''}
          
          ${isApproved ? `
            <p>Skontaktuj się z właścicielem domku, aby ustalić szczegóły pobytu.</p>
          ` : `
            <p>Możesz spróbować zarezerwować inny domek lub wybrać inne terminy.</p>
          `}
          
          <div class="footer">
            <p>Ta wiadomość została wysłana automatycznie przez NaOdludzie.</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

  console.log("Sending email to guest:", data.guestEmail);

  const emailResult = await resend.emails.send({
    from: "NaOdludzie <noreply@naodludzie.pl>",
    to: [data.guestEmail],
    subject: subject,
    html: emailHtml,
  });

  if (emailResult.error) {
    console.error("Error sending guest notification email:", emailResult.error);
    throw new Error(emailResult.error.message);
  }

  console.log("Email sent to guest successfully:", emailResult.data?.id);

  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

serve(handler);
