import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import { INDONESIAN_ROAD_SEGMENTS } from "./src/data/indonesianRoads";
import { runPinnSimulation } from "./src/utils/pinnEngine";
import { SimulationParams } from "./src/types";

let aiClient: GoogleGenAI | null = null;

function getGeminiClient(): GoogleGenAI | null {
  if (!aiClient && process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== "MY_GEMINI_API_KEY") {
    try {
      aiClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    } catch (err) {
      console.warn("Failed to initialize Gemini AI client:", err);
    }
  }
  return aiClient;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", appName: "PAVEMENT-PINN", timestamp: new Date().toISOString() });
  });

  // Get Road Segments
  app.get("/api/roads", (_req, res) => {
    res.json(INDONESIAN_ROAD_SEGMENTS);
  });

  // Run PINN Physics Simulation
  app.post("/api/simulate", (req, res) => {
    try {
      const params: SimulationParams = req.body.params;
      const segmentId = params.segmentId || "PANTURA-KM62";
      const roadSegment =
        INDONESIAN_ROAD_SEGMENTS.find((r) => r.id === segmentId) ||
        INDONESIAN_ROAD_SEGMENTS[0];

      const result = runPinnSimulation(params, roadSegment);
      res.json({ success: true, result });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message || "Simulation error" });
    }
  });

  // OpenVINO Model Export Configuration Download
  app.get("/api/openvino/export-ir", (req, res) => {
    const device = (req.query.device as string) || "NPU";
    const precision = (req.query.precision as string) || "INT8_NNCF";

    const xmlContent = `<?xml version="1.0"?>
<net name="Pavement_PINN_Degradation_Model" version="11">
  <layers>
    <layer id="0" name="input_tensors" type="Parameter" version="opset1">
      <data element_type="f32" shape="1, 7"/>
      <output>
        <port id="0" precision="FP32" names="axle_load,rain_mm,flood_hrs,temp_c,cbr_pct,thickness_cm,modulus_mpa"/>
      </output>
    </layer>
    <layer id="1" name="pinn_dense_1" type="MatMul" version="opset1">
      <data transpose_a="false" transpose_b="false"/>
      <input><port id="0" precision="FP32"/></input>
      <output><port id="1" precision="FP32"/></output>
    </layer>
    <layer id="2" name="physics_pde_constraint" type="PhysicsPDEOp" version="custom">
      <data pde_equation="Burmister_Multilayer_Elasticity_4th_Power_ODOL"/>
    </layer>
    <layer id="3" name="output_tensors" type="Result" version="opset1">
      <data element_type="f32"/>
      <input><port id="0" precision="FP32" names="tensile_strain,compressive_strain,deflection,pci_drop"/></input>
    </layer>
  </layers>
  <edges>
    <edge from-layer="0" from-port="0" to-layer="1" to-port="0"/>
    <edge from-layer="1" from-port="1" to-layer="2" to-port="0"/>
    <edge from-layer="2" from-port="0" to-layer="3" to-port="0"/>
  </edges>
</net>`;

    res.setHeader("Content-Type", "application/xml");
    res.setHeader("Content-Disposition", `attachment; filename="pavement_pinn_${device.toLowerCase()}_${precision.toLowerCase()}.xml"`);
    res.send(xmlContent);
  });

  // OpenVINO Configuration File Download
  app.get("/api/openvino/export-config", (req, res) => {
    const device = (req.query.device as string) || "NPU";
    const precision = (req.query.precision as string) || "INT8_NNCF";
    const streams = (req.query.streams as string) || "2";

    const configJson = {
      model_name: "Pavement_PINN_Burmister_PDE",
      openvino_version: "2024.5.0",
      target_device: device,
      precision_mode: precision,
      nncf_quantization: {
        enabled: precision === "INT8_NNCF",
        algorithm: "DefaultQuantization",
        preset: "PERFORMANCE",
        target_stat_precision: "INT8"
      },
      performance_config: {
        PERFORMANCE_HINT: "LATENCY",
        NUM_STREAMS: streams,
        INFERENCE_NUM_THREADS: 8,
        ENABLE_MMAP: true
      },
      deployment_code_sample: {
        cpp: `ov::Core core;\nauto model = core.read_model("pavement_pinn_${device.toLowerCase()}_${precision.toLowerCase()}.xml");\nauto compiled_model = core.compile_model(model, "${device}");\nauto infer_request = compiled_model.create_infer_request();`,
        python: `import openvino as ov\ncore = ov.Core()\nmodel = core.read_model("pavement_pinn_${device.toLowerCase()}_${precision.toLowerCase()}.xml")\ncompiled = core.compile_model(model, "${device}")\nres = compiled({"input_tensors": [18.5, 45, 6, 42, 4.5, 12, 2400]})`
      }
    };

    res.setHeader("Content-Type", "application/json");
    res.setHeader("Content-Disposition", `attachment; filename="openvino_config_${device.toLowerCase()}.json"`);
    res.send(JSON.stringify(configJson, null, 2));
  });
  app.post("/api/generate-narrative", async (req, res) => {
    const { role, simulationData } = req.body;
    const ai = getGeminiClient();

    const getFallbackNarrative = () => {
      if (role === "FIELD_ENGINEER") {
        return (
          simulationData?.aiNarrative?.fieldEngineerNarrative ||
          `[ANALISIS REKAYASA STRUKTURAL BBPJN]\nSimulasi PINN mendeteksi regangan tarik dasar aspal εt sebesar ${simulationData?.tensors?.tensileStrainEt || 180} µε dan regangan tekan tanah dasar εv sebesar ${simulationData?.tensors?.compressiveStrainEv || 320} µε. Laju deteriorasi akibat beban ODOL memproyeksikan pembentukan retak lelah. Rekomendasi perbaikan: Tebal overlay ${simulationData?.roleOutputs?.fieldEngineer?.recommendedOverlayThicknessCm || 6} cm AC-WC.`
        );
      }
      if (role === "OPERATIONS_MANAGER") {
        return (
          simulationData?.aiNarrative?.operationsNarrative ||
          `[EVALUASI OPERASIONAL WIM & BPTD]\nBeban sumbu kendaraan ${simulationData?.params?.axleLoadTon || 18} Ton terdeteksi melampaui ambang batas izin (10 Ton). Tingkat akselerasi kerusakan perkerasan jalan mencapai level kritis. Sinyal WIM mengaktifkan prosedur penindakan tilang otomatis ANPR dan instruksi pengalihan rute truk.`
        );
      }
      return (
        simulationData?.aiNarrative?.policyMakerNarrative ||
        `[RINGKASAN KEBIJAKAN PRESERVASI EKSEKUTIF]\nImplementasi program preservasi jalan preventif dan penegakan Zero ODOL 2027 diproyeksikan memberikan efisiensi anggaran APBN sebesar Rp ${simulationData?.roleOutputs?.policyMaker?.preventiveCostSavingsRupiahBillions || 38.5} Miliar serta mempertahankan Indeks Kondisi Jalan (PCI) pada tingkat Mantap.`
      );
    };

    if (!ai) {
      return res.json({
        success: true,
        narrative: getFallbackNarrative(),
        source: "rule-engine-offline"
      });
    }

    try {
      const prompt = `Anda adalah Asisten Kecerdasan Buatan PAVEMENT-PINN (Physics-Informed Neural Network + Intel OpenVINO Edge AI) untuk pengelolaan infrastruktur jalan nasional Indonesia.

Berikan analisis dan rekomendasi yang sangat ringkas, profesional, dan dapat ditindaklanjuti (actionable) khusus untuk peran: ${role}.

Data Hasil Simulasi:
- Ruas Jalan: ${simulationData?.roadSegment?.name} (${simulationData?.roadSegment?.province})
- Beban Sumbu: ${simulationData?.params?.axleLoadTon} Ton (Batas ODOL: 10 Ton)
- Intensitas Hujan: ${simulationData?.params?.rainIntensityMmHr} mm/jam
- Subgrade CBR: ${simulationData?.params?.subgradeCbrPercent}%
- Prediksi PCI: ${simulationData?.predictedPci}/100
- Regangan Tarik dasar Aspal (εt): ${simulationData?.tensors?.tensileStrainEt} µε
- Tegangan Tekan Subgrade (εv): ${simulationData?.tensors?.compressiveStrainEv} µε
- Estimasi Hari Pembentukan Lubang: ${simulationData?.roleOutputs?.fieldEngineer?.potholeHorizonDays} hari
- Rekomendasi Overlay: ${simulationData?.roleOutputs?.fieldEngineer?.recommendedOverlayThicknessCm} cm
- Status Alert WIM: ${simulationData?.roleOutputs?.operationsManager?.alertStatus}
- Tindakan Penindakan WIM: ${simulationData?.roleOutputs?.operationsManager?.wimActionRequired}
- Potensi Penghematan Anggaran Preservasi: Rp ${simulationData?.roleOutputs?.policyMaker?.preventiveCostSavingsRupiahBillions} Miliar

Instruksi Format:
- Untuk FIELD_ENGINEER: Fokus pada kriteria rekayasa struktur, regangan kritis, dan spesifikasi tebal overlay.
- Untuk OPERATIONS_MANAGER: Fokus pada sinyal operasional WIM, keselamatan lalu lintas, dan penindakan ODOL.
- Untuk POLICY_MAKER: Fokus pada efisiensi anggaran APBN, dampak ekonomi, dan Zero ODOL 2027.
- Panjang jawaban 3-4 kalimat padat.`;

      const response = await ai.models.generateContent({
        model: "gemini-3.7-flash",
        contents: prompt
      });

      res.json({
        success: true,
        narrative: response.text || getFallbackNarrative(),
        source: "gemini-3.7-flash"
      });
    } catch (err: any) {
      console.warn("Gemini API call failed (using fallback narrative):", err?.message || err);

      res.json({
        success: true,
        narrative: getFallbackNarrative(),
        source: "rule-engine-fallback"
      });
    }
  });

  // Vite middleware or static serving
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`PAVEMENT-PINN Server running on http://localhost:${PORT}`);
  });
}

startServer();
