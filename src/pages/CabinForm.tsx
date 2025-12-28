import { useState, useEffect } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { CabinImage, CABIN_CATEGORIES, CabinCategory, ExtraFee, PREDEFINED_FEES, FeeUnit } from "@/types";
import { createCabin, updateCabin, getCabinById, geocodeAddress, testICalUrl } from "@/services/api";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { LocationPicker } from "@/components/CabinMap";
import { ImageUpload } from "@/components/ImageUpload";
import { CabinFormWizard } from "@/components/CabinFormWizard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import {
  ArrowLeft,
  MapPin,
  Search,
  Loader2,
  Bed,
  Bath,
  Maximize,
  PawPrint,
  CalendarClock,
  CalendarSync,
  CheckCircle2,
  AlertCircle,
  CreditCard,
  Sparkles,
  Info,
  Plus,
  Trash2,
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { motion } from "framer-motion";
import { z } from "zod";

const cabinSchema = z.object({
  title: z.string().min(5, "Tytuł musi mieć co najmniej 5 znaków").max(100),
  description: z.string().min(20, "Opis musi mieć co najmniej 20 znaków").max(2000),
  address: z.string().min(5, "Podaj pełny adres"),
  voivodeship: z.string().min(1, "Wybierz województwo"),
  pricePerNight: z.number().min(1, "Cena musi być większa niż 0"),
  maxGuests: z.number().min(1).max(50),
  minNights: z.number().min(1).max(30),
  latitude: z.number(),
  longitude: z.number(),
});

interface CabinFormProps {
  mode: "add" | "edit";
}

const STEPS = [
  { id: 0, title: "Podstawowe dane", description: "Nazwa, opis, cena i parametry" },
  { id: 1, title: "Lokalizacja i zdjęcia", description: "Adres, mapa i galeria" },
  { id: 2, title: "Dostępność", description: "Kalendarz i synchronizacja" },
  { id: 3, title: "Płatności", description: "Konfiguracja płatności online" },
];

const VOIVODESHIPS = [
  { id: "dolnośląskie", label: "Dolnośląskie" },
  { id: "kujawsko-pomorskie", label: "Kujawsko-pomorskie" },
  { id: "lubelskie", label: "Lubelskie" },
  { id: "lubuskie", label: "Lubuskie" },
  { id: "łódzkie", label: "Łódzkie" },
  { id: "małopolskie", label: "Małopolskie" },
  { id: "mazowieckie", label: "Mazowieckie" },
  { id: "opolskie", label: "Opolskie" },
  { id: "podkarpackie", label: "Podkarpackie" },
  { id: "podlaskie", label: "Podlaskie" },
  { id: "pomorskie", label: "Pomorskie" },
  { id: "śląskie", label: "Śląskie" },
  { id: "świętokrzyskie", label: "Świętokrzyskie" },
  { id: "warmińsko-mazurskie", label: "Warmińsko-mazurskie" },
  { id: "wielkopolskie", label: "Wielkopolskie" },
  { id: "zachodniopomorskie", label: "Zachodniopomorskie" },
];

const AMENITY_OPTIONS = [
  { id: "grill", label: "Grill" },
  { id: "jacuzzi", label: "Jacuzzi / Balia" },
  { id: "sauna", label: "Sauna" },
  { id: "no-neighbors", label: "Brak sąsiadów" },
  { id: "fenced", label: "Szczelne ogrodzenie" },
];

