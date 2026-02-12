# Quick Setup Guide

Follow these steps to get your Training Partner app running:

## Step 1: Create Supabase Account (2 minutes)

1. Go to [supabase.com](https://supabase.com)
2. Click "Start your project"
3. Sign up with GitHub (easiest) or email
4. Create a new project:
   - **Name**: training-partner
   - **Database Password**: (create a strong password - save it!)
   - **Region**: Choose closest to you
   - Click "Create new project"
5. Wait 1-2 minutes for project to initialize

## Step 2: Get API Credentials (1 minute)

1. In your Supabase project, click **Settings** (gear icon) in sidebar
2. Click **API** in the left menu
3. You'll see:
   - **Project URL** (looks like: https://xxxxx.supabase.co)
   - **anon public** key (long string starting with "eyJ...")
4. Keep this tab open, you'll need these values next

## Step 3: Configure Environment Variables (1 minute)

1. Create `.env` file:
   ```bash
   cp .env.example .env
   ```

2. Open `.env` and paste your credentials:
   ```env
   EXPO_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...your-long-key-here
   ```

3. Save the file

## Step 4: Set Up Database (2 minutes)

1. In Supabase, click **SQL Editor** in sidebar
2. Click **New query**
3. Open `supabase-schema.sql` from your project
4. Copy ALL the contents
5. Paste into the SQL Editor
6. Click **Run** (or press Cmd/Ctrl + Enter)
7. You should see "Success. No rows returned"

This creates:
- User profiles table
- Exercises table (with 10 sample exercises)
- Workouts and workout sets tables
- Training plans table
- Security policies
- Auto-profile-creation trigger

## Step 5: Run the App! (1 minute)

```bash
# Install dependencies (if not done)
npm install

# Start the app
npm start
```

You'll see a QR code and options:

### Option A: Web (Easiest)
- Press `w` to open in web browser
- App opens at http://localhost:8081

### Option B: iOS Simulator (Mac only)
- Press `i` to open in iOS simulator
- Requires Xcode installed

### Option C: Android Emulator
- Press `a` to open in Android emulator
- Requires Android Studio installed

### Option D: Physical Device
- Install **Expo Go** app on your phone
- Scan the QR code

## Step 6: Test It Out

1. App should open to Login screen
2. Click "Don't have an account? Sign up"
3. Enter:
   - Full Name: Your name
   - Email: your-email@example.com
   - Password: (min 6 characters)
4. Click "Sign Up"
5. **Check your email** for verification link
6. Click the verification link
7. Return to app and login
8. You should see the Home screen!

## Troubleshooting

### "Network request failed"
- ✅ Check `.env` file has correct Supabase URL and key
- ✅ Make sure you ran the SQL schema
- ✅ Restart the app: Press Ctrl+C, then `npm start` again

### "Invalid login credentials"
- ✅ Check email for verification link and click it
- ✅ Make sure you typed email/password correctly
- ✅ Try signing up again with a different email

### "expo command not found"
- ✅ Run `npm install` first
- ✅ Use `npx expo start` instead of `npm start`

### Metro bundler errors
```bash
# Clear cache and restart
npm start -- --clear
```

### Can't see changes after editing code
- Press `r` in the terminal to reload
- Or shake your device and tap "Reload"

## What's Next?

Now that your app is running, you can:

1. **Explore the code**
   - Read [CLAUDE_CODE_GUIDE.md](CLAUDE_CODE_GUIDE.md) to learn Claude Code workflows
   - Browse [src/screens/](src/screens/) to see the UI code
   - Check [src/types/training.ts](src/types/training.ts) for data models

2. **Add new features**
   - Ask Claude: "Add a workout logging screen"
   - Ask Claude: "Show me how to query workouts from Supabase"
   - Ask Claude: "Create a progress chart showing workout volume"

3. **Customize the design**
   - Change colors in [src/constants/colors.ts](src/constants/colors.ts)
   - Modify screens in [src/screens/](src/screens/)

4. **Learn as you go**
   - Ask Claude to explain any code you don't understand
   - Request different approaches to problems
   - Have Claude review your code

## Quick Reference

```bash
# Start app
npm start

# Clear cache
npm start -- --clear

# Run on specific platform
npm run web
npm run ios
npm run android

# Install new package
npm install package-name

# Check what's running
expo --version
```

## Free Hosting (When Ready)

### Web App
1. Push code to GitHub
2. Deploy to Vercel:
   - Go to [vercel.com](https://vercel.com)
   - Import GitHub repo
   - Add environment variables
   - Deploy!

### iOS App (Testing)
1. Create Apple Developer account (free for testing)
2. Use TestFlight for beta testing
3. (App Store requires $99/year)

## Need Help?

- Ask Claude Code: "I'm getting this error: [paste error]"
- Read [CLAUDE_CODE_GUIDE.md](CLAUDE_CODE_GUIDE.md)
- Check [README.md](README.md) for more details

Happy coding! 🎉
