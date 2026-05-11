# fitbyivana — Production deploy checklist

## 1. Supabase setup (5 min)

### Migracije
```bash
supabase link --project-ref YOUR_PROJECT_REF
supabase db push
```

### Edge Functions
```bash
supabase functions deploy mesocycle-tick
supabase functions deploy smart-cut-tick
supabase functions deploy process-daily-check-in
supabase functions deploy process-weekly-check-in
supabase functions deploy process-meal-log
supabase functions deploy process-workout-completion
supabase functions deploy save-user-status
supabase functions deploy start-pause
supabase functions deploy end-pause
supabase functions deploy swap-next-sessions
supabase functions deploy update-client-overrides
supabase functions deploy auto-confirm-signup
supabase functions deploy send-push
supabase functions deploy daily-push-reminders
```

### Secrets (Dashboard → Settings → Edge Functions → Secrets)

| Key | Vrednost |
|---|---|
| `CRON_SECRET` | `openssl rand -hex 32` (random) |
| `VAPID_PUBLIC_KEY` | iz `npx web-push generate-vapid-keys` |
| `VAPID_PRIVATE_KEY` | iz iste komande, **drži tajno** |
| `VAPID_SUBJECT` | `mailto:admin@fitbyivana.com` |

`SUPABASE_URL` i `SUPABASE_SERVICE_ROLE_KEY` su auto-set.

---

## 2. Cron triggers (Supabase Dashboard → Database → Cron Jobs)

| Job | Schedule | Endpoint | Body |
|---|---|---|---|
| `mesocycle-tick` | `0 2 * * *` (svaki dan 02:00) | `/functions/v1/mesocycle-tick` | `{}` |
| `smart-cut-tick` | `0 3 * * 1` (ponedeljak 03:00) | `/functions/v1/smart-cut-tick` | `{}` |
| `daily-push-reminders` | `0 8 * * *` (svaki dan 08:00) | `/functions/v1/daily-push-reminders` | `{}` |

Header za sve cron pozive: `x-cron-secret: <CRON_SECRET vrednost>`.

---

## 3. Frontend env (.env.local)

Kopiraj `.env.example` → `.env.local` i popuni:

```env
VITE_SUPABASE_URL="https://YOUR_REF.supabase.co"
VITE_SUPABASE_PUBLISHABLE_KEY="sb_publishable_..."
VITE_SUPABASE_PROJECT_ID="YOUR_REF"
VITE_DEV_MOCK_AUTH="false"   # OBAVEZNO false u prod
VITE_VAPID_PUBLIC_KEY="BPxxxx..."  # isti kao VAPID_PUBLIC_KEY u secrets
```

---

## 4. Build + deploy

```bash
npm run build
# Deploy /dist na Vercel/Netlify/Cloudflare Pages
```

iOS (Capacitor):
```bash
npm run build
npx cap sync ios
npx cap open ios   # Xcode
```

---

## 5. Trener seed (opciono — Ivana radi kroz dashboard)

- **Custom recepti**: TrainerNutrition.tsx omogućuje dodavanje food_items kroz UI
- **Video upload**: TrainerNutrition.tsx ima sekciju za upload videa po jelu (sprema se u Supabase Storage bucket `recipe-videos`)
- **Custom session templates**: TrainerTraining.tsx za workout template editing

Algoritam radi sa OUT-OF-BOX seed-om (65 jela + 32 vežbe + svi position skeletons).

---

## 6. Smoke test

1. Otvori produkciju → onboarding → završi flow
2. Pre-workout dialog se pojavi pri ulasku u trening
3. Workout flow → setovi → finish → PostWorkout 3-button
4. Weekly check-in → sleep + stress sliders submit
5. Push permission prompt se pojavi posle 5s na Home
6. Allow → "Test notification" stiže (manuel test kroz `daily-push-reminders` curl)

```bash
curl -X POST "https://YOUR_REF.supabase.co/functions/v1/daily-push-reminders" \
  -H "x-cron-secret: $CRON_SECRET" \
  -H "Content-Type: application/json" \
  -d '{}'
```

---

## 7. Šta NIJE u scope-u (manual setup)

- **Stripe** payments (kasnije)
- **Pravi VAPID keys** (run command iznad)
- **Domain** (custom domain → Vercel/CF dashboard)
- **App Store / Play Store** publishing (Capacitor build)
