import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ICalEvent {
  startDate: string;
  endDate: string;
  summary?: string;
}

function parseICalDate(dateStr: string): Date | null {
  if (!dateStr) return null;
  
  // Handle YYYYMMDD format (date only)
  if (dateStr.length === 8) {
    const year = parseInt(dateStr.slice(0, 4));
    const month = parseInt(dateStr.slice(4, 6)) - 1;
    const day = parseInt(dateStr.slice(6, 8));
    return new Date(year, month, day);
  }
  
  // Handle YYYYMMDDTHHMMSS or YYYYMMDDTHHMMSSZ format
  if (dateStr.includes('T')) {
    const datePart = dateStr.split('T')[0];
    const year = parseInt(datePart.slice(0, 4));
    const month = parseInt(datePart.slice(4, 6)) - 1;
    const day = parseInt(datePart.slice(6, 8));
    return new Date(year, month, day);
  }
  
  return null;
}

function parseICalContent(icalContent: string): ICalEvent[] {
  const events: ICalEvent[] = [];
  const lines = icalContent.replace(/\r\n /g, '').split(/\r?\n/);
  
  let currentEvent: Partial<ICalEvent> | null = null;
  
  for (const line of lines) {
    if (line.startsWith('BEGIN:VEVENT')) {
      currentEvent = {};
    } else if (line.startsWith('END:VEVENT')) {
      if (currentEvent && currentEvent.startDate && currentEvent.endDate) {
        events.push(currentEvent as ICalEvent);
      }
      currentEvent = null;
    } else if (currentEvent) {
      if (line.startsWith('DTSTART')) {
        // Handle DTSTART;VALUE=DATE:20241220 or DTSTART:20241220T120000Z
        const match = line.match(/DTSTART[^:]*:(.+)/);
        if (match) {
          const parsed = parseICalDate(match[1]);
          if (parsed) {
            currentEvent.startDate = parsed.toISOString().split('T')[0];
          }
        }
      } else if (line.startsWith('DTEND')) {
        const match = line.match(/DTEND[^:]*:(.+)/);
        if (match) {
          const parsed = parseICalDate(match[1]);
          if (parsed) {
            currentEvent.endDate = parsed.toISOString().split('T')[0];
          }
        }
      } else if (line.startsWith('SUMMARY:')) {
        currentEvent.summary = line.substring(8);
      }
    }
  }
  
  return events;
}

function getDatesBetween(startDate: string, endDate: string): string[] {
  const dates: string[] = [];
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  // Don't include the end date (checkout day is available)
  for (let d = new Date(start); d < end; d.setDate(d.getDate() + 1)) {
    dates.push(d.toISOString().split('T')[0]);
  }
  
  return dates;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { icalUrl, cabinId } = await req.json();
    
    let urlToFetch = icalUrl;
    
    // If cabinId provided, fetch the ical_url from the database
    if (cabinId && !icalUrl) {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseKey);
      
      const { data: cabin, error: cabinError } = await supabase
        .from('cabins')
        .select('ical_url')
        .eq('id', cabinId)
        .single();
      
      if (cabinError || !cabin?.ical_url) {
        console.log('No iCal URL found for cabin:', cabinId);
        return new Response(JSON.stringify({ dates: [], events: [] }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      urlToFetch = cabin.ical_url;
    }
    
    if (!urlToFetch) {
      return new Response(JSON.stringify({ dates: [], events: [] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    // Validate URL
    try {
      new URL(urlToFetch);
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid URL format' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    // Fetch iCal feed with timeout
    console.log('Fetching iCal from:', urlToFetch);
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
    
    const response = await fetch(urlToFetch, {
      headers: {
        'User-Agent': 'NaOdludzie/1.0 (Calendar Sync)',
        'Accept': 'text/calendar, application/calendar+xml, text/plain',
      },
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      console.error('Failed to fetch iCal:', response.status, response.statusText);
      return new Response(JSON.stringify({ 
        error: `Failed to fetch calendar: ${response.status}`,
        dates: [],
        events: []
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    const icalContent = await response.text();
    console.log('iCal content length:', icalContent.length);
    
    // Verify it's actually iCal content
    if (!icalContent.includes('BEGIN:VCALENDAR')) {
      console.error('Response is not valid iCal format');
      return new Response(JSON.stringify({ 
        error: 'Invalid iCal format - not a valid calendar file',
        dates: [],
        events: []
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    // Parse iCal content
    const events = parseICalContent(icalContent);
    console.log('Parsed events:', events.length);
    
    // Get all blocked dates from events
    const allDates: string[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    for (const event of events) {
      const dates = getDatesBetween(event.startDate, event.endDate);
      // Only include future dates
      for (const date of dates) {
        if (new Date(date) >= today) {
          allDates.push(date);
        }
      }
    }
    
    // Remove duplicates and sort
    const uniqueDates = [...new Set(allDates)].sort();
    
    console.log('Unique blocked dates:', uniqueDates.length);
    
    return new Response(JSON.stringify({ 
      dates: uniqueDates,
      events: events.map(e => ({ 
        startDate: e.startDate, 
        endDate: e.endDate,
        summary: e.summary 
      })),
      eventsCount: events.length
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
    
  } catch (error: unknown) {
    console.error('Error syncing iCal:', error);
    
    const err = error as { name?: string; message?: string };
    
    if (err.name === 'AbortError') {
      return new Response(JSON.stringify({ 
        error: 'Request timeout - calendar server took too long to respond',
        dates: [],
        events: []
      }), {
        status: 408,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    return new Response(JSON.stringify({ 
      error: err.message || 'Failed to sync calendar',
      dates: [],
      events: []
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
