// api/chat.js
// Este archivo es una función serverless de Node.js para Vercel.
// Actúa como un proxy seguro a la API de Gemini.

export default async function handler(request, response) {
    // 1. Solo permitir solicitudes POST por seguridad
    if (request.method !== 'POST') {
        return response.status(405).json({ message: 'Método no permitido' });
    }

    // 2. Obtener el historial de chat y el prompt del cuerpo de la solicitud
    const { chatHistory, prompt } = request.body;

    if (!prompt && (!chatHistory || chatHistory.length === 0)) {
        return response.status(400).json({ error: 'Prompt o historial de chat missing.' });
    }

    // 3. Obtener la clave API de las variables de entorno de Vercel
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        console.error('Error: GEMINI_API_KEY no configurada en las variables de entorno de Vercel.');
        return response.status(500).json({ error: 'La clave API de Gemini no está configurada en el servidor.' });
    }

    // URL de la API de Gemini
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

    try {
        // Preparar el payload para la API de Gemini
        const payload = { contents: chatHistory }; // Usamos el historial completo para el contexto

        // 4. Realizar la llamada server-to-server a la API de Gemini
        const geminiResponse = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        });

        // Manejar posibles errores de la API de Gemini
        if (!geminiResponse.ok) {
            const errorText = await geminiResponse.text();
            console.error("Error de la API de Gemini:", errorText);
            // Intentamos parsear el error para dar más detalle si es JSON
            try {
                const errorJson = JSON.parse(errorText);
                return response.status(geminiResponse.status).json({ error: errorJson.error.message || 'Error desconocido de la API de Gemini' });
            } catch (e) {
                return response.status(geminiResponse.status).json({ error: `Error de la API de Gemini: ${errorText}` });
            }
        }

        const result = await geminiResponse.json();

        // 5. Enviar la respuesta completa de Gemini de vuelta al frontend
        // ¡CAMBIO CLAVE AQUÍ! Devolvemos 'result' completo, no solo 'result.text'
        return response.status(200).json(result);

    } catch (error) {
        console.error("Error interno del servidor:", error);
        return response.status(500).json({ error: error.message || 'Error interno del servidor al procesar la solicitud.' });
    }
}
