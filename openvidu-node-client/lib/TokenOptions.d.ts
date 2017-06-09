import { OpenViduRole } from "./OpenViduRole";
export declare class TokenOptions {
    private data;
    private role;
    constructor(data: string, role: OpenViduRole);
    getData(): string;
    getRole(): OpenViduRole;
}
export declare namespace TokenOptions {
    class Builder {
        private dataProp;
        private roleProp;
        build(): TokenOptions;
        data(data: string): Builder;
        role(role: OpenViduRole): Builder;
    }
}
