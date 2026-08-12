# MYBLAB Vision 2030

> **Version :** Draft 0.1  
> **Statut :** En rédaction  
> **Niveau documentaire :** 2 (Vision stratégique)  
> **Document supérieur :** MYBLAB-CONSTITUTION.md  
> **Owner :** Chief Platform Architect  
> **Contributors :** Project Team

---

## État d'avancement

## Tableau de suivi mis à jour

| Chapitre                                  | Statut |
| ----------------------------------------- | :----: |
| I – Mission                               | ✅ Gelé |
| II – Vision à long terme                  | ✅ Gelé |
| III – Valeurs                             | ✅ Gelé |
| IV – Principes architecturaux             | ✅ Gelé |
| V – Piliers stratégiques de la plateforme | ✅ Gelé |
| VI – Engagements de gouvernance           | ✅ Gelé |


## Position dans la hiérarchie documentaire

Le présent document complète **MYBLAB-CONSTITUTION.md**.

Il ne modifie ni les principes fondamentaux ni les règles de gouvernance établis par la Constitution.

Il formalise la vision stratégique de la plateforme et oriente les décisions d'architecture, les ADR, les roadmaps et les travaux futurs.

En cas de contradiction, **MYBLAB-CONSTITUTION.md** prévaut. Toute divergence doit être résolue avant validation du présent document.

---

## État du document

⚠️ **Document en cours de rédaction**

Chaque chapitre suit le cycle de validation suivant :

1. Rédaction
2. Revue d'architecture
3. Validation
4. Intégration dans le dépôt Git
5. Gel du chapitre

Une fois gelé, un chapitre ne peut être modifié que par une décision explicite de gouvernance.

---

# Table des matières

1. Mission
2. Vision à long terme
3. Valeurs
4. Principes architecturaux
5. Piliers de la plateforme
6. Engagements de gouvernance

---
## Chapitre I — Mission

MYBlab existe pour rendre la conception, la simulation, la programmation et la compréhension des systèmes électroniques accessibles, interactives et évolutives, en accompagnant chaque utilisateur de l'apprentissage jusqu'au prototypage avancé sur une plateforme unique.

Concrètement, cela signifie :

- Permettre à quiconque de concevoir, simuler et comprendre un circuit électronique sans posséder le matériel physique correspondant.
- Faire de la simulation un outil d'apprentissage, pas seulement un outil de vérification : l'utilisateur doit pouvoir observer et comprendre *pourquoi* un circuit se comporte comme il se comporte, pas seulement *que* ça fonctionne.
- Réduire la distance entre la théorie et la pratique, du premier schéma compris jusqu'au système embarqué qui exécute réellement du code.

MYBlab commence par répondre aux besoins de l'enseignement, parce que c'est le point d'entrée le plus exigeant en termes de clarté et de rigueur pédagogique. Un outil qui explique bien à un débutant est un outil dont l'architecture est saine. Mais rien dans cette priorité de départ ne doit limiter la plateforme à cet usage : chaque décision d'architecture doit être prise en gardant à l'esprit qu'un même utilisateur pourra, avec le temps, aller jusqu'au prototypage avancé sans changer d'outil.

MYBlab n'a pas pour objectif de reproduire les outils existants. Son ambition est de construire une plateforme cohérente qui rassemble progressivement, dans un environnement unique, des capacités aujourd'hui réparties entre plusieurs catégories de logiciels.

L'ambition de MYBlab est de permettre à un utilisateur de commencer par sa première expérience en électronique et de poursuivre, sans rupture technologique, jusqu'à la conception de systèmes complexes. L'évolution des compétences de l'utilisateur doit être accompagnée par l'évolution de la plateforme, sans jamais imposer de changer d'environnement de travail.

> **Principe fondateur**
>
> La simplicité d'utilisation ne doit jamais être obtenue au détriment de la richesse fonctionnelle ; la richesse fonctionnelle ne doit jamais être obtenue au détriment de la simplicité d'utilisation.

