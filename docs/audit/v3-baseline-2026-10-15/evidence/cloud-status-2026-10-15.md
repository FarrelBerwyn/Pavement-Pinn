# Cloud status check — 2026-10-15 (read-only)

| Provider | Result |
|---|---|
| RunPod (connected account) | 1 pod `90dxpis2kkdxuu` (RTX PRO 4000 Blackwell, image runpod/pytorch torch 2.8, EU-RO-1), status **EXITED**, created 2026-10-09. 0 serverless endpoints, 0 network volumes. No PAVEMENT-PINN service deployed. |
| Vercel | Connector not authorized in this session — status **unknown**, not verified. |
| Supabase | No connector; migration still not applied per F-24 (unchanged). |

Observations:
- The pod's env exposes a `JUPYTER_PASSWORD` in plain env config (value intentionally not reproduced). Rotate it if the pod is restarted. → new finding F-52 [P2, INT].
- An exited GPU pod could serve as the Python runtime for training (relevant to HD-01 / F-38), but v3 §5.2 benchmarks must still run on the Intel interview laptop.
