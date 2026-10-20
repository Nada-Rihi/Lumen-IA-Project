# LUMEN — Le Banc de Lumière · Spécifications

Jeu d'action-sauvetage 3D sous-marin, jouable dans le navigateur (HTML5 + Three.js r128), sans build ni serveur : on ouvre `index.html`.
Vous guidez un banc de poissons lumineux à travers un océan **sans limites** jusqu'à la **Source**, en évitant un requin et en relevant un défi différent à chaque plongée.

## 1. Structure du projet

```
lumen/
├─ index.html                 page, HUD, écrans titre / fin / pause
├─ css/style.css
├─ lib/                       Three.js r128 + post-traitement (EffectComposer, Bloom…) en local
├─ js/vehicle.js              bibliothèque des comportements de Reynolds (GDC 1999), en 3D
├─ js/game.js                 monde, banc, requin, niveaux, défis, audio, rendu, entrées
├─ js/fauna.js                vie ambiante pilotée par vehicle.js
├─ audio/deep-sea-ambience.mp3  ambiance sous-marine (≈ 7 min, stéréo 48 kHz)
├─ .vscode/                   Live Server, lancement Chrome
└─ README.md
```

Ordre de chargement : `three.min.js` → shaders/passes → `vehicle.js` → `game.js` → `fauna.js`. Les trois scripts partagent la portée globale (scripts classiques, pas de modules), ce qui permet l'ouverture directe en `file://`.

## 2. Boucle de jeu

- **Simulation à pas fixe** : 60 Hz (`step()`), au plus 4 pas par image affichée. Le rendu est indépendant.
- **États (`mode`)** : `title` → `play` ⇄ `pause` → `end` → (`play` au niveau suivant ou même niveau).
- **Pause** (Échap ou P, ou onglet masqué) : simulation, faune et horloge visuelle gelées, caméra encore orbitable, ambiance baissée. Menu : Reprendre / Recommencer / Menu.
- **Victoire** : `D ≥ objectif` (Lumens déposés à la Source). **Défaite** : banc trop réduit, trop de pertes, temps écoulé (selon le défi).
- **Étoiles** : ≤ 4 pertes = 3 ★, ≤ 9 = 2 ★, sinon 1 ★.
- **Sauvegarde** : niveau atteint dans `localStorage` (clé `lumenLv`), sans erreur si indisponible.

## 3. Contrôles

| Action | Entrée |
|---|---|
| Guider le banc (relatif à la caméra) | Flèches / WASD |
| Monter / descendre | E / Q |
| Pulse (repousse le requin, recharge 4 s) | Espace |
| Poser le guide à un point | Clic / toucher bref |
| Caméra | Glisser (orbite), molette (zoom 16–75) |
| Pause | Échap / P |
| Son coupé / rétabli | M |
| Effets visuels on/off | G |

Le guide (« beacon ») est un point que le banc cherche à rejoindre. Il est attaché au banc : il ne peut pas s'en éloigner de plus de 45 unités.

## 4. Les entités

### 4.1 Lumens (le banc)
- 40 poissons au départ : **26 dans le banc** (`s=1`) + **14 sauvages dorés** (`s=0`) répartis le long de la route. États : 0 sauvage, 1 banc, 2 mangé, 3 déposé.
- **Adoption** : un sauvage rejoint le banc s'il passe à moins de 5 unités du guide ou d'un poisson du banc.
- **Dépôt** : un poisson du banc à moins de 7,5 unités de la Source est sauvé (si toutes les balises sont activées).
- Vitesse max 0,30 (0,37 en panique ; 0,17 pour un sauvage) ; force max 0,017 (unités par image).
- Règles de pilotage du banc (poids) : arrivée vers le guide 1,2 (rayon de ralentissement 16) · séparation 1,5 (rayon 2,6) · alignement 0,7 · cohésion 0,6 (voisinage 12) · fuite du requin 3,5 (dans 34 unités) · évitement des rochers 4 (marge 9) · confinement vertical (fond +6, plafond 38) · courant du niveau.
- Panique : teinte rose, vitesse max augmentée, tension sonore.

### 4.2 Le requin
Machine à états, vitesses multipliées par `sp` du niveau :

