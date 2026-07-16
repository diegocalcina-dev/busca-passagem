# Caçador de Passagens

Motor pessoal de detecção de promoções e *mistake fares* (tarifas com erro de precificação) em passagens aéreas. Varre múltiplas fontes, aprende o preço "normal" de cada rota e dispara alertas quando um preço cai anomalamente abaixo do padrão histórico.

> **Não é um buscador comum.** É um motor de detecção de anomalia de preço.

---

## Como funciona

```
Scheduler → Orquestrador → [Providers por dimensão] → Normalizador → Store
                                                              ↓
                          Motor de detecção (baseline + regras)
                                                              ↓
                  candidatos → Verificador ao vivo → Notifier → você
```

1. A cada ciclo (padrão: 6h), o orquestrador varre todas as combinações da sua watchlist em múltiplas dimensões (datas flexíveis, origens alternativas, cabines, moedas, etc.).
2. Os preços coletados são comparados contra o baseline histórico de cada rota (mediana, P10, mínimo).
3. Preços ≥ 40% abaixo do baseline (ajustável) viram **candidatos a oportunidade**.
4. Candidatos são re-verificados ao vivo antes do alerta.
5. Alerta chega no Telegram/e-mail com rota, preço, % de desconto, companhia e link de compra.

---

## Telas do Dashboard

| Tela | Descrição |
|---|---|
| **Dashboard** | Visão geral: stat cards, alertas ativos rankeados por desconto, rotas monitoradas |
| **Oportunidades** | Lista completa com filtros por força (Erro de Tarifa / Ótima / Boa / Confirmada ao vivo) |
| **Watchlist** | Gerenciar rotas monitoradas: CRUD, ativar/desativar, dimensões de busca por alvo |
| **Detalhe de Rota** | Histórico de preços (gráfico com baseline e P10), tabela de observações recentes |
| **Configurações** | Thresholds, frequência de coleta, canais de alerta, estratégias avançadas |

---

## Stack

| Camada | Tecnologia |
|---|---|
| Backend | Python 3.12 + FastAPI |
| Banco de dados | SQLite (via SQLAlchemy) |
| Agendamento | APScheduler (próxima fase) |
| Frontend | React 18 + Vite + TypeScript |
| Estilo | Tailwind CSS |
| Gráficos | Recharts |
| Ícones | Lucide React |
| Roteamento | React Router v6 |

---

## Pré-requisitos

