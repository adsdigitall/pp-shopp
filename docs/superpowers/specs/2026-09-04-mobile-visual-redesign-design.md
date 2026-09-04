# Redesign visual mobile do PP Shopp

## Objetivo

Deixar o PP Shopp mais leve, colorido e confortável no celular, preservando os fluxos existentes. O redesign elimina a sensação de fundo cinza ou preto pesado, melhora a leitura da área **Garimpar ofertas**, reduz o tamanho percebido dos produtos e acrescenta resposta tátil aos controles.

## Direção visual

A interface seguirá uma paleta clara e quente:

- fundo geral creme suave, com iluminação ambiente pêssego discreta;
- superfícies em branco quente e cartões com contraste suficiente;
- laranja coral como único destaque principal e cor das ações;
- azul-marinho suavizado para títulos e textos principais;
- verde reservado a preço, comissão, sucesso e disponibilidade;
- cinzas apenas como neutros auxiliares claros, nunca como a personalidade dominante.

O aplicativo continuará reconhecível como uma ferramenta de ofertas, mas sem copiar integralmente a identidade de nenhum marketplace. Fotos dos produtos permanecem como a parte mais colorida dos cartões.

## Estrutura e navegação

No mobile, a navegação inferior continuará fixa e respeitará a área segura do aparelho. O item ativo terá cor, fundo suave e pequeno deslocamento visual. Cabeçalho e conteúdo usarão espaçamento compacto, áreas de toque de pelo menos 44 px e largura integral com margens laterais consistentes.

As seções existentes e suas ações serão mantidas. A mudança será de apresentação, hierarquia e feedback, sem alterar integrações, busca, filtros, fila ou modais.

## Garimpar ofertas

A seção ganhará a hierarquia principal da tela:

1. título e descrição curtos;
2. seletor horizontal de marketplaces, rolável no mobile;
3. abas de descoberta mais compactas;
4. campo de busca com ação coral bem visível;
5. filtros e atualização;
6. grade de produtos.

Marketplaces indisponíveis serão visualmente secundários, mas legíveis. Categoria, aba e plataforma selecionadas terão um estado ativo inequívoco, sem depender apenas de borda cinza.

## Cartões de produto

Os cartões serão mais compactos e usarão uma grade de duas colunas nos celulares que comportarem o conteúdo; telas muito estreitas poderão cair para uma coluna. A imagem terá proporção controlada, o título será limitado a duas linhas e preço, desconto e ação terão uma ordem visual clara.

Informações secundárias serão reduzidas ou agrupadas para impedir cartões altos demais. A ação principal ficará alinhada na parte inferior. Imagens manterão `object-fit: cover`, texto alternativo e carregamento atual.

## Movimento e sensação tátil

Botões, abas, cartões clicáveis e itens da navegação usarão transições de `transform`, cor e sombra entre 160 e 240 ms. No toque, o elemento descerá aproximadamente 1–2 px e reduzirá até `scale(0.97–0.98)`, simulando pressão física. Hover em dispositivos compatíveis terá elevação discreta.

As animações respeitarão `prefers-reduced-motion`. Estados de foco continuarão visíveis para navegação por teclado. Nenhuma animação deverá bloquear ações ou causar deslocamento do layout.

## Sistema de estilos

Tokens semânticos de cor, sombra, raio, movimento e espaçamento serão centralizados no CSS global. Componentes existentes passarão a consumir classes reutilizáveis para superfícies e controles interativos, reduzindo cores e transições repetidas dentro do JSX.

O trabalho usará React, TypeScript e Tailwind CSS v4 já presentes no projeto. Não serão adicionadas bibliotecas de animação ou componentes.

## Estados e acessibilidade

- Loading manterá esqueletos, agora na nova paleta.
- Estados vazios e erros terão contraste claro e ação de recuperação.
- Foco será identificado por um anel coral com afastamento visível.
- Texto comum manterá contraste mínimo AA sobre os fundos definidos.
- Controles terão rótulos acessíveis e áreas de toque adequadas.

## Validação

A implementação será considerada pronta quando:

- o build TypeScript/Vite passar;
- os testes existentes relacionados aos fluxos alterados passarem;
- as telas principais forem verificadas em larguras próximas de 360, 390 e 430 px, além de desktop;
- não houver corte horizontal fora dos seletores roláveis intencionais;
- busca, categorias, marketplaces, fila, navegação inferior e abertura de modais continuarem funcionando;
- botões mostrarem feedback ao toque e o modo de movimento reduzido desabilitar animações não essenciais.

## Fora do escopo

Este redesign não cria um segundo código-base, não troca o framework, não altera APIs e não conclui integrações pendentes do Mercado Livre. “Outro aplicativo” significa uma nova experiência visual e responsiva dentro do PP Shopp atual, preservando sua funcionalidade.
