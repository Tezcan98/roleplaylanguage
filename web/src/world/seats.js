import * as THREE from 'three';

const ray = new THREE.Raycaster(), DOWN = new THREE.Vector3(0, -1, 0), FROM = new THREE.Vector3();

/**
 * Where someone sitting at (x, z) in `location` sits: the seat's surface under that spot, found by
 * looking straight down from hip height onto the place's furniture (its static batch,
 * engine/StaticBatch.js). `h` is the height of the seat (0 on the floor). Characters use it to put
 * their hips on the seat (Character.sit), whatever the body (blocky or HD) and its size.
 * @returns {{ x: number, z: number, h: number }}
 */
export function seatAt(location, spot) {
  const { x, z } = spot;
  const furniture = location?.group?.getObjectByName('static');
  if (!furniture) return { x, z, h: 0 };
  ray.set(FROM.set(x, 0.8, z), DOWN); ray.far = 0.8;
  const hit = ray.intersectObject(furniture, true)[0];
  return { x, z, h: hit ? hit.point.y - location.group.position.y : 0 };
}
