// ═══════════════════════════════════════════════════════════════════
// GOOGLE APPS SCRIPT — VERSIÓN OPTIMIZADA PARA +500 PRODUCTOS
// ═══════════════════════════════════════════════════════════════════
//
// ✅ ARQUITECTURA DE CACHÉ EN 2 CAPAS:
//
//   CAPA 1 — Apps Script (CacheService)
//   El doGet() guarda el JSON en memoria del servidor por 5 minutos.
//   La mayoría de los requests no leen el Sheet.
//
//   CAPA 2 — Frontend (localStorage)
//   El navegador guarda los productos por 15 minutos.
//   Si el caché está fresco, la tienda carga AL INSTANTE sin llamar a la API.
//   Si expiró, muestra lo cacheado y refresca en segundo plano.
//
//   RESULTADO: Con 500 productos, el usuario ve la tienda en <100ms.
//
// ═══════════════════════════════════════════════════════════════════
//
// ⚠️  REQUISITO: La columna "Imagen" del Sheet debe tener URLs completas,
//     NO nombres de archivo. Usá la función convertirImagenesAURLs() de
//     abajo UNA VEZ para convertir los nombres a URLs automáticamente.
//
// ═══════════════════════════════════════════════════════════════════


// ─────────────────────────────────────────────────────────────────
// doGet() — ENDPOINT PRINCIPAL (lo llama el frontend)
// ─────────────────────────────────────────────────────────────────
function doGet(e) {
  // 👉 Tiempo de caché del servidor en segundos (300 = 5 minutos)
  var CACHE_SEGUNDOS = 300;

  // Intentar servir desde caché del servidor
  var cache = CacheService.getScriptCache();
  var cached = getChunked(cache, "productos_json");

  if (cached) {
    return ContentService.createTextOutput(cached)
      .setMimeType(ContentService.MimeType.JSON);
  }

  // Si no hay caché, leer del Sheet
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Inventario");

  if (!sheet) {
    return ContentService.createTextOutput(
      JSON.stringify({ "status": "error", "error": "No se encontró la hoja 'Inventario'" })
    ).setMimeType(ContentService.MimeType.JSON);
  }

  var data = sheet.getDataRange().getValues();
  var headers = data[0];
  var productos = [];

  for (var i = 1; i < data.length; i++) {
    var row = data[i];

    // Ignorar filas sin ID (vacías)
    if (!row[0]) continue;

    var producto = {};
    for (var j = 0; j < headers.length; j++) {
      producto[headers[j]] = row[j];
    }

    // NO usamos DriveApp acá — la columna Imagen ya tiene la URL
    productos.push(producto);
  }

  var response = JSON.stringify({
    "status": "success",
    "total_productos": productos.length,
    "data": productos
  });

  // Guardar en caché del servidor
  // CacheService soporta ítems de hasta 100KB. Si el JSON es más grande,
  // se divide en chunks automáticamente (ver putChunked más abajo).
  try {
    if (response.length < 100000) {
      cache.put("productos_json", response, CACHE_SEGUNDOS);
    } else {
      putChunked(cache, "productos_json", response, CACHE_SEGUNDOS);
    }
  } catch (e) {
    // Si falla el caché, se sirve igual — no es crítico
  }

  return ContentService.createTextOutput(response)
    .setMimeType(ContentService.MimeType.JSON);
}


// ─────────────────────────────────────────────────────────────────
// CACHÉ CHUNKED — Para JSONs de más de 100KB (~600+ productos)
// CacheService tiene un límite de 100KB por entrada.
// Esto divide el JSON en pedazos y los junta al leerlos.
// ─────────────────────────────────────────────────────────────────
function putChunked(cache, key, value, ttl) {
  var chunkSize = 90000; // 90KB por chunk (dejamos margen)
  var chunks = [];
  for (var i = 0; i < value.length; i += chunkSize) {
    chunks.push(value.substring(i, i + chunkSize));
  }
  var entries = {};
  entries[key + "_meta"] = String(chunks.length);
  for (var c = 0; c < chunks.length; c++) {
    entries[key + "_" + c] = chunks[c];
  }
  cache.putAll(entries, ttl);
}

function getChunked(cache, key) {
  // Primero intentar lectura directa (si cabe en una sola entrada)
  var direct = cache.get(key);
  if (direct) return direct;

  // Si no, buscar chunks
  var meta = cache.get(key + "_meta");
  if (!meta) return null;
  var count = parseInt(meta);
  var keys = [];
  for (var i = 0; i < count; i++) {
    keys.push(key + "_" + i);
  }
  var parts = cache.getAll(keys);
  var result = "";
  for (var j = 0; j < count; j++) {
    var part = parts[key + "_" + j];
    if (!part) return null; // Chunk perdido
    result += part;
  }
  return result;
}


// ─────────────────────────────────────────────────────────────────
// FUNCIÓN AUXILIAR: Convertir nombres de archivo a URLs (CORRER UNA VEZ)
// ─────────────────────────────────────────────────────────────────
// Ejecutá esta función desde: Editor → Ejecutar → convertirImagenesAURLs
//
// Lee la columna "Imagen" del Sheet. Si tiene un nombre de archivo (no URL),
// busca ese archivo en Drive y REEMPLAZA la celda con la URL del thumbnail.
// Después de esto, el doGet() nunca más necesita DriveApp.

