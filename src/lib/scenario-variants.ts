type ScenarioVariantConfig = {
  text: string;
  alternateTexts?: string[];
  pressureCue?: string;
  alternatePressureCues?: string[];
};

function hashString(value: string): number {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }

  return hash;
}

export function getVariantValue(
  primary: string,
  alternates: string[] | undefined,
  nodeId: string,
  playthroughSeed: number,
): string {
  if (!alternates || alternates.length === 0) {
    return primary;
  }

  const values = [primary, ...alternates];
  const variantIndex = hashString(`${nodeId}:${playthroughSeed}`) % values.length;
  return values[variantIndex];
}

export function resolveScenarioNode(
  config: ScenarioVariantConfig,
  nodeId: string,
  playthroughSeed: number,
): { text: string; pressureCue?: string } {
  return {
    text: getVariantValue(config.text, config.alternateTexts, nodeId, playthroughSeed),
    pressureCue: config.pressureCue
      ? getVariantValue(
          config.pressureCue,
          config.alternatePressureCues,
          `${nodeId}:pressure`,
          playthroughSeed,
        )
      : undefined,
  };
}
