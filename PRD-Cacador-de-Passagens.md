# PRD — Caçador de Passagens (Detector de Promoções e Tarifas com Erro)

| Campo | Valor |
|---|---|
| **Produto** | Caçador de Passagens — app pessoal de detecção de promoções e *mistake fares* |
| **Versão** | 1.0 (Draft) |
| **Data** | 15/07/2026 |
| **Autor** | `[SEU NOME]` |
| **Tipo de usuário** | Single-user (uso pessoal) |
| **Status** | Em especificação |

---

## 1. Resumo executivo

O **Caçador de Passagens** é uma aplicação pessoal que monitora continuamente preços de passagens aéreas em múltiplas fontes, mantém histórico por rota e **dispara alertas quando um preço cai muito abaixo do padrão histórico** — incluindo os casos extremos conhecidos como *mistake fares* (tarifas com erro de precificação que as companhias não têm interesse em divulgar).

O produto **não é um buscador comum**. É um **motor de detecção de anomalia de preço**: ele varre o máximo de combinações possíveis (rotas, datas, origens, cabines, moedas), aprende o preço "normal" de cada rota e sinaliza somente o que for anomalamente barato — a oportunidade que vale a pena agir imediatamente.

O objetivo explícito deste PRD é garantir **cobertura de busca máxima**: exaurir as dimensões de pesquisa viáveis para não deixar nenhuma boa oportunidade passar (ver Seção 6).

---

## 2. Problema e motivação

Boas oportunidades de passagem (promoções agressivas e tarifas com erro) têm três características que as tornam difíceis de capturar manualmente:

1. **São efêmeras.** Duram de minutos a poucas horas; a companhia corrige o preço ou cancela a emissão.
2. **São imprevisíveis.** Podem aparecer em qualquer rota, data, cabine ou ponto de venda.
3. **Não são anunciadas.** Por definição, a companhia não divulga o preço que não lhe é vantajoso.

Buscar isso "na mão" é inviável — exigiria checar centenas de combinações várias vezes ao dia. A solução é automatizar a **varredura ampla + detecção de anomalia + alerta imediato**.

### Insight central
Não existe API que entregue "tarifas com erro" prontas. O que existe é **preço**. A oportunidade é **derivada**: comparar o preço atual de cada combinação contra o histórico daquela combinação e sinalizar desvios extremos. Quanto maior a cobertura de combinações varridas, maior a chance de capturar a anomalia.

---

## 3. Objetivos e métricas de sucesso

### Objetivos
- **O1.** Detectar promoções e tarifas com erro em rotas de interesse antes que expirem.
- **O2.** Maximizar a cobertura de busca (rotas × datas × origens × cabines × moedas).
- **O3.** Minimizar falsos positivos e ruído de alerta.
- **O4.** Entregar ao usuário um alerta acionável (com link de compra) em tempo hábil.

### Métricas de sucesso (KPIs)
| KPI | Meta inicial |
|---|---|
| Latência entre queda de preço e alerta recebido | ≤ tempo de 1 ciclo de coleta (config., ex.: ≤ 3h) |
| Cobertura de combinações varridas por ciclo | ≥ `[N]` combinações (definido pela watchlist) |
| Precisão dos alertas (achados realmente bons / total de alertas) | ≥ 70% |
| Taxa de achados confirmados ao vivo (não expirados no cache) | Monitorar e maximizar |
| Uptime da coleta agendada | ≥ 95% |

---

## 4. Público-alvo e persona

- **Usuário único (o dono).** Viajante que quer capturar oportunidades excepcionais, com apetite para agir rápido quando surge uma tarifa muito abaixo do normal.
- **Contexto Brasil (padrão):** origens em aeroportos brasileiros (ex.: GRU, GIG, CGH, VCP, BSB), moeda **BRL**, interesse tanto em voos domésticos quanto internacionais.
- **Perfil técnico:** confortável em rodar/manter um pequeno projeto (config via arquivo, deploy simples).

---

## 5. Escopo

