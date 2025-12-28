import { 
  Cabin, 
  CabinSearchParams, 
  PaginatedResponse, 
  GeocodingResult,
  OffGridScore,
  CabinImage,
  CabinCategory,
  ExtraFee
} from '@/types';
import { supabase } from '@/integrations/supabase/client';

// ============================================
// CABINS API
// ============================================

function transformCabinData(dbCabin: any, ownerName?: string): Cabin {
  // Normalize images coming from the DB.
  // Some older records may store images as plain string URLs or objects missing fields.
  const rawImages = dbCabin.images;
  const normalizedImages: CabinImage[] = Array.isArray(rawImages)
    ? rawImages
        .map((img: any, idx: number): CabinImage | null => {
          if (!img) return null;

          // Legacy: array of URL strings
          if (typeof img === 'string') {
            return {
              id: `legacy-${dbCabin.id}-${idx}`,
              url: img,
              alt: `${dbCabin.title} - zdjęcie ${idx + 1}`,
              isMain: idx === 0,
            };
          }

          // Common: object with url (+ optional fields)
          const url = typeof img.url === 'string' ? img.url : typeof img.path === 'string' ? img.path : '';
          if (!url) return null;

          return {
            id: typeof img.id === 'string' ? img.id : `img-${dbCabin.id}-${idx}`,
            url,
            alt: typeof img.alt === 'string' && img.alt.trim().length > 0 ? img.alt : `${dbCabin.title} - zdjęcie ${idx + 1}`,
            isMain: Boolean(img.isMain ?? img.is_main ?? (idx === 0)),
          };
        })
        .filter(Boolean) as CabinImage[]
    : [];

  return {
    id: dbCabin.id,
    slug: dbCabin.slug,
    ownerId: dbCabin.owner_id,
    ownerName: ownerName || dbCabin.profiles?.name || null,
    title: dbCabin.title,
    description: dbCabin.description || '',
    address: dbCabin.address,
    latitude: dbCabin.latitude,
    longitude: dbCabin.longitude,
    pricePerNight: Number(dbCabin.price_per_night),
    maxGuests: dbCabin.max_guests,
    minNights: dbCabin.min_nights,
    bedrooms: dbCabin.bedrooms,
    bathrooms: dbCabin.bathrooms,
    areaSqm: dbCabin.area_sqm || 0,
    petsAllowed: dbCabin.pets_allowed,
    images: normalizedImages,
    offGridScore: (dbCabin.off_grid_score as OffGridScore) || {
      total: 5,
      lightPollution: 5,
      buildingDensity: 5,
      roadDensity: 5,
      distanceToBuildings: 5
    },
    amenities: dbCabin.amenities || [],
    isFeatured: dbCabin.is_featured,
    lastMinuteDates: dbCabin.last_minute_dates?.map((d: string) => new Date(d)) || [],
    externalCalendarNeeded: dbCabin.external_calendar_needed ?? null,
    externalCalendarDetails: dbCabin.external_calendar_details || '',
    icalUrl: dbCabin.ical_url || undefined,
    lastIcalSync: dbCabin.last_ical_sync ? new Date(dbCabin.last_ical_sync) : null,
    voivodeship: dbCabin.voivodeship || undefined,
    category: dbCabin.category || 'domek',
    extraFees: (dbCabin.extra_fees as ExtraFee[]) || [],
    onlinePaymentsEnabled: dbCabin.online_payments_enabled || false,
    manualPaymentVerified: dbCabin.manual_payment_verified || false,
    verificationTransferSent: dbCabin.verification_transfer_sent || false,
    createdAt: new Date(dbCabin.created_at),
    updatedAt: new Date(dbCabin.updated_at)
  };
}

