import { useEffect, useState } from "react";

export default function useSceneTimeline(
  totalScenes: number,
  sceneDurationMs = 5000,
): number {
  const [scene, setScene] = useState(0);

  useEffect(() => {
    if (totalScenes <= 1) {
      return;
    }

    const timer = window.setInterval(() => {
      setScene((prevScene) => (prevScene + 1) % totalScenes);
    }, sceneDurationMs);

    return () => window.clearInterval(timer);
  }, [totalScenes, sceneDurationMs]);

  return scene;
}
