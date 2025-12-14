# Account Book (HTML/CSS/JS + Firebase)

## Features
- Add categories and set a budget per category
- Budget period can be **Monthly**, **Yearly**, or **Lifetime**
- Record expense or revenue by category (amount + note + date)
- Category budget balance auto-updates within the budget period: `balance = budget + revenue - expense`
- Statistics by **weekly / monthly / yearly** range
- Search transactions by note text (e.g., "eat")
- Sync data to Firebase (Email/Password or Google sign-in + Firestore)

## Firebase setup
1. Create a project at https://console.firebase.google.com/
2. Build → Authentication → Get started → enable **Email/Password**
3. (Optional) Also enable **Google** provider
4. Build → Firestore Database → Create database
5. Project settings → Your apps → Web app → copy the config
6. Copy `firebase-config.example.js` to `firebase-config.js` and fill values.

### Deploy note (important)
This app loads Firebase settings from `./firebase-config.js` at runtime.

If it works locally but shows "Missing Firebase config" after deploy, it usually means `firebase-config.js` was not uploaded/published with your site (common when it was ignored by git or excluded from the hosting "public" folder).

- GitHub Pages / Netlify / Vercel (deploy-from-git): make sure `firebase-config.js` is committed and pushed.
- Firebase Hosting: make sure `firebase-config.js` is inside the folder you deploy (usually `public/`).

Note: Firebase Web config values (like `apiKey`, `authDomain`, etc.) are not secrets; security comes from Auth + Firestore Rules.

## Run locally
Because this uses ES modules, you should run with a local server (not double-click the HTML file).

### Option A: VS Code Live Server
Install the "Live Server" extension, then open `index.html` and click "Go Live".

### Option B: Python simple server
From this folder run:
- `python -m http.server 5500`
Then open: http://localhost:5500

## Statistics inputs
- Weekly: pick a date (the app calculates that week)
- Monthly: pick a month
- Yearly: pick a year from years that have records

## Firestore data layout
- `users/{uid}/categories/{categoryId}`
- `users/{uid}/transactions/{txId}`

## Minimal security rules (starter)
In Firebase Console → Firestore → Rules, you can start with:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

(Adjust for your needs.)
