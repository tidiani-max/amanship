// FILE: server/routes/chatbot.js (or api/chatbot.js)
// This should go in your backend/server code

const express = require('express');
const router = express.Router();

/**
 * POST /api/chatbot/grocery-assistant
 * Proxies requests to Anthropic API with proper authentication
 */
router.post('/grocery-assistant', async (req, res) => {
  try {
    const { userMessage, productCatalog } = req.body;

    if (!userMessage || !productCatalog) {
      return res.status(400).json({ 
        error: 'Missing required fields: userMessage and productCatalog' 
      });
    }

    // Call Anthropic API with your secret API key
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY, // ← Your secret key from .env
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        messages: [
          {
            role: 'user',
            content: `You are a helpful grocery shopping assistant. The user wants to cook something.

Available products in store:
${productCatalog}

User request: "${userMessage}"

Your task:
1. Understand what they want to cook
2. Find matching products from the available list
3. Respond in a friendly, helpful way
4. At the end, provide a JSON list of products to add to cart

Format your response like this:
[Your friendly message here]

PRODUCTS_TO_ADD:
[{"id": "product-id", "name": "Product Name", "quantity": 1}]

Rules:
- Only suggest products that exist in the available list
- Be realistic about quantities (e.g., 1 milk, 2 eggs means 2 cartons)
- If a product isn't available, suggest alternatives
- Keep quantities reasonable for one recipe`,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Anthropic API Error:', errorData);
      return res.status(response.status).json({ 
        error: 'AI service error', 
        details: errorData 
      });
    }

    const data = await response.json();
    
    // Send response back to client
    res.json({
      success: true,
      content: data.content?.[0]?.text || 'Sorry, I had trouble understanding that.',
    });

  } catch (error) {
    console.error('Chatbot API Error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
});

module.exports = router;