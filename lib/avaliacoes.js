// Avaliações do Google (nota, total e comentários recentes) via Places API (New).
// Fica desligado até as variáveis GOOGLE_PLACES_API_KEY e GOOGLE_PLACE_ID
// existirem no servidor; enquanto isso o site mostra as avaliações fixas do HTML.
// A chave nunca chega ao navegador: o site consulta /api/avaliacoes.
const CACHE_MS = 12 * 60 * 60 * 1000; // 12 horas: poucas consultas, fica na cota grátis

let cache = { at: 0, data: null };

function isEnabled() {
  return Boolean(process.env.GOOGLE_PLACES_API_KEY && process.env.GOOGLE_PLACE_ID);
}

async function fetchFromGoogle() {
  const placeId = encodeURIComponent(process.env.GOOGLE_PLACE_ID);
  const res = await fetch(`https://places.googleapis.com/v1/places/${placeId}?languageCode=pt-BR`, {
    headers: {
      'X-Goog-Api-Key': process.env.GOOGLE_PLACES_API_KEY,
      'X-Goog-FieldMask': 'rating,userRatingCount,reviews,googleMapsUri',
    },
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`Google Places respondeu ${res.status}`);
  const place = await res.json();

  const reviews = (place.reviews || [])
    .filter((r) => r.rating >= 4 && r.text && r.text.text && r.text.text.length >= 40)
    .slice(0, 3)
    .map((r) => ({
      author: (r.authorAttribution && r.authorAttribution.displayName) || 'Cliente Google',
      rating: r.rating,
      text: r.text.text.length > 280 ? r.text.text.slice(0, 277).trimEnd() + '…' : r.text.text,
      when: r.relativePublishTimeDescription || '',
    }));

  return {
    rating: place.rating,
    total: place.userRatingCount,
    mapsUrl: place.googleMapsUri || null,
    reviews,
  };
}

// Retorna os dados (do cache, se recente) ou null se desligado/indisponível.
async function getAvaliacoes() {
  if (!isEnabled()) return null;
  if (cache.data && Date.now() - cache.at < CACHE_MS) return cache.data;
  try {
    cache = { at: Date.now(), data: await fetchFromGoogle() };
  } catch (err) {
    console.error(`[avaliacoes] ${err.message}`);
    // Mantém o último resultado bom e tenta de novo em 30 minutos
    cache.at = Date.now() - CACHE_MS + 30 * 60 * 1000;
  }
  return cache.data;
}

module.exports = { getAvaliacoes };
