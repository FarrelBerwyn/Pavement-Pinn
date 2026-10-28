# Vehicle meshes — Kenney Car Kit 3.1

- Source: https://kenney.nl/assets/car-kit (download `kenney_car-kit.zip`, 2026-10-27)
- License: Creative Commons CC0 1.0 (see License.txt shipped in the package)
- Files used unchanged: sedan.glb, truck.glb, wheel-default.glb, wheel-truck.glb, Textures/colormap.png
- Units: model units (stylised, not to scale). The app rescales bodies to the configured
  track/wheelbase and places the wheel meshes at the solver's contact positions
  (src/features/workspace/components/vehicleAssets.ts). Visual meshes only: mass, axle loads and
  contact geometry come from src/domain/workspace/vehicles.ts, not from the mesh.
- No motorcycle in this kit: the motorcycle uses wheel-default.glb wheels with a simple body.
