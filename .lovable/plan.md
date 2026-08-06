# Corrigir o login (build quebrado por dependências desalinhadas)

## O que está acontecendo

O login não falha por senha errada: o formulário nem chega a enviar a requisição de autenticação. Reproduzi no preview — ao clicar em "Entrar" o botão fica girando e **nenhuma chamada de autenticação é feita** (confirmado também nos logs de autenticação do backend, que não registram nenhuma tentativa de login recente, apenas um erro antigo de token expirado).

A causa é o build da aplicação, que está falhando desde a última atualização de dependências feita na correção de segurança:

```text
"getScriptPreloadAttrs" is not exported by @tanstack/router-core
```

O pacote `@tanstack/react-start` foi atualizado e passou a exigir uma versão mais nova do roteador (1.170.x), enquanto o `@tanstack/react-router` do projeto continua travado em 1.168.x. Com versões incompatíveis, o bundle da aplicação quebra e a tela de login fica sem comportamento.

## Correção

1. Alinhar os pacotes TanStack para a mesma linha de versão:
   - `@tanstack/react-router` → `^1.170.20`
   - `@tanstack/router-plugin` → versão correspondente 1.170.x
   - manter `@tanstack/react-start` na versão atual (1.168.37), que já espera o núcleo 1.170.x
   - `@tanstack/zod-adapter` acompanhando a mesma linha
2. Reinstalar dependências e confirmar que `router-core` e `start-client-core` resolvem para a mesma linha 1.170.x.
3. Rodar o build para confirmar que o erro `getScriptPreloadAttrs` desapareceu.
4. Revalidar o login no preview: com credenciais inválidas deve aparecer a mensagem "Email ou senha incorretos" (prova de que a chamada está saindo) e com credenciais válidas deve redirecionar para a área correta.

## Escopo

Apenas `package.json` (versões das dependências TanStack). Nenhuma alteração em telas, rotas, regras de negócio ou banco de dados. As correções de segurança aplicadas anteriormente (incluindo o pin do `dompurify`) permanecem intactas.
