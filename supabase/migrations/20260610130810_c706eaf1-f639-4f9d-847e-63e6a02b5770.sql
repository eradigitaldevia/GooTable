
REVOKE EXECUTE ON FUNCTION public.gerar_repasse_couvert_artistico(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.pagar_repasses_couvert_artistico(uuid[]) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.trg_comanda_couverts_set_apresentacao() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.gerar_repasse_couvert_artistico(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.pagar_repasses_couvert_artistico(uuid[]) TO authenticated, service_role;
