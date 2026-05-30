Actuellement, l'application est une SPA personnelle utilisée uniquement par ma fille et moi. Les clés API (OpenRouter et reconnaissance d'image) sont appelées directement depuis le front-end, et la base de données Supabase n'est pas cloisonnée. 



Je souhaite transformer cette application en un modèle SaaS "Multi-Tenant" (Multi-Foyers) pour permettre à plusieurs familles amies d'utiliser l'application de manière totalement étanche, sécurisée et économiquement viable.



Voici la stack technique actuelle de l'application :

\- Front-end : Vue 3 (Composition API avec <script setup> uniquement, pas d'Options API) + Vite.

\- Navigation : Vue Router (SPA).

\- Back-end / Serverless : Netlify Functions (JavaScript natif) et Supabase (PostgreSQL / Auth).

\- PWA : Service Worker natif.



\### Mon Objectif :

Je veux que tu m'accompagnes pas à pas pour restructurer l'application. Avant de générer du code, voici les contraintes et l'architecture que nous devons mettre en place :



1\. SÉCURISATION DES CLÉS API :

Toutes les clés API payantes (OpenRouter et l'API de reconnaissance d'image) doivent impérativement être retirées du code front-end (/src) et migrées vers des Netlify Functions. Le front-end appellera ces fonctions en leur passant uniquement les données brutes (ex: image en base64 ou liste d'ingrédients), et la fonction serverless utilisera les variables d'environnement de Netlify pour interroger les API externes de manière cachée.



2\. CLOISONNEMENT DES DONNÉES (Multi-Tenant sur Supabase) :

\- Nous allons conserver un seul projet Supabase pour toutes les familles.

\- Tu devras concevoir une table `foyers` (id, nom, code\_invitation, date\_creation).

\- La table `profiles` (liée à Supabase Auth) ainsi que toutes les tables de données (`objets`, `courses`, `taches`, etc.) devront posséder une colonne `foyer\_id`.

\- Tu devras rédiger les politiques de sécurité RLS (Row Level Security) PostgreSQL pour Supabase afin qu'un utilisateur connecté ne puisse lire, insérer, modifier ou supprimer des lignes QUE si le `foyer\_id` de la ligne correspond au `foyer\_id` de son profil.



3\. LOGIQUE D'INSCRIPTION \& INVITATION (Vue 3) :

Au premier lancement ou après l'inscription d'un nouvel utilisateur, l'interface doit proposer deux choix clairs :

\- "Créer un nouveau foyer" : Génère une ligne dans `foyers`, crée un code d'invitation unique, et associe le profil de l'utilisateur à ce `foyer\_id`.

\- "Rejoindre un foyer existant" : Permet de saisir le code d'invitation d'un proche pour lier son profil au même `foyer\_id`.



4\. CONTRÔLE DES COÛTS ET LIMITATIONS (Anti-Abus) :

Pour éviter qu'une famille n'abuse des appels IA (scans de photos et générations de recettes), nous devons intégrer un système de compteurs de requêtes mensuelles ou de quotas dans notre logique.



\---



\### Comment nous allons procéder :

Pour éviter les erreurs et les copier-coller partiels, nous allons avancer ÉTAPE PAR ÉTAPE. Ne me donne pas tout le code d'un coup.



Pour commencer, valide que tu as bien compris l'architecture cible et propose-moi le plan de l'ÉTAPPE 1 : La restructuration et la sécurisation de la base de données Supabase (Schéma des tables et scripts SQL pour les politiques RLS). Attends ma validation avant de générer le code.

