# Destrava Shop

Aplicativo web responsivo para ajudar criadores iniciantes a gravar vídeos naturais de TikTok Shop sem mostrar o rosto.

## Recursos incluídos

- Cadastro do produto e da experiência real.
- Geração local de roteiro natural, sem API externa.
- Roteiros de 15, 30, 45 ou 60 segundos.
- Modos: conversa com amigo, descoberta sincera, teste real, calmo e conversa em casal.
- Roteiro dividido em cenas editáveis.
- Assistente de ambiente com câmera e área segura 9:16.
- Checklist de iluminação, ruído, fundo e enquadramento.
- Teleprompter frase por frase.
- Medidor aproximado do volume da voz.
- Quadro de gravação com nomes organizados para os arquivos.
- Plano de edição para CapCut.
- Sugestões de texto na tela.
- Checklist final de publicação.
- Salvamento automático no navegador usando `localStorage`.
- Tema claro e escuro.
- PWA básica para funcionamento offline após o primeiro acesso.

## Como abrir localmente

### Forma simples

Clique duas vezes em `meusite.bat` no Windows.

Observação: câmera, microfone e PWA podem exigir HTTPS ou `localhost`. Abrir diretamente o HTML pode limitar esses recursos em alguns navegadores.

### Forma recomendada

Com Python instalado, abra o terminal na pasta e execute:

```bash
python -m http.server 8080
```

Depois acesse `http://localhost:8080`.

## Publicar no GitHub Pages

1. Crie um repositório no GitHub.
2. Envie todo o conteúdo desta pasta para a raiz do repositório.
3. Abra **Settings > Pages**.
4. Em **Build and deployment**, selecione **Deploy from a branch**.
5. Selecione a branch `main` e a pasta `/root`.
6. Salve e aguarde a URL do GitHub Pages.

## Estrutura

```text
index.html
manifest.webmanifest
service-worker.js
meusite.bat
README.md
assets/
  css/style.css
  js/app.js
  icons/icon.svg
```

## Limite atual

A geração dos roteiros usa combinações locais e funciona sem internet. Para geração por inteligência artificial, será necessário conectar futuramente uma API por meio de um backend seguro. Não coloque uma chave de API diretamente no JavaScript público do GitHub Pages.
