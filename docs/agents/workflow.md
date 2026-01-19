# Development Workflow

## 🧠 Memory Bank

The project uses a memory bank in the `memory/` folder to track design decisions and task progress.

- Consult `.github/instructions/memory-bank.instructions.md` for conventions.

## 🛠️ Spec-Driven Workflow

We follow an **Analyze → Design → Implement → Validate → Reflect → Handoff** cycle.

- Consult `.github/instructions/spec-driven-workflow-v1.instructions.md` for details.

## 🧪 Testing & Linting

### Linting & Formatting

Always run linting before submitting changes.

```bash
npm run format      # Fix formatting with Prettier
npm run lint -- --max-warnings=0  # Run ESLint (extra -- is required to pass flags)
```

### Type Checking

```bash
npm run typecheck   # Run tsc --noEmit
```

### Tests

```bash
npm run test        # Run unit tests with Vitest
```