export async function searchCabins(params: CabinSearchParams): Promise<PaginatedResponse<Cabin>> {
  let query = supabase
    .from('cabins')
    .select('*', { count: 'exact' })
    .eq('status', 'active'); // Only show active cabins!

  // Apply filters
  if (params.maxPrice !== undefined) {
    query = query.lte('price_per_night', params.maxPrice);
  }
  if (params.minGuests !== undefined) {
    query = query.gte('max_guests', params.minGuests);
  }
  if (params.petsAllowed) {
    query = query.eq('pets_allowed', true);
  }
  if (params.minBedrooms !== undefined) {
    query = query.gte('bedrooms', params.minBedrooms);
  }
  if (params.minBathrooms !== undefined) {
    query = query.gte('bathrooms', params.minBathrooms);
  }
  if (params.voivodeships && params.voivodeships.length > 0) {
    query = query.in('voivodeship', params.voivodeships);
  }
  if (params.category) {
    query = query.eq('category', params.category);
  }

  // Pagination
  const page = params.page || 1;
  const limit = params.limit || 10;
  const startIndex = (page - 1) * limit;

  // New sorting priority: 
  // 1. Featured first
  // 2. Has calendar connected (ical_url not null)
  // 3. Has online payments enabled
  // 4. By created_at desc
  query = query
    .order('is_featured', { ascending: false })
    .order('ical_url', { ascending: false, nullsFirst: false })
    .order('online_payments_enabled', { ascending: false })
    .order('created_at', { ascending: false })
    .range(startIndex, startIndex + limit - 1);

  const { data, error, count } = await query;

  if (error) {
    console.error('Error fetching cabins:', error);
    throw error;
  }

  // Fetch owner names for all cabins
  const ownerIds = [...new Set((data || []).map(c => c.owner_id))];
  const ownerNames: Record<string, string> = {};
  
  if (ownerIds.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, name')
      .in('id', ownerIds);
    
    if (profiles) {
      profiles.forEach(p => {
        if (p.name) ownerNames[p.id] = p.name;
      });
    }
  }

  let cabins = (data || []).map(cabin => transformCabinData(cabin, ownerNames[cabin.owner_id]));

  // Filter by NaOdludzie Score (client-side since it's JSON)
  if (params.minScore !== undefined) {
    cabins = cabins.filter(c => c.offGridScore.total >= params.minScore!);
  }
  if (params.maxScore !== undefined) {
    cabins = cabins.filter(c => c.offGridScore.total <= params.maxScore!);
  }

  // Client-side sorting with priority:
  // 1. Featured
  // 2. Has calendar (ical_url)
  // 3. Has online payments
  // 4. Off-grid score
  cabins.sort((a, b) => {
    // Featured first
    if (a.isFeatured !== b.isFeatured) return a.isFeatured ? -1 : 1;
    // Calendar connected second
    const aHasCal = !!a.icalUrl;
    const bHasCal = !!b.icalUrl;
    if (aHasCal !== bHasCal) return aHasCal ? -1 : 1;
    // Online payments third
    if (a.onlinePaymentsEnabled !== b.onlinePaymentsEnabled) return a.onlinePaymentsEnabled ? -1 : 1;
    // Then by off-grid score
    return b.offGridScore.total - a.offGridScore.total;
  });

  const total = count || 0;

  return {
    data: cabins,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

export async function getCabinById(id: string): Promise<Cabin | null> {
  const { data, error } = await supabase
    .from('cabins')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) {
    console.error('Error fetching cabin:', error);
    throw error;
  }

  if (!data) return null;

  return transformCabinData(data);
}

export async function getCabinBySlug(slug: string): Promise<Cabin | null> {
  const { data, error } = await supabase
    .from('cabins')
    .select('*')
    .eq('slug', slug)
    .maybeSingle();

  if (error) {
    console.error('Error fetching cabin by slug:', error);
    throw error;
  }

  if (!data) return null;

  return transformCabinData(data);
}

export async function getCabinsByOwner(ownerId: string): Promise<Cabin[]> {
  const { data, error } = await supabase
    .from('cabins')
    .select('*')
    .eq('owner_id', ownerId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching owner cabins:', error);
    throw error;
  }

  return (data || []).map(cabin => transformCabinData(cabin));
}

interface CreateCabinData {
  ownerId: string;
  ownerEmail?: string;
  ownerName?: string;
  title: string;
  description: string;
  address: string;
  voivodeship?: string;
  latitude: number;
  longitude: number;
  pricePerNight: number;
  maxGuests: number;
  minNights: number;
  bedrooms: number;
  bathrooms: number;
  areaSqm: number;
  petsAllowed: boolean;
  images: CabinImage[];
  amenities: string[];
  lightPollution: number;
  buildingDensity: number;
  roadDensity: number;
  distanceToBuildings: number;
  externalCalendarNeeded?: boolean | null;
  externalCalendarDetails?: string;
  icalUrl?: string;
  category?: CabinCategory;
  extraFees?: ExtraFee[];
}

export async function createCabin(cabinData: CreateCabinData): Promise<Cabin> {
  const lightPollution = cabinData.lightPollution || 5;
  const buildingDensity = cabinData.buildingDensity || 5;
  const roadDensity = cabinData.roadDensity || 5;
  const distanceToBuildings = cabinData.distanceToBuildings || 5;
  const total = Math.round((lightPollution + buildingDensity + roadDensity + distanceToBuildings) / 4);
  
  const offGridScore: OffGridScore = {
    total,
    lightPollution,
    buildingDensity,
    roadDensity,
    distanceToBuildings,
  };

  const { data, error } = await supabase
    .from('cabins')
    .insert([{
      owner_id: cabinData.ownerId,
      title: cabinData.title,
      description: cabinData.description,
      address: cabinData.address,
      voivodeship: cabinData.voivodeship || null,
      latitude: cabinData.latitude,
      longitude: cabinData.longitude,
      price_per_night: cabinData.pricePerNight,
      max_guests: cabinData.maxGuests,
      min_nights: cabinData.minNights,
      bedrooms: cabinData.bedrooms,
      bathrooms: cabinData.bathrooms,
      area_sqm: cabinData.areaSqm,
      pets_allowed: cabinData.petsAllowed,
      images: cabinData.images as any,
      off_grid_score: offGridScore as any,
      amenities: cabinData.amenities,
      is_featured: false,
      status: 'pending' as const,
      external_calendar_needed: cabinData.externalCalendarNeeded ?? null,
      external_calendar_details: cabinData.externalCalendarDetails || null,
      ical_url: cabinData.icalUrl || null,
      category: cabinData.category || 'domek',
      extra_fees: cabinData.extraFees || []
    }] as any)
    .select()
    .single();

  if (error) {
    console.error('Error creating cabin:', error);
    throw error;
  }

  // Notify admin about new pending cabin
  try {
    await supabase.functions.invoke('notify-admin-new-cabin', {
      body: {
        cabinTitle: cabinData.title,
        cabinAddress: cabinData.address,
        hostEmail: cabinData.ownerEmail || '',
        hostName: cabinData.ownerName || '',
      }
    });
    console.log('Admin notification sent for new cabin');
  } catch (notifyError) {
    console.error('Failed to send admin notification:', notifyError);
    // Don't throw - cabin was created successfully, notification is secondary
  }

  return transformCabinData(data);
}

export async function updateCabin(id: string, updates: Partial<Cabin> & { 
  lightPollution?: number; 
  buildingDensity?: number; 
  roadDensity?: number;
  distanceToBuildings?: number;
  externalCalendarNeeded?: boolean | null;
  externalCalendarDetails?: string;
  icalUrl?: string;
  voivodeship?: string;
  extraFees?: ExtraFee[];
}): Promise<Cabin> {
  const dbUpdates: any = {};
  
  if (updates.title !== undefined) dbUpdates.title = updates.title;
  if (updates.description !== undefined) dbUpdates.description = updates.description;
  if (updates.address !== undefined) dbUpdates.address = updates.address;
  if (updates.voivodeship !== undefined) dbUpdates.voivodeship = updates.voivodeship || null;
  if (updates.latitude !== undefined) dbUpdates.latitude = updates.latitude;
  if (updates.longitude !== undefined) dbUpdates.longitude = updates.longitude;
  if (updates.pricePerNight !== undefined) dbUpdates.price_per_night = updates.pricePerNight;
  if (updates.maxGuests !== undefined) dbUpdates.max_guests = updates.maxGuests;
  if (updates.minNights !== undefined) dbUpdates.min_nights = updates.minNights;
  if (updates.bedrooms !== undefined) dbUpdates.bedrooms = updates.bedrooms;
  if (updates.bathrooms !== undefined) dbUpdates.bathrooms = updates.bathrooms;
  if (updates.areaSqm !== undefined) dbUpdates.area_sqm = updates.areaSqm;
  if (updates.petsAllowed !== undefined) dbUpdates.pets_allowed = updates.petsAllowed;
  if (updates.images !== undefined) dbUpdates.images = updates.images as any;
  if (updates.amenities !== undefined) dbUpdates.amenities = updates.amenities;
  if (updates.lastMinuteDates !== undefined) {
    dbUpdates.last_minute_dates = updates.lastMinuteDates.map(d => d.toISOString().split('T')[0]);
  }
  if (updates.externalCalendarNeeded !== undefined) {
    dbUpdates.external_calendar_needed = updates.externalCalendarNeeded;
  }
  if (updates.externalCalendarDetails !== undefined) {
    dbUpdates.external_calendar_details = updates.externalCalendarDetails || null;
  }
  if (updates.icalUrl !== undefined) {
    dbUpdates.ical_url = updates.icalUrl || null;
  }
  if (updates.extraFees !== undefined) {
    dbUpdates.extra_fees = updates.extraFees;
  }
  
  // Handle score components
  if ((updates as any).lightPollution !== undefined || 
      (updates as any).buildingDensity !== undefined || 
      (updates as any).roadDensity !== undefined ||
      (updates as any).distanceToBuildings !== undefined) {
    const lp = (updates as any).lightPollution || 5;
    const bd = (updates as any).buildingDensity || 5;
    const rd = (updates as any).roadDensity || 5;
    const db = (updates as any).distanceToBuildings || 5;
    dbUpdates.off_grid_score = {
      total: Math.round((lp + bd + rd + db) / 4),
      lightPollution: lp,
      buildingDensity: bd,
      roadDensity: rd,
      distanceToBuildings: db,
    };
  }
  const { data, error } = await supabase
    .from('cabins')
    .update(dbUpdates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating cabin:', error);
    throw error;
  }

  return transformCabinData(data);
}

export async function deleteCabin(id: string): Promise<void> {
  const { error } = await supabase
    .from('cabins')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting cabin:', error);
    throw error;
  }
}

