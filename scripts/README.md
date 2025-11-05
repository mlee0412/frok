# scripts

Development and utility scripts for the FROK monorepo.

## Available Scripts

### Windows PowerShell Scripts

**`dev-reset.ps1`**
```powershell
.\scripts\dev-reset.ps1
```
- Kills all Node.js processes
- Frees ports 3000, 3001, 5432
- Clears Next.js cache (`.next`, `.next-dev`)

**Purpose**: Use when dev server hangs or ports are locked

---

## Infrastructure Scripts

See [`infra/scripts/README.md`](../infra/README.md) for:
- `bootstrap.ps1` - Environment setup
- `dev.ps1` - Activate dev environment
- `check-setup.ps1` - Verify prerequisites

---

## Usage

All scripts should be run from the repository root:

```powershell
# Development reset
.\scripts\dev-reset.ps1

# Infrastructure setup
.\infra\scripts\bootstrap.ps1
```

---

## Adding New Scripts

1. Place script in `scripts/` directory
2. Add documentation here
3. Ensure cross-platform compatibility when possible