### 5.1 Dentro do escopo (In scope)
- Cadastro e gestão de uma **watchlist** de alvos de busca.
- **Coleta automática e agendada** de preços em múltiplas fontes.
- **Varredura ampla** em todas as dimensões de busca viáveis (Seção 6).
- **Motor de detecção de anomalia** com baseline por rota e classificação de oportunidade (Seção 8).
- **Re-verificação ao vivo** de candidatos antes do alerta.
- **Alertas** (Telegram e/ou e-mail) com link de compra.
- **Dashboard** com rotas monitoradas, achados recentes e gráfico de histórico.
- **Persistência** de histórico e exportação (CSV).

### 5.2 Fora do escopo (Out of scope) — nesta versão
- Emissão/compra automática de bilhetes (o app **alerta**; a compra é manual pelo usuário).
- Multiusuário, contas, pagamentos, monetização.
- Reserva de hotéis, carros ou pacotes.
- App mobile nativo (o dashboard web responsivo atende).
- Uso de dados de rastreamento de voo ao vivo (status/atrasos) para fins de precificação.

---

## 6. Estratégia de busca abrangente ⭐ (requisito central)

> Esta é a seção que garante "todas as pesquisas possíveis para achar as melhores oportunidades". A cobertura é obtida cruzando **dimensões de busca** com **múltiplas fontes de dados** (Seção 7), tudo dentro de limites de taxa e com cache (Seção 9).

### 6.1 Dimensões de busca
Cada alvo da watchlist pode ser expandido automaticamente ao longo destas dimensões:

| # | Dimensão | Descrição | Por que captura oportunidades |
|---|---|---|---|
| D1 | **Rota fixa** | Origem → destino específicos | Base do monitoramento dirigido |
| D2 | **Datas flexíveis** | Varrer todo um mês / janela de datas (calendar/cheapest-date) | Erros e promoções costumam estar em datas específicas |
| D3 | **Destino flexível ("qualquer lugar")** | "Para onde consigo ir barato saindo de X?" (inspiration/anywhere) | Captura tarifas com erro em destinos que você nem cogitava |
| D4 | **Origem flexível (cluster de aeroportos)** | Buscar de GRU **e** CGH **e** VCP **e** GIG etc. | Um erro pode estar só num aeroporto próximo |
| D5 | **Sentido da viagem** | One-way **e** ida-e-volta separadamente | Pernas isoladas às vezes são mais baratas; muitos erros são one-way |
| D6 | **Duração da estadia** | Curta (fim de semana) **e** longa | Preço varia muito conforme o par de datas |
| D7 | **Cabines** | Econômica, Premium, **Executiva** e Primeira | Erros em business/first são os mais valiosos — priorizar |
| D8 | **Nº de passageiros** | 1 e (opcional) grupos | Algumas tarifas só aparecem em certas quantidades |
| D9 | **Conexões** | Direto **e** com 1–2 paradas | Roteiros com conexão frequentemente escondem os melhores preços |
| D10 | **Moeda / Ponto de venda (POS)** | Consultar a mesma tarifa em BRL, USD, EUR e outros mercados | Diferenças de POS podem revelar preço bem menor (técnica clássica) |
| D11 | **Companhia / aliança** | Filtrar por cia. específica quando útil; incluir e excluir low-cost | Isola padrões de erro por companhia |
| D12 | **Roteiros criativos (virtual interlining)** | Combinações de cias sem acordo (via Kiwi) | Abre itinerários e preços indisponíveis em buscadores tradicionais |

### 6.2 Estratégias avançadas (opcionais, com ressalvas)
Marcadas como **opcionais** e **desligadas por padrão**. Só sinalizam/detectam; a decisão e o risco são do usuário. O app deve exibir os avisos abaixo em todo alerta desse tipo.

- **A1 — Hidden-city / "cidade escondida" (throwaway ticketing).** Comprar A→C via B e desembarcar em B. Pode ser mais barato, **porém viola o contrato de transporte da maioria das companhias**: risco de cancelamento do trecho de volta, invalidação do bilhete e sanções no programa de milhas. Só funciona com bagagem de mão e sem conexões após o ponto de desembarque. **Detectar e avisar; nunca esconder o risco.**
- **A2 — "Fuel dumping" / combinações de tarifa.** Padrões técnicos que reduzem sobretaxas em certos itinerários. Instável e sujeito a correção/recusa de emissão. Tratar como **experimental** e sempre marcar como "não confirmado".

