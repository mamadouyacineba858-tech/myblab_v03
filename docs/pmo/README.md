# PMO IA — MYBlab 2030

Cette arborescence contient l'ensemble des artefacts officiels du PMO IA,
introduit le 2026-08-02.

## Statut par rapport à la gouvernance existante

Cette structure **ne remplace pas** `docs/governance/TEAM_CHARTER.md` ni
`docs/governance/constitution.md`. Elle constitue une **nouvelle couche de
gouvernance**, avec un périmètre différent :

- `docs/governance/` — organisation générale de l'équipe (historique, officiel)
- `docs/pmo/` — fonctionnement opérationnel du PMO (Ticket / Blueprint / Delivery Report)

Les tickets historiques dans `docs/tickets/` restent en place, non déplacés,
non renommés. Les nouveaux tickets conformes aux standards PMO sont créés
dans `docs/pmo/tickets/`.

Une migration documentaire officielle (liens entre anciens et nouveaux
documents, évolution de TEAM_CHARTER, place de Qwen/Gemini dans la
gouvernance actualisée) sera traitée par un ticket dédié une fois tous les
standards PMO finalisés. Aucune de ces décisions n'est anticipée ici.

## Structure

```
docs/pmo/
├── standards/                   # Standards officiels SPEC-PMO-XXX
│   ├── SPEC-PMO-002.md          # Ticket (Execution Contract)
│   ├── SPEC-PMO-003.md          # Execution Blueprint
│   └── SPEC-PMO-004.md          # Delivery Report
├── tickets/                     # Tickets conformes au standard SPEC-PMO-002
├── blueprints/                  # Blueprints conformes au standard SPEC-PMO-003
├── delivery-reports/            # Delivery Reports conformes au standard SPEC-PMO-004
└── repository-knowledge-base/   # Base de connaissance du dépôt (RKB) — à venir
```

## Cycle officiel d'un ticket

```
PMO IA (Mamadou)
   ↓
ChatGPT (Architecte) — Ticket
   ↓
Claude Phase 1 (Repository Analyst) — Execution Blueprint
   ↓
DeepSeek (Lead Solution Designer) — Conception / Implémentation
   ↓
ChatGPT — Audit d'architecture
   ↓
Claude Phase 2 (Repository Integrator) — Intégration, tests, Delivery Report
   ↓
ChatGPT — Audit final → CLOS / RETOUR EN EXÉCUTION / ARBITRAGE
```

## Règle fondamentale

> Aucun Ticket, Blueprint ou Delivery Report n'existe uniquement dans une
> conversation. Un artefact officiel n'existe que lorsqu'il est intégré dans
> le dépôt Git. Les conversations servent uniquement à préparer ou réviser
> ces artefacts.
