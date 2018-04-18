import { MediaMode } from "./MediaMode";
import { RecordingMode } from "./RecordingMode";
import { RecordingLayout } from "./RecordingLayout";

export class SessionProperties {

	constructor(private mediaModeProp: MediaMode, private recordingModeProp: RecordingMode, private recordingLayoutProp: RecordingLayout) { }

	mediaMode(): string {
		return this.mediaModeProp;
	}

	recordingMode(): RecordingMode {
		return this.recordingModeProp;
	}

	recordingLayout(): RecordingLayout {
		return this.recordingLayoutProp;
	}
}

export namespace SessionProperties {
	export class Builder {

		private mediaModeProp: MediaMode = MediaMode.ROUTED;
		private recordingModeProp: RecordingMode = RecordingMode.MANUAL;
		private recordingLayoutProp: RecordingLayout = RecordingLayout.BEST_FIT;

		build(): SessionProperties {
			return new SessionProperties(this.mediaModeProp, this.recordingModeProp, this.recordingLayoutProp);
		}

		mediaMode(mediaMode: MediaMode): Builder {
			this.mediaModeProp = mediaMode;
			return this;
		}

		recordingMode(recordingMode: RecordingMode): Builder {
			this.recordingModeProp = recordingMode;
			return this;
		}

		recordingLayout(recordingLayout: RecordingLayout): Builder {
			this.recordingLayoutProp = recordingLayout;
			return this;
		}
	};
}
