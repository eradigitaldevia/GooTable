
ALTER TABLE public.restaurantes
  ADD COLUMN IF NOT EXISTS horario_funcionamento jsonb NOT NULL DEFAULT '[]'::jsonb;

-- Estrutura esperada do JSON:
-- [
--   { "dia": 0..6, "aberto": boolean,
--     "turnos": [ { "inicio": "HH:MM", "fim": "HH:MM" } ] (0..2 turnos)
--   }
-- ]
-- Dia 0 = Domingo. Fechamento < abertura cruza meia-noite.

CREATE OR REPLACE FUNCTION public.restaurante_aberto_agora(_restaurante_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _horarios jsonb;
  _agora timestamptz := now();
  _local timestamp;
  _hoje int;
  _ontem int;
  _minutos_agora int;
  _config jsonb;
  _turno jsonb;
  _ini_min int;
  _fim_min int;
BEGIN
  SELECT horario_funcionamento INTO _horarios
  FROM public.restaurantes WHERE id = _restaurante_id;

  IF _horarios IS NULL OR jsonb_array_length(_horarios) = 0 THEN
    RETURN true; -- não configurado: sempre aberto
  END IF;

  _local := _agora AT TIME ZONE 'America/Sao_Paulo';
  _hoje := EXTRACT(DOW FROM _local)::int; -- 0=Domingo
  _ontem := (_hoje + 6) % 7;
  _minutos_agora := EXTRACT(HOUR FROM _local)::int * 60 + EXTRACT(MINUTE FROM _local)::int;

  -- Turnos de hoje
  FOR _config IN SELECT * FROM jsonb_array_elements(_horarios) LOOP
    IF (_config->>'dia')::int = _hoje AND COALESCE((_config->>'aberto')::boolean, false) THEN
      FOR _turno IN SELECT * FROM jsonb_array_elements(COALESCE(_config->'turnos', '[]'::jsonb)) LOOP
        _ini_min := (split_part(_turno->>'inicio', ':', 1))::int * 60 + (split_part(_turno->>'inicio', ':', 2))::int;
        _fim_min := (split_part(_turno->>'fim', ':', 1))::int * 60 + (split_part(_turno->>'fim', ':', 2))::int;
        IF _fim_min > _ini_min THEN
          IF _minutos_agora >= _ini_min AND _minutos_agora < _fim_min THEN
            RETURN true;
          END IF;
        ELSE
          -- cruza meia-noite: vale da abertura até 24h
          IF _minutos_agora >= _ini_min THEN
            RETURN true;
          END IF;
        END IF;
      END LOOP;
    END IF;
  END LOOP;

  -- Turnos de ontem que cruzaram meia-noite
  FOR _config IN SELECT * FROM jsonb_array_elements(_horarios) LOOP
    IF (_config->>'dia')::int = _ontem AND COALESCE((_config->>'aberto')::boolean, false) THEN
      FOR _turno IN SELECT * FROM jsonb_array_elements(COALESCE(_config->'turnos', '[]'::jsonb)) LOOP
        _ini_min := (split_part(_turno->>'inicio', ':', 1))::int * 60 + (split_part(_turno->>'inicio', ':', 2))::int;
        _fim_min := (split_part(_turno->>'fim', ':', 1))::int * 60 + (split_part(_turno->>'fim', ':', 2))::int;
        IF _fim_min <= _ini_min THEN
          -- vale de 0h até _fim_min hoje
          IF _minutos_agora < _fim_min THEN
            RETURN true;
          END IF;
        END IF;
      END LOOP;
    END IF;
  END LOOP;

  RETURN false;
END;
$$;

GRANT EXECUTE ON FUNCTION public.restaurante_aberto_agora(uuid) TO anon, authenticated, service_role;
