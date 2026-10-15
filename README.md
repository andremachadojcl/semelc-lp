# LP Semelc — Segurança Eletrônica em Araxá

Site estático (HTML + CSS + JavaScript). Não precisa de build, nem de servidor especial, nem de nenhum serviço pago.

## Antes de publicar
1. **Logo:** já aplicada (`assets/logo.webp`, `assets/logo-lg.webp`, `assets/favicon.png`).
2. **WhatsApp:** em `js/config.js`, preencha `whatsapp: "5534XXXXXXXXX"`. Todos os botões passam a abrir o WhatsApp com uma mensagem pronta para cada público (casa, empresa, rural).
3. **Prints de clientes:** quando houver prints reais, incluir na Dobra 7 (há um comentário no `index.html` indicando o local).
4. **Linha do tempo:** o doc pede registros históricos e marcos reais; incluir quando o cliente enviar (comentário no HTML da Dobra 5).
5. **FAQ:** confirme as respostas com o comercial (conforme o doc).

## Regra de conteúdo
Toda a copy da página segue o doc da LP. A única seção com texto criado é o **Simulador**.

## Cores
As cores ficam em `css/style.css`, no `:root` (`--brand`, `--brand-2`, `--brand-3`, `--brand-grad`).

## Publicar de graça
- **Vercel:** arraste a pasta em vercel.com/new (plano Hobby, gratuito), ou rode `npx vercel` dentro da pasta.
- **Netlify:** arraste a pasta em app.netlify.com/drop.
- **GitHub Pages:** suba a pasta para um repositório e ative o Pages.

## Testar localmente
```
python3 -m http.server 8000   # depois abra http://localhost:8000
```

## Tecnologias (todas gratuitas)
- GSAP 3.13 + ScrollTrigger + SplitText (gratuitos para uso comercial desde 2025), salvos em `vendor/`
- Lenis (rolagem suave, MIT), salvo em `vendor/`
- Canvas 2D nativo: radar, visor da câmera e o jogo da central
- Google Fonts: Nunito, Nunito Sans e JetBrains Mono
