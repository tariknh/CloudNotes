# IKT205 – Assignment 2: Blodroed Consulting Notes App

React Native app built with Expo and Supabase, allowing employees at Blodroed Consulting to create, view, edit and delete shared notes.

---

## Krav

### Autentisering

| Status | Krav | Poeng |
|--------|------|-------|
| ✅ | **Sign-up** – Bruker kan opprette konto med e-post/passord | 10% |
| ✅ | **Email template** – Template i Supabase er endret for sign-up | 10% |
| ✅ | **Login/Logout** – Brukeren må logge inn før tilgang til appen | 10% |
| ✅ | **Credentials** – Innlogget bruker forblir innlogget; credentials kryptert med `expo-secure-store` | 5% |

### Database

| Status | Krav | Poeng |
|--------|------|-------|
| ✅ | **Auth-kobling** – RLS aktivert i Supabase; kun innloggede brukere kan gjøre operasjoner | 5% |
| ✅ | **Create** – Nytt notat lagres med tittel, tekst, bruker-ID og sist endret tidspunkt | 10% |
| ✅ | **Read** – Notater fra alle brukere vises på skjermen "Jobb Notater" | 10% |
| ✅ | **Update** – Brukere kan oppdatere et notat med debounced auto-save | 10% |
| ✅ | **Delete** – Brukere kan slette et notat med bekreftelsesdialog | 10% |

### Validering

| Status | Krav | Poeng |
|--------|------|-------|
| ✅ | **Ingen tomme felter i notater** – Tittel og beskrivelse valideres før lagring | 5% |
| ✅ | **Ingen tomme felter i brukernavn og passord** – Knapper deaktivert ved tomme felt | 5% |
| ✅ | **Success** – Brukere får bekreftelse etter lagring og sletting | 5% |

### Visualisering

| Status | Krav | Poeng |
|--------|------|-------|
| ❌ | **ER-Diagram** – Databasestruktur ikke visualisert | 5% |
| ❌ | **Sekvensdiagram** – Interaksjon mellom app og database ikke visualisert | 5% |

---

## Totalpoeng

**90 / 100%**

---

## Tech Stack

- [Expo](https://expo.dev) + [Expo Router](https://expo.github.io/router/)
- [Supabase](https://supabase.com) – Auth + PostgreSQL database
- [Zustand](https://zustand-demo.pmnd.rs/) – State management
- [expo-secure-store](https://docs.expo.dev/versions/latest/sdk/securestore/) – Encrypted credential storage

---

## Kom i gang

1. Legg til miljøvariabler i en `.env` fil:

```
EXPO_PUBLIC_SUPABASE_URL=din_supabase_url
EXPO_PUBLIC_SUPABASE_KEY=din_supabase_anon_key
```

2. Installer avhengigheter:

```bash
bun install
```

3. Start appen:

```bash
bun run ios
```
