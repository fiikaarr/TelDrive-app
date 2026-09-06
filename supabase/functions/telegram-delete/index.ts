// @ts-nocheck
Deno.serve(async (req: Request) => {
  try {
    const { messageId } = await req.json();
    const botToken = Deno.env.get("TELEGRAM_BOT_TOKEN");
    const chatId = Deno.env.get("TELEGRAM_CHAT_ID");

    if (!messageId || !botToken || !chatId) {
      throw new Error("Missing parameters for deletion");
    }

    const telegramUrl = `https://api.telegram.org/bot${botToken}/deleteMessage`;
    const response = await fetch(telegramUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        message_id: messageId,
      }),
    });

    const data = await response.json();
    if (!data.ok) {
      throw new Error(data.description || "Failed to delete message from Telegram");
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { 
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
});