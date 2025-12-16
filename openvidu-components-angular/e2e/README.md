# E2E Testing Documentation

## Table of Contents

1. [Overview](#overview)
2. [Technology Stack](#technology-stack)
3. [Test Coverage](#test-coverage)
4. [Test Types](#test-types)
5. [Test Files Structure](#test-files-structure)
6. [Running Tests](#running-tests)

## Overview

This directory contains end-to-end (E2E) tests for the OpenVidu Components Angular library. The test suite validates the complete functionality of the library components, including UI interactions, media handling, real-time communication features, and API directives.

## Technology Stack

The E2E test suite is built using the following technologies:

- **Selenium WebDriver**: Browser automation framework for UI testing
- **Jasmine**: Testing framework providing describe/it syntax and assertions
- **TypeScript**: Programming language for type-safe test development
- **ChromeDriver**: Chrome browser automation driver
- **Fake Media Devices**: Simulated audio/video devices for testing without real hardware

### Key Dependencies

- `selenium-webdriver` (v4.39.0): Core automation library
- `jasmine` (v5.3.1): Test runner and assertion framework
- `chromedriver` (v143.0.0): Chrome browser driver
- `@types/selenium-webdriver`: TypeScript type definitions

## Test Coverage

The test suite provides comprehensive coverage across the following functional areas:

### Core Features
- **API Directives**: Component configuration and display options (41 tests)
- **Events**: Component lifecycle and interaction events (24 tests)
- **Stream Management**: Video/audio stream handling and display (32 tests)
- **Media Devices**: Device selection, permissions, and virtual devices (7 tests)
- **Panels**: UI navigation and panel management (6 tests)
- **Toolbar**: Media control buttons and functionality (2 tests)
- **Chat**: Messaging functionality and UI (3 tests)
- **Screen Sharing**: Screen share capabilities and behavior (8 tests)
- **Virtual Backgrounds**: Background effects and manipulation (5 tests)

### Nested Components Testing
- **Structural Directives**: Custom component templates and layouts (30 tests)
- **Attribute Directives**: Component visibility and behavior controls (16 tests)
- **Events**: Nested component event handling (10 tests)

### Internal Functionality
- **Internal Directives**: Library-specific directive behavior (5 tests)

### Disabled Tests
- **Captions**: Captions feature tests (currently commented out, awaiting implementation)

## Test Types

### 1. UI Interaction Tests
Tests that validate user interface elements and their interactions:
- Button visibility and functionality
- Panel opening/closing
- Component rendering
- Layout behavior
- Visual element presence

**Example**: Testing microphone mute/unmute button functionality

### 2. Media Device Tests
Tests focused on audio/video device handling:
- Device selection and switching
- Virtual device integration
- Permission handling
- Track management
- Media stream validation

**Example**: Testing video device replacement with custom virtual devices

### 3. API Directive Tests
Tests verifying component configuration through Angular directives:
- Component display settings (minimal UI, language, prejoin)
- Feature toggles (buttons, panels, toolbar elements)
- Media settings (video/audio enabled/disabled)
- UI customization options

**Example**: Testing hiding toolbar buttons via directives

### 4. Event Tests
Tests validating event emission and handling:
- Component lifecycle events
- User interaction events
- Media state change events
- Panel state change events
- Recording/broadcasting events

**Example**: Testing onVideoEnabledChanged event emission

### 5. Multi-Participant Tests
Tests simulating multiple participants:
- Message exchange between participants
- Remote participant display
- Screen sharing with multiple users
- Participant panel functionality

**Example**: Testing chat message reception between two participants

### 6. Structural Customization Tests
Tests for component template customization:
- Custom toolbar templates
- Custom panel templates
- Custom layout templates
- Custom stream templates
- Additional component injection

**Example**: Testing custom toolbar rendering with additional buttons

### 7. Screen Sharing Tests
Tests specific to screen sharing features:
- Screen share toggle
- Pin/unpin behavior
- Multiple simultaneous screen shares
- Screen share with audio/video states

**Example**: Testing screen share video pinning behavior

### 8. Virtual Background Tests
Tests for background effects:
- Background panel interaction
- Effect application
- Background state management
- Prejoin and in-room background handling

**Example**: Testing background effect application in prejoin

## Test Files Structure

```
e2e/
├── api-directives.test.ts           # API directive configuration tests (41 tests)
├── events.test.ts                   # Component event emission tests (24 tests)
├── stream.test.ts                   # Video/audio stream tests (32 tests)
├── media-devices.test.ts            # Device handling tests (7 tests)
├── panels.test.ts                   # Panel navigation tests (6 tests)
├── toolbar.test.ts                  # Toolbar functionality tests (2 tests)
├── chat.test.ts                     # Chat feature tests (3 tests)
├── screensharing.test.ts            # Screen sharing tests (8 tests)
├── virtual-backgrounds.test.ts      # Virtual backgrounds tests (5 tests)
├── internal-directives.test.ts      # Internal directive tests (5 tests)
├── captions.test.ts                 # Captions tests (currently disabled)
├── config.ts                        # Test configuration
├── selenium.conf.ts                 # Selenium browser configuration
├── utils.po.test.ts                 # Page Object utilities
└── nested-components/
    ├── structural-directives.test.ts # Template customization tests (30 tests)
    ├── attribute-directives.test.ts  # Visibility directive tests (16 tests)
    └── events.test.ts                # Nested event tests (10 tests)
```

### Support Files

- **config.ts**: Global test configuration and timeout settings
- **selenium.conf.ts**: Browser capabilities, Chrome options, and test environment setup
- **utils.po.test.ts**: Page Object Model implementation with reusable helper methods

## Running Tests

### Individual Test Suites

Execute specific test files using npm scripts:

```bash
# API directives tests
npm run e2e:lib-directives

# Event tests
npm run e2e:lib-events

# Chat tests
npm run e2e:lib-chat

# Media devices tests
npm run e2e:lib-media-devices

# Panel tests
npm run e2e:lib-panels

# Screen sharing tests
npm run e2e:lib-screensharing

# Stream tests
npm run e2e:lib-stream

# Toolbar tests
npm run e2e:lib-toolbar

# Virtual backgrounds tests
npm run e2e:lib-virtual-backgrounds

# Internal directives tests
npm run e2e:lib-internal-directives

# All nested component tests
npm run e2e:nested-all

# Nested events tests
npm run e2e:nested-events

# Nested structural directives tests
npm run e2e:nested-structural-directives

# Nested attribute directives tests
npm run e2e:nested-attribute-directives
```

### Test Execution Process

1. Tests are compiled from TypeScript to JavaScript using `tsc --project ./e2e`
2. Jasmine executes the compiled tests from `./e2e/dist/` directory
3. Selenium WebDriver launches Chrome browser instances
4. Tests interact with the application running at `http://localhost:4200`
5. Test results are reported in the console

### Environment Modes

Tests support two execution modes:

- **DEV Mode**: Local development with visible browser
- **CI Mode**: Continuous integration with headless browser and additional Chrome flags

Mode is controlled via `LAUNCH_MODE` environment variable.
