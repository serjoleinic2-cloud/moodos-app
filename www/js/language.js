import { RU } from "./lang/ru.js";

let current = RU;

export function getText(path) {

    const keys = path.split(".");
    let value = current;

    for (const k of keys) {
        value = value[k];
    }

    return value;
}