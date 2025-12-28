import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const CRAWLERS = [
  'facebookexternalhit',
  'Facebot',
  'Twitterbot',
  'LinkedInBot',
  'WhatsApp',
  'Slackbot',
  'TelegramBot',
  'Discordbot',
  'Pinterest',
  'Googlebot',
];

function isCrawler(userAgent: string): boolean {
  return CRAWLERS.some(bot => userAgent.toLowerCase().includes(bot.toLowerCase()));
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function truncateDescription(text: string, maxLength: number = 160): string {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const path = url.searchParams.get('path') || '';
    const userAgent = req.headers.get('user-agent') || '';
    
    console.log('OG Metadata request:', { path, userAgent, isCrawler: isCrawler(userAgent) });

    // Extract cabin slug from path like /cabin/slug-name
    const cabinMatch = path.match(/^\/cabin\/([^\/]+)$/);
    
    if (!cabinMatch) {
      console.log('Not a cabin page, returning default OG tags');
      return new Response(JSON.stringify({
        title: 'NaOdludzie - Domki na odludziu',
        description: 'Odkryj domki w najbardziej odosobnionych zakątkach Polski. Znajdź idealne miejsce dzięki unikalnej Analizie NaOdludzie.',
        image: 'https://images.unsplash.com/photo-1449158743715-0a90ebb6d2d8?w=1200&q=80',
        url: 'https://naodludzie.pl',
        type: 'website'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const cabinSlug = cabinMatch[1];
    console.log('Fetching cabin data for slug:', cabinSlug);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch cabin data
    const { data: cabin, error } = await supabase
      .from('cabins')
      .select('id, title, description, images, address, price_per_night, max_guests, bedrooms, voivodeship')
      .eq('slug', cabinSlug)
      .eq('status', 'active')
      .single();

    if (error || !cabin) {
      console.log('Cabin not found:', error?.message);
      return new Response(JSON.stringify({
        title: 'NaOdludzie - Domki na odludziu',
        description: 'Odkryj domki w najbardziej odosobnionych zakątkach Polski.',
        image: 'https://images.unsplash.com/photo-1449158743715-0a90ebb6d2d8?w=1200&q=80',
        url: 'https://naodludzie.pl',
        type: 'website'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Cabin found:', cabin.title);

    // Get the first image URL
    let imageUrl = 'https://images.unsplash.com/photo-1449158743715-0a90ebb6d2d8?w=1200&q=80';
    if (cabin.images && Array.isArray(cabin.images) && cabin.images.length > 0) {
      const firstImage = cabin.images[0] as { url?: string };
      if (firstImage?.url) {
        imageUrl = firstImage.url;
      }
    }

    // Build dynamic OG data
    const ogTitle = escapeHtml(cabin.title);
    const ogDescription = escapeHtml(truncateDescription(
      cabin.description || 
      `${cabin.bedrooms} sypialnie • do ${cabin.max_guests} osób • od ${cabin.price_per_night} zł/noc${cabin.voivodeship ? ` • ${cabin.voivodeship}` : ''}`
    ));
    const ogUrl = `https://naodludzie.pl/cabin/${cabinSlug}`;

    const ogData = {
      title: ogTitle,
      description: ogDescription,
      image: imageUrl,
      url: ogUrl,
      type: 'website',
      siteName: 'NaOdludzie',
      price: cabin.price_per_night,
      location: cabin.voivodeship || cabin.address,
    };

    console.log('Returning OG data:', ogData);

    // If it's a crawler, return full HTML page with meta tags
    if (isCrawler(userAgent)) {
      const html = `<!DOCTYPE html>
<html lang="pl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${ogTitle} | NaOdludzie</title>
  <meta name="description" content="${ogDescription}">
  
  <!-- Open Graph -->
  <meta property="og:title" content="${ogTitle}">
  <meta property="og:description" content="${ogDescription}">
  <meta property="og:image" content="${imageUrl}">
  <meta property="og:url" content="${ogUrl}">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="NaOdludzie">
  <meta property="og:locale" content="pl_PL">
  
  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${ogTitle}">
  <meta name="twitter:description" content="${ogDescription}">
  <meta name="twitter:image" content="${imageUrl}">
  
  <link rel="canonical" href="${ogUrl}">
</head>
<body>
  <h1>${ogTitle}</h1>
  <p>${ogDescription}</p>
  <img src="${imageUrl}" alt="${ogTitle}">
  <a href="${ogUrl}">Zobacz ofertę na NaOdludzie</a>
</body>
</html>`;

      return new Response(html, {
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'text/html; charset=utf-8',
        },
      });
    }

    // For non-crawlers, return JSON data
    return new Response(JSON.stringify(ogData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error generating OG metadata:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to generate metadata',
      title: 'NaOdludzie - Domki na odludziu',
      description: 'Odkryj domki w najbardziej odosobnionych zakątkach Polski.',
      image: 'https://images.unsplash.com/photo-1449158743715-0a90ebb6d2d8?w=1200&q=80',
      url: 'https://naodludzie.pl',
      type: 'website'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
