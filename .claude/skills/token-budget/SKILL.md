---
name: token-budget
description: Reglas para gastar pocos tokens en cualquier tarea de este repo (leer archivos, investigar, delegar y escribir). Cárgala al empezar cualquier tarea.
---

# Presupuesto de tokens

Toda tarea en este repo sigue estas reglas, tanto al desarrollar con Claude como al tocar las llamadas de el agente a la API de Claude. El objetivo es el mismo resultado con menos tokens: leer menos, buscar menos, no repetir nada y escribir solo lo necesario.

## 1. Lee solo lo que la tarea necesita

- Primero localiza con Grep o Glob y luego lee con `offset`/`limit`. No leas archivos enteros "para tener contexto".
- No vuelvas a leer un archivo que ya leíste o escribiste en esta tarea; trabaja con lo que tienes.
- Nunca leas `package-lock.json`, `agente.db` ni `.env`. Las claves nunca se imprimen ni se copian en el chat.
- El código principal es un solo archivo: busca la función con Grep y lee solo ese bloque.

## 2. Investiga una vez y reutilízalo

- Antes de buscar en internet, mira si el dato ya está guardado en el repo (comentarios en el código o un `NOTAS.md`). Si está y es reciente, úsalo y no busques otra vez: precios y tarifas 30 días, normativa e impuestos 90 días.
- Planifica las búsquedas y lánzalas juntas en un mismo turno. Tope: 3 para un dato simple, 8 para una comparativa. Pregunta a Gabriel antes de pasar de 8.
- Usa el modo de búsqueda `standard`; `extended` solo si la estándar no encuentra nada o está desactualizada.
- Abre una página solo cuando el resumen no baste, y pide exactamente los datos que necesitas.
- Guarda lo investigado (comentarios en el código o un `NOTAS.md`) con fecha y enlaces, para que la próxima tarea no pague por ello.

## 3. Delega poco

- Haz la tarea tú mismo siempre que puedas: un subagente empieza sin contexto y vuelve a leerlo todo.
- Si delegas, da un encargo completo: objetivo, archivos y secciones a leer, datos ya conocidos y archivo de salida. Nunca pongas a dos agentes con la misma pregunta.

## 4. Edita, no reescribas

- Cambia los archivos con Edit, solo las líneas que cambian. Reescribe un archivo entero solo si cambia casi todo.
- No copies contenido entre archivos; enlaza a él.

## 5. Escribe corto

- Respuestas a Gabriel: la respuesta en 2-3 líneas y la siguiente acción. Sin resumir los pasos que diste ni repetir la pregunta.
- No pegues en el chat el contenido de archivos ni la salida de herramientas; da la ruta.

## 6. Para cuando termines

- Cuando la tarea esté hecha, para. Nada de extras, alternativas ni secciones opcionales que nadie pidió.
- Si algo depende de Gabriel, escribe la pregunta en una línea y para.

## 7. Consumo de el agente en producción

- Usa el modelo más barato que haga bien cada tarea, y fija `max_tokens` a lo que necesita la respuesta.
- No reenvíes el historial completo en cada mensaje: recorta a los últimos turnos o a un resumen.
- Si cambias prompts o modelos, di cuánto sube o baja el consumo esperado.