function convertirImagenesAURLs() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Inventario");
  var data = sheet.getDataRange().getValues();
  var headers = data[0];

  // Encontrar el índice de la columna "Imagen"
  var colImagen = headers.indexOf("Imagen");
  if (colImagen === -1) {
    Logger.log("❌ No se encontró la columna 'Imagen'");
    return;
  }

  var cambios = 0;
  var errores = 0;

  for (var i = 1; i < data.length; i++) {
    var valor = data[i][colImagen];

    // Si ya es una URL o está vacío, saltar
    if (!valor || String(valor).startsWith("http")) continue;

    try {
      var fileName = String(valor).split('/').pop();
      var files = DriveApp.getFilesByName(fileName);

      if (files.hasNext()) {
        var file = files.next();
        var url = "https://drive.google.com/thumbnail?id=" + file.getId() + "&sz=w800";

        // Escribir la URL directamente en la celda (fila i+1 porque es 1-indexed)
        sheet.getRange(i + 1, colImagen + 1).setValue(url);
        cambios++;
        Logger.log("✓ Fila " + (i + 1) + ": " + fileName + " → " + url);
      } else {
        errores++;
        Logger.log("✗ Fila " + (i + 1) + ": No se encontró '" + fileName + "' en Drive");
      }
    } catch (error) {
      errores++;
      Logger.log("✗ Fila " + (i + 1) + ": Error - " + error.toString());
    }
  }

  Logger.log("═══════════════════════════════");
  Logger.log("✅ Actualizadas: " + cambios + " imágenes");
  Logger.log("❌ Con errores: " + errores);
  Logger.log("═══════════════════════════════");
}


// ─────────────────────────────────────────────────────────────────
// FUNCIÓN AUXILIAR: Limpiar caché (correr tras editar productos)
// ─────────────────────────────────────────────────────────────────
// Si modificás productos en el Sheet y querés que los cambios se reflejen
// inmediatamente (sin esperar los 5 minutos del caché), ejecutá esto.

function limpiarCache() {
  var cache = CacheService.getScriptCache();
  cache.remove("productos_json");
  cache.remove("productos_json_meta");
  // Limpiar chunks por si se usaron
  for (var i = 0; i < 20; i++) {
    cache.remove("productos_json_" + i);
  }
  Logger.log("✅ Caché limpiado. El próximo request leerá del Sheet.");
}


// ─────────────────────────────────────────────────────────────────
// TRIGGER POR TIEMPO: Convertir imágenes nuevas + limpiar caché
// ─────────────────────────────────────────────────────────────────
// AppSheet edita el Sheet vía API → el onEdit simple NO se dispara.
// Por eso usamos un trigger por tiempo que corre cada X minutos.
//
// 👉 CÓMO INSTALAR EL TRIGGER:
// 1. Abrí el editor de Apps Script
// 2. Menú "Triggers" (ícono del reloj) → "+ Agregar trigger"
// 3. Configurar así:
//    - Función ejecutar:       sincronizarProductos
//    - Despliegue:             Principal
//    - Fuente del evento:      Basado en el tiempo
//    - Tipo de trigger:        Temporizador en minutos
//    - Intervalo:              Cada 5 minutos (o 15 si querés menos ejecuciones)
// 4. Guardar
//
// Esto revisa cada 5 min si hay imágenes sin convertir (las que pone AppSheet)
// y las transforma a URLs automáticamente.

function sincronizarProductos() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Inventario");
  if (!sheet) return;

  var data = sheet.getDataRange().getValues();
  var headers = data[0];
  var colImagen = headers.indexOf("Imagen");
  if (colImagen === -1) return;

  var huboCambios = false;

  for (var i = 1; i < data.length; i++) {
    var valor = data[i][colImagen];

    // Saltar si ya es URL o está vacío
    if (!valor || String(valor).startsWith("http")) continue;

    // Es un nombre/ruta de archivo (lo que pone AppSheet) → convertir
    try {
      var fileName = String(valor).split('/').pop(); // "Productos_Images/abc.jpg" → "abc.jpg"
      var files = DriveApp.getFilesByName(fileName);

      if (files.hasNext()) {
        var file = files.next();
        var url = "https://drive.google.com/thumbnail?id=" + file.getId() + "&sz=w800";
        sheet.getRange(i + 1, colImagen + 1).setValue(url);
        huboCambios = true;
        Logger.log("✓ Fila " + (i + 1) + ": " + fileName + " → " + url);
      } else {
        Logger.log("✗ Fila " + (i + 1) + ": No se encontró '" + fileName + "'");
      }
    } catch (err) {
      Logger.log("✗ Fila " + (i + 1) + ": Error - " + err.toString());
    }
  }

  // Si hubo conversiones nuevas, limpiar caché para que la tienda se actualice
  if (huboCambios) {
    limpiarCache();
    Logger.log("✅ Imágenes convertidas y caché limpiado.");
  }
}


// ─────────────────────────────────────────────────────────────────
// TRIGGER onEdit: Limpiar caché al editar manualmente el Sheet
// ─────────────────────────────────────────────────────────────────
// Este trigger se activa SOLO con ediciones manuales en el Sheet
// (no con AppSheet). Limpia el caché para reflejar cambios de
// precio, stock, etc. que hagas a mano.
//
// 👉 CÓMO INSTALAR (opcional, solo si editás el Sheet a mano):
//    Función: onEdit | Fuente: De una hoja de cálculo | Tipo: Al editarse

function onEdit(e) {
  if (e.source.getActiveSheet().getName() === "Inventario") {
    limpiarCache();
  }
}
