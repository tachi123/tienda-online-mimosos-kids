# 🧸 Mimosos Moda Kids — Tienda Online

Tienda online de ropa para niños. Single-page app estática desplegada en **GitHub Pages**, con catálogo dinámico desde Google Sheets.

## 🔗 Demo

👉 [mimososmoda.com.ar](https://mimososmoda.com.ar)

## ✨ Funcionalidades

- **Catálogo dinámico** — Productos cargados en tiempo real desde Google Sheets vía Google Apps Script
- **Búsqueda inteligente** — Búsqueda por nombre, categoría o talle con debounce
- **Filtros por sección** — Filtrado rápido por tipo de prenda
- **Carrito de compras** — Persistente en localStorage, con control de cantidades
- **Checkout por WhatsApp** — Envío del pedido directo por WhatsApp con resumen formateado
- **Caché de 2 capas** — localStorage (15 min) + Google CacheService (5 min) para carga instantánea
- **Paginación progresiva** — "Mostrar más" para catálogos grandes (+500 productos)
- **Diseño responsive** — Mobile-first, optimizado para todos los dispositivos
- **FAQ integrado** — Preguntas frecuentes con acordeón interactivo

## 🛠 Stack

| Capa | Tecnología |
|---|---|
| Frontend | HTML5 + Tailwind CSS (CDN) + Vanilla JS ES6+ |
| Backend / API | Google Apps Script |
| Base de datos | Google Sheets |
| Gestión de productos | AppSheet |
| Imágenes | Google Drive (URLs públicas) |
| Hosting | GitHub Pages |
| Dominio | mimososmoda.com.ar |

## 📁 Estructura

```
├── index.html                  # Aplicación completa (HTML + CSS + JS)
├── logo.png                    # Logo de la marca
├── apps-script-optimizado.js   # Código del backend (Google Apps Script)
└── README.md
```

## 📊 Backend (Google Apps Script)

El archivo `apps-script-optimizado.js` contiene el código del backend que se despliega en Google Apps Script como Web App. Lee los productos desde la hoja "Inventario" de Google Sheets y los sirve como JSON.

### Configurar

1. Abrir [Google Apps Script](https://script.google.com) vinculado a tu Google Sheet
2. Pegar el contenido de `apps-script-optimizado.js`
3. Desplegar como Web App (acceso: "Cualquier persona")
4. Copiar la URL generada y pegarla en `API_URL` dentro de `index.html`

## 📝 Licencia

Proyecto privado — Mimosos Moda Kids © 2026
