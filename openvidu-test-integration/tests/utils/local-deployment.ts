import { execCommand, sleep } from "./helper";

const LOCAL_DEPLOYMENT_PATH = "../../openvidu-local-deployment/community/docker-compose.yaml";

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
        execCommand(`docker compose -f ${LOCAL_DEPLOYMENT_PATH} down -v`);
    }

    static startContainer(containerName: string) {
        console.log(`Starting container ${containerName}...`);
        execCommand(`docker compose -f ${LOCAL_DEPLOYMENT_PATH} start ${containerName}`);
    }

    static stopContainer(containerName: string) {
        console.log(`Stopping container ${containerName}...`);
        execCommand(`docker compose -f ${LOCAL_DEPLOYMENT_PATH} stop ${containerName}`);
    }
}
