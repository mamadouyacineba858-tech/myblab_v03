# MYBLAB-TINKERCAD-005-B — Rapport de livraison

**Verdict : `005-B CLOSED_PASS`**
**Dépôt de référence :** `C:\bureau\_documents\bureau\MYBLAB-CLINE-SAFE-001`
**Baseline :** branche `safe-001/tinkercad-001-stabilisation`, HEAD `38b615b9f67299218783c6f90ebe1a51ca4f479e`
**Environnement d'implémentation isolé :** `C:\bureau\_documents\bureau\_worktrees\myblab-005-b`, branche `copilot/myblab-tinkercad-005-b`, créée au HEAD ci-dessus.

## 1. Sécurisation Git et périmètre

- L'inventaire Git visible contient **356 entrées** : 352 fichiers suivis modifiés et 4 répertoires non suivis. Leur expansion comprend **432 chemins de fichiers** (352 suivis et 80 fichiers non suivis).
- L'inventaire par chemin, les tailles et SHA-256 sont conservés dans `inventory.json`, `requested-356-entry-inventory.json` et `inventory.csv`, dans la sauvegarde persistante de session.
- Sauvegarde exacte vérifiée : archive des fichiers suivis modifiés, diff binaire, archive des fichiers non suivis, manifeste SHA-256. La restauration dans un worktree de validation a retrouvé les 432 contenus avec empreintes identiques (`restore_validation: PASS`).
- Aucun fichier préexistant de la branche de référence n'a été modifié, écrasé, supprimé ou commité. Les changements locaux du solveur ne contenaient pas d'implémentation B supplémentaire ; ils n'ont pas été importés.
- Aucun reset, clean, push, merge ou commit global n'a été exécuté.

## 2. Fonctionnalités livrées dans le worktree isolé

- Validation stricte des pas de temps, des paramètres électriques qualifiés et des paramètres du générateur ; borne de sécurité à 1 000 000 pas par appel à `advance`.
- Conditions initiales explicites par UID pour les tensions de condensateurs, les courants d'inductances et le temps simulé. `getInitialConditions()` permet de capturer/restaurer l'état.
- Conservation des états C/L lors d'une reconfiguration du circuit. La signature de session inclut aussi l'état et les canaux des interrupteurs du registre canonique ; leur ouverture/fermeture reconstruit la topologie sans remettre l'énergie réactive à zéro.
- Les paramètres `onResistance` du NPN/PNP et les paramètres canoniques des composants qualifiés sont résolus depuis le registre existant. Les paramètres invalides sont rejetés au lieu d'être remplacés silencieusement.
- Une non-convergence est désormais signalée par `NON_CONVERGED` et comptabilisée. Court-circuit, absence de référence et types non qualifiés restent des états explicitement distingués.
- Les modèles NPN/PNP, LM358P et les quatre formes d'onde réutilisent le solveur transitoire MNA existant et le générateur du panneau. Aucun solveur parallèle ni résultat artificiel n'a été ajouté.

## 3. Modèles et hypothèses

- **Transitoires :** MNA, Euler implicite arrière, première ordre et stable pour R/C/L passifs. L'erreur de troncature est d'ordre `dt`; le pas de temps doit être petit devant la constante de temps. La suite scientifique utilise 500 pas par constante de temps (écart RC/RL maximal mesuré ≈ 0,10 %).
- **C :** `i = C·dv/dt`; tension initiale nulle par défaut, surchargeable par UID.
- **L :** `v = L·di/dt`; courant initial nul par défaut, surchargeable par UID.
- **NPN/PNP :** modèle pédagogique par morceaux, `β=100`, `VBE=0,7 V`, `RBE=10 Ω`, `VCE,sat=0,2 V`, résistance de saturation issue de `onResistance`. Pas d'effet Early, capacité de jonction, avalanche, thermique ou modèle SPICE complet.
- **Arduino :** alimentation 5 V avec résistance source 1 Ω ; sorties GPIO équivalentes de Thévenin 25 Ω. Le scénario de commande évite de traiter une sortie Arduino comme une source de puissance idéale.
- **LM358P :** deux amplificateurs, gain ouvert canonique 100 000, résistance de sortie 50 Ω, limite haute `VCC+ − 1,5 V`, limite basse `VCC− + 20 mV`, désactivé si l'alimentation est inférieure à 2 V. Pas de bande passante, slew-rate ni courant d'alimentation.
- **GBF :** source idéale `V(t)` continue, carrée, sinusoïdale ou triangulaire ; l'amplitude est la valeur crête autour de l'offset. Le carré utilise le rapport cyclique. Le panneau limite la fréquence à 1 kHz ; le moteur live vise 50 pas par période, au plus 800 pas par trame et un échantillonnage oscilloscope d'au moins 20 µs.

