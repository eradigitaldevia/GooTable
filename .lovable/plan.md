## Objetivo

Melhorar a área de **Logo** no formulário de Identidade, adicionando orientações claras sobre o padrão recomendado (quadrada 1:1, formato, dimensões, peso e fundo) para garantir a melhor exibição no cabeçalho do cardápio, além de pequenos ajustes de validação.

## Mudanças propostas (somente `identidade-form.tsx`)

### 1. Adicionar Título (Label) e Diretrizes de Envio da Logo
Incluir o título "Logo" e uma área de dicas estruturada para o usuário, destacando por que a logo deve ser quadrada:

```
Logo
Recomendamos imagem quadrada (proporção 1:1) para melhor encaixe no topo do cardápio.
PNG ou SVG transparente · 512×512 px recomendado · até 2 MB
```

### 2. Validação de Formato no Frontend (Segurança e Usabilidade)
- Ajustar o atributo `accept` do input file para: `accept="image/png,image/svg+xml,image/jpeg,image/webp"`
- Adicionar uma validação em `handleUpload` para verificar o tipo MIME do arquivo antes de iniciar o upload. Se for inválido, exibe um toast de erro: `"Formato não suportado. Por favor, envie PNG, SVG, JPG ou WebP."`

### 3. Melhoria na Mensagem de Peso Limite
Melhorar a mensagem de limite de tamanho em `handleUpload`:
- De: `"Logo maior que 2MB"`
- Para: `"A logo deve ter no máximo 2 MB. Comprima a imagem ou envie outro arquivo."`

### 4. Acessibilidade (Ajuste visual leve)
- Garantir que a tag `<img>` tenha um `alt` semântico como `alt="Logo do restaurante"` em vez de deixá-la vazia.

## Arquivos afetados

- `src/components/configuracoes/identidade-form.tsx`

## Fora de escopo

- Redimensionador automático ou editor de corte (crop) de imagem.
- Alterações no hook `useUploadLogo` ou no backend do banco/storage.

Você aprova o plano para iniciarmos a implementação?