| État | Vitesse | Déclencheur / fin |
|---|---|---|
| `patrol` | 0,26 | errance autour du banc ; passe en `stalk` si le banc est à moins de `aggr` |
| `stalk` | 0,30 | poursuite avec prédiction ; `lunge` si distance < 24 ; retour `patrol` si > 88 ou après 900 images |
| `lunge` | 0,47 | 170 images, mange jusqu'à 2 poissons à moins de 3,4 unités |
| `gorge` | 0,17 | 420 images de digestion, s'éloigne du banc |

Force de virage max 0,0065 (virages larges). Si le banc est à plus de 170 unités, le requin réapparaît à 100 unités sur un cercle autour de lui. Le **Pulse** (portée 45) le fait passer en `gorge` 260 images. Les 3 poissons-pilotes qui l'accompagnent sont décoratifs.

### 4.3 Vie ambiante (`fauna.js`, sans effet sur le gameplay)
Trois bancs décoratifs de 26 poissons (path following + flocking + courant + évitement) · 3 poissons-pilotes autour du requin (offset pursuit) · 2 raies manta aux ailes battantes (wander ; la 2ᵉ en leader following) · 8 méduses (wander, se cachent du requin derrière les rochers avec hide) · bulles de 3 sources hydrothermales · chant de baleine lointain. Tout se recentre autour du banc (réapparition à 60–100 unités).

## 5. Comportements de pilotage (`vehicle.js`)

Modèle de véhicule simple de Reynolds : `force = tronquer(force, maxForce)` ; `v = tronquer(v + force/masse, maxSpeed)` ; `p += v` ; repère local reconstruit à chaque pas.

seek · flee · arrive · pursue · evade · offsetPursuit · wander · avoidObstacles · followPath · contain · flowField · unalignedAvoid · separation · alignment · cohesion · flock · leaderFollow · interpose · hide · combinaison par `Vehicle.prioritized` (dithering prioritaire) et `Vehicle.blend` (somme pondérée).

Utilisés dans `fauna.js` : followPath, flowField, flock, unalignedAvoid, avoidObstacles, contain, offsetPursuit, leaderFollow, hide, wander. `interpose` est disponible mais non câblé. Le banc et le requin de `game.js` utilisent leur propre implémentation de seek/arrive, flee/evade, pursuit, wander, séparation/alignement/cohésion et évitement.

## 6. Le monde (infini)

- **Terrain** : fonction continue `floorY(x, z)` (ondulations + grandes collines, hauteur ≈ −5 à 22). Maillage 256×256 (128 segments) qui suit la caméra par pas de 8 unités ; les hauteurs sont calculées en coordonnées monde : le relief ne change jamais d'un passage à l'autre.
- **Rochers** : chunks de 40 unités déterministes (hachage), 9×9 chunks actifs, 0 à 2 rochers (rayon 3–6,5) par chunk, créés/détruits en continu, obstacles sphériques pour le pilotage.
- **Décor** : varech (160 instances, pavage 220), herbiers (420, pavage 200), coraux colorés (140, pavage 220), rides de sable.
- **Plafond** : poissons limités à y ≤ 38 ; surface à y = 48 ; caméra bornée à y ≤ 46.
- Aucune frontière : le banc, le requin et la faune restent autour du joueur.

## 7. Niveaux et défis

Chaque plongée est un enregistrement de `LV` (`js/game.js`). Champs : `goal` objectif · `dist`/`ang` position de la Source · `sp` vitesse requin · `aggr` rayon d'agressivité · `fog`/`fd` couleur et densité du brouillard · défi : `t` temps (s, 0 = aucun) · `bc` balises · `ml` pertes max (0 = aucune limite) · `pu` pulses max (99 = illimité) · `cur` force du courant · `b` texte d'intro.

| # | Nom | Objectif | Distance | Requin | Défi |
|---|---|---|---|---|---|
| 1 | Eaux claires | 8 | 130 | ×0,9 | 4 minutes |
| 2 | Forêt de varech | 9 | 200 | ×1,0 | 3 balises, courant 0,15 |
| 3 | Bleu profond | 10 | 280 | ×1,1 | 5 pertes max, courant 0,25 |
| 4 | Canyon rocheux | 11 | 340 | ×1,15 | 2 balises, 3 pulses, courant 0,3 |
| 5 | Abysse | 12 | 420 | ×1,25 | 5 min, 8 pertes max, courant 0,35 |
| 6 | Sources chaudes | 13 | 500 | ×1,3 | 3 balises, 6 pertes, 4 pulses, 6 min, courant 0,4 |

