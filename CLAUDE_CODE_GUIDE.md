# Claude Code Development Guide

This guide will help you use Claude Code efficiently while building this app.

## What is Claude Code?

Claude Code is an AI-powered development assistant that helps you write code, debug issues, and learn new technologies. It runs directly in your terminal or IDE.

## Key Features You Just Experienced

### 1. **Todo Lists** 📝

When working on complex tasks, Claude creates todo lists to track progress:

```
✅ Initialize Expo project
✅ Set up project structure
✅ Configure Supabase
⏳ Add workout logging
```

**When Claude uses todos:**
- Multi-step features (3+ steps)
- Complex implementations
- When you provide a list of tasks

**Tip**: You can ask "What's left to do?" to see remaining tasks.

### 2. **Parallel Tool Execution** ⚡

Claude can run multiple operations simultaneously:

```
# Instead of running sequentially:
Read file1 → wait → Read file2 → wait → Read file3

# Claude runs in parallel:
Read file1, file2, file3 → all at once
```

This makes development much faster!

### 3. **File References** 🔗

Claude references files with clickable links:
- [App.tsx:10](App.tsx#L10) - Jump to line 10
- [src/screens/](src/screens/) - Browse folder

**Tip**: Click these in VSCode to navigate instantly.

### 4. **Plan Mode** 🏗️

For big architectural decisions, use plan mode:

```
User: "Add a workout recommendation engine"
Claude: "This is complex. Let me enter plan mode to explore approaches..."
```

Plan mode helps:
- Explore the codebase
- Consider multiple approaches
- Get your approval before coding

**How to use**: Ask Claude to plan before implementing large features.

### 5. **Smart Context Awareness** 🧠

Claude remembers:
- Your tech stack (Spring Boot, React, K8s)
- Your preferences (free hosting)
- Previous conversations

This gets better over time through memory files in `.claude/memory/`.

## Common Workflows

### Adding a New Feature

**❌ Don't do this:**
```
"Add a workout screen"
```

**✅ Do this:**
```
"I want to add a workout logging screen where users can:
1. Select exercises from a list
2. Add sets with reps and weight
3. Save the workout to Supabase
4. View a summary

Can you plan the implementation first?"
```

Claude will:
1. Enter plan mode (if complex)
2. Explore existing code
3. Design the approach
4. Ask for approval
5. Implement with todo tracking

### Fixing Bugs

**❌ Don't do this:**
```
"The app crashes"
```

**✅ Do this:**
```
"When I try to login, I get this error:
[paste error message]

It happens on the Login screen when I submit the form."
```

Claude will:
1. Read the relevant files
2. Identify the issue
3. Propose a fix
4. Implement it

### Learning a New Library

**✅ Great approach:**
```
"I want to add charts to show workout progress.
I've heard of Victory Native - can you show me how to integrate it
and create a simple line chart of workout volume over time?"
```

Claude will:
1. Explain the library
2. Install dependencies
3. Create example code
4. Explain what each part does

## Advanced Tips

### 1. Ask for Explanations

```
"Can you explain how the Row Level Security works in supabase-schema.sql?"
```

### 2. Request Different Approaches

```
"Show me 3 ways to implement workout reminders:
1. Local notifications
2. Push notifications
3. Email reminders

What are the trade-offs?"
```

### 3. Code Reviews

```
"Review the LoginScreen.tsx for security issues and best practices"
```

### 4. Refactoring

```
"The HomeScreen is getting too big. Can you help refactor it into smaller components?"
```

### 5. Testing

```
"Add unit tests for the Supabase service functions"
```

## Best Practices

### Be Specific

❌ "Make it better"
✅ "Add loading states and error handling to the login form"

### Provide Context

❌ "This doesn't work"
✅ "When I run `npm start`, I get this error: [error]. I'm on macOS and just installed dependencies."

### Ask Questions

❌ Struggling silently
✅ "I don't understand how useEffect works in the AppNavigator. Can you explain it?"

### Iterate

✅ Start simple, then enhance:
```
1. "Create a basic workout logging screen"
2. "Add exercise search functionality"
3. "Add the ability to reuse previous workouts"
```

## Common Commands

```bash
# Start the app
npm start

# Run on specific platform
npm run ios
npm run android
npm run web

# Clear cache if things break
npm start -- --clear

# Install a new package
npm install package-name
```

## Project-Specific Tips

### Adding New Screens

1. Create screen in `src/screens/NewScreen.tsx`
2. Add navigation in `src/navigation/AppNavigator.tsx`
3. Add any new types in `src/types/`

### Working with Supabase

```typescript
// Always use Row Level Security (already set up)
// Query data:
const { data, error } = await supabase
  .from('workouts')
  .select('*')
  .eq('user_id', userId);

// Insert data:
const { data, error } = await supabase
  .from('workouts')
  .insert({ title: 'Leg Day', date: new Date() });
```

### Styling

Use the color constants:
```typescript
import { Colors } from '../constants/colors';

style={{
  backgroundColor: Colors.primary,
  color: Colors.text,
}}
```

## Getting Help

### From Claude Code

```
"I'm stuck on [problem]. Here's what I've tried: [attempts]"
"What's the best way to [task] in React Native?"
"Can you explain why this code works: [code]"
```

### Documentation

- [Expo Docs](https://docs.expo.dev)
- [React Native Docs](https://reactnative.dev)
- [Supabase Docs](https://supabase.com/docs)
- [React Navigation Docs](https://reactnavigation.org)

## Next Steps

Try these to practice:

1. **Easy**: Change the primary color in `src/constants/colors.ts`
2. **Medium**: Add a "Forgot Password" feature
3. **Hard**: Create a workout logging screen with exercise selection

Ask Claude for help with any of these!

## Remember

- Claude Code is here to help you learn, not just write code
- Ask "why" and "how" questions
- Experiment and iterate
- Review the code Claude writes to learn from it

Happy coding! 🚀
