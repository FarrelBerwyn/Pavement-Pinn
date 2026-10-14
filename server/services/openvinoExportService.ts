/**
 * Builders for the OpenVINO export downloads.
 *
 * These are ILLUSTRATIVE artifacts: the XML is a hand-written 4-layer descriptor (it
 * references a custom "PhysicsPDEOp" and ships no weights .bin), and the JSON is a
 * deployment-config template. Neither is produced by converting a trained model.
 */

export interface OpenvinoDownload {
  filename: string;
  body: string;
}

export function buildOpenvinoIrExport(device: string, precision: string): OpenvinoDownload {
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

  return {
    filename: `pavement_pinn_${device.toLowerCase()}_${precision.toLowerCase()}.xml`,
    body: xmlContent
  };
}

export function buildOpenvinoConfigExport(device: string, precision: string, streams: string): OpenvinoDownload {
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

  return {
    filename: `openvino_config_${device.toLowerCase()}.json`,
    body: JSON.stringify(configJson, null, 2)
  };
}
