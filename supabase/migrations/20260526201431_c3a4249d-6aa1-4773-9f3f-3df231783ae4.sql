ALTER PUBLICATION supabase_realtime ADD TABLE public.pedidos;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chamados_garcom;
ALTER TABLE public.pedidos REPLICA IDENTITY FULL;
ALTER TABLE public.chamados_garcom REPLICA IDENTITY FULL;