### 6.3 Modo de operação da varredura
- **Varredura dirigida (targeted):** todas as combinações derivadas dos alvos da watchlist (D1–D12 conforme configurado por alvo).
- **Varredura de descoberta (discovery):** sweeps periódicos de "destino flexível" (D3) a partir dos aeroportos de origem do usuário, para achar oportunidades fora da watchlist.
- **Priorização inteligente:** rotas com histórico volátil ou próximas de mínimos históricos recebem coleta mais frequente; rotas estáveis, menos frequente. Isso concentra os recursos de coleta onde a chance de anomalia é maior.
- **Semear a partir de sinais externos (opcional):** ingerir feeds públicos de promoções (ex.: agregadores de *deals*) apenas como **fonte de rotas candidatas** a monitorar — respeitando os termos de cada feed. Nunca como fonte de preço final.

### 6.4 Matriz cobertura = dimensões × fontes
A cobertura máxima vem de **aplicar as dimensões viáveis a cada fonte disponível** e consolidar. Nem toda fonte suporta toda dimensão; o app deve consultar cada fonte apenas nas dimensões que ela suporta e **unir os resultados**, deduplicando por (rota, datas, cia, preço).

---

## 7. Fontes de dados e integrações

> **Restrição crítica:** **NÃO usar a Amadeus Self-Service API.** O portal self-service da Amadeus foi descontinuado (desativação em 17/07/2026, com novos cadastros já encerrados). Não incluir no projeto. As APIs diretas de companhias (LATAM, GOL, Azul) e GDS (Amadeus/Sabre Enterprise) são gated para parceiros/empresas e **não são viáveis para uso pessoal**.

### 7.1 Fontes priorizadas

| Prioridade | Fonte | Tipo de dado | Autenticação | Custo | Papel no produto | Limitação-chave |
|---|---|---|---|---|---|---|
| **Primária** | **Travelpayouts Data API (dados Aviasales)** | **Cache** (histórico de buscas, ~7 dias) | Token no header `X-Access-Token` (cadastro no programa de afiliados) | Grátis (modelo de afiliado) | Descoberta ampla (D2, D3, D9) + geração do **baseline** de preço | Dados em cache, não ao vivo → exigem re-verificação |
| **Secundária** | **API de busca de voos via RapidAPI** (agregador com tier grátis) | Semi-ao-vivo | Chave RapidAPI | Tier grátis + planos | **Re-verificar** candidatos e ampliar cobertura | Cotas do tier grátis; provedor configurável |
| Opcional | **Duffel** (modo de teste) | Busca real (sandbox no teste) | API key | Teste grátis; produção sob setup | Busca real e, no futuro, fluxo de compra | Dados de teste não são de produção |
| Opcional | **Kiwi.com Tequila** (tier de teste) | Busca com **virtual interlining** | API key | Teste grátis; produção gated por parceria | Roteiros criativos (D12) e hidden-city (A1) | Acesso de produção restrito |
| Opcional | **SerpApi — Google Flights** | Dados do Google Flights | API key | Pago (com trial) | Verificação de alta qualidade | Custo por consulta |

### 7.2 Requisitos de integração
- **RF-INT-1.** Cada fonte é implementada atrás de uma **interface comum `PriceProvider`** (ligar/desligar por configuração).
- **RF-INT-2.** Cada `PriceProvider` declara **quais dimensões (D1–D12) suporta**; o orquestrador só a consulta nessas dimensões.
- **RF-INT-3.** Resultados de todas as fontes são **normalizados** para um schema único (rota, datas, cia, preço, moeda, origem do dado, `expires_at`, link).
- **RF-INT-4.** Falha de uma fonte **não derruba** o ciclo; registra erro e segue com as demais.
- **RF-INT-5.** Segredos/chaves via `.env` (jamais versionados). Fornecer `.env.example`.

---

## 8. Motor de detecção de oportunidades

