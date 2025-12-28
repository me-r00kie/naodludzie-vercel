-- Create messages table for host-guest chat
CREATE TABLE public.chat_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_request_id UUID NOT NULL REFERENCES public.booking_requests(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view messages for their booking requests
CREATE POLICY "Users can view messages for their bookings"
ON public.chat_messages
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.booking_requests br
    WHERE br.id = chat_messages.booking_request_id
    AND (br.guest_id = auth.uid() OR br.host_id = auth.uid())
  )
);

-- Policy: Users can insert messages for their booking requests
CREATE POLICY "Users can send messages for their bookings"
ON public.chat_messages
FOR INSERT
WITH CHECK (
  sender_id = auth.uid() AND
  EXISTS (
    SELECT 1 FROM public.booking_requests br
    WHERE br.id = chat_messages.booking_request_id
    AND (br.guest_id = auth.uid() OR br.host_id = auth.uid())
  )
);

-- Enable realtime for chat messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;

-- Create index for faster queries
CREATE INDEX idx_chat_messages_booking ON public.chat_messages(booking_request_id, created_at);