export async function recalculateOffGridScore(cabinId: string): Promise<OffGridScore> {
  const cabin = await getCabinById(cabinId);
  if (!cabin) {
    throw new Error('Domek nie został znaleziony');
  }

  const newScore = await calculateOffGridScore(cabin.latitude, cabin.longitude);

  await supabase
    .from('cabins')
    .update({ off_grid_score: newScore as any })
    .eq('id', cabinId);

  return newScore;
}

// ============================================
// NAODLUDZIE SCORE CALCULATION
// ============================================

export async function calculateOffGridScore(lat: number, lon: number): Promise<OffGridScore> {
  try {
    // Call the edge function for real analysis
    const { data, error } = await supabase.functions.invoke('analyze-offgrid', {
      body: { latitude: lat, longitude: lon }
    });

    if (error) {
      console.error('Error from analyze-offgrid function:', error);
      throw error;
    }

    return data as OffGridScore;
  } catch (error) {
    console.error('Failed to calculate NaOdludzie score, using fallback:', error);
    
    // Fallback calculation based on coordinates
    const baseRemoteness = Math.min(100, Math.max(0,
      (lat - 49) * 10 + (lon - 14) * 3 + 30
    ));

    const baseScore = Math.round(Math.min(10, Math.max(1, baseRemoteness / 10)));
    return {
      total: baseScore,
      lightPollution: baseScore,
      buildingDensity: baseScore,
      roadDensity: baseScore,
      distanceToBuildings: baseScore,
    };
  }
}

