/**
 * A rubbish bin (çöp kutusu) with its "Çöpe at" spot (content/hotspots.js → systems/TableAndBins.js):
 * a green bin with a lid and a white band. Adds the mesh, a collider and the hotspot to `loc`.
 */
export function addTrashBin(loc, mf, C, id, x, z, reach = 1.15) {
  const bin = mf.group(
    mf.at(mf.cyl(0.26, 0.22, 0.72, 0x2E7D4F, 14), 0, 0.36, 0),
    mf.at(mf.cyl(0.265, 0.265, 0.08, 0xF2F2F2, 14), 0, 0.5, 0),
    mf.at(mf.cyl(0.29, 0.29, 0.06, 0x24603D, 14), 0, 0.75, 0),
    mf.at(mf.box(0.16, 0.04, 0.05, 0x1B4A2E), 0, 0.8, 0),
  );
  bin.position.set(x, 0, z);
  bin.scale.setScalar(1.25); // big enough to be seen across the square
  loc.add(bin);
  C.addCircle(x, z, 0.36);
  loc.hotspot(id, x, z, reach);
  return bin;
}