> **Devise du projet**
>
> **MYBlab doit évoluer avec ses utilisateurs.**

---

## Chapitre II — Vision à long terme (version gelée)

> ## Vision à long terme
>
> Imaginons quelqu'un qui découvre l'électronique pour la première fois. Il n'a jamais tenu une résistance dans sa main. Il pose un composant à l'écran, le relie à un autre, et voit — immédiatement, sans attendre, sans craindre de casser quoi que ce soit — ce qui se passe. Une LED s'allume. Alors il essaie autre chose. Il inverse un fil, juste pour voir. Il ajoute un second composant sans savoir s'il devrait. Rien ne le punit d'essayer : chaque tentative, même maladroite, est une question posée à l'outil, et l'outil répond toujours honnêtement. Ce n'est pas un examen qu'il faut réussir du premier coup. C'est un espace où l'on a le droit de se tromper autant de fois qu'il le faut pour comprendre.
>
> Et c'est bien cela qu'il cherche, sans toujours le formuler ainsi : non pas simplement voir que la LED s'allume, mais saisir pourquoi. La différence entre les deux ne lui semble pas secondaire. Réussir une fois, c'est un hasard qu'on ne sait pas reproduire. Comprendre, c'est pouvoir recommencer, ailleurs, autrement, sans avoir besoin qu'on le lui montre une seconde fois.
>
> Des mois plus tard, cette même personne construit quelque chose de plus ambitieux. Elle programme un comportement, observe comment son code influence réellement le circuit qu'elle a conçu, corrige une erreur non pas en devinant, mais en observant. Elle n'a rien réinstallé, rien changé d'environnement. L'outil qui lui a montré sa première LED s'allumer est le même qui l'accompagne maintenant qu'elle raisonne en systèmes. Elle ne se souvient même plus d'avoir dû apprendre à s'en servir — à un moment, sans qu'elle sache dire précisément quand, l'outil a cessé d'être quelque chose qu'elle manipule pour devenir quelque chose à travers lequel elle pense. Ses idées prennent forme directement ; la technique qui les rend possibles s'est retirée en arrière-plan, là où elle doit rester.
>
> Encore plus tard, cette personne conçoit quelque chose qu'elle a l'intention de fabriquer réellement. La frontière entre « apprendre » et « produire » ne s'est jamais présentée comme un mur à franchir. Elle s'est simplement estompée, progressivement, au rythme de sa propre progression — jamais imposée par l'outil, jamais en avance ni en retard sur ce dont elle avait besoin. Et pourtant, quelque chose de l'espace de ses débuts est resté intact : elle expérimente encore. Elle teste une variante avant de s'engager, elle laisse une idée improbable aller jusqu'au bout juste pour voir. Le laboratoire où elle a fait ses premiers pas n'a jamais disparu ; il s'est simplement agrandi avec elle.
>
> Pendant tout ce parcours, une chose n'a jamais changé : la confiance. **La simulation cherche toujours à représenter fidèlement le comportement attendu du système étudié, dans les limites clairement assumées du modèle utilisé.** Ce n'est jamais une façade qui simplifie au point de tromper, ni une exactitude si aride qu'elle décourage. À chaque étape, la personne comprend un peu plus qu'elle ne le pensait possible, sans jamais se sentir dépassée par ce qu'elle utilise.
>
> **C'est cette continuité — d'une première étincelle de curiosité jusqu'à la maîtrise — que MYBlab existe pour rendre possible. Non pas comme une succession d'outils, mais comme un environnement unique qui évolue avec ses utilisateurs, où l'expérimentation nourrit la compréhension, où la technique s'efface derrière les idées et où chaque progrès ouvre naturellement la voie au suivant.**

---

## Sur l'idée des citations fondatrices

