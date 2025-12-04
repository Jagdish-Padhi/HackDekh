import formatDevfolio from "./devfolioFormatter.ts";
export function universalFormatter(rawData: any, platform: string) {
  switch (platform.toLowerCase()) {
    case "Devfolio":
      return formatDevfolio(rawData);

    // case "Unstop":
    //   return formatUnstop(rawData);

    // case "HackerEarth":
    //   return formatHackerEarth(rawData);

    default:
      throw new Error("Platform not supported");
  }
}
