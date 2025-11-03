# FROK Quick Start Cheat Sheet

## 🚀 Quick Setup
```powershell
.\infra\scripts\check-setup.ps1
.\infra\scripts\bootstrap.ps1
pnpm install
```

## ✅ Check What's Installed
```powershell
.\infra\scripts\check-setup.ps1
```

## 📦 Prerequisites
1. **nvm-windows**: https://github.com/coreybutler/nvm-windows/releases
2. **Python 3.12**: https://www.python.org/downloads/
3. **Git**: https://git-scm.com/download/win

## ⚙️ Manual Setup (if needed)
```powershell
# 1. Bootstrap
.\infra\scripts\bootstrap.ps1

# 2. Install deps (workspace)
pnpm install

# 3. Activate Python env (optional)
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
deactivate
```

## 🎯 Start Development
```powershell
# Prepare dev shell (optional)
.\infra\scripts\dev.ps1

# Start all apps
pnpm dev

# Start only web
pnpm dev:web   # → http://localhost:3000

# Start only api
pnpm dev:api
```

## 📁 Project Structure
- `/apps/web` - Next.js 15 app (React 19, TypeScript, Tailwind)
- `/apps/api` - Fastify API (TypeScript)
- `/packages/*` - Shared libraries
- `/services/*` - Services (e.g., agents)
- `/infra/scripts` - Setup & dev scripts
- `/.venv` - Python virtual environment (optional)

## 🛠️ Useful Commands
```powershell
pnpm dev            # Dev all apps
pnpm dev:web        # Dev web only
pnpm dev:api        # Dev api only
pnpm lint           # Lint code
pnpm typecheck      # TS checks
.\scripts\dev-reset.ps1  # Reset dev state
```

## 🔧 Troubleshooting
**PowerShell script errors:**
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

**Can't find Python 3.12:**
```powershell
py -3.12 --version
```

**Node version issues:**
```powershell
nvm use 22.11.0
```

---
**Full docs:** See `SETUP_GUIDE.md`
