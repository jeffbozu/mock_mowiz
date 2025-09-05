// Importa la biblioteca de Gemini
const { GoogleGenerativeAI } = require("@google/generative-ai");

// Carga las variables de entorno desde el archivo .env
require("dotenv").config();

// Accede a tu clave de API desde el archivo .env
const API_KEY = process.env.GEMINI_API_KEY;

// Inicializa el modelo de Gemini
const genAI = new GoogleGenerativeAI(API_KEY);

async function run() {
  // Elige el modelo a usar (Gemini Pro es el más común para texto)
  const model = genAI.getGenerativeModel({ model: "gemini-pro" });

  const prompt = "Dime un hecho interesante sobre la historia de los ordenadores.";

  const result = await model.generateContent(prompt);
  const response = await result.response;
  const text = response.text();

  console.log(text);
}

run();