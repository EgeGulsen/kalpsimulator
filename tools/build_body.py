"""BodyParts3D STL parçalarından assets/body.glb üretir (giriş ekranındaki tüm vücut).

Deri ve organlar, kalp modeliyle (build_model.py) aynı dönüşümle yerleştirilir:
merkez kalp duvarı (FMA7274), 1 birim = 40 mm, three.js eksenleri (x sol, y yukarı, z ön).
Kaynak: BodyParts3D (c) 2008 Life Science Integrated Database Center, CC BY-SA 2.1 JP.
STL'ler: github.com/Kevin-Mattheus-Moerman/BodyParts3D (assets/BodyParts3D_data/stl, sürüm 3.0).

Kullanım: python3 tools/build_body.py <stl klasörü> assets/body.glb
Gerekli: pip install trimesh fast-simplification numpy scipy
"""
import sys, os, glob, numpy as np, trimesh, fast_simplification as fs

SRC, OUT = sys.argv[1], sys.argv[2]
def L(i): return trimesh.load(f"{SRC}/FMA{i}.stl", process=True)
def have(i): return os.path.exists(f"{SRC}/FMA{i}.stl")
def cat(ids): return trimesh.util.concatenate([L(i) for i in ids if have(i)])
def simplify(m, target):
    if len(m.faces) <= target: return m
    v, f = fs.simplify(m.vertices.astype(np.float32), m.faces.astype(np.int32), target_reduction=1 - target / len(m.faces))
    return trimesh.Trimesh(v, f, process=True)

center = L(7274).bounds.mean(0)
def tx(p):
    p = (np.asarray(p) - center) / 40.0
    return np.stack([p[..., 0], p[..., 2], -p[..., 1]], -1)

BRAIN = [int(os.path.basename(f)[3:-4]) for f in glob.glob(f"{SRC}/FMA72[6-9]*.stl") + glob.glob(f"{SRC}/FMA728*.stl") + glob.glob(f"{SRC}/FMA729*.stl") + glob.glob(f"{SRC}/FMA7280*.stl")]
BRAIN = sorted(i for i in set(BRAIN + [72975, 72976, 61822, 67944]) if tx(L(i).bounds)[0][1] > 5)  # yalnız kafatası içindekiler
ORG = {
    'deri':      ([7163], 90000),
    'beyin':     (BRAIN, 14000),
    'akciger':   ([7333, 7383, 7337, 7370, 7371], 14000),
    'soluk':     ([7394], 2500),
    'ozofagus':  ([7131], 1500),
    'karaciger': ([7197, 7202], 7000),
    'mide':      ([7148], 4000),
    'dalak':     ([7196], 2000),
    'bobrek':    ([7204, 7205, 15571, 15572], 5000),
    'ince':      ([7206, 7207, 7208], 12000),
    'kalin':     ([14544], 2000),
    'mesane':    ([15900], 2000),
}
scene = trimesh.Scene()
for k, (ids, n) in ORG.items():
    m = simplify(cat(ids), n)
    mm = trimesh.Trimesh(tx(m.vertices), m.faces, process=True)
    scene.add_geometry(mm, node_name=k, geom_name=k)
    print(k, len(ids), len(mm.faces), mm.bounds.round(2).tolist())
open(OUT, 'wb').write(scene.export(file_type='glb', include_normals=False))
print(os.path.getsize(OUT))
