import { execSync, spawn } from "child_process";

const LOCAL_DEPLOYMENT_PATH = "../../openvidu-local-deployment/community/docker-compose.yaml";
const LIVEKIT_URL = "ws://localhost:7880";
const LIVEKIT_API_KEY = "devkey";
const LIVEKIT_API_SECRET = "secret";

const execCommand = (command: string): string => {
    try {
        return execSync(command).toString().trim();
    } catch (error) {
        console.error(`Error executing command: ${command}`);
        console.error(error);
        throw error;
    }
};

const execCommandInBackground = (command: string, args: string[]): number | undefined => {
    const child = spawn(command, args, { detached: true, stdio: "ignore" });
    // child.unref();
    return child.pid;
};

export const killProcess = (pid: number) => {
    process.kill(-pid);
};

export const sleep = async (seconds: number) => {
    return new Promise((resolve) => {
        setTimeout(resolve, seconds * 1000);
    });
};

export const startLocalDeployment = async () => {
    console.log("Starting local deployment...");
    execCommand(`docker compose -f ${LOCAL_DEPLOYMENT_PATH} up -d`);
    let statusCode: string;

    // Check that container "ready-check" exited with code 0
    do {
        await sleep(1);
        statusCode = execCommand("docker inspect ready-check -f {{.State.Status}}:{{.State.ExitCode}}");
    } while (statusCode !== "exited:0");

    console.log("Local deployment started");
};

export const stopLocalDeployment = () => {
    console.log("Stopping local deployment...");
    execCommand(`docker compose -f ${LOCAL_DEPLOYMENT_PATH} down -v`);
};

export const startComposeContainer = (containerName: string) => {
    console.log(`Starting container ${containerName}...`);
    execCommand(`docker compose -f ${LOCAL_DEPLOYMENT_PATH} start ${containerName}`);
};

export const stopComposeContainer = (containerName: string) => {
    console.log(`Stopping container ${containerName}...`);
    execCommand(`docker compose -f ${LOCAL_DEPLOYMENT_PATH} stop ${containerName}`);
};

export const joinParticipantToRoom = (participantIdentity: string, roomName: string): number => {
    const command = "lk";
    const args = [
        "room",
        "join",
        "--url",
        LIVEKIT_URL,
        "--api-key",
        LIVEKIT_API_KEY,
        "--api-secret",
        LIVEKIT_API_SECRET,
        "--publish-demo",
        "--identity",
        participantIdentity,
        roomName
    ];
    const pid = execCommandInBackground(command, args);

    if (!pid) {
        throw new Error("Error starting participant");
    }

    return pid;
};
