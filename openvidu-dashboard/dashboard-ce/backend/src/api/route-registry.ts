import { type NextFunction, type Request, type RequestHandler, type Response, Router } from 'express';
import type * as z from 'zod';

import type { Edition, FeatureKey, ValidationIssue } from '@openvidu-dashboard/typings';

import { ApiError } from '../http/api-error.js';
import { parsePart, throwIfInvalid } from './validation.js';

export type HttpMethod = 'get' | 'post' | 'put' | 'patch' | 'delete';

/**
 * Who may call a route: anyone, a valid bearer token, or anyone with a token checked only when an `Authorization`
 * header is present (info answers a public subset without it).
 */
export type RouteSecurity = 'public' | 'bearer' | 'optional-bearer';

/** Identity of the caller of a bearer route. */
export interface AuthContext {
	username: string;
	edition: Edition;
	expiresAt: Date;
}

declare global {
	// eslint-disable-next-line @typescript-eslint/no-namespace
	namespace Express {
		interface Request {
			auth?: AuthContext;
		}
	}
}

export interface RouteInput<P, Q, B> {
	params: P;
	query: Q;
	body: B;
	req: Request;
	res: Response;
}

export interface RouteResponse {
	description: string;
	schema?: z.ZodType;
	/** Media type of `schema`; default `application/json`. */
	contentType?: string;
	headers?: z.ZodObject;
}

export interface RouteDefinition<P = unknown, Q = unknown, B = unknown> {
	method: HttpMethod;
	/** Path under `/api/v1` in OpenAPI form, e.g. `/rooms/{sid}`. */
	path: string;
	/** Edition that implements the route; CE answers `PRO_FEATURE` for PRO routes. */
	edition: Edition;
	/** Feature of a PRO route, reported in `details.feature`. */
	feature?: FeatureKey;
	summary: string;
	tags: string[];
	security: RouteSecurity;
	request?: { params?: z.ZodType<P>; query?: z.ZodType<Q>; body?: z.ZodType<B> };
	responses: Record<number, RouteResponse>;
	/** Middlewares that run before authentication, such as a rate limiter. */
	before?: RequestHandler[];
	/** Returns the JSON body of a `200`, or answers through `res` and returns undefined. */
	handler?: (input: RouteInput<P, Q, B>) => unknown;
}

/** A PRO route as CE knows it: answered with `PRO_FEATURE` and left out of the OpenAPI document. */
export interface RouteLock {
	method: HttpMethod;
	/** Path under `/api/v1` in OpenAPI form, e.g. `/rooms/{sid}`. */
	path: string;
	feature: FeatureKey;
}

/** Authenticates a request; installed by the auth module. */
export type Authenticator = (req: Request, required: boolean) => Promise<void>;

function routeKey(method: HttpMethod, path: string): string {
	return `${method.toUpperCase()} ${path}`;
}

/** Express path of an OpenAPI path: `{sid}` becomes `:sid`. */
function expressPath(path: string): string {
	return path.replace(/\{([^}]+)\}/g, ':$1');
}

/**
 * Every `/api/v1` route with its edition, feature, schemas and handler, and the locks of the PRO routes. One list builds
 * the Express router and the OpenAPI document; its order is the mount order, so literal segments are registered before
 * the parameter routes they would otherwise shadow.
 */
export class RouteRegistry {
	private readonly routes = new Map<string, RouteDefinition>();
	private readonly locks = new Set<string>();

	constructor(private readonly edition: Edition) {}

	register<P, Q, B>(route: RouteDefinition<P, Q, B>): void {
		const key = routeKey(route.method, route.path);
		const current = this.routes.get(key);

		if (current !== undefined && !this.locks.has(key)) {
			throw new Error(`Route ${key} is already registered`);
		}

		if (current !== undefined && current.feature !== route.feature) {
			throw new Error(`Route ${key} is locked for the feature ${String(current.feature)}`);
		}

		if (route.edition === 'pro' && route.feature === undefined) {
			throw new Error(`PRO route ${key} needs a feature`);
		}

		// Setting an existing key keeps its position, so a lock is replaced where it was registered.
		this.locks.delete(key);
		this.routes.set(key, route as RouteDefinition);
	}

	/** Declares a PRO route by method, path and feature; the PRO edition registers its full definition in its place. */
	lock(lock: RouteLock): void {
		const key = routeKey(lock.method, lock.path);

		if (this.routes.has(key)) {
			throw new Error(`Route ${key} is already registered`);
		}

		this.locks.add(key);
		this.routes.set(key, {
			...lock,
			edition: 'pro',
			summary: '',
			tags: [],
			security: 'bearer',
			responses: {}
		});
	}

	/** Replaces the definition of a registered route where it stands; the PRO edition extends CE routes with it. */
	replace<P, Q, B>(route: RouteDefinition<P, Q, B>): void {
		const key = routeKey(route.method, route.path);

		if (!this.routes.has(key) || this.locks.has(key)) {
			throw new Error(`Route ${key} is not registered`);
		}

		this.routes.set(key, route as RouteDefinition);
	}

	/** `METHOD path` of every lock no definition has replaced. */
	unimplemented(): string[] {
		return [...this.locks];
	}

	/** The registered routes, locks aside. */
	list(): RouteDefinition[] {
		return [...this.routes].filter(([key]) => !this.locks.has(key)).map(([, route]) => route);
	}

	/** True when the running edition answers the route with `PRO_FEATURE`. */
	isLocked(route: RouteDefinition): boolean {
		return route.edition === 'pro' && this.edition === 'ce';
	}

	router(authenticate: Authenticator): Router {
		const router = Router();

		for (const route of this.routes.values()) {
			router[route.method](expressPath(route.path), ...(route.before ?? []), this.handle(route, authenticate));
		}

		return router;
	}

	private handle(route: RouteDefinition, authenticate: Authenticator): RequestHandler {
		return async (req: Request, res: Response, next: NextFunction) => {
			try {
				if (route.security !== 'public') {
					await authenticate(req, route.security === 'bearer');
				}

				if (this.isLocked(route) || route.handler === undefined) {
					throw new ApiError('PRO_FEATURE', 'This feature requires OpenVidu PRO', {
						feature: route.feature ?? null
					});
				}

				const issues: ValidationIssue[] = [];
				const params = route.request?.params ? parsePart(route.request.params, req.params, issues) : undefined;
				const query = route.request?.query ? parsePart(route.request.query, req.query, issues) : undefined;
				const body = route.request?.body ? parsePart(route.request.body, req.body ?? {}, issues) : undefined;

				throwIfInvalid(issues);

				const result: unknown = await route.handler({ params, query, body, req, res });

				if (!res.headersSent) {
					res.status(200).json(result);
				}
			} catch (error) {
				next(error);
			}
		};
	}
}
