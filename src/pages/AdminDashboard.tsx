import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { toast } from '@/hooks/use-toast';
import { 
  Shield, 
  Home,
  Clock,
  CheckCircle,
  XCircle,
  Star,
  MapPin,
  AlertTriangle,
  Edit,
  MessageSquare,
  TrendingUp,
  Calendar,
  Banknote
} from 'lucide-react';
import { motion } from 'framer-motion';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { pl } from 'date-fns/locale';

interface CabinData {
  id: string;
  slug: string;
  title: string;
  address: string;
  price_per_night: number;
  status: 'pending' | 'active' | 'rejected';
  is_featured: boolean;
  created_at: string;
  owner_id: string;
  verification_transfer_sent?: boolean;
  manual_payment_verified?: boolean;
  online_payments_enabled?: boolean;
  profiles?: { email: string; name: string | null };
}

interface BookingStats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  last7Days: number;
  last30Days: number;
  recentRequests: {
    id: string;
    created_at: string;
    status: 'pending' | 'approved' | 'rejected';
    cabin_title: string;
    guest_email: string;
  }[];
}

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { user, isAdmin, isLoading: authLoading } = useAuth();
  
  const [cabins, setCabins] = useState<CabinData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('pending');
  const [bookingStats, setBookingStats] = useState<BookingStats | null>(null);

  useEffect(() => {
    if (!authLoading && !isAdmin) {
      navigate('/');
      return;
    }
    
    if (isAdmin) {
      fetchCabins();
      fetchBookingStats();
    }
  }, [isAdmin, authLoading, navigate]);

  const fetchBookingStats = async () => {
    try {
      const now = new Date();
      const sevenDaysAgo = subDays(now, 7).toISOString();
      const thirtyDaysAgo = subDays(now, 30).toISOString();

      // Fetch all booking requests
      const { data: allRequests, error: allError } = await supabase
        .from('booking_requests')
        .select('id, status, created_at, cabin_id, guest_id');

      if (allError) throw allError;

      // Fetch recent requests with cabin and guest info
      const { data: recentData, error: recentError } = await supabase
        .from('booking_requests')
        .select('id, status, created_at, cabin_id, guest_id')
        .order('created_at', { ascending: false })
        .limit(10);

      if (recentError) throw recentError;

      // Get cabin titles for recent requests
      const cabinIds = [...new Set((recentData || []).map(r => r.cabin_id))];
      const guestIds = [...new Set((recentData || []).map(r => r.guest_id))];

      const [cabinsResult, guestsResult] = await Promise.all([
        supabase.from('cabins').select('id, title').in('id', cabinIds),
        supabase.from('profiles').select('id, email').in('id', guestIds)
      ]);

      const cabinMap = new Map((cabinsResult.data || []).map(c => [c.id, c.title]));
      const guestMap = new Map((guestsResult.data || []).map(g => [g.id, g.email]));

      const requests = allRequests || [];
      const stats: BookingStats = {
        total: requests.length,
        pending: requests.filter(r => r.status === 'pending').length,
        approved: requests.filter(r => r.status === 'approved').length,
        rejected: requests.filter(r => r.status === 'rejected').length,
        last7Days: requests.filter(r => r.created_at >= sevenDaysAgo).length,
        last30Days: requests.filter(r => r.created_at >= thirtyDaysAgo).length,
        recentRequests: (recentData || []).map(r => ({
          id: r.id,
          created_at: r.created_at,
          status: r.status as 'pending' | 'approved' | 'rejected',
          cabin_title: cabinMap.get(r.cabin_id) || 'Nieznany domek',
          guest_email: guestMap.get(r.guest_id) || 'Nieznany gość'
        }))
      };

      setBookingStats(stats);
    } catch (error) {
      console.error('Failed to fetch booking stats:', error);
    }
  };

  const fetchCabins = async () => {
    setIsLoading(true);
    try {
      // First fetch cabins
      const { data: cabinsData, error: cabinsError } = await supabase
        .from('cabins')
        .select(`
          id,
          slug,
          title,
          address,
          price_per_night,
          status,
          is_featured,
          created_at,
          owner_id,
          verification_transfer_sent,
          manual_payment_verified,
          online_payments_enabled
        `)
        .order('created_at', { ascending: false });

      if (cabinsError) throw cabinsError;

      // Get unique owner IDs
      const ownerIds = [...new Set((cabinsData || []).map(c => c.owner_id))];
      
      // Fetch profiles for all owners
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, email, name')
        .in('id', ownerIds);

      // Create a map of owner_id to profile
      const profilesMap = new Map(
        (profilesData || []).map(p => [p.id, { email: p.email, name: p.name }])
      );

      // Transform data to match our interface
      const transformedData = (cabinsData || []).map(cabin => ({
        ...cabin,
        profiles: profilesMap.get(cabin.owner_id) || undefined
      }));
      
      setCabins(transformedData);
    } catch (error) {
      console.error('Failed to fetch cabins:', error);
      toast({
        title: 'Błąd',
        description: 'Nie udało się pobrać domków.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const updateCabinStatus = async (cabinId: string, status: 'active' | 'rejected') => {
    try {
      const cabin = cabins.find(c => c.id === cabinId);
      
      const { error } = await supabase
        .from('cabins')
        .update({ status })
        .eq('id', cabinId);

      if (error) throw error;

      setCabins(prev => prev.map(c => 
        c.id === cabinId ? { ...c, status } : c
      ));

      // Send email notification to host
      if (cabin?.profiles?.email) {
        try {
          await supabase.functions.invoke('send-cabin-status-email', {
            body: {
              hostEmail: cabin.profiles.email,
              hostName: cabin.profiles.name || '',
              cabinTitle: cabin.title,
              status: status
            }
          });
          console.log('Status notification email sent');
        } catch (emailError) {
          console.error('Failed to send status email:', emailError);
        }
      }

      toast({
        title: status === 'active' ? 'Domek aktywowany!' : 'Domek odrzucony',
        description: status === 'active' 
          ? 'Domek jest teraz widoczny dla gości. Host został powiadomiony.'
          : 'Domek został odrzucony. Host został powiadomiony.',
      });
    } catch (error) {
      toast({
        title: 'Błąd',
        description: 'Nie udało się zaktualizować statusu.',
        variant: 'destructive',
      });
    }
  };

  const toggleFeatured = async (cabinId: string, isFeatured: boolean) => {
    try {
      const { error } = await supabase
        .from('cabins')
        .update({ is_featured: isFeatured })
        .eq('id', cabinId);

      if (error) throw error;

      setCabins(prev => prev.map(c => 
        c.id === cabinId ? { ...c, is_featured: isFeatured } : c
      ));

      toast({
        title: isFeatured ? 'Oznaczono jako polecane!' : 'Usunięto z polecanych',
      });
    } catch (error) {
      toast({
        title: 'Błąd',
        description: 'Nie udało się zaktualizować statusu.',
        variant: 'destructive',
      });
    }
  };

  const approveManualPayment = async (cabinId: string) => {
    try {
      const cabin = cabins.find(c => c.id === cabinId);
      
      const { error } = await supabase
        .from('cabins')
        .update({ 
          manual_payment_verified: true,
          online_payments_enabled: true
        })
        .eq('id', cabinId);

      if (error) throw error;

      setCabins(prev => prev.map(c => 
        c.id === cabinId ? { ...c, manual_payment_verified: true, online_payments_enabled: true } : c
      ));

      // Send email notification to host
      if (cabin?.profiles?.email) {
        try {
          await supabase.functions.invoke('notify-payment-verified', {
            body: {
              hostEmail: cabin.profiles.email,
              hostName: cabin.profiles.name || '',
              cabinTitle: cabin.title
            }
          });
          console.log('Payment verified notification email sent');
        } catch (emailError) {
          console.error('Failed to send payment verified email:', emailError);
        }
      }

      toast({
        title: 'Płatności aktywowane!',
        description: 'Przelew weryfikacyjny został zatwierdzony. Host został powiadomiony.',
      });
    } catch (error) {
      toast({
        title: 'Błąd',
        description: 'Nie udało się zatwierdzić weryfikacji.',
        variant: 'destructive',
      });
    }
  };

  // Get cabins awaiting verification
  const pendingVerification = cabins.filter(
    c => c.verification_transfer_sent && !c.manual_payment_verified
  );

  const filteredCabins = cabins.filter(cabin => {
    if (activeTab === 'pending') return cabin.status === 'pending';
    if (activeTab === 'active') return cabin.status === 'active';
    if (activeTab === 'rejected') return cabin.status === 'rejected';
    if (activeTab === 'featured') return cabin.is_featured;
    return true;
  });

  const counts = {
    pending: cabins.filter(c => c.status === 'pending').length,
    active: cabins.filter(c => c.status === 'active').length,
    rejected: cabins.filter(c => c.status === 'rejected').length,
    featured: cabins.filter(c => c.is_featured).length,
  };

  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container py-8">
          <Skeleton className="h-8 w-64 mb-8" />
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  if (!isAdmin) return null;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container py-8">
        <div className="flex items-center gap-4 mb-8">
          <div className="w-12 h-12 rounded-lg bg-destructive/10 flex items-center justify-center">
            <Shield className="w-6 h-6 text-destructive" />
          </div>
          <div>
            <h1 className="font-display text-3xl font-bold">Panel Administratora</h1>
            <p className="text-muted-foreground">Zarządzaj ofertami i moderuj treści</p>
          </div>
        </div>

        {/* Cabin Stats */}
        <h2 className="text-lg font-semibold mb-4">Statystyki domków</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-amber-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{counts.pending}</p>
                  <p className="text-sm text-muted-foreground">Oczekujące</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{counts.active}</p>
                  <p className="text-sm text-muted-foreground">Aktywne</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center">
                  <XCircle className="w-5 h-5 text-red-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{counts.rejected}</p>
                  <p className="text-sm text-muted-foreground">Odrzucone</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Star className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{counts.featured}</p>
                  <p className="text-sm text-muted-foreground">Polecane</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Booking Request Stats */}
        <h2 className="text-lg font-semibold mb-4">Statystyki zapytań rezerwacyjnych</h2>
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <MessageSquare className="w-5 h-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{bookingStats?.total || 0}</p>
                  <p className="text-sm text-muted-foreground">Wszystkie</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-amber-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{bookingStats?.pending || 0}</p>
                  <p className="text-sm text-muted-foreground">Oczekujące</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{bookingStats?.approved || 0}</p>
                  <p className="text-sm text-muted-foreground">Zaakceptowane</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center">
                  <XCircle className="w-5 h-5 text-red-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{bookingStats?.rejected || 0}</p>
                  <p className="text-sm text-muted-foreground">Odrzucone</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-purple-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{bookingStats?.last7Days || 0}</p>
                  <p className="text-sm text-muted-foreground">Ostatnie 7 dni</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-cyan-500/10 flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-cyan-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{bookingStats?.last30Days || 0}</p>
                  <p className="text-sm text-muted-foreground">Ostatnie 30 dni</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Booking Requests */}
        {bookingStats && bookingStats.recentRequests.length > 0 && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="text-lg">Ostatnie zapytania rezerwacyjne</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {bookingStats.recentRequests.map((request) => (
                  <div
                    key={request.id}
                    className="flex items-center justify-between p-3 rounded-lg border border-border"
                  >
                    <div className="flex-1">
                      <p className="font-medium">{request.cabin_title}</p>
                      <p className="text-sm text-muted-foreground">{request.guest_email}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge 
                        variant={
                          request.status === 'approved' ? 'default' : 
                          request.status === 'rejected' ? 'destructive' : 'secondary'
                        }
                      >
                        {request.status === 'pending' && 'Oczekuje'}
                        {request.status === 'approved' && 'Zaakceptowane'}
                        {request.status === 'rejected' && 'Odrzucone'}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {format(new Date(request.created_at), 'd MMM yyyy', { locale: pl })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Pending Payment Verifications */}
        {pendingVerification.length > 0 && (
          <Card className="mb-8 border-amber-500/30">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
                  <Banknote className="w-5 h-5 text-amber-500" />
                </div>
                <div>
                  <CardTitle className="text-lg">Oczekujące weryfikacje przelewów</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Hosty oczekujący na zatwierdzenie przelewu weryfikacyjnego 1 zł
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {pendingVerification.map((cabin) => (
                  <div
                    key={cabin.id}
                    className="flex items-center justify-between p-4 rounded-lg border border-amber-500/30 bg-amber-500/5"
                  >
                    <div className="flex-1">
                      <p className="font-medium">{cabin.title}</p>
                      <p className="text-sm text-muted-foreground">
                        Host: {cabin.profiles?.name || cabin.profiles?.email || 'Nieznany'}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Tytuł przelewu: Przelew weryfikacyjny {cabin.title}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className="text-amber-600 border-amber-500">
                        <Clock className="w-3 h-3 mr-1" />
                        Oczekuje
                      </Badge>
                      <Button
                        size="sm"
                        onClick={() => approveManualPayment(cabin.id)}
                      >
                        <CheckCircle className="w-4 h-4 mr-1" />
                        Zatwierdź
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Cabins List */}
        <Card>
          <CardHeader>
            <CardTitle>Oferty domków</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="mb-6">
                <TabsTrigger value="pending" className="gap-2">
                  <Clock className="w-4 h-4" />
                  Oczekujące
                  {counts.pending > 0 && (
                    <Badge variant="secondary" className="ml-1">{counts.pending}</Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="active" className="gap-2">
                  <CheckCircle className="w-4 h-4" />
                  Aktywne
                </TabsTrigger>
                <TabsTrigger value="rejected" className="gap-2">
                  <XCircle className="w-4 h-4" />
                  Odrzucone
                </TabsTrigger>
                <TabsTrigger value="featured" className="gap-2">
                  <Star className="w-4 h-4" />
                  Polecane
                </TabsTrigger>
              </TabsList>

              <TabsContent value={activeTab}>
                {isLoading ? (
                  <div className="space-y-4">
                    {[...Array(3)].map((_, i) => (
                      <Skeleton key={i} className="h-20" />
                    ))}
                  </div>
                ) : filteredCabins.length > 0 ? (
                  <div className="space-y-4">
                    {filteredCabins.map((cabin, index) => (
                      <motion.div
                        key={cabin.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Link to={`/cabin/${cabin.slug}`} className="font-semibold hover:underline">
                              {cabin.title}
                            </Link>
                            {cabin.status === 'pending' && (
                              <Badge variant="outline" className="text-amber-500 border-amber-500">
                                <Clock className="w-3 h-3 mr-1" />
                                Oczekuje
                              </Badge>
                            )}
                            {cabin.is_featured && (
                              <Badge className="bg-primary">
                                <Star className="w-3 h-3 mr-1" />
                                Polecane
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <MapPin className="w-4 h-4" />
                            <span>{cabin.address}</span>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            Host: {cabin.profiles?.name || cabin.profiles?.email || 'Nieznany'}
                          </p>
                          <p className="text-sm font-medium mt-1">{cabin.price_per_night} zł/noc</p>
                        </div>

                        <div className="flex items-center gap-4">
                          {/* Edit Button */}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => navigate(`/host/edit-cabin/${cabin.id}`)}
                          >
                            <Edit className="w-4 h-4 mr-1" />
                            Edytuj
                          </Button>

                          {/* Featured Toggle */}
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-muted-foreground">Polecane:</span>
                            <Switch
                              checked={cabin.is_featured}
                              onCheckedChange={(checked) => toggleFeatured(cabin.id, checked)}
                            />
                          </div>

                          {/* Status Actions */}
                          {cabin.status === 'pending' && (
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="default"
                                onClick={() => updateCabinStatus(cabin.id, 'active')}
                              >
                                <CheckCircle className="w-4 h-4 mr-1" />
                                Aktywuj
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => updateCabinStatus(cabin.id, 'rejected')}
                              >
                                <XCircle className="w-4 h-4 mr-1" />
                                Odrzuć
                              </Button>
                            </div>
                          )}
                          {cabin.status === 'rejected' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updateCabinStatus(cabin.id, 'active')}
                            >
                              <CheckCircle className="w-4 h-4 mr-1" />
                              Przywróć
                            </Button>
                          )}
                          {cabin.status === 'active' && (
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-green-500 border-green-500">
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Aktywna
                              </Badge>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => updateCabinStatus(cabin.id, 'rejected')}
                              >
                                <AlertTriangle className="w-4 h-4 mr-1" />
                                Dezaktywuj
                              </Button>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Home className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">Brak domków</h3>
                    <p className="text-muted-foreground">
                      {activeTab === 'pending' && 'Brak ofert oczekujących na akceptację.'}
                      {activeTab === 'active' && 'Brak aktywnych ofert.'}
                      {activeTab === 'rejected' && 'Brak odrzuconych ofert.'}
                      {activeTab === 'featured' && 'Brak polecanych ofert.'}
                    </p>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default AdminDashboard;
