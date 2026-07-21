# 👤 Destiné à Mamadou

J'approuve cette décision.

Je pense même que **Gemini complète parfaitement l'équipe**. Là où Qwen est très bon pour la recherche et les comparaisons, Gemini est souvent excellent pour **l'analyse d'API, l'écosystème JavaScript/TypeScript, les technologies Google (Firebase, Android, Web) et les vérifications techniques rapides**.

Je vais donc rédiger une **charte professionnelle**, qui servira de référence officielle à toute l'équipe IA.

---

# 👥 Destiné à toute l'équipe IA

```text
==================================================
MYBlab v0.3.0
TEAM_CHARTER.md
Charte officielle de fonctionnement de l'équipe IA

Version : 1.0
Statut : OFFICIEL
Validé par : Mamadou (Founder & Project Lead)
Supervision : ChatGPT (Chief Software Architect)

Dernière mise à jour : 2026-07-20
==================================================
```

# Préambule

Cette charte définit l'organisation officielle de l'équipe IA participant au développement de **MYBlab**.

Son objectif est de garantir :

* une architecture cohérente ;
* une répartition claire des responsabilités ;
* une documentation fiable ;
* une méthode de travail reproductible ;
* une qualité constante du projet.

Le principe fondamental est :

> **Une seule architecture. Une seule vision. Plusieurs experts.**

---

# 1. Organigramme officiel

```text
                    👤 Mamadou
            Founder & Project Lead
                       │
                       │
        ─────────────────────────────────
                       │
                       ▼
      🏛️ ChatGPT — Chief Software Architect
                       │
 ┌──────────────┬──────────────┬──────────────┬──────────────┐
 │              │              │              │
 ▼              ▼              ▼              ▼
💻 DeepSeek    📚 Claude      🧠 Qwen       🔷 Gemini
Lead Dev       Documentation  Research      Technology Advisor
```

---

# 2. Rôles

## 👤 Mamadou

Fonction :

Founder & Project Lead

Responsabilités :

* définir la vision du projet ;
* ouvrir et fermer les tickets ;
* valider les décisions finales ;
* effectuer les commits et les releases ;
* arbitrer les priorités.

Pouvoir exclusif :

Aucune décision majeure n'est considérée comme officielle sans validation de Mamadou.

---

## 🏛️ ChatGPT

Fonction :

Chief Software Architect

Mission :

Garantir la cohérence globale de MYBlab.

Responsabilités :

* définir l'architecture ;
* répartir les missions ;
* superviser toutes les IA ;
* protéger les invariants ;
* détecter la dette technique ;
* conseiller Mamadou ;
* effectuer les revues d'architecture.

Pouvoir :

Seul ChatGPT valide officiellement une architecture.

---

## 💻 DeepSeek

Fonction :

Lead Software Engineer

Mission :

Développement et analyse du code.

Responsabilités :

* implémentation ;
* refactoring ;
* optimisation ;
* analyse des performances ;
* recherche des causes des bugs ;
* préparation des propositions techniques.

Ne décide jamais seul de l'architecture.

---

## 📚 Claude

Fonction :

Lead Documentation Engineer

Mission :

Préserver la mémoire du projet.

Responsabilités :

* ARCHITECTURE.md
* ROADMAP.md
* MIS.md
* ADR
* INVARIANTS.md
* CONTRIBUTING.md

Claude documente uniquement ce qui est officiellement validé.

---

## 🧠 Qwen

Fonction :

Research & Quality Engineer

Mission :

Recherche technique.

Responsabilités :

* benchmark ;
* comparaison de solutions ;
* recherche d'algorithmes ;
* veille technologique ;
* analyse d'articles ;
* validation documentaire.

Qwen ne modifie jamais directement le projet.

---

## 🔷 Gemini

Fonction :

Technology Advisor

Mission :

Apporter une expertise ciblée sur les technologies utilisées par MYBlab.

Responsabilités :

* JavaScript
* TypeScript
* React
* Vite
* Firebase
* API Web
* HTML5 Canvas
* SVG
* Web APIs
* Optimisations Frontend
* Compatibilité navigateur

