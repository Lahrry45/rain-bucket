// Builds a low-poly 3D version of a player's start.ng character from their `style`.
// Body, colours, hair, hat and accessory all follow start.ng, so the player looks
// like themselves here. The character holds a bucket above their head.
import * as THREE from 'three';

const DEFAULTS = {
  body: 'male', primaryColor: '#4b7bec', secondaryColor: '#2b2f4a', skinColor: '#8d5524',
  hairColor: '#17120f', hair: 'short', hat: 'none', accessory: 'none',
};

const isColor = (c) => typeof c === 'string' && /^#[0-9a-f]{6}$/i.test(c);

// Fills in anything missing or unknown so the game never breaks on new options.
export function cleanStyle(style) {
  const s = { ...DEFAULTS, ...(style || {}) };
  for (const key of ['primaryColor', 'secondaryColor', 'skinColor', 'hairColor']) {
    if (!isColor(s[key])) s[key] = DEFAULTS[key];
  }
  if (!['male', 'female'].includes(s.body)) s.body = DEFAULTS.body;
  return s;
}

const mat = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.75, ...extra });

function add(parent, geometry, material, x = 0, y = 0, z = 0) {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  parent.add(mesh);
  return mesh;
}

export const BUCKET_TOP = 3.02; // height of the bucket's rim, used for catching
export const BUCKET_RADIUS = 0.36;
export const BUCKET_Y = 2.8; // high enough to clear every hat

export function buildCharacter(style) {
  const s = cleanStyle(style);
  const female = s.body === 'female';

  const root = new THREE.Group();
  const skin = mat(s.skinColor);
  const top = mat(s.primaryColor);
  const bottom = mat(s.secondaryColor);
  const hair = mat(s.hairColor, { roughness: 0.9 });
  const dark = mat('#1a1a1a');

  // Legs (kept separate so they can swing while walking)
  const legs = [];
  for (const side of [-1, 1]) {
    const leg = new THREE.Group();
    leg.position.set(side * 0.12, 0.8, 0);
    add(leg, new THREE.BoxGeometry(0.17, 0.72, 0.2), female ? skin : bottom, 0, -0.36, 0);
    add(leg, new THREE.BoxGeometry(0.19, 0.1, 0.28), dark, 0, -0.75, 0.04); // shoe
    root.add(leg);
    legs.push(leg);
  }

  if (female) {
    add(root, new THREE.CylinderGeometry(0.24, 0.4, 0.5, 14), bottom, 0, 0.72, 0); // skirt
  } else {
    add(root, new THREE.BoxGeometry(0.46, 0.18, 0.24), bottom, 0, 0.84, 0); // hips
  }

  // Torso
  const torsoWidth = female ? 0.44 : 0.52;
  add(root, new THREE.BoxGeometry(torsoWidth, 0.6, 0.28), top, 0, 1.22, 0);

  // Arms raised to hold the bucket
  for (const side of [-1, 1]) {
    const arm = new THREE.Group();
    arm.position.set(side * (torsoWidth / 2 + 0.08), 1.46, 0);
    arm.rotation.z = side * 0.2;
    add(arm, new THREE.BoxGeometry(0.14, 1.05, 0.16), top, 0, 0.525, 0);
    add(arm, new THREE.SphereGeometry(0.085, 10, 8), skin, 0, 1.09, 0);
    root.add(arm);
  }

  // Neck and head
  add(root, new THREE.CylinderGeometry(0.08, 0.09, 0.12, 10), skin, 0, 1.57, 0);
  const headY = 1.8;
  add(root, new THREE.SphereGeometry(0.22, 18, 14), skin, 0, headY, 0);
  for (const side of [-1, 1]) {
    add(root, new THREE.SphereGeometry(0.028, 8, 6), dark, side * 0.08, headY + 0.03, 0.2);
  }
  add(root, new THREE.BoxGeometry(0.1, 0.022, 0.02), mat('#5a2a22'), 0, headY - 0.09, 0.205); // smile

  addHair(root, s.hair, hair, headY);
  addHat(root, s.hat, headY + (s.hair === 'afro' ? 0.2 : 0), s);
  addAccessory(root, s.accessory, headY, s, hair);

  // The bucket
  const bucket = new THREE.Group();
  bucket.position.set(0, BUCKET_Y, 0);
  const plastic = mat('#3fa7f5', { roughness: 0.4 });
  add(bucket, new THREE.CylinderGeometry(BUCKET_RADIUS, 0.27, 0.44, 20, 1, true), plastic, 0, 0, 0)
    .material.side = THREE.DoubleSide;
  add(bucket, new THREE.CircleGeometry(0.27, 20), plastic, 0, -0.22, 0).rotation.x = -Math.PI / 2;
  add(bucket, new THREE.TorusGeometry(BUCKET_RADIUS, 0.025, 6, 24), mat('#2a86d1'), 0, 0.22, 0).rotation.x = Math.PI / 2;
  const water = add(bucket, new THREE.CircleGeometry(0.3, 20), mat('#7fd0ff', { transparent: true, opacity: 0.85 }), 0, -0.2, 0);
  water.rotation.x = -Math.PI / 2;
  root.add(bucket);

  root.userData = { legs, bucket, water };
  return root;
}

// Lets the water in the bucket rise as the player catches drops (0 to 1).
export function setWaterLevel(character, level) {
  const { water } = character.userData;
  const t = Math.min(1, Math.max(0, level));
  water.position.y = -0.2 + t * 0.38;
  water.scale.setScalar(0.88 + t * 0.32);
}

