# LUMEN — Le Banc de Lumière (3D)

Ouvrir le dossier dans VS Code, puis double-clic sur `index.html` (ou clic droit → *Open with Live Server*). Fonctionne hors ligne.

```
index.html        page + HUD
css/style.css
lib/three.min.js  Three.js r128 (local)
js/vehicle.js     TOUS les comportements de Reynolds (GDC 1999)
js/game.js        monde, banc de poissons, requin, audio
js/fauna.js       vie ambiante pilotée par vehicle.js
audio/deep-sea-ambience.mp3  ambiance sous-marine réelle (Dragon Studio — vérifier la licence de la source d'origine)
```

## Comportements (js/vehicle.js)
seek, flee, arrive, pursue, evade, offsetPursuit, wander, avoidObstacles, followPath, contain,
flowField, unalignedAvoid, separation, alignment, cohesion, flock, leaderFollow, interpose, hide,
+ combinaison : `Vehicle.prioritized` (prioritized dithering) et `Vehicle.blend` (somme pondérée).

Utilisés dans `fauna.js` : followPath, flowField, flock, unalignedAvoid, avoidObstacles, contain, offsetPursuit,
leaderFollow, hide, wander. Le cœur du jeu (`game.js`) utilise seek/arrive, flee/evade, pursuit, wander,
separation/alignment/cohesion et l'évitement de rochers avec ses réglages d'origine. `interpose` est disponible, non câblé.

## Contrôles
Flèches/WASD guider · E/Q monter/descendre · Espace Pulse · glisser = caméra · molette = zoom · clic = poser le guide · M = son.

## Niveaux et monde infini
- 6 plongées (`LV` dans `js/game.js`) : Source de plus en plus loin, requin plus rapide/agressif, brouillard et couleur de l'eau propres à chaque niveau. Progression sauvegardée (localStorage).
- Plus aucune limite : fond marin, rochers (chunks déterministes) et varech sont générés autour du joueur ; la boussole indique la Source, dont le faisceau lumineux se voit de loin.
- La vie ambiante et le requin se recentrent autour du banc en permanence.

## Audio
`audio/deep-sea-ambience.mp3` joue en boucle continue (deux lecteurs en fondu enchaîné de 6 s, sans coupure). Son volume monte avec la profondeur du niveau et baisse quand le requin chasse. Si le fichier est absent, le jeu retombe sur l'ambiance synthétisée. Par-dessus : bulles, battement de cœur, grondement 3D du requin et effets synthétisés.

## Défis par plongée
Chaque plongée a son défi (champs `t`, `bc`, `ml`, `pu`, `cur`, `b` de `LV`) : temps limité, balises à activer avant l'ouverture de la Source, pertes maximales, Pulses limités, courant marin qui dévie le banc. L'état des défis s'affiche à gauche ; la boussole mène d'abord aux balises, puis à la Source.

## La mer
Dôme de profondeur (la couleur et la lumière s'assombrissent quand on descend), surface ondulante, rides de sable, herbiers et coraux répartis à l'infini, varech, rochers par chunks.

## Rendu réaliste de l'eau
Post-traitement (touche G pour l'activer/désactiver si votre machine est lente) : bloom HDR, réfraction/ondulation de l'image, aberration chromatique, absorption du rouge avec la profondeur, vignette et grain. Surface vue d'en bas avec fenêtre de Snell (cercle lumineux au-dessus de vous, reflet sombre autour), faisceaux de lumière plus nombreux, plancton en suspension, brouillard qui respire, grain de sable sur le fond.

## Pause et soleil
Échap / P met en pause (Reprendre, Recommencer, Menu). Le soleil a une direction unique qui pilote la lumière, les faisceaux et les ombres douces (rochers, requin). Spécifications complètes : `specifiques.md`.
