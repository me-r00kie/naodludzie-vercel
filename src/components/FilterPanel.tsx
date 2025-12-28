import { useState } from 'react';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { CabinSearchParams, CABIN_CATEGORIES, CabinCategory } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, SlidersHorizontal, X, MapPin, Users, Wallet, CalendarIcon, BedDouble, Bath, Home, Dog, Tag } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

interface FilterPanelProps {
  onSearch: (params: CabinSearchParams) => void;
  isLoading?: boolean;
  className?: string;
}

const AMENITY_FILTERS = [
  { id: 'grill', label: 'Grill' },
  { id: 'jacuzzi', label: 'Jacuzzi / Balia' },
  { id: 'sauna', label: 'Sauna' },
  { id: 'no-neighbors', label: 'Brak sąsiadów' },
  { id: 'fenced', label: 'Szczelne ogrodzenie' },
];

const AREA_RANGES = [
  { value: '20-30', label: '20-30 m²', min: 20, max: 30 },
  { value: '30-40', label: '30-40 m²', min: 30, max: 40 },
  { value: '40-50', label: '40-50 m²', min: 40, max: 50 },
  { value: '50-60', label: '50-60 m²', min: 50, max: 60 },
  { value: '60+', label: '> 60 m²', min: 60, max: undefined },
];

const VOIVODESHIPS = [
  { id: 'dolnośląskie', label: 'Dolnośląskie' },
  { id: 'kujawsko-pomorskie', label: 'Kujawsko-pomorskie' },
  { id: 'lubelskie', label: 'Lubelskie' },
  { id: 'lubuskie', label: 'Lubuskie' },
  { id: 'łódzkie', label: 'Łódzkie' },
  { id: 'małopolskie', label: 'Małopolskie' },
  { id: 'mazowieckie', label: 'Mazowieckie' },
  { id: 'opolskie', label: 'Opolskie' },
  { id: 'podkarpackie', label: 'Podkarpackie' },
  { id: 'podlaskie', label: 'Podlaskie' },
  { id: 'pomorskie', label: 'Pomorskie' },
  { id: 'śląskie', label: 'Śląskie' },
  { id: 'świętokrzyskie', label: 'Świętokrzyskie' },
  { id: 'warmińsko-mazurskie', label: 'Warmińsko-mazurskie' },
  { id: 'wielkopolskie', label: 'Wielkopolskie' },
  { id: 'zachodniopomorskie', label: 'Zachodniopomorskie' },
];

