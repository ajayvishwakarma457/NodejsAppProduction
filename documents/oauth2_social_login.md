# OAuth2 / Social Login (Passport.js Google Strategy)

This document describes the implementation of OAuth2 Social Authentication using **Passport.js** and the Google OAuth Strategy, integrated with our JWT Access & Refresh Token architecture.

---

## 1. Authentication Flow Diagram

```
[ Client App ] ──► GET /api/v1/auth/google ──► [ Redirects to Google Consent Screen ]
      ▲                                                              │
      │                                                              │ (User consents)
      │                                                              ▼
[ Landing Page ] ◄── Redirects back to Client ◄── [ GET /api/v1/auth/google/callback ]
 (with tokens)       (with JWT tokens in URI)     - Passport exchanges code for profile.
                                                  - Locates/Creates User in DB.
                                                  - Generates standard Access/Refresh JWTs.
```

---

## 2. Dependencies

To integrate OAuth2, we installed the core passport modules:

```bash
npm install passport passport-google-oauth20
```

---

## 3. Schema & Model Updates

The `password` property in [src/models/userModel.js](file:///Users/spakcomm-ajay/Documents/Roadmap/NodejsAppProduction/src/models/userModel.js) was modified to be optional when registering via social signup:

```javascript
password: {
  type: String,
  required: [
    function () {
      return !this.googleId;
    },
    'Please provide a password',
  ],
  minlength: [6, 'Password must be at least 6 characters long'],
  select: false,
},
googleId: {
  type: String,
  unique: true,
  sparse: true, // Allows multiple null/undefined values without collision
}
```

---

## 4. Passport Strategy Configuration

The Google strategy is configured under [src/config/passport.js](file:///Users/spakcomm-ajay/Documents/Roadmap/NodejsAppProduction/src/config/passport.js):

```javascript
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/userModel');

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        // Find existing user by googleId
        let user = await User.findOne({ googleId: profile.id });
        if (user) return done(null, user);

        // Find existing user by email
        const email = profile.emails && profile.emails[0] ? profile.emails[0].value : null;
        if (email) {
          user = await User.findOne({ email });
          if (user) {
            // Link accounts
            user.googleId = profile.id;
            await user.save();
            return done(null, user);
          }
        }

        // Create new user for social signup
        user = await User.create({
          googleId: profile.id,
          name: profile.displayName || 'Google User',
          email: email || `${profile.id}@google.com`,
        });

        done(null, user);
      } catch (err) {
        done(err, null);
      }
    }
  )
);
```

---

## 5. Express Registration

Initialized in [src/app.js](file:///Users/spakcomm-ajay/Documents/Roadmap/NodejsAppProduction/src/app.js):

```javascript
const passport = require('passport');
require('./config/passport');

app.use(passport.initialize());
```

Exposed under `/auth` routing paths in [src/routes/v1/authRoutes.js](file:///Users/spakcomm-ajay/Documents/Roadmap/NodejsAppProduction/src/routes/v1/authRoutes.js):

```javascript
// Triggers the OAuth flow
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'], session: false }));

// Redirect receiver
router.get(
  '/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: '/login' }),
  AuthController.googleSuccess
);
```

---

## 6. Environment Configurations
Configure Google credentials in the [.env](file:///Users/spakcomm-ajay/Documents/Roadmap/NodejsAppProduction/.env) file:

```env
GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=http://localhost:5000/api/v1/auth/google/callback
CLIENT_REDIRECT_URL=http://localhost:3000/auth-success
```
