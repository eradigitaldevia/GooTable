
-- Enum status pedido
CREATE TYPE public.pedido_status AS ENUM ('recebido', 'em_preparo', 'pronto', 'entregue', 'cancelado');
CREATE TYPE public.app_role AS ENUM ('admin', 'staff');

-- Restaurantes
CREATE TABLE public.restaurantes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  logo_url TEXT,
  cor_primaria TEXT DEFAULT '#0F172A',
  pix_habilitado BOOLEAN NOT NULL DEFAULT false,
  pix_chave TEXT,
  pix_nome_titular TEXT,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Membros do restaurante (RBAC)
CREATE TABLE public.restaurante_membros (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurante_id UUID NOT NULL REFERENCES public.restaurantes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  papel public.app_role NOT NULL DEFAULT 'admin',
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(restaurante_id, user_id)
);

-- Mesas
CREATE TABLE public.mesas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurante_id UUID NOT NULL REFERENCES public.restaurantes(id) ON DELETE CASCADE,
  numero TEXT NOT NULL,
  qr_token TEXT NOT NULL UNIQUE DEFAULT replace(gen_random_uuid()::text, '-', ''),
  ativa BOOLEAN NOT NULL DEFAULT true,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(restaurante_id, numero)
);

-- Categorias
CREATE TABLE public.categorias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurante_id UUID NOT NULL REFERENCES public.restaurantes(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  ordem INT NOT NULL DEFAULT 0,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Produtos
CREATE TABLE public.produtos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurante_id UUID NOT NULL REFERENCES public.restaurantes(id) ON DELETE CASCADE,
  categoria_id UUID REFERENCES public.categorias(id) ON DELETE SET NULL,
  nome TEXT NOT NULL,
  descricao TEXT,
  preco NUMERIC(10,2) NOT NULL CHECK (preco >= 0),
  imagem_url TEXT,
  disponivel BOOLEAN NOT NULL DEFAULT true,
  ordem INT NOT NULL DEFAULT 0,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Pedidos
CREATE TABLE public.pedidos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurante_id UUID NOT NULL REFERENCES public.restaurantes(id) ON DELETE CASCADE,
  mesa_id UUID NOT NULL REFERENCES public.mesas(id) ON DELETE RESTRICT,
  status public.pedido_status NOT NULL DEFAULT 'recebido',
  total NUMERIC(10,2) NOT NULL DEFAULT 0,
  observacao TEXT,
  cliente_nome TEXT,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Itens do pedido
CREATE TABLE public.pedido_itens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_id UUID NOT NULL REFERENCES public.pedidos(id) ON DELETE CASCADE,
  produto_id UUID NOT NULL REFERENCES public.produtos(id) ON DELETE RESTRICT,
  nome_produto TEXT NOT NULL,
  quantidade INT NOT NULL CHECK (quantidade > 0),
  preco_unit NUMERIC(10,2) NOT NULL,
  observacao TEXT,
  cliente_nome TEXT,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Função: usuário pertence ao restaurante? (security definer p/ evitar recursão RLS)
CREATE OR REPLACE FUNCTION public.is_restaurante_membro(_user_id UUID, _restaurante_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.restaurante_membros
    WHERE user_id = _user_id AND restaurante_id = _restaurante_id
  );
$$;

-- Trigger atualizado_em em pedidos
CREATE OR REPLACE FUNCTION public.touch_atualizado_em()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.atualizado_em = now();
  RETURN NEW;
END; $$;

CREATE TRIGGER pedidos_atualizado_em
BEFORE UPDATE ON public.pedidos
FOR EACH ROW EXECUTE FUNCTION public.touch_atualizado_em();

-- Habilitar RLS
ALTER TABLE public.restaurantes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.restaurante_membros ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mesas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.produtos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pedidos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pedido_itens ENABLE ROW LEVEL SECURITY;

-- ===== Políticas =====

-- Restaurantes: leitura pública (cardápio), só membro pode atualizar
CREATE POLICY "restaurantes_select_public" ON public.restaurantes FOR SELECT USING (true);
CREATE POLICY "restaurantes_insert_auth" ON public.restaurantes FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "restaurantes_update_membro" ON public.restaurantes FOR UPDATE TO authenticated
  USING (public.is_restaurante_membro(auth.uid(), id))
  WITH CHECK (public.is_restaurante_membro(auth.uid(), id));
CREATE POLICY "restaurantes_delete_membro" ON public.restaurantes FOR DELETE TO authenticated
  USING (public.is_restaurante_membro(auth.uid(), id));

-- Membros: usuário vê seus próprios vínculos; insere a si mesmo no onboarding
CREATE POLICY "membros_select_self" ON public.restaurante_membros FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_restaurante_membro(auth.uid(), restaurante_id));
CREATE POLICY "membros_insert_self" ON public.restaurante_membros FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "membros_delete_self" ON public.restaurante_membros FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- Mesas: leitura pública (cliente escaneia QR); escrita só membro
CREATE POLICY "mesas_select_public" ON public.mesas FOR SELECT USING (true);
CREATE POLICY "mesas_write_membro" ON public.mesas FOR ALL TO authenticated
  USING (public.is_restaurante_membro(auth.uid(), restaurante_id))
  WITH CHECK (public.is_restaurante_membro(auth.uid(), restaurante_id));

