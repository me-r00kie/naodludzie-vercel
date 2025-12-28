import { useState } from 'react';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CalendarIcon, MapPin, Users, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CabinSearchParams } from '@/types';

interface HeroSearchBarProps {
  onSearch: (params: CabinSearchParams) => void;
  isLoading?: boolean;
}

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

export function HeroSearchBar({ onSearch, isLoading }: HeroSearchBarProps) {
  const [voivodeship, setVoivodeship] = useState<string | undefined>();
  const [checkIn, setCheckIn] = useState<Date | undefined>();
  const [checkOut, setCheckOut] = useState<Date | undefined>();
  const [guests, setGuests] = useState<number | undefined>();

  const handleSearch = () => {
    const params: CabinSearchParams = {};
    if (voivodeship) params.voivodeships = [voivodeship];
    if (checkIn) params.checkIn = checkIn;
    if (checkOut) params.checkOut = checkOut;
    if (guests) params.minGuests = guests;
    onSearch(params);
  };

  return (
    <div className="bg-background/95 backdrop-blur-sm rounded-2xl p-4 md:p-6 shadow-2xl border border-border/50">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Voivodeship */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground flex items-center gap-2">
            <MapPin className="w-4 h-4 text-primary" />
            Województwo
          </label>
          <Select value={voivodeship || 'all'} onValueChange={(v) => setVoivodeship(v === 'all' ? undefined : v)}>
            <SelectTrigger className="bg-background h-12">
              <SelectValue placeholder="Wybierz region" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Wszystkie regiony</SelectItem>
              {VOIVODESHIPS.map(v => (
                <SelectItem key={v.id} value={v.id}>{v.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Check-in Date */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground flex items-center gap-2">
            <CalendarIcon className="w-4 h-4 text-primary" />
            Data przyjazdu
          </label>
          <Popover>
            <PopoverTrigger asChild>
              <Button 
                variant="outline" 
                className={cn(
                  "w-full justify-start text-left font-normal h-12 bg-background", 
                  !checkIn && "text-muted-foreground"
                )}
              >
                {checkIn ? format(checkIn, 'd MMMM yyyy', { locale: pl }) : 'Wybierz datę'}
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
        </div>

        {/* Check-out Date */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground flex items-center gap-2">
            <CalendarIcon className="w-4 h-4 text-primary" />
            Data wyjazdu
          </label>
          <Popover>
            <PopoverTrigger asChild>
              <Button 
                variant="outline" 
                className={cn(
                  "w-full justify-start text-left font-normal h-12 bg-background", 
                  !checkOut && "text-muted-foreground"
                )}
              >
                {checkOut ? format(checkOut, 'd MMMM yyyy', { locale: pl }) : 'Wybierz datę'}
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

        {/* Guests + Search */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground flex items-center gap-2">
            <Users className="w-4 h-4 text-primary" />
            Goście
          </label>
          <div className="flex gap-2">
            <Select value={guests?.toString() || ''} onValueChange={(v) => setGuests(v ? Number(v) : undefined)}>
              <SelectTrigger className="bg-background h-12 flex-1">
                <SelectValue placeholder="Ile osób?" />
              </SelectTrigger>
              <SelectContent>
                {[1, 2, 3, 4, 5, 6, 7, 8, 10, 12, 15, 20].map(num => (
                  <SelectItem key={num} value={num.toString()}>
                    {num} {num === 1 ? 'osoba' : num < 5 ? 'osoby' : 'osób'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button 
              onClick={handleSearch} 
              disabled={isLoading}
              size="lg"
              className="h-12 px-6"
            >
              <Search className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}