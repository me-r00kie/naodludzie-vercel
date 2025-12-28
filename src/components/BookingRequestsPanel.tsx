import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { 
  Calendar, 
  Users, 
  CheckCircle, 
  XCircle, 
  Clock,
  MessageSquare,
  Mail,
  Phone,
  User,
  MessageCircle
} from 'lucide-react';
import { motion } from 'framer-motion';
import ChatWindow from './ChatWindow';

interface BookingRequest {
  id: string;
  cabin_id: string;
  guest_id: string;
  start_date: string;
  end_date: string;
  guests_count: number;
  message: string | null;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  cabins?: { title: string };
  profiles?: { email: string; name: string | null; phone: string | null };
}

export const BookingRequestsPanel = () => {
  const { user } = useAuth();
  const [requests, setRequests] = useState<BookingRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hostComments, setHostComments] = useState<Record<string, string>>({});
  const [activeChatRequestId, setActiveChatRequestId] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchRequests();
    }
  }, [user]);

  const fetchRequests = async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      // Fetch booking requests for host's cabins
      const { data: requestsData, error } = await supabase
        .from('booking_requests')
        .select('*')
        .eq('host_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (!requestsData || requestsData.length === 0) {
        setRequests([]);
        setIsLoading(false);
        return;
      }

      // Get cabin and guest info
      const cabinIds = [...new Set(requestsData.map(r => r.cabin_id))];
      const guestIds = [...new Set(requestsData.map(r => r.guest_id))];

      const [cabinsRes, profilesRes] = await Promise.all([
        supabase.from('cabins').select('id, title').in('id', cabinIds),
        supabase.from('profiles').select('id, email, name, phone').in('id', guestIds)
      ]);

      const cabinsMap = new Map((cabinsRes.data || []).map(c => [c.id, { title: c.title }]));
      const profilesMap = new Map((profilesRes.data || []).map(p => [p.id, { email: p.email, name: p.name, phone: p.phone }]));

      const enrichedRequests = requestsData.map(req => ({
        ...req,
        cabins: cabinsMap.get(req.cabin_id),
        profiles: profilesMap.get(req.guest_id)
      }));

      setRequests(enrichedRequests);
    } catch (error) {
      console.error('Failed to fetch booking requests:', error);
      toast({
        title: 'Błąd',
        description: 'Nie udało się pobrać rezerwacji.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const updateRequestStatus = async (requestId: string, status: 'approved' | 'rejected') => {
    try {
      const request = requests.find(r => r.id === requestId);
      const hostComment = hostComments[requestId] || '';
      
      const { error } = await supabase
        .from('booking_requests')
        .update({ status })
        .eq('id', requestId);

      if (error) throw error;

      setRequests(prev => prev.map(r => 
        r.id === requestId ? { ...r, status } : r
      ));

      // Send email notification to guest
      if (request?.profiles?.email) {
        try {
          await supabase.functions.invoke('send-booking-request-email', {
            body: {
              guestEmail: request.profiles.email,
              guestName: request.profiles.name || '',
              cabinTitle: request.cabins?.title || '',
              startDate: request.start_date,
              endDate: request.end_date,
              status: status,
              hostComment: hostComment
            }
          });
        } catch (emailError) {
          console.error('Failed to send booking email:', emailError);
        }
      }

      // Clear the comment after sending
      setHostComments(prev => {
        const newComments = { ...prev };
        delete newComments[requestId];
        return newComments;
      });

      toast({
        title: status === 'approved' ? 'Rezerwacja zaakceptowana!' : 'Rezerwacja odrzucona',
        description: status === 'approved' 
          ? 'Gość został powiadomiony o akceptacji.'
          : 'Gość został powiadomiony o odrzuceniu.',
      });
    } catch (error) {
      toast({
        title: 'Błąd',
        description: 'Nie udało się zaktualizować rezerwacji.',
        variant: 'destructive',
      });
    }
  };

  const pendingCount = requests.filter(r => r.status === 'pending').length;
  const approvedCount = requests.filter(r => r.status === 'approved').length;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <Badge variant="outline" className="text-amber-500 border-amber-500">
            <Clock className="w-3 h-3 mr-1" />
            Oczekuje
          </Badge>
        );
      case 'approved':
        return (
          <Badge variant="outline" className="text-green-500 border-green-500">
            <CheckCircle className="w-3 h-3 mr-1" />
            Zaakceptowana
          </Badge>
        );
      case 'rejected':
        return (
          <Badge variant="outline" className="text-red-500 border-red-500">
            <XCircle className="w-3 h-3 mr-1" />
            Odrzucona
          </Badge>
        );
      default:
        return null;
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Prośby o rezerwację</CardTitle>
          <div className="flex gap-2">
            <Badge variant="secondary">
              <Clock className="w-3 h-3 mr-1" />
              {pendingCount} oczekujących
            </Badge>
            <Badge variant="secondary" className="text-green-600">
              <CheckCircle className="w-3 h-3 mr-1" />
              {approvedCount} zaakceptowanych
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
        ) : requests.length > 0 ? (
          <div className="space-y-4">
            {requests.map((request, index) => (
              <motion.div
                key={request.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors"
              >
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-semibold">{request.cabins?.title || 'Domek'}</h4>
                        {getStatusBadge(request.status)}
                      </div>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4" />
                          <span>
                            {format(new Date(request.start_date), 'd MMM', { locale: pl })} - {format(new Date(request.end_date), 'd MMM yyyy', { locale: pl })}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4" />
                          <span>{request.guests_count} gości</span>
                        </div>
                      </div>
                      
                      {/* Guest information section */}
                      <div className="mt-3 p-3 bg-muted/30 rounded-lg border border-border/50">
                        <h5 className="text-sm font-medium mb-2 flex items-center gap-2">
                          <User className="w-4 h-4" />
                          Informacje o gościu
                        </h5>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                          {request.profiles?.name && (
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <User className="w-3 h-3" />
                              <span>{request.profiles.name}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Mail className="w-3 h-3" />
                            <span>{request.profiles?.email || 'Brak email'}</span>
                          </div>
                          {request.profiles?.phone && (
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Phone className="w-3 h-3" />
                              <span>{request.profiles.phone}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {request.message && (
                        <div className="mt-3 p-3 bg-primary/5 rounded-lg border border-primary/20">
                          <div className="flex items-start gap-2">
                            <MessageSquare className="w-4 h-4 mt-0.5 text-primary" />
                            <div>
                              <p className="text-xs font-medium text-primary mb-1">Wiadomość od gościa:</p>
                              <p className="text-sm">{request.message}</p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {request.status === 'pending' && (
                    <div className="border-t border-border pt-4">
                      <div className="mb-3">
                        <label className="text-sm font-medium mb-2 block">
                          Komentarz dla gościa (opcjonalny)
                        </label>
                        <Textarea
                          placeholder="Wpisz komentarz lub powód odrzucenia..."
                          value={hostComments[request.id] || ''}
                          onChange={(e) => setHostComments(prev => ({
                            ...prev,
                            [request.id]: e.target.value
                          }))}
                          className="resize-none"
                          rows={2}
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => updateRequestStatus(request.id, 'approved')}
                        >
                          <CheckCircle className="w-4 h-4 mr-1" />
                          Akceptuj
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => updateRequestStatus(request.id, 'rejected')}
                        >
                          <XCircle className="w-4 h-4 mr-1" />
                          Odrzuć
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Chat section for approved bookings */}
                  {request.status === 'approved' && (
                    <div className="border-t border-border pt-4">
                      {activeChatRequestId === request.id ? (
                        <ChatWindow 
                          bookingRequestId={request.id}
                          otherUserName={request.profiles?.name || request.profiles?.email}
                          onClose={() => setActiveChatRequestId(null)}
                        />
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setActiveChatRequestId(request.id)}
                          className="gap-2"
                        >
                          <MessageCircle className="w-4 h-4" />
                          Otwórz chat z gościem
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Brak rezerwacji</h3>
            <p className="text-muted-foreground">
              Nie masz jeszcze żadnych próśb o rezerwację.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};