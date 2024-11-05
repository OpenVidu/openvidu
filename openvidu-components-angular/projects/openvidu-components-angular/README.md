# Welcome to OpenVidu Components Angular

Build powerful video conferencing applications with ease using OpenVidu Components Angular.

## Introduction

Angular Components are the simplest way to create real-time videoconferencing apps with Angular. There's no need to manage state or low-level events; Angular Components from OpenVidu handle all the complexity for you.

## Getting Started

To get started with OpenVidu Components Angular, visit our [**Getting Started guide**](https://openvidu.io/docs/ui-components/angular-components/).

1. Create an Angular Project (>= 17.0.0)

    ```bash
    ng new your-project-name
    ```

2. Add Angular Material to your project

    ```bash
    ng add @angular/material
    ```

3. Install OpenVidu Components Angular

    ```bash
    npm install openvidu-components-angular
    ```

4. Import and use OpenVidu Components Angular

    ```typescript
    import { OpenViduComponentsModule, OpenViduComponentsConfig } from 'openvidu-components-angular';

    // Other imports ...

    const config: OpenViduComponentsConfig = {
    	production: environment.production
    };

    bootstrapApplication(AppComponent, {
    	providers: [
    		importProvidersFrom(
    			OpenViduComponentsModule.forRoot(config)
    			// Other imports ...
    		),
    		provideAnimations()
    	]
    }).catch((err) => console.error(err));
    ```

You can also customize the styles in your `styles.scss` file:

```scss
:root {
	/* Basic colors */
	--ov-background-color: #303030; // Background color
	--ov-surface-color: #ffffff; // Surfaces colors (panels, dialogs)

	/* Text colors */
	--ov-text-primary-color: #ffffff; // Text color over primary background
	--ov-text-surface-color: #1d1d1d; // Text color over surface background

	/* Action colors */
	--ov-primary-action-color: #273235; // Primary color for buttons, etc.
	--ov-secondary-action-color: #f1f1f1; // Secondary color for buttons, etc.
	--ov-accent-action-color: #0089ab; // Color for highlighted elements

	/* Status colors */
	--ov-error-color: #eb5144; // Error color
	--ov-warn-color: #ffba53; // Warning color

	/* Radius */
	--ov-buttons-radius: 50%;
	--ov-leave-button-radius: 10px;
	--ov-video-radius: 5px;
	--ov-surface-radius: 5px;
}
```

## Usage

```html
<ov-videoconference
	[token]="token"
	[livekitUrl]="LIVEKIT_URL"
	(onTokenRequested)="onTokenRequested($event)"
>
</ov-videoconference>
```

## API Documentation

For detailed information on OpenVidu Angular Components, refer to our [**API Reference**](https://openvidu.io/docs/reference-docs/openvidu-components-angular).

## Support

If you have any questions or need assistance, please reach out to our [**Support page**](https://openvidu.io/support/).
