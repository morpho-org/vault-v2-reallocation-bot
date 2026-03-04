Scaffold a new reallocation strategy for the Vault v2 Reallocation Bot.

## Steps

1. Ask for the strategy name (camelCase, e.g. `myNewStrategy`)

2. Create the strategy implementation file at `apps/client/src/strategies/marketV1/<strategyName>/index.ts`:

```typescript
import { VaultV2Data } from "../../../utils/types";
import { Strategy } from "../../strategy";

export class <StrategyClassName> implements Strategy {
  findReallocation(vaultData: VaultV2Data) {
    // TODO: Implement reallocation logic
    // Return { allocations: [...], deallocations: [...] } or undefined
    return undefined;
  }
}
```

3. Add the strategy name to the `StrategyName` union type in `apps/config/src/types.ts`

4. Add a case for the new strategy in `createStrategy` in `apps/client/src/strategies/factory.ts`:
   - Import the new strategy class
   - Add a `case "<strategyName>":` returning a new instance

5. Export the new strategy from `apps/client/src/strategies/index.ts`

6. Ask if the strategy needs custom configuration. If yes:
   - Create a config file at `apps/config/src/strategies/<strategyName>.ts`
   - Export it from `apps/config/src/strategies/index.ts`

7. Build and verify:
   - Run `pnpm build:config` to rebuild the config package
   - Run `npx tsc --noEmit` in `apps/client` to verify types