## 4. Scénarios scientifiques B01–B10

Tolérances numériques : pour les réponses RC/RL exponentielles, référence analytique évaluée au temps simulé et au pas réellement demandé ; borne relative de 0,2 %, cohérente avec Euler arrière et 500 pas/τ. Pour les seuils transistor/AOP, la comparaison inclut explicitement les résistances série du modèle et la charge.

| Code | Circuit réel et paramètres | Référence indépendante | Résultat numérique | Erreur / verdict |
|---|---|---|---|---|
| B01 | POWER 5 V → R 1 kΩ → C 1 µF → GND, `t=1 ms`, `τ=1 ms`, `dt=2 µs` | `Vc=5(1−e⁻¹)=3,16060279 V` | `3,15876493 V` | `−1,83787 mV` (`0,0582 %`), **PASS** |
| B02 | C 1 µF initialisé à 5 V, décharge par R 1 kΩ vers GND, `t=1 ms`, `dt=2 µs` | `Vc=5e⁻¹=1,83939721 V` | `1,84123507 V` | `+1,83786 mV` (`0,0999 %`), **PASS** |
| B03 | POWER 5 V → R 100 Ω → L 10 mH → GND, `t=0,1 ms`, `τ=0,1 ms`, `dt=0,2 µs` | `I=(5/100)(1−e⁻¹)=31,6060 mA` | `31,5876 mA` | `−0,01838 mA` (`0,0581 %`), **PASS** |
| B04 | NPN, `Rc=1 kΩ`, base tirée au GND par `Rb=10 kΩ`, émetteur GND | Blocage : `Ic=0`, `Vc=5 V` | état `off`, `Ic=0`, collecteur `5 V` | conforme, **PASS** |
| B05 | Arduino 5 V/D3 HIGH → `Rb=1 kΩ` → base NPN ; `Rc=100 Ω`, `RCE=2 Ω`, émetteur GND | `Ic=(5−0,2)/(1+100+2)=46,6019 mA` (inclut 1 Ω de source) | `46,6019 mA`, `VCE=0,29320 V`, `IB=4,1546 mA`, D3=`4,8961 V` | courant conforme ; GPIO abaissée par sa résistance de sortie, **PASS** |
| B06 | POWER 5 V sur LM358P, `Vin=1 V`, suiveur (IN− reliée à OUT) | Boucle fermée : `Vout≈1 V`, hors saturation | `0,99999000 V`, mode `lin` | `−10,0 µV`, **PASS** |
| B07 | LM358P non-inverseur, `Rf=20 kΩ`, `Rg=10 kΩ`, alim 9 V ; `Vin=1 V` puis `5 V` | Gain linéaire 3 ; écrêtage nominal 7,5 V. La charge et `Rout=50 Ω` affectent l'écrêtage chargé. | linéaire `2,99990987 V`; saturé haut chargé `7,48752080 V` | erreur linéaire `−90,1 µV`; saturation sous 7,5 V comme attendu, **PASS** |
| B08 | GBF carré 100 Hz, 2 V crête, offset 2 V, duty 25 % → R 1 kΩ → C 1 µF ; `dt=5 µs` | Charge `4(1−e⁻²·⁴⁹)=3,66836013 V`; après la phase basse, décroissance exponentielle vers 0 V | pic `3,66812887 V`; niveau bas `2,0783 mV` | erreur pic `−0,2313 mV`; niveau bas < 4 mV, **PASS** |
| B09 | GBF sinusoïdal sur circuit R 1 kΩ/C 1 µF, 20 Hz, amplitude 2 V, offset 1 V, 400 échantillons/période | crêtes +3 V/−1 V, fréquence 20 Hz ; tests DC et triangle aux phases caractéristiques | +3 V, −1 V, `20,0000 Hz`; DC=1 V, triangle −1/+3 V | amplitude/offset exacts au pas échantillonné, fréquence relative `<1 %`, **PASS** |
| B10 | Firmware Arduino avec `analogRead(A0)`, D13 et `analogWrite(9,64)` ; pont 1 kΩ/3 kΩ, PWM D9→R 1 kΩ/C 10 µF | A0=`3,75 V`, ADC `round(3,75/5×1023)=767`; PWM 490 Hz, duty `64/255` | A0=`3,75 V`, ADC=767 ; firmware produit D9 PWM 64/490 Hz et D13 HIGH | conforme ; tests de chaîne PWM→RC existants également PASS, **PASS** |

