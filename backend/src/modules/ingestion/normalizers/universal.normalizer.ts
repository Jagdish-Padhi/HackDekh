import formatDevfolio from "./devfolio.normalizer.ts";
import formatUnstop from "./unstop.normalizer.ts";
import formatDevpost from "./devpost.normalizer.ts";
import formatMLH from "./mlh.normalizer.ts";
import formatHack2Skill from "./hack2skill.normalizer.ts";

export function universalFormatter(rawData: any, platform: string) {
  switch (platform.toLowerCase()) {
    case "devfolio":
      return formatDevfolio(rawData);

    case "unstop":
      return formatUnstop(rawData);

    case "devpost":
      return formatDevpost(rawData);

    case "mlh":
      return formatMLH(rawData);

    case "hack2skill":
      return formatHack2Skill(rawData);

    default:
      throw new Error("Unsupported platform");
  }
}
