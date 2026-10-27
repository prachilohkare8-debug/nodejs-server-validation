# SignalDesk — Server-Side Validation with Node.js

Practical 4 individual-style project for Web Technology. It uses Node.js core modules only (no Express or external runtime packages).

## Requirements
- Node.js 18 or later
- npm (installed with Node.js)

## Run locally
1. Extract this ZIP.
2. Open the `202401040025_prachilohkare_p4_servervalidation` folder in VS Code.
3. Open **Terminal → New Terminal**.
4. Run:

   ```bash
   npm start
   ```

5. Open `http://localhost:3000`.

No `npm install` is required for runtime dependencies because this project uses only Node.js built-in modules. `npm install` is optional and creates no third-party runtime dependencies.

## Routes
- `GET /` — web interface
- `GET /api/health` — health check, HTTP 200
- `POST /api/contact` — server-side validation; HTTP 201 for valid input, HTTP 422 for invalid fields, HTTP 400 for malformed JSON, HTTP 413 for oversized body
- `GET /api/submissions` — reads stored submissions as JSON
- `GET /api/events` — streams the event log as text

## Test requests (use a second terminal while server is running)

Valid request:
```bash
curl -i -X POST http://localhost:3000/api/contact \
  -H "Content-Type: application/json" \
  -d '{"name":"Prachi Lohkare","email":"prachi@example.com","topic":"Course enquiry","message":"I would like details about the upcoming web technology lab."}'
```

Invalid request:
```bash
curl -i -X POST http://localhost:3000/api/contact \
  -H "Content-Type: application/json" \
  -d '{"name":"A","email":"bad-email","topic":"Unknown","message":"Short"}'
```

Inspect saved submissions:
```bash
curl -i http://localhost:3000/api/submissions
```

Stream/read event log:
```bash
curl -i http://localhost:3000/api/events
```

## Node.js capabilities demonstrated
- Core modules: `http`, `fs`, `path`, `events`
- Custom module: `lib/validator.js`
- File system: append validated submissions to `data/submissions.jsonl`
- Events: `EventEmitter` records requests, accepted submissions, and rejected submissions
- Streams: `createReadStream(...).pipe(res)` serves assets and streams the event log; `createWriteStream` appends server events

## Deployment
This project is compatible with Node hosting such as Render or Railway. Create a web service from your GitHub repository. Build command can be left blank; start command is `npm start`. The server reads `process.env.PORT`, as required by most hosts. Note that ephemeral hosting filesystems may reset stored data on redeploy/restart, so this file-based demo is for the lab, not production data storage.

## Screenshots for report
Run the application and capture genuine screenshots:
1. Browser UI before submission.
2. Invalid request in the UI showing HTTP 422 and validation errors.
3. Valid request showing HTTP 201 and generated submission ID.
4. `GET /api/submissions` output with saved data.
5. Optional: `GET /api/events` output demonstrating the event log stream.

Do not use illustrative mockups as if they were real browser screenshots.

## Submission checklist
- Replace name/PRN/division/date placeholders in the PDF if needed.
- Add the real GitHub repository URL and deployed URL after deployment.
- Capture actual output screenshots and insert them in the PDF.
- Test valid and invalid requests using the included curl commands.
- Do not include `node_modules`, secrets, or credentials.
- Be ready to explain the custom module, HTTP routes, status codes, EventEmitter, file writes, and streams during viva.

## AI use declaration
The report includes an AI-use table. Update it to accurately reflect the tools you used, what you checked, and what you corrected or rejected.