Je la trouve juste, avec une précision à trancher avant qu'elle devienne officielle : je propose qu'elles soient présentées explicitement comme des **formulations distillées** des chapitres, pas comme des citations verbatim — parce qu'elles ne le sont pas toujours exactement (« Comprendre vaut mieux que reproduire » condense l'idée du Chapitre II sans en reprendre les mots exacts). Ça évite qu'un futur contributeur cherche cette phrase mot pour mot dans le texte et ne la trouve pas. Je suggérerais une courte section dédiée, par exemple en toute fin du document (pas dispersée dans chaque chapitre), intitulée quelque chose comme :

> ## Citations fondatrices
> *Ces phrases résument l'esprit des chapitres qui précèdent. Elles ne remplacent pas le texte intégral, mais peuvent en être extraites pour la documentation, le site du projet ou des présentations.*
>
> - Comprendre vaut mieux que reproduire.
> - MYBlab grandit avec ses utilisateurs.
> - La technologie doit s'effacer derrière les idées.
> - Chaque simulation est une occasion d'apprendre.

---

## Chapitre III — Valeurs (version gelée)

> ## Valeurs
>
> Une mission dit pourquoi un projet existe. Une vision décrit le monde qu'il cherche à construire. Les valeurs, elles, sont ce qui permet de choisir, chaque fois que deux chemins semblent également possibles. Elles ne sont pas une liste de qualités souhaitables — elles sont ce qui doit arbitrer, silencieusement, chaque décision de conception de MYBlab, y compris celles qu'aucun chapitre ne pourra jamais anticiper. **Ce ne sont pas non plus des règles absolues à appliquer isolément : elles entrent parfois en tension les unes avec les autres, et c'est précisément dans cet équilibre, jamais dans l'application mécanique d'une seule d'entre elles, que se prennent les meilleures décisions de conception.**
>
> ### Compréhension avant reproduction
>
> Un utilisateur qui reproduit un résultat sans le comprendre n'a rien appris — il a seulement réussi une fois. MYBlab ne mesure jamais sa réussite au fait qu'un circuit s'allume, mais à la capacité de celui qui l'a conçu à expliquer pourquoi. Cette valeur interdit, par principe, toute fonctionnalité qui offrirait un résultat correct sans jamais exposer le chemin qui y mène — un raccourci qui masquerait la compréhension serait un échec, même s'il produisait la bonne réponse.
>
> ### Simplicité sans simplification excessive
>
> Rendre un outil facile à utiliser et rendre un outil facile à comprendre ne sont pas la même chose. MYBlab recherche la première sans jamais sacrifier la seconde : une interface épurée ne doit jamais dissimuler un comportement réel derrière une approximation confortable. Quand une simplification devient nécessaire, elle doit rester visible et assumée, jamais silencieuse.
>
> ### Fidélité scientifique
>
> Ce que MYBlab montre doit toujours pouvoir être confronté au réel — dans les limites que le modèle utilisé assume explicitement. Cette valeur ne demande pas l'exactitude parfaite en toute circonstance ; elle demande l'honnêteté sur ce qui est simulé et sur ce qui ne l'est pas encore. Une fonctionnalité qui donnerait l'illusion d'un comportement physique sans le calculer réellement irait à l'encontre de cette valeur, même si elle « avait l'air juste ».
>
> ### Curiosité et expérimentation
>
> Essayer doit toujours être sans risque, et l'échec doit toujours être une information plutôt qu'une sanction. Cette valeur guide MYBlab vers des décisions qui privilégient la réversibilité et l'exploration libre — un utilisateur doit pouvoir tenter quelque chose d'improbable simplement pour voir ce qu'il se passe, sans avoir à craindre de casser quoi que ce soit ni de perdre ce qu'il avait déjà construit.
>
> ### La technologie s'efface derrière les idées
>
> Un bon outil cesse, à un moment, d'être remarqué par celui qui l'utilise. MYBlab ne cherche jamais à mettre sa propre technicité en avant : sa réussite se mesure au moment où l'utilisateur pense à son circuit, à son code, à son idée — plus à l'outil lui-même. Cette valeur pèse directement sur toute décision d'interface ou d'architecture : la complexité doit toujours être absorbée par la plateforme, jamais transférée à l'utilisateur par confort de conception.
>
> ### Progression continue
>
> MYBlab n'accompagne pas un utilisateur à un instant donné — il l'accompagne dans la durée. Cette valeur va au-delà de l'absence de rupture : elle exige que la plateforme reconnaisse et soutienne activement la croissance de celui qui l'utilise, plutôt que de rester figée dans un même niveau de complexité en attendant que l'utilisateur s'adapte à elle. Une fonctionnalité pensée uniquement pour un niveau de compétence, sans considération pour ce qui vient avant ou après, contredit cette valeur.
>
> ### Continuité de l'expérience utilisateur
>
> Là où la progression continue concerne la croissance de l'utilisateur, cette valeur concerne la stabilité de l'environnement qui l'accompagne. Changer d'ambition ne doit jamais signifier changer d'outil, réapprendre une interface, ou perdre ce qui avait été construit. Cette valeur interdit toute décision qui créerait, même involontairement, un point de rupture entre deux usages de la plateforme.
>
> ### Architecture durable
>
> Un outil qui explique bien à un débutant est un outil dont l'architecture est saine — la clarté pédagogique et la rigueur technique ne sont jamais deux exigences séparées, elles se renforcent l'une l'autre. Cette valeur engage MYBlab à ne jamais sacrifier la solidité de ses fondations pour une gratification immédiate : toute décision d'architecture doit pouvoir être défendue autant pour ce qu'elle permet aujourd'hui que pour ce qu'elle ne referme pas pour demain.

