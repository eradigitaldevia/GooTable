REVOKE ALL ON FUNCTION public.limpar_identificacao_tentativas() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.limpar_identificacao_tentativas() TO postgres, service_role;