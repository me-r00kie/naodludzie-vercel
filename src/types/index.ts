export type UserRole = 'guest' | 'host';

export interface User {
  id: string;
  email: string;
  role: UserRole;
  name?: string;
  createdAt: Date;
}

export interface OffGridScoreComponents {
  lightPollution: number; // 1-10, higher = less pollution = more remote
  buildingDensity: number; // 1-10, higher = less buildings = more remote
  roadDensity: number; // 1-10, higher = less roads = more remote
  distanceToBuildings: number; // 1-10, higher = further from buildings
}

export interface OffGridScore extends OffGridScoreComponents {
  total: number; // 1-10, average of components
}

export interface CabinImage {
  id: string;
  url: string;
  alt: string;
  isMain?: boolean;
}

export type CabinCategory = 'domek' | 'camping' | 'jurta' | 'glamping';

export const CABIN_CATEGORIES: { id: CabinCategory; label: string; icon: string }[] = [
  { id: 'domek', label: 'Domek', icon: '🏡' },
  { id: 'camping', label: 'Camping', icon: '⛺' },
  { id: 'jurta', label: 'Jurta', icon: '🛖' },
  { id: 'glamping', label: 'Glamping', icon: '🏕️' },
];

// Extra fees system
export type FeeUnit = 'per_day' | 'one_time';

export interface ExtraFee {
  id: string;
  name: string;
  amount: number;
  unit: FeeUnit;
  enabled: boolean;
}

export const PREDEFINED_FEES: Omit<ExtraFee, 'enabled'>[] = [
  { id: 'hot_tub', name: 'Opłata za balię', amount: 0, unit: 'per_day' },
  { id: 'sauna', name: 'Opłata za saunę', amount: 0, unit: 'per_day' },
  { id: 'pet', name: 'Opłata za zwierzaka', amount: 0, unit: 'per_day' },
  { id: 'cleaning', name: 'Sprzątanie końcowe', amount: 0, unit: 'one_time' },
  { id: 'climate', name: 'Opłata klimatyczna', amount: 0, unit: 'per_day' },
];

export interface Cabin {
  slug: string;
  id: string;
  ownerId: string;
  ownerName?: string;
  title: string;
  description: string;
  address: string;
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
  offGridScore: OffGridScore;
  amenities: string[];
  isFeatured?: boolean;
  lastMinuteDates?: Date[];
  externalCalendarNeeded?: boolean | null;
  externalCalendarDetails?: string;
  icalUrl?: string;
  lastIcalSync?: Date | null;
  voivodeship?: string;
  category: CabinCategory;
  extraFees?: ExtraFee[];
  onlinePaymentsEnabled?: boolean;
  manualPaymentVerified?: boolean;
  verificationTransferSent?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface BookingStatus {
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
}

export interface Booking {
  id: string;
  cabinId: string;
  guestId: string;
  startDate: Date;
  endDate: Date;
  totalPrice: number;
  status: BookingStatus['status'];
  createdAt: Date;
}

export interface CabinSearchParams {
  minScore?: number;
  maxScore?: number;
  maxPrice?: number;
  minGuests?: number;
  nearLat?: number;
  nearLon?: number;
  maxDistanceKm?: number;
  page?: number;
  limit?: number;
  // New filters
  checkIn?: Date;
  checkOut?: Date;
  petsAllowed?: boolean;
  minBedrooms?: number;
  minBathrooms?: number;
  minArea?: number;
  maxArea?: number;
  amenities?: string[];
  voivodeships?: string[];
  category?: CabinCategory;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface GeocodingResult {
  address: string;
  latitude: number;
  longitude: number;
}

export type ScoreLevel = 'low' | 'medium' | 'high';

export function getScoreLevel(score: number): ScoreLevel {
  if (score < 4) return 'low';
  if (score < 7) return 'medium';
  return 'high';
}

export function getScoreLabel(level: ScoreLevel): string {
  switch (level) {
    case 'low': return 'Mało odosobnione';
    case 'medium': return 'Średnio odosobnione';
    case 'high': return 'Bardzo odosobnione';
  }
}
