import formatDevfolio from "./devfolioFormatter.ts";
import formatUnstop from "./unstopFormat.ts";
import formatDevpost from "./devpostFormatter.ts";
import formatMLH from "./mlhFormatter.ts";
import formatHack2Skill from "./hack2skillFormatter.ts";

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
      throw new Error("Platform not supported: " + platform);
  }
}

