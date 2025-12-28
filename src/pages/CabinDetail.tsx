import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Cabin } from '@/types';
import { getCabinBySlug, getBookedDates, getProfile, searchCabins } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
import { Header } from '@/components/Header';
import { SEOHead } from '@/components/SEOHead';
import { OffGridScoreDetail, OffGridScoreBadge } from '@/components/OffGridScore';
import { BookingRequestForm } from '@/components/BookingRequestForm';
import { LocationPreviewMap } from '@/components/LocationPreviewMap';
import { AvailabilityCalendar } from '@/components/AvailabilityCalendar';
import { ImageGallery } from '@/components/ImageGallery';
import { PromoPopup } from '@/components/PromoPopup';
import { useIsMobile } from '@/hooks/use-mobile';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Calendar } from '@/components/ui/calendar';
import { 
  MapPin, 
  Users, 
  Moon, 
  ArrowLeft,
  Bed,
  Bath,
  Maximize,
  PawPrint,
  User,
  CalendarClock,
  Trees,
  Coins
} from 'lucide-react';
import { motion } from 'framer-motion';

const AMENITY_LABELS: Record<string, string> = {
  'grill': 'Grill',
  'jacuzzi': 'Jacuzzi / Balia',
  'sauna': 'Sauna',
  'no-neighbors': 'Brak sąsiadów',
  'fenced': 'Szczelne ogrodzenie',
};

const BASE_URL = 'https://naodludzie.pl';

const CabinDetailPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isMobile = useIsMobile();
  
  const [cabin, setCabin] = useState<Cabin | null>(null);
  const [bookedDates, setBookedDates] = useState<Date[]>([]);
  const [hostName, setHostName] = useState<string | null>(null);
  const [similarCabins, setSimilarCabins] = useState<Cabin[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCalendarLoading, setIsCalendarLoading] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // Sort images so main image appears first
  const sortedImages = useMemo(() => {
    if (!cabin) return [];
    return [...cabin.images].sort((a, b) => {
      if (a.isMain) return -1;
      if (b.isMain) return 1;
      return 0;
    });
  }, [cabin]);

  // Generate SEO data
  const seoData = useMemo(() => {
    if (!cabin) return null;

    const mainImage = sortedImages[0];
    const amenitiesList = cabin.amenities.slice(0, 3).map(a => AMENITY_LABELS[a] || a).join(', ');
    const descriptionShort = cabin.description?.slice(0, 100) || '';
    
    const metaDescription = `${cabin.title} - ${cabin.address}. ${cabin.pricePerNight} zł/noc • Do ${cabin.maxGuests} osób • ${amenitiesList}. ${descriptionShort}`.slice(0, 155) + '...';
    
    const jsonLd = {
      '@context': 'https://schema.org',
      '@type': 'LodgingBusiness',
      name: cabin.title,
      description: cabin.description,
      image: cabin.images.map(img => img.url),
      address: {
        '@type': 'PostalAddress',
        addressLocality: cabin.voivodeship || cabin.address,
        addressCountry: 'PL',
      },
      geo: {
        '@type': 'GeoCoordinates',
        latitude: cabin.latitude,
        longitude: cabin.longitude,
      },
      priceRange: `od ${cabin.pricePerNight} zł/noc`,
      amenityFeature: cabin.amenities.map(amenity => ({
        '@type': 'LocationFeatureSpecification',
        name: AMENITY_LABELS[amenity] || amenity,
      })),
      numberOfRooms: cabin.bedrooms,
      petsAllowed: cabin.petsAllowed,
      url: `${BASE_URL}/cabin/${cabin.slug}`,
    };

    return {
      title: `${cabin.title} - ${cabin.voivodeship || cabin.address} | Rezerwuj`,
      description: metaDescription,
      canonicalUrl: `${BASE_URL}/cabin/${cabin.slug}`,
      ogImage: mainImage?.url || `${BASE_URL}/images/hero-cabin-winter.jpg`,
      ogImageAlt: `${cabin.title} - domek na odludziu`,
      jsonLd,
    };
  }, [cabin, sortedImages]);

  // Fetch cabin data (fast)
  useEffect(() => {
    const fetchCabin = async () => {
      if (!slug) return;
      
      setIsLoading(true);
      try {
        const cabinData = await getCabinBySlug(slug);
        
        if (cabinData) {
          setCabin(cabinData);
          
          // Fetch host profile in parallel
          const hostProfile = await getProfile(cabinData.ownerId);
          if (hostProfile) {
            setHostName(hostProfile.name || hostProfile.email.split('@')[0]);
          }

          // Fetch similar cabins (same voivodeship, different cabin)
          try {
            const similar = await searchCabins({ 
              voivodeships: cabinData.voivodeship ? [cabinData.voivodeship] : undefined,
              limit: 4 
            });
            setSimilarCabins(similar.data.filter(c => c.id !== cabinData.id).slice(0, 3));
          } catch (e) {
            console.error('Failed to fetch similar cabins:', e);
          }
        } else {
          navigate('/');
        }
      } catch (error) {
        console.error('Failed to fetch cabin:', error);
        navigate('/');
      } finally {
        setIsLoading(false);
      }
    };

    fetchCabin();
  }, [slug, navigate]);

  // Fetch calendar dates asynchronously (can be slow)
  useEffect(() => {
    if (!cabin?.id) return;
    
    const fetchCalendar = async () => {
      setIsCalendarLoading(true);
      try {
        const dates = await getBookedDates(cabin.id);
        setBookedDates(dates);
      } catch (error) {
        console.error('Failed to fetch booked dates:', error);
      } finally {
        setIsCalendarLoading(false);
      }
    };
    
    fetchCalendar();
  }, [cabin?.id]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container py-8">
          <Skeleton className="h-8 w-32 mb-6" />
          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <Skeleton className="aspect-[16/9] rounded-lg" />
              <Skeleton className="h-48" />
            </div>
            <Skeleton className="h-96" />
          </div>
        </div>
      </div>
    );
  }

  if (!cabin) return null;

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      {/* Promo Popup - shows once per 24h */}
      <PromoPopup cabinSlug={cabin.slug} />
      
      {/* SEO Head with dynamic meta tags */}
      {seoData && (
        <SEOHead
          title={seoData.title}
          description={seoData.description}
          canonicalUrl={seoData.canonicalUrl}
          ogImage={seoData.ogImage}
          ogImageAlt={seoData.ogImageAlt}
          type="website"
          jsonLd={seoData.jsonLd}
        />
      )}
      
      <Header />
      
      <main className="container py-4 sm:py-8 px-4 sm:px-6">
        {/* Back Button */}
        <nav aria-label="Breadcrumb">
          <Button
            variant="ghost"
            onClick={() => navigate('/')}
            className="mb-6"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Wróć do listy
          </Button>
        </nav>

        <article className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6 lg:space-y-8 min-w-0">
            {/* Image Gallery */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="relative"
            >
              <ImageGallery
                images={sortedImages}
                currentIndex={currentImageIndex}
                onIndexChange={setCurrentImageIndex}
                title={cabin.title}
              />
              <div className="absolute top-4 right-4 z-10">
                <OffGridScoreBadge score={cabin.offGridScore.total} size="md" />
              </div>
            </motion.div>

            {/* Title & Info */}
            <motion.header
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <h1 className="font-display text-2xl sm:text-3xl md:text-4xl font-bold mb-4 break-words">
                {cabin.title} - domek na odludziu
              </h1>
              <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-sm sm:text-base text-muted-foreground mb-6">
                <div className="flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  <span>{cabin.address}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Users className="w-4 h-4" />
                  <span>Do {cabin.maxGuests} osób</span>
                </div>
                <div className="flex items-center gap-1">
                  <Moon className="w-4 h-4" />
                  <span>Min. {cabin.minNights} nocy</span>
                </div>
                {hostName && (
                  <div className="flex items-center gap-1">
                    <User className="w-4 h-4" />
                    <span>Gospodarz: {hostName}</span>
                  </div>
                )}
              </div>

              {/* Quick stats */}
              <div className="grid grid-cols-2 gap-2 sm:gap-4 mb-6">
                <div className="flex items-center gap-2 p-2 sm:p-3 rounded-lg bg-muted/50">
                  <Bed className="w-4 h-4 sm:w-5 sm:h-5 text-primary flex-shrink-0" />
                  <span className="text-xs sm:text-sm">{cabin.bedrooms} sypialnie</span>
                </div>
                <div className="flex items-center gap-2 p-2 sm:p-3 rounded-lg bg-muted/50">
                  <Bath className="w-4 h-4 sm:w-5 sm:h-5 text-primary flex-shrink-0" />
                  <span className="text-xs sm:text-sm">{cabin.bathrooms} łazienki</span>
                </div>
                <div className="flex items-center gap-2 p-2 sm:p-3 rounded-lg bg-muted/50">
                  <Maximize className="w-4 h-4 sm:w-5 sm:h-5 text-primary flex-shrink-0" />
                  <span className="text-xs sm:text-sm">{cabin.areaSqm} m²</span>
                </div>
                <div className="flex items-center gap-2 p-2 sm:p-3 rounded-lg bg-muted/50">
                  <PawPrint className="w-4 h-4 sm:w-5 sm:h-5 text-primary flex-shrink-0" />
                  <span className="text-xs sm:text-sm">{cabin.petsAllowed ? 'Zwierzęta OK' : 'Bez zwierząt'}</span>
                </div>
              </div>

              <p className="text-foreground/80 leading-relaxed">
                {cabin.description}
              </p>
            </motion.header>

            {/* Amenities */}
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              aria-labelledby="amenities-heading"
            >
              <Card>
                <CardHeader>
                  <CardTitle id="amenities-heading">Udogodnienia</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {cabin.amenities.map((amenity) => (
                      <Badge key={amenity} variant="secondary" className="text-sm">
                        {AMENITY_LABELS[amenity] || amenity}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.section>

            {/* Extra Fees */}
            {cabin.extraFees && cabin.extraFees.length > 0 && (
              <motion.section
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
                aria-labelledby="fees-heading"
              >
                <Card>
                  <CardHeader>
                    <CardTitle id="fees-heading" className="flex items-center gap-2">
                      <Coins className="w-5 h-5 text-primary" />
                      Dodatkowe opłaty
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {cabin.extraFees.map((fee) => (
                        <div key={fee.id} className="flex justify-between items-center py-2 border-b border-border/50 last:border-0">
                          <span className="text-foreground">{fee.name}</span>
                          <span className="font-medium text-primary">
                            {fee.amount} zł {fee.unit === 'per_day' ? '/ dobę' : '(jednorazowo)'}
                          </span>
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground mt-4">
                      Opłaty dodatkowe są naliczane do całkowitej kwoty rezerwacji
                    </p>
                  </CardContent>
                </Card>
              </motion.section>
            )}

            {/* OffGrid Score Detail */}
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              aria-labelledby="offgrid-heading"
            >
              <Card>
                <CardHeader>
                  <CardTitle id="offgrid-heading">Analiza NaOdludzie</CardTitle>
                </CardHeader>
                <CardContent>
                  <OffGridScoreDetail score={cabin.offGridScore} />
                </CardContent>
              </Card>
            </motion.section>

            {/* Availability Calendar - show if cabin has iCal sync */}
            {cabin.icalUrl && (
              <motion.section
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35 }}
                aria-labelledby="availability-heading"
              >
                <AvailabilityCalendar 
                  bookedDates={bookedDates} 
                  lastSync={cabin.lastIcalSync}
                  isLoading={isCalendarLoading}
                />
              </motion.section>
            )}

            {/* Last Minute Calendar */}
            {cabin.lastMinuteDates && cabin.lastMinuteDates.length > 0 && (
              <motion.section
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35 }}
                aria-labelledby="lastminute-heading"
              >
                <Card className="border-orange-200 dark:border-orange-800">
                  <CardHeader>
                    <CardTitle id="lastminute-heading" className="flex items-center gap-2">
                      <CalendarClock className="w-5 h-5 text-orange-500" />
                      Oferta Last Minute
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      Gospodarz oferuje specjalne ceny na wybrane terminy. Zarezerwuj teraz!
                    </p>
                    <Calendar
                      mode="multiple"
                      selected={cabin.lastMinuteDates}
                      className="rounded-md border pointer-events-auto"
                      disabled={() => true}
                      numberOfMonths={isMobile ? 1 : 2}
                      modifiers={{
                        lastMinute: cabin.lastMinuteDates,
                      }}
                      modifiersClassNames={{
                        lastMinute: 'bg-orange-500 text-white hover:bg-orange-500 hover:text-white',
                      }}
                    />
                    <div className="p-3 bg-orange-50 dark:bg-orange-950/30 rounded-lg">
                      <p className="text-sm font-medium text-orange-700 dark:text-orange-400">
                        {cabin.lastMinuteDates.length} dni z ofertą last minute
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </motion.section>
            )}

            {/* Location with Map */}
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              aria-labelledby="location-heading"
            >
              <Card>
                <CardHeader>
                  <CardTitle id="location-heading">Przybliżona lokalizacja</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <LocationPreviewMap
                    latitude={cabin.latitude}
                    longitude={cabin.longitude}
                    className="w-full"
                  />
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <MapPin className="w-5 h-5" />
                    <span>{cabin.address}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Dokładna lokalizacja zostanie udostępniona po potwierdzeniu rezerwacji
                  </p>
                </CardContent>
              </Card>
            </motion.section>

            {/* Similar Cabins - Internal Linking */}
            {similarCabins.length > 0 && (
              <motion.section
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.45 }}
                aria-labelledby="similar-heading"
              >
                <Card>
                  <CardHeader>
                    <CardTitle id="similar-heading">Podobne domki w okolicy</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-4">
                      {similarCabins.map((similarCabin) => (
                        <Link 
                          key={similarCabin.id} 
                          to={`/cabin/${similarCabin.slug}`}
                          className="flex items-center gap-4 p-3 rounded-lg hover:bg-muted/50 transition-colors group"
                        >
                          <img
                            src={similarCabin.images[0]?.url || '/placeholder.svg'}
                            alt={`${similarCabin.title} - domek na odludziu`}
                            className="w-20 h-20 rounded-lg object-cover"
                            loading="lazy"
                          />
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold truncate group-hover:text-primary transition-colors">
                              {similarCabin.title}
                            </h3>
                            <p className="text-sm text-muted-foreground truncate">
                              {similarCabin.address}
                            </p>
                            <p className="text-sm font-medium text-primary">
                              {similarCabin.pricePerNight} zł/noc
                            </p>
                          </div>
                          <OffGridScoreBadge score={similarCabin.offGridScore.total} size="sm" />
                        </Link>
                      ))}
                    </div>
                    <Link 
                      to="/"
                      className="inline-flex items-center gap-2 mt-4 text-sm text-primary hover:underline"
                    >
                      <Trees className="w-4 h-4" />
                      Zobacz wszystkie domki na odludziu
                    </Link>
                  </CardContent>
                </Card>
              </motion.section>
            )}
          </div>

          {/* Booking Sidebar */}
          <motion.aside
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="lg:col-span-1"
          >
            <div className="sticky top-24">
              <BookingRequestForm
                cabinId={cabin.id}
                cabinTitle={cabin.title}
                hostId={cabin.ownerId}
                pricePerNight={cabin.pricePerNight}
                minNights={cabin.minNights}
                maxGuests={cabin.maxGuests}
                bookedDates={bookedDates}
                extraFees={cabin.extraFees}
              />
            </div>
          </motion.aside>
        </article>
      </main>
    </div>
  );
};

export default CabinDetailPage;
