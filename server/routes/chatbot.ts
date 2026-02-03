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
        model: "claude-sonnet-4-20250514",
        max_tokens: 1000,
        messages: [
          {
            role: "user",
            content: `You are a helpful grocery shopping assistant.

Available products in store:
${productCatalog}

User request: "${userMessage}"`,
          },
        ],
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
