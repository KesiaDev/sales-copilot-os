// Shared secret used by N8N to call our public webhooks/metrics endpoints.
// Override in production by setting the WEBHOOK_SHARED_SECRET env var.
const EXPECTED = process.env.WEBHOOK_SHARED_SECRET ?? "llmidia_sales_2026";

export function checkWebhookSecret(request: Request): Response | null {
  const header = request.headers.get("x-webhook-secret");
  if (header !== EXPECTED) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
  return null;
}
