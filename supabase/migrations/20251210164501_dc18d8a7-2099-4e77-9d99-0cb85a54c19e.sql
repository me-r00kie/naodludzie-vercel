-- Create enum for user roles
CREATE TYPE public.app_role AS ENUM ('admin', 'host', 'guest');

-- Create enum for booking request status
CREATE TYPE public.booking_request_status AS ENUM ('pending', 'approved', 'rejected');

-- Create enum for cabin status
CREATE TYPE public.cabin_status AS ENUM ('pending', 'active', 'rejected');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user_roles table (separate from profiles for security)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);

-- Create cabins table
CREATE TABLE public.cabins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  address TEXT NOT NULL,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  price_per_night DECIMAL(10,2) NOT NULL,
  max_guests INTEGER NOT NULL DEFAULT 2,
  min_nights INTEGER NOT NULL DEFAULT 1,
  bedrooms INTEGER NOT NULL DEFAULT 1,
  bathrooms INTEGER NOT NULL DEFAULT 1,
  area_sqm INTEGER,
  pets_allowed BOOLEAN NOT NULL DEFAULT false,
  images JSONB DEFAULT '[]'::jsonb,
  amenities TEXT[] DEFAULT '{}',
  off_grid_score JSONB,
  status cabin_status NOT NULL DEFAULT 'pending',
  is_featured BOOLEAN NOT NULL DEFAULT false,
  last_minute_dates DATE[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create booking_requests table
CREATE TABLE public.booking_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cabin_id UUID NOT NULL REFERENCES public.cabins(id) ON DELETE CASCADE,
  guest_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  host_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  guests_count INTEGER NOT NULL DEFAULT 1,
  message TEXT,
  status booking_request_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cabins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_requests ENABLE ROW LEVEL SECURITY;

-- Security definer function to check user roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Profiles policies
CREATE POLICY "Users can view all profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid());

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());

-- User roles policies (only admins can manage roles)
CREATE POLICY "Users can view own roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage roles"
  ON public.user_roles FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Cabins policies
CREATE POLICY "Anyone can view active cabins"
  ON public.cabins FOR SELECT
  USING (status = 'active');

CREATE POLICY "Hosts can view own cabins"
  ON public.cabins FOR SELECT
  TO authenticated
  USING (owner_id = auth.uid());

CREATE POLICY "Admins can view all cabins"
  ON public.cabins FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Hosts can insert own cabins"
  ON public.cabins FOR INSERT
  TO authenticated
  WITH CHECK (owner_id = auth.uid() AND public.has_role(auth.uid(), 'host'));

CREATE POLICY "Hosts can update own cabins"
  ON public.cabins FOR UPDATE
  TO authenticated
  USING (owner_id = auth.uid());

CREATE POLICY "Admins can update all cabins"
  ON public.cabins FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Hosts can delete own cabins"
  ON public.cabins FOR DELETE
  TO authenticated
  USING (owner_id = auth.uid());

-- Booking requests policies
CREATE POLICY "Guests can view own requests"
  ON public.booking_requests FOR SELECT
  TO authenticated
  USING (guest_id = auth.uid());

CREATE POLICY "Hosts can view requests for their cabins"
  ON public.booking_requests FOR SELECT
  TO authenticated
  USING (host_id = auth.uid());

CREATE POLICY "Guests can create requests"
  ON public.booking_requests FOR INSERT
  TO authenticated
  WITH CHECK (guest_id = auth.uid());

CREATE POLICY "Hosts can update requests for their cabins"
  ON public.booking_requests FOR UPDATE
  TO authenticated
  USING (host_id = auth.uid());

-- Trigger to create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'name', '')
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_cabins_updated_at
  BEFORE UPDATE ON public.cabins
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_booking_requests_updated_at
  BEFORE UPDATE ON public.booking_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for booking_requests
ALTER PUBLICATION supabase_realtime ADD TABLE public.booking_requests;