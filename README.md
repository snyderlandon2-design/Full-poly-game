# PolyClash Arena 3D

This is a deployable starter build of the game described in chat.

## What is included
- Account creation/login through Supabase Auth
- Persistent profile data
- Persistent 20-character locker
- Points, levels, XP, wins/losses
- Gacha summons and duplicate refund
- Fighter upgrades
- Five bot difficulties
- Third-person 3D arena
- PC controls and touch controls
- Public/private room records
- Basic realtime-ready backend structure
- Owner/admin roles and a limited admin panel
- Black/gold/red design

## Important security rule
Admin passwords/codes are NOT stored in the HTML or JavaScript. Do not put service-role keys in this repository.

The browser uses only the Supabase anon/publishable key. Database policies control what the signed-in user can access.

## Setup
1. Create a Supabase project.
2. In Supabase SQL Editor, run `database/supabase.sql`.
3. Create your account in the game.
4. In Supabase Authentication > Users, copy your user UUID.
5. Run the owner INSERT statement from the SQL file with your UUID.
6. Create Niles and Hudson accounts and give them role='admin' using their UUIDs.
7. Put your Supabase URL and anon/publishable key in `js/config.js`.
8. Push the folder to GitHub.
9. GitHub: Settings > Pages > Deploy from branch > main > /(root) > Save.
10. Open the generated Pages URL.

## Current multiplayer note
The project has public/private room records and is structured for Supabase Realtime, but the included combat loop is still client-side. For a serious competitive public release, combat, rewards, matchmaking, and movement validation should be moved behind server-authoritative Edge Functions/WebSocket infrastructure. Do not advertise this build as cheat-proof competitive multiplayer.

## Updating the game
Edit the repository files, commit, and push. GitHub Pages will redeploy. Do not use browser code injection as an update mechanism.

## Admin
Your owner/admin status comes from `admin_roles`, not from a secret string in client JavaScript. This prevents players from retrieving the admin credential by viewing source.
