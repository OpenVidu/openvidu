import { OpenViduRole } from "./OpenViduRole";

export class TokenOptions {

    constructor(private data: string, private role: OpenViduRole) {
        this.data = data;
        this.role = role;
    }

    public getData(): string {
        return this.data;
    }

    public getRole(): OpenViduRole {
        return this.role;
    }
}

export namespace TokenOptions {
    export class Builder {

        private dataProp: string;
        private roleProp: OpenViduRole;

        build(): TokenOptions {
            return new TokenOptions(this.dataProp, this.roleProp);
        }

        data(data: string): Builder {
            this.dataProp = data;
            return this;
        }

        role(role: OpenViduRole): Builder {
            this.roleProp = role;
            return this;
        }

    };
}
