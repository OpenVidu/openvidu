import type { Config } from "jest";

const config: Config = {
    preset: "ts-jest",
    // Every suite starts and removes the same local deployment: they run one at a time.
    maxWorkers: 1
};

export default config;
