// supabase/functions/notify-new-order/index.ts
//
// Deploy with:
//   supabase functions deploy notify-new-order
//
// Set secrets:
//   supabase secrets set SUPABASE_URL=https://xxxx.supabase.co
//   supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // ── Parse the webhook payload ──
    const payload = await req.json();
    const order = payload.record; // new row from the orders table

    if (!order) {
      return new Response("No record in payload", { status: 400 });
    }

    // ── Init Supabase admin client ──
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // ── Fetch all admin push tokens ──
    const { data: tokenRows, error: tokenError } = await supabase
      .from("admin_push_tokens")
      .select("token");

    if (tokenError) throw tokenError;
    if (!tokenRows || tokenRows.length === 0) {
      return new Response("No admin tokens registered", { status: 200 });
    }

    const tokens = tokenRows.map((r: { token: string }) => r.token);

    // ── Format the notification ──
    const total = Number(order.total ?? 0).toLocaleString("en-NG", {
      style: "currency",
      currency: "NGN",
      maximumFractionDigits: 0,
    });

    const itemCount =
      Array.isArray(order.items) ? order.items.length : "?";

    const messages = tokens.map((token: string) => ({
      to: token,
      sound: "default",
      title: "🛍️ New Order!",
      body: `${total} · ${itemCount} item${itemCount !== 1 ? "s" : ""}`,
      data: { orderId: order.id, screen: "orders" },
      channelId: "orders",
    }));

    // ── Send to Expo Push API ──
    const expoRes = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(messages),
    });

    const expoJson = await expoRes.json();
    console.log("Expo push response:", JSON.stringify(expoJson));

    return new Response(JSON.stringify({ ok: true, expo: expoJson }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (err) {
    console.error("notify-new-order error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
