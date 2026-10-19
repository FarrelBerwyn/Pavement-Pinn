"""train_pi_surrogate.py - physics-informed surrogate for layered-elastic strains (PyTorch -> OpenVINO).
Physics enters through (1) dimensionless inputs/outputs (exact elastic similarity + load scaling at fixed a),
(2) log targets (strictly positive strains), (3) monotonicity penalty via autograd at unlabelled collocation points.
NOTE: written against current PyTorch/OpenVINO APIs but NOT executed while preparing the document - test it.
Usage: python train_pi_surrogate.py --data data/mlet_dual.npz --out models/pi_surrogate
"""
import argparse, json, time, hashlib, os
import numpy as np
import torch, torch.nn as nn

def make_xy(d):
    X, out, k = d["X"], d["out"], float(d["k_cbr"])
    P, q, h1, h2, E1, E2, CBR = X.T
    a, et, ev = out.T
    E3 = k * CBR
    F = np.stack([np.log(h1 / a), np.log(h2 / a), np.log(E1 / E3), np.log(E2 / E3)], 1)
    Y = np.stack([np.log(et * 1e-6 * E3 / q), np.log(ev * 1e-6 * E3 / q)], 1)
    return F.astype(np.float32), Y.astype(np.float32)

class PISurrogate(nn.Module):
    def __init__(self, fmu, fsd, ymu, ysd, width=64):
        super().__init__()
        for n, v in dict(fmu=fmu, fsd=fsd, ymu=ymu, ysd=ysd).items():
            self.register_buffer(n, torch.tensor(v, dtype=torch.float32))
        self.net = nn.Sequential(nn.Linear(4, width), nn.Tanh(), nn.Linear(width, width), nn.Tanh(),
                                 nn.Linear(width, width), nn.Tanh(), nn.Linear(width, 2))
    def forward(self, x):                      # x: [N,4] dimensionless log-features
        return self.net((x - self.fmu) / self.fsd) * self.ysd + self.ymu   # [N,2] log(eps*E3/q)

# Required signs of d(output_k)/d(feature_j): -1 decrease, +1 increase, 0 unconstrained.
# rows: ln(h1/a), ln(h2/a), ln(E1/E3), ln(E2/E3); cols: (et, ev)
# VERIFY each non-zero entry on PyMastic perturbations first (see verify_signs in README); drop any that fail.
SIGNS = torch.tensor([[0, -1],
                      [0, -1],
                      [-1, -1],
                      [-1, -1]], dtype=torch.float32)

def mono_penalty(model, x):
    x = x.clone().requires_grad_(True)
    y = model(x)
    pen = 0.0
    for k in range(2):
        g = torch.autograd.grad(y[:, k].sum(), x, create_graph=True)[0]      # [N,4]
        pen = pen + (torch.relu(-SIGNS[:, k].to(x.device) * g) ** 2).mean()
    return pen

def metrics(model, F, Y):
    with torch.no_grad():
        p = model(F)
    rel = torch.exp(p - Y) - 1                  # relative error in strain (same q, E3)
    out = {}
    for k, n in enumerate(["et", "ev"]):
        e = rel[:, k].abs().cpu().numpy()
        out[n] = dict(mape=float(e.mean() * 100), p95=float(np.percentile(e, 95) * 100))
    return out

if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--data", required=True); ap.add_argument("--out", default="models/pi_surrogate")
    ap.add_argument("--epochs", type=int, default=4000); ap.add_argument("--lam", type=float, default=0.1)
    ap.add_argument("--seed", type=int, default=0)
    a = ap.parse_args(); torch.manual_seed(a.seed); np.random.seed(a.seed)
    dev = "xpu" if hasattr(torch, "xpu") and torch.xpu.is_available() else "cpu"
    dev_name = torch.xpu.get_device_name(0) if dev == "xpu" else "cpu"
    d = np.load(a.data, allow_pickle=True); F, Y = make_xy(d)
    idx = np.random.permutation(len(F)); n_tr = int(0.8 * len(F)); tr, te = idx[:n_tr], idx[n_tr:]
    fmu, fsd = F[tr].mean(0), F[tr].std(0); ymu, ysd = Y[tr].mean(0), Y[tr].std(0)
    fmin, fmax = F[tr].min(0), F[tr].max(0)
    model = PISurrogate(fmu, fsd, ymu, ysd).to(dev)
    Ftr, Ytr = torch.tensor(F[tr], device=dev), torch.tensor(Y[tr], device=dev)
    Fte, Yte = torch.tensor(F[te], device=dev), torch.tensor(Y[te], device=dev)
    lo, hi = torch.tensor(fmin, device=dev), torch.tensor(fmax, device=dev)
    opt = torch.optim.Adam(model.parameters(), lr=2e-3)
    sched = torch.optim.lr_scheduler.CosineAnnealingLR(opt, a.epochs)
    t0 = time.time()
    for ep in range(a.epochs):
        b = torch.randint(0, len(Ftr), (512,), device=dev)
        colloc = lo + (hi - lo) * torch.rand(1024, 4, device=dev)          # unlabelled physics points
        loss_d = ((model(Ftr[b]) - Ytr[b]) ** 2).mean()
        loss_m = mono_penalty(model, colloc)
        loss = loss_d + a.lam * loss_m
        opt.zero_grad(); loss.backward(); opt.step(); sched.step()
        if ep % 500 == 0:
            print(f"ep {ep} data {loss_d.item():.2e} mono {loss_m.item():.2e}")
    train_s = time.time() - t0
    model.eval()
    viol = float((mono_penalty(model, lo + (hi - lo) * torch.rand(20000, 4, device=dev)) > 0).item())
    m = dict(test=metrics(model, Fte, Yte), n_train=int(n_tr), n_test=int(len(te)), train_seconds=train_s,
             device=dev_name, lam=a.lam, epochs=a.epochs, mono_penalty_positive=viol,
             domain=dict(fmin=fmin.tolist(), fmax=fmax.tolist()))
    os.makedirs(os.path.dirname(a.out) or ".", exist_ok=True)
    torch.save(model.state_dict(), a.out + ".pt")
    # ---- export to OpenVINO IR (FP16 weights by default) ----
    import openvino as ov
    model_cpu = model.to("cpu")
    ov_model = ov.convert_model(model_cpu, example_input=torch.zeros(8, 4), input=[ov.PartialShape([-1, 4])])
    ov.save_model(ov_model, a.out + "_fp16.xml")                 # compress_to_fp16=True by default
    ov.save_model(ov_model, a.out + "_fp32.xml", compress_to_fp16=False)
    m["sha256_xml"] = hashlib.sha256(open(a.out + "_fp16.bin", "rb").read()).hexdigest()
    json.dump(m, open(a.out + "_metrics.json", "w"), indent=2)
    print(json.dumps(m, indent=2))
