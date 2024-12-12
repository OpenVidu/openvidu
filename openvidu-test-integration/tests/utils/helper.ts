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

export const killProcess = (pid: number) => {
    process.kill(pid);
};

export const sleep = async (seconds: number) => {
    return new Promise((resolve) => {
        setTimeout(resolve, seconds * 1000);
    });
};
