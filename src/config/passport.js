const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/userModel');

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID || 'mock-client-id.apps.googleusercontent.com',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || 'mock-client-secret',
      callbackURL: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:5000/api/v1/auth/google/callback',
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        // Find or create user
        let user = await User.findOne({ googleId: profile.id });
        if (user) {
          return done(null, user);
        }

        const email = profile.emails && profile.emails[0] ? profile.emails[0].value : null;
        if (email) {
          user = await User.findOne({ email });
          if (user) {
            // Link Google account to existing local account
            user.googleId = profile.id;
            await user.save();
            return done(null, user);
          }
        }

        // Create new user for social signup
        user = await User.create({
          googleId: profile.id,
          name: profile.displayName || 'Google User',
          email: email || `${profile.id}@google.com`, // fallback email
        });

        done(null, user);
      } catch (err) {
        done(err, null);
      }
    }
  )
);

module.exports = passport;