function hairCap(parent, material, headY, size = 0.235) {
  const cap = add(parent, new THREE.SphereGeometry(size, 18, 12, 0, Math.PI * 2, 0, Math.PI * 0.55), material, 0, headY + 0.01, -0.01);
  cap.rotation.x = -0.25;
  return cap;
}

function addHair(root, type, material, headY) {
  switch (type) {
    case 'bald':
      return;
    case 'afro':
      add(root, new THREE.SphereGeometry(0.32, 18, 14), material, 0, headY + 0.12, -0.15);
      return;
    case 'bun':
      hairCap(root, material, headY);
      add(root, new THREE.SphereGeometry(0.11, 12, 10), material, 0, headY + 0.24, -0.12);
      return;
    case 'ponytail': {
      hairCap(root, material, headY);
      const tail = add(root, new THREE.CylinderGeometry(0.06, 0.03, 0.4, 8), material, 0, headY - 0.05, -0.27);
      tail.rotation.x = 0.35;
      return;
    }
    case 'braids':
    case 'dreads': {
      hairCap(root, material, headY);
      const count = type === 'braids' ? 6 : 10;
      const thick = type === 'braids' ? 0.03 : 0.04;
      for (let i = 0; i < count; i++) {
        const a = Math.PI * 0.15 + (i / (count - 1)) * Math.PI * 0.7; // behind and around the head
        const strand = add(root, new THREE.CylinderGeometry(thick, thick * 0.8, 0.42, 6), material,
          Math.cos(a) * 0.2, headY - 0.12, -Math.sin(a) * 0.2);
        strand.rotation.x = -0.08;
      }
      return;
    }
    case 'short':
    default:
      hairCap(root, material, headY);
  }
}

function addHat(root, type, headY, s) {
  const top = headY + 0.18;
  switch (type) {
    case 'cap': {
      const m = mat(s.primaryColor);
      add(root, new THREE.SphereGeometry(0.24, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2), m, 0, headY + 0.04, 0);
      add(root, new THREE.BoxGeometry(0.3, 0.03, 0.2), m, 0, headY + 0.06, 0.24);
      return;
    }
    case 'beanie': {
      const m = mat('#e94f4f', { roughness: 1 });
      add(root, new THREE.SphereGeometry(0.25, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2), m, 0, headY + 0.04, 0);
      add(root, new THREE.CylinderGeometry(0.255, 0.255, 0.07, 18), mat('#c23a3a'), 0, headY + 0.06, 0);
      add(root, new THREE.SphereGeometry(0.06, 10, 8), mat('#ffffff'), 0, headY + 0.3, 0);
      return;
    }
    case 'tophat': {
      const m = mat('#202020', { roughness: 0.5 });
      add(root, new THREE.CylinderGeometry(0.34, 0.34, 0.03, 20), m, 0, top, 0);
      add(root, new THREE.CylinderGeometry(0.19, 0.2, 0.32, 20), m, 0, top + 0.17, 0);
      add(root, new THREE.CylinderGeometry(0.205, 0.205, 0.05, 20), mat('#a51e1e'), 0, top + 0.05, 0);
      return;
    }
    case 'crown': {
      const gold = mat('#f5c518', { metalness: 0.6, roughness: 0.3 });
      add(root, new THREE.CylinderGeometry(0.2, 0.2, 0.1, 20, 1, true), gold, 0, top + 0.02, 0).material.side = THREE.DoubleSide;
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        add(root, new THREE.ConeGeometry(0.04, 0.12, 6), gold, Math.cos(a) * 0.19, top + 0.12, Math.sin(a) * 0.19);
      }
      return;
    }
    default:
  }
}

function addAccessory(root, type, headY, s, hairMaterial) {
  switch (type) {
    case 'glasses': {
      const m = mat('#111111');
      for (const side of [-1, 1]) {
        add(root, new THREE.TorusGeometry(0.06, 0.012, 6, 16), m, side * 0.085, headY + 0.03, 0.215);
      }
      add(root, new THREE.BoxGeometry(0.06, 0.012, 0.012), m, 0, headY + 0.04, 0.22);
      return;
    }
    case 'earrings': {
      const gold = mat('#f5c518', { metalness: 0.6, roughness: 0.3 });
      for (const side of [-1, 1]) add(root, new THREE.SphereGeometry(0.035, 8, 6), gold, side * 0.22, headY - 0.07, 0);
      return;
    }
    case 'beard': {
      const beard = add(root, new THREE.SphereGeometry(0.2, 14, 10, 0, Math.PI * 2, Math.PI * 0.5, Math.PI * 0.5),
        hairMaterial, 0, headY - 0.02, 0.04);
      beard.scale.set(1, 0.9, 0.9);
      return;
    }
    case 'scarf': {
      const red = mat('#d63b3b', { roughness: 1 });
      add(root, new THREE.TorusGeometry(0.13, 0.05, 8, 18), red, 0, 1.55, 0).rotation.x = Math.PI / 2;
      add(root, new THREE.BoxGeometry(0.1, 0.32, 0.04), red, 0.08, 1.38, 0.16);
      return;
    }
    case 'backpack': {
      add(root, new THREE.BoxGeometry(0.4, 0.48, 0.18), mat(s.secondaryColor), 0, 1.2, -0.23);
      add(root, new THREE.BoxGeometry(0.3, 0.18, 0.06), mat('#333333'), 0, 1.08, -0.33);
      return;
    }
    default:
  }
}
