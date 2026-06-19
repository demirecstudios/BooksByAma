// File: supabase/functions/verify-transaction/index.ts
//
// This function runs on Supabase's servers (Deno runtime).
// The app sends it a Paystack transaction "reference" after the
// payment popup closes. This function asks Paystack (using the
// SECRET key, which never touches the app) whether that payment
// actually succeeded, and reports back true/false.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const { reference } = await req.json();

    if (!reference || typeof reference !== "string") {
      return new Response(
        JSON.stringify({ error: "Missing transaction reference" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const secretKey = Deno.env.get("PAYSTACK_SECRET_KEY")!;

    const paystackRes = await fetch(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
      {
        headers: {
          Authorization: `Bearer ${secretKey}`,
        },
      },
    );

    const result = await paystackRes.json();

    // Paystack returns data.status === "success" for a completed payment
    const success = result?.data?.status === "success";

    return new Response(
      JSON.stringify({
        success,
        amount: result?.data?.amount, // amount in kobo
        currency: result?.data?.currency,
        reference: result?.data?.reference,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (err) {
    console.error("verify-transaction error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
