import { execSync, spawn } from "child_process";

export const execCommand = (command: string): string => {
    try {
        return execSync(command).toString().trim();
    } catch (error) {
        console.error(`Error executing command: ${command}`);
        console.error(error);
        throw error;
    }
};

export const execCommandInBackground = (command: string, args: string[]): number | undefined => {
    const child = spawn(command, args, { detached: true });

    child.stdout.on("data", (data) => {
        console.log(`stdout (${command}): ${data}`);
    });
    child.stderr.on("data", (data) => {
        console.log(`stderr (${command}): ${data}`);
    });
    child.on("close", (code) => {
        console.log(`child process (${command}) exited with code ${code}`);
    });
    child.on("error", (error) => {
        console.error(`child process (${command}) error: ${error}`);
        throw error;
    });

    return child.pid;
};

export const killProcess = (pid: number, signal: NodeJS.Signals = "SIGTERM") => {
    try {
        process.kill(pid, signal);
    } catch {
        // Already exited.
    }
};

export const sleep = async (seconds: number) => {
    return new Promise((resolve) => {
        setTimeout(resolve, seconds * 1000);
    });
};

/**
 * Polls a condition every 2 seconds until it holds, failing with the description after the timeout.
 */
export const waitFor = async (condition: () => Promise<boolean>, timeoutSeconds: number, description: string) => {
    const deadline = Date.now() + timeoutSeconds * 1000;

    while (Date.now() < deadline) {
        if (await condition().catch(() => false)) {
            return;
        }
        await sleep(2);
    }

    throw new Error(`Timed out after ${timeoutSeconds} s waiting for ${description}`);
};
