# Patientmodellen för OSCE-simulatorn

`public/osce/models/patient.glb` bygger på
["Male base"](https://poly.pizza/m/eWGDnQ0jzmH) av Артур Мигранов, licens
[CC BY 3.0](https://creativecommons.org/licenses/by/3.0/). Erkännandet visas i 3D-vyn och får inte tas bort.

Ändringar mot originalet: armarna är vinklade in mot kroppen och underarmarna sänkta
(`prepare-patient.mjs`). Hud, hår och shorts målas i skuggningen i
`components/osce/three/skin-material.ts`. Kalibreringen mot 2D-anatomin finns i
`components/osce/three/patient-glb.tsx`.
