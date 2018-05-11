import { PublisherProperties } from './Interfaces/Public/PublisherProperties';
export declare function solveIfCallback(methodName: string, completionHandler: ((error: Error | undefined) => void) | undefined, promise: Promise<any>): Promise<any>;
export declare function adaptPublisherProperties(properties: any): PublisherProperties;
