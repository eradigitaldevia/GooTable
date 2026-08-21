UPDATE public.restaurantes
SET horario_funcionamento = '[
  {"dia":0,"aberto":true,"turnos":[{"inicio":"11:00","fim":"23:00"}]},
  {"dia":1,"aberto":true,"turnos":[{"inicio":"11:00","fim":"23:00"}]},
  {"dia":2,"aberto":true,"turnos":[{"inicio":"11:00","fim":"23:00"}]},
  {"dia":3,"aberto":true,"turnos":[{"inicio":"11:00","fim":"23:00"}]},
  {"dia":4,"aberto":true,"turnos":[{"inicio":"11:00","fim":"23:00"}]},
  {"dia":5,"aberto":true,"turnos":[{"inicio":"11:00","fim":"23:00"}]},
  {"dia":6,"aberto":true,"turnos":[{"inicio":"11:00","fim":"23:00"}]}
]'::jsonb
WHERE horario_funcionamento IS NULL
   OR jsonb_typeof(horario_funcionamento) <> 'array'
   OR jsonb_array_length(horario_funcionamento) = 0;