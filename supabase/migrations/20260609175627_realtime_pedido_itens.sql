-- Habilita Realtime para pedido_itens (pedidos já está na publication).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'pedido_itens'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.pedido_itens;
  END IF;
END $$;
