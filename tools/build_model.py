"""BodyParts3D STL parçalarından assets/heart.glb üretir.

Kaynak: BodyParts3D (c) 2008 Life Science Integrated Database Center, CC BY-SA 2.1 JP.
Çıktı model de CC BY-SA 2.1 JP lisanslıdır.

Kullanım: python3 tools/build_model.py <BodyParts3D stl klasörü> assets/heart.glb
Gerekli: pip install trimesh fast-simplification numpy scipy
"""
import sys, numpy as np, trimesh, fast_simplification as fs

SRC, OUT = sys.argv[1], sys.argv[2]
def L(i): return trimesh.load(f"{SRC}/FMA{i}.stl", process=True)
def cat(ids): return trimesh.util.concatenate([L(i) for i in ids])

def crop(m, lo, hi):
    for ax in range(3):
        n = np.zeros(3); n[ax] = 1
        m = m.slice_plane(np.array(lo), n, cap=False)
        m = m.slice_plane(np.array(hi), -n, cap=False)
    return m

def simplify(m, target):
    if len(m.faces) <= target: return m
    v, f = fs.simplify(m.vertices.astype(np.float32), m.faces.astype(np.int32), target_reduction=1 - target / len(m.faces))
    return trimesh.Trimesh(v, f, process=True)

# --- Kalp duvarı ve odacıklara ayırma (yaklaşık) ---
wall = simplify(L(7274), 70000)
tri, mit, pulv = L(7234), L(7235), L(7246)
tc, mc = tri.bounds.mean(0), mit.bounds.mean(0)
base = (tc + mc) / 2
V = wall.vertices
apex = V[np.argmax(np.linalg.norm(V - base, axis=1) * (V[:, 2] < base[2]))]
n = apex - base; n /= np.linalg.norm(n)               # taban -> tepe
m = mc - tc; m -= n * (m @ n); m /= np.linalg.norm(m)   # sağ -> sol (septum normali)
C = wall.triangles_center
s = (C - base) @ n          # AV düzlemine uzaklık (ventrikül tarafı +)
d = (C - base) @ m          # septal düzleme uzaklık (sol taraf +)
from scipy.spatial import ConvexHull
eq = ConvexHull(wall.vertices).equations
depth = np.min(-(C @ eq[:, :3].T + eq[:, 3]), axis=1)  # dış kabuğa uzaklık (iç: +)
inner = depth > 6.0
vent = s > 2.0
label = np.where(vent, np.where(d > 0, 'lv', 'rv'), np.where(d > 0, 'la', 'ra')).astype(object)
label[vent & (np.abs(d) < 7) & inner] = 'ivs'
label[~vent & (np.abs(d) < 5) & inner] = 'ias'
la_faces = np.where(label == 'la')[0]
label_v_la = np.unique(wall.faces[la_faces].ravel())
parts = {}
for k in ['ra', 'la', 'rv', 'lv', 'ivs', 'ias']:
    sub = wall.submesh([np.where(label == k)[0]], append=True)
    parts[k] = sub
budget = {'ra': 9000, 'la': 9000, 'rv': 14000, 'lv': 18000, 'ivs': 4000, 'ias': 1500}
parts = {k: simplify(v, budget[k]) for k, v in parts.items()}

box_lo, box_hi = [-60, -200, 1150], [110, -20, 1345]
parts['tri'] = simplify(tri, 5000)
parts['mit'] = simplify(mit, 4000)
parts['pulv'] = simplify(pulv, 3000)
parts['pap'] = simplify(cat([7260, 7261, 7262, 7266, '9352nsn']), 4000)
parts['aorta'] = simplify(crop(cat([3736, 3768, 3784]), [-60, -200, 1205], box_hi), 5000)
from scipy.spatial import cKDTree
def near(mesh, ref_pts, r):
    keep = cKDTree(ref_pts).query(mesh.triangles_center, distance_upper_bound=r)[0] < r
    return mesh.submesh([np.where(keep)[0]], append=True)
pvc = pulv.bounds.mean(0)
pt = L(66326); pt = pt.submesh([np.where(np.linalg.norm(pt.triangles_center - pvc, axis=1) < 62)[0]], append=True)
pt = max(pt.split(only_watertight=False), key=lambda c: len(c.faces))
parts['pt'] = simplify(pt, 5000)
pv = near(L(66643), wall.vertices[label_v_la], 22)
pv = trimesh.util.concatenate([c for c in pv.split(only_watertight=False) if len(c.faces) > 150])
parts['pvn'] = simplify(pv, 3000)
parts['svc'] = simplify(L(4720), 1200)
parts['ivc'] = simplify(crop(L(10951), [-60, -200, 1175], [110, -20, 1345]), 1500)
parts['rca'] = simplify(cat([3802, 3818, '3840nsn', 76994, 71669]), 5000)
parts['lad'] = simplify(cat(['3862nsn', 71670, 4685]), 4000)
parts['lcx'] = simplify(L(3895), 2000)
parts['cv'] = simplify(cat([4706, 4707, 4713, 76751, 71567]), 5000)

# BodyParts3D (x: sol, y: arka(+), z: yukarı, mm) -> three.js (x: sol, y: yukarı, z: ön), merkez kalp, 1 birim = 40 mm
center = wall.bounds.mean(0)
landmarks = {'base': base, 'apex': apex, 'tri': tc, 'mit': mc, 'pulv': pulv.bounds.mean(0),
             'svc_low': L(4720).vertices[np.argmin(L(4720).vertices[:, 2])], 'aorta_root': L(3736).vertices[np.argmin(L(3736).vertices[:, 2])]}
def tx(p):
    p = (np.asarray(p) - center) / 40.0
    return np.stack([p[..., 0], p[..., 2], -p[..., 1]], -1)

scene = trimesh.Scene()
for k, mesh in parts.items():
    mm = trimesh.Trimesh(tx(mesh.vertices), mesh.faces, process=False)
    mm.fix_normals() if k not in ('tri', 'mit', 'pulv') else None
    scene.add_geometry(mm, node_name=k, geom_name=k)
scene.metadata['landmarks'] = {k: tx(v).round(4).tolist() for k, v in landmarks.items()}
open(OUT, 'wb').write(scene.export(file_type='glb'))
import json; json.dump(scene.metadata['landmarks'], open(OUT.replace('.glb', '.landmarks.json'), 'w'), indent=1)
print({k: len(v.faces) for k, v in parts.items()}, sum(len(v.faces) for v in parts.values()))
