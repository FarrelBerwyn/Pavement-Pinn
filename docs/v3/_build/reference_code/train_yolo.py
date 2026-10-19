"""train_yolo.py - RDD2022 (+ local photos) -> YOLO 4 classes -> OpenVINO INT8. NOT executed during document prep.
Steps: 1) convert RDD2022 Pascal-VOC XML to YOLO txt; 2) split by location/day; 3) train; 4) evaluate; 5) export.
"""
import argparse, glob, os, xml.etree.ElementTree as ET, json, platform
CLASS_MAP = {"D00": 0, "D10": 1, "D20": 2, "D40": 3}       # longitudinal, transverse, alligator, pothole
NAMES = ["longitudinal", "transverse", "alligator", "pothole"]

def voc_to_yolo(xml_dir, out_dir):
    os.makedirs(out_dir, exist_ok=True); n = 0
    for xf in glob.glob(os.path.join(xml_dir, "*.xml")):
        r = ET.parse(xf).getroot(); W = float(r.find("size/width").text); H = float(r.find("size/height").text)
        lines = []
        for o in r.findall("object"):
            c = o.find("name").text.strip()
            if c not in CLASS_MAP: continue
            b = o.find("bndbox"); x1, y1, x2, y2 = (float(b.find(k).text) for k in ("xmin", "ymin", "xmax", "ymax"))
            lines.append(f"{CLASS_MAP[c]} {(x1+x2)/2/W:.6f} {(y1+y2)/2/H:.6f} {(x2-x1)/W:.6f} {(y2-y1)/H:.6f}")
        open(os.path.join(out_dir, os.path.basename(xf)[:-4] + ".txt"), "w").write("\n".join(lines)); n += 1
    return n

DATA_YAML = """path: data/rdd_local
train: images/train
val: images/val
test: images/test_local      # local corridor photos only, never used for training
names: {0: longitudinal, 1: transverse, 2: alligator, 3: pothole}
"""

if __name__ == "__main__":
    ap = argparse.ArgumentParser(); ap.add_argument("--weights", default="yolo11n.pt")
    ap.add_argument("--epochs", type=int, default=100); ap.add_argument("--data", default="data/rdd_local.yaml")
    a = ap.parse_args()
    import torch
    from ultralytics import YOLO
    dev = "xpu" if hasattr(torch, "xpu") and torch.xpu.is_available() else "cpu"   # check Ultralytics XPU support
    model = YOLO(a.weights)
    model.train(data=a.data, epochs=a.epochs, imgsz=640, batch=16, device=dev, seed=0, project="runs", name="rdd_local")
    test = model.val(data=a.data, split="test")
    # Export: older Ultralytics: int8=True ; newer: quantize=8 (check your version)
    path = model.export(format="openvino", int8=True, data=a.data, imgsz=640)
    json.dump(dict(train_device=dev, host=platform.processor(), map50=float(test.box.map50),
                   map50_95=float(test.box.map), per_class_map50=[float(x) for x in test.box.ap50],
                   export=str(path)), open("runs/rdd_local/metrics_test.json", "w"), indent=2)
