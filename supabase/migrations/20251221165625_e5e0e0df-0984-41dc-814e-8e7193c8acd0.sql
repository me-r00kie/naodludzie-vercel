-- Create table for host Stripe Connect accounts
CREATE TABLE public.host_stripe_accounts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  stripe_account_id TEXT,
  account_type TEXT CHECK (account_type IN ('individual', 'company')),
  business_name TEXT,
  onboarding_completed BOOLEAN DEFAULT false,
  charges_enabled BOOLEAN DEFAULT false,
  payouts_enabled BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.host_stripe_accounts ENABLE ROW LEVEL SECURITY;

-- Policies for host_stripe_accounts
CREATE POLICY "Hosts can view own Stripe account"
ON public.host_stripe_accounts
FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Hosts can insert own Stripe account"
ON public.host_stripe_accounts
FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Hosts can update own Stripe account"
ON public.host_stripe_accounts
FOR UPDATE
USING (user_id = auth.uid());

CREATE POLICY "Admins can view all Stripe accounts"
ON public.host_stripe_accounts
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add online payments field to cabins
ALTER TABLE public.cabins
ADD COLUMN online_payments_enabled BOOLEAN DEFAULT false;

-- Create trigger for updated_at
CREATE TRIGGER update_host_stripe_accounts_updated_at
BEFORE UPDATE ON public.host_stripe_accounts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();