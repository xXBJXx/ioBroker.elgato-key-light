export declare function kelvinToMired(kelvin: number): number;
export declare function miredToKelvin(mired: number): number;
export interface RgbColor {
    /**
     *
     */
    red: number;
    /**
     *
     */
    green: number;
    /**
     *
     */
    blue: number;
}
export interface HsvColor {
    /**
     *
     */
    hue: number;
    /**
     *
     */
    saturation: number;
    /**
     *
     */
    value: number;
}
export declare function rgbToHsv({ red, green, blue }: RgbColor): HsvColor;
export declare function hsvToRgb({ hue, saturation, value }: HsvColor): RgbColor;
export declare function rgbToHex(color: RgbColor): string;
export declare function parseRgb(value: string): RgbColor;
export declare function parseHex(value: string): RgbColor;