// ============================================
// GEOCODING API (OpenStreetMap Nominatim)
// ============================================

export async function geocodeAddress(address: string): Promise<GeocodingResult | null> {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&countrycodes=pl&limit=1`,
      {
        headers: {
          'User-Agent': 'NaOdludzie/1.0',
        },
      }
    );

    if (!response.ok) {
      throw new Error('Geocoding request failed');
    }

    const results = await response.json();

    if (results.length === 0) {
      return null;
    }

    const result = results[0];
    return {
      address: result.display_name || address,
      latitude: parseFloat(result.lat),
      longitude: parseFloat(result.lon),
    };
  } catch (error) {
    console.error('Geocoding error:', error);
    return null;
  }
}

// Reverse geocoding - get address from coordinates
export async function reverseGeocode(lat: number, lon: number): Promise<string | null> {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`,
      {
        headers: {
          'User-Agent': 'NaOdludzie/1.0',
        },
      }
    );

    if (!response.ok) {
      throw new Error('Reverse geocoding request failed');
    }

    const result = await response.json();
    return result.display_name || null;
  } catch (error) {
    console.error('Reverse geocoding error:', error);
    return null;
  }
}

// ============================================
// BOOKINGS API  
// ============================================

// Get booked dates from internal booking requests
async function getInternalBookedDates(cabinId: string): Promise<Date[]> {
  const { data } = await supabase
    .from('booking_requests')
    .select('start_date, end_date')
    .eq('cabin_id', cabinId)
    .eq('status', 'approved');

  if (!data) return [];

  const dates: Date[] = [];
  data.forEach(booking => {
    const start = new Date(booking.start_date);
    const end = new Date(booking.end_date);
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      dates.push(new Date(d));
    }
  });

  return dates;
}

