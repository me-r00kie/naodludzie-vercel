import { Link } from 'react-router-dom';
import { Cabin, CABIN_CATEGORIES } from '@/types';
import { OffGridScoreBadge } from './OffGridScore';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, Moon, MapPin, User, Zap, Sparkles, CalendarCheck, Star } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { getOptimizedImageUrl, getImageSrcSet } from '@/lib/imageUtils';
import { FallbackImage } from '@/components/FallbackImage';

const GUEST_PRICE_MARKUP = 1.07; // 7% markup for non-logged users
const AMENITY_LABELS: Record<string, string> = {
  'grill': 'Grill',
  'jacuzzi': 'Jacuzzi / Balia',
  'sauna': 'Sauna',
  'no-neighbors': 'Brak sąsiadów',
  'fenced': 'Szczelne ogrodzenie',
};

interface CabinCardProps {
  cabin: Cabin;
  index?: number;
  className?: string;
}

export function CabinCard({ cabin, index = 0, className }: CabinCardProps) {
  const { user } = useAuth();
  const hasLastMinute = cabin.lastMinuteDates && cabin.lastMinuteDates.length > 0;
  const hasOnlineBooking = !!cabin.icalUrl;
  const isRecommended = cabin.onlinePaymentsEnabled;
  const categoryInfo = CABIN_CATEGORIES.find(c => c.id === cabin.category) || CABIN_CATEGORIES[0];
  
  // Get main image or fall back to first image
  const mainImage = cabin.images.find(img => img.isMain) || cabin.images[0];
  
  // Optimized image URLs for performance
  const optimizedImageUrl = getOptimizedImageUrl(mainImage?.url, { width: 800, quality: 75 });
  const imageSrcSet = getImageSrcSet(mainImage?.url, [400, 640, 800]);
  
  // Calculate display price - +7% for non-logged users
  const displayPrice = user 
    ? cabin.pricePerNight 
    : Math.round(cabin.pricePerNight * GUEST_PRICE_MARKUP);

  // SEO-optimized alt text
  const imageAlt = `${cabin.title} - domek na odludziu w ${cabin.voivodeship || cabin.address}`;
  
  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.1 }}
      className="w-full"
    >
      <Link to={`/cabin/${cabin.slug}`} className="block">
        <Card className={cn(
          'group overflow-hidden border-0 shadow-card hover:shadow-card-hover transition-all duration-300 cursor-pointer h-full flex flex-col',
          isRecommended && 'ring-2 ring-purple-500/50',
          className
        )}>
          <figure className="relative aspect-[4/3] overflow-hidden flex-shrink-0">
            <FallbackImage
              src={optimizedImageUrl}
              srcSet={imageSrcSet || undefined}
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              alt={imageAlt}
              loading="lazy"
              decoding="async"
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-foreground/60 via-transparent to-transparent" />
            <div className="absolute top-2 left-2 sm:top-3 sm:left-3">
              <Badge variant="secondary" className="bg-background/90 text-foreground text-xs">
                {categoryInfo.icon} {categoryInfo.label}
              </Badge>
            </div>
            <div className="absolute top-2 right-2 sm:top-3 sm:right-3 flex flex-col gap-1.5 sm:gap-2 items-end">
              <OffGridScoreBadge score={cabin.offGridScore.total} size="sm" />
              {isRecommended && (
                <Badge className="bg-purple-600 hover:bg-purple-700 text-white border-0 flex items-center gap-1 text-xs">
                  <Star className="w-3 h-3" />
                  <span className="hidden xs:inline">Polecane</span>
                </Badge>
              )}
              {hasOnlineBooking && (
                <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white border-0 flex items-center gap-1 text-xs">
                  <CalendarCheck className="w-3 h-3" />
                  <span className="hidden xs:inline">Rezerwuj Online</span>
                </Badge>
              )}
              {hasLastMinute && (
                <Badge className="bg-amber-500 hover:bg-amber-600 text-white border-0 flex items-center gap-1 text-xs">
                  <Zap className="w-3 h-3" />
                  <span className="hidden xs:inline">Last Minute</span>
                </Badge>
              )}
            </div>
            <figcaption className="absolute bottom-2 left-2 right-2 sm:bottom-3 sm:left-3 sm:right-3">
              <h3 className="font-display text-base sm:text-lg font-semibold text-primary-foreground line-clamp-1">
                {cabin.title}
              </h3>
              <div className="flex items-center gap-1 text-primary-foreground/80 text-xs sm:text-sm mt-1">
                <MapPin className="w-3 h-3 flex-shrink-0" />
                <span className="line-clamp-1">{cabin.address}</span>
              </div>
            </figcaption>
          </figure>
          <CardContent className="p-3 sm:p-4 flex-1 flex flex-col">
            {cabin.ownerName && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
                <User className="w-3 h-3 flex-shrink-0" />
                <span className="truncate">Dodane przez: {cabin.ownerName}</span>
              </div>
            )}
            <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2 mb-3 flex-1">
              {cabin.description}
            </p>
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 sm:gap-3 text-xs sm:text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <span>{cabin.maxGuests}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Moon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <span>min {cabin.minNights}</span>
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <div className="flex items-center gap-1">
                  {user && (
                    <span className="text-xs text-primary flex items-center" title="Specjalna cena dla zalogowanych">
                      <Sparkles className="w-3 h-3" />
                    </span>
                  )}
                  <span className="text-base sm:text-lg font-bold text-foreground">{displayPrice} zł</span>
                  <span className="text-xs sm:text-sm text-muted-foreground">/noc</span>
                </div>
              </div>
            </div>
            {cabin.amenities.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2 sm:mt-3">
                {cabin.amenities.slice(0, 2).map((amenity) => (
                  <Badge key={amenity} variant="secondary" className="text-xs px-1.5 py-0.5">
                    {AMENITY_LABELS[amenity] || amenity}
                  </Badge>
                ))}
                {cabin.amenities.length > 2 && (
                  <Badge variant="secondary" className="text-xs px-1.5 py-0.5">
                    +{cabin.amenities.length - 2}
                  </Badge>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </Link>
    </motion.article>
  );
}
