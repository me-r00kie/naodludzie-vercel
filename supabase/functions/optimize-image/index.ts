import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('Missing Authorization header');
      return new Response(
        JSON.stringify({ error: 'Unauthorized - missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Create a client with the user's auth to verify their identity
    const authClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: authError } = await authClient.auth.getUser();
    
    if (authError || !user) {
      console.error('Authentication failed:', authError?.message);
      return new Response(
        JSON.stringify({ error: 'Unauthorized - invalid or expired token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Use the authenticated user's ID - ignore any client-supplied userId
    const authenticatedUserId = user.id;
    console.log(`Authenticated user: ${authenticatedUserId}`);

    const { imageBase64, fileName, mimeType } = await req.json();

    if (!imageBase64 || !fileName) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: imageBase64, fileName' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Processing image for user ${authenticatedUserId}, original name: ${fileName}`);

    // Decode base64 to Uint8Array
    const base64Data = imageBase64.split(',')[1] || imageBase64;
    const binaryString = atob(base64Data);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    console.log(`Original image size: ${bytes.length} bytes`);

    // Use service role client for storage operations (RLS bypassed but we've verified the user)
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // First, upload original to a temp location to get a URL
    const tempFileName = `temp/${authenticatedUserId}/${Date.now()}-${Math.random().toString(36).substring(7)}.tmp`;
    
    const { error: tempUploadError } = await supabase.storage
      .from('cabin-images')
      .upload(tempFileName, bytes, {
        contentType: mimeType || 'image/jpeg',
        upsert: true,
      });

    if (tempUploadError) {
      console.error('Temp upload error:', tempUploadError);
      throw new Error(`Failed to upload temp image: ${tempUploadError.message}`);
    }

    // Get public URL of temp image
    const { data: { publicUrl: tempUrl } } = supabase.storage
      .from('cabin-images')
      .getPublicUrl(tempFileName);

    console.log(`Temp image URL: ${tempUrl}`);

    // Use weserv.nl to optimize the image (resize to max 1200px width, convert to WebP)
    const optimizedImageUrl = `https://images.weserv.nl/?url=${encodeURIComponent(tempUrl)}&w=1200&output=webp&q=80`;
    
    console.log(`Fetching optimized image from: ${optimizedImageUrl}`);

    const optimizedResponse = await fetch(optimizedImageUrl);
    
    if (!optimizedResponse.ok) {
      console.error('Optimization service error:', optimizedResponse.status, await optimizedResponse.text());
      throw new Error(`Image optimization failed: ${optimizedResponse.status}`);
    }

    const optimizedImageBuffer = await optimizedResponse.arrayBuffer();
    const optimizedBytes = new Uint8Array(optimizedImageBuffer);

    console.log(`Optimized image size: ${optimizedBytes.length} bytes (${Math.round((1 - optimizedBytes.length / bytes.length) * 100)}% reduction)`);

    // Generate final filename with .webp extension - using authenticated user ID
    const finalFileName = `${authenticatedUserId}/${Date.now()}-${Math.random().toString(36).substring(7)}.webp`;

    // Upload optimized image
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('cabin-images')
      .upload(finalFileName, optimizedBytes, {
        contentType: 'image/webp',
        upsert: false,
      });

    if (uploadError) {
      console.error('Final upload error:', uploadError);
      throw new Error(`Failed to upload optimized image: ${uploadError.message}`);
    }

    // Get public URL of optimized image
    const { data: { publicUrl } } = supabase.storage
      .from('cabin-images')
      .getPublicUrl(uploadData.path);

    // Clean up temp file (don't wait for it)
    supabase.storage
      .from('cabin-images')
      .remove([tempFileName])
      .then(() => console.log('Temp file cleaned up'))
      .catch((e) => console.error('Failed to clean up temp file:', e));

    console.log(`Successfully optimized image. Final URL: ${publicUrl}`);

    return new Response(
      JSON.stringify({ 
        publicUrl,
        originalSize: bytes.length,
        optimizedSize: optimizedBytes.length,
        reduction: Math.round((1 - optimizedBytes.length / bytes.length) * 100),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error processing image:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to process image';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