// Get booked dates from external iCal calendar (cached)
async function getCachedCalendarDates(cabinId: string): Promise<Date[]> {
  const { data } = await supabase
    .from('cached_calendar_dates')
    .select('blocked_date')
    .eq('cabin_id', cabinId)
    .eq('source', 'ical')
    .gte('blocked_date', new Date().toISOString().split('T')[0]);

  if (!data || data.length === 0) {
    return [];
  }

  return data.map(d => new Date(d.blocked_date));
}

// Get booked dates from external iCal calendar (live fetch - used as fallback)
export async function getExternalCalendarDates(cabinId: string): Promise<Date[]> {
  try {
    const { data, error } = await supabase.functions.invoke('sync-ical-calendar', {
      body: { cabinId }
    });

    if (error || !data?.dates) {
      console.log('No external calendar dates for cabin:', cabinId);
      return [];
    }

    return data.dates.map((dateStr: string) => new Date(dateStr));
  } catch (error) {
    console.error('Failed to fetch external calendar dates:', error);
    return [];
  }
}

// Test iCal URL and return the number of events found
export async function testICalUrl(icalUrl: string): Promise<{ success: boolean; eventsCount: number; error?: string }> {
  try {
    const { data, error } = await supabase.functions.invoke('sync-ical-calendar', {
      body: { icalUrl }
    });

    if (error) {
      return { success: false, eventsCount: 0, error: error.message };
    }

    if (data?.error) {
      return { success: false, eventsCount: 0, error: data.error };
    }

    return { success: true, eventsCount: data?.eventsCount || 0 };
  } catch (error) {
    console.error('Failed to test iCal URL:', error);
    return { success: false, eventsCount: 0, error: 'Connection failed' };
  }
}

// Combined function to get all booked dates (internal + cached external)
export async function getBookedDates(cabinId: string): Promise<Date[]> {
  // Fetch both internal and cached external dates in parallel
  const [internalDates, cachedDates] = await Promise.all([
    getInternalBookedDates(cabinId),
    getCachedCalendarDates(cabinId)
  ]);

  // If no cached dates, try live fetch as fallback
  let externalDates = cachedDates;
  if (cachedDates.length === 0) {
    externalDates = await getExternalCalendarDates(cabinId);
  }

  // Combine and deduplicate dates
  const allDatesMap = new Map<string, Date>();
  
  for (const date of [...internalDates, ...externalDates]) {
    const dateKey = date.toISOString().split('T')[0];
    if (!allDatesMap.has(dateKey)) {
      allDatesMap.set(dateKey, date);
    }
  }

  return Array.from(allDatesMap.values()).sort((a, b) => a.getTime() - b.getTime());
}

// ============================================
// PROFILES API
// ============================================

export async function getProfile(userId: string): Promise<{ name: string | null; email: string } | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('name, email')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    console.error('Error fetching profile:', error);
    return null;
  }

  return data;
}