### 8.1 Baseline por rota
Para cada combinação (rota + par de datas quando aplicável), calcular sobre janela configurável (padrão 30–90 dias):
- **Mediana** e **percentis** (p25, p10) dos preços observados — robustos a outliers (preferível à média).
- **Mínimo histórico** registrado.
- **Preço médio por km** (normaliza rotas de distâncias diferentes; ajuda a comparar oportunidades entre trechos).

### 8.2 Regras de sinalização
Um preço vira **candidato a oportunidade** se satisfizer **qualquer** critério (todos configuráveis):
- Cair **X% abaixo** do baseline (mediana). Padrão sugerido: **≥ 40%**.
- Ficar **abaixo do percentil 10** histórico da rota.
- Ficar **abaixo de um teto absoluto** definido para a rota (ex.: `GRU→LIS < R$ 2.000`).
- Ficar **igual ou abaixo do mínimo histórico**.
- Apresentar **queda súbita (velocidade)**: preço despenca em relação à última observação (indício forte de erro de tarifa).
- Preço por km **anomalamente baixo** para o padrão daquele tipo de rota (útil para long-haul e business).

### 8.3 Classificação de força
| Faixa | Critério (exemplo) | Ação |
|---|---|---|
| **Bom** | 20–40% abaixo do baseline | Registrar; alertar se dentro dos interesses |
| **Ótimo** | 40–60% abaixo, ou ≤ p10 | Alertar |
| **Provável tarifa com erro** | > 60% abaixo do baseline, ou ≤ mínimo histórico com queda súbita | Alertar com prioridade máxima |

### 8.4 Confiança e re-verificação
- Todo candidato é **re-verificado ao vivo** (fonte secundária) antes do alerta.
- Cada achado carrega um selo de confiança: **confirmado ao vivo** vs **apenas cache**, e o status de `expires_at` (válido / expirado / desconhecido).
- Achados só de cache e expirados são exibidos com aviso claro (podem não existir mais).

### 8.5 Controle de ruído
- **Deduplicação** por (rota, datas, cia, preço).
- **Cooldown** por combinação: só re-alertar se o preço **cair ainda mais** ou após período configurável.
- Silenciar rotas/combinações a pedido do usuário.

---

## 9. Requisitos não-funcionais

| ID | Requisito |
|---|---|
| RNF-1 | **Respeitar rate limits** de cada fonte (ex.: `/v1/prices/calendar` da Travelpayouts ~300 req/min). |
| RNF-2 | **Cache local** de respostas para ampliar cobertura efetiva e reduzir chamadas repetidas. |
| RNF-3 | **Backoff exponencial** e retry em erros/`429`. |
| RNF-4 | Varredura ampla, porém **respeitosa**: muitas combinações, com throttling e reuso de cache — nunca chamadas em loop apertado (bloqueia a chave e não melhora resultado). |
| RNF-5 | **Resiliência**: falha isolada por fonte; o ciclo continua. |
| RNF-6 | **Segurança**: segredos em `.env`; nada sensível no repositório ou nos logs. |
| RNF-7 | **Observabilidade**: logging estruturado por fonte e por ciclo; contadores de chamadas e de achados. |
| RNF-8 | **Controle de custo**: priorizar fontes grátis; medir consumo de cotas pagas; teto configurável de chamadas por ciclo. |
| RNF-9 | **Testabilidade**: cobertura de testes na lógica de baseline/detecção (parte crítica). |
| RNF-10 | **Portabilidade**: rodar em máquina pessoal ou deploy grátis (ver Seção 12). |

---

## 10. Arquitetura técnica

### 10.1 Stack sugerida (adaptável, justificar se mudar)
- **Backend/orquestração:** Python 3.12 + FastAPI.
- **Persistência:** SQLite (suficiente para single-user; trocável por Postgres).
- **Agendamento:** APScheduler (ou cron / GitHub Actions).
- **Camada de fontes:** interface `PriceProvider` + implementações plugáveis.
- **Alertas:** módulo `notifier` com backends Telegram e e-mail.
- **Frontend:** dashboard leve (HTML + HTMX, ou React simples servido pelo FastAPI).
- **Config/segredos:** `.env` + `.env.example`.

