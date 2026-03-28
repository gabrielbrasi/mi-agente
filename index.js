require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const Anthropic = require('@anthropic-ai/sdk');
const Database = require('better-sqlite3');

const bot = new TelegramBot(process.env.TELEGRAM_TOKEN, { polling: true });
const claude = new Anthropic();
const db = new Database('agente.db');

// Crear tabla si no existe
db.exec(`CREATE TABLE IF NOT EXISTS tareas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  chat_id TEXT NOT NULL,
  tarea TEXT NOT NULL,
  fecha TEXT DEFAULT 'Sin fecha',
  creada_en DATETIME DEFAULT CURRENT_TIMESTAMP
)`);

const memoria = {};

const SYSTEM_PROMPT = `Eres un asistente personal de Gabriel. Eres directo, eficiente y respondes siempre en español. Cuando el usuario mencione una tarea o compromiso, usa guardar_tarea. Cuando pregunte que tiene pendiente, usa listar_tareas. Cuando quiera borrar una tarea, usa borrar_tarea.`;

const tools = [
  { name: "guardar_tarea", description: "Guarda una tarea pendiente", input_schema: { type: "object", properties: { tarea: { type: "string" }, fecha: { type: "string" } }, required: ["tarea"] } },
  { name: "listar_tareas", description: "Lista todas las tareas pendientes", input_schema: { type: "object", properties: {} } },
  { name: "borrar_tarea", description: "Borra una tarea por numero", input_schema: { type: "object", properties: { numero: { type: "number" } }, required: ["numero"] } }
];

function ejecutarHerramienta(nombre, input, chatId) {
  if (nombre === 'guardar_tarea') {
    db.prepare('INSERT INTO tareas (chat_id, tarea, fecha) VALUES (?, ?, ?)').run(chatId, input.tarea, input.fecha || 'Sin fecha');
    return 'Tarea guardada correctamente.';
  }
  if (nombre === 'listar_tareas') {
    const lista = db.prepare('SELECT * FROM tareas WHERE chat_id = ? ORDER BY id').all(chatId);
    if (lista.length === 0) return 'No tienes tareas pendientes.';
    return lista.map((t, i) => `${i+1}. ${t.tarea} - ${t.fecha}`).join('\n');
  }
  if (nombre === 'borrar_tarea') {
    const lista = db.prepare('SELECT * FROM tareas WHERE chat_id = ? ORDER BY id').all(chatId);
    if (lista.length === 0) return 'No tienes tareas pendientes.';
    const idx = input.numero - 1;
    if (idx < 0 || idx >= lista.length) return 'Numero invalido.';
    db.prepare('DELETE FROM tareas WHERE id = ?').run(lista[idx].id);
    return `Tarea borrada: ${lista[idx].tarea}`;
  }
}

bot.on('message', async (msg) => {
  const chatId = String(msg.chat.id);
  const userText = msg.text;
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
    console.log(`Herramienta: ${toolUse.name}`);
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

console.log('Agente con SQLite corriendo...');
