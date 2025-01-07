import clc from 'cli-color';

export const availableColors = [
  'red',
  'bgRed',
  'green',
  'bgGreen',
  'yellow',
  'bgYellow',
  'blue',
  'bgBlue',
  'magenta',
  'bgMagenta',
  'cyan',
  'bgCyan',
  'white',
  'bgWhite',
  'blackBright',
  'bgBlackBright',
  'redBright',
  'bgRedBright',
  'greenBright',
  'bgGreenBright',
  'yellowBright',
  'bgYellowBright',
  'blueBright',
  'bgBlueBright',
  'magentaBright',
  'bgMagentaBright',
  'cyanBright',
  'bgCyanBright',
  'whiteBright',
  'bgWhiteBright',
] as const;

export type Colors = (typeof availableColors)[number];

export const defaultColor: Colors = 'magenta';

export const colorize = (message: string, color?: Colors) => {
  color = color || defaultColor;
  if (availableColors.indexOf(color) === -1) {
    color = defaultColor;
  }

  return clc[color](message);
};
