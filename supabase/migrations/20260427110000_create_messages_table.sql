-- ============================================================================
-- Migration: messages tabela za chat
-- ============================================================================

CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  trainer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  sender_role TEXT NOT NULL CHECK (sender_role IN ('client', 'trainer')),
  body TEXT NOT NULL CHECK (length(body) > 0 AND length(body) <= 2000),
  read_at_by_client TIMESTAMP WITH TIME ZONE,
  read_at_by_trainer TIMESTAMP WITH TIME ZONE,
  attachment_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_messages_client_created ON public.messages(client_id, created_at DESC);
CREATE INDEX idx_messages_trainer_created ON public.messages(trainer_id, created_at DESC);
CREATE INDEX idx_messages_unread_for_trainer
  ON public.messages(trainer_id, created_at DESC)
  WHERE read_at_by_trainer IS NULL AND sender_role = 'client';
CREATE INDEX idx_messages_unread_for_client
  ON public.messages(client_id, created_at DESC)
  WHERE read_at_by_client IS NULL AND sender_role = 'trainer';

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Klijent CRUD svoje messages"
  ON public.messages FOR ALL
  TO authenticated
  USING (auth.uid() = client_id)
  WITH CHECK (auth.uid() = client_id AND sender_role = 'client');

CREATE POLICY "Trener CRUD svoje messages"
  ON public.messages FOR ALL
  TO authenticated
  USING (
    auth.uid() = trainer_id AND
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'trainer')
  )
  WITH CHECK (
    auth.uid() = trainer_id AND
    sender_role = 'trainer' AND
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'trainer')
  );

ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER TABLE public.messages REPLICA IDENTITY FULL;