Les cas B01–B10 sont exécutés dans `frontend/src/simulator/__tests__/tinkercad005LotB.test.js`. Les tests préexistants `transientSolver.test.js` et `instrumentsLive.test.js` complètent la validation par oscilloscope, générateur et PWM filtré. Les tests de court-circuit de sources incompatibles, ampèremètre invalide, type non qualifié et absence de résultats fabriqués restent présents dans ces suites.

## 5. Contrôles techniques et limites

- **Suite ciblée finale : PASS — 7 fichiers, 155 tests** (scénarios lot B, solveur transitoire, solveur DC, runtime, instruments live, firmware Arduino et PWM).
- **ESLint fichiers modifiés : PASS** (`transientSolver.js`, `tinkercad005LotB.test.js`, `liveSimulation.js`).
- **ESLint complet : FAIL préexistant** — 157 problèmes (153 erreurs, 4 avertissements), principalement imports `React` inutilisés dans des tests historiques ; aucun finding sur les trois fichiers modifiés. Le même résultat était déjà présent au précontrôle propre du worktree.
- **Build : PASS** — `npm run build` (TypeScript + Vite). Avertissement de taille de chunk selon la configuration existante, sans échec.
- **Suite complète : 360 fichiers PASS, 14 fichiers FAIL ; 7 108 tests PASS, 22 FAIL (7 130 total).** Les 22 échecs, dans les 14 mêmes fichiers, ont tous été reproduits sur le worktree propre et non modifié du HEAD de référence : 17 échecs dans les 10 premiers fichiers (581 tests), puis 5 dans les 4 autres (20 tests). Les problèmes observés concernent des SHA/tailles/budgets d'assets historiques, attentes Arduino de présentation, et interactions Canvas/hover ; aucun ne touche les fichiers du lot B. Ils sont distingués des validations B et ne sont pas corrigés ici.
- L'intégration live réutilise la boucle de simulation existante ; les fréquences élevées restent limitées par la granularité par trame. Les composants non qualifiés restent signalés et ne produisent pas de valeurs inventées.
- Les fonctions Arduino Blink, GND, PWM, `analogRead()`, solveur DC et instruments sont préservées par les tests de non-régression.

## 6. Fichiers et commit

Fichiers attribuables au lot B dans le worktree :

- `frontend/src/simulator/transientSolver.js`
- `frontend/src/instruments/liveSimulation.js`
- `frontend/src/simulator/__tests__/tinkercad005LotB.test.js`
- `audit/proofs/tinkercad-005/lot-B-rapport.md`

**Commit local contrôlé :** le commit `feat(tinkercad-005): complete isolated lot B` contient uniquement les trois fichiers d'implémentation/tests listés ci-dessus et ce rapport. Le worktree isolé doit être propre après commit. La branche de référence et ses 356 entrées préexistantes restent intactes. Aucun push ni merge n'a été exécuté.

## 7. Lots C et D

**Aucun travail des lots C ou D n'a été lancé.** Le périmètre livré n'est pas une simulation SPICE complète. L'extension physique (modèles dynamiques et non-linéaires plus réalistes, parasitiques, températures et limites de bande passante) reste hors de ce lot ; la séquence et les fonctionnalités des lots C/D restent à déterminer par les instructions CSA/roadmap correspondantes, et ne sont pas présumées ici.