export function FilterPanel({ onSearch, isLoading, className }: FilterPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [scoreRange, setScoreRange] = useState<[number, number]>([1, 10]);
  const [maxPrice, setMaxPrice] = useState<number | undefined>();
  const [guests, setGuests] = useState<number | undefined>();
  const [nearCity, setNearCity] = useState('');
  const [maxDistance, setMaxDistance] = useState<number | undefined>();
  
  // New filter states
  const [checkIn, setCheckIn] = useState<Date | undefined>();
  const [checkOut, setCheckOut] = useState<Date | undefined>();
  const [petsAllowed, setPetsAllowed] = useState(false);
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
  const [bedrooms, setBedrooms] = useState<number | undefined>();
  const [bathrooms, setBathrooms] = useState<number | undefined>();
  const [areaRange, setAreaRange] = useState<string | undefined>();
  const [selectedVoivodeships, setSelectedVoivodeships] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<CabinCategory | undefined>();

  const handleSearch = () => {
    const params: CabinSearchParams = {
      minScore: scoreRange[0],
      maxScore: scoreRange[1],
    };

    if (maxPrice) params.maxPrice = maxPrice;
    if (guests) params.minGuests = guests;
    if (maxDistance) params.maxDistanceKm = maxDistance;
    if (checkIn) params.checkIn = checkIn;
    if (checkOut) params.checkOut = checkOut;
    if (petsAllowed) params.petsAllowed = true;
    if (bedrooms) params.minBedrooms = bedrooms;
    if (bathrooms) params.minBathrooms = bathrooms;
    if (selectedAmenities.length > 0) params.amenities = selectedAmenities;
    if (selectedVoivodeships.length > 0) params.voivodeships = selectedVoivodeships;
    if (selectedCategory) params.category = selectedCategory;
    
    if (areaRange) {
      const range = AREA_RANGES.find(r => r.value === areaRange);
      if (range) {
        params.minArea = range.min;
        params.maxArea = range.max;
      }
    }

    onSearch(params);
  };

  const handleReset = () => {
    setScoreRange([1, 10]);
    setMaxPrice(undefined);
    setGuests(undefined);
    setNearCity('');
    setMaxDistance(undefined);
    setCheckIn(undefined);
    setCheckOut(undefined);
    setPetsAllowed(false);
    setSelectedAmenities([]);
    setBedrooms(undefined);
    setBathrooms(undefined);
    setAreaRange(undefined);
    setSelectedVoivodeships([]);
    setSelectedCategory(undefined);
    onSearch({});
  };

  const toggleAmenity = (amenityId: string) => {
    setSelectedAmenities(prev =>
      prev.includes(amenityId)
        ? prev.filter(id => id !== amenityId)
        : [...prev, amenityId]
    );
  };

  const toggleVoivodeship = (voivodeshipId: string) => {
    setSelectedVoivodeships(prev =>
      prev.includes(voivodeshipId)
        ? prev.filter(id => id !== voivodeshipId)
        : [...prev, voivodeshipId]
    );
  };

  const getScoreColor = (value: number) => {
    if (value < 4) return 'text-score-low';
    if (value < 7) return 'text-score-medium';
    return 'text-score-high';
  };

  return (
    <Card className={cn('border-0 shadow-card', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <SlidersHorizontal className="w-5 h-5" />
            Filtry
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="lg:hidden"
          >
            {isExpanded ? <X className="w-4 h-4" /> : <SlidersHorizontal className="w-4 h-4" />}
          </Button>
        </div>
      </CardHeader>
      
      <AnimatePresence>
        <motion.div
          initial={false}
          animate={{ height: isExpanded || window.innerWidth >= 1024 ? 'auto' : 0 }}
          className="overflow-hidden lg:!h-auto"
        >
          <CardContent className="space-y-6">
            {/* Category */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2 font-semibold">
                <Tag className="w-4 h-4" />
                Typ obiektu
              </Label>
              <div className="grid grid-cols-2 gap-2">
                {CABIN_CATEGORIES.map(cat => (
                  <Button
                    key={cat.id}
                    variant={selectedCategory === cat.id ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedCategory(selectedCategory === cat.id ? undefined : cat.id)}
                    className="justify-start"
                  >
                    <span className="mr-2">{cat.icon}</span>
                    {cat.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Check-in / Check-out Dates */}
            <div className="space-y-3">
              <Label className="flex items-center gap-2 font-semibold">
                <CalendarIcon className="w-4 h-4" />
                Termin pobytu
              </Label>
              <div className="grid grid-cols-2 gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("justify-start text-left font-normal", !checkIn && "text-muted-foreground")}>
                      {checkIn ? format(checkIn, 'd MMM', { locale: pl }) : 'Przyjazd'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={checkIn}
                      onSelect={setCheckIn}
                      disabled={(date) => date < new Date()}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("justify-start text-left font-normal", !checkOut && "text-muted-foreground")}>
                      {checkOut ? format(checkOut, 'd MMM', { locale: pl }) : 'Wyjazd'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={checkOut}
                      onSelect={setCheckOut}
                      disabled={(date) => date < (checkIn || new Date())}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {/* Guests */}
            <div className="space-y-2">
              <Label htmlFor="guests" className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                Liczba osób
              </Label>
              <Select value={guests?.toString() || ''} onValueChange={(v) => setGuests(v ? Number(v) : undefined)}>
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="Wybierz" />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 10, 12, 15, 20].map(num => (
                    <SelectItem key={num} value={num.toString()}>{num} {num === 1 ? 'osoba' : num < 5 ? 'osoby' : 'osób'}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Pets */}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="pets"
                checked={petsAllowed}
                onCheckedChange={(checked) => setPetsAllowed(checked === true)}
              />
              <Label htmlFor="pets" className="flex items-center gap-2 cursor-pointer">
                <Dog className="w-4 h-4" />
                Zwierzęta dozwolone
              </Label>
            </div>

            {/* NaOdludzie Score Range */}
            <div className="space-y-3">
              <Label className="flex items-center gap-2 font-semibold">
                Jak bardzo na odludziu?
                <span className={cn('text-sm font-normal', getScoreColor(scoreRange[0]))}>
                  {scoreRange[0]}
                </span>
                <span className="text-muted-foreground">-</span>
                <span className={cn('text-sm font-normal', getScoreColor(scoreRange[1]))}>
                  {scoreRange[1]}
                </span>
              </Label>
              <Slider
                value={scoreRange}
                onValueChange={(value) => setScoreRange(value as [number, number])}
                max={10}
                min={1}
                step={1}
                className="py-2"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Mało odosobnione</span>
                <span>Bardzo odosobnione</span>
              </div>
            </div>

            {/* Max Price */}
            <div className="space-y-2">
              <Label htmlFor="maxPrice" className="flex items-center gap-2">
                <Wallet className="w-4 h-4" />
                Maksymalna cena/noc
              </Label>
              <Input
                id="maxPrice"
                type="number"
                placeholder="np. 500 zł"
                value={maxPrice || ''}
                onChange={(e) => setMaxPrice(e.target.value ? Number(e.target.value) : undefined)}
                className="bg-background"
              />
            </div>

            {/* Bedrooms & Bathrooms */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <BedDouble className="w-4 h-4" />
                  Sypialnie
                </Label>
                <Select value={bedrooms?.toString() || ''} onValueChange={(v) => setBedrooms(v ? Number(v) : undefined)}>
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder="Min." />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5].map(num => (
                      <SelectItem key={num} value={num.toString()}>{num}+</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Bath className="w-4 h-4" />
                  Łazienki
                </Label>
                <Select value={bathrooms?.toString() || ''} onValueChange={(v) => setBathrooms(v ? Number(v) : undefined)}>
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder="Min." />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3].map(num => (
                      <SelectItem key={num} value={num.toString()}>{num}+</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Area Range */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Home className="w-4 h-4" />
                Powierzchnia
              </Label>
              <Select value={areaRange || ''} onValueChange={(v) => setAreaRange(v || undefined)}>
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="Dowolna" />
                </SelectTrigger>
                <SelectContent>
                  {AREA_RANGES.map(range => (
                    <SelectItem key={range.value} value={range.value}>{range.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Voivodeships */}
            <div className="space-y-3">
              <Label className="flex items-center gap-2 font-semibold">
                <MapPin className="w-4 h-4" />
                Województwo
              </Label>
              <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto pr-2">
                {VOIVODESHIPS.map(voivodeship => (
                  <div key={voivodeship.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`voiv-${voivodeship.id}`}
                      checked={selectedVoivodeships.includes(voivodeship.id)}
                      onCheckedChange={() => toggleVoivodeship(voivodeship.id)}
                    />
                    <Label htmlFor={`voiv-${voivodeship.id}`} className="text-sm cursor-pointer">
                      {voivodeship.label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            {/* Amenities */}
            <div className="space-y-3">
              <Label className="font-semibold">Udogodnienia</Label>
              <div className="grid grid-cols-2 gap-2">
                {AMENITY_FILTERS.map(amenity => (
                  <div key={amenity.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={amenity.id}
                      checked={selectedAmenities.includes(amenity.id)}
                      onCheckedChange={() => toggleAmenity(amenity.id)}
                    />
                    <Label htmlFor={amenity.id} className="text-sm cursor-pointer">
                      {amenity.label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            {/* Near City */}
            <div className="space-y-2">
              <Label htmlFor="nearCity" className="flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                W pobliżu miasta
              </Label>
              <Input
                id="nearCity"
                type="text"
                placeholder="np. Kraków"
                value={nearCity}
                onChange={(e) => setNearCity(e.target.value)}
                className="bg-background"
              />
            </div>

            {/* Max Distance */}
            {nearCity && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-2"
              >
                <Label htmlFor="maxDistance">Maksymalna odległość (km)</Label>
                <Input
                  id="maxDistance"
                  type="number"
                  placeholder="np. 100"
                  value={maxDistance || ''}
                  onChange={(e) => setMaxDistance(e.target.value ? Number(e.target.value) : undefined)}
                  className="bg-background"
                />
              </motion.div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-2 pt-2">
              <Button onClick={handleSearch} disabled={isLoading} className="flex-1">
                <Search className="w-4 h-4 mr-2" />
                Szukaj
              </Button>
              <Button variant="outline" onClick={handleReset}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </motion.div>
      </AnimatePresence>
    </Card>
  );
}
