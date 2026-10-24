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

    static stop() {
        console.log("Stopping local deployment...");
        LocalDeployment.saveServerLogs();
        execCommand(`docker compose -f ${LOCAL_DEPLOYMENT_PATH} down -v`);
    }

    /** Saves the log of the OpenVidu server in logs/, named after the current test, before the deployment is removed. */
    private static saveServerLogs() {
        const name = (expect.getState().currentTestName ?? "deployment").replace(/[^\w-]+/g, "-");
        mkdirSync(LOGS_PATH, { recursive: true });
        execCommand(`docker logs openvidu > ${join(LOGS_PATH, `${name}.log`)} 2>&1 || true`);
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

    static restartContainer(containerName: string) {
        console.log(`Restarting container ${containerName}...`);
        execCommand(`docker restart ${containerName}`);
    }

    /** Waits until the OpenVidu server logs that its analytics database is initialized after the given time. */
    static async waitForAnalytics(since: Date, timeoutSeconds = 60) {
        const deadline = Date.now() + timeoutSeconds * 1000;
        const sinceArg = since.toISOString();

        while (Date.now() < deadline) {
            const logs = execCommand(`docker logs --since ${sinceArg} openvidu 2>&1 || true`);
            if (logs.includes("analytics database initialized")) {
                return;
            }
            await sleep(1);
        }

        throw new Error("The OpenVidu server did not initialize its analytics database");
    }
}
