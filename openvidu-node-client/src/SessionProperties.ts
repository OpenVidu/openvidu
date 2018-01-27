import { MediaMode } from "./MediaMode";
import { ArchiveMode } from "./ArchiveMode";
import { ArchiveLayout } from "./ArchiveLayout";

export class SessionProperties {

	constructor(private mediaModeProp: MediaMode, private archiveModeProp: ArchiveMode, private archiveLayoutProp: ArchiveLayout) { }

	mediaMode(): string {
		return this.mediaModeProp;
	}

	archiveMode(): ArchiveMode {
		return this.archiveModeProp;
	}

	archiveLayout(): ArchiveLayout {
		return this.archiveLayoutProp;
	}
}

export namespace SessionProperties {
	export class Builder {

		private mediaModeProp: MediaMode = MediaMode.ROUTED;
		private archiveModeProp: ArchiveMode = ArchiveMode.MANUAL;
		private archiveLayoutProp: ArchiveLayout = ArchiveLayout.BEST_FIT;

		build(): SessionProperties {
			return new SessionProperties(this.mediaModeProp, this.archiveModeProp, this.archiveLayoutProp);
		}

		mediaMode(mediaMode: MediaMode): Builder {
			this.mediaModeProp = mediaMode;
			return this;
		}

		archiveMode(archiveMode: ArchiveMode): Builder {
			this.archiveModeProp = archiveMode;
			return this;
		}

		archiveLayout(archiveLayout: ArchiveLayout): Builder {
			this.archiveLayoutProp = archiveLayout;
			return this;
		}
	};
}
