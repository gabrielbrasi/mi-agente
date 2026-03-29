require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const Anthropic = require('@anthropic-ai/sdk');
const fs = require('fs');

const bot = new TelegramBot(process.env.TELEGRAM_TOKEN, { polling: true });
const claude = new Anthropic();

const DB_FILE = 'tareas.json';

function loadTareas() {
  if (!fs.existsSync(DB_FILE)) return {};
  return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
}

function saveTareas(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

const memoria = {};

const SYSTEM_PROMPT = `Eres un asistente personal de Gabriel. Eres directo, eficiente y respondes siempre en español. Cuando el usuario mencione una tarea o compromiso, usa guardar_tarea. Cuando pregunte que tiene pendiente, usa listar_tareas. Cuando quiera borrar una tarea, usa borrar_tarea.`;

const tools = [
  { name: "guardar_tarea", description: "Guarda una tarea pendiente", input_schema: { type: "object", properties: { tarea: { type: "string" }, fecha: { type: "string" } }, required: ["tarea"] } },
  { name: "listar_tareas", description: "Lista todas las tareas pendientes", input_schema: { type: "object", properties: {} } },
  { name: "borrar_tarea", description: "Borra una tarea por numero", input_schema: { type: "object", properties: { numero: { type: "number" } }, required: ["numero"] } }
];

function ejecutarHerramienta(nombre, input, chatId) {
  const db = loadTareas();
  if (!db[chatId]) db[chatId] = [];

  if (nombre === 'guardar_tarea') {
    db[chatId].push({ tarea: input.tarea, fecha: input.fecha || 'Sin fecha' });
    saveTareas(db);
    return 'Tarea guardada correctamente.';
  }
  if (nombre === 'listar_tareas') {
    if (db[chatId].length === 0) return 'No tienes tareas pendientes.';
    return db[chatId].map((t, i) => `${i+1}. ${t.tarea} - ${t.fecha}`).join('\n');
  }
  if (nombre === 'borrar_tarea') {
    if (db[chatId].length === 0) return 'No tienes tareas pendientes.';
    const idx = input.numero - 1;
    const borrada = db[chatId].splice(idx, 1);
    saveTareas(db);
    return `Tarea borrada: ${borrada[0].tarea}`;
  }
}

bot.on('message', async (msg) => {
  const chatId = String(msg.chat.id);
  const userText = msg.text;
  console.log(`chat_id: ${chatId} | msg: ${userText}`);
  if (!memoria[chatId]) memoria[chatId] = [];
  memoria[chatId].push({ role: 'user', content: userText });

  const response = await claude.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    tools: tools,
    messages: memoria[chatId]
  });

  if (response.stop_reason === 'tool_use') {
    const toolUse = response.content.find(b => b.type === 'tool_use');
    const resultado = ejecutarHerramienta(toolUse.name, toolUse.input, chatId);
    memoria[chatId].push({ role: 'assistant', content: response.content });
    memoria[chatId].push({ role: 'user', content: [{ type: 'tool_result', tool_use_id: toolUse.id, content: resultado }] });

    const r2 = await claude.messages.create({ model: 'claude-sonnet-4-20250514', max_tokens: 1024, system: SYSTEM_PROMPT, tools: tools, messages: memoria[chatId] });
    const texto = r2.content[0].text;
    memoria[chatId].push({ role: 'assistant', content: texto });
    if (memoria[chatId].length > 20) memoria[chatId] = memoria[chatId].slice(-20);
    bot.sendMessage(chatId, texto);
  } else {
    const texto = response.content[0].text;
    memoria[chatId].push({ role: 'assistant', content: texto });
    if (memoria[chatId].length > 20) memoria[chatId] = memoria[chatId].slice(-20);
    bot.sendMessage(chatId, texto);
  }
});

console.log('Agente corriendo...');
