import { Cabin, User, Booking, OffGridScore } from '@/types';

// Mock cabin images - using placeholder URLs that will work
const cabinImages = [
  'https://images.unsplash.com/photo-1449158743715-0a90ebb6d2d8?w=800&q=80',
  'https://images.unsplash.com/photo-1510798831971-661eb04b3739?w=800&q=80',
  'https://images.unsplash.com/photo-1587061949409-02df41d5e562?w=800&q=80',
  'https://images.unsplash.com/photo-1518732714860-b62714ce0c59?w=800&q=80',
  'https://images.unsplash.com/photo-1499696010180-025ef6e1a8f9?w=800&q=80',
  'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&q=80',
];

const generateOffGridScore = (baseScore: number): OffGridScore => {
  const variance = () => Math.floor(Math.random() * 2) - 1;
  const clamp = (n: number) => Math.max(1, Math.min(10, n));
  
  const base = Math.round(baseScore / 10);
  const lightPollution = clamp(base + variance());
  const buildingDensity = clamp(base + variance());
  const roadDensity = clamp(base + variance());
  const distanceToBuildings = clamp(base + variance());
  
  const total = Math.round((lightPollution + buildingDensity + roadDensity + distanceToBuildings) / 4);
  
  return { total, lightPollution, buildingDensity, roadDensity, distanceToBuildings };
};

export const mockUsers: User[] = [
  { id: 'user-1', email: 'host@example.com', role: 'host', name: 'Jan Kowalski', createdAt: new Date('2024-01-01') },
  { id: 'user-2', email: 'guest@example.com', role: 'guest', name: 'Anna Nowak', createdAt: new Date('2024-02-01') },
  { id: 'user-3', email: 'host2@example.com', role: 'host', name: 'Piotr Wiśniewski', createdAt: new Date('2024-03-01') },
];

