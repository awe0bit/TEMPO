import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const candidates = [
  join(
    "node_modules",
    "expo",
    "node_modules",
    "expo-modules-jsi",
    "apple",
    "Sources",
    "ExpoModulesJSI",
    "Coding",
    "JavaScriptCodable+Date.swift",
  ),
  join(
    "node_modules",
    "expo-modules-jsi",
    "apple",
    "Sources",
    "ExpoModulesJSI",
    "Coding",
    "JavaScriptCodable+Date.swift",
  ),
];

let found = 0;

for (const path of candidates) {
  if (!existsSync(path)) continue;

  found += 1;
  const source = readFileSync(path, "utf8");
  const patched = source.replace(
    "abs(milliseconds) <= maxJavaScriptDateMilliseconds",
    "milliseconds.magnitude <= maxJavaScriptDateMilliseconds",
  );

  if (patched !== source) {
    writeFileSync(path, patched);
    console.log(`[postinstall] Patched Swift 6.2 Date compatibility in ${path}`);
  } else if (source.includes("milliseconds.magnitude <= maxJavaScriptDateMilliseconds")) {
    console.log(`[postinstall] Swift 6.2 Date compatibility already present in ${path}`);
  } else {
    throw new Error(`Unexpected expo-modules-jsi Date source in ${path}`);
  }
}

if (found === 0) {
  throw new Error("expo-modules-jsi Date source was not found after npm install");
}

const swipeRowPath = join(
  "node_modules",
  "react-native-swipe-list-view",
  "components",
  "SwipeRow.js",
);

if (!existsSync(swipeRowPath)) {
  throw new Error("react-native-swipe-list-view SwipeRow source was not found after npm install");
}

const swipeRowSource = readFileSync(swipeRowPath, "utf8");
let swipeRowPatched = swipeRowSource.replace(
  "const SCROLL_LOCK_MILLISECONDS = 300;",
  "const SCROLL_LOCK_MILLISECONDS = 64;",
);

swipeRowPatched = swipeRowPatched.replace(
  `    handleOnMoveShouldSetPanResponder(e, gs) {
        const { dx } = gs;
        return Math.abs(dx) > this.props.directionalDistanceChangeThreshold;
    }`,
  `    handleOnMoveShouldSetPanResponder(e, gs) {
        const { dx, dy } = gs;
        const absDx = Math.abs(dx);
        const absDy = Math.abs(dy);
        const threshold = this.props.directionalDistanceChangeThreshold;

        if (absDx <= threshold || absDx <= absDy * 1.08) {
            return false;
        }
        if (this.props.disableLeftSwipe && dx < 0) {
            return false;
        }
        if (this.props.disableRightSwipe && dx > 0) {
            return false;
        }
        return true;
    }`,
);

const swipePatchApplied =
  swipeRowPatched.includes("const SCROLL_LOCK_MILLISECONDS = 64;")
  && swipeRowPatched.includes("absDx <= absDy * 1.08");

if (!swipePatchApplied) {
  throw new Error(`Unexpected react-native-swipe-list-view source in ${swipeRowPath}`);
}

if (swipeRowPatched !== swipeRowSource) {
  writeFileSync(swipeRowPath, swipeRowPatched);
  console.log(`[postinstall] Patched swipe direction lock and scroll release in ${swipeRowPath}`);
} else {
  console.log(`[postinstall] Swipe direction lock and scroll release already patched in ${swipeRowPath}`);
}
