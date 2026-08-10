# MYBLAB Vision 2030

| Chapitre | Statut |
|----------|--------|
| I – Mission | ✅ Gelé |
| II – Vision à long terme | ✅ Gelé |
| III – Valeurs | 🟡 En rédaction |
| IV – Principes architecturaux | ⏳ À rédiger |
| V – Piliers de la plateforme | ⏳ À rédiger |
| VI – Engagements de gouvernance | ⏳ À rédiger |

---

⚠️ Ce document est en cours de rédaction.
Chaque chapitre est validé indépendamment avant intégration définitive.

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

## Chapitre II — Vision à long terme

Les deux ajustements sont justes — la reformulation sur la fidélité de la simulation est effectivement plus défendable scientifiquement, et la phrase finale est plus dense sans perdre en clarté. Intégration.

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