export const mockCabins: Cabin[] = [
  {
    id: 'cabin-1',
    slug: 'lesna-chatka-w-bieszczadach',
    ownerId: 'user-1',
    title: 'Leśna Chatka w Bieszczadach',
    description: 'Przytulna chatka położona w samym sercu Bieszczadów. Idealne miejsce na ucieczkę od cywilizacji. Brak zasięgu telefonu i internetu - prawdziwy digital detox! Otoczona lasem bukowym, z widokiem na połoniny.',
    address: 'Wetlina, Bieszczady',
    latitude: 49.1547,
    longitude: 22.4521,
    pricePerNight: 350,
    maxGuests: 4,
    minNights: 2,
    bedrooms: 2,
    bathrooms: 1,
    areaSqm: 45,
    petsAllowed: true,
    images: [
      { id: 'img-1', url: cabinImages[0], alt: 'Chatka w lesie' },
      { id: 'img-2', url: cabinImages[5], alt: 'Widok na góry' },
    ],
    offGridScore: generateOffGridScore(85),
    amenities: ['Kominek', 'Kuchnia', 'Taras', 'grill', 'sauna', 'no-neighbors'],
    isFeatured: true,
    lastMinuteDates: [new Date('2025-12-15'), new Date('2025-12-16'), new Date('2025-12-17')],
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-01-15'),
    category: 'domek',
  },
  {
    id: 'cabin-2',
    slug: 'domek-nad-jeziorem-mazury',
    ownerId: 'user-1',
    title: 'Domek nad jeziorem - Mazury',
    description: 'Drewniany domek z własnym pomostem nad malowniczym jeziorem. Cisza, spokój i kontakt z naturą. Możliwość wypożyczenia kajaka. Dojazd drogą gruntową przez las.',
    address: 'Ruciane-Nida, Mazury',
    latitude: 53.6431,
    longitude: 21.5127,
    pricePerNight: 420,
    maxGuests: 6,
    minNights: 3,
    bedrooms: 3,
    bathrooms: 2,
    areaSqm: 65,
    petsAllowed: true,
    images: [
      { id: 'img-3', url: cabinImages[1], alt: 'Domek nad jeziorem' },
      { id: 'img-4', url: cabinImages[4], alt: 'Widok na jezioro' },
    ],
    offGridScore: generateOffGridScore(65),
    amenities: ['Pomost', 'Kajak', 'Kuchnia', 'Łazienka', 'Ognisko', 'jacuzzi'],
    isFeatured: true,
    createdAt: new Date('2024-02-10'),
    updatedAt: new Date('2024-02-10'),
    category: 'domek',
  },
  {
    id: 'cabin-3',
    slug: 'gorska-bacowka-tatry',
    ownerId: 'user-3',
    title: 'Górska Bacówka - Tatry',
    description: 'Autentyczna bacówka pasterska przekształcona w przytulne schronienie. Ogrzewanie na drewno, woda ze studni. Spektakularne widoki na Tatry Zachodnie. Dla prawdziwych poszukiwaczy przygód.',
    address: 'Witów, Podhale',
    latitude: 49.2784,
    longitude: 19.8234,
    pricePerNight: 280,
    maxGuests: 3,
    minNights: 2,
    bedrooms: 1,
    bathrooms: 1,
    areaSqm: 28,
    petsAllowed: false,
    images: [
      { id: 'img-5', url: cabinImages[2], alt: 'Bacówka w górach' },
      { id: 'img-6', url: cabinImages[5], alt: 'Panorama Tatr' },
    ],
    offGridScore: generateOffGridScore(78),
    amenities: ['Piec', 'Studnia', 'Taras widokowy', 'Lampy naftowe', 'no-neighbors'],
    createdAt: new Date('2024-03-05'),
    updatedAt: new Date('2024-03-05'),
    category: 'jurta',
  },
  {
    id: 'cabin-4',
    slug: 'pustelnia-w-puszczy-bialowieskiej',
    ownerId: 'user-3',
    title: 'Pustelnia w Puszczy Białowieskiej',
    description: 'Ekologiczny domek w ostatniej pierwotnej puszczy Europy. Zasilany panelami słonecznymi, z kompostowalną toaletą. Możliwość obserwacji żubrów i innych dzikich zwierząt.',
    address: 'Białowieża, Podlasie',
    latitude: 52.7012,
    longitude: 23.8654,
    pricePerNight: 380,
    maxGuests: 4,
    minNights: 2,
    bedrooms: 2,
    bathrooms: 1,
    areaSqm: 38,
    petsAllowed: false,
    images: [
      { id: 'img-7', url: cabinImages[3], alt: 'Domek w puszczy' },
      { id: 'img-8', url: cabinImages[0], alt: 'Las pierwotny' },
    ],
    offGridScore: generateOffGridScore(92),
    amenities: ['Panele słoneczne', 'Toaleta kompostowa', 'Taras', 'Lornetka', 'no-neighbors'],
    lastMinuteDates: [new Date('2025-12-20'), new Date('2025-12-21'), new Date('2025-12-22'), new Date('2025-12-23')],
    createdAt: new Date('2024-04-01'),
    updatedAt: new Date('2024-04-01'),
    category: 'glamping',
  },
  {
    id: 'cabin-5',
    slug: 'chatka-rybaka-drawienski-park',
    ownerId: 'user-1',
    title: 'Chatka Rybaka - Drawieński Park',
    description: 'Mały, ale wygodny domek nad rzeką Drawą. Idealny dla wędkarzy i miłośników kajaków. Zaciszne miejsce z dala od turystycznych szlaków.',
    address: 'Drawno, Zachodniopomorskie',
    latitude: 53.2156,
    longitude: 15.7823,
    pricePerNight: 250,
    maxGuests: 2,
    minNights: 2,
    bedrooms: 1,
    bathrooms: 1,
    areaSqm: 25,
    petsAllowed: true,
    images: [
      { id: 'img-9', url: cabinImages[4], alt: 'Chatka nad rzeką' },
      { id: 'img-10', url: cabinImages[1], alt: 'Widok na rzekę' },
    ],
    offGridScore: generateOffGridScore(55),
    amenities: ['Pomost', 'Sprzęt wędkarski', 'Kuchnia', 'grill'],
    createdAt: new Date('2024-05-15'),
    updatedAt: new Date('2024-05-15'),
    category: 'domek',
  },
  {
    id: 'cabin-6',
    slug: 'lesniczowka-w-borach-tucholskich',
    ownerId: 'user-3',
    title: 'Leśniczówka w Borach Tucholskich',
    description: 'Zabytkowa leśniczówka odnowiona z dbałością o detale. Duży ogród, staw z żabami, ścieżki spacerowe prosto z drzwi. Idealna na rodzinny wypoczynek.',
    address: 'Tuchola, Kujawsko-Pomorskie',
    latitude: 53.5934,
    longitude: 17.8567,
    pricePerNight: 320,
    maxGuests: 8,
    minNights: 2,
    bedrooms: 3,
    bathrooms: 2,
    areaSqm: 85,
    petsAllowed: true,
    images: [
      { id: 'img-11', url: cabinImages[0], alt: 'Leśniczówka' },
      { id: 'img-12', url: cabinImages[3], alt: 'Ogród' },
    ],
    offGridScore: generateOffGridScore(48),
    amenities: ['Ogród', 'Staw', 'Kuchnia', 'sauna', 'grill', 'jacuzzi'],
    createdAt: new Date('2024-06-01'),
    updatedAt: new Date('2024-06-01'),
    category: 'domek',
  },
];

export const mockBookings: Booking[] = [
  {
    id: 'booking-1',
    cabinId: 'cabin-1',
    guestId: 'user-2',
    startDate: new Date('2024-12-20'),
    endDate: new Date('2024-12-25'),
    totalPrice: 1750,
    status: 'confirmed',
    createdAt: new Date('2024-11-01'),
  },
  {
    id: 'booking-2',
    cabinId: 'cabin-2',
    guestId: 'user-2',
    startDate: new Date('2025-01-10'),
    endDate: new Date('2025-01-15'),
    totalPrice: 2100,
    status: 'pending',
    createdAt: new Date('2024-11-15'),
  },
];

// Generate booked dates for calendar
export const generateBookedDates = (cabinId: string): Date[] => {
  const cabin = mockCabins.find(c => c.id === cabinId);
  if (!cabin) return [];
  
  const bookings = mockBookings.filter(b => b.cabinId === cabinId && b.status !== 'cancelled');
  const dates: Date[] = [];
  
  bookings.forEach(booking => {
    const current = new Date(booking.startDate);
    while (current <= booking.endDate) {
      dates.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }
  });
  
  return dates;
};
