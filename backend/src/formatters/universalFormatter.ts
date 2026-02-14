import formatDevfolio from "./devfolioFormatter.ts";
import formatUnstop from "./unstopFormat.ts";
export function universalFormatter(rawData: any, platform: string) {
  switch (platform.toLowerCase()) {
    case "devfolio":
      return formatDevfolio(rawData);

    case "unstop":
      return formatUnstop(rawData);

    // case "HackerEarth":
    //   return formatHackerEarth(rawData);

    default:
      throw new Error("Platform not supported");
  }
}
