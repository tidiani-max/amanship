import { Router } from "express";

const router = Router();

/**
 * POST /api/chatbot/grocery-assistant
 */
router.post("/grocery-assistant", async (req, res) => {
  try {
    const { userMessage, productCatalog } = req.body;

    if (!userMessage || !productCatalog) {
      return res.status(400).json({
        error: "Missing required fields: userMessage and productCatalog",
      });
    }

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY as string,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
  model: 'claude-sonnet-4-20250514',
  max_tokens: 900,
  messages: [
    {
      role: 'system',
      content: `
You are an AI grocery assistant inside a shopping app.

CRITICAL RULES:
- Always reply in the SAME language as the user's last message
- NEVER change language unless the user changes it
- DO NOT show product IDs to the user
- Products must be added ONLY from the provided catalog
- Delivery time is ALWAYS under 15 minutes
- If the user confirms, mark items as ready_to_add = true
- Be concise and friendly
`
    },
    {
      role: 'user',
      content: `
User message:
"${userMessage}"

Available products (JSON):
${productCatalog}

RESPONSE FORMAT (STRICT JSON ONLY):

{
  "message": "Friendly text shown to user (NO product IDs)",
  "language": "detected language code (id / en / etc)",
  "ready_to_add": true | false,
  "products": [
    {
      "productId": "id-from-catalog",
      "quantity": 1
    }
  ]
}

RULES:
- If user says yes/ya/ok → ready_to_add = true
- If just suggesting → ready_to_add = false
- products must be empty if nothing matches
`
    }
  ]
}),

    });

    if (!response.ok) {
      const errorData = await response.json();
      return res.status(response.status).json({
        error: "AI service error",
        details: errorData,
      });
    }

    const data = await response.json();

    res.json({
      success: true,
      content: data.content?.[0]?.text ?? "AI response missing",
    });
  } catch (error: any) {
    res.status(500).json({
      error: "Internal server error",
      message: error.message,
    });
  }
});

export default router;
