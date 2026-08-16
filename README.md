# Industrial Compliance System

Permit to Work for Endoscopy Decontamination (QA-ADM01 / EDUWI09): User checks, CP(D) declaration, hand-back, User review, AP(D) close.

**Demo login:** `john ferrer` / `admin`

Engineers do not log in. They use the QR / link on each permit (`/p/{token}`).

## Share with a coworker

Repo: https://github.com/RanneG/compliance-system

After the first successful GitHub Actions run, they can start the full app with:

```bash
docker run --rm -p 8787:8787 ghcr.io/ranneg/compliance-system:latest
```

Then open http://127.0.0.1:8787 and sign in as `john ferrer` / `admin`.

Or open in [GitHub Codespaces](https://codespaces.new/RanneG/compliance-system).

## Run locally (Windows)

```powershell
python -m venv .venv
.\.venv\Scripts\pip install -r backend\requirements.txt
cd frontend
npm install
cd ..
.\Start-PTW.ps1
```

- Manager UI (dev): http://127.0.0.1:5173
- API: http://127.0.0.1:8787/api/health

## Tests

```powershell
.\.venv\Scripts\pytest
```