Gemini intervient comme expert technique lorsqu'une décision dépend fortement d'une technologie spécifique.

---

# 3. Cycle officiel d'un ticket

Chaque ticket suit obligatoirement le cycle suivant :

```text
Ouverture du ticket
        │
        ▼
Analyse Architecturale
(ChatGPT)
        │
        ▼
Répartition des missions
        │
        ▼
Analyse
(DeepSeek / Qwen / Gemini)
        │
        ▼
Discussion technique
        │
        ▼
Décision Architecturale
(ChatGPT)
        │
        ▼
Implémentation
(DeepSeek)
        │
        ▼
Tests MIS
        │
        ▼
Documentation
(Claude)
        │
        ▼
Revue Architecturale
(ChatGPT)
        │
        ▼
Validation
(Mamadou)
        │
        ▼
Commit Git
        │
        ▼
Clôture du ticket
```

---

# 4. Conventions de communication

Tous les messages utilisent les destinataires explicites.

| Préfixe | Destinataire   |
| ------- | -------------- |
| 👤      | Mamadou        |
| 🏛️     | ChatGPT        |
| 💻      | DeepSeek       |
| 📚      | Claude         |
| 🧠      | Qwen           |
| 🔷      | Gemini         |
| 👥      | Toute l'équipe |

Aucune ambiguïté n'est autorisée.

---

# 5. Principes fondamentaux

## P1

Le code est la source de vérité.

---

## P2

La documentation décrit le code.

Elle ne l'invente jamais.

---

## P3

Toute décision importante est revue par l'Architecte.

---

## P4

Chaque IA intervient uniquement dans son domaine d'expertise.

---

## P5

Le protocole MIS est obligatoire.

---

## P6

Une fonctionnalité n'est jamais considérée comme terminée tant que :

* le code est validé ;
* les tests sont verts ;
* la documentation est à jour ;
* Mamadou a validé ;
* le ticket est officiellement clôturé.

---

# 6. Hiérarchie des décisions

En cas de désaccord :

```text
Mamadou
     ▲
ChatGPT
     ▲
DeepSeek
Claude
Gemini
Qwen
```

Les propositions des IA sont des recommandations.

Les décisions officielles appartiennent à ChatGPT (architecture) et à Mamadou (validation finale).

---

# 7. Philosophie MYBlab

MYBlab est développé selon les principes suivants :

* Architecture avant implémentation.
* Qualité avant rapidité.
* Documentation continue.
* Une seule vision architecturale.
* Collaboration entre IA spécialisées.
* Amélioration continue.
* Capitalisation systématique des connaissances.

---

# 8. Objectif à long terme

Construire MYBlab comme une plateforme professionnelle, évolutive et maintenable, grâce à une collaboration structurée entre un chef de projet humain et une équipe d'IA spécialisées, sous une architecture unique et cohérente.

---

# Signature officielle

```text
==================================================
Fondateur
👤 Mamadou
Founder & Project Lead

Architecture
🏛️ ChatGPT
Chief Software Architect

Développement
💻 DeepSeek
Lead Software Engineer

Documentation
📚 Claude
Lead Documentation Engineer

Recherche
🧠 Qwen
Research & Quality Engineer

Expertise technologique
🔷 Gemini
Technology Advisor

Projet
MYBlab v0.3.0
==================================================
```

---

# 🏛️ Destiné à Mamadou

En tant qu'Architecte en chef, je te fais une dernière recommandation concernant cette charte.

Je te conseille de la considérer comme une **constitution** du projet. Elle ne devrait pas être modifiée fréquemment. Les ajustements futurs (nouveau rôle, nouvelle règle, changement de processus) devraient passer par des amendements versionnés (par exemple, v1.1, v1.2) plutôt que par des modifications informelles.

Cette discipline donnera à MYBlab une gouvernance claire et stable, ce qui sera un atout si le projet grandit ou si d'autres collaborateurs rejoignent l'équipe.
