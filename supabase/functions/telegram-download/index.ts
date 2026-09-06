import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN');

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    });
  }

  try {
    const { fileId } = await req.json();
    if (!fileId) {
      throw new Error('No fileId provided');
    }

    const telegramRes = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getFile?file_id=${fileId}`);
    const telegramData = await telegramRes.json();

    if (!telegramData.ok) {
      throw new Error(telegramData.description || 'Failed to get file path from Telegram');
    }

    const filePath = telegramData.result.file_path;
    const downloadUrl = `https://api.telegram.org/file/bot${BOT_TOKEN}/${filePath}`;

    return new Response(JSON.stringify({ downloadUrl }), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }
});