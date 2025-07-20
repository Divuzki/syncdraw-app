# Electron Builder & Auto-Update Setup

This document explains the complete Electron Builder configuration with auto-updates via GitHub releases and CI/CD pipeline.

## 📦 Package Configuration

The `package.json` has been configured with:

### Build Scripts
- `build:renderer` - Builds the React frontend with Vite
- `build:main` - Compiles the Electron main process TypeScript
- `build:electron` - Full Electron build (renderer + main + packaging)
- `dist` - Build without publishing
- `dist:publish` - Build and publish to GitHub releases

### Electron Builder Configuration
- **Cross-platform targets**: Windows (NSIS), macOS (DMG), Linux (AppImage)
- **Auto-updater**: Configured for GitHub releases
- **Code signing**: Ready for certificates (see secrets section)
- **Optimized packaging**: Excludes unnecessary files for smaller builds

## 🚀 GitHub Actions CI/CD

The workflow `.github/workflows/electron-ci.yml` provides:

### Pipeline Stages
1. **Test**: Runs tests, type checking, and linting
2. **Build**: Cross-platform builds on macOS, Windows, and Linux
3. **Release**: Creates GitHub releases with artifacts

### Triggers
- **Push to main**: Full build and publish
- **Pull requests**: Build only (no publishing)

### Artifacts
- macOS: `.dmg` installer + update metadata
- Windows: `.exe` installer + update metadata  
- Linux: `.AppImage` + update metadata

## 🔄 Auto-Update System

### Main Process (`electron/main.ts`)
- Integrates `electron-updater`
- Checks for updates on app startup (production only)
- Provides IPC handlers for manual update checks
- Emits update events to renderer process

### Renderer Process Integration
- TypeScript declarations in `src/types/electron.d.ts`
- Preload script exposes update methods via `window.electronAPI`
- React component `UpdateNotification.tsx` for UI

### Update Flow
1. App checks for updates automatically
2. User gets notification when update is available
3. User can download update with progress indicator
4. User can install update (restarts app)

## 🔧 Setup Instructions

### 1. Repository Configuration

Update the GitHub repository settings in `package.json`:

```json
"publish": {
  "provider": "github",
  "owner": "your-github-username",
  "repo": "syncdraw-app"
}
```

### 2. Add App Icons

Place the following files in the `build/` directory:
- `icon.icns` - macOS app icon (512x512px minimum)
- `icon.ico` - Windows app icon (256x256px minimum)
- `icon.png` - Linux app icon (512x512px)

### 3. Code Signing (Optional but Recommended)

Set up GitHub repository secrets for code signing:

#### macOS Code Signing
- `CSC_LINK` - Base64 encoded .p12 certificate file
- `CSC_KEY_PASSWORD` - Certificate password

#### Windows Code Signing
- `WIN_CSC_LINK` - Base64 encoded .p12 certificate file
- `WIN_CSC_KEY_PASSWORD` - Certificate password

### 4. Install Dependencies

```bash
npm install
```

### 5. Development

```bash
# Start development server
npm run dev

# Build for production
npm run build:electron

# Build and publish (requires push to main branch)
npm run dist:publish
```

## 🎯 Usage Examples

### Manual Update Check

```typescript
// In your React component
const checkForUpdates = async () => {
  if (window.electronAPI) {
    const result = await window.electronAPI.checkForUpdates();
    if (result.success) {
      console.log('Update check completed');
    }
  }
};
```

### Update Notification Component

Add the `UpdateNotification` component to your app:

```tsx
import UpdateNotification from './components/ui/UpdateNotification';

function App() {
  return (
    <div>
      {/* Your app content */}
      <UpdateNotification />
    </div>
  );
}
```

## 📁 File Structure

```
├── .github/workflows/
│   └── electron-ci.yml          # CI/CD pipeline
├── build/
│   ├── entitlements.mac.plist   # macOS entitlements
│   ├── icon.svg                 # Source icon (convert to required formats)
│   └── README.md                # Build assets documentation
├── electron/
│   ├── main.js                  # Original main process (JavaScript)
│   ├── main.ts                  # New main process (TypeScript)
│   └── preload.js               # Preload script with auto-updater APIs
├── src/
│   ├── components/ui/
│   │   └── UpdateNotification.tsx # Update UI component
│   └── types/
│       └── electron.d.ts        # TypeScript declarations
└── package.json                 # Electron Builder configuration
```

## 🔍 Troubleshooting

### Common Issues

1. **Update not working in development**
   - Auto-updates only work in production builds
   - Use `npm run dist` to test locally

2. **Code signing errors**
   - Ensure certificates are valid and properly encoded
   - Check GitHub secrets are set correctly

3. **Build failures**
   - Verify all dependencies are installed
   - Check that icon files exist in `build/` directory

4. **GitHub releases not created**
   - Ensure `GITHUB_TOKEN` has proper permissions
   - Check repository settings allow GitHub Actions

### Debug Commands

```bash
# Test build locally
npm run dist

# Check TypeScript compilation
npm run type-check

# Run tests
npm test

# Lint code
npm run lint
```

## 📚 Additional Resources

- [Electron Builder Documentation](https://www.electron.build/)
- [electron-updater Documentation](https://www.electron.build/auto-update)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Code Signing Guide](https://www.electron.build/code-signing)

## 🎉 Next Steps

1. Replace placeholder icons with your app's actual icons
2. Update repository owner/name in `package.json`
3. Set up code signing certificates (optional)
4. Push to main branch to trigger first build
5. Test auto-updates with a version bump

Your Electron app is now ready for cross-platform distribution with automatic updates! 🚀