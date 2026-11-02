import { mkdirSync } from "fs";
import { join } from "path";
import { execCommand, sleep } from "./helper";

const LOCAL_DEPLOYMENT_PATH = "../../openvidu-local-deployment/community/docker-compose.yaml";
const LOGS_PATH = "logs";

export class LocalDeployment {
    static async start() {
        console.log("Starting local deployment...");
        execCommand(`docker compose -f ${LOCAL_DEPLOYMENT_PATH} up -d`);
        let statusCode: string;

        // Check that container "ready-check" exited with code 0
        do {
            await sleep(1);
            statusCode = execCommand("docker inspect ready-check -f {{.State.Status}}:{{.State.ExitCode}}");
        } while (statusCode !== "exited:0");

        console.log("Local deployment started");
    }

    /** Removes the deployment, saving the server log first unless the caller already saved what it needs. */
    static stop(saveLogs = true) {
        console.log("Stopping local deployment...");
        if (saveLogs) {
            LocalDeployment.saveServerLogs();
        }
        execCommand(`docker compose -f ${LOCAL_DEPLOYMENT_PATH} down -v`);
    }

    /**
     * Saves the log of the OpenVidu server in logs/, named after the current test, before the deployment is removed;
     * with `since`, only what the server logged from then on.
     */
    static saveServerLogs(since?: Date) {
        const name = (expect.getState().currentTestName ?? "deployment").replace(/[^\w-]+/g, "-");
        const sinceArg = since ? `--since ${since.toISOString()}` : "";
        mkdirSync(LOGS_PATH, { recursive: true });
        execCommand(`docker logs ${sinceArg} openvidu > ${join(LOGS_PATH, `${name}.log`)} 2>&1 || true`);
    }

    /** What the OpenVidu server logged since the given time. */
    static serverLogsSince(since: Date): string {
        return execCommand(`docker logs --since ${since.toISOString()} openvidu 2>&1 || true`);
    }

    static startContainer(containerName: string) {
        console.log(`Starting container ${containerName}...`);
        execCommand(`docker compose -f ${LOCAL_DEPLOYMENT_PATH} start ${containerName}`);
    }

    static stopContainer(containerName: string) {
        console.log(`Stopping container ${containerName}...`);
        execCommand(`docker compose -f ${LOCAL_DEPLOYMENT_PATH} stop ${containerName}`);
    }

    /** SIGTERM and, after the timeout, SIGKILL: a short timeout cuts the shutdown of the service short. */
    static stopContainerWithTimeout(containerName: string, timeoutSeconds: number) {
        console.log(`Stopping container ${containerName} with a ${timeoutSeconds} s timeout...`);
        execCommand(`docker stop --timeout=${timeoutSeconds} ${containerName}`);
    }

    /** SIGKILL, as a crash: the service gets no chance to shut down. */
    static killContainer(containerName: string) {
        console.log(`Killing container ${containerName}...`);
        execCommand(`docker kill ${containerName}`);
    }

    /** Sends a signal to the main process of a container, as an orchestrator does on a planned stop. */
    static signalContainer(containerName: string, signal: NodeJS.Signals) {
        console.log(`Sending ${signal} to container ${containerName}...`);
        execCommand(`docker kill --signal=${signal} ${containerName}`);
    }

    /** When the current run of a container started, to tell a restarted container from the previous run. */
    static containerStartedAt(containerName: string): string {
        return execCommand(`docker inspect -f {{.State.StartedAt}} ${containerName}`);
    }

    static isContainerRunning(containerName: string): boolean {
        return execCommand(`docker inspect -f {{.State.Running}} ${containerName}`) === "true";
    }

    /**
     * Empties Redis, as a Redis restarted without its persisted data: LiveKit's room listing is gone while the rooms
     * keep running on the server.
     */
    static flushRedis() {
        console.log("Flushing Redis...");
        execCommand("docker exec redis redis-cli --no-auth-warning -a redispassword FLUSHALL");
    }

    static restartContainer(containerName: string) {
        console.log(`Restarting container ${containerName}...`);
        execCommand(`docker restart ${containerName}`);
    }

    /**
     * Waits until the OpenVidu server logs that its analytics database is initialized after the given time, and
     * returns when that was seen, polling every half second.
     */
    static async waitForAnalytics(since: Date, timeoutSeconds = 60): Promise<Date> {
        const deadline = Date.now() + timeoutSeconds * 1000;

        while (Date.now() < deadline) {
            if (LocalDeployment.serverLogsSince(since).includes("analytics database initialized")) {
                return new Date();
            }
            await sleep(0.5);
        }

        throw new Error("The OpenVidu server did not initialize its analytics database");
    }
}
