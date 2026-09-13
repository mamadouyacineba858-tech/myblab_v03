# MB-L1-PROP-005-R1 — CAPACITOR visual V2 correction

**Statut : IMPLEMENTED — PROJECT CANVAS GATE PENDING.**

## Motif

Le Project Canvas Gate du CTO a validé la logique de `MB-L1-PROP-005` (marquages dynamiques indépendants) mais a rejeté la silhouette Candidate C : corps trop plat/ovale et pattes visuellement trop ternes.

## Décision CTO / CSA

Conserver intégralement la logique `capacitance -> encodeCapacitorMarking() -> overlay DOM` et remplacer uniquement la présentation physique :

- corps céramique radial orange plus rond et volumétrique ;
- reflet de glaçure visible ;
- deux pieds de corps alignés sur les racines mécaniques existantes `(23,27)` / `(47,27)` ;
- pattes longues toujours produites par `AssemblyLeadsLayer`, mais avec un nouveau style déclaratif `metallic-wire`, clair et brillant comme les leads du RESISTOR ;
- aucun texte EIA cuit dans les assets.

## Branche

`fix/MB-L1-PROP-005-capacitor-visual-v2`

Base : `53874ece0bf2b912daa152cbbf464bf2ef9672e9`.

## Assets V2

| Asset | Dimensions | Bytes | SHA-256 |
|---|---:|---:|---|
| `capacitor.base.1x.png` | 70×40 | 2185 | `cb7f47a934f62d8ea6c968b1804e594918958f63126e17bce982b220d31f3526` |
| `capacitor.base.1x.webp` | 70×40 | 1838 | `dde66e964989393f5f7e50de072e9bfafa40103c4704789eb335601367a6db9d` |
| `capacitor.base.3x.png` | 210×120 | 10448 | `a8c856f4d5723914dfc0871d8efb3abcfff0cb83799a6592f1d8675ae52fa955` |
| `capacitor.base.3x.webp` | 210×120 | 5962 | `23db61b426014460a82ca8681b1db21abbafb2888c844bfce2a09e3389620419` |

Les quatre `capacitor.default.*` legacy restent inchangés.

## Géométrie verrouillée

Aucun changement aux `PhysicalContacts` :

- `pinA -> (23,62)`
- `pinB -> (47,62)`

Aucun changement aux racines :

- `pinA.root -> (23,27)`
- `pinB.root -> (47,27)`

Le nouveau token `metallic-wire` est un style de présentation générique ; `assemblyGeometry.js` le transporte sans branche `type === "CAPACITOR"`.

## Marquage

`encodeCapacitorMarking.js` n'est pas modifié. La zone d'overlay est recalée sur le nouveau corps V2 (`x=78..132`, `y=30..60` au master 210×120). Les règles exact/no-rounding et le domaine 10 pF..1 µF sont inchangés.

## Tests / validation

Un test ciblé `CapacitorMetallicLeads.test.jsx` verrouille :

- deux contacts ;
- racines inchangées ;
- PhysicalContacts inchangés ;
- style `metallic-wire` sur les deux leads ;
- aucune régression vers le style `wire` du CAPACITOR.

Le connecteur GitHub ne fournit pas d'exécution locale de Vitest/Build. Le contrôle final d'exécution et le Project Canvas Gate restent donc obligatoires avant fermeture.

## Verdict

La correction est prête pour validation du CTO sur Canvas. `MB-L1-PROP-005` reste **OPEN** jusqu'au `CANVAS PASS` explicite.