- Python 3.12+
- Node.js 18+
- (Opcional) Conta no [Travelpayouts](https://www.travelpayouts.com/) para dados reais

---

## Setup local

### 1. Clonar e entrar no projeto

```bash
git clone https://github.com/diegocalcina-dev/busca-passagem.git
cd busca-passagem
```

### 2. Variáveis de ambiente

```bash
cp .env.example backend/.env
# Edite backend/.env com suas chaves (opcional para testar com dados mock)
```

### 3. Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

O banco SQLite é criado automaticamente e populado com **dados mock realistas** na primeira execução — nenhuma chave de API é necessária para testar.

### 4. Frontend

```bash
# Novo terminal
cd frontend
npm install
npm run dev
```

### 5. Acessar

| Serviço | URL |
|---|---|
| Frontend | http://localhost:5173 |
| API | http://localhost:8000 |
| Swagger | http://localhost:8000/docs |
| Redoc | http://localhost:8000/redoc |

---

## Dados mock pré-carregados

O sistema sobe com dados realistas para testes imediatos:

**Watchlist (6 rotas):**
- GRU → Lisboa (LIS) — Economy + Business
- GRU → Miami (MIA) — Economy
- GIG → Paris (CDG) — Economy + Business
- GRU → Tokyo (NRT) — Economy
- CGH → Santiago (SCL) — Economy
- GRU → Destino Flexível (ANY) — Economy

**Oportunidades detectadas:**

| Rota | Preço | Desconto | Força | Status |
|---|---|---|---|---|
| GRU → LIS Business | R$ 3.890 | −68,8% | Tarifa com Erro | ✓ Confirmado ao vivo |
| GRU → MIA Economy | R$ 980 | −65,0% | Tarifa com Erro | ⚠ Apenas cache |
| GIG → CDG Economy | R$ 2.180 | −46,8% | Ótima | ✓ Confirmado ao vivo |
| CGH → SCL Economy | R$ 590 | −50,8% | Ótima | ✓ Confirmado ao vivo |
| GRU → NRT Economy | R$ 3.200 | −42,8% | Boa | ✓ Confirmado ao vivo |

---

## Variáveis de ambiente

Copie `.env.example` e configure conforme necessário:

```bash
cp .env.example backend/.env
```

| Variável | Descrição | Obrigatória |
|---|---|---|
| `TRAVELPAYOUTS_TOKEN` | Token da Travelpayouts Data API (Aviasales) | Para dados reais |
| `RAPIDAPI_KEY` | Chave RapidAPI para re-verificação ao vivo | Para dados reais |
| `DUFFEL_API_KEY` | Duffel API (opcional) | Não |
| `KIWI_API_KEY` | Kiwi/Tequila (optional, virtual interlining) | Não |
| `TELEGRAM_BOT_TOKEN` | Token do bot Telegram | Para alertas |
| `TELEGRAM_CHAT_ID` | Chat ID do Telegram | Para alertas |
| `SMTP_*` | Configurações de e-mail | Para alertas |
| `COLLECTION_INTERVAL_HOURS` | Frequência de coleta (padrão: 6) | Não |
| `PROMO_THRESHOLD_PCT` | Limiar de promoção em % (padrão: 40) | Não |
| `BASELINE_WINDOW_DAYS` | Janela do baseline em dias (padrão: 90) | Não |

> **Nota:** A Amadeus Self-Service API foi descontinuada em 17/07/2026 e **não é suportada** neste projeto.

---

## Dimensões de busca

O orquestrador cruza as seguintes dimensões para maximizar a cobertura:

| # | Dimensão | Por que captura oportunidades |
|---|---|---|
| D1 | Rota fixa | Base do monitoramento dirigido |
| D2 | Datas flexíveis | Erros e promoções costumam estar em datas específicas |
| D3 | Destino flexível ("qualquer lugar") | Captura tarifas em destinos fora da watchlist |
| D4 | Origem flexível (cluster de aeroportos) | Um erro pode estar só num aeroporto próximo |
| D5 | Sentido (one-way / ida-e-volta) | Pernas isoladas às vezes são mais baratas |
| D6 | Duração da estadia | Preço varia muito conforme o par de datas |
| D7 | Cabines (economy / business / first) | Erros em business são os mais valiosos |
| D8 | Nº de passageiros | Algumas tarifas aparecem só em certas quantidades |
| D9 | Conexões (direto / 1–2 paradas) | Roteiros com conexão escondem os melhores preços |
| D10 | Moeda / Ponto de venda (POS) | Diferenças de POS podem revelar preço bem menor |
| D11 | Companhia / aliança | Isola padrões de erro por companhia |
| D12 | Virtual interlining (via Kiwi) | Roteiros indisponíveis em buscadores tradicionais |

---

## Classificação de oportunidades

| Força | Critério | Cor |
|---|---|---|
| **Tarifa com Erro** | > 60% abaixo do baseline ou ≤ mínimo histórico + queda súbita | Vermelho |
| **Ótima** | 40–60% abaixo ou ≤ P10 histórico | Laranja |
| **Boa** | 20–40% abaixo do baseline | Verde |

Todo candidato é **re-verificado ao vivo** antes do alerta. Cada achado carrega um selo: *confirmado ao vivo* vs *apenas cache*.

---

## Estrutura do projeto

```
busca-passagem/
├── backend/
│   ├── main.py              # FastAPI app + startup + dashboard stats
│   ├── database.py          # SQLite engine + SessionLocal
│   ├── models.py            # Modelos: Target, PriceObservation, Baseline, Opportunity
│   ├── schemas.py           # Schemas Pydantic
│   ├── seed_data.py         # ~220 observações mock com seed fixo (reprodutível)
│   ├── requirements.txt
│   └── routers/
│       ├── targets.py       # GET/POST/PUT/DELETE/PATCH watchlist
│       ├── opportunities.py # GET oportunidades + dismiss
│       └── observations.py  # GET histórico de preços (para gráficos)
├── frontend/
│   ├── index.html
│   ├── vite.config.ts       # Proxy /api → localhost:8000
│   ├── tailwind.config.js
│   └── src/
│       ├── App.tsx           # Roteamento React Router v6
│       ├── api/client.ts     # Cliente HTTP tipado (axios)
│       ├── pages/
│       │   ├── Dashboard.tsx
│       │   ├── Watchlist.tsx
│       │   ├── Opportunities.tsx
│       │   ├── RouteDetail.tsx
│       │   └── Settings.tsx
│       └── components/
│           ├── Layout.tsx
│           ├── Sidebar.tsx
│           ├── OpportunityCard.tsx
│           ├── RouteCard.tsx
│           ├── PriceChart.tsx
│           ├── AddTargetModal.tsx
│           └── StrengthBadge.tsx
├── .env.example
└── README.md
```

---

## Roadmap

| Fase | Status | Entrega |
|---|---|---|
| **v1 (atual)** | ✅ Completo | UI completa, seed data, API CRUD, gráfico histórico |
| **MVP** | Próxima | Travelpayouts integrado, coleta real, alerta Telegram |
| **v1.5** | Planejado | D3/D4/D7/D9/D10, RapidAPI (verificação ao vivo), classificação de força, cooldown/dedup |
| **v2** | Futuro | Kiwi/Duffel/SerpApi, virtual interlining, price-per-km, varredura de descoberta |

---

## Avisos importantes

> **Tarifas com erro expiram rápido** — a companhia pode cancelar a emissão a qualquer momento. Todo achado deve ser tratado como efêmero.
>
> **Não compre hotel/aluguel não reembolsável** antes do bilhete estar emitido e confirmado.
>
> **Preço de cache pode estar desatualizado** — sempre confirme na página de compra antes de pagar.
>
> **Hidden-city ticketing** viola o contrato de transporte da maioria das companhias. Use por sua conta e risco.

---

## Licença

Uso pessoal.