- **Balises** : anneaux dorés avec faisceau visible de loin ; activées quand le centre du banc passe à moins de 10 unités. La Source reste fermée (faisceau atténué) tant qu'elles ne sont pas toutes actives.
- **Courant** : champ de flux lent qui dévie les poissons (force `cur × 0,025`).
- **Boussole** : flèche + distance vers la prochaine balise, puis vers la Source.
- **HUD** : plongée, nom, Lumens sauvés, banc, pertes, barre de progression, état des défis, alerte « REQUIN EN CHASSE ».

## 8. Rendu

- **Poissons** : corps lofté procédural (dos sombre, ventre clair, yeux, branchies, nageoires dorsale et pectorales, queue), nage par vertex shader (ondulation le long du corps), instanciés ; halo bioluminescent par sprites additifs.
- **Soleil** : une direction unique `SUN` alimente la lumière directionnelle, les faisceaux et les ombres. Faisceaux (18 cylindres additifs alignés sur le soleil) : stries, scintillement, diffusion vers l'avant (plus brillants quand on regarde le soleil), bords adoucis, intensité décroissante avec la profondeur. Ombres douces (2048², PCF) projetées par les rochers et le requin sur le fond.
- **Eau** : brouillard exponentiel par niveau, assombrissement et teinte avec la profondeur, dôme de ciel sous-marin, surface vue d'en bas avec **fenêtre de Snell** (cercle lumineux, reflet sombre autour), caustiques animées sur le fond, plancton en suspension, poussière marine.
- **Post-traitement** (touche G) : bloom HDR, ondulation de l'image, aberration chromatique, absorption du rouge avec la profondeur, tonalité filmique, vignette, grain. Si l'initialisation échoue, rendu direct automatique.
- **Caméra** : orbite libre autour du banc, balancement léger permanent, secousse à chaque perte, champ de vision 60° → 68° pendant une charge du requin.

## 9. Audio

- **Ambiance réelle** : `audio/deep-sea-ambience.mp3` en boucle continue (deux `<audio>` en fondu enchaîné de 6 s). Volume `(0,5 + 0,07 × niveau) × (1 − 0,35 × tension)` ; réduit en pause et à l'écran de fin. Compatible `file://`.
- **Synthèse Web Audio** (repli si le fichier manque, plus effets) : ambiance de fond, bulles aléatoires, bourdon de tension, battement de cœur accéléré par la tension, effets (adoption, dépôt en arpège, perte, pulse, victoire, défaite), chant de baleine.
- **Requin spatialisé** : `PannerNode` HRTF (distance de référence 14, atténuation 1,5) placé à sa position réelle, auditeur = caméra : on entend d'où il arrive.
- Anti-rafale par délai minimal entre sons du même type ; la touche M coupe tout.

## 10. Exigences et performances

- Navigateur moderne avec WebGL 2 (Chrome, Edge, Firefox, Safari récents). Aucune dépendance réseau.
- Objectif : 60 images/s sur un portable courant. Si la machine peine : touche G (désactive le post-traitement). Coûts principaux : bloom, ombres 2048², maillage du fond recalculé tous les 8 unités parcourues.
- Pas de `fetch`/XHR : tout fonctionne en ouverture directe de fichier.

## 11. Limites connues

- Poissons, requin et raies sont des formes générées par code, pas des modèles `.glb`.
- Un seul requin, de vitesse et d'agressivité croissantes selon le niveau.
- Le banc et le requin n'utilisent pas encore `vehicle.js` (seule la faune l'utilise).
- Les collisions avec le relief sont gérées par une poussée verticale douce, pas par une physique de contact.
- Le rendu n'a pas été mesuré sur toutes les machines ; les réglages de lumière et de bloom sont à ajuster selon l'écran.

## 12. Pistes d'évolution

Second requin dès la plongée 4 · modèles `.glb` réalistes (voir le prompt dédié) · passer le banc et le requin sur `vehicle.js` · cycle jour/nuit et tempêtes de surface · carte des plongées · sons réels pour les effets (bulles, requin) · options audio (curseurs) et qualité Basse/Haute · classement et meilleurs temps.

## 13. Crédits

Three.js (licence MIT) · algorithmes de pilotage : Craig W. Reynolds, *Steering Behaviors For Autonomous Characters* (GDC 1999) · ambiance sonore : fichier fourni par l'auteur du projet (« Dragon Studio — Deep Sea Underwater Ambience ») : **vérifier la licence de la source d'origine avant toute publication**.
