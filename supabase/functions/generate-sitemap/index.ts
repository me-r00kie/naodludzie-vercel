import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/xml; charset=utf-8',
};

const BASE_URL = 'https://naodludzie.pl';

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch all active cabins
    const { data: cabins, error } = await supabase
      .from('cabins')
      .select('slug, updated_at')
      .eq('status', 'active')
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Error fetching cabins:', error);
      throw error;
    }

    const today = new Date().toISOString().split('T')[0];

    // Static pages
    const staticPages = [
      { url: '', priority: '1.0', changefreq: 'daily' },
      { url: '/kontakt', priority: '0.5', changefreq: 'monthly' },
      { url: '/faq', priority: '0.5', changefreq: 'monthly' },
      { url: '/dla-wystawcow', priority: '0.6', changefreq: 'weekly' },
      { url: '/polityka-prywatnosci', priority: '0.3', changefreq: 'yearly' },
      { url: '/regulamin', priority: '0.3', changefreq: 'yearly' },
    ];

    // Build XML sitemap
    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
`;

    // Add static pages
    for (const page of staticPages) {
      xml += `  <url>
    <loc>${BASE_URL}${page.url}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>
`;
    }

    // Add cabin pages
    if (cabins) {
      for (const cabin of cabins) {
        const lastmod = cabin.updated_at 
          ? new Date(cabin.updated_at).toISOString().split('T')[0]
          : today;
        
        xml += `  <url>
    <loc>${BASE_URL}/cabin/${cabin.slug}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
`;
      }
    }

    xml += `</urlset>`;

    console.log(`Generated sitemap with ${staticPages.length} static pages and ${cabins?.length || 0} cabins`);

    return new Response(xml, { headers: corsHeaders });

  } catch (error) {
    console.error('Sitemap generation error:', error);
    return new Response(
      `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${BASE_URL}</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <priority>1.0</priority>
  </url>
</urlset>`,
      { headers: corsHeaders }
    );
  }
});
