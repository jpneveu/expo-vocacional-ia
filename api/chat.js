// api/chat.js
// Este archivo es una función serverless de Node.js para Vercel.
// Actúa como un proxy seguro a la API de Gemini.

export default async function handler(request, response) {
    // 1. Solo permitir solicitudes POST por seguridad
    if (request.method !== 'POST') {
        return response.status(405).json({ message: 'Method Not Allowed' });
    }

    // 2. Obtener el prompt y el historial de chat del cuerpo de la solicitud
    // ¡CAMBIO CLAVE AQUÍ! Esperamos 'userPrompt' y 'chatHistory'
    const { userPrompt, chatHistory } = request.body;

    // Verificar que al menos el prompt principal esté presente
    if (!userPrompt) {
        console.error('Error: userPrompt is missing in the request body.');
        return response.status(400).json({ error: 'El prompt principal está vacío o falta.' });
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
        // Construir el payload para la API de Gemini
        // El prompt principal va primero, luego el historial de chat
        const contents = [{ role: "user", parts: [{ text: userPrompt }] }];
        if (chatHistory && Array.isArray(chatHistory)) {
            contents.push(...chatHistory); // Añadir el historial si existe
        }

        const payload = { contents: contents };

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
            try {
                const errorJson = JSON.parse(errorText);
                return response.status(geminiResponse.status).json({ error: errorJson.error.message || 'Error desconocido de la API de Gemini' });
            } catch (e) {
                return response.status(geminiResponse.status).json({ error: `Error de la API de Gemini: ${errorText}` });
            }
        }

        const data = await geminiResponse.json();
        
        // 5. Enviar la respuesta completa de Gemini de vuelta al frontend
        return response.status(200).json(data);

    } catch (error) {
        console.error("Error interno del servidor:", error);
        return response.status(500).json({ error: error.message || 'Error interno del servidor al procesar la solicitud.' });
    }
}
