## Décision — Audit Git (21 juillet 2026)

- Branche active : main
- Dernier commit : 5d00ef6 chore: initialize MYBlab v0.3.0 architecture
- Working tree : non propre (13 fichiers modifiés, 2 non suivis)
- Tag v0.3.0 absent

### Action obligatoire
- Commit/restauration des fichiers modifiés
- Décision sur fichiers non suivis (`CircuitContext.js`, `useCircuit.js`)
- Création du tag v0.3.0 une fois l’état stabilisé

### Invariant
Aucune nouvelle fonctionnalité ne doit être ouverte tant que le dépôt n’est pas propre et tagué.
## Décision — Audit Git (21 juillet 2026)
... contenu déjà consigné ...

---

## Décision — Audit Lint (22 juillet 2026)
- Erreurs: 16, Warnings: 2
- P0: doublons CircuitContext, hooks non conformes
- P1: ArduinoSimulator.js, SimulationCanvas.jsx
- P2: incohérences de style
ACTION: Ticket MB-004.6 pour correction P0/P1
