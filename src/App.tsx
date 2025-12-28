import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HashRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";

// Lazy load ALL pages for better code splitting
const Index = lazy(() => import("./pages/Index"));
const CabinDetail = lazy(() => import("./pages/CabinDetail"));
const Auth = lazy(() => import("./pages/Auth"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const HostDashboard = lazy(() => import("./pages/HostDashboard"));
const HostOnboarding = lazy(() => import("./pages/HostOnboarding"));
const HostTerms = lazy(() => import("./pages/HostTerms"));
const AddCabin = lazy(() => import("./pages/CabinForm").then(m => ({ default: m.AddCabin })));
const EditCabin = lazy(() => import("./pages/CabinForm").then(m => ({ default: m.EditCabin })));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const NotFound = lazy(() => import("./pages/NotFound"));
const ForHosts = lazy(() => import("./pages/ForHosts"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const Terms = lazy(() => import("./pages/Terms"));
const Contact = lazy(() => import("./pages/Contact"));
const FAQ = lazy(() => import("./pages/FAQ"));
const BookingSuccess = lazy(() => import("./pages/BookingSuccess"));
const BookingCanceled = lazy(() => import("./pages/BookingCanceled"));
const GuestDashboard = lazy(() => import("./pages/GuestDashboard"));

const queryClient = new QueryClient();

// Simple loading fallback
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <HashRouter>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/cabin/:slug" element={<CabinDetail />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/host/dashboard" element={<HostDashboard />} />
              <Route path="/host/onboarding" element={<HostOnboarding />} />
              <Route path="/host/add-cabin" element={<AddCabin />} />
              <Route path="/host/edit-cabin/:id" element={<EditCabin />} />
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/dla-wystawcow" element={<ForHosts />} />
              <Route path="/polityka-prywatnosci" element={<PrivacyPolicy />} />
              <Route path="/regulamin" element={<Terms />} />
              <Route path="/regulamin-platnosci" element={<HostTerms />} />
              <Route path="/kontakt" element={<Contact />} />
              <Route path="/faq" element={<FAQ />} />
              <Route path="/booking-success" element={<BookingSuccess />} />
              <Route path="/booking-canceled" element={<BookingCanceled />} />
              <Route path="/my-bookings" element={<GuestDashboard />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </HashRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
