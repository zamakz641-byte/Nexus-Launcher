# Performances et jeu

Nexus privilégie une consommation quasi nulle pendant la partie plutôt qu'une interface animée cachée qui continue héroïquement de dessiner des gradients pour personne.

## Pendant un jeu

- fenêtre pywebview masquée ;
- contexte audio Web suspendu ;
- Python en priorité `BELOW_NORMAL_PRIORITY_CLASS` ;
- processus WebView2 enfants en `IDLE_PRIORITY_CLASS` ;
- moniteur du jeu à intervalle de 2 secondes ;
- aucun scan de bibliothèque ;
- aucun rafraîchissement API ou téléchargement média automatique.

Les priorités sont restaurées lorsque le processus du jeu se ferme.

## UI

La séquence de lancement et les transitions utilisent principalement `transform`, `opacity` et de courtes opérations de filtre. Il n'existe pas de boucle JavaScript de particules permanente. Le SFX est généré à la demande avec Web Audio puis suspendu quand Nexus est caché.

## Cache média

Covers, Hero, logos, icônes, screenshots et trailers sont téléchargés une fois et lus depuis le cache local. Cela évite de solliciter le réseau à chaque navigation.