---
## Chapitre IV — Principes architecturaux (version gelée)

> ## Principes architecturaux
>
> Une valeur guide un jugement. Un principe architectural contraint une décision. Ce qui suit n'est pas une liste de bonnes pratiques parmi lesquelles choisir selon le contexte — ce sont des contraintes permanentes, qui s'appliquent à toute décision de conception de MYBlab, indépendamment du domaine fonctionnel concerné ou de la technologie retenue pour l'implémenter.
>
> ### 1. Les données métier sont la seule source de vérité
>
> Tout ce que MYBlab affiche, calcule ou explique doit provenir d'un même ensemble de données métier, jamais d'une reconstruction propre à l'interface. La présentation peut simplifier ce qu'elle montre, mais elle ne doit jamais altérer ce qui est réellement su du système étudié. Deux vues différentes d'un même projet doivent toujours pouvoir être réconciliées, parce qu'elles décrivent la même vérité sous deux formes.
>
> ### 2. Chaque comportement affiché doit pouvoir être expliqué
>
> Il ne suffit pas qu'un résultat soit correct — il doit être possible de remonter de ce résultat vers la donnée et le raisonnement qui l'ont produit. Une fonctionnalité qui produirait un comportement correct sans qu'aucun chemin explicatif n'existe entre la cause et l'effet contredit ce principe, quelle que soit par ailleurs la justesse du résultat.
>
> ### 3. Les limites du modèle doivent être exposées, jamais dissimulées
>
> Ce que MYBlab ne simule pas doit être aussi visible que ce qu'il simule. Un système qui donnerait l'apparence de la complétude sans l'assumer trahirait la confiance de celui qui l'utilise, même sans jamais produire de résultat incorrect à proprement parler.
>
> ### 4. Aucune action ne doit être irréversible sans filet de sécurité explicite
>
> L'exploration doit rester structurellement sans risque. Toute action susceptible de détruire un travail existant doit être précédée d'une confirmation, ou suivie d'une possibilité de retour en arrière. Ce principe ne dépend d'aucun contexte d'usage : il s'applique aussi bien à un débutant qu'à un utilisateur expérimenté.
>
> ### 5. Une représentation unique doit porter tout le parcours de l'utilisateur
>
> Le format des données ne doit jamais changer entre un usage débutant et un usage avancé. Migrer un projet d'un système à un autre pour accéder à des fonctionnalités plus poussées constitue, par définition, une rupture que ce principe interdit.
>
> ### 6. La complexité se révèle progressivement, elle ne se duplique jamais
>
> Un même système doit pouvoir se présenter simplement à un débutant et en détail à un utilisateur avancé, sans qu'il existe deux implémentations distinctes de ce système. Toute tentation de construire un mode « simplifié » séparé du mode « réel » doit être résolue autrement — par une interface qui ajuste ce qu'elle montre, jamais par une duplication de ce qui est calculé.
>
> ### 7. La plateforme s'étend sans reconstruire ce qui existe déjà
>
> L'ajout d'un nouveau domaine fonctionnel ne doit jamais exiger de remettre en cause les domaines déjà en place. Une architecture qui ne pourrait grandir qu'en réécrivant ses fondations n'est pas une architecture durable au sens où MYBlab l'entend.
>
> ### 8. Un comportement validé ne change plus silencieusement
>
> Une fois qu'un comportement a été montré comme correct à l'utilisateur, il ne doit plus varier de façon inattendue à l'usage. La stabilité de ce qui est observé est une garantie de conception, pas une conséquence accidentelle du hasard des versions.
>
> ### 9. Le retour du système doit être clair, compréhensible et proportionné
>
> Chaque action de l'utilisateur doit produire une réponse qu'il peut interpréter, à la mesure de ce qu'il vient de faire — ni un silence qui laisse dans le doute, ni une réaction disproportionnée qui masquerait l'essentiel derrière le détail. La rapidité de la réponse compte moins que sa lisibilité.
>
> ### 10. Les responsabilités sont séparées, jamais mélangées
>
> Ce qui décrit les données, ce qui les transforme, et ce qui les présente doivent rester des responsabilités distinctes, séparément identifiables dans l'architecture. Un domaine fonctionnel ne doit jamais porter, par commodité, une responsabilité qui appartient à un autre : c'est cette séparation qui rend chaque partie du système lisible isolément, qui permet de la faire évoluer sans mettre en péril le reste, et qui la rend plus simple à maintenir dans la durée.
>
> ---
>
> Ces dix principes ne sont pas des recommandations : ce sont des contraintes que toute décision d'architecture doit respecter, quel que soit le domaine concerné. Les ADR ne les redéfinissent jamais — leur rôle est de traduire ces principes en décisions concrètes, propres à un contexte technique donné. Un ADR qui entrerait en contradiction avec l'un de ces principes n'est pas une exception à documenter : c'est une erreur à corriger, soit dans l'ADR lui-même, soit — si le principe s'avère réellement inadapté à une situation nouvelle — par une révision explicite de ce chapitre, jamais par un contournement silencieux. **Chaque ADR doit justifier explicitement les principes qu'il applique et démontrer qu'il n'en contredit aucun.**

