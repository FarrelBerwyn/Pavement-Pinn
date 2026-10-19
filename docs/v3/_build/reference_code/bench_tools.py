"""bench_tools.py - reproducible OpenVINO benchmark -> measurements/*.json (single source for the Evidence page).
NOT executed during document prep. Protocol: 50 warm-up, >=1000 timed runs, p50/p95/p99, cold start, deviation vs FP32.
"""
import json, time, platform, hashlib, datetime, sys
import numpy as np

def bench(xml, device, inputs, ref_xml=None, warmup=50, runs=1000, out=None):
    import openvino as ov
    core = ov.Core()
    t0 = time.perf_counter(); cm = core.compile_model(xml, device); cold = (time.perf_counter() - t0) * 1000
    req = cm.create_infer_request()
    for _ in range(warmup): req.infer(inputs)
    ts = []
    for _ in range(runs):
        t = time.perf_counter(); req.infer(inputs); ts.append((time.perf_counter() - t) * 1000)
    res = dict(model=xml, sha256=hashlib.sha256(open(xml.replace(".xml", ".bin"), "rb").read()).hexdigest()[:16],
               device=device, device_name=core.get_property(device, "FULL_DEVICE_NAME"),
               available_devices=core.available_devices, openvino=ov.get_version(),
               batch=int(np.asarray(list(inputs.values())[0] if isinstance(inputs, dict) else inputs).shape[0]),
               cold_start_ms=cold, p50_ms=float(np.percentile(ts, 50)), p95_ms=float(np.percentile(ts, 95)),
               p99_ms=float(np.percentile(ts, 99)), runs=runs, host=platform.platform(),
               date=datetime.datetime.now().isoformat(timespec="seconds"), power="not measured")
    if ref_xml:   # numerical deviation vs FP32 reference on the same inputs
        ref = core.compile_model(ref_xml, "CPU")(inputs)[0]; got = cm(inputs)[0]
        res["max_abs_dev_vs_fp32"] = float(np.max(np.abs(got - ref)))
        res["max_rel_dev_vs_fp32"] = float(np.max(np.abs(got - ref) / (np.abs(ref) + 1e-9)))
    if out: json.dump(res, open(out, "w"), indent=2)
    return res

if __name__ == "__main__":
    F = np.load(sys.argv[1]).astype(np.float32)          # e.g. 2000x4 Monte Carlo features
    for dev in ("CPU", "GPU", "NPU"):
        try:
            print(bench("models/pi_surrogate_fp16.xml", dev, F, ref_xml="models/pi_surrogate_fp32.xml",
                        out=f"measurements/pi_surrogate_{dev.lower()}.json"))
        except Exception as e:
            print(dev, "not available:", e)
