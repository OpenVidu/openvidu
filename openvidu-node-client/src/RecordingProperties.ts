export class RecordingProperties {

    constructor(private rName: string) { }

    name(): string {
        return this.rName;
    }

}

export namespace RecordingProperties {
    export class Builder {

        private rName: string = '';

        build(): RecordingProperties {
            return new RecordingProperties(this.rName);
        }

        name(name: string): Builder {
            this.rName = name;
            return this;
        }
    };
}