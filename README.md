# DocsMapper - PDF Auto-Filler

PDF Auto-Filler application with multi-format export (PDF, DOCX, Google Docs) built with Express.js MVC architecture.

## Features

- ✅ Upload PDF templates
- ✅ Create bounding boxes on blank fields
- ✅ Map multiple boxes to single form fields (multi-box mapping)
- ✅ Fill forms and export to PDF/DOCX/Docs
- ✅ Color-coded field visualization (10 pastel colors)
- ✅ SQLite database for persistent mappings
- ✅ Free PDF to DOCX conversion (LibreOffice headless)

## Project Structure

```
DocsMapper/
├── public/              # Static frontend files
│   ├── css/            # Styles (Tailwind CDN + custom CSS)
│   ├── js/             # JavaScript modules
│   ├── pages/          # Additional HTML pages
│   └── index.html      # Main entry point
├── src/                # Backend MVC
│   ├── config/         # Database, session config
│   ├── models/         # Database models
│   ├── controllers/    # Request handlers
│   ├── services/       # Business logic
│   ├── routes/         # API routes
│   └── middleware/     # Custom middleware
├── database/           # SQLite database files
├── temp/               # Temporary file storage
│   ├── uploads/        # Uploaded PDFs
│   └── generated/      # Generated files
├── PDF/                # Reference (old code)
├── server.js           # Express app entry point
└── package.json        # Dependencies

```

## Installation

### Prerequisites
- Node.js (v16+)
- LibreOffice (for PDF to DOCX conversion)

### Setup

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd DocsMapper
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Install LibreOffice** (for DOCX conversion)
   ```bash
   # Ubuntu/Debian
   sudo apt-get install libreoffice

   # macOS
   brew install libreoffice
   ```

4. **Create environment file**
   ```bash
   cp .env.example .env
   # Edit .env and set SESSION_SECRET
   ```

5. **Run development server**
   ```bash
   npm run dev
   ```

6. **Access the application**
   - Open `http://localhost:3000` in your browser

## Development

```bash
# Development mode (with auto-reload)
npm run dev

# Production mode
npm start
```

## Technology Stack

### Backend
- **Express.js** - Web framework
- **SQLite (better-sqlite3)** - Lightweight database
- **pdf-lib** - PDF manipulation
- **multer** - File uploads
- **express-session** - Session management
- **libreoffice-convert** - PDF to DOCX conversion

### Frontend
- **Tailwind CSS (CDN)** - Utility-first CSS framework
- **PDF.js** - PDF rendering and annotation
- **Vanilla JavaScript** - No framework, pure JS

## API Endpoints

- `GET /api/health` - Health check
- `POST /api/templates/upload` - Upload PDF template
- `POST /api/boxes` - Save bounding boxes
- `POST /api/mappings` - Create field mappings
- `GET /api/mappings/:templateId` - Get field mappings
- `POST /api/export/pdf` - Export filled PDF
- `POST /api/export/docx` - Export filled DOCX

## Workflow

1. **Upload PDF** - Upload your PDF template
2. **Create Boxes** - Draw bounding boxes on all blank fields across all pages
3. **Map Fields** - Click "Create Form Field", select multiple boxes, assign to field name
4. **Fill & Export** - Fill the form once, export to PDF/DOCX/Docs

## License

ISC

## Author

Your Name
