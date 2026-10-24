# Avaliações automáticas do Google

A seção "O que nossos clientes dizem" e o selo **4.9 ★** podem se atualizar sozinhos com a nota, o total de avaliações e os comentários mais recentes do Google.

**Situação atual:** desligado. O site mostra as avaliações fixas do HTML até as variáveis abaixo serem configuradas. Nada quebra enquanto isso.

## Como funciona

- O servidor consulta a **Google Places API (New)** no máximo a cada 12 horas e guarda o resultado na memória (`lib/avaliacoes.js`).
- O navegador do visitante busca os dados em `/api/avaliacoes`. **A chave do Google nunca vai para o navegador.**
- Só entram comentários com **4 ou 5 estrelas** e com pelo menos 40 caracteres. A seção mostra até 3.
- Se o Google não responder, o site continua mostrando o último resultado bom ou as avaliações fixas.

## Ativar (uma vez só)

### 1. Criar a chave no Google Cloud
1. Acesse <https://console.cloud.google.com> e crie um projeto (ex.: "Site Girassol").
2. Em **Faturamento**, vincule uma conta de faturamento. O Google exige um cartão, mas este uso fica dentro da cota mensal gratuita, porque o cache de 12 horas faz cerca de 60 consultas por mês.
3. Em **APIs e serviços → Biblioteca**, ative a **Places API (New)**.
4. Em **APIs e serviços → Credenciais → Criar credenciais → Chave de API**.
5. **Restrinja a chave** (importante):
   - *Restrições de API*: somente **Places API (New)**.
   - *Restrições de aplicativo*: **Endereços IP**, com o IP do servidor da Hostinger (aparece no hPanel).

### 2. Descobrir o Place ID da empresa
1. Abra o [Place ID Finder](https://developers.google.com/maps/documentation/places/web-service/place-id).
2. Pesquise "Girassol Energia Solar Irecê" e copie o código (começa com `ChIJ...`).

### 3. Configurar na Hostinger
hPanel → Sites → girassolsolar.com → app Node.js → **Variáveis de ambiente**:
- `GOOGLE_PLACES_API_KEY` = a chave criada
- `GOOGLE_PLACE_ID` = o Place ID

Clique em **Reimplantar**. Para conferir, abra `https://girassolsolar.com/api/avaliacoes`: ele deve mostrar a nota e os comentários (se aparecer uma página em branco, a configuração ainda não pegou).

> **Observação:** a lista de perguntas frequentes e os dados estruturados para o Google (`aggregateRating` no `<head>` de `giraindex.html`) continuam fixos. Atualize-os manualmente de vez em quando.
