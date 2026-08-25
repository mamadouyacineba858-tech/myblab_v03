# MYBLAB-CONSTITUTION.md

**Version :** 1.3  
**Statut :** OFFICIELLE  
**Niveau documentaire :** 1 (Document fondateur)  
**Dernière révision :** 2026-08-25

---

## Note de fusion (2026-08-25)

Le dépôt contenait deux documents distincts se réclamant chacun du niveau 1 : le présent fichier (`MYBLAB-CONSTITUTION.md`, FR) et `docs/governance/CONSTITUTION.md` (EN, v1.0.0). Cette ambiguïté avait été relevée comme gap de gouvernance par `docs/roadmaps/amendments/2026-08-22-P2-0-reconciliation.md` §3.

En pratique, seul le présent fichier était déjà cité comme autorité par le reste du dépôt (`docs/governance/CONVENTIONS.md`, `docs/governance/ARCHITECTURE.md`, `docs/vision/MYBLAB_VISION_2030.md`, `docs/governance/ADR/ADR-011-audit-architecture-docs.md`) ; `CONSTITUTION.md` (EN) n'était référencé nulle part ailleurs dans le dépôt.

**Décision :** le présent fichier reste l'unique Constitution officielle. Son contenu substantiel absent de la version EN est conservé tel quel (Articles 1 à 15 inchangés — leur numérotation est citée par `ADR-011` et `CONVENTIONS.md` et n'est donc pas modifiée). Le contenu substantiel de la version EN qui n'avait pas d'équivalent ici est intégré ci-dessous sous de nouveaux articles (16 à 22) et sous forme d'ajouts ponctuels aux Articles 4 et 7. Là où les deux versions se contredisaient (hiérarchie documentaire de l'Article 14), la présente version — déjà celle suivie en pratique — prévaut explicitement.

`docs/governance/CONSTITUTION.md` (EN, v1.0.0) est conservé comme artefact historique archivé, conformément à l'Article 20 ci-dessous, à `docs/governance/archive/CONSTITUTION.en.v1.0.0-superseded.md`, avec une note de renvoi vers le présent document.

---

# Constitution du projet MYBlab

## Préambule

La présente Constitution définit les principes fondamentaux de gouvernance du projet **MYBlab**.

Elle constitue le document de plus haut niveau du projet.

Son objectif est d'assurer la stabilité, la cohérence et la pérennité de MYBlab, indépendamment des technologies employées, des personnes impliquées ou des assistants utilisés.

Les règles opérationnelles, les procédures et les choix d'architecture sont définis dans les documents de niveau inférieur.

---

# Article 1 — Mission

MYBlab a pour mission de développer une plateforme libre, durable et de haute qualité destinée à l'apprentissage, à la conception et à la simulation de systèmes électroniques.

Toute décision importante doit contribuer à cette mission.

---

# Article 2 — Source de vérité

Le dépôt Git officiel constitue l'unique patrimoine documentaire et technique faisant autorité.

Toute décision durable doit être intégrée au dépôt avant d'être considérée comme officielle.

Aucune conversation, aucun assistant, aucun outil externe ni aucun document non intégré au dépôt ne peut prévaloir sur son contenu validé.

---

# Article 3 — Primauté des rôles

Le projet est organisé autour de rôles définis par la gouvernance.

Les rôles sont permanents.

Les personnes ou assistants qui occupent ces rôles sont interchangeables.

La continuité du projet repose sur la documentation et non sur un individu ou un assistant particulier.

---

# Article 4 — Autorité humaine

La responsabilité finale des décisions structurantes appartient au Project Lead ou à la personne physique qu'il désigne explicitement.

Les assistants peuvent proposer, analyser, documenter, implémenter et conseiller.

Ils ne disposent d'aucune autorité autonome sur les décisions structurantes.

Les critères définissant une décision structurante sont précisés dans **GOVERNANCE.md**.

Toute contribution produite avec l'assistance d'une IA doit être vérifiée, testée et assumée avant son intégration.

