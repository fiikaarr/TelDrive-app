import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN');
const CHAT_ID = Deno.env.get('TELEGRAM_CHAT_ID');

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
    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return new Response(JSON.stringify({ error: 'No file provided' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }

    const telegramFormData = new FormData();
    telegramFormData.append('chat_id', CHAT_ID!);
    telegramFormData.append('document', file);

    const telegramRes = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendDocument`, {
      method: 'POST',
      body: telegramFormData,
    });

    const telegramData = await telegramRes.json();

    if (!telegramData.ok) {
      throw new Error(telegramData.description || 'Failed to upload to Telegram');
    }

    // Ekstraksi fileId dan messageId secara eksplisit untuk database dan hapus fisik
    const fileId = 
      telegramData.result?.document?.file_id || 
      telegramData.result?.photo?.[telegramData.result.photo.length - 1]?.file_id;
      
    const messageId = telegramData.result?.message_id;

    return new Response(JSON.stringify({ 
      success: true, 
      fileId: fileId,
      messageId: messageId,
      result: telegramData.result 
    }), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }
});