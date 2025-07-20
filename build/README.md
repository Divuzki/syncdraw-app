# Build Assets

This directory contains build assets for Electron Builder.

## Required Files

To complete the Electron Builder setup, you need to add the following icon files:

### macOS
- `icon.icns` - macOS app icon (512x512px minimum, .icns format)

### Windows
- `icon.ico` - Windows app icon (256x256px minimum, .ico format)

### Linux
- `icon.png` - Linux app icon (512x512px, .png format)

## Icon Requirements

- **macOS (.icns)**: Use tools like `iconutil` or online converters to create from a 1024x1024px PNG
- **Windows (.ico)**: Use tools like ImageMagick or online converters, include multiple sizes (16, 32, 48, 64, 128, 256px)
- **Linux (.png)**: Standard PNG format, 512x512px recommended

## Auto-Update Setup

The configuration is set up for GitHub releases. Make sure to:

1. Update the `owner` and `repo` fields in `package.json` build config
2. Set up the following GitHub secrets for code signing (optional but recommended):
   - `CSC_LINK` - macOS certificate (.p12 file base64 encoded)
   - `CSC_KEY_PASSWORD` - macOS certificate password
   - `WIN_CSC_LINK` - Windows certificate (.p12 file base64 encoded)
   - `WIN_CSC_KEY_PASSWORD` - Windows certificate password

## Files in this directory

- `entitlements.mac.plist` - macOS entitlements for hardened runtime
- `README.md` - This file