*Ajout 2026-08-25 (fusion, ex-Article 7 EN « Agent Governance ») :* Un assistant opère uniquement dans le rôle et le périmètre qui lui sont assignés. Aucun assistant ne peut modifier unilatéralement la gouvernance du projet, l'autorité architecturale, ou le mandat confié à un autre assistant.

---

# Article 5 — Documentation

La documentation constitue la mémoire officielle du projet.

Une décision importante n'est considérée comme durable que lorsqu'elle est documentée dans le dépôt.

La documentation doit rester cohérente avec l'état réel du projet.

---

# Article 6 — Transparence

Les décisions importantes doivent être compréhensibles, justifiables et traçables.

La gouvernance définit les mécanismes de traçabilité applicables (ADR, RFC, tickets, historique Git ou documents équivalents).

---

# Article 7 — Évolution maîtrisée

Toute évolution ayant un impact sur une interface publique, une architecture ou une règle de gouvernance doit être préparée, documentée et validée avant son adoption.

Les procédures applicables sont définies dans les documents de gouvernance.

*Ajout 2026-08-25 (fusion, ex-Article 6 EN « Change Discipline ») :* Tout changement doit être délimité, revu, testable et rattachable à un élément de roadmap ou à un ticket gouverné. Aucune implémentation ne peut élargir silencieusement le périmètre pour lequel elle a été autorisée.

---

# Article 8 — Responsabilité

Les responsabilités du projet sont définies par des rôles.

La gouvernance organise leur répartition, leur continuité et leurs modalités de délégation.

---

# Article 9 — Automatisation

Lorsqu'une règle peut être appliquée automatiquement de manière fiable, reproductible et vérifiable, l'automatisation est privilégiée.

L'automatisation ne remplace jamais l'autorité humaine définie par la présente Constitution.

---

# Article 10 — Qualité

La qualité constitue une exigence permanente.

Les arbitrages entre différentes dimensions de la qualité sont autorisés lorsqu'ils sont justifiés, documentés et réévalués.

Les critères opérationnels de qualité sont définis par la gouvernance et les standards du projet.

---

# Article 11 — Collaboration

Le projet privilégie la coopération, la transparence et la recherche du consensus.

Les désaccords portent sur les idées, les décisions et les solutions techniques, jamais sur les personnes.

En cas de désaccord persistant, le Project Lead assure l'arbitrage final.

---

# Article 12 — Sécurité et pérennité

La sécurité, la maintenabilité et la pérennité du projet constituent des exigences permanentes.

La dette technique peut être acceptée lorsqu'elle est explicitement justifiée, documentée et destinée à être résorbée.

---

# Article 13 — Ouverture

MYBlab est conçu pour accueillir de nouveaux contributeurs humains ainsi que de nouveaux assistants.

L'arrivée ou le départ d'un contributeur ne remet jamais en cause les principes de la présente Constitution.

Les modalités d'intégration des nouveaux contributeurs sont définies par la gouvernance.

---

# Article 14 — Hiérarchie documentaire

La présente Constitution constitue le niveau documentaire le plus élevé du projet.

Les autres documents doivent lui être conformes.

Ordre de référence :

1. MYBLAB-CONSTITUTION.md
2. GOVERNANCE.md
3. `docs/architecture/PLATFORM_ARCHITECTURE.md`
4. CONVENTIONS.md
5. ADR
6. RFC
7. Documentation technique
8. Code source

`docs/architecture/PLATFORM_ARCHITECTURE.md` constitue désormais le document d'architecture de référence de **niveau 3** pour l'architecture plateforme de MYBlab. `docs/governance/ARCHITECTURE.md` est conservé comme documentation de gouvernance/architecture existante, mais ne prévaut pas sur `PLATFORM_ARCHITECTURE.md` pour les décisions d'architecture plateforme.

En cas de contradiction, le document de niveau supérieur prévaut jusqu'à résolution.

