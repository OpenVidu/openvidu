import { OpenViduRole } from "./OpenViduRole";

export class TokenOptions {

    constructor(private data: string, private role: OpenViduRole) { }

    getData(): string {
        return this.data;
    }

    getRole(): OpenViduRole {
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
