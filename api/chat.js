// api/chat.js
// Este archivo es una función serverless de Node.js para Vercel.
// Maneja las llamadas a la API de Gemini de forma segura, usando una variable de entorno.

export default async function handler(request, response) {
    // Asegura que solo se acepten solicitudes POST
    if (request.method !== 'POST') {
        return response.status(405).json({ error: 'Método no permitido. Solo se aceptan POST.' });
    }

    // Extrae el historial de chat y el prompt del cuerpo de la solicitud
    const { chatHistory, prompt } = request.body;

    // Obtiene la clave API de las variables de entorno de Vercel
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        // Si la clave API no está configurada, devuelve un error 500
        console.error('Error: GEMINI_API_KEY no configurada en las variables de entorno de Vercel.');
        return response.status(500).json({ error: 'La clave API de Gemini no está configurada en el servidor.' });
    }

    // URL de la API de Gemini
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

    try {
        // Prepara el payload para la API de Gemini
        const payload = { contents: chatHistory };

        // Realiza la llamada a la API de Gemini
        const apiResponse = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        // Verifica si la respuesta de la API fue exitosa
        if (!apiResponse.ok) {
            const errorText = await apiResponse.text();
            console.error('Respuesta de error de la API de Gemini:', errorText);
            return response.status(apiResponse.status).json({ error: `Error de la API de Gemini: ${errorText}` });
        }

        // Parsea la respuesta JSON de la API de Gemini
        const result = await apiResponse.json();

        // Extrae el texto de la respuesta del bot
        if (result.candidates && result.candidates.length > 0 &&
            result.candidates[0].content && result.candidates[0].content.parts &&
            result.candidates[0].content.parts.length > 0) {
            const botResponse = result.candidates[0].content.parts[0].text;
            // Devuelve la respuesta del bot al cliente
            return response.status(200).json({ text: botResponse });
        } else {
            // Maneja casos donde la estructura de la respuesta es inesperada
            console.error("Estructura de respuesta inesperada de Gemini:", result);
            return response.status(500).json({ error: "Respuesta inesperada de la API de Gemini." });
        }
    } catch (error) {
        // Manejo de errores de red o del servidor
        console.error("Error en la función serverless:", error);
        return response.status(500).json({ error: "Error interno del servidor al procesar la solicitud." });
    }
}