*Note 2026-08-25 (fusion) :* la version aujourd'hui archivée `docs/governance/archive/CONSTITUTION.en.v1.0.0-superseded.md` proposait une hiérarchie plus courte (Constitution → ADR → `PLATFORM_ARCHITECTURE.md` → documentation d'implémentation), plaçant les ADR directement au niveau 2. La présente hiérarchie, plus fine et déjà citée par `ADR-011` et `CONVENTIONS.md`, prévaut sans ambiguïté.

---

# Article 15 — Révision

La présente Constitution ne peut être modifiée que par une décision explicite du Project Lead.

Toute révision doit demeurer exceptionnelle, motivée et compatible avec les principes fondateurs du projet.

Les évolutions procédurales ou organisationnelles doivent être réalisées dans les documents de niveau inférieur sans modifier la présente Constitution.

---

# Article 16 — Séparation des responsabilités *(ajouté 2026-08-25, fusion)*

Les modèles de domaine (Core), l'exécution/simulation, la présentation et les services de plateforme doivent rester séparés par des contrats explicites.

Une préoccupation visuelle ou d'interface ne doit jamais devenir silencieusement une préoccupation de domaine ou de simulation.

Le détail technique de cette séparation est défini par `docs/architecture/PLATFORM_ARCHITECTURE.md` et les ADR applicables (notamment ADR-002).

---

# Article 17 — Source de vérité du domaine *(ajouté 2026-08-25, fusion)*

Le modèle Document/Core constitue la source de vérité pour la topologie des circuits et l'état de domaine persisté.

Les couches de présentation consomment l'état de domaine et d'exécution à travers des interfaces définies ; elles ne redéfinissent jamais la vérité de domaine.

Cet article est distinct de l'Article 2 : l'Article 2 régit la source de vérité **documentaire** du projet (le dépôt Git) ; le présent article régit la source de vérité **du domaine métier** simulé par MYBlab.

---

# Article 18 — Validation *(ajouté 2026-08-25, fusion)*

Tout travail architectural ou d'implémentation doit être validé au regard de critères d'acceptation explicites et de preuves disponibles.

Un statut de validation ne doit jamais être déduit de la seule intention : il doit reposer sur des preuves vérifiables (tests, audit, Delivery Report ou document équivalent).

---

# Article 19 — Autorité de la Roadmap *(ajouté 2026-08-25, fusion)*

La roadmap constitue la couche de coordination stratégique entre la vision du projet, l'architecture et le travail exécutable.

Tout ticket doit être rattachable à un Programme et à un Épic applicable de la roadmap.

---

# Article 20 — Préservation des artefacts historiques *(ajouté 2026-08-25, fusion)*

Les documents d'architecture historiques et les décisions remplacées doivent être préservés lorsqu'ils fournissent un contexte utile.

Le remplacement d'un document doit être explicite ; un artefact historique ne devient jamais silencieusement une autorité en vigueur.

---

# Article 21 — Absence d'architecture implicite *(ajouté 2026-08-25, fusion)*

Une implémentation de code, un message de commit ou la recommandation d'un assistant ne constitue pas, en soi, une décision architecturale.

L'autorité architecturale provient exclusivement de la documentation gouvernée et du processus de décision applicable (ADR, ruling CSA, ou document équivalent).

---

# Article 22 — Vision produit stratégique *(ajouté 2026-08-25, fusion)*

L'évolution visuelle et produit de MYBlab suit une trajectoire par paliers : atteindre d'abord le seuil de qualité et d'usage représenté par Tinkercad, puis dépasser ce seuil, puis évoluer vers un laboratoire électronique virtuel avancé, réaliste et immersif.

Cette direction stratégique est détaillée dans `docs/roadmaps/ROADMAP_PLATFORM.md` et guide les décisions futures de roadmap et d'architecture ; le présent article n'en fixe que le principe directeur.

---

# Disposition finale

Cette Constitution constitue le socle permanent de la gouvernance de MYBlab.

Elle a vocation à demeurer stable dans le temps afin d'assurer la continuité, la cohérence et la pérennité du projet.
