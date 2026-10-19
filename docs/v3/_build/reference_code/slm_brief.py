"""slm_brief.py - local SLM on Intel NPU via OpenVINO GenAI; numbers inserted by code, then checked.
Model export (once):  optimum-cli export openvino --model Qwen/Qwen2.5-1.5B-Instruct --weight-format int4 --sym models/qwen2.5-1.5b-int4-ov
(Follow the OpenVINO GenAI NPU guide for recommended INT4 settings of your version.) NOT executed during document prep.
"""
import json, time
from pavement_core import check_brief

ROLE_STYLE = {
    "engineer": "insinyur jalan; teknis; sebut kriteria [KRITERIA] dan bahwa angka bersifat indikatif",
    "operator": "operator pemeliharaan; fokus tindakan berikutnya dan tenggat",
    "planner":  "perencana anggaran; bahasa awam; fokus risiko bagi pengendara dan prioritas",
}
SYSTEM = ("Tulis ringkasan maksimal 80 kata dalam Bahasa Indonesia untuk {style}. "
          "Untuk SETIAP angka gunakan HANYA placeholder berikut: [ET] [EV] [L10] [L50] [L90] [ESAL]. "
          "Jangan menulis angka lain. Jangan memakai kata aman, pasti, dijamin, korupsi, lalai. "
          "Jangan menyimpulkan kesalahan pihak mana pun.")

def fmt_id(x, nd=1):
    s = f"{x:,.{nd}f}" if abs(x) < 1000 else f"{x:,.0f}"
    return s.replace(",", "X").replace(".", ",").replace("X", ".")

def qualitative(f):   # code computes categories; the model never sees raw numbers
    l50 = f["L50"]
    return dict(kelas=f["kelas"], keparahan=f["keparahan"], kondisi=f["kondisi"],
                kategori_umur="sangat pendek" if l50 < 1 else "pendek" if l50 < 3 else "sedang" if l50 < 8 else "panjang",
                mekanisme=f["mekanisme"], ketidakpastian="lebar" if f["L90"] > 3 * max(f["L10"], 1e-6) else "sedang")

def brief(pipe, role, f, max_tries=2):
    prompt = SYSTEM.format(style=ROLE_STYLE[role]) + "\nFAKTA:\n" + json.dumps(qualitative(f), ensure_ascii=False)
    fill = {"[ET]": fmt_id(f["et"], 0), "[EV]": fmt_id(f["ev"], 0), "[L10]": fmt_id(f["L10"]),
            "[L50]": fmt_id(f["L50"]), "[L90]": fmt_id(f["L90"]), "[ESAL]": fmt_id(f["esal_day"], 0),
            "[KRITERIA]": f["kriteria"]}
    facts = {k: round(f[k], 1) for k in ("et", "ev", "L10", "L50", "L90", "esal_day")}
    facts.update({"et0": round(f["et"]), "ev0": round(f["ev"]), "esal0": round(f["esal_day"])})
    for _ in range(max_tries):
        t = time.time(); raw = pipe.generate(prompt, max_new_tokens=220, do_sample=False); dt = time.time() - t
        text = str(raw)
        for k, v in fill.items(): text = text.replace(k, v)
        chk = check_brief(text, facts)
        if chk["ok"]:
            return dict(text=text + "\n\nDisusun AI dari data sistem. Perlu persetujuan manusia.", checker=chk, seconds=dt)
    tpl = (f"{f['kelas'].capitalize()} tingkat {f['keparahan']}. Regangan kritis: εt {fill['[ET]']} µε, εv {fill['[EV]']} µε "
           f"({f['kriteria']}). Indeks Umur indikatif P50 {fill['[L50]']} tahun (P10 {fill['[L10]']} sampai P90 {fill['[L90]']}).")
    return dict(text=tpl + "\n\nTemplat otomatis (SLM gagal pemeriksaan).", checker=check_brief(tpl, facts), seconds=None)

if __name__ == "__main__":
    import openvino_genai as ov_genai
    pipe = ov_genai.LLMPipeline("models/qwen2.5-1.5b-int4-ov", "NPU")     # fallback: "GPU", "CPU"
    f = dict(kelas="lubang", keparahan="High", kondisi="basah", mekanisme="alur tanah dasar", kriteria="Asphalt Institute",
             et=227, ev=876, L10=0.2, L50=0.4, L90=0.7, esal_day=1760)
    for role in ROLE_STYLE: print(role, json.dumps(brief(pipe, role, f), ensure_ascii=False, indent=1))
