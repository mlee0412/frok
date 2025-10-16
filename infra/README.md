# infra

Infrastructure utilities and scripts.

## scripts/

- **bootstrap.ps1**
  - Installs Node (from `.nvmrc`) via nvm
  - Creates Python 3.12 virtualenv at `.venv` and upgrades `pip`
  - Usage:
    ```powershell
    .\infra\scripts\bootstrap.ps1
    ```

- **dev.ps1**
  - Activates Node from `.nvmrc`
  - Activates `.venv` if present and prints versions
  - Usage:
    ```powershell
    .\infra\scripts\dev.ps1
    ```

- **check-setup.ps1**
  - Verifies prerequisites: nvm, pnpm, Python 3.12, Git
  - Checks for `.venv`, root `node_modules`, and `apps/web/node_modules`
  - Usage:
    ```powershell
    .\infra\scripts\check-setup.ps1
    ```

## Workflow (pnpm)

```powershell
# once per machine
.\infra\scripts\check-setup.ps1
.\infra\scripts\bootstrap.ps1

# install workspace deps
pnpm install

# start development
pnpm dev         # all apps
pnpm dev:web     # web only
pnpm dev:api     # api only
```
