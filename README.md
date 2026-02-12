# Training Partner

A cross-platform fitness tracking app built with Expo (React Native) and Supabase. Track your workouts, monitor progress, and get customized training plans.

## Features

- 📱 Cross-platform (iOS, Android, Web)
- 🔐 User authentication
- 💪 Workout logging
- 📊 Progress tracking
- 🎯 Customized training plans
- 🆓 Completely free (using free tiers)

## Tech Stack

- **Frontend**: Expo (React Native), TypeScript
- **Backend**: Supabase (PostgreSQL, Auth, Real-time)
- **Navigation**: React Navigation
- **Deployment**:
  - Web: Vercel/Netlify (free)
  - iOS: Expo Go (development) / TestFlight (testing)

## Setup Instructions

### 1. Clone and Install Dependencies

```bash
npm install
```

### 2. Set Up Supabase

1. Go to [supabase.com](https://supabase.com) and create a free account
2. Create a new project
3. Go to Project Settings > API
4. Copy your project URL and anon key
5. Create a `.env` file (copy from `.env.example`):

```bash
cp .env.example .env
```

6. Add your Supabase credentials to `.env`:

```env
EXPO_PUBLIC_SUPABASE_URL=your-project-url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 3. Set Up Database Schema

1. Go to your Supabase project dashboard
2. Click on "SQL Editor" in the sidebar
3. Create a new query
4. Copy and paste the contents of `supabase-schema.sql`
5. Run the query

This will create:
- User profiles table
- Exercises table (with sample exercises)
- Workouts table
- Workout sets table
- Training plans table
- Row Level Security policies
- Automatic profile creation trigger

### 4. Run the App

```bash
# Start Expo dev server
npm start

# Run on iOS simulator
npm run ios

# Run on Android emulator
npm run android

# Run on web browser
npm run web
```

## Project Structure

```
training_partner/
├── src/
│   ├── components/       # Reusable components
│   ├── screens/          # Screen components
│   │   ├── LoginScreen.tsx
│   │   ├── SignupScreen.tsx
│   │   └── HomeScreen.tsx
│   ├── navigation/       # Navigation setup
│   │   └── AppNavigator.tsx
│   ├── services/         # API services
│   │   └── supabase.ts
│   ├── types/            # TypeScript types
│   │   └── training.ts
│   ├── hooks/            # Custom hooks
│   ├── utils/            # Helper functions
│   └── constants/        # App constants
│       └── colors.ts
├── assets/               # Images, fonts, etc.
├── App.tsx               # Entry point
└── package.json
```

## Development with Claude Code

This project was built using Claude Code. Here are some tips for efficient development:

### Key Workflows

1. **Todo Lists**: Track progress with `/todo` command
2. **Plan Mode**: Use `/plan` for architectural decisions
3. **File Navigation**: Click on file references like [App.tsx:10](App.tsx#L10)
4. **Parallel Execution**: Multiple tasks run simultaneously for speed

### Common Commands

```bash
# Run the app
npm start

# Clear cache
npm start -- --clear

# Update dependencies
npm update
```

## Next Steps

1. ✅ Basic authentication
2. ✅ Project structure
3. ✅ Database schema
4. 🔄 Add workout logging screen
5. 🔄 Add progress tracking
6. 🔄 Add training plan generator
7. 🔄 Add charts and statistics
8. 🔄 Add workout history
9. 🔄 Deploy to web

## Contributing

This is a personal learning project, but feel free to fork and customize!

## License

MIT
