# Authorized autopilot verification

This fork keeps the 1.3.1 production implementation at upstream commit
`1959e78edb9e203a67b9def70ce74b3610e5da3c`. The added acceptance driver
checks its existing behavior; it does not claim a discovered panel authorization
vulnerability or change the permission model.

The panel obtains identity from DSH Connection admission and requires a live owner.
An identity supplied in request JSON grants no access. Goal authorization is an
explicit owner-reviewed scope; enabling autopilot also confirms its exact hash.
Global pause, goal pause and disabling autopilot prevent later scheduling. An
already admitted run may finish. Revoking a scope closes its tool gates and requests
cancellation; absence of a settled terminal event produces UNKNOWN rather than a
claim that a process was killed. Restart recovery reconciles uncertain runs instead
of resending their prompts. Trusted command mode remains a deliberately broader
permission with textual checks; arbitrary scripts are not a filesystem sandbox.
See [the usage guide](usage.en.md) before granting it.

After installing the locked dependencies and building the source, run:

```sh
CI=true pnpm install --frozen-lockfile
CI=true pnpm build
CI=true DSH_TEST_RUNTIME=/absolute/path/to/dsh-runtime pnpm test:authorized-autopilot
```

The runtime directory must contain
`node_modules/@deepseek-ai/dsh/lib/bin.js`; verification uses DSH 0.2.1-rc.3.
`DSH_TEST_SOURCE` can select another built source candidate.
`DSH_TEST_ROOT` can select the existing parent of fresh temporary profiles.
The driver never uses an operational profile or existing DSH_HOME.

The single command starts real DSH on an OS-assigned loopback port in its own
process group. It obtains a real signed owner cookie, confirms a synthetic goal
and scope through native panel POST requests, checks settled pause/resume,
executes native sessions and a native file-write tool in a separate Git worktree,
runs a real independent `npm test`, checks completion, and restarts to check durable
pause and final state. Original workspace HEAD and cleanliness must remain intact.
It has bounded deadlines, stops its own host processes and moves its synthetic
profile and workspace to Trash on exit. It performs no external model or messaging
calls. The model adapter is a deterministic substitute: this proves the integration
path, not real-model reasoning, planning quality, browser UI, or third-party services.

An optional `--live` mode uses the native `deepseek-official/deepseek-flash`
adapter at `https://api.deepseek.com/anthropic`. Use it only with explicit permission
to spend the account's API quota. Select a trusted executable via
`DSH_TEST_KEY_HELPER`; it must return the approved key for the argument
`PI_DEEPSEEK_API_KEY` on stdout. The key is captured without printing and stored
through native credentials in the temporary home with mode 0600, then removed
before cleanup. This mode runs one synthetic goal, disables automatic request
retries, enforces an eight-call ceiling and skips the restart run. It changes an
existing synthetic result file and uses the same real independent acceptance.
Default invocation never selects this mode or loads credentials.

Related existing regression coverage is in Connection, scope service, execution
and scheduler tests. They check unauthenticated requests, wrong origins, scope
revocation, protected paths and symlink escapes, final admission after pause,
an admitted run finishing during pause, and restart reconciliation of UNKNOWN.
