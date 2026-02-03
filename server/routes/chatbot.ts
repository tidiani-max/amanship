import { Router } from "express";
const router = Router();

/**
 * POST /api/chatbot/grocery-assistant
 * Improved version with better AI prompting and language support
 */
router.post("/grocery-assistant", async (req, res) => {
  try {
    console.log('📥 Received chatbot request:', {
      hasUserMessage: !!req.body.userMessage,
      hasProductCatalog: !!req.body.productCatalog,
      language: req.body.language,
      userMessageLength: req.body.userMessage?.length,
      catalogLength: req.body.productCatalog?.length,
    });

    const { userMessage, productCatalog, language = 'en' } = req.body;

    if (!userMessage) {
      console.error('❌ Missing userMessage');
      return res.status(400).json({
        error: "Missing required field: userMessage",
        received: { userMessage: !!userMessage, productCatalog: !!productCatalog }
      });
    }

    if (!productCatalog) {
      console.error('❌ Missing productCatalog');
      return res.status(400).json({
        error: "Missing required field: productCatalog",
        received: { userMessage: !!userMessage, productCatalog: !!productCatalog }
      });
    }

    // Create language-aware system prompt
    const systemPrompt = language === 'id' 
      ? `Anda adalah asisten belanja bahan makanan yang sangat membantu dan ramah. Tugas Anda:

1. Pahami apa yang ingin dimasak pengguna
2. Cari produk yang cocok dari daftar yang tersedia
3. HANYA rekomendasikan produk dari toko terdekat (pengiriman 15 menit)
4. Berikan saran dengan cara yang ramah dan natural
5. Di akhir, berikan daftar JSON produk untuk ditambahkan ke keranjang

Produk yang tersedia (sudah diurutkan berdasarkan waktu pengiriman tercepat):
${productCatalog}

Permintaan pengguna: "${userMessage}"

PENTING:
- Hanya rekomendasikan produk yang ADA di daftar
- Prioritaskan toko dengan pengiriman tercepat (15 menit atau kurang)
- Jangan sebutkan ID produk atau detail teknis
- Gunakan jumlah yang masuk akal (contoh: 1 susu, 2 telur = 2 kemasan)
- Jika produk tidak tersedia, sarankan alternatif

Format respons:
[Pesan ramah Anda di sini, sebutkan nama produk dan dari toko mana]

PRODUCTS_TO_ADD:
[{"id": "product-id", "name": "Nama Produk", "quantity": 1}]`
      : `You are a helpful and friendly grocery shopping assistant. Your tasks:

1. Understand what the user wants to cook
2. Find matching products from the available list
3. ONLY recommend products from nearest stores (15-minute delivery)
4. Provide advice in a natural, friendly way
5. At the end, provide a JSON list of products to add to cart

Available products (already sorted by fastest delivery time):
${productCatalog}

User request: "${userMessage}"

IMPORTANT:
- Only recommend products that EXIST in the list
- Prioritize stores with fastest delivery (15 minutes or less)
- Don't mention product IDs or technical details
- Use realistic quantities (e.g., 1 milk, 2 eggs = 2 cartons)
- If a product is unavailable, suggest alternatives

Response format:
[Your friendly message here, mention product names and which store they're from]

PRODUCTS_TO_ADD:
[{"id": "product-id", "name": "Product Name", "quantity": 1}]`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY as string,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1500,
        temperature: 0.7,
        messages: [
          {
            role: "user",
            content: systemPrompt,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Anthropic API Error:", errorData);
      return res.status(response.status).json({
        error: "AI service error",
        details: errorData,
      });
    }

    const data = await response.json();
    const aiResponse = data.content?.[0]?.text ?? "AI response missing";

    res.json({
      success: true,
      content: aiResponse,
    });
  } catch (error: any) {
    console.error("Chatbot error:", error);
    res.status(500).json({
      error: "Internal server error",
      message: error.message,
    });
  }
});

export default router;