---
## Chapitre V — Piliers stratégiques de la plateforme (version gelée)

> ## Piliers stratégiques de la plateforme
>
> Un pilier n'est pas une fonctionnalité, ni une technologie. C'est un domaine fonctionnel permanent de MYBlab, indispensable à la réalisation de sa mission, et appelé à évoluer indépendamment des technologies qui l'implémentent. Ce chapitre en décrit sept, chacun relié aux valeurs et aux principes qui le rendent nécessaire. Six découlent directement de ce qui a déjà été énoncé dans les chapitres précédents ; le septième — Collaboration et partage — est un choix stratégique assumé explicitement, non une déduction du texte déjà écrit.
>
> Deux propriétés — la continuité du parcours utilisateur et l'ouverture de la plateforme à son évolution — ne figurent pas dans cette liste. Elles ne définissent aucun domaine en particulier : elles s'appliquent à tous, sans exception, et sont déjà portées par les principes architecturaux du Chapitre IV.
>
> ### 1. Conception électronique
>
> Poser un composant, le relier à un autre, voir un circuit prendre forme — c'est le premier geste que la Vision décrit, et celui sur lequel tous les autres piliers s'appuient. Sans ce domaine, aucun des suivants n'a d'objet sur lequel s'exercer.
>
> Il met en œuvre la Simplicité sans simplification excessive et la Curiosité et expérimentation : concevoir doit rester un geste libre, jamais entravé par la peur de l'erreur.
> Il mobilise les principes 1 (les données métier comme seule source de vérité), 5 (une représentation unique pour tout le parcours) et 10 (séparation des responsabilités), qui garantissent qu'un même circuit reste le même objet, du premier brouillon jusqu'au projet abouti.
>
> ### 2. Simulation scientifique
>
> Concevoir sans comprendre ne serait qu'assembler. Ce pilier transforme un circuit en objet d'étude : il calcule, révèle, explique un comportement plutôt que de se contenter de l'illustrer.
>
> Il met en œuvre la Fidélité scientifique avant toute autre valeur, et la Compréhension avant reproduction qui donne son sens à tout le reste de la Vision.
> Il mobilise les principes 2 (chaque comportement doit pouvoir être expliqué), 3 (les limites du modèle exposées, jamais dissimulées), 8 (un comportement validé ne change plus silencieusement) et 9 (un retour clair, compréhensible et proportionné).
>
> ### 3. Programmation et systèmes embarqués
>
> La Mission ne s'arrête pas au circuit statique : elle promet un chemin continu jusqu'au système qui exécute réellement du code. Ce pilier porte cette promesse dans ce qu'elle a de plus exigeant — un comportement programmé doit se comporter, en simulation, comme il se comporterait réellement.
>
> Il met en œuvre la Fidélité scientifique, dans son exigence la plus stricte, et la Progression continue, puisque c'est souvent ici que l'utilisateur franchit le pas de la conception vers le comportement dynamique.
> Il mobilise les principes 3 (limites du modèle assumées), 6 (complexité révélée progressivement, jamais dupliquée) et 7 (extension sans reconstruction des domaines déjà en place).
>
> ### 4. Apprentissage et accompagnement
>
> Un outil peut être juste sans jamais rien enseigner. Ce pilier fait la différence : il porte, de façon active, la promesse que MYBlab ne se contente pas de produire un résultat correct, mais accompagne celui qui cherche à le comprendre.
>
> Il met en œuvre la Compréhension avant reproduction dans son expression la plus directe, et la Curiosité et expérimentation, puisque apprendre suppose de pouvoir se tromper sans crainte.
> Il mobilise les principes 2 (comportement explicable), 4 (aucune action irréversible sans filet de sécurité) et 9 (retour clair, compréhensible et proportionné).
>
> ### 5. Intelligence et connaissance
>
> Ce pilier ne désigne aucune technologie en particulier — ni aujourd'hui ni demain. Il désigne tout ce qui aide l'utilisateur à comprendre plutôt qu'à simplement obtenir : une explication, une annotation, un diagnostic. Ce que ces mécanismes seront dans dix ans changera sans doute plusieurs fois ; ce qu'ils doivent accomplir ne changera pas.
>
> Il met en œuvre Compréhension avant reproduction, déjà la première valeur du Chapitre III, ici élevée au rang de domaine à part entière plutôt que de simple conséquence des autres piliers.
> Il mobilise le principe 2 (chaque comportement affiché doit pouvoir être expliqué), qui est, de tous les principes, celui que ce pilier a la responsabilité la plus directe de servir.
>
> ### 6. Écosystème ouvert
>
> MYBlab ne prétend pas tout construire seul. Ce pilier porte la capacité de la plateforme à accueillir ce qu'elle n'a pas elle-même conçu — nouveaux composants, nouvelles bibliothèques, nouvelles intégrations — sans jamais remettre en cause ce qui existe déjà.
>
> Il met en œuvre l'Architecture durable, et rend concrète l'ambition de la Mission de rassembler progressivement des capacités aujourd'hui dispersées entre plusieurs catégories de logiciels.
> Il mobilise directement le principe 7 (la plateforme s'étend sans reconstruire ce qui existe déjà) et le principe 10 (séparation des responsabilités), qui rend cette extension possible sans fragiliser l'ensemble.
>
> ### 7. Collaboration et partage — un choix assumé, pas une déduction
>
> Contrairement aux six piliers précédents, celui-ci n'est pas la conséquence directe d'une phrase déjà écrite dans les chapitres qui précèdent : la Vision, jusqu'ici, décrit toujours un parcours individuel. C'est un choix stratégique, posé consciemment plutôt que découvert dans le texte : MYBlab se conçoit comme une plateforme, pas comme un outil monoposte, et cette ambition doit un jour se traduire dans la façon dont un projet peut être partagé, montré, ou construit à plusieurs.
>
> Ce pilier ne cherche pas de justification rétroactive dans les chapitres précédents — il les prolonge, sans prétendre en découler.
>
> ---
>
> Ces sept piliers ne sont pas classés par priorité : leur ordre suit la trajectoire de l'utilisateur telle que la Vision la raconte, de la conception jusqu'au partage. Déterminer dans quel ordre les développer relève des Roadmaps, pas de ce chapitre : une roadmap peut avancer un pilier avant un autre, mais elle ne redéfinit jamais ce qu'est un pilier, ni sa place dans cette liste.

---

## Chapitre VI — Engagements de gouvernance (rédaction complète)

> ## Engagements de gouvernance
>
> Les cinq chapitres qui précèdent décrivent ce que MYBlab est, ce qu'il vise, ce qui le guide, ce qui contraint son architecture, et les domaines qu'il doit couvrir. Ce dernier chapitre répond à une question différente : comment ce document lui-même reste-t-il vivant, cohérent, et digne de confiance, alors que le projet qu'il décrit continuera d'évoluer bien après que ces mots auront été gelés ?
>
> Les engagements qui suivent sont regroupés en quatre familles : la cohérence documentaire du Tome I avec le reste du dépôt, l'articulation entre ces principes et les décisions d'architecture concrètes, la gouvernance des feuilles de route qui planifient leur mise en œuvre, et enfin la façon dont le Tome I lui-même est autorisé à évoluer.
>
> ### A. Cohérence documentaire
>
> **E1 — Aucun document, quel que soit son niveau d'achèvement ou de validation interne, ne détient d'autorité formelle dans la hiérarchie documentaire tant qu'il n'y a pas été explicitement intégré.**
> Un document peut être entièrement rédigé, relu, discuté et jugé mûr par tous ceux qui y ont contribué, sans pour autant faire partie de la hiérarchie qui gouverne le projet. Seule une décision explicite d'intégration — jamais l'achèvement du document lui-même — lui confère cette autorité. Cet engagement protège le projet contre une confusion précise : celle qui consisterait à traiter un texte comme faisant foi simplement parce qu'il est complet et de bonne qualité.
>
> **E2 — Un chapitre n'est considéré comme gelé qu'après validation explicite de l'autorité compétente, jamais par défaut.**
> Le silence, l'absence d'objection, ou le simple écoulement du temps ne valent jamais validation. Chaque étape franchie doit pouvoir être attribuée à une décision précise, prise par quelqu'un, à un moment identifiable.
>
> **E3 — La Vision ne se révise que par amendement explicite et tracé, jamais par glissement progressif.**
> Une formulation qui semble, avec le recul, imparfaite ou datée ne doit jamais être corrigée silencieusement au fil d'une relecture ultérieure. Toute révision de la Vision doit être un acte identifiable en tant que tel — un document d'amendement, daté, qui remplace explicitement ce qui précède plutôt que de s'y substituer sans le dire.
>
> ### B. Décisions d'architecture
>
> **E4 — Toute décision d'architecture doit citer explicitement les principes du Chapitre IV qu'elle traduit, et démontrer qu'elle n'en contredit aucun.**
> Une décision technique qui ne peut être rattachée à aucun principe n'est pas nécessairement mauvaise, mais elle échappe au cadre que ce document établit — et doit, à ce titre, être traitée comme une exception à examiner, pas comme une décision ordinaire.
>
> **E5 — Une tension non résolue entre deux principes, rencontrée dans un cas concret, doit produire une décision d'arbitrage explicite et documentée, jamais un contournement silencieux dans le code.**
> Deux principes peuvent légitimement entrer en tension sur un cas particulier. Ce n'est pas un défaut du Chapitre IV — c'est une situation prévisible, que ce chapitre a d'ailleurs anticipée dès son préambule. Ce qui ne serait pas acceptable, en revanche, c'est qu'un choix d'implémentation tranche cette tension sans que la tension elle-même n'ait été nommée et documentée.
>
> ### C. Gouvernance des Roadmaps
>
> **E6 — Une feuille de route planifie l'ordre de réalisation d'un pilier ; elle ne peut ni en créer, ni en redéfinir un.**
> La liste des piliers appartient au Chapitre V. Une feuille de route peut avancer un pilier avant un autre, l'ignorer temporairement, ou le découper en étapes — mais jamais en changer la nature, la justification, ou l'existence même.
>
> **E7 — Toute divergence constatée entre une feuille de route et l'état réel du dépôt doit être corrigée par une décision documentaire dédiée, jamais absorbée silencieusement dans la tâche suivante.**
> Cet engagement n'est pas une précaution théorique. Il généralise un incident réellement survenu dans ce projet : une feuille de route a un jour décrit un travail sous un nom qui ne correspondait plus à ce qui avait été effectivement livré sous ce même nom. La correction s'est faite par une tâche entièrement dédiée à cette resynchronisation, pas au détour d'une autre. C'est ce réflexe que cet engagement rend permanent.
>
> **E8 — Un nouveau pilier ne s'ajoute au Chapitre V que sous l'une de deux formes explicitement déclarées : dérivé des chapitres qui le précèdent, ou choix stratégique assumé comme tel.**
> Cette distinction existe déjà dans le Chapitre V lui-même, pour le pilier Collaboration et partage. Cet engagement en fait une règle générale, applicable à tout pilier futur : jamais une justification rétroactive qui prétendrait avoir toujours été là.
>
> ### D. Évolution du Tome I
>
> **E9 — Chaque chapitre porte la trace de ses propres réserves non résolues, et celles-ci restent visibles jusqu'à leur clôture explicite.**
> Un document qui prétendrait n'avoir aucune limite serait moins digne de confiance qu'un document qui les nomme. Les réserves signalées au moment de la validation d'un chapitre ne doivent jamais être discrètement oubliées — elles doivent demeurer visibles jusqu'à ce qu'une décision explicite les résolve ou les écarte.
>
> **E10 — Toute modification d'un chapitre gelé suit le même processus de revue, de validation et de traçabilité que toute décision d'architecture majeure.**
> La documentation fondatrice n'est pas un texte qu'on ajuste librement au fil du temps parce qu'on en a la plume. Elle suit la même discipline que le code qu'elle gouverne : proposition, critique, validation, traçabilité. C'est cette discipline, appliquée sans exception depuis le premier chapitre, que cet engagement rend explicite plutôt que tacite.
>
> ---
>
> Le Tome I n'a pas vocation à prévoir toutes les décisions futures. Il a pour vocation de garantir que, quelles que soient ces décisions, elles resteront cohérentes avec l'identité de MYBlab.

---

## Auto-vérification (trois critères)

| Critère | Résultat |
|---|---|
| **Intemporel** | ✅ E1 reformulé n'ancre plus le chapitre dans l'état actuel du Tome I — vérifié explicitement, c'est le point que tu as corrigé |
| **Indépendant des technologies** | ✅ Aucune mention de brique technique |
| **Inspirant mais vérifiable** | ✅ Chaque engagement reste actionnable — plusieurs sont d'ailleurs directement adossés à des faits vérifiables du dépôt (E7 notamment) |