-- Categorias: leitura pública; escrita membro
CREATE POLICY "categorias_select_public" ON public.categorias FOR SELECT USING (true);
CREATE POLICY "categorias_write_membro" ON public.categorias FOR ALL TO authenticated
  USING (public.is_restaurante_membro(auth.uid(), restaurante_id))
  WITH CHECK (public.is_restaurante_membro(auth.uid(), restaurante_id));

-- Produtos: leitura pública; escrita membro
CREATE POLICY "produtos_select_public" ON public.produtos FOR SELECT USING (true);
CREATE POLICY "produtos_write_membro" ON public.produtos FOR ALL TO authenticated
  USING (public.is_restaurante_membro(auth.uid(), restaurante_id))
  WITH CHECK (public.is_restaurante_membro(auth.uid(), restaurante_id));

-- Pedidos: cliente anônimo PODE inserir (validação por mesa ativa); membro lê/atualiza
CREATE POLICY "pedidos_select_membro" ON public.pedidos FOR SELECT TO authenticated
  USING (public.is_restaurante_membro(auth.uid(), restaurante_id));
CREATE POLICY "pedidos_select_publico_por_id" ON public.pedidos FOR SELECT TO anon USING (true);
CREATE POLICY "pedidos_insert_publico" ON public.pedidos FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.mesas m
      WHERE m.id = mesa_id AND m.restaurante_id = pedidos.restaurante_id AND m.ativa = true
    )
  );
CREATE POLICY "pedidos_update_membro" ON public.pedidos FOR UPDATE TO authenticated
  USING (public.is_restaurante_membro(auth.uid(), restaurante_id))
  WITH CHECK (public.is_restaurante_membro(auth.uid(), restaurante_id));

-- Itens: leitura pública; insert público (validado pelo pedido); update só membro
CREATE POLICY "itens_select_public" ON public.pedido_itens FOR SELECT USING (true);
CREATE POLICY "itens_insert_publico" ON public.pedido_itens FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.pedidos p WHERE p.id = pedido_id)
  );

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.pedidos;
ALTER PUBLICATION supabase_realtime ADD TABLE public.pedido_itens;
ALTER TABLE public.pedidos REPLICA IDENTITY FULL;
ALTER TABLE public.pedido_itens REPLICA IDENTITY FULL;

-- Storage bucket público para imagens de produtos e logos
INSERT INTO storage.buckets (id, name, public) VALUES ('produtos', 'produtos', true);

CREATE POLICY "produtos_storage_select" ON storage.objects FOR SELECT USING (bucket_id = 'produtos');
CREATE POLICY "produtos_storage_insert" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'produtos');
CREATE POLICY "produtos_storage_update" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'produtos');
CREATE POLICY "produtos_storage_delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'produtos');

-- Índices úteis
CREATE INDEX idx_produtos_restaurante ON public.produtos(restaurante_id);
CREATE INDEX idx_produtos_categoria ON public.produtos(categoria_id);
CREATE INDEX idx_categorias_restaurante ON public.categorias(restaurante_id);
CREATE INDEX idx_mesas_restaurante ON public.mesas(restaurante_id);
CREATE INDEX idx_pedidos_restaurante_status ON public.pedidos(restaurante_id, status);
CREATE INDEX idx_itens_pedido ON public.pedido_itens(pedido_id);
CREATE INDEX idx_membros_user ON public.restaurante_membros(user_id);