### 10.2 Componentes
1. **Scheduler** — dispara os ciclos de coleta.
2. **Orquestrador de busca** — expande alvos nas dimensões (D1–D12), distribui às fontes suportadas, respeita limites/cache.
3. **Providers** — adaptadores por fonte (`PriceProvider`).
4. **Normalizador** — converte respostas para o schema único.
5. **Motor de detecção** — baseline, regras, classificação, confiança.
6. **Verificador ao vivo** — reconfirma candidatos.
7. **Notifier** — envia alertas com link de compra.
8. **Store** — histórico + consultas para o dashboard.
9. **Dashboard/API** — visualização e configuração.

### 10.3 Fluxo de dados (alto nível)
```
Scheduler → Orquestrador → [Providers (por dimensão)] → Normalizador → Store
                                                                   ↓
                              Motor de detecção (baseline + regras) 
                                                                   ↓
                        candidatos → Verificador ao vivo → Notifier → você
```

---

## 11. Modelo de dados (mínimo)

```
targets            (id, origin(s), destination|ANY, one_way, date_from, date_to,
                    stay_min, stay_max, cabins[], max_stops, passengers,
                    currencies[], price_ceiling, dimensions_enabled[], active)

price_observations (id, target_id, origin, destination, price, currency, cabin,
                    airline, stops, departure_at, return_at, source, expires_at,
                    price_per_km, collected_at)

baselines          (route_key, window_days, median, p25, p10, min_price,
                    median_price_per_km, updated_at)

opportunities      (id, observation_id, pct_below_baseline, strength,
                    confirmed_live, expiry_status, buy_link, detected_at)

alerts             (id, opportunity_id, channel, sent_at, cooldown_until)
```
Índices para consulta rápida por `target_id` + `collected_at` e por `route_key`.

---

## 12. Fluxos principais (User flows)

- **UF-1 — Configurar alvo:** usuário cadastra origem(ns), destino (ou "qualquer"), janelas de data, cabines, moedas, teto de preço e quais dimensões ativar.
- **UF-2 — Coleta automática:** a cada ciclo, o orquestrador varre as combinações e grava observações.
- **UF-3 — Detecção:** o motor recalcula baseline e sinaliza candidatos.
- **UF-4 — Verificação + alerta:** candidatos são reconfirmados ao vivo e viram alerta com link, força e selo de confiança.
- **UF-5 — Revisão:** usuário abre o dashboard, vê o gráfico histórico da rota e decide comprar (compra é manual).
- **UF-6 — Ajuste:** usuário silencia rotas ruidosas, ajusta thresholds e cooldown.

---

## 13. Regras de negócio (parametrizáveis)
- Limiar de promoção padrão: **≥ 40% abaixo do baseline** (ajustável por alvo).
- Tetos absolutos por rota (opcionais).
- Cooldown de alerta por combinação (padrão configurável).
- Janela de baseline padrão: **30–90 dias**.
- Frequência de coleta padrão: **a cada 6 horas** (ajustável; rotas prioritárias mais frequentes).
- Estratégias avançadas (A1/A2): **desligadas por padrão**, exigem opt-in explícito.

---

## 14. Avisos e riscos (tarifas com erro) — exibir no app e no README
- **Tarifas com erro expiram rápido** e a companhia **pode cancelar a emissão**. Trate todo achado como efêmero.
- **Não compre hotel/aluguel não reembolsável** antes do bilhete estar **emitido e confirmado**.
- **Preço de cache pode estar desatualizado** — sempre confirme na página de compra antes de pagar.
- **Hidden-city (A1) viola o contrato de transporte** da maioria das cias — risco de cancelamento e sanções. Use por sua conta e risco.
- Respeite os **Termos de Uso** de cada API/fonte; a técnica de POS/moeda (D10) pode esbarrar em termos de alguns sites.

---

## 15. Roadmap por fases