const CabinForm = ({ mode }: CabinFormProps) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();

  const [currentStep, setCurrentStep] = useState(0);
  const [isLoading, setIsLoading] = useState(mode === "edit");
  const [isSaving, setIsSaving] = useState(false);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [isTestingIcal, setIsTestingIcal] = useState(false);
  const [icalTestResult, setIcalTestResult] = useState<{ success: boolean; eventsCount: number; error?: string } | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const DRAFT_STORAGE_KEY = 'cabin-form-draft';

  const getInitialExtraFees = (): ExtraFee[] => {
    return PREDEFINED_FEES.map(fee => ({
      ...fee,
      enabled: false,
    }));
  };

  const getInitialFormData = () => {
    const defaultData = {
      title: "",
      description: "",
      address: "",
      voivodeship: "",
      pricePerNight: 200,
      maxGuests: 4,
      minNights: 2,
      bedrooms: 1,
      bathrooms: 1,
      areaSqm: 30,
      petsAllowed: false,
      latitude: 0,
      longitude: 0,
      images: [] as CabinImage[],
      amenities: [] as string[],
      isFeatured: false,
      lastMinuteDates: [] as Date[],
      lightPollution: 5,
      buildingDensity: 5,
      roadDensity: 5,
      distanceToBuildings: 5,
      externalCalendarNeeded: null as boolean | null,
      externalCalendarDetails: "",
      icalUrl: "",
      onlinePaymentsEnabled: false,
      category: 'domek' as CabinCategory,
      extraFees: getInitialExtraFees(),
      customFees: [] as ExtraFee[],
    };

    if (mode === "add") {
      try {
        const saved = localStorage.getItem(DRAFT_STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          return {
            ...defaultData,
            ...parsed,
            lastMinuteDates: (parsed.lastMinuteDates || []).map((d: string) => new Date(d)),
            extraFees: parsed.extraFees || getInitialExtraFees(),
            customFees: parsed.customFees || [],
          };
        }
      } catch (e) {
        console.error('Failed to load draft:', e);
      }
    }
    return defaultData;
  };

  const [formData, setFormData] = useState(getInitialFormData);
  const [hasDraft, setHasDraft] = useState(() => mode === "add" && !!localStorage.getItem(DRAFT_STORAGE_KEY));

  const [stripeConnectStatus, setStripeConnectStatus] = useState<{
    hasAccount: boolean;
    chargesEnabled: boolean;
  } | null>(null);

  const toggleAmenity = (amenityId: string) => {
    setFormData((prev) => ({
      ...prev,
      amenities: prev.amenities.includes(amenityId)
        ? prev.amenities.filter((id) => id !== amenityId)
        : [...prev.amenities, amenityId],
    }));
  };

  useEffect(() => {
    if (!user) {
      navigate(`/auth?redirectTo=${encodeURIComponent("/host/add-cabin")}`);
      return;
    }

    if (!user.roles.includes("host") && !isAdmin) {
      navigate("/");
      return;
    }

    checkStripeStatus();

    if (mode === "edit" && id) {
      fetchCabin();
    }
  }, [user, navigate, mode, id, isAdmin]);

  // Auto-save draft for add mode
  useEffect(() => {
    if (mode === "add" && formData.title) {
      const dataToSave = {
        ...formData,
        lastMinuteDates: formData.lastMinuteDates.map(d => d.toISOString()),
      };
      localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(dataToSave));
      setHasDraft(true);
    }
  }, [formData, mode]);

  const clearDraft = () => {
    localStorage.removeItem(DRAFT_STORAGE_KEY);
    setHasDraft(false);
    toast({
      title: "Szkic usunięty",
      description: "Twój szkic formularza został usunięty.",
    });
  };

  const checkStripeStatus = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('check-connect-status');
      if (!error && data) {
        setStripeConnectStatus({
          hasAccount: data.hasAccount,
          chargesEnabled: data.chargesEnabled || false,
        });
      }
    } catch (error) {
      console.error('Failed to check Stripe status:', error);
    }
  };

  const fetchCabin = async () => {
    if (!id) return;

    try {
      const cabin = await getCabinById(id);
      if (cabin && (cabin.ownerId === user?.id || isAdmin)) {
        // Merge existing extra fees with predefined structure
        const existingFees = cabin.extraFees || [];
        const predefinedIds = PREDEFINED_FEES.map(f => f.id);
        const mergedFees = PREDEFINED_FEES.map(pf => {
          const existing = existingFees.find(ef => ef.id === pf.id);
          return existing || { ...pf, enabled: false };
        });
        const customFees = existingFees.filter(ef => !predefinedIds.includes(ef.id));

        setFormData({
          title: cabin.title,
          description: cabin.description,
          address: cabin.address,
          voivodeship: cabin.voivodeship || "",
          pricePerNight: cabin.pricePerNight,
          maxGuests: cabin.maxGuests,
          minNights: cabin.minNights,
          bedrooms: cabin.bedrooms,
          bathrooms: cabin.bathrooms,
          areaSqm: cabin.areaSqm,
          petsAllowed: cabin.petsAllowed,
          latitude: cabin.latitude,
          longitude: cabin.longitude,
          images: cabin.images,
          amenities: cabin.amenities,
          isFeatured: cabin.isFeatured || false,
          lastMinuteDates: cabin.lastMinuteDates || [],
          lightPollution: cabin.offGridScore.lightPollution || 5,
          buildingDensity: cabin.offGridScore.buildingDensity || 5,
          roadDensity: cabin.offGridScore.roadDensity || 5,
          distanceToBuildings: cabin.offGridScore.distanceToBuildings || 5,
          externalCalendarNeeded: cabin.externalCalendarNeeded ?? null,
          externalCalendarDetails: cabin.externalCalendarDetails || "",
          icalUrl: cabin.icalUrl || "",
          onlinePaymentsEnabled: (cabin as any).onlinePaymentsEnabled || false,
          category: cabin.category || 'domek',
          extraFees: mergedFees,
          customFees: customFees,
        });
      } else {
        navigate(isAdmin ? "/admin" : "/host/dashboard");
      }
    } catch (error) {
      console.error("Failed to fetch cabin:", error);
      navigate(isAdmin ? "/admin" : "/host/dashboard");
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "number" ? Number(value) : value,
    }));
    setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const handleLocationChange = (location: { lat: number; lng: number }) => {
    setFormData((prev) => ({
      ...prev,
      latitude: location.lat,
      longitude: location.lng,
    }));
  };

  const handleGeocode = async () => {
    if (!formData.address) {
      toast({
        title: "Błąd",
        description: "Wprowadź adres przed wyszukiwaniem.",
        variant: "destructive",
      });
      return;
    }

    setIsGeocoding(true);
    try {
      const result = await geocodeAddress(formData.address);
      if (result) {
        setFormData((prev) => ({
          ...prev,
          latitude: result.latitude,
          longitude: result.longitude,
        }));

        toast({
          title: "Lokalizacja znaleziona",
          description: "Adres został znaleziony na mapie.",
        });
      }
    } catch (error) {
      toast({
        title: "Błąd",
        description: "Nie udało się znaleźć lokalizacji.",
        variant: "destructive",
      });
    } finally {
      setIsGeocoding(false);
    }
  };

  const handleImagesChange = (images: CabinImage[]) => {
    setFormData((prev) => ({ ...prev, images }));
  };

  const handleTestIcal = async () => {
    if (!formData.icalUrl) {
      toast({
        title: "Błąd",
        description: "Wprowadź link do kalendarza iCal.",
        variant: "destructive",
      });
      return;
    }

    setIsTestingIcal(true);
    setIcalTestResult(null);
    
    try {
      const result = await testICalUrl(formData.icalUrl);
      setIcalTestResult(result);
      
      if (result.success) {
        toast({
          title: "Połączono!",
          description: `Znaleziono ${result.eventsCount} rezerwacji w kalendarzu.`,
        });
      } else {
        toast({
          title: "Błąd połączenia",
          description: result.error || "Nie udało się połączyć z kalendarzem.",
          variant: "destructive",
        });
      }
    } catch (error) {
      setIcalTestResult({ success: false, eventsCount: 0, error: "Błąd połączenia" });
      toast({
        title: "Błąd",
        description: "Nie udało się przetestować kalendarza.",
        variant: "destructive",
      });
    } finally {
      setIsTestingIcal(false);
    }
  };

  const validateStep = (step: number): boolean => {
    setErrors({});
    
    if (step === 0) {
      const basicResult = cabinSchema.pick({
        title: true,
        description: true,
        pricePerNight: true,
        maxGuests: true,
        minNights: true,
      }).safeParse(formData);
      
      if (!basicResult.success) {
        const fieldErrors: Record<string, string> = {};
        basicResult.error.errors.forEach((err) => {
          if (err.path[0]) {
            fieldErrors[err.path[0] as string] = err.message;
          }
        });
        setErrors(fieldErrors);
        return false;
      }
    }
    
    if (step === 1) {
      const locationResult = cabinSchema.pick({
        address: true,
        voivodeship: true,
        latitude: true,
        longitude: true,
      }).safeParse(formData);
      
      if (!locationResult.success) {
        const fieldErrors: Record<string, string> = {};
        locationResult.error.errors.forEach((err) => {
          if (err.path[0]) {
            fieldErrors[err.path[0] as string] = err.message;
          }
        });
        setErrors(fieldErrors);
        return false;
      }

      if (formData.latitude === 0 && formData.longitude === 0) {
        setErrors({ location: "Wybierz lokalizację na mapie lub wyszukaj adres." });
        return false;
      }

      if (formData.images.length === 0) {
        toast({
          title: "Uwaga",
          description: "Dodaj przynajmniej jedno zdjęcie.",
          variant: "destructive",
        });
        return false;
      }
    }
    
    return true;
  };

  const handleStepChange = (newStep: number) => {
    if (newStep > currentStep) {
      if (!validateStep(currentStep)) {
        return;
      }
    }
    setCurrentStep(newStep);
  };

  const handleSubmit = async () => {
    if (!validateStep(currentStep)) {
      return;
    }

    setIsSaving(true);
    try {
      // Combine enabled extra fees and custom fees
      const allExtraFees = [
        ...formData.extraFees.filter(f => f.enabled && f.amount > 0),
        ...formData.customFees.filter(f => f.enabled && f.amount > 0),
      ];

      if (mode === "add") {
        await createCabin({
          ...formData,
          ownerId: user!.id,
          ownerEmail: user!.email,
          ownerName: user!.name || "",
          extraFees: allExtraFees,
        });
        // Clear draft after successful creation
        localStorage.removeItem(DRAFT_STORAGE_KEY);
        toast({
          title: "Domek dodany!",
          description: "Twój domek został pomyślnie dodany.",
        });
      } else if (id) {
        await updateCabin(id, {
          ...formData,
          extraFees: allExtraFees,
        });
        toast({
          title: "Domek zaktualizowany!",
          description: "Zmiany zostały zapisane.",
        });
      }
      navigate("/host/dashboard");
    } catch (error) {
      toast({
        title: "Błąd",
        description: "Nie udało się zapisać domku.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const canProceed = () => {
    if (currentStep === 0) {
      return formData.title.length >= 5 && formData.description.length >= 20;
    }
    if (currentStep === 1) {
      return formData.address.length >= 5 && formData.voivodeship && formData.images.length > 0;
    }
    return true;
  };

  if (!user || (!user.roles.includes("host") && !isAdmin)) return null;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container py-8 max-w-4xl">
          <Skeleton className="h-8 w-48 mb-6" />
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className="space-y-6">
            {/* Draft notification */}
            {mode === "add" && hasDraft && (
              <Card className="border-primary/50 bg-primary/5">
                <CardContent className="py-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-primary" />
                    <span className="text-sm font-medium">Twój szkic jest automatycznie zapisywany</span>
                  </div>
                  <Button variant="ghost" size="sm" onClick={clearDraft}>
                    Wyczyść szkic
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Basic Info */}
            <Card>
              <CardHeader>
                <CardTitle>Podstawowe informacje</CardTitle>
                <CardDescription>Wprowadź nazwę, opis i podstawowe parametry domku</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Tytuł</Label>
                  <Input
                    id="title"
                    name="title"
                    value={formData.title}
                    onChange={handleInputChange}
                    placeholder="np. Leśna Chatka w Bieszczadach"
                    className={errors.title ? "border-destructive" : ""}
                  />
                  {errors.title && <p className="text-sm text-destructive">{errors.title}</p>}
                </div>

                <div className="space-y-2">
                  <Label>Typ obiektu</Label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {CABIN_CATEGORIES.map(cat => (
                      <Button
                        key={cat.id}
                        type="button"
                        variant={formData.category === cat.id ? "default" : "outline"}
                        onClick={() => setFormData(prev => ({ ...prev, category: cat.id }))}
                        className="justify-start"
                      >
                        <span className="mr-2">{cat.icon}</span>
                        {cat.label}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Opis</Label>
                  <Textarea
                    id="description"
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    placeholder="Opisz swój domek, jego otoczenie i co czyni go wyjątkowym..."
                    rows={5}
                    className={errors.description ? "border-destructive" : ""}
                  />
                  {errors.description && <p className="text-sm text-destructive">{errors.description}</p>}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="pricePerNight">Cena za noc (zł)</Label>
                    <Input
                      id="pricePerNight"
                      name="pricePerNight"
                      type="number"
                      value={formData.pricePerNight}
                      onChange={handleInputChange}
                      min={1}
                      className={errors.pricePerNight ? "border-destructive" : ""}
                    />
                    {errors.pricePerNight && <p className="text-sm text-destructive">{errors.pricePerNight}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="maxGuests">Max. gości</Label>
                    <Input
                      id="maxGuests"
                      name="maxGuests"
                      type="number"
                      value={formData.maxGuests}
                      onChange={handleInputChange}
                      min={1}
                      max={50}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="minNights">Min. nocy</Label>
                    <Input
                      id="minNights"
                      name="minNights"
                      type="number"
                      value={formData.minNights}
                      onChange={handleInputChange}
                      min={1}
                      max={30}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Bed className="w-4 h-4" />
                      Sypialnie
                    </Label>
                    <Select
                      value={String(formData.bedrooms)}
                      onValueChange={(value) => setFormData((prev) => ({ ...prev, bedrooms: Number(value) }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[1, 2, 3, 4, 5, 6].map((n) => (
                          <SelectItem key={n} value={String(n)}>
                            {n}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Bath className="w-4 h-4" />
                      Łazienki
                    </Label>
                    <Select
                      value={String(formData.bathrooms)}
                      onValueChange={(value) => setFormData((prev) => ({ ...prev, bathrooms: Number(value) }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[1, 2, 3, 4].map((n) => (
                          <SelectItem key={n} value={String(n)}>
                            {n}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Maximize className="w-4 h-4" />
                      Powierzchnia
                    </Label>
                    <Select
                      value={
                        formData.areaSqm <= 30
                          ? "20-30"
                          : formData.areaSqm <= 40
                            ? "30-40"
                            : formData.areaSqm <= 50
                              ? "40-50"
                              : formData.areaSqm <= 60
                                ? "50-60"
                                : "60+"
                      }
                      onValueChange={(value) => {
                        const areaMap: Record<string, number> = {
                          "20-30": 25,
                          "30-40": 35,
                          "40-50": 45,
                          "50-60": 55,
                          "60+": 70,
                        };
                        setFormData((prev) => ({ ...prev, areaSqm: areaMap[value] || 30 }));
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="20-30">20-30 m²</SelectItem>
                        <SelectItem value="30-40">30-40 m²</SelectItem>
                        <SelectItem value="40-50">40-50 m²</SelectItem>
                        <SelectItem value="50-60">50-60 m²</SelectItem>
                        <SelectItem value="60+">60+ m²</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <PawPrint className="w-4 h-4" />
                      Zwierzęta
                    </Label>
                    <div className="flex items-center gap-2 h-10">
                      <Checkbox
                        id="petsAllowed"
                        checked={formData.petsAllowed}
                        onCheckedChange={(checked) =>
                          setFormData((prev) => ({ ...prev, petsAllowed: checked === true }))
                        }
                      />
                      <label htmlFor="petsAllowed" className="text-sm">
                        Dozwolone
                      </label>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Amenities */}
            <Card>
              <CardHeader>
                <CardTitle>Udogodnienia</CardTitle>
                <CardDescription>Zaznacz udogodnienia dostępne w domku</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {AMENITY_OPTIONS.map((amenity) => (
                    <div key={amenity.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`amenity-${amenity.id}`}
                        checked={formData.amenities.includes(amenity.id)}
                        onCheckedChange={() => toggleAmenity(amenity.id)}
                      />
                      <Label htmlFor={`amenity-${amenity.id}`} className="cursor-pointer">
                        {amenity.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Extra Fees */}
            <Card>
              <CardHeader>
                <CardTitle>Dodatkowe opłaty</CardTitle>
                <CardDescription>Określ dodatkowe opłaty, które gość może ponieść podczas rezerwacji</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Predefined fees */}
                {formData.extraFees.map((fee, index) => (
                  <div key={fee.id} className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 rounded-lg bg-muted/30 border border-border">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <Switch
                        id={`fee-${fee.id}`}
                        checked={fee.enabled}
                        onCheckedChange={(checked) => {
                          const newFees = [...formData.extraFees];
                          newFees[index] = { ...fee, enabled: checked };
                          setFormData(prev => ({ ...prev, extraFees: newFees }));
                        }}
                      />
                      <Label htmlFor={`fee-${fee.id}`} className="cursor-pointer font-medium">
                        {fee.name}
                      </Label>
                    </div>
                    {fee.enabled && (
                      <div className="flex items-center gap-2 sm:ml-auto">
                        <Input
                          type="number"
                          value={fee.amount}
                          onChange={(e) => {
                            const newFees = [...formData.extraFees];
                            newFees[index] = { ...fee, amount: Math.max(0, Number(e.target.value)) };
                            setFormData(prev => ({ ...prev, extraFees: newFees }));
                          }}
                          className="w-24"
                          min={0}
                          placeholder="0"
                        />
                        <span className="text-sm text-muted-foreground">zł</span>
                        <Select
                          value={fee.unit}
                          onValueChange={(value: FeeUnit) => {
                            const newFees = [...formData.extraFees];
                            newFees[index] = { ...fee, unit: value };
                            setFormData(prev => ({ ...prev, extraFees: newFees }));
                          }}
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="per_day">za dobę</SelectItem>
                            <SelectItem value="one_time">jednorazowo</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                ))}

                {/* Custom fees */}
                {formData.customFees.map((fee, index) => (
                  <div key={`custom-${index}`} className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 rounded-lg bg-muted/30 border border-border">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <Switch
                        checked={fee.enabled}
                        onCheckedChange={(checked) => {
                          const newFees = [...formData.customFees];
                          newFees[index] = { ...fee, enabled: checked };
                          setFormData(prev => ({ ...prev, customFees: newFees }));
                        }}
                      />
                      <Input
                        value={fee.name}
                        onChange={(e) => {
                          const newFees = [...formData.customFees];
                          newFees[index] = { ...fee, name: e.target.value };
                          setFormData(prev => ({ ...prev, customFees: newFees }));
                        }}
                        placeholder="Nazwa opłaty"
                        className="max-w-48"
                      />
                    </div>
                    {fee.enabled && (
                      <div className="flex items-center gap-2 sm:ml-auto">
                        <Input
                          type="number"
                          value={fee.amount}
                          onChange={(e) => {
                            const newFees = [...formData.customFees];
                            newFees[index] = { ...fee, amount: Math.max(0, Number(e.target.value)) };
                            setFormData(prev => ({ ...prev, customFees: newFees }));
                          }}
                          className="w-24"
                          min={0}
                          placeholder="0"
                        />
                        <span className="text-sm text-muted-foreground">zł</span>
                        <Select
                          value={fee.unit}
                          onValueChange={(value: FeeUnit) => {
                            const newFees = [...formData.customFees];
                            newFees[index] = { ...fee, unit: value };
                            setFormData(prev => ({ ...prev, customFees: newFees }));
                          }}
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="per_day">za dobę</SelectItem>
                            <SelectItem value="one_time">jednorazowo</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            const newFees = formData.customFees.filter((_, i) => i !== index);
                            setFormData(prev => ({ ...prev, customFees: newFees }));
                          }}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    )}
                  </div>
                ))}

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    const newFee: ExtraFee = {
                      id: `custom_${Date.now()}`,
                      name: '',
                      amount: 0,
                      unit: 'one_time',
                      enabled: true,
                    };
                    setFormData(prev => ({ ...prev, customFees: [...prev.customFees, newFee] }));
                  }}
                  className="w-full"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Dodaj własną opłatę
                </Button>
              </CardContent>
            </Card>

            {/* Off-grid analysis */}
            <Card>
              <CardHeader>
                <CardTitle>Analiza NaOdludzie</CardTitle>
                <CardDescription>
                  Oceń każdy aspekt odludzia Twojego domku (1 = blisko cywilizacji, 10 = całkowita izolacja)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">Zanieczyszczenie świetlne</Label>
                    <span className="text-lg font-bold text-primary">{formData.lightPollution}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">1 = dużo sztucznego światła, 10 = ciemne niebo</p>
                  <Slider
                    value={[formData.lightPollution]}
                    onValueChange={(value) => setFormData((prev) => ({ ...prev, lightPollution: value[0] }))}
                    min={1}
                    max={10}
                    step={1}
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">Gęstość zabudowy</Label>
                    <span className="text-lg font-bold text-primary">{formData.buildingDensity}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">1 = gęsta zabudowa, 10 = brak budynków w okolicy</p>
                  <Slider
                    value={[formData.buildingDensity]}
                    onValueChange={(value) => setFormData((prev) => ({ ...prev, buildingDensity: value[0] }))}
                    min={1}
                    max={10}
                    step={1}
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">Gęstość dróg</Label>
                    <span className="text-lg font-bold text-primary">{formData.roadDensity}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">1 = dużo dróg, 10 = brak dróg w pobliżu</p>
                  <Slider
                    value={[formData.roadDensity]}
                    onValueChange={(value) => setFormData((prev) => ({ ...prev, roadDensity: value[0] }))}
                    min={1}
                    max={10}
                    step={1}
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">Odległość od zabudowy</Label>
                    <span className="text-lg font-bold text-primary">{formData.distanceToBuildings}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">1 = bardzo blisko, 10 = kilometrów od sąsiadów</p>
                  <Slider
                    value={[formData.distanceToBuildings]}
                    onValueChange={(value) => setFormData((prev) => ({ ...prev, distanceToBuildings: value[0] }))}
                    min={1}
                    max={10}
                    step={1}
                  />
                </div>

                <div className="p-4 bg-muted/50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Średni wynik NaOdludzie:</span>
                    <span className="text-2xl font-bold text-primary">
                      {Math.round(
                        (formData.lightPollution +
                          formData.buildingDensity +
                          formData.roadDensity +
                          formData.distanceToBuildings) /
                          4,
                      )}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        );

      case 1:
        return (
          <div className="space-y-6">
            {/* Location */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="w-5 h-5" />
                  Lokalizacja
                </CardTitle>
                <CardDescription>
                  Wpisz nazwę miejscowości oraz województwo, np. "Szczepanów, Dolnośląskie"
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="address">Adres</Label>
                    <div className="flex gap-2">
                      <Input
                        id="address"
                        name="address"
                        value={formData.address}
                        onChange={handleInputChange}
                        placeholder="np. Wetlina, Bieszczady"
                        className={errors.address ? "border-destructive" : ""}
                      />
                      <Button type="button" variant="outline" onClick={handleGeocode} disabled={isGeocoding}>
                        {isGeocoding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                      </Button>
                    </div>
                    {errors.address && <p className="text-sm text-destructive">{errors.address}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="voivodeship">Województwo</Label>
                    <Select
                      value={formData.voivodeship}
                      onValueChange={(value) => setFormData((prev) => ({ ...prev, voivodeship: value }))}
                    >
                      <SelectTrigger className={errors.voivodeship ? "border-destructive" : ""}>
                        <SelectValue placeholder="Wybierz województwo" />
                      </SelectTrigger>
                      <SelectContent>
                        {VOIVODESHIPS.map((v) => (
                          <SelectItem key={v.id} value={v.id}>
                            {v.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.voivodeship && <p className="text-sm text-destructive">{errors.voivodeship}</p>}
                  </div>
                </div>

                <LocationPicker
                  value={formData.latitude !== 0 ? { lat: formData.latitude, lng: formData.longitude } : undefined}
                  onChange={handleLocationChange}
                />
                {errors.location && <p className="text-sm text-destructive">{errors.location}</p>}
              </CardContent>
            </Card>

            {/* Images */}
            <Card>
              <CardHeader>
                <CardTitle>Zdjęcia</CardTitle>
                <CardDescription>
                  Dodaj zdjęcia swojego domku (min. 1 zdjęcie wymagane)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ImageUpload
                  images={formData.images}
                  onImagesChange={handleImagesChange}
                  userId={user!.id}
                  maxImages={10}
                />
              </CardContent>
            </Card>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            {/* Last Minute Calendar */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CalendarClock className="w-5 h-5 text-orange-500" />
                  Kalendarz Last Minute
                </CardTitle>
                <CardDescription>
                  Zaznacz daty, które chcesz promować jako oferty last minute z rabatem
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Calendar
                  mode="multiple"
                  selected={formData.lastMinuteDates}
                  onSelect={(dates) => setFormData((prev) => ({ ...prev, lastMinuteDates: dates || [] }))}
                  disabled={(date) => date < new Date()}
                  className="rounded-md border pointer-events-auto"
                  numberOfMonths={2}
                />
                {formData.lastMinuteDates.length > 0 && (
                  <div className="p-3 bg-orange-50 dark:bg-orange-950/30 rounded-lg">
                    <p className="text-sm font-medium text-orange-700 dark:text-orange-400">
                      Wybrane daty last minute: {formData.lastMinuteDates.length}
                    </p>
                    <p className="text-xs text-orange-600/70 dark:text-orange-500/70">
                      Te daty będą wyświetlane w zakładce "Last Minute" na stronie głównej.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* External Calendar Integration */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CalendarSync className="w-5 h-5 text-blue-500" />
                  Synchronizacja kalendarza (iCal)
                </CardTitle>
                <CardDescription>
                  Połącz kalendarz z Booking.com, Airbnb lub innym portalem
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="icalUrl">Link iCal do kalendarza</Label>
                  <div className="flex gap-2">
                    <Input
                      id="icalUrl"
                      name="icalUrl"
                      value={formData.icalUrl}
                      onChange={(e) => {
                        handleInputChange(e);
                        setIcalTestResult(null);
                      }}
                      placeholder="https://admin.booking.com/hotel/.../ical.html?t=..."
                      className="flex-1"
                    />
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={handleTestIcal}
                      disabled={isTestingIcal || !formData.icalUrl}
                    >
                      {isTestingIcal ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <Search className="w-4 h-4 mr-1" />
                          Testuj
                        </>
                      )}
                    </Button>
                  </div>
                  
                  {icalTestResult && (
                    <div className={`p-3 rounded-lg flex items-center gap-2 ${
                      icalTestResult.success 
                        ? 'bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400' 
                        : 'bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400'
                    }`}>
                      {icalTestResult.success ? (
                        <>
                          <CheckCircle2 className="w-4 h-4" />
                          <span className="text-sm">
                            Połączono! Znaleziono {icalTestResult.eventsCount} rezerwacji.
                          </span>
                        </>
                      ) : (
                        <>
                          <AlertCircle className="w-4 h-4" />
                          <span className="text-sm">
                            {icalTestResult.error || 'Nie udało się połączyć.'}
                          </span>
                        </>
                      )}
                    </div>
                  )}
                  
                  <p className="text-xs text-muted-foreground">
                    Wspierane platformy: Booking.com, Airbnb, VRBO, Google Calendar
                  </p>
                </div>

                <div className="border-t pt-4 space-y-3">
                  <Label className="text-sm font-medium">
                    Czy potrzebujesz pomocy z integracją?
                  </Label>
                  <div className="flex gap-4">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="calendarNeededYes"
                        checked={formData.externalCalendarNeeded === true}
                        onCheckedChange={(checked) =>
                          setFormData((prev) => ({
                            ...prev,
                            externalCalendarNeeded: checked ? true : null,
                            externalCalendarDetails: checked ? prev.externalCalendarDetails : "",
                          }))
                        }
                      />
                      <label htmlFor="calendarNeededYes" className="text-sm cursor-pointer">
                        Tak
                      </label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="calendarNeededNo"
                        checked={formData.externalCalendarNeeded === false}
                        onCheckedChange={(checked) =>
                          setFormData((prev) => ({
                            ...prev,
                            externalCalendarNeeded: checked ? false : null,
                            externalCalendarDetails: "",
                          }))
                        }
                      />
                      <label htmlFor="calendarNeededNo" className="text-sm cursor-pointer">
                        Nie
                      </label>
                    </div>
                  </div>
                </div>

                {formData.externalCalendarNeeded === true && (
                  <div className="space-y-2">
                    <Label htmlFor="externalCalendarDetails">Opisz czego potrzebujesz</Label>
                    <Textarea
                      id="externalCalendarDetails"
                      name="externalCalendarDetails"
                      value={formData.externalCalendarDetails}
                      onChange={handleInputChange}
                      placeholder="Opisz z jakim portalem chcesz się zintegrować..."
                      rows={3}
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            {/* Commission Info Box */}
            <Card className="border-2 border-primary/30 bg-gradient-to-r from-primary/5 via-background to-accent/5">
              <CardContent className="pt-6">
                <div className="flex gap-4">
                  <div className="shrink-0">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <Info className="w-6 h-6 text-primary" />
                    </div>
                  </div>
                  <div className="space-y-3">
                    <h3 className="font-semibold text-lg">Informacja o prowizji</h3>
                    <div className="space-y-2 text-sm">
                      <p className="text-muted-foreground">
                        Jeśli <span className="font-medium text-foreground">NIE chcesz</span> przyjmować rezerwacji online przez portal, 
                        nie ponosisz <span className="font-medium text-foreground">żadnych opłat ani prowizji</span>.
                      </p>
                      <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800">
                        <div className="flex items-start gap-2">
                          <Sparkles className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                          <div>
                            <p className="font-medium text-emerald-700 dark:text-emerald-300">
                              Skonfiguruj płatności online!
                            </p>
                            <p className="text-emerald-600 dark:text-emerald-400 text-xs mt-1">
                              Oferty z płatnościami online otrzymują znacznie więcej rezerwacji i badge "POLECANE".
                            </p>
                          </div>
                        </div>
                      </div>
                      <p className="text-muted-foreground">
                        <span className="font-semibold text-foreground">Prowizja 7%</span> pobierana jest tylko wtedy, 
                        gdy poprawnie skonfigurujesz płatności online i gość zapłaci przez portal.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Online Payments */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-emerald-500" />
                  Płatności online
                </CardTitle>
                <CardDescription>
                  Włącz płatności kartą dla gości tego domku
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {stripeConnectStatus?.chargesEnabled ? (
                  <>
                    <div className="flex items-center gap-3">
                      <Checkbox
                        id="onlinePaymentsEnabled"
                        checked={formData.onlinePaymentsEnabled}
                        onCheckedChange={(checked) =>
                          setFormData((prev) => ({ ...prev, onlinePaymentsEnabled: checked === true }))
                        }
                      />
                      <div>
                        <label htmlFor="onlinePaymentsEnabled" className="font-medium cursor-pointer">
                          Włącz płatności online dla tego domku
                        </label>
                        <p className="text-sm text-muted-foreground">
                          Goście będą mogli zapłacić kartą po akceptacji rezerwacji. Koszt obsługi transakcji jest doliczany automatycznie.
                        </p>
                      </div>
                    </div>
                    {formData.onlinePaymentsEnabled && (
                      <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg text-emerald-700 dark:text-emerald-400 text-sm">
                        <CheckCircle2 className="w-4 h-4 inline mr-2" />
                        Płatności online będą dostępne dla tego domku.
                      </div>
                    )}
                  </>
                ) : (
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <p className="text-sm text-muted-foreground mb-3">
                      Aby włączyć płatności online, musisz najpierw skonfigurować konto w zakładce "Płatności" w Panelu Hosta.
                    </p>
                    <Link to="/host/dashboard?tab=payments">
                      <Button variant="outline" size="sm">
                        <CreditCard className="w-4 h-4 mr-2" />
                        Skonfiguruj płatności
                      </Button>
                    </Link>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Summary */}
            <Card>
              <CardHeader>
                <CardTitle>Podsumowanie</CardTitle>
                <CardDescription>Sprawdź wprowadzone dane przed zapisaniem</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Tytuł</p>
                    <p className="font-medium">{formData.title || "—"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Cena za noc</p>
                    <p className="font-medium">{formData.pricePerNight} zł</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Lokalizacja</p>
                    <p className="font-medium">{formData.address || "—"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Zdjęcia</p>
                    <p className="font-medium">{formData.images.length} zdjęć</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Max. gości</p>
                    <p className="font-medium">{formData.maxGuests}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Min. nocy</p>
                    <p className="font-medium">{formData.minNights}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container py-8 max-w-4xl">
        <Button variant="ghost" onClick={() => navigate(isAdmin ? "/admin" : "/host/dashboard")} className="mb-6">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Wróć do panelu
        </Button>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="font-display text-3xl font-bold mb-2">
            {mode === "add" ? "Dodaj nowy domek" : "Edytuj domek"}
          </h1>
          <p className="text-muted-foreground mb-8">
            {mode === "add"
              ? "Wypełnij formularz krok po kroku, aby dodać swój domek."
              : "Zaktualizuj informacje o swoim domku."}
          </p>

          <CabinFormWizard
            steps={STEPS}
            currentStep={currentStep}
            onStepChange={handleStepChange}
            onSubmit={handleSubmit}
            isSubmitting={isSaving}
            canProceed={canProceed()}
            mode={mode}
          >
            {renderStep()}
          </CabinFormWizard>
        </motion.div>
      </main>
    </div>
  );
};

export const AddCabin = () => <CabinForm mode="add" />;
export const EditCabin = () => <CabinForm mode="edit" />;

export default AddCabin;
