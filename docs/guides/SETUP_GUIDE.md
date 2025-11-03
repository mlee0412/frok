# FROK Project - PC Setup Guide

## Prerequisites Installation

### 1. Install Node Version Manager (nvm) for Windows

**Download & Install:**
- Visit: https://github.com/coreybutler/nvm-windows/releases
- Download `nvm-setup.exe` (latest version)
- Run the installer with default settings
- Restart your terminal/PowerShell after installation

**Verify Installation:**
```powershell
nvm version
```

### 2. Install Python 3.12

**Download & Install:**
- Visit: https://www.python.org/downloads/
- Download Python 3.12.x (latest 3.12 version)
- **IMPORTANT:** Check "Add Python to PATH" during installation
- Choose "Customize installation"
- Ensure "pip" is selected
- Install for all users (recommended)

**Verify Installation:**
```powershell
py -3.12 --version
python --version
pip --version
```

### 3. Install Git (if not already installed)

**Download & Install:**
- Visit: https://git-scm.com/download/win
- Download and run the installer
- Use default settings

**Verify Installation:**
```powershell
git --version
```

---

## Project Setup

### Step 1: Run Bootstrap Script

Open PowerShell in the project root (`C:\Dev\Frok`) and run:

```powershell
# Allow script execution (if needed - run PowerShell as Administrator)
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser

# Navigate to project
cd C:\Dev\Frok

# Run bootstrap script
.\infra\scripts\bootstrap.ps1
```

**What this does:**
- Installs Node.js 22.11.0 via nvm
- Creates Python virtual environment in `.venv`
- Upgrades pip to latest version

### Step 2: Install Project Dependencies

#### Install Workspace Dependencies:
```powershell
pnpm install
```

#### Install Python Dependencies:
```powershell
# Activate Python virtual environment
.\.venv\Scripts\Activate.ps1

# Install Python packages (when you add them to requirements.txt)
pip install -r requirements.txt

# Deactivate when done
deactivate
```

---

## Development Workflow

### Start Development Environment

Use the provided dev script:

```powershell
# From project root
.\infra\scripts\dev.ps1
```

**This script:**
- Activates Node 22.11.0
- Activates Python virtual environment
- Shows version info for Node, npm, Python, and pip

### Run the Web App

```powershell
# Make sure dev environment is active (run infra\scripts\dev.ps1)
pnpm dev:web
```

The Next.js app will start at: http://localhost:3000

---

## Troubleshooting

### PowerShell Execution Policy Error

If you get "cannot be loaded because running scripts is disabled":

```powershell
# Run PowerShell as Administrator
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### Python Command Not Found

Try these alternatives:
```powershell
python --version
py --version
py -3.12 --version
```

Make sure Python is in your PATH. You may need to restart your terminal or PC.

### nvm Not Recognized

- Restart your terminal/PowerShell completely
- If still not working, reinstall nvm-windows
- Make sure to close ALL terminal windows before retrying

### Node Modules Issues

If you encounter dependency issues:
```powershell
# Reinstall workspace dependencies
pnpm install

# Reset dev caches and free common ports
.\scripts\dev-reset.ps1
```

---

## Project Structure

```
C:/Dev/Frok/
├── .venv/                 # Python virtual environment (optional)
├── apps/
│   ├── web/               # Next.js web application
│   │   ├── src/           # Web source code
│   │   ├── public/        # Static assets
│   │   └── package.json
│   └── api/               # Fastify API (TypeScript)
├── packages/              # Shared libraries (types, db, clients, etc.)
├── services/              # Services (e.g., agents)
├── infra/
│   └── scripts/           # bootstrap.ps1, dev.ps1, check-setup.ps1
├── package.json           # Root scripts (turbo, workspace)
├── pnpm-workspace.yaml    # Workspace config
└── requirements.txt       # Python dependencies
```

---

## Quick Command Reference

```powershell
# Bootstrap (first time setup)
.\infra\scripts\bootstrap.ps1

# Start dev environment shell (optional)
.\infra\scripts\dev.ps1

# Install workspace dependencies
pnpm install

# Run web app in development
pnpm dev:web

# Run all apps in development
pnpm dev

# Lint and typecheck
pnpm lint
pnpm typecheck
```

---

## Next Steps

1. ✅ Install prerequisites (nvm, Python 3.12, Git)
2. ✅ Run bootstrap script: `./infra/scripts/bootstrap.ps1`
3. ✅ Install dependencies: `pnpm install`
4. ✅ Start development server: `pnpm dev` or `pnpm dev:web`
5. 🚀 Begin development!

---

## Useful Links

- Node.js: https://nodejs.org/
- Python: https://www.python.org/
- Next.js Docs: https://nextjs.org/docs
- React Docs: https://react.dev/
- Tailwind CSS: https://tailwindcss.com/docs
- Home Assistant: https://www.home-assistant.io/

---

**Need help?** Check the README.md or consult the project documentation.
