import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    console.log('Starting calendar sync for all cabins...');
    
    // Get all cabins with ical_url set
    const { data: cabins, error: cabinsError } = await supabase
      .from('cabins')
      .select('id, ical_url, title')
      .not('ical_url', 'is', null)
      .neq('ical_url', '');

    if (cabinsError) {
      console.error('Error fetching cabins:', cabinsError);
      throw cabinsError;
    }

    console.log(`Found ${cabins?.length || 0} cabins with iCal URLs`);

    const results: { cabinId: string; title: string; success: boolean; datesCount?: number; error?: string }[] = [];

    for (const cabin of cabins || []) {
      try {
        console.log(`Syncing calendar for cabin: ${cabin.title} (${cabin.id})`);
        
        // Fetch iCal data
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);
        
        const response = await fetch(cabin.ical_url, {
          headers: {
            'User-Agent': 'NaOdludzie/1.0 (Calendar Sync)',
            'Accept': 'text/calendar, application/calendar+xml, text/plain',
          },
          signal: controller.signal,
        });
        
        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const icalContent = await response.text();
        
        if (!icalContent.includes('BEGIN:VCALENDAR')) {
          throw new Error('Invalid iCal format');
        }

        // Parse dates
        const blockedDates = parseICalDates(icalContent);
        console.log(`Parsed ${blockedDates.length} blocked dates for ${cabin.title}`);

        // Delete old cached dates for this cabin
        await supabase
          .from('cached_calendar_dates')
          .delete()
          .eq('cabin_id', cabin.id)
          .eq('source', 'ical');

        // Insert new dates
        if (blockedDates.length > 0) {
          const datesToInsert = blockedDates.map(date => ({
            cabin_id: cabin.id,
            blocked_date: date,
            source: 'ical',
          }));

          const { error: insertError } = await supabase
            .from('cached_calendar_dates')
            .insert(datesToInsert);

          if (insertError) {
            console.error(`Error inserting dates for ${cabin.title}:`, insertError);
          }
        }

        // Update last_ical_sync timestamp
        await supabase
          .from('cabins')
          .update({ last_ical_sync: new Date().toISOString() })
          .eq('id', cabin.id);

        results.push({
          cabinId: cabin.id,
          title: cabin.title,
          success: true,
          datesCount: blockedDates.length,
        });

      } catch (error: unknown) {
        const err = error as { message?: string };
        console.error(`Error syncing ${cabin.title}:`, err.message);
        results.push({
          cabinId: cabin.id,
          title: cabin.title,
          success: false,
          error: err.message || 'Unknown error',
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    console.log(`Sync complete: ${successCount}/${results.length} successful`);

    return new Response(JSON.stringify({
      message: `Synced ${successCount}/${results.length} calendars`,
      results,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    const err = error as { message?: string };
    console.error('Sync all calendars error:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function parseICalDates(icalContent: string): string[] {
  const dates: string[] = [];
  const lines = icalContent.replace(/\r\n /g, '').split(/\r?\n/);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  let inEvent = false;
  let startDate: string | null = null;
  let endDate: string | null = null;

  for (const line of lines) {
    if (line.startsWith('BEGIN:VEVENT')) {
      inEvent = true;
      startDate = null;
      endDate = null;
    } else if (line.startsWith('END:VEVENT')) {
      if (inEvent && startDate && endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        for (let d = new Date(start); d < end; d.setDate(d.getDate() + 1)) {
          if (d >= today) {
            dates.push(d.toISOString().split('T')[0]);
          }
        }
      }
      inEvent = false;
    } else if (inEvent) {
      if (line.startsWith('DTSTART')) {
        const match = line.match(/DTSTART[^:]*:(.+)/);
        if (match) {
          startDate = parseICalDate(match[1]);
        }
      } else if (line.startsWith('DTEND')) {
        const match = line.match(/DTEND[^:]*:(.+)/);
        if (match) {
          endDate = parseICalDate(match[1]);
        }
      }
    }
  }

  return [...new Set(dates)].sort();
}

function parseICalDate(dateStr: string): string | null {
  if (!dateStr) return null;
  
  if (dateStr.length === 8) {
    const year = dateStr.slice(0, 4);
    const month = dateStr.slice(4, 6);
    const day = dateStr.slice(6, 8);
    return `${year}-${month}-${day}`;
  }
  
  if (dateStr.includes('T')) {
    const datePart = dateStr.split('T')[0];
    const year = datePart.slice(0, 4);
    const month = datePart.slice(4, 6);
    const day = datePart.slice(6, 8);
    return `${year}-${month}-${day}`;
  }
  
  return null;
}