| Fase | Entrega |
|---|---|
| **MVP** | Watchlist básica (D1, D2, D5), fonte primária (Travelpayouts), baseline + regra de %, alerta por Telegram, store SQLite. |
| **v1** | Dimensões D3, D4, D7, D9, D10; fonte secundária (RapidAPI) para verificação ao vivo; classificação de força; dashboard com gráfico; cooldown/dedup. |
| **v1.5** | Varredura de descoberta (D3 automática), priorização inteligente, exportação CSV, e-mail como canal alternativo. |
| **v2** | Fontes opcionais (Duffel/Kiwi/SerpApi), D12 (virtual interlining), estratégias avançadas A1/A2 com avisos, price-per-km e velocidade de queda. |

---

## 16. Critérios de aceitação (amostra testável)
- [ ] Dado um alvo com datas flexíveis, o sistema coleta e grava preços para cada dia da janela.
- [ ] O baseline é recalculado por rota e usa mediana + percentis.
- [ ] Um preço ≥ 40% abaixo do baseline gera um candidato.
- [ ] Todo candidato é re-verificado ao vivo antes de virar alerta.
- [ ] O alerta chega no canal configurado com rota, datas, preço, % abaixo do normal, cia, validade e **link de compra**.
- [ ] Não há alertas duplicados para a mesma combinação dentro do cooldown.
- [ ] A falha de uma fonte não interrompe o ciclo.
- [ ] Rate limits são respeitados e há cache + backoff.
- [ ] Estratégias A1/A2 só operam com opt-in e sempre exibem os avisos de risco.

---

## 17. Riscos e mitigações

| Risco | Impacto | Mitigação |
|---|---|---|
| Dados em cache desatualizados (falso positivo) | Alerta de preço que já não existe | Re-verificação ao vivo + selo `expires_at` |
| Bloqueio por exceder rate limit | Perda de coleta | Throttling, cache, backoff, teto de chamadas |
| Acesso gated a fontes (Kiwi/Skyscanner) | Menos cobertura | Arquitetura plugável; começar pelas fontes grátis/self-service |
| Descontinuação de API (ex.: Amadeus) | Quebra de integração | Interface `PriceProvider` isola fontes; fácil trocar/adicionar |
| Custo de fontes pagas | Estouro de orçamento | Fontes pagas opcionais e medidas; priorizar grátis |
| Excesso de alertas (ruído) | Fadiga de alerta | Thresholds, cooldown, dedup, silenciar rotas |

---

## 18. Decisões pendentes (a preencher pelo usuário)
- Aeroporto(s) de origem principal: `[ex.: GRU, GIG]`
- Moeda base: `[BRL]`
- Rotas/destinos de interesse iniciais: `[lista]`
- Limiar de promoção padrão: `[ex.: 40%]`
- Tetos absolutos por rota (opcional): `[ex.: GRU→LIS < R$ 2.000]`
- Canal de alerta preferido: `[Telegram / e-mail]`
- Frequência de coleta: `[ex.: 6h]`
- Ativar estratégias avançadas A1/A2? `[não por padrão]`
- Onde rodar/deploy: `[VPS pequena / Railway / Render / GitHub Actions agendado]`

---

## 19. Glossário
- **Mistake fare / tarifa com erro:** preço publicado por engano (câmbio, sobretaxa, sistema), bem abaixo do normal.
- **Baseline:** referência de preço "normal" de uma rota, calculada do histórico.
- **POS (point of sale):** mercado/país/moeda em que a tarifa é consultada; pode alterar o preço.
- **Virtual interlining:** combinação de voos de cias sem acordo entre si num único itinerário (ex.: Kiwi).
- **Hidden-city:** comprar um itinerário mais longo e desembarcar numa conexão intermediária mais barata (viola contratos de transporte).
- **Cache (nas APIs de dados):** preços agregados de buscas anteriores, não cotação ao vivo.

---

## 20. Referências (fontes verificadas em jul/2026)
- Descontinuação da Amadeus Self-Service API (17/07/2026): PhocusWire e comunicados subsequentes.
- Travelpayouts Data API (dados Aviasales), dados em cache e endpoints de preço mais barato.
- Kiwi.com Tequila API (virtual interlining; acesso de produção gated).
- Panorama de APIs de voo 2026 (Amadeus, Duffel, Kiwi, Skyscanner via RapidAPI, Travelpayouts).
