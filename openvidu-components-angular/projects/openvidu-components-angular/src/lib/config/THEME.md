# OpenVidu Components Angular - Theme System

The OpenVidu Components Angular library provides a comprehensive theming system that allows you to customize the appearance of all components to match your application's design. The theme system is fully compatible with Angular Material themes and supports dynamic theme switching.

## Table of Contents

1. [Quick Start](#quick-start)
2. [Theme Service](#theme-service)
3. [CSS Variables Reference](#css-variables-reference)
4. [Angular Material Integration](#angular-material-integration)
5. [Custom Themes](#custom-themes)
6. [SCSS Mixins](#scss-mixins)
7. [Migration Guide](#migration-guide)

## Quick Start

### Basic Usage

To get started with theming, import and inject the `OpenViduThemeService`:

```typescript
import { Component } from '@angular/core';
import { OpenViduThemeService, OpenViduThemeMode } from 'openvidu-components-angular';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html'
})
export class AppComponent {
  constructor(private themeService: OpenViduThemeService) {}

  setLightTheme() {
    this.themeService.setTheme('light');
  }

  setDarkTheme() {
    this.themeService.setTheme('dark');
  }

  toggleTheme() {
    this.themeService.toggleTheme();
  }
}
```

### CSS Variable Override

You can also customize themes by overriding CSS variables directly in your global styles:

```scss
:root {
  --ov-primary-action-color: #ff5722;
  --ov-accent-action-color: #4caf50;
  --ov-background-color: #fafafa;
}
```

## Theme Service

The `OpenViduThemeService` provides methods to manage themes dynamically:

### Available Methods

#### `setTheme(theme: OpenViduThemeMode)`
Sets the global theme mode.

```typescript
// Set light theme
this.themeService.setTheme('light');

// Set dark theme
this.themeService.setTheme('dark');

// Set auto theme (follows system preference)
this.themeService.setTheme('auto');
```

#### `updateThemeVariables(variables: OpenViduThemeVariables)`
Updates specific theme variables without changing the overall theme.

```typescript
this.themeService.updateThemeVariables({
  '--ov-primary-action-color': '#ff5722',
  '--ov-accent-action-color': '#4caf50'
});
```

#### `applyThemeConfiguration(themeVariables: OpenViduThemeVariables)`
Applies a complete theme configuration.

```typescript
import { OPENVIDU_DARK_THEME } from 'openvidu-components-angular';

this.themeService.applyThemeConfiguration(OPENVIDU_DARK_THEME);
```

#### `getCurrentTheme(): OpenViduThemeMode`
Returns the current active theme mode.

```typescript
const currentTheme = this.themeService.getCurrentTheme();
console.log('Current theme:', currentTheme); // 'light', 'dark', 'auto' or 'none'
```

#### `toggleTheme()`
Toggles between light and dark themes.

```typescript
this.themeService.toggleTheme();
```

### Observables

Listen to theme changes using the provided observables:

```typescript
// Listen to theme mode changes
this.themeService.currentTheme$.subscribe(theme => {
  console.log('Theme changed to:', theme);
});

// Listen to theme variable changes
this.themeService.currentVariables$.subscribe(variables => {
  console.log('Theme variables updated:', variables);
});
```

## CSS Variables Reference

### Core Background Colors

| Variable | Description | Light Default | Dark Default |
|----------|-------------|---------------|--------------|
| `--ov-background-color` | Primary background color | `#ffffff` | `#1f2020` |
| `--ov-surface-color` | Surface/card background | `#ffffff` | `#2d2d2d` |
| `--ov-surface-container-color` | Container surfaces | `#f8f9fa` | `#3a3a3a` |
| `--ov-surface-container-high-color` | Elevated surfaces | `#f0f0f0` | `#474747` |

### Action Colors

| Variable | Description | Light Default | Dark Default |
|----------|-------------|---------------|--------------|
| `--ov-primary-action-color` | Primary buttons/actions | `#273235` | `#4a5a5d` |
| `--ov-primary-action-color-lighter` | Primary hover states | `#394649` | `#5a6a6d` |
| `--ov-secondary-action-color` | Secondary buttons | `#6c757d` | `#e1e1e1` |
| `--ov-accent-action-color` | Accent/highlight color | `#0089ab` | `#00b3d6` |

### State Colors

| Variable | Description | Light Default | Dark Default |
|----------|-------------|---------------|--------------|
| `--ov-error-color` | Error states | `#dc3545` | `#ff6b6b` |
| `--ov-warn-color` | Warning states | `#ffc107` | `#ffd93d` |
| `--ov-success-color` | Success states | `#28a745` | `#69db7c` |

### Text Colors

| Variable | Description | Light Default | Dark Default |
|----------|-------------|---------------|--------------|
| `--ov-text-primary-color` | Primary text | `#212529` | `#ffffff` |
| `--ov-text-surface-color` | Text on surfaces | `#212529` | `#ffffff` |
| `--ov-text-secondary-color` | Secondary text | `#6c757d` | `#b3b3b3` |
| `--ov-text-disabled-color` | Disabled text | `#adb5bd` | `#666666` |

### Interactive States

| Variable | Description | Light Default | Dark Default |
|----------|-------------|---------------|--------------|
| `--ov-hover-color` | Hover background | `#f8f9fa` | `#4a4a4a` |
| `--ov-active-color` | Active state | `rgba(66, 133, 244, 0.08)` | `rgba(66, 133, 244, 0.2)` |
| `--ov-focus-color` | Focus ring color | `#4285f4` | `#5294ff` |
| `--ov-disabled-background` | Disabled background | `#f8f9fa` | `#3a3a3a` |
| `--ov-disabled-border-color` | Disabled borders | `#dee2e6` | `#555555` |

### Input & Form Colors

| Variable | Description | Light Default | Dark Default |
|----------|-------------|---------------|--------------|
| `--ov-input-background` | Input backgrounds | `#ffffff` | `#3a3a3a` |
| `--ov-border-color` | Default borders | `#ced4da` | `#555555` |
| `--ov-border-focus-color` | Focused borders | `#4285f4` | `#5294ff` |

### Layout & Spacing

| Variable | Description | Default |
|----------|-------------|---------|
| `--ov-toolbar-buttons-radius` | Toolbar button radius | `50%` |
| `--ov-leave-button-radius` | Leave button radius | `10px` |
| `--ov-video-radius` | Video element radius | `5px` |
| `--ov-surface-radius` | Surface/card radius | `5px` |
| `--ov-input-radius` | Input field radius | `4px` |

### Special Colors

| Variable | Description | Default |
|----------|-------------|---------|
| `--ov-recording-color` | Recording indicator | `var(--ov-error-color)` |
| `--ov-broadcasting-color` | Broadcasting indicator | `#5903ca` |
| `--ov-selection-color` | Selection highlight | `#d4d6d7` |
| `--ov-selection-color-btn` | Button selection | `#afafaf` |
| `--ov-activity-status-color` | Activity status | `#afafaf` |

### Video/Media Specific

| Variable | Description | Default |
|----------|-------------|---------|
| `--ov-video-background` | Video element background | `#000000` |
| `--ov-audio-wave-color` | Audio wave visualization | `var(--ov-accent-action-color)` |
| `--ov-captions-height` | Captions panel height | `250px` |

### Shadow & Elevation

| Variable | Description | Default |
|----------|-------------|---------|
| `--ov-shadow-low` | Low elevation shadow | `0 2px 8px rgba(0, 0, 0, 0.1)` |
| `--ov-shadow-medium` | Medium elevation shadow | `0 4px 20px rgba(0, 0, 0, 0.1)` |
| `--ov-shadow-high` | High elevation shadow | `0 8px 32px rgba(0, 0, 0, 0.12)` |
| `--ov-border-shadow` | Border shadow | `1px 1px 5px 0px rgba(0, 0, 0, 0.2)` |

## Angular Material Integration

### Using SCSS Mixins

Import and use the provided SCSS mixins to integrate with Angular Material themes:

```scss
@use '@angular/material' as mat;
@use 'openvidu-components-angular/theme' as ovtheme;

// Define your Material theme
$my-theme: mat.define-theme();

// Apply the theme to OpenVidu components
@include ovtheme.apply-openvidu-theme($my-theme);

// Or apply responsive theme detection
@include ovtheme.openvidu-theme-responsive();
```

### Manual Integration

To manually integrate with Angular Material themes in your component:

```typescript
import { Injectable } from '@angular/core';
import { OpenViduThemeService } from 'openvidu-components-angular';

@Injectable()
export class MaterialThemeIntegration {
  constructor(private themeService: OpenViduThemeService) {}

  applyMaterialTheme(materialTheme: any) {
    // Extract colors from Material theme and apply to OpenVidu
    this.themeService.updateThemeVariables({
      '--ov-primary-action-color': materialTheme.primary,
      '--ov-accent-action-color': materialTheme.accent,
      '--ov-background-color': materialTheme.background,
      '--ov-surface-color': materialTheme.surface
    });
  }
}
```

## Custom Themes

### Creating a Custom Theme

Define a custom theme object:

```typescript
import { OpenViduThemeVariables } from 'openvidu-components-angular';

const myCustomTheme: OpenViduThemeVariables = {
  '--ov-primary-action-color': '#ff5722',
  '--ov-accent-action-color': '#4caf50',
  '--ov-background-color': '#fafafa',
  '--ov-surface-color': '#ffffff',
  '--ov-text-primary-color': '#333333',
  '--ov-text-secondary-color': '#666666',
  // ... add more variables as needed
};

// Apply the custom theme
this.themeService.applyThemeConfiguration(myCustomTheme);
```

### Brand-Specific Themes

Create brand-specific themes for multi-tenant applications:

```typescript
const brandThemes = {
  'brand-a': {
    '--ov-primary-action-color': '#ff5722',
    '--ov-accent-action-color': '#4caf50'
  },
  'brand-b': {
    '--ov-primary-action-color': '#2196f3',
    '--ov-accent-action-color': '#ff9800'
  }
};

// Apply brand theme based on user/tenant
const userBrand = 'brand-a';
this.themeService.updateThemeVariables(brandThemes[userBrand]);
```

## SCSS Mixins

### Available Mixins

#### `apply-openvidu-theme($theme)`
Applies an Angular Material theme to OpenVidu components.

```scss
@include ovtheme.apply-openvidu-theme($my-material-theme);
```

#### `apply-openvidu-dark-theme()`
Applies the predefined dark theme.

```scss
@include ovtheme.apply-openvidu-dark-theme();
```

#### `apply-openvidu-light-theme()`
Applies the predefined light theme.

```scss
@include ovtheme.apply-openvidu-light-theme();
```

#### `openvidu-theme-responsive()`
Sets up responsive theme detection based on system preferences.

```scss
@include ovtheme.openvidu-theme-responsive();
```


## Examples

### Complete Theme Integration

```typescript
import { Component, OnInit } from '@angular/core';
import {
  OpenViduThemeService,
  OpenViduThemeMode,
  OPENVIDU_LIGHT_THEME,
  OPENVIDU_DARK_THEME
} from 'openvidu-components-angular';

@Component({
  selector: 'app-theme-demo',
  template: `
    <div class="theme-controls">
      <button (click)="setTheme('light')">Light</button>
      <button (click)="setTheme('dark')">Dark</button>
      <button (click)="setTheme('auto')">Auto</button>
      <button (click)="toggleTheme()">Toggle</button>
      <button (click)="applyCustomBrand()">Custom Brand</button>
    </div>
    <div class="current-theme">
      Current theme: {{ currentTheme }}
    </div>
  `
})
export class ThemeDemoComponent implements OnInit {
  currentTheme: OpenViduThemeMode = 'auto';

  constructor(private themeService: OpenViduThemeService) {}

  ngOnInit() {
    this.themeService.currentTheme$.subscribe(theme => {
      this.currentTheme = theme;
    });
  }

  setTheme(theme: OpenViduThemeMode) {
    this.themeService.setTheme(theme);
  }

  toggleTheme() {
    this.themeService.toggleTheme();
  }

  applyCustomBrand() {
    this.themeService.updateThemeVariables({
      '--ov-primary-action-color': '#ff6b35',
      '--ov-accent-action-color': '#f7931e',
      '--ov-surface-radius': '12px'
    });
  }
}
```
