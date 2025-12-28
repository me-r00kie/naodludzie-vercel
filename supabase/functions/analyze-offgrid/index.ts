import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface OffGridScore {
  total: number;
  lightPollution: number;
  buildingDensity: number;
  roadDensity: number;
}

// Authenticate user from request
async function authenticateUser(req: Request): Promise<{ userId: string } | null> {
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

  return { userId: user.id };
}

// Analyze area using Overpass API (OpenStreetMap) - count elements properly
async function analyzeBuildings(lat: number, lon: number, radiusMeters: number): Promise<number> {
  const query = `[out:json][timeout:15];way["building"](around:${radiusMeters},${lat},${lon});out body;`;
  
  try {
    const response = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `data=${encodeURIComponent(query)}`,
    });

    if (!response.ok) {
      console.error('Overpass buildings error:', response.status);
      return 0;
    }

    const data = await response.json();
    const count = data.elements?.length || 0;
    console.log(`Buildings found: ${count}`);
    return count;
  } catch (error) {
    console.error('Buildings query error:', error);
    return 0;
  }
}

async function analyzeRoads(lat: number, lon: number, radiusMeters: number): Promise<number> {
  const query = `[out:json][timeout:15];way["highway"](around:${radiusMeters},${lat},${lon});out body;`;
  
  try {
    const response = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `data=${encodeURIComponent(query)}`,
    });

    if (!response.ok) {
      console.error('Overpass roads error:', response.status);
      return 0;
    }

    const data = await response.json();
    const count = data.elements?.length || 0;
    console.log(`Roads found: ${count}`);
    return count;
  } catch (error) {
    console.error('Roads query error:', error);
    return 0;
  }
}

async function analyzeLighting(lat: number, lon: number, radiusMeters: number): Promise<number> {
  // Count street lights and commercial/industrial areas
  const query = `[out:json][timeout:15];(
    node["highway"="street_lamp"](around:${radiusMeters},${lat},${lon});
    way["landuse"~"commercial|industrial|retail"](around:${radiusMeters},${lat},${lon});
    node["amenity"](around:${radiusMeters},${lat},${lon});
  );out body;`;
  
  try {
    const response = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `data=${encodeURIComponent(query)}`,
    });

    if (!response.ok) {
      console.error('Overpass lighting error:', response.status);
      return 0;
    }

    const data = await response.json();
    const count = data.elements?.length || 0;
    console.log(`Light sources found: ${count}`);
    return count;
  } catch (error) {
    console.error('Lighting query error:', error);
    return 0;
  }
}

// Get location type from Nominatim
async function getLocationType(lat: number, lon: number): Promise<string> {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=14`,
      {
        headers: {
          'User-Agent': 'OffGridCabins/1.0 (contact@offgridcabins.pl)',
        },
      }
    );

    if (!response.ok) return 'unknown';

    const data = await response.json();
    return data.addresstype || data.type || 'unknown';
  } catch (error) {
    console.error('Reverse geocoding error:', error);
    return 'unknown';
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authenticate user
    const auth = await authenticateUser(req);
    if (!auth) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Authenticated user: ${auth.userId}`);

    const { latitude, longitude } = await req.json();

    // Validate input
    if (typeof latitude !== 'number' || typeof longitude !== 'number') {
      return new Response(
        JSON.stringify({ error: 'Invalid latitude or longitude format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      return new Response(
        JSON.stringify({ error: 'Latitude must be between -90 and 90, longitude between -180 and 180' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Analyzing off-grid score for: ${latitude}, ${longitude}`);

    const radiusMeters = 3000; // 3km radius

    // Run analyses in parallel
    const [buildings, roads, lights, locationType] = await Promise.all([
      analyzeBuildings(latitude, longitude, radiusMeters),
      analyzeRoads(latitude, longitude, radiusMeters),
      analyzeLighting(latitude, longitude, radiusMeters),
      getLocationType(latitude, longitude),
    ]);

    console.log(`Buildings: ${buildings}, Roads: ${roads}, Lights: ${lights}, Type: ${locationType}`);

    // Calculate individual scores (higher = more remote/off-grid)
    
    // Building density: fewer buildings = higher score
    // Typical rural area might have 0-50 buildings in 3km, urban can have 500+
    const buildingDensity = Math.round(
      Math.max(0, Math.min(100, 100 - Math.min(buildings * 2, 100)))
    );

    // Road density: fewer roads = higher score
    // Typical remote area has 0-20 roads, urban can have 100+
    const roadDensity = Math.round(
      Math.max(0, Math.min(100, 100 - Math.min(roads * 2, 100)))
    );

    // Light pollution: fewer light sources = higher score
    // Based on street lamps, commercial areas, amenities
    const lightPollution = Math.round(
      Math.max(0, Math.min(100, 100 - Math.min(lights * 1.5, 100)))
    );

    // Bonus/penalty based on location type
    let typeBonus = 0;
    switch (locationType) {
      case 'city':
      case 'town':
        typeBonus = -20;
        break;
      case 'suburb':
        typeBonus = -10;
        break;
      case 'village':
        typeBonus = 0;
        break;
      case 'hamlet':
        typeBonus = 10;
        break;
      case 'isolated_dwelling':
      case 'farm':
      case 'forest':
      case 'wood':
        typeBonus = 20;
        break;
      default:
        typeBonus = 5;
    }

    // Calculate total score (weighted average + type bonus)
    const baseTotal = (lightPollution * 0.35 + buildingDensity * 0.35 + roadDensity * 0.30);
    const total = Math.round(Math.max(0, Math.min(100, baseTotal + typeBonus)));

    const score: OffGridScore = {
      total,
      lightPollution: Math.max(0, Math.min(100, lightPollution)),
      buildingDensity: Math.max(0, Math.min(100, buildingDensity)),
      roadDensity: Math.max(0, Math.min(100, roadDensity)),
    };

    console.log('Calculated score:', score);

    return new Response(
      JSON.stringify(score),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error analyzing off-grid score:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to analyze location' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
