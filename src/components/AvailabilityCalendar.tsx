import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { Skeleton } from '@/components/ui/skeleton';
import { CalendarDays, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { useIsMobile } from '@/hooks/use-mobile';

interface AvailabilityCalendarProps {
  bookedDates: Date[];
  lastSync?: Date | null;
  isLoading?: boolean;
}

export const AvailabilityCalendar = ({ bookedDates, lastSync, isLoading }: AvailabilityCalendarProps) => {
  const isMobile = useIsMobile();
  
  const bookedDatesSet = useMemo(() => {
    return new Set(bookedDates.map(d => d.toISOString().split('T')[0]));
  }, [bookedDates]);

  const isDateBooked = (date: Date) => {
    return bookedDatesSet.has(date.toISOString().split('T')[0]);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarDays className="w-5 h-5 text-primary" />
          Dostępność
          {isLoading && <RefreshCw className="w-4 h-4 animate-spin text-muted-foreground" />}
        </CardTitle>
        {lastSync && !isLoading && (
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <RefreshCw className="w-3 h-3" />
            Ostatnia synchronizacja: {format(lastSync, 'd MMM yyyy, HH:mm', { locale: pl })}
          </p>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-8 space-y-3">
            <Skeleton className="h-[280px] w-full rounded-md" />
            <p className="text-sm text-muted-foreground">Ładowanie kalendarza...</p>
          </div>
        ) : (
          <>
            <Calendar
              mode="single"
              className="rounded-md border pointer-events-auto"
              disabled={(date) => date < new Date()}
              numberOfMonths={isMobile ? 1 : 2}
              modifiers={{
                booked: (date) => isDateBooked(date),
              }}
              modifiersClassNames={{
                booked: 'bg-destructive/20 text-destructive line-through',
              }}
            />
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-destructive/20 border border-destructive/30" />
                <span className="text-muted-foreground">Zajęte</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-background border" />
                <span className="text-muted-foreground">Dostępne</span>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};
